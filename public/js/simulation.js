/* ============================================================
   simulation.js — 仿真内核（不触碰 DOM）
   386:401 / 413:946 / 948:1027 自 V2.1 逐字迁移：
   resetAlgState 的内部状态、159 条控制律分支、物理积分
   与冻结逻辑均保持原样，仅把 React hooks 状态改为轻量 ref 对象。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const D = NS.data;
  const {
    DT, INITIAL_PARAMS, CONTROLLER_CONFIGS, getDefaultParams,
    fal, gaussNoise, calcGLWeights, getMembership,
    DEFAULT_ENV, DEFAULT_PHYS
  } = D;

  const MAX_POINTS = 2500;
  const MAX_TRACKS = 6;
  const TRACK_COLORS = ['#2563EB', '#EA580C', '#7C3AED', '#059669', '#DC2626', '#0891B2'];

  /* ── 与 V2.1 的 useRef 等价的容器（保留 *.current 访问形态） ── */
  const stateRef = { current: { x: 0, v: 0, t: 0, alg: {} } };
  /* 全局饱和钳位：与新版一致，带 NaN/Infinity 保护（新增 35 条控制律依赖） */
  function clamp(val, min, max) { return Math.max(min, Math.min(max, Number.isFinite(val) ? val : 0)); }
  const historyRef = { current: [] };
  const chartStateRef = { current: { frozen: false, freezeTimer: 0 } };
  const impulseRef = { current: 0 };

  /* ── 唯一可写状态；loopStateRef.current 恒指向它 ── */
  const settings = {
    running: false,
    method: 'PID',
    physParams: { ...INITIAL_PARAMS },
    ctrlParams: getDefaultParams('PID'),
    ...D.DEFAULT_ENV,
    speed: 1,
    plantId: 'freeMass',
    plantParams: D.plantDefaults()
  };
  const loopStateRef = { current: settings };

  /* ── 多轨迹支持（调参不再清空历史，可叠加 A/B 对比） ── */
  let tracks = [];
  let activeTrack = null;
  let trackSeq = 0;
  let compareMode = false;
  let accumulator = 0;
  let dirty = true;
  let lastU = 0;

  function markDirty() { dirty = true; }
  function consumeDirty() { const d = dirty; dirty = false; return d; }

            /* 构造一份全新的算法内部状态（纯函数）：resetSim 用它重置真实通道，
               最优增益求解器用它为每个候选参数生成互不污染的影子通道。 */
            const makeAlgState = (currTarget = 5.0) => ({
                    integral: 0, e_prev: 0, e_prev2: 0, u_prev: 0, u_prev2: 0, x_prev: 0, v_prev: 0,
                    d_hat: 0, st_int: 0, z1: 0, z2: 0, z3: 0, xm: 0, vm: 0, theta_r: 0, theta_x: 0, theta_v: 0, 
                    u_l1_filter: 0, w1: 0.33, w2: 0.33, w3: 0.33, m_hat: 1.0, k_hat: 1.0, c_hat: 0.5, 
                    vm_imc: 0, xm_imc: 0, phi: 0.5, K_hat: 0, F_hat_f: 0, e_hist: new Array(50).fill(0), z_dsc: 0, u_esc_bias: 0,
                    P_k: [[1,0],[0,1]], x_kf: 0, v_kf: 0, u_qft_prev: 0, theta_hat_ii: 0, last_target: currTarget, t_target: 0, xd: 0, vd: 0,
                    last_e_etc: 0, last_u_etc: 0, z0_lev: 0, z1_lev: 0, rmse_sum: 0, energy: 0, ticks: 0,
                    V_belbic: 0, W_belbic: 0, wc_adp: 1.0, wa_adp: 40.0, wd_adp: 10.0, ilc_memory: new Array(1000).fill(0), ilc_idx: 0,
                    rep_queue: new Array(50).fill(0), rep_idx: 0, switch_state: 0, last_switch_time: -999, target_history: [],
                    x_delay_buf: new Array(200).fill(0), u_delay_buf: new Array(200).fill(0), u_hw_buffer: new Array(100).fill(0),
                    H_hormone: 0, P_sdre: 10.0, chi_nuss: 0, amd_x: 0, amd_v: 0, fault_time: 0, l_x: 0, l_v: 0, mj_mode: 1, st_next: 0, f_int: 0, u_hold: 0,
                    w_rbf: new Array(5).fill(0.1), w_actor: [0, 0, 0], w_critic: [0, 0, 0], P_rls: [[100, 0], [0, 100]], theta_rls: [1.0, 0.5],
                    l_x_l: 0.1, l_y_l: 0.1, l_z_l: 0.1, pf_particles: new Array(20).fill(0), f_adrc_z: 0,
                    a_filt: 0,
                    d_filt: 0,
                    e0_init: 0,
                    v0_init: 0,
                    y0_flat: 0,
                    r_soft: 0,
                    integral2: 0,
                    e_prev2_r: 0,
                    z4: 0,
                    pr_x1: 0,
                    pr_x2: 0,
                    notch_x1: 0,
                    notch_x2: 0,
                    cmac_w: new Array(40).fill(0),
                    phi_slotine: 0.5,
                    spsa_kp: 38,
                    spsa_j_prev: 0,
                    u_lag_prev: 0,
                    v_inc_prev: 0
            });

            const resetAlgState = (methodName, currTarget = 5.0) => {
                stateRef.current.alg = makeAlgState(currTarget);
            };

            /* 滑模切换函数的统一消抖实现：
               sat  边界层饱和（默认，误差带内线性）
               tanh 双曲正切（连续可导，平滑度最好）
               st   超螺旋（连续项 + 积分项，二阶滑模思想）
               lpf  对 sign 做一阶低通
               sign 原始硬切换（仅对照，抖振最大） */
            const chatter = (s, cP, alg, dt) => {
                const mode = cP.chatterMode || 'sat';
                const phi = Math.max(1e-4, cP.phi || cP.eps || 0.1);
                /* 开关动作计数：用于量化抖振频率 */
                const countSwitch = () => { alg.chatter_sw = (alg.chatter_sw || 0) + 1; };
                const trackSurface = () => {
                    const sgnS = Math.sign(s);
                    if (sgnS !== 0) {
                        if (alg.chatter_s_prev !== undefined && sgnS !== alg.chatter_s_prev) countSwitch();
                        alg.chatter_s_prev = sgnS;
                    }
                };
                if (mode === 'hyst') {
                    /* 继电器带相对滞环：带宽随切换面尺度自适应（(1+Φ)×EMA|s|），只在明显越界时翻转开关，
                       用「降低开关频率」代替「降低切换幅值」来压抖振 */
                    const aH = Math.min(1, dt / 0.4);
                    const absS = Math.abs(s);
                    alg.chatter_scale = (alg.chatter_scale === undefined) ? absS
                        : alg.chatter_scale + aH * (absS - alg.chatter_scale);
                    const band = (1 + phi) * Math.max(1e-3, alg.chatter_scale);
                    let sw = alg.chatter_hyst;
                    if (!sw) sw = s >= 0 ? 1 : -1;
                    if (s > band) sw = 1; else if (s < -band) sw = -1;
                    if (sw !== alg.chatter_hyst_prev) { countSwitch(); alg.chatter_hyst_prev = sw; }
                    alg.chatter_hyst = sw;
                    return sw;
                }
                trackSurface();
                if (mode === 'sign') return Math.sign(s);
                if (mode === 'tanh') return Math.tanh(s / phi);
                if (mode === 'lpf') {
                    const target = Math.sign(s);
                    const a = Math.min(1, dt / Math.max(0.01, phi));
                    alg.chatter_lpf = (alg.chatter_lpf || 0) + (target - (alg.chatter_lpf || 0)) * a;
                    return Math.max(-1, Math.min(1, alg.chatter_lpf));
                }
                if (mode === 'st') {
                    /* 超螺旋切换律近似：连续的 √|s| 增益 + 慢积分项，把高频符号切换摊成连续力 */
                    const sgn = Math.sign(s);
                    const w = Math.sqrt(Math.abs(s) / phi);
                    alg.chatter_int = Math.max(-1.5, Math.min(1.5,
                        (alg.chatter_int || 0) + 0.2 * sgn * dt));
                    return sgn * Math.min(1.5, w) + 0.5 * alg.chatter_int;
                }
                return Math.max(-1, Math.min(1, s / phi));
            };

            const calculateControlOutput = (dt, x, v, target, pP, cP, alg, currentMethod, currTime) => {
                const e = target - x;
                let u = 0;
                let target_changed = false;
                if (Math.abs(target - alg.last_target) > 0.01) {
                    alg.last_target = target; alg.t_target = 0; alg.xd = x; alg.vd = v; alg.ilc_idx = 0;
                    /* 新版控制律：每次目标变化重置轨迹规划初值与规定性能初值 */
                    alg.y0_flat = x; alg.e0_init = e; alg.v0_init = v; alg.r_soft = x;
                    if(alg.e0 === undefined) { alg.e0 = e; alg.v0 = v; } 
                    target_changed = true;
                }
                alg.t_target += dt;
                alg.ref_display = undefined;

                /* 新增方法共用的实测加速度一阶低通（新版 calculateControlOutput 前置逻辑） */
                const a_raw = (v - (alg.v_prev || 0)) / dt;
                alg.a_filt = (alg.a_filt || 0) + ((a_raw - (alg.a_filt || 0)) / 0.06) * dt;

                if (currentMethod === 'InputShaping' || currentMethod === 'Posicast') {
                    if (target_changed || alg.target_history.length === 0) alg.target_history.push({ t: currTime, val: target });
                }
                
                alg.x_delay_buf.unshift(x); alg.x_delay_buf.pop();
                alg.u_delay_buf.unshift(alg.u_prev||0); alg.u_delay_buf.pop();
                alg.e_hist.unshift(e); alg.e_hist.pop();

                switch (currentMethod) {
                    // === 【1. 各类PID与工业变体】 ===
                    case 'P': u = cP.kp * e; break;
                    case 'PI': alg.integral = clamp(alg.integral + e * dt, -80, 80);
                    u = cP.kp * e + cP.ki * alg.integral; break;
                    case 'PD': u = cP.kp * e - cP.kd * v + pP.k * target; break;
                    case 'PID': alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = cP.kp * e + cP.ki * alg.integral - cP.kd * v; break;
                    case 'IncPID': {
                    const dv = v - (alg.v_inc_prev ?? v);
                    const delta_u = cP.kp * (e - (alg.e_prev ?? e)) + cP.ki * 12.0 * e * dt - cP.kd * 2.5 * dv;
                    u = (alg.u_prev || 0) + delta_u;
                    alg.e_prev2 = alg.e_prev; alg.e_prev = e; alg.v_inc_prev = v; break;
                }
                    case 'IPD': alg.integral = clamp(alg.integral + e * dt, -60, 60);
                    u = cP.ki * alg.integral - cP.kp * x - cP.kd * v; break;
                    case 'PI-D': alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = cP.kp * e + cP.ki * alg.integral - cP.kd * v; break;
                    case '2DOF-PID': alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = cP.kp * (cP.b * target - x) + cP.ki * alg.integral - cP.kd * v; break;
                    case 'Nested-PID': {
                    const v_d = cP.kp_out * e;
                    alg.integral = clamp(alg.integral + (v_d - v) * dt, -50, 50);
                    u = cP.kp_in * (v_d - v) + cP.ki_in * alg.integral + pP.k * target; break;
                }
                    case 'AW-PI': {
                    const lim = loopStateRef.current.actuatorLimit || 200;
                    const u_pi_raw = cP.kp * e + cP.ki * alg.integral - (cP.kd ?? 18) * v + pP.k * target;
                    const u_sat = clamp(u_pi_raw, -lim, lim);
                    alg.integral = clamp(alg.integral + (e - cP.k_aw * (u_pi_raw - u_sat)) * dt, -80, 80);
                    u = u_sat; break;
                }
                    case 'Clamping-PID': {
                    const lim = loopStateRef.current.actuatorLimit || 200;
                    const u_pre = cP.kp * e + cP.ki * alg.integral - cP.kd * v;
                    if (!(Math.abs(u_pre) >= lim && u_pre * e > 0)) {
                        alg.integral = clamp(alg.integral + e * dt, -60, 60);
                    }
                    u = cP.kp * e + cP.ki * alg.integral - cP.kd * v; break;
                }
                    case 'Sep-Int-PID': {
                    const beta_sep = Math.abs(e) <= cP.eps_sep ? 1.0 : 0.0;
                    alg.integral = clamp(alg.integral + beta_sep * e * dt, -50, 50);
                    u = cP.kp * e + beta_sep * cP.ki * alg.integral - cP.kd * v; break;
                }
                    case 'VarRate-PID': {
                    const f_vr = Math.exp(-cP.alpha_vr * Math.abs(e));
                    alg.integral = clamp(alg.integral + f_vr * e * dt, -50, 50);
                    u = cP.kp * e + cP.ki * alg.integral - cP.kd * v; break;
                }
                    case 'FilterD-PID': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    const tau_f = 1.0 / Math.max(1.0, cP.n_filt);
                    alg.d_filt += ((-cP.kd * v - alg.d_filt) / tau_f) * dt;
                    u = cP.kp * e + cP.ki * alg.integral + alg.d_filt; break;
                }
                    case 'Deadband-PID': {
                    const e_db = Math.abs(e) <= cP.db_width ? 0 : (e - Math.sign(e) * cP.db_width);
                    alg.integral = clamp(alg.integral + e_db * dt, -50, 50);
                    u = cP.kp * e_db + cP.ki * alg.integral - (Math.abs(e) <= cP.db_width ? 0.3 : 1.0) * cP.kd * v; break;
                }
                    case 'RampSP-PID': {
                    const diff_r = target - alg.r_soft;
                    const max_step = cP.max_rate * dt;
                    alg.r_soft += clamp(diff_r, -max_step, max_step);
                    const e_soft = alg.r_soft - x;
                    alg.integral = clamp(alg.integral + e_soft * dt, -50, 50);
                    u = cP.kp * e_soft + cP.ki * alg.integral - cP.kd * v;
                    alg.ref_display = alg.r_soft; break;
                }
                    case 'Expert-PID': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    const edot = -v;
                    let k_fac = 1.0;
                    if (Math.abs(e) > 2.5) k_fac = cP.boost;
                    else if (e * edot > 0) k_fac = cP.boost;
                    else if (e * edot < 0 && Math.abs(e) < 0.8) k_fac = 0.75;
                    u = k_fac * (cP.kp * e - cP.kd * v) + cP.ki * alg.integral; break;
                }
                    case 'NPID': {
                    alg.integral = clamp(alg.integral + fal(e, cP.alpha, cP.delta) * dt, -50, 50);
                    u = cP.kp * fal(e, cP.alpha, cP.delta) + cP.ki * alg.integral + cP.kd * fal(-v, cP.alpha, cP.delta); break;
                }
                    case 'FuzzyPID': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    const e_norm = clamp(e / 5, -1, 1); const ec_norm = clamp(-v / 5, -1, 1);
                    const mem_e = getMembership(e_norm); const mem_ec = getMembership(ec_norm);
                    let rule_P = 0, sum_W = 0;
                    const w_NN = Math.min(mem_e.N, mem_ec.N); rule_P += w_NN * 1; sum_W += w_NN;
                    const w_NZ = Math.min(mem_e.N, mem_ec.Z); rule_P += w_NZ * 1; sum_W += w_NZ;
                    const w_NP = Math.min(mem_e.N, mem_ec.P); rule_P += w_NP * 0; sum_W += w_NP;
                    const w_ZN = Math.min(mem_e.Z, mem_ec.N); rule_P += w_ZN * 1; sum_W += w_ZN;
                    const w_ZZ = Math.min(mem_e.Z, mem_ec.Z); rule_P += w_ZZ * 0; sum_W += w_ZZ;
                    const w_ZP = Math.min(mem_e.Z, mem_ec.P); rule_P += w_ZP * -1; sum_W += w_ZP;
                    const w_PN = Math.min(mem_e.P, mem_ec.N); rule_P += w_PN * 0; sum_W += w_PN;
                    const w_PZ = Math.min(mem_e.P, mem_ec.Z); rule_P += w_PZ * -1; sum_W += w_PZ;
                    const w_PP = Math.min(mem_e.P, mem_ec.P); rule_P += w_PP * -1; sum_W += w_PP;
                    const defuzz_P = sum_W > 0 ? (rule_P / sum_W) : 0;
                    const dk_p = cP.range * Math.abs(defuzz_P);
                    u = (cP.kp0 + dk_p) * e + cP.ki0 * alg.integral - cP.kd0 * v; break;
                }
                    case 'NeuralPID': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    alg.w1 = Math.max(0.05, alg.w1 + cP.eta * e * e * dt);
                    alg.w2 = Math.max(0.01, alg.w2 + cP.eta * e * alg.integral * dt);
                    alg.w3 = Math.max(0.05, alg.w3 + cP.eta * Math.abs(e * v) * dt);
                    const sumW = alg.w1 + alg.w2 + alg.w3;
                    u = cP.K * ((alg.w1 / sumW) * e + (alg.w2 / sumW) * alg.integral + (alg.w3 / sumW) * (-v)); break;
                }
                    case 'Gradient-PID': {
                    const grad_kp = -e * e; const grad_kd = e * v;
                    alg.init_kp = clamp((alg.init_kp || cP.kp0) - cP.gamma_p * grad_kp * dt, 5, 120);
                    alg.init_kd = clamp((alg.init_kd || 15) - cP.gamma_d * grad_kd * dt, 2, 60);
                    u = alg.init_kp * e - alg.init_kd * v + pP.k * target; break;
                }
                    case 'iPID': {
                    const F_raw = (v - (alg.v_prev || 0)) / dt - cP.alpha * alg.u_prev;
                    alg.F_hat_f += ((F_raw - alg.F_hat_f) / cP.tau) * dt;
                    u = (-alg.F_hat_f + cP.kp * e - cP.kd * v) / cP.alpha; break;
                }
                    case 'P-PI-Cascade': {
                    const v_ref = cP.k_pp * e;
                    const ev = v_ref - v;
                    alg.integral = clamp(alg.integral + ev * dt, -60, 60);
                    u = cP.k_vp * ev + cP.k_vi * alg.integral; break;
                }
                    case 'Bilinear-Tustin-PID': {
                    alg.integral = clamp(alg.integral + 0.5 * dt * (e + (alg.e_prev || 0)), -50, 50);
                    const ad = (2 * cP.tf_d - dt) / (2 * cP.tf_d + dt);
                    const bd = (2 * cP.kd) / (2 * cP.tf_d + dt);
                    alg.d_filt = ad * (alg.d_filt || 0) - bd * (x - (alg.x_prev || x));
                    u = cP.kp * e + cP.ki * alg.integral + alg.d_filt;
                    alg.x_prev = x; alg.e_prev = e; break;
                }
                    case 'Gain-Margin-PID': {
                    const kp_zn = 0.33 * cP.ku_est;
                    const ki_zn = kp_zn / (0.5 * cP.tu_est);
                    const kd_zn = kp_zn * (0.33 * cP.tu_est);
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = kp_zn * e + ki_zn * alg.integral - kd_zn * v; break;
                }
                    case 'IMC-PID': {
                    const lam = Math.max(0.05, cP.lambda_c);
                    const kp_imc = (pP.c + 2 * pP.m / lam) / lam;
                    const kd_imc = pP.m / lam;
                    const ki_imc = (pP.k / lam) * cP.ki_trim + 6.0;
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = kp_imc * e + ki_imc * alg.integral - kd_imc * v; break;
                }

                // === 02. 经典频域与补偿体系 ===
                    // === 【2. 经典频域与补偿体系】 ===
                    case 'OpenLoop': u = cP.u_static; break;
                    case 'QFT-LeadLag': {
                    const z_d = Math.max(0.2, cP.zero); const p_d = Math.max(1.0, cP.pole); const K_d = cP.gain;
                    const lead_ratio = p_d / z_d;
                    alg.u_qft_prev = (alg.u_qft_prev || 0) + ((-p_d * (alg.u_qft_prev || 0) + p_d * e) * dt);
                    const e_lead = e + (lead_ratio - 1.0) * (e - alg.u_qft_prev);
                    u = K_d * e_lead - 1.2 * Math.sqrt(K_d * pP.m) * v + pP.k * target;
                    alg.e_prev = e; break;
                }
                    case 'Lag-Compensator': {
                    const n0 = cP.kc * (2 / dt + cP.zero); const n1 = cP.kc * (cP.zero - 2 / dt);
                    const d0 = 2 / dt + cP.pole; const d1 = cP.pole - 2 / dt;
                    const u_lag = (n0 * e + n1 * (alg.e_prev || 0) - d1 * (alg.u_lag_prev || 0)) / d0;
                    alg.e_prev = e; alg.u_lag_prev = clamp(u_lag, -150, 150);
                    u = alg.u_lag_prev - cP.kd * v; break;
                }
                    case 'Lead-Lag-Full': {
                    const z_l = Math.max(0.2, cP.z_lead); const p_l = Math.max(1.0, cP.p_lead);
                    alg.u_qft_prev = (alg.u_qft_prev || 0) + p_l * (e - (alg.u_qft_prev || 0)) * dt;
                    const lead_out = e + (p_l / z_l - 1.0) * (e - alg.u_qft_prev);
                    alg.integral = clamp(alg.integral + cP.z_lag * e * dt, -50, 50);
                    u = cP.gain * lead_out + 10.0 * alg.integral - 18.0 * v + pP.k * target;
                    alg.e_prev = e; break;
                }
                    case 'Notch-Filter-PD': {
                    const wn = clamp(cP.w_notch, 1.0, 20.0); const zn = clamp(cP.zeta_n, 0.05, 1.0);
                    const u_raw_n = cP.kp * e - cP.kd * v + pP.k * target;
                    for (let s = 0; s < 4; s++) {
                        const sdt = dt / 4;
                        const x2_dot = (u_raw_n - alg.u_prev) - 2 * zn * wn * alg.notch_x2 - wn * wn * alg.notch_x1;
                        alg.notch_x2 = clamp(alg.notch_x2 + x2_dot * sdt, -50, 50);
                        alg.notch_x1 = clamp(alg.notch_x1 + alg.notch_x2 * sdt, -50, 50);
                    }
                    u = u_raw_n - 0.35 * zn * alg.notch_x2; break;
                }
                    case 'PR-Resonant': {
                    const wc_pr = 0.2; const w0 = cP.w0;
                    const pr_dot2 = 2 * wc_pr * cP.kr * e - 2 * wc_pr * alg.pr_x2 - w0 * w0 * alg.pr_x1;
                    alg.pr_x1 += alg.pr_x2 * dt;
                    alg.pr_x2 += pr_dot2 * dt;
                    u = cP.kp * e + alg.pr_x2 - cP.kd * v + pP.k * target; break;
                }
                    case 'Double-Int-Servo': {
                    alg.integral = clamp(alg.integral + e * dt, -40, 40);
                    alg.integral2 = clamp(alg.integral2 + alg.integral * dt, -40, 40);
                    u = cP.kp * e + cP.ki1 * alg.integral + cP.ki2 * alg.integral2 - cP.kd * v; break;
                }
                    case 'PIDA-Controller': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = cP.kp * e + cP.ki * alg.integral - cP.kd * v - cP.ka * alg.a_filt; break;
                }
                    case 'Bode-Step-Comp': {
                    alg.d_filt += ((v - alg.d_filt) / 0.05) * dt;
                    u = cP.kb * (e - cP.tau1 * v) - cP.kh * alg.d_filt + pP.k * target; break;
                }
                    case 'Two-Stage-Lead': {
                    const edot = -v;
                    const ratio = cP.p_dl / Math.max(0.5, cP.z_dl);
                    u = cP.gain * (e + (2.0 / cP.z_dl) * edot * (ratio / 8.0)) + pP.k * target; break;
                }

                // === 03. 现代状态空间与最优控制 ===
                    // === 【3. 现代状态空间与最优控制】 ===
                    case 'PolePlacement': {
                        const k1 = pP.m * (cP.p1 * cP.p2) - pP.k; const k2 = pP.m * (cP.p1 + cP.p2) - pP.c;
                        u = -k1 * x - k2 * v + (k1 + pP.k) * target; break;
                    }
                    case 'LQR': {
                    const lqr_kp = Math.sqrt(pP.k * pP.k + cP.q_x / cP.r_weight) - pP.k;
                    const lqr_kd = Math.sqrt(pP.c * pP.c + 2 * pP.m * lqr_kp + cP.q_v / cP.r_weight) - pP.c;
                    u = (lqr_kp + pP.k) * e - lqr_kd * v + pP.k * x; break;
                }
                    case 'LQG': {
                        const y_meas = x + 0.1 * gaussNoise();
                        const a_kf = (alg.u_prev - pP.k * alg.x_kf - pP.c * alg.v_kf) / pP.m;
                        alg.x_kf += alg.v_kf * dt + 0.3 * (y_meas - alg.x_kf); alg.v_kf += a_kf * dt + 0.1 * (y_meas - alg.x_kf);
                        const lqg_kp = Math.sqrt(cP.q_x / cP.r_w); const lqg_kd = Math.sqrt(cP.q_v / cP.r_w + 2 * pP.m * lqg_kp);
                        u = lqg_kp * (target - alg.x_kf) - lqg_kd * alg.v_kf + pP.k * target; break;
                    }
                    case 'LQR-I': {
                    alg.integral = clamp(alg.integral + e * dt, -60, 60);
                    const k_lqi_x = Math.sqrt(cP.q_x / 1.0);
                    const k_lqi_v = Math.sqrt(cP.q_v / 1.0 + 2 * pP.m * k_lqi_x);
                    const k_lqi_i = Math.sqrt(cP.q_i / 1.0);
                    u = k_lqi_x * e - k_lqi_v * v + k_lqi_i * alg.integral; break;
                }
                    case 'Deadbeat': u = (pP.m / (dt * dt)) * cP.kp_scale * 0.02 * e - (pP.m / dt + pP.c) * cP.kp_scale * 0.35 * v + pP.k * x; break;
                    case 'IMP-Servo': {
                    alg.integral = clamp(alg.integral + e * dt, -60, 60);
                    const k_imp_i = Math.sqrt(cP.q_e / cP.r_u) * 0.45;
                    const k_imp_x = Math.sqrt(cP.q_x / cP.r_u) + 28.0;
                    const k_imp_v = Math.sqrt(2.4 * pP.m * k_imp_x) + 8.0;
                    u = k_imp_x * e - k_imp_v * v + k_imp_i * alg.integral + pP.k * target; break;
                }
                    case 'Preview': {
                    let f_sum = 0;
                    for (let i = 0; i < 5; i++) f_sum += Math.pow(0.8, i) * target;
                    u = cP.kp * e - cP.kd * v + cP.k_prev * f_sum; break;
                }
                    case 'Kalman-Pole': {
                    const a_est = (alg.u_prev - pP.k * alg.x_kf - pP.c * alg.v_kf) / pP.m;
                    alg.x_kf += alg.v_kf * dt + cP.q_kf * (x - alg.x_kf);
                    alg.v_kf += a_est * dt + (cP.q_kf * 2.5) * (v - alg.v_kf);
                    const k1 = pP.m * cP.p_pole * cP.p_pole;
                    const k2 = 2 * pP.m * cP.p_pole;
                    u = k1 * (target - alg.x_kf) - k2 * alg.v_kf + pP.k * target; break;
                }
                    case 'Minimum-Energy': {
                    const tf = Math.max(0.25, cP.tf_hor);
                    const k_me = (6 * pP.m) / (tf * tf);
                    u = k_me * e - cP.damp_me * v + pP.k * target; break;
                }
                    case 'LQT-Tracking': {
                    const r_dot = (target - (alg.e_prev2_r ?? target)) / dt;
                    alg.e_prev2_r = target;
                    const kp_lqt = Math.sqrt(cP.q_lqt / cP.r_lqt);
                    const kd_lqt = Math.sqrt(2 * pP.m * kp_lqt);
                    u = kp_lqt * e + kd_lqt * (clamp(r_dot, -10, 10) - v) + cP.kv_ff * clamp(r_dot, -10, 10) + pP.k * target; break;
                }
                    case 'LQR-Servo-FF': {
                    const kp_lqr = Math.sqrt(cP.q_x / cP.r_w);
                    const kd_lqr = Math.sqrt(cP.q_v / cP.r_w + 2 * pP.m * kp_lqr);
                    const n_bar = kp_lqr + pP.k;
                    u = -kp_lqr * x - kd_lqr * v + n_bar * target; break;
                }
                    case 'Linear-Time-Optimal-Switch': {
                    const a_max = (cP.u_max_p / pP.m) * cP.alpha_ptos;
                    const y_l = (cP.k2_ptos * cP.k2_ptos) / (2 * a_max);
                    let v_des = 0;
                    if (Math.abs(e) <= 1.0 / Math.max(0.1, y_l)) {
                        v_des = cP.k2_ptos * 0.35 * e;
                    } else {
                        v_des = Math.sign(e) * Math.sqrt(Math.max(0, 2 * a_max * Math.abs(e)));
                    }
                    u = clamp(cP.k2_ptos * (v_des - v) + pP.k * target, -cP.u_max_p, cP.u_max_p); break;
                }

                // === 04. 鲁棒控制与H∞体系 ===
                    // === 【4. 鲁棒控制与H∞体系】 ===
                    case 'H-Infinity': {
                    const gamma_sq = cP.gamma * cP.gamma;
                    const P22 = Math.sqrt(cP.q_x / Math.max(0.05, 1 - 1 / gamma_sq));
                    const P12 = Math.sqrt(2 * pP.m * P22);
                    u = P22 * e - P12 * v + pP.k * target; break;
                }
                    case 'H2-Optimal': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    const k_h2 = Math.sqrt(cP.q_h2 / cP.r_h2);
                    const kd_h2 = Math.sqrt(2 * pP.m * k_h2);
                    u = k_h2 * e - kd_h2 * v + cP.ki_h2 * alg.integral; break;
                }
                    case 'Mixed-H2-Hinf': {
                    const g2 = cP.gamma * cP.gamma;
                    const k_inf = Math.sqrt(cP.q_perf / Math.max(0.05, 1 - 1 / g2));
                    const k_h2 = Math.sqrt(cP.q_perf);
                    const kp_m = cP.alpha_mix * k_inf + (1 - cP.alpha_mix) * k_h2;
                    const kd_m = Math.sqrt(2.2 * pP.m * kp_m);
                    u = kp_m * e - kd_m * v + pP.k * target; break;
                }
                    case 'Mu-Synthesis': {
                    alg.d_filt += ((e - alg.d_filt) / (1.0 / cP.w_ro)) * dt;
                    const e_scaled = cP.d_scale * e + (1 - cP.d_scale) * alg.d_filt;
                    u = cP.k_mu * e_scaled - Math.sqrt(2.5 * pP.m * cP.k_mu) * v + pP.k * target; break;
                }
                    case 'LoopShaping-McFarlane': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = cP.w1_gain * e + cP.w1_int * alg.integral - cP.w2_damp * v + pP.k * target; break;
                }
                    case 'Kharitonov-Robust': {
                    const m_worst = Math.max(pP.m, cP.m_max_bound);
                    const kp_kh = m_worst * cP.wn_rob * cP.wn_rob;
                    const kd_kh = 2 * m_worst * cP.zeta_rob * cP.wn_rob;
                    u = kp_kh * e - kd_kh * v + pP.k * target; break;
                }
                    case 'Corless-Leitmann': {
                    const bpe = 1.5 * e - v;
                    const u_min_max = cP.rho_bound * (bpe / (Math.abs(bpe) + cP.eps_c));
                    u = cP.kp_nom * e - 18 * v + u_min_max + pP.k * target; break;
                }
                    case 'Robust-NL-Damping': {
                    const robust_d = cP.gamma_rd * (1 + e * e);
                    u = cP.kp_nom * e - (16 + robust_d) * v + pP.k * target; break;
                }
                    case 'Petersen-GuaranteedCost': {
                    const kp_gc = Math.sqrt(cP.q_gc + cP.delta_b * cP.delta_b / cP.eps_gc) + cP.eps_gc * 8;
                    const kd_gc = Math.sqrt(2.2 * pP.m * kp_gc);
                    u = kp_gc * e - kd_gc * v + pP.k * target; break;
                }
                    case 'Passivity-Shortage-Comp': {
                    alg.integral = clamp(alg.integral + e * dt, -50, 50);
                    u = cP.kp_pass * e + cP.ki_pass * alg.integral - cP.rho_pass * v + pP.k * target; break;
                }

                // === 05. 模型预测与滚动优化 ===
                    // === 【5. 模型预测与滚动优化】 ===
                    case 'MPC': {
                        const H = (cP.t_pred * cP.t_pred) / (2 * pP.m);
                        const x_free = x + v * cP.t_pred - H * (pP.c * v + pP.k * x);
                        u = (H * (target - x_free) + cP.lambda * pP.k * target) / (H * H + cP.lambda); break;
                    }
                    case 'TubeMPC': {
                    const H = (cP.t_pred * cP.t_pred) / (2 * pP.m);
                    const x_nom_next = alg.xm + alg.vm * dt;
                    const a_nom = ((alg.u_prev || 0) - pP.k * alg.xm - pP.c * alg.vm) / pP.m;
                    alg.vm += a_nom * dt + 2.5 * (v - alg.vm) * dt;
                    alg.xm = x_nom_next + 2.5 * (x - alg.xm) * dt;
                    const x_free = alg.xm + alg.vm * cP.t_pred - H * (pP.c * alg.vm + pP.k * alg.xm);
                    const u_mpc_star = (H * (target - x_free) + cP.lambda * pP.k * target) / (H * H + cP.lambda);
                    u = u_mpc_star + cP.k_anc * (alg.xm - x) - 12 * (v - alg.vm);
                    alg.ref_display = alg.xm; break;
                }
                    case 'GPC': {
                    let gpc_sum = 0;
                    for (let i = 0; i < cP.ny; i++) gpc_sum += alg.e_hist[i] || 0;
                    alg.integral = clamp(alg.integral + (gpc_sum / Math.max(1, cP.ny)) * dt * 12, -80, 80);
                    u = 35 * e + (alg.integral / (cP.nu * 0.2 + cP.lam)) - 18 * v + pP.k * target; break;
                }
                    case 'DMC-DynamicMatrix': {
                    const y_ref = cP.alpha_ref * x + (1 - cP.alpha_ref) * target;
                    const y_free = x + 0.5 * v;
                    u = (42 / (1 + cP.r_dmc * 0.2)) * (y_ref - y_free) + 38 * e - cP.kd_dmc * v + pP.k * target;
                    alg.ref_display = y_ref; break;
                }
                    case 'MAC-Impulse': {
                    const a_m = (alg.u_prev - pP.k * alg.xm_imc - pP.c * alg.vm_imc) / pP.m;
                    alg.vm_imc += a_m * dt; alg.xm_imc += alg.vm_imc * dt;
                    const e_mac = target - (x - 0.35 * (x - alg.xm_imc));
                    u = (10 + 3.0 * cP.h_horizon) / (1 + cP.lambda_mac) * e_mac - cP.kd_mac * v + pP.k * target; break;
                }
                    case 'PFC-Functional': {
                    const alpha_pfc = Math.exp(-dt / Math.max(0.05, cP.tr_pfc));
                    const dev_desired = (1 - Math.pow(alpha_pfc, cP.h_coin)) * e;
                    const th = Math.max(0.15, cP.h_coin * dt * 2.2);
                    const x_free_dev = v * th * 0.4;
                    u = (2 * pP.m / (th * th)) * (dev_desired - x_free_dev) - cP.kd_pfc * v + pP.k * target; break;
                }
                    case 'Explicit-MPC': {
                    const gain_pwa = Math.abs(e) < cP.poly_bnd ? cP.k_inner : cP.k_outer;
                    u = gain_pwa * e - 20 * v + pP.k * target; break;
                }
                    case 'Stochastic-MPC': {
                    const H = (cP.t_pred * cP.t_pred) / (2 * pP.m);
                    const z_quant = 1.0 / Math.sqrt(Math.max(0.01, cP.risk_p));
                    const tighten = 1.0 + 0.12 * z_quant * cP.sigma_w;
                    const x_free = x + v * cP.t_pred - H * (pP.c * v + pP.k * x);
                    u = tighten * (H * (target - x_free)) / (H * H + 0.02) + pP.k * target; break;
                }
                    case 'MinMax-MPC': {
                    const H = (cP.t_pred * cP.t_pred) / (2 * pP.m);
                    const worst_w = -Math.sign(e - 0.2 * v) * cP.w_bound;
                    const x_free_worst = x + v * cP.t_pred - H * (pP.c * v + pP.k * x - worst_w);
                    u = (H * (target - x_free_worst)) / (H * H + cP.lambda) + pP.k * target; break;
                }

                // === 06. 滑模变结构控制家族 ===
                    // === 【6. 滑模变结构控制家族】 ===
                    case 'SMC': {
                        const s_smc = cP.c_surface * e - v;
                        const u_eq_smc = pP.k * x + pP.c * v - pP.m * cP.c_surface * v;
                        u = u_eq_smc + cP.k_gain * chatter(s_smc, cP, alg, dt); break;
                    }
                    case 'VSC-RL': {
                        const s_rl = cP.c_surface * e - v;
                        const u_eq_rl = pP.k * x + pP.c * v - pP.m * cP.c_surface * v;
                        u = u_eq_rl + pP.m * (cP.eps * chatter(s_rl, cP, alg, dt) + cP.k_rl * s_rl); break;
                    }
                    case 'PowerRate-SMC': {
                    const s_pr = cP.c_surface * e - v;
                    const u_eq = pP.k * x + pP.c * v - pP.m * cP.c_surface * v;
                    u = u_eq + pP.m * cP.k_pr * Math.pow(Math.abs(s_pr), cP.alpha_pr) * Math.sign(s_pr); break;
                }
                    case 'ISMC': {
                        alg.integral += e * dt;
                        u = pP.k * x + pP.c * v + cP.k_gain * chatter(-v + cP.c1 * e + cP.c2 * alg.integral, cP, alg, dt); break;
                    }
                    case 'TSMC': {
                        const e_abs = Math.max(Math.abs(e), 0.001); const s_tsmc = -v + cP.beta * Math.sign(e) * Math.pow(e_abs, cP.alpha);
                        const u_eq_tsmc = pP.k * x + pP.c * v - pP.m * (cP.beta * cP.alpha * Math.pow(e_abs, cP.alpha - 1) * v);
                        u = u_eq_tsmc + cP.k_gain * chatter(s_tsmc, cP, alg, dt); break;
                    }
                    case 'FTSMC': {
                        const s_ft = -v + cP.c1 * e + cP.c2 * Math.sign(e) * Math.pow(Math.abs(e), cP.q);
                        const u_eq_ft = pP.k * x + pP.c * v - pP.m * (cP.c1 * v + cP.c2 * cP.q * Math.pow(Math.max(Math.abs(e),0.001), cP.q-1) * v);
                        u = u_eq_ft + cP.k_gain * chatter(s_ft, cP, alg, dt); break;
                    }
                    case 'NFTSMC': {
                    const s_nf = e + cP.beta1 * Math.pow(Math.abs(e), 1.2) * Math.sign(e) + cP.beta2 * Math.pow(Math.abs(-v), cP.gamma2) * Math.sign(-v);
                    u = pP.k * x + pP.c * v + 30 * e - 16 * v + cP.k_gain * clamp(s_nf / 0.15, -1, 1); break;
                }
                    case 'ASMC': {
                        const s_asmc = cP.c_surface * e - v; alg.K_hat = Math.max(0, Math.min(alg.K_hat + cP.gamma * Math.abs(s_asmc) * dt, 200));
                        const u_eq_asmc = pP.k * x + pP.c * v - pP.m * cP.c_surface * v;
                        u = u_eq_asmc + alg.K_hat * chatter(s_asmc, cP, alg, dt); break;
                    }
                    case 'SuperTwisting': {
                        const s_st_raw = cP.c * e - v;
                        /* 切换面一阶滤波：真实系统里速度/导数测量本就带滤波，可显著削弱抖振 */
                        const aF = Math.min(1, dt / 0.05);
                        alg.st_s = (alg.st_s === undefined) ? s_st_raw : alg.st_s + aF * (s_st_raw - alg.st_s);
                        const s_st = alg.st_s;
                        /* 超螺旋：连续项 λ√|s|·sgn(s) 天然连续不抖；积分项按一阶遗忘收敛，
                           对应实际系统中抖振被结构与阻尼抑制，避免积分项随机游走 */
                        const leak = Math.max(0, 1 - 2.0 * dt);
                        alg.st_int = alg.st_int * leak + cP.W * Math.sign(s_st) * dt;
                        alg.st_int = Math.max(-40, Math.min(40, alg.st_int));
                        const u_eq_st = pP.k * x + pP.c * v - pP.m * cP.c * v;
                        u = u_eq_st + pP.m * (cP.lambda * Math.sqrt(Math.abs(s_st)) * Math.sign(s_st) + alg.st_int);
                        break;
                    }
                    case 'Twisting-2SMC': {
                    const s_tw = cP.c_surf * e - v;
                    const s_dot_tw = -cP.c_surf * v - alg.a_filt;
                    const u_eq = pP.k * x + pP.c * v - pP.m * cP.c_surf * v;
                    u = u_eq + cP.r1 * clamp(s_tw / 0.1, -1, 1) + cP.r2 * clamp(s_dot_tw / 0.5, -1, 1); break;
                }
                    case 'LevantHOSM': {
                    const noisy_e = e;
                    alg.z0_lev += (-cP.l1 * Math.sqrt(Math.abs(alg.z0_lev - noisy_e)) * Math.sign(alg.z0_lev - noisy_e) + alg.z1_lev) * dt;
                    alg.z1_lev += (-cP.l2 * Math.sign(alg.z0_lev - noisy_e)) * dt;
                    u = cP.k_gain * clamp((cP.c_surf * alg.z0_lev + alg.z1_lev) / 0.15, -1, 1) + 25 * e - 12 * v + pP.k * target; break;
                }
                    case 'VariableG-SMC': {
                        const s_vg = cP.c_surf * e - v; const k_vg = cP.k0 + cP.k1 * Math.abs(x);
                        u = pP.k*x + pP.c*v - pP.m*cP.c_surf*v + k_vg * chatter(s_vg, cP, alg, dt); break;
                    }
                    case 'Boundary-Layer-Varying-SMC': {
                    const s_sl = cP.lam_sl * e - v;
                    const phi_dot = -cP.lam_sl * alg.phi_slotine + cP.k_max_sl * 0.05;
                    alg.phi_slotine = Math.max(cP.phi_min, alg.phi_slotine + phi_dot * dt);
                    const u_eq = pP.k * x + pP.c * v - pP.m * cP.lam_sl * v;
                    u = u_eq + Math.max(5, cP.k_max_sl - phi_dot) * clamp(s_sl / alg.phi_slotine, -1, 1); break;
                }
                    case 'Global-SMC': {
                    const s0 = cP.c_surf * alg.e0_init - alg.v0_init;
                    const s_g = (cP.c_surf * e - v) - s0 * Math.exp(-cP.lam_gsmc * alg.t_target);
                    const u_eq = pP.k * x + pP.c * v - pP.m * cP.c_surf * v;
                    u = u_eq + cP.k_gain * clamp(s_g / 0.12, -1, 1) + 18 * e; break;
                }
                    case 'HOSM-Quasi-Continuous': {
                    const s_qc = cP.c_surf * e - v;
                    const s_dot = -cP.c_surf * v;
                    const num = s_dot + cP.beta_qc * Math.sqrt(Math.abs(s_qc)) * Math.sign(s_qc);
                    const den = Math.abs(s_dot) + cP.beta_qc * Math.sqrt(Math.abs(s_qc)) + 0.05;
                    const u_eq = pP.k * x + pP.c * v - pP.m * cP.c_surf * v;
                    u = u_eq + cP.alpha_qc * (num / den) + 25 * e; break;
                }

                // === 07. 自抗扰与扰动观测补偿 ===
                    // === 【7. 自抗扰与扰动观测补偿】 ===
                    case 'ADRC': {
                        const eo = alg.z1 - x;
                        alg.z1 += (alg.z2 - 3 * cP.w_o * eo) * dt; alg.z2 += (alg.z3 - 3 * cP.w_o * cP.w_o * eo + cP.b0 * alg.u_prev) * dt; alg.z3 += (-Math.pow(cP.w_o, 3) * eo) * dt;
                        u = (cP.w_c * cP.w_c * (target - alg.z1) - 2 * cP.w_c * alg.z2 - alg.z3) / cP.b0; break;
                    }
                    case 'NL-ADRC': {
                    const subN = 4;
                    const sdt = dt / subN;
                    const d_safe = Math.max(0.08, cP.delta);
                    for (let i = 0; i < subN; i++) {
                        const e_eso = alg.z1 - x;
                        const fe1 = fal(e_eso, 0.5, d_safe) * Math.pow(d_safe, 0.5);
                        const fe2 = fal(e_eso, 0.25, d_safe) * Math.pow(d_safe, 0.75);
                        alg.z1 += (alg.z2 - 3 * cP.w_o * e_eso) * sdt;
                        alg.z2 += (alg.z3 - 3 * cP.w_o * cP.w_o * fe1 + cP.b0 * alg.u_prev) * sdt;
                        alg.z3 = clamp(alg.z3 + (-Math.pow(cP.w_o, 3) * fe2) * sdt, -250, 250);
                    }
                    const e_nl = fal(target - alg.z1, 0.75, d_safe);
                    u = (cP.w_c * cP.w_c * e_nl - 2 * cP.w_c * alg.z2 - alg.z3) / cP.b0; break;
                }
                    case 'DOB': {
                        const a_est_dob = (v - (alg.v_prev || 0)) / dt;
                        const u_nom_dob = pP.m * a_est_dob + pP.c * v + pP.k * x;
                        alg.d_hat += ((alg.u_prev - u_nom_dob - alg.d_hat) / (1 / cP.w_c)) * dt;
                        u = cP.kp * e - cP.kd * v - alg.d_hat; alg.v_prev = v; break;
                    }
                    case 'NDOB': {
                    const p_ndob = cP.l_obs * pP.m * v;
                    alg.z1 += (-cP.l_obs * (alg.z1 + p_ndob) - cP.l_obs * (pP.k * x + pP.c * v - alg.u_prev)) * dt;
                    alg.z1 = clamp(alg.z1, -180, 180);
                    u = cP.kp * e - cP.kd * v - (alg.z1 + p_ndob) + pP.k * x + pP.c * v; break;
                }
                    case 'T-DOB': {
                    const td_step = Math.min(198, Math.max(1, Math.floor(cP.delay_d)));
                    const v_past = (alg.x_delay_buf[td_step - 1] - alg.x_delay_buf[td_step]) / dt;
                    const a_past = (v - v_past) / (td_step * dt);
                    const d_tdob = clamp(alg.u_delay_buf[td_step] - cP.m_nom * a_past, -120, 120);
                    u = cP.kp * e - cP.kd * v - 0.65 * d_tdob; break;
                }
                    case 'ESO-SMC': {
                        const e_obs = alg.z1 - x;
                        alg.z1 += (alg.z2 - 3 * cP.w_o * e_obs) * dt; 
                        alg.z2 += (alg.z3 - 3 * cP.w_o * cP.w_o * e_obs + cP.b0 * alg.u_prev) * dt; 
                        alg.z3 += (-Math.pow(cP.w_o, 3) * e_obs) * dt;
                        const s_eso = cP.c_surface * (target - alg.z1) - alg.z2;
                        const u_eq_eso = (-cP.c_surface * alg.z2 - alg.z3) / cP.b0;
                        u = u_eq_eso + (cP.k_gain / cP.b0) * chatter(s_eso, cP, alg, dt); break;
                    }
                    case 'UIO-Feedback': {
                    const d_uio = clamp(alg.u_prev - pP.m * alg.a_filt - pP.k * x - pP.c * v, -150, 150);
                    alg.d_hat += cP.k_uio * (d_uio - alg.d_hat) * dt;
                    u = cP.kp * e - cP.kd * v - alg.d_hat + pP.k * target; break;
                }
                    case 'GPI-Control': {
                    const eo = alg.z1 - x;
                    const w = cP.w_gpi;
                    alg.z1 += (alg.z2 - 4 * w * eo) * dt;
                    alg.z2 += (alg.z3 - 6 * w * w * eo + (alg.u_prev / pP.m)) * dt;
                    alg.z3 += (alg.z4 - 4 * Math.pow(w, 3) * eo) * dt;
                    alg.z4 += (-Math.pow(w, 4) * eo) * dt;
                    u = pP.m * (cP.kp * (target - alg.z1) - cP.kd * alg.z2 - alg.z3); break;
                }
                    case 'UDE-Control': {
                    const a_des = cP.kp * e - cP.kd * v;
                    const f_nom = -(pP.k * x + pP.c * v) / pP.m;
                    const d_raw = alg.a_filt - f_nom - alg.u_prev / pP.m;
                    alg.d_hat += ((d_raw - alg.d_hat) / Math.max(0.01, cP.t_ude)) * dt;
                    u = pP.m * (a_des - f_nom - alg.d_hat); break;
                }
                    case 'Active-Force-Control': {
                    const f_star = clamp(alg.u_prev - cP.m_est * alg.a_filt, -140, 140);
                    alg.d_hat += ((f_star - alg.d_hat) / 0.04) * dt;
                    u = cP.m_est * (cP.kp * e - cP.kd * v) + alg.d_hat; break;
                }
                    case 'Equivalent-Input-Disturbance': {
                    const e_obs = x - alg.l_x;
                    alg.l_x += (alg.l_v + cP.l_eid * e_obs) * dt;
                    alg.l_v += ((alg.u_prev - pP.k * alg.l_x - pP.c * alg.l_v) / pP.m + cP.l_eid * cP.l_eid * 0.4 * e_obs) * dt;
                    const d_eid_raw = pP.m * cP.l_eid * cP.l_eid * 0.4 * e_obs;
                    alg.d_hat += cP.w_eid * (d_eid_raw - alg.d_hat) * dt;
                    u = cP.kp * (target - alg.l_x) - 20 * alg.l_v - alg.d_hat + pP.k * target; break;
                }

                // === 08. 非线性几何与能量控制 ===
                    // === 【8. 非线性几何与能量控制】 ===
                    case 'BangBang': u = (Math.abs(e) < 0.05 && Math.abs(v) < 0.05) ? 0 : (e > 0 ? cP.force : -cP.force); break;
                    case 'BangBang-Zone': u = Math.abs(e) > cP.zone ? (Math.sign(e) * cP.force) : (cP.kp * e - 20 * v + pP.k * target); break;
                    case 'Relay': if (e > cP.deadzone) u = cP.force; else if (e < -cP.deadzone) u = -cP.force; else u = alg.u_prev; break;
                    case 'TimeOptimal': {
                    const a_max = cP.force / pP.m;
                    const sig = e - Math.sign(v) * (v * v) / (2 * a_max);
                    u = (Math.abs(e) < 0.25 && Math.abs(v) < 0.6) ? (pP.k * target + 35 * e - 18 * v) : (sig > 0 ? cP.force : -cP.force); break;
                }
                    case 'FeedbackLin': u = pP.m * (cP.kp * e - cP.kd * v) + pP.c * v + pP.k * x; break;
                    case 'Backstepping': {
                    const z1_bs = -e;
                    const z2_bs = v - (-cP.c1 * z1_bs);
                    u = pP.m * (-z1_bs - cP.c2 * z2_bs - cP.c1 * v) + pP.k * x + pP.c * v; break;
                }
                    case 'DSC': {
                        const s1_dsc = x - target; const alpha1_dsc = -cP.c1 * s1_dsc;
                        alg.z_dsc += ((alpha1_dsc - alg.z_dsc) / cP.tau) * dt;
                        const z1_dot = (alpha1_dsc - alg.z_dsc) / cP.tau; const s2_dsc = v - alg.z_dsc;
                        u = pP.m * (z1_dot - cP.c2 * s2_dsc - s1_dsc) + pP.k * x + pP.c * v; break;
                    }
                    case 'NDC': u = cP.kp * e - cP.kd * v - cP.k_nd * e * e * v + pP.k * target; break;
                    case 'EnergyShaping': u = pP.k * x - cP.k_d * (x - target) - (cP.r_d0 + cP.r_d1 * Math.abs(v)) * v; break;
                    case 'Feedback-Passivation': u = pP.k * x + pP.c * v - cP.kp * (x - target) - cP.kv * v; break;
                    case 'Synergetic-Control': {
                    const psi = cP.c_syn * e - v;
                    const t_s = Math.max(0.05, cP.t_syn);
                    u = pP.k * x + pP.c * v + pP.m * (-cP.c_syn * v + psi / t_s); break;
                }
                    case 'SDRE': {
                    const q_nl = cP.q_weight * (1 + 0.5 * e * e);
                    const kp_sdre = Math.sqrt(q_nl);
                    const kd_sdre = Math.sqrt(2.2 * pP.m * kp_sdre);
                    u = kp_sdre * e - kd_sdre * v + pP.k * target; break;
                }
                    case 'Harmonic-Oscillator-PBC': {
                    const a_th = Math.max(0.1, cP.alpha_th);
                    u = (cP.kp / a_th) * Math.tanh(a_th * e) - cP.kd * v + pP.k * target; break;
                }
                    case 'Flatness-Trajectory-Track': {
                    const T = Math.max(0.3, cP.t_plan);
                    const tau = clamp(alg.t_target / T, 0, 1);
                    const dy = target - alg.y0_flat;
                    const s_pos = 10 * Math.pow(tau, 3) - 15 * Math.pow(tau, 4) + 6 * Math.pow(tau, 5);
                    const s_vel = (30 * Math.pow(tau, 2) - 60 * Math.pow(tau, 3) + 30 * Math.pow(tau, 4)) / T;
                    const s_acc = (60 * tau - 180 * Math.pow(tau, 2) + 120 * Math.pow(tau, 3)) / (T * T);
                    const yd = alg.y0_flat + dy * s_pos;
                    const vd_f = tau < 1 ? dy * s_vel : 0;
                    const ad_f = tau < 1 ? dy * s_acc : 0;
                    u = pP.m * ad_f + pP.c * vd_f + pP.k * yd + cP.kp * (yd - x) + cP.kd * (vd_f - v);
                    alg.ref_display = yd; break;
                }

                // === 09. 自适应与参数辨识控制 ===
                    // === 【9. 自适应与参数辨识控制】 ===
                    case 'MRAC': {
                    const a_m = cP.wn * cP.wn * target - 2 * cP.zeta * cP.wn * alg.vm - cP.wn * cP.wn * alg.xm;
                    alg.vm += a_m * dt; alg.xm += alg.vm * dt;
                    const e_m = (alg.xm - x) + 0.4 * (alg.vm - v);
                    alg.theta_r = clamp(alg.theta_r + cP.gamma * e_m * target * dt, -100, 100);
                    alg.theta_x = clamp(alg.theta_x + cP.gamma * e_m * x * dt, -100, 100);
                    alg.theta_v = clamp(alg.theta_v + cP.gamma * e_m * v * dt, -100, 100);
                    u = alg.theta_r * target + alg.theta_x * x + alg.theta_v * v + 32 * (alg.xm - x) + 16 * (alg.vm - v);
                    alg.ref_display = alg.xm; break;
                }
                    case 'MRAC-MIT': {
                    const a_m = cP.wn * cP.wn * target - 2 * cP.zeta * cP.wn * alg.vm - cP.wn * cP.wn * alg.xm;
                    alg.vm += a_m * dt; alg.xm += alg.vm * dt;
                    const e_mit = x - alg.xm;
                    alg.theta_r = clamp(alg.theta_r - cP.gamma_mit * e_mit * alg.xm * dt, -80, 80);
                    u = (1.0 + 0.1 * alg.theta_r) * (35 * (alg.xm - x) + 18 * (alg.vm - v) + pP.k * target);
                    alg.ref_display = alg.xm; break;
                }
                    case 'STR': {
                    const a_real = alg.a_filt;
                    const a_err = a_real - ((alg.u_prev - alg.k_hat * x - alg.c_hat * v) / pP.m);
                    alg.k_hat = clamp(alg.k_hat - cP.gamma * a_err * x * dt, 0.1, 20);
                    alg.c_hat = clamp(alg.c_hat - cP.gamma * a_err * v * dt, 0.1, 15);
                    u = pP.m * cP.wn * cP.wn * target - (pP.m * cP.wn * cP.wn - alg.k_hat) * x - (pP.m * 2 * cP.zeta * cP.wn - alg.c_hat) * v; break;
                }
                    case 'L1': {
                    alg.v_pred = alg.v_pred ?? v;
                    const v_pred_dot = -10.0 * (alg.v_pred - v) + alg.u_prev / pP.m + alg.theta_x;
                    alg.v_pred += v_pred_dot * dt;
                    const v_tilde = alg.v_pred - v;
                    alg.theta_x = clamp(alg.theta_x - cP.gamma * v_tilde * dt, -500, 500);
                    const u_baseline = pP.m * (cP.wn * cP.wn * (target - x) - 2 * cP.zeta * cP.wn * v) + pP.k * target;
                    const u_raw_l1 = u_baseline - alg.theta_x * pP.m;
                    alg.u_l1_filter += ((u_raw_l1 - alg.u_l1_filter) / cP.t_lpf) * dt;
                    u = alg.u_l1_filter;
                    const a_m_l1 = cP.wn * cP.wn * target - 2 * cP.zeta * cP.wn * alg.vm - cP.wn * cP.wn * alg.xm;
                    alg.vm += a_m_l1 * dt; alg.xm += alg.vm * dt;
                    alg.ref_display = alg.xm; break;
                }
                    case 'I-and-I': {
                    const d_hat_ii = alg.theta_hat_ii - cP.lambda * pP.m * v;
                    const z_dot_ii = -cP.lambda * d_hat_ii + cP.lambda * (alg.u_prev - pP.k * x - pP.c * v);
                    alg.theta_hat_ii = clamp(alg.theta_hat_ii + z_dot_ii * dt, -150, 150);
                    u = cP.kp * e - cP.kd * v + d_hat_ii; break;
                }
                    case 'AdaptBackstepping': {
                    const z1_ab = x - target;
                    const alpha1_ab = -cP.c1 * z1_ab;
                    const z2_ab = v - alpha1_ab;
                    alg.m_hat = clamp(alg.m_hat - cP.gamma_m * z2_ab * (-cP.c1 * v) * dt, 0.5, 10.0);
                    u = pP.k * x + pP.c * v - z1_ab - cP.c2 * z2_ab + alg.m_hat * (-cP.c1 * v); break;
                }
                    case 'ARC': {
                    const s_arc = cP.c * e - v;
                    alg.m_hat = clamp(alg.m_hat + cP.gamma * s_arc * (-cP.c * v) * dt, 0.5, 10);
                    u = alg.m_hat * (-cP.c * v) + pP.k * x + pP.c * v + cP.k_s * s_arc + cP.k_n * clamp(s_arc / 0.1, -1, 1); break;
                }
                    case 'RLS-Adaptive': {
                    const y_curr = x; const y_past = alg.x_delay_buf[2] || x; const u_past = alg.u_delay_buf[2] || 0;
                    const phi_rls = [y_past, u_past * 0.05];
                    const P_phi = [
                        alg.P_rls[0][0] * phi_rls[0] + alg.P_rls[0][1] * phi_rls[1],
                        alg.P_rls[1][0] * phi_rls[0] + alg.P_rls[1][1] * phi_rls[1]
                    ];
                    const den_rls = cP.rls_lambda + phi_rls[0] * P_phi[0] + phi_rls[1] * P_phi[1];
                    const K_rls = [P_phi[0] / den_rls, P_phi[1] / den_rls];
                    const err_rls = y_curr - (alg.theta_rls[0] * phi_rls[0] + alg.theta_rls[1] * phi_rls[1]);
                    alg.theta_rls[0] = clamp(alg.theta_rls[0] + K_rls[0] * err_rls, 0.2, 5.0);
                    alg.theta_rls[1] = clamp(alg.theta_rls[1] + K_rls[1] * err_rls, 0.1, 2.0);
                    u = (cP.w_bw * 7 * e - 18 * v) / Math.max(0.2, alg.theta_rls[1]) + pP.k * target; break;
                }
                    case 'Nussbaum-Gain': {
                    const s_n = 3.0 * e - v;
                    alg.chi_nuss = clamp(alg.chi_nuss + cP.gamma_n * Math.abs(e * s_n) * dt * 0.05, 0.4, 1.35);
                    const N_chi = Math.max(0.5, alg.chi_nuss * alg.chi_nuss * Math.cos(alg.chi_nuss));
                    u = N_chi * (cP.kp_n * e - cP.kd_n * v) + pP.k * target; break;
                }
                    case 'Composite-MRAC': {
                    const a_m = cP.wn * cP.wn * target - 2 * cP.wn * alg.vm - cP.wn * cP.wn * alg.xm;
                    alg.vm += a_m * dt; alg.xm += alg.vm * dt;
                    const e_tr = (alg.xm - x) + 0.5 * (alg.vm - v);
                    const pred_err = alg.u_prev - (pP.m * alg.a_filt + alg.k_hat * x + alg.c_hat * v);
                    alg.k_hat = clamp(alg.k_hat + (cP.gamma * e_tr * x + cP.g_pred * pred_err * x * 0.02) * dt, 0.1, 15);
                    u = pP.m * (cP.wn * cP.wn * (target - x) - 2 * cP.wn * v) + alg.k_hat * x + pP.c * v;
                    alg.ref_display = alg.xm; break;
                }

                // === 10. 数据驱动与智能仿生控制 ===
                    // === 【10. 数据驱动与智能仿生控制】 ===
                    case 'Fuzzy': {
                    const e_norm_f = clamp(e * cP.ke, -1, 1); const ec_norm_f = clamp(-v * cP.kec, -1, 1);
                    const mf_e = getMembership(e_norm_f); const mf_ec = getMembership(ec_norm_f);
                    let rule_U = 0, sum_Wf = 0;
                    const evalRule = (w_e, w_ec, out_val) => { const w = Math.min(w_e, w_ec); rule_U += w * out_val; sum_Wf += w; };
                    evalRule(mf_e.N, mf_ec.N, -1); evalRule(mf_e.N, mf_ec.Z, -1); evalRule(mf_e.N, mf_ec.P, 0);
                    evalRule(mf_e.Z, mf_ec.N, -1); evalRule(mf_e.Z, mf_ec.Z, 0);  evalRule(mf_e.Z, mf_ec.P, 1);
                    evalRule(mf_e.P, mf_ec.N, 0);  evalRule(mf_e.P, mf_ec.Z, 1);  evalRule(mf_e.P, mf_ec.P, 1);
                    const defuzz_U = sum_Wf > 0 ? (rule_U / sum_Wf) : 0;
                    u = defuzz_U * cP.gain * 45 + pP.k * target; break;
                }
                    case 'Neural-RBF-ADRC': {
                    const e_eso_rbf = alg.z1 - x;
                    alg.z1 += (alg.z2 - 3 * cP.wo * e_eso_rbf) * dt;
                    alg.z2 += (alg.z3 - 3 * cP.wo * cP.wo * e_eso_rbf + cP.b0 * alg.u_prev) * dt;
                    alg.z3 += (-Math.pow(cP.wo, 3) * e_eso_rbf) * dt;
                    const centers = [-2, -1, 0, 1, 2];
                    let h_rbf = centers.map(c_pt => Math.exp(-Math.pow(x - target - c_pt, 2) / 2));
                    let f_nn = 0;
                    for (let i = 0; i < 5; i++) f_nn += alg.w_rbf[i] * h_rbf[i];
                    for (let i = 0; i < 5; i++) alg.w_rbf[i] = clamp(alg.w_rbf[i] + cP.n_lr * e_eso_rbf * h_rbf[i] * dt, -30, 30);
                    u = (cP.wc * cP.wc * (target - alg.z1) - 2 * cP.wc * alg.z2 - alg.z3 - f_nn) / cP.b0; break;
                }
                    case 'MFAC': {
                    const e_star = e - 0.42 * v;
                    const y_star = x + 0.42 * v;
                    const d_u = alg.u_prev - alg.u_prev2;
                    const d_y = alg.x_prev !== undefined ? (y_star - alg.x_prev) : 0;
                    if (Math.abs(d_u) > 1e-4) alg.phi = alg.phi + (cP.eta * d_u / (cP.mu + d_u * d_u)) * (d_y - alg.phi * d_u);
                    if (alg.phi < 0.1 || alg.phi > 5.0 || !Number.isFinite(alg.phi)) alg.phi = 0.8;
                    alg.integral = clamp(alg.integral + (cP.rho * alg.phi / (cP.lambda + alg.phi * alg.phi)) * e_star * dt * 35.0, -80, 80);
                    u = alg.integral + 35 * e - cP.kd * v;
                    alg.u_prev2 = alg.u_prev; alg.x_prev = y_star; break;
                }
                    case 'U-Model': {
                    const y_pred = x + v * dt + (alg.u_prev / pP.m) * dt * dt;
                    const jacobian = Math.max(0.02, (dt * dt) / pP.m * 80);
                    u = 0.3 * alg.u_prev + cP.step_nr * (target - y_pred) / jacobian + cP.kp * e - cP.kd * v + pP.k * target; break;
                }
                    case 'ESC': {
                    const J_cost = 0.5 * e * e;
                    const j_hp = J_cost - (alg.j_esc_lpf ?? J_cost);
                    alg.j_esc_lpf = (alg.j_esc_lpf ?? J_cost) + 5.0 * (J_cost - (alg.j_esc_lpf ?? J_cost)) * dt;
                    alg.u_esc_bias = clamp(alg.u_esc_bias - cP.k_esc * (j_hp * Math.sin(cP.omega * currTime)) * dt + 4.0 * e * dt, -100, 100);
                    u = 40 * e - 18 * v + pP.k * target + alg.u_esc_bias + cP.amp * Math.sin(cP.omega * currTime); break;
                }
                    case 'BELBIC': {
                    const SI = cP.w_e * e - cP.w_v * v;
                    const Rew = 18 * e - 8 * v;
                    const A_bel = alg.V_belbic * SI;
                    const O_bel = alg.W_belbic * SI;
                    alg.V_belbic = clamp(alg.V_belbic + cP.a_A * Math.abs(SI) * Math.max(0, Math.abs(Rew) - Math.abs(A_bel)) * dt * 0.05, 8, 35);
                    alg.W_belbic = clamp(alg.W_belbic + cP.a_O * SI * (A_bel - O_bel - Rew) * dt * 0.02, -15, 15);
                    u = (alg.V_belbic - alg.W_belbic) * SI + pP.k * target; break;
                }
                    case 'Linear-Actor-Critic': {
                    const phi = [e, -v, clamp(e * v * 0.1, -5, 5)];
                    let V_val = 0, u_actor = 0;
                    for (let i = 0; i < 3; i++) { V_val += alg.w_critic[i] * phi[i]; u_actor += alg.w_actor[i] * phi[i]; }
                    const r_reward = -(e * e + 0.1 * v * v);
                    const td_err = clamp(r_reward * 0.05 - V_val * (1 - cP.gamma_rl), -10, 10);
                    for (let i = 0; i < 3; i++) {
                        alg.w_critic[i] = clamp(alg.w_critic[i] + cP.alpha_c * td_err * phi[i] * dt, -50, 50);
                        alg.w_actor[i] = clamp(alg.w_actor[i] + cP.alpha_a * e * phi[i] * dt * 0.2, 8, 80);
                    }
                    u = alg.w_actor[0] * e - alg.w_actor[1] * v + pP.k * target; break;
                }
                    case 'CMAC-Cerebellar': {
                    const idx1 = clamp(Math.floor((x + 5) * 2), 0, 38);
                    const idx2 = idx1 + 1;
                    const u_pd = cP.kp_cmac * e - cP.kd_cmac * v;
                    const u_cmac = 0.5 * (alg.cmac_w[idx1] + alg.cmac_w[idx2]);
                    alg.cmac_w[idx1] = clamp(alg.cmac_w[idx1] + cP.eta_cmac * u_pd * dt * 0.2, -80, 80);
                    alg.cmac_w[idx2] = clamp(alg.cmac_w[idx2] + cP.eta_cmac * u_pd * dt * 0.2, -80, 80);
                    u = u_pd + u_cmac + pP.k * target; break;
                }
                    case 'SPSA-Optimizer': {
                    const delta_s = (alg.ticks % 2 === 0) ? 1 : -1;
                    const j_curr = e * e + 0.05 * v * v;
                    const g_hat = (j_curr - alg.spsa_j_prev) / (2 * cP.c_spsa * delta_s);
                    alg.spsa_kp = clamp((alg.spsa_kp || cP.kp_init) - cP.a_spsa * g_hat * dt, 15, 90);
                    alg.spsa_j_prev = j_curr;
                    u = alg.spsa_kp * e - 18 * v + pP.k * target; break;
                }
                    case 'VRFT-DataDriven': {
                    const r_virt = x + (2.0 / cP.m_bw) * v + (1.0 / (cP.m_bw * cP.m_bw)) * alg.a_filt;
                    const e_virt = r_virt - x;
                    alg.init_kp = clamp((alg.init_kp || 38) + cP.lr_vrft * e_virt * e * dt * 0.1, 15, 95);
                    u = alg.init_kp * e - cP.kd_base * v + pP.k * target; break;
                }

                // === 11. 有限时间与安全约束控制 ===
                    // === 【11. 有限时间与安全约束控制】 ===
                    case 'PPC': {
                    const rho_t = (cP.rho_0 - cP.rho_inf) * Math.exp(-cP.l * alg.t_target) + cP.rho_inf;
                    const safe_eps = clamp(e / Math.max(0.05, rho_t), -0.96, 0.96);
                    const z_ppc = 0.5 * Math.log((1 + safe_eps) / (1 - safe_eps));
                    u = cP.kp * z_ppc - cP.kd * v + pP.k * target;
                    alg.ref_display = rho_t; break;
                }
                    case 'Funnel-Control': {
                    const phi_t = (cP.phi0 - cP.phi_inf) * Math.exp(-cP.lam_f * alg.t_target) + cP.phi_inf;
                    const e_safe = clamp(e, -phi_t * 0.95, phi_t * 0.95);
                    const k_funnel = cP.kf / Math.max(0.05, phi_t * phi_t - e_safe * e_safe);
                    u = k_funnel * e - 18 * v + pP.k * target;
                    alg.ref_display = phi_t; break;
                }
                    case 'BLF': {
                    const e_blf = clamp(e, -cP.kb * 0.96, cP.kb * 0.96);
                    u = cP.kp * (e_blf / Math.max(0.05, cP.kb * cP.kb - e_blf * e_blf)) - cP.kd * v + pP.k * target; break;
                }
                    case 'Tan-BLF': {
                    const tan_arg = clamp((Math.PI * e * e) / (2 * cP.kb * cP.kb), -1.45, 1.45);
                    u = cP.kp * e * (1 + Math.pow(Math.tan(tan_arg), 2)) - cP.kd * v + pP.k * target; break;
                }
                    case 'TimeVary-BLF': {
                    const kb_t = (cP.kb0 - cP.kb_inf) * Math.exp(-cP.lb * alg.t_target) + cP.kb_inf;
                    const e_tvb = clamp(e, -kb_t * 0.95, kb_t * 0.95);
                    u = cP.kp * (e_tvb / Math.max(0.04, kb_t * kb_t - e_tvb * e_tvb)) * 8.0 - cP.kd * v + pP.k * target;
                    alg.ref_display = kb_t; break;
                }
                    case 'Integral-BLF': {
                    alg.integral = clamp(alg.integral + e * dt, -cP.kb_i * 0.92, cP.kb_i * 0.92);
                    const i_blf = alg.integral;
                    u = cP.kp * e + cP.ki * (i_blf / Math.max(0.1, cP.kb_i * cP.kb_i - i_blf * i_blf)) - cP.kd * v + pP.k * target; break;
                }
                    case 'CBF-QP': {
                    const u_nom = cP.kp_nom * e - 18 * v + pP.k * target;
                    const h_cbf = cP.vmax_safe * cP.vmax_safe - v * v;
                    const u_max_cbf = pP.k * x + pP.c * v + (pP.m * cP.alpha_cbf * h_cbf) / Math.max(0.2, 2 * Math.abs(v));
                    if (v > 0.2 && u_nom > u_max_cbf) u = u_max_cbf;
                    else if (v < -0.2 && u_nom < -u_max_cbf) u = -u_max_cbf;
                    else u = u_nom;
                    break;
                }
                    case 'CFTC': {
                    const beta_cftc = (2 * cP.alpha) / (1 + cP.alpha);
                    u = cP.kp * Math.pow(Math.abs(e), cP.alpha) * Math.sign(e) - cP.kd * Math.pow(Math.abs(v), beta_cftc) * Math.sign(v) + pP.k * target; break;
                }
                    case 'FxTC': {
                    u = cP.k1 * Math.pow(Math.abs(e), cP.p_q) * Math.sign(e) + cP.k2 * Math.pow(Math.abs(e), cP.r_s) * Math.sign(e) - 20 * v + pP.k * target; break;
                }
                    case 'PTC': {
                    const t_eff = Math.max(cP.Tp - alg.t_target, Math.max(0.25, cP.eps));
                    const u_cancel = pP.k * x + pP.c * v;
                    const u_ptc = pP.m * ((cP.kp / (t_eff * t_eff)) * e - (cP.kd / t_eff) * v);
                    u = u_cancel + u_ptc; break;
                }

                // === 12. 时滞补偿、网络化与高阶前沿 ===
                    // === 【12. 时滞补偿、网络化与高阶前沿】 ===
                    case 'InputShaping': {
                    const wn_zv = Math.sqrt(Math.max(0.2, pP.k) / pP.m);
                    const zeta_zv = clamp(pP.c / (2 * Math.sqrt(Math.max(0.2, pP.k) * pP.m)), 0.01, 0.9);
                    const K_zv = Math.exp((-zeta_zv * Math.PI) / Math.sqrt(1 - zeta_zv * zeta_zv));
                    const td_zv = Math.min(1.5, Math.PI / (wn_zv * Math.sqrt(1 - zeta_zv * zeta_zv)));
                    const A1 = 1 / (1 + K_zv); const A2 = K_zv / (1 + K_zv);
                    let r_shaped = target;
                    if (alg.target_history.length > 0) {
                        const hist = alg.target_history[alg.target_history.length - 1];
                        r_shaped = (currTime >= hist.t ? A1 * hist.val : 0) + (currTime >= hist.t + td_zv * 0.35 ? A2 * hist.val : 0);
                    }
                    u = cP.kp * (r_shaped - x) - cP.kd * v + pP.k * r_shaped;
                    alg.ref_display = r_shaped; break;
                }
                    case 'Posicast': {
                    let r_pos = target;
                    if (alg.target_history.length > 0) {
                        const hist = alg.target_history[alg.target_history.length - 1];
                        r_pos = (1 - cP.k_pos) * hist.val + (currTime >= hist.t + cP.td ? cP.k_pos * hist.val : 0);
                    }
                    u = cP.kp * (r_pos - x) - cP.kd * v + pP.k * r_pos;
                    alg.ref_display = r_pos; break;
                }
                    case 'SmithPredict': {
                    const delay_idx = Math.min(198, Math.max(1, Math.floor(cP.delay_t / dt)));
                    const a_sim = (alg.u_prev - pP.k * alg.xm_imc - pP.c * alg.vm_imc) / pP.m;
                    alg.vm_imc += a_sim * dt; alg.xm_imc += alg.vm_imc * dt;
                    const x_sim_delay = alg.x_delay_buf[delay_idx] || x;
                    u = cP.kp * (target - x - 0.35 * (alg.xm_imc - x_sim_delay)) - cP.kd * v + pP.k * target; break;
                }
                    case 'Artstein-Reduction': {
                    const d_a = Math.min(100, Math.max(1, Math.floor(cP.delay_a)));
                    let integral_u = 0;
                    for (let j = 0; j < d_a; j++) { integral_u += Math.exp(-0.2 * j * dt) * (alg.u_delay_buf[j] || 0) * dt * 0.05; }
                    const z_art = x + integral_u;
                    u = cP.kp * (target - z_art) - cP.kd * v + pP.k * target; break;
                }
                    case 'TDC': {
                    const a_prev = alg.a_filt;
                    const F_tdc = clamp(a_prev - alg.u_prev / cP.m_nom, -80, 80);
                    u = cP.m_nom * (cP.kp * e - cP.kd * v - 0.6 * F_tdc) + pP.k * target; break;
                }
                    case 'IMC': {
                    const am_imc = (alg.u_prev - pP.k * alg.xm_imc - pP.c * alg.vm_imc) / pP.m + 3.0 * (x - alg.xm_imc) + 1.5 * (v - alg.vm_imc);
                    alg.vm_imc = clamp(alg.vm_imc + am_imc * dt, -50, 50);
                    alg.xm_imc = clamp(alg.xm_imc + alg.vm_imc * dt, -30, 30);
                    const d_imc = x - alg.xm_imc;
                    const r_mod = target - 0.65 * d_imc;
                    alg.integral = clamp(alg.integral + (r_mod - x) * dt, -50, 50);
                    u = cP.kp * (r_mod - x) + cP.ki * alg.integral - cP.kd * v + pP.k * target; break;
                }
                    case 'ILC': {
                    if (alg.ilc_idx < 1000) {
                        alg.ilc_memory[alg.ilc_idx] = clamp(alg.ilc_memory[alg.ilc_idx] + cP.gamma_ilc * e, -80, 80);
                        u = alg.ilc_memory[alg.ilc_idx] + cP.kp_base * e - 15 * v + pP.k * target;
                        alg.ilc_idx++;
                    } else {
                        u = cP.kp_base * e - 15 * v + pP.k * target;
                    }
                    break;
                }
                    case 'Repetitive': {
                    alg.rep_queue[alg.rep_idx] = e;
                    const e_delayed = alg.rep_queue[(alg.rep_idx + 1) % 50];
                    const u_rc = clamp(cP.q_filter * (alg.d_hat || 0) + cP.k_rc * e_delayed, -80, 80);
                    alg.d_hat = u_rc;
                    u = u_rc + 35 * e - 16 * v + pP.k * target;
                    alg.rep_idx = (alg.rep_idx + 1) % 50; break;
                }
                    case 'GainSched': {
                    const alpha_gs = clamp(Math.abs(e) / cP.bnd, 0, 1);
                    const kp_curr = alpha_gs * cP.kp_far + (1 - alpha_gs) * cP.kp_near;
                    u = kp_curr * e - 20 * v + pP.k * target; break;
                }
                    case 'Switched': {
                    const V_lyap = 0.5 * e * e + 0.5 * v * v;
                    if (currTime - alg.last_switch_time > cP.dwell) {
                        if (V_lyap > 1.0 && alg.switch_state !== 1) { alg.switch_state = 1; alg.last_switch_time = currTime; }
                        else if (V_lyap <= 1.0 && alg.switch_state !== 2) { alg.switch_state = 2; alg.last_switch_time = currTime; }
                    }
                    u = alg.switch_state === 1 ? (cP.p_fast * 16 * e - 12 * v + pP.k * target) : (cP.p_slow * 14 * e - 22 * v + pP.k * target); break;
                }
                    case 'DynPole': {
                        const dyn_p = cP.p_min + (cP.p_max - cP.p_min) * Math.exp(-cP.alpha_p * Math.abs(e));
                        const k1_dp = pP.m * (dyn_p * dyn_p) - pP.k; const k2_dp = pP.m * (2 * dyn_p) - pP.c;
                        u = -k1_dp * x - k2_dp * v + (k1_dp + pP.k) * target; break;
                    }
                    case 'ETC': {
                    if (Math.abs(e - alg.last_e_etc) > cP.sigma * Math.abs(e) + cP.eps0 || alg.t_target < dt * 2) {
                        alg.last_u_etc = cP.kp * e - cP.kd * v + pP.k * target;
                        alg.last_e_etc = e;
                    }
                    u = alg.last_u_etc; break;
                }
                    case 'Event-Triggered-MPC': {
                    const H = (cP.t_pred * cP.t_pred) / (2 * pP.m);
                    const x_free = x + v * cP.t_pred - H * (pP.c * v + pP.k * x);
                    if (Math.abs(e - (alg.last_e_etc || 0)) > cP.et_limit * 0.5 || Math.abs(v) > 0.25 || currTime < dt * 2) {
                        alg.u_hold = (H * (target - x_free) + cP.lambda * pP.k * target) / (H * H + cP.lambda);
                        alg.last_e_etc = e;
                    }
                    u = alg.u_hold; break;
                }
                    case 'Quantized-Ctrl': {
                    const u_qc_raw = cP.kp * e - cP.kd * v + pP.k * target;
                    u = Math.round(u_qc_raw / cP.q_step) * cP.q_step; break;
                }
                    case 'Extended-Luenberger': {
                    alg.l_x += (alg.l_v + cP.l_gain * (x - alg.l_x)) * dt;
                    alg.l_v += ((alg.u_prev - pP.k * alg.l_x - pP.c * alg.l_v) / pP.m + cP.l_gain * (x - alg.l_x)) * dt;
                    u = cP.kp * (target - alg.l_x) - cP.kd * alg.l_v + pP.k * target; break;
                }
                    case 'EKF-Ctrl': {
                    const gain_k = clamp(cP.q_cov / Math.max(0.1, cP.r_cov), 2, 40);
                    alg.l_x += (alg.l_v + gain_k * (x - alg.l_x)) * dt;
                    alg.l_v += ((alg.u_prev - pP.k * alg.l_x - pP.c * alg.l_v) / pP.m + gain_k * (v - alg.l_v)) * dt;
                    u = cP.kp * (target - alg.l_x) - cP.kd * alg.l_v + pP.k * target; break;
                }
                    case 'Particle-Filter': {
                    const n_p = Math.min(50, Math.max(5, Math.floor(cP.p_num)));
                    let sum_p = 0;
                    for (let i = 0; i < n_p; i++) {
                        alg.pf_particles[i] = alg.pf_particles[i] + v * dt + 0.05 * gaussNoise() + (x - alg.pf_particles[i]) * 0.45;
                        sum_p += alg.pf_particles[i];
                    }
                    const x_pf = sum_p / n_p;
                    u = cP.kp * (target - x_pf) - cP.kd * v + pP.k * target; break;
                }
                    case 'FO-PD': {
                    const wi_pd = calcGLWeights(cP.mu, 30);
                    let dE_pd = 0;
                    for (let j = 0; j < 30; j++) dE_pd += wi_pd[j] * (alg.e_hist[j] || 0);
                    const fo_deriv = clamp(dE_pd / Math.pow(dt, Math.min(1.15, cP.mu)), -80, 80);
                    u = cP.kp * e + cP.kd * 0.45 * fo_deriv - 0.55 * cP.kd * v + pP.k * target; break;
                }
                    case 'Nonlinear-Power-ADRC': {
                    const fe = alg.z1 - x;
                    alg.z1 += (alg.z2 - cP.wo * Math.pow(Math.abs(fe), cP.alpha) * Math.sign(fe)) * dt;
                    alg.z2 += (alg.u_prev * cP.b0 - cP.wo * cP.wo * Math.pow(Math.abs(fe), cP.alpha) * Math.sign(fe)) * dt;
                    u = (cP.wc * cP.wc * (target - alg.z1) - 2 * cP.wc * v - alg.z2 * 0.25) / cP.b0; break;
                }
                    case 'Implicit-Euler-Ctrl': {
                    const s_ie = cP.c_surf * e - v;
                    u = pP.k * x + pP.c * v - pP.m * cP.c_surf * v + (s_ie / (1 + cP.lambda * dt)) * 65.0; break;
                }
                    case 'Lorenz-Coupled': {
                    alg.l_x_l = clamp(alg.l_x_l + (10 * (alg.l_y_l - alg.l_x_l)) * dt * 0.5, -30, 30);
                    alg.l_y_l = clamp(alg.l_y_l + (alg.l_x_l * (cP.rho - alg.l_z_l) - alg.l_y_l) * dt * 0.5, -30, 30);
                    alg.l_z_l = clamp(alg.l_z_l + (alg.l_x_l * alg.l_y_l - (8 / 3) * alg.l_z_l) * dt * 0.5, 0, 60);
                    const chaos_ref = target - 0.06 * alg.l_x_l;
                    u = cP.kp * (chaos_ref - x) - cP.kd * v + pP.k * x;
                    alg.ref_display = chaos_ref; break;
                }
                    case 'Speed-Gradient': {
                    alg.integral = clamp(alg.integral + cP.gamma_sg * (e - 0.35 * v) * dt, -60, 60);
                    u = cP.q_weight * alg.integral + 25 * e - 16 * v + pP.k * target; break;
                }
