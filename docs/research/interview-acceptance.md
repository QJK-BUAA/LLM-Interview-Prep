# 面试数学修订验收

日期：2026-09-28。范围：`ml-roadmap` 的 00–29 章和阅读界面。

本轮针对“知识不系统、公式不够、无法应对追问”修订。完成了逐章知识路线、独立数学主题、完整推导与白板练习；面试模式保留全部推导和手算。没有改动相邻的 `ml-notes`。

## 最终课程快照

| 项目 | 最终值与口径 |
| --- | --- |
| 章节 | 30，先修关系均指向更早章节 |
| 正文小节 | 439，原 270 个小节 ID 全部保留 |
| 公式推导主题 | 139，其中新增 109 个独立 `math-*` 主题 |
| 知识路线 | 每章 1 条，共 30 条；每个链接都有实际目标 |
| 白板题 | 122 道，含推导或计算过程及“得分点” |
| 全部练习 | 260 道，包含原自测和新白板题 |
| 来源映射 | 37 份冻结源文档，正文锚点全部有效 |
| KaTeX 解析 | 4,249 处公式出现，含行内公式、重复引用和答案，零解析错误 |

公式出现次数只用于检查渲染覆盖。数学深度依据下表的推导链、成立条件、手算和独立校验，不用公式数量代替学习效果。

## 逐章覆盖核对

以下路径为章内 section ID；各章均另有 `roadmap` 和 `whiteboard`。对应完整推导、例子和边界的分组审查记录位于本目录。

