#!/usr/bin/env node
/* ============================================================
   tools/verify-v5.js — V5.0 全量静态验收（仅 Node 内置模块）
   运行：node tools/verify-v5.js
   覆盖：脚本语法 / 159·12·6 计数 / 文档键名对齐 / 索引链接 /
        预设 plant 完整性 / 参考流形键与实现一致 / 参数标签重复键 /
        倒立摆符号自洽 / setParam 钳制 / 文案与无障碍静态条件
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

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
['tools/build-docs.js', 'tools/build-fit.js', 'tools/verify-v5.js'].forEach((f) => {
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
new Function('window', read(path.join(jsDir, 'data.js')))(sandbox);
const D = sandbox.CtrlSim.data;
const keys = Object.keys(D.CONTROLLER_CONFIGS);
ok(keys.length === 159, '控制器 = 159', '实际 ' + keys.length);
ok(D.sortedCategories.length === 12, '理论体系 = 12', '实际 ' + D.sortedCategories.length);
ok(D.PLANT_LIST.length === 6, '被控对象 = 6', '实际 ' + D.PLANT_LIST.length);
ok(D.methodList.length === 159, 'methodList = 159');

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

/* ── 5. 参考流形键名与实现一致 ── */
section('5. 参考流形图例');
const uiSrc = read(path.join(jsDir, 'ui.js'));
const refBlock = uiSrc.match(/REF_FLOW_METHODS\s*=\s*\[([\s\S]*?)\]/);
const refKeys = refBlock ? [...refBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const refInvalid = refKeys.filter((k) => !D.CONTROLLER_CONFIGS[k]);
ok(refKeys.length > 0 && refInvalid.length === 0, 'REF_FLOW 键全部存在于配置', refInvalid.join(','));
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
ok(html.indexOf('6 个被控对象') >= 0, 'meta description 为 6 对象');
ok(/id="stat-plants">6</.test(html), 'stat-plants 静态值 6');
ok(html.indexOf('eqbar') < 0, '页面无 eqbar 残留');
ok(html.indexOf('id="browser-search"') >= 0, '左栏搜索框存在');
ok(uiSrc.indexOf('3 个经典被控对象') < 0 && uiSrc.indexOf('无需 KaTeX') < 0, '帮助文案无过时表述');
ok(uiSrc.indexOf("['/', '聚焦左栏方法搜索']") >= 0, '帮助快捷键表含 /');
const appSrc = read(path.join(jsDir, 'app.js'));
ok(appSrc.indexOf("VERSION = '5.0'") >= 0, '分享版本号 5.0');
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
  ok(/plants:\s*6/.test(read(path.join(root, f))), f + ' 自述 6 对象');
});

/* ── 汇总 ── */
console.log('\n════════════════════════════════');
console.log('验收结果：' + pass + ' PASS / ' + fail + ' FAIL');
if (fail) { console.log('存在未通过项，请修复后重跑。'); process.exit(1); }
console.log('V5.0 静态验收全部通过。');