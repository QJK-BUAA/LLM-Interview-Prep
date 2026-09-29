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
      body: String.raw`第 13 章的学习助手知道做题成功率，因此可以把所有结果加权平均。现在它面对一个新学生，不知道复习后能提高多少，只能先建议一次、观察一次成绩。问题变成：怎样用一条实际经历修正长期评分，同时为尚未试过的计划保留机会？

如果状态和动作都很少，可以维护一张 Q 表。表中 $Q(s,a)$ 不是动作的即时奖励，而是“现在在 s 做 a，之后按某种策略继续”能得到的长期回报估计。决策时选择 Q 最大的动作，学习时用实际经历逐步修正表格。

只选当前最大值会陷入已有认知：一个从未试过的动作可能更好。epsilon-greedy 策略以 $1-\epsilon$ 选择当前贪心动作，以 $\epsilon$ 随机探索。训练初期可用较大 $\epsilon$，随后衰减；但探索强度必须匹配环境风险和状态覆盖。

Q-Learning 的下一步目标直接取 $\max_{a'}Q(s',a')$，学习贪心目标策略，即使当前行为因探索选择了别的动作，因此是 off-policy。SARSA 使用真实采到的下一动作 $a'$ 的 $Q(s',a')$，评估并改进当前行为策略，因此是 on-policy。

状态很多或连续时，Q 表无法枚举。DQN（Deep Q-Network）用神经网络 $Q_\theta(s,a)$ 近似整张表。这样获得泛化，也引入新风险：一次参数更新会同时改变许多状态的预测，目标本身还依赖网络预测，训练不再是简单表格平均。下面先在同一条学习经历上比较两种目标，再逐项处理神经估值的高估、异常误差和移动目标。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：同一转移下 Q-Learning 与 SARSA",
      body: String.raw`沿用“先复习，再选下一道题”的学习计划，但这次只拿到一次真实转移。为了看清预测与观察的区别，下面把即时奖励设为 1，把两个后续动作的分数设为当前估计；它们不是上一章已经求准的环境价值。

当前估计 $Q(s,a)=2$，执行动作后得到奖励 $r=1$，到达 $s'$。学习率 $\alpha=0.5$，折扣 $\gamma=0.9$。在 $s'$ 中，两个动作的 Q 值分别为 4 和 1。

Q-Learning 使用最大值 4，TD 目标：

