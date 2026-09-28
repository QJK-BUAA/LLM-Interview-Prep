# 面试课程的系统化与数学深度修订

用户要求：内容齐全、系统、有公式，能应对面试官追问。已有批准实施的授权，本轮直接修订，不重复要求批准。

## 审查结论

旧版以九种教学形式分章，但一种形式只有一个大区块，无法直接找到某个算法的完整推导。面试模式只显示误区、比较、问答、自测，实际删除了例子与公式。基础四章没有完整的线性/逻辑回归、SVM、树与 boosting、聚类/PCA 课程；多处只写结论，缺少从目标到梯度的过程。进阶章节有相对扎实的原论文核验，应保留。

## 采用方案

在现有 30 章内按知识点增加独立小节，重写薄弱推导和面试题。保留原始章节及小节 ID、来源映射和旧进度；新知识点使用新 ID。每章以知识路线开始，能直接跳到核心公式、扩展推导和白板题。

仅加一本公式速查表不能修复教学链；完全更换项目会丢掉已经核验的进阶内容，因此都不采用。

## 教学契约

- 每章新增 `roadmap` 小节，列出先修能力、核心问题及学习顺序；其 `links` 提供至少三个真实目标小节，字段为 `label`、`sectionId`、`level`。level 为“必会”“推导”“进阶”之一。
- 解除“恰好九个区块”限制，九种原教学形式继续保留。按需要新增多个 `derivation` 小节，ID 以 `math-` 开头，主题分明。它们是课程正文，参与导航、搜索、进度。
- 核心推导依次说明问题、符号/维度、目标或定义、逐步推导、数字例子、适用条件和面试追问。不得只有公式清单。
- 每章新增 `id: "whiteboard", type: "quiz"`，至少三道非重复题，涵盖推导、手算、反例或设计；答案有推导过程及“得分点”。答案折叠，公式正文默认展开。
- 不用公式数量代替质量；覆盖表逐项指向正文，数字与梯度用独立计算检查。

## 逐章必须补齐的知识

| 章 | 核心公式与推导覆盖 |
| --- | --- |
| 00 | 风险最小化/似然/期望奖励主线；按岗位的复习顺序；闭卷验收方法 |
| 01 | 矩阵/广播的反向求和，masked mean，batch token 权重，einsum 与 reshape |
| 02 | 矩阵求导、二次型/Hessian、特征值/SVD/PCA、最小二乘/岭回归与可逆条件 |
| 03 | Bayes、期望/方差、MLE/MAP、熵/KL/Jensen、置信区间、重要性采样 |
| 04 | 逻辑回归及梯度/Hessian、SVM/对偶/核、树与信息增益、RF/GBDT/XGBoost、K-means/EM、指标/排序/偏差方差 |
| 05 | sigmoid/tanh/ReLU 导数、softmax Jacobian、CE 梯度、完整 MLP 反传、梯度检查 |
| 06 | SGD/momentum/Adam 偏差修正、AdamW 与 L2、Xavier/He 方差、BN/LN、dropout 期望、梯度裁剪 |
| 07 | CNN 输出尺寸/参数/感受野、卷积反传、RNN BPTT、完整 LSTM/GRU 门、双向与因果 |
| 08 | BPE/Unigram 目标、embedding 梯度/共享权重、温度采样、序列 likelihood/perplexity/mask |
| 09 | Attention 前后向完整维度、缩放方差假设、softmax mask、MHA 参数/FLOPs、Pre/Post-LN Jacobian |
| 10 | RoPE 相对位置代数、RMSNorm 导数、SwiGLU 参数匹配、MHA/GQA/MQA/MLA 缓存、MoE 路由/辅助损失 |
| 11 | 显存逐项账单、ZeRO 分片、FlashAttention 在线 softmax、prefill/decode、KV cache、并行通信与气泡 |
| 12 | LoRA A/B 梯度及零初始化、rank/scale/merge、QLoRA 量化与反量化、显存核算 |
| 13 | Bellman 递推/矩阵解/收缩、policy/value iteration、终止/截断与折扣边界 |
| 14 | TD 半梯度、DQN/Double/Dueling/Huber、max 高估示例、经验回放与 target 更新 |
| 15 | score function 从积分推导、baseline 无偏性、最优 baseline 条件、GAE 望远镜、actor/critic detach |
| 16 | RM logistic 梯度、KL reward 与估计器、TRPO 二阶约束到 PPO、PPO 四象限与完整训练 loss |
| 17 | GRPO 完整目标/聚合、标准差/长度偏差、RLOO、DAPO 四项、全同奖励边界 |
| 18 | DPO 拉格朗日到 BT 消配分函数再到梯度，beta/length 影响，IPO/SimPO/ORPO/KTO 精確定位 |
| 19 | forward/reverse KL 对 logits 梯度、温度、固定前缀与整轨迹梯度、OPSD 停梯度及信息条件 |
| 20 | 保留核验的四算法精确推导；增加统一梯度比较与综合白板题 |
| 21 | pass@k 组合推导、动态采样选中概率、数据混合权重/ESS、验证器误差 |
| 22 | 工业配方对应公式、领域权重与长度归一化、总计算预算；不编造披露参数 |
| 23 | CISPO/跨阶段 OPD/异步训练的公式串联；信息不足时明确无法反推 |
| 24 | 方法选择的损失/梯度对照，配对检验/McNemar/Holm 与预算设计 |
| 25 | POMDP belief、动作序列 likelihood、工具/观察 mask、SMDP 时间尺度 |
| 26 | potential shaping 望远镜与边界、IG/entropy、奖励噪声、后缀 IS 支撑与稳定性 |
| 27 | episode/step 信用、锚点基线、邻居加权、探索与梯度稀疏，数值边界 |
| 28 | 异步两层 ratio、版本 vs 分布偏移、ESS/吞吐/队列、复用前缀和环境验收 |
| 29 | 端到端 Agent 训练白板题、约束预算目标、成功率/成本/统计，失败诊断 |

## 界面与状态

学习模式显示全部内容；面试模式显示路线、例子、全部推导、误区、比较、面试、两类自测。所有公式推导默认展开，保留折叠能力并提供整章展开/收起按钮。章首有公式主题跳转，提供“白板练习”入口。搜索要直达具体匹配小节，避免命中术语后还需通读整章。

维持离线 ES module、现有 KaTeX、v2 状态键和全部旧 ID；新增小节默认未完成。公式容器可横向滚动，但正文页面不能横向溢出。普通用户看到中文教学标签，不显示内部 schema 字段名。

## 验收

结构验证覆盖路线目标、完整教学层和白板题；KaTeX 在 Node 中解析全部正文和答案。运行有意义的梯度/概率/账单数值校验，复核来源映射。浏览器验收 1440、1024、390 宽度下的所有章节、两种模式、路由跳转、搜索、公式显示、折叠、完成进度和暗色主题。