| 章 | 已覆盖的主线 | 实际正文位置 |
| --- | --- | --- |
| 00 | 总体/经验风险、似然、期望奖励、分布变化、按岗位复习及闭卷标准 | `derivation`, `math-likelihood`, `math-reward`, `math-generalization`, `comparison` |
| 01 | 矩阵乘法反向、广播求和、masked mean、token/sequence 权重、einsum/reshape | `math-matmul-backward`, `math-broadcast-backward`, `math-masked-mean`, `math-einsum-layout` |
| 02 | 矩阵微分、Hessian/曲率、特征分解、SVD/PCA、最小二乘/岭、Lasso 次梯度 | `derivation`, `math-quadratic`, `math-eigen`, `math-svd`, `math-pca`, `math-ridge`, `math-lasso` |
| 03 | Bayes、矩/全方差、MLE/MAP、熵/KL/Jensen、置信区间、IS/SNIS/ESS | `math-bayes`, `math-moments`, `math-mle-map`, `derivation`, `math-confidence`, `math-importance-sampling` |
| 04 | 逻辑回归、朴素 Bayes、kNN、SVM、树/RF/GBDT/AdaBoost/XGBoost、K-means/EM、分类/排序/泛化 | `math-logistic`, `math-naive-bayes`, `math-knn`, `math-svm`, `math-tree`, `math-rf-gbdt`, `math-adaboost`, `math-xgboost`, `math-kmeans`, `math-em`, `math-ranking`, `math-bias-variance`, `derivation` |
| 05 | 激活函数、softmax Jacobian、CE、完整 MLP 反传、有限差分 | `math-activations`, `math-softmax-ce`, `derivation`, `math-gradient-check` |
| 06 | SGD/momentum/Adam 偏差修正、AdamW/L2、Xavier/He、BN/LN 反向、dropout/裁剪 | `derivation`, `math-initialization`, `math-normalization`, `math-dropout-clipping` |
| 07 | 卷积尺寸/参数/感受野/反向、BPTT、完整 LSTM/GRU、双向与因果边界 | `math-convolution`, `derivation`, `math-lstm`, `math-gru-causality` |
| 08 | BPE/Unigram、embedding 及共享权重梯度、温度采样、likelihood/PPL/mask | `math-tokenizer-objectives`, `math-embedding-gradients`, `math-temperature`, `math-likelihood-perplexity` |
| 09 | Attention 前后向维度、缩放方差、mask、MHA/FFN 参数与 FLOPs、残差 Jacobian | `derivation`, `math-attention-scaling-mask`, `math-attention-backward`, `math-transformer-flops`, `math-residual-jacobian` |
| 10 | RoPE 代数、RMSNorm 反向、SwiGLU 预算、MHA/GQA/MQA/MLA 缓存、MoE 路由 | `math-rope-relative`, `math-rmsnorm-backward`, `math-swiglu-budget`, `math-kv-mla`, `math-moe-routing` |
| 11 | 显存/ZeRO、FlashAttention 在线 softmax、prefill/decode、通信与流水线气泡 | `math-memory-zero`, `math-flashattention-online`, `math-prefill-decode`, `math-parallel-communication` |
| 12 | LoRA A/B/x 梯度与零初始化、rank/scale/merge、QLoRA 量化和显存 | `math-lora-gradients`, `math-rank-scale-merge`, `math-quantization`, `math-peft-memory` |
| 13 | Bellman 矩阵解、收缩/误差界、policy/value iteration、终止/截断/折扣 | `derivation`, `math-bellman-matrix`, `math-contraction-control`, `math-terminal-discount` |
| 14 | TD 半梯度、DQN/Double/Dueling、max 高估、Huber、replay/target | `derivation`, `math-double-bias`, `math-dueling-huber` |
| 15 | score function、baseline 无偏条件/最优值、GAE 望远镜、actor/critic detach | `derivation`, `math-baseline`, `math-gae-telescoping`, `math-actor-critic-detach` |
| 16 | RM logistic、KL 估计器、TRPO/Fisher、PPO 四种边界及完整 loss | `derivation`, `math-kl-estimators`, `math-trpo-fisher`, `math-ppo-update` |
| 17 | 完整 GRPO 目标、std/长度归一化、RLOO、DAPO 四项和全同奖励组 | `derivation`, `math-normalization-rloo`, `math-dapo` |
| 18 | DPO 拉格朗日到 BT 再到梯度、beta/长度、IPO/SimPO/ORPO/KTO | `derivation`, `math-dpo-gradient-length`, `math-preference-pairs`, `math-kto` |
| 19 | 两向 KL 的 logits 梯度/温度、局部与轨迹梯度、OPSD 停梯度/信息条件 | `derivation`, `math-kl-logit-temperature`, `math-trajectory-gradient`, `math-privileged-opsd` |
| 20 | VAPO/CISPO/GSPO/SAPO 原定义、统一梯度、聚合单位和更新诊断 | `derivation`, `math-gradient-units`, `math-update-diagnostics` |
| 21 | pass@k 组合证明、动态采样分布、混合权重/ESS、验证器误差 | `math-pass-k-proof`, `math-dynamic-selection`, `math-weight-verifier` |
| 22 | 工业配方对应的领域目标、长度归一化、蒸馏管线和总成本 | `math-domain-normalization`, `math-distillation-pipeline`, `math-pipeline-budget` |
| 23 | 异步两层 ratio、CISPO/OPD 梯度、支持条件、关键路径/前缀预算 | `math-async-ratio`, `math-opd-gradient`, `math-agent-budget` |
| 24 | 方法损失/梯度比较、配对效应、exact McNemar/Holm、预算实验设计 | `math-objective-gradients`, `math-paired-inference`, `math-budget-design` |
| 25 | POMDP belief、动作序列 likelihood、工具/观察 mask、SMDP | `math-belief`, `math-action-masks`, `math-smdp` |
| 26 | potential shaping 望远镜、IG/熵、奖励噪声、后缀 IS 与稳定性 | `math-potential-shaping`, `math-entropy`, `math-reward-noise`, `math-suffix-is` |
| 27 | episode/step 信用、锚点/最优 baseline、自包含偏差、邻居温度、探索稀疏 | `math-credit-baselines`, `math-neighbor-boundaries`, `math-exploration-sparsity` |
| 28 | 异步 ratio/版本差异、ESS、队列/吞吐、共享前缀梯度和环境验收 | `math-async-ratios`, `math-queue-throughput`, `math-prefix-reuse`, `code` |
| 29 | 完整 Agent 训练目标、约束预算、成功率/成本/统计与失败诊断 | `math-training-objective`, `math-budget-lagrange`, `math-aggregate-evaluation`, `whiteboard` |

分组证据：

- [00–04](interview-audit-00-04.md)：经典模型的目标、解法、手算与边界。
- [05–12](interview-audit-05-12.md)：完整反向传播、形状与资源账单。
- [13–19](interview-audit-13-19.md)：RL、偏好与蒸馏的概率/梯度条件。
- [20–24](interview-audit-20-24.md)：原论文定义、工业披露和统计比较。
- [25–29](interview-audit-25-29.md)：环境语义、局部信用、噪声和异步训练。