$$y_Q=r+\gamma\max_{a'}Q(s',a')=1+0.9\times4=4.6$$

TD error 为 $\delta=4.6-2=2.6$，更新后：

$$Q(s,a)\leftarrow2+0.5\times2.6=3.3$$

若行为策略因为探索实际选择了 Q 值为 1 的动作，SARSA 目标为：

$$y_S=r+\gamma Q(s',a')=1+0.9\times1=1.9$$

更新后 $Q(s,a)=2+0.5(1.9-2)=1.95$。差异不在更新模板，而在下一状态用“目标策略最想做什么”还是“行为策略实际做了什么”。在危险探索环境中，SARSA 会把探索风险计入价值，可能学到更保守路线。3.3 与 1.95 不是谁算错了，而是两种后续行为假设给出的更新；4.6 和 1.9 也只是自举目标，并非新观察到的总成绩。下一步让网络代替表格时，仍需把这些目标的来源写清。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从 TD 目标到稳定价值学习",
      body: String.raw`先把刚才“预测向目标靠近”的一步更新写成损失，用第 05 章的反传解释网络更新为何不等于直接改一个格子。随后问最大后续分数是否可信，用 Double 的选择与评估分离处理高估。最后分别处理共享状态表示、大 TD 误差和目标变化速度，对应 Dueling、Huber 与目标网络更新。第 13 章的终止边界始终沿用；它的表格收缩证明则不能直接搬到神经网络上。读完后，应能从一条经历追到参数更新，并指出还剩哪些稳定性风险。`,
      links: [
        { label: "TD 与半梯度", sectionId: "derivation", level: "必会" },
        { label: "Double 与 max 高估", sectionId: "math-double-bias", level: "推导" },
        { label: "Dueling、Huber 与更新周期", sectionId: "math-dueling-huber", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
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
      body: String.raw`学习助手已经用一次复习经历把一个格子的评分从 2 改到 3.3。如果所有学生状态都交给同一个网络预测，该怎样让这条经历更新参数？先保留开场的目标，再用链式法则把“改评分”转换为“改网络”。

$s_t,a_t$ 是实际状态与动作，$r_{t+1}$ 是观察到的奖励，$y_t$ 是要靠近的自举目标，$\alpha$ 为学习率。表格 Q-Learning 更新为：

$$Q(s_t,a_t)\leftarrow Q(s_t,a_t)+
\alpha\left[y_t-Q(s_t,a_t)\right]$$

其中非终止转移的目标为：

$$y_t=r_{t+1}+\gamma\max_{a'}Q(s_{t+1},a')$$

终止转移没有未来回报，因此 $y_t=r_{t+1}$。DQN 用在线网络参数 $\theta$ 预测当前值，用滞后的目标参数 $\theta^-$ 构造目标：

$$y_t=r_{t+1}+\gamma(1-d_t)
\max_{a'}Q_{\theta^-}(s_{t+1},a')$$

$d_t=1$ 表示真正终止。令 $\mathcal D$ 为保存已采转移的经验池；预测与固定目标之间的平方差决定这批数据上的更新，损失可写为：

$$L(\theta)=\mathbb E_{(s,a,r,s',d)\sim\mathcal D}
\left[\left(y-Q_\theta(s,a)\right)^2\right]$$

即使先冻结目标网络，其最大输出也可能偏高，因为选最大值同时选中了估计噪声。Double DQN 用在线网络选动作、目标网络评估；$a^*$ 是在线网络认为最好的下一动作：

$$a^*=\arg\max_{a'}Q_\theta(s',a'),\qquad
y=r+\gamma(1-d)Q_{\theta^-}(s',a^*)$$

Dueling DQN 则把输出分成状态价值 $V(s)$ 和动作优势 $A(s,a)$，再组合为 Q，使网络在许多动作效果接近时更容易学习共同状态价值。

先暂缓高估问题，完成当前样本的反传。**半梯度到底少了哪一项？** $\operatorname{sg}$ 表示只把目标当数值、切断其梯度。为简化系数，用单样本 $\ell=\tfrac12(Q_\theta-\operatorname{sg}(y))^2$，记 $\delta=y-Q_\theta$。则：

$$\nabla_\theta\ell=-\delta\nabla_\theta Q_\theta(s,a),\qquad
\theta\leftarrow\theta+\alpha\delta\nabla_\theta Q_\theta(s,a)$$

对于 one-hot 表格参数，$\nabla Q$ 只在当前格为 1，就还原 Q-Learning。若让同一网络构造 $y_\theta$ 且沿它反传，平方残差梯度变为 $(Q_\theta-y_\theta)(\nabla Q_\theta-\nabla y_\theta)$，不是 TD 半梯度。DQN 使用冻结 target 时，对这次监督式损失是完整梯度；称为半梯度是相对自举固定点问题而言。Double 的 argmax 选择也作为固定目标的一部分，不对动作索引求导。

例如用一个参数表示开场同一预测，$Q_\theta(s,a)=2\theta$，固定 target=4.6，$\theta=1$。$\delta=2.6$，$\partial\ell/\partial\theta=-5.2$；学习率 0.1 后 $\theta=1.52$、当前预测 3.04。不是表格式直接把 Q 加 $0.1\delta$，因为网络 Jacobian 改变了更新尺度。这里学习率也特意从表格例的 0.5 改为 0.1，不能把 3.04 与 3.3 当算法优劣比较。它只说明预测确实朝 4.6 移动；下一节检查这个目标本身会不会因取最大值而过分乐观。`,
    },
    {
      id: "math-double-bias",
      type: "derivation",
      title: "max 高估的精确反例与 Double DQN",
      body: String.raw`助手在两道同样有用的练习中选预测分数更高的一道，会不会仅仅选中了正误差？为了把这个问题与奖励好坏分开，先把两种动作的真实价值都平移到零，再只观察估计噪声。

记 $\hat Q_1,\hat Q_2$ 为两动作的带噪估值。设同一状态两个动作真实价值都为 0，各自估计误差独立取 $+1,-1$，概率各半。四种等概率估计是 $(1,1),(1,-1),(-1,1),(-1,-1)$；每个动作估计无偏，但：

$$\mathbb E[\max(\hat Q_1,\hat Q_2)]
=\tfrac14(1+1+1-1)=\tfrac12>0=\max_a Q_a$$

一般由 max 的凸性，$\mathbb E[\max_a\hat Q_a]\geq\max_a\mathbb E[\hat Q_a]$。问题是“选中正噪声再用同一个正噪声评估”，不要求环境奖励有正偏差。

Double DQN 用 online 网络选择 $a^*$，用 target 网络评估。如果评估误差相对选择独立且条件均值为 0，那么 $\mathbb E[\epsilon^-_{a^*}|a^*]=0$，这个教学模型中的高估消失。实际两个网络高度相关，故只能说缓解，不能宣称普遍无偏，也可能低估。

**数值对照。** 回到复习后的同一转移，保留奖励 1 和折扣 0.9，但故意让两套网络对下一练习排序不同：online 下一状态 $[4,3]$，target 为 $[2,5]$，$r=1,\gamma=0.9,d=0$。普通 DQN 用 target 最大值 5，$y=5.5$；Double 由 online 选第一个动作，再用 target 的 2，$y=2.8$。若真正终止，两者都为 1。不要把“双网络”直接当 Double：普通 DQN 也有 online 与 target，区别是选择和评估是否解耦。

5.5 降到 2.8 只表明选择规则改变了目标，不证明后者已经等于真实价值。同一个 replay 样本用于 Q-Learning 时目标取贪心动作；SARSA 要使用该策略实际采到的下一动作；Expected SARSA 则用 $\sum_{a'}\pi(a'|s')Q(s',a')$。行为是否探索和目标是否取 max 是两个问题。解决选择噪声后，网络仍可能因共享参数和异常残差而剧烈更新，下一节处理这些不同来源的风险。`,
    },
    {
      id: "math-dueling-huber",
      type: "derivation",
      title: "Dueling 的可辨识性、Huber 梯度与目标更新",
      body: String.raw`复习充分的学生做哪道题都可能表现较好，助手没有必要把这种共同的状态信息学很多遍。但共享表示之后，还要防止一次异常成绩造成过大更新。本节分别设计输出结构、残差损失和目标刷新速度，它们不替代上一节的 Double 目标。

固定一个学习状态，$Q_a$ 为动作 $a$ 的预测，$V$ 为共同状态分量，$A_a$ 为动作差异分量。若直接写 $Q_a=V+A_a$，任意 $c$ 都能作 $V'=V+c,A'_a=A_a-c$ 而 Q 不变。Dueling 的常用均值中心化聚合为：

$$Q_\theta(s,a)=V_\theta(s)+A_\theta(s,a)
-\frac1{m}\sum_{b=1}^m A_\theta(s,b)$$

其中 $m$ 是动作数，V 头输出标量，A 头输出 $m$ 维。对当前动作 $a$：

$$\frac{\partial Q_a}{\partial V}=1,\qquad
\frac{\partial Q_a}{\partial A_b}=\mathbf1[a=b]-\frac1m$$

有效优势均值为零，V 等于 Q 的动作算术均值。它不必等于某个行为策略的 $V^\pi$；原始 A logits 仍允许共同平移。把下一练习扩展为三个候选，教学例 $V=3,A=[2,0,-1]$，均值 $1/3$，Q 为 $[14/3,8/3,5/3]$。三项的平均仍为 3，因此共同部分不会被动作头任意重复计入。Dueling 改架构，Double 改 target，两者可组合。

网络结构确定后，回到开场预测 2、目标 4.6 的残差。**Huber 损失。** 令 $e=Q-\operatorname{sg}(y)$，阈值 $\kappa>0$：

$$\ell_\kappa(e)=
\begin{cases}\tfrac12e^2,&|e|\leq\kappa\\
\kappa(|e|-\tfrac12\kappa),&|e|>\kappa\end{cases},
\qquad
\frac{\partial\ell_\kappa}{\partial Q}
=\operatorname{clip}(e,-\kappa,\kappa)$$

小误差是平方，大误差是线性，抑制离群 TD error。$e=-2.6,\kappa=1$ 时 loss=2.1、对 Q 梯度为 -1；半平方损失则为 3.38、梯度 -2.6。Huber 限制的是 loss 对预测的导数，乘上很大的网络 Jacobian 后，参数梯度仍可很大，因此不等于全局梯度范数裁剪。

**数据与时间尺度。** 限制一次残差还不够，下一批目标也不能无限快速移动。replay 的均匀采样近似优化 buffer 的经验分布，不自动还原当前策略状态分布；优先采样若要还原均匀经验目标，须按采样概率加 IS 权重。target 可每 $C$ 步硬复制 $\theta^-\leftarrow\theta$，或软更新 $\theta^-\leftarrow(1-\tau)\theta^-+\tau\theta$，其中 $C$ 是复制间隔，$\tau$ 是每次吸收在线参数的比例。$\tau=1$ 每步追随 online；很小则稳定但陈旧。复制和软更新均不属于本次反向传播图。

因此 Huber 把这条经历对预测的梯度从 -2.6 限到 -1，目标网络控制目标多久变化一次，Dueling 共享不同练习的状态信息；三者都没有让未知环境自动变成已知。若动作扩展到语言模型的整个词表，逐一可靠估计 Q 更困难，第 15 章将利用模型已有的动作概率直接学习。`,
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
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：目标、偏差与梯度",
      body: "每题先标明可训练量与冻结量，再给出计算。",
      questions: [
        {
          q: "Qθ=2θ，θ=1，固定 target=4.6，用半平方损失。推导梯度并给出 α=0.1 的一步结果。",
          a: String.raw`$\ell=\tfrac12(2\theta-4.6)^2$，$\partial_\theta\ell=(2\theta-4.6)2=-5.2$，更新为 $\theta=1.52$，预测 3.04。若 target 依赖同一参数，必须说明是否停止梯度，否则会多出 $-\nabla y$ 项。**得分点：**误差符号、链式因子 2、target detach；不混用表格更新。`,
        },
        {
          q: "两个真实 Q 都为零，独立噪声 ±1。算 max 的期望，并说明 Double 在什么条件下去掉这个偏差。",
          a: String.raw`枚举四种情况，最大值为 $[1,1,1,-1]$，均值 0.5。独立的第二估计器若对被选动作仍条件无偏，则 $\mathbb E[\epsilon^-_{a^*}|a^*]=0$。**得分点：**单动作无偏不等于最大值无偏；分离选择与评估；实际 target 与 online 相关，不能保证无偏。`,
        },
        {
          q: "V=3、A=[2,0,-1] 时计算 Dueling Q；e=-2.6、κ=1 时计算 Huber loss 和梯度。它们各解决什么？",
          a: String.raw`减去 A 均值 $1/3$，得 $Q=[14/3,8/3,5/3]$。Huber 大误差分支给 $\ell=2.6-0.5=2.1$，$\partial_Q\ell=-1$。Dueling 学共享状态分量，Huber 降低离群残差影响，都不直接修正 max 选择偏差。**得分点：**中心化；区分损失值与导数；指出不能替代 Double 或梯度范数裁剪。`,
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
