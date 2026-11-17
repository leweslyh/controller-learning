#!/usr/bin/env node
/* ============================================================
   tools/verify-v5.js — V6.1 全量静态验收（仅 Node 内置模块）
   运行：node tools/verify-v5.js
   覆盖：脚本语法 / 159·12·11 计数 / 文档键名对齐 / 索引链接 /
        预设 plant 完整性 / 参考流形键与实现一致 / 参数标签重复键 /
        倒立摆符号自洽 / setParam 钳制 / 文案与无障碍静态条件
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');
let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  → ' + detail : '')); }
}
function section(t) { console.log('\n── ' + t + ' ──'); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* 去掉 shebang 行后再做语法检查（new Function 不识别 #! 开头） */
function readNoShebang(p) { return read(p).replace(/^#![^\n]*\n/, ''); }

/* ── 1. 全量脚本语法 ── */
section('1. 脚本语法');
const jsDir = path.join(app, 'js');
const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
let synBad = [];
jsFiles.forEach((f) => {
  try { new Function(read(path.join(jsDir, f))); }
  catch (e) { synBad.push(f + ': ' + e.message); }
});
ok(synBad.length === 0, 'public/js ' + jsFiles.length + ' 个脚本语法', synBad.join(' | '));
['tools/build-docs.js', 'tools/build-fit.js', 'tools/build-doc-stability.js',
  'tools/audit-dynamics.js', 'tools/smoke.js', 'tools/verify-v5.js'].forEach((f) => {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { ok(false, f + ' 存在'); return; }
  try { new Function(readNoShebang(p)); ok(true, f + ' 语法'); }
  catch (e) { ok(false, f + ' 语法', e.message); }
});
/* 后端函数为 ESM：去掉 export 关键字后做语法冒烟 */
['netlify/functions/chat.js', 'netlify/functions/health.js', 'netlify/functions/share.js',
  'functions/api/chat.js', 'functions/api/health.js', 'functions/api/share.js'].forEach((f) => {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { ok(false, f + ' 存在'); return; }
  const src = read(p)
    .replace(/^export\s+default\s+/gm, 'const __default__ = ')
    .replace(/^export\s+(const|let|var|function|async)\s+/gm, '$1 ');
  try { new Function(src); ok(true, f + ' 语法'); }
  catch (e) { ok(false, f + ' 语法', e.message); }
});

/* ── 2. 数据层计数与加载 ── */
section('2. 数据层计数');
const sandbox = { console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set, parseFloat, parseInt, isNaN, isFinite };
sandbox.window = sandbox;
new Function('window', read(path.join(jsDir, 'core.js')))(sandbox);
new Function('window', read(path.join(jsDir, 'data.js')))(sandbox);
const D = sandbox.CtrlSim.data;
const keys = Object.keys(D.CONTROLLER_CONFIGS);
ok(keys.length === 159, '控制器 = 159', '实际 ' + keys.length);
ok(D.sortedCategories.length === 12, '理论体系 = 12', '实际 ' + D.sortedCategories.length);
ok(D.PLANT_LIST.length === 11, '被控对象 = 11', '实际 ' + D.PLANT_LIST.length);
ok(D.methodList.length === 159, 'methodList = 159');
/* 适用性数据与参数标签（V5.1 S2） */
new Function('window', read(path.join(jsDir, 'fit-data.js')))(sandbox);
const fit = sandbox.CtrlSim.fitData;
ok(!!fit && Object.keys(fit.plantNames).length === 11 && !!fit.realVerdicts, '适用性数据 = 11 对象 × 双模式');
const labelKeys = new Set();
D.methodList.forEach((m) => Object.keys(D.getDefaultParams(m)).forEach((k) => labelKeys.add(k)));
Object.values(D.SLIDING_META || {}).forEach((o) => Object.keys(o).forEach((k) => labelKeys.add(k)));
const noLabel = [...labelKeys].filter((k) => !D.PARAM_LABELS[k]);
ok(noLabel.length === 0, '参数标签覆盖率 100%', noLabel.length + ' 个缺失：' + noLabel.slice(0, 8).join(','));

/* ── 3. 离线文档包键名对齐 ── */
section('3. 文档包与索引');
new Function('window', read(path.join(jsDir, 'docs-content.js')))(sandbox);
const docs = sandbox.__DOCS__;
const missingDocs = keys.filter((k) => !docs[k]);
const extraDocs = Object.keys(docs).filter((k) => !D.CONTROLLER_CONFIGS[k]);
ok(missingDocs.length === 0 && extraDocs.length === 0, 'docs-content 与 159 法 1:1',
  '缺 ' + missingDocs.join(',') + ' 多 ' + extraDocs.join(','));
const docsDir = path.join(app, 'docs');
const readme = read(path.join(docsDir, 'README.md'));
const links = [...readme.matchAll(/\]\(methods\/([^)]+)\)/g)].map((m) => m[1]);
const broken = links.filter((f) => !fs.existsSync(path.join(docsDir, 'methods', f)));
ok(links.length === 159 && broken.length === 0, '索引 159 条链接 0 断链',
  '共 ' + links.length + ' 断 ' + broken.length + (broken.length ? ': ' + broken.slice(0, 5).join(',') : ''));
