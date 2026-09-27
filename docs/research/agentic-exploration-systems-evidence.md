# 探索、信用分配与训练系统证据账本

核验日期：2026-09-27。范围：`content/chapter-27.js`、`content/chapter-28.js`。
本账本区分原论文定义、官方系统报告、官方博客和教学推论；不把上游综述的机构、
会议、榜单、相对提升或作者预测直接转写成事实。短引文保留英文以便查找。

## 固定上游与完整阅读记录

仓库：<https://github.com/xavierzhang2002/agentic-rl-analysis>。
本地：`/tmp/agentic-rl-analysis-66ae4423`。
已用 `git rev-parse HEAD` 核对提交：
`66ae4423b36270ef50a288fb1bb2e1b31c46c329`。
以下三篇均已完整读取，不仅是摘要或目录：

| 路径 | SHA-256 | 正文落点 |
| --- | --- | --- |
| `docs/agentic-rl/ch1/1.3-exploration-credit.md` | `b09eb66129f916a7a3e8c973d7bf949ef0325bdd5f9b34176e3366df8dba5a91` | 27：intuition、example、derivation、comparison、pitfall |
| `docs/agentic-rl/ch1/1.4-engineering.md` | `fe4e4471dffab1e6a209ffb54a52195c2544c2acd75c3f4cb781bb0259846a29` | 28：intuition、derivation、comparison、pitfall |
| `docs/post-training/ch2/2.10-agentic-training.md` | `261a8b05ae26fb3a93f8d51b185c198d5ea9fcd4429cd3ff2db93c52ae91b70b` | 28：example、diagram、derivation、code、comparison |

2.10 的全流程、跨阶段 OPD 属于其他章节主线；28 保留它们与轨迹协议、环境、
异步系统的连接，不重复工业模型全传。原图不复制；章节用本地节点与边重建机制图。

## 第 27 章：逐方法核验

### E01 EMPO²

- 原文：<https://arxiv.org/html/2602.23008v1#S4>。
  正式标题：*Exploratory Memory-Augmented LLM Agent via Hybrid On- and Off-Policy Optimization*。
- 摘录：“on-policy, where tips are retained”；“off-policy, where tips are removed during update”。
- 核验：策略自身总结先前 rollout，检索 tips；无 tips rollout、带 tips rollout
  保留提示更新、带 tips rollout 去提示更新形成三种组合。后者是奖励引导的知识内化，
  不是有记忆时的行为分布与无记忆分布自动相等。正文还描述低概率 token masking、
  状态新颖性内在奖励。
- 校正：上游缩写展开不完整；“标准 on-policy 完全不能跨 episode 传递经验”过强，
  参数更新本身也传递经验。外部记忆增加的是显式可检索信息通道。
  不搬运 +128.6% 等数字，不宣称删除 tips 必然完成知识内化。
- 落点：27 intuition、diagram、pitfall、comparison。

### E02 LUFFY

- 原文：<https://arxiv.org/html/2504.14945v1#S2>。
  标题：*Learning to Reason under Off-Policy Guidance*。
- 摘录：“policy shaping via regularized importance sampling”；
  “re-weights the gradient of off-policy distributions”；
  “we remove the on-policy clip”。
- 核验：专家轨迹和学生 rollout 混组计算优势；策略塑形放大陌生但有价值的动作信号。
  §2.3 给出 `f(x)=x/(x+gamma)`，实验 `gamma=0.1`；§2.4 另有移除 on-policy clip。
- 校正：不是简单“给 GRPO 加一个 IS 正则惩罚项”。其混合与塑形目标不是严格无偏
  策略梯度的普遍保证。论文作者元数据与上游“字节/港大”不一致，章节不复述机构。
  主要实验是推理任务，不能把收益自动推广到所有工具环境。
- 落点：27 intuition、derivation、comparison。

### E03 GiGPO

