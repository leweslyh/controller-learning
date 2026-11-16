#!/usr/bin/env node
/* ============================================================
   tools/build-doc-stability.js — 为 159 份教学文档补写
   「十、稳定性速查」与「十一、可判定练习」两个章节
   运行：node tools/build-doc-stability.js
   说明：
     1. 第十章的判据按 12 类理论体系生成；默认参数评级直接取自
        tools/build-fit.js 产出的 fit-data.js（159 × 11），不手写数字。
     2. 第十一章给出三条可自检的练习，判据用实验台可读出的量
        （末段误差、调节时间、超调、纹波），不写无法验证的结论。
     3. 重复运行安全：已存在的「十、」「十一、」章节会被整段替换。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');
const methodsDir = path.join(app, 'docs', 'methods');

const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
['data.js', 'fit-data.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const D = sandbox.CtrlSim.data;
const FIT = sandbox.CtrlSim.fitData;

const LABEL = { good: '适用', fair: '一般', poor: '需调参', unfit: '不推荐' };
const RANK = { good: 0, fair: 1, poor: 2, unfit: 3 };

/* 12 类体系的结构性稳定判据（与第四章推导同一口径） */
const CRITERIA = {
  '01': '闭环特征多项式为 $m s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i=0$。Routh 判据要求 $c+K_d>0$、$k+K_p>0$、$(c+K_d)(k+K_p)>mK_i$——三条同时成立才渐近稳定；积分增益是唯一能把系统推过稳定边界的"危险项"。',
  '02': '看开环 Bode 图：相位裕度 $\\gamma_m>0$、增益裕度 $g_m>1$。超前网络把相位往上抬、提高截止频率；滞后网络压低低频增益、牺牲带宽换稳态精度。判据是"截止频率处的相位不要跌破 $-180^\\circ$"。',
  '03': '判据是"可控 + 权重正定"：$(A,B)$ 可控、$Q\\succeq0$、$R>0$ 时 Riccati 方程有唯一正定解，闭环必稳定。$Q/R$ 越大响应越快，但越容易撞上执行器限幅——实验台上表现为饱和占比升高。',
  '04': '判据是"闭环稳定 + 灵敏度峰值有界"：$\\|S\\|_\\infty$ 越小，对对象摄动越不敏感。权重函数决定带宽与鲁棒性的折衷，权重定得过激（要求过宽带宽）会让控制器在物理对象上饱和。',
  '05': '判据是"预测模型准确 + 滚动优化可行"：模型失配越大、预测时域越长，闭环越容易振荡；约束一旦不可行，控制量会卡在边界上。实验台上应同时看位置曲线与饱和徽章。',
  '06': '判据是"滑模面 Hurwitz + 切换增益覆盖扰动上界"：$c>0$ 保证滑模面上误差单调收敛；$K$ 必须大于未建模动态与扰动的上界，否则到不了滑模面。$K$ 过大则抖振加剧（看"纹波 $\\sigma_u$"）。',
  '07': '判据是"观测器带宽高于控制带宽"（分离原理）：ESO/DOB 的 $\\omega_o$ 一般取 $3\\sim5$ 倍控制带宽；$b_0$ 必须与对象真实增益 $1/m$ 匹配，否则扰动会被错误放大。',
  '08': '判据是"Lyapunov 函数正定、其导数负定"：反步/能量法逐层构造虚拟控制，要求每层增益为正且递增；能量整形还要求对象无源性（$c>0$）成立。',
  '09': '判据是"持续激励 + 自适应增益有界"：参考信号足够丰富（PE 条件）时参数才收敛；$\\gamma$ 过大则参数漂移、控制量抖动，需配合投影或 $\\sigma$ 修正。',
  '10': '判据是"学习率小于稳定上界 + 基函数覆盖工作区"：学习率过大直接发散，过小则 24 s 内看不出收敛；这一类方法给的是"教学演示级"保证，不承诺全局稳定性。',
  '11': '判据是"初始误差落在约束内 + 控制量有界"：障碍函数/预设性能要求 $|e(0)|<k_b$；约束越紧，越容易在执行器限幅处失去可行性。',
  '12': '判据是"方法假设成立"：重复/迭代控制要求目标周期可重复；事件触发要求触发阈值小于允许误差；量化控制要求量化步长小于稳态带宽；时滞补偿要求延迟估计误差在裕度内。'
};

