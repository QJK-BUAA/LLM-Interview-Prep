const reportNotes = String.raw`## DeepSeek-V3 与 R1：通用能力和推理探索不是同一个问题

DeepSeek-V3 的后训练包含 SFT 与 GRPO。数学、代码等可验证任务能用规则奖励，开放问答还需要模型反馈。它先培养领域专家，让专家生成训练数据，并兼顾正确率与输出长度，再把能力转移给通用模型。因此，“V3 只抄一个 R1 老师、没有自己的专家训练”不是报告描述。

来源还强调 Self-Rewarding 与 Multi-Token Prediction（MTP）。前者提醒我们模型也能参与回答判分，但 judge 的表现不能证明训练反馈完全客观或无需人类数据。MTP 是预测多个未来 token 的辅助训练目标，V3 的预测模块还可用于投机解码：先提出候选，再由主模型验证接受，从而减少串行调用。它属于训练表示与推理效率设计，不能算成 GRPO 的奖励改进；实际接受率和加速取决于模型、任务与部署。

DeepSeek-R1-Zero 直接从已经预训练的 V3-Base 做推理 RL，主要依赖可验证反馈。这里的 Zero 指没有先做那一轮冷启动 SFT，不是从随机参数学会语言。作者观察到检查、回溯等行为，同时也发现可读性与语言混杂问题；观察到行为变化，不等于证明 RL 可以无条件创造任何新知识。

R1 报告也记录了过程奖励模型（PRM）和蒙特卡洛树搜索（MCTS）的未成功尝试。PRM 难在中间步骤定义、标签质量、策略分布变化与评分漏洞；MCTS 在语言空间还面对分支数和价值估计成本。这些负面经验值得用来设计对照，却不是“PRM 永远无用”或“树搜索不可能用于语言模型”的结论。推理时 reranking 与训练时持续优化同一个过程评分器也不是同一场景。

正式 R1 用四步解决这些问题：少量高质量长思维链做冷启动 SFT；推理 RL 扩展能力；拒绝采样筛出推理轨迹，并混入非推理数据再做 SFT；最后进行兼顾推理、帮助性与安全的 RL。学生模型的 R1-Distill 则用约 800k 样本做 SFT，不能把教师的全部 RL 成本和算法直接写到每个学生身上。报告中 R1 的 AIME 2024 pass@1 为 79.8，表中 V3 为 39.2；后者不是 V3-Base。

## DeepSeek-V3.2：专家先学，再用混合 RL 协调

V3.2 主流程是 specialist distillation 与 mixed RL：八类领域的专家提供训练数据，通用模型学习后，再在推理、Agent 和一般任务的混合分布上优化。专家蒸馏是迁移输出能力，不是直接平均专家参数。混合 RL 要防止数学奖励提高时，写作或工具能力反而退化。

Speciale 是偏向推理的实验变体，使用仅推理数据和较弱长度惩罚，不是标准 V3.2 必经的第三阶段。报告 Table 3 的 AIME 2025 pass@1：V3.2 Thinking 为 93.1、平均约 16k 输出 token；Speciale 为 96.0、约 23k。更高分同时使用了更长输出，不能把差异全部归功于一种优化器；竞赛的 Speciale 结果也不能搬给通用版本。

它还暴露了规模化 RL 的概率一致性问题：Keep Routing 保存采样时的 MoE 专家路径；Keep Sampling Mask 保存 top-p/top-k 的采样掩码，使概率比较具有一致的动作支持集；配合 KL 估计修正与异常轨迹过滤。即使使用序列级目标，也不会自动消除这些工程差异。

## Qwen2.5：先整理偏好，再把在线计算花到有区分度的题上

专家能提供什么数据之外，另一个选择是把生成预算花在哪些题上。Qwen2.5 的报告包含超过百万 SFT 样本、约 150k 离线 DPO 偏好对，以及在线 GRPO。SFT 建立任务与格式覆盖，DPO 消化已有偏好，GRPO 用当前模型的回答继续获取反馈。在线阶段优先选择响应奖励方差较大的查询，因为同一题出现好坏不同的回答时，组相对学习更容易获得方向。

奖励标注考虑真实、帮助、简洁、相关、无害和去偏等标准，但六个标准不等于公开证明 RM 有六个输出头。长上下文能力涉及预训练、SFT 及不同型号的专门配置，不能把所有 Qwen2.5 型号画成“GRPO 后统一再做一次 128K 微调”。

## Qwen3 与 Qwen3.5：从会思考到知道何时思考、如何行动

Qwen3 的四阶段为长 CoT 冷启动、推理 RL、思考模式融合 SFT、通用 RL。模式融合不是删掉推理能力，而是让一个模型兼容 thinking 与 non-thinking，并能在用户给定思考预算、停止思考指令等条件下作答。最后的通用 RL 还需照顾遵循指令、格式与偏好，不能只看数学验证器。

报告用 3,995 个 query-verifier 对开展 Qwen3-235B-A22B 的 reasoning RL，在 170 步中将该阶段 AIME 2024 从 70.1 提高到 85.1。一个查询可以被重复生成很多次，所以“只有几千题”不等于“只有几千次前向”。小模型的 strong-to-weak distillation 结合离线输出蒸馏和 on-policy 教师分布监督；报告中约十分之一 GPU-hours 是相对完整四阶段方法的特定设置，不是所有蒸馏都能省九成成本。

Qwen3.5 首发 397B-A17B 是原生视觉语言模型，结合 Gated Delta Networks 线性注意力与稀疏 MoE，官方发布介绍了多模态、多轮 Agent RL。**本章这部分依据官方博客，公开信息有限。** 架构说明不能证明具体 checkpoint 一定使用 GSPO、SAPO 或某种 critic；托管服务的窗口配置也不能套给全部开权重版本。GSPO 与 SAPO 有各自原论文，应作为独立方法阅读，不能因出自同一团队就补全所有产品的训练配方。

## DAPO 与 VAPO：同样做长推理，不同的信用分配选择

阶段与题库确定后，再回到第 20 章的更新层面，观察长回答如何得到稳定反馈。DAPO 是 Decoupled Clip and Dynamic sAmpling Policy Optimization。四项核心改动是提高上裁剪界的 Clip-Higher、动态采样、token 级损失归一化和超长奖励塑形。动态采样移除组内奖励全同、相对优势为零的组，再补充有效组；token 归一化改变长短回答在梯度中的权重；软长度惩罚减轻在截断边界突然扣分带来的噪声，不是验证器认定未完成答案“部分正确”。

报告以 Qwen2.5-32B Base 达到 AIME 2024 的 50 分，评测为重复 32 次的 avg@32，温度 1.0、top-p 0.7。它不是 best-of-32，更不能直接与使用另一底座、预算或选答规则的数字排名。

VAPO 是 Value-model-based Augmented Proximal Policy Optimization，选择引入价值模型估计未来回报。奖励模型判断已生成回答的质量，critic 预测当前前缀继续生成能得到多少回报，两者目标不同。VAPO 冻结初始策略采样，以 Monte Carlo return 校准 critic，再使用解耦 GAE、长度自适应 GAE、正例 NLL 和 DAPO 类技术。当前报告摘要的 Qwen2.5-32B AIME 2024 为 60.4。这个未用 SFT 的实验支持该设置下的有效性，不证明 actor-critic 在所有规模都胜出。

## Seed1.5-Thinking：反馈与流式系统一起设计

Seed1.5-Thinking 最终模型为 200B 总参数、20B 激活参数，报告 AIME 2024 为 86.7。它区分可验证任务的 verifier、需要推理判断的 thinking verifier，以及通用偏好的成对生成式 RM；不同任务不能机械共用一种评分器。动态调整数据分布、流式 rollout 和价值模型校准共同服务于长推理训练，慢样本、奖励延迟与数据难度都会影响训练吞吐和稳定性。

理解消融要先认清底座：报告的 DAPO 73%、VAPO 79% 来自有限步数的 Seed-150B-MoE 消融，不是最终 200B 模型的两种训练结果。RFT 提前饱和的实验也不意味着拒绝采样永远有害，因为同一报告的冷启动数据构造本身就使用拒绝采样。初始化、使用阶段和后续探索空间是不同变量。

## Seed-Coder 与 Seed2.0：数据工程和产品演进不能混写

Seed-Coder 的 8B Base、Instruct、Reasoning 面向不同使用方式。模型参与代码质量打分和筛选，同时仍有去重、语法过滤等数据工程；“模型自选数据”不代表无需质量控制。Instruct 采用 SFT+DPO，Reasoning 采用长 CoT GRPO，并吸收提高上裁剪、超长过滤、token-wise loss 等 DAPO 类技术。报告不是用 Seed-Coder 验证 VAPO，也不能从它移除 KL 的设置推导所有通用助手都该去掉 KL。

Seed2.0 官方发布包含 Pro、Lite、Mini 与 Code，强调复杂指令、多模态和长程 Agent 任务。2026 年 6 月底已有公开模型卡，因此截至本章核验日不能再说“没有公开论文”。本章核对了官方发布和模型卡摘要、元数据，未据此声称掌握完整后训练方案。产品能力、模型卡结果与可复现训练细节是三种信息层级，不据型号延续猜测它必然沿用 VAPO。

阅读这些报告时，先确定训练阶段与反馈，再决定数据和信用分配，最后核对计算账本；各模型的数字保留原报告的版本、预算和评测条件。`;

