/* ============================================================
   GET /api/health — 后端健康检查与站点自述
   ------------------------------------------------------------
   返回后端自身状态 + 前端静态站的规模常量，供前端探测
   「当前是本地 file:// 直开，还是已部署到 Netlify」。
   ============================================================ */

const APP = {
  name: '控制理论模拟器 V3.1 · 纸面控制实验室',
  version: '3.1',
  methods: 99,
  categories: 11,
  plants: 3,
  defaultPlant: 'freeMass',
  renderEngine: 'KaTeX（本地 vendor）+ MathML 回退'
};

export const config = { path: '/api/health' };

export default async function handler(req) {
  const json = (body, status) => new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

  if (req.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed', hint: '请用 GET /api/health' }, 405);
  }

  return json({
    ok: true,
    service: 'ctrl-sim-api',
    app: APP,
    runtime: {
      runtime: 'netlify-function',
      region: process.env.AWS_REGION || 'unknown',
      node: process.version
    },
    time: new Date().toISOString()
  });
}
