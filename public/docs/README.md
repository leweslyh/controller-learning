# 控制方法 · 教学文档索引

> 每法一份面向初学者的教学讲稿：生活类比 → 被控对象 → 为什么需要它 → 一步步推导 → 算例 → 参数怎么调 → 局限与陷阱 → 延伸阅读。
> 全部公式为 TeX 语法，编号由 `\tag` 渲染在公式右侧；推导为直观推导与设计思路，不是严格数学证明。

**本目录的正文唯一来源是 `methods/*.md`**；阅读器读取的是同一份内容（由 `node tools/build-docs.js` 打包为 `public/js/docs-content.js`），因此不需要、也不再生成任何汇总副本。

也可以直接在实验台中按 `H` 或点「教学文档」按钮打开阅读器，无需阅读这些文件。

## 01. 各类PID与工业变体

- [P控制 (比例控制)](methods/001-P.md) — 输出与误差成正比，结构最简但存在稳态误差。
- [PI控制 (比例-积分)](methods/002-PI.md) — 消除稳态误差，但积分滞后易增加超调。
- [PD控制 (比例-微分)](methods/003-PD.md) — 微分相当于电子阻尼，有效抑制超调与震荡。
- [经典位置式 PID (Standard PID)](methods/004-PID.md) — 工业万金油，综合过去(I)、现在(P)、未来(D)实现快准稳。
- [增量式 PID (Incremental PID)](methods/005-IncPID.md) — 仅输出控制增量 Δu，天然具备防积分风up特性。
- [I-PD 控制 (比例微分先行)](methods/006-IPD.md) — P和D仅作用于被控状态，彻底消除指令阶跃跳变冲击。
- [PI-D 控制 (微分先行)](methods/007-PI-D.md) — D仅作用于反馈测量避免微分冲击，P和I作用于误差。
- [二自由度 PID (2-DOF PID)](methods/008-2DOF-PID.md) — 设定值前置权重独立优化目标跟踪与抗扰性能。
- [串级双环 PID (Cascade PID)](methods/009-Nested-PID.md) — 外环控位置生成期望速度，内环高频控速度生成推力。
- [反算抗饱和 PID (Back-Calc Anti-Windup)](methods/010-AW-PI.md) — 执行器限幅饱和时通过反算差值动态泄放积分器。
- [条件钳位抗饱和 PID (Clamping PID)](methods/011-Clamping-PID.md) — 输出饱和且误差同向时立即冻结积分累加。
- [积分分离 PID (Integrator Separation)](methods/012-Sep-Int-PID.md) — 大误差时切除积分防超调，进入阈值带内才激活积分消静差。
- [变速积分 PID (Variable-Rate Integral)](methods/013-VarRate-PID.md) — 积分累加系数随误差减小而平滑递增，兼顾柔和与精度。
- [不完全微分 PID (Filtered-D PID)](methods/014-FilterD-PID.md) — 在微分通道串联一阶低通滤波器，抑制高频传感器噪声放大。
- [带死区防抖 PID (Deadband PID)](methods/015-Deadband-PID.md) — 误差进入微小死区后冻结调节，防止执行器在零位高频磨损。
- [指令斜坡柔化 PID (Setpoint-Ramp PID)](methods/016-RampSP-PID.md) — 内置速率限制器将阶跃目标转化为平滑斜坡轨迹。
- [专家规则 PID (Expert Rule PID)](methods/017-Expert-PID.md) — 根据误差与误差变化率的相平面象限区域动态切换增益模式。
- [韩氏非线性 PID (Nonlinear fal-PID)](methods/018-NPID.md) — 利用 fal 函数实现“小误差大增益，大误差小增益”。
- [模糊自整定 PID (Fuzzy-Tuning PID)](methods/019-FuzzyPID.md) — 结合 3x3 模糊规则库与重心法解模糊在线实时微调 PID 参数。
- [单神经元自适应 PID (Single-Neuron PID)](methods/020-NeuralPID.md) — 结合 Hebbian 有监督学习律在线自动演化 P/I/D 突触权重。
- [梯度灵敏度自整定 PID (Gradient/IFT PID)](methods/021-Gradient-PID.md) — 利用在线计算的误差平方梯度动态优化 PID 参数。
- [超局部无模型智能 PID (Intelligent iPID)](methods/022-iPID.md) — Fliess超局部模型在线估计未知动态并直接代数对消。
- [P-PI 工业伺服标准串级控制](methods/143-P-PI-Cascade.md) — 工业伺服驱动器最标准的三环简化架构：位置环纯P比例 + 速度环PI积分抗扰。
- [双线性 Tustin 离散变换 PID](methods/144-Bilinear-Tustin-PID.md) — 采用梯形积分(Tustin双线性变换 s = 2/T·(z-1)/(z+1))离散化，频域保真度最高。
- [Åström-Hägglund 继电整定 PID](methods/145-Gain-Margin-PID.md) — 基于临界振荡周期 T_u 与临界增益 K_u 的改进型 Ziegler-Nichols 无超调配比律。
- [内模整定单参数 PID (λ-Tuning PID)](methods/146-IMC-PID.md) — Rivera-Morari 内模整定法：将二阶对象逆模型直接解析折算为单一闭环时间常数 λ_c 控制的 PID。

