#!/usr/bin/env node
/* ============================================================
   tools/audit-methods.js — 99 方法 × 3 对象 默认参数审计
   运行：node tools/audit-methods.js [--markdown]
   对每个「方法 × 对象」用默认参数、默认实验条件跑 800 步（16 s），记录：
     崩溃(NaN/Inf) / 发散 / 控制力长期饱和 / 零控制 / 收敛 / 末段误差 / RMSE
   输出：控制台汇总 + 问题清单；加 --markdown 写入 docs/方法适配审计.md
   说明：这是开发期审计工具，页面运行时不加载。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
/* 前端静态站根目录（Netlify publish 目录） */
const app = path.join(root, 'public');
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite,
  document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
['data.js', 'math.js', 'simulation.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const NS = sandbox.CtrlSim;
const D = NS.data;
const sim = NS.sim;

const STEPS = 800;
const CONVERGE_WINDOW = 100;

function audit(plantId, key) {
  sim.setPlant(plantId);
  sim.setMethod(key);
  const limit = sim.getSettings().actuatorLimit;
  const target = sim.getSettings().physParams.target;
  const gate = plantId === 'pendulum' ? 2.5 : 50;
  let maxX = 0, maxV = 0, maxU = 0, sat = 0, nan = false;
  const tail = [];
  for (let i = 0; i < STEPS; i++) {
    sim.stepOnce();
    const s = sim.getState();
    const u = sim.getMetrics().u;
    if (!Number.isFinite(s.x) || !Number.isFinite(s.v) || !Number.isFinite(u)) { nan = true; break; }
    maxX = Math.max(maxX, Math.abs(s.x));
    maxV = Math.max(maxV, Math.abs(s.v));
    maxU = Math.max(maxU, Math.abs(u));
    if (Math.abs(u) >= limit * 0.98) sat++;
    if (i >= STEPS - CONVERGE_WINDOW) tail.push(Math.abs(target - s.x));
  }
  const finalErr = tail.length ? tail[tail.length - 1] : Math.abs(target - sim.getState().x);
  const tailRms = tail.length ? Math.sqrt(tail.reduce((a, b) => a + b * b, 0) / tail.length) : finalErr;
  const m = sim.getMetrics();
  const diverged = nan || maxX > gate || maxV > (plantId === 'pendulum' ? 20 : 500);
  const zero = !nan && maxU < 1e-9;
  const converged = !diverged && !zero && finalErr < 0.05 && Math.abs(sim.getState().v) < 0.05;
  const satRatio = sat / STEPS;
  let grade;
  if (nan || diverged) grade = 'unstable';
  else if (zero) grade = 'zero';
  else if (satRatio > 0.5) grade = 'saturated';
  else if (converged) grade = 'good';
  else if (finalErr > 1.0) grade = 'poor';
  else grade = 'fair';
  return {
    plant: plantId, method: key, grade,
    maxX, maxV, maxU, satRatio, finalErr, tailRms,
    rmse: m.rmse, energy: m.energy, energyDyn: m.energyDyn,
    converged, diverged, zero, nan
  };
}

const rows = [];
D.PLANT_LIST.forEach((plantId) => {
  D.methodList.forEach((key) => { rows.push(audit(plantId, key)); });
});

const order = ['unstable', 'zero', 'saturated', 'poor', 'fair', 'good'];
const counts = {};
rows.forEach((r) => { counts[r.grade] = (counts[r.grade] || 0) + 1; });
console.log('审计组合数 = ' + rows.length + '（' + D.methodList.length + ' 方法 × ' + D.PLANT_LIST.length + ' 对象）');
console.log('评级分布 = ' + order.map((g) => g + ':' + (counts[g] || 0)).join('  '));

const problems = rows.filter((r) => ['unstable', 'zero', 'saturated'].includes(r.grade));
console.log('\n严重问题组合（' + problems.length + '）：');
problems.forEach((r) => {
  console.log('  ' + r.plant.padEnd(9) + r.method.padEnd(24) + r.grade.padEnd(10) +
    'maxX=' + r.maxX.toFixed(1).padStart(8) + ' maxU=' + r.maxU.toFixed(1).padStart(7) +
    ' sat=' + (r.satRatio * 100).toFixed(0).padStart(3) + '%  e=' + r.finalErr.toFixed(2));
});

const poor = rows.filter((r) => r.grade === 'poor');
console.log('\n表现差但未崩溃（' + poor.length + '）：');
poor.slice(0, 40).forEach((r) => {
  console.log('  ' + r.plant.padEnd(9) + r.method.padEnd(24) + 'e=' + r.finalErr.toFixed(2) + '  rmse=' + r.rmse.toFixed(2));
});

/* 逐方法三对象评级矩阵 */
console.log('\n三对象评级矩阵（msd / freeMass / pendulum）：');
D.methodList.forEach((key) => {
  const g = D.PLANT_LIST.map((p) => {
    const r = rows.find((x) => x.plant === p && x.method === key);
    return (r ? r.grade : '-').padEnd(9);
  }).join(' ');
  console.log('  ' + key.padEnd(24) + g);
});

if (process.argv.includes('--markdown')) {
  const lines = ['# 99 方法 × 3 对象 · 默认参数审计', '',
    '> 由 `node tools/audit-methods.js --markdown` 生成。默认参数、默认实验条件、800 步（16 s）。',
    '> 评级：good 收敛 / fair 未完全收敛但稳定 / poor 明显偏差 / saturated 控制力长期饱和 / zero 无控制输出 / unstable 崩溃或发散。',
    '', '## 汇总', '',
    '| 评级 | 数量 |', '| --- | --- |'];
  order.forEach((g) => lines.push('| ' + g + ' | ' + (counts[g] || 0) + ' |'));
  lines.push('', '## 严重问题组合', '', '| 对象 | 方法 | 评级 | max\\|x\\| | max\\|u\\| | 饱和占比 | 末段误差 |', '| --- | --- | --- | --- | --- | --- | --- |');
  problems.forEach((r) => lines.push('| ' + r.plant + ' | `' + r.method + '` | ' + r.grade + ' | ' +
    r.maxX.toFixed(2) + ' | ' + r.maxU.toFixed(1) + ' | ' + (r.satRatio * 100).toFixed(0) + '% | ' + r.finalErr.toFixed(3) + ' |'));
  lines.push('', '## 全量矩阵', '', '| 方法 | msd | freeMass | pendulum |', '| --- | --- | --- | --- |');
  D.methodList.forEach((key) => {
    const cells = D.PLANT_LIST.map((p) => {
      const r = rows.find((x) => x.plant === p && x.method === key);
      return r ? r.grade : '-';
    });
    lines.push('| `' + key + '` | ' + cells.join(' | ') + ' |');
  });
  const out = path.join(app, 'docs', '方法适配审计.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  console.log('\n已写入 ' + out);
}
