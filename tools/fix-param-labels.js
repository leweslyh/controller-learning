#!/usr/bin/env node
/* ============================================================
   tools/fix-param-labels.js — 修正增益卡片的英文符号与下标（V5.3）
   问题：PARAM_LABELS 里大量符号写成 "Kp"、"Qx"、"Kp,out"、"L1"，
         既不符合数学排版，也让人分不清下标。
   处理：把数学符号统一改成 TeX（$K_p$、$Q_x$、$K_{p,out}$、$\ell_1$），
         界面经 NS.math.mdInline 渲染后显示为真正的下标。
   幂等：按 key 覆盖，重复运行结果一致。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'public', 'js', 'data.js');

const MAP = {
  kp: '比例增益 $K_p$', ki: '积分增益 $K_i$', kd: '微分增益 $K_d$',
  b: '设定值权重 $b$', u_static: '前馈缩放系数 $k_u$',
  p1: '期望极点 $p_1$', p2: '期望极点 $p_2$',
  q_x: '位置误差惩罚 $Q_x$', q_v: '速度惩罚 $Q_v$', r_weight: '控制能量惩罚 $R$',
  r_w: '滤波权重 $R_w$', q_i: '积分惩罚 $Q_i$', t_pred: '预测视野 $t_{pred}$',
  zero: '补偿器零点 $z$', pole: '补偿器极点 $p$', q_e: '误差积分惩罚 $Q_e$',
  r_u: '输入惩罚 $R_u$', force: '最大推力 $F_{max}$', zone: '切换边界 $\\delta_z$',
  deadzone: '滞回死区 $d$', c1: '第一层增益 $c_1$', c2: '第二层增益 $c_2$',
  c_surface: '滑模面系数 $c_s$', c_surf: '滑模面系数 $c_s$', k_gain: '鲁棒切换增益 $K$',
  q: '终端幂次 $q$', k0: '保底切换增益 $k_0$', k1: '远端膨胀增益 $k_1$',
  k2: '非线性幂增益 $k_2$', k_aw: '抗饱和反算系数 $K_{aw}$',
  gamma_p: 'P 通道学习率 $\\gamma_p$', gamma_d: 'D 通道学习率 $\\gamma_d$',
  kp0: '初始比例增益 $K_{p0}$', ki0: '初始积分增益 $K_{i0}$', kd0: '初始微分增益 $K_{d0}$',
  w_o: '观测器带宽 $\\omega_o$', w_c: '控制器带宽 $\\omega_c$', b0: '系统增益估计 $b_0$',
  wo: '观测器带宽 $\\omega_o$', wc: '控制器带宽 $\\omega_c$', wn: '参考模型频率 $\\omega_n$',
  l: '漏斗收缩速率 $L$', kb: '安全边界 $k_b$', kb0: '初始安全边界 $k_{b0}$',
  Tp: '预设收敛时间 $T_p$', p_q: '大误差幂次 $p/q$', r_s: '小误差幂次 $r/s$',
  q_filter: '重复滤波器 $Q$', kp_far: '远端比例增益 $K_{p,far}$',
  kp_near: '近端比例增益 $K_{p,near}$', k_pos: 'Posicast 对冲比 $K_{pos}$',
  r_d0: '基底阻尼 $R_{d0}$', r_d1: '非线性阻尼 $R_{d1}$', t_pred_mpc: 'MPC 预测视野 $T_{pred}$',
  ny: '预测视野 $N_y$', nu: '控制视野 $N_u$', lam: 'GPC 控制权重 $\\lambda$',
  rls_lambda: '遗忘因子 $\\lambda_{RLS}$', l_obs: '观测器增益 $L$', l_gain: '观测器增益 $L$',
  q_cov: '过程噪声协方差 $Q$', r_cov: '测量噪声协方差 $R$',
  l1: '精确微分器增益 $\\ell_1$', l2: '精确微分器增益 $\\ell_2$',
  w_bias: '偏置学习率 $w_{bias}$', alpha_rbf: 'RBF 学习率 $\\alpha_{RBF}$',
  kp_out: '外环比例增益 $K_{p,out}$', kp_in: '内环比例增益 $K_{p,in}$',
  ki_in: '内环积分增益 $K_{i,in}$', eps_sep: '积分分离阈值 $\\varepsilon_{sep}$',
  n_filt: '微分滤波系数 $N_f$', max_rate: '目标最大速率 $v_{max}$',
  k_pp: '位置环比例 $K_{pp}$', k_vp: '速度环比例 $K_{vp}$', k_vi: '速度环积分 $K_{vi}$',
  tf_d: '微分滤波时间常数 $T_f$', ku_est: '临界增益估计 $K_u$', tu_est: '临界周期估计 $T_u$',
  lambda_c: '闭环时间常数 $\\lambda_c$', kc: '滞后补偿增益 $K_c$',
  z_lead: '超前零点 $z$', p_lead: '超前极点 $p$', z_lag: '滞后零点 $z$',
  w_notch: '陷波中心频率 $\\omega_{notch}$', zeta_n: '陷波深度 $\\zeta_n$', kr: '谐振增益 $K_r$',
  ki1: '一阶积分增益 $K_{i1}$', ki2: '二阶积分增益 $K_{i2}$',
  ka: '加速度反馈 $K_a$', kh: '高频阻尼 $K_h$',
  z_dl: '双级超前零点 $z$', p_dl: '双级超前极点 $p$', p_pole: '期望极点 $p$',
  q_kf: '卡尔曼过程噪声 $Q$', tf_hor: '能量规划时域 $T_f$',
  q_lqt: '轨迹位置权重 $Q$', r_lqt: '轨迹控制权重 $R$', kv_ff: '速度前馈 $K_{v,ff}$',
  u_max_p: '饱和限幅 $u_{max}$', alpha_ptos: '折扣因子 $\\alpha$', k2_ptos: '速度增益 $K_2$',
  q_h2: 'H2 位置权重 $Q$', r_h2: 'H2 控制权重 $R$', ki_h2: 'H2 积分增益 $K_i$',
  q_perf: '性能权重 $Q$', k_mu: 'μ 综合增益 $K_\\mu$', d_scale: '扰动尺度 $d$',
  w_ro: '鲁棒观测带宽 $\\omega_o$', w1_gain: '增益通道权重 $W_1$',
  w1_int: '积分通道权重 $W_1$', w2_damp: '阻尼通道权重 $W_2$',
  m_max_bound: '质量上界 $m_{max}$', wn_rob: '鲁棒自然频率 $\\omega_n$',
  eps_c: '收敛阈值 $\\varepsilon_c$', q_gc: '广义控制权重 $Q$',
  kp_pass: '无源比例增益 $K_p$', ki_pass: '无源积分增益 $K_i$',
  r_dmc: 'DMC 控制权重 $r$', kd_dmc: 'DMC 微分增益 $K_d$', h_horizon: 'DMC 时域 $H$',
  lambda_mac: 'MAC 权重 $\\lambda$', kd_mac: 'MAC 微分增益 $K_d$',
  tr_pfc: 'PFC 上升时间 $T_r$', h_coin: 'PFC 预测步长 $h$', kd_pfc: 'PFC 微分增益 $K_d$',
  k_inner: '内环增益 $K_{in}$', k_outer: '外环增益 $K_{out}$',
  risk_p: '风险概率 $p$', sigma_w: '扰动标准差 $\\sigma_w$', w_bound: '扰动上界 $w_{max}$',
  kp_n: '神经比例增益 $K_{p,n}$', kd_n: '神经微分增益 $K_{d,n}$',
  kp_cmac: 'CMAC 比例增益 $K_{p,cmac}$', kd_cmac: 'CMAC 微分增益 $K_{d,cmac}$',
  kp_init: '初始比例增益 $K_{p0}$', kd_base: '基础微分增益 $K_{d0}$',
  /* 纯希腊字母标签同样 TeX 化：保证增益卡与对象手册的符号一致、下标正确 */
  lambda: '控制代价 $\\lambda$', gamma: '干扰上界 / 学习率 $\\gamma$',
  eps: '边界层厚度 $\\varepsilon$', eps0: '事件触发基线 $\\varepsilon_0$',
  beta: '终端面系数 $\\beta$', alpha: '分数次幂 $\\alpha$',
  tau: '滤波时间常数 $\\tau$', delta: '线性区宽度 $\\delta$',
  rho: '自适应步长 $\\rho$', eta: '学习率 $\\eta$', mu: '正则因子 $\\mu$',
  zeta: '参考阻尼比 $\\zeta$', rho_0: '漏斗初始高度 $\\rho_0$',
  rho_inf: '漏斗终值 $\\rho_\\infty$', sigma: '相对触发容差 $\\sigma$',
  omega: '探测信号频率 $\\omega$', et_limit: '事件触发门槛 $\\delta$',
  alpha_vr: '变速积分指数 $\\alpha$', db_width: '死区宽度 $\\delta$',
  w0: '谐振频率 $\\omega_0$', tau1: '中频时间常数 $\\tau_1$',
  alpha_mix: '混合因子 $\\alpha$', zeta_rob: '鲁棒阻尼比 $\\zeta$',
  rho_bound: '鲁棒边界 $\\rho$', eps_gc: '广义控制阈值 $\\varepsilon$',
  delta_b: '边界厚度 $\\delta$', rho_pass: '无源性裕度 $\\rho$',
  alpha_ref: '参考滤波 $\\alpha$', phi: '边界层厚度 $\\Phi$',
  alpha_pr: '幂次指数 $\\alpha$', beta1: '滑模系数 $\\beta_1$', beta2: '滑模系数 $\\beta_2$',
  gamma2: '二阶滑模增益 $\\gamma_2$', lam_sl: '滑模面系数 $\\lambda$',
  phi_min: '最小边界层 $\\Phi_{min}$', lam_gsmc: '全局滑模系数 $\\lambda$',
  alpha_qc: '准连续指数 $\\alpha$', beta_qc: '准连续指数 $\\beta$',
  w_gpi: 'GPI 观测带宽 $\\omega$', w_eid: 'EID 观测带宽 $\\omega$',
  alpha_th: '阈值系数 $\\alpha$', gamma_mit: 'MIT 自适应增益 $\\gamma$',
  gamma_n: '神经自适应增益 $\\gamma$', eta_cmac: 'CMAC 学习率 $\\eta$',
  m_bw: '模型带宽 $\\omega$', phi0: '初始边界层 $\\Phi_0$',
  phi_inf: '稳态边界层 $\\Phi_\\infty$', lam_f: '滤波系数 $\\lambda_f$',
  alpha_cbf: 'CBF 系数 $\\alpha$'
};

const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const start = src.indexOf('const PARAM_LABELS = {');
const end = src.indexOf('\n  };', start);
if (start < 0 || end < 0) { console.error('未找到 PARAM_LABELS 块'); process.exit(1); }
const head = src.slice(0, start);
let block = src.slice(start, end);
const tail = src.slice(end);
let hit = 0;
Object.keys(MAP).forEach((key) => {
  /* 标签块里多个键写在同一行，因此不能只匹配行首，要用 [,{\s] 作前界；
     替换值里的反斜杠必须转义成 \\，否则写回 data.js 后 \omega 会被吞成 omega */
  const re = new RegExp('(^|[,\\s{])(' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*)(\'[^\']*\'|"[^"]*")', 'm');
  if (re.test(block)) {
    const val = MAP[key].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    block = block.replace(re, (m, pre, p1) => { hit++; return pre + p1 + "'" + val + "'"; });
  }
});
fs.writeFileSync(file, head + block + tail, 'utf8');
console.log('已修正 ' + hit + ' / ' + Object.keys(MAP).length + ' 个参数标签');
