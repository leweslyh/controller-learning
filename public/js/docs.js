/* ============================================================
   docs.js — 教学文档阅读层（零外部依赖）
   每个控制器一份面向初学者的「推导 / 使用 / 参数选择」文档：
     正文唯一来源 = public/docs/methods/*.md（由 tools/build-docs.js 打包进 window.__DOCS__）
   页面内提供全屏阅读器，直接渲染 Markdown 原文，不再有内容副本或导出副本。
   说明：推导部分为「直观推导/设计思路」，不是严格数学证明；
        控制律为本平台的教学演示级离散化实现。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const D = NS.data;
  const math = NS.math;
  const doc = global.document;


  /* 章节目录使用与实验台一致的中文数字编号 */
  const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  /* ── 重点方法的推导要点（其余方法由体系模板 + 自身公式生成） ── */

  /* ── 闭环极点数值分析：把当前参数代入特征多项式求根 ──
     Durand-Kerner 迭代，纯复数运算，无外部依赖。 */
  function polyRoots(coeffs) {
    const n = coeffs.length - 1;
    if (n < 1) return [];
    const a = coeffs.map((c) => c / coeffs[0]);
    const roots = [];
    for (let i = 0; i < n; i++) {
      const ang = 2 * Math.PI * i / n + 0.4;
      roots.push({ re: Math.cos(ang) * 0.9, im: Math.sin(ang) * 0.9 });
    }
    const evalP = (z) => {
      let re = 0, im = 0;
      for (let i = 0; i <= n; i++) {
        const c = a[i] || 0;
        const nr = re * z.re - im * z.im + c;
        const ni = re * z.im + im * z.re;
        re = nr; im = ni;
      }
      return { re, im };
    };
    for (let iter = 0; iter < 80; iter++) {
      for (let i = 0; i < n; i++) {
        let dr = 1, di = 0;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const rr = roots[i].re - roots[j].re, ri = roots[i].im - roots[j].im;
          const nr = dr * rr - di * ri, ni = dr * ri + di * rr;
          dr = nr; di = ni;
        }
        const p = evalP(roots[i]);
        const den = dr * dr + di * di || 1e-9;
        roots[i].re -= (p.re * dr + p.im * di) / den;
        roots[i].im -= (p.im * dr - p.re * di) / den;
      }
    }
    return roots.sort((x, y) => y.re - x.re);
  }


  /* ── 闭环特征方程：按控制律族推导 ───────────────────────
     每条都与 js/simulation.js 的同名 case 分支严格对应（含反馈前馈项的处理）。
     原则：算得出解析多项式的方法才给极点；算不出的（离散/非线性/学习型）
     一律留给正文定性说明，绝不输出与实现不符的极点。 */
  const LOOP_DERIV = {
    /* 反馈通道：u = kx + cv − kp·x + kp·target − kv·v
       即把对象自带的弹性与阻尼"让位"给设计出来的 K_p、K_v */
    'Feedback-Passivation': function (m, c, k, cp, num) {
      const kp = num(cp.kp), kv = num(cp.kv);
      return {
        order: 2, coeffs: [m, kv, kp], tex: 'm s^{2}+k_v s+k_p=0',
        note: '控制律把对象自带的弹性 k 与阻尼 c 抵消掉，再换成设计出来的 K_p、K_v，因此闭环等效刚度就是 K_p、等效阻尼就是 K_v——与对象的 c、k 无关，只剩 m 决定时间尺度。这正是"通过改造系统把被动特性换成反馈特性"的核心思想。'
      };
    },
    /* 扩张龙伯格观测器 + 状态反馈：u = kp(r − x̂) − kd·v̂ + k·r */
    'Extended-Luenberger': function (m, c, k, cp, num) {
      const kp = num(cp.kp), kd = num(cp.kd);
      return {
        order: 2, coeffs: [m, c + kd, k + kp], tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        approx: true,
        note: '上式是「观测完全准确」时的等效极点。实际实现用扩张龙伯格观测器在线估计位置与速度，闭环其实是「对象两阶 + 观测器两阶」共四阶，极点由对象极点与观测器极点共同决定；只要观测器极点放得比控制极点更靠左（分离原理），闭环极点就近似落在上式的位置。'
      };
    },
    /* 扩展卡尔曼滤波 + 状态反馈：u = kp(r − x̂) − kd·v̂ + k·r */
    'EKF-Ctrl': function (m, c, k, cp, num) {
      const kp = num(cp.kp), kd = num(cp.kd);
      return {
        order: 2, coeffs: [m, c + kd, k + kp], tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        approx: true,
        note: '上式是「状态估计完全准确」时的等效极点。实际闭环是「对象 + 卡尔曼滤波」的四阶系统，滤波增益由 q_cov/r_cov 决定；估计不准时闭环极点会偏移，现象是响应比理想模型"发钝"、控制力带噪声抖动。'
      };
    },
    /* 粒子滤波给出位置估计 x̂，u = kp(r − x̂) − kd·v + k·r */
    'Particle-Filter': function (m, c, k, cp, num) {
      const kp = num(cp.kp), kd = num(cp.kd);
      return {
        order: 2, coeffs: [m, c + kd, k + kp], tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        approx: true,
        note: '上式是「粒子平均就是真值」时的等效极点。实际闭环含一组随机粒子，位置取它们的平均，估计带有方差：粒子数越多方差越小，控制力也就越平滑——这解释了为什么"多撒粒子"能换来更好的噪声抑制。'
      };
    },
    /* u = kp·e − kd·v + k·target，K_p=√(q_x/r)，K_d=√(q_v/r+2mK_p) */
    /* u = kp·e − kd·v + k·target，K_p=√(q_x/r)，K_d=√(q_v/r+2mK_p) */
    'LQR': function (m, c, k, cp, num) {
      const kp = Math.sqrt(num(cp.q_x) / num(cp.r_weight));
      const kd = Math.sqrt(num(cp.q_v) / num(cp.r_weight) + 2 * m * kp);
      return {
        order: 2, coeffs: [m, c + kd, k + kp], tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        note: '最优反馈的等效刚度 k+K_p 与等效阻尼 c+K_d 与 PD 同形，差别只在于 K_p、K_d 由 Q/R 解出而不是人工试凑。'
      };
    },
    /* LQG 用卡尔曼滤波替代真实状态；理想估计下与 LQR 同极点，估计误差表现为附加扰动 */
    'LQG': function (m, c, k, cp, num) {
      const kp = Math.sqrt(num(cp.q_x) / num(cp.r_w));
      const kd = Math.sqrt(num(cp.q_v) / num(cp.r_w) + 2 * m * kp);
      return {
        order: 2, coeffs: [m, c + kd, k + kp], tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        approx: true,
        note: '上式是「卡尔曼滤波为理想估计」时的等效极点，与 LQR 相同。实际实现的闭环还要加上滤波器自身的两个状态（总阶 4 阶），滤波器带宽决定附加的那对极点，因此实测极点会比上式慢一截——这是用估计器带宽换噪声抑制的代价。'
      };
    },
    /* u = P_{22} e − P_{12} v；P_{22}=√(q_x/max(0.01,1−1/γ²))，P_{12}=√(m·P_{22}) */
    'H-Infinity': function (m, c, k, cp, num) {
      const gs = num(cp.gamma) * num(cp.gamma);
      const p22 = Math.sqrt(num(cp.q_x) / Math.max(0.01, 1 - 1 / gs));
      const p12 = Math.sqrt(m * p22);
      return {
        order: 2, coeffs: [m, c + p12, k + p22], tex: 'm s^{2}+(c+P_{12})s+(k+P_{22})=0',
        note: 'H∞ 权重 γ 越大，放大被抑制扰动的频率范围越宽，等效阻尼 c+P_{12} 同步增大，闭环更快但控制力峰值更高。'
      };
    },
    /* u = K_x e − K_v v + K_i∫e；K_x=√q_x，K_v=√q_v，K_i=√q_i */
    'LQR-I': function (m, c, k, cp, num) {
      const kx = Math.sqrt(num(cp.q_x)), kv = Math.sqrt(num(cp.q_v)), ki = Math.sqrt(num(cp.q_i));
      return {
        order: 3, coeffs: [m, c + kv, k + kx, ki], tex: 'm s^{3}+(c+K_v)s^{2}+(k+K_x)s+K_i=0',
        approx: true,
        note: '上式是**理想线性化**下的结论。代入默认参数（q_x=100、q_v=10、q_i=500）时 Routh 判据不成立，最大实部为正，线性系统是临界不稳定的——实验台上之所以还能收敛，靠的是执行器限幅把发散趋势削平，代价是静差高达 1.5 m 量级。把 q_i 调到 20 以下即可让上式稳定，这也正是「积分增益必须先算再调」的典型例子。'
      };
    },
    /* u = −K_x x − K_v v + K_i∫e + k·target；K_x=√(q_x/r_u)，K_v=√(2mK_x)，K_i=√(q_e/r_u) */
    'IMP-Servo': function (m, c, k, cp, num) {
      const kx = Math.sqrt(num(cp.q_x) / num(cp.r_u));
      const kv = Math.sqrt(2 * m * kx), ki = Math.sqrt(num(cp.q_e) / num(cp.r_u));
      return {
        order: 3, coeffs: [m, c + kv, k + kx, ki], tex: 'm s^{3}+(c+K_v)s^{2}+(k+K_x)s+K_i=0',
        approx: true,
        note: '上式是**理想线性化**下的结论。默认参数下最大实部为正，线性系统不稳定；实验台上的表现还取决于执行器限幅与积分项的饱和行为。想让伺服环稳定，必须先按 Routh 条件把 Q 的配比压下来，再谈静差。'
      };
    },
    /* u = (H(target − x_free) + λk·target)/(H²+λ)，x_free = x + v·t_pred − H(cv+kx)，H = t_pred²/(2m) */
    'MPC': function (m, c, k, cp, num) {
      const H = num(cp.t_pred) * num(cp.t_pred) / (2 * m);
      const A = 1 / (H * H + num(cp.lambda));
      const b1 = A * (H * num(cp.t_pred) - H * H * c);
      const b0 = A * (H - H * H * k);
      return {
        order: 2, coeffs: [m, c + b1, k + b0], tex: 'm s^{2}+(c+B_1)s+(k+B_0)=0',
        note: '单步预测律可以整理成等效 PD：等效刚度 k+B_0、等效阻尼 c+B_1 由预测视野 t_pred 与增量惩罚 λ 决定；t_pred 越大越"看得远"，但 B_0 越大对模型误差越敏感。'
      };
    },
    /* u = (m/Δt²)k_s e − (m/Δt + c)k_s v + k·x：用 +k·x 抵消对象弹性，等效刚度只剩 m/Δt²·k_s */
    'Deadbeat': function (m, c, k, cp, num, dt) {
      const ks = num(cp.kp_scale);
      return {
        order: 2, coeffs: [m, (m / dt + c) * ks + c, (m / (dt * dt)) * ks],
        tex: 'm s^{2}+\\left[(m/\\Delta t+c)k_s+c\\right]s+\\frac{m}{\\Delta t^{2}}k_s=0',
        approx: true,
        note: '上式是**执行器未限幅**时的理想闭环：弹性回复力被完全抵消，刚度只剩 (m/Δt²)·k_s，理论上可以一拍到位。但这个刚度对应的控制力是 k_s·m·e/Δt²，误差稍大就会顶到限幅（本平台的执行器上限是 200 N），实测衰减率因此只有理论值的三分之一——「无差拍」在有限带宽的执行器上本来就做不到。'
      };
    },
    /* v_d = kp_out·e；u = kp_in(v_d−v) + ki_in∫(v_d−v)dt + k·target */
    'Nested-PID': function (m, c, k, cp, num) {
      const kio = num(cp.kp_out), kii = num(cp.kp_in), kint = num(cp.ki_in);
      return {
        order: 3, coeffs: [m, c + kii, k + kii * kio + kint, kint * kio],
        tex: 'm s^{3}+(c+K_{p,in})s^{2}+(k+K_{p,in}K_{p,out}+K_{i,in})s+K_{i,in}K_{p,out}=0',
        note: '串级结构：外环把误差变成速度指令 v_d，内环再把 (v_d−v) 整定掉。闭环是 3 阶，外环增益 K_{p,out} 直接乘进等效刚度，外环调得越快内环越难跟上。'
      };
    },
    /* u = m·wn²·target − (m·wn² − k̂)x − (2mζwn − ĉ)v；辨识收敛时 k̂=k、ĉ=c，弹性项被抵消 */
    'STR': function (m, c, k, cp, num) {
      const wn = num(cp.wn), z = num(cp.zeta);
      return {
        order: 2, coeffs: [m, c + 2 * m * z * wn, m * wn * wn],
        tex: 'm s^{2}+(c+2m\\zeta\\omega_n)s+m\\omega_n^{2}=0',
        approx: true,
        note: '上式是**辨识收敛后**的闭环方程（弹性回复力被完全抵消，刚度只剩 mω_n²、阻尼 c+2mζω_n，与 LQR 同构）。辨识器本身还要时间收敛，收敛前 k̂、ĉ 都不准，所以实测极点会随辨识进程漂移。'
      };
    },
    /* u = sat(kp·e + ki∫e) − 20·v + k·target：限幅外的等效控制律 */
    'AW-PI': function (m, c, k, cp, num) {
      const kp = num(cp.kp), ki = num(cp.ki);
      return {
        order: 3, coeffs: [m, c + 20, k + kp, ki], tex: 'm s^{3}+(c+20)s^{2}+(k+K_p)s+K_i=0',
        approx: true,
        note: '上式是**限幅未触发时**的闭环方程（等效阻尼被抬高到 c+20，静差由积分项消除）。一旦执行器进入限幅，积分反算会把饱和量退回，等效刚度随之变化，所以大指令下的实际响应不再是这条曲线。'
      };
    },
    /* u = m(kp·e − kd·v) + c·v + k·x：模型对消后只剩 ë + kd·ė + kp·e = kp·r */
    'FeedbackLin': function (m, c, k, cp, num) {
      const kp = num(cp.kp), kd = num(cp.kd);
      return {
        order: 2, coeffs: [1, kd, kp], tex: '\\ddot{e}+k_d\\dot{e}+k_p e=0',
        note: '反馈线性化用 m、c、k 的先验把对象动态整段对消，闭环方程退化成与对象无关的标准二阶；极点由 k_p、k_d 直接指定，代价是模型失配会原样变成扰动。'
      };
    },
    /* u = kp·e − kd·v − k_nd·e²·v：非线性项在原点附近是三阶小量，线性化后与 PD 同形 */
    'NDC': function (m, c, k, cp, num) {
      const kp = num(cp.kp), kd = num(cp.kd);
      return {
        order: 2, coeffs: [m, c + kd, k + kp], tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        approx: true,
        note: '上式是**平衡点附近线性化**后的方程（非线性阻尼项 k_nd·e²·v 在原点附近是高阶小量，线性化后与 PD 同形）。真正的价值出现在大偏差区——它按误差平方额外加阻尼、抑制大范围运动的超调，此时线性化不再适用。'
      };
    },
    /* 滑模面 s = c_surface·e − ė；等效控制对消对象动态后，面上是一阶收敛 */
    'SMC': function (m, c, k, cp, num) {
      const cs = num(cp.c_surface);
      return {
        order: 1, coeffs: [1, cs], tex: 's+c_{surface}=0',
        note: '等效控制把已知对象动态对消，系统被约束在滑模面 s=c_{surface}·e−ċ=0 上；面上退化成 ė=c_{surface}·e，极点固定在 s=−c_{surface}，与对象参数无关，这正是滑模的鲁棒性来源。'
      };
    },
    'ASMC': function (m, c, k, cp, num) {
      const cs = num(cp.c_surface);
      return {
        order: 1, coeffs: [1, cs], tex: 's+c_{surface}=0',
        approx: true,
        note: '上式是**滑模面上**的极点，与 SMC 同形（s=−c_{surface}）。区别在切换增益 K̂ 由 |s| 在线抬升：到达阶段增益是时变的，因此整体闭环不是固定阶数的线性系统。'
      };
    },
    'VariableG-SMC': function (m, c, k, cp, num) {
      const cs = num(cp.c_surf);
      return {
        order: 1, coeffs: [1, cs], tex: 's+c_{surf}=0',
        approx: true,
        note: '上式是**滑模面上**的极点（s=−c_{surf}）。切换增益随 |x| 线性变化 k_0+k_1|x|，只在远离目标处加大力度、靠近目标时减小以抑制抖振，因此整条曲线不是固定增益的线性响应。'
      };
    },
    /* s = −v + c1·e + c2∫e；面上是二阶收敛 */
    'ISMC': function (m, c, k, cp, num) {
      const c1 = num(cp.c1), c2 = num(cp.c2);
      return {
        order: 2, coeffs: [1, c1, c2], tex: 's^{2}+c_1 s+c_2=0',
        approx: true,
        note: '上式是**滑模面上**的收敛过程（极点由 c_1、c_2 决定）。完整闭环还包含「到达阶段」与切换项引起的抖振，阶数比上式高；好处是初始偏差被一并压进滑模面，不必单独经历到达阶段。'
      };
    },
    /* 参考模型给出二阶理想响应，理想 MRAC 收敛到模型匹配 */
    'MRAC': function (m, c, k, cp, num) {
      const wn = num(cp.wn), z = num(cp.zeta);
      return {
        order: 2, coeffs: [1, 2 * z * wn, wn * wn], tex: 's^{2}+2\\zeta\\omega_n s+\\omega_n^{2}=0',
        approx: true,
        note: '上式是**理想模型匹配**时闭环跟随参考模型的极点。自适应律本身还要花时间把真实系统极点「拉」到这一对，所以实测收敛明显更慢，且自适应增益 Γ 越大拉得越快、参数抖振也越明显。'
      };
    },
    /* u = kp·e − kd·v + k_prev·(目标的一阶滤波和)：前馈项只作用在指令通道 */
    'Preview': function (m, c, k, cp, num) {
      const kp = num(cp.kp), kd = num(cp.kd);
      return {
        order: 2, coeffs: [m, c + kd, k + kp], tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        approx: true,
        note: '上式是**反馈通道**的闭环方程。预览项是纯前馈（只由指令决定）但自带一个滤波状态，因此整条闭环是 3 阶；它改善的是指令跟随的起始段与相位裕度，不会改善恒值扰动下的静差。'
      };
    }
  };

  /* 只对能写成线性闭环特征多项式的控制器给出数值算例；
     非线性/时变/学习型返回 null，改由正文定性说明。 */
  function analyzeLoop(key, conf, params) {
    const P = D.PLANTS[params.plantId] || D.PLANTS.msd;
    const pp = params.plantParams && params.plantParams[P.id] ? params.plantParams[P.id] : P.defaults;
    const eff = P.effective(pp);
    const m = eff.m, c = eff.c, k = eff.k;
    const cp = params.ctrl || {};
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const dt = (NS.sim && NS.sim.getSettings) ? (NS.sim.getSettings().dt || 0.02) : 0.02;

    /* ① 按控制律族精确推导（与 simulation.js 的 case 分支一一对应） */
    if (LOOP_DERIV[key]) {
      const d = LOOP_DERIV[key](m, c, k, cp, num, dt);
      return {
        plant: P, eff: { m: m, c: c, k: k }, order: d.order, coeffs: d.coeffs,
        tex: d.tex, note: d.note, derived: true, approx: !!d.approx
      };
    }
    /* ② 严格是「u = K_p e + K_i∫e − K_d v」这一族的方法
          （白名单：其余带 kp/kd 参数的方法还含观测器、量化、约束、
            延迟、分数幂等额外动态，不能套用同一个特征多项式） */
    const PID_FORM = { 'P': 2, 'PI': 2, 'PD': 2, 'PID': 3, 'PI-D': 3, 'IPD': 3, '2DOF-PID': 3 };
    const pidOrder = PID_FORM[key];
    if (pidOrder) {
      const Kp = num(cp.kp), Ki = num(cp.ki), Kd = num(cp.kd);
      if (pidOrder === 3 && Math.abs(Ki) > 1e-9) {
        return {
          plant: P, eff: { m: m, c: c, k: k }, order: 3, coeffs: [m, c + Kd, k + Kp, Ki],
          tex: 'm s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i=0',
          note: '控制器含一个积分器，闭环比对象高一阶（3 阶）；比例项抬高等效刚度、微分项抬高等效阻尼、积分项提高型别消除静差。'
        };
      }
      if (pidOrder === 3) {
        return {
          plant: P, eff: { m: m, c: c, k: k }, order: 3, coeffs: [m, c + Kd, k + Kp, Ki],
          tex: 'm s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i=0',
          note: '该结构把比例作用在位置量上（IPD / 2DOF-PID 的比例通道走 b·r−x），对闭环极点的影响与标准 PID 同形，差别只体现在指令通道的加权方式。'
        };
      }
      if (Math.abs(Ki) > 1e-9) {
        return {
          plant: P, eff: { m: m, c: c, k: k }, order: 3, coeffs: [m, c + Kd, k + Kp, Ki],
          tex: 'm s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i=0',
          note: '控制器含一个积分器，闭环比对象高一阶（3 阶）。'
        };
      }
      return {
        plant: P, eff: { m: m, c: c, k: k }, order: 2, coeffs: [m, c + Kd, k + Kp],
        tex: 'm s^{2}+(c+K_d)s+(k+K_p)=0',
        note: '比例与微分只改变等效刚度与阻尼，闭环仍是 2 阶。'
      };
    }
    /* ③ 极点配置 */
    if (conf.params && 'p1' in conf.params && 'p2' in conf.params) {
      const p1 = Math.abs(num(cp.p1)), p2 = Math.abs(num(cp.p2));
      /* 与控制器实现一致：K_1 = m p_1p_2 - k、K_2 = m(p_1+p_2) - c */
      const K1 = m * p1 * p2 - k;
      const K2 = m * (p1 + p2) - c;
      return {
        plant: P, eff: { m: m, c: c, k: k }, order: 2, coeffs: [m, c + K2, k + K1],
        tex: 'm s^{2}+(c+K_2)s+(k+K_1)=0\\;\\Rightarrow\\;m(s+p_1)(s+p_2)=0',
        note: '状态反馈把闭环极点直接配到 s = −p₁、s = −p₂，闭环阶数与对象相同。'
      };
    }
    return null;
  }


  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }





  function inlineMd(s) {
    if (s == null) return '';
    /* 处理顺序很重要：先把 Markdown 语法（链接 / 代码 / 强调）用「占位符」保护起来，
       再交给 math.renderMixed 做公式识别与自动排版，最后还原占位符。
       若直接先渲染公式，autoMath 会把 (method:PI)、** 等标记当成普通文本吞掉，
       导致加粗失效、方法跳转按钮无法生成。 */
    const store = [];
    const H = '\u0000';
    function hold(html) { const idx = store.length; store.push(html); return H + String.fromCharCode(1 + idx); }
    function mathIn(text) { return math.renderMixed(text); }
    let t = String(s);
    /* ① 同类方法跳转 / 外链 */
    t = t.replace(/\[([^\]]+)\]\((method|https?):([^)]+)\)/g, function (m, label, proto, target) {
      if (proto === 'method') {
        return hold('<button type="button" class="doc-peer" data-doc="' + esc(target.trim()) + '">' + mathIn(label) + '</button>');
      }
      return hold('<a class="doc-link" href="' + esc(proto + ':' + target) + '" target="_blank" rel="noopener">' + mathIn(label) + '</a>');
    });
    /* ② 普通链接 */
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, label, href) {
      return hold('<a class="doc-link" href="' + esc(href) + '" target="_blank" rel="noopener">' + mathIn(label) + '</a>');
    });
    /* ③ 行内代码 */
    t = t.replace(/`([^`]+?)`/g, function (m, code) { return hold('<code>' + esc(code) + '</code>'); });
    /* ④ 加粗 / 斜体（内部仍允许行内公式） */
    t = t.replace(/\*\*([^*]+?)\*\*/g, function (m, b) { return hold('<strong>' + mathIn(b) + '</strong>'); });
    t = t.replace(/\*([^*]+?)\*/g, function (m, b) { return hold('<em>' + mathIn(b) + '</em>'); });
    /* ⑤ 公式与自动排版 */
    t = math.renderMixed(t);
    /* ⑥ 还原占位符 */
    t = t.replace(new RegExp(H + '([\\u0001-\\u001f])', 'g'), function (m, ch) {
      return store[ch.charCodeAt(0) - 1] || '';
    });
    return t;
  }

  function parseMd(src) {
    const text = String(src || '').replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    const pre = [];
    const secs = [];
    let cur = null;
    let secId = 0;
    function pushBlock(html) {
      if (cur) cur.body.push(html); else pre.push(html);
    }
    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed) { i++; continue; }

      /* 独立公式 $$ ... $$（支持单行与多行，\tag 由 KaTeX 右对齐编号） */
      if (trimmed.indexOf('$$') === 0) {
        if (trimmed.length > 2 && trimmed.charAt(trimmed.length - 1) === '$' && trimmed.charAt(trimmed.length - 2) === '$') {
          const tex = trimmed.slice(2, -2).trim();
          pushBlock('<div class="doc-math">' + math.render(tex, { display: 'block' }) + '</div>');
          i++; continue;
        }
        const buf = []; i++;
        while (i < lines.length && lines[i].trim() !== '$$') { buf.push(lines[i]); i++; }
        i++;
        const tex = buf.join('\n').trim().replace(/\s+/g, ' ');
        pushBlock('<div class="doc-math">' + math.render(tex, { display: 'block' }) + '</div>');
        continue;
      }

      /* 章节标题 ## / ### */
      const hm = /^(#{2,6})\s+(.*)$/.exec(trimmed);
      if (hm) {
        const level = hm[1].length;
        const title = hm[2].trim();
        if (level === 2) {
          if (cur) secs.push(cur);
          cur = { id: 'sec-' + (++secId), title: title, body: [] };
        } else {
          pushBlock('<h4 class="doc-subh">' + inlineMd(title) + '</h4>');
        }
        i++; continue;
      }

      /* 提示框 >（[!NOTE]/[!WARNING] 或「注意」前缀分辨类型） */
      if (trimmed.charAt(0) === '>') {
        const rawLines = [];
        while (i < lines.length && lines[i].trim().charAt(0) === '>') {
          rawLines.push(lines[i].trim().replace(/^>\s?/, '')); i++;
        }
        let kind = 'info';
        const first = rawLines[0] || '';
        if (/^\[!(WARNING|CAUTION)\]/i.test(first)) kind = 'warn';
        else if (/^\[!(NOTE|TIP|INFO)\]/i.test(first)) kind = 'info';
        else if (/^(注意|警告|warning)/i.test(first)) kind = 'warn';
        const cleaned = rawLines.map((l) => l.replace(/^\[!(NOTE|TIP|INFO|WARNING|CAUTION)\]\s*/i, '')).join('\n');
        pushBlock('<div class="doc-callout ' + (kind === 'warn' ? 'is-warn' : '') + '">' + inlineMd(cleaned).replace(/\n/g, '<br>') + '</div>');
        continue;
      }

      /* 列表（有序 / 无序） */
      if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        const ordered = /^\d+\.\s+/.test(trimmed);
        const items = [];
        while (i < lines.length) {
          const t = lines[i].trim();
          const isItem = ordered ? /^\d+\.\s+/.test(t) : /^[-*]\s+/.test(t);
          if (!isItem) break;
          items.push(t.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''));
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        const cls = ordered ? 'doc-steps' : 'doc-list';
        pushBlock('<' + tag + ' class="' + cls + '">' + items.map((it) => '<li>' + inlineMd(it) + '</li>').join('') + '</' + tag + '>');
        continue;
      }

      /* 表格 | */
      if (trimmed.indexOf('|') >= 0) {
        const tbl = [];
        while (i < lines.length && lines[i].trim().indexOf('|') >= 0) { tbl.push(lines[i].trim()); i++; }
        const rows = tbl.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        const sepIdx = rows.findIndex((r, idx) => idx > 0 && r.length && r.every((c) => /^:?-+:?$/.test(c)));
        if (rows.length >= 2 && (sepIdx >= 0 || rows.length >= 3)) {
          const head = rows[0];
          const body = sepIdx >= 0 ? rows.slice(sepIdx + 1) : rows.slice(1);
          pushBlock('<div class="doc-table-wrap"><table class="doc-table"><thead><tr>' +
            head.map((h) => '<th>' + inlineMd(h) + '</th>').join('') + '</tr></thead><tbody>' +
            body.map((r) => '<tr>' + r.map((c) => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>').join('') +
            '</tbody></table></div>');
          continue;
        }
        pushBlock('<p class="doc-p">' + inlineMd(trimmed) + '</p>');
        i++; continue;
      }

      /* 普通段落：合并连续普通行 */
      const para = [trimmed];
      i++;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        if (t.indexOf('$$') === 0 || /^#{2,6}\s+/.test(t) || t.charAt(0) === '>' ||
            /^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t) || t.indexOf('|') >= 0) break;
        para.push(t); i++;
      }
      pushBlock('<p class="doc-p">' + inlineMd(para.join(' ')) + '</p>');
    }
    if (cur) secs.push(cur);
    const toc = secs.filter((s) => s.title).map((s) =>
      '<a href="#' + s.id + '" data-toc="' + s.id + '">' + esc(s.title) + '</a>').join('');
    const body = pre.concat(secs.map((s) =>
      '<section class="doc-section" id="' + s.id + '"><h3>' + inlineMd(s.title) + '</h3>' + s.body.join('') + '</section>'
    )).join('');
    return (toc ? '<nav class="doc-toc" aria-label="本讲目录">' + toc + '</nav>' : '') + body;
  }

  /* 阅读器内的原论文引用块：离线只展示元数据与链接，不发请求 */
  function paperSection(key) {
    const P = NS.papers;
    const p = P && P.getPaper && P.getPaper(key);
    if (!p || !p.title) return '';
    const v = (P.getVerify && P.getVerify(key)) || { status: 'unverified' };
    const statusText = { verified: '已核验', suspect: '存疑', unreachable: '链接不可达', unverified: '待核验' }[v.status] || '待核验';
    const url = /^https?:\/\//i.test(p.url || '') ? p.url : '';
    return '<section class="doc-paper">' +
      '<h3 class="doc-paper-h">原论文出处 <span class="paper-status is-' + esc(v.status) + '">' + esc(statusText) + '</span></h3>' +
      '<p class="doc-paper-title">' + esc(p.title) + '</p>' +
      '<p class="doc-paper-meta">' + esc(p.authors || '作者未标注') + ' · ' + esc(p.journal || '出处未标注') + '</p>' +
      (v.reason ? '<p class="paper-reason">核验说明：' + esc(v.reason) + '</p>' : '') +
      (url ? '<p><a class="paper-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
        '查看原文（新标签打开，离线环境不自动请求） ↗</a></p>' : '<p class="paper-link is-disabled">暂无可用链接</p>') +
      '<p class="doc-paper-hint">完整核验记录见 <code>public/docs/论文引用核验.md</code>。</p>' +
      '</section>';
  }

  function renderDoc(key) {
    const bundle = global.__DOCS__ || {};
    const entry = bundle[key];
    const conf = D.CONTROLLER_CONFIGS[key];
    if (!conf) return '<p class="doc-p">未找到该方法。</p>';
    if (!entry) return '<p class="doc-p">该方法的教学文档尚未生成（请运行 <code>node tools/build-docs.js</code> 重新打包）。</p>';
    const meta = entry.meta || {};
    const index = Number(meta.index) || (D.methodList.indexOf(key) + 1);
    const approx = D.isApproximation ? D.isApproximation(conf) : (conf.approx || false);
    return '<article class="doc-article">' +
      '<div class="doc-hero">' +
      '<span class="doc-kicker">第 ' + index + ' / ' + D.methodList.length + ' 讲 · ' + esc(meta.category || conf.category) + '</span>' +
      '<h2 id="docs-title">' + esc(meta.title || conf.name) + '</h2>' +
      '<p>' + esc(conf.desc) + '</p>' +
      (approx ? '<span class="doc-badge">教学演示级近似</span>' : '') +
      '</div>' +
      parseMd(entry.body) +
      paperSection(key) +
      '</article>';
  }

  /* ── 页面内阅读器 ─────────────────────────────────── */
  let currentKey = 'PID';
  let savedHash = '';
  let bound = false;

  function renderNav() {
    const host = doc.getElementById('docs-list');
    if (!host) return;
    host.innerHTML = D.sortedCategories.map((cat, index) => {
      const items = (D.groupedMethods[cat] || []).map((m) =>
        '<button type="button" class="doc-nav-item' + (m.key === currentKey ? ' is-active' : '') +
        '" data-doc="' + esc(m.key) + '">' + esc(m.name) + '</button>').join('');
      return '<details class="doc-nav-group" open><summary><span class="chapter-no">' +
        (CN_NUM[index] || String(index + 1)) + '</span>' +
        esc(cat.replace(/^\d+\.\s*/, '')) + '</summary>' + items + '</details>';
    }).join('');
  }

  function show(key, updateHash) {
    if (!D.CONTROLLER_CONFIGS[key]) return;
    currentKey = key;
    const overlay = doc.getElementById('overlay-docs');
    if (!overlay) return;
    overlay.hidden = false;
    const content = doc.getElementById('docs-content');
    if (content) { content.innerHTML = renderDoc(key); content.scrollTop = 0; }
    renderNav();
    const counter = doc.getElementById('docs-counter');
    if (counter) counter.textContent = '第 ' + (D.methodList.indexOf(key) + 1) + ' / ' + D.methodList.length + ' 讲';
    if (updateHash !== false) {
      try { global.history.replaceState(null, '', '#doc=' + encodeURIComponent(key)); }
      catch (err) { /* file:// 限制时忽略 */ }
    }
  }

  function open(key) {
    savedHash = global.location.hash || '';
    show(key || currentKey);
    const search = doc.getElementById('docs-search');
    if (search) setTimeout(() => search.focus(), 30);
  }
  function close() {
    const overlay = doc.getElementById('overlay-docs');
    if (overlay) overlay.hidden = true;
    try { global.history.replaceState(null, '', savedHash || location.pathname); }
    catch (err) { /* 忽略 */ }
  }
  function stepDoc(delta) {
    const i = D.methodList.indexOf(currentKey);
    const next = D.methodList[(i + delta + D.methodList.length) % D.methodList.length];
    show(next);
  }
  function useInLab() {
    const sim = NS.sim, ui = NS.ui, app = NS.app;
    if (sim && ui) {
      sim.setMethod(currentKey);
      ui.setActiveMethod(currentKey);
      ui.renderPlant();
      ui.renderParams();
      if (app && app.refreshAll) app.refreshAll();
      else if (NS.charts) NS.charts.draw();
      ui.toast('已切换到 ' + D.CONTROLLER_CONFIGS[currentKey].name + '，可开始实验');
    }
    close();
  }

  function mount() {
    const overlay = doc.getElementById('overlay-docs');
    if (!overlay || bound) return;
    bound = true;
    const activeKey = () => (NS.sim && NS.sim.getSettings) ? NS.sim.getSettings().method : currentKey;
    doc.addEventListener('click', (ev) => {
      if (ev.target.closest('#btn-docs') || ev.target.closest('#btn-profile-docs')) {
        open(activeKey());
      }
    });
    doc.addEventListener('keydown', (ev) => {
      if (ev.key !== 'h' && ev.key !== 'H') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey || !overlay.hidden) return;
      const tag = ev.target && ev.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (ev.target && ev.target.isContentEditable)) return;
      ev.preventDefault();
      open(activeKey());
    });
    overlay.addEventListener('click', (ev) => {
      const item = ev.target.closest('[data-doc]');
      if (item) { show(item.dataset.doc); return; }
      const toc = ev.target.closest('[data-toc]');
      if (toc) {
        ev.preventDefault();
        const target = doc.getElementById(toc.dataset.toc);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (ev.target.closest('[data-docs-close]')) { close(); return; }
      if (ev.target.closest('#docs-prev')) { stepDoc(-1); return; }
      if (ev.target.closest('#docs-next')) { stepDoc(1); return; }
      if (ev.target.closest('#docs-use')) { useInLab(); return; }
    });
    const search = doc.getElementById('docs-search');
    if (search) search.addEventListener('input', (ev) => {
      const q = ev.target.value.trim().toLowerCase();
      doc.querySelectorAll('.doc-nav-item').forEach((btn) => {
        const conf = D.CONTROLLER_CONFIGS[btn.dataset.doc];
        const hit = !q || (conf && (conf.name.toLowerCase().indexOf(q) >= 0 || btn.dataset.doc.toLowerCase().indexOf(q) >= 0));
        btn.hidden = !hit;
        if (hit) { const g = btn.closest('details'); if (g) g.open = true; }
      });
    });
    doc.addEventListener('keydown', (ev) => {
      if (overlay.hidden) return;
      if (ev.key === 'Escape') { ev.stopPropagation(); close(); }
      else if (ev.key === 'ArrowLeft' && !/INPUT|TEXTAREA/.test(ev.target.tagName)) stepDoc(-1);
      else if (ev.key === 'ArrowRight' && !/INPUT|TEXTAREA/.test(ev.target.tagName)) stepDoc(1);
    }, true);
    const hash = /^#doc=(.+)$/.exec(global.location.hash || '');
    if (hash) {
      const key = decodeURIComponent(hash[1]);
      if (D.CONTROLLER_CONFIGS[key]) { savedHash = ''; show(key, false); }
    }
  }

  NS.docs = {
    renderDoc, parseMd, mount, open, close, show, useInLab,
    analyzeLoop, polyRoots
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})(window);
