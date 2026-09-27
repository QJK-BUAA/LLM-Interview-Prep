# Agentic RL 核心章节证据与纠错

核验日期：2026-09-27。范围仅为第 25、26 章。摘要用于核对论文身份、动机和报告范围；具体公式及理论边界另读正文指定章节。以下是证据核验，不是独立复现实验，也不是对论文证明的形式化验证。

## 固定上游

- 仓库：https://github.com/xavierzhang2002/agentic-rl-analysis
- 本地：`/tmp/agentic-rl-analysis-66ae4423`
- `git rev-parse HEAD`：`66ae4423b36270ef50a288fb1bb2e1b31c46c329`
- 完整阅读 `docs/agentic-rl/ch1/1.1-overview.md`，SHA-256：`4214d716166e72ea18a7e4c63607f5f6803bc13ec65c0c54f06b5f27816532f1`
- 完整阅读 `docs/agentic-rl/ch1/1.2-reward-stability.md`，SHA-256：`6dd5dd8addc3ef6cfedd82ef3257730cc6323551eebae75866f4dffb96b3d603`
- 上游是选题与覆盖来源，不作为独立学术证据。其“47 篇”及挑战频率没有随上述两节提供可复算编码表，本次不复述百分比。
- 下列版本是实际核验版本；部分修订晚于上游所称的 2026 Q1。章节不把后续修订伪装成 Q1 已知结论。日期区分首次提交与核验版本，不根据 arXiv 编号推断会议录用。

## 基础建模

### MDP、POMDP 与长期回报

- Kaelbling, Littman, Cassandra, *Planning and acting in partially observable stochastic domains*, Artificial Intelligence 101 (1998), 99–134。
- 一手全文：https://people.csail.mit.edu/lpk/papers/aij98-pomdp.pdf
- 已核对摘要及第 1、2 节。短摘录：“maximize the expected sum of reward that it gets on the next k steps”。
- 支持：MDP 本来就研究序贯决策和长期回报；部分可观测问题需要动作、观测历史及信念状态。上游“RL 假设短程、可验证、单步决策”错误。环境状态的 Markov 性不代表单次工具观测具备 Markov 性。
- Sutton & Barto, *Reinforcement Learning: An Introduction*, 第二版，MIT Press 2018，作者提供 2020 PDF 修订。
- 作者页面：https://incompleteideas.net/book/the-book-2nd.html
- 全文：https://incompleteideas.net/book/RLbook2020.pdf
- 已核对版本和目录：第 3 章 MDP/returns/episodes、第 13.3 节 REINFORCE、第 13.4 节 baseline、第 17.3 节 observations/state。此条提供基础学习路径；本次不声称全文逐页核读。第 26 章基线恒等式另给完整推导与条件。

### ReAct

- *ReAct: Synergizing Reasoning and Acting in Language Models*。
- 摘要：https://arxiv.org/abs/2210.03629v3
- 首次提交 2022-10-06；v3 为 2023-03-10。
- 短摘录：“reasoning traces and task-specific actions in an interleaved manner”。
- 支持：推理、行动、外部反馈可以交错组织。边界：交互格式不是 RL 优化器；使用 ReAct 提示不意味着模型已经接受强化学习训练。章节不转述摘要中的基准分数。

## 五组核心方法

### IGPO

