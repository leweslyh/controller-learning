#!/usr/bin/env node
/* ============================================================
   tools/tune-plants.js — 对象感知的默认参数搜索
   运行：node tools/tune-plants.js
   对审计中的 unstable / saturated 组合，按 5 档缩放搜索增益类参数，
   输出「全局默认覆盖 / 对象专用覆盖 / 无法救回」三类建议到
   docs/调参建议.json，供人工审查后写入 js/data.js。
   说明：开发期工具，页面运行时不加载；不改动任何公式分支。
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

const STEPS = 600;
const TAIL = 100;
const SCALES = [1, 0.5, 0.25, 0.1, 1.8];
const GAIN_RE = /^(kp|ki|kd|k_gain|k_esc|k_anc|k_hat|c1|c2|c_surface|gamma|gamma_sg|q_weight|q_x|q_v|q_i|q_e|r_weight|r_w|r_u|w_bw|w_o|w_c|wo|wc|b0|alpha_c|alpha_a|a_A|a_O|w_e|w_v|rho|lam|lambda|force|step_nr|l1|l2|nu|ny|n_lr|eta|mu|rho_0|k_prev|k_p|k_i|k_d|k_nd|beta|wn)/;

function grade(plantId, method, overrides) {
  sim.setPlant(plantId);
  sim.setMethod(method);
  if (overrides) Object.keys(overrides).forEach((k) => sim.setParam(k, overrides[k], 'ctrl'));
  sim.resetSim();
  const limit = sim.getSettings().actuatorLimit;
  const target = sim.getSettings().physParams.target;
  const gate = plantId === 'pendulum' ? 2.5 : 50;
  let maxX = 0, maxU = 0, sat = 0, nan = false;
  const tail = [];
  for (let i = 0; i < STEPS; i++) {
    sim.stepOnce();
    const s = sim.getState();
    const u = sim.getMetrics().u;
    if (!Number.isFinite(s.x) || !Number.isFinite(s.v) || !Number.isFinite(u)) { nan = true; break; }
    maxX = Math.max(maxX, Math.abs(s.x));
    maxU = Math.max(maxU, Math.abs(u));
    if (Math.abs(u) >= limit * 0.98) sat++;
    if (i >= STEPS - TAIL) tail.push(Math.abs(target - s.x));
  }
  const finalErr = tail.length ? tail[tail.length - 1] : Math.abs(target - sim.getState().x);
  const satRatio = sat / STEPS;
  const diverged = nan || maxX > gate;
  const converged = !diverged && finalErr < 0.05 && Math.abs(sim.getState().v) < 0.05;
  let g;
  if (nan || diverged) g = 'unstable';
  else if (satRatio > 0.5) g = 'saturated';
  else if (converged) g = 'good';
  else if (finalErr > 1.0) g = 'poor';
  else g = 'fair';
  const rank = { unstable: 0, saturated: 1, poor: 2, fair: 3, good: 4 }[g];
  return { grade: g, rank, finalErr, satRatio, maxX, maxU };
}

function scaledParams(plantId, method, scale) {
  const conf = D.CONTROLLER_CONFIGS[method];
  const out = {};
  Object.keys(conf.params).forEach((key) => {
    if (!GAIN_RE.test(key)) return;
    const def = conf.params[key][0];
    const min = conf.params[key][1];
    const max = conf.params[key][2];
    const step = conf.params[key][3] || 0.01;
    let v = def * scale;
    v = Math.max(min, Math.min(max, v));
    v = Math.round(v / step) * step;
    v = Number(v.toFixed(6));
    if (Math.abs(v - def) > 1e-9) out[key] = v;
  });
  return out;
}

function search(plantId, method) {
  const base = grade(plantId, method, null);
  if (base.rank >= 4) return { base, best: null };
  let best = null;
  SCALES.forEach((s) => {
    const over = scaledParams(plantId, method, s);
    if (!Object.keys(over).length) return;
    const r = grade(plantId, method, over);
    if (!best || r.rank > best.result.rank ||
        (r.rank === best.result.rank && r.finalErr < best.result.finalErr)) {
      best = { scale: s, params: over, result: r };
    }
  });
  return { base, best };
}

const plants = D.PLANT_LIST;
const global = {}, plantOver = {}, unsolved = [], improved = [];
plants.forEach((plantId) => {
  D.methodList.forEach((method) => {
    const { base, best } = search(plantId, method);
    if (!best || best.result.rank <= base.rank) {
      if (['unstable', 'saturated'].includes(base.grade)) unsolved.push({ plant: plantId, method, grade: base.grade });
      return;
    }
    const rec = { plant: plantId, method, before: base.grade, after: best.result.grade, params: best.params };
    if (plantId === 'msd') global[method] = best.params;
    else {
      plantOver[plantId] = plantOver[plantId] || {};
      plantOver[plantId][method] = best.params;
    }
    improved.push(rec);
  });
});

const out = { global, plant: plantOver, unsolved, improved };
const file = path.join(app, 'docs', '调参建议.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');

console.log('可改善组合 = ' + improved.length + '，其中全局覆盖 ' + Object.keys(global).length + ' 个');
improved.forEach((r) => {
  console.log('  ' + r.plant.padEnd(9) + r.method.padEnd(24) + r.before + ' → ' + r.after +
    '  ' + JSON.stringify(r.params));
});
console.log('\n无法通过缩放救回（' + unsolved.length + '）：');
unsolved.forEach((r) => console.log('  ' + r.plant.padEnd(9) + r.method.padEnd(24) + r.grade));
console.log('\n已写入 ' + file);
