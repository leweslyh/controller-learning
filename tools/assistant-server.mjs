/* ============================================================
   tools/assistant-server.mjs — 本地智能助手服务（零依赖）
   ------------------------------------------------------------
   同时提供 public/ 静态站与 /api/chat 代理，复用 Netlify 函数
   netlify/functions/chat.js 的同一个处理器，避免两套实现漂移。
   运行（PowerShell）：
     $env:DEEPSEEK_API_KEY="sk-..."; node tools/assistant-server.mjs
   然后打开 http://localhost:8713 。不设置密钥时助手走离线检索。
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatHandler from '../netlify/functions/chat.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', 'public');
const port = Number(process.env.PORT || 8713);
const MAX_BODY = 128 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
function collect(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) { reject(new Error('too_large')); req.destroy(); }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
/* Netlify 的 handler 只用到 method / headers.get / json，构造等价请求即可 */
function functionRequest(req, body, port) {
  return {
    method: 'POST',
    url: 'http://127.0.0.1:' + port + '/api/chat',
    headers: { get: (name) => req.headers[String(name).toLowerCase()] || null },
    json: async () => JSON.parse(body || '{}')
  };
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (err) { return send(res, 400, 'text/plain; charset=utf-8', '400 Bad Request'); }

  if (pathname === '/api/health') {
    return send(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      ok: true, runtime: 'assistant-server',
      keySource: 'browser-settings-or-env', envKey: !!process.env.DEEPSEEK_API_KEY,
      defaultModel: 'deepseek-flash'
    }));
  }

  if (pathname === '/api/chat') {
    if (req.method !== 'POST') return send(res, 405, 'text/plain; charset=utf-8', '405 Method Not Allowed');
    let body = '';
    try { body = await collect(req); }
    catch (err) { return send(res, 413, 'text/plain; charset=utf-8', '413 Payload Too Large'); }
    try {
      const out = await chatHandler(functionRequest(req, body, port));
      const headers = {};
      out.headers.forEach((v, k) => { headers[k] = v; });
      res.writeHead(out.status, headers);
      if (res.flushHeaders) res.flushHeaders();
      if (res.socket && res.socket.setNoDelay) res.socket.setNoDelay(true);
      if (!out.body) { res.end(await out.text()); return; }
      const reader = out.body.getReader();
      let closed = false;
      res.on('close', () => {
        closed = true;
        try { reader.cancel(); } catch (err) { /* 客户端已断开 */ }
      });
      while (!closed) {
        const step = await reader.read();
        if (step.done) break;
        if (!res.write(Buffer.from(step.value))) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
      res.end();
      return;
    } catch (err) {
      return send(res, 502, 'application/json; charset=utf-8',
        JSON.stringify({ ok: false, error: 'local_handler_error' }));
    }
  }

  const rel = pathname === '/' ? '/index.html' : pathname;
  let file;
  try { file = path.resolve(root, '.' + rel); }
  catch (err) { return send(res, 400, 'text/plain; charset=utf-8', '400 Bad Request'); }
  if (file !== root && !file.startsWith(root + path.sep)) {
    return send(res, 403, 'text/plain; charset=utf-8', '403 Forbidden');
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, 'text/plain; charset=utf-8', '404 Not Found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log('控制理论模拟器 · 智能助手服务已启动：http://localhost:' + port);
  console.log('API Key：在助手设置面板输入并保存在浏览器；环境变量 DEEPSEEK_API_KEY 仅作回退');
  console.log('当前环境变量密钥：' + (process.env.DEEPSEEK_API_KEY ? '已设置' : '未设置'));
  console.log('停止服务：Ctrl+C');
});
