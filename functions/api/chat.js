/* ============================================================
   POST /api/chat — 智能助手的 DeepSeek 同源转发
   ------------------------------------------------------------
   · API Key 由使用者在助手设置里输入，保存在浏览器 localStorage，
     随每次请求以 apiKey 字段发来；服务端不存储、不记录、不回显。
     未携带时回退环境变量 DEEPSEEK_API_KEY（兼容旧部署）。
   · 提示词、RAG 上下文、模型与思考长度由 public/js/assistant.js
     统一构造，本函数只做白名单校验与转发，避免两套逻辑漂移。
   · 上游超时 30s；对 messages / options 逐项限长与取值校验。
   安全提示：本接口默认无鉴权。公开部署时请在平台侧配置访问控制
   或速率限制，否则任何人都能借你的服务消耗模型额度（见 README）。
   ============================================================ */

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;
const MAX_MESSAGES = 24;
const MAX_CONTENT = 12000;
const MAX_TOTAL = 60000;
const ROLES = ['system', 'user', 'assistant'];
const EFFORTS = ['low', 'high', 'max'];
const hits = new Map();

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
function clean(v, max) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim().slice(0, max);
}
function rateLimited(req) {
  const h = req.headers && req.headers.get
    ? (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'local')
    : 'local';
  const ip = String(h).split(',')[0].trim().slice(0, 64);
  const t = Date.now();
  const arr = (hits.get(ip) || []).filter((x) => t - x < WINDOW_MS);
  arr.push(t);
  hits.set(ip, arr);
  if (hits.size > 500) {
    hits.forEach((v, k) => { if (t - v[v.length - 1] > WINDOW_MS) hits.delete(k); });
  }
  return arr.length > MAX_PER_WINDOW;
}

export const config = { path: '/api/chat' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed', hint: '请用 POST /api/chat' }, 405);
  }
  if (rateLimited(req)) {
    return json({ ok: false, error: 'rate_limited', hint: '请求过于频繁，请稍后再试' }, 429);
  }

  let payload = null;
  try { payload = await req.json(); } catch (err) { /* 非法 JSON 走下面的统一校验 */ }
  if (!payload || typeof payload !== 'object') {
    return json({ ok: false, error: 'bad_request', hint: '请求体需为 JSON 对象' }, 400);
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages.slice(-MAX_MESSAGES).map((m) => ({
      role: ROLES.indexOf(m && m.role) >= 0 ? m.role : 'user',
      content: clean(m && m.content, MAX_CONTENT)
    })).filter((m) => m.content)
    : [];
  const total = messages.reduce((n, m) => n + m.content.length, 0);
  if (!messages.length || total > MAX_TOTAL) {
    return json({ ok: false, error: 'bad_request', hint: 'messages 为空或总长度超限' }, 400);
  }

  const o = payload.options && typeof payload.options === 'object' ? payload.options : {};
  const model = /^[a-z0-9._-]{2,48}$/i.test(o.model) ? o.model : 'deepseek-flash';
  const maxTokens = Math.min(8000, Math.max(200, Number(o.max_tokens) || 1600));
  const thinkingOn = !(o.thinking && o.thinking.type === 'disabled');
  const effort = EFFORTS.indexOf(o.reasoning_effort) >= 0 ? o.reasoning_effort : 'high';
  const stream = o.stream !== false;
  const body = {
    model: model,
    messages: messages,
    thinking: { type: thinkingOn ? 'enabled' : 'disabled' },
    max_tokens: maxTokens,
    stream: stream
  };
  /* 官方文档：思考模式不支持 temperature，仅在关闭思考时传入 */
  if (thinkingOn) body.reasoning_effort = effort;
  else if (Number.isFinite(Number(o.temperature))) {
    body.temperature = Math.min(2, Math.max(0, Number(o.temperature)));
  }

  const apiKey = clean(payload.apiKey, 128);
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return json({
      ok: false, error: 'no_api_key',
      hint: '请在助手设置里输入 DeepSeek API Key，或在服务端设置 DEEPSEEK_API_KEY。'
    }, 503);
  }

  const base = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const url = base + '/chat/completions';
  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(stream ? 120000 : 30000)
    });
  } catch (err) {
    const timeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return json({
      ok: false, error: timeout ? 'upstream_timeout' : 'upstream_unavailable',
      hint: timeout ? '大模型响应超时，请重试' : '无法连接大模型服务，请检查网络或服务端配置'
    }, timeout ? 504 : 502);
  }

  if (!upstream.ok) {
    return json({
      ok: false, error: 'upstream_error', status: upstream.status,
      hint: '大模型服务返回异常，请检查模型名、API Key 与额度。'
    }, 502);
  }
  /* 流式：直接把上游 SSE 透传给浏览器，由前端逐块渲染 */
  if (stream) {
    if (!upstream.body) {
      return json({ ok: false, error: 'stream_unavailable', hint: '上游未返回可读流' }, 502);
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no'
      }
    });
  }
  let data = null;
  try { data = await upstream.json(); } catch (err) { /* 非 JSON 响应当作上游异常 */ }
  if (!data) {
    return json({
      ok: false, error: 'upstream_error', status: upstream.status,
      hint: '大模型服务返回异常，请检查模型名、API Key 与额度。'
    }, 502);
  }
  const reply = clean(data.choices && data.choices[0] && data.choices[0].message &&
    data.choices[0].message.content, 8000);
  if (!reply) {
    return json({ ok: false, error: 'empty_reply', hint: '大模型未返回内容，请重试' }, 502);
  }
  return json({ ok: true, reply: reply, model: model, usage: data.usage || null }, 200);
}
