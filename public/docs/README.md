# 控制方法 · 教学文档索引

> 每法一份面向初学者的教学讲稿：生活类比 → 被控对象 → 为什么需要它 → 一步步推导 → 算例 → 参数怎么调 → 局限与陷阱 → 延伸阅读。
> 全部公式为 TeX 语法，编号由 `	ag` 渲染在公式右侧；推导为直观推导与设计思路，不是严格数学证明。

**本目录的正文唯一来源是 `methods/*.md`**；阅读器读取的是同一份内容（由 `node tools/build-docs.js` 打包为 `public/js/docs-content.js`），因此不需要、也不再生成任何汇总副本。

也可以直接在实验台中按 `H` 或点「教学文档」按钮打开阅读器，无需阅读这些文件。

## 01. 经典线性体系

- [开环前馈 (Open Loop)](methods/01-OpenLoop.md) — 无反馈，遇干扰即失效。
- [P控制 (比例)](methods/02-P.md) — 输出与误差成正比，存在稳态误差。
- [PI控制 (比例-积分)](methods/03-PI.md) — 消除稳态误差，但增加超调。
- [PD控制 (比例-微分)](methods/04-PD.md) — 微分相当于电子阻尼，减少超调。
- [PID控制 (比例-积分-微分)](methods/05-PID.md) — 工业万金油，综合快、准、稳。
- [I-PD (微分先行PID)](methods/06-IPD.md) — P和D仅作用于状态，避免指令突变冲击。
- [二自由度 PID](methods/07-2DOF-PID.md) — 前馈系数独立优化跟踪能力，削弱超调。
- [增量式 PID](methods/08-IncPID.md) — 自带抗积分饱和特性。
- [PI-D 控制](methods/09-PI-D.md) — D仅作用于反馈测量避免突变，P和I作用于误差。
- [串级 PID (Nested PID)](methods/10-Nested-PID.md) — 外环控位置算基准速度，内环控速度算最终推力。

## 02. 频域与最优理论

- [极点配置 (状态反馈)](methods/11-PolePlacement.md) — 将闭环极点配置到期望位置。
- [LQR (线性二次型最优)](methods/12-LQR.md) — 最小化状态偏差和能量消耗代价函数。
- [LQG (包含卡尔曼滤波)](methods/13-LQG.md) — 在测量噪声中利用卡尔曼滤波器提取最佳状态反馈。
- [带积分 LQR (LQI)](methods/14-LQR-I.md) — 最正宗的无静差状态反馈，将状态扩维加入积分误差向量。
- [MPC (模型预测控制)](methods/15-MPC.md) — 预测未来系统轨迹并在线优化求解。
- [无差拍控制 (Deadbeat)](methods/16-Deadbeat.md) — 极点配置在Z域原点，试图最少步数内消除误差。
- [H-∞ 鲁棒状态反馈](methods/17-H-Infinity.md) — 基于黎卡提方程设计，最小化无穷范数抑制干扰。
- [QFT / 超前-滞后补偿](methods/18-QFT-LeadLag.md) — 定量反馈设计，提升系统频域相位裕度。
- [内模原理伺服控制 (IMP)](methods/19-IMP-Servo.md) — 增广方程引入指令积分，保证绝对无静差跟踪。
- [预见控制 (Preview Control)](methods/20-Preview.md) — 利用未来已知目标，提前动作。

## 03. 非线性结构控制

- [Bang-Bang 控制](methods/21-BangBang.md) — 极粗暴双位控制，产生极限环震荡。
- [死区比例 BangBang](methods/22-BangBang-Zone.md) — 远端全开，进入设定区域后平滑切换为比例控制防震。
- [滞回继电控制 (Relay)](methods/23-Relay.md) — 引入死区滞回区间，消除高频抖振。
- [时间最优相平面法](methods/24-TimeOptimal.md) — 利用相平面切换曲线。
- [反馈线性化 (计算力矩)](methods/25-FeedbackLin.md) — 抵消不利动态，嵌入期望阻尼响应。
- [反步法 (Backstepping)](methods/26-Backstepping.md) — 构造李雅普诺夫虚拟控制律，全局稳定。
- [动态面控制 (DSC)](methods/27-DSC.md) — 一阶低通虚拟面滤波器解决“微分爆炸”。
- [时间延迟控制 (TDC)](methods/28-TDC.md) — 利用极小时间延迟数据抵消未知动态。
- [非线性阻尼控制 (NDC)](methods/29-NDC.md) — 注入非线性阻尼项 e²v，大误差大阻尼。
- [连续有限时间控制 (CFTC)](methods/30-CFTC.md) — 连续分数次幂反馈，严格有限时间内到达0。

