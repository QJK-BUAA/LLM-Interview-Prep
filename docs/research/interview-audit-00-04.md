# 00–04 章面试数学修订审查

日期：2026-09-28。依据已批准的 `docs/superpowers/specs/2026-09-28-interview-math-design.md` 和对应实施计划执行，已合并后续追加的 L1/L2、Lasso、朴素 Bayes、kNN、AdaBoost 要求。

## 范围与结构

本工作单元只改动 `content/chapter-00.js` 至 `content/chapter-04.js`，新增本审查记录和 `scripts/check-math-00-04.py`。未修改共享 renderer、schema、状态、测试或其他章节；未提交 Git。下述全仓测试结果是在主代理和其他工作单元并行改动后的当前工作区观察值，不代表这些共享实现由本工作单元完成。

每章第一节均为 `id: "roadmap", type: "roadmap"`，所有路线链接均指向真实章内 ID，级别限定为“必会 / 推导 / 进阶”。路线正文交代先修、依赖和闭卷验收。新增数学主题均为独立 `type: "derivation"` 正文，不是仅在速查表增加名称。

原有九个 ID 全部保留：`intuition`、`example`、`diagram`、`derivation`、`code`、`pitfall`、`comparison`、`interview`、`quiz`。原章 ID、slug、先修 ID 和来源条目未删除。薄弱的原 `derivation` 已就地扩写，原代码例子和自测保留。

| 章 | 总小节 | 独立新增 math 小节 | whiteboard 题数 | objectives | 预计分钟 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 00 | 14 | 3 | 4 | 4 | 90 |
| 01 | 15 | 4 | 4 | 4 | 120 |
| 02 | 17 | 6 | 5 | 5 | 210 |
| 03 | 16 | 5 | 6 | 5 | 180 |
| 04 | 23 | 12 | 11 | 5 | 540 |
| 合计 | 85 | 30 | 30 | 23 | 1140 |

时长包括首轮阅读、推导和手算，不是掌握保证。04 拆成六轮，每轮约 90 分钟，要求隔日闭卷复测。每道白板题均包含步骤和“得分点”；原 `quiz` 与新 `whiteboard` 是不同小节。

## 准确新增 ID

每章共同新增：`roadmap`、`whiteboard`。除此之外：

| 章 | 新增数学 ID |
| --- | --- |
| 00 | `math-likelihood`、`math-reward`、`math-generalization` |
| 01 | `math-matmul-backward`、`math-broadcast-backward`、`math-masked-mean`、`math-einsum-layout` |
| 02 | `math-quadratic`、`math-eigen`、`math-svd`、`math-pca`、`math-ridge`、`math-lasso` |
| 03 | `math-bayes`、`math-moments`、`math-mle-map`、`math-confidence`、`math-importance-sampling` |
| 04 | `math-logistic`、`math-naive-bayes`、`math-knn`、`math-svm`、`math-tree`、`math-rf-gbdt`、`math-adaboost`、`math-xgboost`、`math-kmeans`、`math-em`、`math-ranking`、`math-bias-variance` |

## 00：目标与学习依赖

| 正文位置 | 覆盖及独立数值结果 | 边界与追问 |
| --- | --- | --- |
| `derivation` | 总体期望到经验平均、正则与梯度；固定偏置的直线拟合梯度 -56/3，新权重 134/15，MSE 18.666667 → 5.309630 | 固定参数的经验风险无偏，不直接适用于同数据挑出的参数；求和/平均和固定偏置口径 |
| `math-likelihood` | 条件独立似然、NLL、Gaussian MSE、Bernoulli CE；残差 ±1 的平均高斯 NLL 1.418939；概率 0.8/0.3、标签 1/0 的 CE 0.289909 | 方差待估时不能丢归一化项；似然不是参数分布 |
| `math-reward` | 期望奖励到 score function、基线期望为零；两动作 J=1、梯度 0.5，更新后 J=1.049958 | 奖励不直接依赖参数；有限动作；多步信用分配留给后续章节 |
| `math-generalization` | 全期望和风险差代数分解；模型甲训练风险 0.4、部署风险 2，模型乙始终 1 | 更多训练分布数据不修复部署分布错配 |
| `comparison`、`interview` | 经典 ML、LLM 工程、后训练、Agentic RL 的先修分支；12 分钟闭卷、四维 0–2 分、无零项且至少 6/8 | 明示这是自学门槛，不是招聘标准 |

