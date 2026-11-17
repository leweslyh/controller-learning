#!/usr/bin/env node
/* ============================================================
   tools/smoke.js — 浏览器冒烟测试（S0-3 入库）
   运行：npm run smoke          （或 node tools/smoke.js）
   依赖：playwright-core（开发期依赖）+ 本机已安装的 Chrome / Edge
   覆盖七组门禁：
     1. 首屏加载：标题、159 法、11 对象，无 console error / pageerror
     2. 启动后仿真时间 t 递增
     3. 切换被控对象时界面联动（下拉框 / 指标标签 / 状态量符号）
     4. 教学文档可打开，且「五、稳定性证明」「十、稳定性速查」「十一、可判定练习」三章存在
     5. 指标区在 1280×900 视口下不横向溢出
     6. V6.1 修复项回归：A/B、重录指标、对象限幅、粒子滤波、分享还原、收藏筛选、Esc 关闭
     7. 运行期无未捕获异常 / console error / 失败请求
   说明：脚本自带零依赖静态服务器（Node 内置 http），不读取任何构建产物；
         页面本身仍是 file:// 可运行的单页应用。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent((req.url || '/').split('?')[0]);
      if (rel === '/') rel = '/index.html';
      const file = path.normalize(path.join(app, rel));
      if (!file.startsWith(app)) { res.writeHead(403).end('forbidden'); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404).end('not found'); return; }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store'
        });
        res.end(buf);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function loadPlaywright() {
  try { return require('playwright-core'); }
  catch (err) {
    console.error('✗ 未找到 playwright-core。请先在项目根目录执行：npm install');
    process.exit(2);
  }
}

async function launch(chromium) {
  const attempts = [
    { channel: 'chrome' },
    { channel: 'msedge' },
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : null
  ].filter(Boolean);
  let lastErr;
  for (const opt of attempts) {
    try {
      return await chromium.launch({ headless: true, args: ['--hide-scrollbars'], ...opt });
    } catch (err) { lastErr = err; }
  }
  throw new Error('无法启动浏览器（Chrome / Edge 均不可用）：' + (lastErr && lastErr.message));
}

(async () => {
  const { chromium } = loadPlaywright();
  const server = await startServer();
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port + '/index.html';

  let pass = 0, fail = 0;
  const ok = (cond, name, detail) => {
    if (cond) { pass++; console.log('  PASS  ' + name); }
    else { fail++; console.log('  FAIL  ' + name + (detail ? '  → ' + detail : '')); }
  };

  const browser = await launch(chromium);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('requestfailed', (req) => failedRequests.push(req.url() + ' ' + (req.failure() || {}).errorText));

  console.log('\n── 冒烟测试 · ' + base + ' ──');
  await page.goto(base, { waitUntil: 'load' });

  /* 1. 首屏 */
  await page.waitForFunction(() => window.CtrlSim && window.CtrlSim.sim && window.CtrlSim.ui, null, { timeout: 15000 });
  const boot = await page.evaluate(() => ({
    title: document.title,
    methods: document.getElementById('stat-methods') ? document.getElementById('stat-methods').textContent.trim() : '',
    plants: document.getElementById('stat-plants') ? document.getElementById('stat-plants').textContent.trim() : '',
    options: document.querySelectorAll('#plant-select option').length
  }));
  ok(boot.title.indexOf('纸面控制实验室') >= 0, '首屏标题正确', boot.title);
  ok(boot.methods === '159', '首屏算法数 = 159', boot.methods);
  ok(boot.plants === '11' && boot.options === 11, '被控对象 = 11（统计 + 下拉框）', boot.plants + ' / ' + boot.options);

  /* 2. 启动后 t 递增（首次进入会弹欢迎引导，先关掉） */
  const guideOpen = await page.evaluate(() => {
    const o = document.getElementById('overlay-guide');
    return !!o && !o.hidden;
  });
  if (guideOpen) {
    await page.click('#btn-guide-start');
    await page.waitForTimeout(250);
  }
  await page.click('#btn-run');
  await page.waitForTimeout(900);
  const t1 = await page.evaluate(() => window.CtrlSim.sim.getState().t);
  await page.waitForTimeout(500);
  const t2 = await page.evaluate(() => window.CtrlSim.sim.getState().t);
  ok(t1 > 0.2 && t2 > t1, '启动后仿真时间递增', 't1=' + t1.toFixed(2) + ' t2=' + t2.toFixed(2));
  await page.click('#btn-run');

  /* 3. 切换对象联动 */
  await page.selectOption('#plant-select', 'motor');
  await page.waitForTimeout(200);
  const motor = await page.evaluate(() => ({
    plant: window.CtrlSim.sim.getPlant().id,
    label: document.querySelector('#metrics .metric .metric-label').textContent.trim(),
    unit: document.getElementById('u-x').textContent.trim()
  }));
  ok(motor.plant === 'motor' && motor.label.indexOf('转角') >= 0 && motor.unit === '°',
    '切换对象联动（电机：转角 / °）', JSON.stringify(motor));

  /* 3b. 增益卡：符号必须是渲染后的公式（下标正确），不能出现裸 "Kp" / "$" */
  const gain = await page.evaluate(() => {
    const host = document.getElementById('param-groups');
    const labels = [...host.querySelectorAll('.param-row label')];
    const first = labels[0] || null;
    return {
      hasKatex: !!host.querySelector('.param-row label .katex'),
      /* KaTeX 同时输出 MathML（含 "Kp" 文本），不能按 textContent 判裸符号；
         改为检查可见 HTML 里是否有下标结构 .msupsub */
      hasSubscript: !!host.querySelector('.param-row label .katex .msupsub'),
      rawDollar: labels.some((l) => (l.textContent || '').indexOf('$') >= 0),
      first: first ? first.textContent.trim() : ''
    };
  });
  ok(gain.hasKatex && gain.hasSubscript && !gain.rawDollar,
    '增益卡符号为公式渲染（含下标，无裸 $）', JSON.stringify(gain));

  /* 3c. 对象模型弹窗：** 加粗与 [链接] 必须被解析 */
  await page.click('#btn-plant-model');
  await page.waitForTimeout(300);
  const model = await page.evaluate(() => {
    const host = document.getElementById('plant-model-body');
    const text = host ? (host.textContent || '') : '';
    return {
      hasStrong: !!host.querySelector('strong'),
      rawStar: text.indexOf('**') >= 0,
      rawLink: text.indexOf('](method:') >= 0,
      hasDocBtn: !!host.querySelector('[data-plant-doc]')
    };
  });
  ok(model.hasStrong && !model.rawStar, '对象讲解加粗正常渲染', JSON.stringify(model));
  ok(!model.rawLink && model.hasDocBtn, '对象讲解含方法跳转与手册入口', JSON.stringify(model));
  await page.evaluate(() => { document.getElementById('overlay-plant').hidden = true; });

  /* 4. 教学文档：两章必须存在 */
  await page.click('#btn-docs');
  await page.waitForFunction(() => {
    const host = document.getElementById('docs-content');
    return host && host.querySelectorAll('.doc-section').length >= 11;
  }, null, { timeout: 20000 });
  const doc = await page.evaluate(() => {
    const host = document.getElementById('docs-content');
    const text = host.textContent || '';
    return {
      chapters: host.querySelectorAll('.doc-section').length,
      proof: text.indexOf('稳定性证明') >= 0,
      stability: text.indexOf('稳定性速查') >= 0,
      exercise: text.indexOf('可判定练习') >= 0,
      tables: host.querySelectorAll('table').length
    };
  });
  ok(doc.chapters >= 11, '文档 11 章渲染', '.doc-section=' + doc.chapters);
  ok(doc.proof && doc.stability && doc.exercise, '稳定性证明 / 速查 / 可判定练习三章存在', JSON.stringify(doc));

  /* 4b. 方法文档第 2 章只讲本方法对象，并提供对象手册跳转；对象手册共 11 篇 */
  const plantNav = await page.evaluate(() => {
    const nav = document.querySelectorAll('#docs-list [data-doc^="plant:"]');
    const link = document.querySelector('#docs-content [data-plant-doc]');
    return {
      manuals: nav.length,
      inlineLink: link ? link.getAttribute('data-plant-doc') : '',
      sharedTable: (document.getElementById('docs-content').textContent || '').indexOf('实验台提供六个被控对象') >= 0
    };
  });
  ok(plantNav.manuals === 11 && !plantNav.sharedTable, '对象手册 11 篇且方法文档不再复制总表',
    JSON.stringify(plantNav));
  if (plantNav.inlineLink) {
    await page.click('#docs-content [data-plant-doc]');
    await page.waitForFunction(() => {
      const t = document.getElementById('docs-title');
      return t && t.textContent.indexOf('质量-弹簧-阻尼') >= 0;
    }, null, { timeout: 10000 });
    ok(true, '方法文档 → 对象手册跳转可达');
  } else {
    ok(false, '方法文档 → 对象手册跳转可达', '未找到 [data-plant-doc]');
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  /* 5. 指标区不横向溢出 */
  const metrics = await page.evaluate(() => {
    const el = document.getElementById('metrics');
    return { scroll: el.scrollWidth, client: el.clientWidth };
  });
  ok(metrics.scroll <= metrics.client + 1, '指标区无横向溢出',
    'scroll=' + metrics.scroll + ' client=' + metrics.client);

  /* 6. V6.1 修复项回归（直接走内核 API，避免依赖视觉细节） */
  const regress = await page.evaluate(() => {
    const sim = window.CtrlSim.sim;
    const app = window.CtrlSim.app;
    const D = window.CtrlSim.data;
    const out = {};

    /* 6a. A/B 对比下切换方法：旧轨迹指标不得被清零、方法名不得被改写 */
    sim.setCompareMode(false);
    sim.setPlant('freeMass');
    sim.setMethod('PID');
    sim.setCompareMode(true);
    for (let i = 0; i < 120; i++) sim.stepOnce();
    const firstBefore = sim.getTracks()[0];
    out.ab = { beforeTicks: firstBefore ? firstBefore.ticks : 0 };
    sim.setMethod('PD');
    const firstAfter = sim.getTracks()[0];
    out.ab.rmse = firstAfter ? firstAfter.rmse : 0;
    out.ab.method = firstAfter ? firstAfter.method : '';
    sim.setCompareMode(false);
    sim.resetSim('PID', sim.getSettings().physParams.target, sim.getSettings().initialX);

    /* 6b. 重录必须清空全部指标（累计量、超调、调节时间、抖振统计） */
    sim.setPlant('msd');
    sim.setMethod('PID');
    sim.triggerDisturbance();
    for (let i = 0; i < 240; i++) sim.stepOnce();
    sim.rerecord();
    const m = sim.getMetrics();
    out.record = { overshoot: m.overshoot, settle: m.settle, rmse: m.rmse };

    /* 6c. 无人机预设 / 全量重置的执行器限幅应回到对象默认 20 N·m */
    const preset = (D.PRESETS || []).find((p) => p.plant === 'uav');
    if (preset) sim.applyPreset(preset);
    out.presetLimit = sim.getSettings().actuatorLimit;
    sim.setPlant('uav');
    sim.resetParams();
    out.resetLimit = sim.getSettings().actuatorLimit;

    /* 6d. 粒子滤波 p_num=50 不得因数组越界产生 NaN */
    sim.setPlant('msd');
    sim.setMethod('Particle-Filter');
    sim.setParam('p_num', 50, 'ctrl');
    for (let i = 0; i < 120; i++) sim.stepOnce();
    const pfState = sim.getState();
    out.pf = { x: pfState.x, xFinite: Number.isFinite(pfState.x), uFinite: Number.isFinite(sim.getMetrics().u) };

    /* 6e. 分享链接保留倒立摆辅助/串级设置，并经受 setParam 的范围校验 */
    sim.setPlant('pendulum');
    sim.setParam('balanceAssist', 'off');
    sim.setParam('cartLoop', 'on');
    sim.setParam('cartKp', 0.5);
    const hash = app.buildHash();
    const hasKeys = hash.indexOf('balanceAssist') >= 0 && hash.indexOf('cartLoop') >= 0;
    sim.setPlant('freeMass');
    window.history.replaceState(null, '', hash);
    const restored = app.restoreFromHash();
    const st = sim.getSettings();
    out.share = {
      hasKeys: hasKeys, restored: restored, plant: st.plantId,
      assist: st.balanceAssist, loop: st.cartLoop, kp: st.cartKp
    };
    window.history.replaceState(null, '', window.location.pathname);
    return out;
  });
  ok(regress.ab.beforeTicks > 0 && regress.ab.rmse > 0 && regress.ab.method === 'PID',
    'A/B 切换保留旧轨迹指标与方法名', JSON.stringify(regress.ab));
  ok(regress.record.overshoot === 0 && regress.record.settle === undefined && regress.record.rmse === 0,
    '重录清空超调/调节时间/RMSE', JSON.stringify(regress.record));
  ok(regress.presetLimit === 20 && regress.resetLimit === 20,
    'uav 预设与重置的执行器限幅 = 20', JSON.stringify({ preset: regress.presetLimit, reset: regress.resetLimit }));
  ok(regress.pf.xFinite && regress.pf.uFinite && Math.abs(regress.pf.x) < 1e6,
    '粒子滤波 50 粒子不产生 NaN', JSON.stringify(regress.pf));
  ok(regress.share.hasKeys && regress.share.restored && regress.share.assist === 'off' &&
    regress.share.loop === 'on' && Math.abs(regress.share.kp - 0.5) < 1e-6,
    '分享链接还原倒立摆辅助/串级设置', JSON.stringify(regress.share));

  /* 6f. 收藏筛选后切换标签页必须恢复全量列表 */
  await page.click('#btn-star-filter');
  await page.waitForTimeout(120);
  await page.click('.browser-tabs .tab[data-scope="all"]');
  await page.waitForTimeout(120);
  const visible = await page.evaluate(() => document.querySelectorAll('#browser-list [data-method]').length);
  ok(visible === 159, '收藏筛选后切标签恢复 159 法', 'visible=' + visible);

  /* 6g. 学习路线浮层可用 Esc 关闭 */
  await page.keyboard.press('l');
  await page.waitForTimeout(200);
  const learnOpen = await page.evaluate(() => {
    const o = document.getElementById('overlay-learn');
    return !!o && !o.hidden;
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const learnClosed = await page.evaluate(() => {
    const o = document.getElementById('overlay-learn');
    return !!o && o.hidden;
  });
  ok(learnOpen && learnClosed, '学习路线浮层可被 Esc 关闭', JSON.stringify({ learnOpen, learnClosed }));

  /* 7. 运行期无报错 */
  const realConsoleErrors = consoleErrors.filter((t) => t.indexOf('favicon') < 0);
  ok(pageErrors.length === 0, '无未捕获脚本异常', pageErrors.slice(0, 3).join(' | '));
  ok(realConsoleErrors.length === 0, '控制台无 error', realConsoleErrors.slice(0, 3).join(' | '));
  ok(failedRequests.length === 0, '无失败网络请求', failedRequests.slice(0, 3).join(' | '));

  await context.close();
  await browser.close();
  server.close();

  console.log('\n════════════════════════════════');
  console.log('冒烟结果：' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('✗ 冒烟测试异常终止：' + (err && err.stack || err));
  process.exit(2);
});