- 正确题名：*Information Gain-based Policy Optimization: A Simple and Effective Approach for Multi-Turn Search Agents*。
- 摘要：https://arxiv.org/abs/2510.14967v2
- 正文：https://arxiv.org/html/2510.14967v2#S3
- 首次提交 2025-10-16；v2 为 2026-03-24。摘要页标注 Accepted by ICLR 2026。
- 正文署名机构包括 Venus Team, Ant Group、中国人民大学及独立作者；不能直接写成“阿里巴巴论文”。
- 短摘录：“ground-truth answer and computed under teacher forcing”；“quantify this gain as the increment in log probability”。
- 第 3.2 节式 (3) 是标准答案 token 的平均 log probability，式 (4) 用相邻前缀的差并 stop-gradient；不是 Shannon 信息增益的通用定义。
- 第 3.3 节：IG 与 outcome 分别组归一化，再做 turn-level discounted return；仅 decision tokens 接受策略损失，工具返回被 mask。
- 纠错：“没有外部 RM”不等于“不依赖标注”。仍需标准答案，并结合 outcome supervision。不能保证任意同奖励组一定产生非零优势；若 IG 也相同，相对信号仍可消失。
- 向量化 teacher-forcing 减少重复前向开销，但不等于额外计算免费；正文的低开销报告不是所有轨迹长度与模型的保证。

### CM2

- 正确题名：*CM2: Reinforcement Learning with Checklist Rewards for Multi-Turn and Multi-Step Agentic Tool Use*。
- 摘要：https://arxiv.org/abs/2602.12268v2
- 正文：https://arxiv.org/html/2602.12268v2#S3
- 首次提交 2026-02-12；v2 为 2026-02-20。
- 正文机构：UCSB、Zoom Video Communications、UCF、UCLA、UIC。上游“字节跳动”不符。
- 短摘录：“Sparse in assignment; Dense in criteria”。
- 表 1 的七项是一个 checklist item 的结构字段：Evidence、Focus、Question、Pass/Fail、Strictness、Dependency、Weight，不是固定七种工具能力评分。
- 第 3 节区分 criteria granularity 与 assignment granularity；比较 trajectory/turn/step 三类 advantage。第 3.4.1 节基于依赖项及首次满足事件计分，backfill 仅用于 step-level variant。
- 纠错：不能概括成“每轮越密集反馈越好”；噪声 judge 下更密集分配可能更不稳。其 LLM judge、清单标注与模拟环境仍构成监督和建模假设。换到真实工具需要检查状态一致性与分布差异。

### SeeUPO

- 正确题名：*SeeUPO: Sequence-Level Agentic-RL with Convergence Guarantees*。
- 算法展开：Sequence-level Sequential Update Policy Optimization。
- 摘要：https://arxiv.org/abs/2602.06554v1
- 方法：https://arxiv.org/html/2602.06554v1#S4
- 条件及证明：https://arxiv.org/html/2602.06554v1#A1 和 https://arxiv.org/html/2602.06554v1#A2
- 首次提交 2026-02-06；核验 v1。正文机构为 Tongyi Lab, Alibaba Group。该摘要页没有支持上游“ICLR 2026”标签，章节不保留该会议断言。
- 短摘录：“Suppose the advantage function is accurately estimated”；“over a compact joint policy space”。
- 第 4 节把轮次视为顺序执行的虚拟 agent，后轮策略依赖前轮动作历史，不要求轮次统计独立。反向更新利用已更新后缀的概率比校正。
- 附录 B 定理 2 的范围是特定 multi-turn contextual bandit：固定有限轮次、紧策略空间、有界奖励、准确 advantage、正采样分布、满足性质的 drift/neighbourhood，以及理想 HAML argmax 更新。
- 边界：正文给出的共享神经网络、有限样本、PPO-style clipping 是实践实例。不能把理想更新定理自动视为任意 POMDP、任意 SGD 实现的全局最优保证。也不把作者对所分析算法组合的结论写成“任何 critic-free 多轮 RL 都不可能收敛”。
- 摘要同时写明 REINFORCE + GRAE 在所分析的不折扣条件下的结果，因此上游“RL 本来不处理多步”“无 critic 必然不收敛”尤其不成立。
- 分数纠错：摘要中的 43.3%–54.6% 对应 Qwen3-14B，24.1%–41.9% 对应 Qwen2.5-14B，是跨基准平均的相对增益区间，不是“AppWorld +43.3%、BFCL +24.1%”，也不是百分点。章节避免将其用于跨论文排名。

### ARLArena / SAMPO

