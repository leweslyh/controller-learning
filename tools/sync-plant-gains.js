#!/usr/bin/env node
/* ============================================================
   tools/sync-plant-gains.js — 把增益卡的运行默认值同步进对象手册（V5.3）
   运行：node tools/sync-plant-gains.js [--check]
   做法：用 vm 加载 data.js / simulation.js，对每个对象执行
         setPlant → setMethod，读取 settings.ctrlParams（即增益卡显示值），
         生成「十、默认增益速查」章节，替换手册末尾同名章节。
   说明：--check 只比对不写盘，供 verify-v5.js / CI 使用。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');
const plantsDir = path.join(app, 'docs', 'plants');
const CHECK = process.argv.indexOf('--check') >= 0;

const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
['data.js', 'simulation.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const D = sandbox.CtrlSim.data;
const sim = sandbox.CtrlSim.sim;

/* 代表性方法：覆盖入门 P/PI/PD/PID、最优 LQR 与滑模 SMC */
const METHODS = ['P', 'PI', 'PD', 'PID', 'LQR', 'SMC'];

function fmtVal(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(Number(n.toFixed(4)));
}
function symbolOf(key) {
  const label = D.PARAM_LABELS[key] || key;
  const m = /\$([^$]+)\$/.exec(label);
  return m ? m[1] : key;
}
function gainCell(method) {
  const cp = sim.getSettings().ctrlParams;
  const conf = D.CONTROLLER_CONFIGS[method];
  const keys = Object.keys(conf.params || {}).filter((k) => typeof cp[k] === 'number');
  if (!keys.length) return '—';
  const parts = keys.map((k) => symbolOf(k) + '=' + fmtVal(cp[k]));
  return '$' + parts.join(',\\ ') + '$';
}

function section(plantId) {
  sim.setPlant(plantId);
  const rows = METHODS.filter((m) => D.CONTROLLER_CONFIGS[m]).map((m) => {
    sim.setMethod(m);
    return '| ' + m + ' | ' + gainCell(m) + ' |';
  });
  return [
    '## 十、默认增益速查（与增益卡同步）',
    '',
    '下表由 `tools/sync-plant-gains.js` 从运行态读取——**切换对象后增益卡显示的默认值与本表逐项一致**；' +
      '对象变化时种子与对象专用整定会一起生效，因此不同对象的同一方法默认增益可能不同。',
    '',
    '| 方法 | 默认增益 |',
    '| --- | --- |',
    ...rows,
    '',
    '> 其余方法的默认值可在实验台「增益矩阵」卡片直接查看；完整 159 法默认值见控制器档案。',
    ''
  ].join('\n');
}

const files = fs.readdirSync(plantsDir).filter((f) => /^\d{2,3}-.*\.md$/.test(f)).sort();
let changed = 0, stale = [];
files.forEach((fn) => {
  const full = path.join(plantsDir, fn);
  const src = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  const meta = /^slug:\s*(\S+)/m.exec(src);
  const slug = meta ? meta[1] : fn.replace(/^\d{2,3}-/, '').replace(/\.md$/, '');
  if (!D.PLANTS[slug]) return;
  const cut = src.search(/^## 十、默认增益速查/m);
  const base = (cut >= 0 ? src.slice(0, cut) : src).replace(/\n+$/, '\n\n');
  const next = base + section(slug) + '\n';
  if (next !== src) {
    changed++;
    if (CHECK) stale.push(fn);
    else fs.writeFileSync(full, next, 'utf8');
  }
});
if (CHECK) {
  console.log(stale.length ? '✗ 对象手册默认增益与运行值不一致：' + stale.join(', ')
    : '✓ 11 篇对象手册默认增益与运行值一致');
  process.exit(stale.length ? 1 : 0);
}
console.log('已同步 ' + changed + ' / ' + files.length + ' 篇对象手册的默认增益表');