const chapter = {
  id: "22",
  slug: "industrial-deepseek-qwen-seed",
  part: "LLM 后训练",
  title: "工业案例 I：DeepSeek、Qwen 与 Seed",
  subtitle: "把模型发布读成任务、数据、反馈与计算预算的工程选择",
  level: "进阶",
  duration: 180,
  prerequisites: ["16", "17", "18", "19", "20", "21"],
  tags: [
    "DeepSeek-R1", "DeepSeek-V3", "DeepSeek-V3.2", "Qwen2.5", "Qwen3",
    "Qwen3.5", "DAPO", "VAPO", "Seed1.5-Thinking", "Seed2.0", "Seed-Coder",
  ],
  objectives: [
    "从一份报告中找出任务、训练阶段、数据、反馈与预算",
    "手算查询方差，说明筛选题目改变了什么",
    "将题目数量换算成生成量，不把两者混为一谈",
    "选择一个模型案例，解释其阶段分工与证据边界",
    "识别跨版本、评测设置和成本分母的错误比较",
  ],
  summary:
    "工业后训练不是把 PPO 换成某个新缩写。DeepSeek 展示探索与蒸馏的分工，Qwen 展示查询筛选、模式融合与大小模型迁移，Seed 展示长序列奖励、价值校准和数据工程。只有同时核对训练阶段、评测预算与公开证据，模型之间的比较才有意义。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "读完模型报告，能为自己的任务做什么决定？",
      body: String.raw`你要把通用模型训练成解题助手，已有示范、题目和测试。预算只够做一轮小实验：应该增加示范、增加模型尝试，还是把尝试机会换到更有区分度的题上？第 21 章已经解释数据怎么验收，现在用工业案例学习怎样安排这些步骤。

先不要记每个版本的分数。读一份报告，只提取六项：任务是什么、分几个训练阶段、谁生成数据、谁给反馈、花了哪些计算、用什么评估证明收益。缺失的项目记为未披露，不能根据产品名补猜。

下面先比较三道题的四次试答，检验“优先选奖励有差异的题”这条规则，再把题库大小换算成生成 token。算清这两个量后，从后面的 DeepSeek、Qwen 或 Seed 案例选一个对照阅读。其余版本的详细资料保留在对比部分，供具体用到时查询。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：把采样预算花在哪些题上",
      body: String.raw`训练池中有三类题：一类模型几乎总能答对，一类几乎总失败，另一类在多次尝试中有好有坏。组相对训练最容易从第三类题获得方向，因为候选之间存在可比较差异。

这不等于永远丢弃全对或全错题：

| 题目状态 | 可能含义 | 下一步 |
|---|---|---|
| 全对 | 已掌握，也可能验证器过宽 | 保留回归评估，抽查反馈 |
| 全错 | 太难、格式错误或环境故障 | 分解失败原因，补课程或监督 |
| 有对有错 | 当前有相对学习信号 | 优先用于组比较 |

奖励方差只能说明当前候选有差异。验证器不稳定也会制造高方差，因此必须先校验反馈，再结合领域配额和保留集表现采样。

报告中的“查询数量”也不是完整计算账单。一道题可能产生多条 rollout，多轮训练会重复采样，还要计入训练反向、教师或奖励模型、工具环境和被丢弃的无效组。

阅读工业报告时，应把任务数、生成 token、优化计算和硬件时间分别记账。某个阶段占报告表内成本很小，也不能据此推断全部研发便宜，更不能搬到另一模型或另一训练流程。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：把工业阶段翻译成可计算的训练合同",
      body: String.raw`三组查询已经让报告中的“高方差筛选”变成一次可计算的选择。接下来先把查询优势、领域奖励和成本分项写清楚，再展开领域分母：同样写着各占一半，平铺 token 与先按域平均可能训练出不同侧重。

随后检查蒸馏箭头传递的究竟是筛选后轨迹、模式条件，还是学生前缀上的教师分布；不同监督决定了不同梯度，也决定最后一节的教师查询与拒绝采样费用。相关公式可回看第 16–20 章，筛选概率可回看第 21 章。这里的计算用于解释公开阶段，不补猜未披露的权重、学习率或训练步数；完成后，第 23 章再把工具环境和异步调度接入同一本账。`,
      links: [
        { label: "查询信号、混合目标与成本口径", sectionId: "derivation", level: "必会" },
        { label: "领域与长度归一化", sectionId: "math-domain-normalization", level: "推导" },
        { label: "专家蒸馏与模式融合目标", sectionId: "math-distillation-pipeline", level: "推导" },
        { label: "完整生成与训练预算", sectionId: "math-pipeline-budget", level: "进阶" },
        { label: "工业方案白板题", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "图解：主模型与高预算变体是分支，不是流水线末级",
      body: String.raw`下图是 V3.2 报告中两种配置的概念关系，不声称二者逐步共享相同 checkpoint。标准路线用专家蒸馏获得多领域能力，再由 mixed RL 协调；Speciale 路线把数据与长度约束向高预算推理倾斜。不能把箭头画成“通用版再必须变成 Speciale”，否则学生会误以为所有用户请求都要支付长推理成本。

同样地，R1 教师与 R1-Distill 学生是能力迁移关系，不是每个学生重复教师全部训练；Qwen3 的模式融合则是在同一模型内支持不同推理预算。读 pipeline 时先问箭头传递的是参数、训练数据、教师概率还是环境反馈，这四种边有不同成本和统计含义。

这一图也提示实验设计：要证明专家蒸馏有效，应固定底座和后续预算；要证明长度约束有效，应报告准确率与输出长度的共同变化。只展示最后一个模型名称无法回答这些问题。`,
      diagram: {
        kind: "flow",
        nodes: [
          "V3.2 报告：两种配置",
          "标准：专家蒸馏",
          "标准：混合领域 RL",
          "V3.2 通用版",
          "分支：仅推理 RL、较弱长度惩罚",
          "Speciale 高预算变体",
        ],
        links: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5]],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "数学视角：查询信号、任务混合与成本分母",
      body: String.raw`${reportNotes}

---

要给开场的通用助手安排下一轮训练，先要从多组查询里构造学习信号，再把数学、代码与一般任务放进同一个目标，最后确认预算分母。本节输出三种不能混用的量：单题的相对优势、多领域的期望奖励，以及完整训练的成本份额；后面的专题分别细化它们。

设问题为 $q$，同题采样数为 $G$，第 $i$ 个回答奖励为 $r_i$。定义组均值 $\bar r$、总体方差 $v(q)$、稳定常数 $\epsilon>0$ 与标准化优势 $\hat A_i$：

$$\bar r=\frac1G\sum_{i=1}^{G}r_i,\qquad
v(q)=\frac1G\sum_{i=1}^{G}(r_i-\bar r)^2,\qquad
\hat A_i=\frac{r_i-\bar r}{\sqrt{v(q)}+\epsilon}.$$

先减均值，是为了判断哪条回答比同组更好；再除标准差，是把差异缩放到组内尺度。代入 B 的奖励 $[0,0,0,1]$，方差为 0.1875，忽略稳定项的优势为约 $[-0.577,-0.577,-0.577,1.732]$。方差筛选选择当前策略能产生差异反馈的查询；DAPO 的动态采样进一步处理组内奖励全同的情况。两者都依赖采样估计，不等于知道题目的真实学习价值。只用四次采样估计难度，置信度可能很低。

单题优势有了方向，却没有决定数学和一般任务谁占更多训练资源。对于混合任务，令领域编号为 $d$，共 $D$ 个领域；$w_d$ 为非负任务权重，且总和为 1；$\mathcal D_d$ 为该领域的问题分布；$y$ 为策略 $\pi_\theta$ 在问题 $x$ 上生成的回答；$\theta$ 为可训练参数。一个用于理解配比的教学目标是：

$$J(\theta)=\sum_{d=1}^{D}w_d\,
\mathbb E_{x\sim\mathcal D_d,\ y\sim\pi_\theta(\cdot\mid x)}
[R_d(x,y)].$$

$R_d$ 是领域奖励，不要求不同领域共用同一 judge。若数学、代码、通用三域权重为 $[0.6,0.3,0.1]$，平均奖励为 $[0.8,0.5,0.9]$，加权值为 $0.6\times0.8+0.3\times0.5+0.1\times0.9=0.72$。这只是可计算的目标示例，不是任一公司的公开权重。

若数学每条生成 10k token、通用每条只有 1k，按轨迹平均和按 token 平均会得到不同的实际梯度权重。因此“配比 60%”必须说明按问题、轨迹、token 还是消耗的计算计数。奖励尺度、长度归一化和 batch 拼接规则也会改变优化效果，不能只检查采样器的百分比。

目标权重确定后，仍不能由查询数或优化步数直接推算预算，因为每条数据经历生成、判分和训练。再令 $C$ 表示统一口径的计算成本，可用 GPU-hours 或货币，但同一式中不可混用单位。教学性分项账本为：

$$C_{\mathrm{total}}=
C_{\mathrm{rollout}}+C_{\mathrm{actor}}+
C_{\mathrm{critic}}+C_{\mathrm{judge}}+
C_{\mathrm{teacher}}+C_{\mathrm{environment}}+
C_{\mathrm{overhead}}.$$

各项分别是生成、策略训练、价值模型、奖励判分、蒸馏教师、工具环境，以及通信、调度和空闲开销；同一项工作只能计入一个桶。没有 critic 时对应项可为零，但判分、生成和等待不会随之消失。actor-critic 多多少成本取决于模型大小、共享方式、序列长度和并行配置，不存在通用“固定多 25% 显存”的结论。

若 $C_{\mathrm{post}}$ 是后训练成本，$C_{\mathrm{pre}}$ 是预训练成本，则 $C_{\mathrm{post}}/C_{\mathrm{pre}}$ 与 $C_{\mathrm{post}}/C_{\mathrm{total}}$ 是不同占比。V3.2 报告后训练计算预算超过预训练成本的 10%，只能作为该报告口径下的投入观察，不能与 V3 的合计占比直接拼成严格的投资回报曲线。

因此，B 中成功回答的 1.732 说明它比同组更好，混合奖励 0.72 说明给定域权重下的平均目标，V3 表内约 0.179% 只说明一项成本占比。训练实现首先要把 0.72 背后的领域权重真正落到 loss 分母，下一节就检查这一步；不能由这些量反推任何厂商未披露的配方。`,
    },
    {
      id: "math-domain-normalization",
      type: "derivation",
      title: "领域配比落到 loss：专家蒸馏与 mixed RL 的分母",
      body: String.raw`假设我们为多领域助手各取一条数学和代码示范，前者长 1000 token，后者长 4000 token，并希望两域各占一半目标权重。把它们直接拼接后平均，会不会实现这个要求？本节算出两种 loss 与每个 token 的反传系数，再把同样的计量问题迁移到混合强化学习。

V3.2 披露专家蒸馏后 mixed RL，R1 披露推理 RS 与通用数据混合 SFT，Seed1.5 披露分任务反馈。它们都要求区分“抽到哪些域”和“这些域实际贡献多少梯度”；下面的两域配置是教学输入，报告没有公开的域权重不能从总分反推。

**符号与维度。** 批次中 $d_i\in\{1,\ldots,D\}$ 标记第 $i$ 条回答所属域；$m_{it}$ 为动作 mask，$T_i=\sum_tm_{it}>0$，$N_d=\sum_{i:d_i=d}T_i$。$w\in\mathbb R^D$ 是非负且和为 1 的目标域权重。$s_{it}$ 是输入与此前 token 组成的前缀，$y_{it}$ 是目标 token，$\pi_\theta$ 是当前模型；SFT token 损失 $\ell_{it}=-\log\pi_\theta(y_{it}|s_{it})$ 是标量。

**第一步：写出控制域权重的目标。** 若希望每个域先按自己的有效 token 平均，再按 $w$ 混合，应使用

$$L_{\mathrm{domain}}=\sum_{d=1}^D w_d
\frac{\sum_{i:d_i=d}\sum_t m_{it}\ell_{it}}{N_d}.$$

假设每个 $w_d>0$ 的域都有 $N_d>0$；空域不能除零，应通过分层批次或跨批累积满足配额。设某位置词表 logits $z\in\mathbb R^V$、$p=\operatorname{softmax}(z)$、目标 one-hot 向量 $e_y$，由 $\partial(-\log p_y)/\partial z=p-e_y$ 得

$$\nabla_z L_{\mathrm{domain}}=\frac{w_{d_i}m_{it}}{N_{d_i}}(p-e_y).$$

这明确了数据管道的权重如何落到反传，不是配置里写了 $w$ 就自动成立。

**第二步：找出平铺 token 的隐式域权重。** 上式能显式控制域权重，但常见的拼接实现只除以总 token 数。将平铺和式按域重新分组，记 $\bar\ell_d$ 为域内平均损失，就能读出它隐含的权重：

$$L_{\mathrm{flat}}=\sum_d\frac{N_d}{N}\bar\ell_d,\qquad N=\sum_dN_d.$$

按样本概率 $q_d$ 采样、均长为 $\bar T_d$ 的大批次，其域 token 比例趋向 $q_d\bar T_d/\sum_jq_j\bar T_j$。教学例中数学、代码各一条，长 1000、4000，各自平均 NLL 为 1、3。等域目标为 2；平铺目标为 $(1000+12000)/5000=2.6$。等域时每个数学 token 系数 $0.5/1000$，代码为 $0.5/4000$，相差四倍；平铺时都为 $1/5000$。

**第三步：迁移到混合 RL。** 当监督从固定答案改成轨迹奖励时，域权重仍需显式保留，但不能直接照搬 SFT 的平均 NLL。若 $J=\sum_dw_d\mathbb E[R_d]$，在固定任务分布、可交换求导等条件下，使用第 15 章的 score-function 恒等式，并把序列 log probability 展开为 token 和，得到：

$$\nabla_\theta J=\sum_dw_d\,
\mathbb E\!\left[(R_d-b_d(x))\sum_t\nabla_\theta\log\pi_\theta(y_t|s_t)\right].$$

$b_d(x)$ 不依赖采样动作。这里是完整回报目标的 score-function 梯度；实际 PPO/GRPO 的 clipping、优势标准化及 token/sequence 平均是进一步的 surrogate 选择。若给每条轨迹再除以长度，不应继续无条件称为上述目标的同一个梯度。

**手算与追问。** $w=[0.6,0.3,0.1]$、域平均奖励 $[0.8,0.5,0.9]$ 给出 0.72；若只把代码域奖励扩大十倍，目标变为 $0.48+1.5+0.09=2.07$，采样权重虽不变，优化尺度已变。是否做分域标准化、保留什么长度惩罚、怎样验收通用能力，都应写入实验合同。这个教学目标用于解释报告中的 mixed RL，不代表上述模型采用同一权重或同一归一化。

开场要求的等域目标应是 2，不是平铺后的 2.6；数学 token 的单项权重要达到代码的四倍，才能抵消四倍长度差。下一步先确认每条示范究竟来自教师输出还是教师分布，因为确定了分母，还没有确定被平均的监督内容。`,
    },
    {
      id: "math-distillation-pipeline",
      type: "derivation",
      title: "蒸馏的箭头传什么：输出轨迹、模式标签还是教师分布",
      body: String.raw`现在要把专家的代码能力迁移给通用助手。一个接口只返回通过测试的完整代码，另一个能在学生已经写出的前缀上返回下一个 token 的概率。两者都叫蒸馏，却会提供不同训练样本和梯度。本节先算筛选怎样改变教师输出分布，再比较硬答案与软概率的更新，最后说明思考模式标签放在哪里。

**从报告到建模。** R1-Distill 使用整理后的教师样本做 SFT；V3/V3.2 的专家生成数据再交给通用模型；Qwen3 的 strong-to-weak 同时涉及离线输出蒸馏和 on-policy 教师分布监督。它们不是“把教师参数平均到学生”的同一个操作。以下目标是这些数据流的可计算解释，不补写未披露的具体 KL 方向。

**第一步：RS 后的教师分布。** 固定输入 $x$，教师生成概率为 $t(y|x)$，确定验证器 $v(x,y)\in\{0,1\}$，通过概率 $Z(x)=\sum_yt(y|x)v(x,y)>0$。保留样本的分布是

$$h(y|x)=\frac{t(y|x)v(x,y)}{Z(x)},\qquad
L_{\mathrm{offline}}=-\mathbb E_{y\sim h}\sum_t\log\pi_\theta(y_t|x,y_{<t}).$$

这里明确选用序列 NLL 和；若改成序列内均值，要在期望里除以 $T_y$，优化权重随长度改变。教师两个候选概率为 $[0.6,0.4]$，只有第一个通过，则保留分布为 $[1,0]$，平均两条成功样本需生成 $2/0.6=3.333333$ 条。学生学的是筛选后的分布，不是原始教师的全部行为；若第一个只是利用测例漏洞，蒸馏会一并复制漏洞。

**第二步：固定学生前缀上的软监督。** 输出轨迹只告诉学生“模仿哪个 token”；若接口还提供完整概率，就能保留教师对其他 token 的支持。在同一个前缀 $s$，教师与学生词表分布为 $t,p_\theta\in\mathbb R^V$，都归一化，教师冻结；$V$ 是词表大小，$z_v$ 是学生的第 $v$ 个 logit。以 forward KL 作为一种明确的教学实现：

$$L_s=D_{\mathrm{KL}}(t\|p_\theta)
=\sum_vt_v\log t_v-\sum_vt_v\log p_{\theta,v}.$$

第一项与学生无关；用 softmax Jacobian 求导得到

$$\frac{\partial L_s}{\partial z_v}
=-\sum_ut_u(\mathbf1[u=v]-p_v)=p_v-t_v.$$

取 $t=[0.8,0.2],p=[0.5,0.5]$，KL 约 0.192745 nats，logits 梯度为 $[-0.3,0.3]$；若只保留第一 token 的 hard label，梯度为 $[-0.5,0.5]$。软监督保留教师不确定性，hard 轨迹则省去存取全词表分布的成本。教师是否能提供完整 logits、只提供采样 token logprob，决定了能实现哪一种目标。

**第三步：为什么强调“学生前缀”？** 离线 SFT 在固定教师轨迹的状态上训练；OPD 让学生访问自己的前缀，再向教师询问。在缓存前缀上反传上式，是固定前缀的监督梯度；若目标写成对当前策略全部状态分布的期望，状态分布也依赖 $\theta$，还会出现采样分布的导数。不能把局部 $p-t$ 直接称为完整轨迹目标的无偏梯度。

前缀之外，输入还可能规定回答模式。Qwen3 Thinking Mode Fusion 的训练数据带模式条件 $b$，目标应写成 $-\log\pi_\theta(y|x,b)$。thinking RS 数据与另行整理的 non-thinking 数据在带标签的输入上融合，不要求每题都有成对答案。权重、长度分母和模式覆盖共同决定是否遗忘；只知道存在两种模式，无法反推出官方的具体配比。

**追问。** 只有教师生成接口，没有 logits 时能否声称做了上述 forward KL？不能，只能训练可获得的输出监督或另定义估计器。

这次接口选择的差别可以用数字读出来：筛选把教师的 0.6/0.4 改成只保留第一种解法，收齐两条成功样本平均要生成约 3.33 条；在另一个固定前缀上，软监督的梯度为 -0.3/0.3，硬标签则是 -0.5/0.5。前者保留了不确定性，但需要概率访问。下一节据此把离线生成、拒绝样本和逐轮教师评分分开计账，才能判断哪个接口在给定预算下可用。`,
    },
    {
      id: "math-pipeline-budget",
      type: "derivation",
      title: "预算推导：拒绝样本、教师查询和完整成本",
      body: String.raw`团队希望最终得到一百万可训练 token，正在比较两种方案：生成教师答案后只保留四分之一，或直接让学生生成并逐 token 查询教师。上一节已经说明监督不同，这里先不比较效果，只计算每种方案实际支付多少生成、验证和优化费用，避免把被丢弃的答案当作免费。

**符号与单位。** 令 $M$ 为要求保留并优化的 response token 数，$\alpha$ 为 RS 的独立通过概率，满足 $0<\alpha\le1$；先假设每条候选等长、通过事件与长度无关。生成、验证、优化、教师评分每千 token 的成本分别为 $c_r,c_v,c_u,c_T$，统一用教学成本单位 CU；这些不是任何厂商报价。$U$ 表示对保留数据的优化遍数。

**第一步：离线 RS 蒸馏账本。** 根据第 21 章的等待计数，平均每接受一条需尝试 $1/\alpha$ 条；在等长假设下，收齐目标数据前的期望候选 token 为 $M/\alpha$。生成和验证作用于所有候选，优化只作用于保留数据，所以

$$C_{\mathrm{RS}}=\frac{M}{1000\alpha}(c_r+c_v)
+\frac{UM}{1000}c_u.$$

取 $M=10^6,\alpha=0.25,U=1,c_r=1,c_v=0.2,c_u=2$，生成 400 万 token 花 4000 CU，验证花 800 CU，优化花 2000 CU，总计 6800 CU。只对保留的 100 万计生成和验证会误报 3200 CU。长度影响验证通过或采样终止时，应记录候选与保留 token 的实际比值，不能用题目通过率代替 token 保留率。

**第二步：学生前缀 OPD 账本。** 更换监督后，要重新列出哪些工作发生在每个 token 上，而不是沿用 RS 的接受率。假设不做 RS，生成 $M$ 个学生 token、查询一次冻结教师，优化 $U$ 遍，可写成

$$C_{\mathrm{OPD}}=\frac M{1000}(c_r+c_T+Uc_u).$$

教学取 $c_T=0.5$，其余不变，得到 3500 CU。这不证明 OPD 比 RS 更有效：数据分布、教师强度和成功率不相同，教师训练的摊销、全词表通信、环境及调度尚需单列。多次更新是否重查教师也要写清。独立能力评估才决定同预算下哪个方案值得采用。

**第三步：把查询数放回总生成量。** Qwen3 公开的 3,995 query-verifier 对是题库规模，不是 rollout 数。教学取每题 16 次、每次 4096 token，则一轮 $3995\times16\times4096=261{,}816{,}320$ token；16 与 4096 不是报告超参数。若换动态采样，还需除以有效组接受率并计入被拒绝组，不能用最终 batch 大小替代总生成量。

**边界与追问。** V3 表内 $5000/2788000\approx0.179340\%$ 是后训练占正式训练合计；$5000/2664000\approx0.187688\%$ 是占预训练。两者都不是 R1 的 RL 成本。GPU-hours、CU、美元和 token 必须分列，除非给出经过测量的换算率；MoE 的激活参数量也不足以独自推算 KV、通信和环境成本。预算验收应先锁定成本上限，再报告能力与推理延迟，而不是先看到最高分再改分母。

对这一百万 token 的教学任务，RS 的可用估算是 6800 CU，漏算拒绝样本的 3200 CU 会把预算砍掉一半以上；OPD 的 3500 CU 只在约定接口和一次教师查询下成立。先拿这些账本安排同预算能力对照，不据价格直接宣布方法更优。若任务开始调用工具、等待子任务或复用前缀，第 23 章还要继续补入环境与调度成本。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：先审计查询与账本，再选择优化器",
      body: String.raw`这个仅依赖 Python 标准库的实验复现手算，输出有效查询、组优势、假设生成量与 V3 表内占比。它是数据审计，不是可训练的工业 GRPO，也不模拟验证器偏差或多机调度。

~~~python
from math import isclose, sqrt
from statistics import mean

def group_stats(rewards, eps=1e-8):
    if not rewards:
        raise ValueError("a group must not be empty")
    avg = mean(rewards)
    variance = mean([(value - avg) ** 2 for value in rewards])
    advantages = [
        (value - avg) / (sqrt(variance) + eps)
        for value in rewards
    ]
    return variance, advantages

groups = {
    "A": [1, 1, 1, 1],
    "B": [0, 0, 0, 1],
    "C": [0, 1, 0, 1],
}
stats = {name: group_stats(values) for name, values in groups.items()}
ranked = sorted(groups, key=lambda name: stats[name][0], reverse=True)
active = [name for name in ranked if stats[name][0] > 0]
assert active == ["C", "B"]
assert isclose(stats["B"][0], 0.1875)
assert stats["A"][1] == [0.0] * 4
assert isclose(sum(stats["B"][1]), 0.0, abs_tol=1e-12)

# Teaching assumptions, not Qwen3 rollout hyperparameters.
generated_tokens = 3995 * 16 * 4096
assert generated_tokens == 261_816_320
weights, rewards = [0.6, 0.3, 0.1], [0.8, 0.5, 0.9]
assert isclose(sum(weights), 1.0)
mixed_reward = sum(w * r for w, r in zip(weights, rewards))
assert isclose(mixed_reward, 0.72)

# DeepSeek-V3 Table 1, all values in H800 GPU-hours.
costs = {"pretrain": 2_664_000, "context": 119_000, "post": 5_000}
post_fraction = costs["post"] / sum(costs.values())
assert isclose(sum(costs.values()), 2_788_000)
print("active:", active)
print("B advantages:", [round(a, 3) for a in stats["B"][1]])
print("teaching rollout tokens:", generated_tokens)
print("mixed reward:", round(mixed_reward, 2))
print("V3 post / total:", f"{100 * post_fraction:.3f}%")
~~~

预期有效查询顺序是 C、B，B 的优势约为 -0.577、-0.577、-0.577、1.732，最后一行是 0.179%。把 B 的最后一个奖励改为 0，会使该组退出有效列表；这表示目前组相对反馈不足，不能据此判定这道题永远没有学习价值。

进入真实系统前还要保存查询来源、verifier 版本、采样策略版本、token 数和任务类别。否则你可能把奖励服务更新后的分数变化误判成策略学习，把长样本变多误判成优化器变慢。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：把报告读成算法广告",
      body: String.raw`**把 benchmark 名称当成完整协议。** AIME 2024 与 AIME 2025 题目不同；avg@32 是多次独立回答的平均正确率，不是选出一次正确就算通过的 pass@32。温度、最大长度、工具、是否投票和 verifier 都应对齐。R1、DAPO、VAPO 的数值在这里解释各自报告，不构成受控横向实验。

**把消融模型写成最终模型。** V3 报告的 MATH-500 蒸馏对照 74.6 到 83.2 来自 V2.5 底座；Seed1.5 的 DAPO/VAPO 对照来自 150B 消融。更换底座后不能保留同一个因果解释。

**把方法名称当作配方身份证。** GSPO 是 Group Sequence Policy Optimization，SAPO 是 Soft Adaptive Policy Optimization；前者的长度归一化序列比和后者的平滑门控不等于“Qwen 系列所有模型都使用”。Seed-Coder 的原报告明确为 GRPO 加 DAPO 类技术，不能改写为 VAPO。

**把奖励模型当价值模型。** RM 评分最终回答，critic 估计给定前缀的预期回报。用 RM 权重初始化 critic 仍可能目标错配，VAPO 的校准恰好说明不能仅看网络结构相似。

**把长度变长当作推理必然进步。** 过强长度惩罚可能截断有效探索，完全没有约束也可能鼓励冗余。应画固定预算下的正确率，并检查相同正确率对应的延迟；单看平均 CoT 长度无法区分有效检查与奖励投机。

**把公开状态冻结在旧文章的日期。** Seed2.0 已有后续模型卡；Qwen3.5 本章所用材料仍是官方博客。先写核验日期与文献类型，再说公开了什么。上游作者的“后训练永不饱和”“actor-critic 必将复兴”属于观点，需要固定底座、数据和预算的消融才能检验。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "比较表：先选任务与反馈，再借鉴训练阶段",
      body: String.raw`先选择一个与自己任务相近的案例，写下阶段、数据、反馈和预算，再横向比较。具体性能、成本与版本数字保留在折叠推导中的报告审计材料。

| 案例 | 阶段与数据主线 | 奖励和系统约束 | 可迁移经验与边界 |
|---|---|---|---|
| DeepSeek-V3 | 领域专家产数，SFT，再 GRPO | 规则与模型反馈，控制长度 | 蒸馏与 RL 互补；表内成本不等于全部研发 |
| R1 / R1-Zero | Zero 探索纯 RL；R1 冷启动、RL、混合 SFT、RL | 可验证推理加通用对齐 | 需要分开比较探索、可读性与学生蒸馏 |
| V3.2 / Speciale | 标准为专家蒸馏、mixed RL；Speciale 是分支 | 保留路由和采样掩码，分支弱化长度惩罚 | 概率一致性独立于优化器名称 |
| Qwen2.5 | SFT、离线 DPO、在线 GRPO | 按响应奖励方差筛查询 | 数据量、查询难度与反馈质量要共同监控 |
| Qwen3 | 冷启动、推理 RL、模式融合、通用 RL | 思考预算，大小模型蒸馏 | 少量查询不代表少量生成或更新计算 |
| Qwen3.5 | 官方披露原生多模态与 Agent RL 方向 | 线性注意力加稀疏 MoE | 博客信息有限，不猜具体优化器与 critic |
| DAPO / VAPO | 前者强调组相对信号；后者加入价值校准 | 长序列、熵、GAE 与有效采样 | 是否加入 critic 应比较质量与总成本 |
| Seed1.5-Thinking | 冷启动、分任务反馈、动态 RL 数据 | 流式生成与价值校准 | 最终 200B 与 150B 消融不能混用 |
| Seed-Coder | 代码筛选；Instruct 用 SFT+DPO；Reasoning 用 GRPO | 编译测试与 DAPO 类优化 | 自选数据仍需去重、过滤和独立评测 |
| Seed2.0 | 通用 Agent 与 Code 产品线 | 复杂指令、多模态、长程任务 | 已有模型卡；本章未核验完整训练细节 |

**教学性决策顺序：** 对有可靠测试的数学或代码任务，先建立 RLVR 基线并核验反馈；全同奖励组很多时，检查题目难度与动态采样；长程信用不足时，再评估价值模型及其校准成本；目标是小模型低延迟部署时，比较离线蒸馏与 OPD；通用助手或多模态 Agent 则必须补齐偏好、安全、工具与预算评测。

这不是算法胜负榜。一个团队能生成高质量专家数据，另一个团队只有可靠单元测试，最合适的起点会不同。真正可移植的是诊断问题的方法，而不是把某篇论文的所有开关一并复制。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：从模型名称回到可验证的训练选择",
      body: String.raw`**30 秒回答：**“工业后训练要拆成任务、数据、反馈、阶段和系统约束。DeepSeek 用 R1 探索推理，再以多阶段训练与专家蒸馏兼顾通用能力；Qwen 把离线偏好、在线查询筛选、模式融合和大小模型迁移组合起来；Seed 从 DAPO 的长序列稳定性扩展到 VAPO 的价值校准，并把奖励、数据和 rollout 系统一起设计。比较结果必须固定底座、评测预算和成本口径。”

**为什么不能说 R1-Zero 证明 SFT 没用？** 它从强预训练底座出发，回答的是推理 RL 能否起效。正式 R1 又用 SFT 修复可读性、整合数据与兼顾通用任务；问题不同，结论并不矛盾。

**为什么高方差查询更有价值？** 在组相对目标中，同题有好有坏就有可学习的相对方向。但样本少、judge 不稳也会产生高方差，因此要与反馈质量和领域覆盖一起看。

**为什么 VAPO 的 critic 不直接用 RM？** 终局答案质量与前缀的期望回报是不同目标。应在当前策略轨迹上用回报校准，再讨论 GAE 与优势估计，而不是仅复制权重。

**如何解释后训练预算快速上升？** 先区分预训练分母、总训练分母和 RL 租赁成本，再拆生成、训练、判分、环境及空闲开销。预算上升可能来自更难任务或更长 rollout，不能单靠一张成本表证明算法效率变差或收益永远增长。

**报告只公布产品能力怎么办？** 保留已公开的架构、任务与结果，明确未披露优化器和数据比例。提出实验假设可以，不能将其写成厂商已完成的训练事实。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：数字、阶段和归因各检查一次",
      body: "回答时先指出证据属于哪个模型、哪一阶段和哪一种评测协议。",
      questions: [
        {
          q: "同一题的候选有好有坏时，为什么比全同奖励组更适合组相对训练？",
          a: "组内差异能提供相对方向；全同奖励组无法区分哪条回答更值得提高。仍需先确认差异不是验证器噪声。",
        },
        {
          q: "一个学生模型只用教师生成的答案做 SFT，可以把教师的全部 RL 流程写成学生也执行过吗？",
          a: "不能。教师先怎样获得能力，与学生怎样消费教师数据是两条流程。需要分别记录教师训练与学生训练；学生模仿答案不等于自己执行了教师的 RL。",
        },
        {
          q: "一个模型多答对几题，但平均回答也更长，能否直接认定其更新算法更好？",
          a: "不能。更多生成预算也可能改变成绩。需固定或同时报告模型、任务、输出预算和评估设置，再用受控对照分析算法贡献。",
        },
        {
          q: "某份报告中的后训练成本占比较小，能否据此说明另一模型的推理 RL 也很便宜？",
          a: "不能。模型、阶段定义、生成预算、硬件口径和是否包含研发消融都可能不同；成本结论只能在原报告边界内解释。",
        },
        {
          q: "三组奖励中 A 全对、B 一对三错、C 两对两错。按方差排序选 C 后，是否可以永久丢弃 A 和 B？",
          a: "不可以。当前方差只描述这次组内差异，还要考虑验证器噪声、领域配额、已掌握能力是否遗忘，以及模型更新后难度变化；一次排序不是永久价值排名。",
        },
        {
          q: "报告披露的查询数量是否等于生成回答数量或训练计算量？",
          a: "不等于。每题可多次 rollout，多个步骤还会重复采样；还需计入生成长度、训练反向、教师或奖励模型和无效组补采。",
        },
        {
          q: "从 Qwen3.5 的 MoE 架构或 Seed2.0 的产品名，能推断其训练必用 GSPO 或 VAPO 吗？",
          a: "不能。架构与家族名称不决定优化器；需要对应 checkpoint 的原始训练披露。本章 Qwen3.5 依据官方博客，Seed2.0 依据发布及后续模型卡摘要，均不补猜未披露细节。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：给工业 pipeline 写目标与账本",
      body: "可以借鉴报告阶段，但答案中的自定参数必须明确是教学假设。",
      questions: [
        {
          q: "数学和代码各一条，长 1000、4000，域平均 NLL 为 1、3。目标是两域各 50%，写 loss 与每个 token 系数；若直接平铺会怎样？",
          a: String.raw`目标 $L=0.5\,\sum_{\mathrm{math}}\ell/1000+0.5\,\sum_{\mathrm{code}}\ell/4000=2$。两个域的单 token 系数为 $1/2000$、$1/8000$；再乘 $p-e_y$ 得 logits 梯度。平铺则 $L=13000/5000=2.6$，代码占 80% token。**得分点：** 域采样与 loss 权重不是一回事；空域需处理；这些比例不能标为 V3.2 官方配置。`,
        },
        {
          q: "固定前缀，教师 t=[0.8,0.2]、学生 p=[0.5,0.5]。推导 forward KL 的 logits 梯度，与只取教师首选 token 的 SFT 比较。",
          a: String.raw`$L=\sum_vt_v\log(t_v/p_v)$，教师熵项为常数；softmax 的 $\partial\log p_u/\partial z_v=\mathbf1[u=v]-p_v$ 给出 $p-t=[-0.3,0.3]$，KL 约 0.192745。hard 首选标签得到 $p-[1,0]=[-0.5,0.5]$。**得分点：** 说明教师冻结、完整词表与同一前缀；该局部梯度不是对学生整条状态分布求导后的全部项。`,
        },
        {
          q: "RS 需保留一百万等长 token，通过率 0.25；每千 token 生成、验证、单遍优化成本为 1、0.2、2 CU。算总成本，并解释能否与只公开 GPU-hours 的报告直接比较。",
          a: String.raw`候选量 $10^6/0.25=4\times10^6$，成本为 $4000+800+2000=6800$ CU。只计保留量会误报 $1000+200+2000=3200$ CU。**得分点：** 拒绝数据仍耗计算、长度与通过独立的假设、单位一致；还要加教师训练摊销/环境等未计项目，没有实测换算率不能拿 CU 直接比较 GPU-hours。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via RL",
      url: "https://arxiv.org/html/2501.12948",
      evidence: "原始报告：R1-Zero、R1 四阶段、约 800k 蒸馏数据及 AIME 2024 结果",
    },
    {
      label: "DeepSeek-V3 Technical Report",
      url: "https://arxiv.org/html/2412.19437",
      evidence: "原始报告：专家数据、SFT/GRPO；Table 1 成本归属，Table 9 为 V2.5 底座消融",
    },
    {
      label: "DeepSeek-V3.2: Pushing the Frontier of Open Large Language Models",
      url: "https://arxiv.org/html/2512.02556",
      evidence: "原始报告：专家蒸馏、mixed RL、Speciale 分支、Keep Routing/Keep Sampling Mask 及 Tables 3–4",
    },
    {
      label: "Qwen2.5 Technical Report",
      url: "https://arxiv.org/html/2412.15115",
      evidence: "原始报告：SFT、DPO、在线 GRPO 与基于响应分数方差的查询选择",
    },
    {
      label: "Qwen3 Technical Report",
      url: "https://arxiv.org/html/2505.09388",
      evidence: "原始报告：四阶段、3,995 query-verifier 对、阶段性 AIME 2024 结果、模式融合与大小模型蒸馏",
    },
    {
      label: "Qwen3.5: Towards Native Multimodal Agents",
      url: "https://www.alibabacloud.com/blog/qwen3-5-towards-native-multimodal-agents_602894",
      evidence: "官方博客转载，公开信息有限：首发模型架构、多模态与 Agent RL 方向；不据此推定算法超参数",
    },
    {
      label: "Group Sequence Policy Optimization",
      url: "https://arxiv.org/html/2507.18071",
      evidence: "方法原论文：正式名称与长度归一化序列比；不代表全部 Qwen checkpoint 的统一配方",
    },
    {
      label: "Soft Adaptive Policy Optimization",
      url: "https://arxiv.org/html/2511.20347",
      evidence: "方法原论文：平滑门控及其经验条件；不把局部近似写成普遍包含关系",
    },
    {
      label: "DAPO: An Open-Source LLM Reinforcement Learning System at Scale",
      url: "https://arxiv.org/html/2503.14476",
      evidence: "原始报告：四项技术，Qwen2.5-32B Base，AIME 2024 avg@32 及采样协议",
    },
    {
      label: "VAPO: Efficient and Reliable Reinforcement Learning for Advanced Reasoning Tasks",
      url: "https://arxiv.org/html/2504.05118",
      evidence: "原始报告：Value-Pretraining、Decoupled-GAE、长度自适应与正例 NLL，摘要结果 60.4",
    },
    {
      label: "Seed1.5-Thinking: Advancing Superb Reasoning Models with Reinforcement Learning",
      url: "https://arxiv.org/html/2504.13914",
      evidence: "原始报告：200B/20B 最终模型、反馈分工、流式 rollout；150B 算法消融与 RFT 条件",
    },
    {
      label: "Seed-Coder: Let the Code Model Curate Data for Itself",
      url: "https://arxiv.org/html/2506.03524",
      evidence: "原始报告：8B 三版本、模型辅助筛数、Instruct SFT+DPO、Reasoning GRPO 加 DAPO 类优化",
    },
    {
      label: "Seed2.0 Official Launch",
      url: "https://seed.bytedance.com/en/blog/seed-2-0-official-launch",
      evidence: "2026-02 官方发布，公开信息有限：Pro/Lite/Mini/Code、复杂指令与 Agent 产品定位",
    },
    {
      label: "Seed2.0 Model Card, v1",
      url: "https://arxiv.org/abs/2607.00248v1",
      evidence: "2026-06-30 已提交模型卡；本次核对摘要与元数据，不声称核验了全文训练细节",
    },
    {
      label: "agentic-rl-analysis: 工业模型文档，固定提交 66ae4423",
      url: "https://github.com/xavierzhang2002/agentic-rl-analysis/tree/66ae4423b36270ef50a288fb1bb2e1b31c46c329/docs/post-training/ch2",
      evidence: "二级学习材料：2.1、2.3、2.6 全文阅读；与原始报告冲突之处以证据账本勘误",
    },
  ],
};

export default chapter;