- 原文：<https://arxiv.org/html/2505.10978v1#S4>。
- 摘录：“lightweight key-based grouping using hashmaps”；
  “no extra rollouts”；“discounted return”。
- 核验：同任务、同初态的轨迹先做 episode 相对优势；重复环境状态形成 anchor
  state 组，可跨轨迹、跨时间步，组内比较从该步起的折扣回报。总优势
  `A = A_episode + omega * A_step`；原式允许选择归一化函数。
- 校正：不把“文本精确匹配几乎不可能”当成一般事实。结构化环境可能有可靠状态键；
  开放环境的观测相同不保证隐藏状态、预算和历史相同。组内回报差不是单步因果效应证明。
- 落点：27 example、derivation、code、pitfall。

### E04 ELPO

- 原文：<https://arxiv.org/html/2602.09598v1#S4>；
  定位验证：<https://arxiv.org/html/2602.09598v1#A5>。
- 标题：*Learning from the Irrecoverable: Error-Localized Policy Optimization for Tool-Integrated LLM Reasoning*。
- 摘录：“under a fixed rollout budget”；“If any suffix completion succeeds”；
  “relaxes the lower clipping bound for the critical step and its generated suffix”。
- 核验：BEL 固定前缀，采样后缀，以能否恢复成功指导二分；分支兄弟回报比较和轨迹
  排名共同决定优势；增大负向裁剪宽度以加强错误步骤及后缀的纠正。
- 校正：有限采样没有恢复成功，不等于所有策略都不可能恢复。上游“首创”“精确定位”
  不作为确定事实；“错误前一律零、错误步一律强负”不是原算法硬标签规则。
  二分的探测点数量与总后缀生成成本必须分开。
- 落点：27 example、derivation、pitfall、comparison。

### E05 ProxMO

- 原文：<https://arxiv.org/html/2602.19225v1#S3>。
- 标题核对：<https://arxiv.org/abs/2602.19225v1>，
  *Proximity-Based Multi-Turn Optimization: Practical Credit Assignment for LLM Agent Training*。
  ProxMO 展开为 Proximity-based Multi-turn Optimization，不是 Proximal Merit Optimization。
- 摘录：“we adopt Term Frequency–Inverse Document Frequency (TF-IDF)”；
  “restricting step-level comparisons within the episode groups”。
- 核验：PSC 根据组成功率调节 episode 优势；PSA 在同任务组内按 TF-IDF cosine
  相似度的温度 softmax 对后续回报加权，`B = sum(w_j R_j)`，`A_step = R_i - B`。
  原式没有普遍要求排除自身，且式 (10) 写的是同一步索引比较。
- 校正：不能称为必需另训 embedding 模型；不直接把 GiGPO 的跨时间 anchor 组与
  ProxMO 的候选集合当成同一集合。自包含 baseline、相似但不等价的状态均限制无偏解释。
  易题失败被降权是方法的归纳偏好，不是“失败一定是噪声”的事实。
- 落点：27 example、derivation、code、pitfall。

### E06 TreePO（上游写作 TreePo）

- 原文：<https://arxiv.org/abs/2508.17445>。
- 摘录：“dynamic tree sampling policy and fixed-length segment decoding”；
  “tree-based segment-level advantage estimation”。
- 核验：不确定性指导分叉，固定长度片段、公共前缀摊销、低价值路径早停，
  并有树上的片段级优势，不只是 KV cache 技巧。
- 校正：论文中的 GPU 小时节省是具体配置结果；不写成无代价探索或固定加速比。
  分叉改变样本相关性，剪枝也改变训练分布。
- 落点：27 comparison；28 comparison 的采样树与计算树区别。

### E07 LADDER

- 原文：<https://arxiv.org/abs/2503.00735v3>。
- 摘录：“recursively generating and solving progressively simpler variants”；
  “in the subject of mathematical integration”。
- 核验：Learning through Autonomous Difficulty-Driven Example Recursion，
  递归构造较简单题目，让可解变体提供学习信号，再回到难题。
