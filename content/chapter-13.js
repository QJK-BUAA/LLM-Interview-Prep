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
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从回报定义到收敛与控制",
      body: String.raw`先修第 02、03 章的线性方程、条件期望和无穷级数。本章按“轨迹回报 → 条件价值 → Bellman 算子 → 固定点 → 策略改进”学习。面试必须说清：评估的是哪个策略、奖励在什么时候发生、终止边界是什么。先手算两状态矩阵，再证明收缩，最后比较 policy iteration 与 value iteration；不能用“迭代直到收敛”代替收敛条件。`,
      links: [
        { label: "回报与条件期望", sectionId: "derivation", level: "必会" },
        { label: "Bellman 矩阵解", sectionId: "math-bellman-matrix", level: "推导" },
        { label: "收缩与策略改进", sectionId: "math-contraction-control", level: "推导" },
        { label: "终止与截断边界", sectionId: "math-terminal-discount", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
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

贝尔曼“最优方程”带 max，贝尔曼“期望方程”按策略概率平均。把二者混用，会把策略评估误写成控制问题。

为什么可以把下一步回报换成 $V^\pi(s')$？先在给定 $(s,a,s',r)$ 下取未来条件期望，再对一步转移求平均。马尔可夫状态与后续固定策略保证未来只需条件在 $s'$ 上；这一步是全期望公式，不是假设奖励与下一状态独立。

同样得到动作价值递推和优势的中心化性质：

$$Q^\pi(s,a)=\sum_{s',r}p(s',r|s,a)
\left[r+\gamma\sum_{a'}\pi(a'|s')Q^\pi(s',a')\right]$$

$$V^\pi(s)=\sum_a\pi(a|s)Q^\pi(s,a),\qquad
\sum_a\pi(a|s)A^\pi(s,a)=0$$

若两个动作 $Q=[6,2]$、策略概率 $[1/4,3/4]$，则 $V=3$、$A=[3,-1]$，加权优势为 $3/4-3/4=0$。这里平均的是策略动作分布，不是动作的均匀平均。`,
    },
    {
      id: "math-bellman-matrix",
      type: "derivation",
      title: "Bellman 矩阵解：逆矩阵为什么存在",
      body: String.raw`考虑有限 $n$ 个状态的固定策略。列向量 $v_\pi,r_\pi\in\mathbb R^n$，矩阵 $P_\pi\in\mathbb R^{n\times n}$ 的第 $i,j$ 项为从状态 $i$ 转移到 $j$ 的概率：

$$P_\pi(i,j)=\sum_a\pi(a|i)P(j|i,a),\qquad
r_\pi(i)=\sum_a\pi(a|i)\mathbb E[r_{t+1}|i,a]$$

逐状态 Bellman 方程堆叠后是：

$$v_\pi=r_\pi+\gamma P_\pi v_\pi,\quad
(I-\gamma P_\pi)v_\pi=r_\pi,\quad
v_\pi=(I-\gamma P_\pi)^{-1}r_\pi$$

不能只写最后一行。若 $0\leq\gamma<1$，随机矩阵满足 $\|P_\pi\|_\infty=1$，故 $\rho(\gamma P_\pi)\leq\gamma<1$。Neumann 级数给出：

$$ (I-\gamma P_\pi)^{-1}
=\sum_{k=0}^{\infty}\gamma^kP_\pi^k,\qquad
v_\pi=\sum_{k=0}^{\infty}\gamma^kP_\pi^kr_\pi$$

第 $k$ 项恰好是走 $k$ 步后的预期奖励，这把线性代数解与回报定义接起来。实际求解通常解线性方程而不显式构造逆矩阵。

**教学手算。** 两状态交替，$P_\pi=\begin{bmatrix}0&1\\1&0\end{bmatrix}$，$r_\pi=[1,2]^\top$，$\gamma=1/2$：

$$v_1=1+\tfrac12v_2,\quad v_2=2+\tfrac12v_1
\ \Longrightarrow\ v_1=\tfrac{8}{3},\quad v_2=\tfrac{10}{3}$$

从零做同步备份依次为 $[1,2]$、$[2,2.5]$、$[2.25,3]$，逼近矩阵解。若奖励有界 $|r|\leq R_{\max}$，还有 $\|v\|_\infty\leq R_{\max}/(1-\gamma)$。追问：$\gamma$ 接近 1 时有效时间尺度增长，价值尺度和求解敏感性也会变大，不能只说“更重视未来”。`,
    },
    {
      id: "math-contraction-control",
      type: "derivation",
      title: "收缩证明、误差界与两种动态规划",
      body: String.raw`定义 $T^\pi v=r_\pi+\gamma P_\pi v$。对任意两个价值向量 $u,v$：

$$\|T^\pi u-T^\pi v\|_\infty
=\gamma\|P_\pi(u-v)\|_\infty
\leq\gamma\|u-v\|_\infty$$

因为每行是概率加权平均，其绝对值不超过最大分量。$\gamma<1$ 时它是收缩，固定点唯一，且 $\|v_k-v_\pi\|_\infty\leq\gamma^k\|v_0-v_\pi\|_\infty$。还可用可观测的 Bellman residual 认证误差：

$$\|v-v_\pi\|_\infty
\leq\|v-T^\pi v\|_\infty+\gamma\|v-v_\pi\|_\infty$$
$$\Longrightarrow\quad
(1-\gamma)\|v-v_\pi\|_\infty\leq\|v-T^\pi v\|_\infty$$

移项再除以正数 $1-\gamma$，得到 $\|v-v_\pi\|_\infty\leq\|v-T^\pi v\|_\infty/(1-\gamma)$，不是只看相邻值变化小就无条件宣告准确。

最优算子 $T^*v(s)=\max_a\{r(s,a)+\gamma P_av\}$ 同样收缩：先用 $|\max_a f_a-\max_a g_a|\leq\max_a|f_a-g_a|$，再用概率平均界。

**Policy iteration。** 精确评估 $\pi_k$ 得到 $v_k$，令 $\pi_{k+1}$ 对 $r+\gamma Pv_k$ 贪心。于是 $T^{\pi_{k+1}}v_k=T^*v_k\geq v_k$；算子单调，反复应用并取极限，得到 $v_{\pi_{k+1}}\geq v_k$。有限状态动作、精确评估、平局时保留原动作可避免无意义循环，最终到达最优策略。

**Value iteration。** 不等评估完成，直接 $v_{k+1}=T^*v_k$，由收缩趋于 $v^*$。教学例中只在状态 1 加“奖励 2 后终止”的动作：原交替策略的继续价值 $8/3>2$，贪心仍选择继续；如果终止奖励改为 3，则改选终止，新的 $v=[3,3.5]$。

以上证明用于已知模型的精确 tabular backup；采样误差、非线性函数近似和 off-policy 更新并不自动继承它。`,
    },
    {
      id: "math-terminal-discount",
      type: "derivation",
      title: "终止、时间截断与 gamma 等于 1 的边界",
      body: String.raw`真正终止后未来奖励为零，令终止状态价值为 0。有限时域任务要把剩余时间加入状态，或写时间相关价值：

$$V_t^\pi(s)=\mathbb E[r_{t+1}+\gamma V_{t+1}^\pi(s')|s],
\qquad V_T^\pi=0$$

这里即使 $\gamma=1$ 也能从 $T$ 倒推，因为只累加有限项。无限持续任务则不同：单状态自环每步奖励 1，$\gamma=1$ 时 $v=1+v$ 没有有限解；每步奖励 0 时 $v=v$ 又不唯一。

对会吸收的 episodic 链，只取非终止状态的转移子矩阵 $Q$。若终止机制保证 $\rho(Q)<1$，则在 $\gamma=1$ 时仍有 $v=(I-Q)^{-1}r$；有限状态下合适的吸收条件可保证有限期望长度。不能仅因接口返回 done 就认定满足这些条件。

**两种 mask。** 令 $d_t$ 表示真正终止，$c_t$ 表示当前采样片段结束。TD target 用 $r_{t+1}+\gamma(1-d_t)V(s_{t+1})$；优势递推跨片段时还要切断连接，不能串到另一 episode。纯采集时间上限 $c_t=1,d_t=0$ 时保留末状态 bootstrap；如果时间上限就是任务定义的结束，则应建模为真正终止。

教学例：$r=2,\gamma=0.9,V(s')=5$，真正终止 target=2，非终止采集截断 target=6.5。错误清零少算 4.5。还要使用 reset 前的 final observation，而不是下一局的初始观测。`,
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
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：Bellman 解、收缩与边界",
      body: "先写条件和维度，再计算；答案中的得分点用于闭卷自评。",
      questions: [
        {
          q: "两状态交替，奖励 [1,2]、折扣 0.5。写出矩阵方程并求价值。",
          a: String.raw`$P=\begin{bmatrix}0&1\\1&0\end{bmatrix}$，$(I-0.5P)v=[1,2]^\top$。消元得 $v_1=1+0.5(2+0.5v_1)$，即 $0.75v_1=2$，故 $v=[8/3,10/3]^\top$。**得分点：**行表示起始状态；即时奖励不额外折扣；解释 $\rho(0.5P)<1$ 保证唯一解。`,
        },
        {
          q: "证明固定策略 Bellman 算子收缩。γ=0.9、residual 的无穷范数为 0.02 时，价值误差上界是多少？",
          a: String.raw`概率行的加权平均满足 $\|P(u-v)\|_\infty\leq\|u-v\|_\infty$，故收缩系数为 $\gamma$。对固定点用三角不等式得 $(1-\gamma)\|v-v_\pi\|_\infty\leq\|v-T^\pi v\|_\infty$，误差上界 $0.02/0.1=0.2$。**得分点：**指出固定点与 residual；必须除以 $1-\gamma$；不把神经 TD 的收敛当此定理结论。`,
        },
        {
          q: "为什么 γ=1 不一定有唯一有限价值？给反例并说明截断该如何 bootstrap。",
          a: String.raw`无限自环每步奖 1，回报发散且 $v=1+v$ 无解；每步奖 0 时方程有无穷多解。有限时域给 $V_T=0$ 可倒推，吸收链在 $\rho(Q)<1$ 时也可解。采集截断不是终止：$r=2,\gamma=0.9,V'=5$ 的 target 为 6.5，而真正终止是 2。**得分点：**反例；区分时域条件；区分 terminated、truncated 和 reset 前观测。`,
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
