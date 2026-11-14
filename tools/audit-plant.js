#!/usr/bin/env node
/* ============================================================
   tools/audit-plant.js — 单对象 × 全方法的收敛审计与增益搜索
   运行：
     node tools/audit-plant.js freeMass                仅审计
     node tools/audit-plant.js freeMass --tune         审计 + 逐方法增益搜索
     node tools/audit-plant.js freeMass --pc=c=1.0     带对象参数覆盖审计
     node tools/audit-plant.js freeMass --sweep        对象阻尼 c 扫描（定默认值用）
   产物：stdout 评级表；--tune 时写出
     docs/对象调参-<plant>.json  可直接粘贴进 js/data.js 的 PLANT_TUNING
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

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));
const plantId = positional[0] || 'freeMass';
const TUNE = flags.has('--tune');
const SWEEP = flags.has('--sweep');
const plantOverrides = {};
argv.forEach((a) => {
  const m = /^--pc=([A-Za-z_0-9]+)=(-?[\d.]+)$/.exec(a);
  if (m) plantOverrides[m[1]] = Number(m[2]);
});

const STEPS = 800;
const TAIL = 100;
/* 最终评级的噪声实现次数（部分控制器内部自带随机测量噪声） */
const FINAL_REPS = 7;
const GAIN_RE = /^(kp|ki|kd|k_gain|k_esc|k_anc|k_hat|c1|c2|c_surface|gamma|gamma_sg|q_weight|q_x|q_v|q_i|q_e|r_weight|r_w|r_u|w_bw|w_o|w_c|wo|wc|b0|alpha_c|alpha_a|a_A|a_O|w_e|w_v|rho|lam|lambda|force|step_nr|l1|l2|nu|n_lr|eta|mu|rho_0|k_prev|k_p|k_i|k_d|k_nd|beta|wn|kp1|kp2|kr|kf|kv)/;
const MULT = [0.15, 0.3, 0.5, 0.7, 0.85, 1, 1.2, 1.5, 2, 3, 5];
const FINE = [0.9, 0.94, 0.97, 1.03, 1.06, 1.12];

function median(a) {
  if (!a.length) return Infinity;
  const b = a.slice().sort((x, y) => x - y);
  const m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}

/* 单次仿真：返回末段误差/饱和率/末速/峰值位移
   注意：部分控制器内部自带 gaussNoise（未播种），单次结果有随机性，
   故评级用多次实现的中位数，避免临界方法在 good/fair 间抖动。 */
function runOnce(method, overrides, steps) {
  sim.setPlant(plantId);
  sim.setMethod(method);
  Object.keys(plantOverrides).forEach((k) => sim.setParam(k, plantOverrides[k], 'plant'));
  if (overrides) Object.keys(overrides).forEach((k) => sim.setParam(k, overrides[k], 'ctrl'));
  sim.resetSim();
  const limit = sim.getSettings().actuatorLimit;
  const target = sim.getSettings().physParams.target;
  const gate = plantId === 'pendulum' ? 2.5 : 50;
  let maxX = 0, maxU = 0, sat = 0, nan = false, sumErr = 0, tail = [], vEnd = 0;
  for (let i = 0; i < steps; i++) {
    sim.stepOnce();
    const s = sim.getState();
    const u = sim.getMetrics().u;
    if (!Number.isFinite(s.x) || !Number.isFinite(s.v) || !Number.isFinite(u)) { nan = true; break; }
    maxX = Math.max(maxX, Math.abs(s.x));
    maxU = Math.max(maxU, Math.abs(u));
    if (Math.abs(u) >= limit * 0.98) sat++;
    sumErr += Math.abs(target - s.x);
    if (i >= steps - TAIL) tail.push(Math.abs(target - s.x));
    vEnd = Math.abs(s.v);
  }
  const finalErr = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : Math.abs(target - sim.getState().x);
  return { finalErr, satRatio: sat / steps, maxX, maxU, vEnd, nan, diverged: nan || maxX > gate, meanErr: sumErr / steps };
}

function run(method, overrides, steps, reps) {
  reps = reps || 1;
  const errs = [], sats = [], vends = [], maxXs = [];
  let diverged = false;
  for (let r = 0; r < reps; r++) {
    const one = runOnce(method, overrides, steps);
    errs.push(one.finalErr); sats.push(one.satRatio); vends.push(one.vEnd); maxXs.push(one.maxX);
    if (one.diverged) { diverged = true; break; }
  }
  const finalErr = median(errs);
  const satRatio = Math.max.apply(null, sats);
  const vEnd = Math.max.apply(null, vends);
  const maxX = Math.max.apply(null, maxXs);
  let grade;
  if (diverged) grade = 'unstable';
  else if (satRatio > 0.5) grade = 'saturated';
  else if (finalErr < 0.05 && vEnd < 0.05) grade = 'good';
  else if (finalErr > 1.0) grade = 'poor';
  else grade = 'fair';
  const rank = { unstable: 0, saturated: 1, poor: 2, fair: 3, good: 4 }[grade];
  const score = (diverged ? 1e6 : 0) + finalErr * 10 + vEnd * 5 + satRatio * 50;
  /* 控制目标是否达成：末段位置误差进入容差（与是否饱和、速度抖振解耦） */
  const goalMet = !diverged && finalErr < 0.05;
  return { grade, rank, score, finalErr, satRatio, maxX, maxU: 0, vEnd, goalMet };
}

