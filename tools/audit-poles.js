#!/usr/bin/env node
/* ============================================================
   tools/audit-poles.js — 闭环极点算例与实现的一致性验收
   运行：node tools/audit-poles.js

   教学文档第 3 章给出的闭环特征多项式，必须与 js/simulation.js 里
   真实跑出来的闭环行为一致：① 从文档多项式求预测极点 ② 真实仿真
   ③ 对比实测衰减率/阻尼比。不一致即 FAIL —— 宁可该方法只给定性
   说明，也不能给出与实现不符的极点。
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
['data.js', 'math.js', 'simulation.js', 'fit-data.js', 'docs.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const NS = sandbox.CtrlSim;
const D = NS.data, sim = NS.sim, docs = NS.docs;

const PLANT = 'msd';
const TARGET = 5;
const T_SIM = 30;
const DT = 0.02;

function simulate(method) {
  sim.setPlant(PLANT);
  sim.setMethod(method);
  sim.resetSim();
  const n = Math.round(T_SIM / DT);
  const xs = [];
  for (let i = 0; i < n; i++) {
    sim.stepOnce();
    xs.push(sim.getState().x);
  }
  return xs;
}

/* ── 从响应里量出：稳态值 / 超调 / 衰减率 / 调节时间 ─────
   关键：以「稳态值」而非「目标值」为基准。比例类方法本来就有
   静差，用目标值做基准会把静差误判成"没收敛"。 */
function measure(xs) {
  const tailN = Math.round(2 / DT);
  const tailSlice = xs.slice(xs.length - tailN);
  const ss = tailSlice.reduce((a, b) => a + b, 0) / tailSlice.length;
  const maxX = Math.max.apply(null, xs);
  const diverged = maxX > 50 || Math.abs(xs[xs.length - 1]) > 50;
  const overshoot = Math.abs(ss) > 1e-6 ? Math.max(0, (maxX - ss) / Math.abs(ss)) : 0;
  let peakIdx = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[peakIdx]) peakIdx = i;
  let sigmaMeas = null;
  const tail = xs.slice(peakIdx).map((x) => Math.abs(x - ss));
  const usable = [];
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] > 1e-3 && tail[i] < 50) usable.push({ t: i * DT, v: Math.log(tail[i]) });
  }
  if (usable.length >= 8) {
    const a = usable[0], b = usable[usable.length - 1];
    if (b.t > a.t) sigmaMeas = -(b.v - a.v) / (b.t - a.t);
  }
  let settle = null;
  const band = 0.02 * Math.abs(ss);
  for (let i = xs.length - 1; i >= 0; i--) {
    if (Math.abs(xs[i] - ss) > band) break;
    settle = i * DT;
  }
  return { ss, diverged, overshoot, sigmaMeas, settle, finalErr: Math.abs(ss - TARGET) };
}

/* ── 预测值：从文档的多项式系数算 ─────────────────────── */
function predict(loop) {
  const roots = docs.polyRoots(loop.coeffs);
  if (!roots.length) return null;
  const maxRe = Math.max.apply(null, roots.map((r) => r.re));
  const pairs = roots.filter((r) => Math.abs(r.im) > 1e-3);
  const zeta = pairs.length ? -pairs[0].re / Math.hypot(pairs[0].re, pairs[0].im) : null;
  const mp = zeta !== null && zeta < 1 && zeta > 0 ? Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) : 0;
  return { roots, maxRe, zeta, mp, order: loop.order };
}

/* ── 主流程 ───────────────────────────────────────────── */
const rows = [];
let checked = 0, fail = 0, skipped = 0, warned = 0;
D.methodList.forEach((key) => {
  const conf = D.CONTROLLER_CONFIGS[key];
  const ctrl = D.getDefaultParams(key);
  const loop = docs.analyzeLoop(key, conf, { plantId: PLANT, plantParams: null, ctrl: ctrl });
  if (!loop) { skipped++; return; }
  const pr = predict(loop);
  if (!pr) { skipped++; return; }
  checked++;
  const ms = measure(simulate(key));
  const issues = [];
  const predStable = pr.maxRe < -1e-6;
  /* ① 稳定/发散判定必须与仿真一致（理想化推导除外：限幅/饱和会让
        实际行为偏离线性预测，这类只记警告不算推导错误） */
  if (predStable && ms.diverged) issues.push('预测稳定但仿真发散');
  if (!predStable && !ms.diverged && !loop.approx) issues.push('预测不稳定但仿真收敛');
  /* ② 衰减率对照（仅在两者都稳定、且推导不是理想化近似时） */
  if (predStable && !ms.diverged && ms.sigmaMeas !== null && !loop.approx) {
    const ratio = ms.sigmaMeas / (-pr.maxRe);
    if (ratio < 0.5 || ratio > 2.2) {
      issues.push('衰减率不符：预测 ' + (-pr.maxRe).toFixed(3) + ' 实测 ' + ms.sigmaMeas.toFixed(3) + '（比值 ' + ratio.toFixed(2) + '）');
    }
  }
  /* ③ 超调对照（预测有二阶共轭对时） */
  if (predStable && !ms.diverged && !loop.approx && pr.zeta !== null && pr.zeta > 0.05 && pr.zeta < 0.999 && ms.overshoot > 0.003) {
    if (ms.overshoot > pr.mp * 2.2 + 0.05 || ms.overshoot < pr.mp * 0.35 - 0.02) {
      issues.push('超调不符：预测 ' + (pr.mp * 100).toFixed(1) + '% 实测 ' + (ms.overshoot * 100).toFixed(1) + '%');
    }
  }
  if (!issues.length && !predStable && ms.diverged) warned++;
  rows.push({ key, order: pr.order, maxRe: pr.maxRe, zeta: pr.zeta, mp: pr.mp, approx: !!loop.approx,
    ss: ms.ss, diverged: ms.diverged, overshoot: ms.overshoot, sigmaMeas: ms.sigmaMeas,
    settle: ms.settle, finalErr: ms.finalErr, issues });
  if (issues.length) fail++;
});

console.log('参与校验 = ' + checked + ' · 无解析算例（跳过）= ' + skipped);
console.log('');
console.log('方法'.padEnd(22) + '阶  预测maxRe  实测衰减率  超调(预测/实测)  静差    备注');
rows.forEach((r) => {
  let tag = r.approx ? '近似(见说明)' : (r.diverged ? '发散(与预测一致)' : '一致');
  if (r.issues.length) tag = 'FAIL';
  console.log(
    r.key.padEnd(22) + String(r.order).padEnd(4) +
    r.maxRe.toFixed(3).padStart(9) + '  ' +
    (r.sigmaMeas === null ? '—' : r.sigmaMeas.toFixed(3)).padStart(9) + '  ' +
    ((r.mp * 100).toFixed(1) + '%/' + (r.overshoot * 100).toFixed(1) + '%').padStart(14) + '  ' +
    r.finalErr.toFixed(3).padStart(6) + '  ' + tag
  );
});
if (fail) {
  console.log('\n不一致（FAIL）：');
  rows.filter((r) => r.issues.length).forEach((r) => {
    console.log('  ' + r.key.padEnd(22) + r.issues.join('；'));
  });
}
console.log('\nRESULT: ' + (fail ? 'FAIL (' + fail + ' 项)' : 'PASS') + (warned ? '（其中 ' + warned + ' 个方法默认参数下确实不稳定，属推导与实现一致）' : ''));
if (fail) process.exitCode = 1;
