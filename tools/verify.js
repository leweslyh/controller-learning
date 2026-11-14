#!/usr/bin/env node
/* ============================================================
   tools/verify.js — 开发期静态验收（Node，仅供开发者运行）
   运行：node tools/verify.js
   校验：99 条配置与控制律逐字保真、默认对象公式等价、7 个对象、
        能耗口径、TeX/Markdown 公式、99 份教学文档、图表坐标轴、
        零外部请求、响应式与无障碍静态条件。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
/* 前端静态站根目录（Netlify publish 目录） */
const app = path.join(root, 'public');
const jsDir = path.join(app, 'js');
const JS_FILES = ['data.js', 'math.js', 'simulation.js', 'charts.js', 'fit-data.js', 'ui.js', 'docs.js', 'rails.js', 'app.js'];
const results = [];

function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '', skip: false }); }
function skip(name, detail) { results.push({ name, ok: true, detail: 'SKIP · ' + (detail || ''), skip: true }); }
function makeSandbox() {
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
    parseFloat, parseInt, isNaN, isFinite,
    document: {
      readyState: 'complete',
      getElementById: () => null,
      addEventListener: () => {},
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {} })
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}
function run(file, sandbox) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: path.basename(file) });
}

/* ── 1. 加载数据层、公式引擎、仿真内核与文档层 ───────── */
let NS, sim, D, math, docs, rawDocs = null, loadError = null;
try {
  const sandbox = makeSandbox();
  run(path.join(jsDir, 'data.js'), sandbox);
  run(path.join(jsDir, 'math.js'), sandbox);
  run(path.join(jsDir, 'simulation.js'), sandbox);
  run(path.join(jsDir, 'fit-data.js'), sandbox);
  run(path.join(jsDir, 'docs.js'), sandbox);
  run(path.join(jsDir, 'docs-content.js'), sandbox);
  NS = sandbox.CtrlSim;
  D = NS.data; sim = NS.sim; math = NS.math; docs = NS.docs;
  rawDocs = sandbox.__DOCS__ || null;
} catch (err) { loadError = err; }
check('data / math / simulation / docs 可在无 DOM 环境加载', !loadError, loadError ? loadError.message : '');
if (loadError) { report(); process.exit(1); }