## 02. 经典频域与补偿体系

- [开环前馈控制 (Open-Loop Feedforward)](methods/023-OpenLoop.md) — 无传感器反馈，仅靠先验刚度模型计算静力，遇扰动或倒立摆即失效。
- [超前相位补偿器 (Phase-Lead Compensator)](methods/024-QFT-LeadLag.md) — 配置零点小于极点(z < p)，在频域注入正相位提升相位裕度。
- [滞后稳态补偿器 (Phase-Lag Compensator)](methods/025-Lag-Compensator.md) — 配置极点小于零点(p < z)，大幅抬升低频增益以压缩稳态误差。
- [双级超前-滞后补偿 (Lead-Lag Network)](methods/026-Lead-Lag-Full.md) — 串联滞后网络消静差与超前网络提裕度，全频段综合整形。
- [陷波谐振抑制控制 (Notch Filter + PD)](methods/027-Notch-Filter-PD.md) — 内置双T型二阶陷波器滤除特定机械谐振频率分量。
- [比例谐振控制 (PR Resonant Controller)](methods/028-PR-Resonant.md) — 在特定正弦频率处提供无穷大增益，实现正弦指令零静差跟踪。
- [II型双积分伺服补偿 (Type-II Servo)](methods/029-Double-Int-Servo.md) — 包含双重积分通道与双零点相位超前稳定，对斜坡信号零静差。
- [PIDA三阶反馈控制 (PID-Acceleration)](methods/030-PIDA-Controller.md) — 引入加速度负反馈(二阶导数)构建三阶补偿器，等效增加虚拟质量与阻尼。
- [Bode理想截止特性整形 (Bode Ideal Cutoff)](methods/031-Bode-Step-Comp.md) — 在穿越频率附近构造平坦幅频台阶以获取最大鲁棒相位裕度。
- [双级级联超前校正 (Double-Lead Compensator)](methods/032-Two-Stage-Lead.md) — 两级超前网络串联突破单级 60° 相位提升极限，专克高阶不稳定对象。

## 03. 现代状态空间与最优控制

- [极点配置状态反馈 (Pole Placement)](methods/033-PolePlacement.md) — 利用阿克曼公式将闭环极点精确配置到复平面期望位置。
- [LQR 线性二次型最优控制](methods/034-LQR.md) — 求解代数黎卡提方程(ARE)，最小化状态偏差与控制能量代价泛函。
- [LQG 线性二次型高斯控制](methods/035-LQG.md) — 基于分离原理，卡尔曼滤波器(LQE)最优状态估计结合LQR最优控制。
- [LQI 积分增广线性二次型控制](methods/036-LQR-I.md) — 将跟踪误差积分扩维至状态向量，兼具LQR最优性与零静差抗扰性。
- [Deadbeat 数字无差拍控制](methods/037-Deadbeat.md) — 将离散闭环极点全部配置在Z平面原点(z=0)，最少采样拍数内收敛。
- [IMP 内模原理状态伺服控制](methods/038-IMP-Servo.md) — 在状态反馈环中嵌入外部指令与扰动发生器内模，实现结构级无静差。
- [有限视野预见控制 (Preview Control)](methods/039-Preview.md) — 利用未来已知的目标轨迹切片构造前馈预见补偿项。
- [卡尔曼观测器+极点配置 (Kalman + Pole)](methods/040-Kalman-Pole.md) — 结合随机最优卡尔曼滤波与确定性任意极点配置。
- [最小能量控制 (Minimum Energy Control)](methods/041-Minimum-Energy.md) — 基于能控性格拉姆矩阵(Controllability Gramian)以最小能耗抵达目标。
- [LQT 线性二次型轨迹跟踪](methods/042-LQT-Tracking.md) — 同时包含状态误差反馈与参考微分前馈伴随项的二次型最优跟踪。
- [LQR 前馈零极点对消伺服 (LQR + Feedforward)](methods/147-LQR-Servo-FF.md) — 在标准LQR状态反馈基础上，引入精确直流增益逆矩阵 N_bar 前馈，消除名义静差且无积分超调。
- [近时间最优饱和线性反馈 (PTOS)](methods/148-Linear-Time-Optimal-Switch.md) — Workman近似时间最优伺服(Proximate Time-Optimal Servomechanism)，硬盘磁头寻道核心算法。

