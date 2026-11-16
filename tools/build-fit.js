#!/usr/bin/env node
/* ============================================================
   tools/build-fit.js — 生成 159 × 6 对象的双模式适用性数据与审计报告
   运行：node tools/build-fit.js
   产出：
     public/js/fit-data.js        运行时适用性表（辅助模式 / 真实动力学）
     public/docs/方法适配审计.md   完整评级矩阵与问题清单
   说明：24 s 闭环仿真；评级同时看末段均值误差与尾段标准差，
         避免把"均值到位但持续振荡"误判为收敛。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');
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
const NS = sandbox.CtrlSim;
const D = NS.data;
const sim = NS.sim;

const STEPS = 1200;
const TAIL = 100;

function audit(plantId, method, mode) {
  /* 每个组合都从干净默认环境开始，避免上一个组合的硬件参数泄漏 */
  Object.assign(sim.getSettings(), D.DEFAULT_ENV);
  sim.setPlant(plantId);
  sim.setMethod(method);
  const st = sim.getSettings();
  st.balanceAssist = mode === 'real' ? 'off' : 'on';
  const target = st.physParams.target;
  const limit = st.actuatorLimit;
  sim.resetSim(method, target, st.initialX);
  st.balanceAssist = mode === 'real' ? 'off' : 'on';

  let maxX = 0, maxU = 0, sat = 0, nan = false, diverged = false;
  const tail = [];
  for (let i = 0; i < STEPS; i++) {
    sim.stepOnce();
    const s = sim.getState();
    const m = sim.getMetrics();
    if (!Number.isFinite(s.x) || !Number.isFinite(s.v) || !Number.isFinite(m.u)) { nan = true; break; }
    if (Math.abs(s.x) > 1e4) { diverged = true; break; }
    maxX = Math.max(maxX, Math.abs(s.x));
    maxU = Math.max(maxU, Math.abs(m.u));
    if (Math.abs(m.u) >= limit * 0.998) sat++;
    if (i >= STEPS - TAIL) tail.push({ x: s.x, e: target - s.x });
  }
  const n = tail.length || 1;
  const meanE = tail.reduce((a, b) => a + b.e, 0) / n;
  const sd = tail.length
    ? Math.sqrt(tail.reduce((a, b) => a + (b.e - meanE) * (b.e - meanE), 0) / n) : NaN;
  const satRatio = sat / STEPS;

  let verdict;
  if (nan || diverged) verdict = 'unfit';
  else if (Math.abs(meanE) <= 0.05 && sd <= 0.10) verdict = 'good';
  else if (Math.abs(meanE) <= 0.25 && sd <= 0.50) verdict = 'fair';
  else if (Math.abs(meanE) <= 1.0) verdict = 'poor';
  else verdict = 'unfit';

  return {
    verdict, meanError: meanE, tailSd: sd, maxX, maxU,
    satRatio, diverged, nan
  };
}

const NOTE_RULES = [
  { re: /^OpenLoop$/, text: '开环无反馈：无回复力或开环不稳定对象上必然漂移/发散，仅作对照基准' },
  { re: /^Repetitive$/, text: '重复控制需要周期目标；常值阶跃下没有可学习的周期误差，属方法本质限制' },
  { re: /^Lorenz-Coupled$/, text: '混沌耦合为教学演示级算法，常值目标下不保证收敛，属已知限制' },
  { re: /^(Relay|BangBang)$/, text: '开关/继电控制在无阻尼或欠阻尼对象上只有极限环，没有稳定平衡点' },
  { re: /^Deadband-PID$/, text: '死区会保留 δ 量级的固有静差（rad 对象上尤其明显），属设计特性而非失稳' },
  { re: /^(PI|P)$/, text: '纯比例/积分缺少足够阻尼：无阻尼对象上等幅振荡，负刚度对象上需 Kp 超过稳定下限' },
  { re: /^(IMC|IMC-PID|SmithPredict|MAC-Impulse|TubeMPC)$/, text: '内模/预测模型与对象失配；负刚度或近无阻尼对象上需要专门的稳定化设计' },
  { re: /^(LQG|Kalman-Pole|EKF-Ctrl)$/, text: '观测器带宽按名义对象固定，负刚度或近无阻尼对象上估计器可能先失稳' },
  { re: /^(LQR-I|IMP-Servo)$/, text: '积分/伺服权重需大于负刚度项；默认权重下可能不足' },
  { re: /^(BLF|LQR-Servo-FF|Mixed-H2-Hinf|H2-Optimal|Minimum-Energy|PFC-Functional|STR|Composite-MRAC|ETC|Gain-Margin-PID|Posicast|Lag-Compensator|NL-ADRC)$/, text: '默认参数按 k>0 或弹簧负载整定，负刚度/近无阻尼对象上需专用整定' },
  { re: /^(Linear-Actor-Critic|BELBIC|ESC|Speed-Gradient|CMAC-Cerebellar)$/, text: '学习类算法为教学演示级，默认学习率下发散或长期振荡，属已知限制' }
];
function noteFor(plant, method, r) {
  for (const n of NOTE_RULES) if (n.re.test(method)) return n.text;
  if (r.satRatio > 0.5) return '执行器长期饱和：默认增益对该对象过大，建议降低增益或提高限幅';
  if (r.sd > 0.5) return '尾段持续振荡：阻尼不足，建议增大微分/速度反馈或降低比例增益';
  return '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象';
}

