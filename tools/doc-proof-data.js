'use strict';
/* ============================================================
   tools/doc-proof-data.js — 「五、稳定性证明」的证明原型库
   每个原型给出一套完整的 Lyapunov 论证：误差方程、候选函数、
   沿轨迹导数、结论与适用边界。build-doc-proof.js 按方法 key
   选择原型，并把第 4 章真正使用的控制律公式嵌进证明开头。
   ============================================================ */

const raw = String.raw;

const ARCH = {
  /* ── PID 族：二阶误差能量 ── */
  pd2: {
    error: raw`目标 $r$ 恒定时 $e=r-x$、$\dot e=-\dot x$、$\ddot e=-\ddot x$。把控制律代入对象方程 $m\ddot x+c\dot x+kx=u$，消去 $x$ 得误差方程

$$ m\ddot e+(c+K_d)\dot e+(k+K_p)e=0 \tag{5.1} $$`,
    V: raw`取「动能 + 等效势能」作为候选：

$$ V=\tfrac12 m\dot e^{2}+\tfrac12(k+K_p)e^{2} \tag{5.2} $$

第一项是误差速度对应的动能，第二项是闭环等效弹簧的势能。只要 $m>0$ 且 $k+K_p>0$，$V$ 就是正定的。`,
    dV: raw`沿 (5.1) 求导：

$$ \dot V=m\dot e\ddot e+(k+K_p)e\dot e=\dot e\big[-(c+K_d)\dot e-(k+K_p)e\big]+(k+K_p)e\dot e=-(c+K_d)\dot e^{2} \tag{5.3} $$`,
    concl: raw`$\dot V\le0$，等号只在 $\dot e=0$ 时成立。由 LaSalle 不变原理，若 $\dot e\equiv0$，则 $\ddot e\equiv0$，代回 (5.1) 得 $(k+K_p)e=0$，不变集只有原点。因此 $m>0$、$k+K_p>0$、$c+K_d>0$ 时闭环全局渐近稳定。

$k+K_p=0$ 是临界情形：等效弹簧刚度为 0，误差不再被拉回，实验台上表现为等幅漂移；$k+K_p<0$ 时原点变成鞍点，对应 $K_p$ 被调到负刚度绝对值以下的发散。`,
    limit: raw`上面的结论建立在标称线性模型上。执行器一旦长期限幅，(5.1) 不再成立，能量注入不受 $\dot V\le0$ 约束；此时应把限幅视为饱和非线性，按饱和系统另行判断。测量噪声进入微分项时，$K_d$ 的有效值也会随滤波器改变。`
  },

  /* ── PID 族：带积分状态的线性闭环 ── */
  pid3: {
    error: raw`取 $\xi=[e,\ \dot e,\ z]^{\mathsf T}$，其中 $z=\int_0^t e\,\mathrm d\tau-z_\ast$ 是积分项相对稳态值的偏差。对 $m\ddot x+c\dot x+kx=u$ 求导并代入控制律，得

$$ \dot\xi=A_c\xi,\qquad A_c=\begin{bmatrix}0&1&0\\[2pt]-\dfrac{k+K_p}{m}&-\dfrac{c+K_d}{m}&-\dfrac{K_i}{m}\\[2pt]1&0&0\end{bmatrix} \tag{5.1} $$

其特征多项式为 $m s^{3}+(c+K_d)s^{2}+(k+K_p)s+K_i$，积分把系统阶数抬高了一阶。`,
    V: raw`若 $A_c$ 的全部特征值位于左半平面，则对任意 $Q\succ0$，Lyapunov 方程

$$ A_c^{\mathsf T}P+PA_c=-Q \tag{5.2} $$

有唯一正定解 $P$。取 $V=\xi^{\mathsf T}P\xi$，它是三个误差状态的加权平方和。`,
    dV: raw`$$ \dot V=\xi^{\mathsf T}(A_c^{\mathsf T}P+PA_c)\xi=-\xi^{\mathsf T}Q\xi\le-\lambda_{\min}(Q)\lVert\xi\rVert^{2} \tag{5.3} $$`,
    concl: raw`由 Routh 判据，$A_c$ 稳定当且仅当

$$ c+K_d>0,\qquad k+K_p>0,\qquad (c+K_d)(k+K_p)>mK_i \tag{5.4} $$

三条同时成立时 $\dot V$ 负定，原点指数稳定，而且衰减速率不慢于 $\lambda_{\min}(Q)/(2\lambda_{\max}(P))$。第三条是积分增益的硬上限：它把 $K_i$、$K_p$、$K_d$ 三者的关系锁在一起。`,
    limit: raw`若 $K_i$ 越过 (5.4) 的第三条，$A_c$ 出现右半平面复根，$V$ 沿轨迹增大，实验台上表现为等幅振荡或发散。抗饱和、积分分离、变速积分改变的是积分状态的瞬态路径，不改变小信号下的这三条判据；只有在积分被完全冻结时，才退化为二阶情形。`
  },

  /* ── 串级：内环快、外环慢 ── */
  cascade: {
    error: raw`记外环误差 $e_o=r-x$、内环误差 $e_i=x_i^{\text{ref}}-x_i$。内环闭环带宽 $\omega_i$ 远高于外环 $\omega_o$ 时，内环可近似为一阶惯性

$$ \frac{x_i}{x_i^{\text{ref}}}=\frac{1}{\tau_i s+1},\qquad \tau_i=\frac{1}{\omega_i} \tag{5.1} $$

外环看到的等效对象因此比原对象「慢半拍」，但不再有内环的高频振荡。`,
    V: raw`取两环能量之和

$$ V=\tfrac12 e_o^{2}+\tfrac12 e_i^{2} \tag{5.2} $$`,
    dV: raw`外环按 $\dot e_o=-\omega_o e_o+\delta_i$ 设计，其中 $\delta_i$ 是内环跟踪残差；内环按 $\dot e_i=-\omega_i e_i$ 设计。于是

$$ \dot V=-\omega_o e_o^{2}-\omega_i e_i^{2}+e_o\delta_i\le-\omega_o e_o^{2}-\omega_i e_i^{2}+\tfrac12 e_o^{2}+\tfrac12\delta_i^{2} \tag{5.3} $$`,
    concl: raw`当 $\omega_i\ge3\omega_o$ 时，$\delta_i$ 在一个外环时间常数内衰减到 $O(\tau_i)$，交叉项被 $-\omega_o e_o^{2}$ 吸收，$\dot V$ 负定。结论是：只要内环比外环快 3～5 倍，两环可以分开设计，外环按等效一阶对象整定即可。

这也解释了实验台上的现象：内环增益不足时，外环无论怎么调都会抖；内环足够快时，外环增益才有意义。`,
    limit: raw`「内环快」不是无条件的。内环增益受执行器限幅与测量噪声限制，$\omega_i$ 不可能无限提高；当 $\omega_i$ 接近采样频率的十分之一时，离散化带来的相位滞后会破坏上述近似。此时应按采样系统重新分析，而不能继续加内环增益。`
  },

  /* ── 死区：区内只有实用稳定 ── */
  deadzone: {
    error: raw`死区内的控制量保持不变，误差只由对象自身 dynamics 决定；死区外仍按线性律收敛。以 $|e|>d$ 的外区为例，误差方程与 (5.1) 同形，只是右端多了一个常值偏置。`,
    V: raw`仍取

$$ V=\tfrac12 m\dot e^{2}+\tfrac12(k+K_p)e^{2} \tag{5.1} $$`,
    dV: raw`外区：

$$ \dot V=-(c+K_d)\dot e^{2}\le0 \tag{5.2} $$

内区 ($|e|\le d$)：控制量冻结，$\dot V$ 不再保证负，只能由对象阻尼耗散能量。`,
    concl: raw`外区渐近收敛，轨迹进入 $|e|\le d$ 后控制不再动作，误差停在死区之内。因此严格说法是**实用稳定**（practical stability）：终态满足 $|e|\le d$，而不是 $e\to0$。

死区的作用是牺牲一点稳态精度换取执行器不来回抖动。$d$ 越大，抖振越少，残余误差带越宽；这是同一个参数的两面。`,
    limit: raw`若对象存在持续外扰，死区内的误差可能被推到边界后再触发控制，形成低频极限环。判断方法是看控制力是否以远低于控制带宽的频率通断；若是，应减小 $d$ 或改用带滞环的切换。`
  },

  /* ── 非线性 PID：fal 函数 ── */
  nlpid: {
    error: raw`非线性 PID 把线性误差换成 $fal(e,\alpha,\delta)$：小误差区线性、大误差区次线性。误差方程仍为二阶，但增益随 $|e|$ 变化：

$$ m\ddot e+(c+K_d)\dot e+(k+K_p)e=-K_p\big[fal(e,\alpha,\delta)-e\big] \tag{5.1} $$`,
    V: raw`仍取二次型 $V=\tfrac12 m\dot e^{2}+\tfrac12(k+K_p)e^{2}$。`,
    dV: raw`$$ \dot V=-(c+K_d)\dot e^{2}-K_p\,e\,fal(e,\alpha,\delta) \tag{5.2} $$

$fal$ 与 $e$ 同号，故 $e\,fal(e,\alpha,\delta)>0$（$e\ne0$）。`,
    concl: raw`$\dot V<0$ 对一切 $e\ne0$ 成立，闭环渐近稳定；在 $|e|<\delta$ 的小误差区，$fal$ 退化为线性，收敛是指数的，因而不会在原点附近产生极限环。

大误差区 $fal$ 的指数 $\alpha<1$ 使等效增益低于线性增益，这就是它对大阶跃更「柔和」的原因：牺牲一点初始收敛速度，换取更小的超调与更低的饱和风险。`,
    limit: raw`$fal$ 在 $|e|=\delta$ 处导数不连续，严格证明需要分段讨论；工程上更关心的是 $\alpha$ 与 $\delta$ 的选取——$\delta$ 过小会让噪声进入非线性区，$\alpha$ 过小会让大误差区的推力不足。`
  },

  /* ── 频域补偿器 ── */
  linear_comp: {
    error: raw`设对象 $P(s)=\dfrac{1}{ms^{2}+cs+k}$、补偿器 $C(s)=\dfrac{N_c(s)}{D_c(s)}$，闭环特征多项式为

$$ a(s)=D_p(s)D_c(s)+N_p(s)N_c(s) \tag{5.1} $$

它的阶数等于对象与补偿器阶数之和。`,
    V: raw`把闭环写成状态空间 $\dot\xi=A_{cl}\xi$。若 $a(s)$ 的根全在左半平面，则存在 $P\succ0$ 使 $A_{cl}^{\mathsf T}P+PA_{cl}=-Q$；取 $V=\xi^{\mathsf T}P\xi$。`,
    dV: raw`$$ \dot V=-\xi^{\mathsf T}Q\xi\le0 \tag{5.2} $$`,
    concl: raw`$a(s)$ 满足 Routh–Hurwitz 条件时闭环渐近稳定。频域上与之等价的说法是：开环 $C(j\omega)P(j\omega)$ 的相位裕度 $\gamma_m>0$、增益裕度 $g_m>1$。两种判据一个看根、一个看曲线，结论必须一致——若不一致，通常是把开环与闭环的传递函数搞混了。

补偿器的作用是把 $a(s)$ 的根往左推：超前网络抬高相位、允许更高的截止频率；滞后网络压低低频增益、换取稳态精度。它们改变的都是 $a(s)$ 的系数，不改变「根在左半平面」这一稳定本质。`,
    limit: raw`Routh 判据只对线性定常模型有效。纯滞后 $e^{-\tau s}$ 不是多项式，必须用 Padé 近似或频域裕度判断；对象参数摄动会移动 $a(s)$ 的根，标称稳定不等于摄动后仍稳定，后者需要 Kharitonov 或 $\mu$ 分析。`
  },

  /* ── 开环前馈 ── */
  openloop: {
    error: raw`开环控制 $u=kr$ 不含反馈。令 $e=r-x$，对象方程变为

$$ m\ddot e+c\dot e+ke=0 \tag{5.1} $$

误差的演化完全由对象自身的极点决定。`,
    V: raw`取 $V=\tfrac12 m\dot e^{2}+\tfrac12 ke^{2}$。`,
    dV: raw`$$ \dot V=m\dot e\ddot e+ke\dot e=\dot e(-c\dot e-ke)+ke\dot e=-c\dot e^{2}\le0 \tag{5.2} $$`,
    concl: raw`$c>0$、$k>0$ 时由 LaSalle 不变原理得 $e\to0$：标称工况下开环控制确实能把误差送回零。但这个结论非常脆弱——它依赖「模型恰好准确」这一前提。

只要对象增益偏离 $k$，稳态误差就变成 $e_{ss}=r\,(1-k/\hat k)$；存在常值外扰 $d$ 时，误差被拉到 $d/k$。反馈之所以必要，不是因为它能收敛得更快，而是因为它把「收敛」这件事从「模型准确」变成「增益足够」。`,
    limit: raw`开环没有可调的回馈通路，Lyapunov 函数里的 $\dot V$ 与控制器增益无关，因而无法通过加大增益改善抗扰。把它当作基准可以，当作工程方案不行。`
  },

  /* ── 状态反馈：极点配置 ── */
  statefb: {
    error: raw`把对象写成 $\dot x=Ax+Bu$，控制律 $u=-Kx$ 代入后得

$$ \dot x=(A-BK)x \tag{5.1} $$

极点配置的任务就是选 $K$，使 $A-BK$ 的特征值落在期望位置。`,
    V: raw`若 $A-BK$ 的全部特征值位于左半平面，则对任意 $Q\succ0$，方程

$$ (A-BK)^{\mathsf T}P+P(A-BK)=-Q \tag{5.2} $$

有唯一正定解。取 $V=x^{\mathsf T}Px$。`,
    dV: raw`$$ \dot V=x^{\mathsf T}\big[(A-BK)^{\mathsf T}P+P(A-BK)\big]x=-x^{\mathsf T}Qx\le-\lambda_{\min}(Q)\lVert x\rVert^{2} \tag{5.3} $$`,
    concl: raw`$(A,B)$ 可控时，$K$ 可以把 $A-BK$ 的极点放到任意位置；只要放的位置全在左半平面，$\dot V$ 就负定，原点指数稳定。极点越靠左，$\lambda_{\min}(Q)$ 相对 $\lambda_{\max}(P)$ 越大，收敛越快，但控制量峰值也越大。

这条证明同时说明了极点配置的边界：可控性是前提。若某个模态不可控，$K$ 无法改变它对应的特征值，Lyapunov 方程也不会有正定解。`,
    limit: raw`证明假设状态 $x$ 全部可测。实际系统往往只有部分状态可测，此时需要观测器，稳定性由分离原理另行保证。此外，极点放得过于靠左会让 $K$ 很大，执行器饱和后线性结论失效。`
  },

  /* ── LQR ── */
  lqr: {
    error: raw`LQR 从代价函数出发：

$$ J=\int_0^\infty\big(x^{\mathsf T}Qx+u^{\mathsf T}Ru\big)\,\mathrm dt \tag{5.1} $$

最优控制为 $u=-R^{-1}B^{\mathsf T}Px$，其中 $P$ 是代数 Riccati 方程的解。`,
    V: raw`$$ A^{\mathsf T}P+PA-PBR^{-1}B^{\mathsf T}P+Q=0 \tag{5.2} $$

当 $(A,B)$ 可控、$Q\succeq0$、$R\succ0$ 时，该方程有唯一正定解 $P$。取

$$ V=x^{\mathsf T}Px \tag{5.3} $$

它恰好是最优代价的当前值 $J^\ast(x_0)$。`,
    dV: raw`沿闭环 $\dot x=(A-BR^{-1}B^{\mathsf T}P)x$ 求导，并用 (5.2) 消去 $A^{\mathsf T}P+PA$：

$$ \dot V=-x^{\mathsf T}\big(Q+PBR^{-1}B^{\mathsf T}P\big)x\le-x^{\mathsf T}Qx \tag{5.4} $$`,
    concl: raw`$\dot V\le-\lambda_{\min}(Q)\lVert x\rVert^{2}$，闭环指数稳定。这个证明比极点配置更进一层：$V$ 不只是一个人为选定的函数，它就是最优代价，因此「最优」与「稳定」在同一式子里同时成立。

$Q/R$ 的比值决定收敛速度与能量消耗的折衷：$Q$ 相对 $R$ 越大，$P$ 越大，$K$ 越大，响应越快，但 $u$ 的峰值也越高。`,
    limit: raw`Riccati 方程的解依赖精确模型。对象参数偏离时，按标称模型算出的 $P$ 不再是最优代价，但只要闭环 $A-BK$ 仍 Hurwitz，稳定性就还在——这是 LQR 的一个有用性质：次优但稳定。若 $Q$ 半正定且 $(Q^{1/2},A)$ 不可观测，则只能保证 Lyapunov 稳定，需用 LaSalle 补足。`
  },

  /* ── LQG：控制器 + 观测器 ── */
  lqg: {
    error: raw`LQG 由两部分组成：状态反馈 $u=-K\hat x$ 与卡尔曼观测器 $\dot{\hat x}=A\hat x+Bu+L(y-C\hat x)$。令状态误差 $e_o=x-\hat x$，则

$$ \dot x=(A-BK)x+BKe_o,\qquad \dot e_o=(A-LC)e_o \tag{5.1} $$

两个误差通道通过 $BKe_o$ 耦合。`,
    V: raw`取

$$ V=x^{\mathsf T}P_cx+e_o^{\mathsf T}P_oe_o \tag{5.2} $$

其中 $P_c$、$P_o$ 分别满足控制与观测的 Lyapunov 方程。`,
    dV: raw`$$ \dot V=-x^{\mathsf T}Q_cx-e_o^{\mathsf T}Q_oe_o+2x^{\mathsf T}P_cBKe_o \tag{5.3} $$

交叉项由 Young 不等式吸收：$2x^{\mathsf T}P_cBKe_o\le x^{\mathsf T}Q_cx+\lambda_{\max}(K^{\mathsf T}B^{\mathsf T}P_cQ_c^{-1}P_cBK)\,e_o^{\mathsf T}e_o$。`,
    concl: raw`只要观测器增益 $L$ 选得使 $A-LC$ 的极点比 $A-BK$ 快 3～5 倍，交叉项就被观测误差的衰减吞掉，$\dot V$ 负定。这就是分离原理的 Lyapunov 版本：控制器与观测器可以分开设计，前提是观测器足够快。

卡尔曼滤波给出的 $L$ 由噪声协方差决定，它在「观测器够快」与「噪声放大可接受」之间取平衡。`,
    limit: raw`分离原理对线性系统成立，对饱和、量化、非线性对象不自动成立。观测器过快会放大测量噪声，使 $u$ 抖动；实验台上应同时看估计误差与纹波，而不是只看位置曲线。`
  },

  /* ── 无差拍：有限步到达 ── */
  deadbeat: {
    error: raw`离散对象 $x_{k+1}=Ax_k+Bu_k$，无差拍控制选 $u_k=-Kx_k$ 使

$$ A_{cl}=A-BK,\qquad A_{cl}^{N}=0 \tag{5.1} $$

即闭环矩阵幂零，$N$ 步后状态精确到达原点。`,
    V: raw`取离散 Lyapunov 函数 $V_k=x_k^{\mathsf T}Px_k$，$P\succ0$，并令

$$ A_{cl}^{\mathsf T}PA_{cl}-P=-Q \tag{5.2} $$

幂零矩阵的特征值全为 0，上述方程总有正定解。`,
    dV: raw`$$ V_{k+1}-V_k=-x_k^{\mathsf T}Qx_k\le0 \tag{5.3} $$`,
    concl: raw`$V_k$ 单调不增，且 $A_{cl}^{N}=0$ 保证 $x_N=0$，因此闭环在有限步内精确收敛。这是比渐近稳定更强的结论：收敛时间有确定上界 $N$。

代价是控制量。无差拍要求 $u$ 在每一步都精确抵消状态，增益通常很大，实际执行器很难跟上。`,
    limit: raw`幂零条件对模型精度极其敏感。对象参数稍有偏差，$A_{cl}$ 就不再幂零，闭环可能从「有限步收敛」退化为「慢收敛」甚至发散。采样周期越大，这种敏感性越强，因此无差拍多用于采样快、模型准的伺服场合。`
  },

  /* ── 观测器 / 扰动估计 ── */
  observer: {
    error: raw`设观测器为 $\dot{\hat x}=A\hat x+Bu+L(y-\hat y)$，估计误差 $e_o=x-\hat x$ 满足

$$ \dot e_o=(A-LC)e_o \tag{5.1} $$

扰动观测器把 $d$ 扩张为状态后，误差方程具有同样的「系统矩阵减观测增益」结构。`,
    V: raw`选 $L$ 使 $A-LC$ Hurwitz，解 Lyapunov 方程

$$ (A-LC)^{\mathsf T}P+P(A-LC)=-Q \tag{5.2} $$

取 $V=e_o^{\mathsf T}Pe_o$。`,
    dV: raw`$$ \dot V=-e_o^{\mathsf T}Qe_o\le-\lambda_{\min}(Q)\lVert e_o\rVert^{2} \tag{5.3} $$`,
    concl: raw`观测误差指数收敛到零，估计值可以替代真实状态进入控制律。若存在有界扰动 $d$，则 $\dot V\le-\lambda_{\min}(Q)\lVert e_o\rVert^{2}+2\lVert e_o\rVert\lVert P\rVert\bar d$，误差最终被限制在半径 $2\lVert P\rVert\bar d/\lambda_{\min}(Q)$ 的球内——估计变准，但不是无限准。

观测器带宽 $\omega_o$ 越大，$\lambda_{\min}(Q)$ 越大，残差越小，但噪声也被同样放大。`,
    limit: raw`分离原理要求观测器比控制器快，且对象模型与观测器模型一致。模型失配时，误差方程右端多出 $\Delta A\,x$，估计残差与状态幅值成正比；这就是为什么观测器类方法在对象参数大范围变化时需要配合自适应或鲁棒项。`
  },

  /* ── ADRC：观测误差 + 跟踪误差 ── */
  adrc: {
    error: raw`ADRC 把总扰动 $f$ 扩张为状态 $x_3$，用 ESO 估计后在前馈中抵消。记观测误差 $\varepsilon_i=z_i-x_i$，跟踪误差 $e=r-z_1$，则

$$ \dot\varepsilon=A_o\varepsilon,\qquad \ddot e+2\omega_c\dot e+\omega_c^{2}e=\varepsilon_3 \tag{5.1} $$

第一式是 ESO 误差，第二式是标称闭环误差；$\varepsilon_3$ 是扰动估计残差。`,
    V: raw`取

$$ V=\tfrac12\dot e^{2}+\tfrac12\omega_c^{2}e^{2}+\varepsilon^{\mathsf T}P_o\varepsilon \tag{5.2} $$

前半部分是跟踪误差的能量，后半部分是观测误差的能量。`,
    dV: raw`对前半部分，由 $\ddot e=-2\omega_c\dot e-\omega_c^{2}e+\varepsilon_3$ 得

$$ \dot V_c=-2\omega_c\dot e^{2}+\dot e\,\varepsilon_3\le-\omega_c\dot e^{2}+\frac{1}{4\omega_c}\varepsilon_3^{2} \tag{5.3} $$

对后半部分，$\dot V_o=-\varepsilon^{\mathsf T}Q_o\varepsilon$。`,
    concl: raw`$\dot V\le-\omega_c\dot e^{2}-\lambda_{\min}(Q_o)\lVert\varepsilon\rVert^{2}+\varepsilon_3^{2}/(4\omega_c)$。当 ESO 足够快时，$\varepsilon_3$ 迅速衰减，$\dot V$ 最终负定；即使扰动持续存在，跟踪误差也被限制在 $O(1/\omega_c)$ 内。这就是 ADRC「估计 + 抵消」的稳定性含义：它不要求扰动已知，只要求扰动可估。

$\omega_o$ 与 $\omega_c$ 的比值决定残差大小：$\omega_o$ 越大，$\varepsilon_3$ 越小，跟踪越准，但噪声放大越明显。`,
    limit: raw`上式假设 ESO 的模型结构与对象一致。若 $b_0$ 偏离真实增益，$\varepsilon_3$ 中会混入 $ (b-b_0)u$ 项，残差随控制量增大；这就是 $b_0$ 必须与 $1/m$ 匹配的原因。限幅会让 ESO 的输入与实际执行器输出不一致，需把限幅后的 $u$ 送入 ESO。`
  },

  /* ── 鲁棒：Lyapunov 不等式与有界实引理 ── */
  robust: {
    error: raw`设对象含摄动 $\Delta A$ 与外部输入 $w$：

$$ \dot x=(A+\Delta A)x+Bu+Gw,\qquad z=Cx+Du \tag{5.1} $$

鲁棒设计要保证：对允许的 $\Delta A$，闭环仍稳定，且 $\lVert z\rVert_2\le\gamma\lVert w\rVert_2$。`,
    V: raw`取二次型 $V=x^{\mathsf T}Px$，$P\succ0$，并要求 Lyapunov 不等式

$$ (A+\Delta A-BK)^{\mathsf T}P+P(A+\Delta A-BK)+\frac{1}{\gamma^{2}}PGG^{\mathsf T}P+C^{\mathsf T}C\prec0 \tag{5.2} $$

对所有允许的 $\Delta A$ 成立。`,
    dV: raw`$$ \dot V+z^{\mathsf T}z-\gamma^{2}w^{\mathsf T}w\le0 \tag{5.3} $$`,
    concl: raw`(5.3) 说明 $V$ 的增长被 $w$ 的能量所控制。$w=0$ 时 $\dot V\le-z^{\mathsf T}z\le0$，闭环稳定；$w\ne0$ 时两边积分得 $\lVert z\rVert_2\le\gamma\lVert w\rVert_2$，即从扰动到输出的增益不超过 $\gamma$。

鲁棒方法的共同点就在这里：它们不追求某一条轨迹最优，而是要求一个**集合**内的所有对象都满足同一个 Lyapunov 不等式。集合越大，可行解越保守。`,
    limit: raw`(5.2) 是充分条件，不是必要条件；保守性来自把结构化摄动当成非结构化处理。$\mu$ 综合通过结构奇异值减小这种保守性，但计算量更大。若摄动界估计过大，可能根本找不到可行的 $P$，此时应缩小不确定集或改用自适应。`
  },

  /* ── 无源性 ── */
  passivity: {
    error: raw`把对象写成端口哈密顿形式 $\dot x=(J-R)\nabla H+G u$、$y=G^{\mathsf T}\nabla H$，其中 $J=-J^{\mathsf T}$、$R\succeq0$。无源性要求存在存储函数 $S(x)\ge0$ 使

$$ \dot S\le u^{\mathsf T}y-\rho\lVert y\rVert^{2} \tag{5.1} $$

$\rho>0$ 称为无源裕度（passivity index）。`,
    V: raw`取 $V=S(x)$，对端口哈密顿系统直接计算：

$$ \dot S=\nabla H^{\mathsf T}(J-R)\nabla H+\nabla H^{\mathsf T}Gu=-\nabla H^{\mathsf T}R\nabla H+u^{\mathsf T}y \tag{5.2} $$`,
    dV: raw`$$ \dot S\le u^{\mathsf T}y-\lambda_{\min}(R)\lVert\nabla H\rVert^{2} \tag{5.3} $$`,
    concl: raw`对象本身是无源的（$R\succ0$），反馈 $u=-K_p y$ 代入后

$$ \dot S\le-K_p\lVert y\rVert^{2}-\lambda_{\min}(R)\lVert\nabla H\rVert^{2}\le0 \tag{5.4} $$

只要 $K_p>0$，闭环能量单调耗散。若对象无源裕度不足（$\rho<0$），先串一个无源化补偿器把裕度补回来，再闭环——这就是「无源性不足度补偿」的思路。

无源性的价值在于它不依赖对象精确模型：只要能量关系成立，参数怎么变都稳定。`,
    limit: raw`无源性是充分条件，很多对象本身不是无源的（例如负刚度对象），需要先做能量整形或反馈无源化。补偿器引入的动态会改变端口变量，证明时必须把补偿器状态一并纳入 $S$，否则结论不成立。`
  },

  /* ── MPC：最优代价作为 Lyapunov 函数 ── */
  mpc: {
    error: raw`MPC 在每个采样时刻解有限时域优化

$$ V_N(x_k)=\min_{u_{k:k+N-1}}\sum_{i=0}^{N-1}\ell(x_{k+i},u_{k+i})+V_f(x_{k+N}) \tag{5.1} $$

记最优解为 $u_k^\ast$，闭环为 $x_{k+1}=f(x_k,u_k^\ast)$。`,
    V: raw`直接取最优代价 $V_N(x_k)$ 作为 Lyapunov 函数。它满足 $V_N(0)=0$，且在 $\ell$ 正定时 $V_N(x)>0$（$x\ne0$）。`,
    dV: raw`把 $k$ 时刻的最优序列去掉第一项、末尾补上终端控制 $u_{k+N}=\kappa_f(x_{k+N})$，得到 $k+1$ 时刻的一个可行解。由可行性得

$$ V_N(x_{k+1})\le V_N(x_k)-\ell(x_k,u_k^\ast) \tag{5.2} $$`,
    concl: raw`(5.2) 说明最优代价沿闭环单调下降，且下降量至少是阶段代价 $\ell$。由 Lyapunov 稳定性定理，闭环渐近稳定；若 $\ell$ 满足 $\ell(x,u)\ge\alpha(\lVert x\rVert)$，还可进一步得到指数收敛速率。

这个证明的关键不是「预测得准」，而是「每一步都有可行解」。递归可行性一旦成立，稳定性就是它的直接推论。`,
    limit: raw`(5.2) 依赖两个前提：终端代价 $V_f$ 是终端控制 Lyapunov 函数，且终端集在 $\kappa_f$ 下正不变。本平台的简化 MPC 没有显式终端约束，因此上述证明是「理想 MPC」的结论；实际闭环在大扰动或模型失配下可能出现可行性丢失，表现为控制量长期贴限幅。`
  },

  /* ── 滑模：到达 + 降阶 ── */
  smc: {
    error: raw`记 $K=K_{\text{gain}}$。滑模面取 $s=c e+\dot e$（$c>0$）。对 $s$ 求导并代入对象方程与控制律，在标称项被抵消后剩下

$$ \dot s=-\frac{K}{m}\operatorname{sat}\!\Big(\frac{s}{\varepsilon}\Big)+d(t),\qquad |d(t)|\le\bar d \tag{5.1} $$

$d$ 是未建模动态与扰动经抵消后的残差。`,
    V: raw`取到达阶段的 Lyapunov 函数

$$ V=\tfrac12 s^{2} \tag{5.2} $$`,
    dV: raw`在边界层外 $|s|>\varepsilon$，$\operatorname{sat}(s/\varepsilon)=\operatorname{sgn}(s)$，于是

$$ \dot V=s\dot s\le-\frac{K}{m}|s|+\bar d\,|s|=-\Big(\frac{K}{m}-\bar d\Big)|s| \tag{5.3} $$`,
    concl: raw`只要 $K/m>\bar d$，$\dot V\le-\eta|s|$（$\eta=K/m-\bar d>0$），状态在有限时间

$$ t_r\le\frac{|s(0)|}{\eta} \tag{5.4} $$

内到达 $s=0$。到达后 $s=0$ 即 $\dot e=-ce$，误差按 $e^{-ct}$ 指数衰减——这就是「到达 + 降阶」两段式证明。

边界层内 $|s|\le\varepsilon$，只能保证 $\dot V\le0$ 不严格成立；此时误差被限制在 $|e|\le\varepsilon/c$ 的邻域内，属于实用稳定。`,
    limit: raw`证明要求 $\bar d$ 有界且 $K$ 大于它。若扰动上界估计偏低，状态到不了滑模面，表现为误差持续偏大；$K$ 过大则 $\operatorname{sat}$ 频繁换向，纹波 $\sigma_u$ 上升。$c$ 决定滑模面上的收敛速度，越大越快，但初始控制量也越大。`
  },

  /* ── 超螺旋：二阶滑模 ── */
  sts: {
    error: raw`超螺旋把不连续项藏进积分，控制律为 $u=-k_1|s|^{1/2}\operatorname{sgn}s+z$、$\dot z=-k_2\operatorname{sgn}s$。令 $\zeta=[|s|^{1/2}\operatorname{sgn}s,\ z]^{\mathsf T}$，则

$$ \dot\zeta=\frac{1}{|s|^{1/2}}\big(A\zeta+B\,d(t)\big) \tag{5.1} $$

其中 $A$、$B$ 只由 $k_1,k_2$ 组成。`,
    V: raw`取 $V=\zeta^{\mathsf T}P\zeta$，$P\succ0$ 由 $A^{\mathsf T}P+PA=-Q$ 解出。`,
    dV: raw`$$ \dot V\le-\frac{\gamma}{|s|^{1/2}}V^{1/2}\le-\gamma'V^{1/2} \tag{5.2} $$`,
    concl: raw`(5.2) 给出有限时间收敛：$s$ 与 $\dot s$ 在有限时间内同时到零，且控制量连续，不产生一阶滑模的符号切换。这就是超螺旋相对传统滑模的优势——同样的鲁棒性，更小的抖振。

参数条件为 $k_1>0$、$k_2>0$ 且 $k_2$ 大于扰动导数上界；只要扰动导数有界，收敛时间就有上界。`,
    limit: raw`超螺旋要求扰动**导数**有界，比传统滑模的「扰动有界」更严。若扰动突变（阶跃），积分项 $z$ 来不及响应，会出现短时大误差。离散实现时还需对 $|s|^{1/2}$ 做下限保护，否则数值上会出现高频抖动。`
  },

  /* ── 高阶滑模 / 准连续 ── */
  hosm: {
    error: raw`高阶滑模不要求 $s$ 本身连续可微，而是让 $s,\dot s,\dots,s^{(r-1)}$ 在有限时间内到零。以二阶为例，控制出现在 $\ddot s$ 中：

$$ \ddot s=\varphi(t,x)+\gamma(t,x)\dot u \tag{5.1} $$`,
    V: raw`取

$$ V=\tfrac12 s^{2}+\tfrac12\dot s^{2} \tag{5.2} $$`,
    dV: raw`在准连续实现下，

$$ \dot V\le-\eta\,(V^{1/2}+V^{3/4}) \tag{5.3} $$

或类似的有限时间不等式；具体指数取决于算法阶数。`,
    concl: raw`高阶滑模把不连续控制移到高阶导数上，输出 $u$ 连续，抖振显著低于一阶滑模。代价是证明更依赖「扰动的高阶导数有界」这一假设，且到达时间上界通常比一阶滑模宽松。

准连续实现用饱和函数逼近符号函数，严格说只能得到实用稳定；要得到精确有限时间，必须保留不连续项并采用 Filippov 解。`,
    limit: raw`高阶滑模的增益整定比一阶困难：增益不足到不了，增益过大则微分估计噪声被放大。实验台上应观察 $u$ 的连续性，而不是只看位置曲线。`
  },

  /* ── 自适应滑模 ── */
  smc_adapt: {
    error: raw`切换增益不再固定，而是按 $\dot{\hat K}=\gamma|s|$ 自适应增大。到达阶段的误差方程为

$$ \dot s=-\frac{\hat K}{m}\operatorname{sgn}s+d(t) \tag{5.1} $$`,
    V: raw`取

$$ V=\tfrac12 s^{2}+\frac{1}{2m\gamma}\tilde K^{2},\qquad \tilde K=\hat K-K^{\ast} \tag{5.2} $$

$K^{\ast}$ 是刚好覆盖扰动的未知增益。`,
    dV: raw`$$ \dot V=s\dot s+\frac{1}{m\gamma}\tilde K\dot{\hat K}\le-\frac{\hat K}{m}|s|+\bar d|s|+\frac{\tilde K}{m}|s|=-\Big(\frac{K^{\ast}}{m}-\bar d\Big)|s| \tag{5.3} $$`,
    concl: raw`$\hat K$ 会自动升到覆盖扰动所需的水平，之后 $\dot V\le-\eta|s|$，仍然有限时间到达。好处是不需要事先知道扰动上界；代价是 $\hat K$ 只能增不能减，扰动消失后增益偏大，抖振比固定增益更明显。

实际实现常加泄漏项 $-\sigma\hat K$ 或投影，使增益在扰动减小时缓慢回落。`,
    limit: raw`自适应增益在噪声作用下会被持续「充大」，因为 $|s|$ 永远不为零；必须设置增益上限或死区，否则长时间运行后抖振会越来越大。`
  },

  /* ── 边界层滑模 ── */
  smc_bl: {
    error: raw`用饱和函数代替符号函数，边界层厚度为 $\Phi$：

$$ u=u_{\text{eq}}+K\operatorname{sat}\!\Big(\frac{s}{\Phi}\Big) \tag{5.1} $$`,
    V: raw`取

$$ V=\tfrac12 s^{2} \tag{5.2} $$`,
    dV: raw`层外 $|s|>\Phi$：

$$ \dot V\le-(K/m-\bar d)|s| \tag{5.3} $$

层内 $|s|\le\Phi$：$\dot V\le-(K/m)\,(s^{2}/\Phi)+\bar d|s|$。`,
    concl: raw`层外有限时间进入 $|s|\le\Phi$；层内 $s$ 被限制在厚度为 $\Phi$ 的带内，误差最终满足 $|e|\le\Phi/c$。所以边界层滑模给的是**一致最终有界**，不是渐近稳定。

$\Phi$ 的选择就是抖振与精度的折衷：$\Phi$ 越小，稳态误差越小，控制切换越频繁。`,
    limit: raw`边界层厚度固定时，误差界也固定；若要求更高精度，需改用变厚度 $\Phi(t)$ 或二阶滑模。层内的线性化增益 $K/\Phi$ 不能过大，否则会激发未建模高频模态。`
  },

  /* ── 离散滑模（隐式欧拉） ── */
  smc_disc: {
    error: raw`离散滑模的到达条件写成差分形式：

$$ s_{k+1}=s_k-T\,\frac{K}{m}\operatorname{sgn}(s_{k+1}) \tag{5.1} $$

符号函数取在 $k+1$ 时刻，这就是隐式欧拉。`,
    V: raw`取 $V_k=\tfrac12 s_k^{2}$。`,
    dV: raw`由 (5.1) 两边平方：

$$ s_{k+1}^{2}=s_k^{2}-2T\frac{K}{m}|s_{k+1}|+T^{2}\frac{K^{2}}{m^{2}}\le s_k^{2} \tag{5.2} $$

只要 $T K/m\le2|s_{k+1}|$，最后一项就被前一项吸收。`,
    concl: raw`$V_{k+1}\le V_k$，且 $|s_{k+1}|\le|s_k|$。隐式离散化的关键性质是：对任意 $K>0$，序列都不发散——这正是「无条件稳定」的含义，也是它相对显式欧拉的优势（显式欧拉要求 $T K/m<1$）。

收敛速度由 $T K/m$ 决定；$K$ 过大时 $s$ 会在一个采样周期内被推到反号，形成离散抖振。`,
    limit: raw`无条件稳定不等于无抖振。步长 $T$ 越大，$s$ 的稳态振幅越大；实际实现还需限制 $u$ 的幅值与变化率，否则隐式方程可能无解或解出超出执行器能力的控制量。`
  },

  /* ── Bang-Bang / 继电 ── */
  bangbang: {
    error: raw`Bang-Bang 控制只取两个值 $u=\pm F_{\max}$，切换由误差或相平面曲线决定。以双积分器为例，令 $s=e+\tau\dot e$，则

$$ \dot s=\dot e+\tau\ddot e=\dot e+\frac{\tau}{m}u \tag{5.1} $$`,
    V: raw`取 $V=\tfrac12 s^{2}$。`,
    dV: raw`取 $u=-F_{\max}\operatorname{sgn}s$：

$$ \dot V=s\dot s\le-\frac{\tau F_{\max}}{m}|s|+\bar d|s| \tag{5.2} $$`,
    concl: raw`当 $\tau F_{\max}/m>\bar d$ 时，$s$ 在有限时间内到零，随后 $e$ 按 $\dot e=-e/\tau$ 指数衰减。这是 Bang-Bang 能给出的最强结论：切换面附近有限时间到达。

但它没有全局光滑 Lyapunov 函数使 $\dot V<0$ 处处成立——相平面上的轨迹会围绕切换线来回穿越，形成抖振或极限环。继电控制还多一层滞环，稳定性要用 Filippov 解与描述函数分析，不能直接套用光滑系统的定理。`,
    limit: raw`Bang-Bang 的优点是控制量始终满幅，响应快；缺点是稳态精度受切换频率限制，且对执行器磨损大。实际系统常在切换面附近切回比例控制（双模控制），用连续性换精度。`
  },

  /* ── 时间最优 ── */
  timeopt: {
    error: raw`时间最优控制要最小化 $J=\int_0^{t_f}\mathrm dt$，哈密顿函数为

$$ H=1+\lambda^{\mathsf T}(Ax+Bu) \tag{5.1} $$

最优控制使 $H$ 逐点最小，因此 $u$ 只能取边界值。`,
    V: raw`取「剩余时间」$V=t_f-t$ 作为 Lyapunov 函数：它正定，且沿最优轨迹以单位速率下降。`,
    dV: raw`$$ \dot V=-1<0 \tag{5.2} $$`,
    concl: raw`对双积分器，最优控制是至多一次切换的 Bang-Bang，切换曲线由相平面上的抛物线给出。$V$ 严格单调下降保证有限时间到达，且到达时间最短。

这个证明与稳定性证明的区别在于：它证明的是「最快到达」，而稳定性只要求「终会到达」。`,
    limit: raw`时间最优对模型误差极其敏感：切换时刻稍有偏差，就会从「一次切换」变成「多次切换」，甚至越过目标。实际实现常留出切换带，用小幅比例控制吸收误差。`
  },

  /* ── 反馈线性化 ── */
  feedbacklin: {
    error: raw`精确反馈线性化先用坐标变换 $z=\Phi(x)$ 把非线性对象变成线性积分链，再按线性方法设计。变换后的误差方程为

$$ \dot z=A z+B v \tag{5.1} $$

取 $v=-Kz$ 后 $A-BK$ Hurwitz。`,
    V: raw`取 $V=z^{\mathsf T}Pz$，$P$ 满足 $(A-BK)^{\mathsf T}P+P(A-BK)=-Q$。`,
    dV: raw`$$ \dot V=-z^{\mathsf T}Qz\le0 \tag{5.2} $$`,
    concl: raw`$z\to0$ 且 $\Phi$ 是微分同胚时 $x\to x_d$，闭环指数稳定。证明的核心不是 Lyapunov 代数，而是**坐标变换的可逆性**：只要 $\Phi$ 全局可逆，非线性就被完全抵消。`,
    limit: raw`精确线性化要求非线性项精确已知。模型误差不会被抵消，反而会被 $1/b(x)$ 放大；若 $b(x)$ 在工作区内过零，控制量会发散。因此实际实现必须加限幅，并检查变换的可行性区域。`
  },

  /* ── 反步 ── */
  backstep: {
    error: raw`反步把高阶系统拆成逐级一阶子系统。以二阶为例，令 $z_1=e$、$z_2=\dot e-\alpha_1(e)$，其中 $\alpha_1=-c_1z_1$ 是虚拟控制，则

$$ \dot z_1=-c_1z_1+z_2,\qquad \dot z_2=\ddot e-\dot\alpha_1 \tag{5.1} $$`,
    V: raw`逐级构造

$$ V=\tfrac12 z_1^{2}+\tfrac12 z_2^{2} \tag{5.2} $$`,
    dV: raw`把真实控制 $u$ 选成使 $\dot z_2=-z_1-c_2z_2$，则

$$ \dot V=-c_1z_1^{2}-c_2z_2^{2}\le0 \tag{5.3} $$`,
    concl: raw`只要 $c_1>0$、$c_2>0$，$\dot V$ 负定，$z_1,z_2\to0$，进而 $e\to0$。反步的巧妙之处在于：每一级只需处理一个一阶子系统，Lyapunov 函数逐级累加，最终的整体证明自动成立。

代价是「微分爆炸」：$\dot\alpha_1$ 需要对虚拟控制求导，阶数越高，表达式越膨胀。`,
    limit: raw`反步要求对象是严格反馈形式，且非线性函数已知。虚拟控制的导数在实现时通常用差分或滤波器近似，近似误差会破坏严格的 $\dot V<0$，这也是动态面控制（DSC）要引入一阶滤波的原因。`
  },

  /* ── 动态面 ── */
  dsc: {
    error: raw`动态面用一阶滤波 $\tau\dot y_2+y_2=\alpha_1$ 代替对 $\alpha_1$ 求导，滤波误差 $y_2-\alpha_1$ 进入 Lyapunov 函数。`,
    V: raw`取

$$ V=\tfrac12 z_1^{2}+\tfrac12 z_2^{2}+\tfrac12(y_2-\alpha_1)^{2} \tag{5.1} $$`,
    dV: raw`$$ \dot V\le-c_1z_1^{2}-c_2z_2^{2}-\frac{1}{\tau}(y_2-\alpha_1)^{2}+M \tag{5.2} $$

$M$ 由 $\dot\alpha_1$ 的上界决定。`,
    concl: raw`$\dot V\le-2\kappa V+M$，由此得 $V(t)\le V(0)e^{-2\kappa t}+M/(2\kappa)$：闭环**一致最终有界**，滤波时间常数 $\tau$ 越小，$M$ 越小，误差界越窄。

DSC 牺牲了反步的渐近收敛，换来了对高阶导数的免疫；这是工程上常见的取舍。`,
    limit: raw`$M$ 与 $\dot\alpha_1$ 的上界成正比，而 $\dot\alpha_1$ 又随参考信号变化率增大。参考突变时误差界会明显变宽，因此 DSC 常配合指令滤波或轨迹柔化使用。`
  },

  /* ── 协同控制 ── */
  synergetic: {
    error: raw`协同控制先定义一个宏变量（流形）$\psi=e+\tau\dot e$，再强制它按一阶动态演化：

$$ T\dot\psi+\psi=0 \tag{5.1} $$`,
    V: raw`取 $V=\tfrac12\psi^{2}$。`,
    dV: raw`$$ \dot V=\psi\dot\psi=-\frac{1}{T}\psi^{2}=-\frac{2}{T}V \tag{5.2} $$`,
    concl: raw`$V(t)=V(0)e^{-2t/T}$，$\psi$ 指数收敛到零；随后 $e$ 按 $\dot e=-e/\tau$ 指数收敛。两个时间常数 $T$、$\tau$ 分别控制「进入流形」与「沿流形滑动」的速度，物理意义比极点配置更直观。

协同控制与滑模的区别在于：它不切换，控制量连续，因此没有抖振。`,
    limit: raw`控制律需要对 $\psi$ 的导数，因而依赖误差的微分。噪声会被微分放大，实际实现需滤波；此外 $T$ 过小会使控制量过大，$T$ 过大则收敛慢。`
  },

  /* ── SDRE ── */
  sdre: {
    error: raw`SDRE 把线性 Riccati 方程推广为状态相关形式：

$$ A(x)^{\mathsf T}P(x)+P(x)A(x)-P(x)B(x)R^{-1}B(x)^{\mathsf T}P(x)+Q(x)=0 \tag{5.1} $$

控制律 $u=-R^{-1}B(x)^{\mathsf T}P(x)x$。`,
    V: raw`取 $V=x^{\mathsf T}P(x)x$。`,
    dV: raw`$$ \dot V=-x^{\mathsf T}Q(x)x+x^{\mathsf T}\dot P(x)x \tag{5.2} $$`,
    concl: raw`若 $\dot P(x)$ 在状态变化的时间尺度上足够小（准静态假设），第二项可忽略，$\dot V\le-x^{\mathsf T}Q(x)x<0$，闭环局部渐近稳定。

SDRE 的稳定性是**局部**的：它依赖 $P(x)$ 沿轨迹缓慢变化。状态变化越快，准静态假设越差。`,
    limit: raw`SDRE 需要在线解 Riccati 方程，计算量大；$A(x)$ 的分解不唯一，不同分解给出不同闭环。工程上常冻结 $P$ 一段时间再更新，用更新周期换取实时性。`
  },

  /* ── 能量成型 ── */
  energy: {
    error: raw`端口哈密顿对象为 $\dot x=(J-R)\nabla H+G u$。能量成型的目标是把闭环能量改造成期望的 $H_d$，使

$$ H_d(x)=\tfrac12\tilde x^{\mathsf T}M^{-1}\tilde x+\tfrac12\tilde q^{\mathsf T}K_d\tilde q \tag{5.1} $$

在期望平衡点取极小。`,
    V: raw`取 $V=H_d(x)$。`,
    dV: raw`设计 $u$ 使闭环满足 $\dot x=(J-R_d)\nabla H_d$，则

$$ \dot V=-\nabla H_d^{\mathsf T}R_d\nabla H_d\le0 \tag{5.2} $$`,
    concl: raw`$R_d\succ0$ 时能量单调耗散，闭环收敛到 $H_d$ 的极小点。若期望平衡点是 $H_d$ 的唯一极小且可检测，由 LaSalle 得渐近稳定。

能量视角的好处是物理意义清楚：控制器不是在「压误差」，而是在「改势阱」。负刚度对象之所以能被稳住，就是因为能量成型把原来的势能山峰翻成了山谷。`,
    limit: raw`能量成型要求对象可端口控制，且偏微分方程（匹配条件）有解。对欠驱动系统，可成型的能量受约束；此外阻尼注入 $R_d$ 过大会使控制量饱和，过小则收敛慢。`
  },

  /* ── 微分平坦 ── */
  flatness: {
    error: raw`微分平坦系统存在平坦输出 $y$，使所有状态与控制都可由 $y$ 及其有限阶导数表示。沿期望轨迹 $y_d(t)$ 取前馈 $u_{ff}$，再叠加反馈 $u_{fb}$，误差方程为

$$ \ddot e+k_1\dot e+k_0e=0 \tag{5.1} $$`,
    V: raw`取 $V=\tfrac12\dot e^{2}+\tfrac12k_0e^{2}$。`,
    dV: raw`$$ \dot V=\dot e(\ddot e+k_0e)=-k_1\dot e^{2}\le0 \tag{5.2} $$`,
    concl: raw`$k_0>0$、$k_1>0$ 时误差渐近收敛。平坦性的价值在于：前馈项让轨迹跟踪不依赖高增益，反馈项只需处理残差，因此控制量更平滑。

证明分两层：前馈保证「名义轨迹可行」，反馈保证「偏离后被拉回」。两者缺一不可。`,
    limit: raw`前馈依赖精确模型与轨迹的高阶导数；轨迹不平滑时，前馈会出现尖峰。平坦性本身不保证内部稳定性（零动态稳定），必须单独检查。`
  },

  /* ── MRAC ── */
  mrac: {
    error: raw`参考模型 $\dot y_m=-a_my_m+b_mr$，对象 $\dot y=ay+bu$，控制 $u=\theta_y y+\theta_r r$。令参数误差 $\tilde\theta=\theta-\theta^{\ast}$，跟踪误差 $e=y-y_m$ 满足

$$ \dot e=-a_me+b\,\tilde\theta^{\mathsf T}\phi \tag{5.1} $$`,
    V: raw`取

$$ V=\tfrac12 e^{2}+\frac{|b|}{2}\tilde\theta^{\mathsf T}\Gamma^{-1}\tilde\theta \tag{5.2} $$`,
    dV: raw`取自适应律 $\dot\theta=-\Gamma\,\phi\,e\,\operatorname{sgn}(b)$，则

$$ \dot V=-a_me^{2}\le0 \tag{5.3} $$`,
    concl: raw`$V$ 单调不增，$e$ 与 $\tilde\theta$ 均有界；由 Barbalat 引理，$e\to0$。跟踪收敛，但参数不一定收敛——要参数收敛还需参考信号满足持续激励（PE）条件。

这条证明解释了 MRAC 的两个层次：稳定性只要求 $a_m>0$、$\Gamma>0$；参数辨识则要求信号足够丰富。`,
    limit: raw`自适应律对噪声积分，噪声会让参数缓慢漂移。工程上需加死区、泄漏或投影；此外 $b$ 的符号必须已知，否则要用 Nussbaum 类方法处理控制方向未知。`
  },

  /* ── 一般自适应 ── */
  adaptive: {
    error: raw`把未知参数记作 $\theta$，估计记作 $\hat\theta$，误差 $\tilde\theta=\hat\theta-\theta$。跟踪误差方程一般可写成

$$ \dot e=-a e+b\,\tilde\theta^{\mathsf T}\phi(x) \tag{5.1} $$`,
    V: raw`取

$$ V=\tfrac12 e^{2}+\frac{1}{2\gamma}\tilde\theta^{2} \tag{5.2} $$`,
    dV: raw`取 $\dot{\hat\theta}=-\gamma\,\phi\,e$（或带投影的等价形式）：

$$ \dot V=-ae^{2}\le0 \tag{5.3} $$`,
    concl: raw`$e$ 有界且 $e\to0$（Barbalat）；$\tilde\theta$ 有界但不一定收敛。投影把 $\hat\theta$ 限制在已知凸集内，可避免参数漂移；$\sigma$ 修正则用泄漏项换取更强的有界性，代价是稳态误差。

这一类方法共同的证明骨架就是「跟踪误差 + 参数误差」的增广 Lyapunov 函数。`,
    limit: raw`证明依赖「未知参数为常值」或「慢变」假设。参数快变时 $\dot{\tilde\theta}$ 不再为零，$\dot V$ 多出一项，收敛性会被破坏。持续激励不足时，参数可能收敛到错误值而跟踪仍然良好，这是自适应控制最容易被误判的地方。`
  },

  /* ── 速度梯度 ── */
  speedgradient: {
    error: raw`速度梯度法把控制目标写成误差的平方，参数沿负梯度方向更新：

$$ \dot\theta=-\gamma\nabla_\theta V(e,\theta) \tag{5.1} $$`,
    V: raw`取 $V=\tfrac12 e^{2}$。`,
    dV: raw`$$ \dot V=e\dot e=-\gamma\lVert\nabla_\theta V\rVert^{2}\le0 \tag{5.2} $$`,
    concl: raw`$V$ 单调不增，误差收敛到 $\nabla_\theta V=0$ 的集合。若该集合只有期望平衡点，则闭环渐近稳定。

速度梯度是一大类自适应算法的统一框架，MRAC、极值搜索都可以写成它的特例。`,
    limit: raw`梯度法只能保证收敛到驻点，不保证全局最优；步长 $\gamma$ 过大振荡、过小停滞。目标函数非凸时，初值决定终态。`
  },

  /* ── BLF ── */
  blf: {
    error: raw`记 $v=\dot x$，误差 $e=r-x$，则 $\dot e=-v$。对象方程乘以 $v$ 并整理，得能量关系

$$ \frac{\mathrm d}{\mathrm dt}\Big(\tfrac12 mv^{2}+\tfrac12 ke^{2}\Big)=uv-cv^{2} \tag{5.1} $$`,
    V: raw`把第 4 章的障碍函数与对象能量按控制增益加权组合：

$$ V=\frac{K_p}{2}\ln\frac{k_b^{2}}{k_b^{2}-e^{2}}+\tfrac12 mv^{2}+\tfrac12 ke^{2},\qquad |e|<k_b \tag{5.2} $$

第一项在 $|e|\to k_b$ 时趋于 $+\infty$，因此只要 $V$ 有界，$e$ 就永远碰不到边界。`,
    dV: raw`第 4 章的 (4.6) 省略了与 $v$ 的交叉项；把它们全部保留，沿轨迹求导并代入控制律 $u=K_p e/(k_b^{2}-e^{2})-K_dv+kr$：

$$ \dot V=\frac{K_p e\dot e}{k_b^{2}-e^{2}}+mv\dot v+ke\dot e=-\frac{K_p ev}{k_b^{2}-e^{2}}+v\Big[\frac{K_p e}{k_b^{2}-e^{2}}-(c+K_d)v+ke\Big]-kev=-(c+K_d)v^{2} \tag{5.3} $$`,
    concl: raw`$\dot V\le0$，且等号只在 $v=0$ 时成立。由 LaSalle，$v\equiv0$ 迫使 $\ddot v\equiv0$，代入对象方程得 $e\,[K_p/(k_b^{2}-e^{2})+k]=0$，括号内恒正，故 $e=0$。因此闭环渐近稳定，且 $V$ 有界保证轨迹始终留在 $|e|<k_b$ 内——障碍函数的作用不是「惩罚越界」，而是让越界在数学上不可能发生。

条件只有三个：$K_p>0$、$c+K_d>0$、$k>0$，与 $K_p$ 的具体大小无关。`,
    limit: raw`控制律在 $|e|\to k_b$ 时分母趋零，控制量会趋于无穷；实验台把 $e$ 夹在 $\pm(k_b-0.05)$，因此严格证明在钳位点之外失效。另外 $k_b$ 必须大于初始误差，否则闭环从第一步就越界。`
  },

  /* ── 规定性能 ── */
  ppc: {
    error: raw`规定性能要求误差始终落在漏斗内：

$$ -\underline\rho(t)<e(t)<\overline\rho(t),\qquad \rho(t)=\rho_\infty+(\rho_0-\rho_\infty)e^{-lt} \tag{5.1} $$

用同胚变换把约束误差映射成无约束变量 $\varepsilon=\ln\frac{1+\xi}{1-\xi}$，$\xi=e/\rho$。`,
    V: raw`取 $V=\tfrac12\varepsilon^{2}$。`,
    dV: raw`设计控制使 $\dot\varepsilon=-k\varepsilon+\delta(t)$，则

$$ \dot V=-k\varepsilon^{2}+\varepsilon\delta\le-\frac{k}{2}\varepsilon^{2}+\frac{\delta^{2}}{2k} \tag{5.2} $$`,
    concl: raw`$\varepsilon$ 一致最终有界，且由变换的可逆性，$|\xi|<1$ 始终成立，即 $e$ 永远在漏斗内。只要初始误差满足 $|e(0)|<\rho_0$，约束就不会被突破；收敛速度由 $\rho(t)$ 的衰减率 $l$ 规定。

PPC 的证明与 BLF 同源：都是用一个在边界处发散的函数把约束「焊死」在 Lyapunov 函数里。`,
    limit: raw`漏斗的初始宽度必须覆盖初始误差；$\rho_\infty$ 过小会让控制量在稳态附近过大。误差穿越零点时 $\xi$ 变号，变换在 $\xi=0$ 附近仍是光滑的，但数值实现需防止除零。`
  },

  /* ── CBF ── */
  cbf: {
    error: raw`安全集定义为 $\mathcal C=\{x:B(x)\ge0\}$。控制障碍函数要求

$$ \dot B(x,u)\ge-\alpha B(x) \tag{5.1} $$

$\alpha>0$ 是一阶类 $\mathcal K$ 函数。`,
    V: raw`取 $V=-B(x)$ 作为「不安全度」，或直接把 $B$ 当作约束函数。`,
    dV: raw`由比较引理，$B(x(t))\ge B(x(0))e^{-\alpha t}$；只要 $B(x(0))\ge0$，右端恒非负。`,
    concl: raw`$B$ 沿闭环非负，安全集前向不变——这就是 CBF 的核心结论：不需要证明收敛，只需证明「永远不越界」。实际使用时把 CBF 作为约束、把 CLF 作为目标，解一个二次规划：

$$ \min_u\ \lVert u-u_{\text{nom}}\rVert^{2}\quad\text{s.t.}\quad \dot B+\alpha B\ge0,\ \ \dot V+kV\le0 \tag{5.2} $$

若 QP 可行，则安全与稳定同时成立。`,
    limit: raw`CBF 只保证安全，不保证到达目标；CLF 与 CBF 可能冲突，导致 QP 不可行。此时需要放松约束（软约束）或改用高阶 CBF。离散实现还需考虑采样间安全，连续时间的保证不能直接搬到离散控制器。`
  },

  /* ── 有限时间 / 固定时间 ── */
  ftc: {
    error: raw`有限时间控制要求 Lyapunov 导数满足

$$ \dot V\le-\alpha V^{p},\qquad 0<p<1 \tag{5.1} $$`,
    V: raw`取 $V=\tfrac12 e^{2}$（或包含速度项的二次型）。`,
    dV: raw`对 (5.1) 积分：

$$ V(t)^{1-p}\le V(0)^{1-p}-\alpha(1-p)t \tag{5.2} $$`,
    concl: raw`收敛时间有显式上界

$$ T\le\frac{V(0)^{1-p}}{\alpha(1-p)} \tag{5.3} $$

且上界与初始状态有关。若把 (5.1) 改成 $\dot V\le-\alpha V^{p}-\beta V^{q}$（$p<1<q$），则得到固定时间收敛，上界与初值无关：

$$ T\le\frac{1}{\alpha(1-p)}+\frac{1}{\beta(q-1)} \tag{5.4} $$

这就是有限时间与固定时间的区别：前者「快，但初值越大越慢」，后者「不管初值多大，都在统一上界内到达」。`,
    limit: raw`有限时间控制在大误差时控制量很大，容易饱和；饱和后 $V$ 的下降不再满足 (5.1)，有限时间保证失效。分数次幂在误差接近零时对噪声敏感，需加死区或切换回线性控制。`
  },

  /* ── 时滞：Lyapunov-Krasovskii ── */
  delay: {
    error: raw`时滞系统 $\dot x=Ax+A_dx(t-\tau)$ 的状态空间是无穷维的，Lyapunov 函数要升级为泛函：

$$ V(x_t)=x^{\mathsf T}(t)Px(t)+\int_{t-\tau}^{t}x^{\mathsf T}(s)Qx(s)\,\mathrm ds \tag{5.1} $$`,
    V: raw`$P\succ0$、$Q\succ0$ 时 $V$ 正定，且被 $x$ 的历史片段所界定。`,
    dV: raw`沿闭环求导：

$$ \dot V\le\xi^{\mathsf T}\begin{bmatrix}A^{\mathsf T}P+PA+Q&PA_d\\A_d^{\mathsf T}P&-Q\end{bmatrix}\xi \tag{5.2} $$

$\xi=[x(t),x(t-\tau)]^{\mathsf T}$。`,
    concl: raw`若 (5.2) 的矩阵负定（可用 LMI 求解），则 $\dot V\le-\lambda\lVert x(t)\rVert^{2}$，时滞系统渐近稳定。这个条件与时滞 $\tau$ 有关：$\tau$ 越大，$Q$ 的积分区间越长，可行域越小，直到无解——那个临界值就是「时滞裕度」。

Smith 预估、Artstein 降阶等方法的本质，都是用一个模型把时滞「搬走」，使闭环回到有限维；它们的稳定性最终仍要回到这个泛函判据上验证。`,
    limit: raw`Lyapunov-Krasovskii 判据是充分条件，保守性来自对积分项的处理。时滞未知或时变时，需用 Razumikhin 条件或自适应时滞估计；时滞估计误差超过裕度，闭环会振荡甚至发散。`
  },

  /* ── 事件触发 ── */
  etc: {
    error: raw`事件触发只在触发时刻 $t_k$ 更新控制，采样误差 $e_s(t)=x(t_k)-x(t)$ 满足触发条件

$$ \lVert e_s(t)\rVert\le\sigma\lVert x(t)\rVert+\varepsilon_0 \tag{5.1} $$

时才继续使用旧控制。`,
    V: raw`取 $V=x^{\mathsf T}Px$。`,
    dV: raw`把 $u(t_k)$ 写成 $u(t)+K e_s(t)$，代入闭环：

$$ \dot V\le-\alpha V+\beta\lVert e_s\rVert^{2} \tag{5.2} $$`,
    concl: raw`由触发条件 (5.1)，$\beta\lVert e_s\rVert^{2}\le\beta\sigma^{2}\lVert x\rVert^{2}+\beta\varepsilon_0^{2}$。取 $\sigma$ 足够小使 $\beta\sigma^{2}<\alpha\lambda_{\min}(P)$，则

$$ \dot V\le-\alpha' V+\beta\varepsilon_0^{2} \tag{5.3} $$

闭环一致最终有界，且不触发 Zeno 现象（存在最小触发间隔）。这就是事件触发的稳定性含义：用「允许的采样误差」换取「更少的通信次数」。`,
    limit: raw`$\sigma$ 越大，通信越省，误差界越宽；$\sigma$ 过大时 (5.3) 不再负定。触发条件中的 $\varepsilon_0$ 用于避免稳态附近无限触发，但它也直接决定稳态误差下限。`
  },

  /* ── 迭代学习 ── */
  ilc: {
    error: raw`第 $k$ 次迭代的跟踪误差为 $e_k(t)=y_d(t)-y_k(t)$，学习律

$$ u_{k+1}(t)=u_k(t)+\Gamma e_k(t) \tag{5.1} $$

在重复运行假设下，误差沿迭代轴演化。`,
    V: raw`取迭代轴上的「能量」$V_k=\int_0^T e_k^{2}(t)\,\mathrm dt$。`,
    dV: raw`对线性系统，存在 $\rho\in[0,1)$ 使

$$ V_{k+1}\le\rho^{2}V_k \tag{5.2} $$

$\rho$ 由 $\lVert I-\Gamma G\rVert$ 决定，$G$ 是系统的脉冲响应矩阵。`,
    concl: raw`$V_k\to0$ 几何收敛，$e_k\to0$ 于 $L_2$ 范数。注意这是**沿迭代轴**的收敛，不是沿时间轴的稳定性；每次运行内部仍需一个稳定的反馈回路兜底。

收敛条件 $\rho<1$ 等价于学习增益 $\Gamma$ 与系统增益的乘积落在单位圆内。`,
    limit: raw`ILC 要求每次运行的初始状态与目标轨迹完全重复；初始偏移、非重复扰动会破坏收敛。$\Gamma$ 过大直接发散，过小则几十次迭代仍看不出效果。高频段增益需衰减，否则会放大噪声。`
  },

  /* ── 前馈整形 ── */
  feedforward: {
    error: raw`输入整形把指令拆成若干脉冲的叠加，使各脉冲激发的振动相互抵消。对二阶对象，残余振动为

$$ V(\omega)=\Big|\sum_i A_i e^{-j\omega t_i}\Big| \tag{5.1} $$`,
    V: raw`取整形的残余振动幅值 $V$ 作为「能量」。`,
    dV: raw`零振动条件要求

$$ \sum_i A_i e^{-j\omega t_i}=0,\qquad \sum_i A_i=1 \tag{5.2} $$`,
    concl: raw`满足 (5.2) 时 $V=0$，指令不再激发对象的固有频率。前馈不改变闭环极点，它只是把激励谱在 $\omega_n$ 处挖了一个零点；系统的稳定性仍由底层反馈回路保证。

因此「输入整形稳定」这句话严格说是：反馈回路稳定 + 整形满足零振动条件 + 整形脉冲不使执行器饱和。`,
    limit: raw`零振动条件依赖固有频率 $\omega_n$ 与阻尼比 $\zeta$ 的准确值；参数漂移时残余振动不为零，需用鲁棒整形（ZVDD、EI）。整形会引入时间延迟，延时长度等于最后一个脉冲的时刻。`
  },

  /* ── 切换 / 增益调度 ── */
  switched: {
    error: raw`切换系统由若干子系统 $\dot x=A_ix$ 与切换信号 $\sigma(t)$ 组成。每个子系统各有 Lyapunov 函数 $V_i=x^{\mathsf T}P_ix$。`,
    V: raw`取当前激活子系统的 $V_\sigma$。`,
    dV: raw`$$ \dot V_\sigma=-x^{\mathsf T}Q_\sigma x\le0 \tag{5.1} $$

切换瞬间 $V$ 可能跳变，需用驻留时间约束跳变幅度：

$$ V_{\sigma(t^+)}(x)\le\mu V_{\sigma(t^-)}(x) \tag{5.2} $$`,
    concl: raw`若每个子系统稳定，且切换满足平均驻留时间

$$ \tau_a\ge\frac{\ln\mu}{2\kappa} \tag{5.3} $$

则整个切换系统稳定。这条结论说明：**每个模态都稳定，不代表切换后稳定**——切换太快会让 Lyapunov 函数的跳变压过衰减。

增益调度是切换系统的特例：调度变量连续变化时，$\mu\to1$，驻留时间条件自动满足。`,
    limit: raw`驻留时间条件是充分条件，保守性来自最坏情况估计。实际调度中若某个模态只在极短时间内激活，条件可能被违反但系统仍稳定；反之，快速来回切换即使每个模态都稳定，也可能发散。`
  },

  /* ── 量化控制 ── */
  quantized: {
    error: raw`量化器把连续信号映射为有限字长：$q(u)=u+\delta(t)$，$|\delta|\le\Delta/2$，$\Delta$ 是量化步长。`,
    V: raw`取

$$ V=x^{\mathsf T}Px \tag{5.1} $$`,
    dV: raw`$$ \dot V\le-\alpha V+\beta\Delta^{2} \tag{5.2} $$`,
    concl: raw`$\dot V<0$ 当 $V>\beta\Delta^{2}/\alpha$，因此状态最终被限制在半径 $O(\Delta)$ 的球内。量化步长越小，稳态误差越小；步长固定时，再高的增益也无法把误差压到零以下——这是量化控制与连续控制的本质区别。`,
    limit: raw`量化误差被建模为有界扰动，这个假设在量化器饱和时不成立。有限字长还会引入极限环，尤其在高增益、低字长的情况下；实际系统需配合抖动（dither）或噪声整形。`
  },

  /* ── 学习类 / 数据驱动 ── */
  learning: {
    error: raw`这类方法（模糊、神经网络、无模型自适应、强化学习等）没有统一的闭环解析式，误差方程只能写成

$$ \dot e=f(e,\hat\theta)+d(t) \tag{5.1} $$

$\hat\theta$ 是在线更新的参数或逼近器权重。`,
    V: raw`若参数被投影到有界集 $\lVert\hat\theta\rVert\le\theta_{\max}$，可取 $V=\tfrac12 e^{2}$。`,
    dV: raw`在逼近误差有界的假设下，

$$ \dot V\le-\alpha e^{2}+\beta|e| \tag{5.2} $$`,
    concl: raw`$|e|>\beta/\alpha$ 时 $\dot V<0$，误差最终被限制在 $|e|\le\beta/\alpha$。这是**实用稳定**，不是渐近稳定；$\beta$ 由逼近误差与学习率共同决定。

能证到的极限就在这里：只要逼近器不完美，残差就不会为零。想进一步缩小残差，要么提高逼近精度，要么叠加一个积分或鲁棒项。`,
    limit: raw`上述证明依赖「参数有界」与「逼近误差有界」两个假设，而这两个假设在实际中都无法先验保证。学习率过大直接发散，过小则在教学时长内看不出收敛。这类方法适合作为教学演示与工程试错，不宜宣称全局稳定性。`
  }
};

