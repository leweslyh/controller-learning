#!/usr/bin/env node
/* ============================================================
   tools/style-pass.js — 教学文档文风清理（幂等）
   运行：node tools/style-pass.js
   处理对象：public/docs/methods/*.md、plants/*.md、guides/*.md
   做四类机械替换：
     1. 清除重复标点与模板化的「——把这句经验翻译成公式」；
     2. 把 159 篇共用的章节开场句换成按体系区分的多种写法；
     3. 把「第 N 步，」改成自然的连接词（先 / 接着 / 然后 …）；
     4. 把参数表里的「该方法的可调参数」换成 data.js 中的真实标签。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'public', 'docs');

/* ── 读参数标签 ── */
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'public', 'js', 'data.js'), 'utf8'), sandbox, { filename: 'data.js' });
const LABELS = sandbox.CtrlSim.data.PARAM_LABELS || {};

/* ── 按体系区分的对象章开场 ── */
const PLANT_OPEN = {
  '01': '控制器能压住多少振荡，最终取决于对象本身的惯性与阻尼；比例、积分、微分只是在这个物理上限内做分配。',
  '02': '补偿器只能改变开环形状，对象已有的谐振与惯性决定了可用带宽的上限。先把对象看清，再谈补偿。',
  '03': '状态反馈的效果上限，由对象的可控性与执行器权限共同决定：可控性决定「能不能放极点」，执行器决定「放过去之后跟不跟得上」。',
  '04': '鲁棒设计先要回答「对象能变多少」。标称模型只是不确定集合中的一个点，稳定性要对整个集合成立。',
  '05': '预测控制的精度一半来自模型，一半来自约束。对象越接近线性、执行器越宽裕，预测才越有意义。',
  '06': '滑模的鲁棒性来自把不确定项挤进切换项，但不确定项有多大，直接决定切换增益的下限。',
  '07': '观测器的任务是补出看不见的状态；对象越接近观测器模型，估计残差越小，补偿才越干净。',
  '08': '非线性方法的效果取决于对象非线性项的结构。同一套增益换到另一个对象上，可能连符号都不对。',
  '09': '自适应要在线辨识对象参数，前提是参数「慢变」且信号足够丰富；这两条不成立，收敛就无从谈起。',
  '10': '学习类方法把对象当成黑箱，但黑箱的输入输出范围仍由物理对象决定；超出工作区，学习结果不可信。',
  '11': '约束类方法先看边界：对象的物理限位、执行器幅值、安全距离，都是设计前必须量清楚的量。',
  '12': '时滞、采样与网络把对象从「一个方程」变成「一段历史」；不先量清延迟，后面的补偿都是猜。'
};

/* ── 按体系区分的整定顺序 ── */
const TUNE_ORDER = {
  '01': '整定顺序：先只留 $K_p$ 把系统推到「能动但不发散的边缘」，再加 $K_d$ 压超调，最后补 $K_i$ 消静差；每加一项都回看峰值控制力。',
  '02': '整定顺序：先按期望截止频率定增益，再用零点/极点补相位，最后施加扰动检验裕度是否还够。',
  '03': '整定顺序：先按极点或权重定 $K$，再看控制量峰值；若长期饱和，说明极点位置或权重比过激，退回一档。',
  '04': '整定顺序：先定不确定集与性能权重，再解控制器；若保守到无法满足响应，先缩不确定集，不要硬压增益。',
  '05': '整定顺序：先定预测时域与控制时域，再调权重；最后把限幅调紧，检验优化是否仍然可行。',
  '06': '整定顺序：先定滑模面系数 $c$（决定滑模面上的收敛速度），再把切换增益 $K$ 加到刚好覆盖扰动，最后用边界层压抖振。',
  '07': '整定顺序：先让观测器比控制器快 3～5 倍，再调控制增益；$b_0$ 必须与对象真实增益一致。',
  '08': '整定顺序：先按能量函数定结构增益，再用扰动检验势阱是否仍成立；非线性项符号错了，加大增益只会更糟。',
  '09': '整定顺序：先给小自适应增益让参数慢慢收敛，再逐步加大；同时观察参数是否漂移、控制量是否抖动。',
  '10': '整定顺序：先小学习率、短训练，确认不发散后再加长；每轮都留一组未参与学习的工况做验证。',
  '11': '整定顺序：先定边界（$k_b$、漏斗、约束），再调收敛速率；边界必须覆盖初始误差，否则第一步就越界。',
  '12': '整定顺序：先量准延迟、采样与量化步长，再调补偿；时滞估计误差超过裕度时，加大增益只会加快发散。'
};

