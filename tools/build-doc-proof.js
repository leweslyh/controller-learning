#!/usr/bin/env node
/* ============================================================
   tools/build-doc-proof.js — 为 159 份方法文档插入「五、稳定性证明」
   运行：node tools/build-doc-proof.js [--dry]
   说明：
     1. 证明原型来自 tools/doc-proof-data.js（按方法族选择），
        控制律公式直接从该文档第 4 章抓取，保证「证明的是本讲这条律」。
     2. 首次运行时把原五～十章节整体后移一位（五→六 … 十→十一），
        并把 \tag{5.x} 改为 \tag{6.x}、「第五章表格」改为「第六章表格」。
     3. 重复运行安全：已存在的「五、稳定性证明」整段替换，不重复后移。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ARCH, ARCH_OF } = require('./doc-proof-data');

const DRY = process.argv.includes('--dry');
const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');
const methodsDir = path.join(app, 'docs', 'methods');

/* ── 方法名与体系（用于开场句） ── */
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(app, 'js', 'data.js'), 'utf8'), sandbox, { filename: 'data.js' });
const D = sandbox.CtrlSim.data;

const OPEN = {
  '01': '前面把各项作用拼成了控制律，但「拼起来」不等于「稳」。这一节把稳定性从经验口诀变成可检验的条件：选一个能量函数，看它沿闭环轨迹是否单调下降。',
  '02': '频域方法习惯看裕度；这里换一个等价视角——用 Lyapunov 函数说明闭环能量为什么衰减。两种说法一个看根、一个看曲线，结论必须一致。',
  '03': '最优性回答的是「怎样最好」，稳定性回答的是「会不会发散」。在这一类方法里，代价函数本身就可以充当 Lyapunov 函数，两件事在同一式子里合流。',
  '04': '鲁棒控制关心的是「对象变了还稳不稳」。Lyapunov 不等式给出的正是与摄动集合挂钩的稳定条件：不是针对一条轨迹，而是针对一整个对象集合。',
  '05': '滚动优化每一步都在解一个有限时域问题。要证明闭环稳定，关键不是「预测得准」，而是把最优代价本身当成 Lyapunov 函数，证明它逐步下降。',
  '06': '滑模的证明只做两件事：先证状态在有限时间到达滑模面，再证滑模面上的降阶系统稳定。两段合起来，才是完整的稳定性结论。',
  '07': '带观测器的回路要同时证明两件事：观测误差收敛、控制误差收敛。分离原理把两件事拆开，但拆开的前提是观测器足够快。',
  '08': '非线性方法没有统一的特征多项式，Lyapunov 函数往往不是事后验证，而是设计过程本身——先选函数，再反推控制律。',
  '09': '自适应回路多了一个参数误差状态，Lyapunov 函数要同时管住跟踪误差与参数误差。跟踪收敛与参数收敛是两件事，后者还需要持续激励。',
  '10': '这一类方法大多给不出全局 Lyapunov 证书。下面把能证到的部分写清楚：哪些是有界性结论，哪些只能靠实验判据。',
  '11': '约束类方法的证明多了一层：除了收敛，还要证明状态始终不越界。障碍函数的作用就是把「不越界」写进 Lyapunov 函数里。',
  '12': '时滞、采样与网络让闭环不再是有限维常微分方程，Lyapunov 函数要相应升级为泛函、差分或迭代轴上的能量。'
};

const OPEN_BY_KEY = {
  OpenLoop: '开环没有反馈回路，稳定性完全由对象自身的极点决定。这一节把这句话写成 Lyapunov 判据，并说明它为什么不能替代反馈。'
};

/* 少数方法的证明需要单独交代边界，避免与通用原型混淆 */
const NOTE_BY_KEY = {
  'Minimum-Energy': '最小能量控制原本是有限时域的开环最优解，严格说没有「闭环 Lyapunov 函数」；上面的 ARE 论证对应本平台把它用作状态反馈的实现。开环实现下，稳定性只能由终端状态与对象极点判断。',
  Preview: '预见控制把未来参考作为已知前馈；证明中把 $r$ 视为常数，参考变化时多出的前馈项不改变 $\\dot V$ 的负号，但稳态误差要按前馈精度另算。',
  'Kharitonov-Robust': 'Kharitonov 定理直接检查四个顶点多项式的根，不需要构造 $P$；上面的 Lyapunov 不等式是同一鲁棒稳定性的另一条充分条件，二者不互相替代。',
  'Stochastic-MPC': '随机 MPC 的约束以概率形式成立，「每一步可行」要换成「以给定置信度可行」；稳定性结论相应减弱为概率意义下的一致最终有界。',
  'Nussbaum-Gain': 'Nussbaum 方法处理 $b$ 的符号未知：增益 $N(\\chi)$ 会反复切换方向，上面「$b$ 符号已知」的自适应律不适用于它；其结论是参数有界与跟踪误差收敛，证明依赖 Nussbaum 增益的有界性引理。',
  'U-Model': 'U-Model 通过多项式求根反解控制量，闭环没有显式状态方程；上面的有界性结论对应其局部线性化实现，根分布越界时需另行判断。',
  Relay: '继电控制含滞回，严格稳定性要在 Filippov 解下讨论；上面的到达结论对应忽略滞环的理想切换。',
  MFAC: 'MFAC 的伪偏导数估计依赖输入输出数据，稳定性结论是「有界输入有界输出」，不是渐近稳定；学习率与遗忘因子需满足收敛条件。'
};