function gainKeys(method) {
  const conf = D.CONTROLLER_CONFIGS[method];
  if (!conf) return [];
  return Object.keys(conf.params).filter((k) => GAIN_RE.test(k));
}
function clampTo(method, key, v) {
  const p = D.CONTROLLER_CONFIGS[method].params[key];
  const min = p[1], max = p[2], step = p[3] || 0.01;
  v = Math.max(min, Math.min(max, v));
  v = Math.round(v / step) * step;
  return Number(v.toFixed(6));
}
function search(method, base) {
  const keys = gainKeys(method);
  const conf = D.CONTROLLER_CONFIGS[method];
  let best = {};
  let bestRes = base;
  /* 字典序比较：评级优先，评级相同时才看平滑评分，避免把 good 换掉 */
  const better = (res, ref) => res.rank > ref.rank || (res.rank === ref.rank && res.score < ref.score - 1e-9);
  const sweep = (mults) => {
    let improved = false;
    for (const key of keys) {
      const def = conf.params[key][0];
      const cur = best[key] !== undefined ? best[key] : def;
      let localBest = cur, localRes = bestRes;
      for (const m of mults) {
        if (m === 1) continue;
        const cand = clampTo(method, key, cur * m);
        if (cand === localBest) continue;
        const trial = { ...best, [key]: cand };
        const res = run(method, trial, STEPS);
        if (better(res, localRes)) { localBest = cand; localRes = res; }
      }
      if (localBest !== cur) { best = { ...best, [key]: localBest }; bestRes = localRes; improved = true; }
    }
    return improved;
  };
  for (let pass = 0; pass < 4; pass++) { if (!sweep(MULT)) break; }
  for (let pass = 0; pass < 4; pass++) { if (!sweep(FINE)) break; }
  const params = {};
  Object.keys(best).forEach((k) => {
    const def = conf.params[k][0];
    if (Math.abs(best[k] - def) > 1e-9) params[k] = best[k];
  });
  return { params, result: bestRes };
}

if (SWEEP) {
  console.log('对象 = ' + plantId + '   阻尼 c 扫描（默认增益，未调参）');
  console.log('c        good fair poor saturated unstable');
  [0, 0.2, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0].forEach((c) => {
    plantOverrides.c = c;
    const g = { good: 0, fair: 0, poor: 0, saturated: 0, unstable: 0 };
    D.methodList.forEach((m) => { g[run(m, null, STEPS).grade]++; });
    console.log(String(c).padEnd(8) + String(g.good).padStart(4) + String(g.fair).padStart(5) +
      String(g.poor).padStart(5) + String(g.saturated).padStart(10) + String(g.unstable).padStart(9));
  });
  process.exit(0);
}

/* 深搜：对仍未达标的方法，在全部数值参数上做随机多起点 + 坐标下降 */
function allNumKeys(method) {
  const conf = D.CONTROLLER_CONFIGS[method];
  if (!conf) return [];
  return Object.keys(conf.params).filter((k) => typeof conf.params[k][0] === 'number');
}
function deepSearch(method, base, best) {
  const conf = D.CONTROLLER_CONFIGS[method];
  const keys = allNumKeys(method);
  const better = (res, ref) => res.rank > ref.rank || (res.rank === ref.rank && res.score < ref.score - 1e-9);
  let cur = { ...best.params };
  let curRes = best.result;
  /* 随机多起点 */
  const randN = (flags.has('--deep') ? 400 : 60);
  for (let t = 0; t < randN; t++) {
    const trial = {};
    keys.forEach((k) => {
      const def = conf.params[k][0];
      const lo = conf.params[k][1], hi = conf.params[k][2];
      const span = hi - lo;
      const v = Math.random() < 0.4 ? def : lo + Math.random() * span;
      trial[k] = clampTo(method, k, v);
    });
    const res = run(method, trial, STEPS);
    if (better(res, curRes)) { cur = trial; curRes = res; }
  }
  /* 全参数坐标下降 */
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (const key of keys) {
      const def = conf.params[key][0];
      const c = cur[key] !== undefined ? cur[key] : def;
      let lb = c, lr = curRes;
      for (const m of MULT.concat(FINE)) {
        if (m === 1) continue;
        const cand = clampTo(method, key, c * m);
        if (cand === lb) continue;
        const res = run(method, { ...cur, [key]: cand }, STEPS);
        if (better(res, lr)) { lb = cand; lr = res; }
      }
      if (lb !== c) { cur = { ...cur, [key]: lb }; curRes = lr; improved = true; }
    }
    if (!improved) break;
  }
  const params = {};
  Object.keys(cur).forEach((k) => {
    const def = conf.params[k][0];
    if (Math.abs(cur[k] - def) > 1e-9) params[k] = cur[k];
  });
  return { params, result: curRes };
}

