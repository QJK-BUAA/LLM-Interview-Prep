const chapter = {
  id: "25",
  slug: "agentic-rl-foundations",
  part: "Agentic RL",
  title: "Agentic RL：从生成答案到环境交互",
  subtitle: "把状态、观测、历史、动作与训练掩码放进同一条轨迹",
  level: "进阶",
  duration: 145,
  prerequisites: ["15", "16", "17"],
  tags: ["Agentic RL", "MDP", "POMDP", "ReAct", "Trajectory", "Response Mask"],
  objectives: [
    "区分环境真实状态、工具观测、交互历史与策略输入",
    "把 token 生成和工具执行对应到不同的动作粒度",
    "手算多轮轨迹回报，区分终止、截断和三种 mask",
    "用奖励信号质量、训练稳定性、探索效率和信用分配定位故障",
    "读懂一条可用于训练的 agent rollout，而不把交互格式当成 RL 算法",
  ],
  summary:
    "Agentic RL 让策略在环境反馈中持续行动。强化学习本来就处理多步决策；真正的新增难点是语言动作、部分可观测状态、昂贵工具交互和不完美反馈的组合。先把一条轨迹记录正确，再讨论奖励与优化器。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从隐状态到可训练的工具轨迹",
      body: String.raw`**先修能力：**第 03 章的条件概率与 Bayes、第 13 章的回报和 Bellman、第 15 章的 score-function、第 16–17 章的策略更新。先能回答“环境知道什么、策略看到什么”，再计算损失。

**学习链：**状态与观测区分 → 预测再观测的 belief 更新 → 决策文本的序列概率 → actor/attention/终止掩码 → 按工具耗时定义 SMDP 回报。核心问题不是把对话拼长，而是确认每个概率、奖励和时间单位属于哪个对象。原有仓库例子提供完整轨迹；新增推导用独立小算例检验容易混淆的边界。

**白板验收：**能把两状态 Bayes 表算到归一化，能指出工具文本为何不贡献 actor score，能解释为什么换时间粒度后不能沿用同一个每步折扣。最后再读四挑战地图，进入第 26 章的奖励与估计器。`,
      links: [
        { label: "完整轨迹与原始回报", sectionId: "example", level: "必会" },
        { label: "POMDP 的数值 Bayes", sectionId: "math-belief", level: "推导" },
        { label: "序列概率与三种掩码", sectionId: "math-action-masks", level: "必会" },
        { label: "SMDP 与真实时间折扣", sectionId: "math-smdp", level: "进阶" },
        { label: "闭卷推导与反例", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：会查资料的助手与只交答案的考生",
      body: String.raw`想象你要在陌生仓库找一件物品。你可以先看目录、再读标签，发现位置不对时返回重查，最后报告结果。每次行动都会影响之后能看到什么，早期没有直接得分的查询，也可能是最终成功所必需的。这就是序贯决策，而不是把一次回答机械地拆成几个聊天气泡。

**强化学习天然研究多步决策与长期回报。** MDP、Bellman 方程和策略梯度从来不要求任务只有一步。[1][2] 变化在于：许多 LLM RLVR 配方把完整回答作为一次 rollout，主要在末尾检查答案；Agentic RL 则把生成、工具调用和环境返回交错起来，训练策略决定下一步查什么、做什么、何时结束。两者之间没有“单步 RL 终于升级成真正 RL”的理论断层。

先分清四个对象。**环境**是策略之外的交互系统，例如文件沙箱、数据库、浏览器或游戏。**状态**是足以决定环境下一步分布的信息，可能包括完整文件、登录状态、后台队列和剩余预算。**观测**只是本次可见返回，例如一页搜索结果、一段报错或当前截图。**历史**保存已见观测与已执行动作。当前看到一个“成功”提示，并不代表知道所有后台状态；相同截图之后的结果也可能不同。

若完整状态满足 Markov 性，给定当前状态和动作就足以预测下一状态。若策略只能看局部观测，直接把一张截图当作完整 MDP 状态常常不成立；应按 POMDP 建模，利用历史或信念状态处理不确定性。把历史全部放进上下文也不是万能方案：截断、摘要丢失、工具延迟与隐蔽副作用，都可能使实际输入缺少关键证据。

ReAct 提供了推理与行动交错的组织方式。[3] 模型可以先生成判断，再发出工具调用，读取结果后继续。但 ReAct 是交互模式，不是奖励函数或优化器；纯提示词、SFT 模型和 RL 模型都可以使用这种格式。评价“有没有 Agentic RL”，要看是否用交互轨迹的奖励更新了策略，而不能只看输出里有没有工具调用。

可以把一个 agent 系统拆成策略、环境和训练器。策略产生动作；环境执行并返回观测；训练器根据任务结果、过程检查和成本构造学习信号。验证器可以读取策略看不到的沙箱状态，前提是它只提供训练反馈，不把标准答案偷偷混进策略输入。推理时必须知道哪些信息还能获得，避免训练时会做、部署时不会做。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小完整任务：用两次查询找到蓝色箱子",
      body: String.raw`设一个只读仓库沙箱，隐藏记录是“蓝色箱子在 C3，红色箱子在 A1”。用户只问“蓝色箱子在哪里？”。策略不能直接读取隐藏字典，只能调用 list_files 和 read_record，最后用 finish 提交位置。两次查询各付出 0.1 的成本，正确提交得 1，错误提交得 0。下面是原创教学例，不是某篇论文的评测结果。

| 决策轮次 | 策略当前知道什么 | 策略动作 | 新观测或反馈 | 即时奖励 |
|---|---|---|---|---|
| 0 | 用户要找蓝色箱子 | list_files | blue.txt、red.txt | -0.1 |
| 1 | 目录中有蓝色箱子记录 | read_record("blue.txt") | 蓝色箱子，位置 C3 | -0.1 |
| 2 | 已有位置证据 | finish("C3") | 提交正确，任务终止 | 1 |

轮次按从零开始编号，动作后的奖励记为 $r_t$。取每个决策轮次的折扣 $\gamma=0.9$，从某轮向后累加的折扣回报记为 $G_t$：

$$G_2=1,\qquad G_1=-0.1+0.9\times1=0.8$$

$$G_0=-0.1+0.9\times0.8=0.62$$

若不折扣，整条轨迹总奖励是 $-0.1-0.1+1=0.8$；这与首轮的折扣回报 0.62 不是同一个量。首轮查询虽然即时奖励为负，长期回报仍为正，所以不能按“当前有成本”判定动作无用。相反，反复查相同文件也可能最后答对，却会支付额外成本。成本系数和折扣共同表达了任务偏好，不是随意的显示参数。

这条轨迹还揭示了信用分配的困难：成功到底来自选对文件、读懂字段，还是猜中了答案？给所有动作同一个终局奖励能够提供训练信号，却不能单独证明每一步的因果贡献。若想识别关键动作，需要额外过程检查、不同后续分支或条件价值估计，而不只是把 reward 复制三遍。

记录时，用户问题和工具返回参与上下文，但不属于策略采样的输出。三个 assistant 决策片段的 token 接受 actor loss；两个工具返回的 token 不接受 actor loss。最后一次 finish 导致真实终止，后续价值为零。若系统只允许执行两轮，轨迹会在读完位置后因预算截断，这不等于“位置答错”，也不等于已经真实结束。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "两层闭环：交互循环与训练更新",
      body: String.raw`图中的“观测写入历史”返回策略输入，形成一次任务内部的交互循环；“奖励与终止检查”既可以决定继续，也可以把完整轨迹交给训练器。训练器更新参数后，下一批 rollout 再使用新策略。

工具执行不是从模型词表中采样下一 token。模型先生成一段可解析的调用文本，运行时验证工具名、参数与权限，再执行外部操作。外部结果可能很长，但它们只作为新证据进入上下文。把工具返回文本记成“策略生成内容”，会把损失算在模型没有选择的 token 上。

奖励与观测也可以来自不同通道：文件内容是观测，单测通过数是奖励依据，超时状态是执行元数据。保存这些原始字段能支持后续重算奖励；只保留一个总分会失去排查解析错误、环境失败和奖励投机的依据。异步训练还要保留采样策略版本，第 28 章再展开系统实现。`,
      diagram: {
        kind: "flow",
        nodes: [
          "任务与初始观测",
          "历史 / 策略输入",
          "生成决策 token",
          "解析并执行工具",
          "观测写入历史",
          "奖励与终止检查",
          "轨迹、mask、策略版本",
          "训练器更新策略",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 1],
          [5, 6],
          [6, 7],
          [7, 2],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "数学建模：从 POMDP 到 response-only 目标",
      body: String.raw`**一、状态不等于观测。** 用 $\mathcal S,\mathcal A,\mathcal O$ 分别表示状态、环境动作、观测空间；$P(s'|s,a)$ 是状态转移概率，$Z(o|s',a)$ 是动作后观测概率，$r(s,a,s')$ 是奖励函数。$s_t$ 可以是完整仓库，$o_t$ 只是当前返回。任务文本为 $x$，策略实际接收的历史为：

$$h_t=(x,o_0,u_0,o_1,\ldots,u_{t-1},o_t)$$

其中 $u_t$ 是第 $t$ 轮策略生成的决策文本，$a_t=D(u_t)$ 是运行时解析器 $D$ 得到的环境动作。区分二者很重要：相同工具调用可能有不同文字表达，其环境效果相同，文本生成概率却不同。若模型产生了推理文本，它也属于 $u_t$；若推理或示范由外部教师插入，就不能当作当前策略采样。

理想的信念状态是 $b_t(s)=\Pr(s_t=s|h_t)$。在有限状态、已知模型的 POMDP 中，执行 $a_t$ 并收到 $o_{t+1}$ 后，可以作 Bayes 更新：

$$b_{t+1}(s')=
\frac{Z(o_{t+1}|s',a_t)\sum_sP(s'|s,a_t)b_t(s)}
{\sum_{\tilde s}Z(o_{t+1}|\tilde s,a_t)\sum_sP(\tilde s|s,a_t)b_t(s)}$$

分母要求该观测概率非零，$\tilde s$ 是归一化时遍历的候选下一状态。实际 LLM 通常不显式维护这张概率表，而是从上下文形成隐式表征。[1] 这是一种近似，不代表当前自然语言摘要已经是充分统计量。若工具耗时和预算影响未来，还要把它们纳入状态或历史。

**二、token 与工具是两种时间粒度。** 设本轮生成 $L_t$ 个 token，$u_{t,k}$ 为第 $k$ 个，$u_{t,<k}$ 为之前的生成前缀，则自回归策略满足：

$$\log\pi_\theta(u_t|h_t)=
\sum_{k=1}^{L_t}\log\pi_\theta(u_{t,k}|h_t,u_{t,<k})$$

这里是整段决策文本的概率，不是把所有同义文本相加后的工具语义概率。环境通常在调用闭合后执行一次。把每 token 当微动作和把整轮当宏动作都可建模，但必须声明奖励、折扣和长度归一化落在哪一层。相同的每步折扣若从工具轮次改到每个 token，会改变长文本的有效折扣；若要按真实耗时折扣，还需记录每步持续时间。

**三、回报与策略目标。** 设一条 episode 有 $H$ 轮，$r_t=r(s_t,a_t,s_{t+1})$，$0\leq\gamma\leq1$。任务分布与环境固定时：

$$J(\theta)=\mathbb E_{\tau\sim\pi_\theta}
\left[\sum_{t=0}^{H-1}\gamma^t r_t\right],
\qquad
G_t=\sum_{j=t}^{H-1}\gamma^{j-t}r_j$$

$\tau$ 表示完整交互轨迹。标准 score-function 推导给出一种不带 baseline 的估计形式：

$$\nabla_\theta J=
\mathbb E_\tau\left[
\sum_{t=0}^{H-1}\gamma^tG_t
\sum_{k=1}^{L_t}\nabla_\theta
\log\pi_\theta(u_{t,k}|h_t,u_{t,<k})
\right]$$

该式假设轨迹确由目标策略采样，环境不直接依赖 $\theta$，并满足求导与期望交换条件。[2] 工具观测不贡献 actor 的 log probability，但会改变后续条件分布。把折扣完全取消、修改 token 聚合、使用旧策略数据或做 clipping，都是需要另行说明的估计器选择。

**四、三个 mask 与一个截断标志。** $d_t=1$ 表示动作后真实终止，回报递推为 $G_t=r_t+\gamma(1-d_t)G_{t+1}$。轨迹因采样预算截断时，$d_t$ 不应自动设为 1；对仍然继续的任务可从下一历史的 $V(h_{t+1})$ bootstrap，其中 $V$ 是期望后续回报估计。若没有可信的价值估计，应补全轨迹或采用明确的截断规则，而不是假称已得到完整 return。

另设 $m_j$ 是展平序列第 $j$ 个 token 的 actor loss mask，仅受训策略生成的有效 token 为 1。一个用于说明 mask 的、按有效 token 平均的 surrogate 是：

$$\mathcal L_{\mathrm{actor}}=
-\frac{\sum_jm_j\,\operatorname{sg}(\hat A_j)
\log\pi_\theta(z_j|c_j)}{\sum_jm_j}$$

$z_j$ 是该 token，$c_j$ 是其可见因果上下文，$\hat A_j$ 是分配给它的优势，$\operatorname{sg}$ 表示停止梯度，分母必须非零。它说明损失算在哪里，并不声称任意这种归一化都等价于上面的 $J$。工具、用户、padding 的 $m_j$ 为 0；工具文本仍可作为后续 token 的上下文。attention mask 控制可见性和 padding，不能直接复制 actor mask。截断标志则记录采样为何停止，与这两种 token mask 不是同一种东西。`,
    },
    {
      id: "math-belief",
      type: "derivation",
      title: "POMDP 手算：先预测下一状态，再用观测校正",
      body: String.raw`**问题与假设。** 以下是有限 POMDP 的教学抽象，不是某个 Agent 模型显式维护的概率表。隐藏状态只有“可用” $A$ 与“故障” $B$。动作前 belief 为行向量 $b=(0.6,0.4)$。执行检查动作后，状态按转移矩阵变化；收到观测“绿灯” $+$ 的似然如下：

$$P=\begin{pmatrix}0.8&0.2\\0.1&0.9\end{pmatrix},
\qquad Z(+|A)=0.9,\quad Z(+|B)=0.2$$

矩阵行是旧状态，列是新状态，每行和为 1；传感器读取的是**转移后的状态**。先全概率预测，再逐状态乘似然：

$$\bar b(A)=0.6(0.8)+0.4(0.1)=0.52,\quad
\bar b(B)=0.48$$

$$v_A=0.52(0.9)=0.468,\quad v_B=0.48(0.2)=0.096,
\quad \Pr(+|h,a)=v_A+v_B=0.564$$

$$b'(A)=\frac{0.468}{0.564}=\frac{39}{47}\approx0.829787,
\qquad b'(B)=\frac8{47}\approx0.170213$$

若直接用原先验 $0.6$ 乘传感器似然，会得到另一个问题的答案，因为遗漏了动作引起的状态变化。收到“非绿灯”时，用互补似然 $(0.1,0.8)$，得到 $b'(A)=0.052/0.436=13/109\approx0.119266$。同一动作因观测不同产生不同 posterior。

**为什么 belief 可以接到 Bellman？** 在模型已知、历史完整的条件下，belief 使历史对未来的影响浓缩成状态分布。令 $R(b,a)=\sum_{s,s'}b(s)P(s'|s,a)r(s,a,s')$，更新函数为 $\mathcal B(b,a,o)$，则有限 horizon 的递推为：

$$V_n(b)=\max_a\left\{R(b,a)+\gamma\sum_o
\Pr(o|b,a)V_{n-1}(\mathcal B(b,a,o))\right\},\qquad V_0=0$$

这是 belief 空间上的规划，不代表 LLM 的摘要具备这种充分性。若两个候选状态对观测似然都为零，分母为零，posterior 未定义；应检查模型、观测编码或异常路径，不能默默加一个极小量并声称完成了准确 Bayes。若似然相同且非零，观测不提供区分信息，posterior 就等于预测分布。

**追问链：**为何先做转移？→ 观测在动作前还是动作后？→ 隐藏预算是否进状态？→ 摘要丢失信息后 belief 是否仍准确？每一问都改变建模条件，而不只是改公式符号。`,
    },
    {
      id: "math-action-masks",
      type: "derivation",
      title: "动作概率与 mask：三枚生成 token 的完整损失",
      body: String.raw`**从轨迹分解开始。** 固定任务分布和不依赖模型参数的环境，轨迹概率由策略文本概率与环境转移、观测概率相乘。对参数求 log 梯度时，环境因子的直接导数为零：

$$p_\theta(\tau)=p(x,s_0,o_0)\prod_t
\pi_\theta(u_t|h_t)P(s_{t+1}|s_t,D(u_t))Z(o_{t+1}|s_{t+1},D(u_t))$$

$$\nabla_\theta\log p_\theta(\tau)
=\sum_t\sum_{k=1}^{L_t}\nabla_\theta
\log\pi_\theta(u_{t,k}|h_t,u_{t,<k})$$

工具反馈仍影响后续条件概率，所以“没有工具 token 的直接 actor score”不等于环境对学习无影响。若共享模型同时学习环境模型，上式固定环境的假设要重新声明。

**手算 token loss。** 展平来源为 [user, assistant, assistant, tool, assistant]，actor mask 为 $m=[0,1,1,0,1]$。三个生成目标 token 在各自前缀下的概率为 $[0.5,0.25,0.8]$，优势都固定为 1。条件概率连乘得到策略因子 $0.1$；有效 token 平均的负 log-prob 为：

$$\mathcal L=-\frac{\log0.5+\log0.25+\log0.8}{3}
=\frac{\log10}{3}\approx0.767528$$

为单独检验梯度，假设三个位置是互不共享参数的二分类 logits $z_k$，实际目标都是类别 1，$p_k=\sigma(z_k)$。由 $\partial\log p_k/\partial z_k=1-p_k$：

$$\frac{\partial\mathcal L}{\partial(z_1,z_2,z_3)}
=-\frac13(1-p_1,1-p_2,1-p_3)
=\left(-\frac16,-\frac14,-\frac1{15}\right)$$

真实网络共享参数，需再乘 logits 的 Jacobian；工具位置没有直接目标损失，但工具 embedding 作为后续上下文仍可能接收间接梯度。把工具的假想概率 0.01 也乘进去会变成 0.001，这既错记行为概率，又改变梯度来源；把分母改成全部五个 token 则人为缩小更新。

**三种掩码不能合并。** actor mask 标记由受训策略生成的目标；causal attention mask 允许后续读取有效工具结果且禁止未来信息；terminated 标志按环境动作关闭后续价值。padding 与 worker truncation 另外记录。对整轮动作求和、每 token 平均、每 episode 平均，是不同的聚合选择；不同长度轨迹一般不会得到相同权重。

**文本概率不等于语义工具概率。** 若两个互斥的完整调用串（含结束标记）都解析成动作 $a$，概率分别为 0.1、0.2，则 $\Pr(a|h)=0.3$，其 score 是这两种序列 score 按 $1/3,2/3$ 加权。只采到第一串时不能把其 log-prob 分母换成 0.3，除非明确改成对语义动作边缘化的估计器。

**追问链：**谁生成了 token？→ 对应哪个预测位置？→ 条件前缀是否一致？→ 按什么单位归一化？这四项先对齐，ratio 才有含义。`,
    },
    {
      id: "math-smdp",
      type: "derivation",
      title: "SMDP：工具用时不等长时怎样折扣与 bootstrap",
      body: String.raw`**问题。** 一次查询耗时 2 秒，另一次耗时 3 秒。把它们都算“一步”会表达按调用次数的偏好，而不是按等待时间的偏好。SMDP（半 Markov 决策过程）允许宏动作持续随机时间。下面按离散秒建模；每秒折扣为 $\gamma_{\mathrm{sec}}$，第 $t$ 个动作持续 $\Delta_t$ 秒，开始时刻为 $T_t=\sum_{j<t}\Delta_j$。

令 $c_{t,k}$ 为动作内部第 $k$ 秒的奖励，$0\le k<\Delta_t$，先把宏动作内部奖励折到起点：

$$R_t=\sum_{k=0}^{\Delta_t-1}\gamma_{\mathrm{sec}}^k c_{t,k},
\qquad G_t=R_t+\gamma_{\mathrm{sec}}^{\Delta_t}(1-d_t)G_{t+1}$$

$$Q(b,a)=\mathbb E\left[R_t+
\gamma_{\mathrm{sec}}^{\Delta_t}(1-d_t)V(b_{t+1})\mid b_t=b,a_t=a\right]$$

期望覆盖耗时、转移与观测。若用连续秒，可写折扣 $\exp(-\kappa\Delta)$，其中 $\kappa$ 单位为每秒；“每 token 的 0.9”不能直接替换“每秒的 0.9”。

**数字例子。** 取每秒折扣 0.9，两次调用在各自开始时付出 0.1，持续时间分别 2、3 秒；最后在第 5 秒即时提交得 1。以提交点价值 $G_2=1$ 向后算：

$$G_1=-0.1+0.9^3(1)=0.629,\qquad
G_0=-0.1+0.9^2(0.629)=0.40949$$

直接按时间戳展开也得到 $-0.1-0.1(0.9^2)+0.9^5=0.40949$。原仓库按每轮折扣的结果是 0.62，二者不是计算矛盾，而是目标不同。若正确奖励在动作结束时才到账，就必须按其到账时间折扣，不能当作动作起点的 $R_t=1$。

**截断边界。** worker 在第 2 秒、第一轮后暂停，下一状态仍可继续；若精确估值 $V(b_1)=0.629$，target 为 $-0.1+0.9^2V(b_1)=0.40949$。误设 terminated 会得到 -0.1。若业务合同本来规定到时立即失败，则确实应终止，且“剩余时限”必须进入状态。

**追问链：**优化少调用还是低延迟？→ 奖励何时到账？→ 随机工具延迟是否与动作相关？→ 预算是任务约束还是 worker 切片？先回答这些，才决定 discount 和 bootstrap。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：跑完 episode，再检查回报和掩码",
      body: String.raw`下面用标准库构造一个确定性沙箱。规则策略只能读取观测，不能访问环境隐藏记录；它用于验证数据链路，不是声称三条规则就学会了 RL。真实训练可替换 decide，保留相同的环境和日志接口。

~~~python
from math import isclose

class Warehouse:
    def __init__(self):
        self.records = {
            "blue.txt": {"box": "blue", "location": "C3"},
            "red.txt": {"box": "red", "location": "A1"},
        }
        self.done = False

    def reset(self):
        self.done = False
        return {"task": "Find the blue box"}

    def step(self, action):
        if self.done:
            raise RuntimeError("episode already terminated")
        if action["op"] == "list_files":
            return {"files": sorted(self.records)}, -0.1, False
        if action["op"] == "read_record":
            record = dict(self.records[action["name"]])
            return {"record": record}, -0.1, False
        if action["op"] == "finish":
            self.done = True
            correct = action["location"] == self.records["blue.txt"]["location"]
            return {"correct": correct}, float(correct), True
        raise ValueError("unknown tool")

def decide(observation):
    if "task" in observation:
        return {"op": "list_files"}
    if "files" in observation:
        assert "blue.txt" in observation["files"]
        return {"op": "read_record", "name": "blue.txt"}
    return {"op": "finish", "location": observation["record"]["location"]}

def discounted_returns(steps, gamma, bootstrap=0.0):
    running = bootstrap
    result = []
    for step in reversed(steps):
        running = step["reward"] + gamma * (not step["terminated"]) * running
        result.append(running)
    return list(reversed(result))

env = Warehouse()
obs = env.reset()
steps = []
for turn in range(3):
    action = decide(obs)
    next_obs, reward, done = env.step(action)
    steps.append({
        "turn": turn, "observation": obs, "action": action,
        "next_observation": next_obs, "reward": reward, "terminated": done,
    })
    obs = next_obs
    if done:
        break

assert steps[-1]["terminated"]
returns = discounted_returns(steps, gamma=0.9)
assert all(isclose(a, b) for a, b in zip(returns, [0.62, 0.8, 1.0]))
print("returns:", [round(value, 2) for value in returns])

# 示意序列中每个元素代表一个 token 的来源。
roles = ["user", "assistant", "tool", "assistant", "tool", "assistant"]
actor_mask = [int(role == "assistant") for role in roles]
attention_keep = [1] * len(roles)
assert actor_mask == [0, 1, 0, 1, 0, 1]
assert attention_keep[2] == 1 and actor_mask[2] == 0
print("actor mask:", actor_mask)

prefix = steps[:2]
assert isclose(discounted_returns(prefix, 0.9, bootstrap=1.0)[0], 0.62)
~~~

输出的 return 应为 [0.62, 0.8, 1.0]。最后的 prefix 演示预算截断：前两步并未真实终止，若已知下一步价值为 1，就能通过 bootstrap 恢复同一首轮回报。现实中的价值估计可能有误差，不能把这里人为给定的精确值当成通用保障。

attention_keep 只演示哪些位置不是 padding，真正模型还需因果可见性规则。真实 actor mask 应来自生成区间及 token 对齐记录，不能靠扫描文本里的角色名称推断；外部教师插入的 assistant 文本也应排除。最少保存 episode ID、turn ID、原始观测、调用参数、奖励分量、终止原因和策略版本，后续才能核对 rollout 与训练是否一致。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：看起来成功，不代表训练目标正确",
      body: String.raw`**把 RL 描述成只会单步决策。** 这会让人误以为要换一种理论才能处理多轮。需要修正的是模型和估计器的具体假设：环境是否部分可观测、奖励是否可靠、旧数据是否偏离当前策略，而不是否定 RL 的长期决策基础。

**把所有上下文 token 都纳入策略损失。** 工具返回可能恰好包含正确答案，它对下一次生成很有用，但不是当前策略选择的动作。错误的 mask 会让模型学习复述环境输出，并用大量非动作 token 改变损失分母。反过来，把工具 token 从 attention 中屏蔽，又会让策略看不到执行结果。

**把 time limit 当作任务失败或自然终止。** 需要先定义任务语义。如果任务本身规定“最多三次调用”，用尽预算可以就是任务终止；若只是训练 worker 的一次切片限制，则通常是采样截断。相同布尔值不能同时表达这两种情况。只看最终空答案无法区分模型错误、工具故障和调度器取消。

**把文字反馈当作真值。** 环境返回“测试通过”可能只是某个命令的文本，真正退出码、测试覆盖和持久化状态要另行核对。动作执行前后的沙箱状态、工具版本和验证规则都属于实验条件，不能只保存漂亮的对话记录。

**把可见推理当成已经验证的因果解释。** 一个正确结论前面的长推理可能包含无关步骤，甚至与工具结果矛盾。训练器需要任务结果和可检查的证据，不能因为模型自称“这一步很关键”就给它更高信用。

**认为多调用几次就等于更会探索。** 重复搜索、随机换关键词、无限重试都会消耗预算。探索效率应按成功任务数、环境调用数、生成 token、墙钟时间等明确分母衡量，并同时看失败类型。训练收益、推理成功率和工具费用不是同一指标。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "四大挑战：用现象与诊断指标组织问题",
      body: String.raw`以下四项沿用上游的主题划分。[4] 它们是分析框架，不是互斥类别，也不是有可复算样本支持的论文频率统计。环境与数据工程横跨四项，不能在某个算法名字下面一次性解决。

| 挑战 | 仓库例子里的表现 | 首先检查什么 | 后续学习方向 |
|---|---|---|---|
| 奖励信号质量 | 最后只给对错，或验证器读错字段 | 奖励分量、验证错误、组内方差 | 第 26 章 IGPO、CM2 |
| 训练稳定性 | 少量长轨迹或旧策略数据主导更新 | ratio、有效样本量、梯度范数、长度 | 第 26 章 ARLArena、VCPO |
| 探索效率 | 总猜位置，从不尝试读文件 | 首次成功率、不同调用覆盖、单位预算收益 | 参考引导、课程与第 27 章 |
| 信用分配 | 读对文件与无效重复都共享终局分数 | 同一历史后动作差异、过程证据 | turn/step baseline 与第 27 章 |

四项会互相影响。奖励解析错误可能把正确探索标为失败；探索始终没有成功轨迹时，相对优势缺乏区分度；过大的更新可能遗忘已经学会的查询动作；粗粒度信用又可能奖励重复调用。排查时不要看到 loss 抖动就先换优化器，应先抽查原始交互和验证器。

再比较常见任务形态。单次生成也有大量 token 微动作，但通常不在生成中读取外部反馈；多轮工具任务增加了状态转移和可见信息变化。两者都能使用终局或过程奖励，都可能部分可观测，都有长程信用问题。因此“用了工具”“多轮对话”“有过程奖励”“用了 RL”是四个不同维度。

一个有效的最小基线是：固定可复现环境、可靠终局验证、少量调用预算、完整轨迹、正确 response-only mask，再选择已有优化器。加入过程奖励、异步采样或复杂探索前，先确认每项改动能改善哪种故障，并保留终局任务成功率作为交叉检查。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：Agentic RL 到底比回答题多了什么",
      body: String.raw`**30 秒回答：**“Agentic RL 用环境交互轨迹训练策略。策略根据历史生成工具调用，环境改变状态并返回局部观测，再继续决策。强化学习原本就支持多步；新增工程难点是语言动作空间、部分可观测性、工具成本以及不完美奖励。实现上要把策略生成 token 与工具观测分开，只对前者计算 actor loss，并正确记录终止和截断。”

若追问状态和历史：状态描述环境真实情况，观测是可见部分，历史记录已见信息。历史在理论上可支持信念更新，但有限上下文或摘要未必保留充分信息。一个网页截图常不包含会话权限和后台执行进度，所以不能未经检验就视为 Markov 状态。

若追问两种动作粒度：模型内部逐 token 生成，环境一般在一个结构化调用完整后才执行。可以对整轮文本求 log probability，也可以在 token 层展开，但工具结果不是策略动作。折扣、reward 分配和长度归一化要随粒度一起说明。

若追问为什么查询负奖励还能被学会：动作价值取决于未来总回报，而不是即时分数。仓库任务首轮奖励是 -0.1，折扣回报却是 0.62；负成本可以抑制无效查询，同时保留对成功必要的查询。

若追问如何定位训练失败：先核对任务和验证器，再看生成/环境 token 对齐、终止规则、成功样本覆盖、优势分布和采样策略版本。四大挑战是定位工具，不是按照某张综述的百分比决定研发优先级。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：能否把一条交互轨迹记对",
      body: "先画出环境执行与策略生成的边界，再回答。每题都应能落到一个日志字段、数值或建模条件。",
      questions: [
        {
          q: "为什么说“RL 原本只能处理单步反馈”是错误的？",
          a: "MDP、长期回报、Bellman 方程和策略梯度原本就描述序贯决策。某些 LLM 配方主要使用末尾奖励，不代表 RL 理论只支持一步。",
        },
        {
          q: "奖励 [-0.1,-0.1,1]、每轮折扣 0.9，第二轮和首轮回报分别是多少？",
          a: "按从零计数，G1=-0.1+0.9*1=0.8，G0=-0.1+0.9*0.8=0.62；未折扣总奖励则是 0.8。",
        },
        {
          q: "工具返回 1000 个 token，策略只生成 20 个 token，这 1000 个 token 的 actor mask 和 attention 应怎样处理？",
          a: "工具 token 的 actor loss mask 为 0，但有效工具内容通常仍允许被后续 token 注意到；padding 与因果规则另行控制。不能把 actor mask 直接当成 attention mask。",
        },
        {
          q: "为什么同一张网页截图可能对应不同的下一步结果？",
          a: "截图是局部观测，可能没有显示登录权限、隐藏表单状态或后台请求；真实状态不同会导致转移不同，需要历史、额外观测或信念建模。",
        },
        {
          q: "worker 在成功提交前因切片预算停止，能否把 terminated 自动标成 true？",
          a: "不能。若任务在环境中仍可继续，这是采样截断，需要继续采样或明确的价值 bootstrap/截断方案；只有任务本身结束才把后续价值置零。",
        },
        {
          q: "一个模型能输出 ReAct 格式，是否足以证明它经过 Agentic RL？",
          a: "不足。ReAct 是交错推理与行动的交互模式；提示词和 SFT 都能产生这种格式。需要检查是否用环境轨迹奖励训练策略。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：belief、概率与时间边界",
      body: "先写符号、时间单位和随机变量，再作答。数值例均为教学设计，不是论文实验。",
      questions: [
        {
          q: "先验为 (0.6,0.4)，转移矩阵两行为 (0.8,0.2)、(0.1,0.9)，转移后绿灯似然为 (0.9,0.2)。请推导并手算绿灯 posterior；若观测似然都是零怎么办？",
          a: String.raw`先预测 $\bar b=(0.52,0.48)$，再乘似然得 $(0.468,0.096)$。归一化常数为 0.564，所以 posterior 为 $(39/47,8/47)$，和为 1。若跳过转移就混淆动作前后状态；若两个似然都为零，该模型给观测的概率为零，不能定义条件分布，应进入模型失配或异常处理。**得分点：**全概率预测、Bayes 归一化、分母非零条件各一项。追问：两个似然相同且非零时，posterior 等于预测分布，不等于动作前先验。`,
        },
        {
          q: "来源序列为 user/assistant/assistant/tool/assistant，生成 token 概率为 0.5、0.25、0.8，优势为 1。写 actor mask、token 平均 loss，并推导独立二分类 logits 的梯度。工具信息应否被 attention 屏蔽？",
          a: String.raw`mask 为 $[0,1,1,0,1]$，分母 3；loss 为 $-\log(0.5\cdot0.25\cdot0.8)/3=\log10/3\approx0.767528$。对目标类别 1，$\partial(-\log\sigma(z))/\partial z=p-1$，故三项梯度为 $(-1/6,-1/4,-1/15)$。工具位置没有直接 actor loss，但必须按因果规则供后续读取；其表示仍可能接到后续损失的梯度。**得分点：**概率链、有效分母、梯度符号、区分两种 token mask。追问：每 episode 平均与每 token 平均会怎样改变长轨迹权重？`,
        },
        {
          q: "两次工具调用分别耗时 2、3 秒，各在开始时付出 0.1，第 5 秒提交得 1，每秒折扣 0.9。求首轮回报；第一轮后 worker 截断时如何构造 target？",
          a: String.raw`时间戳为 0、2、5 秒，故 $G_0=-0.1-0.1(0.9^2)+0.9^5=0.40949$。从后向前也有 $G_1=0.629$、$G_0=-0.1+0.81G_1$。worker 截断而任务未结束时保留 bootstrap；精确下一价值 0.629 恢复同一 target。误设终止得到 -0.1；改为每工具轮次折扣得到 0.62，是另一个目标。**得分点：**SMDP 指数、奖励到账时间、截断和任务时限的区别。追问：连续耗时可用 $e^{-\kappa\Delta}$，$\kappa$ 必须有每秒单位。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "[1] Kaelbling et al.：Planning and acting in partially observable stochastic domains",
      url: "https://people.csail.mit.edu/lpk/papers/aij98-pomdp.pdf",
      evidence:
        "一手论文，1998；核对摘要与第 1、2 节。支持序贯决策、状态/观测区分与信念更新；不声称 LLM 的自然语言历史自动成为充分状态。",
    },
    {
      label: "[2] Sutton & Barto：Reinforcement Learning, Second Edition",
      url: "https://incompleteideas.net/book/the-book-2nd.html",
      evidence:
        "作者提供教材与修订 PDF；第 3 章及第 13 章为回报、策略梯度与 baseline 的基础来源。本章三步数值例和代码是原创教学演示。",
    },
    {
      label: "[3] ReAct: Synergizing Reasoning and Acting in Language Models",
      url: "https://arxiv.org/abs/2210.03629v3",
      evidence:
        "一手摘要，首次提交 2022-10-06，核验 v3。支持推理与行动交错；不把 ReAct 交互格式当作 RL 优化器或训练经历的证据。",
    },
    {
      label: "[4] Agentic RL Analysis：1.1 从推理 RL 到 Agentic RL（固定版本）",
      url: "https://github.com/xavierzhang2002/agentic-rl-analysis/blob/66ae4423b36270ef50a288fb1bb2e1b31c46c329/docs/agentic-rl/ch1/1.1-overview.md",
      evidence:
        "二手选题与四挑战框架来源。纠正其 RL 单步假设表述，不复述缺少可复算编码表的论文数量/频率；证据账本见 docs/research/agentic-core-evidence.md。",
    },
  ],
};

export default chapter;