## 04. 鲁棒控制与H∞体系

- [H-∞ 鲁棒状态反馈控制](methods/043-H-Infinity.md) — 基于博弈黎卡提方程(GARE)设计，将最坏扰动到误差的L2增益限制在γ以内。
- [H-2 范数最优鲁棒控制](methods/044-H2-Optimal.md) — 最小化系统闭环传递函数脉冲响应的能量积分(H2范数)，抑制宽带白噪。
- [混合 H2/H∞ 多目标鲁棒控制](methods/045-Mixed-H2-Hinf.md) — 在满足 H∞ 最坏抗扰上界 γ 约束下，同时优化 H2 瞬态平滑性能。
- [μ-综合结构奇异值鲁棒控制](methods/046-Mu-Synthesis.md) — 通过 D-K 迭代引入动态尺度矩阵 D(s)，降低对结构化参数不确定性的保守度。
- [H∞ 回路成型 (McFarlane-Glover)](methods/047-LoopShaping-McFarlane.md) — 先用经典PI/PD将开环传函整形成理想形状，再用互质因子分解最大化鲁棒稳定裕度。
- [Kharitonov 区间多项式顶点鲁棒控制](methods/048-Kharitonov-Robust.md) — 基于哈里托诺夫四顶点定理，确保质量与刚度在极端区间摄动下依然严格赫尔维茨稳定。
- [Corless-Leitmann 确定性不确定上界控制](methods/049-Corless-Leitmann.md) — 利用李雅普诺夫极小极大(Min-Max)法构造连续饱和非线性项，强行压制有界匹配不确定性。
- [鲁棒边界非线性阻尼控制 (Nonlinear Damping)](methods/050-Robust-NL-Damping.md) — 通过注入与状态偏差深度耦合的非线性阻尼项，保证对有界扰动的L2输入状态稳定(ISS)。
- [保性能鲁棒控制 (Guaranteed Cost Control)](methods/149-Petersen-GuaranteedCost.md) — 针对范数有界参数不确定性 ΔA，通过修正黎卡提方程保证二次型性能指标绝不劣于上界 J*。
- [无源性不足度鲁棒补偿 (Passivity-Index)](methods/150-Passivity-Shortage-Comp.md) — 量化系统的输入无源度 ν 与输出无源度 ρ，通过前馈并联与负反馈注入填补无源赤字。

## 05. 模型预测与滚动优化

- [MPC 模型预测控制 (Model Predictive)](methods/051-MPC.md) — 每个采样步利用动力学模型预测未来轨迹并在线求解最优控制序列首项。
- [Tube-MPC 管式鲁棒模型预测控制](methods/052-TubeMPC.md) — 将名义无扰MPC轨迹包裹在鲁棒不变管(Tube)内，主脑算名义轨迹，辅助增益K拉回偏差。
- [GPC 广义预测控制 (CARIMA模型)](methods/053-GPC.md) — 基于受控自回归积分滑动平均(CARIMA)模型，天然包含积分抗扰能力。
- [DMC 动态矩阵控制 (Dynamic Matrix)](methods/054-DMC-DynamicMatrix.md) — 利用对象的阶跃响应系数序列直接构建预测动态矩阵，流程工业经典。
- [MAC 模型算法控制 (Impulse Response)](methods/055-MAC-Impulse.md) — 基于有限脉冲响应(FIR)卷积核模型与闭环内模参考轨迹的预测控制。
- [PFC 预测函数控制 (Predictive Functional)](methods/056-PFC-Functional.md) — 将未来控制输入表示为阶跃/斜坡基函数的线性组合，在符合点(Coincidence Points)处精确匹配。
- [Explicit-MPC 显式分段仿射预测控制](methods/057-Explicit-MPC.md) — 将在线二次规划(QP)离线预解为状态空间多面体分区上的分段仿射(PWA)查表律。
- [SMPC 随机机会约束模型预测控制](methods/058-Stochastic-MPC.md) — 考虑随机噪声分布方差，通过概率分位数收紧安全边界并优化期望代价。
- [Min-Max 最坏情况鲁棒预测控制](methods/151-MinMax-MPC.md) — 在预测时域内显式考虑最大可能扰动 w_max 的对抗效应，求解极小化极大代价的控制律。

