/* ============================================================
   GET /api/health — 后端健康检查与站点自述（V6.4）
   ------------------------------------------------------------
   · 路由：Netlify Functions 2.0 的 config.path，无需 redirect
   · 前端可用它判断「后端函数是否已部署成功」
   · 同时回显后端是否配置了 DEEPSEEK_API_KEY（不回显密钥本身）
   ============================================================ */

const APP = {
  name: '控制理论模拟器 V6.4 · 纸面控制实验室',
  version: '6.4',
  methods: 159,
  categories: 12,
  plants: 11,
  defaultPlant: 'freeMass',
  renderEngine: 'KaTeX（本地 vendor）+ MathML 回退',
  papers: 159, paperVerified: 153
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
      functionsDir: 'netlify/functions',
      region: process.env.AWS_REGION || 'unknown',
      node: process.version,
      envKey: !!process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    },
    time: new Date().toISOString()
  });
}
