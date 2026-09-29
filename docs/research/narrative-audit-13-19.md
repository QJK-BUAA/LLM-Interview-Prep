# 第 13–19 章叙事修订审计

日期：2026-09-30。范围仅为 `content/chapter-13.js` 至
`content/chapter-19.js` 与本文件。未修改共享 UI、schema、测试、来源清单、
README 或总阅读记录，未提交 commit。共享文件的并行变更归主代理及其他工作组。

## 依据与阅读范围

完整读取获批设计
`docs/superpowers/specs/2026-09-30-narrative-course-design.md`
与实际计划 `docs/superpowers/plans/2026-09-30-narrative-course.md`。
用户简写的根目录 `plans/2026-09-30-narrative-course.md` 不存在，
通过 `rg --files` 定位上述实际文件，未另建计划。

完整读取七章现有正文和下列七份分配上游文件，包括 GLM 与
agentic-training 的非蒸馏部分，不以目录或摘要代替全文。
上游路径用 `rg --files` 精确定位，固定检出为
`/private/tmp/agentic-rl-analysis-66ae4423`，
获批版本为 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`。
本轮不切换上游版本，不新增网络来源，不声称重新复现上游实验。

纠错依据完整读取 `interview-audit-13-19.md`、
`advanced-policy-data-evidence.md`、`industrial-evidence.md`、
`integration-evidence.md`；另读取 `agentic-core-evidence.md`
的固定上游、基础建模与 MDP/POMDP 证据段。
原论文定位沿用这些既有核验记录，不把本轮读取二级综述说成重新通读所有原论文。
读取第 12 章开场及算例以核对跨章入口，读取 source manifest 核对实际正文锚点。

第 13–15 章是课程补充的 RL 地基，不宣称其全部数学来自该 GitHub：
第 13 章依据 Sutton/Barto、Bellman 与 Spinning Up；
第 14 章依据 Q-Learning、DQN、Double DQN、Dueling 原有来源；
第 15 章依据 REINFORCE、策略梯度定理与 GAE。
它们的手算、反例与条件推导是教学补充，不是上游实验结果。

## 连续主线

| 章 | 与前章衔接、开场任务及数字角色 |
| --- | --- |
| 13 | 第 12 章解决可训练参数成本，本章开始判断没有逐步标准建议的学习计划。两小时先基础后难题，2、5、折扣 0.9 得 6.5；明确轨迹回报与期望价值不同。矩阵节另设持续交替学习，说明为何换成奖励 1、2 和折扣 0.5。 |
| 14 | 不再假设知道成功率，只用学习计划的一次实际转移更新。奖励 1 与下一状态估计 4、1 是新观察和估值，不冒充第 13 章的真值。3.3 与 1.95 来自不同后续策略假设。 |
| 15 | 从选择练习转为生成解题说明，整个词表的 Q 难以估计，直接利用语言模型概率。两 token 的 0.8、0.6，奖励 1、基准 0.4 得优势 0.6；0.12、0.24 是 logit 导数而非概率或因果贡献。三 token GAE 例明确是扩展后的新设定。 |
| 16 | 解题说明还需有帮助且不过度承诺，不能只核对最终答案。偏好评分接到第 15 章优势估计，再限制更新。old/current 的 0.20/0.26 与另补 reference 的 0.10 分别服务于两种比较；优势 2 是教学设定。 |
| 17 | 同题四份算术解答两对两错，用组比较代替独立 critic。0/1 是奖励编码，标准化 ±1 与 RLOO ±2/3 是不同权重；全错组没有相对方向，不等于所有正则也无梯度。 |
| 18 | 已有解题说明的固定偏好记录，减少在线生成需求。四个 log-prob 给 margin 0.8、logit 0.08，约 0.52 是偏好胜率而非正确率。两回答最优策略例与三类概率下降反例均明确为独立诊断设定。 |
| 19 | 学生沿错误继续推而答错，固定偏好数据未覆盖该前缀，同题全错无法排序；教师就在学生前缀给概率。三 token 词表仅为手算，KL 0.404978 不是错误率。两分支与隐藏硬币分别隔离状态分布和信息条件。 |

七章的真实 `sections` 前三项均为 `intuition`、`example`、`roadmap`，
不是渲染时另加一个导言。全部路线链接保持原 ID，并与正文推导先后对应。
所有 21 个开场、例子、路线正文均已改写；所有 26 个推导均有无 LaTeX
的首段任务，不只处理 `math-*`。原公式、题目及非正文元数据保持。

## 逐推导审计

本表逐个覆盖原 `derivation` 和 19 个 `math-*`。入口是本轮实际任务，
不是通用“先定义符号”提示；读数列说明结果如何回到任务并引出下一步。

### 第 13 章

| Section ID | 具体入口与因果推导 | 数字读数、条件与继续方向 |
| --- | --- | --- |
| `13/derivation` | “在任意中间状态重新评估计划”：先定义时刻、奖励、回报与固定策略；拆出即时奖励，再对动作和环境结果取条件期望，解释全期望而非独立性。 | 6.5 的两步递推对应开场；另设 Q=[6,2]、策略=[1/4,3/4] 检查 V=3、优势=[3,-1] 的策略加权中心化。说明不是均匀平均，随后求联立状态价值。 |
| `13/math-bellman-matrix` | “每天交替复习基础和练难题”：把有限时域例扩展为持续任务；定义 n 维价值/奖励、转移矩阵、单位矩阵和谱半径。移项后用 Neumann 级数解释可逆条件。 | [8/3,10/3] 大于当日奖励，因为包含以后折扣收益；零初始化备份逐步逼近。限定折扣小于 1，接着解释迭代为何收敛及何时停止。 |
| `13/math-contraction-control` | “不同初始估值会不会走向不同答案”：定义备份算子与最大范数，从概率平均界推出收缩，再由 residual 界转到策略改进。 | residual=0.02、折扣 0.9 对应误差上界 0.2；终止奖励由 2 改为 3 后才值得改建议，得到 [3,3.5]。限定已知模型、精确表格备份，下一步核查终止语义。 |
| `13/math-terminal-discount` | “刚完成基础题，采集程序就停止”：定义有限时域端点，再对照无限自环和吸收链，最后拆开真终止与片段边界。 | 真终止 target=2，采集截断 target=6.5，误清零少算 4.5 会低估复习建议。保留 reset 前末观测；接第 14 章用采样转移更新。 |

### 第 14 章

| Section ID | 具体入口与因果推导 | 数字读数、条件与继续方向 |
| --- | --- | --- |
| `14/derivation` | “一个格子从 2 改到 3.3，网络该怎样改”：定义观察、target、在线/目标参数和经验分布；平方残差接链式法则，说明停止梯度与 residual-gradient 的区别。 | 同一 target=4.6，Q=2θ、θ=1，学习率改为 0.1 后 Q=3.04。明确学习率及 Jacobian 均改变，不拿它与表格 3.3 排优劣；继续检查目标高估。 |
| `14/math-double-bias` | “是否仅选中了正误差”：将两个等价练习的真值平移到零，枚举四种噪声；从选择偏差引出 online 选、target 评。 | max 期望 0.5；另设两网络排序相反，同一奖励 1 得 target 5.5/2.8。下降不证明已等于真值，独立条件不冒充真实双网络独立；继续处理共享表示与异常残差。 |
| `14/math-dueling-huber` | “共同状态信息不必学多遍，但异常成绩会冲击更新”：先定义 V/A 分量和不可辨识平移，再中心化；回到预测 2、target 4.6 推 Huber，最后说明目标刷新。 | 三候选 Q=[14/3,8/3,5/3] 均值仍为 3；Huber 把对 Q 导数从 -2.6 限到 -1，不等于参数梯度范数裁剪。C/τ 表示复制时间尺度；接第 15 章直接学习动作概率。 |

### 第 15 章

| Section ID | 具体入口与因果推导 | 数字读数、条件与继续方向 |
| --- | --- | --- |
| `15/derivation` | “验证器不可微，为什么仍能更新 token”：定义轨迹及采样概率，对概率而非环境求导；乘积转 log 和，再由动作前历史消去过去奖励。接 TD residual 与 GAE。 | 奖励 1 减 0.4 后乘 softmax score，回到 0.12、0.24。一般折扣目标保留外层 gamma^t；下一节单独证明减基准是否合法。 |
| `15/math-baseline` | “把奖励从 1 减成 0.6 会不会减错方向”：固定前缀对动作平均，证明状态基准零期望；再最小化 score-norm 加权二阶矩。 | 为隔离概率 0.8，另设一次二元正确动作即得 1，真实梯度 0.16；b=0/0.2/0.8 方差不同，最优 b=0.2。说明 detach 不修复偷看动作的统计偏差；继续利用多前缀价值。 |
| `15/math-gae-telescoping` | “首 token 等终局太久，如何混合不同等待长度”：定义冻结 rollout critic、n-step target，价值项望远镜抵消，再保留有限混合的末项权重。 | 三位置奖励 [0,0,1] 得优势 [0.4372,0.51,0.5]；首项不只是当地 0.07，末 target=1 来自真实终局。lambda=1 端点检查仍区分截断；接冻结目标的训练图。 |
| `15/math-actor-critic-detach` | “策略会不会通过改价值而非改动作降低 loss”：定义有效动作 mask、参数、冻结优势/returns；两损失分别求导，再拆 bootstrap 与递推边界。 | 开场两 token、优势 0.6、价值 0.4，关熵后平均 actor loss≈0.220191、critic loss=0.18，critic target=1。两者是不同梯度；接第 16 章评分来源与旧样本复用。 |

### 第 16 章

| Section ID | 具体入口与因果推导 | 数字读数、条件与继续方向 |
| --- | --- | --- |
| `16/derivation` | “人只给顺序，没有绝对分”：先定义同题胜负、标量 RM、sigmoid，从偏好似然求梯度；冻结评分器后加入 reference 代价，再用 GAE 与 old/current ratio 更新。 | 分差 1 给 RM 两侧约 ±0.268941；这不是直接改回答概率。另设的优势 2 经 ratio 1.3 得 clip 贡献 2.4。reference/old/current 与 RM 冻结职责分开；下一节拆 KL。 |
| `16/math-kl-estimators` | “只有采到的 token，怎样估计离基准多远”：固定前缀定义 p/q/u，使用 E_p[u]=1 比较 k1/k2/k3，随后分别讨论旧分布及梯度中的分布项。 | old/ref=0.2/0.1、beta=0.1 得 -0.069315，与 current/old=1.3 不是同一比值。k3 数值无偏有支持与采样条件，不等于固定样本梯度无偏；接局部更新预算。 |
| `16/math-trpo-fisher` | “相同参数步幅未必产生相同概率变化”：定义目标梯度、old 状态分布、KL 预算；二阶展开得到 Fisher，再从乘子驻点求自然梯度步。 | g=[1,2]、F=diag(2,8) 给 [0.070711,0.035355]：第二方向梯度虽大但曲率更大，步幅更小。二次 KL=0.01 仅是局部模型结果；接不等价于此约束的 PPO。 |
| `16/math-ppo-update` | “好 token 增三成可封顶，坏 token 增三成仍须压回”：定义 log-prob 与冻结 A，按符号选支路，再通过指数链式法则保留 ratio 因子。汇总 actor/value/entropy/可选 KL。 | 四例目标 [2.4,-2.6,1.4,-1.6]、导数 [0,-2.6,1.4,0]；最小化 loss 变号，不无条件 clamp。奖励已含 KL 时不默认重复惩罚；接第 17 章用同题回答替代 critic。 |

### 第 17 章

| Section ID | 具体入口与因果推导 | 数字读数、条件与继续方向 |
| --- | --- | --- |
| `17/derivation` | “四份解答的优势怎样作用于许多 token”：定义组、前缀、有效长度与冻结量，完整写 GRPO 求和和 k3；从序列奖励与 token 门控的不一致引到 GSPO，从分母引到 Dr.GRPO/DAPO。 | 两对两错且 ratio=1 的奖励目标平均为零，不代表 score 向量梯度为零。长度 2/8 时权重 1/4、1/16 与 1/10 区别是聚合而非精确信用；接组基准证明与 DAPO。 |
| `17/math-normalization-rloo` | “第 15 章基准证明为何不能直接用于含自身均值”：去 clip、std、长度平均，只保留独立同策略序列 score；交叉项消去，自身项留下 1/G。 | 四条样本中心化缩小到 3/4，RLOO 补回；±0.5、±1、±2/3 及样本 std 的 ±0.866025 分开。全错与 G=1 不造方向；接只补混合组的动态采样。 |
| `17/math-dapo` | “全错、长回答占预算、写完前被截断”：逐项对应 clip 空间、组筛选、token 分母、长度奖励；通过排除全对全错事件推保留概率。 | p=0.5、G=4 保留 0.875；长度 [2,8] 目标 0/-0.6/-0.3；长度 9 在上限 10、缓冲 2 时扣 0.5。数据、权重、奖励变化分别解释，不声称解决全部偏差；接固定偏好数据。 |

### 第 18 章

| Section ID | 具体入口与因果推导 | 数字读数、条件与继续方向 |
| --- | --- | --- |
| `18/derivation` | “只有偏好顺序，如何跳过显式 RM”：假想奖励已知求最优分布，用乘子保证概率归一；反解隐式奖励，在同 prompt 的 BT 差值中消去 Z。 | 两回答 q=[0.5,0.5]、r=[log3,0] 得 Z=2、p*=[0.75,0.25]。生成概率与 BT 胜率此例相同不代表概念相同；保留支持/有限 Z/可表示性条件，接实际梯度。 |
| `18/math-dpo-gradient-length` | “约 0.52 胜率下一步怎样改概率”：从四个 log-prob 的 margin 经 sigmoid 链式求导，再接 token Jacobian；区分固定真实奖励的 beta 与 SGD 梯度尺度。 | 原例 loss≈0.653947、两侧导数约 ±0.048001；每 token 相同提升时长度引出额外 0.3 gap。三类概率反例中 chosen 从 0.4 降到 0.3 而 margin 提升，不保证绝对似然增加；接变体。 |
| `18/math-preference-pairs` | “有限间隔、长度单位、保留模仿能力是三种需求”：IPO 双向平方项解释 1/(2τ)，SimPO 改平均 log-prob 与 margin，ORPO 再把 chosen NLL 和几何平均 odds 结合。 | IPO h=0.8、目标 1 得导数 -0.4；SimPO z=0.4 已扣 margin；ORPO 总 loss≈0.948136 含 SFT，不与纯偏好 loss 排质量。公式负号与长度约定沿用一手纠错；接无配对标签。 |
| `18/math-kto` | “只有一条回答的有帮助/无帮助反馈”：不跨题硬配对，定义单条标签、未缩放 log-ratio、冻结参考点，用有界效用缺口而非负 log 似然。 | 参考点处两类 loss 都为 0.5，导数却是 -0.05/+0.05；标签定方向、参考点定区域。错配 batch 与 clamp 有偏，不宣称真实 KL 无偏；接新错误前缀缺监督的问题。 |

### 第 19 章

| Section ID | 具体入口与因果推导 | 数字读数、条件与继续方向 |
| --- | --- | --- |
| `19/derivation` | “学生错误前缀上的教师概率如何接成批训练”：定义 x/y/前缀、可选特权 z、词表与长度；区分两向局部 KL、old 前缀 surrogate，再接 GLM-5 的冻结 token 差值。 | 三 token 局部 KL=0.404978；另一个位置 teacher/student=0.4/0.2 得 log2≈0.693。group=1 不使用组均值，前序 checkpoint 不等于特权上下文教师；接 logits 求导。 |
| `19/math-kl-logit-temperature` | “第三个 token 两侧概率相同就不更新吗”：固定前缀、冻结教师，定义 K 维 logits 和温度；forward 只对 log p 求导，reverse 同时对权重 p 求导。 | forward=[0.4,-0.4,0]，reverse≈[0.416181,-0.375683,-0.040498]，第三项因归一化耦合而非新正确性标签。tau² 是尺度约定；接早期动作影响未来前缀。 |
| `19/math-trajectory-gradient` | “先继续还是先检查会进入不同分支”：KL 链式法则先取条件期望，再用第 15 章 score 均值与因果性求外层分布项；区分当前 token 差值与后缀 cost-to-go。 | 两步反例局部对 h 梯度为 0，精确轨迹为 log3/8≈0.137327，会压低进入差距大分支的概率。长度平均是新目标，forward 轨迹期望来自教师；接额外信息条件。 |
| `19/math-privileged-opsd` | “见过答案的教师选择能否由只见题目的学生复原”：定义两种条件和教师版本；固定前缀下给 forward KL 加减平均教师项，拆成可拟合部分与不可消除信息项。 | 隐藏公平硬币下最优学生=[0.5,0.5]，最小平均 KL=log2，不是容量问题；算术答案可由题目推导则仍可能迁移。限定 forward/固定前缀，接上下文隔离代码、方法对照与第 20 章优化器。 |

## 逐篇上游阅读与采用

以下路径均相对于固定上游根目录。每条同时记录原文标题、机制、课程落点、
修正与未采纳边界；不是关键词覆盖清单。

### 1. `docs/post-training/ch1/1.2-rlhf-rlvr.md`

- 原文标题：`RLHF 范式：从人类反馈中学习`、`经典三阶段流程`、
  `RL 优化目标`、`奖励模型的已知问题`、
  `RLVR 范式：基于可验证奖励的强化学习`、`RLHF vs RLVR 对比`、
  `为什么 RLVR 在推理任务上取得了突破？`、`2025 年的收敛范式`。
- 实质机制：同 prompt 偏好对训练 BT 评分器，策略最大化其反馈并受 reference
  KL 约束；可验证任务可直接使用答案或测试反馈。两者解决“怎样评分”，
  不决定一定使用哪一种 optimizer。
- 采用位置：`16/intuition` 先提出两份解题说明的比较需求；
  `16/derivation` 将评分器训练、冻结、KL shaping 与 PPO 连起来；
  `17/intuition`、`17/example` 用可验证算术结果展示奖励来源的另一选择。
- 校正：不采纳原文“零 Reward Hacking”“完全没有噪声”
  “仅限确定答案”“数学题可以无限生成”作为普适事实。
  `16/pitfall`、`17/pitfall` 保留解析器、不完整测试、泄漏与分布外风险。
  不据 R1 的报告宣称它开创了所有可验证奖励 RL，不把轻量 SFT 或固定流水线
  当作所有模型必经方案。
- 证据边界：上游提供综述组织；BT/RLHF 依据原有 InstructGPT、
  summarization 与 PPO 来源和既有 evidence；本组不采用宏观性能保证。

### 2. `docs/post-training/ch1/1.3-dpo.md`

- 原文标题：`损失函数`、`DPO 的实际定位`，以及 DPO 论文说明与变体延伸阅读。
- 实质机制：同题 winner/loser 相对 reference 的 log-ratio 差进入 logistic
  loss，可省显式 RM 与在线 RL 循环，但固定数据不跟随更新后的策略。
- 采用位置：`18/intuition` 的历史解释偏好对；
  `18/example` 的四个 log-prob；`18/derivation` 补完整乘子、
  Z 与 BT 消项，`18/math-dpo-gradient-length` 补梯度及概率下降反例。
  `18/comparison` 保留工业 Pipeline 的分阶段定位。
- 校正：不采纳“在线 RL 在复杂推理上明显优于 DPO”或固定厂商算法排名
  为无条件结论；数据、预算、底座和反馈需受控。
  IPO/SimPO/ORPO/KTO 精确目标不来自本篇的名字列表，而来自原有原论文
  核验记录，包括 ORPO 几何平均、IPO 的 1/2、KTO 非交叉熵。
- 证据边界：DPO 推导是原论文定义与课程代数展开；工业阶段采用
  `industrial-evidence.md` 的 Qwen2.5/MiniMax-01 核验，不新增厂商结果。

### 3. `docs/post-training/ch1/1.4-ppo.md`

- 原文标题：`核心思想`、`核心公式`、`裁剪机制`、
  `PPO 在 LLM 场景的问题`；补充框为 `PPO 的三个关键概念`。
- 实质机制：old rollout 上的概率比乘 GAE 优势，带符号 min/clip 限制
  继续奖励已有的大幅变化；critic 估计前缀价值，稀疏终局反馈使它难训练。
- 采用位置：`16/example` 先算 ratio=1.3；`16/derivation` 接第 15 章 GAE；
  `16/math-ppo-update` 枚举四个正负分支；`16/math-trpo-fisher`
  是课程补充的局部几何解释，而非声称上游已有完整证明。
- 校正：不把 clip 当严格 trust region；不采纳 critic 必须与 actor
  同规模、四个模型必须同时驻留 GPU。逻辑角色与具体资源部署分开。
  `16/math-kl-estimators` 明确旧数据修正、共同支撑及数值/梯度无偏性区别。
- 证据边界：PPO/GAE 定义沿原论文，四模型成本只作设计因素，
  不给普适显存比例或训练收益。

### 4. `docs/post-training/ch1/1.5-grpo.md`

- 原文标题：`核心思想`、`核心公式`、`为什么这么设计`、`GRPO 的局限`；
  补充框为 `Group Relative 是什么意思？` 与
  `为什么 Hard Clipping 会让被裁剪 token 的梯度变为 0？`。
- 实质机制：同题多条回答的组均值/std 替代独立 critic，完整目标还包含
  token ratio、clip、序列/token 分母与 reference 项。原文用平方根问题
  说明组内对错比较，本课程改为完整四条 0/1 算术解答便于全部手算。
- 采用位置：`17/intuition`、`17/example`、
  `17/derivation`；`17/math-normalization-rloo` 补有限组自身项、
  RLOO 条件与随机 std 的作用。
- 校正：明确 GRPO 不必 RM-free。既有原始 DeepSeekMath 核验的
  Outcome Supervision 明确使用 RM；去 critic、去 RM、去 reference
  是独立选择。不上移“节省约 25% 显存”或“规则杜绝 hacking”。
  上游 mask 梯度漏 ratio，`16/math-ppo-update` 保留
  `d f / d log-prob = M*A*ratio`；稀有词不因一次裁剪就“永远学不到”。
- 证据边界：原始 GRPO 定义沿 DeepSeekMath，偏差、RLOO 和梯度枚举
  是课程补充。k3 仅在对应采样和支撑条件下数值无偏，不给多 epoch 保证。

### 5. `docs/post-training/ch1/1.6-dapo.md`

- 原文标题：`核心公式`、`四大核心改进`、`移除 KL 散度`；
  四项原标注为 `Clip-Higher（非对称裁剪）`、
  `Dynamic Sampling（动态采样）`、
  `Token-Level Policy Gradient Loss（全局 Token 归一化）`、
  `Overlong Reward Shaping（超长输出奖励塑形）`。
- 实质机制：放宽正优势上界；筛去全对/全错组再补采；
  用有效 token 总数聚合；接近长度上限时线性扣分。
  四项改的是不同对象，不只是一个新 clipping 公式。
- 采用位置：`17/derivation` 保留原正文来源锚点并说明四项动机；
  `17/math-dapo` 展开保留概率、改变后的题目分布、组/跨 batch 分母、
  Dr.GRPO 对照与长度分段值；`17/code` 保留组筛选实验。
- 校正：0.2/0.28 是论文设置而非通用最优值；全同组只是相对奖励项无信号；
  过滤成本包括丢弃 rollout，筛选不保证困难题得到学习。
  token 平均不等于 token 因果标签，去 KL 是该配方的实验选择。
- 证据边界：不把上游 AIME 50、43 的表述当本课程实验或普遍因果收益；
  评测口径沿 `industrial-evidence.md` 的 E22-09。长度 2/8、8/9/10
  与保留率 0.875 都是可复算教学例。

### 6. `docs/post-training/ch2/2.5-glm.md`

- 原文标题：`模型架构`、`五阶段后训练 Pipeline`、`三种 Thinking 模式`、
  `TITO Gateway -- 被忽视的工程关键`、`非确定性 CUDA top-k Bug`、
  `异步 Agentic RL -- "Slime" 框架`、`Cross-Stage Distillation`、
  `国产芯片适配`。
- 实质机制：顺序推理、Agent、通用训练可能遗忘前序能力，保存前序阶段
  checkpoint 作为教师，在对应题目上让当前学生 rollout 后接受蒸馏。
  这是按阶段保留行为的用途，不要求给教师额外正确答案。
- 采用位置：`19/intuition` 的 Cross-Stage 区分；
  `19/derivation` 的 GLM-5 token 差值；
  `19/math-trajectory-gradient` 明确局部信号不自动等于精确轨迹梯度。
- 校正：原文 teacher_score-student_score 过于含糊，依据既有
  GLM-5 §3.5 核验写为冻结的教师推理与学生训练 log-prob 差；
  教师是前序阶段最终 checkpoint，不改写成未披露的最优搜索选择。
  group=1 不套用标准组中心化；不采纳“恢复所有能力”“不丢失任何阶段”
  或全面榜单最佳。
- 证据边界：TITO、top-k、异步系统全文已读，但本组不把它们追加为第 19 章
  的另一条系统主线，保留给第 23/28 章。原文 top-k 熵激增与报告熵下降
  冲突、IcePop 被误称 KL、torch.topk 的跨栈保证均沿 E23-11/12 边界，
  不在本组重复不可靠结论。国产芯片、架构与并发规模未用于推导蒸馏收益。

### 7. `docs/post-training/ch2/2.10-agentic-training.md`

- 原文蒸馏路径的具体标题：`1. GLM-5 训练全流程`、
  `1.1 Base Model Training：先把底座练扎实`、
  `1.2 Post-Training：渐进式对齐`、
  `1.2.1 SFT：不只是指令微调`、`1.2.2 Reasoning RL：先强化推理`、
  `1.2.3 Agentic RL：让模型学会"执行任务"`、
  `1.2.4 General RL：通用场景对齐`、
  `1.2.5 On-Policy Cross-Stage Distillation（OPD）：防遗忘`。
  另外完整读过 `2. Agentic 数据合成` 的标准流水线与 SWE/Terminal/Search，
  `3. RL 训练挑战与解决方案` 的训推一致性、异步 off-policy、Agent Swarm
  及 `要点总结`。
- 实质机制：当前学生在前序教师训练域采样，用
  `sg[log pi_teacher - log pi_student]` 构造 token 权重。
  数据跟随学生状态，教师提供密集反馈；“谁生成轨迹”和“谁提供反馈”
  是两条坐标轴。它也强调 SFT 学习工具与行为模板，不只是输出格式。
- 采用位置：`19/intuition`、`19/derivation`、
  `19/diagram`；用三 token 分布连接“错误前缀缺覆盖”的实际问题。
  与第 18 章固定偏好数据、第 17 章全错组形成衔接。
- 校正：不把 OPD “不易遗忘”“新持续学习范式”写成保证。
  `19/math-trajectory-gradient` 保留外层状态导数与长度平均边界；
  `19/math-privileged-opsd` 区分跨阶段教师与特权上下文教师。
  RL 本身不假设单步，第 13 章开场明确长期决策本来就是 RL 对象。
- 证据边界：此文是包含作者解读的二级综述，GLM 具体蒸馏定义以既有
  技术报告 §3.5 核验为准。数据合成、IcePop、异步版本与 PARL 由其他章节
  承担，本组不据推荐文章推出未披露超参数、全局收敛或普遍加速。
  2026 OPSD/Purified OPSD/RLSD/H²SD/Lightning OPD 的来源保留，
  本轮不声称独立复核或复现实验；局限与选型仍标为特定设置的预印本证据。

## 主代理反馈

主代理已精读第 17/19 章完整教学链及第 13–19 章全部推导首尾，反馈连贯性通过。
本组随后仅落实两处修订：

1. `19/intuition` 将错误前缀“无论怎样续写都答不对”改为
   “随后沿着这个错误继续推，最终答错”，不排除回溯纠错。
2. `19/roadmap` 将 softmax Jacobian 回补指向第 05 章；
   具体已有位置是 `05/math-softmax-ce`，不再指向只有相关温度/embedding
   内容的第 08 章。

## 验证结果

用 Node 直接导入七章，并从 Git `HEAD` 对照原模块；临时检查只通过标准输入
执行，未创建或修改共享测试脚本。

- 七个 `node --check` 全部通过。
- 96 个原 section ID 全部保留且唯一，96 个旧 hash 逐一通过真实 `parseRoute`；
  章 ID、slug、sources、所有章元数据及每节非 body 字段深比较完全一致。
- 56 道原问答（含 26 道白板题）逐字保留；所有旧正文公式按每节多重集比较，
  627 处旧公式出现均存在，未以相似新公式替代旧公式。
- 21 个开场/例子/路线及 26 个推导正文都已改变，全部首段不含 LaTeX。
  首三节准确为 `intuition/example/roadmap`，所有路线目标存在且顺序与正文一致。
- 读取 source manifest 的真实 `coverage` 字段，核对本组 8 个来源正文锚点
  及其主题词，全部通过；不修改 manifest。
- 七章 `validateChapter` 无错误。对 learn/interview 两模式的实际 renderer
  输出检查章节锚点及公式/路线链接均有可见目标；开场在目标前、例子在索引前，
  索引 learn 默认关闭、interview 默认展开。此为字符串级集成检查，不冒充浏览器验收。
- 经真实 renderer 提取正文与问答数学，KaTeX
  `throwOnError: true, strict: "error"` 全通过：
  13–19 章分别 151/101/137/121/105/113/108 处，共 836 处。
  数量含重复引用，只证明解析完整，不证明教学连贯。
- `python3 scripts/check-math-13-19.py`：16 组数值测试全部通过，
  涵盖 Bellman、DQN、baseline、GAE、PPO/KL、GRPO/RLOO、DPO 家族、
  两向蒸馏梯度、轨迹与信息下界。
- 新补的 actor/critic 读数另以 Node 复算：
  `-0.6*(log(0.8)+log(0.6))/2 ≈ 0.220191`，
  `0.5*(0.4-1)^2 = 0.18`。
- 七章 `git diff --check` 通过。没有运行或声明拥有全站浏览器、完整共享测试、
  总阅读说明或提交验收；这些由主代理完成。

正文及审计完成后交回上述八个文件所有权，不再继续编辑。
