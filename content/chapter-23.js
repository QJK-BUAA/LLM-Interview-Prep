const reportNotes = String.raw`## Kimi K1.5：长推理能否训练，短回答如何保留能力

Kimi K1.5 从已有语言与多模态能力出发，以长 CoT 监督与长上下文 RL 扩展数学、代码等能力。报告使用 online policy mirror descent 的变体和结果反馈，并涉及 CoT RM；没有独立 value 网络不等于没有模型判分或数据筛选。

Partial Rollout 把超长生成切成片段：本轮未完成的轨迹保存起来，下轮继续生成。它降低长样本对同步批次的阻塞，但不自动减少总生成 token，也不让旧片段变成当前策略的样本。系统必须记录片段边界、行为策略版本、缓存与奖励归属。

long2short 关注另一件事：如何把长推理能力转成较低延迟的短回答。报告比较模型合并、选最短正确轨迹的拒绝采样、DPO 和带长度惩罚的 RL。k1.5-short w/ RL 在 AIME 2024 的 8 次运行平均 pass@1 为 60.8、平均 3,272 token，长 CoT 版本报告为 77.5。它展示的是准确率与预算的取舍，不是证明所有答案越短越好。

## Kimi K2：先稳定大模型，再构造可验证工具任务

Kimi K2 的 MuonClip 主要服务于预训练稳定性。其 QK-Clip 观察每个注意力头在当前 batch 中的最大 attention logit，超过阈值后缩放 query/key 投影相关权重。Q 与 K 分别是查询与键；这里关注送入 softmax 的信号，不是检查 Q/K 的谱范数，也不是裁剪 RL 中新旧策略概率比。MHA 与 MLA 的实际缩放部件不同，不能把一个简化例子直接当作另一种架构的实现。15.5T token 无 loss spike 是报告的那次训练结果，不是普遍保证。

Agent 数据从工具和领域规格出发，构造角色、任务与明确 rubric，再在有状态的工具模拟中生成轨迹，经 judge 筛选后训练；RL 混合真实和合成环境。rubric 是“什么算完成”的可检查标准，不是让模型给自己随意加分。Self-Critique Rubric Reward 还依赖 SFT 初始化的判断能力和开源、内部偏好数据，因此不是完全无人类监督。这里做成对偏好判断的 critic 也不能直接等同 PPO 的价值网络。

## Kimi K2.5：跨模态迁移和 Agent Swarm 是两条轴

K2.5 的 early fusion 消融改变视觉数据进入预训练的时间和比例，不是把视觉 embedding 放到浅层还是深层。Zero-Vision SFT 指某阶段不使用视觉 SFT 样本；模型此前见过图文预训练数据，之后还有视觉 RL，不能理解成“从未看过图片却会视觉推理”。

Agent Swarm 的 PARL 训练编排器拆分任务、调用多个子 Agent 并整合结果。报告冻结子 Agent，只更新编排器，把子 Agent 返回当作环境观察；奖励既看最终结果，也用鼓励有效并行的辅助项，并逐渐退火辅助奖励。如果只奖励子 Agent 数量，模型可能制造无用分工，所以有效完成与整体时延都要检查。

报告的最多 4.5 倍延迟改善属于 wide-search 设置，不是所有任务。Toggle 的约 25–30% token 节省实验则在 K2 Thinking 上评估，不能把它当成每个 K2.5 请求的固定收益。模态能力、协调能力和推理预算要分开归因。

## MiniMax-01：长上下文能力需要阶段性保养

MiniMax-Text-01 以 Lightning Attention 与 softmax attention 的混合设计控制长上下文成本。后训练分短 SFT、长 SFT、短 DPO、长 DPO、短 online RL 五阶段；报告长阶段序列长度为 1,032,192，短阶段为 8,192。最后的在线 RL 并不是每条都在百万 token 上训练。

奖励覆盖正确性、真实性、帮助性与无害性，长短阶段交替处理质量与上下文能力的取舍。Vision-01 另有多模态配方，不能将 Text-01 的所有阶段原样套用。理论上更省计算的注意力也不保证所有长程检索、多跳任务都与全注意力等价。

## MiniMax-M1：把长推理的算法、数值与账本分开看

长轨迹能生成出来之后，还需决定哪些动作得到更新，这与前面的切片调度是不同问题。M1 在混合注意力基础上经历 7.5T token 的继续预训练、冷启动 SFT 和 CISPO RL。CISPO 是 Clipped IS-weight Policy Optimization：裁剪逐 token 的重要性采样权重并停止对权重求导，再用它加权当前 token 的 log-prob。它不是 GSPO，也不是“几何平均序列裁剪”。某 token 的权重触及上限后，log-prob 项仍可能有梯度。

报告 Table 2 的 M1-80k AIME 2024 为 86.0。作者还报告用 512 张 H800 完成一次完整 RL，租赁估算 534,700 美元；这不含底座、继续预训练及全部研发，不能直接与 V3 正式训练合计比较。Qwen2.5-32B 数学对照中达到 DAPO 表现约需一半更新步数，也不能推出总 FLOPs、显存和费用都减半。

## M2、M2.5、M2.7：从回答问题转向交付可验收产物

截至 2026-09，M2 系列已有覆盖三个版本的公开技术报告，不再是只有发布博客。M2 为 229.9B 总参数、9.8B 每 token 激活，采用全注意力与 GQA，不能继续标成 01/M1 的 Lightning Attention 路线。后训练以 interleaved-thinking SFT 和 Agent RL 组织代码、搜索、办公及通用任务，数据必须配套可执行工作区和可信的产物反馈。

M2 是这条 Agent 原生路线的初始版本；M2.5 延续该路线并扩大深度搜索、工具与工作区任务族。不能仅写“RL 步数更多”：修复仓库需要测试，表格任务需要检查公式与单元格，幻灯片任务需要检查结构和内容，每种新任务都要求相应的环境和验收信号。系列报告给出了公共机制，但不能据此断言每个 checkpoint 的数据比例和超参数完全一致。

M2.7 增加模型协助实验运行、日志诊断与脚手架修改的 self-evolution 实践。官方所说处理 30–50% 工作流是特定内部流程的自报比例，仍有研究者指导；它不意味着可以无约束修改生产权重。报告 Table 4 中，M2.5 到 M2.7 的 Terminal-Bench 2.0 为 51.7 到 57.0，GDPval-AA 为 35.0 到 50.0，但 MMLU-Pro 从 85.2 降到 81.8。改进有任务边界，应保存独立回归集，而非宣称所有能力单调提升。

Forge 是这条路线的训练系统：训练、推理、Agent 解耦；Windowed FIFO 允许窗口内先提取已完成轨迹，窗口前沿仍受队首任务消费约束，不是队列满就丢弃最长任务。Prefix Tree Merging 共享重复前缀计算，但必须保留各分支因果掩码、位置与损失权重。报告最多 40 倍训练加速依赖特定的前缀冗余，不是单次服务请求普遍快 40 倍。

## GLM-5：连续训练后，还要守住前面学到的能力

调度和更新都能运行，也不保证后阶段训练保住了早先能力。GLM-5 采用 SFT、reasoning RL、agentic RL、general RL，再用跨阶段蒸馏缓解能力回退。SWE 任务来自真实 issue、修复和测试，Terminal 任务带环境与脚本，Search 则构建网页关系和多跳问题；训练样本因此包含可执行状态与反馈，而不只有问答文本。

它区分 interleaved thinking、preserved thinking 与 turn-level 控制：前者在回复和工具调用前进行思考，中者保留历史思考状态，后者控制某一轮是否思考。Qwen3 的模式融合主要让同一模型兼容 thinking/non-thinking，GLM-5 的这些开关还管理多轮轨迹中的状态；两者相关但不能互换。

异步 slime 将 rollout 和训练解耦，但会引入策略陈旧。TITO 保存推理引擎实际产生的 token ID、边界与元数据，避免文本往返重分词改变动作；配合 rollout log-prob、token masking、版本 freshness 与 IcePop 等一致性处理。它不是装上一个框架就天然 on-policy。

跨阶段 OPD 保存前序阶段的 checkpoint 作教师，在当前学生的轨迹上给逐 token 分布反馈，帮助恢复早先能力。它不要求教师拿到参考答案，因此不是本课程所定义的 privileged-context OPSD。教师是否能恢复某一能力必须经相应保留集验证，不能由“加了蒸馏”直接推出。

## 闭源模型：可以学习公开方法，不能补写私有配方

OpenAI 的 Deliberative Alignment 和 Safe-Completions、Google 的 Gemini 报告、Anthropic 的 Constitutional AI 与历史 HH-RLHF，公开程度并不相同。它们提供安全规则、监督数据、AI 偏好或多模态奖励的具体证据，但不自动公开 o1/o3、Gemini 或 Claude 当前产品的全部能力训练。下方比较表只讨论原文披露的部分。

这些案例分别改变切片调度、动作记录、训练信号和验收规则。借鉴时应逐项对照自己的系统，不能把不同公司的部件拼成一套声称已经部署的配方。`;