const PLANTS = D.PLANT_LIST.slice();
const NAMES = {};
PLANTS.forEach((p) => { NAMES[p] = D.PLANTS[p].name; });
const SHORT = {
  freeMass: '积分器', msd: '弹簧', pendulum: '倒立摆',
  aircraft: '飞机', missile: '导弹', uav: '四旋翼',
  motor: '电机', tank: '液位', pendulumDown: '下垂摆',
  satellite: '卫星', uavAlt: '高度环'
};

const verdicts = {};
const realVerdicts = {};
const notes = {};
const details = {};
const counts = { assist: { good: 0, fair: 0, poor: 0, unfit: 0 }, real: { good: 0, fair: 0, poor: 0, unfit: 0 } };

D.methodList.forEach((method) => {
  verdicts[method] = {};
  realVerdicts[method] = {};
  details[method] = {};
  PLANTS.forEach((plant) => {
    const assistRun = audit(plant, method, 'assist');
    verdicts[method][plant] = assistRun.verdict;
    counts.assist[assistRun.verdict]++;
    details[method][plant] = { assist: assistRun };
    if (assistRun.verdict !== 'good') notes['assist|' + plant + '|' + method] = noteFor(plant, method, assistRun);

    if (plant === 'pendulum') {
      const realRun = audit(plant, method, 'real');
      realVerdicts[method][plant] = realRun.verdict;
      counts.real[realRun.verdict]++;
      details[method][plant].real = realRun;
      if (realRun.verdict !== 'good') notes['real|' + plant + '|' + method] = noteFor(plant, method, realRun);
    } else {
      realVerdicts[method][plant] = assistRun.verdict;
      counts.real[assistRun.verdict]++;
    }
  });
});

/* ── 运行时文件 ─────────────────────────────────────── */
function jsObj(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/"([A-Za-z_$][\w$]*)":/g, '$1:')
    .replace(/"/g, "'");
}
const out = [
  '/* 自动生成：node tools/build-fit.js — 159 方法 × ' + PLANTS.length + ' 对象 × 双模式适用性 */',
  '(function (global) {',
  "  'use strict';",
  '  const NS = global.CtrlSim = global.CtrlSim || {};',
  '  NS.fitData = {',
  '    plantNames: ' + jsObj(NAMES) + ',',
  '    plantShort: ' + jsObj(SHORT) + ',',
  '    verdicts: ' + jsObj(verdicts) + ',',
  '    realVerdicts: ' + jsObj(realVerdicts) + ',',
  '    notes: ' + jsObj(notes) + ',',
  '    summary: ' + jsObj(counts) + ',',
  '    generatedAt: ' + JSON.stringify(new Date().toISOString().slice(0, 10)) + ',',
  '  };',
  '})(window);',
  ''
];
fs.writeFileSync(path.join(app, 'js', 'fit-data.js'), out.join('\n'), 'utf8');

/* ── Markdown 报告 ─────────────────────────────────── */
const total = D.methodList.length * PLANTS.length;
const md = [
  '# 159 方法 × ' + PLANTS.length + ' 对象 · 默认参数适用性审计', '',
  '> 由 `node tools/build-fit.js` 生成。默认参数与默认环境（阶跃、无噪声/摩擦/延迟、对象默认限幅）跑 1200 步（24 s）。',
  '> 评级同时看末段 2 s 的均值误差与标准差：good ≤0.05/≤0.10；fair ≤0.25/≤0.50；poor ≤1.0；其余 unfit。',
  '> **辅助模式** = 倒立摆开启显式辅助 PI；**真实模式** = 关闭辅助的真实不稳定动力学（仅倒立摆不同）。', '',
  '## 汇总', '',
  '| 模式 | good | fair | poor | unfit | good 占比 |',
  '| --- | --- | --- | --- | --- | --- |'
];
['assist', 'real'].forEach((mode) => {
  const c = counts[mode];
  md.push('| ' + (mode === 'assist' ? '辅助模式' : '真实模式') + ' | ' + c.good + ' | ' + c.fair + ' | ' + c.poor + ' | ' + c.unfit + ' | ' +
    (c.good / total * 100).toFixed(1) + '% |');
});
md.push('', '## 全量矩阵（辅助模式 / 真实模式）', '',
  '| 方法 | ' + PLANTS.map((p) => SHORT[p] + '（辅助）').join(' | ') + ' | 倒立摆（真实） |',
  '| --- ' + PLANTS.map(() => '| ---').join(' ') + '| --- |');
D.methodList.forEach((m) => {
  md.push('| `' + m + '` | ' + PLANTS.map((p) => verdicts[m][p]).join(' | ') + ' | ' + realVerdicts[m].pendulum + ' |');
});
md.push('', '## 不适用组合与原因', '', '| 模式 | 对象 | 方法 | 评级 | 说明 |', '| --- | --- | --- | --- | --- |');
Object.keys(notes).forEach((k) => {
  const [mode, plant, method] = k.split('|');
  const v = mode === 'assist' ? verdicts[method][plant] : realVerdicts[method][plant];
  if (v === 'unfit' || v === 'poor') md.push('| ' + mode + ' | ' + plant + ' | `' + method + '` | ' + v + ' | ' + notes[k] + ' |');
});
fs.writeFileSync(path.join(app, 'docs', '方法适配审计.md'), md.join('\n'), 'utf8');

console.log('辅助模式 = ' + JSON.stringify(counts.assist));
console.log('真实模式 = ' + JSON.stringify(counts.real));
console.log('已写入 public/js/fit-data.js 与 public/docs/方法适配审计.md');
