# 全内容独立审查：13–19

基线：`635fb27`。已完整读取 13–19 的全部元数据、目标、开场、实例、路线、图中文字、推导、代码、误区、比较、面试短答、自测、白板及来源。以下是修订前的问题记录；课程尚未修改，最终状态以总报告为准。

## 逐章覆盖

| 章 | 实际审查内容 | 判断 |
|---|---|---|
| 13 | MDP 与回报、V/Q/A、Bellman 条件期望、矩阵解、收缩和 residual、策略/价值迭代、终止/截断、代码与全部问答 | 推导与数字一致；有限时域、吸收条件和模型已知/采样近似边界充分。简短 on-policy 定义、TD 偏差和截断误差方向需修正。 |
| 14 | epsilon-greedy、SARSA/Q-learning、DQN 半梯度、Double 高估反例、Dueling 中心化、Huber、replay/target、全部代码与问答 | 本章明确目标均有落点。Double 的独立误差条件、Dueling 的 V 非行为价值、Huber 非参数梯度界均已讲清，未发现需重写的实质公式错误。 |
| 15 | 轨迹 score、因果性与外层折扣、baseline 证明及最优方差反例、有限 GAE 混合、actor/critic detach、双 mask、代码与全部题目 | 核心推导完整且数值正确；代码明确限定单连续片段，不误判为缺少任意拼接支持。目标/短答的 baseline、GAE 语气及 clipping 描述需与正文保持一致。 |
| 16 | BT 梯度、reference/old/current、k1/k2/k3、值与梯度的采样区别、TRPO/Fisher、PPO 四分支、完整 loss/value clipping、四模型代码、全部问答 | 主要数学正确，尤其没有把局部 k3 自动微分冒充目标 KL 精确梯度。开场和速记仍残留硬约束式说法，且“每多一个 epoch 偏差都会增大”过强。 |
| 17 | 完整 GRPO、总体/样本 std、自身 baseline、RLOO 证明、DAPO 保留概率、三种长度分母、软长度惩罚、代码与全部问答 | 目标、数字与独立计算一致；已区分配方无偏性、reward/KL、组内/batch token 分母。误区段一处零梯度概述需补“相对奖励项”。 |
| 18 | DPO 拉格朗日完整推导、梯度/beta/长度/绝对概率反例、IPO/SimPO/ORPO/KTO、离线/在线数据、稳定代码、全部问答 | 已覆盖目标；概率归一化、同题 Z 消去、ORPO 几何均值和 KTO 有偏参考点均明确。比较中的 SimPO 解码措辞应与数学节一致，KTO 的数据分布符号可去歧义。 |
| 19 | OPD/OPSD/跨阶段来源、两向 KL 全梯度与温度、轨迹 score 项、条件信息下界、伪代码、六种新方法比较、全部问答 | 主要推导与反例正确，GLM-5 差值和 group size=1 与报告一致。确认正文与伪代码的长度聚合不一致；RLSD 的“方向”需限定到 token 优势符号；Lightning 缓存来源及前沿比较应具体化。 |

## 确认问题与修法

### F13-1（定义）：策略接近不是严格 on-policy 的判据

- 位置：13 `diagram` 的“当前策略或非常接近它的策略”；`pitfall` 第三项的“只要策略已大幅更新”；全局 glossary 同类定义。
- on-policy 的严格关系是用于目标的策略与行为策略相同；参数只变一点仍可能出现分布不匹配。PPO 通常归为 on-policy 算法家族，但其固定 old 数据多轮更新采用近端 surrogate，不代表每个 minibatch 都严格同分布。
- 修法：先给严格定义，再说明算法家族惯例；不能用“大幅”作为是否 off-policy 的门槛。与 16、19、28 的 old/current 说明统一。

### F13-2（条件）：TD 的自举偏差与截断误差都不是无条件结论

- 位置：13 `comparison`/`interview` 的“bootstrap 有偏”“方差较低”；`pitfall`/`quiz` 的“系统偏低”“向下偏差”。
- 固定正确策略、终止处理正确时，一步目标的条件偏差是 `gamma E[Vhat(s')−Vpi(s')|s]`。若 `Vhat=Vpi`，一步目标无这种偏差；不同奖励相关结构也不保证 TD/MC 方差永远有同一顺序。
- 错误清零漏掉的是 `gamma V(s')`，并不总使目标降低。独立反例：`r=2,gamma=.9,V'=-5`，正确 target=-2.5，清零后 target=2，反而高估 4.5。原正文正价值例 6.5→2 没错。
- 修法：写“依赖价值估计误差、通常降低采样方差”；通用截断说明写“造成偏差，方向取决于末状态价值”，保留原正价值手算。

### F15-1 / F16-1（跨章一致性）：clip 限制的是目标激励，不能写成硬概率界

