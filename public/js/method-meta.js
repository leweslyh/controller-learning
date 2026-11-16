/* ============================================================
   method-meta.js — 方法教学元数据与学习路线（V5.1 / S3）
   不侵入 data.js 的 159 条控制律配置：按分类给出默认难度，
   再对代表方法做覆盖；学习路线 8 站，供左右栏筛选与路线面板使用。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const D = NS.data;

  const LEVEL_NAME = { 1: '入门', 2: '进阶', 3: '研究级' };

  /* 分类默认难度：01/02 入门-进阶，03/06 进阶，04/05/07-12 研究级 */
  const CATEGORY_LEVEL = [
    [/^01\./, 1], [/^02\./, 2], [/^03\./, 2], [/^04\./, 3],
    [/^05\./, 3], [/^06\./, 2], [/^07\./, 3], [/^08\./, 3],
    [/^09\./, 3], [/^10\./, 3], [/^11\./, 2], [/^12\./, 3]
  ];

  /* 代表方法的显式覆盖 */
  const OVERRIDE = {
    OpenLoop: { level: 1, plant: 'freeMass', minutes: 5, tags: ['反馈必要性'] },
    P: { level: 1, plant: 'msd', minutes: 6, tags: ['必学', '静差'] },
    PI: { level: 1, plant: 'msd', minutes: 8, tags: ['必学', '积分'] },
    PD: { level: 1, plant: 'freeMass', minutes: 8, tags: ['必学', '电子阻尼'] },
    PID: { level: 1, plant: 'msd', minutes: 12, tags: ['必学', '工业'] },
    IncPID: { level: 1, plant: 'msd', minutes: 10, tags: ['工业'] },
    'AW-PI': { level: 1, plant: 'msd', minutes: 10, tags: ['抗饱和'] },
    'Clamping-PID': { level: 1, plant: 'msd', minutes: 10, tags: ['抗饱和'] },
    'Sep-Int-PID': { level: 1, plant: 'msd', minutes: 10, tags: ['抗饱和'] },
    PolePlacement: { level: 2, plant: 'msd', minutes: 15, tags: ['状态空间'], prereq: ['PID'] },
    LQR: { level: 2, plant: 'msd', minutes: 18, tags: ['状态空间', '必学'], prereq: ['PolePlacement'] },
    'LQR-I': { level: 2, plant: 'msd', minutes: 15, tags: ['状态空间', '无静差'], prereq: ['LQR'] },
    LQG: { level: 2, plant: 'msd', minutes: 20, tags: ['观测器'], prereq: ['LQR'] },
    'Kalman-Pole': { level: 2, plant: 'msd', minutes: 18, tags: ['观测器'], prereq: ['PolePlacement'] },
    DOB: { level: 2, plant: 'msd', minutes: 15, tags: ['抗扰'], prereq: ['PID'] },
    SMC: { level: 2, plant: 'msd', minutes: 18, tags: ['滑模', '必学'], prereq: ['PD'] },
    SuperTwisting: { level: 2, plant: 'msd', minutes: 18, tags: ['滑模', '消抖'], prereq: ['SMC'] },
    ISMC: { level: 3, plant: 'msd', minutes: 20, tags: ['滑模'], prereq: ['SMC'] },
    ADRC: { level: 3, plant: 'msd', minutes: 22, tags: ['自抗扰', '必学'], prereq: ['PID', 'DOB'] },
    'NL-ADRC': { level: 3, plant: 'msd', minutes: 25, tags: ['自抗扰'], prereq: ['ADRC'] },
    MPC: { level: 3, plant: 'msd', minutes: 25, tags: ['预测'], prereq: ['LQR'] },
    TubeMPC: { level: 3, plant: 'msd', minutes: 25, tags: ['预测', '鲁棒'], prereq: ['MPC'] },
    'H-Infinity': { level: 3, plant: 'msd', minutes: 25, tags: ['鲁棒'], prereq: ['LQR'] },
    MRAC: { level: 3, plant: 'msd', minutes: 25, tags: ['自适应'], prereq: ['PID'] },
    PPC: { level: 3, plant: 'msd', minutes: 20, tags: ['约束'], prereq: ['PID'] },
    BLF: { level: 3, plant: 'msd', minutes: 20, tags: ['约束'], prereq: ['PPC'] },
    FuzzyPID: { level: 2, plant: 'msd', minutes: 18, tags: ['智能'], prereq: ['PID'] },
    NeuralPID: { level: 3, plant: 'msd', minutes: 22, tags: ['智能'], prereq: ['PID'] },
    'Neural-RBF-ADRC': { level: 3, plant: 'msd', minutes: 25, tags: ['智能'], prereq: ['ADRC'] },
    'EKF-Ctrl': { level: 3, plant: 'msd', minutes: 22, tags: ['观测器'], prereq: ['LQG'] },
    'Particle-Filter': { level: 3, plant: 'msd', minutes: 25, tags: ['观测器'], prereq: ['LQG'] },
    IMC: { level: 2, plant: 'msd', minutes: 15, tags: ['内模'] },
    'IMC-PID': { level: 2, plant: 'msd', minutes: 15, tags: ['内模', '整定'] },
    SmithPredict: { level: 2, plant: 'msd', minutes: 18, tags: ['时滞'] },
    ILC: { level: 3, plant: 'msd', minutes: 20, tags: ['迭代'] },
    Repetitive: { level: 3, plant: 'msd', minutes: 20, tags: ['周期'] }
  };

  function categoryOf(key) {
    const conf = D.CONTROLLER_CONFIGS[key];
    return conf ? (conf.category || '') : '';
  }
  function levelOf(key) {
    if (OVERRIDE[key] && OVERRIDE[key].level) return OVERRIDE[key].level;
    const cat = categoryOf(key);
    for (let i = 0; i < CATEGORY_LEVEL.length; i++) {
      if (CATEGORY_LEVEL[i][0].test(cat)) return CATEGORY_LEVEL[i][1];
    }
    return 3;
  }
  function metaOf(key) {
    const base = { level: levelOf(key), levelName: LEVEL_NAME[levelOf(key)], plant: 'msd', minutes: 15, tags: [], prereq: [] };
    return Object.assign(base, OVERRIDE[key] || {}, { level: levelOf(key), levelName: LEVEL_NAME[levelOf(key)] });
  }

  /* ── 8 站学习路线 ────────────────────────────────────
     每站：目标 → 方法 → 推荐对象/预设 → 判读要点 → 自检题 */
  const LEARNING_PATH = [
    {
      id: 's1', title: '反馈是什么', level: 1,
      goal: '理解开环与闭环的差别，亲眼看到“没有反馈就站不住”。',
      methods: ['OpenLoop', 'P'], plant: 'freeMass', preset: 'double-integrator',
      observe: '开环时质量块按二次曲线漂走；P 控制只能等幅振荡。',
      check: '为什么纯 P 在无阻尼二阶积分器上不能收敛？'
    },
    {
      id: 's2', title: '电子阻尼', level: 1,
      goal: '理解 D 项等价于给对象注入虚拟阻尼。',
      methods: ['PD'], plant: 'freeMass', preset: 'pid-baseline',
      observe: '从 P 切到 PD，振荡迅速衰减；继续加大 Kd，响应变慢但不超调。',
      check: 'Kd 过大会带来什么工程代价？'
    },
    {
      id: 's3', title: '静差与积分', level: 1,
      goal: '理解 P 的静差从哪来，I 项如何消除它。',
      methods: ['P', 'PI', 'PID'], plant: 'msd', preset: 'steady-error',
      observe: 'P 停在目标前；PI 把静差磨平，但超调变大。',
      check: '为什么积分会带来相位滞后与超调？'
    },
    {
      id: 's4', title: '抗饱和', level: 1,
      goal: '理解执行器限幅下积分器为什么会“蓄能”。',
      methods: ['AW-PI', 'Clamping-PID', 'PID'], plant: 'msd', preset: 'weak-actuator',
      observe: '普通 PID 在限幅后长时间超调；反算/钳位把积分及时泄放。',
      check: '反算抗饱和与条件钳位的区别是什么？'
    },
    {
      id: 's5', title: '状态空间', level: 2,
      goal: '从“调增益”过渡到“配置极点/最小化二次代价”。',
      methods: ['PolePlacement', 'LQR', 'LQR-I'], plant: 'msd', preset: 'inverted-pendulum',
      observe: '极点配置直接指定响应速度；LQR 有静差，LQR-I 消静差。',
      check: 'LQR 的 Q/R 分别惩罚什么？增大 R 会怎样？'
    },
    {
      id: 's6', title: '观测器', level: 2,
      goal: '理解“状态不可测”时如何用模型+测量重构状态。',
      methods: ['LQG', 'Kalman-Pole', 'DOB'], plant: 'msd', preset: 'noisy-sensor',
      observe: '噪声下纯微分抖振；卡尔曼滤波后控制量平滑。',
      check: '观测器带宽与噪声抑制之间如何权衡？'
    },
    {
      id: 's7', title: '滑模与抖振', level: 2,
      goal: '理解滑模的鲁棒性与抖振代价，以及消抖手段。',
      methods: ['SMC', 'SuperTwisting'], plant: 'msd', preset: 'smc-chatter-raw',
      observe: 'sign 切换纹波大；sat/tanh 降幅值，lpf/hyst 降频率。',
      check: '边界层厚度 Φ 变大，精度与平滑度如何变化？'
    },
    {
      id: 's8', title: '预测与自抗扰', level: 3,
      goal: '比较“向前看”的 MPC 与“估计并补偿扰动”的 ADRC。',
      methods: ['MPC', 'ADRC'], plant: 'msd', preset: 'adrc',
      observe: 'MPC 在约束下平滑；ADRC 对总扰动估计并快速补偿。',
      check: '模型误差很大时，MPC 与 ADRC 各自的风险是什么？'
    }
  ];

  NS.methodMeta = { LEVEL_NAME, levelOf, metaOf, categoryOf };
  NS.learningPath = LEARNING_PATH;
})(window);