分组记录保留各组交付时的检查快照；最终数量以本记录及全站日志为准。主整合把第 23 章预算递推改为独立显示公式，把第 24 章 Holm 答案拆成三步，清理了第 04 章路线中的修订说明。

## 数学与结构检查

最终命令与产物均已完成：

| 检查 | 结果 | 日志 |
| --- | --- | --- |
| `npm test` | 36 项通过；包括真实路线、面试公式可达性、旧进度保留、缺失得分点的拒绝 | `artifacts/interview-unit-tests.log` |
| `npm run validate` | 30 章、439 小节、37 份来源通过；零重复 ID、零无效先修 | `artifacts/interview-content-validation.log` |
| `node scripts/check-math-rendering.mjs` | 4,249 处正文/问题/答案公式零解析失败 | `artifacts/interview-katex-check.log` |
| `python3 scripts/check-interview-math.py` | 五组数值程序全部通过 | `artifacts/interview-numerical-checks.log` |
| `git diff --check` | 通过 | 终端检查 |

五组数值程序分别执行 35 个小节算例、129 组比较（含 130 个有限差分坐标）、16/15/22 个数学测试。不同分组计数单位不同，不合并成一个夸大的“测试总数”。

数值校验包含 softmax/CE、逻辑回归 Hessian、MLP/Attention/LN/RMSNorm/LoRA 反向、PPO/DPO/两向 KL、Lasso 次梯度、EM、Bellman、GAE、pass@k 枚举、奖励塑形、IS/ESS、显存/通信和 McNemar/Holm。检查独立计算目标或枚举概率空间；detach 对象在差分时保持固定，不把重新计算冻结权重后的另一种梯度当成正确答案。

## 浏览器验收

`node scripts/audit-browser.mjs` 在 1440×1000、1024×900、390×844 下分别检查学习/面试两种模式的全部 30 章，共 180 个章节布局。全部通过：

- 章节、小节、题目和机制图连接数量与 catalog 一致。
- 推导默认展开，公式无 fallback、占位符或 KaTeX 错误。
- 正文页面和阅读区无横向溢出；宽公式、代码与表格在自身容器内滚动。
- 顶栏无相互遮挡，课程目录包含全部 30 章。
- 控制台无错误，观察到的资源请求均来自本地静态服务器。

首次检查发现第 24 章 Holm 长行内公式和第 25 章连续角色字符串在手机上溢出。前者改为逐步显示公式，后者通过正文断行样式修复；随后在最终正文上重跑全部布局并通过。

`node scripts/audit-interactions.mjs` 在三个宽度下均通过实际点击验收：搜索直达小节、面试/学习切换、全收起/展开、公式索引重新打开目标、白板答案默认折叠和点击展开、完成状态刷新保留、隐藏内容深链接、目录定位、代码复制、主题刷新保留、抽屉关闭、无效路由恢复及 v1/v2 状态迁移。

自动化 CLI 的 `click` 使用视口坐标，`scrollintoview` 有时把阅读区按钮放到顶栏下方。验收工具现先核对命中元素并按需原生滚动再点击；这修复了测试定位，不改变应用的按钮行为。

机器结果：

- `artifacts/interview-layout-audit.json`
- `artifacts/interview-interaction-audit.json`

已逐张查看的截图：

- `artifacts/interview-1440x1000.png`：经典 ML 梯度与 Hessian。
- `artifacts/interview-1024x900.png`：Attention 缩放与 mask。
- `artifacts/interview-390x844.png`：OPD/OPSD 白板题。
- `artifacts/interview-mobile-dark-math.png`：手机深色主题的朴素 Bayes 推导；额外检查长公式起点可达。

## 使用与边界

访问 [本地课程](http://127.0.0.1:8010/)。每章先看路线，按公式索引复习，再遮住答案做白板题。第 00 章给出按岗位的先修分支及闭卷验收方式。

已有 v2 完成记录按原 ID 保留；新增内容默认未完成，总百分比会相应降低。应用正文、KaTeX 和字体均为本地资源；外部论文链接需要网络。

本轮验证的是课程、教学算例和阅读应用；工业结果保留原报告条件，未把教学算例写成模型训练实验。覆盖完成针对设计表和新增经典 ML 考点，不声称穷尽所有面试题或保证面试结果。
