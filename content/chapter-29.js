const chapter = {
  id: "29",
  slug: "agentic-rl-landscape-interview",
  part: "Agentic RL",
  title: "Agentic RL 全景、路线判断与综合面试",
  subtitle: "把论文主张变成可验证的系统与实验",
  level: "综合",
  duration: 120,
  prerequisites: ["24", "25", "26", "27", "28"],
  tags: ["Agentic RL", "技术路线", "全景", "未来预测", "面试", "实验设计"],
  objectives: [
    "按挑战和干预位置检索 Agentic RL 方法",
    "比较算法修复、问题重建模与数据环境三条路线",
    "用评估协议区分实际能力、系统加速和代理奖励上升",
    "完成一个多轮 Agent 训练项目的方案答辩",
  ],
  summary: "Agentic RL 的选择应从轨迹、奖励、探索、信用与系统一致性出发；方法速查用于定位候选，产业观点和未来预测用于提出实验，最终结论必须由真实环境中的独立验证支持。",
  sections: [
    {
      id: "roadmap", type: "roadmap", title: "知识路线：把一个 Agent 项目写成可检验的目标",
      body: String.raw`**先修能力：**第 24 章配对评估；第 25 章轨迹与 mask；第 26 章奖励、baseline 和 IS；第 27 章探索与信用；第 28 章异步、环境验收和成本单位。综合面试不再罗列论文，而是从数据走到参数更新，再走到独立结果。

**学习链：**定义联合成功与逐步成本 → 回报和优势 → 带 mask 的 actor/critic/正则目标 → 期望预算约束与拉格朗日更新 → micro/macro、配对统计及成本评估 → 按失败位置选择最小改动。新增配方是明确假设下的教学抽象，不宣称任何厂商使用相同 loss、系数或预算。

**毕业要求：**能给一条两轮轨迹手算完整 loss，解释预算乘子的方向，识别平均预算不等于逐次授权，并说明 6 个百分点的样本差异为什么还不足以证明稳定胜出。`,
      links: [
        { label: "联合成功的产品定义", sectionId: "example", level: "必会" },
        { label: "端到端训练目标", sectionId: "math-training-objective", level: "推导" },
        { label: "预算约束与拉格朗日", sectionId: "math-budget-lagrange", level: "推导" },
        { label: "聚合、置信区间与成本", sectionId: "math-aggregate-evaluation", level: "进阶" },
        { label: "失败定位方法表", sectionId: "comparison", level: "必会" },
        { label: "综合白板答辩", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition", type: "intuition", title: "先建立直觉：从论文地图回到真实任务",
      body: String.raw`读完很多论文后，最容易出现的错觉是“工具箱足够大，所以任何任务都能训练”。但一个 Agent 项目首先需要可执行任务、明确初始状态、可观察反馈和可重复评估。没有这些条件，换优势函数只会更高效地追逐不可靠目标。

来源仓库的两份报告相互补充：Post-Training 报告解释模型怎样从示范、奖励和教师中学习；Agentic RL 报告把视角推进到多轮环境交互。后者归纳奖励、稳定性、探索、信用四个挑战。本课程用第 25–28 章分别补足其数学和工程前提，到本章再合并判断。

来源自述基于 47 篇论文，并给出论文数量、机构占比和影响力 Tier。但仓库并未提供足以复算所有统计的完整逐篇编码表，所列数值不能自动升级为领域普查。本课程保留方法路线和讨论问题，不把样本内的机构数量、主观权重或榜单位置当成全领域定论。

一次可解释的技术选型应该写出：观察到了哪个失败、候选方法改了哪个部件、预计改变哪个中间指标、用什么结果反驳自己。比如用记忆增强，不仅要预测成功率提高，还要检查检索是否减少重复失败、去掉提示后能力是否保留，以及错误记忆是否被持续放大。`,
    },
    {
      id: "example", type: "example", title: "最小例子：搜索 Agent 的两种成功",
      body: String.raw`设 100 个多跳搜索任务都要求答案和证据。方案 A 有 60 个答案正确，其中 54 个证据链完整；方案 B 有 68 个答案正确，其中只有 48 个证据链完整。若产品定义是“可追溯的研究助手”，主指标应是答案正确且证据完整的联合成功率，而不是单独正确率。A 是 54%，B 是 48%，结论与仅看答案时相反。

再假设 A 平均 8 次工具调用，B 平均 12 次。若每次调用平均成本一致，B 多用 50% 调用；但这仍不足以推导延迟增加 50%，因为并行调用、缓存和等待分布不同。必须分别测总调用成本与墙钟 p50/p95 延迟。不能用最大并行度代替实际任务加速。

如何诊断 B？若多余调用重复查同一页面，可评估 memory 或探索策略；若正确证据已经检索到，却在汇总时丢失，可查上下文管理；若回传结果被重新分词导致训练序列错位，先修 TITO；若优化只奖励答案，证据缺失首先是奖励设计问题。相同最终失败可以来自不同部件。

实验分成训练域、同域隐藏任务和跨域任务。训练轨迹的页面缓存、检索环境版本和答案真值应有快照，以免网页变化被误认成模型改进。换评估环境时明确版本，不把失效的外部页面直接算成模型推理错误。`,
    },
    {
      id: "diagram", type: "diagram", title: "三条路线与一个共同验收出口",
      body: String.raw`路线 A 从现有 PPO/GRPO 管线出发调整优势、裁剪、筛选与聚合，代表性研究包括 ARLArena/SAMPO。路线 B 重新设计反馈或更新问题，如 IGPO 的信息增益、SeeUPO 的逐轮更新视角。路线 C 改进任务、环境与记忆，如 EMPO²、ABE、Agent World Model、ASTRA。

三条路线不是互斥套餐。信息增益需要可靠答案和额外前向；记忆改变策略可见信息；环境合成改变训练分布，因此它们并非严格“与任何算法正交”。组合时要检查接口变化，而不是把各论文收益相加。

共同出口是同预算的独立评估：结果正确、证据完整、系统稳定、成本可控且跨任务可迁移。无法通过出口的方案可以保留为研究候选，但不应作为已完成的产品能力。`,
      diagram: {
        kind: "flow",
        nodes: ["观察任务失败", "A：修复优势/约束", "B：重建反馈/更新", "C：环境/数据/记忆", "控制变量与预算", "独立任务与成本评估", "保留、修正或放弃"],
        links: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 5], [5, 6]],
      },
    },
    {
      id: "derivation", type: "derivation", title: "联合成功、预算与可靠性的定义",
      body: String.raw`设第 $i$ 个任务的答案正确指示量为 $a_i$，证据完整指示量为 $e_i$，均为 0 或 1；测试任务数为 $N$。定义：

$$\mathrm{Success}_{\mathrm{joint}}=\frac1N\sum_{i=1}^N a_i e_i$$

只有两者同时成立才算成功。若另有“没有改写测试”“没有超出授权工具”等任务约束，应预先定义并加入判定，而不是看过结果再挑指标。

设第 $i$ 个任务工具调用数为 $u_i$、生成 token 数为 $t_i$、墙钟耗时为 $d_i$；每次调用价格为 $c_u$、每 token 价格为 $c_t$。教学成本模型为：

$$C_i=c_u u_i+c_t t_i,\qquad \overline C=\frac1N\sum_i C_i$$

它仅计算指定的调用与生成费用；训练成本还包括环境维护、教师、优化和通信。延迟用 $d_i$ 的分位数报告，不能把 $C_i$ 与 $d_i$ 混为一个量。

如果单次成功概率为 $p$，在独立同分布且允许验证选出成功候选的理想假设下，k 次至少一次成功概率为：

$$\mathrm{pass@}k=1-(1-p)^k$$

现实 Agent 轨迹可能共享搜索结果、缓存和随机环境，彼此相关，因此不能无条件套用。还要区分“存在一个正确候选”和“部署系统能识别那个候选”。验证器错误时，覆盖提升也可能无法转为可用质量。

比对候选时用第 24 章的成对统计，并按任务难度、步骤数、环境类型分层。平均成功率掩盖长尾任务失败时，先定位薄弱分桶再改训练分布。`,
    },
    {
      id: "math-training-objective", type: "derivation", title: "端到端目标：从终局判定到一次可复算更新",
      body: String.raw`**教学设定。** 有限、已完成的工具 episode，$\gamma=1$，任务来自固定分布，模型只根据历史生成决策 token。第 $i$ 条轨迹有 $H_i$ 轮，动作前历史为 $h_{i,t}$，该轮第 k 枚生成 token 记为 $y_{i,t,k}$。终局 $S_i=a_ie_iv_i\in\{0,1\}$，分别表示答案正确、证据完整、任务约束满足。第 $t$ 轮成本是调用数 $u_{i,t}$、生成 token 数 $n_{i,t}$，暂时固定非负乘子 $\lambda_u,\lambda_n$：

$$r_{i,t}=\mathbf1[t=H_i-1]S_i-\lambda_u u_{i,t}-\lambda_n n_{i,t},
\quad G_{i,t}=\sum_{k=t}^{H_i-1}r_{i,k},
\quad \widehat A_{i,t}=\operatorname{sg}(G_{i,t}-V_\phi(h_{i,t})).$$

回报 target 停止梯度；worker 截断要另加一致的 bootstrap，不能假装终局 $S_i=0$。有 critic 是本例的选择，不是 Agentic RL 的必要条件。

**先写未裁剪的原始梯度。** 对固定乘子的期望总奖励，在环境无参数依赖、on-policy 且动作前 baseline 合法时：

$$\nabla_\theta J_\lambda
=\mathbb E\sum_t(G_{i,t}-b(h_{i,t}))
\sum_{k=1}^{n_{i,t}}\nabla_\theta
\log\pi_\theta(y_{i,t,k}|h_{i,t},y_{i,t,<k}).$$

这里按 episode 对样本取均值，动作内 token score 求和；任意改成全 token 平均会重新加权不同长度 episode。为多次使用同一批旧数据，下面再定义一个 PPO 风格**局部 surrogate**，不把裁剪后的梯度冒充上式的精确等式。

设批大小为 $N$，展平位置 $j$ 的 actor mask 为 $m_{ij}$，历史为 $c_{ij}$，目标 token 为 $y_{ij}$，属于环境轮次 $t(j)$。行为策略为 $\mu$，必须记录实际采样概率。令 $r_{ij}^{\mathrm{upd}}=\pi_\theta(y_{ij}|c_{ij})/\mu(y_{ij}|c_{ij})$，则：

$$L_{\mathrm{actor}}=-\frac1N\sum_{i,j}m_{ij}
\min\left(r_{ij}^{\mathrm{upd}}\widehat A_{i,t(j)},
\operatorname{clip}(r_{ij}^{\mathrm{upd}},1-\epsilon,1+\epsilon)\widehat A_{i,t(j)}\right).$$

critic 在 $M$ 个有效环境决策起点计算 $L_V=(2M)^{-1}\sum_{i,t}(V_\phi(h_{i,t})-\operatorname{sg}G_{i,t})^2$。固定本批生成前缀集合 $\mathcal C$，令 $p_c=\pi_\theta(\cdot|c)$、$q_c=\pi_{\mathrm{ref}}(\cdot|c)$，用全词表分布定义：

$$K=\frac1{|\mathcal C|}\sum_{c\in\mathcal C}\sum_y p_c(y)\log\frac{p_c(y)}{q_c(y)},
\qquad H=-\frac1{|\mathcal C|}\sum_{c\in\mathcal C}\sum_y p_c(y)\log p_c(y)$$

$$L_{\mathrm{train}}=L_{\mathrm{actor}}+c_VL_V+\beta K-\alpha H.$$

要求 reference 覆盖 $p_c$ 的支持；它不是 behavior policy。$c_V,\beta,\alpha$ 控制不同单位和尺度。这里 KL/熵按**固定本批前缀**作局部正则，不声称已包含目标策略访问分布的完整梯度；本例 reward 中没有再次扣 KL，避免无说明地双重惩罚。

**一次完整手算。** 一条两轮轨迹，每轮只有一枚生成 token，另有任意数量 mask 为零的工具 token。终局成功为 1，两轮加权成本分别 0.2、0.1，故即时奖励 $[-0.2,0.9]$、回报 $[0.7,0.9]$。critic 预测 $[0.3,1.1]$，优势为 $[0.4,-0.2]$；ratio 为 $[1.1,0.7]$，$\epsilon=0.2$：

$$L_{\mathrm{actor}}=-[0.44+\min(-0.14,-0.16)]=-0.28,\qquad
L_V=\frac{0.4^2+(-0.2)^2}{4}=0.05.$$

另给本批测得 $K=0.02,H=0.6$，设 $c_V=0.5,\beta=0.1,\alpha=0.01$，则
$L_{\mathrm{train}}=-0.28+0.025+0.002-0.006=-0.259$。这些数是条件算例，不是训练超参建议；loss 更负也不能脱离采样分布比较能力。

**追问链：**reward 是否与产品成功一致？→ 哪些 token 参与 actor？→ A/target 哪条支路 detach？→ old、reference、当前策略是否分清？→ 哪些部分是原始目标、哪些是局部近似？`,
    },
    {
      id: "math-budget-lagrange", type: "derivation", title: "约束预算：为什么超支时乘子应上升",
      body: String.raw`**从约束而非拍权重开始。** 令 $U_i=\sum_tu_{i,t}$、$T_i=\sum_tn_{i,t}$，预算分别为 $B_u$ 次调用和 $B_n$ token。固定任务分布，期望约束问题为：

$$\max_\theta\ \mathbb E_\theta S
\quad\text{s.t.}\quad
\mathbb E_\theta U\le B_u,\quad \mathbb E_\theta T\le B_n.$$

对应拉格朗日函数与鞍点方向为：

$$\mathcal J(\theta,\lambda)=\mathbb E_\theta S
-\lambda_u(\mathbb E_\theta U-B_u)
-\lambda_n(\mathbb E_\theta T-B_n),\quad
\max_\theta\min_{\lambda\ge0}\mathcal J.$$

$\lambda_u$ 单位是成功分/调用，$\lambda_n$ 是成功分/token，不能直接把这两个系数大小相比较。对固定乘子更新策略时，$\lambda_uB_u+\lambda_nB_n$ 是参数无关常数，所以可以用前节的成本惩罚 reward；更新乘子时则不能丢掉预算项。

因为 $\partial\mathcal J/\partial\lambda_u=-(\mathbb EU-B_u)$，对乘子做梯度下降并投影到非负半轴，得到：

$$\lambda_u^+=\max(0,\lambda_u+\eta_u(\widehat{\mathbb EU}-B_u)),
\quad
\lambda_n^+=\max(0,\lambda_n+\eta_n(\widehat{\mathbb ET}-B_n)).$$

**数值。** 预算为 10 次、4000 token，批均值为成功 0.6、调用 12、token 3000，当前乘子为 0.02、0.00001：

$$\mathcal J=0.6-0.02(12-10)-0.00001(3000-4000)=0.57.$$

取 $\eta_u=0.005$、$\eta_n=10^{-8}$，则调用乘子上升到 0.03，token 乘子下降到 0。预算超支提高未来调用惩罚；低于预算则松绑。对固定均值做有限差分，两个乘子导数应分别为 -2 与 +1000，方向与更新一致。

在满足适用正则条件的最优解，互补松弛写作 $\lambda_u(\mathbb EU-B_u)=0$，token 同理：严格不紧的约束应对应零乘子。神经策略的非凸优化、有限样本与异步更新不保证找到全局鞍点；应监控真实约束违例和乘子振荡，不把该公式当成安全保证。

**平均约束不等于硬授权。** 两条 episode 分别调用 0、20 次，平均 10 次满足上式，但第二条超过逐任务 10 次上限。硬预算必须在环境执行层限制合法动作、剩余次数和终止，剩余预算进入状态。禁止的写操作也不能靠“给大负分”替代权限检查。

若产品要求 95% 的任务在 60 秒内结束，可以把尾部约束写成 $\Pr(D>60)\le0.05$，而不是仅限制平均延迟。超时和失败仍需进入统计分母；样本分位数有估计误差。训练的期望代价、推理硬限制、服务时延 SLO 是三种不同合同。

**追问链：**期望约束还是逐轨迹约束？→ 乘子单位？→ primal/dual 更新方向？→ 预算未满足是策略无解、估计噪声还是优化失败？`,
    },
    {
      id: "math-aggregate-evaluation", type: "derivation", title: "聚合评估：联合成功、配对不确定性与单位成本",
      body: String.raw`**先冻结分母和权重。** 所有预定任务均进入结果表，预算失败不能删掉。基础设施无效运行按预先约定重试或单列，并报告覆盖，不能事后只选成功完成的部分。80 个搜索题成功 72 个、20 个代码题成功 8 个，则：

$$\widehat p_{\mathrm{micro}}=\frac{72+8}{100}=0.8,\qquad
\widehat p_{\mathrm{macro}}=\frac12\left(\frac{72}{80}+\frac8{20}\right)=0.65.$$

micro 对任务等权，macro 对任务族等权；若目标部署混合各占一半，标准化加权分就是 0.65。二者回答的问题不同，不能看完结果再选择有利的聚合。

**54% 与 48% 的配对例子。** 沿用本章 100 个搜索任务，A 联合成功 54 个，B 48 个。仅有边际总数还不能作配对检验；补充同一批任务的结果：两者都成功 40，只有 A 成功 14，只有 B 成功 8，都失败 38。令 $d_i=S_{A,i}-S_{B,i}$：

$$\widehat\Delta=0.06,\qquad
\widehat{\mathrm{SE}}(\widehat\Delta)
=\sqrt{\frac{\sum_i(d_i-\bar d)^2}{N(N-1)}}
=\sqrt{\frac{22-100(0.06)^2}{100(99)}}\approx0.046753.$$

常态近似 95% 区间约为 $[-0.0316,0.1516]$，包含零；这是中等样本的近似区间，不是精确覆盖保证。对 22 个不一致任务，在两方向等概率的零假设下，双侧 exact McNemar 为：

$$p_{\mathrm{exact}}=
\min\left(1,\ 2\sum_{k=0}^{8}{22\choose k}2^{-22}\right)
\approx0.2863.$$

所以“样本多 6 个百分点”不等于已证明总体稳定优于 B。不能因未显著就反过来宣称两系统等价；等价检验需要预定容忍差与相应样本量。同一任务多 seed 的观测应按任务聚类或用配对层级 bootstrap，不能把相关 rollout 当独立题目。

**单系统区间。** 对独立 Bernoulli 任务的 54/100，用 Wilson 区间避免 Wald 在 0/1 附近退化。设 $\hat p=k/N,z=1.96$：

$$\mathrm{center}=\frac{\hat p+z^2/(2N)}{1+z^2/N},\quad
\mathrm{half}=\frac{z\sqrt{\hat p(1-\hat p)/N+z^2/(4N^2)}}{1+z^2/N}.$$

本例约为 $[0.4426,0.6344]$。N 必须大于零；0 次成功也不是成功概率已证明为零。Wilson 是模型假设下的近似区间，不为验证器错误或域偏移兜底。

**成本也要包含失败。** A 总调用 800 次、联合成功 54 个，B 总调用 1200 次、联合成功 48 个。每成功任务的总体摊销调用量分别为 $800/54\approx14.8148$、$1200/48=25$。这不是“只在成功样本里求平均调用数”，后者漏掉失败成本；成功数为零时该比值不可作为有限数报告。价格不一致时先换成真实费用，再与 p50/p95 延迟分别呈现。

**多次比较。** 三个预注册比较的 p 值为 0.01、0.04、0.20，Holm 在家族显著性 0.05 下按升序依次用 $0.05/3,0.05/2,0.05$；第一个通过，第二个不通过就停止，只有第一个可拒绝零假设。调参时反复看同一隐藏评测集也会泄漏，不能靠最后一次 p 值修复。

**追问链：**成功定义固定吗？→ 任务或任务族等权？→ 配对信息齐全吗？→ 重复和多重比较如何处理？→ 成本是否含失败与训练开销？`,
    },
    {
      id: "code", type: "code", title: "代码实验：给一次 Agent 评估定义可复算指标",
      body: String.raw`先记录原始任务结果，再汇总指标。下面的四条记录是教学数据；不使用模型自评总分代替可复核字段。预算失败也计入分母，避免只统计完成任务的幸存者偏差。

~~~python
from statistics import mean

results = [
    {"answer": 1, "evidence": 1, "calls": 8, "seconds": 30},
    {"answer": 1, "evidence": 0, "calls": 12, "seconds": 55},
    {"answer": 0, "evidence": 0, "calls": 20, "seconds": 90},
    {"answer": 1, "evidence": 1, "calls": 6, "seconds": 25},
]
answer_rate = mean(row["answer"] for row in results)
joint_rate = mean(row["answer"] * row["evidence"] for row in results)
print("answer rate:", answer_rate)
print("joint success:", joint_rate)
print("average tool calls:", mean(row["calls"] for row in results))
print("mean latency:", mean(row["seconds"] for row in results))
~~~

输出正确率为 0.75，联合成功率为 0.5，平均调用数为 11.5。生产评估还应保存 task ID、种子、模型和环境版本、token mask、错误码及证据路径；这里只用最少字段展示“先定义成功再汇总”的原则。`,
    },
    {
      id: "pitfall", type: "pitfall", title: "六条未来判断如何保留价值而不变成断言",
      body: String.raw`来源作者提出六条核心判断。本课程保留这些问题，同时明确它们是观点：

1. **信用分配最本质。** 可以通过终局、逐步和反事实反馈的成本收益对照检验；并非所有任务的首要瓶颈都是归因，有时环境根本不能稳定复现。
2. **SeeUPO 理论意义大于实践。** 应分别看定理假设和有限模型实验；理论保证不能推广为任意长时程神经网络训练的全局最优。
3. **EMPO² 式记忆可能带来方向性变化。** 检查无提示评估、跨任务迁移和错误 tips 的消融；标准 RL 参数更新本身也传递跨 episode 经验，不能说它“完全不记得”。
4. **工程和数据是壁垒。** 对新场景做成本拆解和控制变量，不能靠不同基准上的提升数字证明算法贡献逐年下降。
5. **Agentic RL 可能出现新的能力跃迁。** 必须定义可观察行为和独立任务，不用类比某个历史模型发布来替代测量。
6. **环境构建被低估。** 测真实与合成环境的转移差、验证覆盖和维护成本，数量再大也不保证逼真。

短期候选是更稳的异步训练、可复现环境和标准评估；中期候选是课程生成、记忆内化和多域混合；长期候选是世界模型、自博弈、多 Agent 协作和统一优化。2027 等年份只能标为来源作者的预测，不是项目保证的时间表。

产业观察同样要克制。GLM-5、Kimi K2 等报告公开了部分 Agent 训练细节；商业代码助手是否使用某个特定 RL 配方，应以该产品公开资料为准。产品知名度、GitHub stars 和机构背书都不能替代算法有效性证据。`,
    },
    {
      id: "comparison", type: "comparison", title: "按失败位置检索方法与工程路线",
      body: String.raw`| 观察到的问题 | 候选方法或系统 | 先验证什么 |
|---|---|---|
| 稀疏反馈、任务质量多个维度 | IGPO、CM2、过程/结果奖励 | 答案信号、rubric 可靠性与目标错配 |
| 负优势更新失稳、旧样本方差大 | ARLArena/SAMPO、VCPO、PPO/VAPO | ratio 尾部、有效样本量、价值误差 |
| 多轮策略相互依赖 | SeeUPO | 更新假设、共享参数影响、有限预算收益 |
| 弱策略反复失败 | EMPO²、LUFFY、课程与示范 | 外部提示可得性、策略分布变化和去提示迁移 |
| 终局成功掩盖坏步骤 | GiGPO、ELPO、ProxMO、VinePPO | 状态可比性、续采样成本、归因不确定性 |
| 长轨迹等待、重复前缀计算 | Partial Rollout、slime、Forge | 尾延迟、策略版本、恢复状态与有效吞吐 |
| 数据无法规模化 | ABE、Agent World Model、ASTRA、GEM | 环境执行正确性与真实任务迁移 |
| MoE/稀疏注意力训推不一致 | Routing Replay、TITO、IcePop | token、路径、精度、行为 log-prob 的对应 |
| 多阶段能力退化 | 数据混合、Cross-Stage OPD | 各教师领域评估、遗忘与新增能力的平衡 |

这是索引表，定义与公式要回到第 20、26–28 章。GMPO、ProRL、OTB 等方法也不能仅凭名字归为同一“稳定性补丁”：每个改变的权重、baseline 或训练配方不同。

开源生态可按算法实现、rollout 引擎、环境和评估工具四层理解。verl、OpenRLHF、slime 等提供训练编排，但可复现性还依赖数据、版本、资源与评估约定。工程尽调应检查依赖、许可证、是否有可运行例子、是否公开配置，以及小规模 canary 能否复现同类现象，而不是只数星标。

主观 Tier 排名可作为作者阅读偏好，但本课程不沿用“机构背书占 15%”来评定教学重要性。优先学习与你的失败模式直接相关、可验证且代价可承受的工作。`,
    },
    {
      id: "interview", type: "interview", title: "综合答辩：设计一个研究助手的训练方案",
      body: String.raw`**30 秒回答：**“先把研究任务定义成可重放的工具环境，记录问题、观测、动作和证据。用少量可靠轨迹建立格式，再建立终局奖励的简单 RL baseline。按失败分桶决定是否加入更细奖励、记忆或信用分配，同时保证 token 与策略版本一致。用独立任务的答案和证据联合成功率、工具成本和尾延迟选 checkpoint。”

追问一：Agentic RL 与聊天 RL 最大差别？动作会改变外部状态，下一轮可见信息由交互决定，训练数据是多轮轨迹；RL 理论本就支持多步决策，改变的是模型、环境与估计器的具体困难。

追问二：最终成功能否奖励每一步？整体回报可以构成策略梯度信号，但不能证明每一步都必要；应区分可用的统计估计和精确因果解释。

追问三：为什么冻结子 Agent？让编排器面对相对稳定的子任务执行环境，降低同时更新造成的非平稳性；是否优于联合训练需按任务验证。

追问四：异步为什么危险？样本可能来自多个较旧版本，延迟不是唯一问题；需要行为 log-prob、freshness、过滤与对照检查。

追问五：组采样全错怎么办？先查评估环境和格式，再补课程、示范或探索；只增大学习率无法制造方向信息。

追问六：如何评价一个“提升 128%”的结果？先确认相对提升还是百分点、基线大小、任务和资源；特定 benchmark 的提升不能推广到所有 Agent。

追问七：如何读一篇新论文？写出失败假设、改动部件、理论前提、主要对照、成本与失败案例，最后决定能否在自己的环境里跑一个有解释力的小实验。

毕业练习：任选搜索、代码修复或终端任务，提交一页任务定义、一条可手算轨迹、一张算法选择表和一套带独立验证的实验协议。能说明“什么证据会让我放弃当前方案”，才算真正掌握方法选择。`,
    },
    {
      id: "quiz", type: "quiz", title: "最终自测：从懂名词到可验证方案",
      body: "把判断落到可测量对象，避免仅回答算法缩写。",
      questions: [
        { q: "正确率 68%、证据完整且正确 48%，研究助手主指标如何选择？", a: "按预先定义的需求报告联合成功率 48%，并保留答案正确率作辅助指标。" },
        { q: "没有完整论文编码表，能否把来源的机构占比当领域统计？", a: "不能独立复算，只能标为该来源自述；不宜推广为领域普查或影响力事实。" },
        { q: "为什么三条路线不能把论文提升直接相加？", a: "它们可能改变同一分布或估计器，收益有交互；需组合消融并统一起点与预算。" },
        { q: "Agent Swarm 并行度更高就一定延迟更低吗？", a: "不一定，子任务依赖、调度开销、排队和返回长度都会影响关键路径。" },
        { q: "跨 episode 的记忆与 RL 参数学习有什么区别？", a: "前者显式储存并检索经验，后者通过参数更新积累经验；二者可互补，外部 tips 还要检查信息泄漏和去提示迁移。" },
      ],
    },
    {
      id: "whiteboard", type: "quiz", title: "毕业白板：训练目标、预算与统计答辩",
      body: "要求从假设写到数值结论，再说出一个能否定方案的观察。不用论文名称代替推导。",
      questions: [
        {
          q: "两轮轨迹奖励为 [-0.2,0.9]、γ=1，critic 为 [0.3,1.1]，每轮一个受训 token，ratio 为 [1.1,0.7]，ε=0.2。写回报、优势、actor/critic loss；再加入 cV=0.5、β=0.1、α=0.01、KL=0.02、熵=0.6。",
          a: String.raw`回报为 $[0.7,0.9]$，detached 优势为 $[0.4,-0.2]$。单 episode 的 actor 为 $-[\min(0.44,0.44)+\min(-0.14,-0.16)]=-0.28$；半均方 critic loss 为 $(0.16+0.04)/4=0.05$。总 loss 为 $-0.28+0.5(0.05)+0.1(0.02)-0.01(0.6)=-0.259$。工具 token 只作上下文，不加入 actor 分母或求和。**得分点：**回报起点、负优势 min 分支、detach、正则符号、聚合单位。追问：局部 PPO/固定前缀 KL 不是完整 on-policy 轨迹梯度的恒等替换。`,
        },
        {
          q: "预算为平均 10 次调用、4000 token，观测均值为 12 次、3000 token，成功率 0.6；乘子为 0.02、10^-5，步长为 0.005、10^-8。求拉格朗日值和乘子更新，并反驳“平均预算保证每条不超支”。",
          a: String.raw`$\mathcal J=0.6-0.02(2)-10^{-5}(-1000)=0.57$。乘子最小化的投影更新为 $\lambda^+=\max(0,\lambda+\eta(\bar C-B))$，故新乘子为 0.03、0。调用超支应增大惩罚。两条调用数为 0、20，平均 10，但第二条违反逐条 10 次上限；硬限制要由执行层实施并将剩余预算写入状态。**得分点：**max/min 方向、预算常数、单位、硬约束反例。追问：p95 时延不是平均调用数约束。`,
        },
        {
          q: "同一百题 A/B 都成功 40、仅 A 成功 14、仅 B 成功 8、都失败 38。求成功率差、配对标准误和 exact McNemar 的表达式；能否宣布 A 稳定优胜？",
          a: String.raw`A 为 54%，B 为 48%，差 0.06。$d_i$ 的平方和为 22，配对标准误是 $\sqrt{(22-100(0.06)^2)/(100\cdot99)}\approx0.046753$。近似区间 $0.06\pm1.96\mathrm{SE}$ 包含零；exact McNemar 为 $2\sum_{k=0}^{8}{22\choose k}/2^{22}\approx0.2863$。不足以宣布稳定优胜，也不足以证明等价。**得分点：**配对而非独立两比例、只用不一致对检验、区间和结论边界。追问：多 seed 需任务级聚类，多候选需控制多重比较。`,
        },
        {
          q: "搜索 80 题成功 72，代码 20 题成功 8，求 micro 与 macro。另一评估中 A 用 800 次调用成功 54 个，B 用 1200 次成功 48 个，比较摊销成本；主指标怎样避免事后选择？",
          a: String.raw`micro 为 80/100=0.8，任务族 macro 为 $(0.9+0.4)/2=0.65$。摊销调用量 A 为 800/54≈14.8148，B 为 25，均含失败轨迹花费。预先冻结部署任务混合、联合成功规则、总预算和尾延迟指标；不能因某个聚合更高就替换主指标。**得分点：**权重含义、成本分母、失败计入、预注册。追问：无成功时成本比值未定义，不能删除该系统；应同时报告成功数和总成本。`,
        },
      ],
    },
  ],
  sources: [
    { label: "Agentic RL 全景与作者预测（固定源版本）", url: "https://github.com/XavierZhang2002/agentic-rl-analysis/tree/66ae4423b36270ef50a288fb1bb2e1b31c46c329/docs/agentic-rl", evidence: "二级综述与作者观点；统计样本不可完整复算时不外推" },
    { label: "GLM-5", url: "https://arxiv.org/abs/2602.15763", evidence: "公开 Agent 训练系统实例，受报告任务与版本约束" },
    { label: "Kimi K2", url: "https://arxiv.org/abs/2507.20534", evidence: "工具数据合成与 Agent 训练技术报告" },
    { label: "Evaluating Large Language Models Trained on Code", url: "https://arxiv.org/abs/2107.03374", evidence: "pass@k 指标的经典来源；Agent 场景需另外说明相关性和验证机制" },
    { label: "verl", url: "https://github.com/volcengine/verl", evidence: "开源训练系统入口，不代表已复现任意论文成绩" },
    { label: "OpenRLHF", url: "https://github.com/OpenRLHF/OpenRLHF", evidence: "开源训练框架入口" },
    { label: "slime", url: "https://github.com/THUDM/slime", evidence: "rollout 与训练编排系统入口" },
  ],
};

export default chapter;