## 06. 滑模变结构控制家族

- [传统滑模控制 (Classical SMC)](methods/059-SMC.md) — 构造线性滑模面结合饱和边界层切换项，对匹配扰动极度鲁棒。
- [指数趋近律滑模 (Exponential Reaching Law)](methods/060-VSC-RL.md) — 高为炳院士经典趋近律：配置 ṡ = -ε·sgn(s) - k·s，兼顾远端高速与近端低抖。
- [幂次趋近律滑模 (Power-Rate Reaching Law)](methods/061-PowerRate-SMC.md) — 利用分数幂次趋近律 ṡ = -k|s|^α sgn(s) 彻底消除到达滑模面瞬间的不连续冲击。
- [积分滑模控制 (Integral SMC)](methods/062-ISMC.md) — 在滑模面引入积分项消除到达相，从 t=0 初始时刻起即具备全鲁棒性。
- [终端滑模控制 (Terminal SMC)](methods/063-TSMC.md) — 采用非线性分数幂次滑模面，保证状态在滑模面上有限时间内精确归零。
- [快速终端滑模 (Fast Terminal SMC)](methods/064-FTSMC.md) — 融合线性项与分数次幂终端项，远端指数狂飙、近端有限时间绝杀。
- [非奇异快速终端滑模 (Nonsingular FTSMC)](methods/065-NFTSMC.md) — 将分数幂次施加于速度项或采用大于1的幂次构造，从数学根源彻底消除控制奇异性。
- [自适应增益滑模 (Adaptive-Gain SMC)](methods/066-ASMC.md) — 无需预知扰动上界，根据滑模面偏离度在线自动增长与回落切换增益。
- [超螺旋二阶滑模 (Super-Twisting 2-SMC)](methods/067-SuperTwisting.md) — Levant经典二阶滑模！将高频切换符号函数隐藏在积分器内部，输出连续无抖振。
- [Twisting 螺旋二阶滑模控制](methods/068-Twisting-2SMC.md) — 最早的二阶滑模算法，利用 s 与 ṡ 的双符号切换在相平面走螺旋收敛轨迹。
- [Levant 鲁棒精确微分滑模](methods/069-LevantHOSM.md) — 通过高阶滑模精确微分器(HOSM Differentiator)在强噪声下无相位滞后提取导数。
- [变增益滑模控制 (Variable-Gain SMC)](methods/070-VariableG-SMC.md) — 切换增益随状态误差范数动态缩放，远端狂暴回扯、近端温柔护航。
- [时变边界层滑模控制 (Slotine Varying-Φ)](methods/152-Boundary-Layer-Varying-SMC.md) — Slotine经典改进：边界层厚度 Φ(t) 随状态动态变化，平衡时变带宽与跟踪精度。
- [全局滑模控制 (Global Sliding Mode)](methods/153-Global-SMC.md) — 在滑模面中减去初始状态指数衰减项 s(0)e^{-λt}，使轨迹从 t=0 时刻起100%位于滑模面上！
- [准连续高阶滑模控制 (Quasi-Continuous HOSM)](methods/154-HOSM-Quasi-Continuous.md) — Levant准连续滑模：控制律除二阶滑模原点 s=ṡ=0 外处处连续，抖振远低于传统滑模。

## 07. 自抗扰与扰动观测补偿

