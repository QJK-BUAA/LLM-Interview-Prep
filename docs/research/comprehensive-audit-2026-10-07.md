# 全内容检查与修订报告

2026-10-07；审查基线 `635fb27`，范围为现有 00–29 共 30 章。结论：原有主线结构合理，但检查确实发现了数学条件省略、正文与代码分母不一致、前向接口不闭合，以及四个只提名称而缺少可操作讲解的专题。本轮已逐项修订，现有声明主线能够从先修、解释、推导、手算和代码衔接起来。

这里的“完整”指**数学/经典 ML 基础 → 神经网络/Transformer → 训练推理 → 后训练 → Agentic RL 面试主线**，不表示囊括所有机器学习领域，也不表示读完即可保证通过面试。练习中的独立推导、实现和换数字复测仍是能力验收。

## 如何检查

本轮完整精读了全部 30 个章节文件及全局术语，包括元数据、目标、开场、实例、路线、图中文字、全部推导、代码、误区、比较、面试短答、所有自测/白板和来源。先完成独立问题记录，再修改正文；现有测试只作回归，没有用旧 PASS 代替数学与来源检查。

检查特别关注：随机变量和采样分布、矩阵维度、目标正负号、求和/平均、有效标签、停止梯度、端点、前提条件、论文定义与工程替代、论文本身表述冲突、课程前后依赖。可疑点用小反例、有限差分、概率枚举或一手方法节点核对。

完整问题证据与修法保留在五批记录中：

- [00–04](comprehensive-audit-00-04.md)：数学、概率与经典模型。
- [05–12](comprehensive-audit-05-12.md)：深度学习、Transformer 与系统。
- [13–19](comprehensive-audit-13-19.md)：RL、偏好与蒸馏。
- [20–24](comprehensive-audit-20-24.md)：策略优化、工业与选型。
- [25–29](comprehensive-audit-25-29.md)：多轮环境、探索与系统。
- [全局范围与修订决策](comprehensive-audit-global.md)：新增专题、先修闭包、释义与验证要求。

这些批次文件描述的是**修订前发现**，其中“待修复”不表示目前尚未处理；落实情况如下。

## 关键缺口怎样补齐

| 位置 | 原缺口 | 已交付内容 |
|---|---|---|
| 06 `math-learning-rate-schedule` | 只有 warmup 概述 | 线性升温＋单段 cosine 的分段函数、端点推导、四步手算、优化步/微批次/恢复计数及白板 |
| 08 `math-truncated-sampling` | 未定义 top-k/top-p 候选集合 | 排序与最短累计前缀、跨阈值项保留、重归一化、组合顺序、真实采样概率与支持集反例及白板 |
| 09 `code` | 二值 mask 直接相加；只有 block，缺整网与位置 | 可执行 PyTorch 前向函数：位置查表、Pre-LN block、二值 mask 扩轴、全屏蔽 query、整网、一次 shift 与有效标签平均 |
| 10 `math-position-extension` | ALiBi/YaRN 只有一句介绍 | 距离偏置、PI、分频 ramp、频率插值、Q/K 幅度平方、扩四倍手算及白板 |
| 11 `math-speculative-decoding` | 仅出现名称 | 接受率、残差修正、分布守恒证明、首拒/全接收流程、支持集边界、期望输出数与时间预算及白板 |

四个新增推导均从具体问题出发，先定义对象和符号，再推导、手算、解释结果，并连接下一节；没有将公式孤立添加到开头。目标、路线链接、标签、来源及受影响章节时长已同步。

## 逐章覆盖与修订结果