ok(readme.indexOf('\\tag') >= 0, '索引 \\tag 说明无字符损坏');
const mdFiles = fs.readdirSync(path.join(docsDir, 'methods')).filter((f) => f.endsWith('.md'));
ok(mdFiles.length === 159, 'methods/*.md = 159 份', '实际 ' + mdFiles.length);
/* 教学文档按需加载：index.html 不再直接引入 docs-content.js（V5.1 E-27） */
const indexHtml = read(path.join(app, 'index.html'));
const docsJs = read(path.join(jsDir, 'docs.js'));
ok(indexHtml.indexOf('src="js/docs-content.js"') < 0 && docsJs.indexOf('ensureDocs') >= 0, '教学文档按需加载');
/* S3：每篇文档必须有「十、稳定性速查」与「十一、可判定练习」两章 */
const noStab = mdFiles.filter((f) => {
  const t = read(path.join(docsDir, 'methods', f));
  return t.indexOf('## 十、稳定性速查') < 0 || t.indexOf('## 十一、可判定练习') < 0;
});
ok(noStab.length === 0, '159 篇均含稳定性速查与可判定练习', noStab.slice(0, 5).join(','));
/* V5.4：每篇在推导之后必须有「五、稳定性证明」，且给出 Lyapunov 论证与编号公式 */
const noProof = mdFiles.filter((f) => {
  const t = read(path.join(docsDir, 'methods', f));
  return t.indexOf('## 五、稳定性证明') < 0 ||
    t.indexOf('Lyapunov') < 0 ||
    (t.match(/\\tag\{5\.\d+\}/g) || []).length < 2;
});
ok(noProof.length === 0, '159 篇均含 Lyapunov 稳定性证明（≥2 条编号公式）', noProof.slice(0, 5).join(','));
const wrongOrder = mdFiles.filter((f) => {
  const t = read(path.join(docsDir, 'methods', f));
  const order = ['## 四、一步步推导', '## 五、稳定性证明', '## 六、一个算例',
    '## 七、参数怎么调', '## 八、局限与常见陷阱', '## 九、延伸阅读与同类方法',
    '## 十、稳定性速查', '## 十一、可判定练习'];
  let last = -1;
  return order.some((h) => {
    const i = t.indexOf(h);
    if (i < 0 || i < last) return true;
    last = i;
    return false;
  });
});
ok(wrongOrder.length === 0, '章节顺序为四→五→…→十一', wrongOrder.slice(0, 5).join(','));
/* V5.3：方法文档不再复制「六个对象」总表，对象内容统一进对象手册 */
const stillShared = mdFiles.filter((f) => read(path.join(docsDir, 'methods', f)).indexOf('实验台提供六个被控对象') >= 0);
ok(stillShared.length === 0, '方法文档不再复制对象总表', stillShared.slice(0, 5).join(','));
const hasPlantLink = mdFiles.filter((f) => read(path.join(docsDir, 'methods', f)).indexOf('(plant:msd)') >= 0);
ok(hasPlantLink.length === 159, '每篇方法文档均链到对象手册', '实际 ' + hasPlantLink.length);
/* S4：对象手册独立打包，且每个有 doc 字段的对象都能在包内找到 */
const plantDocsPath = path.join(jsDir, 'plant-docs.js');
if (fs.existsSync(plantDocsPath)) {
  new Function('window', read(plantDocsPath))(sandbox);
  const pd = sandbox.__PLANT_DOCS__ || {};
  const need = D.PLANT_LIST.filter((id) => D.PLANTS[id].doc);
  const missingPd = need.filter((id) => !pd[D.PLANTS[id].doc]);
  ok(need.length === 11 && missingPd.length === 0, '对象手册 = 11 篇且与对象声明一致', missingPd.join(','));
} else {
  ok(false, '对象手册已打包');
}
/* 对象手册「十、默认增益速查」必须与增益卡运行默认值逐项一致（V5.3） */
try {
  execFileSync(process.execPath, [path.join(root, 'tools', 'sync-plant-gains.js'), '--check'], { stdio: 'pipe' });
  ok(true, '对象手册默认增益与增益卡一致');
} catch (err) {
  const msg = String((err.stdout && err.stdout.toString()) || err.message).trim().split('\n')[0];
  ok(false, '对象手册默认增益与增益卡一致', msg);
}