- 位置：15 `pitfall` 第六项把 PPO ratio clipping 说成“限制策略概率比”；16 `example` 负优势句写“阻止概率比过度降到 0.8 以下”；16 `summary`、`comparison` 的梯度裁剪/clip 用语。与已记录的 F06-1 一并处理。
- 16 数学节已有正确分支：`A<0,rho<1−epsilon` 时该样本 surrogate 梯度归零，不把实际 ratio 投影回区间。共享参数、其他损失与优化器状态仍可移动它。
- 修法：用“停止该样本在继续降低概率方向的额外收益/抑制相应激励”；梯度范数裁剪就写梯度范数，Adam 参数步没有同一硬界。不修改正确的四分支导数。
- 16 `diagram` 的“每多做一轮 epoch……偏差都会增大”改为“可能增大”；优化步骤不保证 old/current 距离单调增长。

### F15-2（复习条件）：GAE 与 baseline 的速记不能抹掉正文反例

- 位置：15 objective“baseline 为何降方差”；`pitfall` 第三项“却增加轨迹采样方差”；`interview` 中小 lambda 必然低方差高偏差。
- 正文已给 `V=0.8` 的 baseline 使方差从 0.0064 增至 0.0576 的反例，也明确 GAE 权衡不是普遍单调定理。
- 修法：目标改为合适 baseline 的作用与无偏条件；短答保留“通常”“依 critic 与末端误差”。不删除或重写已有正确证明。

### F17-1（目标范围）：零优势只使相对奖励项消失

- 位置：17 `pitfall` 第二项“它们对组相对目标没有梯度”。
- 同章完整 GRPO 含显式 reference KL，白板也已说明该项仍可更新。独立二元例：`p=.8,q=.5,A=0`，k3 在当前动作采样下的固定样本 logit 导数期望为 0.3，不为零。
- 修法：明确“相对奖励项没有区分信号，正则项仍可能更新”，与已有推导一致。

### F18-1（措辞/符号）：平均 log-prob 不等于通用解码目标

- 位置：18 `comparison` 写 SimPO 与“生成时常用的平均 log probability”对齐，而详细推导已说随机采样并非精确最大化此均值。
- 修法：明确这是 SimPO 采用的长度归一化评分代理；greedy、采样和不同长度惩罚的 beam search 不共享一个精确均值目标。
- 附带将 KTO 的 `E_D` 改为 `E_(x,y,d)~mathcal D` 并定义数据分布，避免与 desirable 类别 `D` 同符号。

### F19-1（重要，公式—代码接口）：OPSD 的聚合分母改变了目标

- 位置：19 `derivation`/`math-privileged-opsd` 定义每条回答先除 `T(y)`，而 `code` 直接 `masked_mean(reverse_kl(...), response_mask(...))`，未指定按序列维归约，通常成为全批 token mean。
- 独立反例：两句长 2 和 8，各自每 token loss 恒为 1、3，正文等句权目标为 `(1+3)/2=2`；全 token mean 为 `(2+24)/10=2.6`。
- 原始 OPSD Algorithm 1/§3.2 也明确每句 token 平均后对 minibatch 平均。
- 修法：代码显式计算 `[B,T]` 的 token KL、每句有效 token 数、逐句和/长度再取 batch mean；说明如何处理空回答与位置对齐。若采用全 token mean，必须作为另一约定介绍，不能默认与正文相同。
- 验证：增加真实聚合行为检查，变长序列与 padding 下仍符合所声明目标。

### F19-2（保证边界）：保留 token 优势正负号不保证整网更新方向或成功行为不变

- 位置：19 `comparison`、选择树与 RLSD `quiz` 的“verifier 决定方向”“避免教师覆盖成功轨迹”。
- RLSD §4 的正权重乘序列优势，保留的是各 token 系数的符号。共享参数下加权梯度之和可以转向，不能保证成功行为绝不退化。
- 独立反例：两 token 梯度 `[1,0]`、`[-2,1]`，正权重 `[1,1]` 得 `[-1,1]`，正权重 `[3,1]` 得 `[1,1]`，第一坐标反向而各系数均正。
- 修法：限定为“验证奖励产生的优势决定 token 系数正负；教师正权重调幅”，并用一句说明总参数梯度仍变化。也不把 verifier 的绝对 0/1 奖励直接当中心化优势。

### F19-3（来源与完整性）：Lightning 的两种数据来源需要分开