| 章 | 实际覆盖的核心学习结果 | 检查后的处理 |
|---|---|---|
| 00 | 预测→参数→误差→训练/验证；风险、似然、奖励回访 | 闭合快捷路线；经典 ML 不再暗示完整推荐课程；说明阅读预算与岗位扩展 |
| 01 | shape、广播、线性反向、masked mean、布局 | 概述与术语包含零轴标量；保留正确推导 |
| 02 | 链式法则、Hessian、特征/SVD、PCA、回归/L1/L2 | PCA 区分任意正交投影与最优主子空间；gradient check 固定更新前参数 |
| 03 | Bayes、熵/KL、矩、MLE/MAP、区间、IS/SNIS/ESS | 短答补受限分布族条件；bootstrap 释义区分统计与 RL |
| 04 | 分类/排序、NB/kNN/SVM、树/Boosting、聚类/EM、评估 | 修复 precision 单调性暗示、NB 零值/缺失混淆及 macro-F1 表述 |
| 05 | 激活、softmax Jacobian、两层反传、有限差分 | 中心差分二阶误差补光滑性；代码已平均，不能再次平均 |
| 06 | AdamW、初始化、BN/LN、dropout、裁剪 | 新增调度；区分梯度界与 Adam 步长；PPO clip 非硬约束 |
| 07 | 卷积、BPTT、LSTM/GRU、因果性 | 平方中间显存限定为朴素 attention；保留门控完整路径边界 |
| 08 | tokenizer、embedding、共享梯度、温度、NLL/PPL | 新增截断采样；与后续真实行为分母连接 |
| 09 | 注意力前后向、shape/FLOPs、Pre/Post-LN | 补 06 先修；修 mask 与整网前向、位置和 label shift |
| 10 | RoPE、RMSNorm、SwiGLU、GQA/MLA、MoE | 修频率/相位混淆；新增 ALiBi/YaRN |
| 11 | 状态/KV 显存、ZeRO、FlashAttention、roofline、并行 | 新增投机解码；原预算与在线递推保持 |
| 12 | LoRA 反向/合并、量化、QLoRA 预算 | 已覆盖明确目标，未发现需机械重写的实质问题 |
| 13 | MDP、Bellman、矩阵/收缩、控制、终止/截断 | 严格 on-policy 定义；TD 偏差条件；截断清零偏差方向 |
| 14 | SARSA/Q-learning、DQN/Double/Dueling、Huber | 已覆盖明确目标，保留原正确内容 |
| 15 | 轨迹 score、baseline、有限 GAE、actor/critic | 目标和短答补 baseline/GAE 条件；clip 表述与推导统一 |
| 16 | BT、三策略、KL 估计/梯度、TRPO/PPO、四模型 | 修负优势 clip 口语、硬界暗示及 epoch 偏差必增说法 |
| 17 | GRPO/RLOO、自包含、DAPO、长度聚合 | 零优势仅消除相对奖励项，正则仍可能更新 |
| 18 | DPO 完整推导、IPO/SimPO/ORPO/KTO | SimPO 评分代理不冒充通用解码目标；KTO 数据符号去歧义 |
| 19 | 两向 KL、轨迹梯度、信息边界、OPSD 与新方法 | 每句 token mean 后 batch mean；明确 RLSD 符号边界、Lightning 两阶段来源、Purified 三上下文与 H²SD |
| 20 | VAPO/CISPO/GSPO/SAPO、聚合、ESS、路由 | VAPO 首式与原文/代码统一为正例有效 token 均值 |
| 21 | 数据来源、pass@k、课程筛选、域权重、verifier | 已覆盖目标，未发现需修改的实质错误 |
| 22 | DeepSeek/Qwen/Seed 阶段、蒸馏、成本与分母 | 原有型号、消融和成本边界经复读保持 |
| 23 | Kimi/MiniMax/GLM、异步双 ratio、OPD、关键路径 | 安全乘积硬门控解释限定于 s=0，非零分仍存在取舍 |
| 24 | 方法选择、梯度比较、McNemar/Holm、预算 | OPSD 测试禁用特权输入不等于所有知识无法迁移 |
| 25 | POMDP/belief、轨迹、三种 mask、SMDP、沙箱 | 主线闭合，保留正确公式与实现边界 |
| 26 | IGPO/CM2、基线、shaping、熵、噪声、后缀 IS | IGPO 用完整 turn 前后；CM2 Strictness 是进入下一用户轮次的必需条件 |
| 27 | EMPO²/LUFFY、锚点/软邻居、恢复、探索预算 | GiGPO episode 未折扣；LUFFY 代用分母披露；软基线拒绝非有限值并稳定处理极小温度 |
| 28 | 环境产物、TITO、双 ratio、吞吐、prefix、PARL | 共享前缀梯度补真实后缀直接参数路径，完整梯度反例为 9 |
| 29 | 联合成功、预算目标、综合评估与面试 | 统计与成本公式复算一致，保留原正确内容 |

全局同时修订 tensor、loss、rank、policy、baseline、on-policy、bootstrap、Monte Carlo、rollout 九项释义，使短提示不覆盖正文中的准确条件。

目视验收还发现手机靠右术语的提示框会截断。原测试只验证“已显示”，没有检查提示框边界；现改为根据术语、阅读区和视口定位，并在悬停、聚焦、滚动、缩放时更新，补上实际几何边界验收。[修复前截图](../../artifacts/comprehensive-glossary-clipped-390x844.png) 与 [修复后窄屏验证](../../artifacts/comprehensive-glossary-fixed-canary.png) 保留了这个问题的证据。

## GitHub 与一手来源究竟读了多少

固定上游仍为 `XavierZhang2002/agentic-rl-analysis@66ae4423b36270ef50a288fb1bb2e1b31c46c329`。本轮重新完整读取 **37/37 份 Markdown，263,729 字节**，逐份 SHA-256 与归档一致，未换成浮动主分支。固定工作副本位于 `/Users/bytedance/.cache/ml-roadmap/agentic-rl-analysis`。

| 上游范围 | 文件数 | 课程落点 |
|---|---:|---|
| README、README_zh、总入口、post-training 入口、训练全景 | 5 | 00、24、29 的组织与训练阶段 |
| post-training/ch1 的 1.2–1.12 | 11 | 16–20、24 的方法、速查与条件 |
| post-training/ch2 的 2.1–2.10 | 10 | 19、21–23、25、28 的数据与工业机制 |
| post-training/ch3 的 3.1–3.3 | 3 | 24、29 的选型、挑战与观点检验 |
| agentic-rl 入口、ch1 的 1.1–1.5、ch2 的 2.1–2.2 | 8 | 25–29 的交互、奖励、探索、系统与评估 |