- 正确题名：*ARLArena: A Unified Framework for Stable Agentic Reinforcement Learning*。
- 摘要：https://arxiv.org/abs/2602.21534v3
- 分析：https://arxiv.org/html/2602.21534v3#S4
- 方法：https://arxiv.org/html/2602.21534v3#S5
- 首次提交 2026-02-25；核验 v3 为 2026-07-04。摘要标注 To appear at ICML 2026；正文机构包括 UCLA 和 University of Wisconsin–Madison，不简化成唯一机构。
- 短摘录：“negative-advantage sequences with low IS ratios”；“sequence-level clipping, fine-grained advantage estimation, and dynamic filtering”。
- 四个诊断维度：importance sampling、advantage design、dynamic filtering、loss aggregation。统一平台还控制 BC、格式惩罚、必要 KL 与超参。
- 纠错：论文定位的一个主要失稳模式是负优势且低 ratio 的序列在宽容更新下累积，不是“所有极端 ratio 都只是变大”。SAMPO 结合序列约束、局部/全局优势与动态过滤；属于受控平台实证，不是所有 Agent 任务的必要充分条件。
- 第 4.4 节 loss aggregation 结果存在任务差异，不能宣称固定聚合在所有长度分布最优。章节不复制不同修订表格和图注里不一致的汇总分数。

### VCPO

- 正确题名：*Stable Asynchrony: Variance-Controlled Off-Policy RL for LLMs*。
- 算法名：Variance Controlled Policy Optimization。
- 摘要：https://arxiv.org/abs/2602.17616v2
- 正文：https://arxiv.org/html/2602.17616v2#S3
- 首次提交 2026-02-19；v2 为 2026-03-02。正文机构 MIT、NVIDIA；摘要页未提供上游“ICLR 2026”的录用依据，不保留该标签。
- 短摘录：“we still use the unclipped IS ratios to calculate ESS”。
- 第 3.2 节式 (5)：学习率按 off-policy ESS ratio 与 on-policy 参考值的比值平方根缩放，不是简单把学习率乘原始 ESS。
- 第 3.3 节 OPOB 同时考虑平方 IS 权重与梯度范数平方；第 3.5 节组合 detached truncated IS 与 ESS 缩放，正文默认截断阈值为 8。
- 边界：总体最优标量 baseline、同 batch 插入估计、截断 IS、样本筛选是不同操作。仅 stop-gradient 不消除样本相关性导致的偏差。章节只对准确未截断权重与动作无关 baseline 给出无偏恒等式。
- 摘要报告高异步、数学与工具任务实验；128-step lag 和 2.5 倍加速来自不同具体实验配置，不能拼成“所有长程任务在 128-step lag 下加速 2.5 倍”。章节不作此数值断言。

## 九个次级名称的实质覆盖

| 名称 | 核验的一手来源与题名 | 首次提交 / 核验版本 |
|---|---|---|
| EDGE-GRPO | https://arxiv.org/abs/2507.21848v1 ; *EDGE-GRPO: Entropy-Driven GRPO with Guided Error Correction for Advantage Diversity* | 2025-07-29 / v1 |
| ReGFT | https://arxiv.org/abs/2603.01223v2 ; *Learn Hard Problems During RL with Reference Guided Fine-tuning* | 2026-03-01 / v2 2026-03-05 |
| PF-PPO | https://arxiv.org/abs/2409.06957v5 ; *Policy Filtration for RLHF to Mitigate Noise in Reward Models* | 2024-09-11 / v5 2025-06-07 |
| ZeroSearch | https://arxiv.org/abs/2505.04588v3 ; *ZeroSearch: Incentivize the Search Capability of LLMs without Searching* | 2025-05-07 / v3 2026-05-19 |
| DARS | https://arxiv.org/abs/2508.13755v8 ; *Depth-Breadth Synergy in RLVR: Unlocking LLM Reasoning Gains with Adaptive Exploration* | 2025-08-19 / v8 2026-04-12 |
| ProRL | https://arxiv.org/abs/2505.24864v1 ; *ProRL: Prolonged Reinforcement Learning Expands Reasoning Boundaries in Large Language Models* | 2025-05-30 / v1 |
| GMPO | https://arxiv.org/abs/2507.20673v3 ; *Geometric-Mean Policy Optimization* | 2025-07-28 / v3 2025-10-18 |
| OTB | https://arxiv.org/abs/2602.07078v2 ; *The Optimal Token Baseline: Variance Reduction for Long-Horizon LLM-RL* | 2026-02-06 / v2 2026-06-21 |
| Dr. MAS | https://arxiv.org/abs/2602.08847v1 ; *Dr. MAS: Stable Reinforcement Learning for Multi-Agent LLM Systems* | 2026-02-09 / v1 |

