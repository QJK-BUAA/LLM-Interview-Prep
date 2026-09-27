# Advanced Policy Optimization and Data Engineering Evidence

核验日期：2026-09-27。范围：第 20、21 章。来源综述不是算法定义的最终依据。
上游仓库：https://github.com/xavierzhang2002/agentic-rl-analysis
固定提交：`66ae4423b36270ef50a288fb1bb2e1b31c46c329`。
本地检出：`/tmp/agentic-rl-analysis-66ae4423`，已用 `git rev-parse HEAD` 核对。

## 阅读与覆盖

已完整阅读 `docs/post-training/ch1/` 的全部 12 篇文档，以及
`docs/post-training/ch2/2.9-data-engineering.md`，不是只读取目录或摘要。
第 20 章主覆盖 1.7-1.10，承接 1.4-1.6，并校正 1.11-1.12 的比较与演进叙述；
第 21 章主覆盖 2.9。1.1-1.3 的基础内容由前置章节承担。

| 上游文件（相对仓库根目录） | SHA-256 |
| --- | --- |
| docs/post-training/ch1/1.1-training-landscape.md | fef93084b7027d3d1d1860e4a2df4b1021792ab88b46dee891ceda96e4b13574 |
| docs/post-training/ch1/1.2-rlhf-rlvr.md | 49eeeca76182a11bdb6f1b7d1af02d8b14fb54d287c73eecab45f934643ec0a2 |
| docs/post-training/ch1/1.3-dpo.md | 30b8f3b35c70c824fc4e137f21230f4fb2ac8c68b43e23ddb4120380a69d25e0 |
| docs/post-training/ch1/1.4-ppo.md | 63905bfbafd1f390cc26ed288fa1b7de88f9a05f0567572f011bd03f29d7725e |
| docs/post-training/ch1/1.5-grpo.md | f2dfd3590652645524cae6180b78ca975c3ed004538ee812f63ed473e94313ee |
| docs/post-training/ch1/1.6-dapo.md | de5dfd6d4eede2f6489bca48c066c5e6f81c890f98dce0555b77769f4438f218 |
| docs/post-training/ch1/1.7-vapo.md | a2488346dc94ff4fca8a392658d62f51ff0c89576980eb9c7089a1294e2cc0bb |
| docs/post-training/ch1/1.8-cispo.md | 94bd69cee33b61c04aef4ea29be0262a1705d9143d2751101f9fdaad35d5f046 |
| docs/post-training/ch1/1.9-gspo.md | ee23aa3706fe589ad7664dcffb131747ff7a88aee41a5062879fee004073e7ad |
| docs/post-training/ch1/1.10-sapo.md | d3a391eb1872870fb0487fdff192a5b57f4a6e2861c2fa4085b8c1effaa1b46f |
| docs/post-training/ch1/1.11-cheatsheet.md | b17340d257191085baf010973cbc97b03d9dd7da4c4f20620ec7e5bacaaffbf9 |
| docs/post-training/ch1/1.12-evolution.md | 736d6be6c08463d60cbe196eec2bb8a69100e15eb3b6f4173fbdf17309c5bad4 |
| docs/post-training/ch2/2.9-data-engineering.md | a9964b30d98183a171e7b30597c788eb711767c9e30f3ea92c07f2d2fbb48c5b |

## 算法核验

以下引文是定位用的短摘录；公式结论由所列原文和直接求导共同支持。
访问 arXiv HTML 时使用 MathML `alttext` 核对公式，避免纯文本抽取丢失因子。