- 校正：1% 到 82% 是特定模型积分实验，不是所有 Agent 冷启动成功率；
  变体要保留目标技能并可验证，不能以不断降低任务要求冒充能力提升。
- 落点：27 comparison、interview。

### E08 SGE

- 原文：<https://arxiv.org/abs/2603.02045>。
- 摘录：“first generates a concise natural-language strategy”；
  “mixed-temperature sampling”；“strategy reflection process”。
- 核验：先采样高层语言策略，再条件化生成环境动作；混合温度与策略反思增加结构多样性。
- 校正：不是仅提高所有 token 温度；策略文本数量也不是有效状态覆盖量。
- 落点：27 intuition、comparison。

### E09 SSRL

- 原文：<https://arxiv.org/abs/2508.10874>。
- 摘录：“through format-based and rule-based rewards”；
  “without requiring access to external tools”。
- 核验：Self-Search RL 用模型内部知识模拟搜索交互，仍生成轨迹并开展 RL；
  研究包含接入外部搜索后的 sim-to-real 迁移。
- 校正：上游“完全 offline”“成本降至零”不成立。减少的是外部检索依赖，
  不是推理、训练和知识验证成本；无法保证访问预训练后新事实。
- 落点：27 comparison、pitfall。

### E10 Step-GRPO / StepGRPO

- 原文：<https://arxiv.org/abs/2503.12937v2>；
  <https://arxiv.org/html/2503.12937v2>。
- 标题：*R1-VL: Learning to Reason with Multimodal Large Language Models via Step-wise Group Relative Policy Optimization*。
- 摘录：“Step-wise Reasoning Accuracy Reward (StepRAR) and Step-wise Reasoning Validity Reward (StepRVR)”。
- 核验：StepRAR 软匹配必要中间步骤；StepRVR 检查背景、推理、答案的完整性和顺序。
  这些是多模态推理中的可操作奖励，不等价于形式化逻辑证明。
- 校正：arXiv 摘要第二次写 StepRAR 是文字重复，HTML 正文明确对应 StepRVR。
  不能把它写成已通用于任意工具动作的精确过程真值。
- 落点：27 comparison、quiz。

### E11 ARPO

- 原文：<https://arxiv.org/abs/2507.19849>。
- 正式标题与缩写展开：*Agentic Reinforced Policy Optimization*，
  不是 Adaptive Reinforcement Policy Optimization。
- 摘录：“entropy-based adaptive rollout mechanism”；
  “balancing global trajectory sampling and step-level sampling”；
  “advantage attribution estimation”。
- 核验：工具反馈后高不确定性位置获得额外采样预算，再估计步骤信用。
- 校正：不是为每个动作配备独立的精确奖励标签；熵只是采样启发式，
  格式混乱和无意义随机输出也可能高熵。不采用“工具预算减半”的跨任务承诺。
- 落点：27 comparison、pitfall。

### E12 VinePPO

- 原文：<https://arxiv.org/abs/2410.01679v2>；
  <https://arxiv.org/html/2410.01679v2#S4>。
- 摘录：“value estimates of the intermediate states with Monte Carlo (MC) estimation”；
  “reset directly to any intermediate state simply by re-feeding the partial context”。
- 核验：从推理中间前缀多次续写，以 Monte Carlo 估计价值来替代学习型 critic，
  据此前后价值差等信号细化信用，保留 PPO 总体框架。
- 校正：不是把单条最终回报无差别广播到所有 token；“无偏”指规定策略和采样
  条件下的 MC 估计，不保证整个有限样本、裁剪优化器无偏。真实外部环境回滚
  不一定像纯文本前缀重放一样廉价。
- 落点：27 derivation、comparison。

## 第 28 章：环境与系统核验

### S01 GLM-5 总体、TITO 与异步 freshness