/* ── 方法 → 证明原型 ── */
const ARCH_OF = {
  /* 01 各类 PID 与工业变体 */
  P: 'pd2', PI: 'pid3', PD: 'pd2', PID: 'pid3', IncPID: 'pid3', IPD: 'pd2',
  'PI-D': 'pid3', '2DOF-PID': 'pid3', 'Nested-PID': 'cascade', 'AW-PI': 'pid3',
  'Clamping-PID': 'pid3', 'Sep-Int-PID': 'pid3', 'VarRate-PID': 'pid3',
  'FilterD-PID': 'pd2', 'Deadband-PID': 'deadzone', 'RampSP-PID': 'pd2',
  'Expert-PID': 'pid3', NPID: 'nlpid', FuzzyPID: 'learning', NeuralPID: 'learning',
  'Gradient-PID': 'learning', iPID: 'learning', 'P-PI-Cascade': 'cascade',
  'Bilinear-Tustin-PID': 'pid3', 'Gain-Margin-PID': 'pid3', 'IMC-PID': 'pid3',

  /* 02 经典频域与补偿 */
  OpenLoop: 'openloop', 'QFT-LeadLag': 'linear_comp', 'Lag-Compensator': 'linear_comp',
  'Lead-Lag-Full': 'linear_comp', 'Notch-Filter-PD': 'linear_comp',
  'PR-Resonant': 'linear_comp', 'Double-Int-Servo': 'linear_comp',
  'PIDA-Controller': 'linear_comp', 'Bode-Step-Comp': 'linear_comp',
  'Two-Stage-Lead': 'linear_comp',

  /* 03 状态空间与最优 */
  PolePlacement: 'statefb', LQR: 'lqr', LQG: 'lqg', 'LQR-I': 'lqr',
  Deadbeat: 'deadbeat', 'IMP-Servo': 'statefb', Preview: 'statefb',
  'Kalman-Pole': 'observer', 'Minimum-Energy': 'lqr', 'LQT-Tracking': 'lqr',
  'LQR-Servo-FF': 'lqr', 'Linear-Time-Optimal-Switch': 'bangbang',

  /* 04 鲁棒与 H∞ */
  'H-Infinity': 'robust', 'H2-Optimal': 'robust', 'Mixed-H2-Hinf': 'robust',
  'Mu-Synthesis': 'robust', 'LoopShaping-McFarlane': 'robust',
  'Kharitonov-Robust': 'robust', 'Corless-Leitmann': 'robust',
  'Robust-NL-Damping': 'robust', 'Petersen-GuaranteedCost': 'robust',
  'Passivity-Shortage-Comp': 'passivity',

  /* 05 模型预测 */
  MPC: 'mpc', TubeMPC: 'mpc', GPC: 'mpc', 'DMC-DynamicMatrix': 'mpc',
  'MAC-Impulse': 'mpc', 'PFC-Functional': 'mpc', 'Explicit-MPC': 'mpc',
  'Stochastic-MPC': 'mpc', 'MinMax-MPC': 'mpc',

  /* 06 滑模 */
  SMC: 'smc', 'VSC-RL': 'smc', 'PowerRate-SMC': 'smc', ISMC: 'smc',
  TSMC: 'smc', FTSMC: 'smc', NFTSMC: 'smc', ASMC: 'smc_adapt',
  SuperTwisting: 'sts', 'Twisting-2SMC': 'hosm', LevantHOSM: 'hosm',
  'VariableG-SMC': 'smc_adapt', 'Boundary-Layer-Varying-SMC': 'smc_bl',
  'Global-SMC': 'smc', 'HOSM-Quasi-Continuous': 'hosm',

  /* 07 自抗扰与观测补偿 */
  ADRC: 'adrc', 'NL-ADRC': 'adrc', DOB: 'observer', NDOB: 'observer',
  'T-DOB': 'observer', 'ESO-SMC': 'observer', 'UIO-Feedback': 'observer',
  'GPI-Control': 'observer', 'UDE-Control': 'observer',
  'Active-Force-Control': 'observer', 'Equivalent-Input-Disturbance': 'observer',

  /* 08 非线性几何与能量 */
  BangBang: 'bangbang', 'BangBang-Zone': 'bangbang', Relay: 'bangbang',
  TimeOptimal: 'timeopt', FeedbackLin: 'feedbacklin', Backstepping: 'backstep',
  DSC: 'dsc', NDC: 'pd2', EnergyShaping: 'energy',
  'Feedback-Passivation': 'passivity', 'Synergetic-Control': 'synergetic',
  SDRE: 'sdre', 'Harmonic-Oscillator-PBC': 'energy',
  'Flatness-Trajectory-Track': 'flatness',

  /* 09 自适应与辨识 */
  MRAC: 'mrac', 'MRAC-MIT': 'mrac', STR: 'adaptive', L1: 'adaptive',
  'I-and-I': 'adaptive', AdaptBackstepping: 'adaptive', ARC: 'adaptive',
  'RLS-Adaptive': 'adaptive', 'Nussbaum-Gain': 'adaptive', 'Composite-MRAC': 'mrac',

  /* 10 数据驱动与智能 */
  Fuzzy: 'learning', 'Neural-RBF-ADRC': 'learning', MFAC: 'learning',
  'U-Model': 'learning', ESC: 'learning', BELBIC: 'learning',
  'Linear-Actor-Critic': 'learning', 'CMAC-Cerebellar': 'learning',
  'SPSA-Optimizer': 'learning', 'VRFT-DataDriven': 'learning',

  /* 11 有限时间与约束 */
  PPC: 'ppc', 'Funnel-Control': 'ppc', BLF: 'blf', 'Tan-BLF': 'blf',
  'TimeVary-BLF': 'blf', 'Integral-BLF': 'blf', 'CBF-QP': 'cbf',
  CFTC: 'ftc', FxTC: 'ftc', PTC: 'ftc',

  /* 12 时滞、网络与高阶 */
  InputShaping: 'feedforward', Posicast: 'feedforward', SmithPredict: 'delay',
  'Artstein-Reduction': 'delay', TDC: 'delay', IMC: 'delay', ILC: 'ilc',
  Repetitive: 'ilc', GainSched: 'switched', Switched: 'switched',
  DynPole: 'statefb', ETC: 'etc', 'Event-Triggered-MPC': 'mpc',
  'Quantized-Ctrl': 'quantized', 'Extended-Luenberger': 'observer',
  'EKF-Ctrl': 'observer', 'Particle-Filter': 'observer', 'FO-PD': 'pd2',
  'Nonlinear-Power-ADRC': 'adrc', 'Implicit-Euler-Ctrl': 'smc_disc',
  'Lorenz-Coupled': 'energy', 'Speed-Gradient': 'speedgradient'
};

module.exports = { ARCH, ARCH_OF };
