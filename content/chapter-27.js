const chapter = {
  id: "27",
  slug: "agent-exploration-credit",
  part: "Agentic RL",
  title: "探索与信用分配",
  subtitle: "先找到有价值的路线，再判断哪一步值得强化",
  level: "前沿",
  duration: 180,
  prerequisites: ["15", "17", "25", "26"],
  tags: [
    "Exploration", "Credit Assignment", "EMPO²", "LUFFY", "GiGPO",
    "ELPO", "ProxMO", "TreePO", "LADDER", "SGE", "SSRL",
    "Step-GRPO", "ARPO", "VinePPO",
  ],
  objectives: [
    "区分探索不足与信用分配失真，并选择对应的干预",
    "手算 GiGPO 锚点优势和 ProxMO 相似度加权基线",
    "解释 EMPO² 记忆内化与 LUFFY 外部轨迹引导",
    "说明 ELPO 有限预算定位、树采样与 Monte Carlo 信号的代价",
    "按状态可比性、奖励可靠性和环境重放成本选择方法",
  ],
  summary:
    "探索决定训练能见到哪些路线，信用分配决定路线中的哪些动作被强化。本章从记忆、专家引导、状态分组、相似度基线和错误定位出发，解释十二种方法如何增加可用信号，以及为什么局部回报差不自动等于单步因果贡献。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：先找到信号，再比较可比的动作",
      body: String.raw`**先修能力：**第 15 章 score 与 baseline、第 17 章组优势、第 25 章有效状态、第 26 章噪声和 off-policy 支持。先判断没有成功是因为“没采到”，还是“采到了却奖错步骤”。

**学习链：**episode 与 step 回报分离 → 锚点候选和状态碰撞 → 自包含基线的相关性 → 软邻居温度与有效候选数 → 全同奖励组的梯度稀疏。最后回到 EMPO²、LUFFY、GiGPO、ProxMO、ELPO 等方法的不同干预位置。

**白板要求：**算出两级优势而不是只说“更细粒度”；能证明 baseline 消项需要什么独立性；能用采样成功概率说明为什么增大学习率或缩小标准差分母不能制造信息。新增数字与方差比较都是教学抽象，不是论文成绩。`,
      links: [
        { label: "Episode/step 与最优基线", sectionId: "math-credit-baselines", level: "推导" },
        { label: "状态碰撞与软邻居", sectionId: "math-neighbor-boundaries", level: "必会" },
        { label: "探索成功与零梯度组", sectionId: "math-exploration-sparsity", level: "推导" },
        { label: "已核验方法的准确边界", sectionId: "derivation", level: "进阶" },
        { label: "白板与设计反例", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先分清：没有找到好路线，还是奖错了步骤",
      body: String.raw`把 Agent 想成第一次来医院办手续的人。它可以问路、查看科室信息、排队、提交材料。最后“办成了”不意味着每次绕路都正确；最后“失败了”也不意味着最初问路没有价值。只有终局奖励时，训练同时面对两个问题：是否探索到足够不同且可行的路线，以及怎样把结果分配给中间动作。

**探索不足**表现为一组轨迹重复同一种失败，或者从未尝试关键工具。只细化优势估计，无法从不存在的成功路线中提取信号。**信用分配不足**则是路线中好坏步骤混杂：成功轨迹包含无效搜索，失败轨迹可能只在最后参数填写出错。给整条轨迹广播同一个优势，容易一起奖惩。

EMPO² 把探索经验变成可检索 tips。策略先从自己的交互中总结建议，后续 rollout 检索并使用它们。论文组合无 tips 的 on-policy 训练、保留 tips 条件的 on-policy 训练，以及对带 tips 生成的轨迹去掉 tips 再更新的 off-policy 内化。前两者学习各自条件下的行为，第三者尝试让无记忆输入的策略也学会有用路线。外部记忆增加显式的信息通道，不是说普通参数更新完全不能跨 episode 传递经验。

这里的困难是“看着攻略走”和“闭卷也会走”并非同一分布。去掉 tips 后，原动作可能概率很低，因此 EMPO² 还讨论低概率 token masking，并以状态新颖性奖励辅助探索。部署时是否仍检索、tips 如何更新、评估是否隔离历史答案，都要明确记录；不能把删除提示这一操作本身当成知识已经内化的证据。

LUFFY 在学生自己生成的轨迹之外加入 off-policy 高质量引导轨迹，混组比较奖励，并用 policy shaping 调整陌生动作的梯度权重。直觉是学生没走过的好路线也要有机会被学到。它不是简单把专家答案当作 SFT 标签，也不是给 GRPO 随便附加一个正则项。专家路线若依赖学生没有的工具或信息，奖励高也不代表可模仿；原论文主要验证推理任务，不保证所有工具环境同样受益。

SGE 则先生成高层自然语言策略，再按策略生成动作，并配合混合温度采样与策略反思。它把随机性放在“先查病史还是先核对药品”这种计划层面，而不只是提高每个 token 的温度。比较不同策略实际访问的状态、使用的工具和验证结果，才知道探索是否增加；多写几个不同标题并不等于行为多样性。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小手算：同一个状态，三条后续路线",
      body: String.raw`假设三个 Agent 都到达“已找到订单，尚未申请退款”的同一有效环境状态。后续折扣回报分别是 1、0.6、0。这里 0.6 是教学用的部分完成奖励，不是任何论文的报告数据。三个状态出现于不同轨迹、甚至不同时间步，但任务、初始条件和影响转移的状态信息都可比较。

GiGPO 的锚点分组先找重复状态，再比较从该步起的回报。暂不做标准差归一化：

$$B_{\mathrm{anchor}}=\frac{1+0.6+0}{3}=\frac{8}{15}\approx0.5333$$

$$A_{\mathrm{step}}=[0.4667,\ 0.0667,\ -0.5333]$$

第一条后续路线高于组基线，得到正信号；第二条虽没完全成功，仍比该状态的平均后续结果略好。GiGPO 还保留整条 episode 的相对优势，因此局部比较不会完全替代全局任务目标。

现在换成 ProxMO 的教学场景：候选来自同一任务组、同一步索引，但观测措辞不完全相同。与第一条当前观测的相似度经过温度 softmax，得到权重 0.6、0.3、0.1。加权基线为：

$$B_{\mathrm{soft}}=0.6\times1+0.3\times0.6+0.1\times0=0.78$$

$$A_{\mathrm{step},1}=1-0.78=0.22$$

高回报候选与目标更相似，使基线变高，正优势从 0.4667 缩为 0.22。两个算例故意使用相同回报，便于看出基线的作用，但它们的候选集合定义不同：不能把 GiGPO 跨时间的精确锚点分组直接换个权重就称为原版 ProxMO。

再看 ELPO。某次退款失败后，保留一个中间前缀，独立采样四次后缀都失败。若该前缀在当前续写策略下真实成功概率是 0.2，则四次都看不到成功的概率仍有：

$$P(\text{四次失败})=(1-0.2)^4=0.4096$$

约四成概率意味着，“这次没救回来”远不足以证明“这个动作之后永远无法挽回”。ELPO 在固定 rollout 预算下用恢复探测辅助定位错误；教学和实现都应保留预算、采样策略及探测次数，而不是把标签写成不受条件限制的因果真值。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从探索入口到局部优势的闭环",
      body: String.raw`图中有两条并行的信息来源。无提示学生 rollout 提供真实部署状态；记忆 tips 或专家路线提供探索引导。它们进入验证器后，才能讨论哪些结果有价值。随后根据环境条件选择精确状态分组、相似度基线或前缀恢复探测，构造信用信号并更新策略。

EMPO² 的关键边是“有 tips 轨迹”通向“无 tips 更新”，表示条件信息改变后的知识内化尝试。LUFFY 的外部轨迹入口表示行为来源改变。GiGPO、ProxMO、ELPO 则主要改变已采样轨迹如何比较。它们不是互斥的算法层级，但混用会同时改变采样分布、奖励和损失，需要逐项消融。

沿图审计一条数据时，依次问：谁生成了它；生成时看到哪些额外信息；验证器用什么判定成功；局部候选是否可比；更新时概率分母对应哪种行为条件。不要只记录最终的一个 advantage 数值。

最先应跑的是仅终局奖励的基线。再分别加入探索模块和信用模块，观察成功状态覆盖、每题采样预算、局部优势方差与真实任务成功率；否则更高的采样量可能被误报成更好的信用分配。`,
      diagram: {
        kind: "flow",
        nodes: [
          "任务与可重放初态",
          "无提示学生 Rollout",
          "记忆 Tips / 专家引导",
          "带引导轨迹",
          "验证结果与状态记录",
          "分组 / 加权 / 恢复探测",
          "按生成条件校正后更新",
          "无提示独立评估",
        ],
        links: [
          [0, 1], [0, 2], [2, 3], [1, 4], [3, 4],
          [4, 5], [5, 6], [3, 6], [6, 1], [6, 7],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "推导：状态基线、塑形权重与错误定位",
      body: String.raw`**统一符号。** 任务为 $x$，同任务轨迹编号为 $i$，环境动作步为 $t$，轨迹长度为 $T_i$。$s_{i,t}$ 是动作前的有效状态，$a_{i,t}$ 是动作，$r_{i,t}$ 是立即奖励，$\gamma\in[0,1]$ 是折扣系数。只给终局奖励是立即奖励的一种特例。定义：

$$G_{i,t}=\sum_{k=t}^{T_i-1}\gamma^{k-t}r_{i,k},\qquad R_i=G_{i,0}$$

$G_{i,t}$ 是从该步起的折扣回报，$R_i$ 是整条轨迹回报。轨迹级优势的教学简化是 $A_i^{\mathrm{episode}}=R_i-\bar R$，其中 $\bar R$ 为同任务组均值。是否除以标准差是额外选择，不应隐含在“相对优势”四个字里。

**GiGPO：精确锚点。** 令 $\mathcal H(s)$ 为同任务、同初态组中状态键等于 $s$ 的所有访问位置 $(j,u)$，允许跨轨迹、跨时间。使用均值归一化的示意式为：

$$B(s)=\frac{1}{|\mathcal H(s)|}\sum_{(j,u)\in\mathcal H(s)}G_{j,u}$$

$$A_{i,t}^{\mathrm{step}}=G_{i,t}-B(s_{i,t}),\qquad
A_{i,t}=A_i^{\mathrm{episode}}+\omega A_{i,t}^{\mathrm{step}}$$

$\omega\ge0$ 调节局部信号权重。GiGPO 用状态键和 hashmap 分组，不要求额外 rollout。只有一次访问的锚点，其均值中心化局部优势为零，仍可使用 episode 信号。状态键不能仅凭一句相同的工具返回就认定有效状态相同：权限、已执行副作用、剩余预算和必要历史也会影响后续回报。

**ProxMO：软邻居。** 原论文 PSA 使用 TF-IDF 表示的 cosine 相似度，而非必需训练新 embedding 模型。令 $z_{i,t}$ 为观测表示，$\mathcal C_{x,t}$ 为该任务组在同一步索引的有效候选，$\tau>0$ 为温度：

$$w_{ij,t}=
\frac{\exp(\operatorname{cos}(z_{i,t},z_{j,t})/\tau)}
{\sum_{k\in\mathcal C_{x,t}}\exp(\operatorname{cos}(z_{i,t},z_{k,t})/\tau)}$$

$$B_{i,t}=\sum_{j\in\mathcal C_{x,t}}w_{ij,t}G_{j,t},
\qquad A_{i,t}^{\mathrm{step}}=G_{i,t}-B_{i,t}$$

权重非负且和为一，所以基线位于候选回报的最小值与最大值之间。温度大时更接近平均，温度小时集中到最相似候选。原式可以包含自身；若自身权重趋近一，局部优势反而趋近零。另一个模块 PSC 按组成功率调节 episode 优势。它对易题失败和难题成功采用不同侧重，是设计偏好，不是断言易题上的失败一定没有价值。

**为什么 baseline 不自动保证无偏？** 对固定状态 $s$，若 $b(s)$ 在抽取当前动作前确定、不依赖该动作，且按同一策略完整求期望，则：

$$\sum_a\pi_\theta(a|s)b(s)\nabla_\theta\log\pi_\theta(a|s)
=b(s)\nabla_\theta\sum_a\pi_\theta(a|s)=0$$

$\pi_\theta$ 是参数为 $\theta$ 的策略。包含当前样本回报的有限组均值、按成功筛选的候选、与动作相关的邻居，都不自动满足上述条件。把 baseline 停止梯度只能阻断计算图，不能消除采样依赖；把相关状态当作同一状态，也不能从回报差推出动作的因果效果。

**LUFFY：改变陌生动作的学习权重。** 令 $u>0$ 为其 off-policy 项使用的概率比，$c>0$ 为塑形参数。为避免和折扣系数混淆，这里把论文塑形公式中的 gamma 改记为 $c$：

$$f(u)=\frac{u}{u+c},\qquad f'(u)=\frac{c}{(u+c)^2}$$

$c=0.1$、$u=0.01$ 时，$f(u)\approx0.0909$，而 $u=1$ 时 $f(u)\approx0.9091$。对 log-prob 的局部梯度系数为 $u f'(u)$，前者约 0.0826，大于未塑形 ratio 项的 0.01；这是解释低概率动作学习信号的一个局部算例，不意味着每个动作都被放大。论文同时讨论移除 on-policy clip 的配置，不能只摘出一个塑形函数就声称复现了完整 LUFFY。

**ELPO：有限预算的恢复边界。** 二分错误定位（Binary Error Localization，BEL）固定前缀，生成若干后缀；有一次成功就说明该探测前缀在此次预算内可恢复。它用这种信号二分搜索潜在关键错误，再结合分支兄弟回报和轨迹排名构造优势。概率恢复函数未必严格单调，采样也有噪声，因此要区分二分探测点数与每点多次续写的总 token、工具调用成本。

ELPO 对关键步骤及其生成后缀放宽下侧裁剪边界。记 PPO 概率比为 $\rho$、优势为 $A$、下界为 $1-\epsilon_{\mathrm{low}}$。当 $A<0$ 且 $\rho$ 低于下界时，通常的 min+clip 项进入平台；增大 $\epsilon_{\mathrm{low}}$ 可以让降低该动作概率的梯度作用更久。这不是“错误前全部置零、错误步固定为负”的硬标签规则。

**VinePPO：用续写估值。** 从前缀状态 $s$ 按指定策略独立续写 $K$ 次，以后续回报均值估计价值：

$$\hat V(s)=\frac1K\sum_{k=1}^{K}G^{(k)}(s),\qquad
\hat A_t=r_t+\gamma\hat V(s_{t+1})-\hat V(s_t)$$

这是说明价值差如何提供局部信号的教学形式。若 $K=4$、当前状态两次成功、下一状态三次成功、二元终局奖励且当前立即奖励为零，取 $\gamma=1$ 得 $0.75-0.5=0.25$。VinePPO 用 Monte Carlo 中间状态估值替代学习型 critic，但仍保留 PPO 框架。可重放纯文本前缀不等于可廉价回滚真实付款或文件删除；环境是否能精确恢复决定了这种估值的适用成本。`,
    },
    {
      id: "math-credit-baselines",
      type: "derivation",
      title: "两级信用与 baseline：从手算到梯度方差",
      body: String.raw`**不要混合两个回报起点。** 设同任务组整条回报 $R=[1,0,0]$，某个可比锚点的后续回报 $G=[1,0.6,0]$。例如取 $\gamma=1$，到锚点前累计奖励为 $[0,-0.6,0]$，就能得到这组不同的 episode/step 回报。为展示 GiGPO 式两级组合，这里只中心化，不除标准差：

$$\bar R=\frac13,\quad A^{\mathrm{ep}}=(2/3,-1/3,-1/3),\quad
B_{\mathrm{anchor}}=\frac8{15},\quad
A^{\mathrm{step}}=(7/15,1/15,-8/15).$$

$$A=A^{\mathrm{ep}}+0.5A^{\mathrm{step}}
=(0.9,-0.3,-0.6).$$

第二条局部做得略好于锚点平均，但整条仍比任务组均值差，最终信号为负。$\omega=0.5$ 是本例选择，不是原论文默认值；标准化、筛选或改变候选会改变结果。组合优势是估计器设计，不自动等于某个精确因果分解。

**最优标量 baseline 不是平均 reward。** 固定状态、on-policy，score 向量 $\psi=\nabla\log\pi(a|s)$，动作无关的固定 $b$ 满足 $\mathbb E[b\psi]=0$。梯度均值不随 $b$ 改变，故最小化方差等价于最小化二阶矩：

$$M(b)=\mathbb E[(R-b)^2\|\psi\|^2],\qquad
\frac{dM}{db}=-2\mathbb E[(R-b)\|\psi\|^2]=0$$

$$b^*=\frac{\mathbb E[R\|\psi\|^2]}{\mathbb E[\|\psi\|^2]}.$$

分母必须为正，各项二阶矩有限。二元动作 $a\in\{0,1\}$、$p=\sigma(z)=0.8$、$R=a$，score 为 $\psi=a-p$，所以真梯度为 $p(1-p)=0.16$，而 $b^*=1-p=0.2$，不是 $\mathbb ER=0.8$。

取 $b=0.2$：动作 1 的梯度样本为 $(1-0.2)(1-0.8)=0.16$；动作 0 的梯度样本为 $(0-0.2)(0-0.8)=0.16$，方差恰为零。这个确定性二元特例不推广为所有任务可零方差。取 $b=0$ 时方差 0.0064；取平均 reward 基线 $b=0.8$ 时梯度样本为 0.04 或 0.64，方差反而为 0.0576。降低 reward 方差不等于降低梯度方差。

**同批估计的另一层边界。** 同状态 $N$ 条独立样本，令 $g=\mathbb E[R\psi]$，$\bar R=N^{-1}\sum_iR_i$。对每个 $i$，只有均值中的自身项与 $\psi_i$ 相关，故

$$\mathbb E[\psi_i\bar R]=g/N,\qquad
\mathbb E\left[\frac1N\sum_i\psi_i(R_i-\bar R)\right]=(1-1/N)g.$$

此二元例 $N=2$ 时期望变成 0.08；去掉自身的 LOO baseline 恢复 0.16。detach 不改变这两个数。树分支共享随机前缀、按 reward 选择邻居、组标准差归一化时，不能继续直接套独立样本结论。

**追问链：**哪一级回报？→ 候选有哪些？→ 基线估计是否包含自身？→ 优化的是 reward 方差还是梯度方差？这些问题先于算法简称。`,
    },
    {
      id: "math-neighbor-boundaries",
      type: "derivation",
      title: "锚点碰撞与软邻居：覆盖率换来了什么偏差",
      body: String.raw`**精确键仍可能语义碰撞。** 两次观测都是“订单已找到”，但一次有退款权限，一次权限已过期。若相同动作在两类隐藏状态的期望后续回报分别为 0.9、0.1，等量混合的基线是 0.5；同一动作就出现期望局部差 +0.4、-0.4。差异来自隐藏权限，不足以归因于动作质量。

这不是说任何观测基线都必然使 REINFORCE 有偏：只要基线在当前动作前确定、满足 score 消项条件，仍可无偏。碰撞直接破坏的是“同一有效状态下比较动作”的解释，并可能增大方差；自包含、动作相关筛选则另有统计偏差。相反，键包含随机 request ID 会让锚点全变单例，中心化 step 优势为零。应分别统计碰撞抽检和重复锚点覆盖。

**软基线的完整计算。** 同任务、同一步候选的 cosine 相似度为
$s=[1,1-0.2\log2,1-0.2\log6]$，温度 $\tau=0.2$，回报为 $[1,0.6,0]$。减去最大 logit 后，指数比例为 $[1,1/2,1/6]$：

$$w=(0.6,0.3,0.1),\qquad B=\sum_jw_jG_j=0.78,\qquad A_1=0.22.$$

权重和为 1，因此 $B$ 一定位于回报范围 $[0,1]$。权重的有效候选数可诊断为 $N_{\mathrm{eff}}=1/\sum_jw_j^2=50/23\approx2.173913$，但它不检查候选是否独立或真正相似。

若排除当前样本，自身剩余权重归一化成 $(0.75,0.25)$，得到 $B_{-1}=0.45$、$A_1=0.55$。这是教学对照，**不是声称原版 ProxMO 必须排除自身**；它也不自动解决候选筛选依赖、树分支相关或隐藏状态失配。

**温度极限与敏感性。** 固定候选回报和相似度，令 $\bar s=\sum_jw_js_j$，则：

$$\frac{\partial w_j}{\partial\tau}
=-\frac{w_j(s_j-\bar s)}{\tau^2},\qquad
\frac{dB}{d\tau}=-\frac{\operatorname{Cov}_w(G,s)}{\tau^2}.$$

本例相似度与回报正相关，升温使基线降低。$\tau\to\infty$ 时回到等权基线 $8/15$；$\tau\to0^+$ 且自身是唯一最相似者时，$B\to1$、自身优势趋零。若最大相似度有 ties，质量分配到所有并列者，而非必定只剩自己。$\tau=0$ 未定义；空候选、TF-IDF 零向量或非有限相似度必须有显式处理。

**追问链：**候选是跨时间锚点还是同一步邻居？→ 文本否定、权限、预算是否被保留？→ 自身权重多大？→ 温度改变了哪种偏差与方差？软匹配增加比较机会，不等于获得因果真值。`,
    },
    {
      id: "math-exploration-sparsity",
      type: "derivation",
      title: "探索与梯度稀疏：成功覆盖不等于可用相对优势",
      body: String.raw`**简化假设。** 同任务独立采样 $K$ 条轨迹，每条二元终局成功概率为 $p$，只使用组中心化终局 reward，不加其它信号。至少见到一次成功的概率和出现混合奖励组的概率分别为：

$$P_{\mathrm{hit}}=1-(1-p)^K,\qquad
P_{\mathrm{mixed}}=1-p^K-(1-p)^K.$$

第二式减掉全对和全错两种组。全对虽然展示了任务成功，却与全错一样没有中心化优势；这里“零信号”只指该 reward 的组相对项，KL、熵、过程信号仍可能产生梯度。

**数字例子。** $p=0.1,K=4$ 时，$P_{\mathrm{hit}}=0.3439$，$P_{\mathrm{mixed}}=0.3438$，全同奖励概率为 0.6562。四条已经花了预算，但约三分之二的组没有这种相对区分度。把标准差分母加再小的 epsilon 都不能让全零分子产生任务方向。

若希望至少一次成功的概率达到 95%，解 $(1-p)^K\le0.05$：

$$K\ge\left\lceil\frac{\log0.05}{\log(1-p)}\right\rceil.$$

$p=0.1$ 时最小整数是 29，覆盖概率约 0.952899；28 次还只有 0.947665。这里要求已知且恒定的 $p$、独立样本和可靠判定；$p=0$ 没有有限解，$p=1$ 一次就成功但中心化终局信号仍为零。

**把预算写出来。** 假设每条完整轨迹花 2000 token、6 次工具调用，四条用 8000 token、24 次调用；29 条用 58000 token、174 次调用。多次尝试的覆盖提升不能冒充训练后的 pass@1 提升，也不能用早停后的成功率和固定完整采样成本混算。

若四条轨迹完全共享同一次成功/失败结果，至少成功概率仍是 0.1，混合组概率为零，而不是以上独立公式。共享前缀可能让结果正相关；实际相关程度需要测量，不能只看样本计数。组内独立性不足也影响 LOO 的无偏推导。

**干预顺序。** 先核验环境可解和 reward；再用课程、参考引导或记忆提高找到不同路线的概率；已有成功与失败混合时才比较局部信用；最后用固定总预算衡量收益。方法可能改变任务分布或可见信息，部署无提示能力要单独测。

**追问链：**需要至少一个成功，还是需要组内对比？→ 独立性成立吗？→ 每组新增成本多少？→ 是否真的提高单次部署成功率？`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：算出硬分组与软基线",
      body: String.raw`以下代码仅依赖 Python 标准库，可以直接运行。折扣回报已经算好，任务和初态键也已记录。第一部分故意把同一状态放在不同时间步，展示 GiGPO 的锚点候选；第二部分另建同一步候选，展示 ProxMO 的 softmax 基线。它不是完整训练器，也不实现 TF-IDF 文本向量化。

~~~python
from collections import defaultdict
from math import exp, isclose, log

# task, initial_state, state_key, time, discounted_return
visits = [
    ("refund", "start-v1", "order-ready", 1, 1.0),
    ("refund", "start-v1", "order-ready", 3, 0.6),
    ("refund", "start-v1", "order-ready", 2, 0.0),
    ("other", "start-v1", "order-ready", 1, 9.0),
]
groups = defaultdict(list)
for task, initial, state, time, ret in visits:
    groups[(task, initial, state)].append(ret)

anchor_returns = groups[("refund", "start-v1", "order-ready")]
anchor_baseline = sum(anchor_returns) / len(anchor_returns)
anchor_advantages = [ret - anchor_baseline for ret in anchor_returns]
assert isclose(anchor_baseline, 8 / 15)
assert isclose(sum(anchor_advantages), 0.0, abs_tol=1e-12)

def soft_baseline(returns, similarities, temperature):
    if len(returns) != len(similarities) or not returns:
        raise ValueError("candidate lengths must agree and be non-empty")
    if temperature <= 0:
        raise ValueError("temperature must be positive")
    scores = [value / temperature for value in similarities]
    offset = max(scores)
    numerators = [exp(value - offset) for value in scores]
    normalizer = sum(numerators)
    weights = [value / normalizer for value in numerators]
    baseline = sum(w * ret for w, ret in zip(weights, returns))
    return baseline, weights

# Separate candidates: same task, same step; synthetic cosine scores.
returns = [1.0, 0.6, 0.0]
temperature = 0.2
similarities = [1.0, 1.0 - 0.2 * log(2), 1.0 - 0.2 * log(6)]
baseline, weights = soft_baseline(returns, similarities, temperature)
assert all(isclose(w, v) for w, v in zip(weights, [0.6, 0.3, 0.1]))
assert isclose(baseline, 0.78)
assert isclose(returns[0] - baseline, 0.22)
assert min(returns) <= baseline <= max(returns)

miss_probability = (1.0 - 0.2) ** 4
assert isclose(miss_probability, 0.4096)
shape = lambda u, c: u / (u + c)
assert isclose(shape(0.01, 0.1), 1 / 11)
assert isclose(3 / 4 - 2 / 4, 0.25)
print("anchor:", round(anchor_baseline, 4))
print("soft:", round(baseline, 2), "advantage:", round(1 - baseline, 2))
print("four failed probes:", round(miss_probability, 4))
~~~

预期输出依次包含 0.5333、0.78 与 0.22、0.4096。把第一条轨迹任务键改掉，锚点组成员会变化；把温度调小，自身观测会获得更大的权重。两个实验分别检查“候选集合是否正确”和“权重是否过于集中”，不要只看最终损失是否下降。

接入训练时，回报、权重和优势通常作为不参与反向传播的统计量；只对策略 log-prob 或指定 ratio 反传。每个环境动作若包含多个生成 token，还要明确动作级优势如何广播、按 token 还是按动作归一化，并继续屏蔽用户输入和工具返回的策略损失。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "实现检查：可比较不等于因果等价",
      body: String.raw`**状态键的两种错误。** 把时间戳、随机 request ID 都放入键，可能让每个状态只出现一次；把库存、登录身份或已发生的副作用删掉，则会把不等价状态合并。先列出影响转移和奖励的字段，再做规范化。若只有部分观测，明确它是观测分组，不要宣称获得了完整状态条件下的因果比较。

**相似度会忽略关键否定。** “支付成功”和“支付未成功”共享大量词，TF-IDF 相似不等于后续价值相同。ProxMO 的软分组增加覆盖，也引入邻居偏差；应检查失败样例的邻居列表、自身权重、有效候选数与温度敏感性。零向量要有预先定义的处理，不能让 NaN 混入 softmax。

**恢复探测可能改变世界。** ELPO 和 VinePPO 都需要某种前缀或状态复用。仅重发历史文本不会撤销已经执行的数据库写入；外部环境必须有快照、隔离或幂等机制。用另一策略、更长预算成功恢复，也不能直接当作原策略在原预算下的恢复能力。

**记忆和模拟知识会泄漏或过时。** EMPO² tips 必须按训练与评测边界隔离。SSRL 的 Self-Search 用模型内部知识模拟搜索，通过格式和规则奖励训练，减少外部搜索调用，却仍要生成和优化轨迹。它不是完全 offline RL，也不能免费获得预训练之后的新事实；接上真实检索后，要单独测量 sim-to-real 迁移。

**高熵不一定高信息量。** ARPO 在高不确定性位置分配额外 rollout 很有针对性，但乱码、格式错误也可能高熵。报告单位工具调用带来的成功提升，并限制对明显无效分支的重复预算。TreePO 的早停剪枝同样会改变看到的数据，必须监控被剪掉的任务和策略类型。

**局部奖励不是万能过程真值。** Step-GRPO 的步骤匹配和结构检查有明确可操作定义，却不能证明每一步推理在逻辑上正确。验证器漏洞、模板匹配和答案泄漏可能使局部指标上涨、任务成功下降。最低限度要同时保留独立终局测试、局部标注抽检和固定预算对照。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "十二种方法：信号从哪里增加",
      body: String.raw`| 方法 | 主要干预 | 新增信号或成本 |
|---|---|---|
| EMPO² | 检索经验 tips，混合有提示学习与去提示内化 | 记忆总结和检索，条件分布校正 |
| LUFFY | 学生与外部引导轨迹混组，policy shaping | 高质量外部路线和奖励可比性 |
| GiGPO | 重复状态形成锚点组 | 复用已有 rollout，依赖可靠状态键 |
| ProxMO | 成功率调节与相似度加权基线 | 文本相似度计算，邻居偏差 |
| ELPO | 固定前缀恢复探测，定位关键错误 | 多次后缀 rollout 与恢复噪声 |
| TreePO | 动态树分叉、固定长度片段、片段优势 | 共享前缀摊销，样本相关与剪枝偏差 |
| LADDER | 递归生成并解决更简单的题目变体 | 难度课程与变体验证 |
| SGE | 高层策略先行、混合温度、反思 | 计划层多样性及额外生成 |
| SSRL | 内部知识模拟搜索交互 | 减少外部检索，需检验真实搜索迁移 |
| Step-GRPO | 中间步骤匹配与结构有效性奖励 | 依赖过程参考和奖励设计 |
| ARPO | 熵引导局部自适应采样与优势归因 | 额外采样集中在不确定步骤 |
| VinePPO | 前缀多次续写估计价值 | Monte Carlo 成本替代学习型 critic |

**TreePO 不只是缓存。** 原论文用动态树采样和固定长度 segment decoding，在共享前缀后分叉，并从树结构估计片段级优势；低价值路径可以早停。它同时改变采样和学习信号。第 28 章的 prefix sharing 则首先是计算复用问题：即使不改变采样决策，也能合并相同前缀。二者可结合，但不能用一次前向计算节省来证明探索策略变好。

**LADDER 处理“全组都不会”。** 它递归构造更简单的变体，先取得可验证成功，再回到困难问题。原始验证围绕数学积分，不能把具体积分结果写成所有 Agent 的冷启动保证。工具场景可以借鉴其课程思想，例如先练单一工具再练组合，但变体必须保留目标技能；不断删除约束让任务变容易，不是完成原任务。

**Step-GRPO 的两个信号要拆开。** R1-VL 中 StepRAR 以软匹配评估必要中间步骤，StepRVR 检查背景、推理、答案等部分的完整性与顺序。它们来自多模态推理设置。若用于工具动作，需要另行定义“正确步骤”和“有效结构”，并验证格式高分是否真正伴随环境成功。

**ARPO 与 VinePPO 的预算侧重不同。** ARPO 用熵等不确定性信号在工具反馈后的关键位置自适应分配局部采样，并结合整条轨迹与步骤层面的优势归因；VinePPO 通过前缀续写估计中间价值。前者回答“在哪多花预算”，后者回答“这些续写怎样成为价值估计”。任何组合都需要算入总生成 token、环境调用和恢复成本。

工程选择顺序是：全组长期零成功，先检查任务可解性，再比较记忆、专家引导或课程；已有混合结果而动作信用粗糙，先试现有数据可计算的锚点或软基线；状态难比较但前缀能便宜恢复，再评估错误定位与 Monte Carlo；真正需要更多分支时，才增加局部树采样预算。这里是按瓶颈组织的建议，不是十二种方法的统一性能排名。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：把方法落到数据、信号与成本",
      body: String.raw`**30 秒回答：**“Agentic RL 的探索决定能不能见到成功路线，信用分配决定路线里哪些动作被强化。EMPO² 用记忆引导并尝试内化，LUFFY 用外部高质量路线和塑形；GiGPO 比较相同状态的后续回报，ProxMO 用相似观测加权基线，ELPO 用有限预算的前缀恢复探测定位错误。它们增加的是可用估计信号，不是自动拿到单步因果真值。”

**为什么有终局奖励还需要局部优势？** 长轨迹中成功动作和无效动作混杂；局部比较有机会减少粗粒度奖惩。但局部估计若更噪或有偏，未必胜过简单终局基线，应比较固定预算下成功率与梯度方差。

**GiGPO 和 ProxMO 的核心取舍？** 前者依赖可靠精确锚点，可跨时间匹配，覆盖不足时局部信号稀疏；后者以同一步候选的相似度扩大比较范围，但可能把价值不同的观测混在一起。先说候选集合，再说权重，不能只说一个硬、一个软。

**ELPO 的定位为什么不是证明？** 续写失败取决于策略与预算；即使每次有两成概率成功，四次都失败仍有 0.4096 的概率。它提供可训练的错误定位估计，不是排除所有恢复路径的穷举证明。

**全组奖励相同怎么办？** 中心化 episode 优势可能为零。若存在有区分度的局部回报，可利用它；否则需要改变探索或任务课程。LADDER 增加可解变体，LUFFY 引入外部引导；凭空缩小标准差分母并不会创造正确方向。

**如何证明记忆真正被内化？** 固定模型预算与任务划分，分别测量带 tips、去 tips 和从未见过的任务；保持评估时可见信息一致。只报告带记忆成功率，证明的是系统借助记忆的效果，不是无记忆策略已具备同等能力。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：候选集合、概率与证据",
      body: "先写出你的候选集合和假设，再计算；不要只记算法缩写。",
      questions: [
        {
          q: "回报为 1、0.6、0，权重为 0.6、0.3、0.1。第一条的软基线和局部优势是多少？",
          a: "基线是 0.78，优势是 0.22。等权基线为 8/15，第一条优势约 0.4667。两种基线回答的是不同的比较问题。",
        },
        {
          q: "GiGPO 的重复状态可在不同时间步吗？ProxMO 原式的候选也完全一样吗？",
          a: "GiGPO 的锚点可跨轨迹、跨时间，但要求同任务初态组内有效状态可比。ProxMO PSA 原式在同任务组的同一步索引上做相似度加权，不能直接当作同一候选集合。",
        },
        {
          q: "ELPO 在一个前缀上四次续写失败，能否断言此前动作不可挽回？",
          a: "不能。若当前策略一次续写成功率为 0.2，独立四次全败概率仍是 0.4096。应记录有限预算下未观察到恢复，而不是宣称对所有策略都不可恢复。",
        },
        {
          q: "把 baseline detach，是否就保证优势估计无偏？",
          a: "不保证。detach 只处理反向传播；baseline 若包含当前样本回报或依赖动作筛选，仍可能与当前动作相关。经典消项条件需要另行检查。",
        },
        {
          q: "SSRL 不调用外部搜索，为什么仍不是零成本、完全离线训练？",
          a: "它仍用策略生成模拟搜索轨迹并开展 RL，消耗推理与优化计算。省下外部检索不等于获得真实新知识，还需接入真实检索评估迁移。",
        },
        {
          q: "Step-GRPO 的 StepRAR、StepRVR 与精确的步骤因果标签有何区别？",
          a: "前两者是中间步骤软匹配与结构有效性检查，属于可操作过程奖励；它们不证明每一步逻辑正确，更不直接测出工具动作的因果贡献。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：两级优势、邻居与探索预算",
      body: "把候选集合、采样独立性和归一化规则写在公式旁，再讨论算法选择。",
      questions: [
        {
          q: "episode 回报为 [1,0,0]，锚点后续回报为 [1,0.6,0]，只中心化，step 系数为 0.5。求组合优势；为什么第二条局部优势为正但总优势仍负？",
          a: String.raw`episode 优势是 $(2/3,-1/3,-1/3)$，锚点均值为 $8/15$，step 优势是 $(7/15,1/15,-8/15)$。相加得到 $(0.9,-0.3,-0.6)$。第二条后续好于锚点平均，但整条低于任务组均值，局部改善未抵消整条负信号。**得分点：**回报起点、两个基线、组合系数。追问：标准差归一化和换候选集合会改变数值，不能隐含在“相对优势”中。`,
        },
        {
          q: "二元策略 p=0.8、R=a、score=a-p。推导最优固定 baseline，比较 b=0.2 与 b=0.8 的梯度方差；N=2 自包含组均值有何影响？",
          a: String.raw`最小化 $\mathbb E[(R-b)^2\psi^2]$ 得 $b^*=\mathbb E[R\psi^2]/\mathbb E[\psi^2]=0.2$。此时两种梯度样本均为 0.16，方差零；b=0.8 时样本为 0.04、0.64，均值 0.16、方差 0.0576。N=2 自包含均值使期望乘 1/2 得 0.08；条件独立 LOO 恢复 0.16。**得分点：**梯度能量加权、二阶矩、统计依赖与 detach 的区别。追问：树分支不独立时不能照搬 LOO 结论。`,
        },
        {
          q: "回报 [1,0.6,0]、邻居权重 [0.6,0.3,0.1]，求第一条的优势、有效候选数及排除自身后的结果；设计一个文本相似却不应归为同状态的反例。",
          a: String.raw`基线 0.78，优势 0.22；$N_{\mathrm{eff}}=1/(0.36+0.09+0.01)=50/23$。排除自身后其余权重为 0.75、0.25，基线 0.45，优势 0.55。相同“订单已找到”但退款权限不同就不可当作同一有效状态。**得分点：**重归一化、自包含极限、状态语义。追问：排除自身不是原版 ProxMO 的强制规则，也不保证筛选后样本独立。`,
        },
        {
          q: "成功率 p=0.1，独立采四条，仅二元终局组中心化。至少一个成功和非零相对信号组各多大概率？要 95% 成功覆盖需几条？",
          a: String.raw`至少一个成功为 $1-0.9^4=0.3439$，混合组为 $1-0.9^4-0.1^4=0.3438$。解 $0.9^K\le0.05$ 得 K 至少 29，覆盖约 0.952899。若每条 2000 token、6 次调用，则需 58000 token、174 次调用。**得分点：**区分全对与混合、取整数上界、完整预算。追问：完全相关的四条样本成功覆盖仍是 0.1，组内信号为零；加 epsilon 或调大学习率都不能创造方向。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "EMPO²: Exploratory Memory-Augmented LLM Agent",
      url: "https://arxiv.org/html/2602.23008v1#S4",
      evidence: "原论文：tips 检索、混合 on/off-policy 内化与探索；不搬运相对提升数字",
    },
    {
      label: "LUFFY: Learning to Reason under Off-Policy Guidance",
      url: "https://arxiv.org/html/2504.14945v1#S2",
      evidence: "原论文：混合轨迹组、regularized importance sampling 与 policy shaping",
    },
    {
      label: "GiGPO: Group-in-Group Policy Optimization",
      url: "https://arxiv.org/html/2505.10978v1#S4",
      evidence: "原论文：hashmap 锚点分组、折扣回报、episode 与 step 优势组合",
    },
    {
      label: "ELPO: Learning from the Irrecoverable",
      url: "https://arxiv.org/html/2602.09598v1#S4",
      evidence: "原论文：固定预算 BEL、分支比较和关键步骤及后缀的下侧裁剪放宽",
    },
    {
      label: "ProxMO: Proximity-Based Multi-Turn Optimization",
      url: "https://arxiv.org/html/2602.19225v1#S3",
      evidence: "原论文：PSC、TF-IDF cosine PSA；同任务同一步候选可包含自身",
    },
    {
      label: "TreePO: Tree-Based Policy Optimization",
      url: "https://arxiv.org/abs/2508.17445",
      evidence: "原论文摘要：动态树采样、固定长度片段与片段级优势，非单纯缓存优化",
    },
    {
      label: "LADDER: Autonomous Difficulty-Driven Example Recursion",
      url: "https://arxiv.org/abs/2503.00735v3",
      evidence: "原论文摘要：递归构造简单变体；原始应用是数学积分",
    },
    {
      label: "SGE: Strategy-Guided Exploration",
      url: "https://arxiv.org/abs/2603.02045",
      evidence: "原论文摘要：高层策略、混合温度和策略反思",
    },
    {
      label: "SSRL: Self-Search Reinforcement Learning",
      url: "https://arxiv.org/abs/2508.10874",
      evidence: "原论文摘要：内部知识模拟搜索、格式与规则奖励及 sim-to-real 评估",
    },
    {
      label: "R1-VL: Step-wise Group Relative Policy Optimization",
      url: "https://arxiv.org/html/2503.12937v2",
      evidence: "原论文：StepRAR 与 StepRVR；以正文纠正摘要中的缩写重复",
    },
    {
      label: "ARPO: Agentic Reinforced Policy Optimization",
      url: "https://arxiv.org/abs/2507.19849",
      evidence: "原论文摘要：熵引导局部采样、整轨迹与步骤预算平衡、优势归因",
    },
    {
      label: "VinePPO: Monte Carlo Value Estimation for Reasoning",
      url: "https://arxiv.org/html/2410.01679v2#S4",
      evidence: "原论文：前缀重放的 Monte Carlo 价值估计替代学习型 critic",
    },
  ],
};

export default chapter;
