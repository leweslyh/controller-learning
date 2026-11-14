/* 旧程序化教学数据：已从 docs.js 移除，正文以 public/docs/methods/*.md 为唯一来源。
   若发现某篇 md 缺少某个要点，可从此文件取材回填。 */
  /* ── 11 类体系导论（按类别编号索引，避免中文字符串匹配差异） ── */
  const CATEGORY_INTROS = {
    '01': {
      title: '经典线性体系',
      idea: '用「误差的现在、过去、未来」三路信息线性叠加成控制力。P 看当前误差，I 累积历史误差，D 预判误差变化趋势，是工业界最通用的基准。',
      derivation: '从 e=r-x 出发，假设执行器输出与误差呈线性关系，取 u=K_p e+K_i\\int e\\,\\mathrm{d}t+K_d \\dot e。把它代回二阶对象后，闭环特征多项式由 K_p、K_i、K_d 与对象参数共同决定；把它对照标准二阶形式即可理解「快、准、稳」的取舍：K_p 抬高刚度、K_d 注入阻尼、K_i 提高系统型别以消除静差。',
      math: 'u=K_p e+K_i\\int e\\,\\mathrm{d}t-K_d\\dot{x}',
      tuning: [
        '恢复默认参数，选择「质量-弹簧-阻尼」对象与固定阶跃指令。',
        '先只调 Kp：由小到大，直到上升速度可接受、开始出现超调。',
        '再加 Kd：压住超调，观察相平面轨迹是否收紧成平滑螺旋。',
        '最后补少量 Ki：消除弹簧负载带来的稳态静差，警惕积分饱和。',
        '施加脉冲扰动并打开执行器限幅，用 A/B 对比记录整定前后曲线。'
      ],
      pitfalls: [
        '只加 Kp 追求快速，忽略超调与执行器饱和。',
        'Ki 过大导致积分饱和，扰动后长时间低频振荡。',
        '传感器有噪声时仍盲目加大 Kd，控制力会出现高频毛刺。',
        '把 I-PD / PI-D / 二自由度 PID 当成「同一种 PID」，忽略指令跳变时的微分冲击。'
      ],
      observe: '位置曲线看超调与静差，控制力曲线看尖峰与饱和，相平面看阻尼是否充足，RMSE 与动态能耗综合评价。',
      objects: ['msd', 'freeMass']
    },
    '02': {
      title: '频域与最优理论',
      idea: '不再靠手感调三个增益，而是先写出「希望系统怎样运动」或「希望最小化什么代价」，再反解出反馈增益。代表是极点配置、LQR、MPC 与 H∞。',
      derivation: '把对象写成状态空间 \\dot{X}=AX+Bu。极点配置直接指定闭环极点位置反求 K；LQR 定义二次型代价 J=\\int (X^{\\mathsf{T}}QX+u^{\\mathsf{T}}Ru)\\,\\mathrm{d}t，通过黎卡提方程求 K=R^{-1}B^{\\mathsf{T}}P；MPC 则在每个采样时刻滚动求解有限时域优化并只执行第一步。三者分别体现「指定极点」「最优折中」「带约束预测」。',
      math: 'J=\\int_0^{\\infty}\\left(X^{\\mathsf{T}}QX+u^{\\mathsf{T}}Ru\\right)\\mathrm{d}t,\\qquad u=-KX',
      tuning: [
        '先用默认权重观察基线响应，确认对象与噪声条件。',
        '极点/带宽类参数（p1、p2、wn）由小到大：收敛加快但执行器峰值上升。',
        '权重类参数先调状态惩罚 Qx/Qv，再调能量惩罚 R；R 越大动作越柔和。',
        '预测类参数 t_pred 从小开始，过长会让计算与响应都变迟钝。',
        '在噪声、纯滞后与限幅条件下复测，比较 RMSE 与能耗。'
      ],
      pitfalls: [
        '把 Q 权重拉到极大却忽略执行器饱和，实际输出被限幅后性能反而变差。',
        'LQR 无积分环节，在带弹簧或恒定扰动的对象上必然留静差，需 LQR-I / IMP 伺服。',
        '模型严重失配时仍相信名义模型的最优解。'
      ],
      observe: '重点比较控制力峰值、能耗 ∫u²dt 与相平面收敛形状；模型失配时观察鲁棒性差异。',
      objects: ['msd', 'freeMass']
    },
    '03': {
      title: '非线性结构控制',
      idea: '当对象本身非线性或要求大范围运动时，先「改造」对象再控制：反馈线性化把非线性对消掉，反步法逐层构造李雅普诺夫函数，有限时间控制用分数幂改变原点附近增益。',
      derivation: '反馈线性化取 u=m(K_p e-K_d v)+cv+kx，前三项恰好抵消对象已知动态，闭环退化为双积分器；反步法把状态拆成虚拟误差 z_1、z_2，逐级选 V=\\frac{1}{2}z_1^2+\\frac{1}{2}z_2^2 并令 \\dot V<0 推出控制律；DSC 在层间插入一阶滤波器以避免对虚拟控制量反复求导（微分爆炸）。',
      math: 'V=\\frac{1}{2}z_1^{2}+\\frac{1}{2}z_2^{2},\\qquad \\dot{V}\\le -c_1z_1^{2}-c_2z_2^{2}<0',
      tuning: [
        '先确认模型参数（尤其 m、c、k）与真实对象一致，否则对消项会变成新的扰动。',
        '按 K_d\\approx 2\\sqrt{K_p} 设定临界阻尼量级，再微调超调。',
        '反步/DSC 类先调第一层增益 c1，再调 c2；滤波时间常数 tau 取小值。',
        '逐步增大目标幅值，检验大范围下的非线性效应。'
      ],
      pitfalls: [
        '模型参数失配时仍使用精确对消，控制力出现系统性偏置。',
        '分数幂 alpha 过小，离散仿真在原点附近容易数值抖动。',
        '把「全局稳定」结论直接套到本平台的简化离散实现上。'
      ],
      observe: '相平面轨迹是否平滑收敛、控制力是否出现高频切换、Duffing 对象上大范围是否失配。',
      objects: ['msd', 'pendulum']
    },
    '04': {
      title: '滑模变结构家族',
      idea: '先设计一张「滑模面」s=0，再用强切换项把状态强行压到这张面上；一旦在面上滑动，系统就按预设的一阶动态收敛，对匹配扰动极不敏感。',
      derivation: '取 s=c\\,e+\\dot e（或含积分的增广面），由等效控制 u_{eq} 抵消已知动态，再加鲁棒项 K\\operatorname{sgn}(s)。用 V=\\frac{1}{2}s^2 得 \\dot V=s\\dot s，只要切换增益大于扰动上界即可保证到达条件 s\\dot s<0。为抑制高频抖振，工程上常用 \\operatorname{sat}(s/\\varepsilon) 边界层，或 Super-Twisting 把切换藏进积分器。',
      math: 's=c\\,e+\\dot e,\\qquad u=u_{eq}+K\\,\\operatorname{sat}\\!\\left(\\frac{s}{\\varepsilon}\\right),\\qquad V=\\frac{1}{2}s^{2}',
      tuning: [
        '先设滑模面系数 c（决定在面上收敛的快慢），从默认值开始。',
        '再加切换增益 K：只需略大于扰动上界，过大只会放大抖振。',
        '用边界层 eps 由小到大平滑控制力，注意 eps 过大带来微小静差。',
        '施加恒定风扰与脉冲扰动，验证「扰动被压住而轨迹仍在面上」。',
        '对比 SuperTwisting / 积分滑模 / ESO-SMC 的抖振与能耗。'
      ],
      pitfalls: [
        '误以为切换增益越大越好，忽略执行器磨损与高频抖振。',
        '边界层取得过宽，滑模退化为普通 PD，抗扰优势消失。',
        '在强测量噪声下仍用纯符号函数。'
      ],
      observe: '控制力曲线是否呈高频方波（抖振）、相平面是否贴近滑模面、扰动后误差是否迅速回零。',
      objects: ['msd', 'pendulum']
    },
    '05': {
      title: '数据驱动与智能',
      idea: '少依赖精确模型，靠在线数据修正参数或逼近未知动态：非线性 PID 用 fal 函数、MRAC 在线改权重、自适应/强化学习用梯度或时序差分更新策略。',
      derivation: 'MRAC 设 u=\\theta^{\\mathsf{T}}\\phi(x)，用参考模型输出与真实输出之差 e_m 驱动 \\dot\\theta=-\\gamma e_m\\phi；MFAC 用伪偏导数 \\phi(k) 在线局部线性化；Actor-Critic 用 TD 误差更新价值与策略权重。共同点是「参数不是调出来的，而是跑出来的」，学习率决定收敛速度与稳定性边界。',
      math: '\\dot{\\theta}=-\\gamma e_m\\phi(x),\\qquad u=\\theta^{\\mathsf{T}}\\phi(x)',
      tuning: [
        '先把学习率/自适应增益 gamma、eta 放到最小值，确认基线闭环稳定。',
        '逐步增大学习率，观察权重是否平滑收敛而非来回震荡。',
        '加入噪声与扰动，检验在线学习是否会「学歪」。',
        '与固定增益 PID 做 A/B 对比，看是否真的带来收益。'
      ],
      pitfalls: [
        '学习率过大导致参数震荡甚至发散（本平台 Linear-Actor-Critic 默认参数即会发散）。',
        '把在线学习过程当成瞬时最优，忽略收敛时间。',
        '忽略输入信号的激励充分性，参数无法正确辨识。'
      ],
      observe: 'RMSE 随时间的下降趋势、控制力是否出现学习初期的剧烈试探、与固定增益方法的对比。',
      objects: ['msd', 'pendulum']
    },
    '06': {
      title: '融合与复合架构',
      idea: '把两种互补机制串起来：观测器先把「未知总扰动」估出来，控制器只需处理剩下的干净对象。ADRC、DOB、IMC、ARC、L1 自适应都属此类。',
      derivation: '以 LADRC 为例，把模型误差、摩擦、外扰合并为扩张状态 z_3，设计扩张状态观测器 \\dot z 使其逼近 z_3，再取 u=(u_0-z_3)/b_0 前馈对消。于是名义对象近似变成双积分器，PD 即可镇定。DOB 用低通滤波从 (u-u_{nom}) 提取扰动，IMC 用并行名义模型的差值修正指令。',
      math: 'u=\\frac{u_0-z_3}{b_0},\\qquad \\omega_o\\approx(3\\sim5)\\,\\omega_c',
      tuning: [
        '先设控制器带宽 w_c（决定闭环速度），再令观测器带宽 w_o 为其 3～5 倍。',
        '校准 b0 的数量级：偏差过大会让扰动补偿方向错误。',
        '逐步加入恒定风扰、库仑摩擦与噪声，观察 z3 的补偿是否跟得上。',
        '若出现高频抖动，降低 w_o 或加回测量噪声滤波。'
      ],
      pitfalls: [
        '观测器带宽无限提高，把测量噪声当成扰动放大。',
        'b0 与实际惯性量级差一个数量级以上。',
        '在纯滞后对象上仍用高带宽观测器。'
      ],
      observe: '扰动施加后位置曲线的回落速度、控制力是否平滑补偿、能耗是否低于硬抗扰的滑模。',
      objects: ['msd', 'freeMass']
    },
    '07': {
      title: '前沿与新型约束',
      idea: '把「误差必须始终在漏斗内」「状态不得越界」「必须在指定时间内收敛」这类硬要求直接写进控制律，用非线性映射或障碍函数实现。',
      derivation: 'PPC 把受限误差 e/\\rho(t) 经 z=\\frac{1}{2}\\ln\\frac{1+e/\\rho}{1-e/\\rho} 映射到全实数域，只要 z 有界，e 就被锁在收缩漏斗内；BLF 构造 V=\\frac{1}{2}\\log\\frac{k_b^2}{k_b^2-e^2}，当 |e|\\to k_b 时 V\\to\\infty，从而产生无穷斥力；PTC/FxTC 用含 (T_p-t) 的时间尺度缩放增益，越接近截止时刻增益越大。',
      math: '\\rho(t)=(\\rho_0-\\rho_\\infty)e^{-lt}+\\rho_\\infty,\\qquad |e(t)|<\\rho(t)',
      tuning: [
        'PPC 必须保证 rho_0 严格大于初始误差 |r-x(0)|，否则映射立即失效。',
        '漏斗收缩速率 l 由小到大，过快会要求不可实现的控制力。',
        'BLF 类把 kb 设为略大于预期最大误差，观察接近边界时的斥力。',
        'PTC/FxTC 先设较宽松的 Tp，再逐步缩短并观察控制力峰值。',
        '务必打开执行器限幅，检验硬约束与物理限幅冲突时的表现。'
      ],
      pitfalls: [
        '初始误差超出漏斗边界，控制律出现奇异或发散。',
        '时间约束设得过紧，导致末期控制力爆炸。',
        '忽略测量噪声：漏斗边界附近的映射增益极高，噪声会被放大。'
      ],
      observe: '位置曲线是否始终位于漏斗内、末期控制力峰值、事件触发类方法的阶梯状控制力。',
      objects: ['msd', 'pendulum']
    },
    '08': {
      title: '轨迹规划与学习',
      idea: '不只在「反馈端」用力，也在「指令端」动脑筋：输入整形把阶跃劈成两段相消波，迭代学习把上一轮误差记进档案，模糊/神经 PID 让增益随工况变化。',
      derivation: 'ZV Shaper 把指令 r 变成 r_{shaped}=A_1 r(t)+A_2 r(t-t_d)，令第二脉冲恰好在半个振荡周期后到达，使两股响应反相抵消；ILC 用 u_{k+1}(t)=u_k(t)+\\Gamma e_k(t) 逐轮更新同一时刻的前馈；模糊 PID 以 (e,\\dot e) 的隶属度查规则库并重心解模糊得到 \\Delta K_p,\\Delta K_i,\\Delta K_d。',
      math: 'u_{k+1}(t)=u_k(t)+\\Gamma e_k(t)',
      tuning: [
        '先在固定阶跃下确认基础 PD/PID 能稳定，再启用指令整形或前馈。',
        '输入整形的延时须与对象固有周期匹配，可微调 td 观察残余振荡。',
        'ILC 需要重复触发同一轨迹（多次点「重置」模拟 Trial），Gamma 取小值。',
        '模糊/神经类先调整量化因子 Ke/Kec，把误差映射到合理论域。',
        '切换到正弦/方波指令，比较跟踪相位滞后。'
      ],
      pitfalls: [
        '模型频率不准时输入整形反而加大振荡。',
        'ILC 只跑一轮就期望看到学习效果。',
        '模糊规则库或学习率过大，增益调度变成剧烈跳变。'
      ],
      observe: '正弦跟踪的相位滞后、多次重置后误差是否逐轮减小、控制力是否呈阶梯前馈。',
      objects: ['msd', 'freeMass']
    },
    '09': {
      title: '鲁棒与现代预测',
      idea: '在模型不确定或计算受限时仍要保证性能：Tube MPC 用「名义轨迹 + 保镖反馈」，SDRE 在线重解黎卡提方程，GPC/RLS 用递推辨识与长时域预测。',
      derivation: 'Tube MPC 解无扰名义优化得 u^*，再加辅助项 K_{anc}(x-x^*) 把被扰动踢出「管道」的状态拉回；SDRE 把非线性系统写成 A(x)X 的伪线性形式，每拍求解 A(x)^{\\mathsf{T}}P+PA(x)-PBR^{-1}B^{\\mathsf{T}}P+Q=0；RLS 用协方差矩阵 P_k 递推更新参数估计 \\hat\\theta。',
      math: 'u=u^{*}_{mpc}+K_{anc}(x-x^{*}_{mpc})',
      tuning: [
        '先设预测视野 t_pred / Ny 与代价权重 lambda，观察基线。',
        '再加辅助镇定增益 K_anc，从小到大检验抗扰回拉能力。',
        '辨识类调整遗忘因子 rls_lambda（接近 1 更平滑、更小更跟踪时变）。',
        '加入纯滞后与参数摄动，检验鲁棒边界。'
      ],
      pitfalls: [
        '预测视野过长导致响应迟缓与计算负担。',
        '遗忘因子过小使辨识结果被噪声带偏。',
        '把局部近似（SDRE）当成全局最优解。'
      ],
      observe: '扰动后的回拉速度、名义与实际轨迹的偏差、参数估计曲线是否平滑。',
      objects: ['msd', 'freeMass']
    },
    '10': {
      title: '观测器与网络拓扑',
      idea: '当传感器有噪声、状态不可全测、或控制指令要穿过网络时，先解决「看得准」和「送得到」：卡尔曼/粒子滤波估状态，Artstein 降阶补偿纯迟延，量化与事件触发节省带宽。',
      derivation: '卡尔曼滤波在「模型预测」与「含噪测量」之间按 Q/R 协方差做加权：\\hat x^- 与 y 的差经增益 K_k 修正；EKF 对非线性模型在线雅可比线性化；粒子滤波用带权粒子集做蒙特卡洛近似。网络侧 Artstein 变换用 z=x+\\int_0^d e^{As}Bu(t-s)\\,\\mathrm{d}s 把含迟延系统降阶为无迟延系统；量化控制把 u 强制取整成阶梯。',
      math: '\\hat{x}_k=\\hat{x}^{-}_k+K_k\\left(y_k-h(\\hat{x}^{-}_k)\\right)',
      tuning: [
        '先把噪声设为 0 得到理想基线，再逐步加大 sensorNoise。',
        '调 Q_cov / R_cov：更信模型就减小 Q，更信测量就减小 R。',
        '粒子数 p_num 增加可改善非高斯噪声下的估计，但计算量上升。',
        '网络类调 delay_a / q_step / et_limit，观察阶梯状控制力与极限环。'
      ],
      pitfalls: [
        '噪声为 0 时评价滤波器优劣，看不出差异。',
        '把过程噪声 Q 设得过大，估计值跟着噪声抖动。',
        '量化台阶过大导致目标附近永久极限环。'
      ],
      observe: '控制力是否平滑（滤波效果）、量化/事件触发的阶梯、大迟延下是否振荡。',
      objects: ['msd', 'freeMass']
    },
    '11': {
      title: '高阶与物理前沿',
      idea: '从更底层的数学与物理结构出发改造控制器：分数阶微积分调相位、隐式欧拉保证离散稳定、无源化保证能量恒减、混沌耦合展示非线性动力学。',
      derivation: 'FO-PD 用 Grünwald-Letnikov 近似 D^{\\mu}e 把微分阶次从整数 1 放宽到 0～1.5，获得更细腻的超前相位；隐式欧拉把 u_k=u_{eq}+k s_k/(1+\\lambda\\Delta t) 的分母加 1，即使增益极大也不发散；反馈无源化先用前馈力把系统「伪装」成耗散体，再施加 K_v v 使能量单调下降。',
      math: 'u_k=u_{eq}+\\frac{k\\,s_k}{1+\\lambda\\Delta t}',
      tuning: [
        '先从默认阶次 mu / 增益开始，确认基线稳定。',
        '分数阶阶次小步调整，观察相位裕度与超调变化。',
        '隐式欧拉类可把 lambda 拉到很大，验证离散不发散。',
        '能量类方法重点看相平面是否单调向原点收缩。'
      ],
      pitfalls: [
        '把分数阶近似的历史窗口当成无限记忆。',
        '无源化忽略未建模扰动，实际能量未必恒减。',
        '混沌耦合类方法主要用于演示，不适合作为工程整定结论。'
      ],
      observe: '相平面是否单调收缩、控制力是否连续、大增益下是否仍不发散。',
      objects: ['msd', 'pendulum']
    }
  };

  /* ── 重点方法的推导要点（其余方法由体系模板 + 自身公式生成） ── */
  const METHOD_INSIGHTS = {
    'OpenLoop': { derivation: '完全没有反馈通道，u=k\\,r 只依赖指令。闭环方程里不含 x，因此任何模型误差或外扰 d 都会直接变成稳态偏差：x_{ss}\\approx(kr+d)/k_{plant}。它的价值是作为「反馈究竟带来什么」的对照基准。', usecase: '演示反馈的必要性；不要用于有扰动的场合。' },
    'P': { derivation: 'u=K_p e 相当于给对象并联一根虚拟弹簧。闭环刚度变为 k+K_p，故上升更快；但阻尼项 c 不变，阻尼比下降 → 超调增大。稳态时 e_{ss}=k\\,r/(k+K_p)，静差无法归零。', usecase: '最基础的反馈入门，适合观察超调与静差。' },
    'PI': { derivation: '在 P 的基础上加 K_i\\int e\\,\\mathrm{d}t，把系统型别提高一阶，对常值扰动/弹簧负载实现零静差。代价是积分带来约 90° 相位滞后，容易超调与积分饱和。', usecase: '二阶线性对象、需要消除静差且允许适度超调。' },
    'PD': { derivation: 'u=K_p e-K_d v 等价于把阻尼系数从 c 提高到 c+K_d，直接抬高阻尼比，压住超调；但因为缺少积分，弹簧负载下仍有静差。', usecase: '二阶线性对象、需要强阻尼且可接受静差。' },
    'PID': { derivation: '三项分别对应「现在 / 过去 / 未来」：K_p e 提高刚度，K_i\\int e 消除静差，-K_d v 注入阻尼。闭环特征方程 s^3+(c+K_d)s^2+(k+K_p)s+K_i=0，可用根轨迹理解参数耦合。', usecase: '通用基准；先 Kp、再 Kd、最后 Ki。' },
    'IPD': { derivation: '把 P、D 的作用对象从误差 e 改为状态 x，目标 r 只进入积分通道。这样阶跃瞬间 e 突变不会在 P/D 上产生冲击尖峰，保护执行器。', usecase: '指令频繁跳变、机械结构限加速度。' },
    '2DOF-PID': { derivation: '引入设定值权重 b，令 u=K_p(br-x)+K_i\\int e-K_d v，把「跟踪响应」与「抗扰响应」解耦：调小 b 可削弱阶跃超调而不牺牲抗扰刚度。', usecase: '既要求强抗扰又要求柔和跟踪。' },
    'IncPID': { derivation: '不保存积分累计量，只算本拍的增量：\\Delta u_k=K_p(e_k-e_{k-1})+K_i e_k\\Delta t+K_d(e_k-2e_{k-1}+e_{k-2})，输出 u_k=u_{k-1}+\\Delta u_k。因为积分作用被改写成了相邻误差之差，一旦执行器限幅，\\Delta u 自然停止累积，退饱和时也不会出现「欠账一次性还清」的巨幅超调。代价是稳态时需要靠 \\Delta u 的微小残差维持输出，精度略低于位置式。' , usecase: '执行器带积分特性、需要平滑切换与天然抗饱和的场合。' },
    'Nested-PID': { derivation: '外环位置 P 生成速度指令 v_d，内环速度 PI 生成推力。内环高带宽把对象「封装」成调速系统，外环低带宽只管位置，抗扰由内环承担。', usecase: '无人机、机械臂等串级结构。' },
    'PolePlacement': { derivation: '令 u=-K_1x-K_2v+(K_1+k)r，闭环特征多项式直接写成 (s+p_1)(s+p_2)，对比系数反解 K_1=m p_1p_2-k、K_2=m(p_1+p_2)-c。', usecase: '想直接指定收敛速度；也是倒立摆镇定的首选。' },
    'LQR': { derivation: '对双积分器/二阶对象取 Q=\\mathrm{diag}(q_x,q_v)、R=r，黎卡提方程的稳态解给出 K_p=\\sqrt{q_x/r}、K_d=\\sqrt{q_v/r+2mK_p}。权重比越大，越舍得花控制能量换精度。', usecase: '需要「精度—能耗」最优折中。' },
    'LQG': { derivation: '分离原理：先用卡尔曼滤波器从含噪测量得到 \\hat x,\\hat v，再把估计值喂给 LQR 增益。滤波器与控制器可独立设计。', usecase: '传感器噪声明显的状态反馈。' },
    'LQR-I': { derivation: '把误差积分 \\int e\\,\\mathrm{d}t 作为第三个状态扩维，整体求解黎卡提方程，使最优控制自带积分通道，消除 LQR 的静差。', usecase: '有弹簧/常值偏置又想保留最优框架。' },
    'MPC': { derivation: '在视野 t_pred 内用模型解析预测自由响应，最小化 (x_{pred}-r)^2+\\lambda u^2。每个采样周期只执行最优序列的第一步，下一拍重新预测（滚动优化）。', usecase: '有约束、需要前瞻的场合。' },
    'H-Infinity': { derivation: '把设计目标写成「最坏情况下的能量放大倍数」：\\min_K||T_{w\\to z}||_\\infty<\\gamma，即任何能量有限的扰动 w 引起的误差 z 不超过 \\gamma 倍。求解归结为两个代数黎卡提方程（控制侧与滤波侧），\\gamma 越小越接近最优但控制器增益越大。与 LQR 的差别是 LQR 优化平均代价、H∞ 优化最坏情形。', usecase: '扰动能量有界但频率未知、需要给出最坏情形保证。' },
    'SMC': { derivation: '取 s=c e+\\dot e，等效控制 u_{eq}=cv+kx+m(c\\dot e-\\ddot r) 维持面上滑动，切换项 K\\operatorname{sat}(s/\\varepsilon) 负责把状态拍到面上。', usecase: '强扰动、模型不确定的基准滑模。' },
    'SuperTwisting': { derivation: '二阶滑模把不连续切换放进积分器：u\\propto \\lambda\\sqrt{|s|}\\operatorname{sgn}(s)+W\\int\\operatorname{sgn}(s)\\,\\mathrm{d}t，输出连续但保留有限时间收敛与鲁棒性。', usecase: '既要鲁棒又要控制力平滑。' },
    'ADRC': { derivation: '把所有未建模动态与外扰记为总扰动 f，扩张状态 z_3 在线估计它；取 u=(u_0-z_3)/b_0 后对象近似为双积分器，用 \\omega_c^2(r-z_1)-2\\omega_c z_2 镇定。', usecase: '模型不精、扰动复杂的工程对象。' },
    'MRAC': { derivation: '设 u=\\theta_r r+\\theta_x x+\\theta_v v，定义参考模型输出与真实输出之差 e_m，用李雅普诺夫稳定性推出 \\dot\\theta\\propto-\\gamma e_m\\phi，让参数在线演化成「理想模型」。', usecase: '对象参数缓慢漂移、需要在线自适应。' },
    'PPC': { derivation: '用对数映射把漏斗 |e|<\\rho(t) 拉伸到无约束域，控制 z 有界即保证 e 不越界；\\rho(t) 指数收缩给出预设的瞬态性能。', usecase: '对超调与瞬态误差有硬指标。' },
    'BLF': { derivation: '障碍李雅普诺夫函数 V=\\frac{1}{2}\\log\\frac{k_b^2}{k_b^2-e^2} 在 |e|\\to k_b 时发散，控制律含 e/(k_b^2-e^2) 因此产生趋于无穷的斥力。', usecase: '状态有安全边界、禁止越界。' },
    'PTC': { derivation: '把收敛时间做成显式约束：令缩放函数 \\mu(t)=T_p/(T_p-t)，误差被 \\mu(t) 放大后送入反馈，等效增益按 1/(T_p-t) 增长；对二阶系统则用 \\mu^2 使增益按 1/(T_p-t)^2 增长。当 t\\to T_p 时增益\\to\\infty，数学上保证 e(T_p)=0。工程上必须设置增益上限，否则临近截止时刻控制量会爆掉——这也是 PTC 在实机上最常见的失败原因。', usecase: '有硬性截止时间约束、且能接受临近截止时的大增益。' },
    'InputShaping': { derivation: '把阶跃拆成两个脉冲：幅值 A_1=1/(1+K)、A_2=K/(1+K)，其中 K=e^{-\\zeta\\pi/\\sqrt{1-\\zeta^2}}，间隔为阻尼振荡周期的一半 T_d/2={\\pi}/({\\omega_n\\sqrt{1-\\zeta^2}})。第二个脉冲激发的振动与第一个正好反相，叠加后残余振动为零。它对频率误差有容忍带（ZV 约 ±15%），更鲁棒的 ZVD 用三个脉冲把容忍带扩到 ±40%，代价是响应再慢半个周期。', usecase: '柔性结构、数控机床、起重机防摆等「定位后不许抖」的场合。' },
    'FuzzyPID': { derivation: '以 (e,\\dot e) 的三角形隶属度查 3×3 规则库，重心法解模糊得到 \\Delta K_p,\\Delta K_i,\\Delta K_d，使增益随工况连续变化。', usecase: '非线性/变工况对象的直观调参。' },
    'NeuralPID': { derivation: '把 PID 写成三个可学习权重：u=w_1 e+w_2\\int e+w_3\\dot e，权重按 Hebbian 规则 \\Delta w_i=\\eta\\,e\\,u\\,x_i 在线更新——「误差大且输出大」的通道权重被加强。它本质上是把增益整定变成了无监督学习，因此不需要标注数据，但也因此没有明确的最优目标，学习率 \\eta 过大时会来回振荡。', usecase: '演示在线学习与增益自组织，作为「会自己调参的 PID」。' },
    'EKF-Ctrl': { derivation: '把未知扰动 d 增广为状态，用扩展卡尔曼滤波在线估计，再用估计值做状态反馈；协方差 Q/R 决定「信模型」还是「信传感器」。', usecase: '含噪测量且存在未知常值扰动。' },
    'Particle-Filter': { derivation: '用 N 个带权样本 \\{x^{(i)},w^{(i)}\\} 逼近任意形状的后验分布：先按状态方程传播粒子，再按观测似然 w^{(i)}\\propto p(y|x^{(i)}) 更新权重并归一化，最后按权重重采样以抑制退化。相比卡尔曼滤波只维护均值与方差，它能表达多峰、偏斜等非高斯形状，因此对脉冲型/断崖型噪声更稳；代价是计算量随 N 线性增长，且 N 太小会出现样本枯竭。', usecase: '非高斯/脉冲噪声下的状态估计演示。' },
    'Implicit-Euler-Ctrl': { derivation: '后向欧拉离散把切换项写成 u_k=u_{eq}+k s_k/(1+\\lambda\\Delta t)，分母恒大于 1，因此即使 \\lambda 极大也不会出现「增益过大 → 离散反噬发散」。', usecase: '数字控制中高增益实现的稳定性演示。' },
    'Feedback-Passivation': { derivation: '先用前馈力把对象重塑为能量只泄不进的耗散系统，再加 K_v v 阻尼；由于总能量单调下降，只要 K_v>0 物理上就不可能发散。', usecase: '强调能量安全的场合。' },
    'DOB': { derivation: '名义模型预测的输出与实际输出之差，经对象逆模型反算，就是「模型解释不了的那部分力」：\\hat d=Q(s)\\,G_n^{-1}(s)(y-G_n(s)u)，再用 u=u_{nom}-\\hat d 前馈对消。Q(s) 是一个低通滤波器，它的带宽决定补偿范围——带宽内扰动被吃掉，带宽外则原样通过，因此 Q 的设计就是「抗扰带宽」与「噪声放大」的折中。', usecase: '摩擦、风阻等可观测扰动补偿，且不需要扰动模型。' },
    'Backstepping': { derivation: '把二阶系统拆成两级虚拟误差 z_1=x-r、z_2=v-\\alpha_1，逐级构造 V 并令 \\dot V<0，最终反推出真实控制力。', usecase: '严格递推设计、非线性系统教学。' },
    'FeedbackLin': { derivation: '用 u=m(K_p e-K_d v)+cv+kx 精确抵消已知动态，闭环退化为 \\ddot e+K_d\\dot e+K_p e=0，取 K_d=2\\sqrt{K_p} 得临界阻尼。', usecase: '模型已知、希望解析设计响应。' },

    /* ── 经典线性体系补充 ── */
    'PI-D': { derivation: '与标准 PID 的差别只在微分通道的取信对象：D 项作用于测量值 x 而不是误差 e，写成 u=K_p e+K_i\\int e\\,\\mathrm{d}t-K_d\\dot x。阶跃指令突变时 \\dot r 不进入 D 项，因此不会出现「设定值一改就冒出巨大尖峰」的问题；代价是对斜坡指令的跟踪会略滞后，因为 D 项看不到指令的变化趋势。', usecase: '设定值频繁跳变、执行器怕冲击的场合。' },

    /* ── 频域与最优理论补充 ── */
    'Deadbeat': { derivation: '离散域直接把闭环极点全部放到 z=0：由对象离散模型 x_{k+1}=a x_k+b u_k，取 u_k=(r-x_k)/b 使误差在下一拍归零。理论上是「最快」，但增益正比于 1/b，采样周期缩小时增益急剧放大，模型误差与测量噪声被成倍注入执行器，实际几乎总要放宽到 2~3 拍收敛。', usecase: '采样稳定、模型精确的伺服定位，用作「最快极限」的对照基准。' },
    'QFT-LeadLag': { derivation: '在频域里手工「掰」开环形状：超前补偿 (1+\\alpha Ts)/(1+Ts) 把相位往上抬 \\varphi_{\\max}=\\arcsin\\frac{\\alpha-1}{\\alpha+1}，加在穿越频率附近换取相位裕度；滞后补偿 (1+Ts)/(1+\\beta Ts) 压低高频增益换抗噪。QFT 的贡献是把「对象参数在一个区间内变化」画到尼科尔斯图上，要求所有工况的模板都落在同一组边界之外。', usecase: '对象增益/时间常数有明确区间、需要一次设计覆盖全部工况。' },
    'IMP-Servo': { derivation: '内模原理：要无静差跟踪某类指令，闭环里必须嵌入该指令的发生器。常值指令的发生器是 1/s，正弦指令是 1/(s^2+\\omega^2)，所以跟踪正弦必须把一对虚轴极点放进控制器。它与 PI 的关系正是「PI 把 1/s 放进去了」，因此能吃掉常值静差。', usecase: '跟踪周期性/结构性指令（常值、斜坡、正弦），要求零稳态误差。' },
    'Preview': { derivation: '若指令 r(t) 提前 L 秒已知，就把未来信息做成前馈：u_{ff}(t)=k_{prev}\\,r(t+L)。前馈不改变闭环极点，只把「追」变成「等」，因此能在不牺牲稳定裕度的前提下把跟踪滞后压到接近零。L 越大收益越大，但对指令突变的鲁棒性越差（预知错了反而更糟）。', usecase: '指令可预知（数控插补、路径跟踪）。' },

    /* ── 非线性结构控制补充 ── */
    'BangBang': { derivation: '控制量只取两个极值 u=\\pm u_{\\max}，由误差符号决定。时间最优控制的理论结果指出：二阶系统的燃料/时间最优解必然是「满推力—切换—满推力」，切换面是相平面上的抛物线 s=x+v|v|/(2a)。它给出最短到达时间，代价是切换瞬间的冲击与抖振。', usecase: '继电器、电磁阀等只能开/关的执行器；作为「最快」的性能上界。' },
    'BangBang-Zone': { derivation: '在 BangBang 外面套一个死区：|e|<\\delta 时按比例输出，|e|\\ge\\delta 时才满推力。死区把「无穷次切换」变成「有限次切换」，消除了极限环；\\delta 越小越接近时间最优，但切换越频繁。', usecase: '开关执行器 + 需要抑制抖振的定位。' },
    'Relay': { derivation: '带滞回的开关：u=+U 直到 e 低于 -h 才翻到 -U，反之亦然。滞回宽度 h 让系统在 e=\\pm h 之间「滑行」而不抖动，代价是稳态误差被量化到 ±h。描述函数法给出自振幅度估计：A\\approx 4U/(\\pi\\omega|G(j\\omega)|)。', usecase: '温控、阀门等大惯性开关对象。' },
    'TimeOptimal': { derivation: '按相平面分区决定加速度方向：把状态 (e,\\dot e) 投到相平面，切换曲线取 \\dot e|\\dot e|/(2a)，状态在其上方就反向全速制动、下方则全速加速。理想情况下状态沿切换曲线滑到原点，所用时间正是理论下界，因此常作为其他方法的「时间基准」。', usecase: '行程受限、要求最短定位时间的伺服轴。' },
    'DSC': { derivation: '反步法要对虚拟控制 \\alpha_1 求导，阶数越高微分爆炸越严重。动态面用一阶低通 \\tau\\dot{\\bar\\alpha}_1+\\bar\\alpha_1=\\alpha_1 代替解析求导，\\dot{\\bar\\alpha}_1=(\\alpha_1-\\bar\\alpha_1)/\\tau 直接可得；误差 \\bar\\alpha_1-\\alpha_1 被并入李雅普诺夫函数，代价是收敛变慢约 \\tau。', usecase: '高阶系统的反步实现，避免微分爆炸。' },
    'TDC': { derivation: '用「上一拍的实测加速度」代替模型：u(t)=\\bar M\\,(\\ddot x^{d}+K_d\\dot e+K_p e)-\\bar M\\,\\ddot x(t-L)。只要采样延迟 L 足够小，\\ddot x(t-L)\\approx\\ddot x(t)，包括未建模动态与扰动在内的所有项都被这一项吃掉，只剩 O(L) 的残余误差。', usecase: '模型难建但加速度可测的高速伺服。' },
    'NDC': { derivation: '把线性阻尼项 -K_d\\dot e 换成饱和形式 -K_d\\operatorname{sat}(\\dot e/\\varepsilon)：速度小时保持线性（不影响小信号性能），速度大时阻尼力有界（不撑爆执行器）。本质是用有界函数替代无界线性增益，保证 \\dot V\\le 0 在全局成立。', usecase: '大范围机动、执行器饱和明显的系统。' },
    'CFTC': { derivation: '引入分数幂 \\dot e=-k\\,e^{\\alpha}（0<\\alpha<1），积分得 e(t)^{1-\\alpha} 线性衰减，因此在有限时间 T=|e_0|^{1-\\alpha}/(k(1-\\alpha)) 内精确到零，而不是指数逼近。代价是 e\\to 0 时增益 e^{\\alpha-1}\\to\\infty，必须加饱和或混合线性项。', usecase: '要求「有限时间精确收敛」而非渐近收敛。' },

    /* ── 滑模家族补充 ── */
    'VSC-RL': { derivation: '把到达条件写成等式 \\dot s=-\\varepsilon\\operatorname{sgn}(s)-k s，解出 s(t) 的两种收敛段：\\varepsilon 项保证有限时间到达（约 |s_0|/\\varepsilon），k s 项保证 s 大时指数快进。因此 \\varepsilon 决定「贴面快慢」，k 决定「远场快慢」，调参时可以先定 k 再压 \\varepsilon 减抖振。', usecase: '需要显式控制到达速度的滑模实现。' },
    'ISMC': { derivation: '滑模面取 s=\\dot e+c e+c_i\\int_0^t e\\,\\mathrm{d}t，把积分项搬进滑模面本身。好处是滑动阶段（s\\equiv 0）已经自带积分器的零静差性质，即使对象有常值扰动也不需要额外的积分补偿；代价是面一旦被破坏，积分项会加大恢复过程的超调。', usecase: '存在常值/慢变扰动，要求滑动阶段零静差。' },
    'TSMC': { derivation: '滑模面取 s=\\dot e+\\beta e^{q/p}（q<p 为正奇数），等效控制给出的收敛律是 \\dot e=-\\beta e^{q/p}，积分即得有限时间 T=\\frac{p}{\\beta(p-q)}|e_0|^{(p-q)/p}。相比线性面 s=\\dot e+ce 只能指数逼近，终端面在原点附近仍有足够「推力」。', usecase: '要求有限时间到达且需要精确到零。' },
    'FTSMC': { derivation: '在终端面基础上再加线性项：s=\\dot e+\\alpha e+\\beta e^{q/p}。远离原点时 \\alpha e 主导（快速接近），靠近原点时 \\beta e^{q/p} 主导（有限时间收尾），因此同时解决 TSMC「远处慢」与线性面「原点处慢」两个问题。', usecase: '既要远场快速又要有限时间收尾。' },
    'ASMC': { derivation: '把不确定上界变成在线估计：切换增益 \\hat K 按 \\dot{\\hat K}=\\gamma|s| 自适应增长，直到刚好压住扰动。这样既不需要事先知道扰动上界，也不会像固定大增益那样持续抖振——增益只在真正需要时才升上去。', usecase: '扰动上界未知或时变的滑模应用。' },
    'LevantHOSM': { derivation: '用二阶滑模直接构造精确微分器：\\dot z_0=v_0，v_0=-\\lambda|z_0-f|^{2/3}\\operatorname{sgn}(z_0-f)+z_1，逐层把 \\dot f、\\ddot f 估出来。由于每一层都是有限时间精确的，估计出的导数不含低通滤波的相位滞后，这是它优于「差分+滤波」的关键。', usecase: '需要高质量速度/加速度信号但只有位置可测。' },
    'VariableG-SMC': { derivation: '把切换增益写成状态的函数 K(x)=K_0+K_1|x| 而非常数。状态远离开关面时用大增益抢时间，贴近面时自动收小以抑制抖振，相当于把「到达速度」和「抖振幅值」这两个矛盾指标按距离分开优化。', usecase: '大行程 + 高精度并存，需要兼顾到达速度与抖振。' },
    'AW-PI': { derivation: '在 PI 外面加抗饱和回路：检测 u 是否超出限幅，一旦超限就把积分器按 \\dot I=K_i e-K_{aw}(u_{sat}-u) 反向泄放，使积分不再「越积越多」。没有这一项时，限幅期间误差持续积分，退饱和后要花很久才把欠账还完，表现为大幅超调。', usecase: '执行器限幅明显、积分饱和会导致大超调的场合。' },

    /* ── 数据驱动与智能补充 ── */
    'NPID': { derivation: '韩京清型非线性 PID 用 fal 函数替换线性增益：fal(e,\\alpha,\\delta) 在小误差区线性（|e|<\\delta 时为 e/\\delta^{1-\\alpha}）、大误差区饱和（|e|^\\alpha\\operatorname{sgn}e）。结果是「小误差时增益高、精度好；大误差时增益自动收、不冲击」，用一个函数实现了增益调度。', usecase: '大范围工况、希望单一控制器兼顾大小误差。' },
    'STR': { derivation: '两步走：先用递推最小二乘在线辨识对象参数 \\hat\\theta_k=\\hat\\theta_{k-1}+K_k(y_k-\\phi_k^{\\mathrm{T}}\\hat\\theta_{k-1})，再把估计值代入极点配置/PID 公式重算增益。它是「辨识 + 设计」的串联，因此辨识的激励不足（指令长期不变）时参数会漂移，必须加死区或遗忘因子。', usecase: '对象参数慢变且可被指令充分激励。' },
    'MFAC': { derivation: '用「伪偏导数」代替模型：把一般非线性系统在每一拍写成 \\Delta y_k=\\phi_k\\Delta u_k，\\phi_k 由输入输出数据在线估计，控制律取 u_k=u_{k-1}+\\frac{\\rho\\phi_k}{\\lambda+\\phi_k^2}(r_{k+1}-y_k)。全过程不需要任何机理模型，只需要「输出对输入的变化率」。', usecase: '机理不清、但输入输出数据可测的过程控制。' },
    'iPID': { derivation: '超局部模型把对象压成 y^{(\\nu)}=F+\\alpha u，其中 F 是「所有不知道的东西」的集总项，用代数估计器 \\hat F=(y_k-y_{k-1})/h-\\alpha u_{k-1} 从上一拍数据反算。控制器再写成 u=(y^{(\\nu)*}-\\hat F+K_p e+K_d\\dot e)/\\alpha，结构上就是一个「带扰动补偿的 PID」。', usecase: '模型极简、需要快速上手的工程对象。' },
    'U-Model': { derivation: '把非线性对象写成 U 模型 y^{(n)}=f(y,\\dot y,\\dots)+b u，其中未知的 f 被当作「广义控制输入」的一部分，用求根方式从期望闭环方程反解 u。它的价值是让非线性系统也能套用线性频域设计语言（带宽、超调、相位裕度）。', usecase: '非线性但阶次已知的对象，希望沿用线性设计直觉。' },
    'ESC': { derivation: '在控制量上叠加小幅抖动 a\\sin\\omega t，用解调（乘同频正弦再低通）从输出里提取梯度，然后按 \\dot{\\hat\\theta}=k\\,\\xi 把工作点推向极值。这是一个「边扰动边爬山」的过程：抖动幅度 a 决定探索范围，\\omega 与滤波器带宽决定收敛速度，两者必须拉开 5~10 倍频差才能解耦。', usecase: '目标函数未知、只能靠测量输出判断好坏（最大功率点跟踪）。' },
    'BELBIC': { derivation: '仿照大脑杏仁核：奖励信号 Rew 与感觉输入 S 分别驱动「情绪」节点与「学习」节点，输出 MO=EA-EO。权重按 \\dot V_i=\\alpha\\max(0,(Rew-\\overline{Rew}))S_i 更新——只在「比平均更好」时才学习，天然实现了对好结果的强化。', usecase: '奖励稀疏或目标函数难以解析表达的场景。' },
    'Linear-Actor-Critic': { derivation: 'Actor 用线性参数化策略 u=\\theta^{\\mathrm{T}}\\phi(x)，Critic 用线性函数逼近值函数 V=w^{\\mathrm{T}}\\phi(x)，按 TD 误差 \\delta=r+\\gamma V(x\')-V(x) 同时更新两者 \\dot\\theta\\propto\\delta\\phi,\\ \\dot w\\propto\\delta\\phi。闭环稳定性依赖学习率足够小（时间尺度分离），学习率过大必然发散。', usecase: '连续状态空间的强化学习入门演示。' },
    'Gradient-PID': { derivation: '用梯度下降在线最小化跟踪误差平方：按 \\partial e^2/\\partial K 的方向更新增益。关键难点是「梯度怎么来」——真机上前向差分要多次试验，所以实际多用迭代反馈整定（IFT）在每轮实验后离线更新一次，本平台为教学做了单步近似。', usecase: '无法建模、但可以反复跑实验的控制器整定。' },

    /* ── 融合与复合架构补充 ── */
    'IMC': { derivation: '把对象模型 \\tilde G 并联在控制器旁，构成「内部模型」回路，等效控制器为 Q=G_c/(1+G_c\\tilde G)。取 Q=\\tilde G^{-1}F（F 为一阶低通）时，闭环传递函数直接等于 F，于是「跟踪性能」由 F 的时间常数单独决定，鲁棒性由 F 的带宽单独决定，两个旋钮互不干扰。', usecase: '模型较准、需要「性能—鲁棒」解耦调节的过程控制。' },
    'NL-ADRC': { derivation: '与 LADRC 相同，只把线性误差组合换成 fal 非线性组合：u_0=\\beta_1\\operatorname{fal}(e_1)+\\beta_2\\operatorname{fal}(e_2)。小误差区用大增益换精度，大误差区自动收增益防超调，因此在同一组参数下能同时改善「稳态精度」与「大偏差时的平稳性」。', usecase: '宽工况范围、线性 ADRC 难以兼顾两端的对象。' },
    'ARC': { derivation: '把自适应与鲁棒项并行叠加：u=u_a+u_s，u_a 用参数估计值做模型补偿，u_s 用 -K s 或有界鲁棒项压住估计残差。设计上要求 \\theta^{\\mathrm{T}}\\phi 满足凸参数化条件，并用投影算子把 \\hat\\theta 限制在已知区间内，避免估计跑飞。', usecase: '参数不确定但有界、且需要保证瞬态性能上限。' },
    'ESO-SMC': { derivation: '扩张状态观测器把未建模动态与扰动合成 f 并在线估计，滑模面改为 s=\\dot e+c e，控制律 u=u_{eq}-\\hat f/b-K\\operatorname{sat}(s/\\varepsilon)。观测器承担「慢变的大扰动」，滑模只负责「剩下的快速小残差」，因此切换增益可以取得很小，抖振显著下降。', usecase: '扰动幅值大但变化慢，纯滑模抖振过强的场合。' },
    'L1': { derivation: '结构上是「状态预测器 + 自适应律 + 低通滤波」：预测器给出 \\hat x，自适应律按 \\dot{\\hat\\theta}=\\Gamma\\operatorname{Proj}(\\tilde x^{\\mathrm{T}}PB\\,u) 更新，最后把自适应控制量过一阶低通 C(s)=a/(s+a)。低通把高频自适应动作挡在执行器之外，换来「性能与鲁棒性解耦」——这是 L1 与 MRAC 最本质的区别。', usecase: '需要快速自适应但不能让高频自适应信号进入执行器。' },
    'I-and-I': { derivation: '不以「误差趋零」为目标，而是构造一个目标流形 z=\\hat\\theta-\\theta+\\beta(x)=0，先让状态在有限时间内被「浸入」到流形上，再由流形上的约化动力学把参数误差消掉。好处是暂态过程中参数估计与状态镇定同时进行，不会出现「先学后控」的漫长等待。', usecase: '需要保证暂态品质的自适应镇定。' },
    'AdaptBackstepping': { derivation: '在反步的每一级把未知参数也当作状态，李雅普诺夫函数里加入 \\frac{1}{2\\gamma}\\tilde\\theta^{\\mathrm{T}}\\tilde\\theta；对 \\tilde\\theta 求导时把 \\dot{\\hat\\theta} 设计成正好抵消交叉项，于是总 \\dot V 仍为负定。代价是参数收敛依赖持续激励（PE 条件），指令不变时估计会漂。', usecase: '参数未知但结构已知的严格反馈型系统。' },
    'T-DOB': { derivation: '用「延迟一拍的状态」和「当前状态」的差反推扰动：\\hat d_k=\\ddot x_k-\\bar M^{-1}(u_{k-1}-\\bar c\\dot x_{k-1}-\\bar k x_{k-1})。只要采样够快，模型误差与真实扰动都被这个差分吃掉，等效于把扰动观测器写成了「时间延迟形式」，不需要低通滤波器也就没有相位滞后。', usecase: '采样率高、模型粗糙的扰动补偿。' },

    /* ── 前沿约束补充 ── */
    'ETC': { derivation: '只有在触发条件被违反时才更新控制量：||e_{sample}||>\\sigma||x||+\\eta（相对 + 绝对混合阈值）。两次触发之间 u 保持不变（零阶保持），因此通信/计算量下降，但必须保证触发间隔有正下界（否则会出现芝诺现象，无限次触发）。', usecase: '网络化控制、算力或带宽受限。' },
    'Switched': { derivation: '系统在若干子系统间切换，稳定性不能靠单个子系统保证——需要驻留时间 \\tau_d 足够长，使李雅普诺夫函数在切换瞬间的跳升被两次切换之间的衰减吃掉：V(x(t_k))\\le\\mu^{-1}V(x(t_k^-))，要求 \\mu e^{-\\lambda\\tau_d}<1。', usecase: '多模态系统、增益调度或故障重构。' },
    'DynPole': { derivation: '让极点随状态移动：远离开关面时把极点放在左半平面远处（抢速度），接近目标时把极点拉到靠近虚轴（降增益、减抖振）。实现上就是把 K_p、K_d 写成 e 的函数，等价于连续插值的增益调度，好处是过渡连续、不产生切换冲击。', usecase: '大行程快速接近 + 近端精细定位。' },
    'FxTC': { derivation: '收敛时间上界与初始状态无关：\\dot V\\le-\\alpha V-\\beta V^{p}（p<1）积分后得 T\\le\\frac{1}{\\alpha(1-p)}\\ln\\frac{\\alpha V_0^{1-p}+\\beta}{\\beta}，虽然形式里还有 V_0，但通过分组设计可做到 T\\le 1/(\\alpha(1-p))+1/\\beta 的常数上界。工程意义是「不管从多远开始，都能承诺同一个截止时间」。', usecase: '启动状态不确定但截止时间必须固定。' },
    'Tan-BLF': { derivation: '用 tan 型障碍函数 V=\\frac{k_b^2}{\\pi}\\tan\\frac{\\pi e^2}{2k_b^2}，在 |e|\\to k_b 时 V\\to\\infty，且比对数型 BLF 在边界附近增长更快，因此约束更「硬」。代价是数值上更容易溢出，实现时通常要限制 \\tan 的自变量不超过 0.45\\pi。', usecase: '边界不可触碰、需要更强约束力的场合。' },
    'TimeVary-BLF': { derivation: '把约束边界写成时变函数 k_b(t)=k_0 e^{-\\lambda t}+k_\\infty，障碍函数随之收缩：V=\\frac{1}{2}\\log\\frac{k_b^2(t)}{k_b^2(t)-e^2}。由于边界本身在收缩，误差被「挤」向零，从而在保证不越界的同时获得渐近收敛——这是时不变 BLF 做不到的。', usecase: '既要硬约束又要收敛到零。' },
    'Integral-BLF': { derivation: '对误差的积分 \\int e 也设障碍：V=\\frac{1}{2}\\log\\frac{k_b^2}{k_b^2-(\\int e)^2}。目的是防止「误差瞬时不大但积分累积过多」导致的积分饱和型越界，常用于带执行器速率限制的系统。', usecase: '积分项可能累积越界、需要约束积分幅值。' },

    /* ── 轨迹规划与学习补充 ── */
    'ILC': { derivation: '同一段轨迹重复执行时，把上一轮的误差前馈到下一轮：u_{k+1}(t)=u_k(t)+L\\,e_k(t)。只要 ||I-LG||<1（Q 滤波器保证高频段不放大），误差随迭代次数单调收敛到零。它不改变反馈结构，纯粹靠「重复」把系统性偏差学掉。', usecase: '固定轨迹的重复作业（机械臂点位、数控加工）。' },
    'Repetitive': { derivation: '在反馈回路里插入一个周期延迟 e^{-Ts}：控制器形式 \\frac{1}{1-e^{-Ts}}，等于在 s=j\\,n\\omega_0 处放置无穷多个谐振极点，对周期为 T 的扰动提供无穷大增益。代价是存储一整周期的数据，且对周期抖动敏感（周期间隔一变，零点就错位）。', usecase: '抑制固定周期的重复性扰动（转轴偏心、电源纹波）。' },
    'GainSched': { derivation: '把非线性系统沿工作点族线性化，得到一组 LTI 模型，为每个模型设计控制器 K(\\sigma)，再按调度变量 \\sigma（如速度、液位）在它们之间插值。设计要点是插值必须保证闭环稳定——通常要求各点的 Lyapunov 函数公共（共同李雅普诺夫函数），否则切换瞬间可能失稳。', usecase: '工况跨度大、单一线性控制器无法覆盖。' },
    'SmithPredict': { derivation: '纯滞后 e^{-\\tau s} 在反馈回路里会吃掉相位裕度。Smith 预估器在控制器旁并联「无延迟模型 + 延迟支路」：内环先用无延迟模型闭环，把延迟移到闭环之外。等效结果是延迟只影响「看到结果的时间」，不影响稳定裕度——但这一切以模型延迟准确为前提，τ 估错 20% 以上收益就基本消失。', usecase: '大纯滞后过程（温度、流送）。' },
    'Posicast': { derivation: '把一个阶跃拆成两个：先给 (1-\\delta) 幅值，等半个振荡周期 T_d/2 再补 \\delta。两段响应在目标频率上相位相差 180°，正好相消，于是没有残余振动。它本质上是输入整形的两脉冲版本，只对固定的阻尼振荡频率有效。', usecase: '欠阻尼二阶系统的快速无振定位。' },
    'Fuzzy': { derivation: '直接把 (e,\\dot e) 通过隶属度映射到模糊集，按规则库（如「误差大且误差在增大 → 强正输出」）推理，再用重心法解模糊成 u。它没有显式的增益，非线性完全由隶属度形状与规则表决定；因为没有积分状态，纯模糊控制在常值扰动下会有静差。', usecase: '规则可语言化、模型难以建立的场合。' },
    'EnergyShaping': { derivation: '不直接配置极点，而是配置能量：把闭环能量函数 H_d 设成在目标点取唯一极小值的形状，再反解出所需控制 u。IDA-PBC 的求解条件是匹配方程 g^{\\perp}(f+g u-\\partial H_d/\\partial x)=0。好处是物理意义清晰、天然无源性，特别适合欠驱动系统（如摆、飞轮）。', usecase: '欠驱动机械系统、需要摆起/镇定一体化设计。' },

    /* ── 鲁棒与现代预测补充 ── */
    'TubeMPC': { derivation: '把不确定性拆成「名义预测 + 误差管」：先用名义模型求最优轨迹，再算出一个不变集（tube）包住所有可能的偏差，最后把约束收紧一个 tube 的半径 \\Omega 后再优化。这样只要名义轨迹可行，任意实现都在约束内，把「可能违反约束」变成了「结构上不可能违反」。', usecase: '有硬约束且模型存在有界误差。' },
    'SDRE': { derivation: '把 LQR 的常数矩阵换成状态相关矩阵：解 A(x)P+P A^{\\mathrm{T}}(x)-P B(x)R^{-1}B^{\\mathrm{T}}(x)P+Q=0，u=-R^{-1}B^{\\mathrm{T}}P x。这样在非线性系统上逐点复用 LQR 的「精度—能耗」直觉，代价是每个采样点都要解一次黎卡提方程，且 A(x) 的参数化不唯一（影响可观性）。', usecase: '非线性系统需要 LQR 式最优权衡。' },
    'GPC': { derivation: '用 CARIMA 模型 A(z^{-1})y_k=B(z^{-1})u_{k-1}+C(z^{-1})\\xi_k/\\Delta 处理积分与扰动，在预测视野内最小化 \\sum(y_{k+j}-r)^2+\\lambda\\sum(\\Delta u)^2，并只执行第一个增量。\\Delta 因子天然含积分器，因此常值扰动下无静差。', usecase: '含积分过程、需要无静差的预测控制。' },
    'RLS-Adaptive': { derivation: '递推最小二乘：\\hat\\theta_k=\\hat\\theta_{k-1}+\\frac{P_{k-1}\\phi_k}{1+\\phi_k^{\\mathrm{T}}P_{k-1}\\phi_k}(y_k-\\phi_k^{\\mathrm{T}}\\hat\\theta_{k-1})，协方差按 P_k=(I-K\\phi^{\\mathrm{T}})P_{k-1} 收缩。遗忘因子 \\lambda<1 让旧数据权重衰减以跟踪慢变参数，但 \\lambda 太小会导致协方差「爆炸」，估计值剧烈抖动。', usecase: '参数慢变的在线辨识，配合 STR/MRAC 使用。' },
    'Robust-NL-Damping': { derivation: '不追求精确补偿，只注入「一定耗散」的阻尼：u=-K\\,s-\\frac{1}{4\\varepsilon}\\hat\\rho^2 s，其中 \\rho 是扰动上界估计。由 \\dot V\\le-\\alpha V+\\varepsilon 可知最终误差被限制在 \\sqrt{\\varepsilon} 内——用「有界收敛」换「不需要精确模型」，这是鲁棒设计的典型取舍。', usecase: '模型误差有界、可以接受有界稳态误差。' },
    'NDOB': { derivation: '用非线性观测器同时估计状态与扰动：\\dot{\\hat x}=f(\\hat x)+g(\\hat x)u+\\hat d+L_1(x-\\hat x)，\\dot{\\hat d}=L_2(x-\\hat x)。与线性 ESO 的区别是把 f、g 的非线性形式保留在观测器里，因此在远离工作点时估计仍然准确；代价是要保证 (f,g) 全局 Lipschitz。', usecase: '强非线性对象、工作点跨度大。' },

    /* ── 观测器与网络拓扑补充 ── */
    'Extended-Luenberger': { derivation: '把未知常值扰动增广为状态：\\begin{bmatrix}\\dot x\\\\\\dot d\\end{bmatrix}=\\begin{bmatrix}A&B_d\\\\0&0\\end{bmatrix}\\begin{bmatrix}x\\\\d\\end{bmatrix}+\\begin{bmatrix}B\\\\0\\end{bmatrix}u，再对这个增广系统设计龙伯格观测器。可观测性取决于 (A,B_d) 是否满足秩条件——这也是「常值扰动能否被估计出来」的判定依据。', usecase: '常值/慢变扰动的前馈补偿。' },
    'Neural-RBF-ADRC': { derivation: '用 RBF 网络代替 ESO 的线性组合来拟合总扰动：\\hat f(x)=\\sum w_i\\exp(-||x-c_i||^2/2\\sigma^2)，权重按 \\dot w=\\eta\\,e\\,\\phi(x) 更新。好处是能逼近任意连续非线性；风险是权重初值与中心点选择不当会引入额外误差，且需要足够激励才能收敛。', usecase: '总扰动强非线性、ESO 线性组合拟合不足。' },
    'Artstein-Reduction': { derivation: '输入延迟 \\dot x=Ax+Bu(t-\\tau) 可以用状态变换 z=x+\\int_{t-\\tau}^{t}e^{A(t-\\tau-s)}Bu(s)\\,\\mathrm{d}s 消掉，变换后系统变成无延迟的 \\dot z=Az+B_{new}v。代价是控制器要知道过去 \\tau 时间内的全部输入历史，实现上需要一个延迟缓冲区。', usecase: '输入延迟已知且恒定。' },
    'Quantized-Ctrl': { derivation: '把连续控制量按步长 \\Delta 量化：u_q=\\Delta\\cdot\\operatorname{round}(u/\\Delta)。量化误差相当于叠加了一个有界扰动，闭环的最终误差界大约放大 \\Delta/(2K)（K 为等效刚度）。步长越大通信越省，但精度与抖振同步恶化——这就是「网络带宽换性能」的定量表达。', usecase: '带宽受限的网络化控制、低分辨率 DAC。' },
    'Event-Triggered-MPC': { derivation: '把「何时求解优化问题」也当作决策：只有当预测误差超过阈值，或状态偏离上一个最优轨迹足够远时才重新求解，其余时间复用上一次的控制序列。相比周期 MPC，平均求解次数可降一个数量级，而约束满足性由触发条件保证。', usecase: '算力有限的嵌入式预测控制。' },

    /* ── 高阶与物理前沿补充 ── */
    'FO-PD': { derivation: '把微分阶次从 1 推广到 \\mu\\in(0,1)：D^{\\mu} 在频域的幅值为 \\omega^{\\mu}、相位恒为 \\mu\\pi/2。与整数阶 PD 的 \\omega 幅值相比，分数阶的增益增长更缓（\\mu<1），因此在同样相位超前下噪声放大更小，在 \\mu 与 K_p 之间多出一个可调维度。', usecase: '需要相位超前但嫌整数阶 D 放大噪声。' },
    'Nonlinear-Power-ADRC': { derivation: '把线性误差反馈换成次幂形式 \\operatorname{fal}(e,\\alpha,\\delta)：|e|>\\delta 时增益按 |e|^{\\alpha-1} 衰减（大误差不冲击），|e|<\\delta 时退化为线性高增益（小误差高精度）。它用一条曲线同时实现了「远场柔和 + 近场锐利」。', usecase: '动态范围大、线性 ADRC 难以兼顾两端。' },
    'Lorenz-Coupled': { derivation: '用混沌系统作为「扰动发生器」与控制器耦合：把 Lorenz 系统的状态作为额外的非线性反馈项注入，利用其对初值的敏感性与遍历性增强对未知扰动的覆盖能力。这是教学演示级构造，理论上缺乏稳定性保证，主要用于观察「强耦合非线性反馈」的定性行为。', usecase: '教学演示：非线性耦合反馈的定性现象。' },
    'Speed-Gradient': { derivation: '针对目标泛函 Q(\\theta)，沿其梯度方向更新参数：\\dot\\theta=-\\Gamma\\nabla_\\theta Q。在控制里 Q 通常取跟踪误差的积分，于是 \\dot\\theta 就变成一个「用误差驱动参数」的连续自适应律。它比离散梯度下降更适合连续时间实现，且可直接嵌入李雅普诺夫框架证明收敛。', usecase: '连续时间自适应/最优化的统一框架。' }
  };

  /* ── 构造一份方法的教学文档（结构化） ─────────────── */
  /* ── 稳定性证明库 ─────────────────────────────────────
     每个条目给出一份可核验的稳定性论证：
       kind   结论类型
       V      李雅普诺夫函数 / 特征多项式
       step   求导或判据展开的中间步骤（文字）
       dV     求导结果或特征方程
       judge  判据与逻辑链
       cond   成立条件（增益不等式）
     线性方法用特征多项式 + Routh-Hurwitz；非线性方法用直接法。
     ──────────────────────────────────────────────────── */
  const KIND_LABEL = {
    asymptotic: '渐近稳定',
    exponential: '指数稳定',
    finite: '有限时间收敛',
    uub: '一致最终有界 (UUB)',
    iss: '输入-状态稳定 (ISS)',
    passive: '无源稳定',
    marginal: '临界稳定 / 条件稳定'
  };

  const STABILITY = {
    /* ── 01 经典线性 ── */
    'OpenLoop': {
      kind: 'asymptotic',
      conclusion: '对象自身极点决定一切，控制器不参与镇定',
      V: 'V=\\tfrac12 m\\dot x^{2}+\\tfrac12 kx^{2}',
      step: '前馈 u=k r 不含状态反馈，闭环就是原对象 m\\ddot x+c\\dot x+kx=kr。沿轨迹对 V 求导，代入 m\\ddot x=kr-c\\dot x-kx 得：',
      dV: '\\dot V=m\\dot x\\ddot x+kx\\dot x=\\dot x\\,(kr-c\\dot x)=\\,-c\\dot x^{2}+kr\\dot x',
      judge: 'r=0 时 \\dot V=-c\\dot x^{2}\\le 0，由 LaSalle 不变集原理得 \\dot x\\to0、kx\\to0。c>0 且 k>0 时渐近稳定；k=0 时是临界稳定（等速漂移）。',
      cond: 'c>0、k>0。若 r≠0，稳态必须满足 kx_ss=kr，即 x_ss=r——但这依赖 k 精确已知，实际对象参数一变就产生静差，这正是必须引入反馈的原因。'
    },
    'P': {
      kind: 'asymptotic',
      conclusion: '刚度增大 → 自然频率升高，但静差无法消除',
      V: 'V=\\tfrac12 m\\dot e^{2}+\\tfrac12 (k+K_p)e^{2},\\qquad e=r-x',
      step: '常值指令下 \\ddot e=-\\ddot x，把 u=K_p e 代入对象方程得闭环 m\\ddot e+c\\dot e+(k+K_p)e=0。对 V 求导：',
      dV: '\\dot V=\\dot e\\,[\\,m\\ddot e+(k+K_p)e\\,]=-c\\,\\dot e^{2}\\le 0',
      judge: '\\dot V 半负定且只在 ė=0 上为零；由 LaSalle 原理，闭环轨迹最终落在 {ė=0, (k+K_p)e=0} 中，故 e→0、ė→0。这就是二阶线性系统的渐近稳定性。',
      cond: 'k+K_p>0（否则等效刚度变负，出现右半平面极点）且 c>0。注意 k≠0 时 P 控制「无法」消除阶跃静差：稳态 ė=0 但平衡点为 x_ss=K_p r/(k+K_p)，静差 e_ss=kr/(k+K_p)。'
    },
    'PI': {
      kind: 'asymptotic',
      conclusion: '积分器把系统型别提到 I 型 → 阶跃静差为零',
      V: 'D(s)=m s^{3}+c s^{2}+(k+K_p)s+K_i',
      step: 'PI 在回路里串入 1/s，闭环由 2 阶升为 3 阶。写出特征多项式后按 Routh-Hurwitz 排表，前两行为 [m,\\ k+K_p] 与 [c,\\ K_i]，第三行为 (c(k+K_p)-mK_i)/c。',
      dV: 'c(k+K_p)-mK_i>0\\;\\Longleftrightarrow\\;K_i<\\frac{c\\,(k+K_p)}{m}',
      judge: '三阶多项式的全部根具有负实部，当且仅当所有系数为正且 a_1a_2>a_0a_3。因此上述不等式成立时闭环渐近稳定；又因为开环含一个积分器，I 型系统对阶跃的稳态误差为零。',
      cond: 'K_p>-k、K_i>0、c>0，且 K_i 必须「小于」 c(k+K_p)/m。这条上限非常关键：积分增益不是越大越好，越过它就进入右半平面等幅振荡，实验台上表现为「越调越大、最后一直振」。'
    },
    'PD': {
      kind: 'asymptotic',
      conclusion: '微分项等效增加阻尼 → 超调下降，但不改变静差',
      V: 'V=\\tfrac12 m\\dot e^{2}+\\tfrac12 (k+K_p)e^{2}',
      step: 'u=K_p e+K_d\\dot e（实现中对 -\\dot x 取微分，常值指令下与 \\dot e 等价）。代回对象得 m\\ddot e+(c+K_d)\\dot e+(k+K_p)e=0，对 V 求导：',
      dV: '\\dot V=\\dot e\\,[\\,m\\ddot e+(k+K_p)e\\,]=-(c+K_d)\\,\\dot e^{2}\\le 0',
      judge: '与 P 同构，只是阻尼系数由 c 变为 c+K_d。当 k+K_p>0 且 c+K_d>0 时闭环渐近稳定，且 \\zeta=(c+K_d)/(2\\sqrt{m(k+K_p)}) 随 K_d 增大而增大，超调随之下降。',
      cond: 'k+K_p>0、c+K_d>0。K_d 过大会让 \\zeta>1 变成过阻尼（无超调但很慢），且在噪声存在时把噪声放大 K_d 倍进执行器——这是 D 项最主要的工程代价。'
    },
    'PID': {
      kind: 'asymptotic',
      conclusion: '三个增益各管一个方向，稳定的充要条件是 Hurwitz 不等式',
      V: 'D(s)=m s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i',
      step: '把 u=K_p e+K_i\\int e-K_d\\dot x 代入对象并取拉普拉斯变换，得到三阶闭环特征多项式。Routh 表第三行给出稳定边界：',
      dV: '(c+K_d)(k+K_p)>mK_i',
      judge: 'Routh-Hurwitz 判据：全部系数为正 + a_1a_2>a_0a_3 ⟺ 三个极点实部全为负。系数条件 K_p>-k、（c+K_d）>0、K_i>0 分别对应「等效刚度为正」「等效阻尼为正」「积分方向正确」。',
      cond: 'K_p>-k、K_i>0、c+K_d>0，且 K_i<\\dfrac{(c+K_d)(k+K_p)}{m}。这条不等式就是 PID 的稳定域边界：K_d 增大可以放宽 K_i 的上限（微分换积分），这也是「加 D 能让 I 调得更猛」的数学来源。'
    },
    'IPD': {
      kind: 'asymptotic',
      conclusion: '微分前置只改零点不改极点 → 稳定性与 PID 完全相同',
      V: 'D(s)=m s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i',
      step: 'I-PD 把比例与积分作用于误差、微分作用于测量值：u=K_p e+K_i\\int e-K_d\\dot x。写出闭环时 K_d 只出现在 s² 系数上（与 PID 同位置），因为 \\dot x=-\\dot e（常值指令）。',
      dV: '(c+K_d)(k+K_p)>mK_i',
      judge: '特征多项式与 PID 逐项相同，故极点位置相同、稳定域相同。差别只在「零点」：IPD 的指令传递函数没有微分零点，因此阶跃指令下不会出现「设定值一改就冒出巨大尖峰」，但跟踪也略缓。',
      cond: '与 PID 一致。附带收益：微分作用在测量值上，指令突变时 D 项不冲击执行器；代价是微分通道仍然放大测量噪声。'
    },
    '2DOF-PID': {
      kind: 'asymptotic',
      conclusion: '设定值加权只改零点，稳定域与 PID 一致',
      V: 'D(s)=m s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i',
      step: '二自由度 PID 把比例项中的指令单独加权：u=K_p(br-x)+K_i\\int e-K_d\\dot x。加权系数 b 只影响从 r 到 u 的前向通道，不出现在 1+CG=0 的特征方程里。',
      dV: '(c+K_d)(k+K_p)>mK_i',
      judge: '闭环极点由 1+C(s)G(s)=0 决定，而 C(s) 的分母与 b 无关，故极点集合与 PID 完全相同；b 只改变零点，从而独立调节「跟踪超调」与「抗扰超调」。',
      cond: '稳定条件同 PID。b<1 抑制设定值超调、b=1 退化为普通 PID；抗扰响应由 b=1 时的极点与零点共同决定，因此抗扰性能不受 b 改善。'
    },
    'IncPID': {
      kind: 'asymptotic',
      conclusion: '增量式与位置式互为等价实现，稳定域相同',
      V: 'D(z)=z^{3}+a_1z^{2}+a_2z+a_3',
      step: '增量式只累加 \\Delta u_k=K_p(e_k-e_{k-1})+K_i e_k\\Delta t+K_d(e_k-2e_{k-1}+e_{k-2})。把 u_k=u_{k-1}+\\Delta u_k 展开并合并，得到的差分方程与位置式 PID 的离散化完全一致，只是状态变量取法不同。',
      dV: 'a_1a_2>a_3\\quad(\\text{离散 Jury 判据的等价形式})',
      judge: '离散系统稳定判据是 Jury 判据：特征根全部落在单位圆内。由于两者差分方程等价，其根集合相同，稳定域也相同；连续域结论在 \\Delta t 足够小时同样成立。',
      cond: '需 \\Delta t 满足采样定理并留 5~10 倍裕度；\\Delta t 过大时离散化本身会引入不稳定（Jury 判据比 Hurwitz 严格）。增量式额外好处是抗积分饱和，因为它不显式保存积分累计量。'
    },
    'PI-D': {
      kind: 'asymptotic',
      conclusion: '与 IPD 同构，极点方程一致',
      V: 'D(s)=m s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i',
      step: 'PI-D 的比例+积分挂在误差上、微分单独走测量值通道，代入后 s² 系数同样合并为 c+K_d，特征多项式与 PID 一致。',
      dV: '(c+K_d)(k+K_p)>mK_i',
      judge: '极点集合相同 → 稳定域相同。区别在指令响应：D 项看不到 \\dot r，因此设定值阶跃时不会产生脉冲式控制量，适合「指令频繁跳变、执行器怕冲击」的场合。',
      cond: '与 PID 相同。若对象含纯滞后，D 项作用在测量值上会比作用在误差上更保守（少了一次超前），此时可适当加大 K_d。'
    },
    'Nested-PID': {
      kind: 'asymptotic',
      conclusion: '两个环节各自 Hurwitz 且带宽分离 ≥5 倍即稳定',
      V: 'D(s)\\approx\\big(m s^{2}+(c+K_{d,i})s+K_{p,i}\\big)\\big(s+K_{p,o}\\big)',
      step: '串级结构：外环输出速度指令给内环。若内环带宽 \\omega_i 远大于外环 \\omega_o，则内环可近似为 1，闭环特征多项式可分解为内外环两个因子的乘积。',
      dV: '\\omega_i\\ge 5\\,\\omega_o\\;\\Rightarrow\\;\\text{极点近似解耦}',
      judge: '两个因子各自满足 Routh-Hurwitz 时闭环稳定。带宽比不足 5 倍时因子不可解耦，实际极点会向虚轴靠拢，出现只有串级结构才有的「内外环互相打架」振荡。',
      cond: '内环必须先于外环整定且带宽至少 5 倍；内环若含饱和，解耦假设失效，需要在外环加入抗饱和（back-calculation）。'
    },

    /* ── 02 频域与最优 ── */
    'PolePlacement': {
      kind: 'exponential',
      conclusion: '极点被直接放到指定位置，收敛速率由最右极点决定',
      V: 'V=x^{\\mathrm{T}}Px,\\qquad A_{cl}^{\\mathrm{T}}P+PA_{cl}=-I',
      step: '取 u=-K_1x-K_2\\dot x，闭环矩阵 A_{cl} 的特征值恰为 -p_1、-p_2（代数重数计）。由于 A_{cl} 是 Hurwitz 的，李雅普诺夫方程对任意正定 I 都有唯一正定解 P。',
      dV: '\\dot V=x^{\\mathrm{T}}(A_{cl}^{\\mathrm{T}}P+PA_{cl})x=-\\|x\\|^{2}\\le -\\frac{1}{\\lambda_{\\max}(P)}V',
      judge: '得到 \\dot V\\le -\\alpha V（\\alpha=1/\\lambda_{\\max}(P)>0），由比较引理得 \\|x(t)\\|\\le\\|x(0)\\|\\sqrt{\\lambda_{\\max}(P)/\\lambda_{\\min}(P)}\\,e^{-\\alpha t/2}，即指数稳定。',
      cond: '需 (A,B) 完全可控，否则存在无法配置的极点（PBH 秩判据）。取 p_1,p_2 为正实数时极点落在 -p_1,-p_2；p 越大收敛越快，但控制量峰值约按 p² 增长，实际受执行器饱和限制。'
    },
    'LQR': {
      kind: 'exponential',
      conclusion: '代价函数本身就是一个李雅普诺夫函数',
      V: 'V=x^{\\mathrm{T}}Px,\\qquad A^{\\mathrm{T}}P+PA-PBR^{-1}B^{\\mathrm{T}}P+Q=0',
      step: 'P 是代数黎卡提方程（CARE）的唯一正定解，u=-R^{-1}B^{\\mathrm{T}}Px。代入 \\dot V 并利用 CARE 消去二次项：',
      dV: '\\dot V=-x^{\\mathrm{T}}(Q+PBR^{-1}B^{\\mathrm{T}}P)x\\le -x^{\\mathrm{T}}Qx',
      judge: 'Q≥0 时 \\dot V\\le 0；若 (A,Q^{1/2}) 可检测，则 \\dot V 只在 x=0 处为零，由 LaSalle 得渐近稳定；Q>0 时直接得指数稳定，衰减率 = \\lambda_{\\min}(Q)/\\lambda_{\\max}(P)。',
      cond: '需 (A,B) 可稳（不可控模态本身稳定）且 (A,Q^{1/2}) 可检测。Q/R 之比决定「性能 vs 能耗」：加大 Q 或减小 R 等价于把极点往左推，控制量按比例增大。'
    },
    'LQG': {
      kind: 'exponential',
      conclusion: '分离原理：观测器与反馈各自稳定 ⟹ 串联稳定',
      V: 'V=x^{\\mathrm{T}}Px+\\tilde x^{\\mathrm{T}}\\Sigma^{-1}\\tilde x,\\qquad \\tilde x=x-\\hat x',
      step: 'LQG 把 LQR 的状态反馈与卡尔曼滤波的状态估计串联使用。由于估计误差 \\tilde x 与状态 x 的动态解耦（分离原理），总系统矩阵是分块上三角 [[A-BK, BK],[0, A-LC]]，其特征值是两者特征值的并集。',
      dV: '\\dot V=-x^{\\mathrm{T}}(Q+K^{\\mathrm{T}}RK)x-\\tilde x^{\\mathrm{T}}\\Sigma^{-1}\\!\\left(\\Sigma(A-LC)^{\\mathrm{T}}+(A-LC)\\Sigma+W\\right)\\Sigma^{-1}\\tilde x\\le 0',
      judge: '两个分块各自 Hurwitz，故整体指数稳定。这是「确定性最优 + 随机最优」可以拼接的理论依据——但它只保证稳定，不保证 LQG 仍是某种意义下的最优（ Doyle 的反例说明了这一点）。',
      cond: '需 (A,B) 可稳、(A,C) 可检；噪声协方差 W、V 需正定。观测器极点通常取比控制器快 2~5 倍，否则估计滞后会吃掉相位裕度。'
    },
    'LQR-I': {
      kind: 'exponential',
      conclusion: '增广积分状态后，CARE 覆盖 I 型伺服',
      V: 'V=\\bar x^{\\mathrm{T}}\\bar P\\bar x,\\qquad \\bar x=(x,\\ \\xi),\\qquad \\xi=\\int(r-y)\\,\\mathrm{d}t',
      step: '把积分状态 \\xi 增广进状态向量，得到 \\dot{\\bar x}=\\bar A\\bar x+\\bar Bu+\\bar Er，对增广系统解 CARE 得 \\bar P，控制律 u=-\\bar K\\bar x 同时含比例与积分增益。',
      dV: '\\dot V=-\\bar x^{\\mathrm{T}}(\\bar Q+\\bar K^{\\mathrm{T}}R\\bar K)\\bar x\\le 0',
      judge: '增广系统可稳 ⟺ 原系统可稳且不含有位于原点的零点（否则积分无法镇定）。此时 CARE 有唯一正定解，闭环指数稳定且对阶跃指令零稳态误差。',
      cond: '要求被调输出在稳态可测且对象无原点零点。积分增益由 \\bar Q 中 \\xi 分块的权重决定：权重大 → 消差快但超调大。'
    },
    'MPC': {
      kind: 'asymptotic',
      conclusion: '终端代价 + 终端约束把最优值函数变成李雅普诺夫函数',
      V: 'V_N(x)=J^{*}(x)=\\min\\sum_{k=0}^{N-1}\\big(x_k^{\\mathrm{T}}Qx_k+u_k^{\\mathrm{T}}Ru_k\\big)+x_N^{\\mathrm{T}}Px_N',
      step: '标准稳定性证明走「递归可行性 + 代价单调」：设终端集 \\mathcal{X}_f 在终端控制器 \\kappa_f(x)=-Kx 下不变，且 P 满足离散李雅普诺夫方程。把上一拍的最优解右移一步，再补上终端控制器，得到本拍的可行解。',
      dV: 'V_N(x^{+})-V_N(x)\\le -\\big(x^{\\mathrm{T}}Qx+u^{\\mathrm{T}}Ru\\big)<0',
      judge: '可行解的存在性由终端集保证，代价单调下降且有下界 0，故 V_N 是严格递减的李雅普诺夫函数，闭环渐近稳定。',
      cond: '必须满足三个前提：① 终端集在终端控制器下不变 ② 终端代价是终端控制器的李雅普诺夫函数 ③ 优化问题每拍都有可行解。缺任一条，MPC 都可能失稳（这正是「滚动优化本身不等于稳定」的原因）。'
    },
    'Deadbeat': {
      kind: 'finite',
      conclusion: '极点全放在 z=0 → 有限拍精确收敛',
      V: 'A_{cl}=A-BK,\\qquad A_{cl}^{n}=0\\quad(\\text{幂零矩阵})',
      step: '离散对象 x_{k+1}=Ax_k+Bu_k，取 K 使闭环矩阵 A_{cl} 的所有特征值为 0，即 A_{cl}^{n}=0（幂零矩阵）。由 Cayley-Hamilton 定理，n 步后状态必精确归零。',
      dV: 'x_k=A_{cl}^{k}x_0=0\\quad\\forall k\\ge n',
      judge: '幂零矩阵保证有限时间收敛（不是渐近）。这是理论上最快的收敛速度，且不需要任何不等式判据。',
      cond: '需 (A,B) 可控且采样周期内零阶保持。实际不能用的原因是：K 的元素正比于 1/b，采样周期缩短时增益爆炸，模型误差与量化噪声被同倍放大，工程上通常放宽到 2~3 拍收敛。'
    },
    'H-Infinity': {
      kind: 'iss',
      conclusion: 'γ-耗散不等式 ⟹ 扰动到误差的 L2 增益有界',
      V: 'V=x^{\\mathrm{T}}Px,\\qquad A^{\\mathrm{T}}P+PA+Q+\\frac{1}{\\gamma^{2}}PBB^{\\mathrm{T}}P\\le 0',
      step: 'H∞ 状态反馈要求存在 P>0 使上述线性矩阵不等式（LMI）成立。把 \\dot V 与扰动项合在一起配方：',
      dV: '\\dot V+z^{\\mathrm{T}}z-\\gamma^{2}w^{\\mathrm{T}}w\\le -x^{\\mathrm{T}}Qx\\le 0',
      judge: '对两边从 0 积分到 ∞ 得 \\|z\\|_2\\le\\gamma\\|w\\|_2（零初值时），即最坏情况能量放大不超过 γ。w=0 时 \\dot V\\le -x^{\\mathrm{T}}Qx，闭环渐近稳定。',
      cond: 'γ 不能任意小：存在使 LMI 可行的最小 γ*（可用二分搜索求得）。γ→γ* 时控制器增益趋于无穷，鲁棒性与控制能量此消彼长。'
    },
    'QFT-LeadLag': {
      kind: 'marginal',
      conclusion: '频域裕度判据：所有工况都远离 -1 点即稳定',
      V: 'L(j\\omega)=C(j\\omega)G(j\\omega),\\qquad N=1+P',
      step: '由 Nyquist 判据，闭环稳定的充要条件是开环 Nyquist 曲线绕 (-1,0) 的圈数等于右半平面极点数。QFT 把「对象参数在区间内变化」画成尼科尔斯图上的模板，要求所有模板都落在同一组边界之外。',
      dV: '\\text{PM}\\ge 45^{\\circ},\\qquad \\text{GM}\\ge 6\\ \\text{dB}',
      judge: '相位裕度与幅值裕度同时满足时，Nyquist 曲线与 -1 点保持明确距离，闭环稳定且有一定鲁棒性。这是工程上最常用的稳定判据，比 Routh 更直观地对应「还能不能再加增益」。',
      cond: '裕度是充分条件而非必要条件，且只对线性定常对象严格成立。对象含饱和或纯滞后时，裕度需要额外留出 2~3 倍余量。'
    },
    'IMP-Servo': {
      kind: 'asymptotic',
      conclusion: '内模原理：闭环含指令发生器极点 ⟹ 稳态误差为零',
      V: 'C(s)=\\frac{N(s)}{D(s)M(s)},\\qquad M(s)=\\text{指令发生器分母}',
      step: '若指令 r 满足 M(s)r=0（常值 M=s，正弦 M=s^2+\\omega^2），把 M(s) 串进控制器后，误差传递函数 E(s)=\\frac{1}{1+C(s)G(s)}R(s) 的分子含因子 M(s)，与 R(s) 的分母相消。',
      dV: 'e_{ss}=\\lim_{s\\to0}s\\,E(s)=\\lim_{s\\to0}s\\,\\frac{M(s)\\,\\tilde R(s)}{D(s)M(s)+N(s)G(s)}=0',
      judge: '只要闭环稳定（分母 D M + N G 的根全在左半平面），上述极限必为零。这就是「内模 = 零稳态误差」的严格表述：PI 之于阶跃、谐振器之于正弦，本质是同一件事。',
      cond: '内模必须与指令频率「精确匹配」：指令频率漂移 1%，静差就不再为零（除非内模带宽足够宽）。闭环稳定性仍需单独验证——加入内模会降低相位裕度。'
    },
    'Preview': {
      kind: 'asymptotic',
      conclusion: '前馈不改变极点，只把跟踪滞后压小',
      V: '\\dot x=(A-BK)x+BK\\,r(t+L),\\qquad A_{cl}=A-BK',
      step: '预见控制把未来指令 r(t+L) 通过前馈通道注入。由于前馈项不进入反馈回路的特征方程，闭环极点与无前馈时完全相同，只改变零点与稳态跟踪关系。',
      dV: '\\dot V=-x^{\\mathrm{T}}Qx+2x^{\\mathrm{T}}PBK r(t+L)',
      judge: 'r 有界时 \\dot V\\le -\\alpha V+C\\|r\\|^2，得一致最终有界（UUB），界正比于 \\|r\\| 与 1/\\alpha；L 越大前馈越提前，稳态滞后越接近零。',
      cond: '前提是指令「确实」提前 L 秒已知且准确。若指令被误预测（例如急停），前馈会变成反向扰动——这是预见控制在突然变工况时反而更差的原因。'
    },

    /* ── 03 非线性结构 ── */
    'BangBang': {
      kind: 'finite',
      conclusion: '在切换面两侧分别加速与制动，有限时间命中原点',
      V: 'V=\\tfrac12\\dot e^{2}+u_{\\max}|e|,\\qquad s=e+\\frac{\\dot e|\\dot e|}{2u_{\\max}}',
      step: '取相平面切换函数 s（抛物线），控制律为 u=-u_{\\max}\\operatorname{sgn}(s)。在 s>0 区与 s<0 区分别计算 \\dot V，可见 V 沿轨迹严格单调下降且下降速率有正下界。',
      dV: '\\dot V\\le -\\mu<0\\;\\Rightarrow\\;t_{reach}\\le V_0/\\mu',
      judge: 'V 有正下界的下降速率意味着有限时间到达 s=0；到达后系统沿 s=0 滑向原点，该曲线本身即为时间最优轨线，故总时间等于理论下界。',
      cond: '需对象为双积分型且控制量无延迟。存在采样、延迟或未建模动态时，s 无法精确为零，系统在 s=0 附近高频切换，形成抖振——这是 Bang-Bang 在实机上必须加死区的原因。'
    },
    'BangBang-Zone': {
      kind: 'asymptotic',
      conclusion: '死区内切换为线性，抖振消失且局部渐近稳定',
      V: 'V=\\tfrac12\\dot e^{2}+\\tfrac12 k_{z}e^{2}\\quad(|e|<\\delta)',
      step: '在 |e|<\\delta 内改用 u=u_{\\max}e/\\delta（线性比例），得到二阶线性闭环；在 |e|\\ge\\delta 外仍为饱和输出。',
      dV: '\\dot V=-(c+k_{d})\\dot e^{2}\\le 0\\quad(\\text{死区内})',
      judge: '死区内闭环为 Hurwitz 二阶系统，指数收敛到原点；死区外 V 单调下降直至进入死区。整体为「有限时间进入 + 局部渐近收敛」。',
      cond: '\\delta 越小越接近时间最优、抖振越大；\\delta 越大越平滑但稳态精度被量化到 ±\\delta。需保证 u_{\\max}/\\delta（等效刚度）不超过执行器与采样允许的带宽。'
    },
    'Relay': {
      kind: 'marginal',
      conclusion: '不保证收敛，存在由滞回宽度决定的极限环',
      V: 'N(A)=\\frac{4U}{\\pi A}\\sqrt{1-\\left(\\frac{h}{A}\\right)^{2}}\\angle-\\arcsin\\frac{h}{A}',
      step: '用描述函数法把继电器近似为幅值相关的复增益 N(A)，令 1+N(A)G(j\\omega)=0 即得自振条件。',
      dV: '|G(j\\omega)|=\\frac{\\pi A}{4U\\sqrt{1-(h/A)^{2}}}',
      judge: '该方程有解 (A,\\omega) 时系统出现极限环，幅度 A 与频率 \\omega 由上式联立确定。滞回 h 越大，自振幅度越大但频率越低，切换次数显著减少。',
      cond: '极限环是「结构固有」行为，不是缺陷——温控、阀门等大惯性对象正是靠它工作。若必须消除，需降低 U、增大 h，或在继电器外串低通滤波器（等效减小高频增益）。'
    },
    'TimeOptimal': {
      kind: 'finite',
      conclusion: '沿切换曲线滑行，到达时间等于理论下界',
      V: 's=\\dot e|\\dot e|+2u_{\\max}e',
      step: '把相平面按 s 的符号分成「全速加速」与「全速制动」两区，切换曲线 s=0 是两族抛物线的公共边界。状态一旦到达 s=0 就沿其滑向原点。',
      dV: '\\dot s=0\\;\\Rightarrow\\;\\ddot e=-u_{\\max}\\operatorname{sgn}(\\dot e)',
      judge: '在 s=0 上，制动减速度恰为 u_{\\max} 且方向与速度相反，故速度线性衰减到零，位移同步归零。由最优控制理论（Pontryagin 极小值原理），该轨迹即为时间最短解。',
      cond: '严格成立需连续时间、无延迟、控制量可瞬时切换。采样实现时必须留一拍超前量补偿，否则会冲过原点形成极限环。'
    },
    'FeedbackLin': {
      kind: 'exponential',
      conclusion: '精确抵消非线性后得到线性误差动态，指数稳定',
      V: 'V=\\tfrac12\\dot e^{2}+\\tfrac12 K_p e^{2}',
      step: '取 u=m(K_p e-K_d\\dot x)+c\\dot x+kx，代入 m\\ddot x+c\\dot x+kx=u 后非线性与参数项被逐项抵消，剩下 \\ddot e+K_d\\dot e+K_p e=0。',
      dV: '\\dot V=\\dot e(\\ddot e+K_p e)=-K_d\\dot e^{2}\\le 0',
      judge: '闭环为常系数二阶系统，K_p>0、K_d>0 时特征根实部为负，指数稳定，衰减率由 K_d/2 与 \\sqrt{K_p} 共同决定。',
      cond: '「依赖模型的精确性」：抵消项用的是名义 m/c/k，若实际参数偏差 20%，残余项变成 [[未建模动态]]，闭环不再是指数稳定，可能退化为 UUB 甚至发散。这是计算力矩法最主要的工程风险。'
    },
    'Backstepping': {
      kind: 'asymptotic',
      conclusion: '逐级构造 Lyapunov 函数，总导数负定',
      V: 'V=\\tfrac12 z_1^{2}+\\tfrac12 z_2^{2},\\qquad z_1=e,\\ z_2=\\dot e-\\alpha_1(z_1)',
      step: '先对 z_1 设计虚拟控制 \\alpha_1=-k_1z_1 使 \\dot V_1=-k_1z_1^{2}；再把 z_2 作为新的误差变量，对 V 求导并设计真实控制 u 消去交叉项。',
      dV: '\\dot V=-k_1z_1^{2}-k_2z_2^{2}\\le 0',
      judge: '\\dot V 严格负定（k_1,k_2>0），故 (z_1,z_2)\\to(0,0)，进而 e\\to0、\\dot e\\to0，闭环渐近稳定。',
      cond: '要求系统为「严格反馈形式」（每一级只依赖前级状态），且虚拟控制的导数可解析求得。实际中 \\dot\\alpha_1 往往含未知项，导致「微分爆炸」，这正是 DSC 与动态面方法要解决的问题。'
    },
    'DSC': {
      kind: 'uub',
      conclusion: '用一阶滤波替代解析求导，收敛到有界残差',
      V: 'V=\\tfrac12 z_1^{2}+\\tfrac12 z_2^{2}+\\tfrac12 y_2^{2},\\qquad \\tau\\dot y_2+y_2=\\alpha_1-y_2(0)',
      step: '引入滤波状态 \\bar\\alpha_1，其导数 \\dot{\\bar\\alpha}_1=(\\alpha_1-\\bar\\alpha_1)/\\tau 可直接计算，取代了反步法中难以求得的 \\dot\\alpha_1。滤波误差 y_2=\\bar\\alpha_1-\\alpha_1 被并入 V。',
      dV: '\\dot V\\le -\\alpha V+\\frac{M^{2}}{4}',
      judge: '形如 \\dot V\\le-\\alpha V+C 的微分不等式给出 V(t)\\le V(0)e^{-\\alpha t}+C/\\alpha，即一致最终有界，最终界正比于滤波时间常数 \\tau。',
      cond: '\\tau 越小越接近理想反步（界越小），但采样噪声被放大；\\tau 越大越平滑但稳态误差与收敛速度都变差。典型取 \\tau 为闭环带宽的 1/5 ~ 1/10。'
    },
    'TDC': {
      kind: 'uub',
      conclusion: '用上一拍实测加速度替代模型，误差 O(L)',
      V: 'V=\\tfrac12\\dot e^{2}+\\tfrac12 K_p e^{2}',
      step: '取 u(t)=\\bar M(\\ddot x^{d}+K_d\\dot e+K_p e)-\\bar M\\ddot x(t-L)。把它代入真实对象后，未知项 f(x,\\dot x)+d 与 \\ddot x(t-L) 相消，只剩 \\ddot x(t)-\\ddot x(t-L) 这一项。',
      dV: '\\dot V=-K_d\\dot e^{2}+\\dot e\\cdot O(L)\\le -\\alpha V+C L',
      judge: '加速度在一个采样周期内的变化量正比于 L，因此闭环满足 \\dot V\\le-\\alpha V+CL，得一致最终有界，最终误差界正比于采样周期。',
      cond: '需「加速度可测」（或可由高精度差分得到）且采样足够快。测量噪声会被 \\bar M 直接放大到控制量，因此常需在加速度通道前置低通滤波，这又会引入额外相位滞后。'
    },
    'NDC': {
      kind: 'asymptotic',
      conclusion: '用有界饱和函数替代线性阻尼，全局 \\dot V≤0',
      V: 'V=\\tfrac12\\dot e^{2}+\\tfrac12 K_p e^{2}',
      step: '把 PD 中的 -K_d\\dot e 换成 -K_d\\operatorname{sat}(\\dot e/\\varepsilon)，其中 sat 在 |\\dot e|>\\varepsilon 时输出 ±1。',
      dV: '\\dot V=\\dot e\\left(-K_d\\operatorname{sat}\\frac{\\dot e}{\\varepsilon}+\\text{非线性项}\\right)\\le -K_d\\varepsilon\\left|\\operatorname{sat}\\frac{\\dot e}{\\varepsilon}\\right|^{2}\\le 0',
      judge: '饱和函数仍满足 \\dot e\\cdot\\operatorname{sat}(\\dot e/\\varepsilon)\\ge0 且在有界输入下有正下界，故 \\dot V\\le0 全局成立（不含「增益过大导致 \\dot V 变号」的情形），闭环渐近稳定且控制量始终有界。',
      cond: '\\varepsilon 是「线性区宽度」：太小则接近 Bang-Bang（抖振），太大则退化为线性 PD（可能饱和）。由于阻尼力有界，大偏差时的收敛速度慢于线性 PD，这是用有界性换来的代价。'
    },
    'CFTC': {
      kind: 'finite',
      conclusion: '分数幂使误差在有限时间内精确归零',
      V: 'V=\\tfrac12 e^{2}',
      step: '取 \\dot e=-k\\,e^{\\alpha}（0<\\alpha<1），代入求导得 \\dot V=-k\\,e^{\\alpha+1}=-k\\,(2V)^{(\\alpha+1)/2}。这是一个「分数幂型」微分不等式。',
      dV: '\\dot V=-k\\,2^{(\\alpha-1)/2}\\,V^{(\\alpha+1)/2}\\;\\Rightarrow\\;T=\\frac{|e_0|^{1-\\alpha}}{k(1-\\alpha)}',
      judge: '由有限时间收敛引理：\\dot V\\le -\\lambda V^{\\gamma}（\\gamma<1）蕴含 V 在 T=V_0^{1-\\gamma}/(\\lambda(1-\\gamma)) 内到零且此后保持为零。',
      cond: '\\alpha 越小收敛越快，但 e\\to0 时增益 e^{\\alpha-1}\\to\\infty，实际必须混合线性项（\\dot e=-k_1e-k_2e^{\\alpha}）或加饱和，否则控制量在原点附近爆掉。'
    },

    /* ── 04 滑模变结构 ── */
    'SMC': {
      kind: 'finite',
      conclusion: '到达阶段有限时间进面，滑动阶段指数收敛',
      V: 's=\\dot e+c\\,e,\\qquad V=\\tfrac12 s^{2}',
      step: '对 V 求导并代入到达条件 \\dot s=-\\varepsilon\\operatorname{sgn}(s)-k s：',
      dV: '\\dot V=s\\dot s=-\\varepsilon|s|-k s^{2}\\le -\\varepsilon\\sqrt{2}\\,V^{1/2}',
      judge: '由有限时间引理，到达时间 t_r\\le|s_0|/\\varepsilon；进入 s=0 后 \\dot e=-ce 指数收敛，故总过程为「有限时间到达 + 指数滑行」。',
      cond: '需切换增益 \\varepsilon 大于扰动与建模误差的上界（\\varepsilon>\\|d\\|_{\\infty}），否则到达条件不成立。\\varepsilon 越大抗扰越强、抖振也越强，这是滑模最本质的矛盾。'
    },
    'VSC-RL': {
      kind: 'finite',
      conclusion: '到达时间与初值的关系可显式计算',
      V: 'V=\\tfrac12 s^{2},\\qquad \\dot s=-\\varepsilon\\operatorname{sgn}(s)-k s',
      step: '分离变量求解 \\dot s 的微分方程：s>0 时 \\dot s=-\\varepsilon-ks，积分得 s(t) 的显式表达式。',
      dV: 's(t)=\\left(s_0+\\frac{\\varepsilon}{k}\\right)e^{-kt}-\\frac{\\varepsilon}{k}\\;\\Rightarrow\\;t_r=\\frac{1}{k}\\ln\\left(1+\\frac{k|s_0|}{\\varepsilon}\\right)',
      judge: '上式在有限时间取零，故有限时间到达。且 t_r 随 |s_0| 只按对数增长——这比纯等速趋近律（t_r 线性增长）在远场快得多。',
      cond: 'k 决定远场速度、\\varepsilon 决定近场「贴面」速度。k 过大时控制量在初始时刻出现尖峰；\\varepsilon 过小则扰动下 s 无法保持为零。'
    },
    'ISMC': {
      kind: 'finite',
      conclusion: '积分滑模面使滑动阶段自带零静差',
      V: 's=\\dot e+c\\,e+c_i\\int_0^t e\\,\\mathrm{d}t,\\qquad V=\\tfrac12 s^{2}',
      step: '初始时刻取 c_i\\int_0^0=-\\dot e(0)-c\\,e(0) 使 s(0)=0（即从滑模面上出发），消除到达阶段。',
      dV: '\\dot V=s\\dot s=-\\varepsilon|s|\\le 0',
      judge: 's(0)=0 且 \\dot V\\le0 意味着全程都在滑动模态，无到达过程；s=0 上的约化动态 \\ddot e+c\\dot e+c_ie=0 含积分作用，对常值扰动零静差。',
      cond: '需要知道初始状态以设定积分初值，否则仍有到达阶段。c_i>0 会降低滑动阶段的阻尼，c_i 过大时约化动态本身振荡——积分作用必须在滑模面内「够用但不过量」。'
    },
    'TSMC': {
      kind: 'finite',
      conclusion: '终端滑模面保证状态在有限时间内精确到零',
      V: 's=\\dot e+\\beta\\,e^{q/p},\\qquad \\beta>0,\\ q<p\\ \\text{为正奇数}',
      step: '在 s=0 上约化动态为 \\dot e=-\\beta e^{q/p}，分离变量积分：',
      dV: 'T=\\frac{p}{\\beta(p-q)}|e_0|^{(p-q)/p}',
      judge: 'q/p<1 使原点附近增益 |e|^{q/p-1}\\to\\infty，收敛速率不随 e 减小而衰减，故为有限时间而非指数收敛。',
      cond: 'q/p 越小收敛越快，但奇异性越强（增益在原点附近趋于无穷）。若 e<0 且 q/p 为偶/奇不匹配，会出现复数幂，必须限制 q、p 为互质奇数。'
    },
    'FTSMC': {
      kind: 'finite',
      conclusion: '线性项 + 分数幂项，远场与近场都快',
      V: 's=\\dot e+\\alpha e+\\beta e^{q/p}',
      step: 's=0 时约化动态为 \\dot e=-\\alpha e-\\beta e^{q/p}，两项分别主导远场与近场。',
      dV: 'T\\le\\frac{1}{\\alpha(1-q/p)}\\ln\\frac{\\alpha|e_0|^{1-q/p}+\\beta}{\\beta}',
      judge: '解析积分给出有限时间上界：远场由 \\alpha e 主导（指数快），近场由 \\beta e^{q/p} 主导（有限时间收尾），因此消除了 TSMC「远场慢」与线性面「近场慢」两个缺陷。',
      cond: '需 \\alpha,\\beta>0 且 q<p 为互质奇数。参数整定上 \\alpha 决定「几秒进入近场」、\\beta 决定「近场多快归零」，两者可独立调。'
    },
    'ASMC': {
      kind: 'finite',
      conclusion: '增益在线增长到刚好压住扰动即停止',
      V: 'V=\\tfrac12 s^{2}+\\tfrac{1}{2\\gamma}\\hat K^{2},\\qquad \\dot{\\hat K}=\\gamma|s|',
      step: '把切换增益当作状态，按 \\dot{\\hat K}=\\gamma|s| 自适应增长；把 (K-\\hat K) 项并入 V 的导数中。',
      dV: '\\dot V\\le -\\eta|s|+(K-\\hat K)|s|+(\\hat K-K)|s|=-\\eta|s|\\le 0',
      judge: '交叉项恰好相消，\\dot V\\le-\\eta|s| 保证有限时间到达；\\hat K 有界（因为一旦 |s|\\to0 其导数也趋于 0），故闭环信号全有界。',
      cond: '不需要预先知道扰动上界，但要求扰动上界存在且不突变。若扰动突然增大超出当前 \\hat K，会重新进入到达阶段，表现为误差短时反弹。'
    },
    'SuperTwisting': {
      kind: 'finite',
      conclusion: '二阶滑模把不连续项藏进积分，输出连续且有限时间',
      V: 'V=\\zeta^{\\mathrm{T}}P\\zeta,\\qquad \\zeta=(|s|^{1/2}\\operatorname{sgn}s,\\ u_{sw})',
      step: '控制律 u=u_{eq}-k_1|s|^{1/2}\\operatorname{sgn}(s)+v，\\dot v=-k_2\\operatorname{sgn}(s)。不连续项只出现在 \\dot v 里，因此 u 本身连续。对 V=\\zeta^{\\mathrm{T}}P\\zeta 求导，用 |s|^{1/2} 的齐次性构造负定上界。',
      dV: '\\dot V\\le -\\frac{\\mu}{\\lambda_{\\max}(P)}V^{1/2}',
      judge: '分数幂的负定上界直接给出有限时间收敛（收敛时间与 |s_0|^{1/2} 成正比），且 u 连续使抖振大幅低于一阶滑模。',
      cond: '需 k_1、k_2 落在由扰动上界确定的区域内（k_1 需大于扰动导数上界的两倍量级）。k_1 过小则无法压住扰动，过大则退化为普通滑模的抖振。'
    },
    'LevantHOSM': {
      kind: 'finite',
      conclusion: '逐层构造的二阶滑模微分器，有限时间精确估计',
      V: '\\dot z_0=v_0,\\quad v_0=-\\lambda|z_0-f|^{2/3}\\operatorname{sgn}(z_0-f)+z_1',
      step: '把待估信号 f 及其导数视为新状态，逐层用超螺旋型结构估计；每一层的误差动态都是有限时间稳定的二阶滑模。',
      dV: '|z_0-f|\\to0,\\ |z_1-\\dot f|\\to0\\quad\\text{in finite time}',
      judge: '每层独立满足有限时间收敛引理，故整个级联在有限时间内精确跟踪 f、\\dot f、\\ddot f，且不引入低通滤波的相位滞后。',
      cond: '需要 f 的二阶导数有界（Lipschitz 条件），参数 \\lambda 需与噪声水平折中：\\lambda 越大收敛越快、对噪声越敏感。实际使用常在微分器后接轻量滤波。'
    },
    'VariableG-SMC': {
      kind: 'finite',
      conclusion: '增益随距离自适应，到达快且抖振小',
      V: 'V=\\tfrac12 s^{2},\\qquad K(x)=K_0+K_1|x|',
      step: '切换增益取状态的函数而非常数；远离开关面时 |x| 大 → 增益大 → 快速到达；贴面时 |x| 小 → 增益小 → 抖振幅值下降。',
      dV: '\\dot V\\le -(K_0-\\|d\\|_{\\infty})|s|',
      judge: '只要 K_0 仍大于扰动上界，\\dot V\\le-\\eta|s| 成立，有限时间到达的结论不变；而抖振幅值正比于 K(x) 在 |s|\\approx0 处的取值，故显著减小。',
      cond: '需保证 K_0 不低于扰动上界（否则近场到达条件失效）。K_1 过大时在远场产生控制量尖峰，需与执行器限幅匹配。'
    },
    'AW-PI': {
      kind: 'asymptotic',
      conclusion: '抗饱和回路保证限幅期间 Lyapunov 函数不增',
      V: 'V=\\tfrac12 e^{2}+\\tfrac{1}{2K_i}(I-I^{*})^{2}',
      step: '未限幅时按 PI 积分；一旦 |u|>u_{\\max}，反算回路按 \\dot I=K_ie-K_{aw}(u_{sat}-u) 反向泄放积分器。',
      dV: '\\dot V=e\\dot e-\\frac{1}{K_i}(I-I^{*})(u_{sat}-u)K_{aw}\\le 0',
      judge: '适当选取 K_{aw} 可使第二项与第一项同号，从而 \\dot V\\le0，避免「限幅期间误差继续积分、退饱和后欠账一次性还清」的大幅超调。',
      cond: 'K_{aw} 的经典取值为 1/T_i（跟踪时间常数法）。K_{aw} 过小无效，过大则积分器被过度泄放，退饱和后出现「积分不足」的持续静差。'
    },

    /* ── 06 融合与复合架构 ── */
    'DOB': {
      kind: 'uub',
      conclusion: '带宽内扰动被对消，带宽外原样通过',
      V: 'V=\\tfrac12 e^{2},\\qquad \\hat d=Q(s)G_n^{-1}(s)(y-G_n(s)u)',
      step: '名义模型误差与外部扰动合成等效扰动 d，DOB 用对象逆模型把它反解出来再前馈对消。闭环等效为「原系统 + 灵敏度函数 1-Q」。',
      dV: '\\dot V\\le -\\alpha V+C\\sup_{\\omega>\\omega_c}|1-Q(j\\omega)|\\,\\|d\\|',
      judge: 'Q 的低通带宽 \\omega_c 内 |1-Q|\\approx0（扰动被吃掉），带宽外 |1-Q|\\approx1（扰动原样通过）。因此得一致最终有界，界由高频扰动分量决定。',
      cond: '必须保证 Q(s)G_n^{-1}(s) 真有理（否则微分不可实现），这要求 Q 的相对阶不低于 G_n。G_n 误差大时逆模型反解不准，DOB 反而注入错误补偿。'
    },
    'IMC': {
      kind: 'asymptotic',
      conclusion: '闭环传递函数被直接设成滤波器 F',
      V: 'Q=\\tilde G^{-1}F,\\qquad \\frac{y}{r}=\\frac{Q\\tilde G}{1+Q(G-\\tilde G)}\\approx F',
      step: '内模控制把对象模型并联进控制器，等效控制器为 C=Q/(1-Q\\tilde G)。取 Q=\\tilde G^{-1}F 后，模型精确时闭环传递函数化简为 F。',
      dV: '\\dot V=-\\alpha V+\\eta\\,\\|G-\\tilde G\\|',
      judge: 'F=1/(1+\\lambda s) 时闭环是一阶惯性，指数稳定且无超调；模型误差 \\eta 进入灵敏度函数，得 UUB，最终误差正比于 \\lambda 与失配程度。',
      cond: '需要 \\tilde G 可逆（无非最小相位零点、无纯滞后）。若对象含右半平面零点，只能取 Q 为 \\tilde G 的「近逆」，此时跟踪必然有延迟，不能强行求逆。'
    },
    'ADRC': {
      kind: 'asymptotic',
      conclusion: '把总扰动扩张为状态并实时估计，闭环化为积分器链',
      V: 'V=\\tfrac12 e_1^{2}+\\tfrac12 e_2^{2}+\\tfrac12\\tilde f^{2}',
      step: 'ESO 把对象压成 \\ddot y=f+b u，f 为「总扰动」（含未建模动态、参数变化、外扰）。观测器估计 \\hat f，控制律取 u=(u_0-\\hat f)/b，闭环退化为 \\ddot y=u_0。',
      dV: '\\dot V\\le -\\kappa V+C\\,\\|\\dot f\\|',
      judge: '观测误差与跟踪误差共同构成 V。\\dot f 有界时得 UUB；\\dot f\\to0（常值扰动）时得渐近稳定。也就是说 ADRC 的精度由扰动的「变化率」而非幅值决定。',
      cond: '需 b 的符号已知（正负号错则发散），幅值误差只影响闭环增益。ESO 带宽 \\omega_o 通常取闭环带宽的 3~5 倍：太小估不准，太大放大噪声。'
    },
    'NL-ADRC': {
      kind: 'asymptotic',
      conclusion: '非线性误差组合使小误差高增益、大误差不冲击',
      V: 'V=\\tfrac12 e_1^{2}+\\tfrac12 e_2^{2}+\\tfrac12\\tilde f^{2}',
      step: '把线性组合 \\beta_1e_1+\\beta_2e_2 换成 \\beta_1\\operatorname{fal}(e_1,\\alpha_1,\\delta)+\\beta_2\\operatorname{fal}(e_2,\\alpha_2,\\delta)，fal 在小误差区退化为线性增益 e/\\delta^{1-\\alpha}，大误差区按 |e|^{\\alpha} 衰减。',
      dV: '\\dot V\\le -\\kappa V+C\\,\\|\\dot f\\|\\quad(\\text{与线性 ADRC 同构})',
      judge: 'fal 满足 e\\cdot\\operatorname{fal}(e)\\ge0 且局部线性，因此李雅普诺夫函数的负定性不变，结论仍为 \\dot f 有界时 UUB、\\dot f\\to0 时渐近稳定。',
      cond: '多两个参数 (\\alpha,\\delta)。\\alpha 越小近场增益越高（精度好、噪声敏感），\\delta 是线性区宽度，需与测量噪声幅值同量级。'
    },
    'ARC': {
      kind: 'uub',
      conclusion: '自适应补偿 + 鲁棒项，误差有界且界可调',
      V: 'V=\\tfrac12 z^{2}+\\tfrac{1}{2\\gamma}\\tilde\\theta^{2}',
      step: 'u=u_a+u_s，u_a 用 \\hat\\theta 做模型补偿，u_s=-Kz 或有界鲁棒项压残差。用投影算子 \\operatorname{Proj} 把 \\hat\\theta 限制在已知区间。',
      dV: '\\dot V\\le -\\alpha V+\\varepsilon\\;\\Rightarrow\\;|z|\\le\\sqrt{2\\varepsilon/\\alpha}',
      judge: '投影保证 \\hat\\theta 有界从而交叉项可被吸收，最终得 UUB，稳态误差界正比于鲁棒项强度参数 \\varepsilon。',
      cond: '需参数化形式 \\theta^{\\mathrm{T}}\\phi 为凸（线性参数化），否则投影与自适应律都失效。\\varepsilon 越小精度越高、控制量越抖。'
    },
    'ESO-SMC': {
      kind: 'finite',
      conclusion: '观测器吃掉慢变大扰动，滑模只处理快速小残差',
      V: 'V=\\tfrac12 s^{2}+\\tfrac12\\tilde f^{2},\\qquad s=\\dot e+ce',
      step: 'ESO 估计 \\hat f 并前馈对消，滑模面只需面对估计残差 \\tilde f=f-\\hat f，其幅值远小于原扰动。',
      dV: '\\dot V\\le -\\eta|s|-\\kappa\\tilde f^{2}',
      judge: '两项分别为有限时间（滑模）与指数（观测器），故 s 有限时间到零、观测误差指数收敛；切换增益只需覆盖残差上界，抖振显著低于纯 SMC。',
      cond: '前提是扰动「幅值大但变化慢」——若扰动快速跳变，ESO 估计滞后，残差反而变大，此时应提高观测器带宽或退回纯滑模。'
    },
    'L1': {
      kind: 'uub',
      conclusion: '低通滤波把高频自适应动作挡在执行器之外',
      V: 'V=\\tfrac12\\tilde x^{\\mathrm{T}}P\\tilde x+\\tfrac{1}{2\\gamma}\\tilde\\theta^{\\mathrm{T}}\\tilde\\theta',
      step: '状态预测器给出 \\hat x，自适应律按投影更新 \\hat\\theta，自适应控制量再经一阶低通 C(s)=a/(s+a) 后送入执行器。',
      dV: '\\dot V\\le -\\alpha V+C\\,\\|\\dot\\theta\\|/a',
      judge: '低通把高频自适应分量衰减 1/a 倍，使 V 的导数获得与 a 成反比的余项；a 越大（带宽越高）界越小，但鲁棒裕度也越小——这就是 L1 的「性能与鲁棒解耦」旋钮。',
      cond: '需保证 C(s) 与预测器增益满足 L1 小增益条件 \\|G(s)(1-C(s))\\|_{\\infty}<1。这个条件比 MRAC 的持续激励要求弱，是 L1 的主要优势。'
    },
    'I-and-I': {
      kind: 'asymptotic',
      conclusion: '先把状态浸入目标流形，再沿流形消掉参数误差',
      V: 'V=\\tfrac12 z^{\\mathrm{T}}z,\\qquad z=\\hat\\theta-\\theta+\\beta(x)',
      step: '构造流形 z=0 使其上参数误差与状态误差绑定；设计 \\dot{\\hat\\theta} 与 u 使 \\dot z=-\\gamma z。',
      dV: '\\dot V=-\\gamma z^{\\mathrm{T}}z\\le 0',
      judge: 'z 指数趋零，故 \\hat\\theta-\\theta\\to-\\beta(x)；只要 \\beta 在目标点取零，即得状态与参数同时收敛（不需要 PE 条件）。',
      cond: '关键是找到使 z 的动力学与未知参数解耦的 \\beta(x)，对多数系统这是一次偏微分方程求解，并不总有解。这也是 I&I 虽优雅但应用受限的原因。'
    },
    'AdaptBackstepping': {
      kind: 'asymptotic',
      conclusion: '参数估计并入 Lyapunov 函数，交叉项被自适应律抵消',
      V: 'V=\\tfrac12\\sum z_i^{2}+\\tfrac{1}{2\\gamma}\\tilde\\theta^{2}',
      step: '反步的每一级同时处理状态误差 z_i 与参数误差 \\tilde\\theta；设计 \\dot{\\hat\\theta} 使 \\dot V 中形如 z_i\\tilde\\theta\\,\\phi_i 的交叉项被 -\\tilde\\theta\\dot{\\hat\\theta}/\\gamma 抵消。',
      dV: '\\dot V=-\\sum k_iz_i^{2}\\le 0',
      judge: '交叉项相消后 \\dot V 严格负定，故状态误差渐近收敛；参数误差只能保证有界（\\dot V 中不含 \\tilde\\theta 的负定项），要收敛需持续的激励信号。',
      cond: 'PE 条件：回归向量 \\phi 必须足够「丰富」（至少含 n 个不同频率分量）。指令长期不变时参数会漂移到错误值，此时跟踪仍好但参数不可信。'
    },
    'T-DOB': {
      kind: 'uub',
      conclusion: '用一拍差值反推扰动，无滤波相位滞后',
      V: 'V=\\tfrac12 e^{2},\\qquad \\hat d_k=\\ddot x_k-\\bar M^{-1}(u_{k-1}-\\bar c\\dot x_{k-1}-\\bar kx_{k-1})',
      step: '当前时刻的实测加速度与「用上一拍控制量按模型算出的加速度」之差，就是模型解释不了的那部分力；直接把它当前馈补偿。',
      dV: '\\dot V\\le -\\alpha V+C\\,h\\,\\|\\dot d\\|',
      judge: '差分误差正比于采样周期 h 与扰动变化率，故得 UUB，界随 h 线性减小；因为不做低通，不存在滤波器相位滞后带来的稳定裕度损失。',
      cond: '需高采样率与低噪声加速度信号。噪声会被 1/h 放大，因此 h 越小噪声越致命——实际使用常在「提高采样率」和「加前置滤波」之间折中。'
    },

    /* ── 07 前沿与新型约束 ── */
    'PPC': {
      kind: 'asymptotic',
      conclusion: '误差被时变包络夹住，收敛速度与超调同时受控',
      V: 'V=\\tfrac12\\ln\\frac{1}{1-\\varepsilon^{2}},\\qquad \\varepsilon=\\frac{e}{\\rho(t)}',
      step: '规定性能要求 -\\delta\\rho(t)<e<\\rho(t)，其中 \\rho(t)=(\\rho_0-\\rho_\\infty)e^{-lt}+\\rho_\\infty。做误差变换 \\varepsilon=e/\\rho 后，只要 |\\varepsilon|<1 就满足约束。',
      dV: '\\dot V=\\frac{\\varepsilon\\dot\\varepsilon}{1-\\varepsilon^{2}}\\le -\\alpha V',
      judge: '设计 u 使 \\dot\\varepsilon 含 -(1-\\varepsilon^{2}) 因子，则 \\dot V 负定；\\varepsilon\\to0 意味着 e\\to0 且始终不越界，收敛速度由 \\rho(t) 的衰减率 l 直接指定。',
      cond: '初始误差必须落在初始包络内（|e_0|<\\rho_0），否则误差变换在 t=0 就无定义，控制器直接发散。这是 PPC 最常见的「启动即失败」原因。'
    },
    'BLF': {
      kind: 'asymptotic',
      conclusion: '障碍函数在边界处趋于无穷，约束不可能被突破',
      V: 'V=\\tfrac12\\ln\\frac{k_b^{2}}{k_b^{2}-e^{2}},\\qquad |e|<k_b',
      step: '对数障碍函数在 |e|\\to k_b 时 V\\to\\infty，因此只要初始 |e_0|<k_b 且 \\dot V\\le0 成立，V 有界就蕴含 |e| 永远进不了边界。',
      dV: '\\dot V=\\frac{e\\dot e}{k_b^{2}-e^{2}}\\le -\\alpha V',
      judge: 'V 有界 ⟹ e 有界且 |e|<k_b；\\dot V 负定 ⟹ e\\to0。两者合起来即「约束满足 + 渐近收敛」，这是障碍函数相对于「惩罚函数」的本质优势。',
      cond: '需要先验已知约束界 k_b 且初始误差在界内。分母 k_b²-e² 在接近边界时数值急剧放大，实现时必须限制控制量幅值或加软化项，否则会出现数值溢出。'
    },
    'ETC': {
      kind: 'asymptotic',
      conclusion: '触发阈值与状态成正比，保证类 Lyapunov 单调',
      V: 'V=\\tfrac12 e_{sample}^{2}+\\tfrac12 x^{2},\\qquad \\|e_{sample}\\|>\\sigma\\|x\\|+\\eta\\ \\text{时触发}',
      step: '两次触发之间控制量保持不变（零阶保持），触发误差 e_{sample} 累积到超过阈值才更新。把 e_{sample} 的界代入 \\dot V。',
      dV: '\\dot V\\le -(1-\\sigma)\\alpha\\|x\\|^{2}+\\eta^{2}',
      judge: 'σ<1 时主项负定，得 UUB；η 决定最终界。由于触发间隔有正下界（由阈值与状态变化率决定），不存在芝诺现象。',
      cond: 'σ 越小越省通信但稳定性裕度越小；η 提供「静默期」防止零附近无限触发。若系统本身不稳定，需要额外的强制触发机制。'
    },
    'Switched': {
      kind: 'exponential',
      conclusion: '驻留时间足够长时，切换跳升被衰减吸收',
      V: 'V_{\\sigma(t)}(x),\\qquad V_i\\le\\mu V_j,\\quad \\dot V_i\\le-\\lambda V_i',
      step: '每个子系统各自有 Lyapunov 函数且指数衰减；切换瞬间允许 V 跳升最多 \\mu 倍。要求两次切换之间的衰减足以抵消这次跳升。',
      dV: '\\mu\\,e^{-\\lambda\\tau_d}<1\\;\\Rightarrow\\;\\tau_d>\\frac{\\ln\\mu}{\\lambda}',
      judge: '满足该不等式时 V 在整个切换序列上仍指数收敛，故闭环指数稳定。这是「驻留时间」判据的完整表述。',
      cond: '需要每个子系统都稳定；若含不稳定子系统，则还要求「不稳定驻留时间」与「稳定驻留时间」的比例足够小（平均驻留时间条件）。'
    },
    'DynPole': {
      kind: 'asymptotic',
      conclusion: '极点连续移动，全程保持 Hurwitz',
      V: 'V=\\tfrac12\\dot e^{2}+\\tfrac12 K_p(e)\\,e^{2}',
      step: '把增益写成误差的函数 K_p(e)、K_d(e)，使等效刚度与阻尼在整个工作区间内始终为正。',
      dV: '\\dot V=-K_d(e)\\,\\dot e^{2}+\\tfrac12\\dot K_p(e)\\,e^{2}\\dot e\\le 0',
      judge: '只要 \\dot K_p 有界且 K_d(e)>0 在所有 e 上成立，\\dot V 在足够小的 |\\dot e| 下仍负定，闭环渐近稳定；由于增益连续，不存在切换冲击。',
      cond: '需保证调度过程中 K_p(e)>0、K_d(e)>0 恒成立。若调度律设计不当（例如 K_d 在某区间过零），会出现「移动过程中短暂失稳」——这是增益调度最常见的隐患。'
    },
    'PTC': {
      kind: 'finite',
      conclusion: '增益按 1/(T_p-t) 增长，在指定时刻强制归零',
      V: 'V=\\tfrac12 e^{2},\\qquad \\mu(t)=\\frac{T_p}{T_p-t}',
      step: '把误差乘以时变缩放 \\mu(t) 后送入反馈，等效增益随倒计时增长；对二阶系统用 \\mu^{2}(t) 使增益按 1/(T_p-t)² 增长。',
      dV: '\\dot V=-k\\,\\mu(t)\\,V\\;\\Rightarrow\\;V(t)=V_0\\exp\\left(-k\\!\\int_0^t\\!\\mu\\right)=V_0\\left(1-\\frac{t}{T_p}\\right)^{k}',
      judge: '上式在 t=T_p 时恰为零，故 e(T_p)=0 是被「保证」的，而非渐近逼近。收敛时间的上界就是参数 T_p 本身。',
      cond: 't\\to T_p 时增益\\to\\infty，实际必须设上限；一旦触发上限，就不再严格满足 T_p 收敛。这是 PTC 在实机上最常见的失效点。'
    },
    'FxTC': {
      kind: 'finite',
      conclusion: '收敛时间上界与初始状态无关',
      V: 'V=\\tfrac12 e^{2},\\qquad \\dot V\\le-\\alpha V-\\beta V^{p},\\quad p<1',
      step: '同时含线性项与分数幂项：线性项负责远场快速接近，分数幂项负责近场加速收尾。对 \\dot V 的微分不等式分离变量并积分，得到显式的收敛时间表达式；再对初值 V_0 取上界，即得与初值无关的固定时间。',
      dV: 'T\\le\\frac{1}{\\alpha(1-p)}\\ln\\frac{\\alpha V_0^{1-p}+\\beta}{\\beta}\\le\\frac{1}{\\beta}+\\frac{1}{\\alpha(1-p)}',
      judge: '第二个不等式说明 T 可被一个与 V_0 无关的常数上界住——这就是「固定时间」与「有限时间」的区别：后者依赖初值，前者不依赖。',
      cond: '需 p<1 且 \\alpha,\\beta>0。工程意义是「不管从多远开始，都能承诺同一个截止时间」，代价是原点附近增益极大。'
    },
    'Tan-BLF': {
      kind: 'asymptotic',
      conclusion: 'tan 型障碍函数在边界附近增长更快，约束更硬',
      V: 'V=\\frac{k_b^{2}}{\\pi}\\tan\\frac{\\pi e^{2}}{2k_b^{2}}',
      step: 'tan 在自变量趋于 \\pi/2 时发散，因此 |e|\\to k_b 时 V\\to\\infty，且增长速率高于对数型 BLF。',
      dV: '\\dot V=\\frac{e\\dot e}{\\cos^{2}(\\pi e^{2}/2k_b^{2})}\\le -\\alpha V',
      judge: '与对数型 BLF 相同的逻辑链：V 有界 ⟹ |e|<k_b；\\dot V 负定 ⟹ e\\to0。但 1/\\cos^{2} 因子在边界附近更大，故同样的控制量下约束更「紧」。',
      cond: '数值上更容易溢出：\\pi e^{2}/2k_b^{2} 必须严格小于 \\pi/2。实现时通常把自变量限制在 0.45\\pi 以内，或加软化饱和。'
    },
    'TimeVary-BLF': {
      kind: 'asymptotic',
      conclusion: '边界自身收缩，把误差「挤」向零',
      V: 'V=\\tfrac12\\ln\\frac{k_b^{2}(t)}{k_b^{2}(t)-e^{2}},\\qquad k_b(t)=k_0e^{-\\lambda t}+k_\\infty',
      step: '与固定 BLF 的区别在于边界 k_b 是时间函数并在收缩；\\dot V 中多出 -2\\dot k_b/k_b 项。',
      dV: '\\dot V\\le -\\alpha V+\\frac{|\\dot k_b|}{k_b}\\le -\\alpha V+\\lambda',
      judge: '收缩项带来正余项 \\lambda，故严格说只能得 UUB；但 k_b(t)\\to k_\\infty 后如果继续设计使 k_\\infty 足够小，可实现「约束内的实用收敛」。若要严格到零，需让 k_\\infty=0（边界收敛到零）。',
      cond: 'k_0 必须大于初始误差，否则 t=0 即无定义。\\lambda 越大边界收得越快，控制量需求也越大，常因饱和而失败。'
    },
    'Integral-BLF': {
      kind: 'asymptotic',
      conclusion: '对误差积分也设障碍，防止积分累积越界',
      V: 'V=\\tfrac12\\ln\\frac{k_b^{2}}{k_b^{2}-\\left(\\int e\\right)^{2}}',
      step: '把障碍函数的作用对象从 e 换成 \\int e，因此约束的是「误差累积量」而非瞬时误差。',
      dV: '\\dot V=\\frac{\\left(\\int e\\right)e}{k_b^{2}-\\left(\\int e\\right)^{2}}\\le -\\alpha V',
      judge: '只要初始积分在界内且 \\dot V\\le0，则 |\\int e| 永不超过 k_b；配合 e 自身的收敛，可实现「积分不饱和 + 静差消除」两个目标同时成立。',
      cond: '适合带执行器速率限制、积分项容易累积的系统。缺点是 k_b 难以选：太小导致正常工作就被限制，太大则失去保护意义。'
    },

    /* ── 08 轨迹规划与学习 ── */
    'InputShaping': {
      kind: 'asymptotic',
      conclusion: '两脉冲相消，残余振动理论上为零',
      V: 'V(t)=\\sqrt{\\left(\\sum A_ie^{\\zeta\\omega_n t_i}\\cos\\omega_dt_i\\right)^{2}+\\left(\\sum A_ie^{\\zeta\\omega_n t_i}\\sin\\omega_dt_i\\right)^{2}}',
      step: '振动幅值 V 是各脉冲激励的相量和。ZV 整形器取两个脉冲，使其相量模相等、相位相差 \\pi，从而 V=0。',
      dV: 'V=0\\;\\Longleftrightarrow\\;\\sum A_ie^{\\zeta\\omega_nt_i}e^{j\\omega_dt_i}=0',
      judge: '零点条件给出 A_1=1/(1+K)、A_2=K/(1+K)、\\Delta t=\\pi/\\omega_d，这正是使 V 恒为零的唯一解（除整体缩放）。',
      cond: '依赖 \\omega_n、\\zeta 的准确值。频率误差 \\pm20\\% 时残余振动约回升到 5\\%~10\\%，因此更鲁棒的 ZVD（三脉冲）用更长的时间换更宽的容忍带。'
    },
    'ILC': {
      kind: 'asymptotic',
      conclusion: '迭代算子范数小于 1 时误差单调收敛',
      V: 'e_{k+1}(t)=\\left(I-LG\\right)e_k(t)',
      step: '把一次完整轨迹跟踪写成迭代映射：只要学习算子 (I-LG) 在合适范数下小于 1，误差序列就收敛。',
      dV: '\\|e_{k+1}\\|\\le\\|I-LG\\|\\,\\|e_k\\|\\;\\Rightarrow\\;\\|e_k\\|\\le\\rho^{k}\\|e_0\\|',
      judge: '\\rho=\\|I-LG\\|<1 时误差按几何级数收敛。Q 滤波器的作用正是把高频段置零，保证该范数条件在噪声存在时仍成立。',
      cond: '需每次迭代的初始状态一致（相同初值、相同轨迹）。初始误差不可重复时需引入「初值修正项」，否则残差不会随迭代消失。'
    },
    'Repetitive': {
      kind: 'asymptotic',
      conclusion: '内模在谐波处提供无穷大增益，周期扰动被完全抑制',
      V: 'C(z)=\\frac{1}{1-z^{-N}},\\qquad z^{N}=e^{j2\\pi n}',
      step: '周期延迟 1/(1-e^{-Ts}) 的极点在 s=jn\\omega_0（\\omega_0=2\\pi/T），对基频及所有谐波的增益为无穷大。',
      dV: '\\left|S(jn\\omega_0)\\right|=0,\\qquad S=\\frac{1}{1+CG}',
      judge: '灵敏度函数在这些频率处为零 ⟹ 该频率的扰动被完全对消，稳态误差为零。这是内模原理在周期信号上的直接应用。',
      cond: '周期必须精确已知且恒定；周期抖动超过 1% 时极点与扰动频率错位，抑制效果急剧下降。此外需要低通 Q 滤波器保证闭环稳定。'
    },
    'GainSched': {
      kind: 'asymptotic',
      conclusion: '各工作点稳定 + 公共 Lyapunov 函数 ⟹ 全程稳定',
      V: 'V(x,\\sigma)=x^{\\mathrm{T}}P(\\sigma)x,\\qquad A_{cl}^{\\mathrm{T}}(\\sigma)P+PA_{cl}(\\sigma)<0',
      step: '把调度变量 \\sigma 视为慢变参数，为每个工作点设计 K(\\sigma)。若存在对所有 \\sigma 成立的公共 P，则闭环在整个调度区间内稳定。',
      dV: '\\dot V\\le -\\alpha V+\\left\\|\\frac{\\partial V}{\\partial\\sigma}\\right\\|\\dot\\sigma',
      judge: '\\sigma 变化率有界且足够小时，第二项可被第一项吸收，得 UUB；若 \\sigma 恒定则退化为线性定常系统的指数稳定。',
      cond: '关键在「公共 P」：各点独立稳定并不保证插值过程稳定。工程上要求 \\sigma 的变化慢于闭环带宽的 1/10，并在 \\sigma 跨越多个工作点时做逐点验证。'
    },
    'SmithPredict': {
      kind: 'asymptotic',
      conclusion: '延迟被移出闭环，稳定裕度由无延迟模型决定',
      V: 'C_{eq}(s)=C(s)\\big/\\left(1+C(s)\\tilde G(s)(1-e^{-\\tau s})\\right)',
      step: 'Smith 预估器把「无延迟模型 + 延迟支路」与控制器并联，等效开环变为 C\\tilde G，延迟只出现在闭环外的串联位置。',
      dV: '\\angle\\,C(j\\omega)\\tilde G(j\\omega)>-180\\degree+\\text{PM}',
      judge: '稳定性完全由无延迟传递函数 C\\tilde G 的 Nyquist 曲线决定，延迟不再贡献相位滞后 —— 这正是预估器把「大延迟」从稳定性问题中剥离的原理。',
      cond: '模型延迟 \\tau 必须准确：估计偏大 20% 以上时，延迟项不再被完全抵消，稳定性反而劣于不加预估器。对象增益失配时需重新整定 C(s)。'
    },
    'Posicast': {
      kind: 'finite',
      conclusion: '两脉冲在目标频率上相消，残余振动为零',
      V: 'y(t)=A_1\\sin\\omega_dt+A_2\\sin\\omega_d(t-\\Delta t)',
      step: '与输入整形同源，只是把脉冲做成阶跃的前馈分解：第一段给 (1-\\delta) 幅值，等半周期后补 \\delta。',
      dV: 'A_1+A_2e^{-j\\omega_d\\Delta t}=0\\;\\Rightarrow\\;\\Delta t=\\pi/\\omega_d',
      judge: '相量相消条件成立时 y(t) 在切换后恒为零，即定位完成后无残余振动；切换前的响应只是 (1-\\delta) 幅值的普通二阶响应。',
      cond: '只对单一固定频率有效。\\zeta 未知时 \\Delta t 取 \\pi/\\omega_n 有约 10% 的误差，通常改用 ZV 整形器以获得频率容忍带。'
    },
    'FuzzyPID': {
      kind: 'uub',
      conclusion: '模糊整定等价于有界时变增益，误差有界',
      V: 'V=\\tfrac12 e^{2}+\\tfrac12\\dot e^{2}',
      step: '模糊推理输出的是有界增益 \\Delta K(e,\\dot e)，其幅值被隶属函数与规则表限死，因此可视为 K(t) 有界的 PID。',
      dV: '\\dot V\\le -\\alpha V+C\\,\\left\\|\\dot K\\right\\|',
      judge: '增益变化率有界时得 UUB，稳态误差界正比于增益变化率；规则表恒定、输入稳定时增益收敛为常数，退化为线性 PID 的结论。',
      cond: '没有解析稳定判据——参数只能靠实验整定。若规则表在某个区域给出反号输出（例如「误差大 → 减小增益」），局部可能失稳，必须逐区检查规则单调性。'
    },
    'NeuralPID': {
      kind: 'uub',
      conclusion: '权重有界则闭环有界，学习率决定界',
      V: 'V=\\tfrac12 e^{2}+\\tfrac{1}{2\\eta}\\left\\|w-w^{*}\\right\\|^{2}',
      step: '单神经元权重 w 按 Hebbian 规则更新，其更新量正比于 e\\,u\\,x_i；把权重误差并入 V 后求导。',
      dV: '\\dot V\\le -\\alpha V+C\\eta\\left\\|x\\right\\|^{2}',
      judge: '学习率 \\eta 越小，余项越小，稳态误差界越小但适应越慢；\\eta 超过由对象增益决定的上界时 \\dot V 不再负定，表现为权重与输出同时发散。',
      cond: '需对权重做限幅或投影（否则无界输入下权重可能漂移到任意大）。因为没有显式积分状态，纯神经元 PID 对常值扰动仍有静差。'
    },
    'Fuzzy': {
      kind: 'uub',
      conclusion: '输入-输出映射有界，闭环 UUB',
      V: 'V=\\tfrac12 e^{2}',
      step: '模糊控制器的输出 u=F(e,\\dot e) 是连续有界函数（隶属度归一化 + 重心法解模糊），因此 |u|\\le u_{\\max} 恒成立。',
      dV: '\\dot V=e\\dot e\\le -\\alpha V+C\\,u_{\\max}',
      judge: '等价于一个饱和控制器：只要 u_{\\max} 足以压住扰动，轨迹就被驱动到误差界 |e|\\le C u_{\\max}/\\alpha 内（UUB）。',
      cond: '无积分作用 → 常值扰动下必有静差；无解析稳定判据 → 只能靠仿真与实验验证。规则表必须满足「误差为正 → 输出为正」的单调性，否则在原点附近可能形成极限环。'
    },
    'EnergyShaping': {
      kind: 'passive',
      conclusion: '闭环能量函数在目标点取唯一极小 ⟹ 无源稳定',
      V: 'H_d(q,p)=\\tfrac12 p^{\\mathrm{T}}M^{-1}p+V_d(q)',
      step: 'IDA-PBC 通过求解匹配方程 g^{\\perp}(f+gu-\\partial H_d/\\partial x)=0 反解控制律，使闭环系统的能量恰为期望的 H_d。',
      dV: '\\dot H_d=-p^{\\mathrm{T}}D_d(q)\\,M^{-1}p\\le 0',
      judge: '\\dot H_d\\le0 且 H_d 在目标点唯一极小 ⟹ 目标点 Lyapunov 稳定；若阻尼 D_d 正定且系统可检测，由 LaSalle 得渐近稳定。',
      cond: '需要求解匹配偏微分方程，不是所有系统都有解（欠驱动系统的可积性条件尤其苛刻）。加阻尼项只保证「收敛到目标」而不保证「轨迹好看」，常出现大幅振荡后缓慢收敛。'
    },

    /* ── 09 鲁棒与现代预测 ── */
    'TubeMPC': {
      kind: 'uub',
      conclusion: '名义轨迹 + 不变集收紧，约束满足是结构性的',
      V: 'V_N(x)=J^{*}(x_{nom}),\\qquad x\\in x_{nom}\\oplus\\Omega',
      step: '把不确定性装进不变集 \\Omega（tube），先按名义模型求最优轨迹，再把所有约束收紧 \\Omega 的支撑函数后求解。',
      dV: 'V_N(x^{+})-V_N(x)\\le -\\ell(x,u)+\\text{tightening 余量}<0',
      judge: '由于任意实现 x 都落在 tube 内，只要收紧后的约束可行，原约束对任意扰动实现都成立；代价单调下降给出渐近稳定。',
      cond: '需要扰动有界且界已知（\\Omega 由它算出）。界估大 → 约束过紧、可行域缩小甚至无解；界估小 → tube 包不住实际偏差，约束可能被违反。'
    },
    'SDRE': {
      kind: 'uub',
      conclusion: '逐点求解黎卡提，得到状态相关的 Lyapunov 函数',
      V: 'V=x^{\\mathrm{T}}P(x)x,\\qquad A^{\\mathrm{T}}(x)P+PA(x)-PBR^{-1}B^{\\mathrm{T}}P+Q=0',
      step: '把 LQR 的定常矩阵换成状态相关矩阵，逐点解 CARE 得 P(x)；控制律 u=-R^{-1}B^{\\mathrm{T}}P(x)x。',
      dV: '\\dot V=-x^{\\mathrm{T}}Qx+x^{\\mathrm{T}}\\dot P(x)x',
      judge: '\\dot P 项使 \\dot V 不能严格负定，只能得 UUB；若 \\dot P 有界且足够小（状态变化慢），闭环局部渐近稳定。',
      cond: 'SDC 参数化 A(x) 不唯一，不同参数化影响可观性与求解稳定性。此外每拍都要解 CARE，实时性是大规模系统的瓶颈。'
    },
    'GPC': {
      kind: 'asymptotic',
      conclusion: 'CARIMA 的 Δ 因子天然含积分，常值扰动零静差',
      V: 'J=\\sum_{j=N_1}^{N_2}\\left(y_{k+j}-r\\right)^{2}+\\lambda\\sum\\left(\\Delta u\\right)^{2}',
      step: 'CARIMA 模型把扰动通道写成 \\xi/\\Delta，\\Delta=1-z^{-1} 相当于在扰动入口串了积分器；预测方程由此对常值扰动无偏。',
      dV: '\\Delta u\\to0\\;\\Rightarrow\\;u\\ \\text{收敛为常值}',
      judge: '代价函数中 \\Delta u 的惩罚使稳态时 \\Delta u=0，即 u 恒定；配合 CARIMA 的积分因子，稳态时 y=r 精确成立。闭环稳定性由广义预测极点（T 多项式）配置。',
      cond: '需 T(z^{-1}) 的极点全部在单位圆内（观测器多项式）。预测步长 N_2 太小看不清动态、太大受模型误差影响，通常取上升时间的 1~2 倍。'
    },
    'RLS-Adaptive': {
      kind: 'uub',
      conclusion: '参数估计有界，闭环误差随激励消失而滞留',
      V: 'V=\\tfrac12\\tilde\\theta^{\\mathrm{T}}P^{-1}\\tilde\\theta',
      step: 'RLS 的协方差更新 P_k=(I-K\\phi^{\\mathrm{T}})P_{k-1} 保证 P 单调不增；把参数误差的加权范数作为 V。',
      dV: '\\dot V=-\\frac{\\phi^{\\mathrm{T}}P\\phi}{1+\\phi^{\\mathrm{T}}P\\phi}\\,\\tilde y^{2}\\le 0',
      judge: 'V 单调不增 ⟹ \\tilde\\theta 有界、估计误差平方可积；但 \\dot V 只在 \\tilde y\\ne0 时下降，激励消失后估计停止更新（参数冻结在某个可能错误的值上）。',
      cond: '需持续激励（PE）才能保证 \\tilde\\theta\\to0。遗忘因子 \\lambda<1 破坏了 P 的单调性，长期无激励时协方差会「爆炸」，这是时变参数辨识最典型的故障。'
    },
    'Robust-NL-Damping': {
      kind: 'uub',
      conclusion: '注入充分耗散，误差被限制在可控界内',
      V: 'V=\\tfrac12 s^{2}',
      step: 'u=-Ks-\\frac{1}{4\\varepsilon}\\hat\\rho^{2}s，其中 \\hat\\rho 是扰动上界估计，最后一项用于压住不确定性。',
      dV: '\\dot V\\le -\\alpha V+\\varepsilon',
      judge: '由比较引理得 V(t)\\le V_0e^{-\\alpha t}+\\varepsilon/\\alpha，即 UUB，最终界 \\sqrt{2\\varepsilon/\\alpha} 可通过减小 \\varepsilon 任意收紧。',
      cond: '\\varepsilon 越小精度越高但控制量越抖（大增益项）。\\hat\\rho 必须覆盖真实上界，低估则 \\dot V 的负定性丧失，闭环可能发散。'
    },
    'NDOB': {
      kind: 'uub',
      conclusion: '非线性观测器同时估状态与扰动，估计误差指数收敛',
      V: 'V=\\tfrac12\\tilde x^{\\mathrm{T}}\\tilde x+\\tfrac12\\tilde d^{\\mathrm{T}}\\tilde d',
      step: '观测器 \\dot{\\hat x}=f(\\hat x)+g(\\hat x)u+\\hat d+L_1(x-\\hat x)、\\dot{\\hat d}=L_2(x-\\hat x)，误差动态为线性稳定系统加非线性残余。',
      dV: '\\dot V\\le -\\lambda_{\\min}(L)\\|\\tilde x\\|^{2}+C\\|\\tilde x\\|^{3}',
      judge: 'f、g 全局 Lipschitz 时，三次项在 \\tilde x 足够小时被线性项压住，得局部指数收敛；远离工作点时只能保证 UUB。',
      cond: '需 (f,g) 的 Lipschitz 常数有界，且 L_1、L_2 要按 Lipschitz 常数整定。增益过大会与非线性项耦合产生高频振荡——这是与线性 ESO 的主要差别。'
    },

    /* ── 10 观测器与网络拓扑 ── */
    'Extended-Luenberger': {
      kind: 'exponential',
      conclusion: '增广系统可观测 → 观测误差指数收敛',
      V: 'V=\\tilde x^{\\mathrm{T}}P\\tilde x,\\qquad (A-LC)^{\\mathrm{T}}P+P(A-LC)=-Q',
      step: '把常值扰动增广为状态，得到 \\dot{\\bar x}=\\bar A\\bar x+\\bar Bu；对 (\\bar A,C) 检查可观测性秩条件，若满足则配置观测器极点。',
      dV: '\\dot V=-\\tilde x^{\\mathrm{T}}Q\\tilde x\\le -\\frac{\\lambda_{\\min}(Q)}{\\lambda_{\\max}(P)}V',
      judge: '\\bar A-LC 是 Hurwitz 的（极点由 L 配置），故观测误差指数收敛，衰减率由最右观测器极点决定。',
      cond: '可观测性要求增广系统满足 PBH 秩条件：若对象在 s=0 处有零点，常值扰动不可辨识（例如纯积分对象无法区分「扰动」与「初值」）。'
    },
    'EKF-Ctrl': {
      kind: 'uub',
      conclusion: '线性化协方差传播 + 反馈，估计误差有界',
      V: 'V=\\tilde x^{\\mathrm{T}}P^{-1}\\tilde x',
      step: 'EKF 每步按雅可比 F=\\partial f/\\partial x 传播协方差并做卡尔曼更新；非线性导致协方差只是近似，误差项进入李雅普诺夫导数。',
      dV: '\\dot V\\le -\\lambda_{\\min}(P^{-1}Q P^{-1})V+C\\,\\left\\|F-\\hat F\\right\\|',
      judge: '线性化误差有界时得 UUB；非线性弱（局部近似线性）时余项趋于零，退化为标准卡尔曼的指数收敛。',
      cond: '需初始误差足够小、过程噪声协方差 Q 与观测噪声 R 设置合理。Q/R 过大过小都会让 P 失去意义，进而导致反馈增益异常。'
    },
    'Particle-Filter': {
      kind: 'uub',
      conclusion: '粒子数足够时后验逼近任意精度，估计有界',
      V: 'V=\\left\\|\\hat x-\\mathbb{E}[x|y]\\right\\|^{2}',
      step: '重要性采样 + 重采样使粒子经验分布依概率收敛到真实后验（大数定律）；估计误差方差正比于 1/N。',
      dV: '\\mathbb{E}\\left\\|\\hat x-x\\right\\|^{2}\\le\\frac{C}{N}+\\text{模型误差}',
      judge: '由大数定律与重采样的一致性结论，N\\to\\infty 时估计误差趋于零；有限 N 时得 UUB，界正比于 1/\\sqrt{N}。',
      cond: '高维状态下粒子数需求指数增长（维数灾难）。样本枯竭（权重集中到少数粒子）会使有效样本数骤降，需要重采样阈值监控。'
    },
    'Neural-RBF-ADRC': {
      kind: 'uub',
      conclusion: '网络逼近误差有界 ⟹ 闭环 UUB',
      V: 'V=\\tfrac12 e^{2}+\\tfrac{1}{2\\eta}\\left\\|w-w^{*}\\right\\|^{2}',
      step: 'RBF 网络以 \\hat f(x)=\\sum w_i\\phi_i(x) 逼近总扰动，权重按 \\dot w=\\eta\\,e\\,\\phi(x) 更新；逼近残差 \\varepsilon_N 进入导数。',
      dV: '\\dot V\\le -\\alpha V+\\varepsilon_N',
      judge: '万能逼近定理保证 \\varepsilon_N 可任意小（N 足够大时），故得 UUB，稳态界正比于逼近残差。',
      cond: '中心点 c_i 的分布决定逼近能力：覆盖不全的区域残差大。权重更新需要足够激励，否则只有被激活的节点权值会变，其余保持初值。'
    },
    'Artstein-Reduction': {
      kind: 'exponential',
      conclusion: '状态变换把输入延迟变成无延迟系统',
      V: 'z=x+\\int_{t-\\tau}^{t}e^{A(t-\\tau-s)}Bu(s)\\,\\mathrm{d}s',
      step: '构造 Artstein 变换 z，使 \\dot z=Az+B\\,v 不再含延迟；对无延迟系统设计 v=-Kz。',
      dV: '\\dot V=-z^{\\mathrm{T}}Qz\\le -\\alpha V',
      judge: '变换是可逆的（积分项有界），故 z 的指数稳定等价于 x 的指数稳定；延迟被完整地「吸收」进控制器需要的历史缓冲区。',
      cond: '需延迟 \\tau 精确已知且恒定。若 \\tau 未知或时变，变换不再成立，只能退回 Padé 近似或鲁棒设计（此时可镇定的最大延迟受限于开环不稳定极点）。'
    },
    'Quantized-Ctrl': {
      kind: 'uub',
      conclusion: '量化误差等价有界扰动，误差界正比于量化步长',
      V: 'V=\\tfrac12 e^{2},\\qquad u_q=\\Delta\\cdot\\operatorname{round}(u/\\Delta)',
      step: '量化误差 |u_q-u|\\le\\Delta/2 可视为叠加在控制量上的有界扰动，代入 \\dot V。',
      dV: '\\dot V\\le -\\alpha V+\\frac{\\Delta}{2}\\left|e\\right|',
      judge: '得 UUB，最终误差界约 \\Delta/(2K)（K 为等效刚度）。步长减半则精度翻倍，但通信比特数线性增加。',
      cond: '若同时量化状态（而非仅控制量），需要「缩放因子」随时间调整（动态量化），否则远离原点时量化过粗、靠近原点时又过于精细。'
    },
    'Event-Triggered-MPC': {
      kind: 'uub',
      conclusion: '触发条件保证代价单调，复用控制序列仍可行',
      V: 'V_N(x)=J^{*}(x),\\qquad \\left\\|x-x_{nom}\\right\\|\\le\\eta\\ \\text{时复用}',
      step: '只在偏差超过阈值 η 时重解优化；两次求解之间沿用上一拍的最优控制序列，偏差累积被 η 限制。',
      dV: 'V_N(x^{+})-V_N(x)\\le -\\ell(x,u)+C\\eta<0',
      judge: 'η 足够小时余项被 \\ell 吸收，代价仍单调下降，得 UUB；不触发期间约束满足性由 η 相对收紧量保证。',
      cond: 'η 与约束收紧量必须匹配：η 大于收紧量时，复用期间可能违反原约束。此外要保证「最大不触发间隔」有界，否则持续偏离会导致失稳。'
    },

    /* ── 11 高阶与物理前沿 ── */
    'FO-PD': {
      kind: 'asymptotic',
      conclusion: '分数阶微分提供恒定相位超前，闭环极点可判稳',
      V: 'C(s)=K_p+K_ds^{\\mu},\\qquad \\angle s^{\\mu}=\\mu\\frac{\\pi}{2}',
      step: '分数阶微分 s^{\\mu} 的幅值为 \\omega^{\\mu}、相位恒为 \\mu\\pi/2。把它与对象 G(s) 串联后，用 Nyquist 判据检查闭环。',
      dV: '\\text{PM}=\\pi+\\angle C(j\\omega_c)G(j\\omega_c)>0',
      judge: '相位裕度为正且增益裕度大于 1 时闭环稳定（与整数阶同一判据）。分数阶的特殊之处是相位超前不随频率变化，因此可在宽频段同时改善裕度。',
      cond: '需分数阶微分的数值实现（Oustaloup 滤波或 Grünwald-Letnikov 差分），实现阶数不足时高频段相位会偏离理论值。'
    },
    'Nonlinear-Power-ADRC': {
      kind: 'uub',
      conclusion: '次幂误差反馈使大误差增益低、小误差增益高',
      V: 'V=\\tfrac12 e_1^{2}+\\tfrac12 e_2^{2}+\\tfrac12\\tilde f^{2}',
      step: '误差反馈取 \\operatorname{fal}(e,\\alpha,\\delta)，其增益在 |e|>\\delta 时按 |e|^{\\alpha-1} 衰减，在 |e|<\\delta 时退化为常数 1/\\delta^{1-\\alpha}。',
      dV: '\\dot V\\le -\\kappa V+C\\left\\|\\dot f\\right\\|',
      judge: '与线性 ADRC 同构：\\dot f 有界即得 UUB，\\dot f\\to0 时渐近稳定。差别只在收敛速度与「大偏差时不冲击执行器」这两点上。',
      cond: '\\alpha 与 \\delta 需与噪声水平匹配：\\alpha 太小则原点附近增益过高放大噪声，\\delta 太小则线性区过窄导致抖振。'
    },
    'Implicit-Euler-Ctrl': {
      kind: 'asymptotic',
      conclusion: '隐式离散天然 A-稳定，大步长不发散',
      V: 'x_{k+1}=x_k+h\\,f(x_{k+1}),\\qquad \\left|1-h\\lambda\\right|^{-1}<1\\ \\ \\forall\\,\\mathrm{Re}\\,\\lambda<0',
      step: '隐式欧拉把微分方程在 k+1 时刻离散，放大因子为 1/(1-h\\lambda)。对任意 \\mathrm{Re}\\,\\lambda<0 与 h>0，其模恒小于 1。',
      dV: '\\left|\\frac{1}{1-h\\lambda}\\right|<1\\quad\\Longleftrightarrow\\quad\\mathrm{Re}\\,\\lambda<0',
      judge: '这就是 A-稳定性：无论步长多大，稳定对象离散后仍稳定。显式欧拉要求 h<2/|\\lambda|，隐式则无此限制。',
      cond: '每步需解一个（非线性）代数方程，计算量远大于显式方法。实时性要求高时通常改用半隐式或 Rosenbrock 方法折中。'
    },
    'Lorenz-Coupled': {
      kind: 'uub',
      conclusion: '教学构造，无严格稳定性保证，仅定性有界',
      V: 'V=\\tfrac12\\left(e_x^{2}+e_y^{2}+e_z^{2}\\right)',
      step: '把 Lorenz 系统的状态作为额外非线性反馈项注入控制律。由于耦合项增益随轨迹变化且无界（Lorenz 吸引子本身有界但导数无界），李雅普诺夫分析只能给出局部结论。',
      dV: '\\dot V\\le -\\alpha V+C\\left\\|\\chi(t)\\right\\|',
      judge: '\\left\\|\\chi\\right\\| 有界时得 UUB；但耦合强度与收敛域的关系没有解析表达式，只能靠数值实验确定。因此本条目自述为「教学演示级构造」。',
      cond: '不推荐用于任何有稳定性要求的场合。它的价值在于展示「强非线性耦合反馈」的定性现象，以及为何工程上宁可选择有严格证明的结构。'
    },
    'Speed-Gradient': {
      kind: 'asymptotic',
      conclusion: '沿目标泛函负梯度更新，泛函单调下降',
      V: 'V=Q(\\theta)',
      step: '速度梯度法把参数更新写成 \\dot\\theta=-\\Gamma\\nabla_\\theta Q，直接对目标泛函做梯度下降。',
      dV: '\\dot V=\\nabla_\\theta Q^{\\mathrm{T}}\\dot\\theta=-\\nabla_\\theta Q^{\\mathrm{T}}\\Gamma\\nabla_\\theta Q\\le 0',
      judge: '\\Gamma 正定时 \\dot V\\le0，且只在 \\nabla Q=0 处为零，故 Q 单调下降并收敛到驻点（可能是局部极小）。配合凸性可得全局收敛。',
      cond: '需 Q 对 \\theta 可微且梯度可计算。非凸时只保证收敛到局部极小；\\Gamma 过大则离散实现会越过极小点振荡。'
    },
    'Feedback-Passivation': {
      kind: 'passive',
      conclusion: '把系统无源化后，无源反馈保证 L2 稳定',
      V: 'V=x^{\\mathrm{T}}Px,\\qquad \\dot V\\le u^{\\mathrm{T}}y',
      step: '先做反馈变换使系统成为无源（或严格无源）的，再由无源性定理：无源系统与无源控制器互联仍无源，闭环 L2 稳定。',
      dV: '\\dot V\\le -\\varepsilon\\left\\|x\\right\\|^{2}+u^{\\mathrm{T}}y',
      judge: '严格无源（\\varepsilon>0）时零输入下 \\dot V<0，得渐近稳定；非严格无源只能得 L2 稳定（能量有界）。这是无源性方法相对于 Lyapunov 直接法的优势：不需要知道具体增益。',
      cond: '需先验证系统的相对阶为 1（否则需串联积分器做「无源化」补偿）。相对阶大于 1 时无源性方法失效，应改用反步或滑模。'
    },

    /* ── 05 数据驱动与智能 ── */
    'NPID': {
      kind: 'uub',
      conclusion: 'fal 函数增益有界，闭环 UUB',
      V: 'V=\\tfrac12 e^{2}',
      step: 'fal(e,\\alpha,\\delta) 满足 e\\cdot\\operatorname{fal}(e)\\ge0 且局部线性，其等效增益在 [\\delta^{\\alpha-1},\\ \\delta^{-1}] 内有界。',
      dV: '\\dot V\\le -k\\,\\delta^{\\alpha-1}e^{2}+C\\le -\\alpha V+C',
      judge: '增益有正下界 ⟹ \\dot V\\le-\\alpha V+C，得 UUB，稳态误差界正比于扰动幅度与最小增益的比值。',
      cond: '\\alpha<1 且 \\delta>0。\\alpha 越接近 0，大误差区增益越低、抗扰越弱；\\delta 越小，线性区越窄、抖振越强。'
    },
    'MRAC': {
      kind: 'asymptotic',
      conclusion: '自适应律由 Lyapunov 直接导出，保证误差渐近到零',
      V: 'V=\\tfrac12 e^{\\mathrm{T}}Pe+\\tfrac{1}{2\\gamma}\\tilde\\theta^{\\mathrm{T}}\\tilde\\theta',
      step: '参考模型 \\dot x_m=A_mx_m+B_mr 给出期望响应；跟踪误差 e=x-x_m 的动力学含 \\tilde\\theta^{\\mathrm{T}}\\phi。对 V 求导并令自适应律恰好抵消交叉项：',
      dV: '\\dot V=-\\tfrac12e^{\\mathrm{T}}Qe+\\tilde\\theta^{\\mathrm{T}}\\left(\\phi e^{\\mathrm{T}}PB+\\tfrac{1}{\\gamma}\\dot{\\hat\\theta}\\right)=-\\tfrac12e^{\\mathrm{T}}Qe\\le 0',
      judge: '交叉项被 \\dot{\\hat\\theta}=-\\gamma\\phi e^{\\mathrm{T}}PB 精确相消，于是 \\dot V 半负定；由 Barbalat 引理得 e\\to0，参数误差 \\tilde\\theta 仅保证有界。',
      cond: '需参考模型为严格正实（或满足 SPR 条件）。参数收敛需 PE 条件；鲁棒性需加 σ-修正（\\dot{\\hat\\theta}=-\\sigma\\hat\\theta-\\gamma\\phi e^{\\mathrm{T}}PB），否则扰动下参数会缓慢漂移。'
    },
    'STR': {
      kind: 'uub',
      conclusion: '确定性等价：辨识收敛 + 控制器稳定 ⟹ 闭环有界',
      V: 'V=\\tfrac12\\tilde\\theta^{\\mathrm{T}}P^{-1}\\tilde\\theta+\\tfrac12 e^{2}',
      step: 'STR 分两步：先 RLS 估计 \\hat\\theta，再把 \\hat\\theta 当作真值设计极点配置控制器（确定性等价原理）。',
      dV: '\\dot V\\le -\\alpha V+C\\left\\|\\tilde\\theta\\right\\|^{2}',
      judge: '辨识误差进入闭环后成为参数摄动项，得 UUB；若 \\tilde\\theta\\to0（充分激励），退化为参数已知时的渐近稳定。',
      cond: '确定性等价只在估计误差足够小时成立。辨识未收敛的阶段（前几十拍）闭环可能不稳定，工程上常先开环辨识或加「软启动」限制增益。'
    },
    'MFAC': {
      kind: 'uub',
      conclusion: '伪偏导数有界即闭环有界',
      V: 'V=\\tfrac12 e^{2},\\qquad \\Delta y_k=\\phi_k\\Delta u_k',
      step: 'MFAC 用伪偏导数 \\phi_k 代替模型，控制律 u_k=u_{k-1}+\\rho\\phi_k(r-y_k)/(\\lambda+\\phi_k^{2})；\\phi_k 由输入输出数据在线估计。',
      dV: '\\dot V\\le -\\frac{\\rho\\phi_k^{2}}{\\lambda+\\phi_k^{2}}e^{2}\\le -\\alpha V',
      judge: '只要 \\phi_k 满足 0<b_{\\min}\\le|\\phi_k|\\le b_{\\max}（对有界输入输出系统成立），控制律即给出负定的 \\dot V，得指数收敛到零。',
      cond: '需系统的「伪偏导」确实存在且不变号（对应对象增益符号恒定）。若对象在运行中增益反向（例如过零点的阀门），\\phi_k 会变号，控制方向反转导致发散。'
    },
    'iPID': {
      kind: 'uub',
      conclusion: '代数估计器误差有界 ⟹ 闭环 UUB',
      V: 'V=\\tfrac12 e^{2}+\\tfrac12\\tilde F^{2}',
      step: '超局部模型 y^{(\\nu)}=F+\\alpha u，F 用上一拍数据反算 \\hat F=(y_k-y_{k-1})/h-\\alpha u_{k-1}；控制律 u=(y^{*(\\nu)}-\\hat F+K_pe+K_d\\dot e)/\\alpha。',
      dV: '\\dot V\\le -\\alpha V+C\\,h\\left\\|\\dot F\\right\\|',
      judge: '估计误差正比于采样周期 h 与 F 的变化率，故得 UUB，界随 h 减小而线性降低。',
      cond: '需 \\alpha 的符号与幅值已知（\\(\\alpha\\) 是控制增益，通常取对象直流增益的估计）。h 太小会放大差分噪声，此时需改用带滤波的代数估计器。'
    },
    'U-Model': {
      kind: 'uub',
      conclusion: '求根映射连续则有界，闭环局部稳定',
      V: 'V=\\tfrac12 e^{2}',
      step: 'U-Model 把非线性对象写成 y^{(n)}=f+b u，由期望闭环方程反解 u=(y^{*(n)}-\\hat f)/\\hat b，其中 \\hat f 由 U 模型的求根得到。',
      dV: '\\dot V\\le -\\alpha V+C\\left\\|f-\\hat f\\right\\|',
      judge: '求根映射在 \\hat b 不接近零时连续且有界，故得 UUB；\\hat b\\to0 时控制量趋于无穷，这是该方法唯一的结构性奇点。',
      cond: '必须保证控制增益估计 \\hat b 远离零且符号正确。工程上对 |\\hat b| 设下限，超过下限时限制控制量幅值而非继续求逆。'
    },
    'ESC': {
      kind: 'uub',
      conclusion: '平均化后收敛到极值点的邻域，邻域大小正比于抖动幅值',
      V: 'V=\\tfrac12\\left(\\theta-\\theta^{*}\\right)^{2}',
      step: '极值寻优在控制量上叠加抖动 a\\sin\\omega t，解调后得到梯度估计；对高频抖动做平均化（时间尺度分离 \\omega\\gg 控制器带宽）。',
      dV: '\\dot V\\le -kV+O(a)',
      judge: '平均系统的收敛速率正比于 a²，最终停留在极值点半径 O(a) 的邻域内。抖动幅值减半则精度翻倍，但收敛速度降为 1/4。',
      cond: '需三个时间尺度严格分离：对象动态 \\gg 抖动的包络 \\gg 抖动频率。分离不足时解调会把对象动态误认为梯度，导致寻优方向错误。'
    },
    'BELBIC': {
      kind: 'uub',
      conclusion: '权重按奖励更新且有界，输出有界',
      V: 'V=\\tfrac12\\sum V_i^{2}',
      step: '情绪节点 EA/EO 的权重按 \\dot V_i=\\alpha\\max(0,\\text{Rew}-\\overline{\\text{Rew}})S_i 更新，只在奖励高于均值时学习。',
      dV: '\\dot V\\le \\alpha\\left\\|S\\right\\|^{2}-\\gamma V',
      judge: '权重增长受衰减项与奖励归一化限制，故有界；输出 MO=EA-EO 因此有界，闭环得 UUB。',
      cond: '奖励函数必须有界且归一化，否则权重会无界增长。无监督学习特性意味着它不能保证收敛到最优，只保证「向更好的方向」移动。'
    },
    'Linear-Actor-Critic': {
      kind: 'uub',
      conclusion: '学习率足够小（时间尺度分离）时局部收敛',
      V: 'V=\\tfrac12\\delta^{2}+\\tfrac12\\left\\|\\theta-\\theta^{*}\\right\\|^{2}',
      step: 'Actor 与 Critic 同时按 TD 误差 \\delta 更新；两者的更新速率必须远慢于系统动态，才能视为「准静态」的参数调整。',
      dV: '\\dot V\\le -\\alpha V+C\\,\\eta',
      judge: '学习率 \\eta 足够小时，参数更新在一个采样周期内几乎不变，闭环可视为「缓慢变化增益的线性系统」；\\eta 超过阈值则参数与状态相互激励而发散。',
      cond: '需特征归一化且学习率满足 \\eta<1/\\lambda_{\\max}(\\Phi^{\\mathrm{T}}\\Phi)。本平台默认参数下该条件不满足，因此会出现数值发散——这本身是一个教学点。'
    },
    'Gradient-PID': {
      kind: 'uub',
      conclusion: '沿代价负梯度更新增益，代价单调下降',
      V: 'V=J(K)=\\tfrac12\\int e^{2}\\,\\mathrm{d}t',
      step: '增益按 \\dot K=-\\eta\\,\\partial J/\\partial K 更新；梯度用前向差分或 IFT 从实验数据估计。',
      dV: '\\dot V=\\nabla_KJ^{\\mathrm{T}}\\dot K=-\\eta\\left\\|\\nabla_KJ\\right\\|^{2}\\le 0',
      judge: 'V 单调不增且有下界，故收敛到驻点；学习率过大时离散更新越过极小点，表现为增益来回振荡。',
      cond: '需代价函数对增益可微且梯度估计无偏。在线估计梯度会与闭环动态耦合，通常要求每次更新之间等待系统稳定（IFT 的「每轮一次」做法）。'
    }
  };

  /* ── 训练与使用库（智能 / 学习 / 需在线整定的方法） ────
       signal  训练与整定信号从哪来
       params  超参表 [名称, 建议值, 调大后果]
       loop    训练 / 整定流程
       use     在线使用方式（每拍做什么）
       fail    典型失败模式
       impl    本平台实现的简化点
     ──────────────────────────────────────────────────── */
  /* ── 每方法专属补充 ─────────────────────────────────────
     linear    第3章：算不出解析特征多项式时，改用这段方法专属说明
     lab       第8章：方法专属实验步骤（缺省回退通用步骤）
     pitfalls  第10章：方法专属误区（追加在同类通用误区之后）
     exercise  动手练习章：目标 / 分步操作 / 预期现象 / 判断依据
     ──────────────────────────────────────────────────────── */
  const METHOD_EXTRA = {
    /* ── 01 经典线性体系 ───────────────────────────────── */
    'OpenLoop': {
      linear: '开环没有反馈通道，闭环方程里根本不含 x——写成 s 域就是对象自身的 m s²+c s+k=0，而控制力 u=u_static 是与状态无关的常数。也就是说它没有「闭环极点」可求，位置完全按对象自身的自由规律演化。这正是它作为对照基准的价值：把「反馈究竟带来了什么」单独隔离出来看。',
      lab: [
        '把 u_static 设为 0，观察位置曲线完全由对象自身演化：弹簧型对象停在原点，积分型对象匀加速漂走。',
        '把 u_static 逐步加大到 50 N，对比两个对象：质量-弹簧-阻尼会被拉到一个新平衡点 u/k，二阶积分器则一直加速。',
        '在二阶积分器上对比「开环」与「PID」：同样的目标，一个漂走、一个追得上。'
      ],
      pitfalls: [
        '把开环当成「可以用增益调好」的方法——它连反馈通道都没有。',
        '在有回复力的对象上看到「能停住」就以为开环有效——那是被弹簧拉住的结果，不是控制器在工作。'
      ],
      exercise: {
        goal: '用实验说明「反馈究竟带来了什么」',
        steps: [
          '在二阶积分器对象上选 OpenLoop，u_static 设为 20 N，运行 10 s，记录位置曲线与 RMSE。',
          '切到 PID（Kp=30、Ki=10、Kd=20），在同一对象上重复一次。',
          '再把对象切回质量-弹簧-阻尼，对比开环的表现。'
        ],
        expect: '开环下位置沿二次曲线持续漂走、RMSE 不收敛；PID 下 2 s 内进入目标 ±5% 并保持；换成弹簧型对象后开环会停在一个平衡点上而非漂走。',
        judge: '若开环的 RMSE 也在下降，说明你还没真正理解「无回复力对象上开环必然漂移」；若换成弹簧对象后开环仍漂走，检查 u_static 是否真的加进去了。'
      }
    },
    'P': {
      linear: '比例控制把对象的等效刚度抬高：u=K_p e 使闭环特征方程变成 m s²+c s+(k+K_p)=0。阻尼系数 c 没变，所以阻尼比 ζ=c/(2√(m(k+K_p))) 随 K_p 增大而下降——K_p 越大越快，代价是超调也越大。在纯二阶积分器（k=0）上更极端：特征方程退化成 m s²+K_p=0，极点落在虚轴上，无论 K_p 取多少都只能等幅振荡。',
      lab: [
        '把 K_p 从 10 逐步加到 60，每次记录超调量与控制力峰值。',
        '在相平面里看轨迹形状：K_p 越大，螺旋越扁（阻尼比下降）。',
        '切到二阶积分器对象，观察 K_p 无论取多大都是等幅振荡。'
      ],
      pitfalls: [
        '以为加大 K_p 就能「又快又稳」——它只加刚度不加阻尼，超调必然上升。',
        '在无回复力对象上反复调 K_p 企图消除振荡——这类对象的振荡来自「没有阻尼」而不是「增益不对」。'
      ],
      exercise: {
        goal: '看清 K_p 对阻尼比的影响',
        steps: [
          '在质量-弹簧-阻尼对象上设 K_p=10、K_i=0、K_d=0，记录超调与相平面形状。',
          '把 K_p 改成 40 再记录一次。',
          '对照第 3 节的极点表，比较两次的等效刚度 k+K_p 与阻尼比 ζ。'
        ],
        expect: 'K_p 翻 4 倍后上升时间明显缩短，但超调从约 5% 升到 20% 以上，阻尼比下降。',
        judge: '若两次超调几乎一样，说明你同时动了别的参数；K_p 只影响等效刚度，阻尼比必须靠 K_d 或对象自身阻尼 c。'
      }
    },
    'PI': {
      linear: '比例加积分把系统型别提高一阶：闭环特征方程 m s³+c s²+(k+K_p)s+K_i=0。积分项让常值扰动下静差归零，代价是引入约 90° 的相位滞后，容易超调甚至积分饱和。在纯二阶积分器上，这三阶多项式违反 Routh 判据（s² 行首项为 0），闭环必然发散。',
      lab: [
        '在质量-弹簧-阻尼对象上先关掉 K_i，用 K_p=40 把静差读出来（理论上 e_ss = r·k/(k+K_p)）。',
        '打开 K_i=10，观察静差被积分项吃掉，同时超调明显上升。',
        '把目标调大到 8 m，看积分累积把执行器顶到限幅（积分饱和）。'
      ],
      pitfalls: [
        '以为「加了 I 就一定没有静差」——执行器饱和后积分继续累积，反而造成长时间超调。',
        '在纯二阶积分器上用 PI 期待它稳定——三阶判据不满足，调增益只会改变发散速度。'
      ],
      exercise: {
        goal: '验证积分消除静差的条件与代价',
        steps: [
          '在质量-弹簧-阻尼对象上设 K_p=40、K_i=0，测末段静差。',
          '改为 K_i=10，重复测量。',
          '再把目标从 5 m 提到 8 m，观察控制力是否触顶。'
        ],
        expect: 'K_i=0 时静差约 0.12 m；K_i=10 后静差趋近 0，但超调上升到 15% 以上。',
        judge: '若 K_i=10 仍有静差，检查积分是否被限幅；若超调没上升，说明积分通道没有真正接进控制律。'
      }
    },
    'PD': {
      linear: '比例加微分把对象的等效阻尼抬高：u=K_p e-K_d v 使闭环特征方程变成 m s²+(c+K_d)s+(k+K_p)=0。微分项提供阻尼、不改变刚度，因此能在不加积分的前提下压住超调；代价是它直接放大测量噪声。',
      lab: [
        '在质量-弹簧-阻尼对象上设 K_p=40、K_i=0，逐步加 K_d，记录超调与控制力的高频毛刺。',
        '打开「测量噪声」开关后再加 K_d，观察控制力曲线出现高频抖动。',
        '把 K_d 减半，确认超调回升。'
      ],
      pitfalls: [
        '把 PD 当成能消除静差的方法——它没有积分项，常值扰动下必有静差。',
        '在噪声大的场景里盲目加大 K_d——微分对噪声的放大是直接叠加到控制力上的。'
      ],
      exercise: {
        goal: '分辨「加阻尼」与「加刚度」对超调的不同作用',
        steps: [
          '在质量-弹簧-阻尼对象上设 K_p=40、K_d=0，记录超调。',
          '保持 K_p 不变，把 K_d 逐步加大到 30。',
          '对比两次的超调量与控制力峰值。'
        ],
        expect: 'K_d 加大后超调显著下降、控制力峰值略升。',
        judge: '若加大 K_d 反而超调更大，检查是否同时改了 K_p；两者对闭环的影响是解耦的（刚度 vs 阻尼）。'
      }
    },
    'PID': {
      linear: '三件套齐全：u=K_p e+K_i∫e-K_d v 把闭环变成三阶 m s³+(c+K_d)s²+(k+K_p)s+K_i=0。K_p 抬刚度、K_d 抬阻尼、K_i 提型别。用 Routh 判据可以直接写出稳定条件：(c+K_d)>0、(k+K_p)>0，且 (c+K_d)(k+K_p)>m K_i——最后这条正是「K_i 不能随便大」的定量依据。',
      lab: [
        '先按 PD 的顺序整出 K_p、K_d，再从小到大加 K_i，每加一次观察超调与末段静差。',
        '把 K_i 加到出现明显超调后再减半，确认能恢复。',
        '施加一次脉冲扰动，观察积分项把偏差攒起来后多冲了多少。'
      ],
      pitfalls: [
        '把整定顺序搞反——先定 K_p、K_d 再加 K_i，顺序反了会一直找不到根因。',
        '在执行器饱和时继续加 K_i，积分越滚越大，退饱和后出现长时间超调。'
      ],
      exercise: {
        goal: '按正确顺序完成一次 PID 整定',
        steps: [
          '设 K_i=0，把 K_p 从 10 加到 40，找到上升时间可接受的值。',
          '加入 K_d=20 压住超调。',
          '最后加 K_i=5~10 消除静差，记录每一步的 RMSE 与控制力峰值。'
        ],
        expect: '三步之后 RMSE 最小且超调可控；若第 3 步超调明显变大，说明 K_i 超过当前带宽允许的量。',
        judge: '若任何一步都让 RMSE 变差，回退检查对象是否为二阶积分器——无回复力时 K_i 的作用方向是相反的。'
      }
    },
    'IPD': {
      linear: '比例作用在位置量而不是误差上：u=K_i∫e-K_p x-K_d v。齐部分析后闭环特征方程与标准 PID 同形——m s³+(c+K_d)s²+(k+K_p)s+K_i=0；差别只出现在指令通道：标准 PID 的比例项跟随指令跳变，IPD 的比例项只对位置偏差起作用，因此不会在指令跳变瞬间产生微分冲击。',
      lab: [
        '在质量-弹簧-阻尼对象上设 K_p=40、K_d=20，分别用 PID 与 IPD 各跑一次阶跃。',
        '对比指令跳变瞬间的控制力峰值。',
        '再施加一次扰动，看两者的恢复过程是否接近。'
      ],
      pitfalls: [
        '以为 IPD 和 PID 是两种完全不同的闭环——极点其实同形，只是指令通道不同。',
        '把 IPD 的 K_p 直接当成 PID 的 K_p 用同一组值——两者对指令的响应差别很大。'
      ],
      exercise: {
        goal: '看清「比例作用在误差上」与「作用在位置上」的差别',
        steps: [
          '在质量-弹簧-阻尼对象上用 PID（Kp=40,Kd=20,Ki=0）做一次阶跃，记控制力峰值。',
          '换成 IPD（Kp=40,Kd=20）重复。',
          '比较两者指令瞬间的控制力尖峰。'
        ],
        expect: 'PID 在指令跳变瞬间有明显尖峰，IPD 的尖峰小得多。',
        judge: '若两者尖峰一样大，检查 IPD 的比例通道是否真的接在 -x 而不是 e 上。'
      }
    },
    '2DOF-PID': {
      linear: '两自由度 PID 把比例项拆成「设定值权重 b」与「反馈权重」：u=K_p(b r-x)+K_i∫e-K_d v。闭环特征方程仍与标准 PID 同形（m s³+(c+K_d)s²+(k+K_p)s+K_i=0），因为 b 只作用在指令通道；但 b 决定指令跟随的软硬：b=1 时比例通道完全跟随指令，b<1 时指令跟随变缓而抗扰能力不变。',
      lab: [
        '固定 K_p=40、K_d=20，把 b 从 1 改到 0.3，观察阶跃响应上升段变缓但稳态值不变。',
        '在指令跳变瞬间观察控制力峰值随 b 减小而下降。',
        '中途施加一次扰动，确认两种 b 下的扰动恢复速度几乎相同。'
      ],
      pitfalls: [
        '以为调 b 会改变闭环极点——它只改指令通道的加权。',
        '用 b 调响应速度，结果把抗扰性能一起牺牲了——抗扰只由反馈通道决定。'
      ],
      exercise: {
        goal: '分离「指令跟随」与「抗扰」两条通道的整定',
        steps: [
          'b=1 时做阶跃 + 扰动，记录上升时间与恢复时间。',
          'b=0.3 重复同一组实验。',
          '比较两个指标分别怎么变。'
        ],
        expect: 'b 减小后上升变缓、指令尖峰变小，而扰动恢复时间基本不变。',
        judge: '若恢复时间也明显变慢，说明你同时改了 K_p 或 K_d，而不是只改 b。'
      }
    },
    'IncPID': {
      linear: '增量式 PID 不直接算控制量，而是算它的增量：Δu=K_p(e_k-e_{k-1})+K_i e_k+K_d(e_k-2e_{k-1}+e_{k-2})，再累加得 u_k=u_{k-1}+Δu_k。它天然多出「历史」这一维，是个离散差分方程，没有与之对应的固定阶数连续特征多项式——判断稳定性要看差分系统的特征根 z，或在实验台上逐步加大 K_d 观察差分噪声被放大的程度。',
      lab: [
        '在质量-弹簧-阻尼对象上设 K_p=84、K_i=0.7、K_d=40，观察位置曲线是否光滑。',
        '把 K_d 依次减到 20、10、5，观察控制力是否变得更毛。',
        '对比同参数下 PID 的控制力曲线，看增量式的输出是否更平缓。'
      ],
      pitfalls: [
        '把增量式当位置式用——它的 K_p、K_d 含义与量级完全不同，照搬会严重超调。',
        '忽略增量式对差分噪声的放大：K_d 作用在二阶差分上，噪声放大远大于位置式。'
      ],
      exercise: {
        goal: '理解增量式 PID 的差分结构与噪声敏感性',
        steps: [
          '在质量-弹簧-阻尼对象上用 IncPID（Kp=84,Kd=40）跑一次阶跃。',
          '把 K_d 依次改为 20、10、5，各记录控制力曲线。',
          '开启测量噪声后再重复一次。'
        ],
        expect: 'K_d 越大控制力越毛；开启噪声后毛刺明显加重。',
        judge: '若降低 K_d 后控制力仍不平滑，检查是否有输出限幅或目标跳变造成的真实增量。'
      }
    },
    'PI-D': {
      linear: 'PI-D 把微分作用放在测量值上、比例积分放在误差上：u=K_p e+K_i∫e-K_d v。齐部分析后闭环特征方程与标准 PID 完全同形（m s³+(c+K_d)s²+(k+K_p)s+K_i=0）；它的工程价值在于「微分不作用于指令」，因此指令跳变不会产生微分冲击。',
      lab: [
        '用 PI-D（Kp=40,Ki=10,Kd=20）与标准 PID 各跑一次阶跃指令。',
        '比较指令跳变瞬间的控制力峰值。',
        '再施加一次扰动，确认两者的扰动响应一致。'
      ],
      pitfalls: [
        '以为 PI-D 与 PID 的闭环极点不同——同形，差别只在指令通道。',
        '在指令频繁变化的场景里仍按 PID 的经验整 K_d——PI-D 的微分通道要按「测量噪声」而非「指令冲击」来定。'
      ],
      exercise: {
        goal: '验证微分通道不作用于指令',
        steps: [
          '在质量-弹簧-阻尼对象上用 PID 跑一次阶跃，记指令瞬间控制力峰值。',
          '换 PI-D 同参数重复。',
          '施加一次阶跃扰动，比较两者的扰动恢复。'
        ],
        expect: '指令瞬间 PI-D 的尖峰明显更小；扰动恢复两者接近。',
        judge: '若扰动恢复也明显不同，检查微分项是否误接到了误差上（即写成了普通 PID）。'
      }
    },
    'Nested-PID': {
      linear: '串级结构：外环把误差变成速度指令 v_d=K_{p,out}·e，内环再把 (v_d-v) 整定掉，即 u=K_{p,in}(v_d-v)+K_{i,in}∫(v_d-v)dt。齐部分析得三阶特征方程 m s³+(c+K_{p,in})s²+(k+K_{p,in}K_{p,out}+K_{i,in})s+K_{i,in}K_{p,out}=0——外环增益直接乘进等效刚度，所以外环调得越快，内环越跟不上。',
      lab: [
        '固定内环 K_{p,in}=30、K_{i,in}=30，逐步把外环 K_{p,out} 从 5 加到 40。',
        '每次记录超调与控制力峰值，观察外环过大时出现的「内环饱和」。',
        '打开「扰动」按钮，比较内外环各自对扰动的反应。'
      ],
      pitfalls: [
        '把外环当成位置环来加大——外环输出的是速度指令，过大会让内环长期饱和。',
        '内环没整定好就调外环——串级的调试顺序永远是先内后外。'
      ],
      exercise: {
        goal: '掌握串级 PID 的「先内后外」整定顺序',
        steps: [
          '把 K_{p,out} 固定为 5，只调 K_{p,in} 与 K_{i,in} 直到内环跟踪良好。',
          '再逐步加大 K_{p,out}。',
          '记录外环增益的上限出现在哪里，以及此时的失真现象。'
        ],
        expect: '外环增益存在明确上限，超过后控制力长时间饱和、恢复变慢。',
        judge: '若外环可以一直加大，说明内环其实还没整定好——判据是内环带宽应至少是外环的 3~5 倍。'
      }
    },
    /* ── 02 频域与最优理论 ─────────────────────────────── */
    'PolePlacement': {
      lab: [
        '在质量-弹簧-阻尼对象上设 p1=2、p2=3，对照第 3 节极点表核对：闭环极点应当正好落在 −2 与 −3。',
        '把 p1 改成 1（极点更靠近原点），观察响应变慢但超调变小。',
        '在二阶积分器对象上重复：极点依然能被配准，但"配准极点"和"能定位"是两回事。'
      ],
      pitfalls: [
        '以为极点配到哪就一定稳——它只保证你指定的极点成立，前提是模型参数与增益匹配。',
        '在二阶积分器上把 p1、p2 配得很小以求快速——等幅振荡的幅度不会因此变小。'
      ],
      exercise: {
        goal: '验证极点配置「说配到哪就配到哪」',
        steps: [
          '在质量-弹簧-阻尼对象上设 p1=2、p2=3，跑一次阶跃。',
          '回到第 3 节读极点表，确认最大实部等于 −2。',
          '把 p1 改成 1 再读极点表与实测衰减率。'
        ],
        expect: '极点表与实测一致；p1 改小后实测衰减变慢。',
        judge: '若极点表对而实测不符，说明模型参数 m、c、k 与实际对象不一致（回第 7 节看当前值）。'
      }
    },
    'LQR': {
      lab: [
        '在质量-弹簧-阻尼对象上用默认 q_x=100、q_v=10、r_weight=1，记录上升时间与控制力峰值。',
        '把 r_weight 加大到 10（更"吝啬"控制能量），观察响应变柔和但变慢。',
        '把 q_v 加大到 50，观察阻尼上升、超调下降。'
      ],
      pitfalls: [
        '把 Q、R 当成随便调的旋钮——它们是代价函数的权重，改动会同时改变刚度与阻尼。',
        '只看 Q 不看 R：R 决定控制力峰值，Q 调得再激进也会被 R 拉住。'
      ],
      exercise: {
        goal: '体会 Q/R 的「精度—能耗」折中',
        steps: [
          '默认参数跑一次阶跃，记录 RMSE 与控制力峰值。',
          '把 r_weight 从 1 改成 20 重复。',
          '把 q_x 从 100 改成 500 重复。'
        ],
        expect: 'r_weight 增大后 RMSE 略升但峰值明显下降；q_x 增大后 RMSE 下降但峰值回升。',
        judge: '若三者都让 RMSE 变大，检查对象是否为二阶积分器——那里 LQR 的 K_d 仍然有效，但 K_p 提供不了回复力。'
      }
    },
    'LQG': {
      lab: [
        '在质量-弹簧-阻尼对象上打开「测量噪声」，用 LQR 与 LQG 各跑一次阶跃。',
        '比较两者的控制力抖动幅度。',
        '把 LQG 的 q_x、q_v 同步调大到 LQR 的 2 倍，再比较一次。'
      ],
      pitfalls: [
        '以为 LQG 一定比 LQR 稳——模型准确时两者极点相同，LQG 的收益全在噪声与模型失配下。',
        '把卡尔曼滤波器的噪声系数调得过大：估计变"自信"了，反而把测量噪声当真值放大进控制律。'
      ],
      exercise: {
        goal: '看清 LQG 相对 LQR 的收益来自噪声而非极点',
        steps: [
          '打开测量噪声，分别用 LQR 与 LQG 跑阶跃，记录控制力抖动的峰值。',
          '对照第 3 节两者的极点表。',
          '把滤波器的噪声系数从 0.1 改成 0.5 再跑一次 LQG。'
        ],
        expect: 'LQG 的控制力抖动小于 LQR，但两者极点相同；噪声系数调大后抖动反而变大。',
        judge: '若极点表不同，说明你改动的参数影响了 LQG 的 K_p、K_d 计算路径（LQG 用 q_x/r_w，LQR 用 q_x/r_weight）。'
      }
    },
    'LQR-I': {
      lab: [
        '在质量-弹簧-阻尼对象上先用默认 q_i=500 跑一次，观察控制力是否长时间饱和、末段静差有多大。',
        '把 q_i 降到 20 再跑，比较静差与稳定性。',
        '用第 3 节的极点表确认两次的最大实部符号是否翻转。'
      ],
      pitfalls: [
        '照搬 LQR 的 Q/R 直接加大 q_i——三阶系统的积分增益有 Routh 上限，越大越不稳。',
        '在执行器饱和时继续加大 q_i：积分越滚越大，退饱和后长时间超调。'
      ],
      exercise: {
        goal: '找到积分增益的稳定上限',
        steps: [
          '默认 q_i=500 跑一次阶跃，记录末段静差与控制力饱和比例。',
          '依次把 q_i 改为 200、100、50、20，每次记录静差。',
          '对照极点表找出最大实部由正转负的临界值。'
        ],
        expect: 'q_i 较大时静差被压得很小但系统接近发散；q_i 降到 20 附近后既稳定又有可接受静差。',
        judge: '若找不到稳定区间，说明对象是二阶积分器——那里的三阶判据本身很难满足，应改用 PD 或带抗饱和的积分结构。'
      }
    },
    'MPC': {
      lab: [
        '在质量-弹簧-阻尼对象上设 t_pred=1、lambda=0.1，观察它与 PID 的差别：MPC 的指令跟随起步更快。',
        '把 t_pred 加大到 2，看控制力峰值与 RMSE 怎么变。',
        '把 lambda 从 0.1 加大到 1（更"吝啬"控制增量），观察动作是否更柔和。'
      ],
      pitfalls: [
        '把 MPC 当成"更聪明的 PID"——它优化的是带约束的有限时域代价，不是误差最小。',
        '以为 t_pred 越长越好：视野变长会显著放大模型误差的影响，代价是控制力峰值上升。'
      ],
      exercise: {
        goal: '理解预测视野与增量惩罚的取舍',
        steps: [
          't_pred=0.5、lambda=0.1 跑一次阶跃，记 RMSE 与控制力峰值。',
          't_pred 改为 2 重复。',
          'lambda 改为 1 重复。'
        ],
        expect: 't_pred 变长时指令跟随更快但峰值更高；lambda 变大使动作更平滑但 RMSE 略升。',
        judge: '若三者都不改变结果，检查 t_pred 是否真的进入了控制律（本平台 H=t_pred²/(2m)，t_pred=0 时 H=0，控制律退化为纯前馈）。'
      }
    },
    'Deadbeat': {
      lab: [
        '在质量-弹簧-阻尼对象上设 kp_scale=0.5，观察它比 PID 快多少。',
        '在控制力曲线上找饱和的时刻——理论上"一拍到位"需要的力是 m·e/Δt²，很容易顶到 200 N 上限。',
        '把目标从 5 m 提到 8 m，看饱和带来的差异。'
      ],
      pitfalls: [
        '以为"无差拍"就是真的一拍到位——它只在执行器带宽足够时成立。',
        '用它处理大指令或大初始偏差：控制律里显式抵消了弹簧力，模型失配时没有任何缓冲。'
      ],
      exercise: {
        goal: '看到「无差拍」在有限执行器下的真实边界',
        steps: [
          'kp_scale=0.5 跑一次阶跃，记收敛时间与控制力峰值。',
          '把目标提到 8 m 重复。',
          '对比收敛时间是否接近理论的一拍。'
        ],
        expect: '小目标时确实极快；大目标时控制力触顶、收敛时间明显变长。',
        judge: '若始终不饱和却仍很慢，检查模型参数 m、c、k 是否与对象一致——本方法显式用 +k·x 抵消弹性，参数错了就会算错。'
      }
    },
    'H-Infinity': {
      lab: [
        '在质量-弹簧-阻尼对象上用默认 gamma，观察它对恒值扰动的抑制。',
        '把 gamma 从 1.2 加大到 2，观察控制力峰值与扰动抑制的变化。',
        '对照第 3 节极点表，看等效阻尼 c+P12 随 gamma 怎么变。'
      ],
      pitfalls: [
        '把 gamma 当成"越大越稳"——它放大的是被抑制扰动的频率范围，不是稳定裕度。',
        '忽略 H∞ 的代价：增益抬高必然带来更大的控制力峰值与更高的抖振风险。'
      ],
      exercise: {
        goal: '理解 gamma 的物理含义是「可抑制扰动的频带」',
        steps: [
          '默认 gamma 跑阶跃 + 一次恒值扰动，记录误差恢复。',
          'gamma 改成 2 重复。',
          'gamma 改成 1.05 重复，比较三者对高频扰动的差别。'
        ],
        expect: 'gamma 越大低频扰动压得越狠、高频扰动越压不住；控制力峰值随之上升。',
        judge: '若三者毫无差别，说明扰动是纯恒值的——H∞ 的优势要在时变扰动下才体现。'
      }
    },
    'QFT-LeadLag': {
      linear: 'QFT 用频域整形设计超前/滞后校正器，再在时域用差分方程实现：C(z)=(n_0+n_1 z^{-1})/(d_0+d_1 z^{-1})。它与对象串在一起构成离散闭环，极点要在 z 域求，不是 s 域的连续特征多项式。实测最有效的做法是直接看频响：把校正器的转折频率与对象的相位交越点对上，再逐步推高增益看裕度。',
      lab: [
        '在质量-弹簧-阻尼对象上设 zero=1、pole=3、gain=1，观察它相对裸 PID 的相位改善。',
        '把 gain 逐步加大到 8，观察控制力峰值与抖振。',
        '在控制力曲线上看高频成分随 gain 的变化。'
      ],
      pitfalls: [
        '把它当 PID 用——QFT 的设计语言在频域，gain/zero/pole 的含义是转折频率与增益，不是 PID 的三个旋钮。',
        '只加 gain 不动 zero/pole：QFT 的核心是"在交越频率处给足相位裕度"，改相位结构比改增益更有效。'
      ],
      exercise: {
        goal: '用频域语言整定一个超前校正',
        steps: [
          '默认参数跑一次阶跃，记超调与控制力峰值。',
          '把 zero 从 1 加大到 2（相位超前更多）重复。',
          '把 gain 从 1 加大到 4 重复。'
        ],
        expect: '加大 zero 能在不大幅增加峰值的前提下压住超调；单纯加 gain 则峰值上升更快。',
        judge: '若加大 zero 反而更差，说明相位超前已经过量——超前量与交越频率必须配对设计。'
      }
    },
    'IMP-Servo': {
      lab: [
        '在质量-弹簧-阻尼对象上用默认 q_x=100、q_e=100，观察静差与控制力。',
        '把 q_e 从 100 加大到 300，看积分增益对静差与稳定性的双重影响。',
        '对照第 3 节极点表，确认最大实部随 q_e 的变化。'
      ],
      pitfalls: [
        '把它当 LQR 用——伺服型多了积分环节，整定目标从"折中"变成"既要跟踪又要零静差"。',
        '在对象本身已有回复力时过度设计伺服环：多挂一个积分等于多一个不稳定源。'
      ],
      exercise: {
        goal: '看清积分通道在伺服环里的作用与代价',
        steps: [
          '默认参数跑阶跃，记录末段静差与控制力峰值。',
          '把 q_e 加大 3 倍重复。',
          '对照极点表找出稳定性变化。'
        ],
        expect: 'q_e 加大后静差更小，但极点表显示稳定裕度下降、峰值上升。',
        judge: '若静差与稳定性都没有变化，检查 q_e 是否真的进入了控制律（它决定 K_i=√(q_e/r_u)）。'
      }
    },
    'Preview': {
      lab: [
        '在质量-弹簧-阻尼对象上用默认 kp=100、kd=35、k_prev=0.01，观察阶跃起点比同参数 PID 更快。',
        '把 k_prev 加大到 0.1，观察指令跟随的提前量与控制力峰值。',
        '施加一次扰动，确认预览项对扰动没有任何帮助。'
      ],
      pitfalls: [
        '以为预览能改善静差——它是纯前馈，只对指令通道有效。',
        '把 k_prev 调得过大：提前量超过系统能跟上的程度后，控制力峰值与振荡都会上升。'
      ],
      exercise: {
        goal: '验证「前馈只改善指令跟随」',
        steps: [
          '默认参数跑一次阶跃，记上升时间与指令瞬间控制力。',
          '把 k_prev 加大 10 倍重复。',
          '中途施加一次扰动，比较两者的扰动恢复时间。'
        ],
        expect: 'k_prev 加大后上升更快、峰值更大；扰动恢复时间两者相同。',
        judge: '若扰动恢复也变快了，说明改动的不止 k_prev——前馈通道不参与扰动通道。'
      }
    },
    /* ── 03 非线性结构控制 ─────────────────────────────── */
    'BangBang': {
      linear: '开关控制（bang-bang）的控制力只有 ±F 两个取值，闭环是继电式非线性系统，不存在固定阶数的特征多项式。分析它的正确方式是看能量：最短时间的运动必然是"满力加速—满力制动"两段式，耗时由 F/m 与目标距离决定。本平台的实现还加了"误差与速度都很小就停手"的死区，因此稳态是一个小幅极限环而不是精确到位。',
      lab: [
        '在质量-弹簧-阻尼对象上设 force=50，观察指令跳变瞬间控制力直接打到 ±50。',
        '看位置曲线是不是折线形状（满力加速—满力制动）。',
        '把 force 加倍到 100，看到达时间是否约减半。'
      ],
      pitfalls: [
        '期待它像 PID 一样平滑收敛——它的波形天生是折线，带死区时最终是一个小极限环。',
        '以为"力越大越快"没有代价：满力时间越长，控制力峰值越大，能耗与执行器利用率都上升。'
      ],
      exercise: {
        goal: '理解 bang-bang 的最短时间特性',
        steps: [
          'force=25 跑一次阶跃，记到达时间。',
          'force 改为 50、100 重复。',
          '记录控制力峰值与到达时间的关系。'
        ],
        expect: '到达时间大致按 1/F 缩短，但控制力峰值同步上升，曲线始终是折线而非平滑收敛。',
        judge: '若到达时间没有随 F 缩短，检查死区是否过大——死区内的停手判定会主导最后一段。'
      }
    },
    'BangBang-Zone': {
      linear: '带死区的开关控制：大偏差时用 ±F 满力，小偏差时退回线性律 u=K_p e-20v。死区之外是继电非线性，之内是线性，两段之间没有统一的特征多项式。分析要分区看：区内按 K_p 与 c+20 估稳定裕度，区外看满力段的到达时间。',
      lab: [
        '在质量-弹簧-阻尼对象上设 zone=1、force=50、kp=20，观察"满力段 + 线性段"的两段式响应。',
        '把 zone 从 1 加大到 3，看线性段占比的变化。',
        '把 kp 从 20 加大到 60，看线性段是否失稳。'
      ],
      pitfalls: [
        '把 zone 当成"死区越小越好"——zone 太大会让线性段在偏差仍很大时就接管，响应变肉。',
        '线性段增益调高却不看 zone：区内若 K_p 过大，切换瞬间会来回穿越死区产生高频抖动。'
      ],
      exercise: {
        goal: '找到开关段与线性段的合理分工',
        steps: [
          'zone=1、kp=20 跑一次阶跃。',
          'zone 依次改为 2、3、5 各跑一次。',
          'kp 依次改为 40、60 各跑一次。'
        ],
        expect: 'zone 增大后前段更快但末段精度下降；kp 过大时末段出现高频抖动。',
        judge: '若出现抖动，优先减小 kp 或加大 zone，而不是继续加力——这是典型的分段控制整定逻辑。'
      }
    },
    'Relay': {
      linear: '继电控制带死区：|e|>δ 时输出 ±F，|e|<δ 时保持上一次输出。它是典型的极限环系统——能量在死区内被耗散掉，稳态是小振幅的持续振荡而不是收敛到目标。分析它要看极限环的幅值与频率，它们由 F、m、c 和死区共同决定，不存在特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 force=80、deadzone=0.02，观察位置曲线的持续小幅振荡。',
        '把 force 减到 20，看极限环幅值怎么变。',
        '把 deadzone 从 0.02 加大到 0.2，观察振荡是否变成"卡住不动"。'
      ],
      pitfalls: [
        '期待它收敛——继电控制的稳态是极限环，这是结构决定的，不是参数没调好。',
        '把 deadzone 开得很大来"消灭振荡"——那只是把极限环换成死区内的保持，误差反而留在那儿。'
      ],
      exercise: {
        goal: '亲手看到继电控制的极限环',
        steps: [
          'force=80、deadzone=0.02 跑一次阶跃，记录末段振荡的幅值与周期。',
          'force 依次改为 40、20 重复。',
          'deadzone 改为 0.1 重复。'
        ],
        expect: 'force 越小极限环幅值越小；deadzone 加大后振荡消失但留下固定偏差。',
        judge: '若完全没有振荡，检查是否因为对象阻尼过大或死区过大——继电环的振荡可以被这两个参数掐掉，但代价是误差不再归零。'
      }
    },
    'TimeOptimal': {
      linear: '时间最优（最小时间）控制基于相平面上的 bang-bang 切换曲线：给定加速度上限 a_max=F/m，从当前状态到目标的最短路径由"加速段 + 制动段"两段组成，切换点满足 σ=e-sgn(v)·v²/(2a_max)=0。它的解析解来自可达集分析而不是特征多项式；本平台的实现在接近目标时切换成一段线性收敛，便于观察。',
      lab: [
        '在质量-弹簧-阻尼对象上设 force=80，观察前段是否像折线（满力加速）。',
        '在相平面上看轨迹是否贴着"切换曲线"走。',
        '把 force 减半，到达时间是否接近翻倍。'
      ],
      pitfalls: [
        '期待它像 PID 那样平滑——最短时间控制的波形天生是两段折线。',
        '忽略它对模型参数 m 的依赖：a_max=F/m，模型错了切换点就错，响应随之退化。'
      ],
      exercise: {
        goal: '验证「最短时间」的物理含义',
        steps: [
          'force=80 跑一次阶跃，记到达时间与控制力曲线形状。',
          'force 改为 40 重复。',
          '把对象换成二阶积分器重复，看是否还能停在目标上。'
        ],
        expect: 'force 减半后到达时间接近翻倍；在无回复力对象上无法保持在目标上，会持续漂移。',
        judge: '若到达时间没有随 force 变化，说明起作用的是末段的线性收敛段而不是 bang-bang 段。'
      }
    },
    'FeedbackLin': {
      lab: [
        '在质量-弹簧-阻尼对象上用默认 kp、kd，对照第 3 节极点表核对 ë+K_d ė+K_p e=0 的根。',
        '把对象的 k 从 1 改到 3（模型失配），观察响应退化。',
        '把 kp 从 20 加大到 40，看极点如何移动。'
      ],
      pitfalls: [
        '把它当成"对任何对象都有效"的方法——它依赖模型精确，模型错了就是错的。',
        '在弹簧项被对消掉的对象上用它：对消的前提是模型里那一项是对的。'
      ],
      exercise: {
        goal: '看清「模型对消」的能力与代价',
        steps: [
          '默认参数跑一次阶跃，记收敛时间。',
          '把对象 k 改到 3 重复，观察误差恢复变慢。',
          '把对象 k 改回 1，确认恢复。'
        ],
        expect: '模型匹配时收敛很快；k 失配后收敛明显变慢、超调变大，但把 k 改回就立刻恢复。',
        judge: '若失配后毫无变化，说明对象参数没有真正改动——检查第 7 节的参数表与「恢复默认」按钮。'
      }
    },
    'Backstepping': {
      linear: '反步法把系统状态拆成虚拟误差 z_1=-e、z_2=v+c_1 z_1，逐级构造李雅普诺夫函数 V=½z_1²+½z_2²，并令 V̇=-c_1 z_1²-c_2 z_2²<0。闭环是非线性系统，没有固定阶数的特征多项式；它的稳定性结论就是这条不等式——只要 c_1、c_2>0，原点就渐近稳定。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c1=2.4、c2=7.7，观察位置曲线与相平面轨迹是否螺旋收敛。',
        '把 c2 减半，看螺旋变慢。',
        '把 c1 改到 0 或负数，观察是否发散。'
      ],
      pitfalls: [
        '认为反步法"自动保证稳定"——它把稳定性转化成了对 c_1、c_2 的符号要求，参数给错照样不稳。',
        '在模型失配时仍用理论推导的虚拟控制量——反步的每一步都建立在模型正确的前提上。'
      ],
      exercise: {
        goal: '把稳定性结论与参数符号对应起来',
        steps: [
          '默认 c1、c2 跑一次阶跃，记收敛时间。',
          'c2 减半重复。',
          'c1 改为 −1 重复。'
        ],
        expect: 'c2 减小后收敛变慢但仍稳定；c1 为负时轨迹不再收敛、发散。',
        judge: '若 c1 为负仍然收敛，说明实现里对 c1 做了限幅或取绝对值——回看控制律实现确认。'
      }
    },
    'DSC': {
      linear: '动态面控制（DSC）在反步法里插入一阶滤波器，避免对虚拟控制量反复求导造成的微分爆炸。滤波环节引入了新的时间常数 τ，使闭环成为带滤波延迟的非线性系统，没有固定阶数特征多项式；稳定性由反步法的 V̇ 不等式加上滤波器误差项共同保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c1=0.4、c2=0.2、tau=0.1，观察响应。',
        '把 tau 从 0.1 加大到 0.5，看响应是否变糊。',
        '与同参数的反步法对比阶跃跟随的尖锐程度。'
      ],
      pitfalls: [
        '把 tau 当成"越小越好"——tau 太小就退回微分爆炸，太大则滤波器滞后吃掉带宽。',
        '以为 DSC 与反步的极点可以直接对应：多了滤波器后阶数与相位都变了。'
      ],
      exercise: {
        goal: '理解动态面滤波器的带宽取舍',
        steps: [
          'tau=0.1 跑一次阶跃，记 RMSE 与控制力峰值。',
          'tau 改为 0.5 重复。',
          '与反步法同参数对比。'
        ],
        expect: 'tau 增大后响应变缓、峰值下降；DSC 比反步更"糊"但控制力更连续。',
        judge: '若 tau 几乎不影响结果，检查实现里滤波时间常数是否真的作用在虚拟控制量上。'
      }
    },
    'TDC': {
      linear: '总微分控制用上一拍的加速度估计总扰动：F̂=ȧ_prev-u_prev/m_nom，再由 u=m_nom(K_p e-K_d v-F̂) 前馈对消。它是"用过去的量重建模型"的时变反馈，实现里含一拍延迟与两个历史状态，因此没有固定阶数的连续特征多项式；判据要看等效闭环在延迟下的相位裕度。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kp=40、kd=20、m_nom=2，观察它相对 PID 的抗扰优势。',
        '把 m_nom 改成 1（标称模型故意设错），观察补偿变差。',
        '打开「纯滞后」开关，看它对延迟有多敏感。'
      ],
      pitfalls: [
        '把 m_nom 当成随便填的参数——它是控制器内部假设的对象质量，填错就补偿错。',
        '忽略它的一拍延迟：在有滞后的对象上，延迟与反馈叠加会让总扰动估计本身失准。'
      ],
      exercise: {
        goal: '验证总扰动估计对标称模型的依赖',
        steps: [
          'm_nom=2 跑一次阶跃 + 扰动，记录恢复时间。',
          'm_nom 改为 1 重复。',
          '再改回 2 确认恢复。'
        ],
        expect: 'm_nom 与对象真实质量一致时恢复最快；故意设错后恢复变慢，但改回即恢复。',
        judge: '若三种情况完全一样，说明扰动估计没有真正进入控制律——回看 TDC 的实现细节。'
      }
    },
    'NDC': {
      lab: [
        '在质量-弹簧-阻尼对象上设 kp=40、kd=20、k_nd=5，跑一次大阶跃（目标 8 m）。',
        '把 k_nd 依次设为 0、5、20，比较超调。',
        '对小阶跃（目标 1 m）重复，看非线性项是否几乎不起作用。'
      ],
      pitfalls: [
        '把 k_nd 当成"越大越稳"——它会放大执行器负担，在小误差区几乎没有作用。',
        '用线性化的极点表去预测大范围运动——那正是非线性项起作用、线性化失效的地方。'
      ],
      exercise: {
        goal: '验证非线性阻尼只在大偏差区起作用',
        steps: [
          '大阶跃（目标 8 m）下 k_nd=0 与 k_nd=20 各跑一次，比较超调。',
          '小阶跃（目标 1 m）下重复。',
          '对比两种工况的差别。'
        ],
        expect: '大阶跃下 k_nd=20 的超调明显更小；小阶跃下两者几乎一样。',
        judge: '若小阶跃下差别也很大，说明 k_nd 的量级过大，已经侵入线性区。'
      }
    },
    'CFTC': {
      linear: '分数幂控制用 |e|^α·sgn(e) 替代线性误差项，α<1 时在原点附近增益被抬高（因为 |e|^α/|e|=|e|^(α-1)→∞），响应更接近时间最优；同时配一个分数幂速度反馈。闭环是分段线性的非线性系统，没有单一特征多项式；分析要按 |e|>1 与 |e|<1 两个区域分别线性化。',
      lab: [
        '在质量-弹簧-阻尼对象上设 alpha=0.7、kp=30、kd=15，跑一次大阶跃。',
        '把 alpha 从 0.7 改到 0.4，再改到 0.9，比较响应尖锐程度。',
        '把 kp 调小，看是否还有"时间最优"的味道。'
      ],
      pitfalls: [
        '以为 α 越小越好——α 太小时原点附近增益过高，控制力会剧烈抖动。',
        '忽略 α 与 kp 的耦合：α 变小后同样的 kp 已经对应很高的等效刚度。'
      ],
      exercise: {
        goal: '看清分数幂在原点附近的增益特性',
        steps: [
          'alpha=0.9 跑一次阶跃，记控制力峰值与末段误差。',
          'alpha 改为 0.5 重复。',
          'alpha 改为 0.2 重复，观察是否出现抖动。'
        ],
        expect: 'alpha 减小时上升段更"冲"，但过小后末段出现明显抖动。',
        judge: '若 alpha=0.2 仍不抖动，检查实现里的 |e| 是否被下限截断（本平台用 max(|e|,0.001) 保护）。'
      }
    },
    /* ── 04 滑模变结构家族 ─────────────────────────────── */
    'SMC': {
      lab: [
        '在质量-弹簧-阻尼对象上设 c_surface=5、k_gain=20，观察相平面上"先直线到达滑模面、再沿面滑动"的折线轨迹。',
        '把 k_gain 调小到 5，观察状态是否还能压住滑模面——这给出抗扰能力的下限。',
        '开启测量噪声，观察切换项带来的高频抖振。'
      ],
      pitfalls: [
        '以为滑模"绝对鲁棒"就可以不管增益——K 必须大于扰动上界，否则状态根本压不上去。',
        '在噪声场景里用硬切换——抖振会直接放大到执行器上，工程上应改用 sat 边界层。'
      ],
      exercise: {
        goal: '看清「到达阶段」与「滑动阶段」两段行为',
        steps: [
          '用 SMC 默认参数跑一次阶跃，在相平面上观察轨迹是否先沿直线到达滑模面、再沿面滑动。',
          '把 k_gain 减半重复，看能否仍压住面。',
          '打开噪声开关，观察控制力抖振。'
        ],
        expect: '相平面呈明显折线：先到达后滑动；k_gain 减半后可能压不住；开噪后控制力高频毛刺明显。',
        judge: '若相平面是光滑螺旋而非折线，说明切换项没起作用（k_gain 太小或 chatter 消抖模式选错）。'
      }
    },
    'VSC-RL': {
      linear: '指数趋近律滑模把到达过程规定为 ṡ=-k s-ε·sgn(s)：离面远时由 ks 项主导做指数趋近，贴面时由 ε 项主导保证穿越。到达阶段是时变的非线性过程，没有固定阶数的特征多项式；稳定性结论是 V̇=-k s²-ε|s|<0，且到达时间随初值按对数级增长。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c_surface=5、k_rl=20、eps=5，观察到达阶段比线性趋近律短多少。',
        '把 k_rl 减到 1、eps 减到 1，观察到达变慢但抖振减小。',
        '对照 SMC 看两者相平面轨迹的差异。'
      ],
      pitfalls: [
        '把 eps 当成"越小越精确"——它太小会加剧抖振，太大则到达末期失去穿透能力。',
        '只调 k_rl 不调 eps：到达速度与抖振是同一组参数的两面。'
      ],
      exercise: {
        goal: '比较线性趋近与指数趋近的到达特性',
        steps: [
          '用 SMC 跑一次阶跃，记录到达滑模面所需的时间。',
          '换成 VSC-RL 同 c_surface 跑一次。',
          '比较两者控制力的抖振幅值。'
        ],
        expect: 'VSC-RL 到达更快，但抖振幅值与 SMC 相当或略大。',
        judge: '若 VSC-RL 反而更慢，检查 k_rl 是否被 sat 边界层限制住了实际切换增益。'
      }
    },
    'ISMC': {
      lab: [
        '在质量-弹簧-阻尼对象上设 c1=5、c2=5，观察它是否从 t=0 就在滑模面附近（不像 SMC 要先"跑"过去）。',
        '把 c1 调小，观察面内极点变慢。',
        '施加一次大扰动，看它是否需要重新经历到达阶段。'
      ],
      pitfalls: [
        '把积分面当成"更强的滑模"就随便加 c2——c2 决定面内收敛率，过大会让积分状态饱和。',
        '以为积分滑模能消除抖振——抖振来自切换项本身，积分面只改善到达过程。'
      ],
      exercise: {
        goal: '验证积分滑模面的「零到达阶段」',
        steps: [
          '用 SMC 跑一次阶跃，在相平面上标出到达段。',
          '换成 ISMC 重复，看轨迹是否从一开始就贴着面滑动。',
          '对比二者的最大控制力峰值。'
        ],
        expect: 'ISMC 的相平面几乎从原点就沿面滑动，没有明显的到达直线段。',
        judge: '若 ISMC 仍有一段明显到达过程，检查积分项是否真的进了滑模面 s=-v+c1·e+c2∫e。'
      }
    },
    'TSMC': {
      linear: '时间滑模控制用 |e|^α·sign(e) 构造非线性滑模面（α<1），使面上的收敛速度随误差变小而变快，这是"时间最优"思路在滑模框架下的实现。闭环是分段线性的非线性系统，没有单一特征多项式；分析要按 |e|>1 与 |e|<1 两个区域分别线性化，并借助 V̇ 的不等式判断到达条件。',
      lab: [
        '在质量-弹簧-阻尼对象上设 beta=1.5、alpha=0.7、k_gain=20，观察滑模面附近的收敛速度是否比线性面快。',
        '把 alpha 从 0.7 改到 0.3，看近端是否出现增益尖峰。',
        '开启噪声，观察非线性面在原点附近的抖振。'
      ],
      pitfalls: [
        '以为 alpha 越小越快就越好——原点附近增益会急剧升高，控制力容易抖振。',
        '把它当 SMC 用同样的整定直觉：非线性面的等效刚度随误差变化，K 必须重新估。'
      ],
      exercise: {
        goal: '感受非线性滑模面「近端更快」的特性',
        steps: [
          '用 SMC（c=5）与 TSMC（beta=1.5、alpha=0.7）各跑一次阶跃。',
          '比较末段（误差 < 0.5 m）各自的收敛时间。',
          '比较控制力峰值。'
        ],
        expect: 'TSMC 在末段收敛明显更快，但控制力峰值更高、抖振略大。',
        judge: '若末段没有更快，检查 alpha 是否接近 1（alpha→1 时非线性退化成线性面）。'
      }
    },
    'FTSMC': {
      linear: '快速滑模控制在滑模面里再加一项 |e|^q·sign(e)（q<1），使面内也具备分数幂的快速收敛特性。它是两级分数幂结构，闭环仍是非线性系统，没有固定阶数特征多项式；稳定性同样靠 V̇<0 的不等式加上切换增益大于扰动上界来保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c1=5、c2=5、q=0.5、k_gain=20，观察两级分数幂带来的快速末段收敛。',
        '把 q 从 0.5 改到 0.9，看是否退化成普通滑模的速度。',
        '对比 SMC 的末段收敛时间。'
      ],
      pitfalls: [
        '把 c1、c2、q 一起乱调——三者分别管"到达""面内一次项""面内二次项"，应逐个隔离。',
        '忽略 q 接近 1 时高次幂项退化为线性：那时它就只是普通滑模。'
      ],
      exercise: {
        goal: '分辨两级分数幂各自的分工',
        steps: [
          '固定其他参数，把 q 从 0.3 改到 0.9，各记录末段收敛时间。',
          '固定 q，把 c2 从 1 改到 10，各记录末段收敛时间。',
          '比较两者的影响幅度。'
        ],
        expect: 'q 主要影响末段（误差更小时）的收敛，c2 主要影响面内整体速度。',
        judge: '若两者都不起作用，检查 q 项是否真的进了滑模面（面中应同时出现 c1·e 与 c2·|e|^q）。'
      }
    },
    'ASMC': {
      linear: '自适应滑模的切换增益 K̂ 不再是常数，而由 |s| 在线抬升（K̂=∫γ|s|dt）。滑模面与线性滑模相同，面上极点仍是 −c_surface；但到达阶段的增益是时变的，因此整条闭环不是固定阶数的线性系统，只能用"K̂ 大于扰动上界"这类判界条件来保证到达。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c_surface=5、gamma=10，观察扰动发生后 K̂ 是否明显抬升。',
        '对比 SMC 与 ASMC 在同一扰动下的恢复时间。',
        '看控制力曲线是否呈现"平时小、遇扰动才大"的特征。'
      ],
      pitfalls: [
        '把 K̂ 的上限调得太高——它只增不减，扰动过后仍会保持很大的切换增益，抖振随之长期存在。',
        'gamma 过大导致 K̂ 抬升过快，在噪声环境下等于持续高强度抖振。'
      ],
      exercise: {
        goal: '验证自适应增益只在需要时才出手',
        steps: [
          '用 ASMC 跑一次阶跃 + 一次阶跃扰动。',
          '记录扰动前后控制力峰值。',
          '换成同参数 SMC 重复。'
        ],
        expect: 'ASMC 在扰动瞬间明显加大控制力，平时保持较小；SMC 的控制力则始终较大。',
        judge: '若 ASMC 平时控制力也很大，说明 K̂ 的上限或 gamma 设得太高，失去了"按需出手"的意义。'
      }
    },
    'SuperTwisting': {
      linear: '超螺旋算法用两项连续量代替硬切换：连续项 λ√|s|·sgn(s) 提供主要收敛力，积分项 ∫sgn(s)·dt 抵消匹配扰动。它的收敛速率是 O(s) 而非 O(s²)，因此在保持精度的同时把抖振压到远低于传统滑模。闭环含一个积分状态，是非线性系统，没有固定阶数特征多项式；稳定性由 Filippov 意义下的滑模运动保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c=5、lambda=10、W=20，与 SMC 同等切换强度下比较控制力抖振幅值。',
        '把 W 减半，观察抗扰能力下降。',
        '在控制力曲线上量一量高频成分的峰峰值。'
      ],
      pitfalls: [
        '把 lambda 与 W 一起加大——连续项过大会重新引入抖振，积分项过大会积分饱和。',
        '以为它可以完全消除抖振：高频滤波会引入相位滞后，实现里那一阶滤波是必要的折中。'
      ],
      exercise: {
        goal: '量化超螺旋相对传统滑模的抖振改善',
        steps: [
          '用 SMC 跑一次扰动实验，记录控制力高频峰峰值。',
          '换 SuperTwisting 同等强度重复。',
          '比较两者的抖振幅值与恢复时间。'
        ],
        expect: '超螺旋的抖振峰峰值明显更小，恢复时间相近或略长。',
        judge: '若超螺旋的抖振没有改善，检查 c、lambda、W 是否让连续项主导（lambda 过大反而会引入高频）。'
      }
    },
    'LevantHOSM': {
      linear: 'Levant 高阶滑模用两个积分器串成超扭曲算法：z₀ 跟踪误差的导数、z₁ 跟踪 sgn 误差，输出由 c_surf·z₀+z₁ 组合而成。它能给出比超螺旋更高阶的收敛率（O(s³)），同样把抖振限制在很小的范围。闭环含两个积分状态，是非线性系统，没有固定阶数特征多项式；稳定性依赖高阶滑模的存在性条件（l₂>l₁）。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c_surf=5、l1=2、l2=26、k_gain=6，观察控制力是否比 SMC 平滑。',
        '把 l2 减半，看收敛是否变慢。',
        '开启噪声，观察高阶滑模对测量噪声的敏感度。'
      ],
      pitfalls: [
        '把 l1、l2 当成独立可调的"两个增益"——它们满足 l₂>l₁ 的存在性条件，乱调会让高阶滑模退化。',
        '以为阶数越高越好：阶数越高对噪声与离散误差越敏感，实现里对测量注入 0.1 的噪声正是为了体现这一点。'
      ],
      exercise: {
        goal: '观察高阶滑模的「高精度 + 低抖振」组合',
        steps: [
          '用 SMC、SuperTwisting、LevantHOSM 各跑一次阶跃扰动。',
          '记录三者的控制力抖振峰峰值与末段误差。',
          '比较三者的取舍。'
        ],
        expect: '抖振依次减小，末段误差依次改善，但参数敏感度依次上升。',
        judge: '若 LevantHOSM 的抖振并不比 SuperTwisting 小，检查 l2 是否满足存在性条件（l2 需明显大于 l1）。'
      }
    },
    'VariableG-SMC': {
      linear: '变增益滑模按位置大小调整切换增益：k=k₀+k₁|x|，远离目标时加大力度、靠近目标时减小以抑制抖振。滑模面与线性滑模相同，面上极点仍是 −c_surf；变的是到达阶段的切换强度，因此整条闭环不是固定增益的线性响应，没有统一特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c_surf=5、k0=10、k1=1.8，观察远离目标时控制力明显更大。',
        '把 k1 加大到 5，看大范围段的控制力峰值。',
        '把 k0 降到 0，观察远处是否还能压住滑模面。'
      ],
      pitfalls: [
        '把 k1 调得太大——远处用猛力、近处也用猛力就失去了变增益的意义。',
        '以为变增益能减小抖振：它只在"靠近目标"这一段起作用，远处的猛切换照样产生抖振。'
      ],
      exercise: {
        goal: '看清「变增益」到底变在哪一段',
        steps: [
          '用 k0=10、k1=0 跑一次阶跃，记录控制力曲线。',
          'k1 改为 5 重复。',
          '比较两段（远离目标 / 靠近目标）的控制力差异。'
        ],
        expect: 'k1=5 时远段控制力更大、近段相对更小；k1=0 时全程一个强度。',
        judge: '若控制力全程不变，说明 k1 没起作用——检查它乘的是 |x| 还是 |e|（本平台乘的是 |x|）。'
      }
    },
    'AW-PI': {
      lab: [
        '在质量-弹簧-阻尼对象上设 kp=40、ki=10，观察它与普通 PI 的区别：接近饱和时积分不再无脑累积。',
        '把目标从 5 m 提到 8 m 触发限幅，看控制力能否较快离开饱和区。',
        '对比普通 PI 在同样工况下的恢复速度。'
      ],
      pitfalls: [
        '把抗饱和当成"能消除饱和"——它只是防止积分继续累积，实际输出仍然受限。',
        '认为反算是万能的：反算量太大反而会让退出饱和变慢。'
      ],
      exercise: {
        goal: '观察抗饱和积分在退出饱和区时的作用',
        steps: [
          '用 AW-PI 跑一次目标 8 m 的阶跃（触发限幅）。',
          '记录控制力从饱和退出的时间。',
          '换成普通 PI 重复。'
        ],
        expect: 'AW-PI 退出饱和明显更快且超调更小。',
        judge: '若两者退出速度相同，检查反算系数 k_aw 是否过大（过大同样会拖慢退出）。'
      }
    },
    /* ── 05 数据驱动与智能 ─────────────────────────────── */
    'NPID': {
      linear: '非线性 PID 用 fal(e,α,δ) 取代线性误差项：fal 在 |e|>δ 区间是幂次 e^α，在 |e|<δ 区间退化为线性段（δ 用来防止原点处导数发散）。因此整个控制器是分段线性的——外段的等效刚度随误差幅值变化，内段则等同于常规 PID。闭环没有单一特征多项式，需要按外段与内段分别线性化。',
      lab: [
        '在质量-弹簧-阻尼对象上设 alpha=0.75、delta=0.1，观察它与 PID 的差异是否集中在末段。',
        '把 alpha 从 0.75 改到 0.3，看近端增益与控制力峰值怎么变。',
        '把 delta 从 0.1 加大到 0.5，观察"线性区"变宽后末段是否变慢。'
      ],
      pitfalls: [
        '以为 alpha 越小越"精准"——原点附近的相对增益会急剧升高，控制力容易抖振。',
        '把 delta 设成 0——δ 是防止原点导数发散的保护，置零会让 fal 在原点不可导。'
      ],
      exercise: {
        goal: '感受 fal 函数"大误差软化、小误差高增益"的形状',
        steps: [
          '用 PID 与 NPID 各跑一次阶跃，比较末段（误差 < 0.2 m）的收敛时间。',
          '把 alpha 改为 0.3 重复，比较控制力峰值。',
          '把 delta 改为 0.5 重复，比较末段收敛。'
        ],
        expect: 'NPID 末段收敛更快；alpha 减小时峰值上升；delta 加大后末段变慢。',
        judge: '若 alpha=0.3 时控制力没有明显变大，检查 fal 的实现是否对 |e| 做了下限保护。'
      }
    },
    'MRAC': {
      lab: [
        '在质量-弹簧-阻尼对象上设 gamma=10、wn=2、zeta=1，观察紫色参考模型与实际轨迹的偏差随时间收窄。',
        '把 gamma 从 10 加大到 40，看收敛是否更快、参数曲线是否开始抖。',
        '在中途改变对象参数（改 k 或 c），观察自适应律能否重新追上参考模型。'
      ],
      pitfalls: [
        '把 gamma 当作越大越好——学习率过大会让参数在最优值附近持续振荡，反而拉大跟踪误差。',
        '用单一阶跃指令驱动自适应——参数辨识需要足够丰富的激励，单一阶跃学不全。'
      ],
      exercise: {
        goal: '验证"模型匹配"是靠持续学习而非一次整定达成的',
        steps: [
          '用 MRAC 跑一次阶跃，记录跟踪误差与参数曲线的收敛过程。',
          '中途把对象的 k 从 1 改到 2，观察参数如何重新调整。',
          '把 gamma 加大 4 倍重复。'
        ],
        expect: '参数在若干秒内收敛到稳定值；对象参数改变后参数会再次移动；gamma 过大会让参数持续抖动。',
        judge: '若参数始终不动，说明自适应律没有被有效激励（参考模型输入不够丰富）。'
      }
    },
    'STR': {
      lab: [
        '在质量-弹簧-阻尼对象上设 wn=3.6、zeta=0.9、gamma=1，观察 k̂、ĉ 是否收敛到对象真实值附近。',
        '中途把对象的 k 改一下，观察辨识值是否跟随变化。',
        '对照第 3 节极点表，确认辨识收敛后极点确实落在目标位置。'
      ],
      pitfalls: [
        '把辨识值当成真值直接用——辨识未收敛时控制律用的是错误模型，此时响应可能比固定极点配置更差。',
        'gamma 过大让辨识噪声被放大：辨识值会在真值附近大幅抖动。'
      ],
      exercise: {
        goal: '看清"先辨识、后控制"这两个阶段',
        steps: [
          '用 STR 跑一次阶跃，记录 k̂、ĉ 的收敛曲线。',
          '对比第 3 节极点表与实测极点。',
          '把对象 k 改掉后重复，看极点是否重新落到目标位置。'
        ],
        expect: '辨识值先收敛，之后极点才落到目标位置；对象参数变化后辨识会重新跟上。',
        judge: '若极点始终对不上目标，说明辨识没有收敛（辨识需要足够的输入激励）。'
      }
    },
    'MFAC': {
      linear: 'MFAC 不需要模型，只用伪偏导数 φ 在线拟合"输入增量与输出增量之比"。控制律写成增量式：u_k=u_{k-1}+系数·e*，其中 e*=e-K_d v 是引入电子阻尼后的广义误差面。它是一阶增量系统加上一个辨识环节，没有固定阶数的连续特征多项式；稳定性通常用"φ 的取值区间与步长 ρ、λ、μ 的关系"来约束。',
      lab: [
        '在质量-弹簧-阻尼对象上设 rho=0.5、eta=1、mu=1、kd=2.1，观察 φ 是否收敛到一个稳定的值。',
        '把 eta 从 1 加大到 5，看 φ 收敛更快但是否开始抖。',
        '中途改变对象参数，观察 φ 是否重新适应。'
      ],
      pitfalls: [
        '忽略 kd 的必要性——纯增量式 MFAC 等价于纯积分，在二阶对象上会发散；本实现用 K_d 引入电子阻尼。',
        '把 eta 调得很大——辨识学习率越高，φ 对噪声越敏感。'
      ],
      exercise: {
        goal: '理解"电子阻尼"在无模型自适应里的作用',
        steps: [
          '把 kd 设为 0 跑一次阶跃，观察是否发散。',
          '把 kd 设为 2.1 重复。',
          '把 eta 加大 5 倍，比较 φ 的抖动幅度。'
        ],
        expect: 'kd=0 时发散；kd=2.1 时稳定收敛；eta 过大时 φ 明显抖动。',
        judge: '若 kd=0 仍稳定，说明实现里电子阻尼并未真正依赖该参数，值得回看控制律。'
      }
    },
    'iPID': {
      linear: 'iPID 用超局部模型把对象改写成 ẍ=F+αu，其中 F̂ 是用加速度信息在线估计出来的"总扰动+未建模动态"之和，再把它代数对消掉。它含一个一阶滤波器（τ）来估计 F̂，因此闭环是多状态时变系统，没有固定阶数的连续特征多项式；稳定性来自对消后剩下的 PD 闭环加上估计误差项的收敛性。',
      lab: [
        '在质量-弹簧-阻尼对象上设 alpha=1、kp=40、kd=20、tau=0.05，观察它相对 PD 的抗扰优势。',
        '把 tau 从 0.05 加大到 0.3，看估计变慢后抗扰效果如何变化。',
        '把 alpha 从 1 改成 0.5，观察控制力幅值的变化。'
      ],
      pitfalls: [
        '把 alpha 当成"越小越精细"——它同时缩放了控制力，alpha 变小会让实际输出成倍放大。',
        '忽略 F̂ 是用加速度差分算出来的：它天然放大测量噪声，tau 太小会把噪声灌进控制律。'
      ],
      exercise: {
        goal: '看清"在线对消扰动"与"放大噪声"的同源性',
        steps: [
          '在质量-弹簧-阻尼对象上做一次阶跃 + 一次扰动，记录恢复时间。',
          '打开测量噪声重复。',
          '把 tau 加大 6 倍再重复。'
        ],
        expect: '无噪声时对消让恢复很快；开噪后控制力出现明显毛刺；加大 tau 后毛刺减轻但对消变慢。',
        judge: '若开噪后毫无变化，说明噪声没有进入 F̂ 的估计通道——回看实现里加速度差分的取法。'
      }
    },
    'U-Model': {
      linear: 'U 模型把控制问题重述为"解方程求根"：每拍用 Newton-Raphson 迭代逼近满足 y(u)=r 的那个 u。迭代的雅可比 ∂y/∂u 在本实现里用模型的一步预测近似，因此闭环是一个带一阶预测的迭代系统，没有固定阶数的连续特征多项式；稳定性取决于迭代步长 μ 与雅可比估计的准确性。',
      lab: [
        '在质量-弹簧-阻尼对象上设 step_nr=0.5，观察 Newton 迭代几步收敛。',
        '把 step_nr 加大到 1.0，看是否出现迭代发散。',
        '把 step_nr 减小到 0.1，看收敛变慢但是否更稳。'
      ],
      pitfalls: [
        '把 Newton 步长当普通增益——步长过大会直接迭代发散，与物理增益无关。',
        '忽略雅可比估计的准确性：模型不准则求出的"根"本身就不准。'
      ],
      exercise: {
        goal: '体会"迭代求解"对步长的敏感性',
        steps: [
          '默认 step_nr=0.5 跑一次阶跃，记录 RMSE。',
          'step_nr 改为 1.0 重复。',
          'step_nr 改为 0.1 重复。'
        ],
        expect: '步长 1.0 时出现明显迭代发散；步长 0.1 时收敛慢但平稳。',
        judge: '若步长 1.0 仍不发散，说明迭代的雅可比在该工况下接近零，此时 Newton 法本身就没有意义。'
      }
    },
    'ESC': {
      linear: '极值寻优控制不建模，而是主动往控制量里注入一个探测正弦 a·sin(ωt)，再用观测到的效果（代价的下降方向）去积分调整一个偏置 u_bias。它本质上是随机/梯度寻优的闭环，包含一个注入频率为 ω 的持续扰动，闭环不是线性系统，也没有特征多项式；稳定性靠"偏置的积分漂移始终小于扰动下界"这类经验条件维持。',
      lab: [
        '在质量-弹簧-阻尼对象上设 k_esc=50、omega=15、amp=1，观察控制力里明显叠加的正弦成分。',
        '把 amp 从 1 加大到 5，看寻优精度与噪声的取舍。',
        '把 omega 从 15 改到 40，看探测频率提高后能否分辨更细的代价变化。'
      ],
      pitfalls: [
        '把它当成普通控制器——它靠"故意加噪声"来工作，输出里天然带有可观的抖动。',
        'omega 取太低：探测频率低于对象的有效带宽时，注入的信号传不到输出，梯度就估不出来。'
      ],
      exercise: {
        goal: '看清"寻优"是以噪声换信息的交换',
        steps: [
          '默认参数跑一次阶跃，记录控制力的正弦幅值与最终误差。',
          'amp 改为 5 重复。',
          'omega 改为 5 重复。'
        ],
        expect: 'amp 加大后最终误差更小但控制力抖动更大；omega 过低时寻优几乎失效。',
        judge: '若 omega 降低后误差没有变化，说明寻优信号没有通过对象传回，需要检查注入点。'
      }
    },
    'BELBIC': {
      linear: '大脑情感仿生控制把边缘系统回路抽象成两个模块：杏仁核 A 负责快速产生惩罚性输出，眶额皮层 O 负责反向抑制它。控制律 u=A-O+k·r，因此整体仍是一个以 k 为比例增益的线性反馈通道，而 A、O 是两个内部状态的非线性演化（依赖 w_e、w_v 加权的误差与速度）。闭环是带内部状态的高阶非线性系统，没有固定阶数特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 a_A=10、a_O=5，观察扰动后控制力的尖峰与回落。',
        '把 a_O 加大到 15，观察是否出现过冲（抑制过度）。',
        '把 w_v 加大，看速度反馈在情绪调节中的权重变化。'
      ],
      pitfalls: [
        '把"仿生"当成真的神经模型——它只是两个耦合非线性状态的经验化抽象。',
        'a_O 调得过大：抑制过强会把本该有的纠正动作也压掉，响应变得迟钝。'
      ],
      exercise: {
        goal: '理解"快速反应"与"事后抑制"的平衡',
        steps: [
          '默认参数做一次阶跃扰动，记录控制力尖峰与最终误差。',
          'a_O 加大 3 倍重复。',
          'a_O 减到 1 重复。'
        ],
        expect: 'a_O 大时尖峰被压得更平但恢复拖长；a_O 小时尖峰高、恢复快但可能过冲。',
        judge: '若三种情况下控制力完全一致，说明 O 模块的输出没有真正参与合成（检查 u=A−O 的符号与量纲）。'
      }
    },
    'Linear-Actor-Critic': {
      linear: '线性 Actor-Critic 用评论家 V=θ_c^Tφ(x) 估计状态价值、演员 u=θ_a^Tφ(x) 给出动作，两者都按 TD 误差在线更新。因为策略是线性的，闭环可以写成 u=θ_a^Tφ(x)+r 的形式，但 θ_a 随时间变化，因此闭环是时变系统，没有固定时刻的特征多项式；收敛性取决于学习率与特征基的覆盖程度。',
      lab: [
        '在质量-弹簧-阻尼对象上设 alpha_a=5、alpha_c=2，观察 θ_a 是否随时间移动。',
        '把 alpha_a 加大 4 倍，看学习更快还是开始震荡。',
        '中途把对象 k 改一下，看策略能否重新适应。'
      ],
      pitfalls: [
        '期待它像 PID 那样一次整定就稳——它是持续学习的，参数一直在动。',
        '特征基 φ(x) 覆盖不足时，策略再更新也学不到需要的动作，表现为"学得很慢"或"学不动"。'
      ],
      exercise: {
        goal: '认识"在线学习"与"离线整定"的根本差别',
        steps: [
          '用 Linear-Actor-Critic 跑一次阶跃，记录控制力曲线是否持续变化。',
          '用 PID 同工况跑一次作对比。',
          '把 alpha_a 加大 4 倍重复。'
        ],
        expect: '策略权重在数秒内持续移动；PID 的控制力则稳定不变；学习率过大时权重出现明显震荡。',
        judge: '若权重始终不变，说明 TD 误差没有回传到参数更新（检查折扣因子与奖励定义）。'
      }
    },
    'Gradient-PID': {
      linear: '基于梯度的在线整定把"误差平方和"当作需要最小化的代价，用误差对各增益的瞬时敏感度 ∂e/∂K 直接做下降：K_p ← K_p − γ_p·e·∂e/∂K_p。它是积分器加一个梯度反馈，闭环随 K_p、K_d 在线变化而时变，没有固定阶数特征多项式；由于用的是瞬时梯度而非真正的偏导，收敛性与激励充分性密切相关。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kp0=10、gamma_p=0.5，观察 K_p 是否从初值自动长到合适位置。',
        '中途把对象 k 改一下，看 K_p 会不会再次移动。',
        '把 gamma_p 加大 4 倍，看是否出现 K_p 的振荡。'
      ],
      pitfalls: [
        '以为它不需要任何整定——初始值与学习率的选择会决定它能不能收敛到好解。',
        '用单一阶跃指令驱动：瞬时梯度在恒定激励下信息量很少，学得很慢。'
      ],
      exercise: {
        goal: '体验"用梯度自动长出增益"的过程',
        steps: [
          '默认 kp0=10 跑一次阶跃，记录 K_p 的变化曲线。',
          '把对象 k 改掉后继续跑，看 K_p 是否再次移动。',
          '把 gamma_p 加大 4 倍重复。'
        ],
        expect: 'K_p 在若干秒内向上移动到合适量级；对象改变后再次移动；学习率过大时出现振荡。',
        judge: '若 K_p 几乎不动，检查梯度项是否真的由误差构成（单一阶跃下瞬时梯度只在指令跳变那一瞬非零）。'
      }
    },
    /* ── 06 融合与复合架构 ─────────────────────────────── */
    'DOB': {
      linear: '扰动观测器（DOB）把对象改写成 ẍ=F+αu，用加速度信息在线算出总扰动 F̂，再把它从控制律里代数对消，剩下的交给一套标准 PD。它含一个一阶滤波器与两个历史状态（加速度差分），闭环是时变多状态系统，没有固定阶数的连续特征多项式；稳定性通常写成"对消后 PD 环稳定，且滤波器带宽高于扰动变化率"这类条件。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kp=40、kd=20、alpha=1，观察 F̂ 在加扰动后如何变化。',
        '把 alpha 从 1 改到 0.5，看控制力幅值怎么变（alpha 同时缩放了输出）。',
        '打开恒定风扰，看对消后的恢复速度与纯 PD 的差别。'
      ],
      pitfalls: [
        '把 alpha 当"越小越精细"——它同时缩放控制力，alpha 变小会让实际输出成倍放大。',
        '忽略 F̂ 是用加速度差分算出来的：它天然放大测量噪声，滤波器带宽太宽会把噪声灌进控制律。'
      ],
      exercise: {
        goal: '验证"在线对消扰动"与"放大噪声"的同源性',
        steps: [
          '在质量-弹簧-阻尼对象上做一次阶跃 + 一次恒值扰动，记录恢复时间。',
          '打开测量噪声重复。',
          '把噪声系数或滤波带宽调小，再重复。'
        ],
        expect: '无噪声时对消让恢复很快；开噪后控制力出现明显毛刺；收窄带宽后毛刺减轻但对消变慢。',
        judge: '若开噪后毫无变化，说明噪声没有进入 F̂ 的估计通道——回看实现里加速度差分的取法。'
      }
    },
    'IMC': {
      linear: '内模控制用一个标称模型 G_m(s) 与对象的逆 G_m(s)^{-1} 串联，并用滤波器 F(s) 调节保守程度。实现里模型逆与滤波器都带状态，因此闭环不是无延迟的一阶系统，没有固定阶数连续特征多项式；鲁棒性由 F(s) 的时间常数决定：F 越平坦（时间常数越大）越鲁棒但响应越慢。',
      lab: [
        '在质量-弹簧-阻尼对象上观察 IMC 相对 PID 的差异：指令跟随更保守、扰动恢复更快。',
        '把滤波时间常数调小，看响应变激进后模型失配（改 k）时是否变差。',
        '故意把对象 k 改掉，比较 IMC 与 PID 谁的退化更明显。'
      ],
      pitfalls: [
        '以为 IMC 一定比 PID 鲁棒——它的鲁棒性完全依赖标称模型，模型错太多时同样会垮。',
        '把滤波时间常数调得极小以求响应快：那是把鲁棒性换成了速度，得不偿失。'
      ],
      exercise: {
        goal: '看清"保守换鲁棒"的设计取舍',
        steps: [
          '默认参数跑一次阶跃 + 一次模型失配（改 k）实验。',
          '把滤波时间常数减半重复。',
          '与 PID 在同样工况下比较。'
        ],
        expect: '滤波时间常数越小，指令跟随越快但失配后恢复明显变差；IMC 在失配下通常仍优于 PID。',
        judge: '若 IMC 在失配后比 PID 还差，检查标称模型是否与对象当前参数一致（用「恢复默认」复位）。'
      }
    },
    'ADRC': {
      linear: 'ADRC 把未建模动态与外扰合并成"广义总扰动 f"，用扩张状态观测器（ESO）估计其等效状态 z₃ 并前馈对消；对消后对象近似为双积分器，控制律退化成一条 PD。因此它的稳定性结论是结构化的——"ESO 带宽足够高时，闭环近似于一个二阶 PD 系统"——而不是某个固定特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 w_o=30、w_c=10、b0=1，观察 ESO 估计出的 z₃ 是否跟得上外扰。',
        '把 w_o 从 30 降到 5，看抗扰能力与噪声敏感度怎么变。',
        '对比纯 PID 在同样恒值扰动下的恢复时间。'
      ],
      pitfalls: [
        '把 b0 当成能随便填的参数——它是对象的输入增益估计，填错相当于控制律整体缩放错了。',
        '以为 w_o 越大越好：ESO 带宽越高越能跟踪扰动，但也越能跟踪噪声。'
      ],
      exercise: {
        goal: '找到 ESO 带宽与噪声之间的折中点',
        steps: [
          '打开测量噪声，用 w_o=30 跑一次阶跃扰动，记录控制力毛刺。',
          'w_o 改为 10、5 重复。',
          '比较恢复时间与毛刺幅值。'
        ],
        expect: 'w_o 高时恢复快但毛刺大；w_o 低时毛刺小但恢复慢。',
        judge: '若三者恢复时间完全相同，说明扰动没有被 ESO 估计到——检查 z₃ 的注入通道与 b0 是否一致。'
      }
    },
    'NL-ADRC': {
      linear: '非线性 ADRC 把 ADRC 中线性的观测器差分与控制律都换成 fal 函数。分段结构使它在不同误差区间具有不同的等效增益，因此没有单一特征多项式；稳定性同样依赖"对消后近似双积分器 + ESO 带宽足够高"这一结构化结论，而 δ 参数决定了两段的分界位置。',
      lab: [
        '在质量-弹簧-阻尼对象上设 w_o=30、w_c=10、alpha=0.75、delta=0.1，与线性 ADRC 对比末段收敛。',
        '把 delta 从 0.1 加大到 0.5，看线性区变宽后是否退化成线性 ADRC。',
        '把 alpha 从 0.75 改到 0.4，看小误差段的控制力峰值。'
      ],
      pitfalls: [
        '以为 alpha 越小越敏感就越好——原点附近相对增益会急剧升高，控制力容易抖振。',
        '忽略 δ 的分段作用：δ 决定 fal 在哪一点切换到线性段，它同时是防止原点导数发散的保护。'
      ],
      exercise: {
        goal: '看清 fal 分段带来的"近端更狠、远端更柔"',
        steps: [
          '用 ADRC 与 NL-ADRC 各跑一次阶跃，比较末段收敛与控制力峰值。',
          'delta 改为 0.5 重复。',
          'alpha 改为 0.4 重复。'
        ],
        expect: 'NL-ADRC 末段更快但峰值更高；delta 加大后两者趋于一致；alpha 过小时抖振明显。',
        judge: '若 delta 加大后两者仍无差别，检查 fal 的 δ 分支是否真的在线性段。'
      }
    },
    'ARC': {
      linear: '自适应滑模在滑模面上叠加一个在线学习的等效控制项，切换增益与等效控制都不再是常数。闭环含辨识状态与滑模状态，是时变非线性系统，没有固定阶数特征多项式；稳定性由滑模到达条件与自适应律的 Lyapunov 分析共同保证——典型做法是把自适应律设计成让辨识误差按指数收敛。',
      lab: [
        '在质量-弹簧-阻尼对象上设 c_surface=5、k_rl=10，观察等效控制项是否随辨识过程变化。',
        '中途把对象 k 改掉，看自适应项能否跟上。',
        '对比 SMC 在同样工况下的恢复时间。'
      ],
      pitfalls: [
        '把自适应项当成额外的固定增益——它会随辨识漂移，控制律的等效刚度也在变。',
        '学习率过大时辨识参数会在最优点附近震荡，表现为控制力持续抖动。'
      ],
      exercise: {
        goal: '把"自适应等效控制"与"固定等效控制"分开比较',
        steps: [
          '用 ARC 跑一次阶跃 + 一次对象参数变化实验。',
          '用同参数 SMC 重复。',
          '比较两者的恢复时间与控制力抖动。'
        ],
        expect: 'ARC 在参数变化后能重新补偿，SMC 的补偿则是固定的；ARC 抖振略大于 SMC。',
        judge: '若 ARC 与 SMC 表现完全一致，检查自适应项是否真的进入了控制律（其量级应与辨识误差同阶）。'
      }
    },
    'ESO-SMC': {
      linear: 'ESO-SMC 把扩张状态观测器与滑模控制串起来：ESO 先把总扰动估计出来并前馈对消，剩下的残差交给滑模的切换项压制。因为 ESO 自身带有三个状态（加上对象两状态），闭环总阶数较高且时变，没有单一特征多项式；它的好处是切换增益只需覆盖"估计残差"而不是全部扰动，因此可以取得比纯滑模小得多的 K_gain。',
      lab: [
        '在质量-弹簧-阻尼对象上设 w_o=30、k_gain=5，对比纯 SMC 用同等 k_gain 时的抗扰差距。',
        '把 w_o 降低，观察残差变大后是否需要加大 k_gain。',
        '开启噪声，比较两者的抖振。'
      ],
      pitfalls: [
        '沿用纯滑模的 k_gain 量级——ESO 已经对消掉大部分扰动，k_gain 大反而抖振主导。',
        '把 w_o 取得太高：ESO 带宽过高会把噪声当扰动估出来，再交给滑模去压制，等于放大了噪声。'
      ],
      exercise: {
        goal: '验证"ESO 先对消、滑模只补残差"的分工',
        steps: [
          '用 SMC（k_gain=5）与 ESO-SMC（w_o=30、k_gain=5）各做一次恒值扰动实验。',
          '记录两者的控制力峰值与恢复时间。',
          '把 ESO-SMC 的 w_o 降到 5 重复。'
        ],
        expect: '同等 k_gain 下 ESO-SMC 抗扰更强、抖振更小；w_o 降低后优势缩小。',
        judge: '若 ESO-SMC 的表现与 SMC 完全一致，检查 z₃ 的前馈注入项是否真的加进了控制律。'
      }
    },
    'L1': {
      linear: 'L1 结构用低通滤波器把"快速变化的未建模动态"与"慢变化的有用信号"分开：C(s) 滤波掉高频扰动后交给状态反馈，剩余部分由自适应律在线逼近。它的核心是滤波器的时间常数——它直接决定了带宽分配。闭环含滤波器状态与自适应律状态，是时变多状态系统，没有固定阶数特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设置 L1 的滤波带宽，观察它对高频扰动与低频指令的不同处理。',
        '把滤波时间常数从 0.01 加大到 0.1，看低频扰动是否开始压不住。',
        '对比纯自适应控制（无滤波）的抖振差异。'
      ],
      pitfalls: [
        '把滤波带宽取得太宽——L1 的全部意义就是把高频噪声挡在状态反馈之外，带宽放宽就失去意义。',
        '把自适应律增益调得过大：自适应部分追得越快，越容易把噪声追进来。'
      ],
      exercise: {
        goal: '看清"滤波"在自适应控制中的不可替代性',
        steps: [
          '默认参数跑一次含高频扰动的实验，记录控制力抖动。',
          '把滤波带宽放到最宽重复。',
          '把自适应增益加大 3 倍重复。'
        ],
        expect: '带宽放宽或自适应增益加大时抖动明显加重。',
        judge: '若三者几乎相同，检查滤波器是否真的串在自适应信号的前置路径上。'
      }
    },
    'I-and-I': {
      linear: 'I-and-I 同时用积分与扰动观测：积分环节负责消除静差，扰动观测器负责估计并前馈对消总扰动。两者都带状态，闭环是高阶时变系统，没有固定阶数特征多项式；稳定性通常靠"积分带宽与观测器带宽分离"的设计经验来保证——两者靠得太近会互相耦合。',
      lab: [
        '在质量-弹簧-阻尼对象上跑一次阶跃 + 一次恒值扰动，观察积分与观测器各自的贡献。',
        '把观测器带宽降低，看静差是否仍靠积分消除。',
        '把积分增益加大，看是否出现过冲或振荡。'
      ],
      pitfalls: [
        '认为"有积分就万事大吉"——积分只管静差，扰动还得靠观测器，两者职责不能互换。',
        '积分与观测器带宽靠得太近：两者都在争夺同一条低频通道，容易互相打架产生振荡。'
      ],
      exercise: {
        goal: '分清积分与观测器各自解决什么问题',
        steps: [
          '默认参数做一次阶跃（看静差）与一次恒值扰动（看恢复），分别记录。',
          '把观测器增益调到接近 0 重复。',
          '把积分增益调到 0 重复。'
        ],
        expect: '关掉观测器后恒值扰动的恢复变慢但静差不变；关掉积分后静差出现但扰动恢复不变。',
        judge: '若关掉某一项后结果完全不变，说明该项的输出没有真正进入控制律。'
      }
    },
    'AdaptBackstepping': {
      linear: '自适应反步法把反步法的虚拟控制量与真实控制量都做成在线自适应参数。闭环含多组自适应状态，是时变非线性系统，没有固定阶数特征多项式；稳定性结论是"带参数估计误差项的李雅普诺夫函数导数为负"，其中 σ-修正项专门用来抑制无激励时的参数漂移。',
      lab: [
        '在质量-弹簧-阻尼对象上跑一次阶跃，观察自适应参数随时间的变化。',
        '中途把对象 k 改掉，看参数能否跟上。',
        '把学习率减半，比较对噪声的敏感度。'
      ],
      pitfalls: [
        '把自适应律当普通整定——它一直在动，"调好"的参数会随工况漂移。',
        '指令缺乏激励时参数会随机游走：σ-修正就是为抑制这一点而加的。'
      ],
      exercise: {
        goal: '认识"自适应"与"漂移"的一体两面',
        steps: [
          '默认参数跑一次阶跃，记录参数曲线与跟踪误差。',
          '把对象 k 改掉后继续跑，看参数是否重新收敛。',
          '在指令恒定（无扰动）时保持 20 s，看参数是否仍在漂。'
        ],
        expect: '参数先收敛到稳定值；对象变化后再次移动；无激励时若仍漂移说明 σ-修正不足。',
        judge: '若参数始终不动，说明自适应律没有被有效激励或增益取值为 0。'
      }
    },
    'T-DOB': {
      linear: '时延估测观测器直接用 d 拍之前的推力与加速度做差来估计扰动：d̂=u(t-d)-M a(t-d)。它本质是用过去量重建模型的观测器，误差随延迟 d 增大而积累。闭环含历史缓冲区，是高阶时变系统，没有固定阶数特征多项式；延迟越长，被估计的扰动越陈旧，补偿越不准。',
      lab: [
        '在质量-弹簧-阻尼对象上设 delay_d=3、m_nom=2，观察它相对 DOB 的抗扰差距。',
        '把 delay_d 从 3 加大到 8，看恢复变慢多少。',
        '把 m_nom 从 2 改成 1，看补偿偏差如何体现。'
      ],
      pitfalls: [
        '把 delay_d 当"要尽量小"就对了，但别忘了它同时是估计精度与鲁棒性的折中：太小则覆盖不了实际延迟。',
        'm_nom 与对象真实质量不符时，差值里混入了模型误差，补偿会带系统性偏差。'
      ],
      exercise: {
        goal: '量化"用多陈旧的数据估计扰动"的代价',
        steps: [
          'delay_d=3 做一次恒值扰动实验，记录恢复时间。',
          'delay_d 改为 8 重复。',
          'm_nom 改为 1 重复。'
        ],
        expect: 'delay_d 越大恢复越慢；m_nom 不匹配时恢复变慢且存在稳态偏差。',
        judge: '若 delay_d 增大后完全没有变化，检查延迟缓冲区是否真的按拍推进（索引是否错位）。'
      }
    },
    /* ── 07 前沿与新型约束 ─────────────────────────────── */
    'PPC': {
      linear: '预设性能控制用非线性变换 z=½ln((1+e/ρ)/(1−e/ρ)) 把误差映射到新坐标，使「|e|<ρ」这个性能约束在 z 上变成普通的有界性要求。本平台里 ρ 还随指令时间从 ρ₀ 指数收缩到 ρ∞，即性能包络逐渐收紧。变换在 e→±ρ 处是奇异的，闭环没有固定阶数的特征多项式；只在 e 远小于 ρ 时可线性化，此时 z≈e/ρ，等效刚度变成 K_p/ρ。',
      lab: [
        '在质量-弹簧-阻尼对象上设 rho_0=5、rho_inf=0.5，观察位置误差是否始终被压在包络内。',
        '把 rho_inf 从 0.5 改到 0.1，看包络收紧后的跟踪难度。',
        '在相平面上看轨迹是否始终被限制在一个椭圆内。'
      ],
      pitfalls: [
        '把 rho 取得比控制能力更小——包络收得太快，变换会把误差放大成巨大的 z，控制力随之饱和。',
        '忘了 ρ 的变化会同时改变等效刚度（K_p/ρ）：收紧包络等于同时加大增益。'
      ],
      exercise: {
        goal: '体验"性能包络"对跟踪误差的直接约束',
        steps: [
          '默认参数跑一次阶跃，记录误差是否始终小于 rho_inf。',
          'rho_inf 改为 0.1 重复，观察控制力峰值。',
          '把 rho_inf 改回 0.5 确认恢复。'
        ],
        expect: '默认参数下误差被压在包络内；包络收紧到 0.1 时控制力明显变大甚至接近饱和。',
        judge: '若误差明显超出包络，检查 ρ 的收缩速率 l 与闭环带宽是否匹配——收缩过快就跟不上了。'
      }
    },
    'BLF': {
      linear: '障碍李雅普诺夫函数（BLF）把误差限幅"揉进"控制律的分母：u=K_p·e/(k_b²−e²)−K_d v。当 |e| 接近 k_b 时该项急剧增大，把状态推回安全域。它是时变非线性系统，没有固定阶数特征多项式；在原点附近 e≪k_b 时线性化退化为 u≈(K_p/k_b²)e−K_d v，等效刚度是 K_p/k_b² 而不是 K_p。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kb=1、kp=20，跑一次目标 5 m 的阶跃，观察误差被压在 ±1 m 内。',
        '把 kb 从 1 改到 0.3，看约束收紧后控制力峰值的变化。',
        '把目标改到 8 m（超出安全域），观察它如何被约束在边界附近。'
      ],
      pitfalls: [
        '把 k_b 设得比可达范围还小——边界外的目标本来就不可达，控制器会在边界上死命挣扎。',
        '忽略等效刚度被 k_b² 缩小：同样的 K_p 在不同 k_b 下是完全不同的刚度。'
      ],
      exercise: {
        goal: '看清障碍函数"越界就发力"的机制',
        steps: [
          '目标 3 m、kb=1 跑一次阶跃，记录末段误差与控制力。',
          '目标改为 8 m 重复。',
          'kb 改为 0.3 重复。'
        ],
        expect: '目标超出 k_b 时误差被压在边界附近、控制力持续偏大，不会发散。',
        judge: '若目标超出 k_b 后误差直接跑飞，说明障碍项被限幅或分母保护得太狠，失去了"推回"的作用。'
      }
    },
    'ETC': {
      linear: '事件触发控制只在满足触发条件时才更新控制量，其余时间保持上一次的值（零阶保持）。因此控制律里含一个保持时刻的误差 e(t_k) 与一个保持周期，闭环本质上是采样数据系统，没有连续时间的特征多项式；稳定性判据通常写成"保持周期内的误差增量不超过 σ|e|+ε₀"。',
      lab: [
        '在质量-弹簧-阻尼对象上设 sigma=0.05、eps0=0.01，观察控制力是阶梯状而非连续。',
        '把 sigma 从 0.05 加大到 0.2，看更新频率下降、跟踪变差。',
        '打开测量噪声，观察噪声是否会频繁触发更新。'
      ],
      pitfalls: [
        '把 eps0 设成 0——它是最小触发阈值，置零会让噪声不断触发更新。',
        '忽略噪声对触发频率的放大：噪声越大更新越频繁，事件触发的"省通信"优势就荡然无存。'
      ],
      exercise: {
        goal: '体会"事件触发"省的是更新次数，不是精度',
        steps: [
          '默认参数跑一次阶跃，数一数控制力的更新次数。',
          'sigma 改为 0.2 重复。',
          '打开测量噪声重复。'
        ],
        expect: 'sigma 越大更新次数越少但跟踪变差；开噪后更新次数反而暴涨。',
        judge: '若开噪后更新次数没变，说明噪声没有进入触发判据——触发用的是误差增量而非状态。'
      }
    },
    'Switched': {
      linear: '切换控制在李雅普诺夫水平集之间切换：V=½(e²+v²)>1 时用快速律，否则用慢速律，并施加最小驻留时间（dwell）避免抖振。这是典型的混杂系统（连续状态 + 离散模式 + 驻留约束），没有单一特征多项式；稳定性靠"每个模式内部稳定 + 驻留时间足够长"共同保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 dwell=0.1，观察状态在快慢两套增益之间切换的时刻。',
        '把 dwell 从 0.1 减到 0.01，看是否出现高频来回切换。',
        '在相平面上看轨迹是否沿着水平集边界走。'
      ],
      pitfalls: [
        '把 dwell 设得太小——它正是用来阻止无限切换的护栏，去掉它就会抖振。',
        '认为两种模式之间可以随便切换：慢速模式若在远处就不稳定，切换律必须保证安全域不变。'
      ],
      exercise: {
        goal: '看清"水平集 + 驻留时间"这套切换机制的约束',
        steps: [
          '默认 dwell 跑一次阶跃，在相平面上标出切换发生的水平集。',
          'dwell 减到 0.01 重复。',
          '把切换阈值 V=1 改大（观察边界外扩）后再跑一次。'
        ],
        expect: '默认时切换干净；dwell 极小时出现密集切换与抖振。',
        judge: '若看不到任何切换，检查阈值 V=1 是否被设得过大（本平台远端初始状态远大于 1，切换应立刻发生）。'
      }
    },
    'DynPole': {
      linear: '动态极点配置让闭环极点随误差幅值变化：p(e)=p_min+(p_max−p_min)e^(−α_p|e|)，再按 K₁=m p²−k、K₂=m(2p)−c 反算反馈增益。大误差时极点更远（快）、小误差时极点更近（稳）。闭环增益是时变的，没有固定阶数特征多项式；"稳定"的含义也随时间变化，它靠"极点始终留在左半平面"来保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 p_max=3、p_min=0.5，观察起步时响应快、接近目标时变缓。',
        '把 p_min 从 0.5 改到 2，看末段是否也跟着变快。',
        '对照第 3 节：此时极点不是固定的一对，而是随时间移动。'
      ],
      pitfalls: [
        '把 p_min 设得太大——末段的"慢"正是靠它实现的，设大了就失去分阶段的意义。',
        '把它当固定极点配置用：参数含义完全不同，p_min/p_max 是极点位置而不是增益。'
      ],
      exercise: {
        goal: '体验"分阶段指定极点"带来的快—慢两段响应',
        steps: [
          '默认参数跑一次阶跃，记录上升段与末段的收敛速度。',
          'p_min 改为 2 重复。',
          'p_max 改为 1 重复。'
        ],
        expect: 'p_min 增大后末段变快；p_max 减小后上升段变慢；两段速度此消彼长。',
        judge: '若两段速度没有区别，检查 α_p 是否太大导致 p(e) 几乎不随误差变化。'
      }
    },
    'PTC': {
      linear: '预设时间控制（PTC）把剩余时间 t_eff=T_p−t 直接写进控制律：u=(kx+cv)+m(K_p e/t_eff²−K_d v/t_eff)。增益按剩余时间的平方放大，理论上在 T_p 时刻精确到位。它是含时变增益的非线性系统，没有固定阶数特征多项式；稳定性依赖 t_eff 的单调收缩与增益的平方反比这一结构。',
      lab: [
        '在质量-弹簧-阻尼对象上设 Tp=5、kp=20，观察响应是否在 5 s 附近到位。',
        '把 Tp 从 5 改到 2，看控制力峰值怎么变。',
        '临近 Tp 时盯住控制力，看它是否急剧放大。'
      ],
      pitfalls: [
        '忽略临近截止时刻的控制力尖峰——增益按 1/t_eff² 增长，末段几乎必然饱和。',
        '把 Tp 设得比物理上可达的最短时间还短：那不是"预设时间"，是"不可能"。'
      ],
      exercise: {
        goal: '看到"时间上界"是靠增益换来的',
        steps: [
          'Tp=5 跑一次阶跃，记录到位时间与控制力峰值。',
          'Tp 改为 2 重复。',
          'Tp 改为 10 重复。'
        ],
        expect: 'Tp 越短到位越快，但控制力峰值按 1/Tp² 量级上升。',
        judge: '若到位时间与 Tp 无关，检查 t_target 是否在指令变化时被正确复位。'
      }
    },
    'FxTC': {
      linear: '固定时间控制把高次幂（p/q>1，用于大误差区）与分数次幂（r/s<1，用于小误差区）组合成一条控制律，因此收敛时间存在一个与初始状态无关的固定上界。它是分段线性的非线性系统，没有特征多项式；稳定性结论是"在两个幂次分别满足条件且 K_1、K_2 足够大时，收敛时间不超过该上界"。',
      lab: [
        '在质量-弹簧-阻尼对象上用默认 p_q=1.2、r_s=0.8 跑一次阶跃。',
        '把目标从 1 m 改成 10 m，观察收敛时间是否几乎不变。',
        '把 K_1 从 10 加大到 30，看上界是否随之改变。'
      ],
      pitfalls: [
        '期待"固定时间"意味着更快——它保证的是一个上界，真正快不快取决于 K_1、K_2。',
        '忽略高次幂在大误差区的控制力代价：e^{1.2} 在 e=10 时已经很大。'
      ],
      exercise: {
        goal: '验证收敛时间与初始误差无关',
        steps: [
          '目标 1 m 跑一次阶跃，记收敛时间。',
          '目标 10 m 重复，记收敛时间。',
          'K_1 加大 3 倍后再跑一次目标 10 m。'
        ],
        expect: '前两次收敛时间接近（这是"固定时间"的定义）；K_1 加倍后上界缩短。',
        judge: '若收敛时间随初值显著变化，说明还没有真正进入固定时间区间——检查 p/q 是否明显大于 1。'
      }
    },
    'Tan-BLF': {
      linear: '正切型障碍函数（Tan-BLF）用 sec²(πe²/2k_b²) 替代 BLF 的 1/(k_b²−e²)：u=K_p e·sec²(...)−K_d v。它在 |e|→k_b 时的发散比 BLF 更缓和（sec² 是相变而非阶跃），且在原点附近 sec²≈1，直接退化为常规 PD。同样是时变非线性系统，没有固定阶数特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kb=1、kp=20，跑一次目标 5 m 的阶跃。',
        '把 kb 改到 0.3，对比它与 BLF 在边界附近的控制力差异。',
        '在相平面上看轨迹被限制的形状（BLF 是椭圆，Tan-BLF 更接近圆）。'
      ],
      pitfalls: [
        '把它当 BLF 用同样的整定直觉——两者的等效刚度与边界形状都不同。',
        '忽略 sec² 的饱和保护：本平台把 tan 的自变量限幅在 ±1.5 rad，因此边界外的推力是有限的。'
      ],
      exercise: {
        goal: '对比两种障碍函数的边界形状差异',
        steps: [
          '用 BLF 跑一次阶跃，在相平面上描出轨迹被限制的形状。',
          '换 Tan-BLF 重复同样实验。',
          '把目标设在边界外，两者各记录控制力峰值。'
        ],
        expect: '两者都能把状态约束在边界内，但推力分布形状不同；BLF 在边界附近更"硬"，Tan-BLF 更平缓。',
        judge: '若 Tan-BLF 也能把误差压到远小于 k_b，说明它的 sec² 增益在原点附近没有被正确限幅。'
      }
    },
    'TimeVary-BLF': {
      linear: '时变障碍函数让安全边界 k_b(t) 随指令时间从 k_b0 指数收缩到 k_b∞，于是安全域随时间收紧。它是时变非线性系统，没有固定阶数特征多项式；与固定 BLF 的区别在于原点附近的等效刚度也随时间变化，稳定性靠"边界收缩速率与闭环收敛速率匹配"来保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kb0=2、kb_inf=0.5，观察误差包络是否随时间收紧。',
        '把 lb 从 1 加大到 5，看收紧过快会发生什么。',
        '对比固定 BLF 的误差包络形状。'
      ],
      pitfalls: [
        '把收缩速率 lb 调得过大——边界跑得比闭环快，系统必然越界，此时再大的控制力也追不上。',
        '以为边界收紧只影响末段：它同时也抬高了原点附近的等效刚度，全程都在变。'
      ],
      exercise: {
        goal: '找出"边界收缩速率"与"闭环带宽"的匹配关系',
        steps: [
          'lb=1 跑一次阶跃，记录误差包络。',
          'lb 改为 5 重复。',
          'lb 改为 0.2 重复。'
        ],
        expect: 'lb 过大时误差明显越界；lb 合适时包络平滑收紧；lb 很小时包络收紧太慢。',
        judge: '若 lb=5 仍然不越界，说明跟踪能力足够强（可继续加大 lb 直到出现越界）。'
      }
    },
    'Integral-BLF': {
      linear: '积分型障碍函数把障碍作用在积分状态上：u=K_p e+K_i·(z/(k_bi²−z²))−K_d v，z=∫e。它保证的是积分量不越界，等价于给静差设了一个软上限，因此静态误差被限制在某个范围内而不是彻底消除。闭环含积分状态与时变非线性项，没有固定阶数特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kb_i=1、ki=10，观察末段静差被限制在某个值附近而非归零。',
        '把 ki 加大到 30，看静差上限是否变小。',
        '对比普通 PID 的静差消除效果。'
      ],
      pitfalls: [
        '把它当"既能消除静差又能限幅"——它的积分项被障碍限住了，本来就不打算让静差归零。',
        '忽略 z 的累积：积分量长时间偏在一侧时，会把有效积分增益压得很小。'
      ],
      exercise: {
        goal: '区分"消除静差"与"限制静差"两种目标',
        steps: [
          '用 PID 跑一次阶跃，记录末段静差。',
          '换 Integral-BLF 重复，记录末段静差。',
          '把 ki 加大 3 倍重复。'
        ],
        expect: 'Integral-BLF 的静差不为零但被限制在稳定值；ki 越大该上限越小。',
        judge: '若 Integral-BLF 的静差与 PID 一样为零，说明障碍项没有真正限制积分量。'
      }
    },
    /* ── 08 轨迹规划与学习 ─────────────────────────────── */
    'InputShaping': {
      linear: '输入整形不改变反馈结构，而是在指令通道插入一段由对象脉冲响应算出的整形序列，把指令按"零点振动"的方式重排，让残余振动恰好在指令结束时抵消。它等效于给系统加了一个零点（阻尼项），闭环特征方程里会多出成对的重根；由于整形序列长度有限、且指令本身是分段常数，闭环是时变高阶系统，没有单一固定阶数的特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上跑一次阶跃，观察整形后的指令被拆成几段。',
        '在相平面上看轨迹是否比未整形时更"直"地到达目标。',
        '把整形序列的延迟拍数改动，看残余振动是否随之改变。'
      ],
      pitfalls: [
        '整形序列是按对象的阻尼与频率算的——对象参数变了（改 k 或 c），整形就不匹配，残余振动会回来。',
        '以为整形能提高稳定裕度：它只消除指令诱发的振动，对扰动的抑制能力不变。'
      ],
      exercise: {
        goal: '理解"用指令整形抵消残余振动"的作用范围',
        steps: [
          '关闭整形（等效于普通 PD）跑一次阶跃，记录末段有没有余振。',
          '开启整形重复同样实验。',
          '中途把对象的 k 改掉，再开启整形重复。'
        ],
        expect: '整形后末段余振明显减小；对象参数改变后整形失配，余振部分回来。',
        judge: '若开启与关闭整形毫无差别，检查对象阻尼是否接近零（本平台对 k≤1e-6 的对象会直接退化为 PD）。'
      }
    },
    'ILC': {
      linear: '迭代学习控制（ILC）不在线改参数，而是把每一次试验的误差按时间轴累积成一张"补偿表"，下一次同工况试验时直接叠加上去。因此它的收敛发生在"试验序号"这个维度上，而不是连续时间里的特征根：闭环本身仍是普通的比例反馈，但控制量里多了一张随试验序号增长的历史表，整体是一个带内嵌记忆的时变系统。',
      lab: [
        '在质量-弹簧-阻尼对象上设 gamma_ilc=0.9，做第一次阶跃试验，观察误差曲线被记入"补偿表"。',
        '让仿真回到初始状态再跑一次同样的阶跃，看误差是否明显变小。',
        '连续重复 5 次，观察误差衰减是否呈几何式。'
      ],
      pitfalls: [
        '每次试验的初始条件与指令必须完全一致——ILC 靠"重复"成立，工况一变历史表就失效。',
        'gamma_ilc 过大时补偿表会自我强化甚至发散（经典的 ILC 过学习现象）。'
      ],
      exercise: {
        goal: '体验"用历史试验换精度"的迭代过程',
        steps: [
          '第一次阶跃试验后记录末段误差。',
          '重复同样试验 4 次，每次记录末段误差。',
          '把 gamma_ilc 从 0.9 改到 0.3 重复这一组。'
        ],
        expect: '误差随试验次数近似按几何级数下降；学习率减小时下降变慢但更平稳。',
        judge: '若误差不随次数下降，检查每次试验是否真的从同一初始状态出发（点「恢复默认」再启动）。'
      }
    },
    'Repetitive': {
      linear: '重复控制利用指令的周期性：把上一周期同一时刻的输出延迟 L 拍再拿来用，构成内模原理在周期信号上的实现（内模本身就包含延迟环节）。因此闭环特征方程里必然含 e^{−Ls} 这类超越函数，不是固定阶数的多项式；稳定性由 Q 滤波器（通常取低于 1 的常数或一阶低通）保证——Q<1 是重复控制能收敛的前提。',
      lab: [
        '在质量-弹簧-阻尼对象上把指令设为正弦，观察响应进入稳态后误差是否降到很小。',
        '把 Q 从 0.9 改到 0.99，看跟踪误差与控制力抖动的变化。',
        '把指令周期 L 改成与对象自然周期不匹配的值，看残余误差是否变大。'
      ],
      pitfalls: [
        'Q 必须小于 1——Q≥1 时内模增益不衰减，重复控制会自我激励发散。',
        '指令周期必须与被跟踪信号的周期一致（或为其整数倍），否则内模对不上号。'
      ],
      exercise: {
        goal: '理解"内模"为什么能让周期跟踪误差趋零',
        steps: [
          '正弦指令下用 Repetitive 跑一次，记录稳态误差。',
          '把 Q 改为 1.0 重复，观察是否失稳。',
          '把指令换成方波重复。'
        ],
        expect: '稳态误差很小；Q=1 时出现发散或极限环；换方波后内模周期不匹配，误差明显变大。',
        judge: '若正弦指令下稳态误差一直很大，检查 L 是否真的按指令周期设置（拍数换算是否正确）。'
      }
    },
    'GainSched': {
      linear: '增益调度按误差幅值在线切换比例增益：误差大时取 kp_far、小时取 kp_near。这是一族固定参数线性控制器的切换，等效闭环是时变系统，没有单一特征多项式；切换点附近的稳定性取决于两套增益各自的极点是否都稳定，以及切换频率是否足够低——否则参数跳变本身就会激起瞬态。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kp_far=40、kp_near=8，观察起步与末段的刚度差异。',
        '在相平面上看轨迹在切换点附近是否有折角。',
        '把 bnd 从 1 改到 5，看切换时机后移。'
      ],
      pitfalls: [
        '以为增益调度是连续的——本实现是按 |e| 线性插值，但切换边界处等效增益仍会变。',
        '两套增益的极点相差太远时，切换瞬间会激起明显振荡；应该让它们在同一"稳定裕度"下整定。'
      ],
      exercise: {
        goal: '看清"按误差大小分配刚度"的效果',
        steps: [
          '默认参数跑一次阶跃，在相平面上标出增益切换的时刻。',
          '把 kp_near 从 8 加大到 30 重复。',
          '把 bnd 改到 5 重复。'
        ],
        expect: 'kp_near 越大末段越快但抖动越明显；bnd 增大后切换更晚，起步段更"猛"。',
        judge: '若看不到分阶段特征，说明两套增益差得太小，切换效果被掩盖。'
      }
    },
    'SmithPredict': {
      linear: 'Smith 预估器把"对象模型预测出的延迟输出"从反馈信号里减掉，让控制器看到的是无延迟的对象。实现里模型输出与真实输出之间存在一个模型误差项，而它正是延迟闭环失稳的根源。因此闭环不是简单的线性系统，而是"理想无延迟环 + 模型误差反馈环"的组合，没有固定阶数的特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 delay_t=5、kp=20，观察它相对普通 PD 在有延迟时的改善。',
        '打开「纯滞后」开关（把对象的实际延迟加大），看它是否仍能稳定。',
        '把 delay_t 改得与实际延迟不匹配，观察响应变差。'
      ],
      pitfalls: [
        'delay_t 必须与对象的真实延迟匹配——预估器靠"模型说得准"才成立。',
        '模型参数错了预估就错：Smith 预估器把模型误差直接引入反馈通道，反而可能比不做预估更糟。'
      ],
      exercise: {
        goal: '验证"预估器在延迟对象上的价值与前提"',
        steps: [
          '在质量-弹簧-阻尼对象上用普通 PD 跑一次（打开纯滞后）。',
          '换 SmithPredict 重复。',
          '把 delay_t 改成一倍再重复。'
        ],
        expect: '普通 PD 在延迟下明显振荡甚至发散；Smith 预估器能稳住；delay_t 不匹配时优势消失。',
        judge: '若 Smith 预估器与普通 PD 表现相同，检查延迟缓冲区是否按拍推进且索引对齐。'
      }
    },
    'Posicast': {
      linear: 'POSICAST 在指令通道做位置前瞻补偿：把延迟 T_d 拍前的目标值按 K_pos 加到当前指令上，用一个延迟拍的超调去抵消对象自身的滞后。延迟通道因此进入闭环，特征方程里含 z^{−Td} 这类项，不是固定阶数的多项式；Td 与对象延迟必须匹配，否则会变成"补过头"。',
      lab: [
        '在质量-弹簧-阻尼对象上设 td=5、k_pos=0.5，观察指令跳变后是否先冲过头再回落。',
        '把 k_pos 加大到 1，看超调是否过大。',
        '打开「纯滞后」开关，把对象的延迟改得比 td 大，观察补偿是否失效。'
      ],
      pitfalls: [
        'k_pos 调得过大——补偿过头会把超调从"延迟造成"变成"补偿造成"。',
        'Td 必须匹配实际延迟：Td 远小于实际延迟时，补偿的是还没发生的滞后。'
      ],
      exercise: {
        goal: '理解"用超调换滞后"的补偿思想',
        steps: [
          '关闭滞后、设 k_pos=0，跑一次阶跃记录超调与上升时间。',
          '打开滞后，k_pos 仍为 0 重复。',
          '把 k_pos 调到 0.5 重复。'
        ],
        expect: '有延迟时上升变慢；适当补偿后上升加快，但指令瞬间的超调变大。',
        judge: '若补偿后上升时间没有改善，说明 Td 与实际延迟不匹配（补的不是那一拍）。'
      }
    },
    'FuzzyPID': {
      linear: '模糊 PID 在固定 PID 之上叠加一个由模糊推理给出的增益修正量 ΔK_p、ΔK_i、ΔK_d。模糊推理是非线性映射，因此闭环是分段非线性系统，没有固定阶数特征多项式；稳定性通常靠"修正量有界"这一约束来保证——即修正后的等效增益仍落在 PID 的稳定区间内。',
      lab: [
        '在质量-弹簧-阻尼对象上设 ke=1、kec=1，观察它相对固定 PID 的差异（主要在末段）。',
        '把 ke 从 1 加大到 3，看修正量是否变大、是否出现抖振。',
        '把输入归一化尺度改到与对象量程不匹配，看输出是否失真。'
      ],
      pitfalls: [
        'Ke/Kec 是量化因子，必须与对象的误差量程匹配——不匹配时论域会被长期压在边界上，修正量退化成常数。',
        '修正量叠加在 PID 之上后，等效增益会变化：模糊层可能把本已合适的增益推过稳定边界。'
      ],
      exercise: {
        goal: '看清模糊层只是"给固定增益做微调"',
        steps: [
          '用 PID 跑一次阶跃，记录末段误差。',
          '换 FuzzyPID 重复。',
          '把 ke 加大 3 倍重复。'
        ],
        expect: 'FuzzyPID 的末段误差略优于 PID；ke 过大时出现明显抖动与误差反而变差。',
        judge: '若与 PID 完全一致，检查规则库是否真的被触发（输入归一化后是否落在论域内）。'
      }
    },
    'NeuralPID': {
      linear: '神经元 PID 用三个在线更新的权重分别乘误差、误差积分与速度，权重按 Hebbian 规则 w₁←w₁+ηe²dt 等方式自适应。闭环增益随权重变化而时变，没有固定阶数特征多项式；它的"收敛"只体现在权重向某个值缓慢移动，权重本身并不保证有界——这是它与严格自适应控制最大的差别。',
      lab: [
        '在质量-弹簧-阻尼对象上设 eta=0.01，跑一次阶跃，观察三个权重如何随时间移动。',
        '把 eta 从 0.01 加大到 0.1，看权重移动加快但是否出现振荡。',
        '中途改变对象 k，观察权重是否重新移动。'
      ],
      pitfalls: [
        'eta 必须很小——权重的更新量与 e² 成正比，学习率大时权重会直接发散。',
        '权重只增不减（Hebbian 规则），长期运行会持续漂移到很大的值，控制力随之膨胀。'
      ],
      exercise: {
        goal: '认识"权重在动"与"控制器在收敛"的区别',
        steps: [
          '默认 eta 跑一次阶跃，记录权重曲线与末段误差。',
          '把 eta 加大 10 倍重复。',
          '保持运行 20 s 不加扰动，看权重是否仍在漂。'
        ],
        expect: '权重持续上升；eta 过大时出现振荡；无扰动时权重仍会缓慢漂移。',
        judge: '若权重完全不动，说明更新式里的 e² 项在指令跳变之外长期为零——单一指令提供的激励不足。'
      }
    },
    'Fuzzy': {
      linear: '模糊控制器不经过任何线性化：输入 e 与 ec 被映射到论域，规则库给出模糊结论，再经重心法解模糊得到控制量。它是分段常数（每条规则内是常数增益）的非线性系统，没有特征多项式；稳定性只能通过"所有被激活规则的局部增益组合都使误差单调趋近"这类条件来论证，无法用极点判据。',
      lab: [
        '在质量-弹簧-阻尼对象上设 ke=1、kec=1，跑一次阶跃，观察控制力是否呈阶梯状变化。',
        '把 ke 加大，看输出是否更"跟手"。',
        '观察规则切换时控制力是否有跳变（这决定抖振大小）。'
      ],
      pitfalls: [
        '把它当 PID 用——模糊控制没有增益可整定，只有论域与规则可设计。',
        '量化因子与论域不匹配时，大量输入会被夹在边界上，规则退化成常值输出。'
      ],
      exercise: {
        goal: '观察"非线性曲面"控制器与线性控制器的形态差异',
        steps: [
          '用 Fuzzy 跑一次阶跃，记录控制力曲线的阶梯特征。',
          '用 PID 跑同样工况作对比。',
          '把 ke 加大 3 倍重复。'
        ],
        expect: 'Fuzzy 的控制力随误差分档跳变，PID 则连续；ke 增大后跳变更密、更接近连续。',
        judge: '若控制力完全连续不跳变，说明规则库的输出权重差异太小，模糊层实际没起作用。'
      }
    },
    'EnergyShaping': {
      linear: '能量成型（IDA-PBC）不改写动力学方程，而是把"虚拟势能"与"虚拟阻尼"注入控制律：u=kx−K_d(x−r)−(R_0+R_1|v|)v。其中 −K_d(x−r) 提供一根虚拟弹簧，(R_0+R_1|v|)v 提供线性+非线性的虚拟阻尼。等效闭环仍可写成 m s²+(c+R_0+R_1|v|)s+(k+K_d)=0，但阻尼随速度变化，是时变非线性系统，没有固定阶数特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 k_d=30、r_d0=10、r_d1=5，观察它相对 PD 的额外阻尼来源。',
        '把 r_d1 加大到 15，看高速段的阻尼是否明显增强。',
        '在相平面上看轨迹是否比 PD 更"收"。'
      ],
      pitfalls: [
        '把虚拟阻尼 r_d0 调得过大——它会掩盖真实建模误差，出问题时反而更难排查。',
        '注意虚拟弹簧 k_d 会叠加在对象原有刚度 k 上：等效刚度是 k+K_d，不能按 K_d 直接当刚度用。'
      ],
      exercise: {
        goal: '看清"不改变方程、只注入能量项"的设计思路',
        steps: [
          '用 PD 跑一次阶跃，记录收敛速度。',
          '换 EnergyShaping 重复。',
          '把 r_d1 改为 0 重复（退回线性虚拟阻尼）。'
        ],
        expect: 'EnergyShaping 收敛更快且末段更平稳；r_d1=0 后高速段的额外阻尼消失。',
        judge: '若与 PD 毫无区别，检查 u 中是否真的带上了 k_d·(x−r) 这一项。'
      }
    },
    /* ── 09 鲁棒与现代预测 ─────────────────────────────── */
    'TubeMPC': {
      linear: '管束 MPC（Tube MPC）分两层：上层求解不含扰动的名义轨迹，底层用一条廉价线性反馈把状态约束在名义轨迹周围的"管束"内。名义层是滚动时域优化、底层是固定增益反馈，因此整条闭环是"时变优化器 + 线性镇定器"的组合，没有单一特征多项式；稳定性由管束不变集与底层反馈的共同不变性保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 t_pred=1、k_anc=20，跑一次阶跃 + 扰动。',
        '把 k_anc 减小到 5，看被扰动推离名义轨迹后恢复是否变慢。',
        '把 lambda 加大，比较两者的控制力峰值。'
      ],
      pitfalls: [
        '底层反馈增益不能太小——它决定了"管束"的半径，太小则扰动直接把状态甩出管束，名义优化的可行性假设失效。',
        '扰动幅度超过管束设计范围时，理论保证不再成立。'
      ],
      exercise: {
        goal: '看清"规划层 + 镇定层"的分工',
        steps: [
          '默认参数做一次阶跃扰动实验，记录扰动后的恢复轨迹。',
          'k_anc 改为 5 重复。',
          '扰动幅度加大到 5 m 重复。'
        ],
        expect: 'k_anc 越大恢复越快；扰动超出管束范围后恢复明显变慢甚至跟丢目标。',
        judge: '若 k_anc 变小反而没影响，说明底层反馈在实现里没有真正叠加到控制量上。'
      }
    },
    'SDRE': {
      linear: '状态相关黎卡提方程（SDRE）把 LQR 推广到非线性：把系统写成 ẋ=A(x)x+B(x)u，再在线求解状态相关的 Riccati 方程 A(x)ᵀP+PA−PBR⁻¹BᵀP+Q=0。它的反馈律随状态变化，闭环是时变非线性系统，没有固定阶数特征多项式；稳定性的常用论证是"若 P(x) 正定，则 V=xᵀP(x)x 的导数为负"。',
      lab: [
        '在质量-弹簧-阻尼对象上设 q_weight=100，跑一次阶跃，观察它相对 LQR 的差异。',
        '把 q_weight 加大到 500，看控制力峰值与阻尼的变化。',
        '在相平面上看轨迹是否比 LQR 更"直"。'
      ],
      pitfalls: [
        '把它当 LQR 用——SDRE 的增益是随状态在线变的，不能用固定 Q/R 的直觉去估。',
        '在线 Riccati 求解的数值稳定性有限：迭代步长或增益取大了会让 P 发散。'
      ],
      exercise: {
        goal: '体验"权重随状态自适应"的非线性最优',
        steps: [
          '用 LQR 与 SDRE 各跑一次阶跃，比较末段误差。',
          '把 q_weight 加大 5 倍重复。',
          '把 q_weight 减到 20 重复。'
        ],
        expect: 'SDRE 在大偏差段比 LQR 更"敢用力"，末段精度接近；权重过小时退化为弱反馈。',
        judge: '若 q_weight 变化完全没有影响，检查 P 的在线迭代是否真的更新进了控制律。'
      }
    },
    'GPC': {
      linear: '广义预测控制（GPC）用过去若干拍的输入输出建立预测模型，再对未来 N 拍做二次型优化，只执行第一步（滚动优化）。因此闭环是带预测模型的离散系统（z 域），没有连续时间特征多项式；稳定性由"预测矩阵与控制器的秩条件、λ 的正则化"以及滚动时域框架下的稳定性论证共同保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 ny=20、lam=1.08，跑一次阶跃。',
        '把 ny 从 20 减到 5，看预测视野变短后的响应。',
        '把 lam 加大到 3，看控制增量是否更平滑。'
      ],
      pitfalls: [
        'lam 是正则化系数：太小会让控制增量剧烈（抖振），太大则预测模型的作用被抹平。',
        'ny 是预测步数：它决定计算量与"看得远"的程度，但视野再远也救不了模型错误。'
      ],
      exercise: {
        goal: '理解滚动优化"每拍重新规划"的含义',
        steps: [
          '默认参数跑一次阶跃，观察控制量是否每拍都在变（而非一条固定曲线）。',
          'lam 改为 3 重复，看控制量曲线是否更平滑。',
          'ny 改为 5 重复。'
        ],
        expect: 'lam 增大后控制增量明显变小、曲线更平滑；ny 减小后预测能力下降、跟踪变差。',
        judge: '若控制量在整段仿真里完全不变，说明滚动优化没有生效（检查历史缓存是否在每拍更新）。'
      }
    },
    'RLS-Adaptive': {
      linear: '递推最小二乘自适应控制在线辨识参数 θ̂，再用它算出反馈增益 K(θ̂)。辨识环节本身是一个时变递推系统，闭环是"辨识 + 控制"的耦合时变系统，没有固定阶数的特征多项式；稳定性通常用"辨识收敛，且控制律在参数估计误差下仍然稳定"这类分离论证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 rls_lambda=0.95、w_bw=15.7，跑一次阶跃 + 扰动。',
        '中途把对象 k 改掉，观察辨识值是否跟上。',
        '把 rls_lambda 加大到 0.99，看辨识变慢但更平滑。'
      ],
      pitfalls: [
        'rls_lambda 是遗忘因子：它越大越"固执"（记住旧数据），越小越"敏感"（追得快但抖）。',
        '单一阶跃提供的激励不足以辨识全部参数——辨识器需要足够丰富的输入。'
      ],
      exercise: {
        goal: '看清"辨识—控制"这条闭环耦合链',
        steps: [
          '默认参数跑一次阶跃，记录控制力与误差。',
          '中途把对象 k 从 1 改到 3，观察控制力如何重新适配。',
          '把 rls_lambda 改为 0.5 重复。'
        ],
        expect: '对象参数改变后控制力会重新调整；遗忘因子变小时适配更快但控制力更毛。',
        judge: '若参数改变后控制力毫无反应，说明辨识矩阵 P 没有真正更新（检查是否每次都重置了 P）。'
      }
    },
    'Robust-NL-Damping': {
      linear: '鲁棒非线性阻尼控制在名义 PD 之外，按误差幅值额外注入阻尼：u=K_nom e−(D_nom+γ_d+|γ_d·e|·|v|)v。它是一种"增益随误差自适应"的时变线性反馈，等效阻尼随 |e| 变化，因此没有固定阶数特征多项式；它常被用作"在无法解 Riccati 方程时"的降级替代方案。',
      lab: [
        '在质量-弹簧-阻尼对象上设 kp_nom=40、gamma_d=5，跑一次阶跃。',
        '把 gamma_d 加大到 20，看大偏差段的阻尼变化。',
        '与同参数的名义 PD 比较末段收敛。'
      ],
      pitfalls: [
        'gamma_d 过大时阻尼会强到让大偏差段反应迟钝——它本意是压制大偏差下的不稳定。',
        '把它当"参数失配的万能解"——它只补偿阻尼方向的失配，刚度方向的失配仍然无解。'
      ],
      exercise: {
        goal: '验证"按误差加阻尼"能替代部分鲁棒性设计',
        steps: [
          '把对象的阻尼 c 改小（模拟阻尼失配），用名义 PD 跑一次。',
          '换 Robust-NL-Damping 重复。',
          '把 gamma_d 改为 0 重复，确认退化回名义 PD。'
        ],
        expect: '阻尼失配时名义 PD 振荡加剧；加上非线性阻尼后明显改善；gamma_d=0 时与名义 PD 一致。',
        judge: '若 gamma_d=0 与名义 PD 有差异，说明额外阻尼项并非只由 gamma_d 决定（检查 D_nom 是否也是可调的）。'
      }
    },
    'NDOB': {
      linear: '非线性扰动观测器（NDOB）把总扰动拆成"可由状态直接算出的部分 p(x,v)"与"需要观测的部分 z"：d̂=z+p(x,v)。观测器带一个内部状态，闭环是时变非线性系统，没有固定阶数特征多项式；稳定性依赖观测器增益与名义控制律的带宽分离——观测器要明显快于控制律。',
      lab: [
        '在质量-弹簧-阻尼对象上设 l_obs=20、kp=40、kd=20，跑一次阶跃 + 恒值扰动。',
        '把 l_obs 从 20 降到 5，看抗扰恢复变慢多少。',
        '对比同参数的名义 PD。'
      ],
      pitfalls: [
        'l_obs 必须明显大于控制律带宽，否则扰动估计跟不上，补偿等于滞后对消。',
        'l_obs 过大时观测器会把噪声也当成扰动估出来，再前馈进控制律。'
      ],
      exercise: {
        goal: '找到观测器带宽与噪声之间的折中',
        steps: [
          '默认参数做一次恒值扰动实验，记录恢复时间。',
          'l_obs 改为 5 重复。',
          '打开测量噪声后两者各重复一次。'
        ],
        expect: 'l_obs 大时恢复快但开噪后控制力毛刺多；l_obs 小则毛刺少、恢复慢。',
        judge: '若 l_obs 对恢复时间毫无影响，检查 z 的更新式是否真的用到了上一拍的 u 与 x。'
      }
    },
    /* ── 10 观测器与网络拓扑 ───────────────────────────── */
    'Extended-Luenberger': {
      lab: [
        '在质量-弹簧-阻尼对象上设 l_gain=20、kp=40、kd=20，跑一次阶跃 + 扰动。',
        '把 l_gain 从 20 降到 2，看估计值跟不上时响应如何变钝。',
        '打开测量噪声，观察观测器增益提高后控制力抖振的变化。'
      ],
      pitfalls: [
        'l_gain 必须明显大于控制增益——分离原理要求观测器极点比控制极点更靠左，否则估计滞后会主导整个响应。',
        '观测器带宽越高越能跟踪扰动，但也越能跟踪噪声，这是老问题的取舍。'
      ],
      exercise: {
        goal: '体会分离原理在实现层面的含义',
        steps: [
          '默认 l_gain 跑一次阶跃扰动，记录恢复时间。',
          'l_gain 改为 2 重复。',
          '打开噪声后两者各重复一次。'
        ],
        expect: 'l_gain 大时恢复快；l_gain 小则响应变钝；开噪后高 l_gain 的控制力毛刺明显更大。',
        judge: '若 l_gain=2 与默认值表现几乎相同，检查观测器是否真的在用测得的 x 做修正。'
      }
    },
    'EKF-Ctrl': {
      lab: [
        '在质量-弹簧-阻尼对象上设 q_cov=50、r_cov=1，跑一次阶跃 + 扰动。',
        '把 q_cov 加大到 200（更信任模型），看噪声抑制与跟踪速度怎么变。',
        '把 r_cov 加大到 10（更信任测量），重复。'
      ],
      pitfalls: [
        'q_cov/r_cov 就是卡尔曼滤波的"模型信任度 vs 测量信任度"之比，不能随手填。',
        '卡尔曼滤波器假设噪声是高斯的——遇到脉冲型噪声时它会被严重带偏。'
      ],
      exercise: {
        goal: '看清"模型信任度"如何影响估计质量',
        steps: [
          '默认参数在有噪声下跑一次，记录控制力毛刺与扰动恢复。',
          'q_cov 加大到 200 重复。',
          'r_cov 加大到 10 重复。'
        ],
        expect: 'q_cov 大（信模型）时毛刺小但扰动恢复慢；r_cov 大（信测量）时反之。',
        judge: '若两个方向都没有区别，检查滤波更新式里的修正项系数是否真的随参数变化。'
      }
    },
    'Particle-Filter': {
      lab: [
        '在质量-弹簧-阻尼对象上设 p_num=50，跑一次阶跃 + 扰动，观察控制力是否比卡尔曼滤波更毛。',
        '把 p_num 加大到 200，比较毛刺与恢复时间。',
        '打开脉冲型噪声（可用更大噪声系数近似），看粒子法是否更稳。'
      ],
      pitfalls: [
        '粒子数是算力换精度的直接交换——粒子太少时估计方差大，控制器会明显发毛。',
        '粒子会退化（全部塌缩到同一区域），需要按权重重采样来补充多样性，实现里靠随机扰动项维持。'
      ],
      exercise: {
        goal: '量化"粒子数"带来的估计精度提升',
        steps: [
          'p_num=20 在有噪声下跑一次，记录控制力毛刺峰值。',
          'p_num 依次改为 100、500 重复。',
          '在无噪声条件下再跑一次作为对照。'
        ],
        expect: '粒子越多毛刺越小、扰动恢复越快；无噪声时三者差别很小。',
        judge: '若无噪声时毛刺也不随粒子数变化，说明粒子并没有真正参与位置估计。'
      }
    },
    'Neural-RBF-ADRC': {
      linear: 'RBF 神经网络自抗扰在 ADRC 的 ESO 之外再加一个径向基网络，用来逼近 ESO 没能估准的那部分未建模非线性。ESO 本身是三阶扩张观测器，网络还带一组在线更新的权重，因此闭环是高阶时变非线性系统，没有固定阶数的特征多项式；稳定性仍依赖"ESO 带宽足够高 + 网络输出有界"这两个结构性条件。',
      lab: [
        '在质量-弹簧-阻尼对象上设 wo=30、wc=10、n_lr=5，跑一次阶跃 + 扰动。',
        '把 n_lr 从 5 降到 1，看网络适应变慢但是否更平滑。',
        '把对象的 k 改一下，看网络输出是否补上 ESO 的缺口。'
      ],
      pitfalls: [
        'n_lr 过大时网络会追着噪声跑，ESO 的残差里混进噪声后前馈进控制律。',
        '网络只补 ESO 的残差，不是替代 ESO——两者分工不同，ESO 负责"总量"，网络负责"形状"。'
      ],
      exercise: {
        goal: '看清网络补的是 ESO 的哪一部分',
        steps: [
          '默认参数做一次阶跃扰动，记录恢复时间。',
          '把 wo 从 30 降到 10 重复（ESO 变弱，残差变大）。',
          '对比两次的恢复时间与控制力抖动。'
        ],
        expect: 'ESO 变弱后恢复变慢，但网络会试图补上缺口；n_lr 过大时抖动明显加重。',
        judge: '若 ESO 变弱后响应完全不变，说明网络的输出没有真正进入控制律。'
      }
    },
    'Artstein-Reduction': {
      linear: 'Artstein 分布积分法把通讯延迟显式写成 z=x+∫₀ᵈe^{As}Bu(t−s)ds，再用它对控制律做预处理，把延迟环节从闭环里约掉。延迟在闭环里对应超越函数 e^{−sτ}，因此即使约掉之后，剩余闭环的精确特征方程也不是固定阶数的多项式；本实现用的是离散分布积分近似，所以会残留一点建模误差。',
      lab: [
        '在质量-弹簧-阻尼对象上设 delay_a=10、kp=20，打开「纯滞后」开关，观察它相对普通 PD 的改善。',
        '把 delay_a 从 10 改到 20，与实际延迟不匹配时重复。',
        '在相平面上看轨迹是否比未补偿时更"直"。'
      ],
      pitfalls: [
        'delay_a 必须与实际延迟量级一致——它估的是分布积分的上限，估小了会残余延迟。',
        '分布积分是近似而非精确重构：延迟很大时残留误差会变得显著。'
      ],
      exercise: {
        goal: '验证"延迟补偿"的收益与前提',
        steps: [
          '打开纯滞后，用普通 PD 跑一次阶跃。',
          '换 Artstein-Reduction 重复。',
          '把 delay_a 改成实际延迟的两倍再重复。'
        ],
        expect: '普通 PD 在延迟下明显振荡；补偿后改善；delay_a 不匹配时优势大幅缩水。',
        judge: '若补偿前后完全一致，检查延迟缓冲区的采样是否真的按拍推进。'
      }
    },
    'Quantized-Ctrl': {
      linear: '量化控制在发送端把连续控制量按固定步长 q_step 取整，等效于在反馈通道里插入一个量化环节。这个环节是非线性且不可微的（阶梯特性），闭环因此没有固定阶数的特征多项式；其典型行为是在目标附近出现幅度约 q_step/2 的极限环。',
      lab: [
        '在质量-弹簧-阻尼对象上设 q_step=5、kp=50、kd=20，跑一次阶跃，观察控制力的阶梯形状。',
        '把 q_step 从 5 加大到 15，看极限环幅度与稳态误差的变化。',
        '把 q_step 改到 0.5，看是否基本恢复连续控制。'
      ],
      pitfalls: [
        'q_step 与执行器限幅是两回事——量化产生的是"分辨率极限环"，限幅产生的是"饱和"。',
        '量化误差与稳态误差直接挂钩：想压低稳态误差就必须减小 q_step，也就是占用更多带宽。'
      ],
      exercise: {
        goal: '看清"量化极限环"与"执行器饱和"的区别',
        steps: [
          'q_step=5 跑一次阶跃，记录末段误差与控制力阶梯。',
          'q_step 改为 15 重复。',
          '同时打开执行器限幅，看两种失真叠加的表现。'
        ],
        expect: 'q_step 越大末段误差越大且呈阶梯状；限幅叠加后误差更大且恢复更慢。',
        judge: '若末段误差并不随 q_step 变化，说明取整环节没有真正作用在控制量上。'
      }
    },
    'Event-Triggered-MPC': {
      linear: '事件触发 MPC 在状态偏离预测值超过阈值时才重新求解优化，其余时间保持上一次的控制量。它把"采样数据系统"与"滚动时域优化"叠在一起，因此既没有连续时间的特征多项式，也没有固定阶数的离散特征方程；稳定性由滚动时域框架加上事件条件（|x−x_pred|≤δ 下的可行域不变性）共同保证。',
      lab: [
        '在质量-弹簧-阻尼对象上设 t_pred=0.2、et_limit=0.01，跑一次阶跃，观察控制力是否呈阶梯状。',
        '把 et_limit 从 0.01 加大到 0.1，看更新频率与跟踪质量的取舍。',
        '把 lambda 加大，看控制增量是否更平滑。'
      ],
      pitfalls: [
        'et_limit 越大省通信越多，但触发后要重规划，中间这段控制是"开环"的——太大就会跑偏。',
        '触发条件用的是状态偏差而不是时间，因此系统静止时几乎不更新，这正是它省通信的原因。'
      ],
      exercise: {
        goal: '体会"事件触发"在计算量与鲁棒性之间的取舍',
        steps: [
          '默认参数跑一次阶跃，数一数控制力的更新次数。',
          'et_limit 改为 0.1 重复。',
          '打开测量噪声重复。'
        ],
        expect: 'et_limit 越大更新越少但跟踪变差；开噪后更新次数增加。',
        judge: '若噪声下更新次数不增加，检查触发判据里是否用了状态偏差而不是误差。'
      }
    },
    /* ── 11 高阶与物理前沿 ─────────────────────────────── */
    'FO-PD': {
      linear: '分数阶 PID 用分数阶微分算子代替整数阶：它由 Grünwald–Letnikov 定义，等效为一串带权的过去输入，因此在闭环里引入的是一整族极点（分数阶系统），根本无法写成固定阶数的特征多项式。它的作用机理是提供介于 0°~90° 之间的相位补偿，把阻尼精确注入到柔性模态所在的频段。',
      lab: [
        '在质量-弹簧-阻尼对象上设 mu=0.8、kp=30、kd=20，跑一次阶跃。',
        '把 mu 从 0.8 改到 0.5（更"欠"的相位补偿），看响应变化。',
        '打开噪声，观察分数阶算子对噪声累积的放大。'
      ],
      pitfalls: [
        '把 mu 当成普通增益——它是阶次，微分作用会按历史输入无限延伸，噪声会持续累积。',
        '分数阶算子的实现是级联近似，级联段数不够时相位补偿会偏离理论值。'
      ],
      exercise: {
        goal: '感受分数阶微分"可调相位"的独特之处',
        steps: [
          'mu=1.0（退化为整数阶）跑一次阶跃，记录超调。',
          'mu 改为 0.5 重复。',
          '打开噪声后两者各重复一次。'
        ],
        expect: 'mu<1 时相位补偿不足、超调回升；开噪后分数阶版本的噪声放大明显更严重。',
        judge: '若 mu=1 与 mu=0.5 表现完全一致，检查分数阶权重是否真的按 μ 递推。'
      }
    },
    'Nonlinear-Power-ADRC': {
      linear: '非线性次幂自抗扰把 ESO 的扩张项换成 |e|^α·sgn(e) 形式：α<1 时小误差段的相对增益被放大，α>1 时大误差段更"凶"。分段结构使闭环没有单一特征多项式；稳定性同样依赖"对消后近似双积分器 + ESO 带宽足够高"这一结构性结论，而 α 与 δ 决定了两段的分界位置与增益形状。',
      lab: [
        '在质量-弹簧-阻尼对象上设 wo=30、wc=10、alpha=0.75，与线性 ADRC 对比末段收敛。',
        '把 alpha 从 0.75 改到 0.4，看小误差段的控制力峰值。',
        '把 alpha 改到 0.95 看是否退化成线性 ADRC。'
      ],
      pitfalls: [
        '以为 alpha 越小越敏感越好——原点附近相对增益会急剧升高，控制力容易抖振。',
        '忽略 δ 的分段作用：它决定 fal 在哪一点切换到线性段，同时是防止原点导数发散的保护。'
      ],
      exercise: {
        goal: '看清 α 与 δ 共同决定的 fal 形状',
        steps: [
          '用 ADRC 与 Nonlinear-Power-ADRC 各跑一次阶跃，比较末段收敛与控制力峰值。',
          'alpha 改为 0.4 重复。',
          'alpha 改为 0.95 重复，确认两者趋于一致。'
        ],
        expect: 'α=0.4 时末段更快但峰值更高；α=0.95 时与线性 ADRC 基本一致。',
        judge: '若 α=0.95 与线性 ADRC 仍有明显差别，检查 δ 是否让 fal 始终停留在幂次段。'
      }
    },
    'Implicit-Euler-Ctrl': {
      linear: '隐式欧拉离散控制把切换项除以 (1+λ·Δt)，相当于用后向欧拉（隐式积分）离散化一个连续时间的滑模律。后向欧拉对任意大的增益都无条件稳定（没有显式欧拉那种"增益越大越容易发散"的毛病），代价是引入数值阻尼、响应变慢。它是离散滑模系统，没有固定阶数的连续特征多项式。',
      lab: [
        '在质量-弹簧-阻尼对象上设 lambda=50，跑一次阶跃，观察是否即使增益很大也不发散。',
        '把 lambda 从 50 降到 5，比较收敛速度。',
        '与 SMC 在同样 k_gain 下对比。'
      ],
      pitfalls: [
        '把 lambda 调小以为能"变快"——它变小意味着更接近显式欧拉，数值阻尼减弱、抖振回来了。',
        '隐式欧拉的"无条件稳定"是离散实现的性质，对采样周期与延迟的鲁棒性并无保证。'
      ],
      exercise: {
        goal: '验证隐式离散"大增益不失稳"的说法',
        steps: [
          'lambda=50 跑一次阶跃，记录收敛时间。',
          'lambda 改为 5 重复。',
          '与同 k_gain 的 SMC 对比抖振。'
        ],
        expect: 'lambda 大时抖振极小但响应略慢；lambda 小时接近显式欧拉、抖振上升。',
        judge: '若 lambda 改变毫无影响，检查切换项是否真的除以了 (1+λ·Δt)。'
      }
    },
    'Lorenz-Coupled': {
      linear: '洛伦兹耦合把三个互相牵引的混沌变量嵌进误差状态的反馈通道，使误差轨迹变成一条有界但永不停歇的混沌轨道。混沌系统本身没有特征多项式可言，它的稳定性判据是有界的李雅普诺夫指数（最大指数为负对应有界轨道）。教学价值在于展示"混沌耦合可以提供持续但有界的激励"。',
      lab: [
        '在质量-弹簧-阻尼对象上跑一次阶跃，观察位置曲线是否变成持续小幅摆动而不收敛。',
        '把 rho 从 50 降到 5，看轨迹是否退化成普通收敛。',
        '在相平面上看轨迹是否被限制在有界范围内。'
      ],
      pitfalls: [
        '期待它收敛到目标——它刻意不收敛，误差永远保持在一个有界范围内摆动。',
        'rho 取得太大时耦合过强，轨迹会被甩到很远的有界区域，位置可能偏离目标很远。'
      ],
      exercise: {
        goal: '理解"有界但持续振荡"也是一种稳定',
        steps: [
          '默认参数跑一次阶跃，记录末段误差的波动幅度。',
          'rho 改为 5 重复。',
          'rho 改为 200 重复，观察幅度如何变化。'
        ],
        expect: 'rho 大时末段误差在有界范围内持续摆动；rho 小时退化为普通收敛。',
        judge: '若末段误差直接发散到很大，说明耦合项没有被限制在有界范围内。'
      }
    },
    'Speed-Gradient': {
      linear: '速度梯度法（Speed-Gradient）沿系统局部能量函数对控制量的负梯度方向运动：u̇=−γ∇_u Q(x,u)。它给出的是"控制量的变化率"，因此闭环里多出一个积分状态，且 Q 依赖于对动力学的认识。闭环是时变非线性系统，没有固定阶数特征多项式；稳定性通常要求 Q 对 u 的偏导满足耗散条件 ∇_u Q·u > 0。',
      lab: [
        '在质量-弹簧-阻尼对象上设 gamma_sg=20、q_weight=1，跑一次阶跃。',
        '把 q_weight 从 1 加大到 5，看控制力的"推力"是否变强。',
        '观察控制力是逐渐建立还是一步到位（它给的是变化率）。'
      ],
      pitfalls: [
        '把它当直接输出型控制器——它输出的是 u̇，需要积分才能变成 u，积分初值也影响结果。',
        'gamma_sg 决定"滑落速度"：太大时能量函数被"冲"过头，控制力出现大幅过冲。'
      ],
      exercise: {
        goal: '理解"沿能量梯度下滑"与直接反馈的区别',
        steps: [
          '默认参数跑一次阶跃，记录控制力的建立过程。',
          'gamma_sg 加大 3 倍重复。',
          'q_weight 加大 5 倍重复。'
        ],
        expect: '控制力是逐渐建立起来的；gamma 越大建立越快；q_weight 越大梯度方向上的"推力"越强。',
        judge: '若控制力一步到位，说明实现里没有对 u̇ 做积分（u 应当是逐步建立的）。'
      }
    },
    'Feedback-Passivation': {
      lab: [
        '在质量-弹簧-阻尼对象上设 kp=40、kv=20，跑一次阶跃，对照第 3 节极点表核对 m s²+kv s+kp=0。',
        '把对象的 k 从 1 改成 3，观察响应是否几乎不变。',
        '把 c 从 0.5 改到 2，同样观察响应。'
      ],
      pitfalls: [
        '以为它依赖对象参数——它恰恰把对象的弹性与阻尼抵消掉了，因此对这两项的参数失配天然免疫。',
        '它无法抵消质量 m 的失配：等效时间尺度仍由 m 决定，m 估错时收敛快慢会偏。'
      ],
      exercise: {
        goal: '验证"改造系统"对参数失配的天然免疫',
        steps: [
          '默认参数跑一次阶跃，记收敛时间。',
          '把对象的 k 改到 3 重复。',
          '把对象的 c 改到 2 重复。'
        ],
        expect: 'k 与 c 变化后响应几乎不变（因为它们被控制律抵消了）。',
        judge: '若 k 改变后响应明显变化，说明控制律里的 +k·x 抵消项没有按对象当前刚度取值。'
      }
    }
  };

  const TRAINING = {
    /* ── 05 数据驱动与智能 ── */
    'NPID': {
      intro: '非线性 PID 没有「数据集」，它的「训练」就是在小误差区与饱和区各做一次阶跃实验，据此定出 fal 的两个形状参数。',
      signal: '不需要外部数据。用一次小阶跃（|e|<δ）测线性区增益，再用一次大阶跃（|e|>5δ）测饱和区增益，两点即可反解 α 与 δ。',
      params: [['α（幂次）', '0.25 ~ 0.75', '近场增益变平、远场更保守'], ['δ（线性区宽）', '目标精度的 2~5 倍', '线性区变宽、饱和区推迟'], ['积分增益 Ki', '按 PI 规则取 1/10', '静差消得快但超调大']],
      loop: ['先令 α=1、δ 取目标精度的 3 倍，退化为线性 PID 并整定到可用', '逐步减小 α（每次 0.1），观察大阶跃的控制力峰值是否下降', '若近场出现高频抖动，说明 δ 太小，把它加大 2 倍后重试', '最后用中误差段（δ<|e|<5δ）验证过渡是否平滑'],
      use: '运行时不需要任何训练步骤，参数固定后就是一条确定的非线性函数；调参等价于「改函数形状」而非「改增益」。',
      impl: '本平台用 fal(e,α,δ)=|e|^α·sgn(e)（|e|>δ）与 e/δ^(1-α)（|e|≤δ），与韩京清原文一致。',
      fail: '把 α 调到 0.1 以下会让近场增益高到放大测量噪声，表现为控制力高频抖动而位置几乎不动——此时应加大 δ 而非继续减 α。'
    },
    'MRAC': {
      intro: 'MRAC 是「在线学习」方法：参考模型给出「理想响应」，自适应律根据跟踪误差实时修改控制器参数，没有离线训练阶段。',
      signal: '唯一的训练信号是跟踪误差 e=x−x_m。参考模型的输入就是指令 r，因此整定过程需要让 r 足够「丰富」（阶跃 + 正弦混合）才能把参数学准。',
      params: [['Γ（自适应增益）', '0.5 ~ 5', '学得快但易高频抖振'], ['σ（修正项）', '0.01 ~ 0.1', '参数漂移被抑制但稳态有偏'], ['参考模型阻尼 ζm', '0.9 ~ 1.0', '过大则响应过慢'], ['参考模型带宽 ωm', '闭环目标带宽', '过高则要求控制量过大']],
      loop: ['先固定自适应律（Γ=0）跑一次，确认参考模型本身的响应符合期望', '把 Γ 从 0.1 起逐步加大，观察跟踪误差收敛速度与参数曲线的抖动', '出现持续高频抖动时加入 σ-修正（σ≈0.05）或对 Γ 限幅', '用正弦指令（0.2~0.5 Hz）做持续激励，确认参数收敛到稳定值而非漂移', '最后施加扰动，验证 σ 修正是否让参数在扰动后仍能回到原值'],
      use: '每拍执行三步：① 用 r 推进参考模型得 x_m；② 算 e=x−x_m 与回归向量 φ；③ 按 θ̇=−ΓφeᵀPB−σθ 更新参数，再用 θ 算控制量。全部在线完成，不需要预先训练。',
      impl: '本平台用二阶参考模型 + 标准 MRAC 律，σ-修正默认开启但系数很小；参数量级按教学对象标定。',
      fail: '最常见是「参数漂移」：指令长期不变时 φ 恒为零，跟踪误差虽小但参数被扰动推着缓慢走，直到超出线性区才突然失稳。解决办法是持续激励或加死区。'
    },
    'STR': {
      intro: 'STR 是「先辨识、再设计」的在线自整定：每拍用 RLS 估计对象参数，再把估计值代入极点配置公式重算增益。',
      signal: '输入输出序列 (u_k,y_k) 本身。辨识质量取决于数据是否「有信息」——指令恒定或缓慢变化时，回归向量近似共线，参数不可辨识。',
      params: [['遗忘因子 λ', '0.95 ~ 0.995', '跟踪快但协方差易爆炸'], ['初值 P0', '10² ~ 10⁴ 倍单位阵', '起步快但前期估计抖'], ['激励死区', '噪声幅值的 2~3 倍', '抑制无激励时的漂移'], ['控制器带宽', '对象带宽的 1/3 ~ 1/2', '过高则与辨识互相激励']],
      loop: ['先离线用一组阶跃数据做一次批处理最小二乘，确认模型阶次正确', '把离线结果作为 RLS 初值 θ0，避免前几十拍的盲目估计', '在线运行时监控 P 的迹：若持续增大说明激励不足，应加大死区', '每 100 拍检查一次参数是否在物理合理范围内（如 m>0、k≥0）', '参数越界时冻结更新（冻结辨识）而不是强行投影，避免错误累积'],
      use: '每拍：① 构造回归向量 φ；② RLS 更新 θ 与 P；③ 用 θ 重算极点配置增益；④ 施加控制。第 ③ 步是关键——设计算法必须对估计误差有鲁棒性。',
      impl: '本平台用带遗忘因子的 RLS + 二阶极点配置，参数越界时冻结更新并保持上一组增益。',
      fail: '「辨识与控制互相激励」：控制器为了跟踪而调整增益 → 激励变弱 → 参数估计变差 → 增益更激进。表现为参数与输出同时缓慢发散，必须靠死区或增益限幅打断这个正反馈。'
    },
    'MFAC': {
      intro: 'MFAC 完全不用模型：它在线估计「输出变化量对输入变化量的比值」（伪偏导数 φ），再用这个比值反算控制量。',
      signal: '只需要 (u_k, y_k) 两列数据。φ 的估计是逐拍递推的，因此第一次运行前几拍的 φ 是猜的，需要给它一个合理的初值。',
      params: [['φ 初值', '对象直流增益的估计', '偏离真值则前期振荡'], ['步长因子 ρ', '0.1 ~ 0.8', '收敛快但易超调'], ['惩罚因子 λ', '0.01 ~ 1', '平滑但响应变慢'], ['重置阈值', '|Δu| 太小则跳过更新', '避免除零导致 φ 爆炸']],
      loop: ['先做一次开环小阶跃，用 Δy/Δu 估计 φ 的初值', '设 ρ=0.3、λ=0.1 起跑，观察前 20 拍是否平稳', '若前期振荡，增大 λ 或减小 ρ', '用往返指令（正负交替）检验 φ 是否变号——变号说明对象增益反向，需要按段重置', '最后用幅值变化的阶跃验证增益适应性'],
      use: '每拍两步：① 用上一拍的 Δu、Δy 更新 φ̂；② 用 φ̂ 算 Δu_k=ρφ̂(r−y)/(λ+φ̂²)。注意 Δu 太小时要跳过更新，否则除零。',
      impl: '本平台用紧格式动态线性化（CFDL）的 MFAC，φ 估计带重置机制：|Δu|<1e-6 时保持 φ 不变。',
      fail: '对象增益过零（例如阀门开度跨越死区）时 φ 变号而控制器没有察觉，控制方向瞬间反转，表现为「越纠越偏」。必须监控 φ 的符号并在变号时清零重估。'
    },
    'iPID': {
      intro: 'iPID 用「超局部模型」把一切未知压成一个集总项 F，再用上一拍的数据把 F 反算出来，剩下的部分就是标准 PID。',
      signal: '只需要最近两拍的 (u, y)。F 的估计是纯代数运算，无迭代、无学习，因此严格说它属于「在线估计」而非「训练」。',
      params: [['α（控制增益）', '对象直流增益的估计', '过大则等效增益不足'], ['Kp / Kd', '按 PID 规则整定', '与线性 PID 同义'], ['采样周期 h', '闭环带宽的 1/20', '过小则差分噪声被放大']],
      loop: ['先估 α：给一个小阶跃，用稳态 Δy/Δu 作为 α', '把 Kp、Kd 按线性 PID 整定（此时 F 估计先关闭）', '打开 F 估计，观察扰动下误差回落速度是否变快', '若出现高频抖动，说明 h 太小或 y 有噪声，应对 y 做轻量滤波后再差分', '最后用常值扰动（如加质量）验证 F 是否把参数变化也吃掉了'],
      use: '每拍：① 用上一拍的 y 差分算 F̂=(y_k−y_{k−1})/h−αu_{k−1}；② 用 u=(ÿ*−F̂+Kpe+Kdė)/α 算控制量。两步都是代数运算。',
      impl: '本平台用一阶超局部模型（ν=2 → 用位置差分），F̂ 直接由差分得到，未加滤波器。',
      fail: '差分对噪声极其敏感：位置测量噪声 1e-3 时，h=0.02 会让 F̂ 抖动 0.05，直接表现为控制力毛刺。工程上必须用带滤波的代数估计器（如 iPID 原文的积分形式）。'
    },
    'U-Model': {
      intro: 'U-Model 把非线性对象写成「已知输入项 + 未知广义项」的线性形式，用求根的方式反解控制量，让非线性系统也能套用线性设计语言。',
      signal: '不需要训练数据，但需要知道系统的阶次 n 与控制增益 b 的符号；b 的幅值可在线估计。',
      params: [['阶次 n', '由对象结构确定', '阶次高估则求根不稳定'], ['b 的下限保护', '正常值的 1/10', '防止求逆时除零'], ['闭环带宽', '对象带宽的 1/2', '过高则求根映射不连续']],
      loop: ['先用一次开环阶跃确认阶次 n（看响应有几个积分环节）', '估 b 的符号与幅值，并设 |b| 的下限保护', '按线性二阶系统设计闭环带宽与阻尼', '用大阶跃检验求根映射是否连续（控制量不应跳变）', '若控制量在某个工作点附近剧烈跳变，说明该点 b̂ 接近零，应加大下限保护'],
      use: '每拍：① 用 U 模型从期望闭环方程反解 u；② 对 |b̂| 做下限保护；③ 输出限幅。本质是「查表求根」而非学习。',
      impl: '本平台对二阶对象直接解析求根，未做迭代；b̂ 取对象直流增益的估计。',
      fail: 'b̂ 接近零时求根结果趋于无穷，这是结构奇点而非参数问题。必须设下限并在触限时切换为「保持上一拍控制量」，否则会出现控制量尖峰。'
    },
    'ESC': {
      intro: '极值寻优是「在线搜索」：它不知道最优点在哪，靠「边抖动边观察」把工作点往极值推。没有离线训练，但有明确的收敛判据。',
      signal: '唯一的反馈是性能指标 y（如功率、效率）。指标必须可测且对控制量单峰——多峰时只能找到局部最优。',
      params: [['抖动幅值 a', '工作范围的 2% ~ 5%', '探索范围大但稳态精度差'], ['抖动频率 ω', '控制器带宽的 10 倍以上', '分离更好但对采样要求高'], ['解调增益 k', '0.1 ~ 1', '收敛快但易振荡'], ['低通截止', 'ω 的 1/10', '滤得干净但相位滞后']],
      loop: ['先扫描一遍控制量的可行范围，确认指标是单峰的', '设 a 为范围的 3%、ω 为控制器带宽的 15 倍，起跑观察是否朝正确方向移动', '若寻优方向反了，把解调信号的相位反转 180°', '逐步减小 a 提高稳态精度，同时按比例减小 k 保持稳定', '稳定后检查指标波动幅度是否小于 a² 量级，否则说明时间尺度分离不足'],
      use: '每拍：① 输出 u=û+a·sin(ωt)；② 测 y 并乘同频正弦解调；③ 低通得梯度估计；④ 积分更新 û。四步都是固定运算，无训练阶段。',
      impl: '本平台用正弦抖动 + 同步解调 + 一阶低通，参数按教学对象标定，未做多峰检测。',
      fail: '时间尺度不分离是最常见的失败：抖动频率不够高时，对象动态会被解调成「假梯度」，工作点朝错误方向移动。判据是 ω 至少为闭环带宽的 10 倍。'
    },
    'BELBIC': {
      intro: 'BELBIC 模仿杏仁核的「奖励驱动学习」：输出由情绪节点决定，权重只在「结果好于平均」时更新。属于在线强化学习。',
      signal: '奖励信号 Rew 由设计者定义（通常是 −|e| 或 −(e²+λu²)）。奖励的定义直接决定它学什么，是最关键的设计决策。',
      params: [['学习率 α', '0.01 ~ 0.2', '学得快但权重抖动'], ['奖励衰减 γ', '0.9 ~ 0.99', '看重长期回报'], ['感觉输入数', '2 ~ 4（e, ė, ∫e）', '表达力强但难收敛'], ['权重上限', '1 ~ 10', '防止单节点主导']],
      loop: ['先定义奖励：建议用 Rew=−(|e|+0.01|u|)，兼顾精度与能耗', '把权重初始化为 0，此时输出为 0（纯开环），确认系统不炸', '加一个小比例项作「保底控制器」，保证学习期间系统可控', '逐步加大 α，观察权重是否收敛到稳定值', '收敛后撤掉保底项，检查纯 BELBIC 能否维持性能'],
      use: '每拍：① 算奖励；② 更新情绪节点权重；③ 输出 MO=EA−EO；④ 与保底控制器叠加输出。学习与使用是同一过程。',
      impl: '本平台用 2 个感觉输入（e、ė）+ 单层情绪节点，权重带衰减项，未实现完整的两层杏仁核结构。',
      fail: '奖励设计不当是最主要问题：若奖励只含 −|e|，它会学出「疯狂输出」，因为大控制量能瞬时减小误差；必须加入 −λu² 项才有工程意义。'
    },
    'Linear-Actor-Critic': {
      intro: 'Actor-Critic 同时学「策略」与「价值」：Actor 决定动作，Critic 评估动作好坏，两者按 TD 误差一起更新。是标准的在线强化学习。',
      signal: '奖励 r 与状态 x。与 BELBIC 不同，它学习的是「长期累积回报」，因此需要折扣因子 γ 把未来收益折现。',
      params: [['Actor 学习率', '1e-3 ~ 1e-2', '策略变化快但易发散'], ['Critic 学习率', 'Actor 的 2~5 倍', '评估更快但噪声大'], ['折扣因子 γ', '0.95 ~ 0.99', '看重远期的但方差大'], ['特征归一化', '必须开', '不归一化几乎必然发散']],
      loop: ['先把特征 φ(x) 做零均值单位方差归一化（这一步最关键）', 'Actor 学习率先设 0，只用 Critic 评估当前固定策略，确认价值估计收敛', '打开 Actor 学习率（从 1e-3 起），观察策略参数是否平滑变化', '监控 TD 误差的均方值：持续增大说明学习率过大', '收敛后用阶跃 + 扰动组合检验策略是否真的变好'],
      use: '每拍：① 算 TD 误差 δ=r+γV(x′)−V(x)；② 更新 Critic 权重 w←w+αc·δ·φ；③ 更新 Actor 参数 θ←θ+αa·δ·φ；④ 输出 u=θᵀφ。',
      impl: '本平台用线性函数逼近（线性 Actor + 线性 Critic），默认学习率偏大，因此在默认参数下会数值发散——这是有意保留的教学现象。',
      fail: '不归一化 + 学习率过大会让「参数更新 → 状态变化 → 更大的 TD 误差」形成正反馈，几十拍内数值爆炸。本平台默认参数即处于该状态，减小学习率 10 倍即可稳定。'
    },
    'Gradient-PID': {
      intro: '基于梯度的 PID 整定把「调参」变成优化问题：定义一个代价（通常是误差平方积分），沿代价对增益的负梯度方向更新。',
      signal: '实验数据：每一轮跑完一段轨迹，用记录到的 e(t)、u(t) 估计 ∂J/∂K。真机上无法解析求梯度，只能用差分或 IFT。',
      params: [['学习率 η', '1e-3 ~ 1e-2', '收敛快但易越过极小点'], ['每轮时长', '≥ 3 倍调节时间', '统计更准但整定慢'], ['梯度步长 ε', '增益的 1% ~ 5%', '差分精度与噪声的折中'], ['增益上下限', '按执行器能力', '防止更新到不可行区']],
      loop: ['固定一组基准增益，跑一轮记录 J0', '对每个增益分别加 ε 跑一轮，得 ∂J/∂K 的前向差分', '按 K←K−η∇J 更新，同时把增益限制在物理可行区间', '重复 5~10 轮，观察 J 是否单调下降', 'J 不再下降时减小 η 与 ε，避免在极小点附近来回跳'],
      use: '严格说是「离线迭代」：每轮实验结束后更新一次，而不是每拍更新。在线单步版本（本平台实现）只是教学近似。',
      impl: '本平台把梯度更新做成了逐拍单步近似，没有做多轮实验，因此收敛行为与真实 IFT 不同。',
      fail: '每轮时长不足时，代价里混入了暂态部分，梯度方向被瞬态主导，整定结果只在短时域最优、长时域反而更差。判据是每轮时长 ≥ 3 倍闭环调节时间。'
    },

    /* ── 08 轨迹规划与学习 ── */
    'InputShaping': {
      intro: '整形器没有「训练」，但有一步必须做的「辨识」：先用敲击实验测出柔性结构的自然频率与阻尼比，再据此算出脉冲参数。',
      signal: '一次敲击（或一次未整形的阶跃）的振动响应曲线。从曲线读出振荡周期（得 ωd）与相邻峰值衰减比（得 ζ）。',
      params: [['ωn（自然频率）', '实测，误差需 <20%', '偏大则整形过慢'], ['ζ（阻尼比）', '实测，可估 0.05~0.2', '偏大则脉冲幅值分配失衡'], ['整形器类型', 'ZV / ZVD / EI', 'ZVD 更鲁棒但慢半周期']],
      loop: ['给一次未整形阶跃，记录位置/力传感器的自由振荡段', '数出 3~5 个周期的平均周期 T_d，得 ωd=2π/T_d', '由相邻峰值 A1、A2 算 ζ=ln(A1/A2)/√(π²+ln²(A1/A2))', '由 ζ、ωd 算 ZV 脉冲的幅值与时间间隔，先做仿真验证', '实机施加整形后的阶跃，检查残余振动是否降到未整形的 10% 以下'],
      use: '运行时只做一件事：把指令与两个（或三个）延时脉冲卷积。纯前馈，不影响闭环稳定性，可以在运行时随时开关。',
      impl: '本平台实现 ZV 双脉冲整形，ωn、ζ 由参数面板给出，未做在线辨识。',
      fail: '频率估错是最常见的失败：ωn 偏 20% 时残余振动回升到 5%~10%，此时应换 ZVD（三脉冲）把容忍带从 ±15% 扩到 ±40%，代价是响应再慢半个周期。'
    },
    'ILC': {
      intro: '迭代学习是唯一真正需要「多轮训练」的方法：同一段轨迹重复执行，每轮用上一轮的误差修正前馈，误差随轮次递减。',
      signal: '第 k 轮的完整误差轨迹 e_k(t)（0≤t≤T）。必须逐点记录，因此需要能保存一个完整周期的数据。',
      params: [['学习增益 L', '0.3 ~ 0.9', '收敛快但易振荡'], ['Q 滤波器截止', '闭环带宽的 1/2', '抑制高频但收敛变慢'], ['轮次上限', '10 ~ 50', '再多则收益递减'], ['初值一致性', '必须严格复位', '初始偏差会累积成残差']],
      loop: ['第 0 轮：不加前馈，只跑反馈，记录 e_0(t)', '按 u_1(t)=u_0(t)+L·e_0(t) 构造下一轮前馈', '第 1 轮：施加 u_1，记录 e_1(t)', '检查 ‖e_k‖ 是否单调下降；若某轮上升，把 L 减半', '收敛后加入 Q 滤波器抑制高频，再迭代 2~3 轮补偿滤波带来的滞后'],
      use: '离线多轮 + 在线复用：训练阶段反复跑同一轨迹到收敛，之后把收敛的前馈序列存下来直接复用；轨迹变了要重新训。',
      impl: '本平台实现了单步 ILC 的在线近似（每拍用上一拍误差修正前馈），未做完整的「整轨迹多轮」流程。',
      fail: '初值不一致是最隐蔽的失败：每轮的起始位置差 1 mm，就会在误差轨迹里留下一个固定偏置，被 ILC 学成「前馈里的一个直流分量」，表现为整段轨迹系统性偏移。必须严格复位。'
    },
    'Repetitive': {
      intro: '重复控制把「上一周期的误差」当作本周期的修正依据，本质是把周期延迟写进控制器，因此需要存储一个完整周期的数据。',
      signal: '一个完整周期 T 的误差缓存。周期的准确性直接决定抑制效果。',
      params: [['周期 T', '实测，误差 <1%', '错位则抑制失效'], ['Q 滤波器', '0.9 ~ 0.99 的低通', '稳定性好但抑制变浅'], ['学习增益 kr', '0.1 ~ 0.8', '收敛快但易失稳'], ['周期数', '5 ~ 20 周期后稳定', '再多收益递减']],
      loop: ['先测出扰动的真实周期（用 FFT 或过零检测）', '把 T 写入控制器，缓存长度取 T/Δt', 'kr 先设 0.2，观察误差是否逐周期下降', '若出现周期性的慢发散，加入 Q 滤波器（零点 0.95）', '收敛后检查残差频谱，确认目标谐波被压到 -30 dB 以下'],
      use: '在线运行：每拍从缓存取出「上一周期同一时刻」的误差，乘 kr 后叠加到控制量，再把当前误差写回缓存。',
      impl: '本平台实现标准重复控制器 + 一阶 Q 滤波器，缓存长度按 20 s/Δt 固定分配。',
      fail: '周期估计偏 1% 时，内模极点与扰动频率错位，抑制深度从 -40 dB 掉到 -6 dB 以下。转轴类应用必须用编码器索引信号而不是固定延时。'
    },
    'GainSched': {
      intro: '增益调度不需要「训练」，但需要一次性做「建模 + 设计」：沿调度变量取若干工作点，各线性化一次、各设计一个控制器。',
      signal: '各工作点的阶跃响应（用于辨识线性模型）或物理模型（可直接线性化）。',
      params: [['工作点数量', '4 ~ 8', '插值更准但整定量大'], ['调度变量 σ', '速度 / 液位 / 转角', '须能实时测量'], ['插值方式', '线性 / 三次样条', '样条更平滑但可能过冲'], ['切换速率限制', '带宽的 1/10', '防跳变但响应慢']],
      loop: ['选定调度变量并确定其全范围', '在 4~8 个工作点各做一次线性化，得到一组 LTI 模型', '为每个模型各设计一个控制器（可用同一套规则）', '检查是否存在公共 Lyapunov 函数（或逐点验证稳定裕度）', '实现插值时限制 σ 的变化率，避免快速切换导致失稳'],
      use: '运行时按当前 σ 查表插值得到增益，无需在线学习；关键是插值必须连续且 σ 变化率受限。',
      impl: '本平台用线性插值 + 变化率限制，工作点由对象参数直接给定，未做在线辨识。',
      fail: '各工作点独立稳定不等于插值过程稳定——这是增益调度最经典的陷阱。必须在 σ 的中间值上额外验证 2~3 个点，或证明存在公共 Lyapunov 函数。'
    },
    'FuzzyPID': {
      intro: '模糊 PID 的「训练」是设计规则表与隶属函数：先按经验搭表，再用实验逐步修正。没有梯度下降，属于「人工整定 + 实验迭代」。',
      signal: '阶跃与扰动响应曲线（看超调、上升时间、稳态误差），以及各工况下的误差分布范围（决定论域如何划分）。',
      params: [['隶属函数形状', '三角形，3~5 个/变量', '划分细但规则数爆炸'], ['论域范围', '覆盖实测误差的 1.5 倍', '过窄则饱和、过宽则分辨率低'], ['规则表规模', '5×5 或 7×7', '表达力强但难验证'], ['量化因子 Ke、Kec', '按论域/实际范围', '等效于输入增益']],
      loop: ['先统计误差与误差变化率的实际范围，据此定量化因子', '按「误差大→强输出、误差小→弱输出」搭初始规则表', '用阶跃响应检查：超调大则在「误差正、误差变化正」格里减小输出', '用扰动响应检查：恢复慢则加大积分通道的权重', '逐格检查规则单调性，消除「误差增而输出减」的矛盾格'],
      use: '运行时每拍做三步：模糊化（求隶属度）→ 规则推理（取小/取大）→ 解模糊（重心法），得到 ΔKp、ΔKi、ΔKd 后叠加到基准 PID 上。',
      impl: '本平台用 3×3 规则表 + 三角隶属函数 + 重心法解模糊，输出限幅到基准增益的 ±50%。',
      fail: '规则表里存在反号格是最致命的：某格输出方向与误差相反，会在该区域形成局部正反馈，表现为「工作点一进入某个区间就开始振」。必须逐格做单调性检查。'
    },
    'NeuralPID': {
      intro: '单神经元 PID 用三个可学习权重代替 Kp、Ki、Kd，按 Hebbian 规则在线更新。是真正意义上的在线学习，但结构极简。',
      signal: '误差 e 及其两个派生量（∫e、ė）作为输入，输出 u 作为「行为」，按 Hebbian 规则「同时活跃的连接被加强」。',
      params: [['学习率 η', '0.01 ~ 0.1', '学得快但权重抖'], ['权重初值', '按 PID 经验给', '初值差则前期性能差'], ['权重上限', '基准增益的 3 倍', '防止单权重主导'], ['归一化', '输入需归一化', '不归一化则学习率难定']],
      loop: ['先把输入 e、∫e、ė 各自归一化到 [-1,1]', '权重初值取一组能用的 PID 增益（不要从 0 开始）', 'η 从 0.01 起，观察权重曲线是否平滑收敛', '若权重持续增大，加入权重衰减或上限', '用不同幅值的阶跃检验权重是否真的适应了工况'],
      use: '每拍：① 算三个输入；② 按 Δw_i=η·e·u·x_i 更新权重；③ 输出 u=Σw_i x_i。学习与使用同一过程，无独立训练阶段。',
      impl: '本平台实现标准单神经元 + Hebbian 学习，权重带限幅，未加监督项。',
      fail: '纯 Hebbian 规则没有目标函数，权重可能收敛到「能减小误差但不是最优」的组合；且因为没有显式积分器，常值扰动下仍有静差。工程上通常叠加一个固定积分项兜底。'
    },
    'Fuzzy': {
      intro: '纯模糊控制没有 PID 基准，它的「训练」就是把操作员的经验翻译成规则表，再通过实验修补。',
      signal: '操作员的操作记录（什么误差下给多大输出）或试凑实验。没有数值优化过程。',
      params: [['输入变量', 'e、ė（建议两个）', '三维以上规则数爆炸'], ['论域与量化因子', '覆盖实测范围 1.5 倍', '过窄则饱和'], ['规则数', '5×5 ~ 7×7', '细则精但难验证'], ['解模糊方法', '重心法', '连续但计算量大']],
      loop: ['记录人工操作数据，统计每个 (e, ė) 区间对应的输出范围', '据此搭规则表，先保证「零误差零输出」', '逐格做单调性检查：e 增则 u 不应减', '用阶跃响应检查超调，用常值扰动检查静差', '若静差无法消除，串一个积分环节变成「模糊 + I」'],
      use: '运行时每拍：模糊化 → 规则推理 → 解模糊 → 输出。无学习、无参数更新，行为完全由规则表决定。',
      impl: '本平台用 5×5 规则表 + 三角隶属 + 重心法，输出限幅到 ±u_max。',
      fail: '纯模糊无积分状态，常值扰动下必有静差——这不是调参能解决的，是结构决定的。需要消差时必须外加积分器（Fuzzy-PI）或改用 FuzzyPID。'
    },

    /* ── 10 观测器与网络拓扑 ── */
    'RLS-Adaptive': {
      intro: '递推最小二乘是所有在线辨识的基础工具：每来一组新数据就更新一次参数估计与协方差，不需要保存历史数据。',
      signal: '输入输出对 (φ_k, y_k)。φ 是回归向量，由历史输入输出按模型阶次拼成。',
      params: [['遗忘因子 λ', '0.98 ~ 0.998', '跟踪快但协方差易爆'], ['初值 P0', '10² ~ 10⁴', '起步快但前期抖'], ['数据归一化', '必须开', '不归一化则数值病态'], ['激励死区', '噪声的 2~3 倍', '抑制漂移']],
      loop: ['先离线用批处理最小二乘得 θ0，作为在线算法的初值', '在线运行时监控 P 的迹：持续增大说明激励不足', '加入死区：|φ| 太小时冻结更新', '对 θ 施加物理约束（如质量 >0、阻尼 ≥0），越界则投影', '用突变参数（如加质量）检验 λ 是否让估计及时跟上'],
      use: '每拍：① 算增益 K=Pφ/(λ+φᵀPφ)；② θ←θ+K(y−φᵀθ)；③ P←(I−Kφᵀ)P/λ。三步都是矩阵运算，O(n²) 复杂度。',
      impl: '本平台用带遗忘因子的 RLS 估计二阶对象参数，未加投影（参数越界时仅冻结）。',
      fail: '长期无激励时 P 在遗忘因子作用下指数增长（协方差爆炸），一旦有新数据，增益 K 巨大，参数被一次跳变「打飞」。解决办法是设 P 的上界或改用可变遗忘因子。'
    },
    'EKF-Ctrl': {
      intro: '扩展卡尔曼滤波把非线性系统在当前估计点线性化，再套用标准卡尔曼公式；它是「在线估计」而非「训练」，但噪声协方差需要事先整定。',
      signal: '观测序列 y_k 与控制输入 u_k。噪声协方差 Q、R 不是从数据学来的，而是设计者按传感器手册或试凑给出的。',
      params: [['过程噪声 Q', '状态变化的 1%~10%', '信任模型、跟踪快但噪声大'], ['观测噪声 R', '传感器噪声方差', '信任测量、平滑但滞后'], ['初始协方差 P0', '初始不确定度的平方', '大则前期收敛快'], ['更新频率', '每个采样周期', '更高则更准但算力大']],
      loop: ['先用静止数据测传感器的实际噪声方差，作为 R 的初值', 'Q 先设小值（信任模型），跑一次看估计是否跟得上快速变化', '跟不上则加大 Q，出现高频抖动则减小 Q', '用「预测-观测」残差的白化检验判断 Q/R 是否失衡（残差应接近白噪声）', '最后检查协方差是否长期正定（数值实现可能失去正定性）'],
      use: '每拍：① 用模型预测状态与协方差；② 算卡尔曼增益；③ 用观测校正；④ 把估计状态送进反馈律。',
      impl: '本平台用一阶线性化 EKF 估计速度，Q、R 固定，未做自适应调整。',
      fail: 'Q/R 失衡最典型：R 设太小（过度信任测量）会让估计跟着噪声跳，反馈增益把它放大成控制力毛刺；R 设太大则估计严重滞后，等效于反馈里串了大延迟。'
    },
    'Particle-Filter': {
      intro: '粒子滤波用一组带权样本逼近后验分布，能处理非高斯、多峰的情况；「训练」实际是选粒子数与初始分布。',
      signal: '观测序列与状态转移模型（含噪声分布）。噪声分布的形状（高斯/重尾）直接决定滤波器是否合适。',
      params: [['粒子数 N', '200 ~ 2000', '更准但算力线性增长'], ['重采样阈值', '有效样本数 < N/2', '更频繁则 diversity 下降'], ['初始分布', '覆盖真实初值的范围', '过窄则前期跟丢'], ['过程噪声', '按模型不确定度', '大则鲁棒但精度低']],
      loop: ['先确认噪声是否真的非高斯（画残差直方图）——高斯场合用 EKF 更划算', 'N 从 200 起，观察估计方差是否随 N 明显下降', '加入有效样本数监控，低于 N/2 时触发重采样', '用脉冲型扰动检验是否会「跟丢」（所有粒子都远离真值）', '跟丢时增大过程噪声或加「正则化重采样」'],
      use: '每拍：① 按状态方程传播粒子；② 按观测似然更新权重并归一化；③ 重采样；④ 加权平均得估计值送反馈。',
      impl: '本平台用 200 个粒子 + 系统重采样，观测模型为线性高斯，未实现正则化重采样。',
      fail: '样本枯竭：几十拍后所有权重集中到 1~2 个粒子上，此时滤波器实际上退化成「只信一个猜值」，一旦猜错就永久跟丢。监控有效样本数并提高过程噪声是标准解法。'
    },
    'Neural-RBF-ADRC': {
      intro: 'RBF 网络替代 ESO 的线性组合来拟合总扰动；网络的中心点与宽度是设计参数，权重才是在线学习的部分。',
      signal: '状态 x 作为网络输入，跟踪误差 e 作为学习信号（监督项），无需离线数据集。',
      params: [['隐含节点数', '5 ~ 20', '表达力强但需更多激励'], ['中心点 c_i', '均匀覆盖工作范围', '覆盖不全则局部失准'], ['宽度 σ', '相邻中心间距的 1~2 倍', '过宽则分辨力差'], ['学习率 η', '0.01 ~ 0.1', '学得快但权重抖']],
      loop: ['先按状态的实际范围均匀布置中心点（不要用随机初值）', '权重初值设 0，此时网络输出 0，系统退化为「无扰动补偿」', '打开学习率，观察权重是否只在被激活的节点上变化', '用大范围扫掠检验边界区域的逼近误差是否可接受', '若某区域误差大，在该区域加密中心点而不是加大学习率'],
      use: '每拍：① 算各节点的激活度 φ_i=exp(−‖x−c_i‖²/2σ²)；② 输出 f̂=Σw_iφ_i；③ 按 ẇ=η·e·φ 更新；④ 用 f̂ 做前馈补偿。',
      impl: '本平台用 9 个均匀分布的中心点 + 高斯基函数，权重带限幅，未做中心点自适应。',
      fail: '只用固定中心点覆盖有限范围：工作点移出覆盖区后激活度趋零，网络输出为零，补偿突然消失，表现为「误差突然变大且不再被抑制」。必须按实际工作范围布点。'
    },

    /* ── 06 融合与复合架构（需在线整定） ── */
    'L1': {
      intro: 'L1 自适应把「自适应」与「鲁棒」拆成两件事：预测器负责快速估计，低通滤波负责把估计的高频部分挡在执行器之外。',
      signal: '跟踪误差与预测误差；整定重点是低通带宽 a 与自适应增益 Γ 的配比。',
      params: [['Γ（自适应增益）', '10 ~ 1000', '估计快但需更宽的滤波'], ['a（滤波器带宽）', '闭环带宽的 2~5 倍', '跟踪好但鲁棒裕度小'], ['预测器带宽', '≥ 对象带宽', '预测准但噪声敏感'], ['投影边界', '参数物理范围', '防漂移但可能触及边界']],
      loop: ['先关闭自适应（Γ=0），只跑固定增益反馈，确认基础闭环稳定', '打开预测器，检查预测误差是否收敛', '从较小的 Γ 起逐步加大，同时按比例提高 a 保持 L1 条件', '用 L1 范数条件 ‖G(1−C)‖∞<1 校核（可用频响数据估算）', '施加突变扰动，检查低通是否把自适应尖峰挡住（控制量不应有尖刺）'],
      use: '每拍：① 推进状态预测器；② 按投影律更新 θ̂；③ 算自适应控制量并过一阶低通；④ 输出。低通是结构的一部分，不能省。',
      impl: '本平台用一阶低通 + 标准投影自适应律，L1 条件未在线校核（按默认参数满足）。',
      fail: '去掉低通或把 a 设得过大，L1 退化成 MRAC，高频自适应分量直接进执行器，表现为控制量高频抖振甚至激发未建模共振。a 越大性能越好但越接近这个边界。'
    },
    'ARC': {
      intro: '自适应鲁棒控制把「模型补偿」与「鲁棒镇定」并联：前者用估计参数做前馈，后者用有界项压住残差。需要在线估计参数。',
      signal: '跟踪误差与回归向量。投影算子把参数限制在已知区间内，因此不需要持续激励也能保证有界。',
      params: [['Γ（自适应增益）', '1 ~ 100', '估计快但对噪声敏感'], ['K（鲁棒增益）', '闭环带宽的 2~5 倍', '抗扰强但抖振大'], ['投影边界', '参数物理上下限', '必须留 20% 余量'], ['ε（平滑因子）', '噪声的 1~2 倍', '平滑但降低精度']],
      loop: ['先按名义参数设计鲁棒项，令自适应增益 Γ=0，确认纯鲁棒控制可用', '打开 Γ，观察参数估计是否在投影边界内平滑变化', '若参数贴边不动，检查边界是否设得过窄', '加大 K 提高抗扰，直到控制量出现抖振为止，再退回 30%', '用参数突变（加质量）检验估计是否跟上'],
      use: '每拍：① 更新参数估计（带投影）；② 算模型补偿量；③ 算鲁棒项；④ 两者相加输出。',
      impl: '本平台用标准投影自适应 + 线性鲁棒项，投影边界按参数默认值的 ±50% 设定。',
      fail: '投影边界设得过窄会让参数长期贴边，等效于「自适应关闭」；设得过宽则估计可能漂到物理无意义的值（如负质量）。边界必须包含真实值的合理邻域并留余量。'
    },
    'AdaptBackstepping': {
      intro: '自适应反步在反步的每一级同时处理状态误差与参数误差，自适应律由 Lyapunov 函数直接导出，属于在线学习。',
      signal: '各级状态误差 z_i 与回归向量 φ_i。参数收敛需要回归向量「足够丰富」。',
      params: [['γ（自适应增益）', '0.1 ~ 10', '学得快但抖振'], ['k_i（各级增益）', '按带宽递减', '前级快后级慢'], ['投影边界', '参数物理范围', '防漂移'], ['微分滤波 τ', '带宽的 1/10', '抑制微分爆炸']],
      loop: ['先固定参数（γ=0）跑反步，确认每级虚拟控制都合理', '逐级打开自适应，从最内层开始', '监控参数估计是否收敛（不应持续单向漂移）', '用多频正弦指令做持续激励，验证参数收敛到真值', '撤掉激励后观察参数是否保持（不保持说明需要 σ 修正）'],
      use: '每拍：① 逐级算 z_i 与虚拟控制；② 更新参数估计；③ 算最终控制量。注意每一级的虚拟控制都需要其导数，通常用一阶滤波近似。',
      impl: '本平台实现二阶自适应反步，虚拟控制导数用差分近似，参数带投影。',
      fail: '虚拟控制求导在实机上会被噪声放大（微分爆炸），表现为内层控制量高频抖动。必须用动态面（DSC）的滤波替代解析求导，代价是收敛变慢。'
    },
    'I-and-I': {
      intro: '浸入与不变自适应不追求「误差趋零」，而是先把状态拉到一个设计好的流形上，再沿流形消掉参数误差。',
      signal: '状态与参数误差的组合 z=θ̂−θ+β(x)。关键在于构造 β(x) 使 z 的动力学与未知参数解耦。',
      params: [['γ（流形收敛率）', '0.5 ~ 5', '收敛快但控制量大'], ['β(x) 的形状', '由匹配方程解出', '选错则无解'], ['k（状态镇定增益）', '按带宽整定', '与 γ 需匹配'], ['初值一致', 'z(0) 必须可算', '否则流形初始偏离']],
      loop: ['先写出系统方程，确认未知参数以「乘性」形式出现在哪一项', '求解匹配方程 g^⊥(f+gu−∂H_d/∂x)=0，得到 β(x) 的候选形式', '验证 z 的导数中不含未知参数项（这是 I&I 成立的核心）', '设计 u 使 ż=−γz 且状态被镇定', '用仿真验证状态与参数是否同时收敛（不需要 PE）'],
      use: '每拍：① 算 z=θ̂−θ+β(x)；② 按 ż=−γz 反解 θ̂ 的更新律；③ 算控制量。',
      impl: '本平台对二阶线性对象解析求出 β(x)，未做一般非线性情形的求解。',
      fail: '匹配方程无解是最常见的失败——对多数系统 β(x) 需要解一个偏微分方程，并不总有闭式解。此时只能退回 MRAC 或 ARC，并接受 PE 要求。'
    }
  };