default: u = 0;
                }
                
                const MAX_FORCE = loopStateRef.current.actuatorLimit;
                u = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, u));
                alg.u_prev = u;
                alg.v_prev = v;
                return u;
            };

            /* 目标波形按对象量程缩放：倒立摆是 rad（±0.7），平移对象是 m（±2~12） */
            const plantTargetWave = (base, mode, t, plantId) => {
                const view = (D.PLANT_VIEWS && D.PLANT_VIEWS[plantId]) || { min: -2, max: 12 };
                const amp = (view.max - view.min) * 0.28;
                if (mode === 'sine') return base + amp * Math.sin(1.0 * t);
                if (mode === 'square') return base + amp * 0.75 * Math.sign(Math.sin(0.5 * t));
                return base;
            };

            const updatePhysics = () => {
                const state = stateRef.current;
                const { physParams: rawPhys, ctrlParams: cP, method: currMethod, targetMode, contDisturbance, sensorNoise, coulombFriction, actuatorDeadzone, plantDelay, plantId, plantParams } = loopStateRef.current;

                // 被控对象模型：默认 msd 与 V2.1 的动力学公式完全一致
                const plant = D.PLANTS[plantId] || D.PLANTS.msd;
                const pplant = (plantParams && plantParams[plant.id]) || plant.defaults;
                const eff = plant.effective(pplant);
                const pP = { ...rawPhys, m: eff.m, c: eff.c, k: eff.k };

                let activeTarget = plantTargetWave(pP.target, targetMode, state.t, plant.id);
                /* 倒立摆进阶：外环把小车位置误差映射为期望倾角，内环控制器跟踪该倾角 */
                if (plant.id === 'pendulum' && settings.cartLoop === 'on') {
                    const xr = settings.cartTarget || 0;
                    const lim = settings.cartThetaMax || 0.25;
                    const thRef = (settings.cartKp || 0.8) * (xr - (state.xc || 0)) - (settings.cartKd || 2.0) * (state.vc || 0);
                    activeTarget = Math.max(-lim, Math.min(lim, thRef));
                }

                const nx = sensorNoise > 0 ? sensorNoise * gaussNoise() : 0;
                const nv = sensorNoise > 0 ? (sensorNoise * 2.0) * gaussNoise() : 0;

                let u = calculateControlOutput(DT, state.x + nx, state.v + nv, activeTarget, pP, cP, state.alg, currMethod, state.t);

                const inputSign = plant.id === 'pendulum' ? -1 : 1;
                // 指标只在录制期间累加：波形定格后 RMSE / 能耗同步冻结
                const holdForce = plant.holdForce(activeTarget, pplant) || 0;
                if (!chartStateRef.current.frozen) {
                    state.alg.rmse_sum = (state.alg.rmse_sum || 0) + Math.pow(activeTarget - state.x, 2);
                    state.alg.energy = (state.alg.energy || 0) + Math.pow(u, 2) * DT;
                    state.alg.energy_dyn = (state.alg.energy_dyn || 0) + Math.pow(inputSign * u - holdForce, 2) * DT;
                    state.alg.ticks = (state.alg.ticks || 0) + 1;

                    /* 超调量 σ%（移植自 index(14).html 的 max_overshoot）：
                       以「起点→目标」的指令幅度为基准，记录越过目标一侧的最大百分比 */
                    const stepDist = Math.abs(activeTarget - settings.initialX);
                    if (stepDist > 1e-3) {
                        const dirSign = activeTarget >= settings.initialX ? 1 : -1;
                        const over = (state.x - activeTarget) * dirSign;
                        if (over > 0) {
                            const pct = (over / stepDist) * 100;
                            if (pct > (state.alg.max_overshoot || 0)) state.alg.max_overshoot = pct;
                        }
                    }

                    /* 调节时间 t_s：误差首次进入 ±2% 指令带（带下限）且速度足够小；
                       之后若重新越界则作废，取「最后一次进入」的时刻 */
                    const band = Math.max(0.02 * stepDist, 0.01);
                    const inBand = Math.abs(activeTarget - state.x) <= band && Math.abs(state.v) <= Math.max(0.05, 0.3 * band);
                    if (inBand && state.t > 0.2) {
                        if (state.alg.t_settle === undefined) state.alg.t_settle = state.t;
                    } else if (!inBand && Math.abs(activeTarget - state.x) > band * 1.6) {
                        state.alg.t_settle = undefined;
                    }

                    /* 控制输入纹波 σ(u)：均值已扣除，滑动窗口约 0.8 s；稳态时该值越大说明抖振越重 */
                    const alpha = Math.min(1, DT / 0.8);
                    const m1 = state.alg.u_m1 === undefined ? u : state.alg.u_m1 + alpha * (u - state.alg.u_m1);
                    const m2 = state.alg.u_m2 === undefined ? u * u : state.alg.u_m2 + alpha * (u * u - state.alg.u_m2);
                    state.alg.u_m1 = m1;
                    state.alg.u_m2 = m2;
                    /* 开关动作频率：滑模类切换项的翻转速率（次/秒），刻画抖振的高频程度 */
                    const swTotal = state.alg.chatter_sw || 0;
                    const swDelta = swTotal - (state.alg.chatter_sw_prev || 0);
                    state.alg.chatter_sw_prev = swTotal;
                    const prevRate = state.alg.sw_rate === undefined ? 0 : state.alg.sw_rate;
                    state.alg.sw_rate = prevRate + alpha * (swDelta / DT - prevRate);
                }

                state.alg.u_hw_buffer.unshift(u);
                if (state.alg.u_hw_buffer.length > 100) state.alg.u_hw_buffer.pop();

                let u_delayed = state.alg.u_hw_buffer[Math.min(99, Math.floor(plantDelay))] || 0;
                let u_actual = u_delayed;

                if (Math.abs(u_actual) < actuatorDeadzone) {
                    u_actual = 0;
                } else {
                    u_actual = u_actual > 0 ? u_actual - actuatorDeadzone : u_actual + actuatorDeadzone;
                }

                const F_actual = inputSign * u_actual;
                lastU = F_actual;
                let ext_f = contDisturbance;
                if (impulseRef.current > 0) {
                    ext_f += impulseRef.current;
                    impulseRef.current *= 0.8;
                    if (impulseRef.current < 1.0) impulseRef.current = 0;
                }

                let friction_force = 0;
                if (coulombFriction > 0) {
                    if (Math.abs(state.v) > 0.01) {
                        friction_force = -coulombFriction * Math.sign(state.v);
                    } else {
                        const driving_f = u_actual + ext_f - (plant.restoring(state, pplant) || 0);
                        if (Math.abs(driving_f) < coulombFriction) {
                            friction_force = -driving_f;
                        } else {
                            friction_force = -coulombFriction * Math.sign(driving_f);
                        }
                    }
                }

                /* 真实执行器推力：控制量 u 与推力 F 反号（u 正使摆角增大，F 正把摆角推回） */
                if (plant.id === 'pendulum') {
                    /* 摆杆转动与小车平动联立：θ̈、ẍ_c 同时积分，小车会真实移动 */
                    const M = pplant.M, mm = pplant.m, ll = pplant.l, cc = pplant.c;
                    let thDD;
                    if (settings.balanceAssist !== 'off') {
                        /* 摆平衡辅助（默认开启，与 index(14).html 同款「隐藏 PD」）：
                           摆角由内置 PD 主导稳定，控制力只以 18% 强度经小车加速度弱耦合作用于摆，
                           使 P/PI/开环乃至对 k<0 不适配的预测类方法都能稳住摆、专注演示各自特性；
                           关闭后回到真实不稳定拉格朗日动力学。 */
                        const g = D.GRAVITY;
                        const fb = Math.min(4.5, Math.max(1.0, Math.abs(F_actual) / (mm * 8.0) + 1.2));
                        const damp = 3.2 + 0.5 * cc;
                        thDD = (g / ll) * state.x - (cc * state.v) / (M * ll)
                             - ((g / ll) * 1.65 * fb * state.x + damp * state.v);
                    } else {
                        thDD = ((M + mm) * D.GRAVITY * state.x - cc * state.v - F_actual) / (M * ll);
                    }
                    let xDD = (F_actual - mm * ll * thDD) / (M + mm);
                    if (settings.balanceAssist !== 'off') {
                        /* 教学简化：小车位置 / 速度软回中，避免「只控摆角」时小车无限漂出画面 */
                        xDD -= 0.6 * (state.xc || 0) + 1.2 * (state.vc || 0);
                    }
                    state.v += thDD * DT;
                    state.x += state.v * DT;
                    state.vc = (state.vc || 0) + xDD * DT;
                    state.xc = (state.xc || 0) + state.vc * DT;
                    if (settings.balanceAssist !== 'off') {
                        /* 教学简化：小车软边界，个别内模失配方法持续偏置时也不致飞出画面 */
                        if (state.xc > 8) { state.xc = 8; if (state.vc > 0) state.vc = 0; }
                        else if (state.xc < -8) { state.xc = -8; if (state.vc < 0) state.vc = 0; }
                    }
                } else if (plant.order === 2) {
                    const a = plant.accel(state, u_actual, ext_f, friction_force, pplant);
                    state.v += a * DT;
                    state.x += state.v * DT;
                } else {
                    const flow = plant.flow(state, u_actual, ext_f, friction_force, pplant);
                    state.v = flow;
                    state.x += flow * DT;
                }
                state.t += DT;

                // 冻结判定必须使用当前指令值（阶跃/正弦/方波通用）
                const err = Math.abs(state.x - activeTarget);
                const absV = Math.abs(state.v);
                /* 倒立摆额外要求小车基本静止：非零目标角或残留稳态角误差会让
                   小车持续加速，此时摆角虽“接近目标”但系统并未真正收敛，
                   不应定格（否则曲线被截断、看起来误差没收敛）。 */
                const cartStill = plant.id !== 'pendulum' || Math.abs(state.vc || 0) < 0.03;
                const settled = err < 0.02 && absV < 0.02 && cartStill;
                if (settled && state.t > 1.0) {
                    chartStateRef.current.freezeTimer += DT;
                } else {
                    chartStateRef.current.freezeTimer = 0;
                    chartStateRef.current.frozen = false;
                }

                if (chartStateRef.current.freezeTimer > 2.0 && impulseRef.current === 0) {
                    chartStateRef.current.frozen = true;
                }

                if (!chartStateRef.current.frozen) {
                    historyRef.current.push({
                        t: state.t, x: state.x, v: state.v, u: F_actual, target: activeTarget,
                        ref: state.alg.ref_display || state.alg.xm, hold: holdForce,
                        xc: state.xc || 0, vc: state.vc || 0
                    });
                    if (historyRef.current.length > 2500) {
                        chartStateRef.current.frozen = true;
                    }
                }
            };

  /* ── 影子推演：不污染真实通道 / 曲线 / 指标 ───────────────
     把 stateRef / historyRef / chartStateRef / impulseRef 临时换成一次性的对象，
     复用 updatePhysics 里同一套物理积分与控制律，跑完再整体还原。
     chartStateRef 置成 frozen=false 时记录只会写进一次性数组，天然丢弃。 */
  function withShadowRollout(method, candParams, steps, visit) {
    const savedState = stateRef.current;
    const savedHistory = historyRef.current;
    const savedChartRef = chartStateRef.current;
    const savedImpulse = impulseRef.current;
    const savedLastU = lastU;
    const savedParams = settings.ctrlParams;
    const savedMethod = settings.method;

    const shadow = { x: settings.initialX, v: 0, xc: 0, vc: 0, t: 0, alg: {} };
    stateRef.current = shadow;
    historyRef.current = [];
    chartStateRef.current = { frozen: false, freezeTimer: 0 };
    impulseRef.current = 0;
    settings.ctrlParams = candParams;
    settings.method = method;
    resetAlgState(method, settings.physParams.target);

    try {
      for (let i = 0; i < steps; i++) {
        updatePhysics();
        if (visit) visit(shadow, lastU);
      }
    } finally {
      stateRef.current = savedState;
      historyRef.current = savedHistory;
      chartStateRef.current = savedChartRef;
      impulseRef.current = savedImpulse;
      lastU = savedLastU;
      settings.ctrlParams = savedParams;
      settings.method = savedMethod;
    }
    return shadow;
  }

  /* ── 最优增益求解（移植自 index(14).html 的 computeOptimalGainsForMethod）
     代价泛函 J = ITAE + ISE + 倒立摆倾角 + 能耗 + 抖振 + 超调/末端残差惩罚；
     起点取「当前值 / 方法默认值 / 理论最优种子」三者中代价最小者，
     然后在每个参数的 [min,max] 盒内做多尺度坐标模式搜索（3 轮，逐轮细化）。 */
  const SOLVE_HORIZON = 200;      /* 4.0 s 完整闭环轨迹 */
  const SCALE_MULS = [0.35, 0.55, 0.75, 0.88, 1.12, 1.28, 1.55, 1.9, 2.4];
  const STEP_DELTAS = [-6, -3, -2, -1, 1, 2, 3, 6];

  function costOfTrajectory(method, cand) {
    const isPend = getPlant().id === 'pendulum';
    let cost = 0;
    let uPrev = 0;
    const shadow = withShadowRollout(method, cand, SOLVE_HORIZON, (st, u) => {
      const target = plantTargetWave(settings.physParams.target, settings.targetMode, st.t, settings.plantId);
      const e = target - st.x;
      const du = u - uPrev;
      uPrev = u;
      cost += (1 + 2.8 * st.t) * Math.abs(e) * DT + 3.5 * e * e * DT;
      /* 倒立摆：state.x 即摆角，额外惩罚倾角与角速度 */
      if (isPend) cost += 65 * st.x * st.x * DT + 8 * st.v * st.v * DT;
      cost += 0.0005 * u * u * DT + 0.0018 * du * du * DT;
    });
    const overPct = shadow.alg.max_overshoot || 0;
    const finalErr = Math.abs(settings.physParams.target - shadow.x);
    const finalVel = Math.abs(shadow.v);
    cost += 0.45 * overPct * overPct + 45 * finalErr * finalErr + 8 * finalVel * finalVel;
    return Number.isFinite(cost) ? cost : 1e9;
  }

  function snapParam(v, minV, maxV, stepV) {
    const s = Math.max(1e-9, stepV || 0.01);
    const snapped = Math.round(clamp(v, minV, maxV) / s) * s;
    return Number(clamp(snapped, minV, maxV).toFixed(4));
  }

  function optimizeGains(method, startParams) {
    const target = method || settings.method;
    const conf = D.CONTROLLER_CONFIGS[target];
    const start = { ...(startParams || settings.ctrlParams) };
    if (!conf || !conf.params) return { params: start, improvePct: 0, ruleName: '解析默认律' };

    const plant = getPlant();
    const pplant = getPlantParams();
    const eff = plant.effective(pplant);
    const pP = { ...settings.physParams, m: eff.m, c: eff.c, k: eff.k };
    const cfg = {
      plantType: plant.id === 'pendulum' ? 'pendulum' : 'slider',
      contDisturbance: settings.contDisturbance || 0,
      coulombFriction: settings.coulombFriction || 0,
      plantDelay: settings.plantDelay || 0,
      initialX: settings.initialX || 0
    };

    /* 候选起点：当前 / 默认 / 理论最优种子 */
    let best = { ...start };
    let bestCost = costOfTrajectory(target, best);
    const initCost = bestCost;
    let ruleName = '极点配置与ITAE泛函联合寻优';

    const defParams = getDefaultParams(target);
    const defCost = costOfTrajectory(target, defParams);
    if (defCost < bestCost) { bestCost = defCost; best = { ...defParams }; }

    const seedRes = D.getTheoreticalOptimalSeed ? D.getTheoreticalOptimalSeed(target, pP, cfg) : null;
    if (seedRes) {
      if (seedRes.ruleName) ruleName = seedRes.ruleName;
      const seedCost = costOfTrajectory(target, seedRes.seed);
      if (seedCost < bestCost) { bestCost = seedCost; best = { ...seedRes.seed }; }
    }

    /* 多尺度坐标模式搜索 */
    const entries = Object.entries(conf.params);
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < entries.length; i++) {
        const key = entries[i][0];
        const [defV, minV, maxV, stepV] = entries[i][1];
        if (!Number.isFinite(best[key]) || typeof best[key] !== 'number') continue;
        const curr = best[key];
        const span = maxV - minV;
        const factor = round === 0 ? 3 : (round === 1 ? 2 : 1);
        const cands = new Set();
        const push = (v) => cands.add(snapParam(v, minV, maxV, stepV));

        SCALE_MULS.forEach((mul) => push(curr * mul));
        STEP_DELTAS.forEach((d) => push(curr + d * factor * stepV));
        if (round === 0) [0.15, 0.3, 0.5, 0.7, 0.85].forEach((q) => push(minV + q * span));
        push(defV);
        push(curr);

        cands.forEach((val) => {
          if (val === best[key]) return;
          const trial = { ...best, [key]: val };
          const c = costOfTrajectory(target, trial);
          if (c < bestCost) { bestCost = c; best = trial; }
        });
      }
    }

    const improvePct = initCost > 1e-4 ? Math.max(0, (initCost - bestCost) / initCost * 100) : 0;
    return { params: best, improvePct, cost: bestCost, ruleName };
  }

  /* ── 快速推演：把若干秒的闭环一次性算完（对决预设 / 自动收敛对比用） ── */
  function fastForward(seconds) {
    const n = Math.min(2000, Math.max(1, Math.round((seconds || 1) / DT)));
    for (let i = 0; i < n; i++) updatePhysics();
    syncTrack();
    markDirty();
  }

  /* ── 经典对决：A 跑完一段 → 清点轨迹 → 切到 B 再跑一段（曲线叠加对比） ──
     optimize 为 true 时先给每种方法求解一次最优增益，保证「最佳状态下的公平对决」。 */
  function duelLeg(key, seconds, optimize) {
    settings.method = key;
    applyTuning(key);
    if (optimize) settings.ctrlParams = optimizeGains(key, settings.ctrlParams).params;
    stateRef.current = { x: settings.initialX, v: 0, xc: 0, vc: 0, t: 0, alg: {} };
    resetAlgState(key, settings.physParams.target);
    impulseRef.current = 0;
    createTrack();
    fastForward(seconds);
  }

  function duel(a, b, options) {
    const opt = options || {};
    if (!D.CONTROLLER_CONFIGS[a] || !D.CONTROLLER_CONFIGS[b]) return null;
    const seconds = Math.max(1, Math.min(8, opt.seconds || 3.5));
    compareMode = true;
    tracks = [];
    trackSeq = 0;
    activeTrack = null;
    settings.running = false;

    duelLeg(a, seconds, !!opt.optimize);
    duelLeg(b, seconds, !!opt.optimize);

    settings.running = false;
    markDirty();
    return { a, b, tracks: tracks.length };
  }

  /* ── 轨迹管理 ─────────────────────────────────────── */
  function syncTrack() {
    if (!activeTrack) return;
    const alg = stateRef.current.alg || {};
    activeTrack.rmse_sum = alg.rmse_sum || 0;
    activeTrack.energy = alg.energy || 0;
    activeTrack.energy_dyn = alg.energy_dyn || 0;
    activeTrack.ticks = alg.ticks || 0;
    activeTrack.rmse = activeTrack.ticks ? Math.sqrt(activeTrack.rmse_sum / activeTrack.ticks) : 0;
    activeTrack.frozen = chartStateRef.current.frozen;
    activeTrack.freezeTimer = chartStateRef.current.freezeTimer;
    activeTrack.method = settings.method;
  }

  function createTrack() {
    const idx = tracks.length;
    const track = {
      id: ++trackSeq,
      label: String.fromCharCode(65 + (idx % 26)),
      method: settings.method,
      color: TRACK_COLORS[idx % TRACK_COLORS.length],
      points: [],
      frozen: false, freezeTimer: 0,
      rmse_sum: 0, energy: 0, energy_dyn: 0, ticks: 0, rmse: 0
    };
    tracks.push(track);
    if (tracks.length > MAX_TRACKS) tracks.shift();
    activeTrack = track;
    historyRef.current = track.points;
    chartStateRef.current.frozen = false;
    chartStateRef.current.freezeTimer = 0;
    accumulator = 0;
    lastU = 0;
    markDirty();
    return track;
  }

  /* ── 与 V2.1 交互等价的状态操作 ──────────────────── */
  function resetSim(method = settings.method, target = settings.physParams.target, initX = settings.initialX) {
    settings.method = method;
    stateRef.current = { x: initX, v: 0, xc: 0, vc: 0, t: 0, alg: {} };
    resetAlgState(method, target);
    if (compareMode && tracks.length) {
      syncTrack();
      createTrack();
    } else {
      tracks = [];
      trackSeq = 0;
      createTrack();
    }
    impulseRef.current = 0;
    settings.running = false;
    markDirty();
  }

  function applyTuning(method) {
    const plant = D.PLANTS[settings.plantId] || D.PLANTS.msd;
    const pplant = (settings.plantParams && settings.plantParams[plant.id]) || plant.defaults;
    const eff = (plant.effective && plant.effective(pplant)) || { m: 2, c: 0.5, k: 1 };
    const pP = { ...settings.physParams, m: eff.m, c: eff.c, k: eff.k };
    const cfg = {
      plantType: plant.id === 'pendulum' ? 'pendulum' : 'slider',
      contDisturbance: settings.contDisturbance || 0,
      coulombFriction: settings.coulombFriction || 0,
      plantDelay: settings.plantDelay || 0,
      initialX: settings.initialX || 0
    };
    /* msd / pendulum 走「理论最优种子」：让 159 种方法都拿到适配当前对象的默认参数，
       与 index(14).html 的 getTheoreticalOptimalSeed 一致；其它对象保持原默认值。 */
    let base;
    if ((plant.id === 'msd' || plant.id === 'pendulum') && D.getTheoreticalOptimalSeed) {
      base = D.getTheoreticalOptimalSeed(method, pP, cfg).seed;
    } else {
      base = getDefaultParams(method);
    }
    const over = (D.DEFAULT_OVERRIDES && D.DEFAULT_OVERRIDES[method]) || {};
    const plantOver = (D.PLANT_TUNING && D.PLANT_TUNING[settings.plantId] && D.PLANT_TUNING[settings.plantId][method]) || {};
    Object.keys(over).forEach((k) => { if (k in base) base[k] = over[k]; });
    Object.keys(plantOver).forEach((k) => { if (k in base) base[k] = plantOver[k]; });
    settings.ctrlParams = base;
  }

  function setMethod(method) {
    if (!CONTROLLER_CONFIGS[method]) return false;
    settings.method = method;
    applyTuning(method);
    resetSim(method, settings.physParams.target, settings.initialX);
    return true;
  }

  /* 参数合法范围：与 ui.js renderParams 的范围来源完全一致（单一事实源在 data.js），
     数值输入超界时钳制回界内，避免负质量/负限幅等非法值进入积分器 */
  function paramRange(key, store) {
    if (store === 'ctrl') {
      const conf = CONTROLLER_CONFIGS[settings.method];
      const p = conf && conf.params && conf.params[key];
      if (p) return { min: p[1], max: p[2] };
      const smeta = D.SLIDING_META && D.SLIDING_META[settings.method];
      const m = smeta && smeta[key];
      if (m && m.type !== 'select' && typeof m.min === 'number') return { min: m.min, max: m.max };
      return null;
    }
    if (store === 'plant') {
      const plant = D.PLANTS[settings.plantId];
      const p = plant && plant.params.find((it) => it.key === key);
      return p ? { min: p.min, max: p.max } : null;
    }
    if (key === 'target' || key === 'initialX') {
      const view = D.PLANT_VIEWS && D.PLANT_VIEWS[settings.plantId];
      if (view && typeof view.min === 'number') return { min: view.min, max: view.max };
    }
    for (const section of D.PARAM_SECTIONS) {
      const item = section.items && section.items.find((it) => it.key === key);
      if (item && typeof item.min === 'number') return { min: item.min, max: item.max };
    }
    return null;
  }

  function setParam(key, value, store) {
    /* 只有纯数值字符串才转换；'tanh' / 'on' 这类下拉值必须原样保留 */
    let numeric = (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
      ? Number(value) : value;
    /* NaN/Infinity 拒绝（保留旧值）；有限数值按配置范围钳制 */
    if (typeof numeric === 'number') {
      if (!Number.isFinite(numeric)) { markDirty(); return getParam(key, store); }
      const range = paramRange(key, store);
      if (range) numeric = Math.max(range.min, Math.min(range.max, numeric));
    } else if (typeof numeric === 'string' && numeric.trim() !== '' && (store === 'ctrl' || store === 'phys' || store === 'plant')) {
      /* 数值存储收到非数值字符串（如 'abc'）：拒绝，保留旧值；
         'tanh' / 'on' 等合法下拉值不受影响（ctrl 里的 select 键不在数值配置内，原样放行） */
      const range = paramRange(key, store);
      const isNumericKey = store !== 'ctrl' || !!range;
      if (isNumericKey && !Number.isFinite(Number(numeric))) { markDirty(); return getParam(key, store); }
    }
    if (store === 'ctrl') {
      settings.ctrlParams[key] = numeric;
    } else if (store === 'phys') {
      settings.physParams[key] = numeric;
    } else if (store === 'plant') {
      const id = settings.plantId;
      if (!settings.plantParams[id]) settings.plantParams[id] = { ...(D.PLANTS[id] || D.PLANTS.msd).defaults }; 
      settings.plantParams[id][key] = numeric;
    } else {
      settings[key] = typeof numeric === 'number' && Number.isFinite(numeric) ? numeric : value;
    }
    markDirty();
    return numeric;
  }

  function getParam(key, store) {
    if (store === 'ctrl') return settings.ctrlParams[key];
    if (store === 'phys') return settings.physParams[key];
    if (store === 'plant') {
      const pp = settings.plantParams[settings.plantId];
      return pp ? pp[key] : undefined;
    }
    return settings[key];
  }

  function resetParams() {
    settings.physParams = { ...INITIAL_PARAMS };
    Object.assign(settings, DEFAULT_ENV);
    settings.speed = 1;
    const plant = getPlant();
    settings.plantParams[plant.id] = { ...plant.defaults };
    settings.physParams.target = plant.defaultTarget;
    settings.initialX = plant.defaultInitialX || 0;
    applyTuning(settings.method);
    resetSim(settings.method, settings.physParams.target, settings.initialX);
  }

  /* 只恢复某一个参数组的默认值（实验参数下各子卡片的「恢复本组」）：
     增益组走与切方法一致的 applyTuning（理论种子 + 覆盖项）；
     对象属性组走该对象 defaults；其余按 PARAM_SECTIONS 的 store 从默认环境/物理表取值。 */
  function resetParamGroup(sectionId) {
    const section = (D.PARAM_SECTIONS || []).find((s) => s.id === sectionId);
    if (!section) return false;
    const plant = getPlant();
    if (sectionId === 'gains') {
      applyTuning(settings.method);
    } else if (sectionId === 'plant') {
      settings.plantParams[plant.id] = { ...plant.defaults };
    } else {
      (section.items || []).forEach((item) => {
        if (item.store === 'phys') {
          if (item.key === 'target') settings.physParams.target = plant.defaultTarget;
          else if (INITIAL_PARAMS[item.key] !== undefined) settings.physParams[item.key] = INITIAL_PARAMS[item.key];
        } else if (item.key === 'initialX') {
          settings.initialX = plant.defaultInitialX || 0;
        } else if (DEFAULT_ENV[item.key] !== undefined) {
          settings[item.key] = DEFAULT_ENV[item.key];
        }
      });
    }
    resetSim(settings.method, settings.physParams.target, settings.initialX);
    return true;
  }

  function applyPreset(preset) {
    if (!preset || !CONTROLLER_CONFIGS[preset.method]) return false;
    if (preset.plant && D.PLANTS[preset.plant]) {
      settings.plantId = preset.plant;
      settings.initialX = D.PLANTS[preset.plant].defaultInitialX || 0;
    }
    const pid = settings.plantId;
    if (!settings.plantParams[pid]) settings.plantParams[pid] = { ...D.PLANTS[pid].defaults };
    if (preset.plantParams) Object.assign(settings.plantParams[pid], preset.plantParams);
    settings.method = preset.method;
    settings.physParams = { ...DEFAULT_PHYS, ...(preset.phys || {}) };
    if (!preset.phys || preset.phys.target === undefined) settings.physParams.target = getPlant().defaultTarget;
    Object.assign(settings, DEFAULT_ENV, preset.env || {});
    applyTuning(preset.method);
    Object.keys(preset.ctrl || {}).forEach((k) => {
      if (k in settings.ctrlParams) settings.ctrlParams[k] = preset.ctrl[k];
    });
    resetSim(preset.method, settings.physParams.target, settings.initialX);
    return true;
  }

  function triggerDisturbance() {
    /* 脉冲扰动量按对象量级缩放：平移对象 150 N，姿态通道是 rad 量纲（±0.7），
       150 N·m 会一帧把机体系打到几十弧度，故用 disturbanceScale 折算。 */
    const plant = getPlant();
    const scale = (typeof plant.disturbanceScale === 'number') ? plant.disturbanceScale : 1;
    impulseRef.current = 150.0 * scale;
    chartStateRef.current.frozen = false;
    chartStateRef.current.freezeTimer = 0;
    if (activeTrack) { activeTrack.frozen = false; activeTrack.freezeTimer = 0; }
    markDirty();
  }

  function rerecord() {
    if (!activeTrack) return;
    activeTrack.points.length = 0;
    historyRef.current = activeTrack.points;
    chartStateRef.current.frozen = false;
    chartStateRef.current.freezeTimer = 0;
    activeTrack.frozen = false;
    activeTrack.freezeTimer = 0;
    const alg = stateRef.current.alg;
    if (alg) { alg.rmse_sum = 0; alg.energy = 0; alg.energy_dyn = 0; alg.ticks = 0; }
    syncTrack();
    markDirty();
  }

  /* ── 固定时间步长主循环（物理时间与帧率解耦） ──────── */
  function advance(realDeltaSeconds) {
    if (!settings.running) return 0;
    accumulator += Math.min(Math.max(realDeltaSeconds, 0), 0.25) * settings.speed;
    let steps = 0;
    while (accumulator >= DT && steps < 240) {
      updatePhysics();
      accumulator -= DT;
      steps++;
    }
    if (steps > 0) {
      const pts = historyRef.current;
      if (pts.length) lastU = pts[pts.length - 1].u;
      syncTrack();
      markDirty();
    }
    return steps;
  }

  function stepOnce() {
    updatePhysics();
    const pts = historyRef.current;
    if (pts.length) lastU = pts[pts.length - 1].u;
    syncTrack();
    markDirty();
  }

  /* ── 只读查询 ─────────────────────────────────────── */
  function getActiveTarget() {
    if (settings.plantId === 'pendulum' && settings.cartLoop === 'on') {
      const st = stateRef.current;
      const lim = settings.cartThetaMax || 0.25;
      const thRef = (settings.cartKp || 0.8) * ((settings.cartTarget || 0) - (st.xc || 0)) - (settings.cartKd || 2.0) * (st.vc || 0);
      return Math.max(-lim, Math.min(lim, thRef));
    }
    return plantTargetWave(settings.physParams.target, settings.targetMode,
      stateRef.current.t, settings.plantId);
  }

  function getMetrics() {
    const s = stateRef.current;
    const alg = s.alg || {};
    const ticks = alg.ticks || 0;
    return {
      x: s.x, v: s.v, t: s.t, u: lastU,
      e: getActiveTarget() - s.x,
      rmse: ticks ? Math.sqrt((alg.rmse_sum || 0) / ticks) : 0,
      energy: alg.energy || 0,
      energyDyn: alg.energy_dyn || 0,
      holdForce: getHoldForce(),
      chatter: Math.sqrt(Math.max(0, (alg.u_m2 || 0) - (alg.u_m1 || 0) * (alg.u_m1 || 0))),
      chatterFreq: alg.sw_rate || 0,
      overshoot: alg.max_overshoot || 0,
      settle: alg.t_settle,
      frozen: chartStateRef.current.frozen,
      target: getActiveTarget()
    };
  }

  function setRunning(value) { settings.running = !!value; markDirty(); }
  function toggleRun() { settings.running = !settings.running; markDirty(); return settings.running; }
  function setSpeed(value) {
    const n = Number(value);
    const safe = Number.isFinite(n) && n > 0 ? n : 1;
    settings.speed = Math.round(Math.max(0.1, Math.min(10, safe)) * 100) / 100;
  }
  function getPlant() { return D.PLANTS[settings.plantId] || D.PLANTS.msd; }
  function getPlantParams() { const p = getPlant(); return settings.plantParams[p.id] || p.defaults; }
  function getHoldForce() { const p = getPlant(); return p.holdForce(getActiveTarget(), getPlantParams()) || 0; }
  function setPlant(id) {
    const p = D.PLANTS[id];
    if (!p) return false;
    settings.plantId = id;
    if (!settings.plantParams[id]) settings.plantParams[id] = { ...p.defaults };
    settings.physParams.target = p.defaultTarget;
    settings.initialX = p.defaultInitialX || 0;
    settings.actuatorLimit = p.defaultActuatorLimit || DEFAULT_ENV.actuatorLimit;
    applyTuning(settings.method);
    resetSim(settings.method, p.defaultTarget, settings.initialX);
    return true;
  }
  function setCompareMode(value) { compareMode = !!value; }
  function isCompareMode() { return compareMode; }
  function clearTracks() { tracks = []; trackSeq = 0; createTrack(); }
  function getTracks() { return tracks; }
  function getActiveTrack() { return activeTrack; }
  function getHistory() { return historyRef.current; }
  function getState() { return stateRef.current; }
  function getAlg() { return stateRef.current.alg; }
  function getSettings() { return settings; }
  function getImpulse() { return impulseRef.current; }
  function getChartState() { return chartStateRef.current; }
  function isFrozen() { return chartStateRef.current.frozen; }
  function getMaxPoints() { return MAX_POINTS; }

  /* ── 初始化（与 V2.1 的初始状态一致：PID、待机） ───── */
  resetAlgState('PID', INITIAL_PARAMS.target);
  createTrack();

  NS.sim = {
    DT, settings,
    setPlant, getPlant, getPlantParams, getHoldForce,
    resetSim, setMethod, setParam, resetParams, resetParamGroup, applyPreset,
    optimizeGains, fastForward, duel,
    triggerDisturbance, rerecord, advance, stepOnce,
    setRunning, toggleRun, setSpeed, setCompareMode, isCompareMode,
    clearTracks, getTracks, getActiveTrack, getHistory,
    getState, getAlg, getSettings, getMetrics, getActiveTarget,
    getImpulse, getChartState, isFrozen, getMaxPoints,
    markDirty, consumeDirty
  };
})(window);
