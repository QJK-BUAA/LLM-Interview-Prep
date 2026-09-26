const chapter = {
  id: "13",
  slug: "mdp-values-bellman",
  part: "强化学习地基",
  title: "MDP、回报、价值函数与贝尔曼方程",
  subtitle: "把连续决策写成可计算问题",
  level: "基础",
  duration: 120,
  prerequisites: ["03", "04"],
  tags: ["RL", "MDP", "Return", "Value Function", "Bellman"],
  objectives: [
    "用状态、动作、奖励和转移描述一个 MDP",
    "手算折扣回报、V、Q 与 Advantage",
    "解释贝尔曼期望方程与最优方程的差别",
    "区分 MC/TD 以及 on-policy/off-policy",
  ],
  summary:
    "强化学习研究动作如何改变未来数据与回报；MDP 给出环境规则，策略产生轨迹，价值函数把未来回报压缩到当前状态或动作，贝尔曼方程则用一步转移连接现在与未来。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：当前动作会改变下一道题",
      body: String.raw`监督学习通常给定输入与标签，模型预测后不会改变下一条训练数据。强化学习（Reinforcement Learning, RL）不同：智能体在状态中选择动作，环境返回奖励和下一状态，而这个下一状态又决定后续能看到什么。动作既影响即时结果，也影响未来机会。

马尔可夫决策过程（Markov Decision Process, MDP）用五元组 $(\mathcal S,\mathcal A,P,R,\gamma)$ 表示：$\mathcal S$ 是状态集合，$\mathcal A$ 是动作集合，$P(s'|s,a)$ 是转移概率，$R$ 描述奖励，$\gamma\in[0,1]$ 是折扣因子。马尔可夫性质要求：给定当前状态和动作后，下一状态分布不再依赖更早历史。若当前状态漏掉关键信息，问题就不是严格的 MDP 表示。

策略 $\pi(a|s)$ 给出在状态 $s$ 选择动作 $a$ 的概率。按策略与环境交互，会形成轨迹 $\tau=(s_0,a_0,r_1,s_1,\ldots)$。RL 的目标不是逐步奖励都最大，而是让整条轨迹的累计回报高。

在 LLM 中，状态可视为 prompt 与已生成前缀，动作是下一个 token，转移通常是把 token 追加到前缀，奖励可能在最终答案才出现。动作空间有整个词表，轨迹很长，奖励稀疏，这些特征解释了后续为何需要优势估计、验证器和稳定的策略更新。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：两步学习计划的回报",
      body: String.raw`智能体处在状态“今晚有两小时”。第一步可选“刷基础题”或“直接做难题”。假设选择基础题后立即得到奖励 $r_1=2$，进入“基础已复习”状态；第二步做难题得到 $r_2=5$，随后终止。取折扣因子 $\gamma=0.9$。

时刻 0 的回报是：

$$G_0=r_1+\gamma r_2=2+0.9\times5=6.5$$

时刻 1 的回报是 $G_1=r_2=5$。折扣可表达延迟、不确定性或数学上保证无限和收敛，但 $\gamma$ 并不是“未来奖励不重要”的唯一合理解释。

若另一动作“直接做难题”有 50% 概率成功得 8，50% 概率失败得 0，并立即终止，其期望回报为 $0.5\times8=4$。按期望回报，基础题路线的 6.5 更高。

价值不是某条已发生轨迹的回报。$G_t$ 是一次采样得到的随机量，$V^\pi(s)$ 是从状态 $s$ 出发、以后按策略 $\pi$ 行动时 $G_t$ 的期望。多次轨迹平均可估计价值，但单次 6.5 不能证明真实价值恰好等于 6.5。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "Agent 与 Environment 的闭环",
      body: String.raw`每个时间步，环境把状态 $s_t$ 给智能体；智能体按策略采样动作 $a_t$；环境根据转移分布产生奖励 $r_{t+1}$ 与下一状态 $s_{t+1}$。同一策略在随机环境中可产生不同轨迹，同一环境在不同策略下也会产生不同数据分布。

价值函数位于这个闭环的“未来压缩”位置。$V^\pi(s_t)$ 不需要列出所有未来轨迹，而是概括从当前状态继续执行策略的期望回报；$Q^\pi(s_t,a_t)$ 在此基础上固定第一步动作；$A^\pi(s_t,a_t)$ 比较该动作相对状态平均水平好多少。

训练数据来自哪个策略非常关键。on-policy 方法用当前策略或非常接近它的策略采样；off-policy 方法可学习另一目标策略的价值，例如从历史 replay buffer 学习。二者差别是数据分布关系，不等同于在线或离线存储方式。`,
      diagram: {
        kind: "flow",
        nodes: [
          "状态 s_t",
          "策略 π(a|s)",
          "动作 a_t",
          "环境转移 P",
          "奖励 r 与新状态",
          "回报/价值估计",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 0],
          [4, 5],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "从回报递推到贝尔曼方程",
      body: String.raw`从时刻 $t$ 开始的折扣回报定义为：

$$G_t=\sum_{k=0}^{\infty}\gamma^k r_{t+k+1}$$

把第一项拆出：

$$G_t=r_{t+1}+\gamma\sum_{k=0}^{\infty}\gamma^k r_{t+k+2}
=r_{t+1}+\gamma G_{t+1}$$

状态价值和动作价值分别为：

$$V^\pi(s)=\mathbb E_\pi[G_t\mid s_t=s]$$

$$Q^\pi(s,a)=\mathbb E_\pi[G_t\mid s_t=s,a_t=a]$$

优势函数定义为：

$$A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s)$$

对回报递推取条件期望，得到贝尔曼期望方程：

$$V^\pi(s)=\sum_a\pi(a|s)\sum_{s',r}
p(s',r|s,a)\left[r+\gamma V^\pi(s')\right]$$

它评估固定策略 $\pi$。最优价值则在动作上取最大：

$$V^*(s)=\max_a\sum_{s',r}
p(s',r|s,a)\left[r+\gamma V^*(s')\right]$$

贝尔曼“最优方程”带 max，贝尔曼“期望方程”按策略概率平均。把二者混用，会把策略评估误写成控制问题。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：迭代求一个固定策略的价值",
      body: String.raw`下面有两个非终止状态。策略固定，不做动作选择；反复用贝尔曼期望备份，直到价值变化足够小。

~~~python
gamma = 0.9
values = {"start": 0.0, "ready": 0.0, "terminal": 0.0}

# 每项为 (概率, 下一状态, 奖励)
transitions = {
    "start": [(1.0, "ready", 2.0)],
    "ready": [(0.8, "terminal", 5.0), (0.2, "terminal", 0.0)],
}

for iteration in range(100):
    updated = {"terminal": 0.0}
    for state, outcomes in transitions.items():
        updated[state] = sum(
            probability * (reward + gamma * values[next_state])
            for probability, next_state, reward in outcomes
        )
    change = max(abs(updated[state] - values[state]) for state in values)
    values = updated
    if change < 1e-9:
        break

print(values)  # ready=4, start=2+0.9*4=5.6
~~~

这叫动态规划式 full backup，因为已知完整转移概率。真实大问题通常不知道环境模型，只能用采样轨迹近似期望，进而形成 Monte Carlo、TD、Q-learning 或策略梯度方法。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：相似术语描述的是不同坐标轴",
      body: String.raw`**误区一：reward 与 return 相同。** reward 是单步反馈，return 是从当前时刻开始的折扣累计。一个即时奖励低的动作仍可能带来更高长期回报。

**误区二：状态就是屏幕上能看到的一切。** 状态应包含预测未来所需信息。观测若不完整，严格说是 POMDP，历史或记忆可帮助构造近似充分状态。

**误区三：on-policy 等于数据实时生成。** 核心是行为策略与目标策略的关系。旧数据即使刚采完，只要策略已大幅更新，也可能变成 off-policy。

**误区四：episode 截断等于环境终止。** 真正终止状态未来价值为零；因时间上限截断时，环境本可继续，应视实现决定是否 bootstrap，否则价值会系统偏低。

**误区五：折扣越小越稳定，所以总应小。** 小 $\gamma$ 缩短信用分配范围，也可能让智能体忽略真正重要的延迟奖励。应匹配任务时间尺度。

**误区六：Advantage 是额外奖励。** 它是 $Q-V$ 的相对价值估计，用于判断动作比当前策略在该状态的平均表现好或坏，不改变环境奖励定义。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "MC、TD 与策略关系",
      body: String.raw`| 方法维度 | 选项 | 目标来源 | 典型权衡 |
|---|---|---|---|
| 回报估计 | Monte Carlo | 等 episode 结束，用完整 $G_t$ | 无 bootstrap 偏差，方差高 |
| 回报估计 | TD(0) | $r+\gamma V(s')$ | 可在线更新，bootstrap 有偏 |
| 多步折中 | n-step / TD(λ) | 若干真实奖励 + 末端价值 | 在偏差与方差间调节 |
| 数据关系 | On-policy | 当前行为策略的数据 | 分布匹配，但样本复用少 |
| 数据关系 | Off-policy | 其他行为策略的数据 | 可复用数据，需修正分布差 |
| 学习目标 | Prediction | 固定策略下估值 | 不改策略 |
| 学习目标 | Control | 寻找更优策略 | 评估与改进交替 |

Monte Carlo 与 on-policy 不是同义词，TD 与 off-policy 也不是同义词。SARSA 是 on-policy TD control，Q-learning 是 off-policy TD control；两条轴可以交叉组合。

model-free 表示不显式学习或使用转移模型来规划，不代表环境没有转移规律。model-based 方法学习或已知 $P,R$，可在模型中想象未来，但会受到模型误差影响。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：V、Q、A 有什么关系",
      body: String.raw`**30 秒回答：**“$V^\pi(s)$ 是在状态 s 后按策略行动的期望回报；$Q^\pi(s,a)$ 还固定第一步动作 a；$A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s)$ 表示这个动作相对当前策略平均动作好多少。对策略动作取期望时 Advantage 为零，因此它适合作为策略梯度的中心化学习信号。”

若追问贝尔曼方程：回报满足 $G_t=r_{t+1}+\gamma G_{t+1}$，取条件期望便得到当前价值等于一步奖励加折扣后的下一状态价值。期望方程评估固定策略，最优方程在动作上取 max。

若追问 MC 和 TD：MC 等完整回报，目标更直接但方差高且需 episode 结束；TD 用当前价值估计 bootstrap，可逐步更新、方差较低，但引入估计偏差。

若追问 LLM 映射：状态是 prompt 加生成前缀，动作是 token，策略是 next-token 分布，episode 是完整回答，验证器奖励常在末尾产生，因此长程信用分配尤其困难。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：先定义随机变量再计算",
      body: "不要只背缩写，回答每个量条件在什么信息上。",
      questions: [
        {
          q: "奖励依次为 1、2、4，γ=0.5，时刻 0 的有限回报是多少？",
          a: "G0=1+0.5×2+0.5²×4=3。",
        },
        {
          q: "Qπ(s,a)=7，Vπ(s)=5 时，Aπ(s,a) 是多少，如何解释？",
          a: "优势为 2，表示该动作的期望回报比策略在该状态下的平均动作高 2。",
        },
        {
          q: "Q-learning 使用 replay buffer，为什么通常称 off-policy？",
          a: "数据可由旧行为策略生成，而更新目标使用下一状态动作的最大 Q，对应贪心目标策略，两者不必相同。",
        },
        {
          q: "时间限制导致 episode 停止时，为什么不能总把下一状态价值设为零？",
          a: "时间截断不代表环境真正终止，未来回报仍可能存在；错误清零会产生向下偏差，应区分 terminated 与 truncated。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Reinforcement Learning: An Introduction, Second Edition",
      url: "http://incompleteideas.net/book/RLbook2020.pdf",
      evidence: "经典教材",
    },
    {
      label: "Dynamic Programming",
      url: "https://press.princeton.edu/books/paperback/9780691146683/dynamic-programming",
      evidence: "Bellman 经典著作",
    },
    {
      label: "OpenAI Spinning Up: Introduction to RL",
      url: "https://spinningup.openai.com/en/latest/spinningup/rl_intro.html",
      evidence: "教学资料",
    },
  ],
};

export default chapter;
