# 第 13–19 章面试数学审查

日期：2026-09-28。只修改 `content/chapter-13.js` 至 `chapter-19.js`、
本记录和 `scripts/check-math-13-19.py`。没有修改共享渲染器、schema、
catalog、source manifest 或其他章节，没有创建 commit。

## 已读依据与保留范围

- 设计：`docs/superpowers/specs/2026-09-28-interview-math-design.md`。
- 计划：`docs/superpowers/plans/2026-09-28-interview-math.md`。
- 七章原文、`content/source-manifest.js`、现有 renderer 的 Markdown/公式契约。
- 既有证据：`advanced-policy-data-evidence.md`、`industrial-evidence.md`、
  `integration-evidence.md`；这些记录区分原始定义、工业报告和教学算例。
- 上游固定提交 `66ae4423b36270ef50a288fb1bb2e1b31c46c329` 的
  `docs/post-training/ch1/1.3-dpo.md` 至 `1.6-dapo.md` 已读取正文。
  不沿用其中“GRPO 必然去掉 RM”“规则奖励杜绝 hacking”“裁剪梯度没有 ratio
  因子”“固定显存节省比例”等已被既有证据纠正的说法。

每章保留原九个 ID：
`intuition`、`example`、`diagram`、`derivation`、`code`、`pitfall`、
`comparison`、`interview`、`quiz`。原 source 概念和正文锚点保留；
本次增加 7 个 roadmap、19 个独立数学小节、7 个 whiteboard，共 33 个新小节。
白板练习合计 26 题，每题均包含过程及“得分点”。

## 精确新增 ID

下表给出所有新 ID，不以主题简称代替真实路由。

| 章 | 新增 section IDs | 总小节 / 白板题 |
| --- | --- | --- |
| 13 | `roadmap`, `math-bellman-matrix`, `math-contraction-control`, `math-terminal-discount`, `whiteboard` | 14 / 3 |
| 14 | `roadmap`, `math-double-bias`, `math-dueling-huber`, `whiteboard` | 13 / 3 |
| 15 | `roadmap`, `math-baseline`, `math-gae-telescoping`, `math-actor-critic-detach`, `whiteboard` | 14 / 4 |
| 16 | `roadmap`, `math-kl-estimators`, `math-trpo-fisher`, `math-ppo-update`, `whiteboard` | 14 / 4 |
| 17 | `roadmap`, `math-normalization-rloo`, `math-dapo`, `whiteboard` | 13 / 4 |
| 18 | `roadmap`, `math-dpo-gradient-length`, `math-preference-pairs`, `math-kto`, `whiteboard` | 14 / 4 |
| 19 | `roadmap`, `math-kl-logit-temperature`, `math-trajectory-gradient`, `math-privileged-opsd`, `whiteboard` | 14 / 4 |

每个 roadmap 都是第一节，有 4–5 个真实章内链接，level 只使用
“必会”“推导”“进阶”。独立数学小节和原 derivation 均是课程正文，不是来源附录。

## 逐章数学、条件与数值对应

### 13：Bellman

- 原 `derivation` 补全全期望公式、Q 递推和策略加权优势为零。
- `math-bellman-matrix` 给出 P/r/v 维度、线性方程、谱半径条件及 Neumann
  级数；`math-contraction-control` 推导固定策略与最优算子的收缩、residual
  误差界、策略改进与两种迭代。
- `math-terminal-discount` 区分有限时域、无限自环、吸收链、真正终止、
  采集截断和 reset 前末观测。gamma=1 不套用折扣收缩证明。
- 教学例：交替两状态、奖励 `[1,2]`、gamma=0.5，矩阵解
  `[8/3,10/3]`，独立同步迭代一致；终止动作奖励提高到 3 后最优值为
  `[3,3.5]`。residual=0.02、gamma=0.9 的误差界为 0.2。
  r=2、gamma=0.9、末值=5 时，截断 target=6.5，真终止 target=2。
- 验证：`test_13_bellman_matrix_contraction_control`、
  `test_13_terminal_and_discount_boundaries`。
- 依据：章内 Sutton/Barto 教材与 Bellman 来源；新增步骤为直接代数推导，
  不将 tabular 收敛推广为任意非线性 off-policy TD 收敛。

### 14：TD、DQN、Double、Dueling、Huber

- 原 `derivation` 补半梯度与 residual-gradient 的差别、网络 Jacobian、
  target/argmax 停梯度；补 Double target 的终止 mask。