/* ── 共用句的多种改写 ── */
const SCOPE_VARIANTS = [
  '推导与算例只用到「质量-弹簧-阻尼」。其余 10 个对象的方程、动特性与适用场景都收在[对象手册](plant:msd)里；换对象不会改变控制律，只会改变它读到的等效 $m$、$c$、$k$。',
  '为了把注意力放在控制律本身，本讲只在「质量-弹簧-阻尼」上推导。其余对象的完整说明见[对象手册](plant:msd)，控制律在它们身上是同一套公式。',
  '本讲的算例固定在「质量-弹簧-阻尼」上。换到别的对象时，控制律不变，变的是对象给出的等效 $m$、$c$、$k$——各对象的差异见[对象手册](plant:msd)。',
  '推导只依赖「质量-弹簧-阻尼」的 $m$、$c$、$k$。另外 10 个对象不再逐篇复制方程，统一放在[对象手册](plant:msd)；需要对比时切过去即可。'
];
const MODEL_VARIANTS = [
  '把对象方程写开（切到「质量-弹簧-阻尼」即可复现本讲全部算例）：',
  '本讲用到的对象方程如下（实验台切到同名对象即可对照）：'
];
const NUMBER_VARIANTS = ['由此得到三个特征数字：', '三个数字概括了对象的固有特性：', '对象的快慢、阻尼与增益可以压成三个数：'];
const KNOB_VARIANTS = ['实验台上可调的参数：', '本讲涉及的实验台参数：', '对应到实验台的旋钮：'];

function pick(arr, i) { return arr[i % arr.length]; }
function fixPunctuation(s) {
  return s
    .replace(/。。/g, '。')
    .replace(/，，/g, '，')
    .replace(/；；/g, '；')
    .replace(/、、/g, '、')
    .replace(/：：/g, '：')
    .replace(/——把这句经验翻译成公式。/g, '')
    .replace(/，\s*。/g, '。')
    .replace(/^先，/gm, '先')
    .replace(/。[ \t]+(?=[\u4e00-\u9fa5])/g, '。')
    .replace(/，[ \t]+(?=[\u4e00-\u9fa5])/g, '，')
    .replace(/更[ \t]+(?=[\u4e00-\u9fa5])/g, '更');
}

function rewriteSteps(s) {
  const marks = [...s.matchAll(/第\s*([1-9])\s*步[，,]/g)].map((m) => Number(m[1]));
  if (!marks.length) return s;
  const max = Math.max(...marks);
  const seqs = {
    1: ['先'], 2: ['先', '最后'], 3: ['先', '接着', '最后'],
    4: ['先', '接着', '然后', '最后'],
    5: ['先', '接着', '然后', '随后', '最后'],
    6: ['先', '接着', '然后', '随后', '再', '最后'],
    7: ['先', '接着', '然后', '随后', '再', '继而', '最后'],
    8: ['先', '接着', '然后', '随后', '再', '继而', '之后', '最后']
  };
  const seq = seqs[max] || STEP_WORDS;
  return s.replace(/第\s*([1-9])\s*步[，,]/g, (all, n) => (seq[Number(n) - 1] || '接着') + '，');
}