const GAIN_NOTE = {
  kp: '$K_p$ 增大 → 响应更快、稳态误差更小，但超调与饱和风险上升',
  ki: '$K_i$ 增大 → 静差消除更快，但相位滞后增加、易积分饱和',
  kd: '$K_d$ 增大 → 阻尼增强、超调下降，但放大测量噪声',
  kp0: '基础比例增益 $K_{p0}$ 增大 → 更激进，近端更易振荡',
  kc: '补偿器增益 $k_c$ 增大 → 低频增益提高，稳态更准、裕度更小',
  k_gain: '切换/鲁棒增益 $K$ 增大 → 抗扰更强，但抖振与能耗上升',
  lambda: '$\\lambda$ 增大 → 更看重控制能量，响应变缓但更平滑',
  gamma: '自适应增益 $\\gamma$ 增大 → 参数收敛更快，但更易漂移',
  w_o: '观测器带宽 $\\omega_o$ 增大 → 扰动估计更快，但噪声放大',
  b0: '$b_0$ 偏离真实增益 $1/m$ → 扰动估计系统性偏大或偏小',
  t_pred: '预测时域增大 → 更"看得远"，但模型失配时更易振荡',
  c_surf: '滑模面系数 $c$ 增大 → 误差收敛更快，但初始控制量更大'
};

function pickGains(conf) {
  const keys = Object.keys(conf.params || {});
  const out = [];
  ['kp', 'ki', 'kd', 'kc', 'k_gain', 'kp0', 'lambda', 'w_o', 'b0', 't_pred', 'c_surf', 'gamma'].forEach((k) => {
    if (keys.indexOf(k) >= 0 && GAIN_NOTE[k] && out.length < 3) out.push(k);
  });
  return out;
}

function ratingTable(method) {
  const rows = D.PLANT_LIST.map((pid) => {
    const v = (FIT.verdicts[method] || {})[pid] || 'fair';
    const name = (FIT.plantNames && FIT.plantNames[pid]) || pid;
    return '| ' + name + ' | ' + (LABEL[v] || v) + ' |';
  });
  const real = (FIT.realVerdicts[method] || {}).pendulum;
  return [
    '| 对象 | 默认参数评级 |',
    '| --- | --- |',
    ...rows,
    '',
    '> 评级口径：24 s 阶跃、默认环境，末段 2 s 均值误差 ≤0.05 且标准差 ≤0.10 判「适用」。' +
      '倒立摆在**真实动力学（辅助关闭）**下为「' + (LABEL[real] || real) + '」；' +
      '其余对象的辅助/真实模式一致。'
  ].join('\n');
}

function weakestPlant(method) {
  /* 取评级最差的对象；同评级时优先选非 msd，保证练习三是真正的"对象迁移" */
  let worst = { pid: 'msd', v: 'good' };
  D.PLANT_LIST.forEach((pid) => {
    const v = (FIT.verdicts[method] || {})[pid] || 'fair';
    if (RANK[v] > RANK[worst.v]) worst = { pid, v };
    else if (RANK[v] === RANK[worst.v] && worst.pid === 'msd' && pid !== 'msd') worst = { pid, v };
  });
  return worst;
}

