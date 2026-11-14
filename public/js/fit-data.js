/* 自动生成：node tools/build-fit.js — 159 方法 × 3 对象适用性 */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  NS.fitData = {
    plantNames: { msd: '质量-弹簧-阻尼', freeMass: '二阶积分器', pendulum: '倒立摆' },
    verdicts: {
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
  'IncPID': {
    freeMass: 'fair',
    msd: 'good',
    pendulum: 'good'
  },
  'IPD': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'PI-D': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  '2DOF-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Nested-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'AW-PI': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Clamping-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Sep-Int-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'VarRate-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'FilterD-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Deadband-PID': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'fair'
  },
  'RampSP-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Expert-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'NPID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
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
  'Gradient-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'iPID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'P-PI-Cascade': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Bilinear-Tustin-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Gain-Margin-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'IMC-PID': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'OpenLoop': {
    freeMass: 'poor',
    msd: 'poor',
    pendulum: 'unfit'
  },
  'QFT-LeadLag': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Lag-Compensator': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Lead-Lag-Full': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Notch-Filter-PD': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'PR-Resonant': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Double-Int-Servo': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'good'
  },
  'PIDA-Controller': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Bode-Step-Comp': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Two-Stage-Lead': {
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
    msd: 'good',
    pendulum: 'unfit'
  },
  'Deadbeat': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'IMP-Servo': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Preview': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Kalman-Pole': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'Minimum-Energy': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'LQT-Tracking': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'LQR-Servo-FF': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Linear-Time-Optimal-Switch': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'H-Infinity': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'H2-Optimal': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'Mixed-H2-Hinf': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'Mu-Synthesis': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'LoopShaping-McFarlane': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Kharitonov-Robust': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Corless-Leitmann': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'Robust-NL-Damping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Petersen-GuaranteedCost': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Passivity-Shortage-Comp': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'MPC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'TubeMPC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'GPC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'DMC-DynamicMatrix': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'MAC-Impulse': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'PFC-Functional': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'Explicit-MPC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Stochastic-MPC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'MinMax-MPC': {
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
  'PowerRate-SMC': {
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
  'NFTSMC': {
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
  'Twisting-2SMC': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'fair'
  },
  'LevantHOSM': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'fair'
  },
  'VariableG-SMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Boundary-Layer-Varying-SMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'Global-SMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'HOSM-Quasi-Continuous': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'fair'
  },
  'ADRC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'NL-ADRC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'DOB': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'NDOB': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'T-DOB': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'fair'
  },
  'ESO-SMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'UIO-Feedback': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'GPI-Control': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'fair'
  },
  'UDE-Control': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Active-Force-Control': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Equivalent-Input-Disturbance': {
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
    msd: 'good',
    pendulum: 'good'
  },
  'DSC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'NDC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'EnergyShaping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Feedback-Passivation': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Synergetic-Control': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'SDRE': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'Harmonic-Oscillator-PBC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Flatness-Trajectory-Track': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'MRAC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'MRAC-MIT': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'STR': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'L1': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'I-and-I': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'AdaptBackstepping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'ARC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'fair'
  },
  'RLS-Adaptive': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'poor'
  },
  'Nussbaum-Gain': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Composite-MRAC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'Fuzzy': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Neural-RBF-ADRC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'MFAC': {
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
    msd: 'good',
    pendulum: 'fair'
  },
  'BELBIC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'Linear-Actor-Critic': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'CMAC-Cerebellar': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'SPSA-Optimizer': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'VRFT-DataDriven': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'PPC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Funnel-Control': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'BLF': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'poor'
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
  'CBF-QP': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'CFTC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'FxTC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'PTC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'InputShaping': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Posicast': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'SmithPredict': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'Artstein-Reduction': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'TDC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'good'
  },
  'IMC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'unfit'
  },
  'ILC': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  },
  'Repetitive': {
    freeMass: 'poor',
    msd: 'poor',
    pendulum: 'unfit'
  },
  'GainSched': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
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
  'ETC': {
    freeMass: 'good',
    msd: 'fair',
    pendulum: 'unfit'
  },
  'Event-Triggered-MPC': {
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'fair'
  },
  'Quantized-Ctrl': {
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
    pendulum: 'good'
  },
  'Particle-Filter': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
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
    freeMass: 'fair',
    msd: 'fair',
    pendulum: 'fair'
  },
  'Speed-Gradient': {
    freeMass: 'good',
    msd: 'good',
    pendulum: 'good'
  }
},
    notes: {
  'freeMass|P': '纯二阶积分器无阻尼：P 的闭环特征方程 m·s²+K_p=0 只有虚轴极点，只能等幅振荡；PI 违反 Routh 判据必然发散。请切到「质量-弹簧-阻尼」对象体验 P / PI 的静差与整定',
  'freeMass|PI': '纯二阶积分器无阻尼：P 的闭环特征方程 m·s²+K_p=0 只有虚轴极点，只能等幅振荡；PI 违反 Routh 判据必然发散。请切到「质量-弹簧-阻尼」对象体验 P / PI 的静差与整定',
  'msd|PI': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|PI': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'pendulum|IMC-PID': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'freeMass|OpenLoop': '开环无反馈：无回复力或开环不稳定对象上必然漂移/发散，仅作对照基准',
  'msd|OpenLoop': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|OpenLoop': '开环无反馈：无回复力或开环不稳定对象上必然漂移/发散，仅作对照基准',
  'pendulum|LQG': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|LQR-I': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|Minimum-Energy': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|H2-Optimal': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|Mixed-H2-Hinf': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|TubeMPC': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|MAC-Impulse': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|PFC-Functional': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|NL-ADRC': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'freeMass|BangBang': '开关/继电控制在纯积分器上只有极限环，没有稳定平衡点；需改用 PD 或带积分的滑模类方法',
  'freeMass|Relay': '开关/继电控制在纯积分器上只有极限环，没有稳定平衡点；需改用 PD 或带积分的滑模类方法',
  'pendulum|Relay': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'pendulum|STR': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|RLS-Adaptive': '延迟补偿/在线辨识在开环不稳定对象上容易失稳，需专门设计',
  'pendulum|Composite-MRAC': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|BELBIC': '学习/混沌类算法为教学演示级，默认参数下发散，属已知限制',
  'pendulum|BLF': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'pendulum|Posicast': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼',
  'pendulum|SmithPredict': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|IMC': '依赖线性频域模型、小车位置或全状态反馈，当前简化摆角子系统不适配',
  'freeMass|Repetitive': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'msd|Repetitive': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|Repetitive': '默认参数下未完全收敛：建议降低增益、增加阻尼项，或切换推荐对象',
  'pendulum|ETC': '缺少有效微分/状态反馈，无法为开环不稳定的摆角提供阻尼'
},
    summary: {"poor":11,"fair":45,"unfit":21,"good":400},
    generatedAt: "2026-11-14"
  };
})(window);
