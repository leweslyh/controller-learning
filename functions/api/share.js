/* ============================================================
   /api/share — 实验快照的存取（Cloudflare Pages Functions 版）
   ------------------------------------------------------------
   前端目前把分享数据放在 URL / localStorage，跨设备不通用。
   这个接口提供「服务端暂存」能力：
     POST /api/share   { data: {...} }  → { id, url }
     GET  /api/share?id=<id>            → { id, data, createdAt }
     DELETE /api/share?id=<id>          → { ok: true }

   存储：默认用进程内存（Map + TTL），开箱即用但重启即丢。
   要长期保存时改用 Cloudflare 的 KV / D1 / R2：
     - KV：在 Pages 后台绑定 KV namespace，env 中读取，put/get/delete。
     - 或 D1 建表 snaps(id TEXT PRIMARY KEY, data TEXT, createdAt INTEGER)。
   ============================================================ */

const TTL_MS = 24 * 60 * 60 * 1000;   // 快照保留 24 小时
const MAX_BYTES = 64 * 1024;           // 单个快照上限 64 KB

/* 内存存储：冷启动即空，属预期行为 */
const store = new Map();

function sweep() {
  const now = Date.now();
  for (const [k, v] of store) if (now - v.createdAt > TTL_MS) store.delete(k);
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const json = (body, status) => new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

  sweep();
  const id = url.searchParams.get('id');

  /* ── 写入 ─────────────────────────────────────────── */
  if (request.method === 'POST') {
    let payload = null;
    try { payload = await request.json(); } catch (e) { /* 非法 JSON */ }
    if (!payload || typeof payload.data !== 'object' || payload.data === null) {
      return json({ ok: false, error: 'bad_request', hint: '请求体需为 { data: {...} }' }, 400);
    }
    const size = JSON.stringify(payload.data).length;
    if (size > MAX_BYTES) {
      return json({ ok: false, error: 'too_large', size, limit: MAX_BYTES }, 413);
    }
    const key = (payload.id || ('s_' + Math.random().toString(36).slice(2, 10)));
    store.set(key, { id: key, data: payload.data, createdAt: Date.now() });
    return json({ ok: true, id: key, bytes: size, expiresIn: TTL_MS }, 201);
  }

  /* ── 读取 ─────────────────────────────────────────── */
  if (request.method === 'GET') {
    if (!id) return json({ ok: false, error: 'bad_request', hint: '缺少 ?id=' }, 400);
    const hit = store.get(id);
    if (!hit) return json({ ok: false, error: 'not_found', id, hint: '快照不存在或已过期' }, 404);
    return json({ ok: true, id: hit.id, data: hit.data, createdAt: new Date(hit.createdAt).toISOString() });
  }

  /* ── 删除 ─────────────────────────────────────────── */
  if (request.method === 'DELETE') {
    if (!id) return json({ ok: false, error: 'bad_request', hint: '缺少 ?id=' }, 400);
    const had = store.delete(id);
    return json({ ok: had, id });
  }

  return json({ ok: false, error: 'method_not_allowed', hint: '支持 GET / POST / DELETE' }, 405);
}
