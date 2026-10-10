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
      body: String.raw`今晚只有两小时，学习助手该建议先复习基础，还是直接做难题？直接做难题可能马上得高分，复习却可能让后一小时的成功率更高。第 12 章解决了怎样用较少参数微调模型，但还没有回答：如果没有每一步的标准建议，只有执行后的成绩，该怎样判断一整套建议好不好？本章先用这个学习计划把“眼前得分”和“未来机会”分开。

监督学习通常给定输入与标签，模型预测后不会改变下一条训练数据。强化学习（Reinforcement Learning, RL）则让智能体在状态中选择动作，环境返回奖励和下一状态；下一状态又决定后续能看到什么。RL 本来就研究连续决策，并不是到 Agent 场景才从单步问题变成多步问题。

先把学习助手的五件事对应起来：状态是“还剩多少时间、目前掌握什么”；动作是选复习还是做难题；转移是行动后进入什么状态；奖励是这次得到的分数；折扣决定未来分数在今天的账上按多大比例计入。用这些对象描述决策问题，叫马尔可夫决策过程（Markov Decision Process，MDP）。

马尔可夫性质要求：当前状态包含了预测下一步所需的历史信息。如果只记“晚上八点”，漏掉是否复习过，即使选同一道题，成功率也可能不同。因此状态需要包含这些相关信息；有了具体对象后，再在推导里使用状态集合、动作集合和转移概率记号。

策略 $\pi(a|s)$ 给出在状态 $s$ 选择动作 $a$ 的概率。按策略与环境交互，会形成轨迹 $\tau=(s_0,a_0,r_1,s_1,\ldots)$。RL 的目标不是逐步奖励都最大，而是让整条轨迹的累计回报高。

在 LLM 中，状态可视为 prompt 与已生成前缀，动作是下一个 token，转移通常是把 token 追加到前缀，奖励可能在最终答案才出现。动作空间有整个词表，轨迹很长，奖励稀疏。先算清学习计划的累计成绩，再把同一套回报与价值语言用于生成回答，后续的优势估计和策略更新就有了对象。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：眼前得分与未来机会",
      body: String.raw`学习助手要在“先复习基础”和“直接挑战难题”之间选择。前者的即时收益可能较小，却会改变下一时刻的状态，使后续成功更容易；后者可能马上得到高分，也可能让剩余机会减少。

**奖励**是某一步之后收到的反馈；**回报**是从当前时刻开始的未来奖励累计；**价值**则是在给定策略下，对这个回报的期望。三者不能混为同一个分数。

折扣因子控制较晚奖励在当前决策中的权重。它可以表达时间偏好、风险或无限时域下的数学需要，但不能被简单解释成“未来不重要”。

| 量 | 固定了什么 |
|---|---|
| 状态价值 | 以后继续按策略行动 |
| 动作价值 | 当前先固定某个动作，再按策略继续 |
| 优势 | 该动作相对状态平均水平好多少 |

