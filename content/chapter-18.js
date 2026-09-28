const chapter = {
  id: "18",
  slug: "dpo-preference-optimization",
  part: "LLM 后训练",
  title: "DPO 与偏好优化家族",
  subtitle: "从 KL 正则奖励最大化到成对分类损失",
  level: "进阶",
  duration: 145,
  prerequisites: ["03", "08", "16"],
  tags: ["DPO", "IPO", "KTO", "ORPO", "SimPO", "Preference Optimization"],
  objectives: [
    "从 KL 正则策略目标推导 DPO 隐式奖励",
    "手算 chosen/rejected 的 DPO logit",
    "比较 IPO、KTO、ORPO 与 SimPO 的数据和目标",
    "解释离线、在线、迭代与 step-level 偏好优化",
  ],
  summary:
    "DPO 把奖励模型和在线 RL 合并为一个基于偏好对的分类目标，用相对 reference 的似然差提高 chosen、压低 rejected；它更简单，但仍受偏好数据覆盖、长度偏差和离线分布限制。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从约束最优策略到偏好损失与梯度",
      body: String.raw`先修 KL、拉格朗日乘子、sigmoid 和序列 likelihood。按“固定奖励的策略最优化 → 隐式奖励 → Bradley-Terry 消去配分函数 → DPO 梯度 → 各变体数据与公式”学习。白板上要保留归一化乘子和所有 beta 因子，不能只背一个最终 loss。标准 DPO 是固定数据上的监督优化，没有 PPO 的 old-policy 分母。`,
      links: [
        { label: "DPO 完整拉格朗日推导", sectionId: "derivation", level: "必会" },
        { label: "梯度、beta 与长度", sectionId: "math-dpo-gradient-length", level: "推导" },
        { label: "IPO、SimPO、ORPO", sectionId: "math-preference-pairs", level: "进阶" },
        { label: "KTO 与非成对反馈", sectionId: "math-kto", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：学习相对偏好，不预测绝对分数",
      body: String.raw`经典 RLHF 先训练标量奖励模型，再用 PPO 采样并优化。DPO（Direct Preference Optimization）观察到，在特定 KL 正则奖励最大化假设下，最优策略与 reference policy 的概率比已经编码隐式奖励，因此可直接用 chosen/rejected 对训练策略，无需显式 reward model 和 rollout loop。

一条数据是 $(x,y_w,y_l)$：同一个 prompt $x$ 下，$y_w$ 被偏好，$y_l$ 被拒绝。DPO 不只提高 chosen 的绝对似然，而是提高“当前策略相对 reference 对 chosen 的增幅”与“对 rejected 的增幅”之间的差。

reference 很重要。若 chosen 本来就在基座中概率很高，当前策略无需无限提高；若 rejected 也同步被提高，偏好间隔没有改善。DPO 通过 log-ratio 比较这种相对变化。

它常被称为“RL-free”，更准确的说法是训练过程不显式运行奖励模型与在线策略梯度；推导仍来自 KL 正则控制目标。离线偏好数据固定后，模型不会看到自己更新后新产生的错误状态，这与 on-policy RL、OPD 的数据闭环有根本差异。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：四个 log 概率决定一对偏好",
      body: String.raw`对某 prompt，当前策略给 chosen 与 rejected 的序列 log 概率分别为 -2.0 与 -3.0；reference 对应为 -2.5 与 -2.7。当前策略相对 reference 的变化：

$$\log\frac{\pi_\theta(y_w|x)}{\pi_{\mathrm{ref}}(y_w|x)}
=-2.0-(-2.5)=0.5$$

$$\log\frac{\pi_\theta(y_l|x)}{\pi_{\mathrm{ref}}(y_l|x)}
=-3.0-(-2.7)=-0.3$$

偏好 margin 为 $\Delta=0.5-(-0.3)=0.8$。若 $\beta=0.1$，DPO 分类 logit 为 0.08，模型认为 chosen 胜出的概率为 $\sigma(0.08)\approx0.52$，仍有继续学习空间。

注意序列 log 概率是 token log 概率之和。长回答自然累加更多负数，因此长度分布会影响 margin。使用相同 prompt 的成对数据可部分抵消，但 chosen 与 rejected 长度系统不同仍会形成偏差。

若当前策略同时把两条回答都提高相同的相对 log-ratio，$\Delta$ 不变，DPO 不认为偏好改善。这体现了成对目标，也说明单看 chosen loss 不能诊断 DPO。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从偏好对到 DPO 更新",
      body: String.raw`数据构造先对同一 prompt 产生候选，再由人类、规则、reward model 或 judge 选择 preferred/rejected。训练时 current policy 和 frozen reference 分别计算两条回答的 log probability，形成一个偏好 logit，经 logistic loss 更新 current policy。

若偏好数据来自旧模型，DPO 是离线优化。Iterative/online DPO 会周期性用当前策略生成新候选、重新标注并训练，使数据覆盖跟上策略变化；但只要标注器是外部 judge，它仍有 judge 偏差和额外推理成本。

Step-level preference 把一条推理轨迹拆成中间步骤比较，信用更细，但标注“哪一步更好”更难，且局部正确不一定带来全局正确。数据粒度和目标粒度必须一致。`,
      diagram: {
        kind: "flow",
        nodes: [
          "Prompt",
          "候选回答",
          "偏好标注",
          "Current + Reference",
          "相对 Log-Ratio",
          "Pairwise Loss",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "从 KL 正则最优策略到 DPO",
      body: String.raw`对固定 prompt $x$，考虑奖励 $r(x,y)$ 与 reference $\pi_{\mathrm{ref}}$：

$$\max_\pi
\mathbb E_{y\sim\pi}[r(x,y)]
-\beta D_{\mathrm{KL}}(\pi(\cdot|x)\|\pi_{\mathrm{ref}}(\cdot|x))$$

**第一步：说明可解条件。** 在有限回答集合上，假设 $\beta>0$、reference 对每个允许回答为正，奖励有限。无限集合还需配分函数有限；reference 为零的回答不能获得有限 KL 下的正质量。

**第二步：引入归一化乘子。** 简记 $p_y=\pi(y|x),q_y=\pi_{\rm ref}(y|x),r_y=r(x,y)$：

$$\mathcal L(p,\lambda)=\sum_yp_yr_y-\beta\sum_yp_y\log(p_y/q_y)
+\lambda\left(\sum_yp_y-1\right)$$
$$\frac{\partial\mathcal L}{\partial p_y}
=r_y-\beta[\log(p_y/q_y)+1]+\lambda=0$$
$$\log(p_y/q_y)=r_y/\beta+\lambda/\beta-1,\qquad
p_y=q_y e^{r_y/\beta}e^{\lambda/\beta-1}$$

**第三步：求归一化常数。** 对 y 求和，$1=e^{\lambda/\beta-1}\sum_yq_ye^{r_y/\beta}$。定义 $Z(x)=\sum_yq_ye^{r_y/\beta}$，可得：

$$\pi^*(y|x)=\frac{1}{Z(x)}
\pi_{\mathrm{ref}}(y|x)\exp\left(\frac{r(x,y)}{\beta}\right)$$

由于关于 p 的 Hessian 为 $-\beta\operatorname{diag}(1/p_y)$，在单纯形内部严格凹，这个驻点是唯一最优解。也可将原目标改写成 $\beta\log Z-\beta D_{\rm KL}(\pi\|\pi^*)$ 直接验证。

**第四步：反解隐式奖励。** 对最优策略取 log 并移项：

$$r(x,y)=\beta\log\frac{\pi^*(y|x)}
{\pi_{\mathrm{ref}}(y|x)}+\beta\log Z(x)$$

**第五步：代入偏好模型。** Bradley-Terry 偏好概率为 $\sigma(r(x,y_w)-r(x,y_l))$。只有同一 prompt 下才能消去相同的 $\beta\log Z(x)$；不要把不同问题的两个回答随意配对。把 $\pi^*$ 换成可训练策略 $\pi_\theta$，得到：

$$L_{\mathrm{DPO}}=
-\mathbb E\log\sigma\left(
\beta\left[
\log\frac{\pi_\theta(y_w|x)}{\pi_{\mathrm{ref}}(y_w|x)}
-\log\frac{\pi_\theta(y_l|x)}{\pi_{\mathrm{ref}}(y_l|x)}
\right]\right)$$

**第六步：从概率到训练。** 对数据集偏好标签取负 log-likelihood 即上式，reference 冻结，只有 $\pi_\theta$ 更新。推导依赖偏好模型、KL 正则形式与策略可表示性。DPO 损失成立不代表真实人类偏好严格服从 Bradley-Terry，也不代表离线数据覆盖了更新后策略。

教学例只有两个回答，$q=[0.5,0.5],r=[\log3,0],\beta=1$。$Z=2$，$\pi^*=[0.75,0.25]$，隐式奖励差 $\log(0.75/0.5)-\log(0.25/0.5)=\log3$，BT 胜率为 0.75。改变共同奖励常数只改变 Z，不改变最优策略。`,
    },
    {
      id: "math-dpo-gradient-length",
      type: "derivation",
      title: "DPO 从 margin 到 token 梯度：beta、长度与概率下降",
      body: String.raw`记 response 的序列 log-prob 为 $\ell_w,\ell_l$，冻结 reference 值为 $\ell_w^r,\ell_l^r$：

$$\Delta=(\ell_w-\ell_w^r)-(\ell_l-\ell_l^r),\qquad
z=\beta\Delta,\qquad L=\log(1+e^{-z})$$
$$\frac{\partial L}{\partial z}=-\sigma(-z),\quad
\nabla_\theta L=-\beta\sigma(-\beta\Delta)
(\nabla_\theta\ell_w-\nabla_\theta\ell_l)$$

梯度下降提高 chosen 相对 rejected 的 log-prob。以词表 logits $h_{t,v}$ 为参数，$\partial\ell/\partial h_{t,v}=\mathbf1[v=y_t]-\pi_\theta(v|s_t)$；chosen 的系数为 $-\beta\sigma(-z)$，rejected 相反，二者共享参数时梯度再相加。prompt 与 padding mask 为零，response 含约定的 EOS；reference 不求导。

**手算原例。** $\ell_w=-2,\ell_l=-3,\ell_w^r=-2.5,\ell_l^r=-2.7,\beta=0.1$，$\Delta=0.8,z=0.08$，$L\approx0.653947$，对两侧序列 log-prob 导数约为 $[-0.048001,0.048001]$。正确分离的数据仍有非零梯度，只是 sigmoid 饱和后变小。

**beta 有两个语境。** 固定真实奖励时，$\pi^*\propto q\exp(r/\beta)$，大 beta 确实让最优策略靠近 q。但固定偏好样本的训练梯度幅度为 $\beta\sigma(-\beta\Delta)$：在 $\Delta=0$ 时是 $\beta/2$，在正 margin 上可能先增后减。不能从一次 SGD 的梯度大小推断最终 KL 单调变化。

**长度会进入 margin。** 标准 DPO 用 $\ell=\sum_{t=1}^T\log\pi(y_t|s_t)$。每 token 相对 reference 同样提升 0.1 时，4 token 与 1 token 回答的隐式奖励增幅相差 0.3；这只是概率比长度效应，不能证明前者更优。改成平均 log-prob 是新目标，不再原样满足上述序列 KL 推导。

**chosen 概率下降反例。** reference 和初始策略都为 $[0.4,0.3,0.3]$（chosen、rejected、其他），更新后为 $[0.3,0.1,0.6]$。chosen 从 0.4 降到 0.3，但 margin 从 0 升到 $\log(0.3/0.4)-\log(0.1/0.3)=\log2.25>0$。成对目标不保证 chosen 的绝对 likelihood 上升；应分别监控两侧概率与独立质量。`,
    },
    {
      id: "math-preference-pairs",
      type: "derivation",
      title: "IPO、SimPO、ORPO：精确目标与不同梯度",
      body: String.raw`三者都使用偏好对，但不能互换 reference、长度分母和 margin 的位置。

**IPO。** 定义与 DPO 相同的未乘 beta 的相对 log-ratio 差 $h=\Delta$，用论文的正则参数 $\tau>0$：

$$L_{\rm IPO}=\mathbb E\left[\left(h-\frac1{2\tau}\right)^2\right],
\qquad \nabla L_{\rm IPO}
=2\left(h-\frac1{2\tau}\right)\nabla h$$

$1/(2\tau)$ 的 2 来自同时考虑偏好对的两个方向。若 $h(y_l,y_w)=-h(y_w,y_l)$，则 $\tfrac12[(h-\tau^{-1})^2+(-h)^2]=(h-\tfrac1{2\tau})^2+\tfrac1{4\tau^2}$。因此不是把目标随意设成 1，也不是在平方外乘一个 beta 就等价。$\tau=0.5$ 时目标 gap=1，h=0.8 的损失 0.04、对 h 梯度 -0.4；h 超过 1 时梯度反转，回到有限 margin。这里是原始序列 likelihood 形式，采用长度平均的实现须另注明。

**SimPO。** 令 $\bar\ell(y)=T^{-1}\sum_t\log\pi_\theta(y_t|s_t)$，reference-free 隐式 reward 为 $\beta\bar\ell$，目标奖励 margin $m>0$（原文记作 gamma，不是 RL 折扣）：

$$z_{\rm SimPO}=\beta(\bar\ell_w-\bar\ell_l)-m,\qquad
L_{\rm SimPO}=-\mathbb E\log\sigma(z_{\rm SimPO})$$
$$\nabla L_{\rm SimPO}
=-\sigma(-z_{\rm SimPO})\beta
\left(\frac{\nabla\ell_w}{T_w}-\frac{\nabla\ell_l}{T_l}\right)$$

教学取 $\bar\ell_w=-0.5,\bar\ell_l=-0.8,\beta=2,m=0.2$，z=0.4，loss≈0.513015。长度平均是目标设计，不能说随机采样解码在精确最大化这个均值；其同数据效果须实验验证。

**ORPO。** 按原文先作长度归一化，定义 $\tilde p(y|x)=\exp(\bar\ell(y))\in(0,1)$。它是 token 概率的几何平均，不是整个回答集合上的归一化概率。用它构造 odds：

$$o(y)=\frac{\tilde p(y)}{1-\tilde p(y)},\quad
h_{\rm OR}=\log o(y_w)-\log o(y_l)$$
$$L_{\rm ORPO}=-\bar\ell_w-\lambda\log\sigma(h_{\rm OR}),\qquad \lambda\geq0$$

这里 chosen SFT 项采用 response-token mean 的约定。由 $\log o=\bar\ell-\log(1-e^{\bar\ell})$，可得 $\partial\log o/\partial\bar\ell=1/(1-\tilde p)$：

$$\frac{\partial L}{\partial\bar\ell_w}
=-1-\frac{\lambda\sigma(-h_{\rm OR})}{1-\tilde p_w},\qquad
\frac{\partial L}{\partial\bar\ell_l}
=\frac{\lambda\sigma(-h_{\rm OR})}{1-\tilde p_l}$$

负号由最小化负 log-sigmoid 推出，不能漏掉。教学取 $\tilde p_w=0.4,\tilde p_l=0.2$，odds ratio=8/3，偏好 loss=$\log(11/8)\approx0.318454$；若 $\lambda=0.1$，含 SFT 总 loss≈0.948136。实现用稳定的 log1mexp 计算 $\log(1-e^{\bar\ell})$，不要直接把很长序列概率连乘再套 odds。`,
    },
    {
      id: "math-kto",
      type: "derivation",
      title: "KTO：单条好坏反馈、参考点与停止梯度",
      body: String.raw`KTO 可使用单条 $(x,y,d)$ 数据，$d\in\{D,U\}$ 是 desirable/undesirable 标签，不要求同 prompt 的偏好对。沿用原文的未缩放 log-ratio：

$$r_\theta(x,y)=\log\frac{\pi_\theta(y|x)}{\pi_{\rm ref}(y|x)},\qquad
z_0(x)=D_{\rm KL}(\pi_\theta(\cdot|x)\|\pi_{\rm ref}(\cdot|x))$$

把参考点在反向时冻结，令 $s=\beta(r_\theta-\operatorname{sg}(z_0))$，正权重 $\lambda_D,\lambda_U$ 表达两类反馈的重要性。最小化效用缺口，不是二元交叉熵：

$$L_{\rm KTO}=\mathbb E_D\left[
\begin{cases}
\lambda_D[1-\sigma(s)],&d=D\\
\lambda_U[1-\sigma(-s)],&d=U
\end{cases}\right]$$
$$\frac{\partial L_D}{\partial r_\theta}
=-\lambda_D\beta\sigma(s)[1-\sigma(s)],\qquad
\frac{\partial L_U}{\partial r_\theta}
=\lambda_U\beta\sigma(s)[1-\sigma(s)]$$

两端都会饱和，不像 $-\log\sigma(s)$ 在强烈错分一侧仍有接近常数的梯度。教学取 $r_\theta=z_0,\beta=0.2,\lambda_D=\lambda_U=1$，两种 loss 均为 0.5，梯度分别 -0.05、+0.05。

理论 z0 需要当前策略期望，离线计算昂贵。原文实现用 microbatch 错配输入/输出的 log-ratio 平均，截到非负，再停止梯度：

$$\hat z_0=\operatorname{sg}\left[
\max\left(0,\frac1B\sum_{i=1}^B
\log\frac{\pi_\theta(y_{j(i)}|x_i)}
{\pi_{\rm ref}(y_{j(i)}|x_i)}\right)\right]$$

j 是无自身的循环移位、$B>1$。这是方便的有偏参考点估计，不是当前序列 KL 的无偏计算；clamp 相对原始均值提高估计，但整体相对真实 KL 的偏差不保证为正。这里 z0 是效用饱和的参考点，不是额外加在总 loss 外的 KL penalty。

把 pair 的 winner 当“好”、loser 当“坏”是额外标签假设：两条可能都坏，或都好但一条更好。类别不均衡时要记录采样比例与 $\lambda_D,\lambda_U$，不能用一个总准确率概括校准。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从 token log-prob 算 DPO loss",
      body: String.raw`下面把序列 log 概率显式求和。实际训练应 mask prompt 与 padding，只累计 response token，并用稳定的 logsigmoid。

~~~python
import math

def logsigmoid(value):
    return min(value, 0.0) - math.log1p(math.exp(-abs(value)))

chosen_policy_tokens = [-0.4, -0.7, -0.9]
rejected_policy_tokens = [-0.8, -1.0, -1.2]
chosen_reference_tokens = [-0.5, -0.9, -1.1]
rejected_reference_tokens = [-0.7, -0.9, -1.1]
beta = 0.1

chosen_ratio = sum(chosen_policy_tokens) - sum(chosen_reference_tokens)
rejected_ratio = sum(rejected_policy_tokens) - sum(rejected_reference_tokens)
logit = beta * (chosen_ratio - rejected_ratio)
loss = -logsigmoid(logit)

print(chosen_ratio, rejected_ratio, logit, loss)
~~~

调试时分别记录 chosen/rejected 的 policy log-prob、reference log-prob、margin、accuracy 和长度。只看总 loss 下降可能掩盖“chosen 与 rejected 都下降，只是 rejected 降得更快”的退化模式。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：目标简单不表示数据问题消失",
      body: String.raw`**误区一：DPO 不需要奖励信息。** chosen/rejected 标签就是离线奖励信号，只是没有显式拟合标量 reward model。

**误区二：DPO 一定比 PPO 便宜且更好。** 它省 rollout、critic 和 reward inference，但要同时跑 current/reference 的两条回答；更关键的是，固定数据无法探索当前策略的新状态。

**误区三：所有偏好对都同样可靠。** 标注者分歧、judge 偏差、微小质量差和错误配对会直接进入梯度。应保存置信度、来源和 tie。

**误区四：chosen likelihood 必然上升。** 成对目标只要求相对 margin 改善，可能通过主要压低 rejected 达成。若需要保持 chosen，须监控或加入 NLL 正则。

**误区五：reference-free 就没有正则。** ORPO、SimPO 等通过 odds、长度归一化、margin 或 SFT 项形成隐式约束，只是没有单独 reference forward。

**误区六：step-level 偏好天然更准确。** 局部步骤可能看似合理却导向错误，或必须结合后续才能判断。细粒度标签成本和一致性往往更难。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "DPO 变体按数据需求与目标区分",
      body: String.raw`| 方法 | 需要的数据 | Reference | 核心差异 |
|---|---|---|---|
| DPO | 成对 chosen/rejected | 需要 | logistic 相对 log-ratio |
| IPO | 成对偏好 | 需要 | 用平方目标控制有限 margin |
| KTO | 单条 desirable/undesirable 也可 | 通常需要 | 基于效用/损失不对称的前景理论目标 |
| ORPO | 成对偏好 | 不需要独立模型 | SFT NLL + odds-ratio 偏好项 |
| SimPO | 成对偏好 | 不需要 | 长度归一化平均 log-prob + 目标 margin |
| Online/Iterative DPO | 当前策略候选与新偏好 | 视方法而定 | 周期刷新数据、降低静态分布错配 |

IPO 的动机之一是避免 logistic 目标在可分数据上持续扩大 margin；KTO 面向只有好/坏单样本而无严格配对的数据；ORPO 把 chosen 的监督学习和偏好 odds 结合；SimPO 让隐式 reward 与生成时常用的平均 log probability 对齐并加入 margin。它们的假设不同，不应统称为“换个 loss 就一样”。

偏好优化适合难以写标量 verifier、但能稳定比较两个答案的任务。数学最终答案可直接验证时，RLVR 能在线探索；若已有大量高质量静态偏好对、在线生成昂贵，DPO 家族更直接。

**工业 Pipeline 中的 DPO。** Qwen2.5 报告把离线偏好优化和在线 RL 分阶段使用；MiniMax-01 把短、长上下文的 SFT 与 DPO 分开组织，以适配不同的数据分布。它们说明 DPO 可负责某个阶段的行为校准，不代表所有模型都应按同一顺序训练。第 22、23 章会比较这些配方。若给长文摘要标注“更完整”，给短问答标注“更简洁”，必须把任务上下文带入偏好对；否则一个总长度偏好可能互相冲突。评估应按长度与任务分桶，不能仅看合并后的 pairwise accuracy。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：DPO 为什么不需要显式奖励模型",
      body: String.raw`**30 秒回答：**“KL 正则奖励最大化的最优策略满足 $\pi^*\propto\pi_{\mathrm{ref}}\exp(r/\beta)$，所以奖励差可写成当前策略与 reference 的 log-ratio 差。把它代入 Bradley-Terry 偏好似然，就得到直接用 chosen/rejected 训练的 logistic loss，不必单独拟合 reward model 或跑 PPO。”

若追问 DPO 是否 on-policy：标准 DPO 使用固定偏好数据，是离线方法。Online/iterative DPO 会用当前策略刷新候选，但还需外部偏好标注或 judge。

若追问 reference 作用：它定义隐式奖励的基准，并限制模型只需学习相对基座的偏好变化；去掉 reference 的变体必须用其他形式控制漂移和长度。

若追问失败模式：静态数据覆盖不足、偏好噪声、长度偏差、chosen 概率下降、过度优化 judge 偏好和通用能力遗忘。应分项监控，而不是只看 pairwise accuracy。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：偏好目标究竟比较什么",
      body: "先写出 current 与 reference 的四个序列 log 概率。",
      questions: [
        {
          q: "current 相对 reference 对 chosen 提高 0.4、对 rejected 提高 0.1，DPO margin 是多少？",
          a: "margin 为 0.4-0.1=0.3，再乘 β 后进入 sigmoid。",
        },
        {
          q: "DPO 的 pairwise accuracy 上升，能否证明 chosen 的绝对概率上升？",
          a: "不能。也可能 chosen 与 rejected 都下降，只是 rejected 下降更多；要单独监控两侧 log probability。",
        },
        {
          q: "只有单条 desirable/undesirable 标签、没有成对回答时，哪类方法更直接？",
          a: "KTO 针对非成对的二元好坏反馈设计；也可重新构造配对，但会引入额外假设。",
        },
        {
          q: "在线 DPO 相比标准离线 DPO 多了什么闭环？",
          a: "周期性让当前策略生成候选、获取新偏好并更新，使训练数据跟随策略分布；代价是生成和标注成本。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：拉格朗日、梯度与偏好家族",
      body: "先逐步推导，再解释条件，不能只报算法名称。",
      questions: [
        {
          q: "从固定 prompt 的 KL 正则奖励最大化推导最优策略，并说明 DPO 如何消去 Z。",
          a: String.raw`$\mathcal L=\sum pr-\beta\sum p\log(p/q)+\lambda(\sum p-1)$；驻点给 $p=q e^{r/\beta}e^{\lambda/\beta-1}$；归一化得到 $p^*=q e^{r/\beta}/Z$。反解 $r=\beta\log(p^*/q)+\beta\log Z$，同 prompt 的奖励差抵消 Z，代入 BT 并取负 log 得 DPO。**得分点：**乘子的 +1 项；$\beta>0$、支撑与 Z 有限；必须同 prompt。`,
        },
        {
          q: "四个 log-prob 为 -2、-3、-2.5、-2.7，β=0.1。算 DPO loss 和两侧 log-prob 梯度。",
          a: String.raw`$\Delta=(-2+2.5)-(-3+2.7)=0.8$，z=0.08，loss≈0.653947。$\partial_{\ell_w}L=-0.1\sigma(-0.08)\approx-0.048001$，rejected 为正 0.048001。**得分点：**相对 reference 的差；beta 因子；reference 冻结；token logits 还需 softmax Jacobian。`,
        },
        {
          q: "IPO 的目标为什么是 1/(2τ)？ORPO 的 odds 能直接用原始整句概率替代吗？",
          a: String.raw`双向平方项 $\tfrac12[(h-\tau^{-1})^2+h^2]=(h-\tfrac1{2\tau})^2+\tfrac1{4\tau^2}$，常数不影响优化。ORPO 原文使用 $\tilde p=\exp(T^{-1}\log\pi(y|x))$，换成原始整句概率改变目标和长度效应。**得分点：**IPO 的 1/2 来源；ORPO 几何平均；不是回答集合上的概率分布。`,
        },
        {
          q: "KTO 能否写成好坏标签的普通 logistic cross-entropy？为什么错配 microbatch 的 KL 参考点必须单独说明？",
          a: String.raw`不能，KTO 是 $\lambda_D[1-\sigma(s)]$ 或 $\lambda_U[1-\sigma(-s)]$，不是负 log；其梯度两端饱和。错配样本不来自当前策略，非负截断又改变期望，因此参考点估计有偏且停止梯度。**得分点：**效用与似然区分；beta 放置一致；标签与采样假设。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "Qwen2.5 Technical Report",
      url: "https://arxiv.org/abs/2412.15115",
      evidence: "离线与在线偏好阶段的工业实例",
    },
    {
      label: "MiniMax-01: Scaling Foundation Models with Lightning Attention",
      url: "https://arxiv.org/abs/2501.08313",
      evidence: "短长上下文后训练配方；不是普适顺序",
    },
    {
      label: "Direct Preference Optimization",
      url: "https://arxiv.org/abs/2305.18290",
      evidence: "DPO 原始论文",
    },
    {
      label: "A General Theoretical Paradigm to Understand Learning from Human Preferences",
      url: "https://arxiv.org/abs/2310.12036",
      evidence: "IPO 原始论文",
    },
    {
      label: "KTO: Model Alignment as Prospect Theoretic Optimization",
      url: "https://arxiv.org/abs/2402.01306",
      evidence: "KTO 原始论文",
    },
    {
      label: "ORPO: Monolithic Preference Optimization without Reference Model",
      url: "https://arxiv.org/abs/2403.07691",
      evidence: "ORPO 原始论文",
    },
    {
      label: "SimPO",
      url: "https://arxiv.org/abs/2405.14734",
      evidence: "SimPO 原始论文",
    },
  ],
};

export default chapter;