### 短摘录、纠错与适用边界

1. **EDGE-GRPO**：摘要：“Entropy-Driven Advantage and Guided Error Correction”。不是只加一个普通 entropy bonus；要同时说明利用样本熵构造优势及引导纠错。证据来自推理基准，不直接推出真实多轮工具任务必然有效。
2. **ReGFT**：摘要：“train on them before RL”。用部分人工参考解引导模型合成其可模仿的正轨迹，再 SFT 为 RL 冷启动；不是新的 on-policy 更新器，也不是仅把人工完整证明照抄做 SFT。对后续 DAPO 的帮助属于论文数学基准实证。
3. **PF-PPO**：摘要：“coefficient of determination (R2) between the rewards and actual scores”。按奖励可靠性进行 policy filtration，并用外部真实成绩关联选择过滤策略；摘要没有支持“每个样本先得到已校准 RM uncertainty”的简化。筛选改变训练分布，不能顺便宣称保持原目标无偏。
4. **ZeroSearch**：摘要：“generating both useful and noisy documents”；“incrementally degrades the quality”。先轻量 SFT 得到检索模拟器，再通过文档质量课程训练。不是完全去除噪声，也不是无需监督或无需推理阶段真实搜索。真实 API 成本降低不等于训练总成本为零。
5. **DARS**：摘要：“increasing rollout size alone does not improve performance”。Difficulty Adaptive Rollout Sampling 用定向多阶段 rollout 重平衡难题；v8 区分深度与 breadth，DARS-Breadth 联合扩大训练实例广度。不能把 pass@k 增益写成 pass@1 必然上升；计算预算与题目采样分布必须记录。
6. **ProRL**：摘要：“KL divergence control, reference policy resetting, and a diverse suite of tasks”。reference policy 重置用于长期训练的正则锚点管理，不等同于刷新 rollout behavior policy，也不能据此声称自动修正旧数据 IS ratio。有限采样下 base 未解出不证明其解的数学概率为零。
7. **GMPO**：除摘要外核对 https://arxiv.org/html/2507.20673v3#S3 式 (3)–(6) 及 Algorithm 1。短摘录：“product and clipping operations ... carried out in log space”。几何聚合的是带符号处理的 importance-weighted advantage/surrogate；共同序列优势、无 clipping 时化为优势乘 token ratios 的几何平均。不是对任意含负数的环境奖励直接开方；完整目标还有 token-level clipping，不等于 GSPO 的序列 clipping。正文机构包括 UCAS、CUHK、HKUST、Microsoft Research，不简化为单一机构。
8. **OTB**：摘要：“Logit-Gradient Proxy ... using only forward-pass probabilities”；另读 https://arxiv.org/html/2602.07078v2#S3 。关注 token/sequence 梯度异质性，以累计梯度能量相关量构造方差控制，前向概率是梯度范数代理，不是精确全参数梯度范数。其组大小/节省 token 的结果仅属于论文配置。章节不把 OPOB 的总体标量公式冒充 OTB 的完整推导。
9. **Dr. MAS / Dr.MAS**：摘要：“normalizing advantages per agent using each agent's own reward statistics”。修正全局统计与不同角色 reward 分布不匹配导致的梯度尺度问题；不能声称消除所有多智能体非平稳性、协作冲突或保证全局最优。须保留 agent identity，并监控每个角色自己的有效样本数。