## 01：张量反向与权重

| 正文位置 | 覆盖及独立数值结果 | 边界与追问 |
| --- | --- | --- |
| `derivation` | 逐元素/矩阵乘法/广播、约简轴、保留维度与下标求和 | 元素数一致不等于语义一致 |
| `math-matmul-backward` | 从 Y 下标推 X、W、b 三梯度；损失 2.5，dW=(7,10)，db=3，dX=[[2,-1],[4,-2]] | 所有输入、参数坐标用标量目标有限差分；平均损失须统一缩放 |
| `math-broadcast-backward` | 共享特征偏置梯度 (16,20)，共享位置偏置 (14,22)，共享标量 36 | 对复用轴求和而非再平均，恢复原 shape |
| `math-masked-mean` | token 均值 3.2 vs 序列均值 3；梯度分别 1/5 与 1/4、1/6；微批次数量加权 | 全空 mask 跳过；0×NaN 不会消除 NaN；可训练权重须对分母求导 |
| `math-einsum-layout` | 明确 einsum 收缩轴；编号顺序 [0,1,10,11] 与 [0,10,1,11] 展示 reshape 不能替代 transpose | 逻辑布局与连续内存分开讨论；注意力的两个位置轴不能混用 |

## 02：谱分解、PCA 与线性正则

| 正文位置 | 覆盖及独立数值结果 | 边界与追问 |
| --- | --- | --- |
| `example`、`derivation` | 标量链式梯度 384、更新 2.616；向量微分、Frobenius 内积读矩阵梯度 | 逐元素和微分两种推导交叉复核 |
| `math-quadratic` | 一般 A 的对称部分；Hessian、正定性与特征方向迭代；q=6.5 → 3.09，最大特征值 3.618034 | 梯度零可能鞍点；固定步长上限只在声明的正定二次情形使用 |
| `math-eigen` | 特征方程、正交特征基、Rayleigh 商拉格朗日推导；特征值 3/1，迹 4、行列式 3 | 一般矩阵可能不可对角化；重根基不唯一 |
| `math-svd` | 紧致 SVD 维度、秩、伪逆、低秩误差；奇异值 3/2，秩一误差平方 4，伪逆拟合残差平方 25 | 反转小奇异值放大噪声；不建议显式正规方程求逆 |
| `math-pca` | 中心化、最大方差与最小正交重建等价、与 SVD 连接；协方差 diag(2,0.5)，解释比例 0.8，残差平方 2 | N vs N-1；量纲、标准化、无监督方向不保证分类好；训练集拟合 |
| `math-ridge` | 最小二乘正规方程、满列秩条件、伪逆最小范数、岭梯度与谱收缩；共线样本岭解 (5/11,5/11)，目标 5/22 | 正则平均系数；截距不惩罚时需检查共同零空间 |
| `math-lasso` | L1 菱形与 L2 球几何；绝对值次梯度分三段推软阈值；坐标下降含列范数尺度 | lambda=1、z=(-3,0.5,2)：Lasso=(-2,0,1)，ridge=(-1.5,0.25,1)；零点目标 0.125；相关设计不能逐个阈值一次求完 |

Lasso 校验不在不可导零点伪造普通梯度：检查精确区间次梯度，并对每个分支和阈值边界枚举候选目标；非零分支另做有限差分。

## 03：概率、估计与采样

