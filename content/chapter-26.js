const methodNotes = String.raw`**IGPO：搜索后，标准答案是否更容易被模型预测？** IGPO 的正确题名是 Information Gain-based Policy Optimization。[1] 它对标准答案做 teacher forcing，比较搜索前后上下文下的平均答案 token log probability，将变化作为轮次级信号。这样，即使最终答案都错，读到有用证据的一轮也可能与无效查询不同。论文把 IG 与 outcome 信号分别归一化，再构造用于决策 token 的优势；它没有把工具返回本身当作策略输出。

这里的 information gain 是特定答案条件下的操作性指标，不是任意环境中 Shannon 信息增益的同义词。模型更容易预测标准答案，可能因为获得了证据，也可能受到评分模型偏好、上下文格式或泄漏影响。它仍需要标准答案和结果监督，并非“完全自监督的通用 Agent 奖励”。若所有 rollout 的结果与 IG 都相同，组内相对信号仍可能消失。

**CM2：把要求拆成能检查的清单。** CM2 面向多轮、多步骤工具使用，用 checklist reward 区分是否完成关键要求。[2] 一个条目的七个字段是 Evidence、Focus、Question、Pass/Fail、Strictness、Dependency、Weight，即证据、关注点、检查问题、通过判定、进入下一用户轮次的必需条件、依赖和权重；它们不是固定的七种 agent 能力。Strictness 对应布尔字段 required_for_next_turn：当前轮最终回复后，若必需项未通过就提前终止，不继续下一条用户 query。这里一轮由用户 query 划分，可以包含多次工具动作，与第 25 章每次环境决策的步编号不同。比如“位置已提交”依赖“已获得可信的位置证据”，不能只因回答包含 C3 就重复发奖。

CM2 的关键词是“判据细，分配可以稀疏”：细致的检查标准不强制每一步都得到即时 reward。论文比较 trajectory、turn、step 层级的 advantage；依赖关系与首次满足事件用于避免重复计分，backfill 属于特定 step-level 变体，而不是所有配方都会执行。LLM judge 或模拟环境有噪声时，把其每次判断都转成密集学习信号，反而可能放大错误。

**稳定性方法处理另一层问题。** SeeUPO 关注多轮策略之间的更新依赖；ARLArena 在受控平台拆解 importance sampling、advantage、过滤与聚合；SAMPO 是该框架提出的组合方法；VCPO 关注异步旧数据的权重集中与梯度方差。[3][4][5] 它们不是 IGPO 或 CM2 的替代评分器。你可以得到更有信息的 reward，同时仍需要检查它经由什么采样分布、基线和聚合规则进入参数更新。

这些方法分别检查查询证据、任务要求和更新分布。奖励更密不等于梯度更准，loss 更平也不等于任务做得更好。

核验版本截至 2026-09-27，部分论文修订晚于上游综述所称的 2026 Q1；来源区分别写出首次提交与实际核验版本。`;

