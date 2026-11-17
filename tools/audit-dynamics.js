#!/usr/bin/env node
/* ============================================================
   tools/audit-dynamics.js — 无头闭环审计（S0-1 入库）
   运行示例：
     node tools/audit-dynamics.js --out baseline.csv
     node tools/audit-dynamics.js --plants all --out all.csv
     node tools/audit-dynamics.js --scenario disturbance --out dist.csv
     node tools/audit-dynamics.js --plants pendulum --methods PID,LQR --steps 1500

   设计：
     - 用 Node 内置 vm 加载 data.js / simulation.js（两者不依赖 DOM），
       走与界面完全相同的 setPlant → setMethod → resetSim → stepOnce 路径；
     - 评级口径与 tools/build-fit.js、审查报告 §1.2 完全一致：
         末段 2 s 的均值误差与标准差
         good  ≤0.05 / ≤0.10
         fair  ≤0.25 / ≤0.50
         poor  ≤1.00
         其余  unfit（含 NaN / 发散）
     - 默认对象为六个经典对象（freeMass/msd/pendulum/aircraft/missile/uav），
       与 954 组基线口径一致；`--plants all` 跑 11 对象全量。
     - `--scenario noise` 使用可复现的种子随机数（mulberry32），
       保证同一命令重复运行结果一致。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');

/* ── 参数解析 ─────────────────────────────────────── */
function parseArgs(argv) {
  const out = {
    plants: 'classic', methods: 'all', steps: 1200, scenario: 'baseline',
    out: 'audit-baseline.csv', seed: 20261116, quiet: false
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(a + ' 缺少取值');
      i++;
      return v;
    };
    if (a === '--plants') out.plants = next();
    else if (a === '--methods') out.methods = next();
    else if (a === '--steps') out.steps = Math.max(100, parseInt(next(), 10) || 1200);
    else if (a === '--scenario') out.scenario = next();
    else if (a === '--out') out.out = next();
    else if (a === '--seed') out.seed = parseInt(next(), 10) || 20261116;
    else if (a === '--quiet') out.quiet = true;
    else if (a === '--help' || a === '-h') { out.help = true; }
    else throw new Error('未知参数：' + a);
  }
  return out;
}

const USAGE = [
  '用法：node tools/audit-dynamics.js [选项]',
  '',
  '  --plants <列表|all|classic>  默认 classic（六个经典对象，954 组）',
  '  --methods <列表|all>         默认 all（159 法）',
  '  --steps <n>                  仿真步数，默认 1200（DT=0.02 → 24 s）',
  '  --scenario <名称>            baseline | disturbance | noise | delay | friction | deadzone',
  '  --out <文件>                 输出 CSV，默认 audit-baseline.csv',
  '  --seed <整数>                noise 场景的随机种子（默认 20261116）',
  '  --quiet                      不打印逐对象进度'
].join('\n');

let ARGS;
try {
  ARGS = parseArgs(process.argv);
} catch (err) {
  console.error('✗ ' + err.message + '\n\n' + USAGE);
  process.exit(2);
}
if (ARGS.help) { console.log(USAGE); process.exit(0); }

/* ── 可复现随机数（仅 noise 场景使用） ── */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seededRandom = mulberry32(ARGS.seed);
const MathShim = Object.create(Math);
MathShim.random = seededRandom;