- [LADRC 线性自抗扰控制 (高志强参数化)](methods/071-ADRC.md) — 【LESO + LSEF】将一切内部未建模动态与外部风扰视为“总扰动”实时估计并对消。
- [NL-ADRC 韩氏非线性自抗扰控制](methods/072-NL-ADRC.md) — 【NLESO + NLSEF】全盘采用韩京清 fal 非线性幂次函数，小误差感知极度敏锐。
- [DOB 频域逆模型扰动观测器](methods/073-DOB.md) — 【名义逆模型 + Q滤波器】对比实际输入与名义逆模型推算出的输入，提取等效总扰动。
- [NDOB 非线性扰动观测器 (Chen方法)](methods/074-NDOB.md) — 引入辅助变量 z 与李代数设计函数 p(x,v)，无需对速度求导即可精确估计扰动！
- [T-DOB 时延回溯扰动观测器](methods/075-T-DOB.md) — 利用几个采样周期前的历史控制力与运动差分直接估算当前未建模扰动。
- [ESO-SMC 扩张观测器复合滑模控制](methods/076-ESO-SMC.md) — 【LESO + SMC】前端ESO平滑补偿90%慢变大扰动，后端低增益滑模镇定残差。
- [UIO 未知输入观测器解耦控制](methods/077-UIO-Feedback.md) — 通过矩阵投影正交化，使状态估计误差动态完全不受未知外部扰动通道的影响。
- [GPI 广义比例积分观测器控制](methods/078-GPI-Control.md) — 构建多阶积分链扩张状态(z3, z4)，连时变斜坡型与抛物线型扰动也能无静差估计！
- [UDE 不确定性与扰动估计器控制](methods/079-UDE-Control.md) — 通过频域低通滤波器 G_f(s) 直接对系统状态微分方程进行代数滤波反解扰动。
- [AFC 主动抗力控制 (Hewit Active Force)](methods/155-Active-Force-Control.md) — 利用估计质量与实测加速度直接代数闭环抵消一切惯性外力与环境阻力。
- [EID 等效输入扰动补偿控制 (She方法)](methods/156-Equivalent-Input-Disturbance.md) — 佘锦华教授EID架构：通过状态观测器残差经控制通道伪逆投影，将一切内外部干扰映射为等效输入扰动。

## 08. 非线性几何与能量控制

- [Bang-Bang 双位极值控制](methods/080-BangBang.md) — 非黑即白的全油门/全刹车双位切换控制，产生典型极限环震荡。
- [双模死区比例 Bang-Bang 控制](methods/081-BangBang-Zone.md) — 远端全功率Bang-Bang冲刺，进入设定区域 Zone 后平滑切换为线性PD防震。
- [滞回继电控制 (Relay with Hysteresis)](methods/082-Relay.md) — 引入死区滞回区间 [-d, +d]，消除零位高频继电器吸合磨损。
- [庞特里亚金时间最优相平面控制](methods/083-TimeOptimal.md) — 基于极大值原理构造抛物线最短时间制动切换曲线。
- [精确反馈线性化 (计算力矩法)](methods/084-FeedbackLin.md) — 利用微分几何李导数精确对消固有动力学，将对象还原为标准线性双积分器。
- [反步递推控制 (Lyapunov Backstepping)](methods/085-Backstepping.md) — 针对级联严格反馈系统，逐步构造虚拟控制律与递推李雅普诺夫函数。
- [动态面控制 (Dynamic Surface Control)](methods/086-DSC.md) — 在反步法递推层级间引入一阶低通滤波器，彻底解决高阶系统“微分爆炸”难题。
- [非线性误差平方阻尼 (Nonlinear Damping)](methods/087-NDC.md) — 注入与误差平方成正比的非线性阻尼项 e²v，兼顾启动高速与到位防超调。
- [端口哈密顿能量成型 (IDA-PBC)](methods/088-EnergyShaping.md) — 【互连与阻尼分配无源控制】重塑系统哈密顿势能阱至目标点并注入非线性耗散。
- [反馈无源化控制 (Feedback Passivation)](methods/089-Feedback-Passivation.md) — 基于Popov超稳定与无源性定理，先将对象反馈改造为严格无源系统再实施阻尼镇定。
- [协同学宏变量流形控制 (Synergetic Control)](methods/090-Synergetic-Control.md) — 俄罗斯Kolesnikov协同学派，定义宏变量流形 ψ 并令其满足 T·ψ̇ + ψ = 0 光滑演进。
- [SDRE 状态相关黎卡提方程控制](methods/091-SDRE.md) — 非线性系统的“实时LQR”，将非线性动态伪线性化为 A(x)x 并在线更新黎卡提矩阵 P(x)。
- [非线性双曲余弦势能成型 (Hyperbolic-PBC)](methods/157-Harmonic-Oscillator-PBC.md) — 构造 ln(cosh(e)) 双曲余弦人工势场：小误差区呈二次型柔和线性，大误差区呈饱和恒力防过载！
- [微分平坦五次多项式轨迹规划跟踪 (Flatness)](methods/158-Flatness-Trajectory-Track.md) — Fliess微分平坦性理论：利用平坦输出生成初末速度/加速度均为零的五次多项式平滑轨迹并逆映射前馈！