- 位置：19 `comparison`、选择树和 Lightning `quiz`，笼统的“SFT rollout”容易被理解为缓存教师原始示范。
- 原文 §3.2：第一阶段由教师生成 SFT 示范；先得到 SFT 学生 `pi_ref`，再由这个固定学生在 OPD prompts 上生成轨迹，教师一次性打 log-prob 并缓存。teacher consistency 要求两个阶段使用同一教师，不要求 OPD 轨迹由教师生成。
- 修法：明确这两步及更新后的数据陈旧；“离线”不是通过名称自动变回严格实时 on-policy。
- 同一比较节可补清已声明的前沿方法对象：Purified 的 question-only base、question+reference 和 reference-only 三次冻结前向；H²SD 的成功回答+改写指令评分与失败 hint 纠正。无需把所有预印本超参数都扩写为课程主线。

## 本批一手来源复读

本轮通过 arXiv HTML 定向完整读取以下方法节点及对应摘要，不把页面其余部分算作已读。未复现论文训练；版本记录为 2026-10-07 访问的 HTML，GLM 显式固定 v1。

- [DAPO §3](https://arxiv.org/html/2503.14476#S3)：目标式 (8)、保留规则、四项机制及公式 (13) 与课程一致；原文中“限制概率”的口语仍不能替代实际 surrogate 导数。
- [Dr.GRPO §3](https://arxiv.org/html/2503.20783#S3)：核对两种分母、固定 MAX_TOKENS、实验条件。论文把含自身 baseline 简称无偏，课程自己的 `(G−1)/G` 推导更精确，应保留，不因原文措辞回退。
- [GLM-5 v1 §3.5](https://arxiv.org/html/2602.15763v1#S3.SS5)：前序阶段最终 checkpoint、对应训练集混合、teacher-infer/current-train 的冻结 log-ratio、group size=1，与正文一致。
- [OPSD §3](https://arxiv.org/html/2601.18734#S3)：同模型不同上下文、全词表散度、每句平均、teacher 停梯度；原文还支持 generalized JSD、逐词表贡献 clipping 和 sampled-token 替代。课程的 reverse KL 是明确教学实例，不宜暗示它是所有 OPSD 配方的唯一选择。
- [RLSD §4](https://arxiv.org/html/2604.03128#S4)：`Delta=sg(log PT−log PS)`、正的方向感知权重、权重 clipping 和与组优势结合。**原文内部表达问题：**式 (16) 与 Algorithm 1 更新行没有显式可训练 ratio/log-prob，而相关权重已 sg；不能照抄成可微训练 loss。§4.3 式 (17) 给出带 `grad log PS` 的梯度模板，课程只据其描述信号分工，不宣称复现作者完整实现或普适“无泄漏”保证。
- [Lightning OPD §3.2](https://arxiv.org/html/2604.13010#S3.SS2)：核对两阶段数据生成者、预计算教师 log-prob、固定 SFT 模型 rollout 和 teacher consistency；未把其理论最优点结论无条件扩展到任意离线缓存。
- [Purified OPSD §3](https://arxiv.org/html/2607.02234#S3)：`Delta=log pi_T−log pi_ref-only`，`P_PMI ∝ P0 exp(Delta/beta)`，实际先中心化再 tanh 裁剪，三种冻结 base 上下文及 JSD。其“可迁移”解释与实验仍有条件，不当作完全去除捷径的定理。
- [H²SD §4](https://arxiv.org/html/2607.18955#S4)：成功样本用已验证学生回答加改写指令，仅评分原 token；失败样本用 hint 条件教师做 reverse KL。强模型可离线生成自然语言 hint，不直接承担词表教师；因此不应笼统宣传没有外部监督成本。
- [Rethinking OPSD §2、§3.3、§4](https://arxiv.org/html/2607.05184#S4)：核对 4096 训练长度与 38912 评估、长预算对照及 fork/marker 分析。该文明确诊断不确立准确率下降的因果解释，课程现用“可能”及特定设置边界，应保留。avg@16 不等于 pass@16。

## 固定上游覆盖与剩余工作

此前临时快照已不在磁盘，本轮重新克隆到 `/Users/bytedance/.cache/ml-roadmap/agentic-rl-analysis` 并 detached checkout 同一 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`，未切换来源版本。已重新完整读取上游 `1.2-rlhf-rlvr.md`、`1.3-dpo.md`、`1.4-ppo.md`、`1.5-grpo.md`、`1.6-dapo.md`，确认课程 16–18 的内容落点；上游把 GRPO 写成必然 RM-free、RLVR 零噪声以及 PPO 导数漏 ratio 等说法未被重新带入课程。工业材料与其他 32 份文档留待后两批和全局核查，不能据映射关键词测试宣称已全量阅读。

13–19 未补足前批发现的学习率调度、top-k/top-p 或投机解码；其中 top-k/top-p 的实际采样分布已经直接关系到 16 的支持集条件，应作为全局主线缺口继续判定。19 的纯比较层前沿方案没有承诺完整复现，不能用“没写每个算法完整训练代码”作为遗漏标准。
