const chapter = {
  id: "16",
  slug: "ppo-classic-rlhf",
  part: "LLM 后训练",
  title: "PPO、奖励模型与经典 RLHF",
  subtitle: "理解四模型管线、概率比和受约束策略更新",
  level: "核心",
  duration: 150,
  prerequisites: ["11", "15", "30"],
  tags: ["RLHF", "Reward Model", "PPO", "KL", "GAE"],
  objectives: [
    "解释经典 RLHF 的 SFT、奖励建模与 PPO 三阶段",
    "写出 Bradley-Terry 奖励模型损失",
    "手算 PPO 概率比与 clip 目标",
    "区分 reference KL、PPO clipping 和梯度裁剪",
  ],
  summary:
    "经典 RLHF 先把人类偏好拟合为奖励模型，再用 PPO 优化回答；合适的价值估计帮助降低方差，reference KL 惩罚累计漂移，clip 抑制单批样本的部分激进更新激励。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：先学会评分，再谨慎提高高分回答概率",
      body: String.raw`学习助手给出了两份解题说明：一份解释清楚并承认不确定处，另一份语气肯定却漏掉条件。第 15 章已经会用评分更新回答概率，但“有帮助且不过度承诺”没有唯一答案可直接核对。现在既要从人的比较中学会评分，又要避免模型反复追逐这个评分后丢失原有能力。

指令微调（SFT）让模型模仿高质量答案，但上述要求更适合比较两个回答。经典 RLHF（Reinforcement Learning from Human Feedback）先收集同一 prompt 下的回答偏好，用 chosen/rejected 对训练奖励模型，再把奖励模型当环境反馈优化语言模型。

奖励模型把 prompt 与完整回答映射为标量。它只是人类偏好的代理，不能直接当真理。PPO 让策略生成新回答、得到奖励，再提高高于预期的动作概率；因为策略一旦离开奖励模型训练分布，可能找到评分漏洞，所以还用 SFT reference policy 的 KL 惩罚限制漂移。

经典实现常同时涉及四个模型角色：policy/actor 生成并更新；reference 提供不更新的基准概率；reward model 对完整回答评分；value/critic 预测每个前缀的未来回报。它们可共享部分权重或分时部署，但逻辑职责必须分开。

PPO 用旧策略采样后，在 surrogate 中截断新旧动作概率比，抑制部分激进更新的目标收益，不保证实际 ratio 或 KL 的硬界。训练稳定还依赖奖励尺度、优势估计、KL 系数、数据分布和实现细节。

RLHF 与 RLVR 描述奖励来源，PPO 与 GRPO 描述更新算法。PPO 可以使用可验证的奖励而不训练神经奖励模型；GRPO 也能接收学习型 RM 的分数。去掉 critic 和去掉 reward model 是两项独立设计。开放式写作、对话和安全规范难用唯一标准答案评价，可以用人类偏好、Constitutional AI 的规则批评与修订、或 rubric 分维度反馈，但都需要检查评审偏差。下面先看一个已获正优势的 token 应该增加到什么程度，再回头补齐评分、KL 和优化目标的整条计算链。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：好动作已经被提高很多，还要继续推吗？",
      body: String.raw`助手生成一条回答后，优势判断其中某个动作好于预期。更新几轮后，这个动作相对 rollout 时的旧策略已经明显更常见。

PPO 比较 current policy 与 old policy 对同一已采样动作的概率。clip 的目的不是把实际概率强行夹回区间，而是让某些已经变化过大的样本停止获得额外目标收益。

方向还取决于优势：

| 优势 | 动作概率变化 | PPO 的处理直觉 |
|---|---|---|
| 正 | 已明显提高 | 停止额外鼓励 |
| 正 | 反而降低 | 继续纠正 |
| 负 | 反而提高 | 继续压低 |
| 负 | 已明显降低 | 停止额外惩罚 |

因此“ratio 越界就没有梯度”并不成立，必须同时看越界方向与优势符号。

old policy 与 reference policy 也不是同一个对象。old policy 记录本轮数据由谁生成，用于控制局部更新；reference 通常是固定的 SFT 基准，用于限制多轮累计漂移。PPO clip 不能替代 reference KL。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：偏好评分、信任域与 PPO 更新",
      body: String.raw`先把两份解题说明的偏好变成奖励模型的似然损失，再用第 15 章的 GAE 把奖励送到生成位置。评分可能被利用，因此接着计算相对冻结 reference 的 KL，并检查采样来自哪个策略。然后用 TRPO 的局部二阶约束说明“谨慎更新”在分布空间里意味着什么，最后回到更易实现的 PPO，逐一检查正负优势的四种裁剪边界。这样完整训练 loss 的每一项都对应一个已出现的问题，而不是先背四个模型名称。`,
      links: [
        { label: "RM 与 RLHF 目标", sectionId: "derivation", level: "必会" },
        { label: "KL 估计器与采样条件", sectionId: "math-kl-estimators", level: "推导" },
        { label: "TRPO 与 Fisher", sectionId: "math-trpo-fisher", level: "推导" },
        { label: "PPO 四种边界及完整损失", sectionId: "math-ppo-update", level: "必会" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "经典 RLHF 的三阶段与四模型循环",
      body: String.raw`第一阶段用人工或专家示范训练 SFT policy。第二阶段让模型生成多个候选，由标注者排序，训练 reward model。第三阶段从 SFT 初始化 actor 与 reference：actor 生成回答，reward model 给终局分数，reference 提供 KL 代价，critic 估计前缀价值，PPO 更新 actor 与 critic。

rollout 与 update 必须区分。回答由冻结的 old policy 采样；一次 rollout batch 可切成多个 mini-batch 训练，多做 epoch 可能扩大当前与行为策略的偏差，但距离不保证单调增长。应监控 ratio/KL，不能用 epoch 数代替实际分布偏移。

上线模型通常只保留训练后的 actor，不需要 reward、critic 和 reference。但训练时四者的权重、KV、激活与通信会造成显著系统成本。`,
      diagram: {
        kind: "flow",
        nodes: [
          "示范数据 → SFT",
          "偏好对 → Reward Model",
          "Actor Rollout",
          "Reward + Reference KL",
          "Critic / GAE",
          "PPO 更新",
        ],
        links: [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 2],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "奖励模型、KL 正则与 PPO 目标",
      body: String.raw`标注者只告诉我们哪份解题说明更好，并没有给每条回答一个绝对分数。要把这种比较接到上一章的策略梯度上，先学习能解释偏好顺序的评分器，再用评分与偏移代价构造回报，最后才决定每次更新幅度。

对 prompt $x$、偏好回答 $y_w$ 和非偏好回答 $y_l$，$r_\phi(x,y)$ 是参数为 $\phi$ 的标量奖励模型，$\sigma$ 是 logistic sigmoid。Bradley-Terry 模型假设：

$$P(y_w\succ y_l|x)
=\sigma(r_\phi(x,y_w)-r_\phi(x,y_l))$$

分差越大，模型越相信偏好标签；因此对观察到的胜负最小化负对数似然，奖励模型损失为：

$$L_{\mathrm{RM}}(\phi)=
-\mathbb E\log\sigma(r_\phi(x,y_w)-r_\phi(x,y_l))$$

令 $d=r_w-r_l$，单对损失 $\ell=\log(1+e^{-d})$。逐步求导：

$$\frac{\partial\ell}{\partial d}=\sigma(d)-1,\quad
\frac{\partial\ell}{\partial r_w}=-\sigma(-d),\quad
\frac{\partial\ell}{\partial r_l}=\sigma(-d)$$
$$\nabla_\phi\ell=-\sigma(-d)
[\nabla_\phi r_\phi(x,y_w)-\nabla_\phi r_\phi(x,y_l)]$$

二阶导 $\sigma(d)(1-\sigma(d))\geq0$，但神经网络参数空间不因此整体凸。$d=1$ 时 loss≈0.313262，两侧梯度约为 -0.268941 和 +0.268941。给所有回答加同一个 prompt 相关常数不改变偏好；奖励尺度则会改变 sigmoid 概率，不能说也任意不可辨识。

训练完评分器后，冻结它，让助手生成新解释。如果只追求评分，模型可能学会迎合评分器；因此再给偏离参考策略的回答扣分。令 $\pi_\theta$ 为当前生成策略、$\pi_{\rm ref}$ 为冻结基准，$\beta>0$ 为偏移代价权重，策略阶段常优化：

$$\max_\theta\ \mathbb E_{y\sim\pi_\theta(\cdot|x)}
\left[r_\phi(x,y)-\beta
\log\frac{\pi_\theta(y|x)}{\pi_{\mathrm{ref}}(y|x)}\right]$$

第二项是 sample-based KL 代价的常见形式，$\beta$ 控制离 reference 的代价。实际实现可把每 token log-ratio 作为 shaping reward，再用 critic 和 GAE 得到优势。

上述目标描述希望得到什么策略，但一次 rollout 后还要用同批数据做多步训练。令 $s_t$ 为已生成前缀、$a_t$ 为实际 token，$\hat A_t$ 为第 15 章算好的冻结优势，$\epsilon$ 为裁剪宽度。对旧策略采样动作，定义 $r_t(\theta)=\pi_\theta(a_t|s_t)/\pi_{\mathrm{old}}(a_t|s_t)$。这里的 r 是概率比，不是前面的奖励分数。PPO clipped surrogate 为：

$$L^{\mathrm{clip}}(\theta)=
\mathbb E_t\left[
\min\left(r_t\hat A_t,
\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)\hat A_t\right)
\right]$$

Actor 最大化它，critic 则回归 value target。熵 bonus、value clipping、优势标准化和 adaptive KL 都是常见实现选项，但不能在报告算法时省略，因为它们会显著改变训练行为。

reference $\pi_{\rm ref}$ 通常是冻结的 SFT 基准；old $\pi_{\rm old}$ 是本批实际采样策略；current $\pi_\theta$ 是正在优化的策略。old 在本批多 epoch 中保持固定，到下一轮 rollout 才刷新；不能每个 minibatch 都重算 old 并当作行为概率。奖励模型在策略更新阶段也冻结，actor 不沿 RM 的评分反传，而用 score-function 信号。

把分差 1 的手算放回开场：评分器给 preferred 一侧的负梯度约 -0.268941，梯度下降便提高其分数，并压低另一侧；这不是直接修改回答概率。评分进入奖励与 GAE 后，才产生开场优势 2 所代表的策略信号，再由 ratio=1.3 的 clip 贡献 2.4。下一节单独计算这条链里的 KL 代价，防止把 reference 和 old 混为一谈。`,
    },
    {
      id: "math-kl-estimators",
      type: "derivation",
      title: "KL reward、k1/k2/k3 与无偏性的条件",
      body: String.raw`助手可能越来越偏好奖励模型喜欢的措辞，我们想衡量它离初始语言行为有多远。但训练日志里只有采到的 token，不一定保存整个词表。能否用一个 token 的数值估计分布距离？这个问题还必须区分“估计距离”和“对距离求梯度”。

先固定一个前缀，令 $p=\pi_\theta(\cdot|s)$、$q=\pi_{\rm ref}(\cdot|s)$，两者同词表且严格为正。采样动作 $a\sim p$，设 $u(a)=q(a)/p(a)$；$k_1,k_2,k_3$ 是三个候选的单样本估计量：

$$k_1=-\log u,\qquad k_2=\tfrac12(\log u)^2,\qquad
k_3=u-1-\log u$$

由 $\mathbb E_p[u]=\sum_aq(a)=1$：

$$\mathbb E_p[k_1]=\mathbb E_p[k_3]=D_{\rm KL}(p\|q)$$

$k_1$ 单样本可负；$k_3\geq0$ 来自 $\log u\leq u-1$。$k_2$ 只在 $u$ 接近 1 时由 Taylor 展开近似 KL，不是一般无偏估计。若 q 在 p 零概率之外还有质量，$\mathbb E_p[u]=1$ 的证明失效；top-k/top-p 改支持集时尤其要核对。

**旧数据不是当前分布。** 若动作由 $b=\pi_{\rm old}$ 采样，直接平均 $k_3(p,q)$ 一般不等于当前 KL；在覆盖条件下，$\mathbb E_b[(p/b)k_3]=D_{\rm KL}(p\|q)$ 对固定前缀才成立。还没有修正前缀本身的状态分布变化。

**无偏数值不等于无偏梯度。** $p$ 依赖参数，故 $\nabla\mathbb E_p[k]=\mathbb E_p[k\nabla\log p+\nabla k]$。如果把采样动作当常量只对 $k_3$ 求导，其期望为 $\sum_a(p_a-q_a)\nabla\log p_a$，是该固定前缀下 $D_{\rm KL}(q\|p)$ 的梯度，而非一般的 reverse-KL 梯度。不能因 k3 数值无偏就省略这个区别。

**RLHF shaping。** 回到实际训练时，先固定本轮生成策略，而不是假装旧 token 来自每一步更新后的模型。记 $\ell_t^{\rm old}$、$\ell_t^{\rm ref}$ 为所选 token 的两种 log-prob。rollout 时冻结 $\ell_t^{\rm old}$、$\ell_t^{\rm ref}$，给每个动作奖励 $-\beta(\ell_t^{\rm old}-\ell_t^{\rm ref})$，终局再加 RM 分数。它在 old 轨迹期望下估计 old-to-reference 的序列 KL；进入 GAE 后成为冻结奖励，随后多 epoch 是 PPO surrogate，不是每一步都精确优化 current-to-reference KL。

沿用开场 old 概率 0.2，再补充该位置在初始 reference 中概率 0.1：教学例 old 选中概率 0.2、ref 为 0.1、$\beta=0.1$，该 token 的 KL reward 为 $-0.1\log2\approx-0.069315$。它惩罚的是相对 reference 的两倍增幅，而 PPO 看到的 current/old 是 1.3。一次 token 的惩罚为负不代表整条任务奖励为负；KL 的比较基准也绝不是本轮 old/current ratio。下一节换到 old 与 current 的距离，解释局部更新约束怎样选步长。`,
    },
    {
      id: "math-trpo-fisher",
      type: "derivation",
      title: "TRPO：从 KL 二阶约束到自然梯度方向",
      body: String.raw`同样把一个参数改动一点，有的位置几乎不影响回答，有的位置却会让 token 概率突变。助手的更新预算应该限制行为分布，而不只是参数向量的长度。先求解一个局部 KL 约束问题，才能理解 PPO 为什么选择较便宜的近似目标。

TRPO 使用 old 状态分布上的局部 surrogate，目标是限制改进步而非直接限制欧氏参数距离。令 $L$ 为待最大化的局部策略目标，$d_{\rm old}$ 为旧策略状态分布，$\delta>0$ 为 KL 预算。记 $\Delta=\theta-\theta_{\rm old}$，$g=\nabla_\theta L(\theta_{\rm old})$：

$$\max_\Delta g^\top\Delta,\qquad
\mathbb E_{s\sim d_{\rm old}}
D_{\rm KL}(\pi_{\rm old}(\cdot|s)\|\pi_{\theta_{\rm old}+\Delta}(\cdot|s))
\leq\delta$$

在 $\Delta=0$ 处 KL 为零、一阶导为零，二阶近似为 $\tfrac12\Delta^\top F\Delta$。在固定支持集与可交换求导条件下：

$$F=\mathbb E_{s\sim d_{\rm old},a\sim\pi_{\rm old}}
[u(s,a)u(s,a)^\top],\qquad
u=\nabla_\theta\log\pi_\theta(a|s)|_{\theta_{\rm old}}$$

因为 $\mathbb E[\nabla^2\log\pi+uu^\top]=0$，KL 的 Hessian 等于 Fisher。F 是参数维度的半正定矩阵，不需要显式存下；实际可用 Hessian-vector product 和共轭梯度。

拉格朗日函数 $g^\top\Delta-\eta(\tfrac12\Delta^\top F\Delta-\delta)$ 给出 $g-\eta F\Delta=0$。若 F 正定且 $g\ne0$，约束取等号：

$$\Delta=\eta^{-1}F^{-1}g,\quad
\eta=\sqrt{\frac{g^\top F^{-1}g}{2\delta}},\quad
\Delta^*=\sqrt{\frac{2\delta}{g^\top F^{-1}g}}F^{-1}g$$

若 F 奇异，应说明有效子空间或 damping $(F+\xi I)$；$g=0$ 时没有这个归一化方向。有限步的二阶近似并不精确，TRPO 还需要实际 KL 与 surrogate 的回溯检查。

为手算助手两个可训练方向的更新，把局部梯度和曲率简化成二维：教学例 $g=[1,2]^\top,F=\operatorname{diag}(2,8),\delta=0.01$，$F^{-1}g=[0.5,0.25]^\top$、$g^\top F^{-1}g=1$，故 $\Delta^*\approx[0.070711,0.035355]$，二次 KL 正好 0.01。第二方向虽然原始梯度更大，分布对它也更敏感，因此实际步幅反而较小；这些数是局部二次模型的解，不是某个真实语言模型的已测参数步。

PPO 继承“更新不要太远”的动机，以一阶优化和 clipped surrogate 替代显式二阶约束。PPO clip 不是上述约束的代数等价解，也不提供逐状态 KL 的严格上界。下一节回到开场实际采到的 token，检查这个替代目标何时继续纠偏、何时停止额外奖励，避免把 0.01 的严格局部预算误读成 clip 的保证。`,
    },
    {
      id: "math-ppo-update",
      type: "derivation",
      title: "PPO 四种边界、log-prob 梯度与完整训练 loss",
      body: String.raw`开场的好 token 已经增加了三成，所以正优势项封顶；如果同一个 token 实际不好，概率却增加了三成，训练还必须把它压回去。现在逐一推导这两类情况，并把策略、价值和正则项接成可最小化的训练损失。

$\ell_\theta,\ell_{\rm old}$ 分别是当前与采样时所选 token 的 log-prob，$\operatorname{sg}$ 冻结采样记录。令 $\rho=\exp(\ell_\theta-\operatorname{sg}(\ell_{\rm old}))$，优势 $A$ 冻结，$l=1-\epsilon,u=1+\epsilon$。单 token 最大化目标：

$$f(\rho,A)=\min(\rho A,\operatorname{clip}(\rho,l,u)A)
=\begin{cases}A\min(\rho,u),&A\geq0\\
A\max(\rho,l),&A<0\end{cases}$$

先按优势符号决定 min 选择哪一支，再用指数的导数把 ratio 导数转成 log-prob 导数。除不可导边界外，$\partial f/\partial\ell_\theta=M A\rho$，不是只有 $MA$。$M=0$ 当 $A>0,\rho>u$ 或 $A<0,\rho<l$，其余为 1。M 是裁剪支路门控，不是 response mask。取 $\epsilon=0.2$：

| 优势 A | ratio | 目标 f | 对当前 log-prob 的导数 |
|---|---|---|---|
| 2 | 1.3 | 2.4 | 0 |
| -2 | 1.3 | -2.6 | -2.6 |
| 2 | 0.7 | 1.4 | 1.4 |
| -2 | 0.7 | -1.6 | 0 |

正优势但概率太低仍要推高；负优势但概率太高仍要压低。只用 clamp 后乘 A 会错误删掉这两种纠偏梯度。边界 $\rho=l,u$ 需约定次梯度，数值差分检查应避开拐点。

**一个完整的训练约定。** 令 m 为 response mask，$N=\sum m>0$，$\langle h\rangle_m=\sum mh/N$，固定 $\hat R=\operatorname{sg}(\hat A+V_{\rm old})$，最小化：

$$L_{\rm train}=-\langle f(\rho,\operatorname{sg}(\hat A))\rangle_m
+c_V\left\langle\tfrac12(V_\phi-\hat R)^2\right\rangle_m
-c_H\langle H(\pi_\theta)\rangle_m+c_K\langle K_\theta\rangle_m$$

这里 $c_V,c_H,c_K$ 分别控制价值拟合、熵和额外 KL 的权重；$K_\theta$ 若使用，须明确是固定前缀全词表 KL 还是特定采样 surrogate。已把 KL 计入 rollout reward 的约定可取 $c_K=0$；若两处都用，要解释双重惩罚。价值预测若一次移动过大，还可另设阈值 $\epsilon_V$，使用可选 value clipping：

$$V_{\rm clip}=V_{\rm old}+\operatorname{clip}(V_\phi-V_{\rm old},-\epsilon_V,\epsilon_V)$$
$$L_V=\tfrac12\left\langle
\max\{(V_\phi-\hat R)^2,(V_{\rm clip}-\hat R)^2\}\right\rangle_m$$

它不是必需组成部分。old log-prob、old value、奖励、GAE、returns、mask 都冻结；当前 log-prob、当前 value 和熵保留梯度。多 epoch 固定同一 old 分母，重新采样后才刷新。ratio 仅修正旧前缀上的动作分布，不自动修正整个状态占用分布；评估仍需真实新 rollout。

四行手算中，负优势且 ratio=1.3 的导数为 -2.6，仍会压低这个被错误强化的 token；正优势且 ratio=1.3 才是零。关闭其他项时，对应的最小化 policy loss 分别为 2.6 和 -2.4，符号与最大化目标相反。至此我们能实现一轮 PPO；第 17 章进一步问，如果前缀 critic 太贵或不准，能否让同一道题的多条回答互相提供基准。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：PPO-RLHF 训练循环伪代码",
      body: String.raw`下面把四个模型的职责显式写开。真实系统会批量计算 token log-probability、mask prompt token，并在分布式 worker 间调度生成与训练。

~~~python
for prompts in prompt_loader:
    with no_grad():
        responses, old_logp = actor.generate_with_logprobs(prompts)
        ref_logp = reference.logprobs(prompts, responses)
        scores = reward_model.score(prompts, responses)
        old_values = critic.values(prompts, responses)

        token_rewards = -kl_beta * (old_logp - ref_logp)
        token_rewards[batch_indices, last_response_indices] += scores
        advantages, returns = gae(token_rewards, old_values)

    for epoch in range(update_epochs):
        logp = actor.logprobs(prompts, responses)
        values = critic.values(prompts, responses)
        ratio = exp(logp - stop_gradient(old_logp))

        policy_loss = -masked_mean(
            minimum(ratio * advantages,
                    clip(ratio, 1 - epsilon, 1 + epsilon) * advantages)
        )
        value_loss = masked_mean((values - returns) ** 2)
        update(actor, policy_loss)
        update(critic, value_coefficient * value_loss)
~~~

工程验收至少记录：raw reward、KL、总 shaped reward、优势均值方差、clip fraction、entropy、response length、value error 和验证集质量。只看总 reward 上升无法发现 reward hacking。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：代理奖励会主动寻找漏洞",
      body: String.raw`**误区一：奖励模型分数越高，真实偏好一定越高。** 策略会搜索训练分布之外的高分区域，放大奖励模型偏差。必须保留人工审计、独立评估和长度/风格控制。

**误区二：PPO clip 就是严格 trust region。** 它是易实现的 surrogate，不能保证所有状态上的 KL 都小；多 epoch、长序列和共享参数会产生复杂变化。

**误区三：KL 只有一种。** reference KL 约束策略与 SFT 基准，PPO ratio 比较当前与 rollout old policy；奖励模型内部也可能有正则。必须写清分布和方向。

**误区四：critic 只增加显存，没有算法价值。** critic 用前缀价值构造低方差优势，使终局奖励能更稳定地分配给 token；但 critic 误差也会带来偏差。

**误区五：高 reward 的所有 token 都同样正确。** 终局标量无法定位因果步骤，格式 token 也可能一起被强化。过程奖励可增加粒度，但评审误差同样会扩散。

**误区六：训练不崩就代表稳定。** entropy 缓慢坍缩、回答长度漂移、KL 增长、能力遗忘和隐藏 reward hacking 都可能在 loss 正常时发生。

**误区七：限制 RM 的使用步数就解决奖励作弊。** 减少暴露时间可能限制过优化，但某个报告的训练步数不能作为所有项目的固定阈值。应画出代理奖励和独立质量随训练的曲线；二者分离时检查奖励漏洞、数据覆盖和 checkpoint。规则验证器同样会受不完整测试与解析错误影响，奖励函数是否可微并不是 reward hacking 的判据。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "三种约束不要混用名称",
      body: String.raw`| 机制 | 作用对象 | 比较基准 | 目的 |
|---|---|---|---|
| PPO ratio clip | 样本 surrogate 中的概率比 | rollout old policy | 抑制部分激进更新激励，无硬概率界 |
| Reference KL penalty | 整体 token 分布/采样 log-ratio | 固定或慢更新 reference | 惩罚累计漂移，不保证能力不损失 |
| Gradient norm clipping | 反向后的参数梯度向量 | 设定范数阈值 | 限制梯度范数，非 Adam 参数步的同一界 |
| Reward clipping | 环境/模型奖励值 | 数值边界 | 限制异常奖励尺度 |
| Value clipping | critic 预测变化 | old value | 稳定价值网络更新 |

PPO 相对 REINFORCE 的主要新增负担是 critic、old policy 逻辑与多轮 surrogate 更新。它在通用连续控制中有成熟经验，但 LLM 整句终局奖励让更简单的 critic-free 方法也可能有竞争力。

是否使用 PPO 取决于反馈与系统：奖励密集、需要细致 token advantage、已有成熟基础设施时 PPO 仍有价值；只有可验证终局奖励且 critic 成本过高时，可比较 GRPO、RLOO 或 REINFORCE++。算法名不能替代同预算实验。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：PPO 在 RLHF 中解决什么",
      body: String.raw`**30 秒回答：**“奖励模型把偏好对转成标量反馈，Actor 在自己生成的回答上优化奖励。PPO 用新旧策略概率比和 clipped surrogate 抑制部分激进更新激励，合适的 critic 与 GAE 帮助降低方差；另用 reference KL 惩罚逐轮偏离 SFT 策略。clip 本身不保证概率比或 KL 的硬界。”

若追问四模型：policy 生成并学习，reference 冻结并提供 KL，reward model 给完整回答分数，value model 为每个前缀估计未来回报。

若追问奖励模型如何训练：用 Bradley-Terry 偏好概率 $\sigma(r_w-r_l)$，最小化 chosen 未胜过 rejected 的负对数似然；标量可平移，绝对值没有跨模型天然含义。

若追问 clip 对负优势：当动作应被压低时，目标阻止 ratio 低于 $1-\epsilon$ 后继续获得收益；所以不能先无条件 clamp ratio 再忽略 min 的符号逻辑。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：把 PPO 的每个模型和约束放回正确位置",
      body: "回答时指出数据由谁生成、哪个模型更新。",
      questions: [
        {
          q: "正优势动作已经相对 old policy 提高很多时，PPO clip 为什么会停止额外鼓励？",
          a: "它希望限制同一批数据上的局部更新激励，避免少数样本持续把策略推远；这不是把实际概率硬性截断。",
        },
        {
          q: "reference policy 与 old policy 为什么不是同一个概念？",
          a: "reference 通常是固定 SFT 基准，约束长期漂移；old policy 是本轮 rollout 行为策略，用于 importance ratio，随迭代更新。",
        },
        {
          q: "Bradley-Terry 偏好模型为什么主要关心 chosen 与 rejected 的分数差，而不是绝对分数平移？",
          a: "偏好概率由两者的相对差决定；同时给两边加相同常数不会改变排序证据。这也说明奖励绝对零点未被该损失固定。",
        },
        {
          q: "PPO clip 能否替代 reference KL？",
          a: "不能。clip 主要约束当前策略相对本轮旧策略的局部更新，逐轮累积后仍可能远离最初 reference。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：RM、Fisher、裁剪和 KL",
      body: "先声明最大化目标还是最小化 loss，避免符号混淆。",
      questions: [
        {
          q: "RM 的 chosen/rejected 分数差为 1。推导两侧梯度，并说明同时加 7 会怎样。",
          a: String.raw`$\ell=-\log\sigma(d)$，$\partial_d\ell=\sigma(d)-1$。两侧梯度为 -0.268941、+0.268941，loss≈0.313262。同时加 7 不改变 d，故 loss 和偏好概率不变。**得分点：**链式符号；共同平移不辨识；缩放分数并不具有同样不变性。`,
        },
        {
          q: "ε=0.2，分别计算 (ratio,A)=(1.3,2),(1.3,-2),(0.7,2),(0.7,-2) 的 PPO 目标和 log-prob 导数。",
          a: String.raw`目标依次为 $[2.4,-2.6,1.4,-1.6]$，导数依次 $[0,-2.6,1.4,0]$。使用 $\partial\rho/\partial\ell=\rho$，只在“好动作已足够增加、坏动作已足够减少”时封顶。**得分点：**四种符号分支；保留 ratio 因子；最小化 policy loss 时整体变号。`,
        },
        {
          q: "g=[1,2]、F=diag(2,8)、δ=0.01。推导局部 TRPO 步，并说明 PPO 是否严格满足同一约束。",
          a: String.raw`驻点 $g=\eta F\Delta$，约束给 $\eta=\sqrt{1/0.02}$，所以 $\Delta=[0.070711,0.035355]$，$\tfrac12\Delta^\top F\Delta=0.01$。PPO clip 是替代目标，不是求解这个二次约束问题。**得分点：**自然梯度方向、尺度来源、二阶近似和 F 可逆条件。`,
        },
        {
          q: "为什么 k3 非负且数值无偏，却不能直接说固定旧样本上的自动微分是 current-to-reference KL 的无偏梯度？",
          a: String.raw`$k_3=u-1-\log u\geq0$，且仅在 $a\sim p$、支持条件成立时有 $\mathbb E_pu=1$。旧样本来自 b 需 $p/b$ 修正；即使来自 p，分布本身依赖参数，完整导数还含 $k_3\nabla\log p$。**得分点：**采样分布；值与梯度区分；前缀分布仍需另行处理。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "Trust Region Policy Optimization",
      url: "https://arxiv.org/abs/1502.05477",
      evidence: "TRPO 原始论文；KL 二阶近似与 Fisher",
    },
    {
      label: "Approximating KL Divergence",
      url: "https://joschu.net/blog/kl-approx.html",
      evidence: "k1/k2/k3 估计器说明；课程另推导采样与梯度条件",
    },
    {
      label: "Constitutional AI: Harmlessness from AI Feedback",
      url: "https://arxiv.org/abs/2212.08073",
      evidence: "规则驱动批评、修订与 AI 偏好反馈的原始工作",
    },
    {
      label: "Proximal Policy Optimization Algorithms",
      url: "https://arxiv.org/abs/1707.06347",
      evidence: "PPO 原始论文",
    },
    {
      label: "Learning to Summarize from Human Feedback",
      url: "https://arxiv.org/abs/2009.01325",
      evidence: "奖励建模与 RLHF 论文",
    },
    {
      label: "Training Language Models to Follow Instructions with Human Feedback",
      url: "https://arxiv.org/abs/2203.02155",
      evidence: "InstructGPT 原始论文",
    },
    {
      label: "High-Dimensional Continuous Control Using GAE",
      url: "https://arxiv.org/abs/1506.02438",
      evidence: "GAE 原始论文",
    },
  ],
};

export default chapter;
