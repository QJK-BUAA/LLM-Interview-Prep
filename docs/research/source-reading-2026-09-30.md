# GitHub 原文逐篇阅读与改编说明

本记录回答“是否详细参考了 GitHub，以及具体参考在哪里”。课程参考的是
[Xavier / Agentic RL Analysis Contributors 的两份报告](https://github.com/XavierZhang2002/agentic-rl-analysis)，
固定版本为 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`。
本轮按文件分工重读正文，并结合先前原论文核验记录重新检查改编。
37 份 Markdown 的 SHA-256 与归档逐一吻合，合计 263,729 字节；
这证明读取的版本一致，不能单独证明理解或教学效果。

**参考范围有明确边界。** 第 16–29 章主要沿两份报告组织后训练和 Agentic RL；
第 00–15 章的大部分数学、经典 ML、神经网络、Transformer 和 RL 基础是补充教学。
手算数字、白板题和若干公式推导由课程补充，不是源仓库的工业实验结果。
本轮改进的是问题、例子、推导之间的连接，并未重新复现厂商训练实验。

下列每个编号对应一份实际文件。“位置”采用 `章号/section ID`，
可在本地课程 URL 后接 `#章号/section ID` 访问。
原文链接与 SHA 可查 [来源映射](../../content/source-manifest.js) 和
[快照索引](source-inventory.json)。
“一手核验”指既有账本中查过的论文或官方材料；本轮重读账本，
不冒称本轮重新检索了其中每一篇论文。

## 入口与训练全景

### 01. `README.md`

- 原文定位：`Overview`、`Post-Training Technical Report`、`Agentic RL Survey`、`Quick Start`。
- 实际作用：把后训练算法与工业实践、面向交互的 Agentic RL 分为两份报告，并提供阅读入口。
- 课程位置：`00/diagram`、`00/comparison`；后半课程按“优化基础 → 工业案例 → 工具交互”衔接。
- 取舍与证据：采用组织功能；不把 README 当作基础数学或算法定义的出处，也不复制其站点搭建步骤。属于入口说明。

### 02. `README_zh.md`

- 原文定位：`概述`下的两份报告介绍、`快速开始`、`License`。
- 实际作用：中文介绍说明两报告的范围相接，但不同读者可选择算法、工业和 Agent 入口。
- 课程位置：`00/comparison` 的完整路线与后训练面试路线。
- 取舍与证据：增加 01–15 先修和按岗位回访方法；这些教学路径是课程编排，不是原 README 的逐字转写。保留归属与 MIT 说明。

### 03. `docs/index.md`

- 原文定位：`LLM Post-Training 与 Agentic RL 研究`页面的两报告入口与内容导航。
- 实际作用：总入口区分算法、工业案例和 Agent 交互问题。
- 课程位置：`00/diagram`、`24/intuition`、`29/intuition`。
- 取舍与证据：把导航结构转为依赖顺序；第 24 章比较后训练选择，第 29 章比较交互训练的完整闭环。目录本身不证明方法效果。

### 04. `docs/post-training/index.md`

- 原文定位：`Post-Training 技术报告`的算法基础、工业实践和总结导航。
- 实际作用：先理解优化机制，再读工业配方，最后讨论跨模型经验。
- 课程位置：`00/comparison`、`24/comparison`。
- 取舍与证据：保留三个层次，增加前置数学与可计算的选型问题；不把方法发布时间当作学习先修关系。属于综述组织。

### 05. `docs/post-training/ch1/1.1-training-landscape.md`

- 原文定位：`三阶段全景`、`Pre-Training：从数据中学习世界知识`、`Mid-Training：定向能力增强`、`Post-Training：对齐与能力释放`。
- 实际论点：中间训练通过数据和上下文目标定向增强能力，后训练则用示范、偏好、奖励和蒸馏塑造行为。
- 课程位置：`00/diagram`；基础流程先由 `00/example` 的预测与误差解释。
- 取舍与证据：保留数据分布与训练信号的区分，不采用普适“95% 算力”或阶段互斥的说法。阶段边界结合 GLM-5 官方报告核验，见 [integration-evidence](integration-evidence.md)。

## 后训练算法

### 06. `docs/post-training/ch1/1.2-rlhf-rlvr.md`

- 原文定位：`经典三阶段流程`、`RL 优化目标`、`奖励模型的已知问题`、`RLHF vs RLVR 对比`。
- 实际机制：人类偏好模型和可执行验证提供不同奖励来源，优化时另加策略约束。
- 课程位置：`16/intuition`、`16/derivation`、`25/intuition`、`26/math-reward-noise`。
- 取舍与证据：把奖励来源、优势估计与更新算法分开；规则奖励仍可能受错误解析、不完整测试和 hacking 影响，不能照搬“无噪声”。多轮终态同样可能被验证。属于综述框架，一手边界见奖励与算法账本。

### 07. `docs/post-training/ch1/1.3-dpo.md`

- 原文定位：`损失函数`、`DPO 的实际定位`。
- 实际机制：用 chosen/rejected 相对参考策略的 log-ratio 表达偏好；离线偏好优化在工业流程中有具体位置。
- 课程位置：`18/derivation`、`18/math-dpo-gradient-length`、`18/comparison`。
- 取舍与证据：课程补出 KL 约束最优策略、配分函数消去、Bradley–Terry 到损失及梯度的中间步骤。离线覆盖不足与偏好质量是条件，不把 DPO 说成任何场景都可替代在线 RL。定义以原 DPO 论文为准。

### 08. `docs/post-training/ch1/1.4-ppo.md`

- 原文定位：`核心思想`、`核心公式`、`裁剪机制`、`PPO 在 LLM 场景的问题`。
- 实际机制：以行为策略采样，通过新旧概率比值和优势构造 clipped surrogate，并训练价值估计。
- 课程位置：`16/derivation`、`16/math-trpo-fisher`、`16/math-ppo-update`。
- 取舍与证据：补出 GAE、old/reference 区别、四种优势与越界组合。PPO 裁剪不等于严格 KL 信任域保证；对 log probability 求导必须带 ratio。定义和纠错见 [advanced-policy-data-evidence](advanced-policy-data-evidence.md)。

### 09. `docs/post-training/ch1/1.5-grpo.md`

- 原文定位：`核心思想`、`核心公式`、`为什么这么设计`、`GRPO 的局限`。
- 实际机制：对同一问题采样多条回答，用组内相对奖励代替学习式 critic 提供优势信号。
- 课程位置：`17/example`、`17/derivation`、`17/math-normalization-rloo`。
- 取舍与证据：保留组内标准化与全同奖励组问题，补充 RLOO、自包含基线偏差和长度权重。去 critic 不等于去 RM；DeepSeekMath 原始定义明确可用 RM。原文 mask 梯度遗漏的 ratio 已校正。

### 10. `docs/post-training/ch1/1.6-dapo.md`

- 原文定位：`核心公式`、`四大核心改进`、`移除 KL 散度`。
- 实际机制：Clip-Higher、Dynamic Sampling、token 级损失汇总与 Overlong Reward Shaping 分别处理探索、有效组比例、长度权重和截断信号。
- 课程位置：`17/derivation`、`17/math-dapo`、`21/math-dynamic-selection`。
- 取舍与证据：逐项解释改变了什么，并计算重新采样的成本；移除 KL 是特定配方的选择，不是所有 RLVR 的定义。全同奖励可令相对优势归零，但不一定令所有正则项梯度归零。以 DAPO 原论文校准。

### 11. `docs/post-training/ch1/1.7-vapo.md`

- 原文定位：`三大 Critic 修复技术`、`技术来源总结`、`消融实验汇总`。
- 实际机制：MC return 预热 critic、actor/critic 解耦 GAE、按长度调整 policy lambda，以及正确回答 NLL。
- 课程位置：`20/derivation`、`20/math-gradient-units`、`22/intuition`。
- 取舍与证据：预热和解耦 GAE 的来源包括 VC-PPO，不能全部归为 VAPO 首创；lambda=1 也不能消除所有误差。暖启动步数与 NLL 权重保留实验条件，不升格为通用默认值。见 VAPO §4 的既有一手核验。

### 12. `docs/post-training/ch1/1.8-cispo.md`

- 原文定位：`核心问题`、`核心公式`、`PPO vs CISPO 梯度行为`。
- 实际机制：先裁剪并停止梯度的 token 重要性权重，再乘优势和当前 log probability，改变被硬门截断的更新。
- 课程位置：`20/example`、`20/derivation`、`23/math-async-ratio`。
- 取舍与证据：保留 detach 和 token 粒度；不采用“任何越界必然无 PPO 梯度”或“CISPO 永不零梯度”。M1 的有效上侧裁剪与课程双侧教学例子明确分开。一手依据是 MiniMax-M1 §3.1。

### 13. `docs/post-training/ch1/1.9-gspo.md`

- 原文定位：`GRPO vs GSPO 梯度对比`、`深入：MoE 训练为什么难`、`R2 vs R3`、`深入：GSPO 凭什么能根治 MoE`。
- 实际机制：token log-ratio 的均值经指数得到长度归一化序列权重；路由重放则处理训练与 rollout 的专家选择一致性。
- 课程位置：`20/derivation`、`20/math-update-diagnostics`、`20/pitfall`、`28/pitfall`。
- 取舍与证据：保留两者互补，纠正“根治 MoE”“淘汰 replay”；归一化权重并非原始轨迹 IS 乘积，单 token 系数包含 `s*A/T`，噪声衰减需要协方差条件。依据 GSPO、R3 与版本化实现说明。

### 14. `docs/post-training/ch1/1.10-sapo.md`

- 原文定位：`统一视角：三种 Gating 函数`、`与 GSPO 的联系`、`为什么要非对称温度`。
- 实际机制：缩放 sigmoid 目标提供连续门控，并按优势符号选温度。
- 课程位置：`20/derivation`、`20/example`、`24/math-objective-gradients`。
- 取舍与证据：补全链式法则系数 `A*r*4*p*(1-p)`；与 GSPO 的联系限于小步长、低序列内离散度条件。门函数对称不等于完整策略更新对称，也不保证数值上永远非零。依据 SAPO §3–4 和直接求导。

### 15. `docs/post-training/ch1/1.11-cheatsheet.md`

- 原文定位：`全部算法公式速查表`、`使用说明`、`GSPO 在表中的特殊位置`。
- 实际作用：将目标、优势来源、重要性采样粒度和裁剪机制放在同一张表中比较。
- 课程位置：`20/comparison`、`24/comparison`、`24/math-objective-gradients`。
- 取舍与证据：保留比较轴，补回表格省略的停止梯度、符号方向和采样条件；不沿用 RM-free 与 MoE 根治等绝对结论。速查表用于检索，公式依据各方法原论文。

### 16. `docs/post-training/ch1/1.12-evolution.md`

- 原文定位：`演进动因（与上图箭头对应）`、`图中的两条主线`、`其他值得关注的算法`。
- 实际作用：由 critic、归一化、硬裁剪、序列聚合等失败原因组织方法分支，并补充 Dr.GRPO、REINFORCE++、PRIME。
- 课程位置：`20/intuition`、`20/comparison`、`24/intuition`。
- 取舍与证据：保留动机，避免写成不可逆替代链。Dr.GRPO 处理特定偏差，REINFORCE++ 的统计性质有条件，PRIME 作用于反馈与信用。相关论文定义见算法账本，演进解释属于综述观点。

## 工业实践与数据

### 17. `docs/post-training/ch2/2.1-deepseek.md`

- 原文定位：`R1-Zero：纯 RL 的涌现实验`、`四阶段 Pipeline`、`失败尝试`、`Multi-Token Prediction (MTP)`、`Specialist Distillation 与 GRPO 工程化`。
- 实际机制：R1 的冷启动、RL、筛选回灌与混合训练；V3/V3.2 专家数据和蒸馏；路由与采样一致性。
- 课程位置：`22/intuition`、`22/math-distillation-pipeline`、`22/math-domain-normalization`、`22/math-pipeline-budget`。
- 取舍与证据：Zero 仍从预训练模型开始；Speciale 是独立分支，负面 PRM/MCTS 尝试不是不可能性定理。V3 总训练账单不是 R1 RL 成本。模型版本、评测年份、MTP 与奖励优化分开，见 [industrial-evidence](industrial-evidence.md)。

### 18. `docs/post-training/ch2/2.2-kimi.md`

- 原文定位：`长上下文 RL 的关键技术`、`MuonClip 优化器`、`大规模 Agentic 数据合成（三阶段）`、`Agent Swarm / PARL`、`Toggle`。
- 实际机制：partial rollout 暂停续接、long2short、任务与 rubric 生成、自评反馈、可训练编排器和冻结子 Agent。
- 课程位置：`23/intuition`、`23/math-async-ratio`、`23/math-agent-budget`、`28/comparison`。
- 取舍与证据：MuonClip 属于预训练优化；QK-Clip 观察 attention logits。视觉数据 early fusion 不等于网络层早融合，Zero-Vision SFT 不等于未训练视觉。Toggle 和并行加速结论保留型号及工作负载边界。

### 19. `docs/post-training/ch2/2.3-qwen.md`

- 原文定位：`六维度 RM 设计`、`Qwen3 -- 四阶段与思考模式融合`、`Strong-to-Weak 蒸馏`、`Qwen3.5 -- 混合架构探索`。
- 实际机制：奖励分歧筛题、推理 RL、思考/非思考模式数据融合，以及离线和 on-policy 蒸馏。
- 课程位置：`22/intuition`、`22/example`、`22/math-distillation-pipeline`、`21/comparison`。
- 取舍与证据：六种标注准则不能推出六个 RM head；3,995 个 query 和 170 步属于指定模型与 AIME 2024 实验。融合不要求同一 RL checkpoint 为每题生成成对答案。博客级架构披露不证明继承某优化器或超参数。

### 20. `docs/post-training/ch2/2.4-minimax.md`

- 原文定位：`五阶段后训练 Pipeline`、`CISPO 算法`、`关键工程发现`、`M2.5 与 Forge 框架`、`MiniMax-M2.7 -- 自我进化`。
- 实际机制：短长数据分阶段、M1 权重裁剪与数值一致性、Forge 的解耦、窗口消费和前缀复用。
- 课程位置：`23/intuition`、`23/derivation`、`23/math-async-ratio`、`23/math-agent-budget`、`28/comparison`。
- 取舍与证据：本篇 CISPO 序列几何均值与 ch1 专章、M1 原论文冲突，课程采用 token 权重并 detach。更新次数减半不能推出成本减半；M1 RL 租赁估算不含基座/R&D。以已核验的后续报告纠正“无论文”等过时披露状态。

### 21. `docs/post-training/ch2/2.5-glm.md`

- 原文定位：`TITO Gateway`、`非确定性 CUDA top-k Bug`、`异步 Agentic RL -- "Slime" 框架`、`Cross-Stage Distillation`。
- 实际机制：token 流保存、异步采样与策略版本记录、前一训练阶段 checkpoint 提供蒸馏监督。
- 课程位置：`19/derivation`、`23/math-opd-gradient`、`23/math-async-ratio`、`28/intuition`。
- 取舍与证据：将笼统教师分数差改为冻结的 token log-prob 差；group size 1 依赖教师反馈而非组内中心化。以报告纠正 DSA 事件的熵下降方向。TITO 不能独自消除数值差异，跨阶段蒸馏也不保证零遗忘。

### 22. `docs/post-training/ch2/2.6-seed.md`

- 原文定位：`四个修复及贡献量化`、`VAPO -- 让 PPO 在长 CoT 中复活`、`Seed1.5-Thinking -- 大规模验证`、`RFT 反面发现`、`Seed2.0 与 Seed-Coder`。
- 实际机制：按失败点理解 DAPO/VAPO 组件，再结合 Seed 的反馈、streaming rollout 与代码数据质量流程。
- 课程位置：`22/intuition`、`22/comparison`、`20/derivation`、`21/pitfall`。
- 取舍与证据：73/79 的比较属于 150B 消融模型；Seed-Coder 不能当作 VAPO 实证。某次 RFT 负面结果不禁止所有拒绝采样。Seed2.0 已有模型卡，但既有核验范围不足以补造完整训练细节。

### 23. `docs/post-training/ch2/2.7-closed-source.md`

- 原文定位：`OpenAI -- 可参考的安全对齐细节`、`Google Gemini -- "RL*F" 与有限披露`、`Anthropic -- Constitutional AI 基础`。
- 实际机制：规范引导、帮助性与安全奖励结合、可验证与生成式反馈、CAI 的批改/修订与 AI 偏好。
- 课程位置：`23/comparison`、`23/derivation`、`23/pitfall`。
- 取舍与证据：保留公开方法，避免推断当前闭源产品完整配方。Deliberative Alignment 的数据流程与 SFT/RL 阶段分开；Gemma 的 BOND/WARM/WARP 不能直接归为 Gemini 配方。安全得分为零也不是现实行为保证。

### 24. `docs/post-training/ch2/2.8-cross-model.md`

- 原文定位：`后训练 Pipeline 对比`、`奖励设计对比`、`十条共性训练经验`、`趋势展望`。
- 实际论点：比较 cold SFT、query、蒸馏、MoE、课程、基础设施、critic、遗忘与模式控制。
- 课程位置：`24/comparison`、`24/math-budget-design`，具体案例回到 22–23 章。
- 取舍与证据：原文十条经验重组为课程六条有条件的经验，未声称原文只有六条。不采用必然少量 SFT、参数量阈值、蒸馏恒优或完美防遗忘定律。属于跨报告归纳，不是控制变量实验。

### 25. `docs/post-training/ch2/2.9-data-engineering.md`

- 原文定位：`SFT 数据获取：6 种方法`、`RL 数据获取：3 个维度`、`质量控制要点`、`数据混合与课程`、`SFT–RL 数据闭环`。
- 实际机制：六类可组合的数据获取路径；RL 的 query、奖励依据、环境/测试三轴；从生成、验证到回灌的闭环。
- 课程位置：`21/intuition`、`21/comparison`、`21/math-pass-k-proof`、`21/math-dynamic-selection`、`21/math-weight-verifier`。
- 取舍与证据：补充分母、token 权重、pass@k 与成功样本比例的区别。STaR 不等于无答案自博弈，DoReMi 基于 excess loss；修正 Seed-Coder 错误链接。不采用普适难度区间、固定蒸馏成本和验证器星级。具名次级方法逐项解释，见算法/数据账本。

### 26. `docs/post-training/ch2/2.10-agentic-training.md`

- 原文定位：`On-Policy Cross-Stage Distillation（OPD）：防遗忘`、`Agentic 数据合成`、`IcePop`、`异步框架 off-policy 问题`、`Kimi K2.5 的 Agent Swarm`。
- 实际机制：可执行任务、可重置环境、验证器、轨迹生产；教师/学生 token log-prob 差；训推不一致与参数陈旧两类偏移；编排器训练。
- 课程位置：`19/derivation`、`23/math-async-ratio`、`25/diagram`、`28/example`、`28/derivation`。
- 取舍与证据：保留 SWE 的 F2P/P2P、Terminal 控制与 Search 证据链。局部 ratio 不能无条件纠正全部历史状态分布，mask 不是 PPO clipping，小差异也不是“必然安全”。属于文章型二级综述，官方定义由 GLM/Kimi 账本校准。

## 后训练总结

### 27. `docs/post-training/ch3/3.1-timeline-paradigms.md`

- 原文定位：`关键里程碑`、`时间线的几个关键转折`、`四代范式`、`范式演变的驱动力`。
- 实际作用：按反馈来源与任务变化解释 PPO、DPO、GRPO、推理和 Agent 训练的发展。
- 课程位置：`00/diagram`、`24/intuition`、`24/comparison`、`25/intuition`。
- 取舍与证据：PPO 2017、DPO 2023、DeepSeekMath 2024 与原始文献一致；不将 Alpaca/Vicuna 放在 2020–2022。范式可以共存；RL 本来就研究序贯决策，不能写成由 Agent 才带来的突破。

### 28. `docs/post-training/ch3/3.2-challenges-future.md`

- 原文定位：`六大行业共识`、`核心技术挑战与现有解法`、`挑战关系总览`。
- 实际论点：更新约束、critic、不可验证反馈、长序列粒度和多阶段遗忘相互影响。
- 课程位置：`24/pitfall`、`20/math-update-diagnostics`、`26/intuition`、`28/pitfall`。
- 取舍与证据：采用五类问题；将“共识”限定为来源综述的归纳。不采用硬裁剪原罪、固定 critic 成本、MoE 专用方案必需或永不遗忘等绝对断言。公式诊断由原论文与教学推导支撑。

### 29. `docs/post-training/ch3/3.3-opinions.md`

- 原文定位：`算法演进的深层规律`、`RL 的本质：教授还是选择？`、`产业格局与竞争壁垒`、`对未来方向的判断`。
- 实际论点：九个观点涉及正则类比、规模、query、算法边际收益、教学/选择、经济性和数据循环。
- 课程位置：`24/pitfall`、`24/math-paired-inference`、`24/math-budget-design`、`29/pitfall`。
- 取舍与证据：每条改写为可反驳的假设；跨论文分数不能证明边际收益下降，L1/L2 类比也不是目标函数等价。配对检验与预算算例是课程补充。明确属于作者观点。

## Agentic RL

### 30. `docs/agentic-rl/index.md`

- 原文定位：`与 Post-Training 报告的关系`、`核心论文索引`、`阅读建议`。
- 实际作用：后训练提供优化基础，Agentic 报告突出工具、多轮交互和四类挑战。
- 课程位置：`25/intuition`、`25/roadmap`、`29/comparison`。
- 取舍与证据：先跟随一条行动轨迹再引入状态与概率；采用方法索引，不采用未经条件化的 Tier、百分比收益或“首个收敛”标签。索引不是统计普查。

### 31. `docs/agentic-rl/ch1/1.1-overview.md`

- 原文定位：`RLVR 的成功与边界`、`Agentic RL 的核心矛盾`、`四大核心挑战`。
- 实际论点：工具交互会增加反馈稀疏、估计稳定性、探索成本和延迟信用的困难。
- 课程位置：`25/intuition`、`25/diagram`、`25/derivation`、`25/comparison`。
- 取舍与证据：保留问题分类，纠正“RL 假设单步且短程”。观察不必是 Markov 状态，交互任务也可能验证终态；课程用轨迹再引出 history/belief。未采用 68% 等领域占比作为已核验事实。

### 32. `docs/agentic-rl/ch1/1.2-reward-stability.md`

- 原文定位：`奖励信号：从稀疏到自包含`、`IGPO`、`CM2`、`SeeUPO`、`ARLArena/SAMPO`、`VCPO`及两张其他方案表。
- 实际机制：区分缺少信息的奖励与不稳定的估计；答案 log-prob 增益、依赖 checklist、后缀更新、ESS/学习率及基线调整分别作用于不同环节。
- 课程位置：`26/example`、`26/derivation`、`26/math-suffix-is`、`26/comparison`。
- 取舍与证据：IGPO 不是无标注信念学习；CM2 七项是字段而非七项固定技能；SeeUPO 不保证任意神经 POMDP 收敛。次级方法也按机制保留，GMPO 不直接几何平均负奖励，ProRL reference reset 不替代行为概率。详见 [agentic-core-evidence](agentic-core-evidence.md)。

### 33. `docs/agentic-rl/ch1/1.3-exploration-credit.md`

- 原文定位：`探索效率：突破 On-Policy 局限`、`EMPO²`、`LUFFY`、`GiGPO`、`ELPO`、`ProxMO`及两张其他方案表。
- 实际机制：外部记忆和混合策略改善探索；相同状态组、后缀探测、语义邻居调整局部信用。
- 课程位置：`27/intuition`、`27/example`、`27/derivation`、`27/math-credit-baselines`、`27/math-neighbor-boundaries`。
- 取舍与证据：参数训练本来就能跨 episode 保留经验；外部 tips 是新增信息通道。GiGPO 可跨时刻锚定，ProxMO 的候选集与 TF-IDF 不能混写；有限后缀失败不能证明不可恢复。TreePO、VinePPO 等次级方案另在比较中保留。

### 34. `docs/agentic-rl/ch1/1.4-engineering.md`

- 原文定位：`GLM-5 — 异步 Agent RL 基础设施`、`Kimi K2 — 大规模工具使用训练`、`环境构建`。
- 实际机制：不确定工具延迟促使 rollout 与训练解耦，环境构建和轨迹生产需要不同验收。
- 课程位置：`28/intuition`、`28/diagram`、`28/comparison`、`28/pitfall`。
- 取舍与证据：TITO 保存 token 流，并非 Tool-I/O；DSA 选择 KV 位置、MoE 选择专家。工具规范数不等于独立环境数，self-critique 不等于真值；ABE/AWM/ASTRA/GEM 的产物也不互换。系统核验见探索/工程账本。

### 35. `docs/agentic-rl/ch1/1.5-algorithm-summary.md`

- 原文定位：`全部算法一览`、`按影响力分级`、`技术路线图`。
- 实际作用：聚合方法以便定位可能干预的失败位置。
- 课程位置：`29/comparison`，机制回指第 26–28 章。
- 取舍与证据：按任务适配、所需反馈和可测指标索引；不沿用机构权重和 Tier 决定学习优先级。无外部 RM 不等于无监督，GRPO 也不定义整个 RLVR。表格是二级导航，并非横向实验。

### 36. `docs/agentic-rl/ch2/2.1-landscape.md`

- 原文定位：`论文分布`、`机构分布`、`三条技术路线`、`产业观察：从论文到产品`、`开源生态`、`中美对比`。
- 实际作用：路线 A 修复估计/约束，路线 B 改写反馈/更新，路线 C 建环境、数据和记忆；生态还包含 rollout、评估与基础设施。
- 课程位置：`29/diagram`、`29/comparison`、`29/interview`。
- 取舍与证据：三路线在受控评估处汇合，但记忆和环境会改变信息或采样分布，并不自动与所有算法正交。没有可复算编码表的地区比例、开源率、商业化速度不作为统计事实，产品配方不靠名称推断。

### 37. `docs/agentic-rl/ch2/2.2-outlook.md`

- 原文定位：`核心判断与个人观点`的六条观点，以及`短期 (2026)`、`中期 (2027)`、`长期方向`。
- 实际论点：信用、SeeUPO、记忆、工程/数据、潜在突破和环境各有发展判断。
- 课程位置：`29/pitfall`、`29/interview`、`29/math-aggregate-evaluation`。
- 取舍与证据：保留六个问题，分别要求成本、有限预算训练、无 tips 泛化、真实环境迁移等可观察结果。2027 不是交付承诺，stars/MAU 不证明算法质量；这些是作者预测，不能与实验结果混用。

## 怎样核查正文质量

详细分工记录给出各推导的具体引入问题、算例和结果解释：
[00–04](narrative-audit-00-04.md)、
[05–12](narrative-audit-05-12.md)、
[13–19](narrative-audit-13-19.md)、
[20–24](narrative-audit-20-24.md)、
[25–29](narrative-audit-25-29.md)。
来源定义的证据还可查
[奖励与稳定性](agentic-core-evidence.md)、
[探索与系统](agentic-exploration-systems-evidence.md)。

本记录没有声称搬运了原图、所有榜单行或每个工业超参数。
没有采用的绝对结论、未公开配置和无统一协议的跨模型比较已在各条说明。
正文连贯性、保留的数学内容及实际首屏检查见
[本轮验收](narrative-acceptance.md)；路径和关键词测试只负责防遗漏。