/* ── 抓取第 4 章的控制律公式 ── */
function pickLaw(body) {
  const start = body.indexOf('## 四、一步步推导');
  if (start < 0) return null;
  const tail = body.slice(start);
  const end = tail.indexOf('## 五、稳定性证明');
  const sec = end >= 0 ? tail.slice(0, end) : tail;
  const eqs = [...sec.matchAll(/\$\$([\s\S]*?)\$\$/g)].map((m) => m[1]);
  let best = null;
  eqs.forEach((tex) => {
    const t = /\\tag\{4\.(\d+)\}/.exec(tex);
    if (!t) return;
    let score = 0;
    if (/(^|[^\\A-Za-z])u\s*=/.test(tex)) score += 5;
    if (/u\s*\^\s*\{?\(?k/.test(tex)) score += 3;
    if (/u\s*\*/.test(tex)) score += 2;
    if (score >= 2 && (!best || score > best.score)) {
      best = { tag: t[1], tex: tex.trim(), score };
    }
  });
  return best;
}

/* ── 章节后移（只做一次） ── */
function renumber(body) {
  let s = body;
  s = s.replace(/^## 十、/gm, '## 十一、');
  s = s.replace(/^## 九、/gm, '## 十、');
  s = s.replace(/^## 八、/gm, '## 九、');
  s = s.replace(/^## 七、/gm, '## 八、');
  s = s.replace(/^## 六、/gm, '## 七、');
  s = s.replace(/^## 五、一个算例/gm, '## 六、一个算例');
  s = s.replace(/\\tag\{5\.(\d+)\}/g, '\\tag{6.$1}');
  s = s.replace(/第五章表格/g, '第六章表格');
  return s;
}

function buildSection(key, arch, law) {
  const conf = D.CONTROLLER_CONFIGS[key];
  const cat = String(conf.category).slice(0, 2);
  const name = conf.name;
  const open = OPEN_BY_KEY[key] || OPEN[cat] || OPEN['03'];
  const lawBlock = law
    ? '第 4 章得到的控制律是 (4.' + law.tag + ')：\n\n$$' + law.tex + '$$\n\n'
    : '第 4 章的控制律以分段或隐式形式给出，这里不重复抄录。\n\n';

  return [
    '## 五、稳定性证明',
    '',
    open,
    '',
    '具体到 ' + name + '，要回答的问题是：这条控制律作用在 (2.1) 上，闭环是否稳定、稳定到什么程度。' + lawBlock +
      '下面按「误差方程 → 候选函数 → 沿轨迹求导 → 结论」的顺序展开。',
    '',
    '### 5.1 闭环误差方程',
    '',
    arch.error,
    '',
    '### 5.2 选取 Lyapunov 函数',
    '',
    arch.V,
    '',
    '### 5.3 沿闭环轨迹求导',
    '',
    arch.dV,
    '',
    '### 5.4 结论与适用边界',
    '',
    arch.concl,
    '',
    '**边界条件**：' + arch.limit + (NOTE_BY_KEY[key] ? '\n\n' + NOTE_BY_KEY[key] : ''),
    '',
    '这条结论是解析的，下一章再用一组具体参数把它落到数字上。',
    ''
  ].join('\n');
}

/* ── 主循环 ── */
const files = fs.readdirSync(methodsDir).filter((f) => /^\d{2,3}-.*\.md$/.test(f)).sort();
let changed = 0;
let noArch = [];
let noLaw = 0;
files.forEach((fn) => {
  const full = path.join(methodsDir, fn);
  let text = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n[\s\S]*?\n---\n/.exec(text);
  const fm = m ? m[0] : '';
  let body = fm ? text.slice(fm.length) : text;
  const keyMatch = /^key:\s*(\S+)/m.exec(fm);
  const key = keyMatch ? keyMatch[1] : '';
  if (!D.CONTROLLER_CONFIGS[key]) { console.warn('跳过（无配置）：' + fn); return; }
  const archName = ARCH_OF[key];
  const arch = ARCH[archName];
  if (!arch) { noArch.push(fn + ':' + key + '→' + archName); return; }

  /* 已有证明章：整段替换；否则先章节后移 */
  const oldStart = body.indexOf('## 五、稳定性证明');
  let prefix;
  if (oldStart >= 0) {
    const next = body.indexOf('## 六、一个算例', oldStart);
    const cut = next >= 0 ? next : body.length;
    prefix = body.slice(0, oldStart);
    body = prefix + body.slice(cut);
  } else {
    body = renumber(body);
  }

  const law = pickLaw(body);
  if (!law) noLaw++;
  const sec = buildSection(key, arch, law);
  const at = body.indexOf('## 六、一个算例');
  if (at < 0) { console.warn('跳过（找不到第六章）：' + fn); return; }
  body = body.slice(0, at) + sec + '\n' + body.slice(at);
  const next = fm + body.replace(/\n{3,}/g, '\n\n');
  if (DRY) {
    console.log(fn + '  ' + archName + '  law=' + (law ? '4.' + law.tag : '—'));
  } else if (next !== text) {
    fs.writeFileSync(full, next, 'utf8');
    changed++;
  }
});

if (!DRY) console.log('已更新 ' + changed + ' / ' + files.length + ' 份文档（新增第五章）');
if (noLaw) console.log('未抓到闭式控制律：' + noLaw + ' 份（已改用文字说明）');
if (noArch.length) {
  console.error('✗ 缺少证明原型：');
  noArch.forEach((x) => console.error('  ' + x));
  process.exitCode = 1;
}