- 原文：<https://arxiv.org/html/2602.15763v1#S4.SS1>。
- 摘录：“fully asynchronous and decoupled RL infrastructure”；
  “exact tokenization and decoded-token stream produced by the inference engine”；
  “discard a sample if its oldest rollout version is too stale”。
- 核验：rollout 与训练引擎解耦，周期同步权重；同一长轨迹可能跨多个权重版本。
  TITO 是 Token-in-Token-out，Gateway 拦截生成请求并记录原始 token IDs 与元数据，
  避免先转文本再分词破坏对齐。版本过旧按整条轨迹过滤，环境崩溃单独归因。
- 校正：TITO 不是“工具 I/O 网关”的同义词；异步不意味着必须有 value critic。
  报告确实写同步推理权重后重置 optimizer，但这是其配置，不是通用必需操作。
  本章代码采用训练入口不变量检查，不冒充完整 slime 生产实现。
- 原报告 §4.1 的简写 `mean(R_i - mean(R))` 恒等于零，不能直接作为可训练目标。
  本章采用明确定义的带 log-prob 的教学 surrogate，不照抄该简写。
- 落点：28 intuition、diagram、derivation、code、pitfall。

### S02 IcePop 与 GLM-5 的直接双边 masking

- 官方原始博客（2025-09-19）：
  <https://ringtech.notion.site/icepop>。
  GLM-5 采用版本：<https://arxiv.org/html/2602.15763v1#S3.SS2>。
  异步改版：<https://arxiv.org/html/2602.15763v1#S4.SS1>。
- 摘录：“Double-sided calibration”；“tokens with excessive discrepancy are removed”。
- 核验：IcePop 分开同一旧权重在 train/infer 下的概率比 `rho` 与 train 新旧策略
  比 `r`；区间内保留 `rho` 权重、区间外置零，再乘 PPO surrogate。
  GLM-5 同步版本用 `[1/beta, beta]`；异步版本直接用当前 train/rollout 的比率，
  省去旧 train 前向，并在双边区间外 mask。
- 校正：置零不是 PPO 的 `min + clip`，两种区间也不能混用。原始 IcePop 的上下界
  可独立设置，GLM 的倒数对称区间只是一个采用版本。章节使用 `stop-gradient`
  明确教学加权 score-function loss 的梯度，不声称原报告已公开完整实现细节。
- 落点：28 example、derivation、code、quiz。

### S03 DSA 与 MoE 的离散选择

- GLM-5：<https://arxiv.org/html/2602.15763v1#S3.SS2>。
- PyTorch API：<https://docs.pytorch.org/docs/stable/generated/torch.topk.html>。
- 路由原论文：<https://arxiv.org/abs/2510.11370v2>，
  *Stabilizing MoE Reinforcement Learning by Aligning Training and Inference Routers*。
- 摘录：GLM-5 “freeze the indexer parameters by default”；
  PyTorch “indices of tied elements are not guaranteed to be stable”；
  R3 “records routing distributions from the inference engine and replays them during training”。
- 核验：DSA 选择历史 KV，MoE 选择专家，近似数值差异经过离散选择可能放大。
  GLM-5 报告其特定栈中换用 `torch.topk`、冻结 indexer 改善稳定性，
  并因每 token 记录大量 KV 索引代价高而不采用 indexer replay。
- 校正：不宣称 `torch.topk` 在所有设备、版本、ties、batch 布局下确定。
  `sorted=True` 也不是 tie-break 稳定性保证；固定随机种子不是跨引擎一致性的充分条件。
  DSA replay 是成本取舍，不是数学上不可能；Routing Replay 与损失端校正可互补。
- 落点：28 pitfall、comparison、quiz。

### S04 SWE 的任务、环境、验证器

- GLM-5：<https://arxiv.org/html/2602.15763v1#S4.SS2>。
- 官方 harness：<https://www.swebench.com/SWE-bench/guides/evaluation/>。
- 摘录：“extraction of Fail-to-Pass (F2P) and Pass-to-Pass (P2P) test cases”；
  “applying their generated patches to real-world repositories and running the repository's tests”。