/* 3.1 文档第 6 章参数表默认值 = 实验台运行默认值（msd） */
new Function('window', read(path.join(jsDir, 'simulation.js')))(sandbox);
const simRef = sandbox.CtrlSim.sim;
const paramBad = [];
D.methodList.forEach((key) => {
  simRef.setPlant('msd');
  simRef.setMethod(key);
  const runtime = simRef.getSettings().ctrlParams;
  const file = mdFiles.find((f) => f.replace(/^\d+-/, '').replace(/\.md$/, '') === key);
  if (!file) return;
  const txt = read(path.join(docsDir, 'methods', file));
  const sec = txt.indexOf('## 七、参数怎么调');
  if (sec < 0) return;
  const lines = txt.slice(sec).split('\n');
  let inTable = false, done = false;
  lines.forEach((line) => {
    if (!done && line.startsWith('|')) inTable = true;
    if (inTable && !line.startsWith('|')) { inTable = false; done = true; }
    if (!inTable || done) return;
    const cells = line.split('|');
    if (cells.length < 5) return;
    const k = cells[1].trim();
    if (!(k in runtime) || typeof runtime[k] !== 'number') return;
    const shown = Number(cells[3].trim());
    if (!Number.isFinite(shown) || Math.abs(shown - runtime[k]) > 1e-9) {
      paramBad.push(file + ':' + k + ' doc=' + cells[3].trim() + ' runtime=' + runtime[k]);
    }
  });
});
ok(paramBad.length === 0, '文档参数默认值与运行值一致',
  paramBad.length + ' 处不一致，如 ' + paramBad.slice(0, 5).join(' | '));

/* 专题导读：求解器原理文档（独立于 159 法，不参与方法计数） */
const guidePath = path.join(jsDir, 'guides-content.js');
ok(fs.existsSync(guidePath), '专题文档包存在');
if (fs.existsSync(guidePath)) {
  new Function('window', read(guidePath))(sandbox);
  const guides = sandbox.__GUIDES__ || {};
  const g = guides['optimal-gain'];
  const guideMd = path.join(docsDir, 'guides', '001-最优增益求解原理.md');
  ok(!!g && /ITAE/.test(g.body) && /坐标模式搜索/.test(g.body) && fs.existsSync(guideMd),
    '专题「最优增益求解原理」已打包且含方法原理',
    '实际专题 ' + Object.keys(guides).join(','));
  ok(Object.keys(guides).length >= 8, '专题教程 ≥8 篇', '实际 ' + Object.keys(guides).length);
  ok(!!guides['lyapunov-direct'] && /Lyapunov|李雅普诺夫/.test(guides['lyapunov-direct'].body) &&
    !!guides['proof-writing'] && /稳定性证明/.test(guides['proof-writing'].body),
  '专题含 Lyapunov 方法与证明写法');
  const htmlSrc = read(path.join(app, 'index.html'));
  ok(htmlSrc.indexOf('js/guides-content.js') >= 0 &&
    read(path.join(jsDir, 'ui.js')).indexOf('btn-solve-doc') >= 0 &&
    read(path.join(jsDir, 'docs.js')).indexOf('openGuide') >= 0,
  '求解按钮 → 原理文档入口接线完整');
}