function fixParamLabels(s) {
  return s.replace(/^\| ([A-Za-z0-9_]+) \| 该方法的可调参数 \|/gm, (all, k) => {
    return LABELS[k] ? '| ' + k + ' | ' + LABELS[k] + ' |' : all;
  });
}

function processFile(full, kind, idx) {
  let text = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n[\s\S]*?\n---\n/.exec(text);
  const fm = m ? m[0] : '';
  let body = fm ? text.slice(fm.length) : text;
  const before = body;

  /* 1. 对象章开场：按文件 frontmatter 的 category 选句 */
  const catMatch = /^category:\s*"?(\d{2})/m.exec(fm);
  const cat = catMatch ? catMatch[1] : '03';
  const openLine = '先把「我们到底在控制什么」讲清楚——这是每一讲的地基。控制器只是往对象上使力，而**对象的脾气决定了控制器的上限**：弹簧的回复力、质量的惯性、阻尼的消耗，三者共同规定了「这个系统能被控制到多好」。';
  if (body.indexOf(openLine) >= 0) body = body.replace(openLine, PLANT_OPEN[cat] || PLANT_OPEN['03']);

  /* 2. 共用句改写 */
  const scopeLine = '本讲**只使用「质量-弹簧-阻尼」这一个对象**做推导与算例——它是 159 条控制律共同的教学基准；其余 10 个对象的完整方程、动特性与适用场景统一收在[对象手册](plant:msd)中，切换对象不会改变控制律本身（控制律只读取对象给出的等效 $m/c/k$）。';
  if (body.indexOf(scopeLine) >= 0) body = body.replace(scopeLine, pick(SCOPE_VARIANTS, idx));
  const modelLine = '**本讲的推导基于质量-弹簧-阻尼模型**（在实验台里切到这个对象，就能复现本讲全部算例）：';
  if (body.indexOf(modelLine) >= 0) body = body.replace(modelLine, pick(MODEL_VARIANTS, idx));
  if (body.indexOf('三个必须记住的特征数字：') >= 0) {
    body = body.replace('三个必须记住的特征数字：', pick(NUMBER_VARIANTS, idx));
  }
  if (body.indexOf('实验台上与本讲相关的旋钮：') >= 0) {
    body = body.replace('实验台上与本讲相关的旋钮：', pick(KNOB_VARIANTS, idx));
  }

  /* 3. 整定顺序：只替换 60 篇共用的那句 */
  const tuneLine = '建议顺序：先只留主增益、把系统调到「动起来但不发散」→ 逐个加入本方法特有的结构参数（如边界层、观测带宽、预测时域）→ 最后用「扰动」按钮检验抗扰，并回看峰值控制力是否仍在限幅内。';
  if (body.indexOf(tuneLine) >= 0) body = body.replace(tuneLine, TUNE_ORDER[cat] || TUNE_ORDER['03']);

  /* 4. 机械清理 */
  body = fixPunctuation(body);
  body = rewriteSteps(body);
  if (kind === 'methods') body = fixParamLabels(body);
  body = body.replace(/\n{3,}/g, '\n\n');

  if (body === before) return false;
  fs.writeFileSync(full, fm + body, 'utf8');
  return true;
}

let changed = 0, total = 0;
const jobs = [
  { dir: path.join(docsDir, 'methods'), kind: 'methods' },
  { dir: path.join(docsDir, 'plants'), kind: 'plants' },
  { dir: path.join(docsDir, 'guides'), kind: 'guides' }
];
jobs.forEach((job) => {
  if (!fs.existsSync(job.dir)) return;
  fs.readdirSync(job.dir).filter((f) => f.endsWith('.md')).sort().forEach((f, i) => {
    total++;
    if (processFile(path.join(job.dir, f), job.kind, i)) changed++;
  });
});
console.log('文风清理：' + changed + ' / ' + total + ' 份文档有改动');