## 教学推导与论文结果的分界

- 第 25 章三步沙箱环境、奖励 `[-0.1, -0.1, 1.0]`、折扣 `0.9`、return `[0.62, 0.8, 1.0]` 是原创教学例，不是论文实验。
- 终止 mask、截断后 bootstrap、response-only mask 是不同语义；工具返回可被 attention 读取，但不是策略采样动作。仅对受训 policy 生成的 token 计 actor log probability。
- 第 26 章 ESS 权重 `[1,1,1,9]` 得到 `12^2/84 = 12/7`；相对 ESS `3/7`。取 on-policy 参考比值为 1，学习率缩放 `sqrt(3/7)`。ESS 是权重集中度诊断，不保证样本独立，也不等于剩余多少条数据。
- 基线恒等式是章节自行展开的标准 score-function 推导：正确目标分布、可交换求导和积分、动作无关且作为常数处理的 baseline；off-policy 还要 support coverage 与准确 likelihood ratio。
- 同组包含自身的均值 baseline 在条件独立同分布、未标准化、未 clipping 的 REINFORCE 例子中使期望梯度乘 `(N-1)/N`。LOO 去除这项自身相关性；标准差归一化、同批学习最优 baseline、筛选、截断仍需另行分析。
- 总体最优标量 baseline 中的条件期望不是同 batch 数值比的“有限样本严格无偏证明”。文中代码只展示 ESS 和稳定性告警，不实现完整 VCPO、SeeUPO 或任何论文训练系统。

## 章节锚点与本地验收

仅交付 `content/chapter-25.js`、`content/chapter-26.js` 和本证据文件；没有修改 catalog、schema、renderer、source manifest 等共享文件，也未提交 commit。

| 覆盖内容 | 章节 / section ID |
|---|---|
| 环境、状态、观测、历史，纠正 RL 单步假设 | `25/intuition` |
| 完整三步 episode、折扣回报 | `25/example`、`25/code` |
| POMDP 信念、token/工具动作、终止与 response-only mask | `25/derivation`、`25/pitfall` |
| 奖励信号质量、训练稳定性、探索效率、信用分配 | `25/comparison` |
| IGPO、CM2 与过程反馈边界 | `26/intuition`、`26/example`、`26/derivation` |
| SeeUPO、ARLArena/SAMPO、VCPO，基线成立条件 | `26/derivation`、`26/pitfall` |
| ESS 手算和可运行稳定性诊断 | `26/example`、`26/code` |
| 九个次级方法的机制与边界 | `26/comparison` |

2026-09-27 独立检查结果：

- 直接动态导入两个章节并调用 `validateChapter`，均返回空错误数组；各有 9 类模块、5 项学习目标。
- 按正文 `section.body` 的 Unicode Han 字符统计，第 25 章为 4,224 字、第 26 章为 5,777 字；不靠来源列表或测验答案补足字数。
- 测验分别有 6、8 题；来源分别有 4、15 项。第 26 章正文包含五组核心方法及全部九个次级名称。
- 提取正文公式，以仓库内置 KaTeX 的 `throwOnError: true`、`strict: "error"` 渲染，50 + 62 处全部通过。
- 提取两段 `~~~python` 代码，由 `python3 -c` 实际执行，断言均通过。第 25 章输出回报 `[0.62, 0.8, 1.0]`；第 26 章输出 ESS `1.71428571`、比例 `0.42857143`、学习率系数 `0.65465367`。
- `renderChapter` 字符串级冒烟检查通过：学习模式各 9 个 section，面试模式各 4 个 section，图中 9 / 10 条真实 link 全部保留，代码 fence 与测验正常输出。这不是浏览器视觉验收；共享应用及完整目录验收由集成流程执行。