| 方法与已验证 URL | 原文定位与短摘录 | 采用的结论及校正 |
| --- | --- | --- |
| PPO: https://arxiv.org/abs/1707.06347 | 摘要：“multiple epochs of minibatch updates” | PPO 是 clipped surrogate，不是严格保证参数留在某个信任域。正优势仅在 ratio 超上界时截断；负优势仅在 ratio 低于下界时截断。对 log probability 求导需乘 ratio。 |
| GAE: https://arxiv.org/abs/1506.02438 | 摘要：“an exponentially-weighted estimator of the advantage function” | 定义 TD residual、折扣和 lambda；低 lambda 的 bootstrap 偏差与方差必须同时讨论。 |
| GRPO: https://arxiv.org/html/2402.03300 | Outcome Supervision：“A reward model is then used to score the outputs” | 去 critic 不等于去 RM；原始 DeepSeekMath 明确使用 RM，也讨论过程监督。奖励来源与优势估计器是独立选择。 |
| DAPO: https://arxiv.org/abs/2503.14476 | 摘要：“Decoupled Clip and Dynamic sAmpling Policy Optimization” | 采用正式缩写展开；Clip-Higher、动态采样、token loss、超长处理是一组设计，不是后续方法都必须继承的完整套餐。 |
| VC-PPO: https://arxiv.org/abs/2503.01491 | 摘要：“GAE computation is decoupled between the actor and critic” | Value pretraining 和 decoupled GAE 已由 VC-PPO 提出，不能都写成 VAPO 原创。 |
| VAPO: https://arxiv.org/html/2504.05118v1#S4 | §4.1：“Both of these two techniques draw upon methodologies previously introduced in VC-PPO.” | 正式标题为 *VAPO: Efficient and Reliable Reinforcement Learning for Advanced Reasoning Tasks*。固定 actor 生成 MC return 预热 critic；critic lambda=1；policy 使用 length-adaptive lambda。§4 Eq.4-5 为 `lambda=1-1/(alpha*l)`；§4.3 Eq.9-10 为正样本 token NLL 加到 policy loss。§5.1 的 50 步、alpha=0.05、mu=0.1 是该实验配置，不是通用最佳值。 |
| CISPO: https://arxiv.org/html/2506.13585v1#S3.SS1 | §3.1：“we instead clip the importance sampling weight” | 原报告标题为 *MiniMax-M1: Scaling Test-Time Compute Efficiently with Lightning Attention*。Eq.4-5 是 detached **token** ratio 权重乘 advantage 与 log probability。实验未施加有效下界；裁剪权重引入偏差。不能写成 sequence ratio，也不能保证零 advantage、mask 或数值饱和时仍有梯度。 |
| GSPO: https://arxiv.org/html/2507.18071v2#S4 | §4.1：“we adopt length normalization” | Eq.7 是 `exp(mean(log r_t))`，不是算术均值，也不是未归一化的整条轨迹 likelihood ratio。Eq.10 的单 token 梯度系数为 `s*A/T`。论文自身关于 token IS 的批评不可扩写为“一个样本不满足 IS 定义”。 |
| SAPO: https://arxiv.org/html/2511.20347v1#S3 | §3：“larger values produce faster decay” | Eq.5-6 给出 `f(r)=4/tau*sigmoid(tau*(r-1))`。直接求导得到 `f'(r)=4p(1-p)`，对 log probability 的系数是 **`A*r*4p(1-p)`**；展示版本 Eq.7 省略了 A，不能照抄，§4 Eq.15/22 又保留 A。温度随 advantage 符号选取；较大负优势温度是论文设计而非普适最优值。 |
| SAPO 条件近似: https://arxiv.org/html/2511.20347v1#S4.SS1 | §4.1：A1 small-step；A2 low intra-sequence dispersion | 平均 token gate 与 sequence gate 接近是有条件的 Taylor 近似，不是精确等于 GSPO。平均 gate 的误差界本身也不保证任意 token 梯度向量加权和相等。 |
| R3: https://arxiv.org/html/2510.11370v1#S4 | §4.1：“while still applying the softmax to the training logits to preserve gradient flow” | R3 重放 rollout 的专家选择 mask，但仍由训练 logits 计算 gate 权重。§2 明确与 GRPO、GSPO、DAPO 正交兼容；不能说 GSPO 淘汰 replay，也不能说 replay 必然冻结全部 router 梯度。对齐专家选择不等于消除所有数值误差。 |
| R2/R3 工程命名: https://raw.githubusercontent.com/volcengine/verl/main/examples/router_replay/README.md | 官方 README：“R3 mode requires the rollout backend to support returning router selection results.” | R2 是训练侧记录/重放；R3 额外捕获 rollout 侧路由。此为访问日的可变官方实现文档，配置路径应按使用版本复核，不写成跨框架标准。 |
| Dr.GRPO: https://arxiv.org/abs/2503.20783 | 摘要：“artificially increases response length” | 对特定归一化导致的优化偏差做修正，不声称所有 critic-free 估计器完全无偏。 |
| REINFORCE++: https://arxiv.org/abs/2501.03262 | 摘要：“Global Advantage Normalization” | 跨 batch 归一化与组内归一化不同；原文的偏差消失讨论有大 batch 条件，不移除全部有限样本偏差。 |
| PRIME: https://arxiv.org/abs/2502.01456 | 摘要：“online PRM updates using only policy rollouts and outcome labels” | 用隐式过程奖励在线更新 PRM，作用于反馈与信用分配，不是新 clipping。上游 15.1% 不脱离模型、任务及基线复述。 |