## 04. 滑模变结构家族

- [传统滑模控制 (SMC)](methods/31-SMC.md) — 严格等效控制结合切换项。绝对鲁棒，但有高频抖振。
- [指数趋近律滑模](methods/32-VSC-RL.md) — 配置滑动面指数导数，平滑到达相。
- [积分滑模控制 (ISMC)](methods/33-ISMC.md) — 引入积分项消除到达相，全程鲁棒。
- [终端滑模控制 (TSMC)](methods/34-TSMC.md) — 引入分式次幂滑动面，有限时间内绝对收敛至零。
- [快速终端滑模 (FTSMC)](methods/35-FTSMC.md) — 结合线性与非线性终端滑模，远端快速近端有限。
- [自适应滑模控制](methods/36-ASMC.md) — 根据滑动面动态自适应调节切换增益。
- [超螺旋滑模 (2阶SMC)](methods/37-SuperTwisting.md) — 将高频切换隐藏在积分项内部，极大削弱抖振。
- [Levant 鲁棒精确微分滑模](methods/38-LevantHOSM.md) — 通过高阶滑模精确微分器无延迟滤除噪声提取理想导数。
- [变增益滑模 (Variable-Gain SMC)](methods/39-VariableG-SMC.md) — 切换增益非恒定，基于状态范数动态扩张。
- [抗饱和 PI (Anti-Windup PI)](methods/40-AW-PI.md) — 遇限幅时切断积分通道，经典钳位反算算法。

## 05. 数据驱动与智能

- [韩氏非线性 PID](methods/41-NPID.md) — 利用 fal 函数实现“小误差大增益，大误差小增益”。
- [MRAC (模型参考自适应)](methods/42-MRAC.md) — 在线自适应调整参数，追踪预设理想模型。
- [自校正调节器 (STR)](methods/43-STR.md) — 在线辨识系统环境参数，实时求解极点配置。
- [无模型自适应 (MFAC)](methods/44-MFAC.md) — 引入广义误差面解决二阶物理系统纯积分导致的发散问题。
- [超局部智能 PID (iPID)](methods/45-iPID.md) — 在线估计极复杂动态项并直接代数对消。
- [U-Model 动力学求根](methods/46-U-Model.md) — Newton-Raphson 迭代法在线实时求解控制多项式的根。
- [极值寻优控制 (ESC)](methods/47-ESC.md) — 注入探测正弦波实时计算成本梯度寻优。
- [大脑情感仿生控制 (BELBIC)](methods/48-BELBIC.md) — 哺乳动物边缘系统神经模型，纯正仿生学。
- [线性 Actor-Critic (RL)](methods/49-Linear-Actor-Critic.md) — 在线自适应评价与动作策略更新。修正版 DDPG 概念。
- [基于梯度在线 PID (代IFT)](methods/50-Gradient-PID.md) — 利用在线计算的误差敏感度(梯度)动态调整 PID 参数。

## 06. 融合与复合架构

