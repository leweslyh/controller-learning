/* ============================================================
   simulation.js — 仿真内核（不触碰 DOM）
   386:401 / 413:946 / 948:1027 自 V2.1 逐字迁移：
   resetAlgState 的约 60 个内部状态、99 条控制律分支、物理积分
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

            const resetAlgState = (methodName, currTarget = 5.0) => {
                stateRef.current.alg = {
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
                    l_x_l: 0.1, l_y_l: 0.1, l_z_l: 0.1, pf_particles: new Array(20).fill(0), f_adrc_z: 0
                };
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
                    if(alg.e0 === undefined) { alg.e0 = e; alg.v0 = v; } 
                    target_changed = true;
                }
                alg.t_target += dt;

                if (currentMethod === 'InputShaping' || currentMethod === 'Posicast') {
                    if (target_changed || alg.target_history.length === 0) alg.target_history.push({ t: currTime, val: target });
                }
                
                alg.x_delay_buf.unshift(x); alg.x_delay_buf.pop();
                alg.u_delay_buf.unshift(alg.u_prev||0); alg.u_delay_buf.pop();
                alg.e_hist.unshift(e); alg.e_hist.pop();

                switch (currentMethod) {
                    case 'OpenLoop': u = cP.u_static; break;
                    case 'P': u = cP.kp * e; break;
                    case 'PI': alg.integral += e * dt; u = cP.kp * e + cP.ki * alg.integral; break;
                    case 'PD': u = cP.kp * e - cP.kd * v + pP.k * target; break;
                    case 'PID': alg.integral = Math.max(-50, Math.min(50, alg.integral + e * dt)); u = cP.kp * e + cP.ki * alg.integral - cP.kd * v; break;
                    case 'IPD': alg.integral += e * dt; u = cP.ki * alg.integral - cP.kp * x - cP.kd * v; break;
                    case '2DOF-PID': alg.integral = Math.max(-50, Math.min(50, alg.integral + e * dt)); u = cP.kp * (cP.b * target - x) + cP.ki * alg.integral - cP.kd * v; break;
                    case 'IncPID': {
                        const delta_u = cP.kp * (e - (alg.e_prev||0)) + cP.ki * e + cP.kd * (e - 2 * (alg.e_prev||0) + (alg.e_prev2||0));
                        u = (alg.u_prev||0) + delta_u; alg.e_prev2 = alg.e_prev; alg.e_prev = e; break;
                    }
                    case 'PI-D': alg.integral += e * dt; u = cP.kp * e + cP.ki * alg.integral - cP.kd * v; break;
                    case 'Nested-PID': {
                        const v_d = cP.kp_out * e; alg.integral += (v_d - v) * dt;
                        u = cP.kp_in * (v_d - v) + cP.ki_in * alg.integral + pP.k * target; break;
                    }
                    case 'PolePlacement': {
                        const k1 = pP.m * (cP.p1 * cP.p2) - pP.k; const k2 = pP.m * (cP.p1 + cP.p2) - pP.c;
                        u = -k1 * x - k2 * v + (k1 + pP.k) * target; break;
                    }
                    case 'LQR': {
                        const lqr_kp = Math.sqrt(cP.q_x / cP.r_weight); const lqr_kd = Math.sqrt(cP.q_v / cP.r_weight + 2 * pP.m * lqr_kp);
                        u = lqr_kp * e - lqr_kd * v + pP.k * target; break;
                    }
                    case 'LQG': {
                        const y_meas = x + 0.1 * gaussNoise();
                        const a_kf = (alg.u_prev - pP.k * alg.x_kf - pP.c * alg.v_kf) / pP.m;
                        alg.x_kf += alg.v_kf * dt + 0.3 * (y_meas - alg.x_kf); alg.v_kf += a_kf * dt + 0.1 * (y_meas - alg.x_kf);
                        const lqg_kp = Math.sqrt(cP.q_x / cP.r_w); const lqg_kd = Math.sqrt(cP.q_v / cP.r_w + 2 * pP.m * lqg_kp);
                        u = lqg_kp * (target - alg.x_kf) - lqg_kd * alg.v_kf + pP.k * target; break;
                    }
                    case 'LQR-I': {
                        alg.integral += e * dt;
                        const k_lqi_x = Math.sqrt(cP.q_x / 1.0); const k_lqi_v = Math.sqrt(cP.q_v / 1.0); const k_lqi_i = Math.sqrt(cP.q_i / 1.0);
                        u = k_lqi_x * e - k_lqi_v * v + k_lqi_i * alg.integral; break;
                    }
                    case 'MPC': {
                        const H = (cP.t_pred * cP.t_pred) / (2 * pP.m);
                        const x_free = x + v * cP.t_pred - H * (pP.c * v + pP.k * x);
                        u = (H * (target - x_free) + cP.lambda * pP.k * target) / (H * H + cP.lambda); break;
                    }
                    case 'Deadbeat': u = (pP.m / (dt * dt)) * cP.kp_scale * e - (pP.m / dt + pP.c) * cP.kp_scale * v + pP.k * x; break;
                    case 'H-Infinity': {
                        const gamma_sq = cP.gamma * cP.gamma; const P22 = Math.sqrt(cP.q_x / Math.max(0.01, 1 - 1/gamma_sq)); const P12 = Math.sqrt(pP.m * P22);
                        u = P22 * e - P12 * v; break;
                    }
                    case 'QFT-LeadLag': {
                        const z_d = cP.zero; const p_d = cP.pole; const K_d = cP.gain;
                        const n0 = K_d * (2/dt + z_d); const n1 = K_d * (z_d - 2/dt); const d0 = 2/dt + p_d; const d1 = p_d - 2/dt;
                        u = (n0 * e + n1 * (alg.e_prev||0) - d1 * (alg.u_qft_prev||0)) / d0; alg.e_prev = e; alg.u_qft_prev = u; break;
                    }
                    case 'IMP-Servo': {
                        alg.integral += e * dt;
                        const k_imp_x = Math.sqrt(cP.q_x / cP.r_u); const k_imp_i = Math.sqrt(cP.q_e / cP.r_u); const k_imp_v = Math.sqrt(2 * pP.m * k_imp_x); 
                        u = -k_imp_x * x - k_imp_v * v + k_imp_i * alg.integral + pP.k * target; break;
                    }
                    case 'Preview': {
                        let f_sum = 0; for(let i=0; i<5; i++) f_sum += Math.pow(0.8, i) * target; 
                        u = cP.kp * e - cP.kd * v + cP.k_prev * f_sum; break;
                    }
                    case 'BangBang': u = (Math.abs(e) < 0.05 && Math.abs(v) < 0.05) ? 0 : (e > 0 ? cP.force : -cP.force); break;
                    case 'BangBang-Zone': u = Math.abs(e) > cP.zone ? (Math.sign(e) * cP.force) : (cP.kp * e - 20 * v + pP.k * target); break;
                    case 'Relay': if (e > cP.deadzone) u = cP.force; else if (e < -cP.deadzone) u = -cP.force; else u = alg.u_prev; break;
                    case 'TimeOptimal': {
                        const a_max = cP.force / pP.m; const sig = e - Math.sign(v) * (v * v) / (2 * a_max);
                        u = (Math.abs(e) < 0.2 && Math.abs(v) < 0.5) ? pP.k * target + 30 * e - 15 * v : (sig > 0 ? cP.force : -cP.force); break;
                    }
                    case 'FeedbackLin': u = pP.m * (cP.kp * e - cP.kd * v) + pP.c * v + pP.k * x; break;
                    case 'Backstepping': {
                        const z1_bs = -e; const z2_bs = v - (-cP.c1 * z1_bs);
                        u = pP.m * (-z1_bs - cP.c2 * z2_bs + cP.c1 * v) + pP.k * x + pP.c * v; break;
                    }
                    case 'DSC': {
                        const s1_dsc = x - target; const alpha1_dsc = -cP.c1 * s1_dsc;
                        alg.z_dsc += ((alpha1_dsc - alg.z_dsc) / cP.tau) * dt;
                        const z1_dot = (alpha1_dsc - alg.z_dsc) / cP.tau; const s2_dsc = v - alg.z_dsc;
                        u = pP.m * (z1_dot - cP.c2 * s2_dsc - s1_dsc) + pP.k * x + pP.c * v; break;
                    }
                    case 'TDC': {
                        const a_prev = (v - (alg.v_prev||0)) / dt; const F_tdc = a_prev - alg.u_prev / cP.m_nom;
                        u = cP.m_nom * (cP.kp * e - cP.kd * v - F_tdc); alg.v_prev = v; break;
                    }
                    case 'NDC': u = cP.kp * e - cP.kd * v - cP.k_nd * e * e * v; break;
                    case 'CFTC': {
                        const beta_cftc = 2 * cP.alpha / (1 + cP.alpha);
                        u = cP.kp * Math.pow(Math.abs(e), cP.alpha) * Math.sign(e) - cP.kd * Math.pow(Math.abs(v), beta_cftc) * Math.sign(v) + pP.k * target; break;
                    }
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
                    case 'LevantHOSM': {
                        const noisy_e = e + 0.1 * gaussNoise();
                        alg.z0_lev += (-cP.l1 * Math.sqrt(Math.abs(alg.z0_lev - noisy_e)) * Math.sign(alg.z0_lev - noisy_e) + alg.z1_lev) * dt;
                        alg.z1_lev += (-cP.l2 * Math.sign(alg.z0_lev - noisy_e)) * dt;
                        u = cP.k_gain * Math.max(-1, Math.min(1, (cP.c_surf * alg.z0_lev + alg.z1_lev) / 0.1)) + pP.k * target; break;
                    }
                    case 'VariableG-SMC': {
                        const s_vg = cP.c_surf * e - v; const k_vg = cP.k0 + cP.k1 * Math.abs(x);
                        u = pP.k*x + pP.c*v - pP.m*cP.c_surf*v + k_vg * chatter(s_vg, cP, alg, dt); break;
                    }
                    case 'AW-PI': {
                        const u_pi_raw = cP.kp * e + cP.ki * alg.integral;
                        const u_sat = Math.max(-200, Math.min(200, u_pi_raw));
                        alg.integral += (e - cP.k_aw * (u_pi_raw - u_sat)) * dt;
                        u = u_sat - 20 * v + pP.k * target; break;
                    }
                    case 'NPID': {
                        alg.integral += fal(e, cP.alpha, cP.delta) * dt;
                        u = cP.kp * fal(e, cP.alpha, cP.delta) + cP.ki * alg.integral + cP.kd * fal(-v, cP.alpha, cP.delta); break;
                    }
                    case 'MRAC': {
                        const a_m = cP.wn * cP.wn * target - 2 * cP.zeta * cP.wn * alg.vm - cP.wn * cP.wn * alg.xm;
                        alg.vm += a_m * dt; alg.xm += alg.vm * dt; const e_m = alg.xm - x;
                        alg.theta_r = Math.max(-200, Math.min(200, alg.theta_r + cP.gamma * e_m * target * dt));
                        alg.theta_x = Math.max(-200, Math.min(200, alg.theta_x + cP.gamma * e_m * x * dt));
                        alg.theta_v = Math.max(-200, Math.min(200, alg.theta_v + cP.gamma * e_m * v * dt));
                        u = alg.theta_r * target + alg.theta_x * x + alg.theta_v * v; break;
                    }
                    case 'STR': {
                        const a_real = (v - (alg.v_prev||0)) / dt; const a_err = a_real - ((alg.u_prev - alg.k_hat*x - alg.c_hat*v)/pP.m);
                        alg.k_hat = Math.max(0.1, Math.min(20, alg.k_hat - cP.gamma * a_err * x * dt));
                        alg.c_hat = Math.max(0.1, Math.min(10, alg.c_hat - cP.gamma * a_err * v * dt));
                        u = pP.m * cP.wn * cP.wn * target - (pP.m * cP.wn * cP.wn - alg.k_hat) * x - (pP.m * 2 * cP.zeta * cP.wn - alg.c_hat) * v;
                        alg.v_prev = v; break;
                    }
                    case 'MFAC': {
                        const e_star = e - cP.kd * v; const y_star = x + cP.kd * v;
                        const d_u = alg.u_prev - alg.u_prev2; const d_y = alg.x_prev !== undefined ? (y_star - alg.x_prev) : 0; 
                        if (Math.abs(d_u) > 1e-5) alg.phi = alg.phi + (cP.eta * d_u / (cP.mu + d_u * d_u)) * (d_y - alg.phi * d_u);
                        if (alg.phi < 0.001 || alg.phi > 10.0) alg.phi = 0.5;
                        u = alg.u_prev + (cP.rho * alg.phi / (cP.lambda + alg.phi * alg.phi)) * e_star;
                        alg.u_prev2 = alg.u_prev; alg.x_prev = y_star; break;
                    }
                    case 'iPID': {
                        const F_raw = (v - (alg.v_prev||0)) / dt - cP.alpha * alg.u_prev;
                        alg.F_hat_f += ((F_raw - alg.F_hat_f) / cP.tau) * dt;
                        u = (-alg.F_hat_f + cP.kp * e - cP.kd * v) / cP.alpha; alg.v_prev = v; break;
                    }
                    case 'U-Model': {
                        const y_pred = x + v * dt + (alg.u_prev / pP.m) * dt * dt; const jacobian = (dt * dt) / pP.m; 
                        u = alg.u_prev + cP.step_nr * (target - y_pred) / jacobian + cP.kp * e - cP.kd * v; break;
                    }
                    case 'ESC': {
                        alg.u_esc_bias += -cP.k_esc * ((e * e) * Math.sin(cP.omega * stateRef.current.t)) * dt;
                        u = 20 * e - 10 * v + alg.u_esc_bias + cP.amp * Math.sin(cP.omega * stateRef.current.t); break;
                    }
                    case 'BELBIC': {
                        const SI = cP.w_e * e - cP.w_v * v; const Rew = e - 0.1 * v; 
                        const A_bel = Math.max(0, alg.V_belbic * SI); const O_bel = alg.W_belbic * SI;
                        alg.V_belbic = Math.max(0, alg.V_belbic + cP.a_A * SI * Math.max(0, Rew - A_bel) * dt); 
                        alg.W_belbic += cP.a_O * SI * (A_bel - O_bel - Rew) * dt; 
                        u = A_bel - O_bel + pP.k * target; break;
                    }
                    case 'Linear-Actor-Critic': {
                        const phi = [e, v, e*v]; // 特征向量
                        let V_val = 0, u_actor = 0;
                        for(let i=0; i<3; i++) { V_val += alg.w_critic[i]*phi[i]; u_actor += alg.w_actor[i]*phi[i]; }
                        const r_reward = - (e*e + 0.1*v*v);
                        const e_next = target - (x + v*dt); const v_next = v + ((u_actor - pP.k*x - pP.c*v)/pP.m)*dt;
                        const phi_next = [e_next, v_next, e_next*v_next];
                        let V_next = 0; for(let i=0; i<3; i++) V_next += alg.w_critic[i]*phi_next[i];
                        const td_err = r_reward + cP.gamma_rl * V_next - V_val;
                        for(let i=0; i<3; i++) { alg.w_critic[i] = Math.max(-10, Math.min(10, alg.w_critic[i] + cP.alpha_c * td_err * phi[i] * dt)); alg.w_actor[i] = Math.max(-10, Math.min(10, alg.w_actor[i] + cP.alpha_a * td_err * phi[i] * dt)); }
                        u = u_actor + pP.k * target; break;
                    }
                    case 'Gradient-PID': {
                        const grad_kp = -e * e; const grad_kd = e * v;  
                        alg.init_kp = Math.max(1, (alg.init_kp || cP.kp0) - cP.gamma_p * grad_kp * dt);
                        alg.init_kd = Math.max(0.1, (alg.init_kd || 10) - cP.gamma_d * grad_kd * dt);
                        u = alg.init_kp * e - alg.init_kd * v + pP.k*target; break;
                    }
                    case 'DOB': {
                        const a_est_dob = (v - (alg.v_prev || 0)) / dt;
                        const u_nom_dob = pP.m * a_est_dob + pP.c * v + pP.k * x;
                        alg.d_hat += ((alg.u_prev - u_nom_dob - alg.d_hat) / (1 / cP.w_c)) * dt;
                        u = cP.kp * e - cP.kd * v - alg.d_hat; alg.v_prev = v; break;
                    }
                    case 'IMC': {
                        const am_imc = (alg.u_prev - pP.k * alg.xm_imc - pP.c * alg.vm_imc) / pP.m;
                        alg.vm_imc += am_imc * dt; alg.xm_imc += alg.vm_imc * dt;
                        const r_mod = target - (x - alg.xm_imc); 
                        alg.integral = Math.max(-50, Math.min(50, alg.integral + (r_mod - x) * dt));
                        u = cP.kp * (r_mod - x) + cP.ki * alg.integral - cP.kd * v; break;
                    }
                    case 'ADRC': {
                        const eo = alg.z1 - x;
                        alg.z1 += (alg.z2 - 3 * cP.w_o * eo) * dt; alg.z2 += (alg.z3 - 3 * cP.w_o * cP.w_o * eo + cP.b0 * alg.u_prev) * dt; alg.z3 += (-Math.pow(cP.w_o, 3) * eo) * dt;
                        u = (cP.w_c * cP.w_c * (target - alg.z1) - 2 * cP.w_c * alg.z2 - alg.z3) / cP.b0; break;
                    }
                    case 'NL-ADRC': {
                        const e_eso = alg.z1 - x;
                        alg.z1 += (alg.z2 - 3 * cP.w_o * e_eso) * dt; 
                        alg.z2 += (alg.z3 - 3 * cP.w_o * cP.w_o * fal(e_eso, 0.5, cP.delta) + cP.b0 * alg.u_prev) * dt;
                        alg.z3 += (-Math.pow(cP.w_o, 3) * fal(e_eso, 0.25, cP.delta)) * dt;
                        u = (cP.w_c * cP.w_c * fal(target - alg.z1, 0.75, cP.delta) - 2 * cP.w_c * alg.z2 - alg.z3) / cP.b0; break;
                    }
                    case 'ARC': {
                        const s_arc = cP.c * e - v; 
                        alg.m_hat = Math.max(0.5, Math.min(10, alg.m_hat + cP.gamma * s_arc * (-cP.c * v) * dt));
                        u = alg.m_hat * (-cP.c * v) + pP.k * x + pP.c * v + cP.k_s * s_arc + cP.k_n * Math.sign(s_arc); break;
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
                    case 'L1': {
                        alg.v_pred = alg.v_pred ?? v;
                        const v_pred_dot = -10.0 * (alg.v_pred - v) + alg.u_prev / pP.m + alg.theta_x;
                        alg.v_pred += v_pred_dot * dt;
                        const v_tilde = alg.v_pred - v;
                        alg.theta_x = Math.max(-5000, Math.min(5000, alg.theta_x - cP.gamma * v_tilde * dt));
                        const u_baseline = cP.wn * cP.wn * (target - x) - 2 * cP.zeta * cP.wn * v + pP.k * target;
                        const u_raw_l1 = u_baseline - alg.theta_x * pP.m;
                        alg.u_l1_filter += ((u_raw_l1 - alg.u_l1_filter) / cP.t_lpf) * dt;
                        u = alg.u_l1_filter; 
                        const a_m_l1 = cP.wn * cP.wn * target - 2 * cP.zeta * cP.wn * alg.vm - cP.wn * cP.wn * alg.xm;
                        alg.vm += a_m_l1 * dt; alg.xm += alg.vm * dt; break;
                    }
                    case 'I-and-I': {
                        const d_hat_ii = alg.theta_hat_ii - cP.lambda * pP.m * v;
                        const z_dot_ii = -cP.lambda * d_hat_ii + cP.lambda * alg.u_prev;
                        alg.theta_hat_ii += z_dot_ii * dt;
                        u = cP.kp * e - cP.kd * v + d_hat_ii; break;
                    }
                    case 'AdaptBackstepping': {
                        const z1_ab = -e; const alpha1_ab = -cP.c1 * z1_ab; const z2_ab = v - alpha1_ab;
                        alg.m_hat = Math.max(0.5, Math.min(10.0, alg.m_hat + cP.gamma_m * z2_ab * (cP.c1 * v) * dt));
                        u = pP.k * x + pP.c * v - z1_ab - cP.c2 * z2_ab - alg.m_hat * (cP.c1 * v); break;
                    }
                    case 'T-DOB': {
                        const td_step = Math.min(199, Math.floor(cP.delay_d));
                        const v_past = (alg.x_delay_buf[td_step-1] - alg.x_delay_buf[td_step]) / dt;
                        const a_past = (v - v_past) / (td_step * dt);
                        const d_tdob = alg.u_delay_buf[td_step] - cP.m_nom * a_past;
                        u = cP.kp * e - cP.kd * v - d_tdob; break;
                    }
                    case 'PPC': {
                        const rho_t = (cP.rho_0 - cP.rho_inf) * Math.exp(-cP.l * alg.t_target) + cP.rho_inf;
                        const safe_eps = Math.max(-0.99, Math.min(0.99, e / rho_t)); 
                        const z_ppc = 0.5 * Math.log((1 + safe_eps) / (1 - safe_eps));
                        u = cP.kp * z_ppc - cP.kd * v + pP.k * target; alg.ref_display = rho_t; break;
                    }
                    case 'BLF': {
                        const e_blf = Math.max(-cP.kb + 0.05, Math.min(cP.kb - 0.05, e)); 
                        u = cP.kp * (e_blf / (cP.kb * cP.kb - e_blf * e_blf)) - cP.kd * v + pP.k * target; break;
                    }
                    case 'ETC': {
                        if (Math.abs(e - alg.last_e_etc) > cP.sigma * Math.abs(e) + cP.eps0 || alg.t_target < dt) {
                           alg.last_u_etc = cP.kp * e - cP.kd * v + pP.k * target; alg.last_e_etc = e;
                        }
                        u = alg.last_u_etc; break;
                    }
                    case 'Switched': {
                        const V_lyap = 0.5 * e * e + 0.5 * v * v;
                        if (currTime - alg.last_switch_time > cP.dwell) { 
                            if (V_lyap > 1.0 && alg.switch_state !== 1) { alg.switch_state = 1; alg.last_switch_time = currTime; }
                            else if (V_lyap <= 1.0 && alg.switch_state !== 2) { alg.switch_state = 2; alg.last_switch_time = currTime; }
                        }
                        u = alg.switch_state === 1 ? (cP.p_fast * 20 * e - 5 * v + pP.k * target) : (cP.p_slow * 10 * e - 20 * v + pP.k * target); break;
                    }
                    case 'DynPole': {
                        const dyn_p = cP.p_min + (cP.p_max - cP.p_min) * Math.exp(-cP.alpha_p * Math.abs(e));
                        const k1_dp = pP.m * (dyn_p * dyn_p) - pP.k; const k2_dp = pP.m * (2 * dyn_p) - pP.c;
                        u = -k1_dp * x - k2_dp * v + (k1_dp + pP.k) * target; break;
                    }
                    case 'PTC': {
                        const t_eff = Math.max(cP.Tp - alg.t_target, cP.eps);
                        const u_cancel = pP.k * x + pP.c * v;
                        const u_ptc = pP.m * (cP.kp / (t_eff * t_eff) * e - cP.kd / t_eff * v);
                        u = u_cancel + u_ptc; break;
                    }
                    case 'FxTC': {
                        u = cP.k1 * Math.pow(Math.abs(e), cP.p_q)*Math.sign(e) + cP.k2 * Math.pow(Math.abs(e), cP.r_s)*Math.sign(e) - 20*v + pP.k*target; break;
                    }
                    case 'Tan-BLF': {
                        const tan_arg = (Math.PI * e * e) / (2 * cP.kb * cP.kb);
                        const safe_tan = Math.max(-1.5, Math.min(1.5, tan_arg));
                        u = cP.kp * e * (1 + Math.pow(Math.tan(safe_tan), 2)) - cP.kd * v + pP.k * target; break;
                    }
                    case 'TimeVary-BLF': {
                        const kb_t = (cP.kb0 - cP.kb_inf) * Math.exp(-cP.lb * alg.t_target) + cP.kb_inf;
                        const e_tvb = Math.max(-kb_t + 0.05, Math.min(kb_t - 0.05, e)); 
                        u = cP.kp * (e_tvb / (kb_t * kb_t - e_tvb * e_tvb)) - cP.kd * v + pP.k * target; alg.ref_display = kb_t; break;
                    }
                    case 'Integral-BLF': {
                        alg.integral += e * dt;
                        const i_blf = Math.max(-cP.kb_i + 0.01, Math.min(cP.kb_i - 0.01, alg.integral));
                        u = cP.kp * e + cP.ki * (i_blf / (cP.kb_i*cP.kb_i - i_blf*i_blf)) - cP.kd * v + pP.k*target; break;
                    }
                    case 'InputShaping': {
                        if (pP.k <= 1e-6) { u = cP.kp * e - cP.kd * v; break; }
                        const wn_zv = Math.sqrt(pP.k / pP.m); const zeta_zv = pP.c / (2 * Math.sqrt(pP.k * pP.m));
                        const K_zv = Math.exp(-zeta_zv * Math.PI / Math.sqrt(1 - zeta_zv * zeta_zv));
                        const td_zv = Math.PI / (wn_zv * Math.sqrt(1 - zeta_zv * zeta_zv));
                        const A1 = 1 / (1 + K_zv); const A2 = K_zv / (1 + K_zv);
                        let r_shaped = 0;
                        for (let i = alg.target_history.length - 1; i >= 0; i--) {
                            const hist = alg.target_history[i];
                            if (currTime >= hist.t) r_shaped += A1 * hist.val;
                            if (currTime >= hist.t + td_zv) r_shaped += A2 * hist.val;
                            break; 
                        }
                        u = cP.kp * (r_shaped - x) - cP.kd * v + pP.k * r_shaped; alg.ref_display = r_shaped; break;
                    }
                    case 'ILC': {
                        if (alg.ilc_idx < 1000) {
                            alg.ilc_memory[alg.ilc_idx] += cP.gamma_ilc * e; 
                            u = alg.ilc_memory[alg.ilc_idx] + cP.kp_base * e + pP.k * target; alg.ilc_idx++;
                        } else { u = cP.kp_base * e + pP.k * target; } break;
                    }
                    case 'Repetitive': {
                        alg.rep_queue[alg.rep_idx] = e;
                        const e_delayed = alg.rep_queue[(alg.rep_idx + 1) % 50]; 
                        const u_rc = cP.q_filter * alg.u_prev + cP.k_rc * e_delayed;
                        u = u_rc + 20 * e - 10 * v + pP.k * target; alg.rep_idx = (alg.rep_idx + 1) % 50; break;
                    }
                    case 'GainSched': {
                        const alpha_gs = Math.max(0, Math.min(1, Math.abs(e) / cP.bnd)); 
                        const kp_curr = alpha_gs * cP.kp_far + (1 - alpha_gs) * cP.kp_near; 
                        u = kp_curr * e - 20 * v + pP.k * target; break;
                    }
                    case 'SmithPredict': {
                        const delay_idx = Math.min(199, Math.floor(cP.delay_t / dt));
                        const x_sim = alg.x_delay_buf[0] + (alg.u_prev/pP.m)*dt;
                        const x_sim_delay = alg.x_delay_buf[delay_idx];
                        u = cP.kp * (target - x - (x_sim - x_sim_delay)) - cP.kd * v + pP.k * target; break;
                    }
                    case 'Posicast': {
                        const td_p = Math.min(199, Math.floor(cP.td / dt));
                        const r_pos = target + cP.k_pos * (alg.target_history.length > td_p ? alg.target_history[alg.target_history.length-td_p].val : target);
                        u = cP.kp * (r_pos - x) - cP.kd * v + pP.k * r_pos; alg.ref_display = r_pos; break;
                    }
                    case 'FuzzyPID': {
                        alg.integral = Math.max(-50, Math.min(50, alg.integral + e * dt));
                        const e_norm = Math.max(-1, Math.min(1, e / 5)); const ec_norm = Math.max(-1, Math.min(1, -v / 5));
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
                        alg.integral = Math.max(-50, Math.min(50, alg.integral + e * dt));
                        alg.w1 = Math.max(0.001, alg.w1 + cP.eta * e * e * dt); alg.w2 = Math.max(0.001, alg.w2 + cP.eta * e * alg.integral * dt); alg.w3 = Math.max(0.001, alg.w3 + cP.eta * e * (-v) * dt);
                        const sumW = alg.w1 + alg.w2 + alg.w3;
                        u = cP.K * ((alg.w1/sumW) * e + (alg.w2/sumW) * alg.integral + (alg.w3/sumW) * (-v)); break;
                    }
                    case 'Fuzzy': {
                        const e_norm_f = Math.max(-1, Math.min(1, e * cP.ke)); const ec_norm_f = Math.max(-1, Math.min(1, -v * cP.kec));
                        const mf_e = getMembership(e_norm_f); const mf_ec = getMembership(ec_norm_f);
                        let rule_U = 0, sum_Wf = 0;
                        const evalRule = (w_e, w_ec, out_val) => { const w = Math.min(w_e, w_ec); rule_U += w * out_val; sum_Wf += w; };
                        evalRule(mf_e.N, mf_ec.N, -1); evalRule(mf_e.N, mf_ec.Z, -1); evalRule(mf_e.N, mf_ec.P, 0);
                        evalRule(mf_e.Z, mf_ec.N, -1); evalRule(mf_e.Z, mf_ec.Z, 0);  evalRule(mf_e.Z, mf_ec.P, 1);
                        evalRule(mf_e.P, mf_ec.N, 0);  evalRule(mf_e.P, mf_ec.Z, 1);  evalRule(mf_e.P, mf_ec.P, 1);
                        const defuzz_U = sum_Wf > 0 ? (rule_U / sum_Wf) : 0;
                        u = defuzz_U * cP.gain * 50; break;
                    }
                    case 'EnergyShaping': {
                        u = pP.k * x - cP.k_d * (x - target) - (cP.r_d0 + cP.r_d1 * Math.abs(v)) * v; break;
                    }
                    case 'TubeMPC': {
                        const x_mpc_star = x + v * cP.t_pred; 
                        const u_mpc_star = (target - x_mpc_star) / (cP.t_pred*cP.t_pred) + cP.lambda * target;
                        u = u_mpc_star + cP.k_anc * (x_mpc_star - x) - 20 * v; break;
                    }
                    case 'SDRE': {
                        alg.P_sdre = Math.max(0.1, alg.P_sdre - (alg.P_sdre * alg.P_sdre / cP.q_weight - e*e) * dt);
                        u = cP.q_weight * alg.P_sdre * e - 20 * v + pP.k * target; break;
                    }
                    case 'GPC': {
                        let gpc_sum = 0; for(let i=0; i<cP.ny; i++) gpc_sum += alg.e_hist[i] || 0;
                        u = alg.u_prev + (gpc_sum / (cP.nu + cP.lam)) - 10 * v; break;
                    }
                    case 'RLS-Adaptive': {
                        const y_curr = x; const y_past = alg.x_delay_buf[2]; const u_past = alg.u_delay_buf[2];
                        const phi_rls = [y_past, u_past];
                        const P_phi = [ alg.P_rls[0][0]*phi_rls[0] + alg.P_rls[0][1]*phi_rls[1], alg.P_rls[1][0]*phi_rls[0] + alg.P_rls[1][1]*phi_rls[1] ];
                        const den_rls = cP.rls_lambda + phi_rls[0]*P_phi[0] + phi_rls[1]*P_phi[1];
                        const K_rls = [P_phi[0]/den_rls, P_phi[1]/den_rls];
                        const err_rls = y_curr - (alg.theta_rls[0]*phi_rls[0] + alg.theta_rls[1]*phi_rls[1]);
                        alg.theta_rls[0] += K_rls[0] * err_rls; alg.theta_rls[1] += K_rls[1] * err_rls;
                        const P_new = [[0,0],[0,0]];
                        for(let i=0; i<2; i++) { for(let j=0; j<2; j++) { P_new[i][j] = (alg.P_rls[i][j] - K_rls[i]*P_phi[j]) / cP.rls_lambda; } }
                        alg.P_rls = P_new;
                        const b_est = Math.max(0.001, alg.theta_rls[1]);
                        u = (cP.w_bw * e - alg.theta_rls[0] * v) / b_est + pP.k*target; break;
                    }
                    case 'Robust-NL-Damping': {
                        const robust_d = cP.gamma_d * Math.abs(e) * v; 
                        u = cP.kp_nom * e - (20 + cP.gamma_d + Math.abs(robust_d)) * v + pP.k * target; break;
                    }
                    case 'NDOB': {
                        const p_ndob = cP.l_obs * pP.m * v;
                        alg.z1 += (-cP.l_obs * (alg.z1 + p_ndob) - cP.l_obs * (pP.k*x + pP.c*v - alg.u_prev)) * dt;
                        u = cP.kp * e - cP.kd * v - (alg.z1 + p_ndob) + pP.k*x + pP.c*v; break;
                    }
                    case 'Extended-Luenberger': {
                        alg.l_x += (alg.l_v + cP.l_gain*(x - alg.l_x)) * dt;
                        alg.l_v += (alg.u_prev/pP.m - pP.k/pP.m*alg.l_x - pP.c/pP.m*alg.l_v + cP.l_gain*(x - alg.l_x)) * dt;
                        u = cP.kp * (target - alg.l_x) - cP.kd * alg.l_v + pP.k*target; break;
                    }
                    case 'EKF-Ctrl': {
                        const x_ekf = x + 0.05 * gaussNoise();
                        alg.l_x += (alg.l_v + (cP.q_cov/cP.r_cov)*(x_ekf - alg.l_x)) * dt;
                        alg.l_v += (alg.u_prev/pP.m - pP.k/pP.m*alg.l_x + (cP.q_cov/cP.r_cov)*(x_ekf - alg.l_x)) * dt;
                        u = cP.kp * (target - alg.l_x) - cP.kd * alg.l_v + pP.k*target; break;
                    }
                    case 'Particle-Filter': {
                        for(let i=0; i<cP.p_num; i++) alg.pf_particles[i] = alg.pf_particles[i] + 0.1*gaussNoise() + (x - alg.pf_particles[i])*0.5;
                        const x_pf = alg.pf_particles.reduce((a,b)=>a+b) / cP.p_num;
                        u = cP.kp * (target - x_pf) - cP.kd * v + pP.k*target; break;
                    }
                    case 'Neural-RBF-ADRC': {
                        const e_eso_rbf = alg.z1 - x;
                        alg.z1 += (alg.z2 - 3 * cP.wo * e_eso_rbf) * dt; alg.z2 += (alg.z3 - 3 * cP.wo*cP.wo * e_eso_rbf + cP.b0 * alg.u_prev) * dt; alg.z3 += (-Math.pow(cP.wo, 3) * e_eso_rbf) * dt;
                        const centers = [-2, -1, 0, 1, 2]; let h_rbf = centers.map(c_pt => Math.exp(-Math.pow(x - target - c_pt, 2) / 2));
                        let f_nn = 0; for(let i=0; i<5; i++) f_nn += alg.w_rbf[i] * h_rbf[i];
                        for(let i=0; i<5; i++) alg.w_rbf[i] += cP.n_lr * e_eso_rbf * h_rbf[i] * dt;
                        u = (cP.wc*cP.wc*(target - alg.z1) - 2*cP.wc*alg.z2 - alg.z3 - f_nn) / cP.b0; break;
                    }
                    case 'Artstein-Reduction': {
                        const d_a = Math.min(199, Math.floor(cP.delay_a)); let integral_u = 0;
                        for (let j = 0; j < d_a; j++) { integral_u += Math.exp(-0.1 * j * DT) * (alg.u_delay_buf[j] || 0) * DT; }
                        const z_art = x + integral_u; 
                        u = cP.kp * (target - z_art) - cP.kd * v + pP.k*target; break;
                    }
                    case 'Quantized-Ctrl': {
                        const u_qc_raw = cP.kp * e - cP.kd * v + pP.k*target;
                        u = Math.round(u_qc_raw / cP.q_step) * cP.q_step; break;
                    }
                    case 'Event-Triggered-MPC': {
                        const x_pred_et = x + v * cP.t_pred;
                        if (Math.abs(x - (alg.x_prev||x)) > cP.et_limit || currTime < dt*2) { alg.u_hold = (target - x_pred_et)/(cP.t_pred*cP.t_pred) + cP.lambda*target - 20*v; alg.x_prev = x; }
                        u = alg.u_hold; break;
                    }
                    case 'FO-PD': {
                        const wi_pd = calcGLWeights(cP.mu, 50); let dE_pd = 0;
                        for(let j=0; j<50; j++) dE_pd += wi_pd[j] * (alg.e_hist[j]||0);
                        u = cP.kp * e + cP.kd * (dE_pd / Math.pow(dt, cP.mu)) + pP.k*target; break;
                    }
                    case 'Nonlinear-Power-ADRC': {
                        const fe = alg.z1 - x;
                        alg.z1 += (alg.z2 - cP.wo * Math.pow(Math.abs(fe), cP.alpha)*Math.sign(fe)) * dt;
                        alg.z2 += (alg.u_prev - cP.wo*cP.wo * Math.pow(Math.abs(fe), cP.alpha)*Math.sign(fe)) * dt;
                        u = (cP.wc*cP.wc*(target - alg.z1) - 2*cP.wc*v - alg.z2) / cP.b0; break;
                    }
                    case 'Implicit-Euler-Ctrl': {
                        const s_ie = 5.0 * e - v;
                        u = pP.k*x + pP.c*v - pP.m*5.0*v + (s_ie / (1 + cP.lambda * dt)) * 50.0; break;
                    }
                    case 'Lorenz-Coupled': {
                        alg.l_x_l = Math.max(-40, Math.min(40, alg.l_x_l + (10 * (alg.l_y_l - alg.l_x_l)) * dt)); alg.l_y_l = Math.max(-40, Math.min(40, alg.l_y_l + (alg.l_x_l * (cP.rho - alg.l_z_l) - alg.l_y_l) * dt)); alg.l_z_l = Math.max(-40, Math.min(40, alg.l_z_l + (alg.l_x_l * alg.l_y_l - (8 / 3) * alg.l_z_l) * dt));
                        u = cP.kp * (0.1 * alg.l_x_l - e) - cP.kd * v + pP.k * x; alg.ref_display = target - 0.1 * alg.l_x_l; break;
                    }
                    case 'Speed-Gradient': {
                        alg.integral += -cP.gamma_sg * (-v) * dt;
                        u = cP.q_weight * (alg.integral + 0.2) - 10*v + pP.k*target; break;
                    }
                    case 'Feedback-Passivation': {
                        u = pP.k*x + pP.c*v - cP.kp*x + cP.kp*target - cP.kv*v; break;
                    }
                    default: u = 0;
                }
                
                const MAX_FORCE = loopStateRef.current.actuatorLimit;
                u = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, u));
                alg.u_prev = u;
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
                    const thDD = ((M + mm) * D.GRAVITY * state.x - cc * state.v - F_actual) / (M * ll);
                    const xDD = (F_actual - mm * ll * thDD) / (M + mm);
                    state.v += thDD * DT;
                    state.x += state.v * DT;
                    state.vc = (state.vc || 0) + xDD * DT;
                    state.xc = (state.xc || 0) + state.vc * DT;
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
    const base = getDefaultParams(method);
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

  function setParam(key, value, store) {
    /* 只有纯数值字符串才转换；'tanh' / 'on' 这类下拉值必须原样保留 */
    const numeric = (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
      ? Number(value) : value;
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
  }

  function resetParams() {
    applyTuning(settings.method);
    settings.physParams = { ...INITIAL_PARAMS };
    Object.assign(settings, DEFAULT_ENV);
    settings.speed = 1;
    const plant = getPlant();
    settings.plantParams[plant.id] = { ...plant.defaults };
    settings.physParams.target = plant.defaultTarget;
    settings.initialX = plant.defaultInitialX || 0;
    resetSim(settings.method, settings.physParams.target, settings.initialX);
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
    applyTuning(preset.method);
    Object.keys(preset.ctrl || {}).forEach((k) => {
      if (k in settings.ctrlParams) settings.ctrlParams[k] = preset.ctrl[k];
    });
    settings.physParams = { ...DEFAULT_PHYS, ...(preset.phys || {}) };
    if (!preset.phys || preset.phys.target === undefined) settings.physParams.target = getPlant().defaultTarget;
    Object.assign(settings, DEFAULT_ENV, preset.env || {});
    resetSim(preset.method, settings.physParams.target, settings.initialX);
    return true;
  }

  function triggerDisturbance() {
    impulseRef.current = 150.0;
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
      frozen: chartStateRef.current.frozen,
      target: getActiveTarget()
    };
  }

  function setRunning(value) { settings.running = !!value; markDirty(); }
  function toggleRun() { settings.running = !settings.running; markDirty(); return settings.running; }
  function setSpeed(value) { settings.speed = Math.max(0.25, Math.min(8, Number(value) || 1)); }
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
    resetSim, setMethod, setParam, resetParams, applyPreset,
    triggerDisturbance, rerecord, advance, stepOnce,
    setRunning, toggleRun, setSpeed, setCompareMode, isCompareMode,
    clearTracks, getTracks, getActiveTrack, getHistory,
    getState, getAlg, getSettings, getMetrics, getActiveTarget,
    getImpulse, getChartState, isFrozen, getMaxPoints,
    markDirty, consumeDirty
  };
})(window);