### 直接数学纠错

- 令 `J=min(r*A,clip(r,l,u)*A)`。除边界外，`dJ/dr=M*A`，
  但 `dJ/dlog(pi)=M*A*r`。上游 1.5 的二值 mask 梯度漏掉 `r`。
- CISPO 对 clipped weight 做 stop-gradient；若漏掉 detach，会出现权重
  对参数求导的额外项。比较时保持 advantage、old logprob 和 mask 冻结。
- GSPO 的长度归一化是稳定化 surrogate 设计，不是标准 IS 恒等式中的原始权重。
  MoE 换专家不自动破坏输出 token 分布的共同支撑；真正要检查行为概率记录、
  top-k/top-p 截断、训练重算差异与数值一致性。
- `Var(mean(z_t)) = sum(Cov(z_t,z_u))/T^2`。只有特定独立/弱相关且有界方差条件，
  才能谈均值噪声随长度衰减；不能从几何平均推出路由噪声必按 `1/sqrt(T)` 消失。
- SAPO gate 对 ratio 偏离 1 的距离有对称形式，但 log-policy 完整系数还有 `r`，
  在可取范围 `r>0` 上不能说两侧更新强度对称，更不能保证数值梯度永不为零。
- VAPO 的 MC target 在终止 episode、正确终端边界下避免 bootstrap；
  截断 trajectory 需要单独处理 bootstrap，不能宣称 lambda=1 消除一切估计误差。
  原 HTML §4.1 对 explained variance “sufficiently low” 的措辞不作为指标方向依据：
  通常希望 value MSE 下降、explained variance 提升。

## 数据方法核验