- [DOB (扰动观测器框架)](methods/51-DOB.md) — 【逆模型 + PD】估算外部总扰动直接补偿。
- [内模控制 (IMC)](methods/52-IMC.md) — 引入过程模型逆，对修正后的对象按 PID 整定。
- [LADRC (线性自抗扰)](methods/53-ADRC.md) — 【LESO + LSEF】视未知为总扰动进行观测对消。
- [NL-ADRC (非线性自抗扰)](methods/54-NL-ADRC.md) — 【NLESO+NLSEF】全盘非线性fal函数榨取抗扰极限。
- [自适应鲁棒控制 (ARC)](methods/55-ARC.md) — 【自适应 + 滑模】参数在线学习，高频干扰滑模镇定。
- [扩张观测器+滑模 (ESO-SMC)](methods/56-ESO-SMC.md) — 【LESO + SMC】观测器补偿90%扰动，滑模镇定残差。
- [L1 自适应控制](methods/57-L1.md) — 【极高增益自适应 + LPF】完美解耦自适应速度与鲁棒性。
- [I&I 浸入与不变自适应](methods/58-I-and-I.md) — 不要求参数收敛，仅要求目标流形收敛，瞬间跟踪极佳。
- [自适应反步法](methods/59-AdaptBackstepping.md) — 【反步+辨识】虚拟控制律严格基于Lyapunov推导参数自适应律。
- [时延估测观测器 (T-DOB)](methods/60-T-DOB.md) — 直接利用上一时刻的推力和时延微积分估测扰动。

## 07. 前沿与新型约束

- [规定性能控制 (PPC)](methods/61-PPC.md) — 非线性映射保证瞬态误差绝对锁死在指数衰减漏斗内。
- [障碍李雅普诺夫 (BLF)](methods/62-BLF.md) — 状态逼近安全边界 $k_b$ 时，控制力趋于无穷。
- [事件触发控制 (ETC)](methods/63-ETC.md) — 为节省带宽区间保持力度，表现为锯齿状掉落-拉回。
- [切换系统/驻留时间 (Switched)](methods/64-Switched.md) — 多控制器利用李雅普诺夫衰减和驻留时间强硬调度。
- [动态极点配置](methods/65-DynPole.md) — 根据误差游走复平面极点。误差大退守，小则深埋光速收敛。
- [预设时间控制 (PTC)](methods/66-PTC.md) — 硬核承诺！无论初始状态如何，保证在指定的绝对时间内收敛。
- [固定时间控制 (FxTC)](methods/67-FxTC.md) — 无论初值多大，收敛时间永远存在一个固定的理论上界。
- [正切障碍李雅普诺夫](methods/68-Tan-BLF.md) — 利用正切函数制造无穷边界，处理全状态约束。
- [时变障碍李雅普诺夫](methods/69-TimeVary-BLF.md) — 墙壁像液压机一样不断向内压缩，逼迫状态强行收敛。
- [积分障碍李雅普诺夫](methods/70-Integral-BLF.md) — 给积分器套上枷锁，防止普通抗饱和算法中的反算延迟。

## 08. 轨迹规划与学习

- [输入整形控制 (ZV Shaper)](methods/71-InputShaping.md) — 利用固有频率延时裂变脉冲指令，相消干涉彻底抹除震荡。
- [迭代学习控制 (ILC)](methods/72-ILC.md) — 每次目标跳变视为一轮新Trial，利用上一轮同时间点误差叠加控制增量。
- [重复控制 (RC)](methods/73-Repetitive.md) — 内模原理离散实现，通过延迟线记忆周期误差并反相叠加补偿。
- [增益调度控制 (Gain Scheduling)](methods/74-GainSched.md) — 在“激进”与“保守”两组参数间极其平滑地非线性插值。
- [史密斯预估补偿 (Smith Predictor)](methods/75-SmithPredict.md) — 利用模型将纯大滞后时间剥离出反馈死循环。
- [Posicast 前馈补偿](methods/76-Posicast.md) — 利用开环半周期衰减阶跃技术切分输入指令波。
- [模糊 PID](methods/77-FuzzyPID.md) — 用 3×3 规则库与重心法解模糊，在 PID 输出上叠加在线微调项。
- [神经元自适应 PID](methods/78-NeuralPID.md) — 【Hebbian神网 + PID】无监督学习在线自动进化权重。
- [纯模糊控制 (Fuzzy)](methods/79-Fuzzy.md) — 以误差 e 与误差变化率 ec 为输入的双输入单输出模糊控制器，含模糊化与清晰化。
- [能量成型 (IDA-PBC)](methods/80-EnergyShaping.md) — 【哈密顿结构重塑】修改等效势能并注入非线性阻尼。