一条实际轨迹只提供一次回报样本，不能直接等同于真实价值。需要多次采样、环境模型或自举估计，才能逐步逼近价值。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从回报定义到收敛与控制",
      body: String.raw`现在已经能比较两条计划，但状态变多后不能逐条列出所有未来。先把“今天得分加明天价值”写成 Bellman 递推，再把多个状态的方程排成矩阵。矩阵解告诉我们答案是什么，收缩证明解释为什么反复备份能接近它，并据此改进动作选择。最后回到“两小时结束”的含义，区分任务真正结束和仅暂停采样，否则下一章的 TD 目标会少算未来。线性方程不熟时回看第 02 章，条件期望与几何级数回看第 03 章；每次回补都服务于眼前这一步计算。`,
      links: [
        { label: "回报与条件期望", sectionId: "derivation", level: "必会" },
        { label: "Bellman 矩阵解", sectionId: "math-bellman-matrix", level: "推导" },
        { label: "收缩与策略改进", sectionId: "math-contraction-control", level: "推导" },
        { label: "终止与截断边界", sectionId: "math-terminal-discount", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "Agent 与 Environment 的闭环",
      body: String.raw`每个时间步，环境把状态 $s_t$ 给智能体；智能体按策略采样动作 $a_t$；环境根据转移分布产生奖励 $r_{t+1}$ 与下一状态 $s_{t+1}$。同一策略在随机环境中可产生不同轨迹，同一环境在不同策略下也会产生不同数据分布。

价值函数位于这个闭环的“未来压缩”位置。$V^\pi(s_t)$ 不需要列出所有未来轨迹，而是概括从当前状态继续执行策略的期望回报；$Q^\pi(s_t,a_t)$ 在此基础上固定第一步动作；$A^\pi(s_t,a_t)$ 比较该动作相对状态平均水平好多少。

训练数据来自哪个策略非常关键。严格 on-policy 要求目标策略与生成数据的行为策略相同；off-policy 则允许二者不同，例如从历史 replay buffer 学习另一目标策略。PPO 通常归入 on-policy 算法家族，但固定 old 数据的多轮更新使用近端 surrogate，不表示每个 minibatch 都严格同分布。二者差别是数据分布关系，不等同于在线或离线存储方式。`,
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
      body: String.raw`学习助手已经算出基础路线的总分，但还需要在任意中间状态重新评估计划。我们希望只看下一步奖励和下一状态的价值，就得到当前价值，而不把所有后续路线重新展开。

固定后续策略 $\pi$，令 $t$ 为当前决策时刻，$r_{t+k+1}$ 为再走 $k+1$ 步收到的奖励，$\gamma$ 为折扣，$G_t$ 为从此刻起的随机回报。有限学习计划在终止后补零，因而也可写成：

$$G_t=\sum_{k=0}^{\infty}\gamma^k r_{t+k+1}$$

第一项是眼前奖励；剩余每项都比下一时刻的回报多折扣一次，提出这个公共因子就得到：

$$G_t=r_{t+1}+\gamma\sum_{k=0}^{\infty}\gamma^k r_{t+k+2}
=r_{t+1}+\gamma G_{t+1}$$

一次路线仍可能受难题成功与否影响，所以对回报取条件期望。$s$ 表示当前学习状态，$a$ 表示当前建议；只固定状态得到状态价值，同时固定第一步动作得到动作价值：

$$V^\pi(s)=\mathbb E_\pi[G_t\mid s_t=s]$$

$$Q^\pi(s,a)=\mathbb E_\pi[G_t\mid s_t=s,a_t=a]$$

要判断某条建议是否优于策略通常给出的建议，再用动作价值减去状态平均值，定义优势函数：

$$A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s)$$

记 $p(s',r|s,a)$ 为执行动作后下一状态 $s'$ 与奖励 $r$ 的联合概率。先对策略可能选的动作平均，再对环境结果平均，对回报递推取条件期望，得到贝尔曼期望方程：

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

为检查“相对平均”而非重算开场的确定路线，另设助手对复习、直接做题的两个动作估值：若两个动作 $Q=[6,2]$、策略概率 $[1/4,3/4]$，则 $V=3$、$A=[3,-1]$，加权优势为 $3/4-3/4=0$。这里平均的是策略动作分布，不是动作的均匀平均。第一种建议虽然只占四分之一，却比当前平均好 3；这个中心化信号会在第 15 章用于更新策略。眼下先解决更直接的问题：多个状态互相依赖时，怎样同时求出它们的价值？`,
    },
    {
      id: "math-bellman-matrix",
      type: "derivation",
      title: "Bellman 矩阵解：逆矩阵为什么存在",
      body: String.raw`如果助手安排每天交替复习基础和练难题，明天的价值又依赖后天，上一节的递推就形成一组联立方程。本节把两小时计划扩展为持续学习计划，检查能否一次求解所有状态，并说明为什么解存在。

考虑有限 $n$ 个状态的固定策略。列向量 $v_\pi,r_\pi\in\mathbb R^n$ 分别存各状态的未来价值和一步期望奖励，矩阵 $P_\pi\in\mathbb R^{n\times n}$ 的第 $i,j$ 项为从状态 $i$ 转移到 $j$ 的概率：

$$P_\pi(i,j)=\sum_a\pi(a|i)P(j|i,a),\qquad
r_\pi(i)=\sum_a\pi(a|i)\mathbb E[r_{t+1}|i,a]$$

逐状态 Bellman 方程堆叠后是：

$$v_\pi=r_\pi+\gamma P_\pi v_\pi,\quad
(I-\gamma P_\pi)v_\pi=r_\pi,\quad
v_\pi=(I-\gamma P_\pi)^{-1}r_\pi$$

这里 $I$ 是单位矩阵；把未来项移到左边还不足以保证可逆。若 $0\leq\gamma<1$，随机矩阵满足 $\|P_\pi\|_\infty=1$，故 $\rho(\gamma P_\pi)\leq\gamma<1$，其中 $\rho$ 表示谱半径。于是每多走一步，矩阵幂的折扣贡献会衰减，Neumann 级数给出：

$$ (I-\gamma P_\pi)^{-1}
=\sum_{k=0}^{\infty}\gamma^kP_\pi^k,\qquad
v_\pi=\sum_{k=0}^{\infty}\gamma^kP_\pi^kr_\pi$$

第 $k$ 项恰好是走 $k$ 步后的预期奖励，这把线性代数解与回报定义接起来。实际求解通常解线性方程而不显式构造逆矩阵。

**教学手算。** 为突出循环依赖，这里不再使用开场的两步终止奖励：把基础日、难题日的每步奖励改成 1、2，折扣改成一半。两状态交替，$P_\pi=\begin{bmatrix}0&1\\1&0\end{bmatrix}$，$r_\pi=[1,2]^\top$，$\gamma=1/2$：

$$v_1=1+\tfrac12v_2,\quad v_2=2+\tfrac12v_1
\ \Longrightarrow\ v_1=\tfrac{8}{3},\quad v_2=\tfrac{10}{3}$$

从零做同步备份依次为 $[1,2]$、$[2,2.5]$、$[2.25,3]$，逼近矩阵解。两个价值都大于当日奖励，因为它们包含以后无限次交替学习的折扣成绩，不是某一天能拿到的分数。若奖励有界 $|r|\leq R_{\max}$，还有 $\|v\|_\infty\leq R_{\max}/(1-\gamma)$，这里 $R_{\max}$ 是单步奖励绝对值上限。$\gamma$ 接近 1 时有效时间尺度增长，价值尺度和求解敏感性也会变大，不能只说“更重视未来”。下一节用收缩解释刚才的备份为何逼近同一个解，以及何时可以停止。`,
    },
    {
      id: "math-contraction-control",
      type: "derivation",
      title: "收缩证明、误差界与两种动态规划",
      body: String.raw`持续学习计划的矩阵解已经算出，但真实状态很多时更适合反复备份。现在要判断：两个不同初始估值会不会走向不同答案，当前估值还差多远，以及评估完成后该不该改建议。

沿用上一节的固定策略、一步奖励向量和转移矩阵，定义一次备份算子 $T^\pi v=r_\pi+\gamma P_\pi v$。$u,v$ 是任意两个候选价值向量，$\|\cdot\|_\infty$ 取最大绝对分量。对任意两个价值向量 $u,v$：

$$\|T^\pi u-T^\pi v\|_\infty
=\gamma\|P_\pi(u-v)\|_\infty
\leq\gamma\|u-v\|_\infty$$

因为每行是概率加权平均，其绝对值不超过最大分量。$\gamma<1$ 时它是收缩，固定点唯一，且 $\|v_k-v_\pi\|_\infty\leq\gamma^k\|v_0-v_\pi\|_\infty$。还可用可观测的 Bellman residual 认证误差：

$$\|v-v_\pi\|_\infty
\leq\|v-T^\pi v\|_\infty+\gamma\|v-v_\pi\|_\infty$$
$$\Longrightarrow\quad
(1-\gamma)\|v-v_\pi\|_\infty\leq\|v-T^\pi v\|_\infty$$

移项再除以正数 $1-\gamma$，得到 $\|v-v_\pi\|_\infty\leq\|v-T^\pi v\|_\infty/(1-\gamma)$，不是只看相邻值变化小就无条件宣告准确。

例如折扣为 0.9、residual 为 0.02，价值误差最多为 0.2；小小的备份差不等于同样小的价值误差，因为未来会累积。接着从“评价现有计划”转向“选择更好的计划”。令 $r(s,a)$ 为一步期望奖励、$P_a$ 为固定动作后的转移行，最优算子 $T^*v(s)=\max_a\{r(s,a)+\gamma P_av\}$ 同样收缩：先用 $|\max_a f_a-\max_a g_a|\leq\max_a|f_a-g_a|$，再用概率平均界。

**Policy iteration。** 精确评估 $\pi_k$ 得到 $v_k$，令 $\pi_{k+1}$ 对 $r+\gamma Pv_k$ 贪心。于是 $T^{\pi_{k+1}}v_k=T^*v_k\geq v_k$；算子单调，反复应用并取极限，得到 $v_{\pi_{k+1}}\geq v_k$。有限状态动作、精确评估、平局时保留原动作可避免无意义循环，最终到达最优策略。

**Value iteration。** 不等评估完成，直接 $v_{k+1}=T^*v_k$，由收缩趋于 $v^*$。教学例中只在状态 1 加“奖励 2 后终止”的动作：原交替策略的继续价值 $8/3>2$，贪心仍选择继续；如果终止奖励改为 3，则改选终止，新的 $v=[3,3.5]$。

这说明终止奖励从 2 提到 3 后，助手才值得放弃持续复习路线；新的第二状态价值 3.5 仍包含返回第一状态后的收益。以上证明用于已知模型的精确 tabular backup；采样误差、非线性函数近似和 off-policy 更新并不自动继承它。这里把“终止”当作未来确实没有收益，下一节检查这个边界是否与采集程序的停止一致。`,
    },
    {
      id: "math-terminal-discount",
      type: "derivation",
      title: "终止、时间截断与 gamma 等于 1 的边界",
      body: String.raw`助手刚完成基础题，采集程序就因时间限制停止了。难题的未来成绩应该删掉吗？如果两小时本来就是任务期限，应该；如果只是日志采集暂停而学习还会继续，就不应该。本节把这两种停止写成不同边界，避免下一章的 TD 更新系统性少算回报。

令 $T$ 为任务最后时刻，$V_t^\pi$ 为还剩相应时间时按策略行动的价值。真正终止后未来奖励为零，令终止状态价值为 0。有限时域任务要把剩余时间加入状态，或写时间相关价值：

$$V_t^\pi(s)=\mathbb E[r_{t+1}+\gamma V_{t+1}^\pi(s')|s],
\qquad V_T^\pi=0$$

这里即使 $\gamma=1$ 也能从 $T$ 倒推，因为只累加有限项。无限持续任务则不同：单状态自环每步奖励 1，$\gamma=1$ 时 $v=1+v$ 没有有限解；每步奖励 0 时 $v=v$ 又不唯一。

对会吸收的 episodic 链，只取非终止状态的转移子矩阵 $Q$。若终止机制保证 $\rho(Q)<1$，则在 $\gamma=1$ 时仍有 $v=(I-Q)^{-1}r$；有限状态下合适的吸收条件可保证有限期望长度。不能仅因接口返回 done 就认定满足这些条件。

**两种 mask。** 令 $d_t$ 表示真正终止，$c_t$ 表示当前采样片段结束。TD target 用 $r_{t+1}+\gamma(1-d_t)V(s_{t+1})$；优势递推跨片段时还要切断连接，不能串到另一 episode。纯采集时间上限 $c_t=1,d_t=0$ 时保留末状态 bootstrap；如果时间上限就是任务定义的结束，则应建模为真正终止。

回到开场基础题后接难题的教学例：$r=2,\gamma=0.9,V(s')=5$，真正终止 target=2，非终止采集截断 target=6.5。错误清零少算 4.5，也就会低估“先复习再做题”的建议。还要使用 reset 前的 final observation，而不是下一局的初始观测。到这里，我们已经能在已知环境下计算价值；第 14 章保留这些边界，只把完整转移概率替换成实际采到的一步经历。`,
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

**误区三：on-policy 等于数据实时生成。** 核心是行为策略与目标策略的关系。即使数据刚采完、参数只小幅更新，只要动作分布已经改变，就不再严格同分布。

**误区四：episode 截断等于环境终止。** 真正终止状态未来价值为零；纯采集时间上限不代表任务结束，需保留末状态 bootstrap。错误清零会漏掉后续价值，偏差方向取决于该价值的正负。

**误区五：折扣越小越稳定，所以总应小。** 小 $\gamma$ 缩短信用分配范围，也可能让智能体忽略真正重要的延迟奖励。应匹配任务时间尺度。

**误区六：Advantage 是额外奖励。** 它是 $Q-V$ 的相对价值估计，用于判断动作比当前策略在该状态的平均表现好或坏，不改变环境奖励定义。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "MC、TD 与策略关系",
      body: String.raw`| 方法维度 | 选项 | 目标来源 | 典型权衡 |
|---|---|---|---|
| 回报估计 | Monte Carlo | 等 episode 结束，用完整 $G_t$ | 无 bootstrap 估计误差，采样方差可能较高 |
| 回报估计 | TD(0) | $r+\gamma V(s')$ | 可逐步更新，偏差依赖价值估计误差 |
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

若追问 MC 和 TD：MC 等完整回报；TD 用已有价值估计 bootstrap，可逐步更新，通常降低采样方差，但依赖价值误差。在策略及终止处理正确时，一步目标相对真实价值的条件偏差为 $\gamma\mathbb E[\hat V(s')-V^\pi(s')\mid s]$；若估值准确就无这项偏差，方差次序也不是普遍定理。

若追问 LLM 映射：状态是 prompt 加生成前缀，动作是 token，策略是 next-token 分布，episode 是完整回答，验证器奖励常在末尾产生，因此长程信用分配尤其困难。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：先分清奖励、回报与价值",
      body: "不做累计计算，回答每个量条件在什么信息上。",
      questions: [
        {
          q: "为什么即时奖励较低的动作，仍可能具有更高的长期价值？",
          a: "它可能把智能体带到更有利的下一状态，改善后续机会。价值考虑未来累计结果，不只看眼前反馈。",
        },
        {
          q: "优势为正时，应怎样解释该动作相对当前策略平均水平的表现？",
          a: "表示在同一状态下，这个动作的期望回报高于当前策略的平均动作；它不是动作的即时奖励。",
        },
        {
          q: "计划每次都先复习，但拿来学习的记录来自“有时直接做难题”的旧策略。行为策略与目标策略相同吗？",
          a: "不同。行为策略描述这些记录当时怎样产生，目标策略是现在要评价或改进的决策规则。这种使用不同策略数据的关系叫 off-policy，与文件是否存在线上无关。",
        },
        {
          q: "时间限制导致 episode 停止时，为什么不能总把下一状态价值设为零？",
          a: "纯采集时间截断不代表环境真正终止，未来回报仍可能存在；错误清零漏掉折扣末状态价值，偏差方向取决于该值正负，应区分 terminated 与 truncated。",
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