function sections(method) {
  const conf = D.CONTROLLER_CONFIGS[method];
  const cat = String(conf.category).slice(0, 2);
  const crit = CRITERIA[cat] || CRITERIA['03'];
  const gains = pickGains(conf);
  const gainLines = gains.length
    ? gains.map((k) => '- ' + GAIN_NOTE[k] + '。').join('\n')
    : '- 该方法没有显式增益旋钮，稳定性由算法内部参数与对象模型匹配程度决定。';
  const weak = weakestPlant(method);
  const weakName = (FIT.plantNames && FIT.plantNames[weak.pid]) || weak.pid;
  const weakLabel = LABEL[weak.v] || weak.v;
  const name = conf.name;

  return [
    '## 十、稳定性速查',
    '',
    '回到结构本身：' + crit,
    '',
    '参数层面的方向可以直接在实验台上验证：',
    '',
    gainLines,
    '',
    '默认参数下的实测评级如下。数据由 `tools/build-fit.js` 逐对象跑出，不是经验估计：',
    '',
    ratingTable(method),
    '',
    '这张表只回答「默认参数能不能用」，不回答「换一组参数会不会更好」；后者要靠下一章的练习自己试。',
    '',
    '## 十一、可判定练习',
    '',
    '**练习一：基线复现。** 把对象切到「质量-弹簧-阻尼」，运行 ' + name +
      '，目标 5 m，连续跑 6 s。验收看三件事：末段误差不超过 0.05 m（约目标幅值的 1%）；指标卡的「调节时间」给出具体数值而不是「未收敛」；控制力曲线不长期贴住限幅线。如果误差没达标、控制力却先贴线，问题在饱和而不在算法结构，把 ' +
      (gains[0] ? '`' + gains[0] + '`' : '增益') + ' 降低 30% 再测。',
    '',
    '**练习二：增益方向。** 把 ' + (gains[0] ? '`' + gains[0] + '`' : '主增益') +
      ' 逐步加倍，记录超调与调节时间。正常的表现是超调随增益单调上升，但系统不出现等幅振荡；一旦纹波 $\\sigma_u$ 持续增大、曲线不再衰减，就说明越过了稳定边界。把增益推过边界之后，再用 ' +
      (gains[1] ? '`' + gains[1] + '`' : '阻尼类参数') + ' 拉回来，能直观看到稳定边界是可移动的。',
    '',
    '**练习三：对象迁移。** 切到「' + weakName + '」（默认评级为 **' + weakLabel +
      '**），保持默认参数运行。曲线现象应当与评级一致：「适用」的末段贴住目标；「需调参 / 不推荐」会出现持续振荡、漂移或发散。若现象对不上，先检查对象参数是否被改动、限幅是否足够，再怀疑评级数据。',
    '',
    '做完这三组，能用一句话说清「为什么 ' + name + ' 在「' + weakName + '」上' +
      (weak.v === 'good' ? '依然能稳定收敛、靠的是哪一条结构条件' : '会表现为' + weakLabel + '、缺的是哪一条条件') +
      '，以及该动哪个参数」，这一讲就算掌握了。',
    ''
  ].join('\n');
}

/* ── 写回 159 份文档 ── */
const files = fs.readdirSync(methodsDir).filter((f) => /^\d{2,3}-.*\.md$/.test(f)).sort();
let changed = 0;
files.forEach((fn) => {
  const full = path.join(methodsDir, fn);
  let text = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n[\s\S]*?\n---\n/.exec(text);
  const fm = m ? m[0] : '';
  let body = fm ? text.slice(fm.length) : text;
  const keyMatch = /^key:\s*(\S+)/m.exec(fm);
  const key = keyMatch ? keyMatch[1] : '';
  if (!D.CONTROLLER_CONFIGS[key]) { console.warn('跳过（无配置）：' + fn); return; }
  const cut = body.search(/^## 十、/m);
  if (cut >= 0) body = body.slice(0, cut);
  body = body.replace(/\n+$/, '\n\n');
  const next = fm + body + sections(key) + '\n';
  if (next !== text) { fs.writeFileSync(full, next, 'utf8'); changed++; }
});
console.log('已更新 ' + changed + ' / ' + files.length + ' 份文档（十、十一两章）');
