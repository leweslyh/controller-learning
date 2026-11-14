/* ============================================================
   insert-plant-section.js
   作用：为 99 份教学文档插入「二、被控对象」专节，并把后续章节号
   与公式编号（\tag 章号、交叉引用）同步 +1，保持教材式编号自洽。
   幂等：若文档已含「二、被控对象」则跳过。
   用法：node tools/insert-plant-section.js [--dry]
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'public', 'docs', 'methods');
const BACKUP = path.join(__dirname, '_backup-methods');
const DRY = process.argv.includes('--dry');

/* 读取 data.js（仅数据层，纯离线） */
function loadData() {
  const sb = {
    console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error,
    Map, Set, parseFloat, parseInt, isNaN, isFinite
  };
  sb.window = sb; sb.global = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'js', 'data.js'), 'utf8'), sb, { filename: 'data.js' });
  return sb.CtrlSim.data;
}

/* 分类 -> 控制律「读什么 / 写什么」 */
const ROLE = {
  '01. 经典线性体系': ['误差 $e$、速度 $v$', '线性组合形式的控制力 $u$'],
  '02. 频域与最优': ['误差或状态 $x$', '由代价函数解出的最优控制力 $u$'],
  '03. 非线性结构': ['误差 $e$、速度 $v$', '含非线性修正项的控制力 $u$'],
  '04. 滑模变结构家族': ['滑模面 $s=c\\,e-v$', '含切换项 $\\operatorname{sgn}(s)$ 的控制力 $u$'],
  '05. 数据驱动与智能': ['误差、误差积分、误差变化率', '在线学习得到的控制力 $u$'],
  '06. 融合与复合架构': ['误差 $e$、速度 $v$ 与模型预测', '前馈与反馈叠加后的 $u$'],
  '07. 前沿与新型约束': ['误差 $e$ 与它的可行边界', '被约束修正过的控制力 $u$'],
  '08. 轨迹规划与学习': ['指令 $r$ 与历史输入', '整形或学习后写入对象的 $u$'],
  '09. 鲁棒与现代预测': ['当前状态与预测状态', '带鲁棒余量的控制力 $u$'],
  '10. 观测器与网络拓扑': ['带噪测量 $y$', '建立在估计状态上的控制力 $u$'],
  '11. 高阶与物理前沿': ['误差、速度或能量', '高阶／能量整形后的 $u$']
};

/* 解析 frontmatter */
function parseFm(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  const fm = {};
  if (!m) return { fm, body: text, head: '' };
  m[1].split(/\r?\n/).forEach((line) => {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].replace(/^"|"$/g, '');
  });
  return { fm, body: text.slice(m[0].length), head: m[0] };
}