## 09. 自适应与参数辨识控制

- [MRAC 李雅普诺夫模型参考自适应](methods/092-MRAC.md) — 内置二阶理想参考模型(紫线)，基于Lyapunov稳定性在线自适应调整前馈与反馈参数。
- [MRAC-MIT 梯度律模型参考自适应](methods/093-MRAC-MIT.md) — 第一代航天自适应算法，沿跟踪误差平方代价函数的负梯度方向在线调节增益。
- [STR 自校正调节器 (Self-Tuning Regulator)](methods/094-STR.md) — 间接自适应控制：先在线辨识物理对象的刚度 k̂ 与阻尼 ĉ，再实时解算极点配置。
- [L1 低通解耦高增益自适应控制](methods/095-L1.md) — 【超高速状态预测自适应 + 低通滤波通道】彻底解耦自适应学习速率与闭环鲁棒裕度！
- [I&I 浸入与不变流形自适应 (Astolfi)](methods/096-I-and-I.md) — 构造非线性参数映射函数 β(v) 使估计误差流形指数吸引，无需测量加速度。
- [自适应反步法 (Adaptive Backstepping)](methods/097-AdaptBackstepping.md) — 在反步递推李雅普诺夫函数中同步导出未知质量参数 m̂ 的精确调节律。
- [ARC 自适应鲁棒控制 (姚斌方法)](methods/098-ARC.md) — 【带投影算子的参数自适应 + 滑模鲁棒镇定】慢变参数靠学习，突发干扰靠滑模。
- [RLS 递推最小二乘在线辨识控制](methods/099-RLS-Adaptive.md) — 利用带遗忘因子 λ 的协方差矩阵 P(k) 实时递推最小二乘辨识系统参数并配置控制器。
- [Nussbaum 未知控制方向自适应](methods/100-Nussbaum-Gain.md) — 利用偶对称高频振荡 Nussbaum 函数 χ²cos(χ)，在甚至连执行器正反接都未知时自动寻向镇定！
- [Slotine-Li 复合自适应控制 (Composite Adaptive)](methods/159-Composite-MRAC.md) — 同时利用状态跟踪误差 e_m 与滤波预测建模误差 ε_pred 双重信息源驱动参数自适应更新！

## 10. 数据驱动与智能仿生控制

- [Mamdani 二维纯模糊控制 (Fuzzy Logic)](methods/101-Fuzzy.md) — 无需数学模型，基于二维模糊论域(e, ec)隶属度函数、9条专家规则与重心法解模糊。
- [RBF径向基神经网络补偿控制](methods/102-Neural-RBF-ADRC.md) — 布置5个高斯径向基神经元节点，根据跟踪残差在线BP更新权值以逼近未知非线性动态。
- [MFAC 紧格式无模型自适应控制 (侯忠生)](methods/103-MFAC.md) — 仅利用受控系统的在线I/O数据实时估计伪偏导数(PPD) φ(k)，不依赖任何物理模型结构。
- [U-Model 多项式求根控制](methods/104-U-Model.md) — 将受控对象表示为关于当前控制量 u(k) 的多项式，利用牛顿-拉夫逊法在线求根。
- [ESC 正弦微扰极值寻优控制](methods/105-ESC.md) — 向控制通道注入高频微幅正弦探测波，通过相关解调提取性能梯度并自动寻优偏置力。
- [BELBIC 大脑情感学习仿生控制](methods/106-BELBIC.md) — 模拟哺乳动物大脑边缘系统(杏仁核Amygdala快速激励 + 眶额皮层OFC理性抑制)的双通道仿生控制。
- [Actor-Critic 强化学习在线控制](methods/107-Linear-Actor-Critic.md) — 基于时间差分误差(TD-Error)在线同步更新评价网络(Critic)与策略网络(Actor)。
- [CMAC 小脑模型关节控制器](methods/108-CMAC-Cerebellar.md) — Albus小脑局部感受野哈希编码学习网络，对走过的状态空间具备极速局部泛化记忆。
- [SPSA 同时扰动随机逼近控制](methods/109-SPSA-Optimizer.md) — Spall随机优化算法：每步仅用2次随机伯努利方向微扰即可估计多维参数梯度并在线寻优。
- [VRFT 虚拟参考反馈整定控制](methods/110-VRFT-DataDriven.md) — Campi纯数据驱动方法：通过测量轨迹逆推“虚拟参考信号”在线拟合理想参考传函 M(s)。