[37 份逐篇改编说明](source-reading-2026-09-30.md) 给出文件名、原文章节、课程锚点和取舍；[快照索引](source-inventory.json) 与 [来源映射](../../content/source-manifest.js) 给出版本证据。本轮的再次阅读和冲突核对记录在五批报告的来源部分。

来源内容并非全部正确：例如 PPO 导数漏 ratio、CM2 字段解释、CISPO 粒度、IGPO 无监督说法、GSPO “根治”路由问题，以及无可复算口径的机构比例、产品训练猜测，都没有为追求“完整参考”而重新带入课程。

对确认问题及新增内容，又定向读取了 SGDR、Nucleus Sampling、ALiBi、YaRN、Speculative Decoding，以及 RL/蒸馏/Agent 方法和工业报告的相关方法节点。每篇的实际章节、版本和局限已逐项列于批次报告；没有把只读摘要说成全文，也没有声称完整重读所有教材。00–15 的大部分基础仍是补充教学，16–29 才主要沿上游组织。

## 验证结果

| 检查 | 结果与证据 |
|---|---|
| Node 回归 | 37/37 通过；[日志](../../artifacts/comprehensive-tests.log) |
| 内容契约、先修、来源锚点 | 30 章、443 小节通过，重复 ID/缺失先修为 0；[日志](../../artifacts/comprehensive-validation.log) |
| 全量 KaTeX | 4,681 处公式出现（含重复与答案），解析失败 0；[日志](../../artifacts/comprehensive-katex.log) |
| 五组原有数值程序 | 全部通过；[日志](../../artifacts/comprehensive-numerical.log) |
| 新增独立数学检查 | 7 项通过；PCA 反例、差分条件、调度、截断、位置、投机分布、完整共享梯度；[日志](../../artifacts/comprehensive-new-math.log) |
| 实际正文代码 | 5 项通过；直接导入并执行 09/19/27 代码，覆盖 batch/causal/pad/空 query、位置/梯度、一次 shift、OPSD 聚合与 detach、NaN/inf/极小温度；[日志](../../artifacts/comprehensive-lesson-code.log) |
| 三宽度 × 两模式 × 30 章 | 180/180 布局通过；[机器报告](../../artifacts/comprehensive-layout-audit.json) |
| 原生交互与释义边界 | 三种宽度均通过；搜索、目录、展开、答题、进度、迁移、主题、复制、新专题及释义悬停/点击/键盘；[报告](../../artifacts/comprehensive-interaction-audit.json) |
| 原内容保留 | 439 个旧小节 ID、260 道旧题均保留；新增 4 节/4 道白板；[逐章盘点](../../artifacts/comprehensive-final-inventory.json) |

修复提示框后重新完成了布局与原生交互检查，两个报告的浏览器控制台错误均为 0。使用 Chromium 的 1440×1000、1024×900、390×844 视口，未声称在所有浏览器或真实手机上测试。已目视查看三宽度首屏、位置专题和释义代表截图；[手机释义最终截图](../../artifacts/comprehensive-glossary-390x844.png) 中完整定义可见。布局检查还包含开场顺序、公式展开、题目数量、边界、溢出和目录/进度总数。

可复算命令：

```bash
npm test
npm run validate
node scripts/check-math-rendering.mjs
python3 scripts/check-interview-math.py
python3 scripts/check-comprehensive-math.py
python3 scripts/check-lesson-code.py
ROADMAP_AUDIT_PREFIX=comprehensive node scripts/audit-browser.mjs
ROADMAP_AUDIT_PREFIX=comprehensive node scripts/audit-interactions.mjs
```

正文代码检查需 PyTorch；五组原有和新增独立数学程序只需 Python 标准库。浏览器需 `agent-browser` 与本地 8010 静态服务。检查使用隔离 session，本轮产物不会覆盖历史 `narrative-*`。

## 剩余边界与学习建议

现有主线已修订到声明目标有实际学习落点；比较层的某些变体仍只承诺机制比较，例如 Mamba/NSA、DoRA/AdaLoRA 和若干新优化器，不能将“见过名字”当作完整掌握。推荐系统召回/CTR/序列推荐、RAG/reranker、完整预训练 scaling-law 实验、视觉/语音/扩散、多模态对齐、GNN、因果推断与离线 RL 全谱系，应按岗位另设专题。

当前共 143 个推导专题和 126 道白板。数量只说明保留与新增规模；质量依据是逐章检查、反例与可执行验证。逐章阅读/回访估计共 4,935 分钟，约 82.25 小时，不包含练习和完整项目实践，也不是掌握时长承诺。

第一次学习仍从 00 的预测例子开始，按 00–29 前进。已有地基者可依据白板结果免读，重点回补“能背公式却说不清对象、分母、条件和反例”的部分。面试前应独立完成一个小型训练/推理或 RL 闭环，并能用实际日志解释失败原因；本次小型 CPU 验证不能替代大模型训练经验。

本轮核对的是课程和公开方法定义，未复现论文训练成绩，未检验所有外部来源链接的实时可达性。改动保存在本地，不推送或发布；原 `ml-notes` 未修改。