- 两个 `math-*` 分别解释 max 高估的四事件枚举、Double 条件无偏、
  Dueling 中心化与 V 的语义、Huber 分段及导数、replay 分布和 target 更新。
- 教学例：两动作独立零均值 ±1 噪声，max 期望为 0.5；online `[4,3]`、
  target `[2,5]`、r=1、gamma=0.9 时，DQN/Double target 为 5.5/2.8。
  Q=2theta、target=4.6，theta=1 的半平方梯度为 -5.2，alpha=0.1 后 Q=3.04。
  V=3、A=`[2,0,-1]` 给 Q=`[14/3,8/3,5/3]`；
  e=-2.6、Huber 阈值 1 时 loss=2.1、对 Q 梯度=-1。
- 验证：`test_14_dqn_double_dueling_huber`，包括 TD 与 Huber 有限差分。
- 依据：原 DQN、Double DQN（1509.06461）、Dueling（1511.06581）来源；
  高估反例是教学构造。独立评估误差条件不被冒充为实际 target 网络必然独立。

### 15：Score Function、Baseline、GAE

- 原 `derivation` 从积分求导到轨迹概率，再用动作前历史的条件 score
  均值为零证明因果性；保留一般折扣目标的外层 gamma^t。
- `math-baseline` 明确 baseline 的统计独立性与计算图停梯度是两回事；
  对单步条件梯度协方差迹推导 score-norm 加权的最优标量 baseline。
- `math-gae-telescoping` 从 n-step 估计到有限混合权重和 residual 望远镜。
  lambda=1 只在真终止且端点为零时得到完整 MC；截断保留尾部价值。
- `math-actor-critic-detach` 写 actor/critic 损失，说明共享骨干与错误
  advantage 反传的区别；区分 bootstrap mask 与递推 boundary mask。
- 教学例：r=`[0,0,1]`、V=`[0.2,0.3,0.5,0]`、gamma=0.9、lambda=0.8，
  delta=`[0.07,0.15,0.5]`，GAE=`[0.4372,0.51,0.5]`，
  value target=`[0.6372,0.81,1]`；lambda=1 得 advantage=`[0.61,0.6,0.5]`。
  原 `code` 的调用显式使用相同参数，注明它处理单条连续片段。
- 反例：p=0.8、奖励 a 的 Bernoulli logit 梯度，最优 baseline=0.2；
  b=0/0.2/0.8 的方差为 0.0064/0/0.0576。奖励恒零但用 b(a)=a，
  p=0.5 时产生错误期望梯度 -0.25。
- 验证：三个 `test_15_*`，包括有限枚举的因果性、遗漏外层折扣反例、
  lambda=0/0.8/1 的 n-step 混合恒等式和终止/截断两种端点。
- 依据：REINFORCE、策略梯度定理、GAE（1506.02438）原来源；
  条件二阶矩与反例由直接推导、枚举验证。

### 16：RM、KL、TRPO、PPO

- 原 `derivation` 补 RM logistic 梯度与曲率、平移不辨识，并明示
  reference/old/current 和 RM 在策略阶段冻结。
- `math-kl-estimators` 写 k1/k2/k3；数值无偏要求按 current p 采样及共同
  支撑。旧行为分布 b 需 p/b，仍未解决前缀分布。固定样本 k3 自动微分
  不等于精确 reverse-KL 梯度，正文给出其期望为局部 forward-KL 梯度。
- `math-trpo-fisher` 从 KL 二阶展开、Fisher 恒等式到拉格朗日自然梯度步；
  说明正定、非零梯度、奇异/damping、有限步回溯条件。PPO 不是严格等价解。
- `math-ppo-update` 写四个正负优势边界、log-prob 梯度的 ratio 因子、
  完整 actor/value/entropy/可选 KL loss 及可选 value clipping。
  已有 KL shaping 时不默认再次叠加同一惩罚。
- 教学例：RM 分差 1，loss=0.313261688、两侧梯度约 ±0.268941421。
  g=`[1,2]`、F=diag(2,8)、delta=0.01，
  TRPO 步=`[0.070710678,0.035355339]`，二次 KL=0.01。
  PPO `(ratio,A)` 为 `(1.3,2),(1.3,-2),(0.7,2),(0.7,-2)`，
  目标为 `[2.4,-2.6,1.4,-1.6]`，log-prob 导数为 `[0,-2.6,1.4,0]`。
  old/ref token 概率 0.2/0.1、beta=0.1 的 shaping reward=-0.069314718。
- 验证：三个 `test_16_*`，RM、PPO 的 log-prob/logit 有限差分，
  k3 固定采样梯度有限差分、旧分布值偏差、IS 值修正、k2 非精确反例。
