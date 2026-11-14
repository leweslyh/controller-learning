/* 自动生成：node tools/build-fit.js — 99 方法 × 3 对象适用性 */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  NS.fitData = {
    plantNames: { msd: '质量-弹簧-阻尼', freeMass: '二阶积分器', pendulum: '倒立摆' },
    verdicts: {
  'OpenLoop': {
    freeMass: 'poor',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'P': {
    freeMass: 'poor',
    msd: 'fair',
    pendulum: 'fair'
  },
  'PI': {
    freeMass: 'poor',
    msd: 'poor',
    pendulum: 'unfit'
  },
  'PD': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'IPD': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  '2DOF-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'IncPID': {
    freeMass: 'good',
    msd: 'poor',
    pendulum: 'unfit'
  },
  'PI-D': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Nested-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'PolePlacement': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'LQR': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'LQG': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'LQR-I': {
    freeMass: 'good',
    msd: 'poor',
    pendulum: 'unfit'
  },
  'MPC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Deadbeat': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'H-Infinity': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'QFT-LeadLag': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'IMP-Servo': {
    freeMass: 'good',
    msd: 'poor',
    pendulum: 'unfit'
  },
  'Preview': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'BangBang': {
    freeMass: 'poor',
    msd: 'fair',
    pendulum: 'fair'
  },
  'BangBang-Zone': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Relay': {
    freeMass: 'poor',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'TimeOptimal': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'FeedbackLin': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Backstepping': {
    freeMass: 'good',
    msd: 'poor',
    pendulum: 'fair'
  },
  'DSC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'TDC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'NDC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'CFTC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'SMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'VSC-RL': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'ISMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'TSMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'FTSMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'ASMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'SuperTwisting': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'LevantHOSM': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'fair'
  },
  'VariableG-SMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'AW-PI': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'NPID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'MRAC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'STR': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'MFAC': {
    freeMass: 'fair',
    msd: 'poor',
    pendulum: 'fair'
  },
  'iPID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'U-Model': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'ESC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'BELBIC': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'Linear-Actor-Critic': {
    freeMass: 'unfit',
    msd: 'unfit',
    pendulum: 'unfit'
  },
  'Gradient-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'DOB': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'IMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'ADRC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'NL-ADRC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'fair'
  },
  'ARC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'ESO-SMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'L1': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'I-and-I': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'AdaptBackstepping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'T-DOB': {
    freeMass: 'poor',
    msd: 'poor',
    pendulum: 'unfit'
  },
  'PPC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'BLF': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'ETC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'Switched': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'DynPole': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'PTC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'FxTC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Tan-BLF': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'TimeVary-BLF': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Integral-BLF': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'InputShaping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'ILC': {
    freeMass: 'poor',
    msd: 'fair',
    pendulum: 'fair'
  },
  'Repetitive': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'GainSched': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'SmithPredict': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Posicast': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'FuzzyPID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'NeuralPID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Fuzzy': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'EnergyShaping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'TubeMPC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'SDRE': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'GPC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'RLS-Adaptive': {
    freeMass: 'poor',
    msd: 'poor',
    pendulum: 'poor'
  },
  'Robust-NL-Damping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'NDOB': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Extended-Luenberger': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'EKF-Ctrl': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'Particle-Filter': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Neural-RBF-ADRC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Artstein-Reduction': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'Quantized-Ctrl': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Event-Triggered-MPC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'fair'
  },
  'FO-PD': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Nonlinear-Power-ADRC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Implicit-Euler-Ctrl': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Lorenz-Coupled': {
    freeMass: 'poor',
    msd: 'unfit',
    pendulum: 'unfit'
  },
  'Speed-Gradient': {
    freeMass: 'unfit',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'Feedback-Passivation': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  }
},
    notes: {
  'freeMass|OpenLoop': '开环无反馈：无回复力或开环不稳定对象上必然漂移/发散，仅作对照基准',
  'pendulum|OpenLoop': '开环无反馈：无回复力或开环不稳定对象上必然漂移/发散，仅作对照基准',
  'freeMass|P': '纯二阶积分器无阻尼：P 的闭环特征方程 m·s²+K_p=0 只有虚轴极点，只能等幅振荡；PI 违反 Routh 判据必然发散。请切到「质量-弹簧-阻尼」对象体验 P / PI 的静差与整定',
  'freeMass|PI': '纯二阶积分器无阻尼：P 的闭环特征方程 m·s²+K_p=0 只有虚轴极点，只能等幅振荡；PI 违反 Routh 判据必然发散。请切到「质量-弹簧-阻尼」对象体验 P / PI 的静差与整定',
  'msd|PI': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|PI': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'msd|IncPID': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|IncPID': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'pendulum|LQG': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'msd|LQR-I': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|LQR-I': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|QFT-LeadLag': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'msd|IMP-Servo': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|IMP-Servo': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'freeMass|BangBang': '开关/继电控制在纯积分器上只有极限环，没有稳定平衡点；需改用 PD 或带积分的滑模类方法',
  'freeMass|Relay': '开关/继电控制在纯积分器上只有极限环，没有稳定平衡点；需改用 PD 或带积分的滑模类方法',
  'pendulum|Relay': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'msd|Backstepping': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|TDC': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|STR': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'msd|MFAC': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|BELBIC': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'freeMass|Linear-Actor-Critic': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'msd|Linear-Actor-Critic': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'pendulum|Linear-Actor-Critic': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'pendulum|IMC': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'freeMass|T-DOB': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'msd|T-DOB': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|T-DOB': '延迟补偿/在线辨识在开环不稳定对象上容易失稳，需专门设计',
  'pendulum|BLF': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|ETC': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'freeMass|ILC': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|Posicast': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'pendulum|TubeMPC': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'freeMass|RLS-Adaptive': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'msd|RLS-Adaptive': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|RLS-Adaptive': '延迟补偿/在线辨识在开环不稳定对象上容易失稳，需专门设计',
  'pendulum|EKF-Ctrl': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|Artstein-Reduction': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'freeMass|Lorenz-Coupled': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'msd|Lorenz-Coupled': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'pendulum|Lorenz-Coupled': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'freeMass|Speed-Gradient': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'pendulum|Speed-Gradient': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制'
},
    summary: {"poor":18,"fair":37,"unfit":26,"good":216},
    generatedAt: "2026-11-13"
  };
})(window);