| 正文位置 | 覆盖及独立数值结果 | 边界与追问 |
| --- | --- | --- |
| `math-bayes` | 联合分解、全概率、后验赔率；阳性率 0.0585，阳性后患病率 2/13=0.153846 | 重复检测的似然比相乘需要条件独立 |
| `math-moments` | 原点矩、协方差、均值方差、全方差、Gaussian 矩估计、Bessel 修正；样本 1/2/3 的均值 2、矩方差 2/3、无偏方差 1；两组总方差 2 | 复制样本不增加独立样本量；枚举 Bernoulli 样本验证无偏修正 |
| `math-mle-map` | Bernoulli 与 Gaussian 的一阶条件；Beta 后验、内部 MAP、后验均值；MLE 2/3、MAP 3/5、均值 4/7 | 全正样本的边界 MLE；高斯方差塌缩；Gaussian prior 与 ridge 的 lambda 口径 |
| `derivation` | H/CE/KL 分解与 Jensen 非负证明；H=0.500402，CE=0.591919，KL=0.091516，反向 KL=0.104650 | 支撑不覆盖可为无穷；优化左分布时不能丢熵；择模说法有条件 |
| `math-confidence` | 正态枢轴、t/CLT 前提、Wilson 二次不等式；均值区间 [9.608,10.392]，10/10 全成功 Wilson [0.722460,1] | 覆盖率不是后验概率；Wald 边界失效；配对/分组采样 |
| `math-importance-sampling` | 换分布、普通 IS 无偏和方差、SNIS 有偏、ESS；目标 1.5，单样本 IS 方差 2.25，单样本 SNIS 均值 1，ESS 1.6 | 支撑、可积/有限二阶矩、裁剪改变期望、ESS 不是具体函数方差 |

IS 不只比较一批巧合的估计值：脚本枚举完整离散分布，另验证双样本 SNIS 期望 1.25，检查其有限样本偏差。

## 04：经典模型与可靠评估

| 正文位置 | 覆盖及独立数值结果 | 边界与追问 |
| --- | --- | --- |
| `math-logistic` | Bernoulli NLL → p-y → 增广 Hessian、凸性、稳定 softplus、Newton 方向；初始梯度 (-1/4,0)，H=[[5/8,3/8],[3/8,1/4]]，loss 0.693147 → 0.687092 | 完全可分时未必存在有限 MLE；截距不惩罚；含正则非零点另做梯度/Hessian 差分 |
| `math-naive-bayes` | 生成模型、条件独立、log 后验、Bernoulli 似然与 Laplace 后验预测；明确全部八条训练样本 | log 分数 -1.280934/-3.583519，后验 10/11；无出现时 1/11；Laplace 后验预测不是均匀先验 MAP；多项式词频分母不同 |
| `math-knn` | 欧氏距离、均匀/加权投票、回归均值、训练尺度、维数灾难体积推导 | 正类比例 1/3 → 6/11；缩放导致近邻翻转；100 维覆盖 10% 质量边长 0.977237；零距离、低内在维度和检索复杂度 |
| `math-svm` | 几何间隔、软间隔原始目标、拉格朗日消元、盒约束、KKT、核映射与 Gram 半正定 | 两点 alpha 各 1/2、w=1、b=0，原/对偶均 1/2；C 小于 1/2 会截断；核分数不是概率 |
| `math-tree` | 熵/Gini 的意义、加权分裂、回归均值推导 | 信息增益 0.318257，Gini 增益 0.25；候选阈值、贪心非全局、纯叶过度自信 |
| `math-rf-gbdt` | 等相关森林方差推导、bootstrap 袋外概率、负函数梯度与叶线搜索 | T=10 森林方差 1.3，不是 0.4；平方 boosting 预测 (1.5,2.5)，半平方损失 1 → 0.25 |
| `math-adaboost` | 从指数损失分正确/错误项，求 alpha、Z、归一化样本权重及训练错误率上界 | 错率 1/4：alpha=0.549306，Z=0.866025，正确点各 1/6，错误点 1/2；零错率/半错率边界、标签噪声敏感 |
| `math-xgboost` | 二阶 Taylor、叶聚合、叶权重驻点、含父项和新增叶惩罚的 gain | 叶值 ±2/3，gain=37/30=1.233333；父目标 2.1、子目标 0.866667，直接相减验证 |
| `math-kmeans` | 离散分配与连续中心交替下降，中心均值的导数 | 中心 (0,8) → (1,9)，SSE 8 → 4；空簇、尺度、初始化和非球形簇 |
| `math-em` | Gaussian mixture、Jensen 下界、E 后验、M 权重/均值/精度矩阵推导 | 责任度 0.880797、均值 ±0.761594、方差 0.419974；观测 log likelihood -2.970315 → -2.439441；协方差塌缩和局部最优 |
| `derivation` | 原混淆矩阵、F1、ROC/PR、带并列的 AUC、ECE 校准口径、Brier、成本阈值推导 | AUC 11/15；欺诈 F1=8/15；FP/FN 代价 1/9 时阈值 0.1；p=0.2 报警成本 0.8 < 漏报成本 1.8 |
| `math-ranking` | pairwise logistic 目标和两个分数梯度、DCG/NDCG、MRR、Recall@k | pair loss 0.693147 → 0.598139；DCG=3.5，NDCG=0.963940；RR、Recall@2 均 1/2；候选集/空相关 query 约定 |
| `math-bias-variance` | 独立测试噪声下展开交叉项、平方损失偏差方差分解、验证与测试边界 | 波动模型风险 1.25，稳定偏差模型风险 0.5；枚举噪声与训练集预测验证；多种子不替代多份数据 |