| 方法与已验证 URL | 短摘录 / 定位 | 章节采用的机制与证据边界 |
| --- | --- | --- |
| Self-Instruct: https://arxiv.org/abs/2212.10560 | “filters invalid or similar ones” | 生成 instruction/input/output 后过滤无效和相似样本，再微调；不是只造问题或完全不需种子。 |
| Evol-Instruct / WizardLM: https://arxiv.org/abs/2304.12244 | “rewrite them step by step into more complex instructions” | 逐步增加复杂度并混合不同轮次；上游把技能数、数据规模混写，不沿用“29K”判断。 |
| OSS-Instruct / Magicoder: https://arxiv.org/abs/2312.02120 | “open-source code snippets to generate diverse instruction data” | 用真实代码片段锚定任务生成；不是复制源代码即得到正确标注。需许可证、去污染和验证。 |
| SelfCodeAlign: https://arxiv.org/abs/2410.24198 | “extracts diverse coding concepts from high-quality seed snippets” | 概念提取、任务生成、多答案加测例、沙箱验证、保留通过样本；同一基座参与合成，不要求更强教师。 |
| Instruct-SkillMix: https://arxiv.org/abs/2408.14774 | “a randomly chosen pair of these skills” | 提取技能再组合，增加覆盖与组合难度；本文简称 SkillMix 时专指该 instruction-tuning 方法，不混同其他同名评测。 |
| CodecLM: https://arxiv.org/html/2404.05875 | “encode seed instructions into metadata” | 目标用例/技能元数据解码合成，Self-Rubrics 控复杂度；Contrastive Filtering 利用目标模型与强模型的回答质量差异，不是单纯 embedding 去重。 |
| SWE-smith: https://arxiv.org/html/2504.21798v1 | §2：“only keep patches that break one or more existing, passing tests” | 真仓库环境中通过 LM 修改、AST 变异、组合补丁生成缺陷并验证。缺陷任务生成与成功 agent 轨迹采集是两个步骤；任务不自动等于可用 SFT。 |
| Sol-Ver: https://arxiv.org/abs/2502.14948 | “jointly improves a single model's code and test generation capacity” | 同模型 solver/verifier 迭代生成代码和测试，不是独立正确性证明；关联错误仍需隐藏测例发现。 |
| GASP: https://arxiv.org/abs/2603.15957 | “grounding is provided by real-data goalpost questions” | 真实困难目标题锚定，先构造较易变体，再由易题向更难题靠近；不等于无真实数据、任意越难越好。 |
| STaR: https://arxiv.org/abs/2203.14465 | “generate a rationale given the correct answer” | 少量 rationale 示例加有答案题集；先尝试推理，失败后给正确答案做 rationalization，再用最终答对的理由微调。不是 challenger-solver 博弈，不是完全无外部监督。 |
| LSP: https://arxiv.org/html/2509.07414v3 | §3：“use a single model ... to instantiate the two players” | Challenger 出题、Solver 解题，共享模型可用不同提示实现；实用版本加入 reference-model quality self-reward 抑制无意义对抗。无额外 query 数据不等于无 pretrained model/RM，也不等于保证神经优化收敛。 |
| SGALM: https://arxiv.org/html/2602.01137v1 | Introduction：“a pre-trained LLM and a real dataset to align” | 正式名称 Self-Generative Adversarial LLM；同模型生成/判别，以真实数据作锚，判别 Real/Fake token 概率。无外部 RM 不等于无真实数据；GAN 理论依赖容量、优化等假设。 |
| FineWeb: https://arxiv.org/html/2406.17557 | Abstract：“deduplication and filtering strategies” | 预训练 Web 清洗与去重的可复现实验；FineWeb-Edu 教育质量筛选不是通用毒性/隐私认证，更不是后训练数据可直接替换的证明。 |
| Seed-Coder: https://arxiv.org/html/2506.03524v2 | §2.1：“advanced quality filters powered by LLMs” | 先去重和基本规则，再用 LLM 质量评分；§3.1.2-3 有 SFT 质量/难度过滤与沙箱自纠错；§4 有跨预训练/后训练 decontamination。 |
| DoReMi: https://arxiv.org/html/2305.10429 | §2：“minimizing the worst-case excess loss over domains” | 小 reference + proxy，通过 Group DRO 学域权重，再把平均权重用于目标模型数据重采样。不是拟合 scaling law，也不是只追最高原始 loss；原实验是预训练，迁移到 SFT/RL 须验证。 |
| pass@k: https://arxiv.org/html/2107.03374 | §2.1：“a problem is considered solved if any sample passes the unit tests” | `c/n` 是每题采样成功率；`1-C(n-c,k)/C(n,k)` 是从 n 个样本估计 k 次至少一次成功的统计量。不要把 2/8 成功写成 pass@8=25%。 |
| DeepSeek-R1: https://arxiv.org/html/2501.12948v1 | §2.3.3：“sample multiple responses and retain only the correct ones” | cold SFT、reasoning RL、RS 回灌结合通用数据再 SFT、全场景 RL；报告的该 pipeline 不证明所有模型必须回到 base 重训。 |
| Qwen3: https://arxiv.org/html/2505.09388v1 | Thinking Mode Fusion：“combines both the ‘thinking’ and ‘non-thinking’ data” | thinking 部分取 Stage 2 模型 RS；non-thinking 部分另行整理。上游“同一 query 两套答案均由 RL checkpoint 生成”过度具体，改为两个模式的数据混合和模板条件化。报告也讨论通用能力与难推理的取舍，不声称无损融合。 |