- 核验：Issue-PR 种子、明确 base revision、依赖和可执行测试，构成可重放修复任务；
  F2P 检验缺陷被修复，P2P 检验已有通过测试不回归。
- 校正：脚本成功退出不等于任务解决；官方文档明确区分 resolved、unresolved 与
  infrastructure errors。测试全过也只说明通过该验证器，不证明全部程序性质。
- 落点：28 intuition、example、code。

### S05 Terminal 合成

- GLM-5：<https://arxiv.org/html/2602.15763v1#S4.SS2>。
- Harbor 官方任务教程：<https://harborframework.com/docs/tasks/task-tutorial>。
- 摘录：“task draft generation, concrete task implementation, and iterative task optimization”；
  Harbor “This file will be used by the Oracle agent to ensure the task is solvable”。
- 核验：种子扩展或技术网页转任务；输出任务描述、容器、测试、参考解与元数据。
  Harbor 展示 `instruction.md`、`task.toml`、`environment/`、`solution/`、`tests/`。
- 校正：构造 agent 自检只是首轮检查。还应验证空操作/错误解会失败，隔离 verifier，
  防止可写奖励文件或参考解泄漏；部署系统的构建失败不直接当策略负样本。
- 落点：28 example、diagram、pitfall。

### S06 Search 合成与 MiniMax Query 改写

- GLM-5：<https://arxiv.org/html/2602.15763v1#S4.SS2>。
- MiniMax 后续官方报告：<https://arxiv.org/html/2605.26494v1#S4.SS2.SSS1>。
- 摘录：GLM “Web Knowledge Graph (WKG)”；“within a few steps”；
  MiniMax “iteratively rewrite the question and obscure the entities”；
  “paired with an explicit evidence specification”。
- 核验：GLM 从早期访问网页构造 WKG，抽实体关系生成多跳题，再过滤无需工具或
  少步搜索可解的题，并双向检查候选答案与标注。MiniMax 报告支持逐步改写、
  隐去实体线索、以真实检索证据验收。
- 校正：上游“一次搜索”比原报告“few steps”更窄。上游 Removing / Obfuscation /
  Replace 的固定三类未由本次可读取原始材料独立证实，不作为 MiniMax 官方固定配方；
  仅保留报告确认的 guide-and-rewrite。开放研究报告不能强行用唯一短答案 exact match。
- 落点：28 example、comparison。

### S07 Kimi K2 工具数据与 self-critique

- 原文：<https://arxiv.org/html/2507.20534v2>。
- 摘录：“Tool spec generation”；“Agent and task generation”；“Trajectory generation”；
  “combines verifiable rewards (RLVR) with a self-critique rubric reward mechanism”。
- 核验：真实 MCP 工具规范与合成工具并用，再生成 agent、任务、交互轨迹。
  Self-Critique Rubric Reward 用于扩展到偏好等不可完全验证目标。
- 校正：上游把所有阶段写成 GLM 式固定先后链不可靠；K2 摘要明确包含 joint RL。
  工具规范数量不是实际在线独立工具或训练环境数量，自评不是所有工具任务唯一奖励。
- 落点：28 intuition、comparison。

### S08 Kimi K1.5 partial rollout

- 原文：<https://arxiv.org/html/2501.12599v1>。
- 摘录：“unfinished portion is saved to the replay buffer and continued in the next iteration”；
  “certain segments can be excluded from loss computation”。
- 核验：固定单次输出预算，跨迭代保存、续写长响应；复用历史前缀并可屏蔽旧片段损失。
- 校正：不是把截断当成任务真正终止，也不是复用前缀后全部 token 自动成为
  当前策略样本。涉及外部工具时还需一致的环境快照与幂等恢复，不能仅保存文本。