- 依据：PPO（1707.06347）、既有 advanced/industrial evidence；
  增加 TRPO（1502.05477）与 Schulman 的 KL approximation 来源。
  估计器导数由正文与独立差分核对，不用博客的数值无偏性替代梯度证明。

### 17：完整 GRPO、RLOO、DAPO

- 原 `derivation` 补完整期望、组/序列/token 求和、有效长度、clip 与
  reference k3 项；明确 std 的总体分母和 epsilon 位置。旧数据上的
  KL surrogate 不宣称精确 current KL。原 GSPO、Dr.GRPO 与 DAPO 锚点保留。
- `math-normalization-rloo` 推导含自身 baseline 的 `(G-1)/G` 因子及
  RLOO 等价式；无偏限定为独立同策略序列样本、未 clip、未除长度/随机 std。
- `math-dapo` 分别写非对称 clipping、保留概率及筛选后 prompt 分布、
  token 聚合、Dr.GRPO 固定尺度奖励项和分段 overlong reward。
  group token mean 与跨 prompt 全 batch token mean 单独说明。
- 教学例：`[1,1,0,0]` 给标准化 ±1、RLOO ±2/3；
  `[1,0,0,0]` 给 `[sqrt(3),-1/sqrt(3),-1/sqrt(3),-1/sqrt(3)]`。
  p=0.3、G=4 的 16 组精确枚举得到含自身梯度 0.1575、RLOO=0.21。
  长度 `[2,8]`、优势 `[1,-1]`，序列/token/固定20分母目标为 0/-0.6/-0.3。
  p=0.5、G=4 的筛选保留率 0.875；Lmax=10、cache=2 时，
  长度 8/9/10 的修正为 0/-0.5/-1。
- 验证：两个 `test_17_*`，包括全同组、G=1 RLOO 拒绝、有限枚举。
- 依据：DeepSeekMath（2402.03300）、DAPO（2503.14476）、
  Dr.GRPO（2503.20783）、RLOO（2402.14740）及既有核验记录。
  DAPO 的 0.2/0.28 仅标为原论文某组设置，不编造新实证结果。

### 18：DPO 与偏好家族

- 原 `derivation` 增加六步链：支撑/可积条件、拉格朗日函数、驻点、
  归一化乘子/Z、反解奖励、同 prompt 的 BT 消项与似然训练。
  用严格凹性和 KL 重写验证最优解。
- `math-dpo-gradient-length` 给序列与 token logits 梯度、beta 两个语境、
  长度效应及 chosen 绝对概率下降反例。
- `math-preference-pairs` 给 IPO、SimPO、ORPO 精确公式和梯度；
  `math-kto` 给两类效用损失、停止梯度的参考点及有偏 microbatch 近似。
- 教学例：两回答 q=`[0.5,0.5]`、r=`[log3,0]`、beta=1，
  Z=2、最优策略=`[0.75,0.25]`。原四 log-prob 例的 DPO
  loss=0.653946967，两侧导数约 ±0.048001066。
  IPO tau=0.5、h=0.8，loss=0.04、导数=-0.4；
  SimPO z=0.4，loss=0.513015252；
  ORPO 几何均值概率 0.4/0.2、lambda=0.1，总 loss=0.948136105；
  KTO r=z0、beta=0.2、单位类权重时 loss=0.5、两侧导数 ±0.05。
- 验证：两个 `test_18_*`，DPO 分数及两套 token logits 的有限差分、
  三种 beta；IPO/SimPO/ORPO/KTO 有限差分，DPO 目标 KL 重写。
- 本轮一手核对的版本与定位：
  - IPO：https://arxiv.org/html/2310.12036v2#S5.SS2 ，Eq.17 与 Algorithm 1，
    目标是 `1/(2*tau)`，来自两个方向的平方项，不是任意常数 1。
  - SimPO：https://arxiv.org/html/2405.14734v2#S2.SS3 ，Eq.4–6，
    平均 log-prob 乘 beta，外部减去目标奖励 margin。
  - ORPO：https://arxiv.org/html/2403.07691v2#S4 ，Eq.3–7，
    odds 使用平均 token log-prob 的指数，不是原始整句 likelihood。
    课程对负 log-sigmoid 直接求导确定负号，不机械照抄该版本 Eq.8 的正号；
    几何平均值也不被解释为整个回答集合上的归一化概率。
  - KTO：https://arxiv.org/html/2402.01306v4#S4.SS1 ，Eq.8 与 KL Estimate，
    使用 `1-sigmoid` 而不是负 log；beta 在效用内，z0 停梯度。
    错配与 clamp 的整体偏差不被宣称总为正。