const chapter = {
  id: "26",
  slug: "agentic-reward-stability",
  part: "Agentic RL",
  title: "Agentic 奖励设计与训练稳定性",
  subtitle: "从 IGPO、CM2 的信号设计，到序列更新、ESS 与基线条件",
  level: "进阶",
  duration: 205,
  prerequisites: ["17", "20", "25"],
  tags: [
    "IGPO", "CM2", "SeeUPO", "ARLArena", "SAMPO", "VCPO",
    "EDGE-GRPO", "ReGFT", "PF-PPO", "ZeroSearch", "DARS",
    "ProRL", "GMPO", "OTB", "Dr.MAS", "ESS",
  ],
  objectives: [
    "区分终局结果、过程完成程度与更新权重集中度",
    "手算答案概率变化、清单分数和 ESS，并解释各自含义",
    "检查过程奖励是否重复计分或偏离任务要求",
    "按已定位的故障查阅奖励与稳定性方法",
    "在基线专题中检查无偏条件与同批估计偏差",
  ],
  summary:
    "Agentic 训练需要同时回答两件事：什么行为值得奖励，奖励怎样形成可用且稳定的梯度。本章把信息增益、清单评分、顺序更新、重要性权重和方差控制拆开，并用可手算例子说明监督来源、有效样本量与无偏条件。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "都没答对，是否值得给完全相同的反馈？",
      body: String.raw`仓库助手的两条失败记录，一条已经读到 C3，提交时抄成 C2；另一条没有查文件，直接猜 A1。都给终局零分时，结果奖励无法区分“查对但抄错”和“根本没查”。我们希望保留有用的查证行为，同时仍要求最终提交正确。

可以从两条路补充反馈：检查查询后是否更容易预测标准答案，或者逐项检查找文件、读证据、提交是否完成。前者是概率变化，后者是完成清单，都不能自动当成最终成功率。

奖励定义清楚后，还要看它怎样进入更新。如果四条记录中一条获得其他记录九倍的权重，参数更新可能被它支配；这属于样本权重问题，换一个更细的评分器未必能修好。

下一节分别算这三笔账，再沿对应专题检查原理。IGPO、CM2 等方法的完整定义和相关路线放在后面的对比部分，先理解分数代表什么，再记方法名称。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：三个上涨指标为何不能当成同一种成功",
      body: String.raw`给仓库助手做训练前验收，我们观察到三种变化：

1. 查询后，模型更容易预测标准答案；
2. 过程清单中，找到文件与读取证据已经完成；
3. 训练样本的重要性权重高度集中。

它们分别回答不同问题：

| 量 | 说明什么 | 不能推出什么 |
|---|---|---|
| 答案条件概率变化 | 查询可能增加了相关信息 | 查询具有真实因果价值 |
| 清单完成度 | 哪些过程要求已满足 | 任务已经最终成功 |
| ESS | 更新权重是否集中 | 奖励、版本和动作支持都正确 |

答案概率可能因泄漏或格式变化上升；清单项可能被重复刷分；高权重旧轨迹可能支配更新。任何一个指标上涨，都需要独立检查其监督来源和失败模式。

清单要记录依赖与首次满足，避免重复读取同一证据反复加分。ESS 则应使用原始未截断重要性权重诊断分布失配；先裁剪再计算会掩盖问题。具体公式和学习率缩放保留在折叠专题。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：奖励含义、梯度方向与分布校正",
      body: String.raw`刚才算出的信息变化、清单分和 ESS 分别回答三个问题，尚未构成一个完整优化器。本章接下来要追踪一条仓库轨迹的分数如何成为梯度，并逐项找出可能改变方向或方差的操作。

先沿闭环图分开评分与更新，再读原始推导：答案前后差怎样计算，后轮策略改变为何影响前轮评价，减去什么 baseline 才不改变期望。需要时回第 15 章复习 score-function，回第 17 章看组均值，回第 25 章核对历史和终止。

四个后续推导按故障展开：用仓库回报验证 shaping 是否保留偏好；用传感器和二元动作区分信息与熵；用误判率算出 judge 怎样缩小甚至反转梯度；最后穷举四条后缀，检查重要性采样何时恢复目标、裁剪又损失多少。运行 ESS 代码后再查方法地图，决定修奖励、修采样还是修更新；白板验收必须同时给出数值和失效条件。`,
      links: [
        { label: "评分与更新的两条通道", sectionId: "diagram", level: "必会" },
        { label: "原论文目标与 baseline", sectionId: "derivation", level: "进阶" },
        { label: "Shaping 与终止边界", sectionId: "math-potential-shaping", level: "推导" },
        { label: "熵、信息与 logits 梯度", sectionId: "math-entropy", level: "推导" },
        { label: "奖励噪声的方向与方差", sectionId: "math-reward-noise", level: "必会" },
        { label: "后缀 IS 的完整手算", sectionId: "math-suffix-is", level: "进阶" },
        { label: "白板边界检验", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "先验收信号，再验收估计器",
      body: String.raw`图中两条评分分支可以提供不同信息：标准答案支持结果检查与 IGPO，过程证据支持 CM2 清单。是否混合两者要看任务，不是强制所有训练系统同时配齐。信号汇合后才进入 advantage 与更新器。

日志反馈也有两个出口。发现奖励解析错误，应回查样本和验证器；发现权重集中或梯度异常，应检查数据新鲜度、ratio、聚合与学习率。只调学习率无法修复错误标签，只补过程分也无法修复策略版本串线。发布一个新配方前，至少保留奖励组件消融、相同预算比较及独立终局评估。

采样策略、KL reference 和当前训练策略是三个角色。采样策略决定数据概率，KL reference 提供正则参照，当前策略是被更新的模型。它们偶尔使用相同权重，也不能在日志和公式中混为一谈。`,
      diagram: {
        kind: "flow",
        nodes: [
          "轨迹与采样策略版本",
          "标准答案 / Outcome / IGPO",
          "过程证据 / CM2 清单",
          "信用分配与 Baseline",
          "Ratio / ESS / 过滤诊断",
          "SeeUPO / SAMPO / VCPO 更新",
          "独立任务评估与训练日志",
        ],
        links: [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 6],
          [6, 0],
          [6, 1],
          [6, 2],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "数学拆解：IG、顺序更新与无偏基线",
      body: String.raw`读到正确文件但提交错误的仓库轨迹，应该学到什么？先给有帮助的查询一个可解释分数，再考虑后续提交策略更新后这次查询值多少，最后选择不会随意扭曲梯度的参照值。以下沿这三个问题拆解公式，不把不同论文的部件拼成未经验证的新算法。

**一、把完整交互轮次前后的答案评分相减。** 标准答案为 $y^*=(y_1^*,\ldots,y_K^*)$，$K$ 为答案 token 数；$c_t^-$、$c_t^+$ 分别表示第 $t$ 轮开始前、结束后的上下文，新增部分包含该轮推理、调用和环境返回，不只包含工具观测。用评分时固定参数 $\phi$ 的策略做 teacher forcing，定义：

$$\ell_\phi(c,y^*)=
\frac1K\sum_{k=1}^K
\log\pi_\phi(y_k^*|c,y_{<k}^*),
\qquad
g_t=\operatorname{sg}
\left[\ell_\phi(c_t^+,y^*)-\ell_\phi(c_t^-,y^*)\right]$$

teacher forcing 在每个位置都喂入标准答案的已有前缀，然后读取下一个标准 token 的 log-prob；求平均控制答案长度尺度，相减衡量整轮上下文变化。代入开头的两个 token，轮前后均值为 -2 和 -1，得到 1；如果调用已写完、观测未到时均值为 -1.5，仅计算观测增量会得 0.5，已经不是同一切点。若只比较最后是否提交正确，也看不到轮次差异。

$g_t$ 是教学记号下的 IG，$\operatorname{sg}$ 表示 stop-gradient；它不能通过奖励支路反向训练模型去“抬高自己的评分”。核验的 IGPO v2 使用平均 log probability 差，而不是只比较最终答案是否正确，也不是未经归一化的任意长度答案概率。[1] 正文将 IG 和 outcome 分别做组归一化后构造轮次折扣信号，所以不能把两种原始数值直接相加就宣称完整复现。额外 teacher-forcing 前向有成本，向量化减少开销不意味着免费。

**二、SeeUPO 为什么从后向前更新。** 设任务有固定 $H$ 轮，将第 $t$ 轮策略记为 $\pi_t$，其输入仍是包含先前动作的历史 $h_t$，输出是本轮决策序列 $u_t$。把轮次视作虚拟 agent 不代表轮次统计独立。前轮动作是否有价值，取决于之后能否利用它带来的信息；若后轮刚被更新，用完全旧的后续分布估计前轮就会失配。

SeeUPO 以反向顺序处理轮次，并考虑已经更新的后缀。[3] 解释这种分布变化的基本 likelihood 权重是：

$$\omega_{>t}=
\prod_{k=t+1}^{H-1}
\frac{\pi_k^{\mathrm{new}}(u_k|h_k)}
{\pi_k^{\mathrm{old}}(u_k|h_k)}$$

这里的 new/old 分别是已更新和采样时的后轮策略，$\omega_{>t}$ 是后缀校正因子，最后一轮的空乘积为 1。它展示了为何更新先后会影响估计，不是省略 drift、neighbourhood 和 clipping 后的完整 SeeUPO 代码。论文采用序列级目标，不能用所有 token ratio 的算术平均替代序列概率。

**理论与实现必须分开。** 论文证明依赖特定 multi-turn contextual bandit、固定有限轮次、紧的联合策略空间、有界奖励、准确 advantage、正采样分布，以及满足条件的 HAML 理想 argmax 更新。共享神经网络上的有限样本、PPO-style clipping 与若干步 SGD 是实践实例，不自动继承任意 POMDP 的全局最优保证。准确写法是“在论文给定模型和更新假设下有收敛结论”，而不是“所有多轮 RL 终于保证收敛”。作者分析的算法组合也不能推出“所有 critic-free 多轮方法必然失败”。

乘积来自后续动作的条件概率链：后轮每个已观察动作在新分布下变得更常见，就相应增加这条后缀的权重。例如“读对文件”和“正确提交”在旧策略下各有 0.5 概率，更新后分别为 0.8、0.75，则成功后缀权重是 1.6 乘 1.5，得到 2.4。它改变的是前轮所面对的后续分布，不是让单条轨迹的环境奖励从 1 变成一个新真值。

**三、ARLArena 把稳定性拆成四个可控维度。** importance sampling 决定新旧分布校正单位；advantage design 决定信用和尺度；dynamic filtering 改变参与更新的样本；loss aggregation 决定 token 与序列如何加权。[4] SAMPO 结合序列级约束、细粒度优势与动态过滤。论文定位的一个重要失稳模式是负优势且低 IS ratio 的序列在特定宽容更新设置下累积影响，不能简化成“ratio 越大越危险”。

这也不表示标准 PPO 对低 ratio 的负优势项一直有梯度。令优势 $A=-1$，ratio $\rho=0.2$，下界 $1-\epsilon=0.8$，则 clipped surrogate 为 $\min(\rho A,0.8A)=-0.8$，在该区间对 $\rho$ 的导数为零。诊断应检查实际使用的序列约束、过滤规则和聚合方式，不能只凭“用了 PPO clipping”猜测整个训练器的行为。

**四、baseline 何时不改变期望梯度。** 先在固定历史 $h$ 的单步条件分布上推导，动作 $u$ 来自行为策略 $\mu(u|h)$，目标策略是 $\pi_\theta(u|h)$。设 $R$ 是该动作对应、分布匹配目标的回报样本，$w(u)=\pi_\theta(u|h)/\mu(u|h)$ 是准确的重要性权重，$\psi(u)=\nabla_\theta\log\pi_\theta(u|h)$ 是 score vector。动作无关的 $b(h)$ 被当作常数时：

$$\mathbb E_\mu[w(u)b(h)\psi(u)|h]
=b(h)\sum_u\pi_\theta(u|h)
\nabla_\theta\log\pi_\theta(u|h)
=b(h)\nabla_\theta1=0$$

第一步展开行为分布期望，权重分母抵消行为概率；第二步利用“概率乘 log 概率导数等于概率导数”；最后所有动作概率相加恒为 1，导数为零。把基线移到求和外要求它对当前动作固定，这正是整个证明最容易被同批统计破坏的一步。

因此 $w(R-b)\psi$ 与 $wR\psi$ 的条件期望相同。需要目标策略支持被行为策略覆盖、权重准确、期望存在，并允许求导与求和交换。对多轮完整目标，还要正确处理历史访问分布和后续回报分布；只校正一个当前 token，不能自动修正整条旧轨迹。stop-gradient 仅控制计算图，不会让统计上依赖动作的基线突然变成动作无关。

在上述条件下，最小化条件梯度方差的总体最优标量基线为：

$$b^*(h)=
\frac{\mathbb E_\mu[w^2\|\psi\|_2^2R|h]}
{\mathbb E_\mu[w^2\|\psi\|_2^2|h]}$$

分母须为正且各矩有限。它来自对 $\mathbb E_\mu[w^2(R-b)^2\|\psi\|_2^2|h]$ 关于 $b$ 求导为零。VCPO 的 OPOB（Off-Policy Optimal Baseline）体现了平方 IS 权重与梯度范数的重要性。[5] 这不是普通 reward 均值，也不是 OTB 全部推导。用同一小批样本同时估计这个比值并更新，并不能由总体公式直接得到有限样本严格无偏性。

为什么平方权重出现两次？梯度样本由权重、中心化回报和 score 相乘，计算其平方范数自然得到平方权重和 score 能量；均值已由上一证明固定，因此减小二阶矩就等于减小方差。导数为零后，把含基线的项移到一侧，再除以平均能量，才得到这个加权回报均值。

**五、包含自身的组均值并不独立。** 仅考虑同一历史下 $N>1$ 条条件独立同分布的 on-policy 样本，不做 std 归一化、clipping 或筛选。令 $\bar R=N^{-1}\sum_iR_i$，$\psi_i$ 为第 $i$ 条样本的 score，真实梯度为 $g=\mathbb E[\psi_iR_i]$，则：

$$\mathbb E\left[\frac1N\sum_i\psi_i(R_i-\bar R)\right]
=\left(1-\frac1N\right)g$$

因为 $\bar R$ 含有当前 $R_i$，即使 detach 也与 $\psi_i$ 相关。展开组均值时，其他独立样本的回报乘当前 score 后期望为零，只有自身项留下真实梯度的 N 分之一；所以扣完基线少了这一份。例如四条独立样本使期望仅剩原来的 0.75 倍，不是保持原值。

leave-one-out 基线 $b_{-i}=(N-1)^{-1}\sum_{j\ne i}R_j$ 去掉这一自身相关性，在上述条件下恢复相同期望；若其他轨迹来自相互依赖的树搜索，独立性还需重新检查。组 std、筛选、截断 IS、自归一化权重又各自改变估计器，不能一并套上“baseline 不引入偏差”的结论。接下来先检查更早的环节：如果直接修改仓库奖励，连最初想优化的任务偏好会不会变？`,
    },
    {
      id: "math-potential-shaping",
      type: "derivation",
      title: "Potential Shaping：展开望远镜，保留终点残差",
      body: String.raw`仓库助手查目录和读文件都先扣分，我们想让它更早看到进展，却仍优先完成正确提交。能否重新分配沿途奖励，使整条路线的相对好坏不变？下面保留原来的三步回报，给四个到达状态设进度值，亲自检查末尾有没有多留一笔奖励。

令 $x_t$ 表示包含剩余预算的充分状态或 belief，固定势函数 $\Phi(x)$ 与 reward 同量纲，定义 $F_t=\gamma\Phi(x_{t+1})-\Phi(x_t)$，新奖励 $r'_t=r_t+F_t$。$\Phi$ 不随本次策略求导改变；这不是 IGPO 或 CM2 的原算法定义。

对长度 $H$ 的轨迹从头展开，而不是只记“势函数不改最优策略”：

$$\begin{aligned}
G'_0-G_0
&=\sum_{t=0}^{H-1}\gamma^t
[\gamma\Phi(x_{t+1})-\Phi(x_t)]\\
&=[\gamma\Phi(x_1)+\cdots+\gamma^H\Phi(x_H)]
-[\Phi(x_0)+\cdots+\gamma^{H-1}\Phi(x_{H-1})]\\
&=-\Phi(x_0)+\gamma^H\Phi(x_H).
\end{aligned}$$

第一行把每轮额外奖励带入折扣和；第二行把到达下一状态的正项与离开当前状态的负项分开。对于任何中间状态，两次出现的折扣次数完全相同，因此相消；只留下没被抵消的初态扣款和终态余额。这也是不能随便加“每到一个好状态就奖励一次”的原因。

固定初始分布、有限 episode 且所有真正终态 $\Phi=0$ 时，差只取决于初态，因此策略排序保持。无限时域在 $\gamma<1$、$\Phi$ 有界时终点项趋零。若 $\gamma=1$，不能套用这个无限时域极限；有限时域仍可通过零终态势保证消项。非零且相同的终态势在可变长度、$\gamma<1$ 时也可能因 $\gamma^H$ 改变排序。

**完整数字。** 原奖励 $[-0.1,-0.1,1]$，$\gamma=0.9$，势序列 $[0.2,0.5,0.8,0]$。得到 $F=[0.25,0.22,-0.8]$，$r'=[0.15,0.12,0.2]$：

$$G'_0=0.15+0.9(0.12)+0.9^2(0.2)=0.42=0.62-0.2$$

例如第一步额外分是下一进度 0.5 打九折后减当前 0.2，得到 0.25；终步虽然提交成功，额外分却是 -0.8，用于收回此前预支的进度。最终 0.42 并非任务退步：同一起点的路线都统一减 0.2，排序才是要保留的东西。

若只把末态势改成 1，回报变为 $0.62-0.2+0.9^3=1.149$，不再仅差初态常数。更直接的反例：一步任务，初态势为零，动作 A 原奖励 1、终态势 0，动作 B 原奖励 0、终态势 2，$\gamma=0.9$；新奖励 A 为 1、B 为 1.8，偏好被反转。

**worker 截断怎样处理？** 在未终止的 $x_H$ bootstrap，须使用一致的 $V'(x_H)=V(x_H)-\Phi(x_H)$。这样 shaped prefix 加 $\gamma^HV'$ 后，终点势再次抵消；只加 shaping 不改 bootstrap 就会留下偏差。SMDP 则用 $\gamma^{\Delta_t}\Phi(x_{t+1})-\Phi(x_t)$，并按累计时间折扣，才有同样的望远镜。

实现前把成功、失败和预算耗尽三种真正终态都列出来，检查终态势；再用同一轨迹比较新旧回报的差是否仅依赖初态。通过这项验收以后，才能讨论更有信息但不一定保持原目标的 IG 或清单奖励。

**追问链：**有限还是无限时域？→ terminal 势是否为零？→ worker 截断还是任务终止？→ 用同一个还是改变后的价值函数？这比“多发过程分不会影响结果”严格得多。`,
    },
    {
      id: "math-entropy",
      type: "derivation",
      title: "Entropy 与 Information Gain：从定义到 logits 梯度",
      body: String.raw`助手总在重复查询，我们想鼓励它找新证据。这里有两种容易混淆的做法：让它更随机地选工具，或奖励真正减少位置不确定性的查询。下面先用一个有噪声的二元传感器计算获得了多少信息，再看熵奖励究竟把动作概率往哪边推。

belief 熵衡量隐藏状态的不确定性；策略熵衡量动作随机性；IGPO 用标准答案的平均 log-prob 变化。三者不是同一个量。若 $S$ 为隐藏状态、$O$ 为新观测，在固定历史和动作下，Shannon 的期望信息增益为：

$$I(S;O)=H(S)-\mathbb E_O H(S|O)
=\mathbb E_O D_{\mathrm{KL}}(p(S|O)\Vert p(S))\ge0$$

左边用观测前的不确定性减去观测后的平均不确定性；把熵定义展开并用全概率合并，就得到后验相对先验的平均 KL。每个 KL 非负才给出最后的不等号，条件是这些概率属于同一个一致模型，而不是随便拿两次模型输出相减。

非负性是**对观测取期望**并使用一致概率模型的性质，不意味着每次实际观测都降低熵，更不能推出答案条件 log-prob 差非负。二元等先验、对称准确率 0.8 的传感器，两种 posterior 都为 $(0.8,0.2)$ 的排列：

$$H_{\mathrm{prior}}=\log2\approx0.693147,\quad
H_{\mathrm{post}}=-0.8\log0.8-0.2\log0.2\approx0.500402$$

因此期望信息增益约为 0.192745 nats。IGPO 的前后平均答案 log-prob 从 -2 降到 -3 则为 -1，两者定义不同，不矛盾。

**固定历史的策略熵梯度。** 设 logits $z\in\mathbb R^K$，$p_j=\exp z_j/\sum_k\exp z_k>0$，$H(p)=-\sum_jp_j\log p_j$。利用 softmax Jacobian：

$$\frac{\partial p_k}{\partial z_j}=p_k(\mathbf1[k=j]-p_j),\qquad
\frac{\partial H}{\partial z_j}
=-\sum_k(\log p_k+1)p_k(\mathbf1[k=j]-p_j)
=-p_j(\log p_j+H).$$

这里 $K$ 是可选动作数，$p_j$ 是动作 j 的概率，指示量在 k 与 j 相同时取 1。先对熵的每个概率项求导，得到负的“log 概率加一”；再乘 softmax 的导数并求和。利用概率和为 1，常数项抵消，余下熵与当前动作 log 概率，得到末式。它解释了梯度如何同时调整其他动作，而不是独立拉高每个概率。

所有 logits 梯度之和为零，符合 logits 加同一常数不改概率。二分类用一个 logit $z$ 与固定零 logit，$p=\sigma(z)$，则：

$$\frac{dH}{dz}=p(1-p)\log\frac{1-p}{p}.$$

在 $p=0.8$，导数约为 -0.221807；梯度上升会降低过大的 logit，让分布更均匀。最大化奖励加 $\alpha H$ 时，最小化 loss 的熵项是 $-\alpha H$，其 logit 梯度符号相反。$p=0.5$ 时导数为零；$p\to1$ 时也趋零，说明已严重饱和的策略未必能靠有限熵系数迅速恢复探索。

这里是**固定采样历史上的局部正则梯度**。若目标是随策略改变的整条轨迹期望熵，历史访问分布也依赖参数，完整梯度还包含相应 score 项。不能仅写局部导数就称求出了全轨迹目标。

因此传感器的 0.192745 nats 是平均获得的信息，-0.221807 则是改变一个动作 logit 时熵的局部斜率，单位与用途不同。排查重复查询时应同时记录证据收益和动作多样性；后者增加而前者不变，不能宣布探索更有效。下一节检查连评分本身都有误差时，梯度会发生什么。

**追问链：**不确定的是状态还是动作？→ 是否对观测平均？→ bonus 的最大化/最小化符号？→ 固定前缀还是当前策略访问分布？高熵乱码不是高信息检索。`,
    },
    {
      id: "math-reward-noise",
      type: "derivation",
      title: "奖励噪声：零均值不够，必须条件零均值",
      body: String.raw`仓库验证器有时把猜错的位置判对，也会漏掉正确提交。即使整批误差平均为零，训练会不会仍然学偏？我们把评分误差带进策略梯度，再用 20% 假阳性和 10% 假阴性的裁判算一次真实更新方向。

验证器分数 $\widetilde R=R+\varepsilon$，其中 $R$ 是真实奖励，$\varepsilon$ 是评分误差；轨迹 score 为 $\psi(\tau)=\nabla_\theta\log p_\theta(\tau)$。在 on-policy、奖励无直接参数依赖且矩存在时：

$$\mathbb E[\widetilde R\psi]
=\underbrace{\mathbb E[R\psi]}_{\text{真实梯度}}
+\underbrace{\mathbb E[\varepsilon\psi]}_{\text{奖励噪声偏差}}.$$

只有总体 $\mathbb E[\varepsilon]=0$ 不保证右端第二项为零，因为噪声可能和动作相关。充分条件是 $\mathbb E[\varepsilon|\tau]=0$。在此条件下，噪声造成的梯度总方差（协方差矩阵的迹）增量为：

$$\mathbb E[\|\psi\|^2\operatorname{Var}(\varepsilon|\tau)].$$

第一式只是把评分拆成真值与误差再用期望线性性展开。条件零均值允许先固定轨迹，再把误差的条件期望消去；也让真梯度与噪声梯度的交叉协方差为零。剩下的噪声二阶矩就是上式：同样大小的评分误差，乘在更大的 score 上会产生更强抖动。

所以“无偏噪声”仍可能让高 score 能量的少数轨迹主导抖动；减去动作无关 baseline 不能纠正系统性错误标签。

**二元 judge 算例。** 固定状态只有正确动作和错误动作，正确动作概率 $p=\sigma(z)$，真 reward 分别 1、0。judge 假阳性率 $f=0.2$，假阴性率 $n=0.1$，并假设这两个错误率在各自真标签内部恒定：

$$\mathbb E[\widetilde R|R]=f+(1-f-n)R=0.2+0.7R.$$

错误动作被给 1 分的概率是 0.2，正确动作被给 1 分的概率是 0.9；一条连接这两个端点的直线就是上式。常数 0.2 乘 score 的期望消失，剩下斜率 0.7 缩放真实方向，所以不是简单给所有奖励都减一个固定值就能完全还原。

故 $\mathbb E\widetilde R=0.2+0.7p$，真梯度为 $p(1-p)$，观测梯度为 $0.7p(1-p)$。在 $p=0.5$，分别为 0.25 与 0.175。$f+n=1$ 时标签没有方向信息；$f+n>1$ 时甚至反向；只有固定的、满足 $f+n<1$ 的误差率才保留此例的排序。

若可靠地知道 $f,n$，可用 $(\widetilde R-f)/(1-f-n)$ 校正条件期望，但方差被除以 $(1-f-n)^2$。当二者和接近 1，估计极不稳定；真实 judge 的错误率还常随任务、语言和长度变化，不能用一个全局常数假装完成校准。

**总体零均值反例。** $p=0.5$ 时，让正确动作噪声为 +1，错误动作为 -1，总体噪声均值为零，但 $\mathbb E[\varepsilon\psi]=0.5$，梯度明显改变。应按动作类型、证据和任务难度审计噪声。

在两种动作各半的例子里，0.175 仍朝向正确动作，却只有真实梯度 0.25 的七成；总体零均值反例则说明误差甚至可能额外制造方向。下一步按动作类型抽检独立真值，再决定校准或过滤；不要先调大学习率补偿一个尚未确认的误差模型。

**追问链：**评分误差是否相关于动作？→ 用什么独立真值估计错误率？→ 过滤是否改变任务分布？→ 方差和主任务成功率是否同时改善？这才是引入 PF-PPO 等方法前要定位的问题。`,
    },
    {
      id: "math-suffix-is",
      type: "derivation",
      title: "后缀重要性采样：四条路径、支持条件与裁剪偏差",
      body: String.raw`助手查完目录后还要读对文件、正确提交。旧数据里这两步各有一半概率做对，但我们刚训练好了后两轮策略；还能用旧轨迹评价查目录的价值吗？下面穷举四种后续结果，检查加权能否恢复新策略的成功概率，以及漏校正或裁剪会损失多少。

固定动作后的历史 $h_{t+1}$，旧策略 $\mu$ 产生后缀 $\xi$，更新后的后轮策略为 $\nu$。环境转移与观测机制相同，因此在完整后缀 likelihood ratio 中环境因子抵消：

$$W(\xi)=\prod_{k>t}\frac{\nu_k(u_k|h_k)}{\mu_k(u_k|h_k)},
\qquad \mathbb E_\mu[W R\mid h_{t+1}]
=\mathbb E_\nu[R\mid h_{t+1}].$$

把左边写成对后缀求和，每条旧路径概率乘“新路径概率除旧路径概率”，就只剩新路径概率乘回报。$W$ 是这条后缀的权重，$R$ 是固定前缀之后的回报；逐步条件概率的乘积使路径概率比可以拆成各后轮的比率，不要求一般环境中的后轮相互独立。

这是解释 SeeUPO 后缀分布变化的标准教学恒等式，不代替它的 drift、neighbourhood 或更新规则。要求 $\nu(\xi)>0$ 时 $\mu(\xi)>0$，奖励与权重可积，行为概率真实且上下文一致；最后一轮空后缀权重为 1。只校正后缀，并没有同时校正来自旧策略的前缀访问分布。

**穷举两步。** 两个后续二元动作在本算例中独立。旧策略每步成功概率都是 0.5，新策略分别为 0.8、0.75。奖励仅在两个动作都是 1 时为 1：

| 后缀 | 旧概率 | 新概率 | $W$ | $R$ |
|---|---|---|---|---|
| 11 | 0.25 | 0.60 | 2.4 | 1 |
| 10 | 0.25 | 0.20 | 0.8 | 0 |
| 01 | 0.25 | 0.15 | 0.6 | 0 |
| 00 | 0.25 | 0.05 | 0.2 | 0 |

$$\mathbb E_\mu W=1,\qquad
\mathbb E_\mu WR=0.25(2.4)=0.6,\qquad
\mathbb E_\mu W^2=1.7.$$

11 路线在旧分布下只占 0.25，在新分布下占 0.60，因此要乘 2.4；其余三条没有终局奖励，但仍参与权重总量和方差。加权成功率 0.6 恢复了目标，权重二阶矩 1.7 则提醒我们，这种恢复不是免费的低方差估计。

把权重截到 2 后，reward 估计变成 0.5，比目标少 0.1；只校正最后一个动作，得到 $0.25(1.5)=0.375$，因为第一步分布仍错。四条各出现一次的样本 ESS 为 $4^2/(2.4^2+0.8^2+0.6^2+0.2^2)=40/17\approx2.352941$。

**长后缀为何危险？** 若各步比率在旧分布下独立、均值为 1、二阶矩为 $c>1$，则 $\mathbb E W^2=c^K$，随后缀长度 $K$ 指数增长。实际动作有依赖时不能直接因式分解，但长乘积仍需检查尾部。实现可累加 log-ratio 防数值溢出；这不能消除统计方差。若旧策略根本不采动作 1，任何有限权重都不能补出新策略的 11 路线。

实际日志应同时留下未裁剪权重、裁剪后的训练权重和被过滤的任务：本例 0.6、0.5、0.375 分别对应完整校正、裁剪和漏校正，不能只因都叫“重要性采样”就混用。下一章转向更早的瓶颈：如果连可加权的成功后缀都没采到，该怎样增加探索与可比信号。

**追问链：**改了哪几个轮次？→ 校正的随机变量包含哪些动作？→ 支持是否覆盖？→ clipping、自归一化或丢弃改变了什么期望？不能用“IS 已修正”概括所有这些选择。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：用未截断权重计算 ESS 与风险指标",
      body: String.raw`以下代码仅演示 VCPO 的 ESS 学习率缩放和一个受 ARLArena 启发的诊断计数，不实现任何论文的完整优化器。输入是同一批样本的原始 log importance ratios；在 log 空间减去最大值后计算 ESS，避免直接对极大 log ratio 求指数。

~~~python
from math import exp, fsum, isclose, isfinite, log, sqrt

def stability_report(log_ratios, advantages, base_lr, reference_q=1.0,
                     low_ratio_threshold=0.2):
    n = len(log_ratios)
    if n == 0 or n != len(advantages):
        raise ValueError("nonempty aligned samples required")
    if not all(isfinite(x) for x in [*log_ratios, *advantages]):
        raise ValueError("nonfinite training statistic")
    if not isfinite(base_lr) or base_lr <= 0:
        raise ValueError("positive finite learning rate required")
    if not 0 < reference_q <= 1 or not 0 < low_ratio_threshold < 1:
        raise ValueError("invalid reference ESS or diagnostic threshold")

    # ESS 对所有权重乘同一正常数不变；这里没有裁剪权重。
    shift = max(log_ratios)
    scaled_weights = [exp(value - shift) for value in log_ratios]
    total = fsum(scaled_weights)
    ess = total * total / fsum(w * w for w in scaled_weights)
    q = ess / n
    lr_factor = sqrt(q / reference_q)
    negative_low = sum(
        advantage < 0 and log_ratio < log(low_ratio_threshold)
        for advantage, log_ratio in zip(advantages, log_ratios)
    )
    return {
        "ess": ess,
        "ess_ratio": q,
        "lr_factor": lr_factor,
        "learning_rate": base_lr * lr_factor,
        "negative_low_fraction": negative_low / n,
    }

report = stability_report(
    [0.0, 0.0, 0.0, log(9.0)], [1.0, 1.0, -1.0, 1.0], 1e-5
)
assert isclose(report["ess"], 12 / 7)
assert isclose(report["ess_ratio"], 3 / 7)
assert isclose(report["lr_factor"], sqrt(3 / 7))
print({key: round(value, 8) for key, value in report.items()})

uniform = stability_report([0.0] * 4, [1.0] * 4, 1e-5)
assert isclose(uniform["ess"], 4.0)
shifted = stability_report(
    [1000.0, 1000.0, 1000.0, 1000.0 + log(9.0)],
    [1.0, 1.0, -1.0, 1.0], 1e-5
)
assert isclose(shifted["ess"], report["ess"])
warning = stability_report([log(0.1), 0.0], [-1.0, 1.0], 1e-5)
assert warning["negative_low_fraction"] == 0.5
~~~

例子的学习率约为 0.00000655；低 ratio 诊断阈值 0.2 是教学设置，不是 SAMPO 的固定超参或自动删除规则。告警只表示需要检查，不能据此把负优势样本全部丢掉，否则模型也失去压低错误动作概率的机会。

ESS 对统一缩放不变，所以 shifted 测试会得到相同 ESS，但极大的绝对 log ratio 仍然提示严重分布问题。高 ESS 只说明权重相对均匀，不能证明采样版本、行为概率、动作支持和 reward 都正确。真实日志还应保留 log ratio 范围、KL、clip fraction、策略滞后、梯度范数，以及按任务和长度分桶的终局成功率。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：监督、无偏性与收敛不能混说",
      body: String.raw`**误区一：不训练 RM 就不需要监督。** IGPO 使用标准答案，CM2 使用清单与 judge，ZeroSearch 的模拟器有 SFT 阶段，ReGFT 使用部分参考解。[1][2][9][7] 应记录每种监督的来源、采集成本、错误率和部署时可得性，而不是用“无 RM”遮蔽它们。

**误区二：过程奖励一定让每一步都有正确梯度。** 奖励依赖错误证据时，越细的分配可能越容易奖励投机。CM2 的 dense criteria 与 sparse assignment 是两个独立选择。IGPO 的 log probability 变化也不能证明某段搜索内容在因果上必要。过程分改善训练，不等于过程解释已经得到验证。

**误区三：SeeUPO 证明一切多轮训练全局收敛。** 论文理论对象、精确 advantage 与理想更新条件都比工程系统严格。共享模型会同时改变多个轮次的行为，有限 batch 有估计噪声，POMDP 还有状态不确定性。理论用于理解机制和条件，不能充当部署成功保证。

**误区四：减一个数只是平移，所以任何 baseline 都无偏。** baseline 可以依赖历史，但不能未经校正就依赖当前采样动作。自身 reward 进入均值、同 batch 拟合后插入、按奖励筛选样本，都可能破坏简单恒等式的条件。stop-gradient 解决“求不求导”，不解决“随机变量是否相关”。

**误区五：重要性采样总能救旧数据。** 行为策略对目标动作概率为零时，没有样本可供加权；极端权重会带来巨大方差。截断权重、丢样本与自归一化各有偏差和方差取舍。VCPO 用未截断比率做 ESS 诊断，同时在优化器中使用 detached truncated IS，不能把后者叫作未改动的精确 IS。

**误区六：clip fraction 越低越健康，ESS 越高越正确。** 两者都是局部统计。采样概率记错、所有 reward 相同或学习率过小，都可能产生漂亮曲线却没有学习。还要检查独立任务成绩、更新幅度与数据正确性，并区分序列 ratio、token ratio 和长度归一化 ratio。

**误区七：统一框架选出的配方必然跨任务最优。** ARLArena 的受控比较能定位其平台中的机制；loss aggregation 的效果仍会随任务和长度分布变化。[4] 引入 SAMPO 或其他方法时，应保持采样预算、任务分布、环境版本和基线初始化可比，不从跨论文表格直接推导最优组合。

**误区八：综述中的机构、会议与日期可以直接复制。** 核验发现 CM2 并非上游所写的字节跳动论文，IGPO 不宜简单归为“阿里巴巴”；SeeUPO、VCPO 的已核验摘要没有支持上游的 ICLR 标签。这里只按一手来源描述机制，具体纠错和版本日期记录在证据账本，避免让错误署名或修订时间影响方法判断。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "方法地图：九个相关方向各补哪一块",
      body: String.raw`${methodNotes}

先对齐五组核心方法的工作位置。同一系统可以需要其中多项，但组合效果必须实验验证，不能把所有技巧简单叠加。

| 方法 | 主要作用位置 | 关键机制 | 必须检查的边界 |
|---|---|---|---|
| IGPO | 轮次奖励信号 | 标准答案平均 log probability 的前后差 | 标准答案监督、代理信号与额外前向成本 |
| CM2 | 过程评价与分配 | 带证据、权重和依赖的清单 | judge 噪声、首次满足、分配粒度 |
| SeeUPO | 多轮策略更新 | 序列级目标、反向顺序与后缀校正 | 特定理论模型与理想更新假设 |
| ARLArena / SAMPO | 受控诊断与组合优化 | 序列约束、细粒度优势、动态过滤 | 任务依赖、筛选分布和聚合差异 |
| VCPO | 异步 off-policy 更新 | ESS 比例缩放、OPOB、截断 IS | 原始权重、支持覆盖与估计偏差 |

**1. EDGE-GRPO：同组缺少差异时，改善优势多样性。** EDGE-GRPO 使用 Entropy-Driven Advantage 与 Guided Error Correction，既利用样本熵构造优势，也通过引导纠错补充可学习信号。[6] 它不是在任意 GRPO loss 后加一个普通 entropy bonus。对于全错组，先看是否缺少探索、是否需要纠错示范；对于全对组，低熵也不自动表示策略应被惩罚。论文证据来自推理基准，迁移到带工具成本的真实交互仍需验证。

**2. ReGFT：先让模型获得“能模仿的成功经验”。** Reference Guided Fine-tuning 用部分人工参考解引导模型生成自身可模仿的正轨迹，再进行 RL 前的 SFT。[7] 其作用是冷启动难题学习，不是一个新 on-policy 优化器，也不是原封不动照抄完整人工证明。它可以与后续 RL 配方配合，但必须分别统计参考数据成本、SFT 收益和 RL 增益，不能把额外监督带来的改善全部归于优化器。

**3. PF-PPO：奖励有噪声时，先研究哪些数据值得信。** Policy Filtration for RLHF to Mitigate Noise in Reward Models 根据奖励可靠性进行过滤，并用 reward 与实际成绩之间的决定系数 $R^2$ 评估过滤策略。[8] 摘要不支持“每条样本都先获得准确校准的 RM uncertainty”这种简化。过滤可能降低噪声，也可能系统性删除少数难题或不同风格；它改变训练分布，因此不能顺带承诺对原任务目标无偏。真实成绩本身的可得性也是成本。

**4. ZeroSearch：昂贵搜索交互可以先用模拟器训练。** 它先以轻量 SFT 让模型模拟检索返回，生成有用与带噪文档，再通过逐渐降低文档质量的课程训练搜索能力。[9] 重点不是让训练永远处在无噪声环境，而是控制难度与 API 成本。模拟器有自己的分布偏差，部署时的真实检索仍可能失败；“without searching”不能解释成推理阶段永远不调用真实搜索，更不是总训练成本为零或没有监督。

**5. DARS：更多 rollout 必须投到能产生学习的地方。** Difficulty Adaptive Rollout Sampling 用定向、多阶段 rollout 调整难题探索，核验 v8 还区分深度探索与实例广度，DARS-Breadth 联合增加覆盖面。[10] 仅把每题采样数放大，未必提高训练后的单次作答能力。应同时看难题成功轨迹是否进入训练、被探索的题目数量、总生成 token 和最终 pass@1；pass@k 提高只表示多次尝试中更可能出现成功，不是 pass@1 的数学保证。

**6. ProRL：长时间训练要管理正则锚点与任务覆盖。** ProRL 通过 KL 控制、reference policy 重置和多样化任务研究持续 RL 的能力增长。[11] reference 是 KL 正则锚点，重置它不等于刷新生成数据的 behavior policy，也不会自动修正旧样本 ratio。有限次采样里基座没解出一道题，只能说明该预算下未观察到成功，不能证明基座生成正确解的真实概率严格为零。持续训练收益还应连同累计算力报告。

**7. GMPO：改变聚合方式，而不是对负 reward 直接开方。** Geometric-Mean Policy Optimization 对带符号处理的 importance-weighted surrogate 做几何聚合。[12] 在同一序列共享优势 $A$、暂不考虑 clipping 时，可用 $A\exp(L^{-1}\sum_{j=1}^L\log\rho_j)$ 理解其核心，其中 $L$ 为序列 token 数，$\rho_j$ 为正的 token ratio。完整方法还含 token-level clipping 与符号处理，并在 log 空间运算。它不是对任意正负环境奖励求几何平均，也不等于 GSPO 的序列级 clipping；聚合与裁剪单位必须一起核对。

**8. OTB：同样 reward 不代表同样梯度能量。** The Optimal Token Baseline 关注 token 和序列之间的梯度异质性，基于累计梯度能量相关量设计方差控制，并用 Logit-Gradient Proxy 通过前向概率近似相关梯度信息。[13] 普通 reward 均值没有利用这些尺度差异；但前向概率代理也不是全参数梯度范数的精确测量。OTB 与 VCPO 的 OPOB 都讨论 baseline，却不是同一个估计器，不能把前面单步总体标量公式直接当作 OTB 的完整实现。

**9. Dr. MAS（Dr.MAS）：多角色系统不要只用一套全局统计。** 规划者、工具执行者和检查者可能拥有不同奖励均值与尺度。Dr. MAS 按 agent 自身的 reward 统计归一化优势，缓解全局统计与角色分布不匹配引起的梯度尺度问题。[14] 实现时必须保留 agent identity，并监控各角色的样本量，避免小样本标准差放大噪声。它不自动解决角色协作冲突、所有非平稳性或全局最优问题。

选择顺序由故障决定：没有成功经验时先看参考引导与探索；验证器不可靠时先审计奖励；更新被少数轨迹主导时看 IS、ESS、聚合和 baseline；多角色尺度不一致时再做角色级统计。一次只修改能够被清晰验收的机制，才能知道增益来自信号、数据还是优化。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：先问信号，再问分布，最后问更新",
      body: String.raw`**30 秒回答：**“Agentic 奖励和稳定性是不同层次。IGPO 用搜索前后标准答案 log probability 的变化增加过程区分度，CM2 用有依赖的清单刻画任务要求。SeeUPO 处理轮次间的更新依赖，ARLArena/SAMPO 分析序列约束、优势和过滤，VCPO 用 ESS 与 baseline 控制异步旧数据的方差。每项都有监督、采样和理论条件，不能因为没有 RM 就说没有监督，也不能把理想收敛证明推广到任意工程训练。”

若追问 IGPO 和 CM2 怎么选：有标准答案且希望评估检索信息时，可以检验 IGPO 信号；任务要求能拆成可核对步骤、证据与依赖时，清单更自然。两者都要和独立终局成功率交叉核对。标准答案或清单错误时，优化器再稳定也会学错方向。

若追问为什么 baseline 不总无偏：固定历史下，动作无关基线乘 score 的期望为零；但包含自身 reward 的组均值依赖当前样本。最简单的条件独立 on-policy 例子中，未标准化组均值估计的期望会乘 $(N-1)/N$，LOO 去掉这项自身相关性。截断、筛选、std 归一化需要分别分析。

若追问 ESS 的含义：它衡量权重集中度，不是数据条数，也不是独立性检验。[1,1,1,9] 的 ESS 为 $12/7$。用裁剪后的权重计算会掩盖原始失配；即使 ESS 很高，也要检查比率分母是否确实来自生成那条数据的策略。

若追问如何复现实验：锁定论文版本、任务和环境、初始化、采样与 reference 策略、奖励组件、mask、advantage、ratio、clipping、loss 聚合及总预算。分别报告训练采样成功率、独立评测 pass@1 和单位工具调用收益；不要把不同模型上的相对增益写成某个基准的百分点提升。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：判断改进到底发生在哪一层",
      body: "不要只回答论文名称。说明所需监督、改变的估计器部分和不能据此推出的结论。",
      questions: [
        {
          q: "查询后标准答案更容易被模型预测，是否表示这个信号不需要监督？",
          a: "不是。它依赖标准答案的 teacher forcing，也是模型相关的代理信号；不能直接证明查询具有因果价值。",
        },
        {
          q: "助手已经找到并读取证据，却没有正确提交。为什么过程清单可以改善，但终局仍应判失败？",
          a: "过程清单描述已完成的子要求，终局成功要求完整交付。每项应只计首次满足，避免重复读取刷分。",
        },
        {
          q: "少数轨迹拥有远高于其他样本的重要性权重时，ESS 会反映什么风险？",
          a: "它会下降，提示更新被少数样本支配、有效信息量减少。诊断时应保留原始未截断权重。",
        },
        {
          q: "给组均值 baseline 加 stop-gradient，就能消除包含自身样本的偏差吗？",
          a: "不能。停止梯度只影响求导，不消除统计相关性。在同历史、条件独立、on-policy 且无标准化或 clipping 的例子中，包含自身的组均值使期望梯度乘 (N-1)/N；LOO 去掉这一项。",
        },
        {
          q: "方法专题读完后：SeeUPO 的收敛结果为什么不能直接用于任意共享模型 POMDP？",
          a: "证明使用特定固定有限轮次模型、准确 advantage、紧策略空间、有界奖励、正采样和理想 HAML 更新等条件。有限 batch、共享神经网络与 SGD 不自动满足这些条件。",
        },
        {
          q: "方法专题读完后：ProRL 重置 reference policy 后，旧 rollout 的 behavior policy 分母能否一起改成新 reference？",
          a: "不能。reference 是 KL 正则锚点，behavior policy 是真实生成数据的策略；分母必须对应实际采样概率，重置 reference 不会改变已经发生的采样过程。",
        },
        {
          q: "方法专题读完后：GMPO 是否就是对环境奖励求几何平均？OTB 是否就是普通 reward 均值？",
          a: "都不是。GMPO 聚合带符号处理的 importance-weighted surrogate，并有自己的 clipping；OTB 利用 token/序列梯度异质性和前向概率代理设计 baseline。",
        },
        {
          q: "某 agent 的清单分上升但终局成功率不变，下一步应检查什么？",
          a: "检查是否重复计分、关键依赖未满足、judge 噪声或奖励投机，并核对过程分与真实终局要求。不能仅凭过程分上涨认定能力提高，也不应直接用更大学习率放大该信号。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：奖励不变性、噪声与后缀校正",
      body: "每题必须写出成立条件、至少一个数值和失效边界。原算法的完整定义仍以已核验正文为准。",
      questions: [
        {
          q: "证明 potential shaping 的有限轨迹差值，并用奖励 [-0.1,-0.1,1]、势 [0.2,0.5,0.8,0]、折扣 0.9 核验；末态势变成 1 会怎样？",
          a: String.raw`展开 $\sum_t\gamma^t(\gamma\Phi_{t+1}-\Phi_t)$ 后中间项两两消去，剩 $-\Phi_0+\gamma^H\Phi_H$。本例 shaping 为 $(0.25,0.22,-0.8)$，新回报为 $0.42=0.62-0.2$；末态势为 1 时再加 $0.9^3$ 得 1.149。有限终止取零终态势；截断则配合 $V'=V-\Phi$ 消去残差。**得分点：**望远镜展开、终态项、bootstrap 一致性。追问：非零常量终态势在不同长度下仍可能改变排序。`,
        },
        {
          q: "二分类策略 p=sigmoid(z)，在 p=0.8 推导熵对 z 的导数；最大化奖励加熵时应往哪边更新？这是否就是 IGPO？",
          a: String.raw`先有 $dH/dp=\log((1-p)/p)$，再乘 $dp/dz=p(1-p)$，得到 $dH/dz=0.16\log(0.25)\approx-0.221807$。熵梯度上升降低 z；最小化 loss 用 $-\alpha H$。IGPO 是标准答案 teacher-forcing 平均 log-prob 的前后差，不是策略熵 bonus；期望 Shannon 信息增益又是另一种随机变量的 KL。**得分点：**链式法则、符号、三种信息量的区分。追问：固定前缀的导数不包含历史访问分布梯度。`,
        },
        {
          q: "二元 judge 假阳性 0.2、假阴性 0.1，正确动作概率 p=0.5。比较真奖励和观测奖励的 logit 梯度；总体零均值噪声是否充分？",
          a: String.raw`条件期望为 $0.2+0.7R$，故真期望梯度 $p(1-p)=0.25$，观测梯度为 0.175。一般偏差是 $\mathbb E[\varepsilon\psi]$；正确动作噪声 +1、错误动作 -1 在 p=0.5 时均值为零，偏差却为 0.5。需要如 $\mathbb E[\varepsilon|\tau]=0$ 的条件才能消项。**得分点：**错误率模型、score 相关性、条件零均值。追问：错误率之和接近 1 时，反校准会放大方差。`,
        },
        {
          q: "两步旧成功概率均为 0.5，新概率为 0.8 和 0.75，只有 11 得 1。列全后缀权重，求准确估计、截到 2 的估计和只校正最后一步的估计。",
          a: String.raw`11、10、01、00 的权重为 2.4、0.8、0.6、0.2。准确期望是 $0.25(2.4)=0.6$；截断后是 $0.25(2)=0.5$；只校正最后一步是 $0.25(1.5)=0.375$。准确权重均值为 1，二阶矩 1.7。若旧策略第一步成功概率为零，目标后缀不在行为支持内，不能用 IS 恢复。**得分点：**完整序列概率、偏差数值、支持条件。追问：log-space 计算防溢出，但不降低长乘积的方差。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "[1] Information Gain-based Policy Optimization: A Simple and Effective Approach for Multi-Turn Search Agents",
      url: "https://arxiv.org/abs/2510.14967v2",
      evidence:
        "一手摘要与正文第 3 节。首次 2025-10-16，v2 2026-03-24；核对平均 log probability 差、stop-gradient、独立归一化与 decision-token mask。标准答案和 outcome 仍是监督，不保证所有等终局奖励组均有非零优势。",
    },
    {
      label: "[2] CM2: Reinforcement Learning with Checklist Rewards for Multi-Turn and Multi-Step Agentic Tool Use",
      url: "https://arxiv.org/abs/2602.12268v2",
      evidence:
        "一手摘要与正文第 3 节、表 1。首次 2026-02-12，v2 2026-02-20；七项为清单字段，区分判据粒度与分配粒度，依赖及首次满足控制计分；论文机构不支持上游的字节跳动归属。",
    },
    {
      label: "[3] SeeUPO: Sequence-Level Agentic-RL with Convergence Guarantees",
      url: "https://arxiv.org/abs/2602.06554v1",
      evidence:
        "一手摘要、正文第 4 节及附录 A/B，2026-02-06 v1。反向顺序更新和后缀校正；收敛依赖特定模型、准确优势与理想 HAML 更新，不是任意多轮 POMDP/SGD 保证；不保留无依据的会议标签或错配增益。",
    },
    {
      label: "[4] ARLArena: A Unified Framework for Stable Agentic Reinforcement Learning",
      url: "https://arxiv.org/abs/2602.21534v3",
      evidence:
        "一手摘要及第 4、5 节。首次 2026-02-25，v3 2026-07-04；四维诊断与 SAMPO 组合，特别关注负优势低 ratio 序列。受控平台结果不是跨任务必要充分条件，聚合效果有任务差异。",
    },
    {
      label: "[5] Stable Asynchrony: Variance-Controlled Off-Policy RL for LLMs",
      url: "https://arxiv.org/abs/2602.17616v2",
      evidence:
        "一手摘要与第 3 节。首次 2026-02-19，v2 2026-03-02；VCPO 用未截断权重计算 ESS，相对 on-policy 参考比例的平方根缩放学习率，OPOB 含平方权重和梯度范数。总体基线公式不等于同 batch 有限样本严格无偏。",
    },
    {
      label: "[6] EDGE-GRPO: Entropy-Driven GRPO with Guided Error Correction for Advantage Diversity",
      url: "https://arxiv.org/abs/2507.21848v1",
      evidence:
        "一手摘要，首次 2025-07-29，核验 v1。熵驱动优势与引导纠错共同改善信号；不是普通 entropy bonus 的别名，推理基准证据不直接保证真实工具任务收益。",
    },
    {
      label: "[7] Learn Hard Problems During RL with Reference Guided Fine-tuning",
      url: "https://arxiv.org/abs/2603.01223v2",
      evidence:
        "一手摘要。首次 2026-03-01，v2 2026-03-05；ReGFT 用部分参考解引导生成可模仿正轨迹，在 RL 前进行 SFT。不是新 on-policy 更新器，也不等于无额外监督。",
    },
    {
      label: "[8] Policy Filtration for RLHF to Mitigate Noise in Reward Models",
      url: "https://arxiv.org/abs/2409.06957v5",
      evidence:
        "一手摘要。首次 2024-09-11，v5 2025-06-07；PF-PPO 研究奖励噪声与过滤，用 reward 和实际成绩的 R2 评估过滤策略。摘要不支持逐样本精确 uncertainty 的简化，过滤改变训练分布。",
    },
    {
      label: "[9] ZeroSearch: Incentivize the Search Capability of LLMs without Searching",
      url: "https://arxiv.org/abs/2505.04588v3",
      evidence:
        "一手摘要。首次 2025-05-07，v3 2026-05-19；SFT 检索模拟器生成有用及噪声文档，并逐渐降低质量形成课程。不能解释为无监督、训练零成本或推理无需真实搜索。",
    },
    {
      label: "[10] Depth-Breadth Synergy in RLVR: Unlocking LLM Reasoning Gains with Adaptive Exploration",
      url: "https://arxiv.org/abs/2508.13755v8",
      evidence:
        "一手摘要。首次 2025-08-19，v8 2026-04-12；DARS 和 DARS-Breadth 区分定向深度探索与实例广度。增加采样不等于单次性能必然提高，需记录计算预算和训练分布。",
    },
    {
      label: "[11] ProRL: Prolonged Reinforcement Learning Expands Reasoning Boundaries in Large Language Models",
      url: "https://arxiv.org/abs/2505.24864v1",
      evidence:
        "一手摘要，首次 2025-05-30，核验 v1。长期训练配合 KL 控制、reference 重置和任务多样性；reference 重置不是 behavior policy 刷新，有限样本未解出不证明成功概率为零。",
    },
    {
      label: "[12] Geometric-Mean Policy Optimization",
      url: "https://arxiv.org/abs/2507.20673v3",
      evidence:
        "一手摘要、正文第 3 节式 (3)-(6) 与 Algorithm 1。首次 2025-07-28，v3 2025-10-18；GMPO 的符号处理、log-space 几何聚合和 token-level clipping，不能简化成负奖励直接求几何均值或 GSPO。",
    },
    {
      label: "[13] The Optimal Token Baseline: Variance Reduction for Long-Horizon LLM-RL",
      url: "https://arxiv.org/abs/2602.07078v2",
      evidence:
        "一手摘要及第 3 节。首次 2026-02-06，v2 2026-06-21；OTB 关注梯度异质性，用前向概率构造 Logit-Gradient Proxy，不是精确全参数梯度范数，也不是 OPOB 同名方法。",
    },
    {
      label: "[14] Dr. MAS: Stable Reinforcement Learning for Multi-Agent LLM Systems",
      url: "https://arxiv.org/abs/2602.08847v1",
      evidence:
        "一手摘要，首次 2026-02-09，核验 v1。按 agent 自身 reward 统计归一化优势，处理全局统计失配；不保证解决所有多智能体非平稳性或全局最优。",
    },
    {
      label: "[15] Agentic RL Analysis：1.2 奖励信号与训练稳定性（固定版本）",
      url: "https://github.com/xavierzhang2002/agentic-rl-analysis/blob/66ae4423b36270ef50a288fb1bb2e1b31c46c329/docs/agentic-rl/ch1/1.2-reward-stability.md",
      evidence:
        "二手覆盖来源，不承担论文机制与数值的独立证据。已读完整原文并逐项核验 14 个论文名称；题名、机构、版本、收敛和监督边界的纠错见 docs/research/agentic-core-evidence.md。",
    },
  ],
};

export default chapter;