- 落点：28 comparison、code、pitfall。

### S09 Forge / prefix sharing

- 官方博客（2026-02-13）：
  <https://www.minimax.io/news/forge-scalable-agent-rl-framework-and-algorithm>。
- 后续官方技术报告：
  <https://arxiv.org/html/2605.26494v1#S6.SS2.SSS4>；
  <https://arxiv.org/html/2605.26494v1#S6.SS2.SSS5>。
- 正式标题核对：<https://arxiv.org/abs/2605.26494v1>，
  *The MiniMax-M2 Series: Mini Activations Unleashing Max Real-World Intelligence*。
  报告覆盖 M2 至 M2.7，不把它的正式标题缩写成仅 M2.7。
- 摘录：“Windowed FIFO”；“shared prefix is computed exactly once in the forward pass”；
  “loss is computed independently per sample”。
- 核验：Gateway、Data Pool、训练/推理引擎解耦；Windowed FIFO 只在提交队列局部窗口
  内选择已完成任务，限制快任务偏置；prefix tree merging 合并相同前缀计算，
  再按元数据还原各样本损失。
- 校正：博客的系统叙述不是普遍收敛定理；截至本次核验已有后续 arXiv 技术报告，
  不再写成“只有博客、没有报告”。不采用 40 倍等系统数值承诺。
  合并必须保持 causal attention、position IDs、分支隔离、样本损失权重；
  实際低精度、dropout、路由路径仍需验证数值与梯度等价性。
- 落点：28 comparison、interview。

### S10 Agent Swarm 与 PARL

- 原文：<https://arxiv.org/html/2602.02276v2#S3>。
- 摘录：“trainable orchestrator and frozen subagents”；
  “treating their outputs as environmental observations”；
  “hyperparameters lambda_1 and lambda_2 are annealed to zero”。
- 核验：Parallel Agent Reinforcement Learning 训练编排器，子代理为固定中间
  checkpoint；奖励由实例化、子任务完成和任务结果组成，辅助项逐渐退火。
  CriticalSteps 是各阶段主代理步骤加并行子代理最长分支步骤，再跨阶段求和。
- 校正：冻结子代理不等于去掉采样随机性或验证器误差；更多并行不保证更低延迟，
  critical steps 也不是 GPU 总工作量或精确 wall-clock。不引用“最多 4.5 倍”作通用收益。
- 落点：28 derivation、example、comparison、quiz。

### S11 ABE

- 原文：<https://arxiv.org/abs/2508.08791v3>。
- 标题：*Feedback-Driven Tool-Use Improvements in Large Language Models via Automated Build Environments*。
- 摘录：“scenario decomposition, document generation, function integration, complexity scaling, and localized deployment”。
- 核验：自动构建本地工具环境，以工具使用精度、任务完成度提供可验证反馈。
- 校正：不是只生成环境描述，也不因本地执行就保证任意真实业务状态转移正确。
- 落点：28 comparison。

### S12 Agent World Model（AWM）

- 原文：<https://arxiv.org/abs/2602.10090v3>。
- 摘录：“code-driven and backed by databases”；
  “fully executable environments and accessible database states”。
- 核验：合成可执行代码和数据库支撑的环境，数据库状态用于一致转移与奖励验证。
- 校正：名称中的 World Model 不意味着逐次由 LLM 幻想工具返回；与自由文本 simulator
  不同。可执行性也不保证合成业务规则符合现实。
- 落点：28 intuition、comparison、quiz。

### S13 ASTRA

- 原文：<https://arxiv.org/abs/2601.21558v2>。
- 摘录：“static topology of tool-call graphs”；
  “independent, code-executable, and rule-verifiable environments”。
- 核验：工具调用图用于轨迹合成；语义问题分解用于环境合成；SFT 和在线 RL 相结合，
  轨迹级奖励兼顾完成和交互效率。
