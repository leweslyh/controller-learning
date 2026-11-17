/* ============================================================
   GET /api/health — 后端健康检查与站点自述（Cloudflare Pages Functions 版）
   ------------------------------------------------------------
   · 路由：functions/api/health.js → /api/health
   · 前端可用它判断「后端函数是否已部署成功」
   · 同时回显后端是否配置了 DEEPSEEK_API_KEY（不回显密钥本身）
   ============================================================ */

const APP = {
  name: '控制理论模拟器 V6.3 · 纸面控制实验室',
  version: '6.3',
  methods: 159,
  categories: 12,
  plants: 11,
  defaultPlant: 'freeMass',
  renderEngine: 'KaTeX（本地 vendor）+ MathML 回退',
  papers: 159, paperVerified: 153
};

export async function onRequest(context) {
  const { request, env } = context;
  const json = (body, status) => new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed', hint: '请用 GET /api/health' }, 405);
  }

  return json({
    ok: true,
    service: 'ctrl-sim-api',
    app: APP,
    runtime: {
      runtime: 'cloudflare-pages-function',
      functionsDir: 'functions/api',
      region: 'unknown',
      node: 'n/a (workers)',
      envKey: !!(env && env.DEEPSEEK_API_KEY),
      baseUrl: (env && env.DEEPSEEK_BASE_URL) || 'https://api.deepseek.com'
    },
    time: new Date().toISOString()
  });
}