/* 生成「二、被控对象」章节 */
function plantSection(cfg, labels) {
  const role = ROLE[cfg.category] || ['误差与状态', '控制力 $u$'];
  const p = cfg.params || {};
  const knobs = Object.keys(p).map((k) => {
    const v = p[k];
    const lab = labels[k] || k;
    return '| ' + lab + ' | ' + v[0] + ' | ' + v[1] + '～' + v[2] + '（步长 ' + v[3] + '） |';
  }).join('\n');

  return [
    '## 二、被控对象',
    '',
    '先把「我们到底在控制什么」讲清楚——这是每一讲的地基。控制器只是往对象上使力，而**对象的脾气决定了控制器的上限**：弹簧的回复力、质量的惯性、阻尼的消耗，三者共同规定了「这个系统能被控制到多好」。',
    '',
    '实验台提供三个被控对象，**默认运行的是「二阶积分器」**：',
    '',
    '| 对象 | 模型 | 脾气 | 适合观察什么 |',
    '| --- | --- | --- | --- |',
    '| 二阶积分器（默认） | $m\\ddot{x}=u$ | 只有惯性、没有回复力，位置能一直漂走 | 纯惯性对象对控制律最苛刻的考验 |',
    '| 质量-弹簧-阻尼 | $m\\ddot{x}+c\\dot{x}+kx=u$ | 偏离零点会被弹簧拉回来 | **本讲推导所用的模型** |',
    '| 倒立摆（小车-摆） | 非线性、开环不稳定 | 倒下去就再也起不来 | 反馈为什么是必需品 |',
    '',
    '**本讲的推导基于质量-弹簧-阻尼模型**（在实验台里切到这个对象，就能复现本讲全部算例）：',
    '',
    '$$ m\\ddot{x}+c\\dot{x}+kx=u \\tag{2.1} $$',
    '',
    '| 符号 | 含义 | 默认值 | 范围 | 物理直觉 |',
    '| --- | --- | --- | --- | --- |',
    '| $m$ | 质量 | 2.00 kg | 0.5～10 | 惯性：越大越难推，也越难刹住 |',
    '| $c$ | 黏性阻尼 | 0.50 N·s/m | 0～5 | 与速度成正比的阻力，能量靠它流走 |',
    '| $k$ | 弹簧刚度 | 1.00 N/m | 0～10 | 偏离零点越远，回弹力越大 |',
    '| $u$ | 控制力 | —— | ±200 N | 执行器输出，由控制器决定 |',
    '| $x$ | 位置 | 0 m | —— | 被控输出 |',
    '| $v=\\dot{x}$ | 速度 | 0 m/s | —— | 状态的第二维 |',
    '',
    '写成状态空间（一阶系统形式，$x_1=x,\\ x_2=v$）：',
    '',
    '$$ \\dot{x}_1=x_2,\\qquad \\dot{x}_2=-\\frac{k}{m}x_1-\\frac{c}{m}x_2+\\frac{1}{m}u \\tag{2.2} $$',
    '',
    '三个必须记住的特征数字：',
    '',
    '$$ \\omega_n=\\sqrt{\\frac{k}{m}}=0.707\\ \\mathrm{rad/s},\\qquad \\zeta=\\frac{c}{2\\sqrt{km}}=0.177 \\tag{2.3} $$',
    '',
    '- $\\omega_n$ 决定对象「自己」的快慢——控制器再厉害，也没法让响应比质量本身更快；',
    '- $\\zeta=0.177$ 阻尼很轻：稍不留神就会来回晃；',
    '- 直流增益 $1/k$：只有比例作用时**永远贴不到目标**——这正是下一节要引出积分项的根源。',
    '',
    '**本讲的任务**：' + cfg.desc + '——把这句经验翻译成公式。',
    '控制律读取' + role[0] + '，写出' + role[1] + '。',
    '',
    '实验台上与本讲相关的旋钮：',
    '',
    '| 旋钮 | 默认 | 范围 |',
    '| --- | --- | --- |',
    knobs,
    '',
    '> [!NOTE]',
    '> 后面所有推导都从 (2.1) 出发；凡是出现 $u$ 的地方，都是 (2.1) 里那个控制力。'
  ].join('\n');
}

/* 章节号 / 编号章号 顺延 */
const TITLE_SHIFT = [['七、', '八、'], ['六、', '七、'], ['五、', '六、'], ['四、', '五、'], ['三、', '四、'], ['二、', '三、']];
const NUM_SHIFT = [[4, 5], [3, 4], [2, 3]];

function shiftTitles(t) {
  TITLE_SHIFT.forEach(function (s) { t = t.split('## ' + s[0]).join('## ' + s[1]); });
  return t;
}
function shiftNums(t) {
  NUM_SHIFT.forEach(function (s) {
    const a = s[0], b = s[1];
    t = t.replace(new RegExp('\\\\tag\\{' + a + '\\.', 'g'), '\\tag{' + b + '.');
    t = t.replace(new RegExp('（' + a + '\\.', 'g'), '（' + b + '.');
    t = t.replace(new RegExp('\\(' + a + '\\.', 'g'), '(' + b + '.');
  });
  return t;
}

/* 主流程 */
const D = loadData();
const configs = D.CONTROLLER_CONFIGS;
const labels = D.PARAM_LABELS || {};
const files = fs.readdirSync(DIR).filter(function (f) { return f.endsWith('.md'); }).sort();
let inserted = 0, skipped = 0;
const missing = [];

files.forEach(function (fn) {
  const p = path.join(DIR, fn);
  const text = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  if (text.indexOf('## 二、被控对象') >= 0) { skipped++; return; }
  const parsed = parseFm(text);
  const cfg = configs[parsed.fm.key];
  if (!cfg) { missing.push(fn + '(' + parsed.fm.key + ')'); return; }

  let out = shiftNums(shiftTitles(parsed.body));
  const sec = plantSection(cfg, labels);
  const anchor = '## 三、为什么需要它';
  const at = out.indexOf(anchor);
  if (at < 0) { missing.push(fn + ' (no anchor)'); return; }
  out = out.slice(0, at) + sec + '\n\n' + out.slice(at);

  if (!DRY) {
    const bak = path.join(BACKUP, fn);
    if (!fs.existsSync(bak)) fs.copyFileSync(p, bak);
    /* 保留 frontmatter：正文改写后必须把元数据原样写回 */
    fs.writeFileSync(p, parsed.head + out, 'utf8');
  }
  inserted++;
});

console.log('插入「被控对象」章节：' + inserted + ' 篇，跳过（已存在）' + skipped + ' 篇');
if (missing.length) console.log('异常：' + missing.join('、'));
