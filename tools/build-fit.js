#!/usr/bin/env node
/* ============================================================
   tools/build-fit.js — 生成 159×3 适用性数据与审计报告
   运行：node tools/build-fit.js
   产出：
     js/fit-data.js            运行时适用性表（good/fair/poor/unfit + 说明）
     docs/方法适配审计.md       完整评级矩阵与问题清单
   说明：审计使用默认参数与默认实验条件跑 800 步；页面不加载本脚本。
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
const TAIL = 100;
function audit(plantId, method) {
  sim.setPlant(plantId);
  sim.setMethod(method);
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
  let grade;
  if (diverged) grade = 'unstable';
  else if (satRatio > 0.5) grade = 'saturated';
  else if (finalErr < 0.05 && Math.abs(sim.getState().v) < 0.05) grade = 'good';
  else if (finalErr > 1.0) grade = 'poor';
  else grade = 'fair';
  const verdict = { unstable: 'unfit', saturated: 'poor', poor: 'poor', fair: 'fair', good: 'good' }[grade];
  return { grade, verdict, maxX, maxU, satRatio, finalErr };
}

const NOTES = [
  { re: /^(OpenLoop)$/, plants: ['freeMass', 'pendulum'], text: '开环无反馈：无回复力或开环不稳定对象上必然漂移/发散，仅作对照基准' },
  { re: /^(PI|IncPID|Relay|Posicast|ETC)$/, plants: ['pendulum'], text: '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼' },
  { re: /^(LQR|LQG|LQR-I|QFT-LeadLag|IMP-Servo|IMC|STR|TDC|BLF|TubeMPC|Artstein-Reduction|Event-Triggered-MPC|ILC)$/, plants: ['pendulum'], text: '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配' },
  { re: /^(T-DOB|RLS-Adaptive)$/, plants: ['pendulum'], text: '延迟补偿/在线辨识在开环不稳定对象上容易失稳，需专门设计' },
  { re: /^(Speed-Gradient|BELBIC|Lorenz-Coupled|Linear-Actor-Critic)$/, plants: ['pendulum', 'freeMass', 'msd'], text: '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制' },
  { re: /^(OpenLoop)$/, plants: ['freeMass'], text: '纯二阶积分器没有可维持位置的平衡力，常值开环力使位置按二次曲线漂移，仅作对照基准' },
  { re: /^(P|PI)$/, plants: ['freeMass'], text: '纯二阶积分器无阻尼：P 的闭环特征方程 m·s²+K_p=0 只有虚轴极点，只能等幅振荡；PI 违反 Routh 判据必然发散。请切到「质量-弹簧-阻尼」对象体验 P / PI 的静差与整定' },
  { re: /^(BangBang|Relay)$/, plants: ['freeMass'], text: '开关/继电控制在纯积分器上只有极限环，没有稳定平衡点；需改用 PD 或带积分的滑模类方法' },
  { re: /^(LQR-I|IMP-Servo)$/, plants: ['freeMass'], text: '积分/伺服项在无回复力对象上持续累积，需配合限幅与抗饱和设计' },
  { re: /^(Linear-Actor-Critic|Lorenz-Coupled)$/, plants: ['freeMass', 'msd'], text: '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制' }
];
function noteFor(plant, method) {
  for (const n of NOTES) {
    if (n.plants.includes(plant) && n.re.test(method)) return n.text;
  }
  return '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象';
}

const verdicts = {};
const details = {};
D.methodList.forEach((method) => {
  verdicts[method] = {};
  details[method] = {};
  D.PLANT_LIST.forEach((plant) => {
    const r = audit(plant, method);
    verdicts[method][plant] = r.verdict;
    details[method][plant] = r;
  });
});

const counts = {};
Object.keys(verdicts).forEach((m) => Object.keys(verdicts[m]).forEach((p) => {
  const v = verdicts[m][p];
  counts[v] = (counts[v] || 0) + 1;
}));

/* 运行时文件 */
const lines = [
  '/* 自动生成：node tools/build-fit.js — 159 方法 × 3 对象适用性 */',
  '(function (global) {',
  "  'use strict';",
  '  const NS = global.CtrlSim = global.CtrlSim || {};',
  '  NS.fitData = {',
  '    plantNames: { msd: \'质量-弹簧-阻尼\', freeMass: \'二阶积分器\', pendulum: \'倒立摆\' },',
  '    verdicts: ' + JSON.stringify(verdicts, null, 2).replace(/"/g, "'").replace(/'(msd|freeMass|pendulum)':/g, '$1:') + ',',
  '    notes: ' + JSON.stringify((() => {
    const notes = {};
    D.methodList.forEach((m) => D.PLANT_LIST.forEach((p) => {
      if (verdicts[m][p] === 'unfit' || verdicts[m][p] === 'poor') notes[p + '|' + m] = noteFor(p, m);
    }));
    return notes;
  })(), null, 2).replace(/"/g, "'") + ',',
  '    summary: ' + JSON.stringify(counts) + ',',
  '    generatedAt: ' + JSON.stringify(new Date().toISOString().slice(0, 10)),
  '  };',
  '})(window);',
  ''
];
const runtime = path.join(app, 'js', 'fit-data.js');
fs.writeFileSync(runtime, lines.join('\n'), 'utf8');

/* Markdown 报告 */
const md = ['# 159 方法 × 3 对象 · 默认参数审计', '',
  '> 由 `node tools/build-fit.js` 生成。默认参数、默认实验条件（阶跃、无噪声/摩擦/延迟、限幅 200 N）跑 800 步（16 s）。',
  '> 评级：good 收敛 / fair 稳定但未完全收敛 / poor 明显偏差或长期饱和 / unfit 崩溃、发散或方法本质不适配。',
  '', '## 汇总', '', '| 适用性 | 组合数 | 占比 |', '| --- | --- | --- |'];
Object.keys(counts).forEach((k) => md.push('| ' + k + ' | ' + counts[k] + ' | ' + (counts[k] / (D.methodList.length * D.PLANT_LIST.length) * 100).toFixed(1) + '% |'));
md.push('', '## 全量矩阵', '', '| 方法 | 质量-弹簧-阻尼 | 二阶积分器 | 倒立摆 |', '| --- | --- | --- | --- |');
D.methodList.forEach((m) => {
  md.push('| `' + m + '` | ' + D.PLANT_LIST.map((p) => verdicts[m][p]).join(' | ') + ' |');
});
md.push('', '## 不适用组合与原因', '', '| 对象 | 方法 | 评级 | 说明 |', '| --- | --- | --- | --- |');
Object.keys(verdicts).forEach((m) => D.PLANT_LIST.forEach((p) => {
  if (verdicts[m][p] === 'unfit') md.push('| ' + p + ' | `' + m + '` | unfit | ' + noteFor(p, m) + ' |');
}));
const report = path.join(app, 'docs', '方法适配审计.md');
fs.writeFileSync(report, md.join('\n'), 'utf8');

console.log('适用性汇总 = ' + JSON.stringify(counts));
console.log('已写入 js/fit-data.js 与 docs/方法适配审计.md');