## 数据叙述纠错

1. **错误链接**：上游 Seed-Coder 的 `2506.02737` 实为天体物理研究
   （已打开 https://arxiv.org/abs/2506.02737 核对）；正确为 `2506.03524`。
2. **六类是获取路径，不是互斥算法类别**：人工种子、教师蒸馏、拒绝采样、
   指令合成、Agentic 合成、自博弈常相互组合。STaR 放在自改进讨论中，
   但与博弈方法区分；自博弈 rollout 进入 SFT 前仍需过滤和轨迹整理。
3. **SFT 不只教格式**：它也学习任务、工具协议与安全行为。少量 cold-start
   或某模型 RFT 前置负面结果，不支持“SFT 永远越少越好”。
4. **没有参数量阈值定律**：不采用上游“小模型蒸馏必最优”“大于 200B 必须 RL”
   和“蒸馏恒用十分之一 GPU”。目标模型起点、教师、数据、奖励、预算必须受控。
5. **RL 不要求参考答案字符串，但要求反馈依据**：数学答案验证依赖 gold，
   代码依赖测试/规格，交互任务依赖环境终态。不能写成“RL 数据无需答案”。
6. **success-rate 与 pass@k 分开**：课程难度是相对指定 checkpoint、温度、
   rollout 预算、verifier 的估计，不存在放诸所有任务的 20%-60% 最佳区间。
   全错题可能缺探索或反馈，不等于永久不可学。
7. **奖励来源不等于 critic**：MC return 是训练 critic 的 target，不是新的外部
   reward；self-critique 是判分机制，不必具有 value baseline 的语义。
8. **不排名验证器的固有星级**：不完整测试、答案解析错误、judge 偏差、
   同模型生成测例与答案的关联错误都可能导致 reward hacking。
9. **严格隔离评估**：HumanEval、AIME、SWE-bench 等名字不构成可直接拿评估题
   训练的授权。按数据划分、repo/题族、时间和来源隔离；合成后重新去污染。
10. **清洗与安全分离**：质量分数高不代表没有 PII、版权问题或危险内容；
    去重也不等于无污染，语义近重复和派生题需要额外审计。
11. **Mixture 先定计量单位**：按样本条数与按 response token 的混合不同。
    长短分阶段是可试的课程，不是“短长数据不能混合”的理论。
12. **飞轮有回退条件**：独立验证无提升、OOD/安全退化、成功轨迹重复增加、
    verifier 与隐藏评估分离时应暂停回灌，不称为必然螺旋上升。

## 本地验收约定

章节使用九种现有 section type、3-5 个 objectives、原生 DOM 图示数据和
`String.raw` 正文。代码围栏为 `~~~python`，例子只依赖 Python 标准库。
教学数值不引用榜单，不冒充论文消融结果。执行 `validateChapter` 时直接导入
两个 owned module，不依赖并行更新中的 catalog；额外检查中文长度、公式
KaTeX 渲染、代码执行、图链接和问答数量。共享引擎与全站浏览器验收由主执行者负责。

## 本地验收结果

2026-09-27 已完成以下隔离验收，不依赖 catalog 的并行集成状态。
中文字符统计仅计九个 section 的 body，不计标题、来源与 quiz 问答。

| 检查 | 第 20 章 | 第 21 章 |
| --- | --- | --- |
| `validateChapter` | 无错误 | 无错误 |
| 九种 section type / `String.raw` 正文 | 9 / 9 | 9 / 9 |
| Objectives / quiz 问答 | 4 / 6 | 4 / 6 |
| Body 中文字符 | 3676 | 5085 |
| 实际 renderer 生成的公式，KaTeX strict render | 90，全通过 | 39，全通过 |
| 图节点 / 有效并实际渲染的边 | 9 / 12 | 10 / 11 |
| Learn / interview 模式 section 数 | 9 / 4 | 9 / 4 |
| Python 标准库示例 | 1，退出码 0 | 1，退出码 0 |
| 正文覆盖关键词断言 | 16，通过 | 20，通过 |
| 来源 URL | 14，无重复 | 18，无重复 |