const chapter = {
  id: "23",
  slug: "industrial-kimi-minimax-glm",
  part: "LLM 后训练",
  title: "工业案例 II：Kimi、MiniMax、GLM 与闭源模型",
  subtitle: "长程 Agent 的训练对象不仅是答案，还包括轨迹、工具与调度",
  level: "进阶",
  duration: 190,
  prerequisites: ["16", "17", "18", "19", "20", "21", "22"],
  tags: [
    "Kimi K1.5", "Kimi K2", "Kimi K2.5", "Partial Rollout", "MuonClip",
    "MiniMax-01", "MiniMax-M1", "MiniMax-M2", "MiniMax-M2.5", "MiniMax-M2.7",
    "CISPO", "Forge", "GLM-5", "TITO", "OPD", "Deliberative Alignment",
  ],
  objectives: [
    "解释长任务切片如何改变等待，而不减少总生成量",
    "手算并行关键路径，并区分延迟和总工作量",
    "用动作掩码、行为概率与版本信息追踪一条训练轨迹",
    "结合一个报告案例，区分调度、优化与教师监督",
    "区分已公开机制与未披露的产品训练配方",
  ],
  summary:
    "从 Kimi 的分片与并行，到 MiniMax 的 CISPO 和 Forge，再到 GLM-5 的轨迹一致性与跨阶段蒸馏，工业 Agent RL 的关键是让反馈、生成、训练和环境相互对齐。闭源公司的公开安全方法同样值得学习，但不能据此补猜整套能力训练方案。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "修复还没结束，模型已经更新了怎么办？",
      body: String.raw`一个代码助手先搜索文件，再编辑、运行测试，根据报错继续修改。短任务已经完成，长任务还在等工具，而训练器已经更新了模型。这时既要缩短等待，又要知道每一段动作由哪个版本生成。

先区分三件事。切片让长任务分几段生成，可以减少某一批次的等待；并行让互不依赖的任务同时进行，可以缩短总用时；训练目标决定哪些动作得到怎样的更新。这三种改变对应不同数字，不能统称为“效率提高”。

工具返回属于助手看见的环境信息，助手发出的调用才是它选择的动作。即使旧片段不再计入当前损失，它仍是后续生成的上下文，因此需要保留 token、版本和边界。

下面先用 12 与 4 个 token 计算切片，用 4、6、3 秒计算并行，再接回第 20 章的更新系数。Kimi、MiniMax、GLM 的报告细节放在后面的案例对比，先选一个机制读懂，再查对应模型。`,
    },
    {
      id: "example",
      type: "example",
      title: "手算：切片、并行和裁剪各自改变什么？",
      body: String.raw`先把仓库助手的长短轨迹压缩成 12 与 4 个 token，每轮每条最多新增 4 个 token，观察切片究竟省了什么。第一轮短回答完成，长回答还剩 8；第二轮长回答再生成 4，第三轮才结束。下面的长度、概率和耗时都是用于隔离机制的教学数字。

总生成仍是 $12+4=16$，切片改变调度，不会凭空把工作量减半。短任务可以较早被消费，但长任务的后两段仍要完成，不能从账本里消失。

如果教学实现约定“每个片段只训练一次”，长回答第三轮的响应掩码可为前八位 0、后四位 1。旧片段仍参与上下文，但不重复计入这次损失。这是一种教学掩码约定，不声称 K1.5 原系统只采用此策略；真实实现必须说明何时回填终局奖励、哪些片段重用、如何处理旧行为策略。

再看 PARL 式并行的关键路径。三个互不依赖的子任务耗时 4、6、3 秒，编排与汇总共 2 秒：

$$T_{\mathrm{serial}}=4+6+3+2=15\text{ 秒}$$
$$T_{\mathrm{parallel}}=\max(4,6,3)+2=8\text{ 秒}$$

$T_{\mathrm{serial}}$ 与 $T_{\mathrm{parallel}}$ 分别是串行和并行的墙钟时间，理想加速比为 $15/8=1.875$。总子任务工作量仍为 13 秒，并发甚至可能增加成本；若第三个任务依赖第二个，就不能直接取三个任务的最大值。实际还受并发槽位、失败重试与工具限流影响。

调度完成后，还要计算被保留动作得到什么更新。设某 token 的旧策略概率为 0.2、新策略为 0.4，重要性比为 2，教学裁剪区间为 [0.8, 1.2]，优势为 0.5。CISPO 的冻结权重为 1.2，对这个 token 的 log-prob 梯度系数为 $1.2\times0.5=0.6$，不是 0。对照标准 PPO 的正优势分支，该点的 clipped surrogate 已进入平坦区；两个方法裁剪的对象与求导路径不同。

若教师在同一前缀上给该 token 概率 0.8、学生给 0.4，OPD 的教师差值为 $\log(0.8/0.4)=\log2\approx0.693$。这是逐 token 分布监督，不是把一条序列放进组内中心化后还能凭空得到非零优势。

因此，16 个 token 是工作量，8 秒是理想并行墙钟时间，0.6 是奖励驱动的局部系数，0.693 是另一种教师反馈。它们分别支持调度、优化与监督决策，不能互称“训练效率提升”。接下来先把动作掩码和概率定义清楚，再检验异步情况下这些数字是否仍对应同一个 token。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：把动作记录、教师信号与异步预算接起来",
      body: String.raw`长短轨迹的例子留下两个问题：已经生成的动作该怎样更新，未结束的任务又该怎样安排。先沿跨阶段教师图理解反馈来源，再把权重裁剪、教师差值和安全评分分别写成目标，避免把奖励与调度混为一谈。

随后从实际生成概率推导异步 ratio，检查版本差、引擎差和采样支持集；只有这些输入对齐，才进一步证明单条轨迹也能获得教师方向。最后回到任务依赖图，计算关键路径、前缀复用和排队年龄。蒸馏与 detach 可回看第 19、20 章，成本分母可回看第 22 章。这里是跨报告的分析框架，不是某家完整私有配方；完成后，第 24 章用同预算实验判断哪些干预值得采用。`,
      links: [
        { label: "动作权重、教师反馈与安全评分", sectionId: "derivation", level: "必会" },
        { label: "异步与训推两层 ratio", sectionId: "math-async-ratio", level: "推导" },
        { label: "跨阶段 OPD 的梯度来源", sectionId: "math-opd-gradient", level: "推导" },
        { label: "关键路径、复用与陈旧度", sectionId: "math-agent-budget", level: "进阶" },
        { label: "工程白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "图解：GLM-5 的前序教师与当前学生如何闭环",
      body: String.raw`主线从 SFT 依次进入 reasoning RL、agentic RL、general RL。顺序训练有利于逐步建立复杂能力，但后阶段数据和奖励的变化可能导致遗忘。为此，保存前序阶段最终 checkpoint，按任务域选择教师，再让当前学生自己生成轨迹并接受教师分布反馈。

图中从早期 checkpoint 指向“教师评分”的边传递冻结的教师能力，从学生 rollout 指向教师的边传递实际访问的前缀。教师不替学生重新生成一份完整答案；学生更新后，下一轮还应刷新 rollout。

这与简单的 checkpoint 参数平均不同，也与把历史正确答案离线缓存后做 SFT 不同。前者在参数空间混合，后者训练固定轨迹；跨阶段 OPD 针对的是当前学生的状态分布。较完整的工具环境和异步系统实现见第 28 章，本图只解释能力保留的学习闭环。`,
      diagram: {
        kind: "flow",
        nodes: [
          "SFT 初始化",
          "Reasoning RL：保存 checkpoint",
          "Agentic RL：保存 checkpoint",
          "General RL：当前学生",
          "学生按任务域 rollout",
          "冻结前序教师：同前缀评分",
          "逐 token OPD 更新",
        ],
        links: [
          [0, 1], [1, 2], [2, 3], [3, 4],
          [1, 5], [2, 5], [4, 5], [4, 6], [5, 6], [6, 4],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "数学视角：权重裁剪、教师差值与安全乘积",
      body: String.raw`仓库助手完成一次工具调用后，要训练的是它自己新生成的动作，而不是工具返回的文本。对这些动作，结果奖励和前序教师可以提供两种不同反馈；最终产物还可能接受帮助性与安全验收。本节分别计算三种机制的作用位置，说明哪些量产生学习信号、哪些量只是控制信号强度，并不把它们当作一套厂商统一目标。

## CISPO：截断的是权重，不是把 token 更新直接归零

设 $x$ 为问题，$i$ 为轨迹编号，$t$ 为轨迹内 token 位置，$G$ 为轨迹数量，$T_i$ 为第 $i$ 条轨迹长度。$y_{i,t}$ 是采样 token，$s_{i,t}=(x,y_{i,<t})$ 是它之前的前缀。当前训练策略为 $\pi_\theta$，记录的行为策略为 $\pi_{\mathrm{old}}$，$\theta$ 是待更新参数。对采样支持集内、旧概率非零的 token 定义：

$$\rho_{i,t}=
\frac{\pi_\theta(y_{i,t}\mid s_{i,t})}
{\pi_{\mathrm{old}}(y_{i,t}\mid s_{i,t})},\qquad
w_{i,t}=\operatorname{sg}\!\left[
\operatorname{clip}(\rho_{i,t},\ell,u)\right].$$

$\ell$、$u$ 是下、上裁剪界，满足 $0<\ell<u$；$\operatorname{clip}$ 把数值截到区间，$\operatorname{sg}$ 表示停止沿括号内的计算反向传播。令 $\hat A_i$ 为由该组结果奖励得到、训练时冻结的相对优势，$m_{i,t}$ 为有效动作掩码。下面是展示核心机制、带掩码的 token 平均形式：

$$J_{\mathrm{CISPO}}(\theta)=
\frac1N\sum_{i=1}^{G}\sum_{t=1}^{T_i}
m_{i,t}w_{i,t}\hat A_i
\log\pi_\theta(y_{i,t}\mid s_{i,t}),\qquad
N=\sum_{i,t}m_{i,t}>0.$$

若损失定义为 $L=-J_{\mathrm{CISPO}}$，训练最小化 $L$。对单个已选 token，把权重和优势视为常量后，目标对其 log-prob 的局部导数为 $m_{i,t}w_{i,t}\hat A_i/N$。权重在上界饱和，不意味着 log-prob 梯度消失；当然真实参数梯度还经过整个网络，不能把这个局部系数当作参数更新的全部。

掩码为 1 的位置应是本次要优化的模型动作，用户输入和工具返回不是模型采样动作。跨轮复用的旧片段如何掩码、当前实现按 token 还是轨迹归一化，需要显式约定。代回例子的权重 1.2 与优势 0.5，局部系数为 $0.6/N$；被 mask 的工具文本则为零。这里的目标用于解释 CISPO 的 detach 机制，不声称覆盖 M1 或 M2 系列的全部辅助项；上面的双侧边界是教学形式，M1 的实验披露没有有效下界。

## 跨阶段 OPD：教师在学生的前缀上提供方向

权重公式只说明如何使用优势，尚未解释怎样找回前阶段能力。对此可以换一种信号来源：让前序 checkpoint 评价当前学生已经走到的前缀。令 $\pi_T^{\mathrm{infer}}$ 为冻结教师推理引擎的分布，$\pi_\theta^{\mathrm{train}}$ 为学生训练引擎的分布。GLM-5 的逐 token 教师优势是：

$$\hat A^{\mathrm{OPD}}_{i,t}=
\operatorname{sg}\!\left[
\log\pi_T^{\mathrm{infer}}(y_{i,t}\mid s_{i,t})
-\log\pi_\theta^{\mathrm{train}}(y_{i,t}\mid s_{i,t})
\right].$$

教师更支持该 token 时差值为正，反之为负。例子中教师给 0.8、学生给 0.4，差值约为 0.693，指向增加该动作的局部倾向。它不减去同组奖励均值，所以报告可用 group size=1；这不是标准 GRPO 在单样本时突然获得了组相对信号。实际更新使用策略目标，不能直接对被冻结的优势求导。教师概率、学生概率必须对应相同 token 和前缀，TITO 等工程记录因此与数学定义直接相关。

## 安全乘积：奖励门控不是现实世界的安全证明

动作怎样更新之外，还要问验收规则是否允许不安全的高分产物。Safe-Completions 的公开方法把帮助性与安全评分组合。此处另用 $h\in[0,1]$ 表示帮助性分数、$s\in[0,1]$ 表示安全分数，不再沿用前文的前缀含义；一个体现该机制的简化目标是 $r=h\,s$，其中 $r$ 为最终奖励。严重/确定违规可赋 $s=0$，边缘低严重度情况允许中间分。若教学例子中 $h=0.9$、$s=0$，则 $r=0$；安全替代回答若 $h=0.6$、$s=1$，得分为 0.6。

只有 $s=0$ 时，高帮助性才完全无法补偿；非零安全分仍存在取舍，例如 $0.9\times0.5=0.45$ 高于 $0.3\times1=0.3$。而“被评分器判为安全”和“真实安全”也不是同一件事：漏判时 $s$ 可能错误地非零，分布外请求和奖励投机仍需独立评估。Reward-to-go 同样只是把未来奖励分配给先前动作的一种估计，不能把它解释成每步都有已知的因果真值。

这三个计算各自回答一个验收问题：$0.6/N$ 检查有效动作是否仍有梯度，0.693 检查教师是否提供独立于组均值的方向，0 与 0.6 检查安全评分如何改变最终奖励。把它们用于异步仓库任务前，先核对概率对应的动作、前缀和行为版本；下一节从这个输入契约推导真正的 ratio。`,
    },
    {
      id: "math-async-ratio",
      type: "derivation",
      title: "异步 ratio：行为版本、训推引擎与动作支持集",
      body: String.raw`仓库任务的一个动作在生成日志里概率是 0.2，但把同一旧模型搬到训练引擎重算却得到 0.25，当前模型则给出 0.30。若只比较两次训练端概率，看起来更新幅度不大；我们要算清这是否漏掉了生成端差异，并检查采样时被屏蔽的动作能不能靠重要性权重补回来。

**问题与符号。** Partial Rollout、Forge 和 slime 都把长轨迹与训练时序分开，但不能因此把旧轨迹称为当前策略样本。对一个真实模型动作 $a$ 和已记录前缀 $s$，令 $\mu(a|s)$ 为生成时实际行为分布，$\pi_o^{\mathrm{train}}$ 为同一旧 checkpoint 在训练引擎重算的分布，$\pi_\theta^{\mathrm{train}}$ 为当前训练分布。每个分布均为词表上的归一化向量，包含约定的温度与采样支持集处理。

**第一步：把概率比拆成可观测的两层。** 在分母非零处，乘入再除去旧训练端的概率，插入值为 1 的因子，就把同一个 ratio 拆成参数变化与引擎差异：

$$r(a,s)=\frac{\pi_\theta^{\mathrm{train}}(a|s)}{\mu(a|s)}
=\underbrace{\frac{\pi_\theta^{\mathrm{train}}(a|s)}
{\pi_o^{\mathrm{train}}(a|s)}}_{\text{参数更新}}
\underbrace{\frac{\pi_o^{\mathrm{train}}(a|s)}{\mu(a|s)}}_{\text{训推差异}}.$$

即使 policy version 完全相同，第二项也不必是 1。教学取 $\mu=0.2,\pi_o^{\mathrm{train}}=0.25,\pi_\theta^{\mathrm{train}}=0.30$，两层分别是 1.2、1.25，实际 ratio 为 1.5；只用旧训练端重算概率会漏掉后一因子。

**第二步：ratio 如何进入 CISPO。** 令 $\ell=\log\pi_\theta^{\mathrm{train}}(a|s)$，冻结优势 $A$ 和裁剪权重 $w=\operatorname{sg}(\min(r,u))$。这里选择上侧裁剪以对应 M1 无有效下界的披露，不是将前面教学双侧区间追认为原配置。最大化局部 $J=wA\ell$，有 $\partial J/\partial\ell=wA$。教学 $u=1.2,A=0.5,r=1.5$ 给出 0.6；若忘记 detach 且位于未裁剪区，会对 $r\ell$ 额外求导。$u=1.2$ 只是教学值。

**第三步：token 与轨迹修正不可交换。** 上面的 0.6 是局部系数，不能据此宣布整段旧轨迹已校正。在固定前缀上，对可积的动作统计量 $f(a,s)$，$\mathbb E_{a\sim\mu}[r(a,s)f(a,s)]=\mathbb E_{a\sim\pi_\theta}[f(a,s)]$ 需要目标支持集被行为策略覆盖。整段轨迹 $\tau$ 还涉及访问到哪些前缀。若初始分布、环境转移和工具协议相同，记录全部模型动作，则环境概率在轨迹比中抵消：

$$\frac{P_\theta(\tau)}{P_\mu(\tau)}
=\prod_{t:\,\text{model action}}r_t.$$

分片可能由多个行为版本生成，分母须逐动作记录。只在 suffix 乘 token ratio，不能自动修正 prefix 的状态分布；GSPO 的几何平均也不是这个完整乘积。环境观察影响后续上下文，但不是模型动作，不能混入策略 logprob 的乘积或 NLL 目标。

**第四步：支持集手算。** 设采样行为 $\mu=[0.6,0.4,0]$，目标 $p=[0.3,0.3,0.4]$。第三动作从来采不到，简单 ratio 无法估计其 0.4 的概率质量，甚至 $\mathbb E_\mu[p_a/\mu_a]=0.6\ne1$。若保留同一 mask 并把目标条件化为 $p'=[0.5,0.5,0]$，ratio 变为 $[5/6,1.25]$，期望恢复 1，但目标已换成受限支持上的条件分布，不是原始 $p$。

**追问与披露边界。** TITO 保住 token ID、边界及动作语义，routing replay 对齐专家选择，freshness 控制参数滞后；三者分别对应不同误差来源。上述分解是概率恒等式，不声称 GLM-5 的 IcePop 或 MiniMax 的全部辅助项就是此简化实现，也不能从报告没有给出的逐阶段阈值反推默认值。

回到日志，应该核对的是实际 ratio 1.5，而不只是参数变化的 1.2；支持集例子中缺失的 0.4 也不能靠从未采到的动作恢复。先保存实际行为 logprob、采样 mask 和 token 边界，再决定修正目标。下一节在这些输入对齐的前提下，计算教师差值的期望梯度，以及裁剪会带来多少偏差。`,
    },
    {
      id: "math-opd-gradient",
      type: "derivation",
      title: "跨阶段 OPD：group size=1 的方向从哪里来",
      body: String.raw`代码助手经过后续训练后，某类原本会写的修复开始退化。我们保存了早期模型作为教师，但每题只生成一条当前学生轨迹，无法靠组内好坏比较获得优势。本节用同一前缀上的两个候选 token 算出教师如何提供方向，再检查异步采样和权重裁剪是否改变这个方向。

**定义与维度。** 在固定学生前缀 $s$ 上，当前学生分布为 $p=\operatorname{softmax}(z)\in\mathbb R^V$，前序 checkpoint 教师分布为 $t\in\mathbb R^V$；$z$ 是学生 logits，$V$ 是词表大小，$a$ 是采样动作，$\operatorname{sg}$ 表示本轮停止梯度。假设所需概率均正且教师冻结。GLM-5 披露的逐 token 信号是

$$A(a)=\operatorname{sg}\!\left[\log t_a-\log p_a\right].$$

它不是 $R-\bar R$；只有一条 rollout 也可在每个 token 得到非零方向。下面先分析同前缀、无裁剪、学生采样的局部梯度，再说明异步与轨迹分布的边界。

**第一步：对采样目标求导。** 把本轮 $A(a)$ 冻结后，最大化 $A(a)\log p_a$ 的 logits 梯度为 $A(a)(e_a-p)$，其中 $e_a$ 是动作 $a$ 的 one-hot 向量。利用 log-softmax 的导数，对 $a\sim p$ 求期望，并把第 $v$ 个分量的同类项合并：

$$g_v=\mathbb E_{a\sim p}[A(a)(\mathbf1[a=v]-p_v)]
=p_v\left(A(v)-\sum_ap_aA(a)\right).$$

**第二步：与固定前缀 reverse KL 对照。** 上式已经给出更新方向；为了理解它在逼近什么分布，再独立求一个已知距离的梯度。定义 $K=\sum_ap_a\log(p_a/t_a)$，利用 softmax 导数和 $\sum_ap_a=1$，

$$\frac{\partial K}{\partial z_v}
=p_v\left(\log\frac{p_v}{t_v}-K\right)=-g_v.$$

因此在这些局部条件下，教师差值的期望上升方向等于固定前缀 reverse KL 的下降方向。这个结论是梯度对照，不要求对冻结的优势反传，也不把 sampled loss 的数值等同于 KL 值。

**第三步：手算二词表。** 取 $p=[0.4,0.6],t=[0.8,0.2]$，则 $A=[\log2,\log(1/3)]\approx[0.693147,-1.098612]$。第一个 logit 的期望上升方向为

$$g_1=0.4(0.6)\log2+0.6(-0.4)\log(1/3)
=0.24\log6\approx0.430022.$$

第二个方向为 $-0.430022$，两者之和为零，符合 softmax 对共同平移不敏感。若把单样本奖励减自身均值，两者却都会失去该教师信号，所以 group=1 不是 GRPO baseline 的新性质。

**第四步：接上异步分布与长度分母。** 若固定前缀上的行为分布是 $\mu$，无裁剪权重 $p_a/\mu_a$ 可把上面的动作期望修正回来。例中 $\mu=[0.5,0.5]$，ratio 为 $[0.8,1.2]$。若教学性地裁上界到 1，期望方向变成

$$0.5(0.8)\log2(0.6)+0.5(1)\log(1/3)(-0.4)
\approx0.386078,$$

已不等于 0.430022。这是裁权重的偏差，不是反传实现错误。若有 $N$ 个有效动作并做 token 均值，每个位置的系数还需除以 $N$；若按任务域混合，还需使用第 22 章的域分母。

**追问。** 为什么不能据此宣称整个异步 GLM-5 流程精确最小化 reverse KL？前缀状态分布、裁剪与 freshness 选择都未包含在固定前缀证明里；若对整条轨迹目标求导，还须处理后续状态和回报。教师是前序阶段 checkpoint，不必读取 gold answer；这与特权上下文 OPSD 的信息条件不同。蒸馏强度和教师选择没有公开时，必须实验确定，不能由一个终局分数反解。

一条轨迹并不等于没有监督：这个二词表例子的期望上升方向为 0.430022，来源是教师与学生的分布差，而不是组相对奖励。上界裁剪后变成 0.386078，说明稳定权重的同时已经改变期望。实现时先用有限差分核对固定前缀结果，再用保留集检查能力是否恢复；下一节还要核算教师与长任务进入异步流水线后的等待和预算。`,
    },
    {
      id: "math-agent-budget",
      type: "derivation",
      title: "Agent 预算：关键路径、前缀复用与陈旧度",
      body: String.raw`仓库修复可以同时检查几个文件，也可以复用多条尝试共有的长前缀。团队因此希望加大并发、合并前缀，让训练更快；但有依赖的检查不能并行，计算复用也可能误改样本权重。本节分别算墙钟时间、重复计算量和队列中的版本年龄，判断速度收益来自哪里、代价落在哪里。

**先定义单位。** 一个任务图包含子任务耗时 $t_j$（秒）、依赖边和编排开销 $h$（秒）。总工作量 $W$ 与墙钟延迟 $T$ 不同。理想无限并发下，用 $F_j$ 记录第 j 个任务在其依赖完成后的结束时刻：

$$W=\sum_jt_j+h,\qquad
F_j=t_j+\max_{i\to j}F_i,\qquad
T=h+\max_jF_j.$$

无前驱时最大值取零。沿依赖图的拓扑顺序递推 $F_j$，得到关键路径的完成时间；真实系统还受并发槽位和工具限流约束。

**第一步：手算依赖代价。** 三个子任务为 $[4,6,3]$ 秒，$h=2$。全部独立时 $W=15$，$T=8$，加速 $15/8=1.875$。若第三个依赖第二个，关键链是 $6+3=9$，$T=11$，加速仅 $15/11\approx1.363636$。PARL 优化编排器时，增加子 Agent 数量不保证缩短关键链，更不保证降低总工作量。

**第二步：前缀合并节约什么？** 并行只是重排时间，若要减少重复计算，还需利用轨迹结构。假设三条训练轨迹共享 $P=1000$ token 前缀，各有 $S=100$ token 后缀。在简化的线性 token 工作量账本中，不复用计 $3(P+S)=3300$，只算一次共享前缀计 $P+3S=1300$，比值约 2.538462。真实 attention、反传、路由和通信并不严格线性，所以这不是 Forge 的实测加速推断。

计算复用也不能改统计权重：若原目标对每条轨迹的前缀都计 loss，共享节点的权重应为原三次出现的权重之和；若前缀只是 observation，原先无 loss，复用后也不应加 loss。各分支仍需正确 causal mask 和位置。只把前缀计成一个普通样本会改变目标。

**第三步：异步稳定吞吐的边界。** 计算加快以后，若生成端继续扩大并发，瓶颈可能转到队列。令候选到达率为 $\lambda$（轨迹/秒），平均排队加服务时间为 $W_q$（秒）；稳定系统中，每秒进入的轨迹乘平均停留秒数，按 Little 定律给出平均在途数 $L$：

$$L=\lambda W_q.$$

教学取 $\lambda=2,W_q=5$，得到在途约 10 条。若训练平均每秒推进 $u=0.4$ 个版本，粗略预期版本年龄为 $uW_q=2$；这只是时序量，不是 KL 或 ratio 的界。

Partial Rollout 降低一次调度阻塞，但总生成 token 不自动减少；Windowed FIFO 改变完成任务的消费时序，却不能用无记录地丢掉慢任务来伪装加速。应同时报告完成率、生成/优化 token、工具秒、GPU-hours、等待时间、版本年龄和真实 ratio 尾部。

**追问与边界。** 何时会越异步越慢？当到达率超过服务率，队列和陈旧度持续增长，稳定 Little 定律的有限均值假设已不成立。何时更高吞吐不等于更好训练？当过期过滤使困难长任务系统性被排除，或过旧样本的权重集中、独立能力下降。报告未披露的队列阈值与批次大小无法由某个速度数字反推。

这组数字支持三个独立决策：任务有依赖时按 11 秒而非 8 秒估计完成时间；前缀复用将线性工作量从 3300 降到 1300，但要保留原损失权重；约 10 条在途、2 个版本年龄则提示记录 freshness 与真实 ratio，不能直接当作偏差上界。下一章把这些账本和逐题质量一起放进选型实验，第 28 章再展开完整异步系统。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：审计动作掩码、CISPO 系数与教师方向",
      body: String.raw`下面是可独立运行的 Python 标准库例子。每行代表一个不同前缀上的 token；概率是教学输入，不是同一个位置上的完整词表分布。旧响应、工具返回与新响应分开标记，避免把环境文本当作模型动作。

~~~python
from math import isclose, log

# Only fresh model actions are trained in this teaching setup.
rows = [
    ("prompt", "input", None, None, None),
    ("cached", "old_response", 0.3, 0.3, 0.4),
    ("tool", "observation", None, None, None),
    ("new_a", "new_response", 0.2, 0.4, 0.8),
    ("new_b", "new_response", 0.4, 0.2, 0.1),
]
lower, upper, group_advantage = 0.8, 1.2, 0.5
mask = [int(origin == "new_response") for _, origin, *_ in rows]
assert mask == [0, 0, 0, 1, 1]
coefficients, teacher_gaps = [], []

for row, enabled in zip(rows, mask):
    token, origin, old_p, student_p, teacher_p = row
    if not enabled:
        continue
    if not all(0 < p <= 1 for p in (old_p, student_p, teacher_p)):
        raise ValueError("probabilities must be in (0, 1]")
    ratio = student_p / old_p
    weight = min(upper, max(lower, ratio))
    # In autodiff code, detach weight and the teacher advantage.
    coefficient = weight * group_advantage
    gap = log(teacher_p) - log(student_p)
    coefficients.append(coefficient)
    teacher_gaps.append(gap)
    print(token, "CISPO:", round(coefficient, 3), "OPD:", round(gap, 3))

assert len(coefficients) == 2
assert isclose(coefficients[0], 0.6)
assert isclose(coefficients[1], 0.4)
assert isclose(teacher_gaps[0], log(2))
assert isclose(teacher_gaps[1], -log(2))
normalized = [c / sum(mask) for c in coefficients]
assert all(isclose(a, b) for a, b in zip(normalized, [0.3, 0.2]))

task_seconds, overhead = [4, 6, 3], 2
serial = sum(task_seconds) + overhead
parallel = max(task_seconds) + overhead
assert (serial, parallel) == (15, 8)
print("ideal latency speedup:", serial / parallel)
assert isclose(0.9 * 0.0, 0.0)
assert isclose(0.6 * 1.0, 0.6)
~~~

两个新 token 的 CISPO 未归一化系数应为 0.6、0.4，OPD 差值为 0.693、-0.693；若按两个有效 token 平均，CISPO 系数再除以 2。代码没有把两个优势相加，它们代表两种独立监督，避免误导为 GLM-5 或 MiniMax 的统一混合损失。

真实实现还需检查 tokenizer/chat template、采样掩码、rollout 策略版本、工具边界和截断原因。本例只验证局部数学与动作归属；不能据此声称完成了训练栈的 on-policy 保证，也未模拟自动微分或奖励服务。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：系统速度、模型能力与安全保证混为一谈",
      body: String.raw`**MuonClip 与概率裁剪混淆。** 前者监测 attention logits 并调整相关投影，服务于预训练稳定；CISPO 裁剪冻结的 token IS 权重；GSPO 使用长度归一化序列似然比。三者都有“稳”的目标，但监测量和梯度路径不同。

**异步生成就叫 on-policy。** Partial Rollout、Windowed FIFO 和异步 slime 都可能复用较旧策略的轨迹。应记录行为概率与版本、控制陈旧度、核验支持集，再讨论重要性修正。丢掉慢任务还会改变训练分布，不能把这种偏差当作纯吞吐优化。

**把数值故障归咎于错误的浮点常识。** M1 报告用 FP32 LM head 缓解实际的训推 kernel 概率偏差，不是因为 BF16 指数范围无法表示 1e-7 与 1e-8。作者观察到大量极小梯度，才讨论 AdamW epsilon 的影响；减小 epsilon 不是通用防 NaN 技巧，必须结合梯度尺度与实验验证。

**用 TITO 或某个 top-k 函数宣称彻底确定。** TITO 解决 token 记录与重分词对齐，不自动修复路由、注意力、采样掩码和数值差异。GLM-5 报告的非确定性 DSA top-k 故障伴随熵骤降，而不是另一处二级描述中的熵激增。所测栈使用 torch.topk 并冻结 indexer，不能保证所有设备、并列值和版本下都确定。

**把系统加速当作能力因果证据。** Forge 的共享前缀加速依赖重复程度，PARL 的墙钟改善依赖可并行任务结构。应分别测样本吞吐、单位轨迹成本、任务成功率和最终延迟；模型多调用几个 Agent 并不自动变聪明。

**把自我进化理解成无约束自改。** M2.7 的公开工作流仍有研究者设定方向。教学上的合理部署需要隔离实验环境、日志、可回滚变更、独立保留集与发布审批；模型参与研发不意味着自动批准自己的上线。

**把厂商报告当独立审计。** GLM-5 的 SWE-bench Verified 为 77.8，BrowseComp 在无上下文管理与有管理时为 62.0、75.9；工具脚手架属于结果的一部分。报告里也有其他模型在某项更高，不能写成“全面最佳”。安全奖励为零的代数性质同样不是对现实安全的证明。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "比较表：开放机制与公开对齐各学到什么",
      body: String.raw`按问题查案例：等待长任务看切片和并行，训推不一致看版本与 token 流，能力回退看教师监督。报告中的具体收益只对应其披露的模型与条件。

${reportNotes}

| 系列 | 主要阶段或数据 | 反馈与系统重点 | 必须保留的边界 |
|---|---|---|---|
| Kimi K1.5 | 长 CoT 监督、长上下文 RL、long2short | 结果/CoT 反馈，Partial Rollout | 分片不省总 token，压短存在准确率代价 |
| Kimi K2 | 工具规格、任务 rubric、合成轨迹、SFT/RL | 真实加合成环境，自评偏好；MuonClip 属预训练 | judge critic 不等于 value critic |
| Kimi K2.5 | 图文预训练、Zero-Vision SFT、视觉/Agent RL | PARL 冻结子 Agent，优化编排器 | early fusion 是数据时机；加速限特定任务 |
| MiniMax-01 | 短/长 SFT、短/长 DPO、短 online RL | 混合注意力，四类奖励 | 最后 RL 不是百万 token 全长训练 |
| MiniMax-M1 | 继续预训练、冷启动 SFT、CISPO | token 权重 detach，数值与长序列优化 | 更新步数和租赁估算都不是通用总成本 |
| M2 / M2.5 | Agent 轨迹 SFT 与 RL，扩展工作区任务 | 全注意力，产物验证，Forge | 不沿用 M1 架构标签，不猜逐版本超参数 |
| M2.7 | 继续扩展 Agent 任务，参与研发迭代 | 自我改进脚手架，独立验收需求 | 后续已有报告；博客工作占比仍为自报 |
| GLM-5 | SFT、推理 RL、Agent RL、通用 RL、跨阶段 OPD | TITO、异步一致性、前序 checkpoint 教师 | 能力回退需分域评测，不保证全部恢复 |

## 闭源公开对齐：写出已知部分，也写出未知部分

| 公开材料 | 可核验的训练机制 | 奖励或监督来源 | 不能据此推断 |
|---|---|---|---|
| OpenAI Deliberative Alignment | 用规范推理样本 SFT，再做高计算 RL | 基于安全规范生成/过滤数据，带规范的 judge | o1/o3 的全部能力数据、优化器与预算 |
| OpenAI Safe-Completions | 在安全约束内提高帮助性，允许安全替代回答 | 对问题与最终回答评分的 helpfulness/safety RM | 分类器永不漏判、所有现实风险已消除 |
| Gemini 2.5 技术报告 | SFT、RM、RL 扩展，多模态与工具任务 | 可验证奖励与模型生成式奖励 | 固定 PPO/GRPO/critic 细节，或沿用 Gemma 方法 |
| Anthropic Constitutional AI | 先自我批评/修订做监督学习，再用 AI 偏好训练 PM 并 RL | 宪法原则、模型比较与偏好信号 | Claude 3.5/4 的完整现行配方或完全无人类选择 |
| Anthropic HH-RLHF | 历史公开的人类偏好训练与迭代 | 新鲜人类反馈和偏好模型 | 当前产品仍逐项沿用旧论文超参数 |

Deliberative Alignment 的“规范生成、推理、过滤”是构造 SFT 数据的过程，不应被误拆成四个独立训练阶段。Constitutional AI 的原则来自人类选择，AI 偏好也不是无来源的客观真理。Gemini 的报告足以说明反馈类型，但不能把 Gemma 的 BOND/WARM/WARP 自动迁移成 Gemini 的事实。

这三个名字各自对应一个不同对象：BOND（Best-of-N Distillation）让策略学习从多个候选中择优所得到的输出分布，目标是减少每次部署都大量采样的成本；WARM（Weight Averaged Reward Models）在参数空间平均多个奖励模型，以研究评分泛化和奖励过优化；WARP（Weight Averaged Rewarded Policies）平均经过奖励优化的策略，研究奖励提高与偏离参考模型之间的权衡。Gemma 3 报告明确说使用它们的改进版本，但没有因此公开所有改动细节。一个蒸馏输出分布，一个合并评分器，一个合并策略，不能当作同一种平均操作，更不能跨产品推断。

**教学性选择原则：** 可执行任务先保证工作区和验收器可信；长期运行先解决轨迹版本、掩码与调度；连续多域训练先建能力回归集；安全问题同时检查帮助性、误拒与漏拒。优化器是这个系统中的一个模块，不能替代其余验证。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：用一个工程故障串起整章",
      body: String.raw`**30 秒回答：**“Agent RL 的难点是长轨迹与环境交互。Kimi 用 partial rollout 缓解长任务阻塞，用 long2short 和 PARL 管理推理预算；MiniMax 用 CISPO 的冻结 token 权重和 Forge 的调度、前缀共享支撑规模化训练；GLM-5 用 TITO 和训推一致性处理确保学的是实际动作，再用跨阶段 OPD 缓解遗忘。闭源公司的安全方法只引用已公开机制，不推断完整训练配方。”

**训练吞吐突然下降，先改算法吗？** 先拆生成、环境等待、奖励判分、训练与空闲时间，检查轨迹长度分布和慢任务。若瓶颈是网络工具限流，更换 policy loss 不会直接解决问题。

**CISPO 超出 ratio 上界为何还有梯度？** 裁剪并冻结的是乘在 log-prob 前的权重，不是把整个 token surrogate 截成常量。需要把公式的 stop-gradient 位置写出来，再讨论正负优势。

**GLM-5 的 group size=1 为什么不是错误？** 此时优势由教师和学生的逐 token log-prob 差提供，不是减去单样本自身的奖励均值。它属于跨阶段 OPD 的监督来源改变。

**PARL 为什么不同时训练所有子 Agent？** 报告中冻结子 Agent，把它们作为环境的一部分，只更新编排器，便于把训练目标集中到拆解与协调。是否联合训练是另一种设计，需要分析环境非平稳性和信用分配。

**“模型能自我进化”怎样验收？** 把提议变更、运行实验、产物验证和上线批准分开。保存独立测试、权限边界与回滚记录，检查改善是否超出模型参与选择的训练或开发集。30–50% 的特定流程自报占比不能替代质量与风险评估。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：认清裁剪对象与证据层级",
      body: "先写出被优化的对象，再说明数据来自谁、反馈由谁提供。",
      questions: [
        {
          q: "12-token 轨迹切成三段，每段 4 token，是否把总生成工作量减少为三分之一？",
          a: "没有。总生成仍为 12 token，改变的是调度与同步等待。旧片段要保留上下文、行为策略和奖励归属；它们不会自动成为当前策略的新样本。",
        },
        {
          q: "工具返回与助手新生成的片段都在上下文中，是否都应计入助手的策略损失？",
          a: "不应。工具返回是环境信息，要供后续动作读取；助手实际生成的动作才对应其行为概率和策略损失。上下文可见性与损失掩码是不同问题。",
        },
        {
          q: "CISPO 中 ratio=2、区间 [0.8,1.2]、优势=-0.5 时，未归一化的 log-prob 梯度系数是多少？",
          a: "冻结后的权重为 1.2，系数为 -0.6；若目标是最大化 J，会降低该 token 的倾向。不能因为权重被裁剪就断言梯度为零。",
        },
        {
          q: "三个独立任务耗时 4、6、3 秒，编排与汇总另需 2 秒。串行与理想并行各多久？若第三个依赖第二个，还能用相同公式吗？",
          a: "串行 15 秒，独立且资源足够时并行为 max(4,6,3)+2=8 秒。若第三个依赖第二个，关键路径变成 max(4,6+3)+2=11 秒，不能把依赖任务当成同时开始。",
        },
        {
          q: "Windowed FIFO 是把队列里最老的未完成任务直接丢弃吗？",
          a: "不是。它允许在滑动窗口内取已完成轨迹，窗口外仍有顺序限制，前沿随队首任务被消费而前进。随意丢弃慢任务会改变任务分布。",
        },
        {
          q: "为什么 GLM-5 的跨阶段蒸馏可以用一条 rollout，却不等于特权上下文 OPSD？",
          a: "信号来自前序 checkpoint 教师与当前学生的 token log-prob 差，不依赖组内奖励均值；教师也不必读取参考答案，所以不等于同模型加 privileged context 的 OPSD。",
        },
        {
          q: "新版本修复任务更准，但常识测试变差。下一轮评估应怎样安排？",
          a: "保留修复任务与已有能力的独立测试，按相同设置分别报告变化。不能只展示上涨的一项；若引入教师保留旧能力，还要用保留集确认是否真正恢复。",
        },
        {
          q: "安全乘积奖励在 safety=0 时为零，是否证明部署后永远安全？",
          a: "没有。零分性质依赖评分器正确识别风险；漏判、分布外输入与奖励投机仍存在。需要独立安全评估，不能把数学门控当作现实保证。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：从真实动作到可归因的系统收益",
      body: "先标出概率属于哪个版本和引擎，再说明固定前缀或完整轨迹的范围。",
      questions: [
        {
          q: "一个动作的行为概率 0.2、旧训练引擎重算概率 0.25、当前训练概率 0.30。写两层 ratio；教学 CISPO 上界 1.2、A=0.5 时梯度是多少？",
          a: String.raw`参数比为 $0.30/0.25=1.2$，训推比为 $0.25/0.2=1.25$，真实 ratio 为 1.5。冻结裁剪权重后，最大化目标对 log-prob 的系数为 $1.2\times0.5=0.6$，若 token 均值再除以有效动作数。**得分点：** old version 相同不保证概率一致，detach 位置正确；token ratio 只修正固定前缀动作，不自动修正旧前缀的访问分布。`,
        },
        {
          q: "固定前缀 p=[0.4,0.6]、教师 t=[0.8,0.2]，证明单条学生采样也能给出 OPD 信号，并算第一个 logit 的期望方向。",
          a: String.raw`冻结信号 $A=[\log2,\log(1/3)]$，采样梯度为 $A(a)(e_a-p)$，所以 $g_1=0.4\log2(0.6)+0.6\log(1/3)(-0.4)=0.24\log6\approx0.430022$。它等于固定前缀 reverse KL 的负梯度，而不是单样本组中心化。**得分点：** 信号来自教师分布，教师冻结；有裁剪、旧状态或整轨迹目标时不再直接套用该等式。`,
        },
        {
          q: "三个子任务耗时 4、6、3 秒，第三个依赖第二个，编排开销 2 秒。算延迟和加速，再说明共享 1000-token 前缀的三条 100-token 后缀轨迹能否证明固定系统加速。",
          a: String.raw`串行 15 秒，关键链 $6+3$ 秒，所以并行延迟 $9+2=11$ 秒，加速 $15/11=1.363636$。简化前缀账本由 $3(1000+100)=3300$ 降到 $1000+3(100)=1300$，比值 2.538462。**得分点：** 不能忽略依赖；token 工作量比不是实测墙钟加速；复用节点须累加原目标权重并保留各分支 mask，不能改变训练数据含义。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "Gemma 3 Technical Report",
      url: "https://arxiv.org/html/2503.19786v1",
      evidence: "Post-Training Techniques 与参考文献：BOND/WARM/WARP 的改进版本；不迁移为 Gemini 配方",
    },
    {
      label: "Kimi k1.5: Scaling Reinforcement Learning with LLMs",
      url: "https://arxiv.org/html/2501.12599",
      evidence: "原始报告：长上下文 RL、Partial Rollout、long2short；短模型 60.8 与 3,272 token 的协议",
    },
    {
      label: "Kimi K2: Open Agentic Intelligence",
      url: "https://arxiv.org/html/2507.20534",
      evidence: "原始报告：MuonClip/QK-Clip 的 attention-logit 信号、工具合成、rubric 和 Self-Critique Reward",
    },
    {
      label: "Kimi K2.5: Visual Agentic Intelligence",
      url: "https://arxiv.org/html/2602.02276",
      evidence: "原始报告：视觉数据时机、Zero-Vision SFT、冻结子 Agent 的 PARL；区分 K2 Thinking 的 Toggle 实验",
    },
    {
      label: "MiniMax-01: Scaling Foundation Models with Lightning Attention",
      url: "https://arxiv.org/html/2501.08313",
      evidence: "原始报告：Text-01 五阶段、短/长序列长度与奖励维度；Vision-01 配方另列",
    },
    {
      label: "MiniMax-M1: Scaling Test-Time Compute Efficiently with Lightning Attention",
      url: "https://arxiv.org/html/2506.13585",
      evidence: "原始报告：CISPO Eq. 3–4、M1-80k Table 2、RL 租赁口径、FP32 LM head 与小梯度",
    },
    {
      label: "The MiniMax-M2 Series, v1",
      url: "https://arxiv.org/html/2605.26494v1",
      evidence: "2026-05 原始报告：M2/M2.5/M2.7、全注意力、任务工作区、CISPO、Forge；Table 4 含提升与回退",
    },
    {
      label: "Forge: A Scalable Agent RL Framework and Algorithm",
      url: "https://www.minimax.io/news/forge-scalable-agent-rl-framework-and-algorithm",
      evidence: "官方工程博客，结合后续报告核对 Windowed FIFO、Prefix Tree Merging 与加速适用范围",
    },
    {
      label: "MiniMax-M2.7 Official Release",
      url: "https://www.minimax.io/news/minimax-m27-en",
      evidence: "官方博客，公开信息有限：研究者指导下的工作流自报比例；不视为独立复现或无约束自改证据",
    },
    {
      label: "GLM-5: from Vibe Coding to Agentic Engineering",
      url: "https://arxiv.org/html/2602.15763",
      evidence: "原始报告：SFT/RL 阶段、interleaved/preserved thinking、TITO、slime、IcePop 与 Table 7",
    },
    {
      label: "GLM-5: On-Policy Cross-Stage Distillation, §3.5",
      url: "https://arxiv.org/html/2602.15763v1#S3.SS5",
      evidence: "原始公式：前序 checkpoint 教师、逐 token log-prob 差与 group size=1；非组内中心化",
    },
    {
      label: "Deliberative Alignment: Reasoning Enables Safer Language Models",
      url: "https://arxiv.org/html/2412.16339",
      evidence: "OpenAI 公开方法：规范推理数据 SFT 与带规范 judge 的 RL，不等于产品完整能力配方",
    },
    {
      label: "From Hard Refusals to Safe-Completions",
      url: "https://arxiv.org/html/2508.09224",
      evidence: "OpenAI 公开方法：最终回答的帮助性/安全评分与奖励门控；不保证评分器无误",
    },
    {
      label: "Gemini 2.5 Technical Report",
      url: "https://arxiv.org/html/2507.06261",
      evidence: "原始报告：SFT/RM/RL、多模态工具与可验证/生成式奖励；未据此核实固定优化器或 critic",
    },
    {
      label: "Constitutional AI: Harmlessness from AI Feedback",
      url: "https://arxiv.org/html/2212.08073",
      evidence: "Anthropic 公开历史方法：批评/修订监督学习与 AI 偏好 RL；不冒充 Claude 当前完整配方",
    },
    {
      label: "Training a Helpful and Harmless Assistant with RLHF",
      url: "https://arxiv.org/html/2204.05862",
      evidence: "Anthropic 历史公开人类偏好与反馈迭代证据，不推定后续产品沿用全部细节",
    },
    {
      label: "agentic-rl-analysis: 工业与 Agentic Training，固定提交 66ae4423",
      url: "https://github.com/xavierzhang2002/agentic-rl-analysis/tree/66ae4423b36270ef50a288fb1bb2e1b31c46c329/docs/post-training/ch2",
      evidence: "二级材料：2.2、2.4、2.5、2.7、2.10 全文阅读；CISPO、MuonClip、调度和产品披露已按原文勘误",
    },
  ],
};

export default chapter;
