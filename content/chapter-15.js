const chapter = {
  id: "15",
  slug: "policy-gradients-gae",
  part: "强化学习地基",
  title: "REINFORCE、Actor-Critic 与 GAE",
  subtitle: "直接优化策略并控制梯度方差",
  level: "核心",
  duration: 140,
  prerequisites: ["02", "03", "13", "14"],
  tags: ["Policy Gradient", "REINFORCE", "Actor-Critic", "Advantage", "GAE"],
  objectives: [
    "从 log-derivative trick 推出 REINFORCE",
    "解释 baseline 为何降方差但不改变期望梯度",
    "计算 TD residual 与 GAE",
    "把轨迹、动作概率和优势映射到 LLM token 生成",
  ],
  summary:
    "策略梯度用回报加权所采动作的 log 概率梯度，直接提高好轨迹、降低坏轨迹的概率；Actor-Critic 用价值网络构造低方差优势，GAE 再通过参数 λ 调节 bootstrap 偏差与 Monte Carlo 方差。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从概率求导到可实现的优势估计",
      body: String.raw`先修条件期望、softmax 梯度与 Bellman 方程。学习顺序为 score function → 因果性消去过去奖励 → baseline 无偏性 → TD 与 GAE → actor/critic 的计算图。面试要把“估计值无偏”“梯度无偏”和“方差降低”分开，并能从末端边界逐步展开 GAE。`,
      links: [
        { label: "策略梯度与因果性", sectionId: "derivation", level: "必会" },
        { label: "Baseline 证明与最优值", sectionId: "math-baseline", level: "推导" },
        { label: "GAE 望远镜展开", sectionId: "math-gae-telescoping", level: "推导" },
        { label: "Actor/Critic 停梯度", sectionId: "math-actor-critic-detach", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：奖励为每个采样动作调音量",
      body: String.raw`策略网络输出动作概率。我们从中采样一条轨迹，环境给出回报；若回报高，就增加这条轨迹中已选动作的概率，若回报低于基准，就降低它们的概率。这就是策略梯度最核心的方向。

为什么优化 log 概率？概率乘法描述整条轨迹，但许多时间步相乘会很小；取 log 后变成求和，而且 $\nabla\log\pi$ 能把采样概率的梯度写成可估计形式。训练不是把奖励当可微函数穿过环境，而是用奖励作为权重乘在 log 概率梯度上。

纯 REINFORCE 用实际回报 $G_t$ 加权，理论直接但方差很高。同一动作可能因后续随机事件得到完全不同回报。减去合适的状态 baseline 可降低方差，不改变期望梯度；最常见 baseline 是价值函数 $V(s)$，于是权重成为优势估计。任意 baseline 并不保证降方差。

Actor-Critic 同时训练两个角色：actor 是策略 $\pi_\theta$，决定动作；critic 用参数 $\phi$ 估计价值，帮助判断结果比预期好多少。critic 可以降低方差，但估计错误也会引入偏差。GAE（Generalized Advantage Estimation）在短期 TD 与长期回报之间连续调节。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：同样奖励在不同基准下含义不同",
      body: String.raw`模型生成两个 token 后得到最终奖励 $R=1.0$。在第一个位置，所选 token 概率为 0.8；第二个位置为 0.6。先忽略折扣，轨迹 log 概率是：

$$\log p_\theta(\tau)=\log0.8+\log0.6=\log0.48$$

若没有 baseline，两个 token 都用权重 1.0 增加 log 概率。但假设 critic 认为该状态通常能得到 $V=0.4$，优势估计为 $A=1.0-0.4=0.6$，更新仍朝增加概率方向，幅度更小。

对 softmax 中被选动作的 logit $z_a$，有：

$$\frac{\partial\log\pi(a|s)}{\partial z_a}=1-\pi(a|s)$$

所以两个位置仅看所选 logit 的梯度系数分别是：

$$0.6(1-0.8)=0.12,\qquad 0.6(1-0.6)=0.24$$

第二个 token 当前概率更低，同样优势下增加空间更大。完整 softmax 梯度还会降低其他 token logits，并通过共享参数影响多个位置。

若实际奖励只有 0.1、baseline 仍是 0.4，则优势为 -0.3，梯度方向反转，降低这些动作概率。奖励绝对为正不代表一定鼓励；关键是它相对 baseline 的高低。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "Actor-Critic 的采样与双目标",
      body: String.raw`Actor 根据状态分布采样动作，环境产生奖励与下一状态。Critic 读取状态，预测未来价值。由奖励和相邻价值构造 TD residual，再积累为 Advantage；Actor 使用 Advantage 加权 log 概率，Critic 则回归价值目标。

两者共享数据但目标不同。Actor 的输出是动作分布，Critic 输出一个状态标量。共享 backbone 可以省计算，却会让两个损失的梯度互相影响；独立 critic 更灵活但显存更高。PPO 经典 RLHF 常同时维护 policy、value、reference 和 reward model，系统成本由此增加。

熵奖励可接到 Actor 目标，鼓励分布不过早坍缩；它不提供任务正确性，只控制探索。熵系数过大时策略会为了随机而随机。`,
      diagram: {
        kind: "flow",
        nodes: [
          "状态 s_t",
          "Actor πθ",
          "动作与奖励",
          "Critic Vφ",
          "TD residual",
          "GAE Advantage",
          "策略/价值更新",
        ],
        links: [
          [0, 1],
          [1, 2],
          [0, 3],
          [2, 4],
          [3, 4],
          [4, 5],
          [5, 6],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "从期望回报到策略梯度与 GAE",
      body: String.raw`目标是最大化策略产生轨迹的期望回报；先假设有限时域、环境与奖励不依赖 $\theta$、策略在固定支持集上可微，且可交换微分与积分：

$$J(\theta)=\mathbb E_{\tau\sim p_\theta(\tau)}[R(\tau)]$$

从积分而不是口诀出发，利用 $\nabla p=p\nabla\log p$：

$$\nabla_\theta J=\nabla_\theta\int p_\theta(\tau)R(\tau)d\tau
=\int p_\theta(\tau)R(\tau)\frac{\nabla_\theta p_\theta(\tau)}{p_\theta(\tau)}d\tau
=\mathbb E_{\tau}\left[
R(\tau)\nabla_\theta\log p_\theta(\tau)\right]$$

轨迹概率为 $p_\theta(\tau)=\rho_0(s_0)\prod_t\pi_\theta(a_t|s_t)P(s_{t+1},r_{t+1}|s_t,a_t)$。环境转移不依赖策略参数时，轨迹 log 概率中只有动作项：

$$\nabla_\theta\log p_\theta(\tau)
=\sum_t\nabla_\theta\log\pi_\theta(a_t|s_t)$$

**因果性消去过去奖励。** 记 $u_t=\nabla_\theta\log\pi_\theta(a_t|s_t)$，$\mathcal H_t$ 是采样 $a_t$ 前的全部历史。因为 $\mathbb E[u_t|\mathcal H_t]=\sum_a\nabla_\theta\pi_\theta(a|s_t)=0$，对 $k<t$，已发生的奖励满足 $\mathbb E[u_t r_{k+1}]=0$。若 $R(\tau)=\sum_{k=0}^{T-1}\gamma^kr_{k+1}$：

$$\nabla J
=\mathbb E\left[\sum_t u_t\sum_{k=t}^{T-1}\gamma^kr_{k+1}\right]
=\mathbb E\left[\sum_t\gamma^t u_tG_t\right]$$

减去状态 baseline 得 $\hat g=\sum_t\gamma^tu_t(G_t-b(s_t))$。LLM 有限回答常取 $\gamma=1$，此时省略 $\gamma^t$；若采用折扣状态占用分布，也可将此权重吸收到状态采样中。不能在一般折扣 episodic 目标里无说明地删去外层 $\gamma^t$。

一步 TD residual 为：

$$\delta_t=r_{t+1}+\gamma(1-d_t)V_\phi(s_{t+1})-V_\phi(s_t)$$

GAE 用参数 $\lambda\in[0,1]$ 加权未来 residual：

$$\hat A_t^{GAE}=\sum_{l=0}^{T-t-1}
(\gamma\lambda)^l\delta_{t+l}$$

$\lambda$ 较小通常更依赖 critic bootstrap，方差较低但偏差可能大；$\lambda$ 接近 1 更接近 Monte Carlo。这个权衡不是所有奖励相关结构下的方差单调定理；必须检查 critic 与末端价值误差。`,
    },
    {
      id: "math-baseline",
      type: "derivation",
      title: "Baseline 无偏性与为什么 V 不一定方差最优",
      body: String.raw`对固定状态，baseline $b(s)$ 作为一个停止梯度的标量：

$$\mathbb E_{a\sim\pi_\theta}[b(s)\nabla\log\pi_\theta(a|s)]
=b(s)\sum_a\nabla\pi_\theta(a|s)
=b(s)\nabla 1=0$$

因此可以减去任何在给定状态后不依赖当前动作的 baseline。它可依赖参数，但 actor 估计器不能沿 b 反传；若 b 是用同一有限 batch 拟合且偷看当前动作/回报，还需检查条件独立性或使用交叉拟合。动作相关 baseline 一般不满足上式。

**最小化什么方差？** 令 $u=\nabla\log\pi(a|s)\in\mathbb R^d$、回报为 $G$。条件均值不随 b 变，所以最小化条件协方差的迹，等价于最小化二阶矩：

$$f(b)=\mathbb E[\|u\|^2(G-b)^2|s]$$
$$f'(b)=-2\mathbb E[\|u\|^2(G-b)|s]=0
\quad\Longrightarrow\quad
b^*(s)=\frac{\mathbb E[\|u\|^2G|s]}{\mathbb E[\|u\|^2|s]}$$

分母为零时该状态没有策略梯度，baseline 任意。只有 score 范数对动作不变，或相应加权相关项消失时，$b^*=\mathbb E[G|s]=V^\pi(s)$。整条轨迹多个梯度项的协方差还会影响全局最优 baseline，上式针对单步条件目标。

**反例。** Bernoulli 动作 $a\in\{0,1\}$，$\pi(a=1)=0.8$，logit 参数的 score 是 $u=a-0.8$，奖励 $G=a$。真实梯度 0.16，$V=0.8$，但 $b^*=0.2$。取 b=0.2 时两个动作的 $u(G-b)$ 都是 0.16，方差为 0；b=0 时方差为 0.0064；b=V 时方差反而为 0.0576。价值 baseline 很常用，但“价值准确就一定达到最小梯度方差”是错误命题。`,
    },
    {
      id: "math-gae-telescoping",
      type: "derivation",
      title: "GAE 的望远镜求和与有限轨迹端点",
      body: String.raw`固定一条从 t 到 T 的采样片段，先不跨 episode，所有价值预测来自冻结的 rollout critic。令 $N=T-t$，$V_k=V_{\phi_{\rm old}}(s_k)$。n-step advantage 定义为：

$$\hat A_t^{(n)}=\sum_{l=0}^{n-1}\gamma^lr_{t+l+1}
+\gamma^nV_{t+n}-V_t$$

将 $\delta_k=r_{k+1}+\gamma V_{k+1}-V_k$ 按 $\gamma^l$ 求和，中间价值一正一负相消，故 $\hat A_t^{(n)}=\sum_{l=0}^{n-1}\gamma^l\delta_{t+l}$。再混合所有 n-step 估计：

$$\hat A_t^{\rm GAE}
=(1-\lambda)\sum_{n=1}^{N-1}\lambda^{n-1}\hat A_t^{(n)}
+\lambda^{N-1}\hat A_t^{(N)}$$

第 $l$ 个 residual 的总系数是 $\gamma^l[(1-\lambda)\sum_{n=l+1}^{N-1}\lambda^{n-1}+\lambda^{N-1}]=(\gamma\lambda)^l$，因此：

$$\hat A_t^{\rm GAE}=\sum_{l=0}^{N-1}(\gamma\lambda)^l\delta_{t+l},
\qquad \hat A_t=\delta_t+\gamma\lambda\hat A_{t+1}$$

有限片段必须保留最后一项的 $\lambda^{N-1}$ 权重；不能照抄无穷几何和后丢掉尾部。$\lambda=0$ 是一步 TD；$\lambda=1$ 时：

$$\hat A_t=\sum_{l=0}^{N-1}\gamma^lr_{t+l+1}
+\gamma^NV_T-V_t$$

真正终止 $V_T=0$ 时才是完整 MC return 减 baseline；纯截断仍有 $\gamma^NV_T$ 的误差。

**教学手算。** $r=[0,0,1]$，$V=[0.2,0.3,0.5,0]$，$\gamma=0.9,\lambda=0.8$。$\delta=[0.07,0.15,0.5]$，倒推得 $\hat A_2=0.5$、$\hat A_1=0.15+0.72(0.5)=0.51$、$\hat A_0=0.07+0.72(0.51)=0.4372$。value target $\hat A+V=[0.6372,0.81,1]$。改为 $\lambda=1$ 得 $[0.61,0.6,0.5]$，恰好是 MC 回报 $[0.81,0.9,1]$ 减原价值。`,
    },
    {
      id: "math-actor-critic-detach",
      type: "derivation",
      title: "Actor 与 Critic 的损失、停梯度和双 mask",
      body: String.raw`令 $m_t$ 是有效动作 mask，$M=\sum_tm_t>0$。以下写有限回答 $\gamma=1$ 的常见批平均 surrogate；严格折扣目标需另保留外层权重。rollout 后一次性计算并冻结 $\hat A_t$ 和 $\hat R_t=\hat A_t+V_{\phi_{\rm old}}(s_t)$：

$$L_{\rm actor}=-\frac1M\sum_tm_t\operatorname{sg}(\hat A_t)
\log\pi_\theta(a_t|s_t)-c_H H(\pi_\theta)$$
$$L_{\rm critic}=\frac1{2M}\sum_tm_t
[V_\phi(s_t)-\operatorname{sg}(\hat R_t)]^2$$

这里 H 表示相同有效状态上的平均熵。actor 梯度为 $-\hat A_t\nabla\log\pi$，critic 梯度为 $(V_\phi-\hat R_t)\nabla V_\phi$。若写 $\hat A=R-V_\theta$ 却不 detach，actor 会多出 $\log\pi\,\nabla V_\theta$，模型可通过改基线降低 loss，而非改善动作。共享 backbone 可以同时接收两个明确的损失梯度，但不能通过 advantage 偷接一个目标。

**终止 mask 与递推 mask 不同。** 令 $d_t$ 表示真正终止，$c_t$ 表示 episode 或采集片段边界：

$$\delta_t=r_{t+1}+\gamma(1-d_t)V_{t+1}-V_t,\qquad
\hat A_t=\delta_t+\gamma\lambda(1-c_t)\hat A_{t+1}$$

截断处 $d=0,c=1$：保留 bootstrap，但不把下一片段/另一局的 residual 接上。prompt、padding、环境观察都不应当作 actor 动作；末 token 的奖励写到每条回答的真实末位置，不是 padding 后的最后一列。

重要性重加权、多轮旧数据复用、有限 batch advantage whitening 都会改变估计器；“减状态 baseline 无偏”的证明不能替它们担保。至少记录 mask、归一化分母、是否按 token/序列平均和采样策略版本。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从后向前计算 GAE",
      body: String.raw`GAE 可从轨迹末尾反向递推，复杂度为线性。下面处理单条连续片段，传入 terminated mask；若末尾只是时间截断，应保留末状态 bootstrap。多个片段拼接时还需上一节的独立 boundary mask 与各片段真实末观测，不能把下一局 value 接到前一局。

~~~python
def compute_gae(rewards, values, terminated, gamma=0.99, gae_lambda=0.95):
    # values 长度比 rewards 多 1，最后一项是末状态 bootstrap value
    advantages = [0.0] * len(rewards)
    running = 0.0

    for t in reversed(range(len(rewards))):
        not_terminal = 1.0 - float(terminated[t])
        delta = (
            rewards[t]
            + gamma * not_terminal * values[t + 1]
            - values[t]
        )
        running = delta + gamma * gae_lambda * not_terminal * running
        advantages[t] = running

    returns = [advantage + value for advantage, value
               in zip(advantages, values[:-1])]
    return advantages, returns

rewards = [0.0, 0.0, 1.0]
values = [0.2, 0.3, 0.5, 0.0]
terminated = [False, False, True]
print(compute_gae(rewards, values, terminated, gamma=0.9, gae_lambda=0.8))
# advantages=[0.4372, 0.51, 0.5], returns=[0.6372, 0.81, 1.0]
~~~

Actor 用 advantages，critic 常回归 returns。实际实现会在有效 token 上做 mask，并可能对一个 batch 的优势标准化；标准化改变有限 batch 的尺度，需与学习率和分布式聚合方式一起记录。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：低方差估计也可能方向错误",
      body: String.raw`**误区一：baseline 必须完全准确。** 给定状态后 baseline 不依赖当前动作可保持期望不变，但不保证方差最优。最优单步标量 baseline 还依赖 score 范数；若 baseline 偷看动作或答案，可能引入偏差。

**误区二：critic loss 下降就说明策略更好。** critic 只拟合当前数据上的价值目标，策略质量由真实回报决定；critic 过拟合还会给 Actor 错误优势。

**误区三：GAE 的 λ 越大越准确。** 接近 1 减少 bootstrap 偏差，却增加轨迹采样方差；有限数据下未必更好。

**误区四：熵越大探索越好。** 高熵只表示分布更分散，不保证探索到有用状态。任务奖励、采样温度和熵系数需协同。

**误区五：把整句奖励复制给每个 token 就完成信用分配。** 这是可用的序列级 REINFORCE 信号，但无法区分句内关键步骤；长轨迹方差高，也容易奖惩无关 token。

**误区六：梯度 norm clipping、PPO ratio clipping 和 reward clipping 相同。** 三者分别限制参数梯度、策略概率比和奖励数值，作用位置与偏差完全不同。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "从 REINFORCE 到 Actor-Critic",
      body: String.raw`| 方法 | Actor 权重 | 是否 bootstrap | 偏差/方差 |
|---|---|---|---|
| REINFORCE | 完整 return $G_t$ | 否 | 低模型偏差、高方差 |
| REINFORCE + baseline | $G_t-b(s_t)$ | 否 | 期望不变、合适基线降方差 |
| Actor-Critic TD(0) | 单步 $\delta_t$ | 是 | 方差低、依赖 critic |
| n-step Actor-Critic | n 步回报减价值 | 部分 | 中间折中 |
| GAE | 加权 TD residual | 是 | 用 λ 连续调节 |

policy-based 方法直接表示动作概率，适合大离散或连续动作，能自然保持随机策略；value-based 方法学习动作价值并通过 argmax 决策，离散小动作空间更直接。Actor-Critic 把两者结合：策略负责选择，价值负责估计，不等于用 Q-learning 更新 Actor。

在 LLM 中，一条回答的 token log 概率之和就是轨迹 log 概率。序列级奖励可作为所有生成 token 的信号；token 级奖励或过程奖励可改善信用分配，但评审器误差也会更细粒度地进入训练。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：baseline 为什么不引入偏差",
      body: String.raw`**30 秒回答：**“策略梯度中可从回报减去只依赖状态的 baseline，因为对动作取期望时，$b(s)\sum_a\pi(a|s)\nabla\log\pi(a|s)=b(s)\nabla\sum_a\pi(a|s)=0$。因此期望方向不变，合适基线能降方差，但 $V(s)$ 不一定是最小梯度方差的基线。”

若追问 GAE：先计算每步 TD residual $\delta_t=r+\gamma V(s')-V(s)$，再按 $(\gamma\lambda)^l$ 加权未来 residual。小 λ 更依赖 critic、低方差高偏差；大 λ 更接近 Monte Carlo。

若追问 Actor 与 Critic：Actor 输出策略并由优势加权 log 概率更新；Critic 回归价值目标，承担降方差。两者可共享 backbone，也可独立，取决于显存与梯度干扰。

若追问 LLM：状态是已生成前缀，动作是下一个 token，策略由 softmax 给出。终局 reward 可乘每个生成 token 的 log 概率梯度，但长序列信用分配和方差促使 PPO、GRPO 等方法引入约束与组内基线。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：策略梯度的每一项从哪里来",
      body: "回答时区分真实环境量、采样估计和学习到的近似。",
      questions: [
        {
          q: "回报为 3、状态 baseline 为 5 时，优势符号是什么，策略会怎样更新已选动作？",
          a: "优势为 -2，策略梯度会降低该动作在该状态的 log 概率；正奖励也可能低于预期。",
        },
        {
          q: "为什么 baseline 不能任意依赖当前动作？",
          a: "只依赖状态时，其 score-function 期望严格为零；依赖动作的项通常不能直接消掉，会改变期望梯度，除非额外做正确修正。",
        },
        {
          q: "GAE 中 λ=0 与 λ 接近 1 分别更像什么？",
          a: "λ=0 只保留一步 TD residual，更依赖 bootstrap；λ 接近 1 更接近折扣 Monte Carlo advantage，通常方差更高。",
        },
        {
          q: "熵奖励能否判断答案正确？",
          a: "不能。它只鼓励动作分布保持多样，正确性仍来自环境奖励、验证器或人类反馈。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：因果性、GAE 与无偏反例",
      body: "不用背最终式，从条件期望和有限和开始。",
      questions: [
        {
          q: "从轨迹概率推导 reward-to-go 梯度。为什么过去奖励可以去掉，而未来奖励不能？",
          a: String.raw`$p_\theta(\tau)=\rho_0\prod_t\pi_\theta P$，故 $\nabla\log p_\theta=\sum_tu_t$。对动作前历史 $\mathcal H_t$，$\mathbb E[u_t|\mathcal H_t]=0$，过去奖励已可测，所以其乘积期望为零。未来奖励受动作影响，不能消去。于是 $\nabla J=\mathbb E\sum_t\gamma^tu_tG_t$。**得分点：**交换积分与微分的条件；环境不依赖参数；外层 $\gamma^t$ 不遗漏。`,
        },
        {
          q: "r=[0,0,1]、V=[0.2,0.3,0.5,0]、γ=0.9、λ=0.8。手算 GAE，并用 λ=1 检查望远镜端点。",
          a: String.raw`$\delta=[0.07,0.15,0.5]$，递推乘数为 0.72，优势 $[0.4372,0.51,0.5]$。$\lambda=1$ 时优势为 $[0.61,0.6,0.5]$，加回 V 得 $[0.81,0.9,1]$。若末端非终止还要保留 $\gamma^NV_T$。**得分点：**倒序递推；区分 delta 与 advantage；明确终止与截断。`,
        },
        {
          q: "奖励恒为零，Bernoulli 策略 p=0.5，却用 b(a)=a 作 baseline，会发生什么？",
          a: String.raw`logit score 为 $a-p$。真实梯度为 0；错误估计的期望为 $\mathbb E[-a(a-0.5)]=-0.25$，引入了非零方向。只有给定状态不依赖当前动作的 baseline 才能直接消去。**得分点：**枚举两个动作或计算期望；指出偏差来源；detach 只切计算图，不能修复动作相关的统计偏差。`,
        },
        {
          q: "推导最小条件梯度方差的标量 baseline，并说明为什么 actor 的 advantage 要 detach。",
          a: String.raw`最小化 $\mathbb E[\|u\|^2(G-b)^2|s]$，对 b 求导为零得 $b^*=\mathbb E[\|u\|^2G|s]/\mathbb E[\|u\|^2|s]$，一般不等于 V。不 detach 的 $-\log\pi(R-V_\theta)$ 多出 $\log\pi\nabla V_\theta$。**得分点：**加权而非普通均值；分母零边界；共享参数也要隔离 actor 权重的梯度。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "Simple Statistical Gradient-Following Algorithms for Connectionist Reinforcement Learning",
      url: "https://link.springer.com/article/10.1007/BF00992696",
      evidence: "REINFORCE 原始论文",
    },
    {
      label: "Policy Gradient Methods for Reinforcement Learning with Function Approximation",
      url: "https://proceedings.neurips.cc/paper/1999/hash/464d828b85b0bed98e80ade0a5c43b0f-Abstract.html",
      evidence: "策略梯度定理论文",
    },
    {
      label: "High-Dimensional Continuous Control Using Generalized Advantage Estimation",
      url: "https://arxiv.org/abs/1506.02438",
      evidence: "GAE 原始论文",
    },
    {
      label: "OpenAI Spinning Up: Vanilla Policy Gradient",
      url: "https://spinningup.openai.com/en/latest/algorithms/vpg.html",
      evidence: "教学实现",
    },
  ],
};

export default chapter;