- IPO/KTO/ORPO 相关章节通过原 HTML 的 section 和 MathML alttext 读取；
  SimPO Eq.4–6 已从正文核对。没有从论文的模型排名推断本课程实现收益。

### 19：OPD 梯度、轨迹与 OPSD 信息界

- 原 `derivation` 保留 GLM-5 逐 token 教师差值及 group=1 来源；
  补固定 old 前缀上的局部 loss，教师、old 和当前学生三者职责独立。
- `math-kl-logit-temperature` 从 softmax Jacobian 求两向梯度，明确
  teacher detach、1/tau 与可选 tau^2 loss 尺度。原 reverse-KL 算例
  从不准确的约 0.43 更正为 0.404978。
- `math-trajectory-gradient` 写 KL 链式法则、外层状态分布 score 项、
  sampled suffix cost-to-go；说明长度平均的新目标性质及 forward-KL
  轨迹期望应来自教师。局部 sampled log-ratio 只在相应采样条件下匹配局部梯度。
- `math-privileged-opsd` 给有 z 教师、无 z 学生的 loss、跨步移动教师边界，
  推导固定前缀 forward-KL 的混合分解与条件互信息下界。
- 教学例 p=`[0.6,0.3,0.1]`、q=`[0.2,0.7,0.1]`：
  forward/reverse KL=0.373386045/0.404978015，
  forward 梯度=`[0.4,-0.4,0]`，
  reverse 梯度约=`[0.416181,-0.375683,-0.040498]`。
  两步反例的固定前缀梯度为 0，精确轨迹梯度为 log(3)/8=0.137326536。
  隐藏公平硬币的最小平均 forward KL=log2，不能从无信息学生输入恢复硬币。
- 验证：三个 `test_19_*`，两套 logits、温度 0.5/1/2/4、
  有/无 tau^2 的两向梯度有限差分；枚举四条两步轨迹独立验证链式法则；
  验证 privileged mixture 分解。
- 依据：原 GKD/OPD（2306.13649）、GLM-5 §3.5 及既有
  `integration-evidence.md`、`industrial-evidence.md`。
  原有 OPSD/Purified OPSD/RLSD/H²SD 等 2026 来源与证据边界保留，
  本轮不宣称重新复现或新增核验它们的模型实验、设置或排名。

## 来源锚点与自动验收

source manifest 的本组正文锚点保持有效：

| 章 | 保留锚点与关键词 |
| --- | --- |
| 16 | `intuition`: RLHF/RLVR；`derivation`: PPO/GAE |
| 17 | `example`: RLOO/标准化；`derivation`: Clip-Higher/Dynamic Sampling/Overlong Reward Shaping |
| 18 | `derivation`: Bradley-Terry/DPO；`comparison`: 工业 Pipeline |
| 19 | `derivation`: GLM-5；`intuition`: Cross-Stage |

实际执行结果：

- `node --check content/chapter-13.js` 至 `chapter-19.js`：全部通过。
  新增块连接时 17、19 曾各多一个 `},`，已修复后重新逐章检查。
- `import('./content/catalog.js')`：通过，不再触发 SyntaxError。
- 原九 ID、唯一 ID、第一节 roadmap、真实 link 及 level、白板题数和得分点：
  隔离检查全部通过。
- 通过实际 renderer 提取正文、问题和答案中的公式，KaTeX
  `throwOnError:true, strict:"error"`：13–19 分别
  132/87/116/101/87/101/98 处，共 722 处，零解析错误。
  数量包含重复引用，只证明可解析，不代表数学充分性。
- `python3 scripts/check-math-13-19.py`：16 组测试通过，纯 Python 标准库。
  有限差分步长 1e-6，主要相对/绝对容差 2e-7，正文六位小数允许 1e-6；
  PPO 差分避开 clip 不可导拐点，reference/old/teacher 固定。
- `npm test`：35 项通过；`npm run validate`：30 章、37 份冻结来源通过。
- 主代理新增的 `node scripts/check-math-rendering.mjs` 也已运行通过；
  这是当时整合状态的检查，不替其他 worker 的数学内容背书。
- 本组 tracked 文件的 `git diff --check` 通过。

浏览器视觉、跨宽度交互和共享状态验收由主代理负责。本组不声称进行了
浏览器验收或原论文训练复现；全部新数字是教学算例、解析结果或独立数值验证。