## 11. 有限时间与安全约束控制

- [PPC 规定性能漏斗控制 (Prescribed Performance)](methods/111-PPC.md) — 通过双曲对数同胚映射，保证瞬态与稳态误差严格锁死在指数收缩的粉色性能漏斗内！
- [Funnel 无模型高增益漏斗控制](methods/112-Funnel-Control.md) — Ilchmann无模型漏斗控制：增益随误差逼近漏斗边界的距离倒数自动飙升，无需对数变换。
- [Log-BLF 对数障碍李雅普诺夫控制](methods/113-BLF.md) — 构造 V = ½ ln(k_b²/(k_b²-e²))，当误差逼近安全红线 k_b 时能量与推力趋向无穷大。
- [Tan-BLF 正切型障碍李雅普诺夫控制](methods/114-Tan-BLF.md) — 利用正切函数 tan(πe²/2k_b²) 构造障碍势场，在无约束退化时与标准二次型无缝兼容。
- [时变障碍李雅普诺夫 (Time-Varying BLF)](methods/115-TimeVary-BLF.md) — 安全边界墙壁 k_b(t) 随时间动态向内收缩，强行挤压状态误差进入微小稳态邻域。
- [iBLF 积分型障碍李雅普诺夫控制](methods/116-Integral-BLF.md) — 通过积分构造直接在原始状态空间施加非对称位置约束，并约束积分器防过充。
- [CBF-CLF 控制障碍函数安全滤波 (Ames)](methods/117-CBF-QP.md) — 通过控制障碍函数(CBF)不等式约束在线修正名义控制器，实现最小侵入式安全防护！
- [CFTC 连续分数次幂有限时间控制](methods/118-CFTC.md) — Bhat-Bernstein齐次性有限时间律，利用连续分数幂次反馈实现严格有限时间停驻。
- [FxTC 双幂次固定时间控制 (Fixed-Time)](methods/119-FxTC.md) — Polyakov固定时间理论：结合超线性高次幂(p/q>1)与次线性低次幂(r/s<1)，收敛时间上界与初值无关！
- [PTC 预设时间时变增益控制 (Prescribed-Time)](methods/120-PTC.md) — Song预设时间控制：你可以像定闹钟一样直接指定收敛死限时间 T_p，系统必定准时归零！

## 12. 时滞补偿、网络化与高阶前沿