- 校正：不能缩减为“基于 MCP 生成交互记录”；协议可连接工具，但本身不提供奖励真值。
- 落点：28 comparison。

### S14 GEM

- 原文：<https://arxiv.org/abs/2601.10355>。
- 标题：*Unlocking Implicit Experience: Synthesizing Tool-Use Trajectories from Text*。
- 摘录：“relevance filtering, workflow & tool extraction, trajectory grounding, and complexity refinement”。
- 核验：从文本经验生成工具轨迹，再以 SFT 训练专门 Trajectory Synthesizer 降低合成开销。
- 校正：GEM 主要产物是轨迹，不天然包含可 reset/step 的训练环境；
  不混淆其他同名 GEM 环境框架。不复述 BFCL +16.5% 而遗漏模型和协议。
- 落点：28 comparison、quiz。

## 教学推论与实现边界

- 27 的锚点回报 `[1, 0.6, 0]`、软权重 `[0.6, 0.3, 0.1]`、有限续写未成功的
  概率例子，以及 28 的 SWE、版本、mask、并行时延数字，均为本项目手算教学，
  不来自论文实验。它们需由对应章节代码或独立算术检查验证。
- 状态分组、相似度、错误定位只是可操作估计。动作前 baseline 的经典消项条件
  不自动适用于包含当前样本回报、筛选后样本或同轨迹相关样本的估计器。
- 只删除工具输出的 loss，不删除它作为后续动作条件的 observation；token、role、
  policy version、log-prob、上下文变换与 request/trajectory ID 必须对齐。
- 训练入口发现环境故障时区分基础设施无效样本与 agent 真实失败；不能通过丢弃
  所有失败轨迹美化训练集。过期过滤与 Windowed FIFO 均需监控任务/长度分布。
- 代码中的检查和停止梯度约定是教学性工程建议；不冒充任何厂商完整开源训练栈。
  验证只覆盖本任务所有模块，不把章节 contract 通过等同于真实模型训练复现。

## 本地验收

直接导入两个章节模块和 `content/schema.js`，不依赖整站 catalog 是否完成合并。
两个模块均包含 9 类教学 section、5 个学习目标、1 个可运行 Python 代码块；
27 有 6 道自测和 12 条原始来源，28 有 7 道自测和 16 条原始来源。

- `validateChapter`：两个模块均无错误；前置章节编号均小于当前章节。
- 正文中文字符数（仅 section body，Unicode Han 计数）：27 为 4,886，28 为 5,215，
  均超过建议的 3,500 字。
- Python：从 `~~~python` 提取代码，通过 `python3 -c` 直接执行，无额外文件写入。
  27 验证锚点均值 0.5333、软基线 0.78、优势 0.22、四次未恢复概率 0.4096。
  28 验证 token/request/context/version/mask/log-prob 及无效环境与未完成轨迹拒收，
  同时保留有效零奖励样本；IcePop 示例项 1.44、直接比率 1.5 被 mask。
- KaTeX：使用本地 `vendor/katex/katex.min.js` 与应用相同的配置，
  27 的 56 处、28 的 50 处数学表达式均成功解析。
- Renderer：学习模式各输出 9 个 section，面试模式各输出 4 个 section，
  自测数量正确，无未恢复的 Markdown token。diagram 节点和边索引通过 schema 检查。
- 来源交叉检查：正文覆盖全部指定方法，28 条来源 URL 均能在本账本找到；
  当前 manifest 指向 27 的 1 个 anchor、指向 28 的 8 个 anchor 全部通过。
- 集成约定：保留固定 section IDs；28 的 intuition 包含 TITO 的原始 token 保真机制，
  供当前来源映射引用。三个文件的新增内容未检出空白错误。
  未修改共享 catalog、manifest、renderer 或测试文件。

这些结果是模块级与字符串渲染验收，不包含浏览器布局验收、整站导航集成、
真实环境 rollout 或厂商训练结果复现。未创建 git commit。