/* ── 4. 预设对象锁定 ── */
section('4. 预设完整性');
const noPlant = D.PRESETS.filter((p) => !p.plant || !D.PLANTS[p.plant]);
ok(noPlant.length === 0, '全部预设带合法 plant 字段', noPlant.map((p) => p.id).join(','));
const steady = D.PRESETS.find((p) => p.id === 'steady-error');
ok(steady && steady.plant === 'msd', 'steady-error 锁定 msd（k=4 生效）');
/* V5.2 新对象：视图、预设、整定与教学讲解必须齐备 */
const noView = D.PLANT_LIST.filter((id) => !D.PLANT_VIEWS[id]);
ok(noView.length === 0, '每个对象都有 PLANT_VIEWS', noView.join(','));
const noPreset = D.PLANT_LIST.filter((id) => !D.PRESETS.some((p) => p.plant === id));
ok(noPreset.length === 0, '每个对象至少 1 个预设', noPreset.join(','));
const NEW_PLANTS = ['motor', 'tank', 'pendulumDown', 'satellite', 'uavAlt'];
const noTeach = NEW_PLANTS.filter((id) => !D.PLANTS[id].teaching || !D.PLANTS[id].teaching.title);
ok(noTeach.length === 0, '新增五对象都有对象专属讲解', noTeach.join(','));
const noIface = D.PLANT_LIST.filter((id) => {
  const p = D.PLANTS[id];
  return !p.effective || !p.accel || !p.holdForce || !p.restoring;
});
ok(noIface.length === 0, '每个对象接口完整（effective/accel/holdForce/restoring）', noIface.join(','));

/* ── 5. 参考流形键名与实现一致 ── */
section('5. 参考流形图例');
const uiSrc = read(path.join(jsDir, 'ui.js'));
const chartsSrc = read(path.join(jsDir, 'charts.js'));
const refSrc = read(path.join(jsDir, 'data.js'));
const refBlock = refSrc.match(/REF_FLOW_METHODS\s*[:=]\s*\[([\s\S]*?)\]/);
const refKeys = refBlock ? [...refBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const refInvalid = refKeys.filter((k) => !D.CONTROLLER_CONFIGS[k]);
ok(refKeys.length > 0 && refInvalid.length === 0, 'REF_FLOW 键全部存在于配置', refInvalid.join(','));
ok(uiSrc.indexOf('REF_FLOW_METHODS = D.REF_FLOW_METHODS') >= 0 &&
  chartsSrc.indexOf('REF_FLOW_METHODS = D.REF_FLOW_METHODS') >= 0, 'REF_FLOW 由 data.js 单一来源下发');
const simSrc = read(path.join(jsDir, 'simulation.js'));
const implSet = new Set();
let cur = '';
simSrc.split(/\r?\n/).forEach((line) => {
  const m = line.match(/case '([^']+)'/);
  if (m) cur = m[1];
  if (/ref_display\s*=\s*[^u]/.test(line) && line.indexOf('undefined') < 0 && cur) implSet.add(cur);
});
const implOnly = [...implSet].filter((k) => refKeys.indexOf(k) < 0);
const listOnly = refKeys.filter((k) => !implSet.has(k));
ok(implOnly.length === 0 && listOnly.length === 0, 'REF_FLOW 与 ref_display 实现一一对应',
  '实现有而清单缺 ' + implOnly.join(',') + '；清单有而实现无 ' + listOnly.join(','));