- [ZV 输入整形消振控制 (Input Shaping)](methods/121-InputShaping.md) — 利用系统固有谐振周期将阶跃指令分裂为两波脉冲，通过半周期反相干涉彻底抵消残余振动！
- [Posicast 半周期阶跃分裂前馈](methods/122-Posicast.md) — Otto Smith 1957年经典消振术：根据超调衰减比切分输入指令，抑制欠阻尼二阶系统超调。
- [Smith 预估器纯滞后补偿 (Smith Predictor)](methods/123-SmithPredict.md) — 在控制器内部并联运行无时延模型与含时延模型，将纯时间滞后剥离出闭环特征方程。
- [Artstein 分布卷积积分时滞降阶控制](methods/124-Artstein-Reduction.md) — 通过有限分布卷积积分预测未来 τ 秒后的状态 z(t)，将输入时滞系统精确还原为无时滞系统！
- [TDC 时间延迟估计控制 (Time-Delay Control)](methods/125-TDC.md) — Youcef-Toumi方法：直接用上一采样拍的输入与加速度差额抵消全部未知非线性与扰动。
- [IMC 内模控制架构 (Internal Model Control)](methods/126-IMC.md) — Morari经典内模结构：仅当实际对象输出与内部并行模型输出不一致时才触发反馈校正。
- [ILC 迭代学习控制 (Iterative Learning)](methods/127-ILC.md) — Arimoto迭代学习律：记忆上一周期同一时刻的轨迹误差，逐轮修正前馈记忆表实现零误差！
- [RC 重复控制 (Repetitive Control)](methods/128-Repetitive.md) — 基于周期延迟正反馈环 Q(s)e^{-Ls} 的内模实现，专门清剿周期性重复脉动与谐波误差。
- [Gain-Scheduling 非线性增益调度控制](methods/129-GainSched.md) — 根据当前工况距离调度变量 α(|e|)，在远端激进增益与近端平稳增益间平滑插值。
- [Switched 驻留时间多李雅普诺夫切换控制](methods/130-Switched.md) — 在快速轻阻尼子控制器与慢速重阻尼子控制器之间按最小驻留时间(Dwell-Time)调度。
- [动态复平面极点游走配置 (Dynamic Pole)](methods/131-DynPole.md) — 闭环极点随误差减小自动向复平面左半深处游走，兼顾启动防饱和与到位高刚度。
- [ETC 事件触发网络化控制 (Tabuada)](methods/132-ETC.md) — 仅当测量误差漂移超过相对阈值 σ|e|+ε₀ 时才通过网络更新控制量，其余时刻零阶保持！
- [ET-MPC 事件触发滚动预测控制](methods/133-Event-Triggered-MPC.md) — 仅当实际轨迹偏离预测轨迹超过门槛 et_limit 时才唤醒CPU重算MPC优化问题。
- [量化截断有限比特网络控制 (Quantized)](methods/134-Quantized-Ctrl.md) — 模拟低比特率数字通信信道，控制指令被量化器强制截断为离散阶梯电平时仍保持稳定。
- [扩展龙伯格观测器状态反馈 (E-Luenberger)](methods/135-Extended-Luenberger.md) — 通过一阶雅可比线性化构建确定性全维状态观测器，重构无噪速度与位移状态。
- [EKF 扩展卡尔曼滤波状态反馈](methods/136-EKF-Ctrl.md) — 非线性随机状态估计标杆，利用过程噪声与测量噪声协方差比值动态调整滤波增益。
- [PF 蒙特卡洛粒子滤波反馈控制](methods/137-Particle-Filter.md) — 在状态空间散布随机粒子群并通过似然权重重采样估计真实状态，专克非高斯强噪声。
- [FO-PD 分数阶微积分控制 (Fractional-Order)](methods/138-FO-PD.md) — 基于 Grünwald-Letnikov 分数阶微积分定义，实现非整数阶 D^μ (0<μ<1.5) 连续相位整形。
- [分数次幂扩张观测自抗扰 (Power-ESO ADRC)](methods/139-Nonlinear-Power-ADRC.md) — 在扩张状态观测器中使用齐次分数次幂项 |e_o|^α sgn(e_o)，实现有限时间扰动收敛。
- [隐式欧拉无条件稳定离散滑模 (Implicit Euler)](methods/140-Implicit-Euler-Ctrl.md) — 采用后向隐式欧拉离散化格式求解控制律，彻底消除显式数字滑模因采样步长导致的数值抖振！
- [Lorenz 混沌吸引子流形耦合控制](methods/141-Lorenz-Coupled.md) — 内置三维洛伦兹(Lorenz)混沌微分方程，演示非线性混沌流形注入与混沌抑制镇定。
- [Fradkov 速度梯度法控制 (Speed-Gradient)](methods/142-Speed-Gradient.md) — 俄罗斯控制学派经典：令控制量沿目标能量泛函时间导数(速度)的负梯度方向演化。

## 专题导读

- [一键最优增益求解原理](guides/001-最优增益求解原理.md) — 以理论解析种子为起点，用 ITAE/ISE/超调/能耗复合泛函在参数盒约束内做多尺度坐标模式搜索，为 159 种控制器自动求出一组可直接上机的增益。

---

共 159 讲 + 1 篇专题，按 `H` 在实验台内阅读。
