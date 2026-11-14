'use strict';
/* 滑模消抖专项验收：验证 6 种消抖模式的行为差异与默认参数的抖振水平 */
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
const sim = NS.sim;

const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || '' });

function run(method, params, plant, steps, mode) {
  sim.setPlant(plant);
  sim.setMethod(method);
  const s = sim.getSettings();
  Object.keys(params || {}).forEach((k) => sim.setParam(k, params[k], 'ctrl'));
  if (mode) sim.setParam('chatterMode', mode, 'ctrl');
  sim.resetSim(method, s.physParams.target, s.initialX);
  let bad = false;
  for (let i = 0; i < steps; i++) {
    sim.stepOnce();
    const st = sim.getState();
    if (![st.x, st.v].every(Number.isFinite) || Math.abs(st.x) > 1e4) { bad = true; break; }
  }
  const m = sim.getMetrics();
  return { bad, sigma: m.chatter, freq: m.chatterFreq, rmse: m.rmse };
}

const MODES = NS.data.SLIDING_MODES.map((m) => m.value);
check('消抖模式至少 6 种且含滞环继电器', MODES.length >= 6 && MODES.indexOf('hyst') >= 0, MODES.join('/'));
check('变增益滑模已接入统一消抖通道', !!NS.data.SLIDING_META['VariableG-SMC']);
check('抖振指标已暴露（纹波 σu + 切换频率）', typeof run('SMC', null, 'msd', 60).sigma === 'number');

['msd', 'pendulum'].forEach((plant) => {
  const sign = run('SMC', null, plant, 1500, 'sign');
  const sat = run('SMC', null, plant, 1500, 'sat');
  const tanh = run('SMC', null, plant, 1500, 'tanh');
  const hyst = run('SMC', null, plant, 1500, 'hyst');
  check(plant + '：硬切换确实在抖（切换率 ≥ 40 次/s）', sign.freq >= 40, '切换率 ' + sign.freq.toFixed(0) + '/s');
  check(plant + '：边界层把切换率压到 ≤ 5 次/s', sat.freq <= 5, '切换率 ' + sat.freq.toFixed(0) + '/s');
  check(plant + '：边界层把输入纹波至少压掉 65%', sat.sigma < sign.sigma * 0.35,
    'σu ' + sign.sigma.toFixed(2) + ' → ' + sat.sigma.toFixed(2));
  check(plant + '：tanh 与 sat 抖振水平相当', tanh.sigma < sat.sigma * 1.2,
    'tanh ' + tanh.sigma.toFixed(2) + ' vs sat ' + sat.sigma.toFixed(2));
  check(plant + '：滞环显著降低开关频率（≤ 硬切换的 1/2）', hyst.freq <= Math.max(1, sign.freq / 2),
    '切换率 ' + hyst.freq.toFixed(0) + '/s');
  check(plant + '：滞环保留跟踪精度（RMSE 不劣于硬切换 1.3 倍）', hyst.rmse <= sign.rmse * 1.3 + 1e-6,
    'RMSE ' + hyst.rmse.toFixed(4) + ' vs ' + sign.rmse.toFixed(4));
});

const vg = run('VariableG-SMC', null, 'msd', 1500);
check('变增益滑模默认参数下不再高频抖振（纹波 ≤ 10 N）', vg.sigma <= 10 && vg.freq <= 5,
  'σu ' + vg.sigma.toFixed(2) + '，切换率 ' + vg.freq.toFixed(0) + '/s');
const stMsd = run('SuperTwisting', null, 'msd', 1500);
const stPend = run('SuperTwisting', null, 'pendulum', 1500);
check('超螺旋默认参数纹波 ≤ 8 N 且无开关抖动', stMsd.sigma <= 8 && stMsd.freq <= 2,
  'σu ' + stMsd.sigma.toFixed(2) + '，切换率 ' + stMsd.freq.toFixed(0) + '/s');
check('超螺旋默认参数跟踪精度达标（msd RMSE ≤ 1.0）', stMsd.rmse <= 1.0, 'RMSE ' + stMsd.rmse.toFixed(4));
check('超螺旋默认参数跟踪精度达标（pendulum RMSE ≤ 0.05）', stPend.rmse <= 0.05, 'RMSE ' + stPend.rmse.toFixed(4));

MODES.forEach((mode) => {
  const r = run('SMC', null, 'msd', 600, mode);
  check('消抖模式 ' + mode + ' 运行不发散', !r.bad, r.bad ? '发散' : 'σu ' + r.sigma.toFixed(2));
});

const pass = results.filter((r) => r.ok).length;
console.log('\n滑模消抖专项验收');
console.log('='.repeat(58));
results.forEach((r) => console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.name + (r.detail ? '  →  ' + r.detail : '')));
console.log('='.repeat(58));
console.log(pass + ' / ' + results.length + ' 项通过');
if (pass !== results.length) process.exitCode = 1;