验证方式：Node 直接导入两个章节和 `content/schema.js`；从正文抽取
`~~~python` 围栏后通过 `spawnSync("python3", ["-c", code])` 执行；
调用现有 `renderChapter`，将其生成的所有 math placeholder 交给本地
`vendor/katex/katex.min.js` 的 `renderToString`，启用 `throwOnError: true`
与 `strict: "error"`。检查无剩余内部 placeholder token，以及 diagram 的
每条输入 link 都生成了实际 flow edge。本验收不是浏览器视觉或全站验收。

第 20 章数值输出：

```text
ratio/A/PPO/CISPO: 1.5 2 0.0 2.4
ratio/A/PPO/CISPO: 1.5 -2 -3.0 -2.4
ratio/A/PPO/CISPO: 0.5 2 1.0 1.6
ratio/A/PPO/CISPO: 0.5 -2 0.0 -1.6
GSPO token coefficients: 0.5, 0.5
terminal MC targets: [1.0, 1.0, 1.0]
all gradient and boundary checks passed
```

这些断言还覆盖 SAPO 正负优势有限差分、非法短序列 lambda、正样本为空时
NLL 为零。CISPO 使用明确标注的教学双侧权重，正文另外解释原报告的上侧裁剪。

第 21 章数值输出：

```text
success/pass@2/pass@8: 0.25 0.4642857142857143 1.0
accepted/rejected: 2 6
response token shares: {'math': 0.2, 'code': 0.8}
toy excess-loss weights: [0.3543, 0.6457]
```

断言包含全失败/全成功、无效计数、同源评估派生题、同题族、语义重叠、
精确重复、隐私失败和 verifier 失败。程序消费审计标记，不冒充自动隐私检测器
或完整语义去污染实现。

## 集成锚点

两个章节都使用标准 section ID：
`intuition`, `example`, `diagram`, `derivation`, `code`, `pitfall`,
`comparison`, `interview`, `quiz`。建议 coverage 指向实质正文而不是 sources：

| 上游范围 | Chapter / section | 可直接用于覆盖断言的正文词 |
| --- | --- | --- |
| 1.7 VAPO | 20 / derivation | VAPO、Decoupled GAE、length-adaptive GAE、NLL |
| 1.8 CISPO | 20 / derivation | CISPO、stop-gradient、TOKEN |
| 1.9 GSPO | 20 / derivation | GSPO、SEQUENCE、surrogate |
| 1.10 SAPO | 20 / derivation | SAPO、sigmoid、链式法则 |
| 1.9-1.12 的 MoE 叙述 | 20 / pitfall | MoE、R2、R3、Routing Replay |
| 1.11-1.12 方法比较 | 20 / comparison | Dr.GRPO、REINFORCE++、PRIME |
| 2.9 六类获取及次级方法 | 21 / intuition | Self-Instruct、CodecLM、SWE-smith、STaR、GASP、LSP、SGALM |
| 2.9 指标与混合 | 21 / derivation | pass@k、DoReMi、excess loss |
| 2.9 清洗与污染 | 21 / pitfall | FineWeb、Seed-Coder、PII |
| 2.9 RL 三轴与回灌 | 21 / comparison | Query、奖励信号构建、环境与测例构建、Thinking Mode Fusion |

上述 37 个 section 内关键词已逐个做精确匹配断言，全部通过。
三个 owned 文件均已检查尾随空白、末尾换行及 diff 空白错误；
新建未跟踪文件另用 `git diff --no-index --check /dev/null <file>` 核查。

本 worker 仅修改 `content/chapter-20.js`、`content/chapter-21.js` 和本 ledger；
未修改共享 catalog、schema、renderer、manifest 或测试文件，未创建 commit。