## 09. 鲁棒与现代预测

- [管式模型预测 (Tube MPC)](methods/81-TubeMPC.md) — 将名义MPC轨迹包裹在一个“鲁棒不变管”中，名义规划，局部镇定。
- [状态相关黎卡提方程 (SDRE)](methods/82-SDRE.md) — LQR的非线性完全体。在线实时求解参数依赖的 ARE。
- [广义预测控制 (GPC)](methods/83-GPC.md) — 基于 CARIMA 离散传递函数模型的长时间尺预测算子。
- [在线RLS辨识自适应 (代VRFT)](methods/84-RLS-Adaptive.md) — 用递推最小二乘法（RLS）在线辨识模型参数，再反求控制器增益。
- [鲁棒边界阻尼控制 (代H∞)](methods/85-Robust-NL-Damping.md) — 处理有界不确定性，在无法解黎卡提方程时给出的降级替代方案。
- [非线性扰动观测器 (NDOB)](methods/86-NDOB.md) — 基于李代数设计的全非线性观测器，无需系统逆模型即可精确估算。

## 10. 观测器与网络拓扑

- [扩展龙伯格观测 (E-Luenberger)](methods/87-Extended-Luenberger.md) — 非线性系统线性化。在线雅可比矩阵求导后使用线性观测。
- [扩展卡尔曼反馈 (EKF-Ctrl)](methods/88-EKF-Ctrl.md) — 不仅过滤噪声，还能在线把未知的干扰 d 作为一个增广状态给过滤出来。
- [粒子滤波反馈 (PF-Ctrl)](methods/89-Particle-Filter.md) — 撒出成百上千个“粒子”在空间里试探，利用蒙特卡洛统计重采样出真实状态。
- [RBF神网自抗扰 (代伪Neural)](methods/90-Neural-RBF-ADRC.md) — 布置 5 个高斯径向基中心点，用网络输出与 ESO 残差做在线更新。
- [Artstein 模型降阶补偿](methods/91-Artstein-Reduction.md) — 针对纯通讯迟延，用分布积分法把延迟环节从闭环中约掉。
- [量化截断防网络阻塞](methods/92-Quantized-Ctrl.md) — 极度贫瘠的信道带宽！控制力不能是连续的，必须被强制向下取整为粗糙的阶梯量阶。
- [事件触发 MPC 算力卸载](methods/93-Event-Triggered-MPC.md) — MPC 每算一次算力消耗巨大。设定一个门槛，没越过门槛就坚决套用上一轮的预判残羹。

## 11. 高阶与物理前沿

- [分数阶 PD 控制 (FO-PD)](methods/94-FO-PD.md) — 微积分项不再是整数 1，允许极其细腻的超前相位配置。利用 G-L 近似求解。
- [非线性次幂自抗扰 (原分数阶)](methods/95-Nonlinear-Power-ADRC.md) — ESO 用分数次幂驱动扩张状态，对扰动起始阶段更敏感。
- [隐式欧拉离散控制](methods/96-Implicit-Euler-Ctrl.md) — 专为计算机仿真破局！通过后向欧拉差分，即使增益无穷大也绝不发散。
- [洛伦兹强迫反馈 (原混沌同步)](methods/97-Lorenz-Coupled.md) — 把洛伦兹混沌方程组嵌入误差状态的反馈通道，产生有界但持续不断的激励。
- [速度梯度法 (Speed-Gradient)](methods/98-Speed-Gradient.md) — 俄国流派经典。强制控制变量沿着系统局部能量函数的负梯度滑落。
- [反馈无源化 (Feedback Passivation)](methods/99-Feedback-Passivation.md) — 用前置力矩将原本不耗散的系统“伪装”成一个自带能量耗散的无源体，再施加阻尼。

---

共 99 讲，按 `H` 在实验台内阅读。