/* ── 6. 参数标签重复键 ── */
section('6. 参数标签');
const dataSrc = read(path.join(jsDir, 'data.js'));
const labelBlock = dataSrc.match(/const PARAM_LABELS\s*=\s*\{([\s\S]*?)\n\s*\};/);
let dupLabels = [];
if (labelBlock) {
  const seen = new Set();
  const keyRe = /(?:^|[,{]\s*)([A-Za-z_$][\w$]*)\s*:/gm;
  let m;
  while ((m = keyRe.exec(labelBlock[1]))) {
    if (seen.has(m[1])) dupLabels.push(m[1]);
    seen.add(m[1]);
  }
}
ok(dupLabels.length === 0, 'PARAM_LABELS 无重复键', dupLabels.join(','));
ok(!!D.CONTROLLER_CONFIGS['Robust-NL-Damping'].params.gamma_rd &&
  !D.CONTROLLER_CONFIGS['Robust-NL-Damping'].params.gamma_d, 'Robust-NL-Damping 使用 gamma_rd');
ok(simSrc.indexOf('cP.gamma_rd') >= 0, 'simulation 控制律同步 gamma_rd');
ok(!!D.PARAM_LABELS.gamma_d && D.PARAM_LABELS.gamma_d.indexOf('学习率') >= 0, 'gamma_d 标签归属学习率');
/* V5.3：数学符号必须用 TeX（$K_p$），不得残留 "Kp" / "Qx" / "L1" 这类裸写法 */
const plainSym = Object.keys(D.PARAM_LABELS).filter((k) =>
  /(^|[^A-Za-z$\\{])(Kp|Ki|Kd|Qx|Qv|Qe|Rw|L1|L2|Wo|Wc)([^A-Za-z_}]|$)/.test(D.PARAM_LABELS[k]));
ok(plainSym.length === 0, '参数标签符号均为 TeX 下标', plainSym.slice(0, 8).join(','));

/* ── 7. 倒立摆符号自洽 ── */
section('7. 倒立摆符号');
const pend = D.PLANTS.pendulum;
ok(pend.tex.indexOf('+\\frac{1}{M l}F') >= 0, '显示方程末项为 +F/(Ml)');
const aPlus = pend.accel({ x: 0, v: 0 }, 1, 0, 0, pend.defaults);
ok(aPlus > 0, 'accel 对正推力响应为正（与显示方程一致）');
const readmeMain = read(path.join(root, 'README.md'));
ok(readmeMain.indexOf('+\\frac{1}{Ml}u') >= 0, 'README 方程符号与实现一致');

/* ── 8. setParam 钳制（行为断言） ── */
section('8. 参数钳制');
new Function('window', read(path.join(jsDir, 'simulation.js')))(sandbox);
const sim = sandbox.CtrlSim.sim;
sim.setPlant('freeMass');
sim.setParam('m', -5, 'plant');
ok(sim.getSettings().plantParams.freeMass.m === 0.5, '负质量被钳制到下限 0.5');
sim.setParam('m', 999, 'plant');
ok(sim.getSettings().plantParams.freeMass.m === 10, '超上限质量被钳制到 10');
sim.setParam('m', 'abc', 'plant');
ok(sim.getSettings().plantParams.freeMass.m === 10, '非法输入保留旧值');
sim.setMethod('PID');
const kpMax = D.CONTROLLER_CONFIGS.PID.params.kp[2];
sim.setParam('kp', kpMax + 1000, 'ctrl');
ok(sim.getSettings().ctrlParams.kp === kpMax, '控制增益超界被钳制');
sim.setParam('chatterMode', 'tanh', 'ctrl');
ok(sim.getSettings().ctrlParams.chatterMode === 'tanh', '下拉字符串值不受钳制影响');
/* 预设行为：steady-error 应用后对象与刚度正确 */
sim.applyPreset(steady);
ok(sim.getSettings().plantId === 'msd' && sim.getSettings().plantParams.msd.k === 4,
  'applyPreset(steady-error) → msd 且 k=4');

/* ── 9. 三经典对象文案 ── */
section('9. 对象文案');
['freeMass', 'msd', 'pendulum'].forEach((id) => {
  ok((D.PLANTS[id].desc || '').length > 30, id + ' 物理含义非空');
});
ok(D.PLANTS.missile.teaching.body.indexOf('$K_p>|k|$') >= 0, 'missile 判据文案含 >');

/* ── 10. 页面文案与无障碍静态条件 ── */
section('10. 文案与无障碍');
const html = read(path.join(app, 'index.html'));
ok(html.indexOf('11 个被控对象') >= 0, 'meta description 为 11 对象');
ok(/id="stat-plants">11</.test(html), 'stat-plants 静态值 11');
ok(html.indexOf('eqbar') < 0, '页面无 eqbar 残留');
ok(html.indexOf('id="browser-search"') >= 0, '左栏搜索框存在');
ok(uiSrc.indexOf('3 个经典被控对象') < 0 && uiSrc.indexOf('无需 KaTeX') < 0, '帮助文案无过时表述');
ok(uiSrc.indexOf("['/', '聚焦左栏方法搜索']") >= 0, '帮助快捷键表含 /');
const appSrc = read(path.join(jsDir, 'app.js'));
ok(appSrc.indexOf('VERSION = D.VERSION') >= 0 && /const VERSION = '6\.3'/.test(dataSrc),
  '版本号单一来源 6.3');
ok(appSrc.indexOf("case '/'") >= 0, '/ 快捷键已实现');
ok(appSrc.indexOf('150 * (plant.disturbanceScale || 1)') >= 0, '扰动 toast 随对象缩放');
const css = read(path.join(app, 'styles.css'));
ok(css.indexOf('prefers-reduced-motion') >= 0, '支持 prefers-reduced-motion');
ok(css.indexOf('--faint-ink: #6e7168') >= 0, '浅色小字对比度令牌已加深');
ok(uiSrc.indexOf('function trapFocus') >= 0, '焦点陷阱助手存在');
const docsSrc = read(path.join(jsDir, 'docs.js'));
const asSrc = read(path.join(jsDir, 'assistant.js'));
ok(docsSrc.indexOf('NS.ui.trapFocus') >= 0, '文档阅读器接入焦点陷阱');
ok(asSrc.indexOf('NS.ui.trapFocus') >= 0, '助手设置接入焦点陷阱');
ok(uiSrc.indexOf('ArrowDown') >= 0 && uiSrc.indexOf('menuitem') >= 0, '导出菜单支持方向键');
ok(uiSrc.indexOf('data-reset-group') >= 0 &&
  simSrc.indexOf('function resetParamGroup') >= 0 &&
  appSrc.indexOf('resetParamGroup') >= 0,
'实验参数各子卡片「恢复本组」接线完整');
ok(uiSrc.indexOf('核验说明：') < 0, '原论文卡不显示核验说明');
ok(/\.paper-foot\s*\{[^}]*justify-content:\s*center/.test(css), '查看原文按钮居中');
['netlify/functions/chat.js', 'functions/api/chat.js'].forEach((f) => {
  ok(read(path.join(root, f)).indexOf('流式 55s / 非流式 30s') >= 0, f + ' 超时注释一致');
});
['netlify/functions/health.js', 'functions/api/health.js'].forEach((f) => {
  ok(/plants:\s*11/.test(read(path.join(root, f))), f + ' 自述 11 对象');
});

/* ── 11. 可视化规范（V6.2） ── */
section('11. 可视化规范');
ok(chartsSrc.indexOf('时间 t (s)') >= 0 && chartsSrc.indexOf('xUnit') < 0,
  '坐标轴单位统一写入括号');
ok(chartsSrc.indexOf('function controlArc') >= 0 &&
  chartsSrc.indexOf('controlArc(ctx, p, cx, pivotY') >= 0 &&
  chartsSrc.indexOf('forceArrow(b, cartX, pivotY + cartH / 2') >= 0,
  '倒立摆控制力在小车、关节力矩锚定摆杆');
ok(chartsSrc.indexOf("view.kind !== 'tank'") >= 0, '液位对象不再绘制无关位置刻度');
ok(chartsSrc.indexOf('tZ * 1.25') >= 0, '高度通道按目标高度构图');
ok(/settleTol/.test(dataSrc) && /rateTol/.test(dataSrc), '定格收敛带由 PLANT_VIEWS 统一声明');
ok(/details class="profile-block"[\s\S]{0,240}适用对象/.test(uiSrc) &&
  uiSrc.indexOf('class="fit-details"') >= 0, '适用对象为折叠块');
ok(uiSrc.indexOf('profileDisplayName(conf.name)') >= 0, '档案标题仅显示中文名');
ok(chartsSrc.indexOf('pt.v * angK') >= 0 && chartsSrc.indexOf("°/s") >= 0,
  '角度对象速度轴统一为 °/s');
ok(css.indexOf('justify-content: safe center') >= 0, '长公式卡不再左右裁切');
ok(chartsSrc.indexOf("view.kind !== 'tank' && view.kind !== 'altitude'") >= 0,
  '液位/高度视图不画无关水平网格');

/* ── 汇总 ── */
console.log('\n════════════════════════════════');
console.log('验收结果：' + pass + ' PASS / ' + fail + ' FAIL');
if (fail) { console.log('存在未通过项，请修复后重跑。'); process.exit(1); }
console.log('V6.3 静态验收全部通过。');