## 来源锚点与证据边界

本范围在 `source-manifest.js` 中实际被锚定的是 00 的 `intuition` 和 `comparison`，共六份来源、九次词项检查：

| 来源路径 | 原小节 | 保留正文锚点 |
| --- | --- | --- |
| `README.md` | `00/intuition` | `Post-Training`、`Agentic RL` |
| `README_zh.md` | `00/comparison` | `完整路线`、`Agentic RL` |
| `docs/index.md` | `00/intuition` | `30 章` |
| `docs/post-training/index.md` | `00/comparison` | `后训练面试路线` |
| `docs/post-training/ch1/1.1-training-landscape.md` | `00/intuition` | `Mid-Training`、`数据分布` |
| `docs/post-training/ch3/3.1-timeline-paradigms.md` | `00/intuition` | `Pre-Training` |

01–04 没有该 manifest 的直接锚点，但原教材/官方文档来源和原教学概念都保留。新增内容是经典教材级推导和明确给定的教学数据，没有增写现代模型排名、私有配方或未经披露的性能声明。原 00 中的阶段名称和现代方法只保留其已有定位，不从本次小算例推断工业效果。

## 已运行的验证

- `python3 scripts/check-math-00-04.py`：35 组小节级检查通过，纯标准库；包含每个新增数学 ID 的算例，非光滑 Lasso 用次梯度/目标验证，其余适用处用中央有限差分。
- 所有五个章节逐个 `node --check`：通过。
- 逐章导入调用 `validateChapter`，另检查首节 roadmap、唯一 ID、旧九 ID、3–5 objectives、全部路线目标、whiteboard 题目字段和“得分点”：通过。
- 直接检查正文和题目答案的公式分隔符闭合，并通过当前 renderer 提取 KaTeX 公式：00/01/02/03/04 分别为 113/176/276/216/399 处，总计 1180 处，零解析失败。重复公式计入；该计数不是内容质量评分。
- 范围内 manifest 九次词项检查：通过。
- `npm test`：当前全仓 35 项测试全部通过。
- `npm run validate`：当前全仓 30 章、439 小节通过，零重复 ID、零未解析先修，37 份固定来源映射通过。
- `node scripts/check-math-rendering.mjs`：当前全仓 4245 处公式，零解析失败。
- 授权文件的 `git diff --check`：通过。

## 集成与剩余风险

共享 renderer/schema/搜索/进度行为归主代理；本记录仅报告当前已观察到的结构和测试，不宣称完成浏览器实测。移动端宽公式、两种模式、导航、展开折叠和旧进度恢复仍由主代理的最终浏览器验收覆盖，尤其应检查 04 新增的三个主题。

Python 检查使用与正文对应、独立手写的算例输入和标量目标，不执行正文 JavaScript 或反解析公式；后续若修改教学数字，必须同步检查二者是否仍一致。有限差分只能验证这些具体点，不能代替一般证明；概率、凸性和优化结论均在正文列明假设。课程补齐本轮要求的核心主题，不以小节或公式数量声称穷尽整个机器学习学科。
