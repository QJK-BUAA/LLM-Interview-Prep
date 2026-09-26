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
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：奖励为每个采样动作调音量",
      body: String.raw`策略网络输出动作概率。我们从中采样一条轨迹，环境给出回报；若回报高，就增加这条轨迹中已选动作的概率，若回报低于基准，就降低它们的概率。这就是策略梯度最核心的方向。

为什么优化 log 概率？概率乘法描述整条轨迹，但许多时间步相乘会很小；取 log 后变成求和，而且 $\nabla\log\pi$ 能把采样概率的梯度写成可估计形式。训练不是把奖励当可微函数穿过环境，而是用奖励作为权重乘在 log 概率梯度上。

纯 REINFORCE 用实际回报 $G_t$ 加权，理论直接但方差很高。同一动作可能因后续随机事件得到完全不同回报。减去只依赖状态的 baseline，不改变期望梯度，却把信号中心化；最常见 baseline 是价值函数 $V(s)$，于是权重成为优势 $A(s,a)$。

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
      body: String.raw`目标是最大化策略产生轨迹的期望回报：

$$J(\theta)=\mathbb E_{\tau\sim p_\theta(\tau)}[R(\tau)]$$

利用 $\nabla p=p\nabla\log p$：

$$\nabla_\theta J
=\mathbb E_{\tau}\left[
R(\tau)\nabla_\theta\log p_\theta(\tau)\right]$$

环境转移不依赖策略参数时，轨迹 log 概率中只有动作项：

$$\nabla_\theta\log p_\theta(\tau)
=\sum_t\nabla_\theta\log\pi_\theta(a_t|s_t)$$

用每步 reward-to-go 并减去状态 baseline，可得常用估计：

$$\hat g=\sum_t\nabla_\theta\log\pi_\theta(a_t|s_t)
\hat A_t$$

因为对固定状态有 $\mathbb E_{a\sim\pi}[\nabla\log\pi(a|s)b(s)]=0$，只依赖状态的 baseline 不改变期望梯度。

一步 TD residual 为：

$$\delta_t=r_{t+1}+\gamma(1-d_t)V_\phi(s_{t+1})-V_\phi(s_t)$$

GAE 用参数 $\lambda\in[0,1]$ 加权未来 residual：

$$\hat A_t^{GAE}=\sum_{l=0}^{T-t-1}
(\gamma\lambda)^l\delta_{t+l}$$

$\lambda$ 较小更依赖 critic bootstrap，方差低但偏差可能大；$\lambda$ 接近 1 更接近 Monte Carlo，偏差低但方差更高。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从后向前计算 GAE",
      body: String.raw`GAE 可从轨迹末尾反向递推，复杂度为线性。下面分别传入 terminated mask；若只是时间截断，应根据是否还有有效 bootstrap 调整 next value。

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
print(compute_gae(rewards, values, terminated))
~~~

Actor 用 advantages，critic 常回归 returns。实际实现会在有效 token 上做 mask，并可能对一个 batch 的优势标准化；标准化改变有限 batch 的尺度，需与学习率和分布式聚合方式一起记录。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：低方差估计也可能方向错误",
      body: String.raw`**误区一：baseline 必须完全准确。** baseline 不依赖当前采样动作即可保持策略梯度期望不变；更准确通常只会进一步降方差。若 baseline 偷看动作或答案，可能引入偏差。

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
| REINFORCE + baseline | $G_t-b(s_t)$ | 否 | 期望不变、方差更低 |
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
      body: String.raw`**30 秒回答：**“策略梯度中可从回报减去只依赖状态的 baseline，因为对动作取期望时，$b(s)\sum_a\pi(a|s)\nabla\log\pi(a|s)=b(s)\nabla\sum_a\pi(a|s)=0$。因此期望方向不变，但权重更居中、方差更低。用 $V(s)$ 作 baseline 就得到 Advantage。”

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