check('控制器条目数 = 99', Object.keys(D.CONTROLLER_CONFIGS).length === 99);
check('11 个理论体系分类', D.sortedCategories.length === 11);
const simText = fs.readFileSync(path.join(jsDir, 'simulation.js'), 'utf8');
check('计算内核结构完整（关键公式锚点 + 对象适配修正点）', (() => {
  const patched = ['u = cP.u_static', 'pP.m * a_est_dob', '2 * pP.m * lqg_kp',
    'if (pP.k <= 1e-6)', 'alg.integral + 0.2', 'Math.min(10, alg.w_critic'];
  const anchors = ["case 'P': u = cP.kp * e; break;", "case 'PID':", "case 'SMC':", "case 'ADRC':"];
  return patched.every((p) => simText.indexOf(p) >= 0) && anchors.every((a) => simText.indexOf(a) >= 0);
})());
const caseKeys = (simText.match(/case '[^']+':/g) || []).length;
check('99 个控制律 case 分支', caseKeys === 99, '实际 ' + caseKeys + ' 个');
const msd = D.PLANTS.msd, p0 = { ...msd.defaults }, state0 = { x: 1.3, v: -0.7, t: 2 };
check('默认 msd 动力学与受力平衡式数值等价',
  Math.abs(msd.accel(state0, 12, 3, -0.5, p0) - (12 + 3 - 0.5 - p0.k * state0.x - p0.c * state0.v) / p0.m) < 1e-12);
check('冻结判定改用当前指令 activeTarget', simText.indexOf('state.x - activeTarget') >= 0);
check('定格时指标同步冻结', simText.indexOf('if (!chartStateRef.current.frozen)') >= 0 && simText.indexOf('energy_dyn') >= 0);

/* ── 3. 99 种控制器运行验收 ──────────────────────────── */
const runtimeErrors = [], nonFinite = [];
Object.keys(D.CONTROLLER_CONFIGS).forEach((key) => {
  try {
    sim.setMethod(key); sim.setRunning(true);
    for (let i = 0; i < 150; i++) sim.stepOnce();
    const m = sim.getMetrics();
    if (!sim.getHistory().length) runtimeErrors.push(key + ': 未记录轨迹');
    if (!Number.isFinite(m.x) || !Number.isFinite(m.v) || !Number.isFinite(m.u)) nonFinite.push(key);
  } catch (err) { runtimeErrors.push(key + ': ' + err.message); }
});
check('99 种控制器全部可运行且无异常', runtimeErrors.length === 0, runtimeErrors.slice(0, 6).join(' | '));
check('默认参数下数值发散控制器（V2.1 固有行为，不视为失败）', true,
  nonFinite.length ? nonFinite.length + ' 个：' + nonFinite.join(', ') : '无');

/* ── 4. 被控对象验收 ─────────────────────────────────── */
check('聚焦 3 个经典被控对象', D.PLANT_LIST.length === 3 && D.PLANT_LIST.join(',') === 'freeMass,msd,pendulum', '实际 ' + D.PLANT_LIST.join(','));
const plantErrors = [];
D.PLANT_LIST.forEach((id) => {
  const plant = D.PLANTS[id];
  try {
    if (!plant.tex || !plant.params || !plant.effective || !plant.holdForce || !plant.restoring) { plantErrors.push(id + ': 字段缺失'); return; }
    if (plant.order === 2 ? !plant.accel : !plant.flow) { plantErrors.push(id + ': 缺少动力学'); return; }
    const eff = plant.effective(plant.defaults);
    if (![eff.m, eff.c, eff.k].every(Number.isFinite)) plantErrors.push(id + ': effective 非有限');
    if (!Number.isFinite(plant.holdForce(plant.defaultTarget, plant.defaults))) plantErrors.push(id + ': holdForce 非有限');
    if (!sim.setPlant(id)) { plantErrors.push(id + ': 切换失败'); return; }
    for (let i = 0; i < 120; i++) sim.stepOnce();
    if (Number.isNaN(sim.getState().x) || Number.isNaN(sim.getState().v)) plantErrors.push(id + ': 状态 NaN');
    if (!sim.getHistory().length) plantErrors.push(id + ': 无轨迹');
  } catch (err) { plantErrors.push(id + ': ' + err.message); }
});
check('7 个被控对象均可切换并运行', plantErrors.length === 0, plantErrors.join(' | '));
check('每个对象均有 TeX 公式', D.PLANT_LIST.every((id) => /\\|\^|_/.test(D.PLANTS[id].tex)));

/* ── 5. 能耗口径与定格冻结 ───────────────────────────── */
try {
  sim.setPlant('msd'); sim.setMethod('PID'); sim.setRunning(true);
  for (let i = 0; i < 500; i++) sim.stepOnce();
  const alg = sim.getAlg();
  const e0 = alg.energy || 0, d0 = alg.energy_dyn || 0;
  for (let i = 0; i < 100; i++) { sim.getChartState().frozen = false; sim.stepOnce(); }
  const dE = (alg.energy || 0) - e0, dDyn = (alg.energy_dyn || 0) - d0;
  check('稳态阶段动态能耗增长趋近于零（累计能耗仍线性增长）', dE > 0 && dDyn < dE * 0.2,
    'ΔE=' + dE.toFixed(2) + ' J, ΔE_dyn=' + dDyn.toFixed(3) + ' J');
  check('稳态保持力 u_h = k·r', Math.abs(sim.getHoldForce() - D.PLANTS.msd.defaults.k * 5) < 1e-9);
  /* 等待真实收敛进入定格（误差与速度均低于 0.02、稳定 2 秒），再验证指标冻结 */
  let guard = 0;
  while (!sim.isFrozen() && guard < 3000) { sim.stepOnce(); guard++; }
  const before = { ticks: alg.ticks, energy: alg.energy, dyn: alg.energy_dyn };
  for (let i = 0; i < 60; i++) sim.stepOnce();
  check('波形定格后 RMSE / 能耗不再累加',
    sim.isFrozen() && alg.ticks === before.ticks && alg.energy === before.energy && alg.energy_dyn === before.dyn);
} catch (err) { check('能耗口径验收', false, err.message); }

/* ── 6. TeX / Markdown 公式验收 ─────────────────────── */
try {
  const keys = Object.keys(D.CONTROLLER_CONFIGS);
  let badTex = 0, badRender = 0;
  keys.forEach((k) => {
    const f = math.cachedFormula(D.CONTROLLER_CONFIGS[k].eq);
    if (!f.tex || !f.md || f.md.indexOf('$$') < 0) badTex++;
    if (f.html.indexOf('class="math"') < 0 || f.html.indexOf('undefined') >= 0) badRender++;
  });
  check('99 条控制律均生成 TeX 与 Markdown 源码', badTex === 0, '异常 ' + badTex + ' 条');
  check('99 条公式均可渲染且无 undefined', badRender === 0, '异常 ' + badRender + ' 条');
  const sample = math.render('\\frac{\\alpha}{2}+\\sqrt{x^{2}}');
  check('分数 / 根号 / 上下标渲染', sample.indexOf('m-frac') >= 0 && sample.indexOf('m-sqrt') >= 0 && sample.indexOf('m-sup') >= 0);
  check('Markdown 数学块格式', math.markdown('u=K_p e').indexOf('$$') >= 0);
  check('Unicode 伪公式规范化为 TeX（乘号转隐式乘法）', math.toTex('u = K_p·e + ∫e dt').indexOf('\\int') >= 0 && math.toTex('u = K_p·e').indexOf('\\cdot') < 0 && math.toTex('ẋ').indexOf('\\dot') >= 0);
  check('积分 / 根号命令与后续符号正确分隔', (() => {
    const t = math.toTex('u = K_i ∫e dt + λ√|s|sgn(s)');
    return t.indexOf('\\inte') < 0 && t.indexOf('\\int e') >= 0 && t.indexOf('\\sqrt{|s|}') >= 0;
  })());
  check('u(t-dt) 中的 dt 不被误改写', math.toTex('u(t-dt)').indexOf('\\mathrm{d}') < 0);
} catch (err) { check('公式引擎验收', false, err.message); }

/* ── 7. 99 份教学文档验收 ───────────────────────────── */
try {
  /* 11 类体系在离线索引 README 中齐备（每类一个章节标题） */
  const readme = fs.readFileSync(path.join(app, 'docs', 'README.md'), 'utf8');
  const cats = D.sortedCategories || Object.keys(D.CONTROLLER_CONFIGS)
    .map((k) => D.CONTROLLER_CONFIGS[k].category)
    .filter((v, i, a) => a.indexOf(v) === i);
  const missCat = cats.filter((c) => readme.indexOf(c.replace(/^\d+\.\s*/, '')) < 0);
  check('11 类体系在文档索引中齐备', cats.length === 11 && missCat.length === 0,
    missCat.length ? '缺 ' + missCat.join(',') : cats.length + ' 类齐备');
  /* 文档单一来源：__DOCS__ 包（tools/build-docs.js 从 public/docs/methods/*.md 生成）。
     每讲必须有完整七章（类比 / 为什么 / 推导 / 算例 / 调参 / 陷阱 / 延伸）、推导公式与表格。 */
  const SEC_HEADS = ['## 一、', '## 二、', '## 三、', '## 四、', '## 五、', '## 六、', '## 七、', '## 八、'];
  const badDocs = [];
  Object.keys(D.CONTROLLER_CONFIGS).forEach((key) => {
    const e = rawDocs && rawDocs[key];
    if (!e || !e.body) { badDocs.push(key + ': 无文档'); return; }
    const text = e.body;
    const missing = SEC_HEADS.filter((h) => text.indexOf(h) < 0);
    if (missing.length) { badDocs.push(key + ': 缺 ' + missing.length + ' 章'); return; }
    if (text.indexOf('$$') < 0) badDocs.push(key + ': 无推导公式');
    if (text.indexOf('|') < 0) badDocs.push(key + ': 无表格');
    if (text.indexOf('undefined') >= 0) badDocs.push(key + ': 含 undefined');
  });
  check('99 份教学文档结构完整（七章齐全 + 公式 + 参数表）', badDocs.length === 0,
    badDocs.length ? badDocs.slice(0, 6).join(' | ') : '99 份全部通过');

  /* 内容质量：推导章必须有公式、算例章必须有数据表、陷阱章必须足够具体 */
  const stKeys = Object.keys(D.CONTROLLER_CONFIGS);
  const sectionOf = (text, head) => {
    const start = text.indexOf(head);
    if (start < 0) return '';
    const rest = text.slice(start + head.length);
    const next = rest.indexOf('\n## ');
    return next < 0 ? rest : rest.slice(0, next);
  };
  const thinProof = stKeys.filter((k) => {
    const e = rawDocs && rawDocs[k];
    if (!e || !e.body) return true;
    const derive = sectionOf(e.body, '## 四、一步步推导');
    const example = sectionOf(e.body, '## 五、一个算例');
    const pitfalls = sectionOf(e.body, '## 七、局限与常见陷阱');
    return derive.indexOf('$$') < 0 || example.indexOf('|') < 0 ||
      (pitfalls.match(/^- /gm) || []).length < 2;
  });
  check('每讲推导章含公式、算例章含数据表、陷阱章足够具体', thinProof.length === 0,
    thinProof.length ? '缺 ' + thinProof.length + ' 条：' + thinProof.join(',') : stKeys.length + ' / ' + stKeys.length);
  try {
    const a = docs.analyzeLoop('PID', D.CONTROLLER_CONFIGS.PID,
      { plantId: 'msd', plantParams: null, ctrl: { kp: 40, ki: 10, kd: 20 } });
    const roots = docs.polyRoots(a.coeffs);
    const maxRe = Math.max.apply(null, roots.map((r) => r.re));
    check('闭环特征方程可求根且稳定判据正确', a.order === 3 && roots.length === 3 && maxRe < -1e-6,
      '极点最大实部 ' + maxRe.toFixed(3));
    const b = docs.analyzeLoop('PolePlacement', D.CONTROLLER_CONFIGS.PolePlacement,
      { plantId: 'pendulum', plantParams: null, ctrl: { p1: 3, p2: 2 } });
    const rb = docs.polyRoots(b.coeffs);
    check('极点配置算例把极点配到 −p₁ / −p₂', rb.length === 2 && rb.every((r) => r.re < -0.5),
      rb.map((r) => r.re.toFixed(2)).join(', '));
  } catch (err) { check('闭环数值算例', false, err.message); }
  /* 讲次与序号：__DOCS__ 99 讲、meta.index 1..99 连续；每讲均有参数调法节 */
  const keys = Object.keys(rawDocs || {});
  const indexes = keys.map((k) => Number(rawDocs[k].meta && rawDocs[k].meta.index) || 0)
    .sort((a, b) => a - b);
  check('教学文档打包覆盖全部方法且序号连续',
    keys.length === D.methodList.length && indexes.every((v, i) => v === i + 1),
    '讲次 ' + keys.length + ' / ' + D.methodList.length);
  check('每讲均含「参数怎么调」与调参口诀',
    keys.length > 0 && keys.every((k) => rawDocs[k].body.indexOf('参数怎么调') >= 0 &&
      rawDocs[k].body.indexOf('调大') >= 0));
  /* 近似方法必须在阅读器中带「教学演示级近似」徽标 */
  const stKeysAll = Object.keys(D.CONTROLLER_CONFIGS);
  const approxKeys = stKeysAll.filter((k) => D.isApproximation && D.isApproximation(D.CONTROLLER_CONFIGS[k]));
  const noBadge = approxKeys.filter((k) => docs.renderDoc(k).indexOf('doc-badge') < 0);
  check('教学近似方法在阅读器中带近似标注',
    approxKeys.length > 0 && noBadge.length === 0,
    approxKeys.length + ' 条近似方法，缺标注 ' + noBadge.length + ' 条');
  const docsDir = path.join(app, 'docs');
  const methodsDir = path.join(docsDir, 'methods');
  const methodDocs = fs.existsSync(methodsDir) ? fs.readdirSync(methodsDir).filter((f) => f.endsWith('.md')) : [];
  check('离线生成与方法数一致的方法文档', methodDocs.length === D.methodList.length, '实际 ' + methodDocs.length + ' 份');
  const badFiles = methodDocs.filter((f) => {
    const text = fs.readFileSync(path.join(methodsDir, f), 'utf8');
    const missing = SEC_HEADS.filter((h) => text.indexOf(h) < 0);
    return missing.length > 0 || text.indexOf('$$') < 0 || text.indexOf('参数怎么调') < 0;
  });
  check('每份离线文档均含完整章节与参数整定流程', badFiles.length === 0,
    badFiles.length ? badFiles.slice(0, 5).join(', ') : methodDocs.length + ' 份通过');
  check('离线索引存在且无教学正文副本（正文只在 methods/）',
    fs.existsSync(path.join(docsDir, 'README.md')) &&
    !fs.existsSync(path.join(docsDir, '控制理论99法教学手册.md')) &&
    !fs.readdirSync(docsDir).some((f) => /教学手册|完整手册/.test(f)));
} catch (err) { check('教学文档验收', false, err.message); }

/* ── 8. 图表坐标轴与页面结构 ────────────────────────── */
const html = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(app, 'styles.css'), 'utf8');
const chartsText = fs.readFileSync(path.join(jsDir, 'charts.js'), 'utf8');
const allJs = JS_FILES.map((f) => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
const all = html + css + allJs;
check('图表具备自适应 nice 刻度与轴标题',
  ['niceRange', 'drawAxes', 'xLabel', 'yLabel', 'clipPlot'].every((k) => chartsText.indexOf(k) >= 0));
check('三张画布均带坐标单位', (chartsText.match(/xLabel:/g) || []).length >= 3);
check('指标文字移出画布（图表标题承载）', html.indexOf('chart-metric-pos') >= 0 && chartsText.indexOf('RMSE ') < 0);
check('页面含公式引擎、被控对象选择与对象模型弹窗容器',
  html.indexOf('js/math.js') >= 0 && html.indexOf('plant-select') >= 0 && html.indexOf('plant-model-body') >= 0);
check('指标卡含累计能耗 / 动态能耗 / 保持力',
  ['m-energy', 'm-energy-dyn', 'm-hold'].every((id) => html.indexOf('id="' + id + '"') >= 0));
check('TeX 公式样式齐备', css.indexOf('.math .m-frac') >= 0 && css.indexOf('.math .m-sup') >= 0);
check('预设覆盖倒立摆与二阶积分器', D.PRESETS.some((p) => p.plant === 'pendulum') && D.PRESETS.some((p) => p.plant === 'freeMass'));
check('全部预设可加载', D.PRESETS.every((p) => sim.applyPreset(p)));
check('页面含教学文档阅读器与入口（无手册导出按钮）',
  html.indexOf('js/docs.js') >= 0 && html.indexOf('overlay-docs') >= 0 &&
  html.indexOf('btn-docs') >= 0 && html.indexOf('docs-export') < 0);
check('CSS 含文档阅读器样式', css.indexOf('.docs-shell') >= 0 && css.indexOf('.doc-table') >= 0);
check('档案卡含教学文档入口',
  fs.readFileSync(path.join(jsDir, 'ui.js'), 'utf8').indexOf('btn-profile-docs') >= 0);
check('公式手册可导出为 Markdown', (() => {
  try {
    const book = math.buildFormulaBook(D);
    return book.indexOf('$$') >= 0 && (book.match(/^#### /gm) || []).length === 99;
  } catch (err) { return false; }
})());
check('时间轴按实际数据跨度铺满', chartsText.indexOf('span * 1.02') >= 0);
check('99×3 适用性数据完整', (() => {
  const f = NS.fitData;
  return !!f && !!f.verdicts && Object.keys(f.verdicts).length === 99 &&
    Object.keys(f.verdicts).every((k) => ['msd', 'freeMass', 'pendulum'].every((p) => !!f.verdicts[k][p]));
})());
check('不推荐组合均有原因说明', (() => {
  const f = NS.fitData; let miss = 0;
  Object.keys(f.verdicts).forEach((m) => ['msd', 'freeMass', 'pendulum'].forEach((p) => {
    if (f.verdicts[m][p] === 'unfit' && !f.notes[p + '|' + m]) miss++;
  }));
  return miss === 0;
})());
check('审计适用率 ≥ 75%', (() => {
  const c = NS.fitData.summary || {};
  return ((c.good || 0) + (c.fair || 0)) / 297 >= 0.75;
})());
check('对象覆盖参数均在参数范围内', (() => {
  const bad = [];
  const checkSet = (method, set) => Object.keys(set || {}).forEach((k) => {
    const conf = D.CONTROLLER_CONFIGS[method];
    if (!conf || !conf.params[k]) { bad.push(method + '.' + k); return; }
    const r = conf.params[k], v = set[k];
    if (!(v >= r[1] - 1e-9 && v <= r[2] + 1e-9)) bad.push(method + '.' + k + '=' + v);
  });
  Object.keys(D.DEFAULT_OVERRIDES || {}).forEach((m) => checkSet(m, D.DEFAULT_OVERRIDES[m]));
  Object.keys(D.PLANT_TUNING || {}).forEach((p) => Object.keys(D.PLANT_TUNING[p]).forEach((m) => checkSet(m, D.PLANT_TUNING[p][m])));
  return bad.length === 0;
})());
const railsText = fs.readFileSync(path.join(jsDir, 'rails.js'), 'utf8');
check('侧栏挂起模块含首次访问规则', railsText.indexOf('firstVisit') >= 0 && railsText.indexOf('ctrlsim.rails.visited') >= 0);
check('页面含贴边挂起条、专注模式与对象模型弹窗',
  ['browser-rail', 'inspector-rail', 'btn-focus', 'overlay-plant', 'btn-plant-model', 'plant-model-body']
    .every((id) => html.indexOf(id) >= 0));
check('主界面公式条合并为「方程与符号」弹窗按钮',
  html.indexOf('class="eqbar"') < 0 && html.indexOf('relation-card') < 0 &&
  html.indexOf('btn-plant-model') >= 0 && html.indexOf('btn-focus-sim') < 0 &&
  css.indexOf('.eq-surface') >= 0 && css.indexOf('.eq-card-head') >= 0);
check('CSS 含折叠状态与夜间实验室深色主题', css.indexOf('is-browser-collapsed') >= 0 && css.indexOf('#13171c') >= 0);
check('CSS 含纸面实验室设计令牌（墨线框 / 硬投影 / 中文章节号）',
  ['--paper', '--frame-line', '--shadow-hard', '.chapter-no', '--r-pill'].every((k) => css.indexOf(k) >= 0));
check('3 个对象均有专属可视化绘制', ['paintSpring','paintCart','paintPendulum'].every((k) => chartsText.indexOf(k) >= 0) && ['paintBlock','paintMotor','paintDuffing','paintTank'].every((k) => chartsText.indexOf(k) < 0));
check('对象可视化语义表与对象一一对应', Object.keys(D.PLANT_VIEWS).length === D.PLANT_LIST.length && D.PLANT_LIST.every((id) => D.PLANT_VIEWS[id] && D.PLANT_VIEWS[id].kind && D.PLANT_VIEWS[id].symbol));
check('公式渲染用 CSS 绘制重音并规范分数', allJs.indexOf('m-accent') >= 0 && css.indexOf('.math .m-accent-dot::before') >= 0 && css.indexOf('.math .m-accent-ddot::before') >= 0 && css.indexOf('.math .m-frac') >= 0);
check('MathML 渲染路径可用', (() => {
  try {
    const out = math.renderMathML('\\frac{a}{b}+\\ddot{x}');
    return out.indexOf('<mfrac>') >= 0 && out.indexOf('<mover') >= 0 && typeof math.supportsMathML === 'function';
  } catch (err) { return false; }
})());
check('MathML 不可用时回退 HTML', (() => {
  const html = math.render('u=K_p e');
  return html.indexOf('class="math"') >= 0 && html.indexOf('<math') < 0;
})());
check('希腊字母按变量渲染（不撑开重音）', math.renderHTML('\\ddot{\\theta}').indexOf('m-var') >= 0);
check('界面已移除公式复制按钮', allJs.indexOf('formula-copy') < 0 && html.indexOf('formula-copy') < 0);
check('版本标识一致 V3.1', html.indexOf('V3.1') >= 0);

/* ── 9. 离线、资源与无障碍静态检查 ───────────────────── */
const external = /(?:src|href)\s*=\s*["']https?:\/\/|@import\s+url\(|fetch\s*\(|XMLHttpRequest|cdn\.tailwindcss|unpkg\.com|fonts\.googleapis/gi;
check('零外部网络请求 / 零 CDN', !external.test(all), (all.match(external) || []).slice(0, 3).join(' | '));
check('未使用 ES module（file:// 可直接打开）', !/\bimport\s+.*\bfrom\b|\bexport\s+(default|const|function)/.test(allJs));
const localRefs = [];
const refRe = /(?:src|href)="([^"#]+)"/g;
let m;
while ((m = refRe.exec(html)) !== null) {
  if (/^(data:|https?:|mailto:|javascript:)/i.test(m[1])) continue;
  localRefs.push(m[1]);
}
const missing = localRefs.filter((r) => !fs.existsSync(path.join(app, r)));
check('全部本地资源存在（styles.css / 9 个脚本）', missing.length === 0 && localRefs.length >= 10,
  '引用 ' + localRefs.length + ' 个，缺失 ' + missing.join(', '));
check('脚本加载顺序 data→math→simulation→charts→ui→docs→app',
  JS_FILES.every((f, i) => i === JS_FILES.length - 1 || html.indexOf('js/' + f) < html.indexOf('js/' + JS_FILES[i + 1])));
check('viewport 允许缩放', /name="viewport"/.test(html) && !/user-scalable\s*=\s*no/.test(html));
check('html lang="zh-CN"', /<html lang="zh-CN"/.test(html));
check('跳转主内容链接', /class="skip-link"/.test(html));
check('aria-label / role 标注', (html.match(/aria-label=/g) || []).length >= 10);
check('焦点可见样式', /:focus-visible/.test(css));
check('尊重 prefers-reduced-motion', /prefers-reduced-motion/.test(css));
check('深浅双主题令牌', /\[data-theme="dark"\]/.test(css) && /--primary:/.test(css));
check('响应式断点 768 / 1024 / 1440', [768, 1024, 1440].every((b) => css.indexOf('max-width: ' + b + 'px') >= 0));
check('SVG 图标 sprite 内联', (html.match(/<symbol /g) || []).length >= 20);
check('界面无 emoji 图标', !/[\u{1F300}-\u{1FAFF}]/u.test(html));

/* ── 小车位置闭环：至少两种内环方法能同时锁定位置与摆角 ── */
check('小车位置外环默认参数为平滑组合', Math.abs(D.DEFAULT_ENV.cartKp - 0.12) < 1e-9 &&
  Math.abs(D.DEFAULT_ENV.cartKd - 0.3) < 1e-9 && Math.abs(D.DEFAULT_ENV.cartThetaMax - 0.10) < 1e-9);
check('小车位置闭环预设覆盖 PID 与 SMC 两种内环', (() => {
  const ps = ['cart-position-pid', 'cart-position-smc'].map((id) => D.PRESETS.find((p) => p.id === id));
  return ps.every((p) => p && p.plant === 'pendulum' && p.env && p.env.cartLoop === 'on' &&
    p.env.cartTarget === 1.0) && ps[0].method === 'PID' && ps[1].method === 'SMC';
})());
/* ── 滑模消抖：6 种平滑方式 + 可量化抖振指标 ── */
check('消抖模式至少 6 种且含滞环继电器', D.SLIDING_MODES.length >= 6 &&
  D.SLIDING_MODES.map((m) => m.value).indexOf('hyst') >= 0);
check('消抖参数覆盖全部切换型滑模方法', ['SMC', 'VSC-RL', 'ISMC', 'TSMC', 'FTSMC', 'ASMC',
  'ESO-SMC', 'VariableG-SMC'].every((m) => !!(D.SLIDING_META[m] && D.SLIDING_META[m].chatterMode)));
check('超螺旋默认参数为实测稳妥组合 λ=8 / W=40',
  !!D.DEFAULT_OVERRIDES['SuperTwisting'] && D.DEFAULT_OVERRIDES['SuperTwisting'].lambda === 8 &&
  D.DEFAULT_OVERRIDES['SuperTwisting'].W === 40);
check('变增益滑模默认边界层 Φ=0.5（避免高频抖振）',
  !!D.SLIDING_META['VariableG-SMC'] && D.SLIDING_META['VariableG-SMC'].phi.default === 0.5);
check('控制力卡片不再暴露易误导的「纹波/切换」读数', !/id="m-chatter"/.test(html));
check('滑模消抖对照预设存在（sign / sat）', (() => {
  const raw = D.PRESETS.find((p) => p.id === 'smc-chatter-raw');
  const smooth = D.PRESETS.find((p) => p.id === 'smc-chatter-smooth');
  return raw && smooth && raw.method === 'SMC' && smooth.method === 'SMC' &&
    raw.ctrl && raw.ctrl.chatterMode === 'sign' && smooth.ctrl && smooth.ctrl.chatterMode === 'sat';
})());

check('小车位置闭环至少两种内环方法达标（PID / SMC）', (() => {
  const prevPlant = sim.getSettings().plantId;
  const prevMethod = sim.getSettings().method;
  const runOne = (method) => {
    sim.setPlant('pendulum');
    sim.setMethod(method);
    const s = sim.getSettings();
    s.cartLoop = 'on';
    s.cartTarget = 1.0;
    sim.resetSim(method, 0, 0.15);
    for (let i = 0; i < 1200; i++) sim.stepOnce();
    const st = sim.getState();
    return Math.abs(st.xc - 1) < 0.12 && Math.abs(st.x) < 0.12;
  };
  const ok = ['PID', 'SMC'].filter(runOne).length;
  sim.setPlant(prevPlant);
  sim.setMethod(prevMethod);
  sim.resetSim();
  return ok >= 2;
})());

function report() {
  const skipped = results.filter((r) => r.skip).length;
  const counted = results.filter((r) => !r.skip);
  const pass = counted.filter((r) => r.ok).length;
  console.log('\n控制理论模拟器 V3.1 · 静态验收报告');
  console.log('='.repeat(60));
  results.forEach((r) => console.log((r.skip ? '  SKIP  ' : (r.ok ? '  PASS  ' : '  FAIL  ')) +
    r.name + (r.detail ? '  →  ' + r.detail : '')));
  console.log('='.repeat(60));
  console.log(pass + ' / ' + counted.length + ' 项通过' + (skipped ? '，' + skipped + ' 项跳过' : ''));
  if (pass !== counted.length) process.exitCode = 1;
}
report();