/* ── 沙箱：只提供纯计算能力，杜绝 DOM 依赖 ── */
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math: MathShim, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
['core.js', 'data.js', 'simulation.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const NS = sandbox.CtrlSim;
const D = NS.data;
const sim = NS.sim;

/* ── 场景定义：只改实验环境，不改对象与控制律 ── */
const SCENARIOS = {
  baseline: { label: '默认环境', env: {} },
  disturbance: { label: '恒值扰动 25（按对象量纲缩放）', env: { contDisturbance: 25 } },
  noise: { label: '测量噪声 0.2', env: { sensorNoise: 0.2 } },
  delay: { label: '纯滞后 0.2 s', env: { plantDelay: 10 } },
  friction: { label: '库仑摩擦 4', env: { coulombFriction: 4 } },
  deadzone: { label: '执行器死区 5', env: { actuatorDeadzone: 5 } }
};
if (!SCENARIOS[ARGS.scenario]) {
  console.error('✗ 未知场景：' + ARGS.scenario + '\n可选：' + Object.keys(SCENARIOS).join(', '));
  process.exit(2);
}

/* ── 对象 / 方法列表 ── */
const CLASSIC_PLANTS = ['freeMass', 'msd', 'pendulum', 'aircraft', 'missile', 'uav'];
function resolvePlants(arg) {
  if (arg === 'all') return D.PLANT_LIST.slice();
  if (arg === 'classic') return CLASSIC_PLANTS.filter((id) => D.PLANTS[id]);
  const list = arg.split(',').map((s) => s.trim()).filter(Boolean);
  list.forEach((id) => { if (!D.PLANTS[id]) throw new Error('未知对象：' + id); });
  return list;
}
function resolveMethods(arg) {
  if (arg === 'all') return D.methodList.slice();
  const list = arg.split(',').map((s) => s.trim()).filter(Boolean);
  list.forEach((k) => { if (!D.CONTROLLER_CONFIGS[k]) throw new Error('未知方法：' + k); });
  return list;
}
const PLANTS = resolvePlants(ARGS.plants);
const METHODS = resolveMethods(ARGS.methods);
const N = ARGS.steps;
const TAIL = Math.min(100, Math.max(20, Math.round(N / 12)));

/* ── 单组合审计 ── */
function audit(plantId, method) {
  /* 每个组合从干净默认环境开始，避免硬件参数跨组合泄漏 */
  Object.assign(sim.getSettings(), D.DEFAULT_ENV);
  sim.setPlant(plantId);
  sim.setMethod(method);
  const st = sim.getSettings();
  const limit = st.actuatorLimit;

  /* 场景覆盖：与 UI 的 setParam 钳制保持一致（扰动 ≤0.5×限幅，死区 ≤0.25×限幅） */
  const env = SCENARIOS[ARGS.scenario].env;
  Object.keys(env).forEach((k) => {
    let v = env[k];
    if (k === 'contDisturbance') v = Math.max(-0.5 * limit, Math.min(0.5 * limit, v));
    if (k === 'actuatorDeadzone') v = Math.max(0, Math.min(0.25 * limit, v));
    st[k] = v;
  });

  const target = st.physParams.target;
  sim.resetSim(method, target, st.initialX);

  let maxX = 0, maxU = 0, sat = 0, nan = false, diverged = false;
  let se = 0, ticks = 0;
  const tail = [];
  for (let i = 0; i < N; i++) {
    sim.stepOnce();
    const s = sim.getState();
    const m = sim.getMetrics();
    if (!Number.isFinite(s.x) || !Number.isFinite(s.v) || !Number.isFinite(m.u)) { nan = true; break; }
    if (Math.abs(s.x) > 1e4) { diverged = true; break; }
    maxX = Math.max(maxX, Math.abs(s.x));
    maxU = Math.max(maxU, Math.abs(m.u));
    if (Math.abs(m.u) >= limit * 0.998) sat++;
    se += (target - s.x) * (target - s.x); ticks++;
    if (i >= N - TAIL) tail.push({ x: s.x, e: target - s.x });
  }
  const n = tail.length || 1;
  const meanE = tail.reduce((a, b) => a + b.e, 0) / n;
  const sd = tail.length
    ? Math.sqrt(tail.reduce((a, b) => a + (b.e - meanE) * (b.e - meanE), 0) / n) : NaN;

  let verdict;
  if (nan || diverged) verdict = 'unfit';
  else if (Math.abs(meanE) <= 0.05 && sd <= 0.10) verdict = 'good';
  else if (Math.abs(meanE) <= 0.25 && sd <= 0.50) verdict = 'fair';
  else if (Math.abs(meanE) <= 1.0) verdict = 'poor';
  else verdict = 'unfit';

  return {
    plant: plantId, method, verdict,
    meanError: meanE, tailSd: sd,
    rmse: ticks ? Math.sqrt(se / ticks) : NaN,
    maxAbsX: maxX, maxU,
    satRatio: sat / N,
    diverged: diverged ? 1 : 0,
    nan: nan ? 1 : 0
  };
}

/* ── 执行 ── */
const num = (v, d) => (Number.isFinite(v) ? v.toFixed(d) : 'NaN');
const rows = [];
const counts = { good: 0, fair: 0, poor: 0, unfit: 0 };
const perPlant = {};
PLANTS.forEach((pid) => { perPlant[pid] = { good: 0, fair: 0, poor: 0, unfit: 0 }; });

PLANTS.forEach((pid) => {
  const t0 = Date.now();
  METHODS.forEach((mk) => {
    const r = audit(pid, mk);
    rows.push(r);
    counts[r.verdict]++;
    perPlant[pid][r.verdict]++;
  });
  if (!ARGS.quiet) {
    const c = perPlant[pid];
    console.log('  ' + pid.padEnd(13) + ' good ' + String(c.good).padStart(3) +
      ' / fair ' + String(c.fair).padStart(2) + ' / poor ' + String(c.poor).padStart(2) +
      ' / unfit ' + String(c.unfit).padStart(2) +
      '   (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  }
});

/* ── CSV（带 BOM，Excel 直接打开不乱码） ── */
const head = ['plant', 'method', 'scenario', 'verdict', 'meanError', 'tailSd',
  'rmse', 'maxAbsX', 'maxU', 'satRatio', 'diverged', 'nan', 'steps'];
const lines = [head.join(',')];
rows.forEach((r) => {
  lines.push([
    r.plant, r.method, ARGS.scenario, r.verdict,
    num(r.meanError, 6), num(r.tailSd, 6), num(r.rmse, 6),
    num(r.maxAbsX, 4), num(r.maxU, 4), num(r.satRatio, 4),
    r.diverged, r.nan, N
  ].join(','));
});
const outPath = path.isAbsolute(ARGS.out) ? ARGS.out : path.join(root, ARGS.out);
fs.writeFileSync(outPath, '\ufeff' + lines.join('\r\n') + '\r\n', 'utf8');

/* ── 汇总 ── */
const total = rows.length;
const rate = (v) => (total ? (v / total * 100).toFixed(1) : '0.0') + '%';
console.log('\n场景：' + ARGS.scenario + '（' + SCENARIOS[ARGS.scenario].label + '）' +
  ' · ' + PLANTS.length + ' 对象 × ' + METHODS.length + ' 方法 × ' + N + ' 步');
console.log('评级：good ' + counts.good + '（' + rate(counts.good) + '） / fair ' + counts.fair +
  ' / poor ' + counts.poor + ' / unfit ' + counts.unfit);
console.log('已写入：' + outPath);
if (counts.unfit > 0) {
  const bad = rows.filter((r) => r.verdict === 'unfit');
  console.log('unfit 组合（最多列 20 条）：');
  bad.slice(0, 20).forEach((r) => console.log('  ' + r.plant + ' / ' + r.method));
}