/* 精修：对仍未达标的方法，在当前最优点附近做收缩式局部随机搜索 */
function polish(method, base, best) {
  const conf = D.CONTROLLER_CONFIGS[method];
  const keys = allNumKeys(method);
  const better = (res, ref) => res.rank > ref.rank || (res.rank === ref.rank && res.score < ref.score - 1e-9);
  let cur = { ...best.params };
  let curRes = best.result;
  const rounds = flags.has('--deep') ? 600 : 200;
  for (let t = 0; t < rounds; t++) {
    const trial = {};
    keys.forEach((k) => {
      const def = conf.params[k][0];
      const anchor = cur[k] !== undefined ? cur[k] : def;
      const lo = conf.params[k][1], hi = conf.params[k][2];
      const span = hi - lo;
      const rad = span * 0.10 * Math.pow(0.988, t);
      let v = anchor + (Math.random() * 2 - 1) * rad;
      if (Math.random() < 0.10) v = def;
      trial[k] = clampTo(method, k, v);
    });
    const res = run(method, trial, STEPS);
    if (better(res, curRes)) { cur = trial; curRes = res; }
  }
  const params = {};
  Object.keys(cur).forEach((k) => {
    const def = conf.params[k][0];
    if (Math.abs(cur[k] - def) > 1e-9) params[k] = cur[k];
  });
  return { params, result: curRes };
}

const rows = [];
const tuning = {};
const bad = [];
D.methodList.forEach((method) => {
  const base = run(method, null, STEPS);
  let final = base, params = null;
  if (TUNE && base.rank < 4) {
    const s = search(method, base);
    if (s.result.rank > base.rank || (s.result.rank === base.rank && s.result.score < base.score - 1e-6)) {
      final = s.result; params = s.params;
    }
    /* 仍未达标 → 深搜 + 局部精修 */
    if (final.rank < 4) {
      const d = deepSearch(method, base, { params: params || {}, result: final });
      if (d.result.rank > final.rank || (d.result.rank === final.rank && d.result.score < final.score - 1e-6)) {
        final = d.result; params = d.params;
      }
      const p = polish(method, base, { params: params || {}, result: final });
      if (p.result.rank > final.rank || (p.result.rank === final.rank && p.result.score < final.score - 1e-6)) {
        final = p.result; params = p.params;
      }
    }
    if (params && Object.keys(params).length) tuning[method] = params;
  }
  /* 最终评级用多次噪声实现的中位数，消除随机性抖动 */
  const judged = run(method, params, STEPS, FINAL_REPS);
  rows.push({ method, base: base.grade, after: judged.grade, err: judged.finalErr, sat: judged.satRatio, goal: judged.goalMet, params });
  if (judged.rank < 3) bad.push(method);
});

const cnt = (arr) => arr.reduce((a, g) => (a[g] = (a[g] || 0) + 1, a), {});
console.log('对象 = ' + plantId + (Object.keys(plantOverrides).length ? '  覆盖=' + JSON.stringify(plantOverrides) : '') + '   方法数 = ' + rows.length);
console.log('评级汇总(调参后) = ' + JSON.stringify(cnt(rows.map((r) => r.after))));
console.log('评级汇总(调参前) = ' + JSON.stringify(cnt(rows.map((r) => r.base))));
console.log('控制目标达成(末段误差<0.05) = ' + rows.filter((r) => r.goal).length + '/' + rows.length);
console.log('\n未达 good 的方法（' + rows.filter((r) => r.after !== 'good').length + '）：');
rows.filter((r) => r.after !== 'good').forEach((r) => {
  console.log('  ' + r.method.padEnd(26) + (r.base + ' → ' + r.after).padEnd(24) +
    'err=' + r.err.toFixed(3) + ' sat=' + r.sat.toFixed(2) + ' goal=' + (r.goal ? 'Y' : 'N') +
    (r.params ? '  ' + JSON.stringify(r.params) : ''));
});
if (TUNE) {
  const out = { plant: plantId, plantOverrides, tuning, bad };
  const file = path.join(app, 'docs', '对象调参-' + plantId + '.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
  console.log('\n已写入 ' + file + '（tuning 覆盖 ' + Object.keys(tuning).length + ' 个方法）');
}
