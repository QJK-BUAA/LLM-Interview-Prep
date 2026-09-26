const chapter = {
  id: "14",
  slug: "q-learning-dqn",
  part: "强化学习地基",
  title: "Q-Learning、SARSA 与 DQN",
  subtitle: "从价值表到神经网络近似",
  level: "基础",
  duration: 125,
  prerequisites: ["05", "13"],
  tags: ["Q-Learning", "SARSA", "DQN", "Replay Buffer", "探索"],
  objectives: [
    "手算 Q-Learning 与 SARSA 的一步更新",
    "解释 epsilon-greedy 探索和行为策略",
    "推导 DQN 目标、replay buffer 与 target network",
    "说明 deadly triad 及价值法为何不适合直接扩展到 LLM token 空间",
  ],
  summary:
    "Q-Learning 用一步奖励和下一状态最优 Q 值更新动作价值；DQN 用神经网络扩展到大状态空间，但必须用经验回放和目标网络缓解相关样本、移动目标与函数近似共同造成的不稳定。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：给每个状态动作组合记长期分数",
      body: String.raw`如果状态和动作都很少，可以维护一张 Q 表。表中 $Q(s,a)$ 不是动作的即时奖励，而是“现在在 s 做 a，之后按某种策略继续”能得到的长期回报估计。决策时选择 Q 最大的动作，学习时用实际经历逐步修正表格。

只选当前最大值会陷入已有认知：一个从未试过的动作可能更好。epsilon-greedy 策略以 $1-\epsilon$ 选择当前贪心动作，以 $\epsilon$ 随机探索。训练初期可用较大 $\epsilon$，随后衰减；但探索强度必须匹配环境风险和状态覆盖。

Q-Learning 的下一步目标直接取 $\max_{a'}Q(s',a')$，学习贪心目标策略，即使当前行为因探索选择了别的动作，因此是 off-policy。SARSA 使用真实采到的下一动作 $a'$ 的 $Q(s',a')$，评估并改进当前行为策略，因此是 on-policy。

状态很多或连续时，Q 表无法枚举。DQN（Deep Q-Network）用神经网络 $Q_\theta(s,a)$ 近似整张表。这样获得泛化，也引入新风险：一次参数更新会同时改变许多状态的预测，目标本身还依赖网络预测，训练不再是简单表格平均。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：同一转移下 Q-Learning 与 SARSA",
      body: String.raw`当前估计 $Q(s,a)=2$，执行动作后得到奖励 $r=1$，到达 $s'$。学习率 $\alpha=0.5$，折扣 $\gamma=0.9$。在 $s'$ 中，两个动作的 Q 值分别为 4 和 1。

Q-Learning 使用最大值 4，TD 目标：

$$y_Q=r+\gamma\max_{a'}Q(s',a')=1+0.9\times4=4.6$$

TD error 为 $\delta=4.6-2=2.6$，更新后：

$$Q(s,a)\leftarrow2+0.5\times2.6=3.3$$

若行为策略因为探索实际选择了 Q 值为 1 的动作，SARSA 目标为：

$$y_S=r+\gamma Q(s',a')=1+0.9\times1=1.9$$

更新后 $Q(s,a)=2+0.5(1.9-2)=1.95$。差异不在更新模板，而在下一状态用“目标策略最想做什么”还是“行为策略实际做了什么”。在危险探索环境中，SARSA 会把探索风险计入价值，可能学到更保守路线。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "DQN 的采样与学习回路",
      body: String.raw`行为网络与环境交互，把 $(s,a,r,s',done)$ 写入 replay buffer。训练时随机抽取小批量，在线网络预测当前 $Q_\theta(s,a)$；目标网络 $\theta^-$ 计算下一状态目标；平方 TD error 反向更新在线网络；每隔若干步再把在线参数复制或软更新到目标网络。

经验回放打乱相邻转移，降低样本时间相关性，并允许一条经验重复使用。目标网络把右侧目标暂时冻结，减缓“追着自己刚改变的预测跑”。它们缓解问题但不消除理论风险。

评估与数据收集也要分开看。训练行为常带 epsilon 探索，测试时通常关闭或显著减小探索；否则成绩混入随机动作。replay 中的数据分布又落后于当前策略，因此 DQN 天然利用 off-policy 数据。`,
      diagram: {
        kind: "flow",
        nodes: [
          "行为策略与环境",
          "Replay Buffer",
          "随机 Mini-batch",
          "在线 Q 网络",
          "目标 Q 网络",
          "TD Loss 与更新",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [2, 4],
          [3, 5],
          [4, 5],
          [5, 0],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "从表格更新到 DQN 损失",
      body: String.raw`表格 Q-Learning 更新为：

$$Q(s_t,a_t)\leftarrow Q(s_t,a_t)+
\alpha\left[y_t-Q(s_t,a_t)\right]$$

其中非终止转移的目标为：

$$y_t=r_{t+1}+\gamma\max_{a'}Q(s_{t+1},a')$$

终止转移没有未来回报，因此 $y_t=r_{t+1}$。DQN 用在线网络参数 $\theta$ 预测当前值，用滞后的目标参数 $\theta^-$ 构造目标：

$$y_t=r_{t+1}+\gamma(1-d_t)
\max_{a'}Q_{\theta^-}(s_{t+1},a')$$

$d_t=1$ 表示真正终止。损失可写为：

$$L(\theta)=\mathbb E_{(s,a,r,s',d)\sim\mathcal D}
\left[\left(y-Q_\theta(s,a)\right)^2\right]$$

最大化操作和带噪估计会产生过高估计。Double DQN 用在线网络选动作、目标网络评估：

$$a^*=\arg\max_{a'}Q_\theta(s',a'),\qquad
y=r+\gamma Q_{\theta^-}(s',a^*)$$

Dueling DQN 则把输出分成状态价值 $V(s)$ 和动作优势 $A(s,a)$，再组合为 Q，使网络在许多动作效果接近时更容易学习共同状态价值。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：表格 Q-Learning 一步",
      body: String.raw`下面明确处理终止状态，并让 epsilon-greedy 在平局时随机选择，避免固定索引偏差。生产实现还需要种子、探索衰减和访问次数监控。

~~~python
import random

q = {
    "start": [2.0, 0.5],
    "next": [4.0, 1.0],
}

def choose_action(state, epsilon):
    if random.random() < epsilon:
        return random.randrange(len(q[state]))
    best = max(q[state])
    candidates = [index for index, value in enumerate(q[state]) if value == best]
    return random.choice(candidates)

state, action = "start", 0
reward, next_state, terminated = 1.0, "next", False
alpha, gamma = 0.5, 0.9

bootstrap = 0.0 if terminated else max(q[next_state])
target = reward + gamma * bootstrap
td_error = target - q[state][action]
q[state][action] += alpha * td_error

print(target, td_error, q[state][action])  # 4.6, 2.6, 3.3
~~~

若环境因时间上限 truncated，而非真正 terminated，是否清零 bootstrap 要按任务语义处理。许多 RL bug 就来自把两个布尔量合并。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：三个看似合理的部件会一起失稳",
      body: String.raw`**Deadly triad** 指函数近似、bootstrap 和 off-policy 学习同时出现时，价值估计可能发散。DQN 恰好同时具备三者；replay、target network、梯度裁剪和稳健损失是工程缓解，不构成普遍收敛证明。

**误区一：replay 越大越好。** 太旧的数据与当前策略差异大，稀有关键转移也可能被淹没。buffer 大小、采样优先级和数据新鲜度都要验证。

**误区二：target network 更新越频繁越准确。** 每步完全同步会重新变成快速移动目标；太慢则目标陈旧。硬更新周期或软更新系数是稳定性超参数。

**误区三：max Q 就是真实最优值。** 噪声下取最大值会偏向高估误差，Double DQN 通过分离选择和评估减轻，而不是保证无偏。

**误区四：epsilon-greedy 适合任何动作空间。** 动作很多时，随机动作大多毫无意义；连续动作更无法枚举 max。需要结构化探索或策略方法。

**误区五：梯度裁剪就是裁 Q 目标。** 梯度裁剪限制反向后的向量范数；reward clipping、TD target clipping 和 PPO ratio clipping 是不同操作。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "价值方法及其改进",
      body: String.raw`| 方法 | 下一步目标 | 主要改进 | 主要限制 |
|---|---|---|---|
| SARSA | 实际采样的下一动作 | 学习行为策略价值 | 探索策略改变目标 |
| Q-Learning | 下一动作最大 Q | off-policy 学最优控制 | max 过估计 |
| DQN | 目标网络最大 Q | 处理高维状态 | 仅适合可枚举离散动作 |
| Double DQN | 在线选、目标评 | 减轻过估计 | 仍有函数近似风险 |
| Dueling DQN | 分解 V 与 A | 更快学习共享状态价值 | 不解决探索本身 |
| Distributional RL | 学回报分布 | 表达不确定回报形状 | 目标和实现更复杂 |

为什么不直接为 LLM 用 DQN？每个状态是可变长文本前缀，动作有数万 token，轨迹可很长；要为每个 token 稳定估计绝对 Q 值并执行 max，会遇到巨大的状态动作空间和严重 bootstrap 误差。LLM 已有可微分的 next-token 策略分布，策略梯度可直接提高采到的好 token 概率。

这不表示价值函数在 LLM 后训练中无用。PPO 的 critic 正是在估计状态价值，并用优势降低方差；只是主策略更新通常不采用离散 Q-learning 的贪心控制形式。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：DQN 为什么需要两个网络和回放池",
      body: String.raw`**30 秒回答：**“连续轨迹高度相关，直接逐步训练会让梯度偏向最近经验；replay buffer 随机抽样并复用数据。TD 目标又依赖网络自己的 Q 预测，若与在线参数同步快速变化，优化目标会不断移动；目标网络用滞后参数让右侧相对稳定。”

若追问 Q-Learning 与 SARSA：二者都做 TD 更新；Q-Learning 下一步取最大 Q，学习贪心目标策略，是 off-policy；SARSA 使用行为策略实际选到的下一动作，是 on-policy。

若追问 Double DQN：在线网络执行 argmax 选择动作，目标网络只评估该动作，降低同一噪声既选又评造成的过估计。

若追问 deadly triad：函数近似会让一个样本影响多个状态，bootstrap 让目标依赖估计值，off-policy 让采样分布与目标策略不一致，三者组合可能导致反馈放大和发散。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：看清 TD 目标来自哪一个策略",
      body: "先写 target，再代入数字。",
      questions: [
        {
          q: "Q=3，r=2，γ=0.5，下一状态最大 Q=6，α=0.25，一步 Q-Learning 后是多少？",
          a: "target=2+0.5×6=5，TD error=2，新 Q=3+0.25×2=3.5。",
        },
        {
          q: "SARSA 为什么可能比 Q-Learning 学到更保守的危险区域路线？",
          a: "SARSA 的目标包含行为策略实际探索动作的后果，会把探索导致的风险计入价值；Q-Learning 目标假设下一步采取贪心动作。",
        },
        {
          q: "目标网络能否彻底解决 DQN 发散？",
          a: "不能。它只让 bootstrap 目标变化更慢，函数近似、off-policy 分布、奖励尺度等问题仍在。",
        },
        {
          q: "为什么 LLM 的 token 动作空间让 epsilon-greedy 很低效？",
          a: "词表有数万动作，均匀随机 token 大多语义无效，还会把后续状态带离合理文本分布；策略分布提供了更结构化的探索。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Learning from Delayed Rewards",
      url: "http://www.cs.rhul.ac.uk/~chrisw/new_thesis.pdf",
      evidence: "Q-Learning 原始博士论文",
    },
    {
      label: "Human-level control through deep reinforcement learning",
      url: "https://www.nature.com/articles/nature14236",
      evidence: "DQN 原始论文",
    },
    {
      label: "Deep Reinforcement Learning with Double Q-learning",
      url: "https://arxiv.org/abs/1509.06461",
      evidence: "Double DQN 原始论文",
    },
    {
      label: "Dueling Network Architectures for Deep Reinforcement Learning",
      url: "https://arxiv.org/abs/1511.06581",
      evidence: "Dueling DQN 原始论文",
    },
  ],
};

export default chapter;
