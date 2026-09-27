# 工业后训练案例证据与勘误

核验日期：2026-09-27。适用范围：`content/chapter-22.js`、`content/chapter-23.js`。

二级来源为 [agentic-rl-analysis](https://github.com/xavierzhang2002/agentic-rl-analysis/tree/66ae4423b36270ef50a288fb1bb2e1b31c46c329)，本地核对 HEAD 为 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`。以下八篇已逐篇阅读全文；原始报告通过 arXiv HTML 正文核对相关段落、公式和表格，官方发布材料单独标记。摘录为短引文，不是对整个训练过程的独立复现。

## 阅读清单

路径均相对于上游根目录：

| 文档 | SHA-256 | 本次正文落点 |
| --- | --- | --- |
| `docs/post-training/ch2/2.1-deepseek.md` | `d636e2c2152e0ec8230863a743db2d2a8cfdf556e2bd8eda8c11893a7d9731be` | 22 intuition、diagram、comparison |
| `docs/post-training/ch2/2.2-kimi.md` | `84f6af46e6339a9228db168a771e1c2ef2f082c30f803eb34ec541687a8a1473` | 23 intuition、example、derivation |
| `docs/post-training/ch2/2.3-qwen.md` | `f6870fb710c6d18fefa8623311285f47a438c7193a2c83b95f20dd40891f248f` | 22 intuition、example、comparison |
| `docs/post-training/ch2/2.4-minimax.md` | `876f5e2a700d2c1f38313d16209429b0f2b41b09e5c1b74b98c4738df4c940c9` | 23 intuition、derivation、comparison |
| `docs/post-training/ch2/2.5-glm.md` | `82c3b1fed31e4775b6a327cf3ccc37508b3f0bc5ce3666e2180a151323c0b6a2` | 23 diagram、derivation、pitfall |
| `docs/post-training/ch2/2.6-seed.md` | `409b7aad42b38f9e994f65e48e81b9d0d90dbe61fb2cda80064077ea1c611910` | 22 intuition、derivation、comparison |
| `docs/post-training/ch2/2.7-closed-source.md` | `b68a9ce5697633d0e7910699475fa0b5321d17f39f3455917beca4f61265c7a4` | 23 comparison、pitfall |
| `docs/post-training/ch2/2.10-agentic-training.md` | `261a8b05ae26fb3a93f8d51b185c198d5ea9fcd4429cd3ff2db93c52ae91b70b` | 23 diagram、code、interview |

这些是本工作单元的覆盖说明，不替代主集成任务维护的全仓来源清单。第 28 章负责更完整的环境合成、异步系统和工程推导。

## 证据使用规则

- **报告结果**：只能表述为作者在指定 checkpoint、数据、推理预算及评测协议下报告的结果。
- **原论文定义**：保留裁剪对象、采样分布、stop-gradient 和归一化单位，不能只照抄缩写。
- **官方博客／模型卡**：可核验公开功能、定位和公开结果；公开信息有限，不补猜未披露的奖励权重、算法或阶段。
- **教学例子**：本项目的虚构数字、成本分解和诊断顺序，显式标为教学，不作为工业实测。
- **作者观点**：上游的“复兴”“必需品”“未饱和”“自进化”等解释，降级为有条件的观察或待验证假设。
- 原始报告的无版本 URL 可能指向更新稿；本章不混用不同版本的同名实验。涉及易变结果时注明表格、模型及协议。新增文献只用于校正指定模型，不扩展到未分配的新模型系列。

## 第 22 章证据

### E22-01 DeepSeek-R1：纯 RL 的起点与多阶段训练

来源：[DeepSeek-R1](https://arxiv.org/html/2501.12948)，R1-Zero、训练流程、蒸馏和附录结果。

> “we collect thousands of cold-start data”
>
> “Subsequently, we apply rejection sampling and SFT once more.”

采用：R1-Zero 从已预训练的 V3-Base 开始，不是从随机权重“零知识学推理”。R1 采用冷启动 SFT、推理 RL、拒绝采样与混合 SFT、第二次 RL；规则反馈用于可验证推理，通用任务另需偏好／安全反馈。蒸馏小模型使用约 800k 样本进行 SFT，不等于每个学生都从头训练大规模 RL。

结果口径：报告比较表的 R1 在 AIME 2024 pass@1 为 79.8；V3 为 39.2，不能把后者标成 V3-Base。不同稿件的 R1-Zero 数字不同，本章不重复上游的 71.0。推理行为观察不是“RL 创造任意新知识”的证明。PRM、MCTS 的负面探索也不是所有任务上的不可能性结论。

### E22-02 DeepSeek-V3：专家蒸馏与成本归属

来源：[V3 报告](https://arxiv.org/html/2412.19437)，Table 1、Post-Training、Table 9。

> “we begin by developing an expert model tailored to a specific domain”
>
> “excluding the costs associated with prior research and ablation experiments”

采用：V3 已使用经 SFT+RL 培养的领域专家生成数据，同时平衡准确率和输出长度；不能称其“只有单一 R1 教师、没有专家训练”。整体后训练含 SFT、GRPO、规则与模型奖励。

Table 1：预训练 2,664K、上下文扩展 119K、后训练 5K、合计 2,788K H800 GPU-hours；按每 GPU-hour 2 美元，分别为 5.328M、0.238M、0.010M、5.576M 美元。5.576M 是 V3 正式训练合计，不是 R1 RL 成本，也不包含全部研发成本。后训练占合计约 0.179%，占预训练约 0.188%，分母不能交换。

Table 9 是 **V2.5 底座上的蒸馏消融**：MATH-500 pass@1 从 74.6 到 83.2，平均输出长度从 769 到 1510；不能写成 V3 自身的随机对照。

### E22-03 DeepSeek-V3.2：主流程与 Speciale 分支

来源：[DeepSeek-V3.2: Pushing the Frontier of Open Large Language Models](https://arxiv.org/html/2512.02556)，Post-Training、Tables 3–4。

> “includes specialist distillation and mixed RL training”
>
> “trained exclusively on reasoning data with a reduced length penalty during RL”

采用：主流程为 specialist distillation → mixed RL。八类领域包括写作、通用问答和六个推理／Agent 专项，专家产出训练数据，不等同于把专家参数直接平均。Speciale 是偏向长推理的实验变体，不能画成通用 V3.2 必经第三阶段。

报告称后训练计算预算超过预训练成本的 10%，这是该报告口径下的观察，不证明普遍投资回报。Table 3 中 AIME 2025 pass@1：V3.2 Thinking 为 93.1、平均输出 16k token；Speciale 为 96.0、23k token。Table 4 的 IMO 35/42、IOI 等竞赛结果归属 **Speciale**，不能搬给通用版本；也不能将 AIME 2024 的 39.2 与 AIME 2025 的 93.1 当作同一测试集上的提升。

### E22-04 V3.2：概率、路由与采样支持集

来源：[同报告 RL 稳定化部分](https://arxiv.org/html/2512.02556)。

> “preserve the expert routing paths used during sampling”
>
> “ensuring both policies share identical action subspaces”

采用：Keep Routing 复用采样路径；Keep Sampling Mask 保留 top-p/top-k 截断掩码；另外有修正 K3 KL 估计以及负优势高偏移序列过滤。重要性采样还需要检查行为分布支持集。不能写“换成 GSPO 后路由一致性自然解决”，也不将数学域弱 KL 的经验推广到所有通用领域。

### E22-05 Qwen2.5：在线／离线反馈分工

来源：[Qwen2.5 Technical Report](https://arxiv.org/html/2412.15115)，Post-training、Long-context Training。

> “including offline learning DPO and online learning GRPO”
>
> “queries with higher variance in response scores are prioritized”

采用：超过百万 SFT 样本，约 150k 离线 DPO 偏好对，在线 GRPO 依据奖励方差排序查询。报告列举 truthfulness、helpfulness、conciseness、relevance、harmlessness、debiasing 六类标注标准，但不足以断言其 RM 是六个独立输出头。长上下文预训练、SFT 和 Turbo 专门配方要区别；不能把整个系列统一画成“GRPO 之后再做 128K 微调”的固定四阶段。

### E22-06 Qwen3：少量查询不等于少量总计算

来源：[Qwen3 Technical Report](https://arxiv.org/html/2505.09388)，Reasoning RL、Thinking Mode Fusion、Strong-to-Weak Distillation。

> “a total of 3,995 query-verifier pairs”
>
> “increases from 70.1 to 85.1 over a total of 170 RL training steps”

采用：该结果属于 Qwen3-235B-A22B 的 reasoning RL 阶段、AIME 2024；不是最终模型 AIME 2025 的 81.5。查询可反复采样，大 batch、多 rollout 和多次更新都有成本。

四阶段为长 CoT 冷启动、推理 RL、模式融合 SFT、通用 RL。模式融合支持 thinking/non-thinking 以及中断思考后的回答；报告明确使用用户预算和 stop-thinking 指令，不能写成“完全没有显式长度控制”。小模型 strong-to-weak 包含 off-policy 输出蒸馏及 on-policy 教师分布监督；约 1/10 GPU-hours 是报告相对完整四阶段方法的设置，不是通用成本定律。

### E22-07 Qwen3.5：公开发布信息边界

来源：[官方发布原文](https://qwen.ai/blog?id=qwen3.5)、[Alibaba 官方转载](https://www.alibabacloud.com/blog/qwen3-5-towards-native-multimodal-agents_602894)，2026-02。

> “fuses linear attention (via Gated Delta Networks) with a sparse mixture-of-experts”

采用：首发 Qwen3.5-397B-A17B 是原生视觉语言模型，线性注意力与稀疏 MoE 结合；官方披露多模态、多轮 Agent RL 的扩展方向。**本章该部分依据官方博客，公开信息有限**，不据架构反推其必然采用 GSPO、SAPO、某种 critic 或指定超参数，也不把托管 Plus 的窗口配置套给所有开权重模型。

### E22-08 GSPO／SAPO：正式名称与经验边界

来源：[Group Sequence Policy Optimization](https://arxiv.org/html/2507.18071)、[Soft Adaptive Policy Optimization](https://arxiv.org/html/2511.20347)。

> GSPO: “defines the importance ratio based on sequence likelihood”
>
> SAPO: “While all methods may ultimately exhibit signs of instability”

修正上游 Group Sampling／Smooth Adaptive 的标题。GSPO 用长度归一化序列似然比，不是原始整序列 IS 乘积；SAPO 用温度控制的平滑门控，并报告用于 Qwen3-VL。SAPO 在特定小步长／低离散条件下近似序列一致，不是无条件包含 GSPO 的定理。不能把这两篇论文追认成所有 Qwen3 或 Qwen3.5 checkpoint 的固定配方，也不采纳“单样本 IS 数学上必然无效”的无条件解释。

### E22-09 DAPO：正式名称与长序列修复

来源：[DAPO: An Open-Source LLM Reinforcement Learning System at Scale](https://arxiv.org/html/2503.14476)，摘要、四项技术和评测配置。

> “Decoupled Clip and Dynamic sAmpling Policy Optimization”
>
> “achieves 50 points on AIME 2024 using Qwen2.5-32B base model”

采用：Clip-Higher、Dynamic Sampling、token-level policy gradient loss、overlong reward shaping。评测为重复 AIME 32 次的 avg@32，温度 1.0、top-p 0.7。全同奖励组的相对优势为零只意味着对应组相对奖励项无信号，不是所有正则项梯度都为零。软长度惩罚叠加正确性奖励，不是验证器确认“截断答案部分正确”。

### E22-10 VAPO：价值模型不是奖励模型

来源：[VAPO: Efficient and Reliable Reinforcement Learning for Advanced Reasoning Tasks](https://arxiv.org/html/2504.05118)，摘要、Value-Pretraining、Decoupled-GAE。

> “Value-model-based Augmented Proximal Policy Optimization”
>
> “the reward model shares a mismatched objective with the value model”

采用：冻结初始策略采样，用 Monte Carlo return 校准 critic；分离价值目标与策略优势的 GAE，结合 length-adaptive GAE、正例 NLL、组采样和 DAPO 技术。当前报告摘要为 Qwen2.5-32B、AIME 2024 60.4；正文常简写 60。该实验未用 SFT，不证明所有规模 actor-critic 都更好。额外 critic 的计算、优化器状态、激活和通信需分别测量，不使用“固定多 25% 显存”或通用 actor-critic FLOPs 倍数。

### E22-11 Seed1.5-Thinking：最终模型与消融模型不可混淆

来源：[Seed1.5-Thinking](https://arxiv.org/html/2504.13914)，训练配方、Tables 3–4。

> “Seed-150B-MoE results are ablation-only with limited steps.”

采用：最终模型 200B 总参数／20B 激活，报告 AIME 2024 为 86.7；verifier、thinking verifier、通用 pairwise generative RM 分工，动态数据分布和流式 rollout 配合价值模型校准。

纠正：算法排名消融的 Seed-150B-MoE 为 DAPO 73%、VAPO 79%，不是在最终 200B 模型上比较约 80 与 86–90。RFT 消融 AIME avg@32 为 58% 对 54%，只说明该初始化条件下提前饱和；报告本身的冷启动数据构造使用了 rejection sampling，不能得出“拒绝采样一律有害”。

### E22-12 Seed-Coder：不是 VAPO 的代码验证

来源：[Seed-Coder: Let the Code Model Curate Data for Itself](https://arxiv.org/html/2506.03524)，模型总览、LongCoT RL。

> “we used the open-source verl framework for GRPO training”
>
> “adopted optimization techniques similar to DAPO”

采用：8B Base／Instruct／Reasoning 三种模型；模型主导的代码打分筛选仍结合去重、语法过滤；Instruct 为 SFT+DPO，Reasoning 为长 CoT GRPO 加 DAPO 类优化。报告明确提到提高上裁剪、过滤超长、token-wise loss、移除 KL 项。上游“验证 VAPO 框架”的归因错误。

### E22-13 Seed2.0：发布时间与后续模型卡

来源：[2026-02-14 官方发布](https://seed.bytedance.com/en/blog/seed-2-0-official-launch)、[Seed2.0 Model Card](https://arxiv.org/abs/2607.00248v1)，arXiv 提交日期 2026-06-30。

> “Pro, Lite, and Mini, along with a dedicated Code model”
>
> “two persistent challenges, long-tail knowledge and complex instruction following”

采用：通用 Agent 与 Code 产品定位，复杂指令、多模态和长程任务评测。上游“无公开论文”是旧时间点信息，不能作为 2026-09 的现状；已有模型卡不代表公开了可复现的完整后训练方案。模型卡 HTML 返回 404，本次核对官方发布和 arXiv 元数据／摘要，不借此声称通读 PDF 或核实隐藏训练细节。不猜测沿用 VAPO，不使用未核实的 98.3 榜单数字。

## 第 23 章证据

### E23-01 Kimi K1.5：Partial Rollout 与 long2short

来源：[Kimi k1.5: Scaling Reinforcement Learning with LLMs](https://arxiv.org/html/2501.12599)，训练算法、系统和 long2short 实验。

> “a variant of online policy mirror descent”
>
> “the unfinished portion is saved to the replay buffer and continued in the next iteration”

采用：长上下文 RL、结果反馈及 CoT RM，不使用独立 value 网络不等于没有模型判分。Partial Rollout 保存未完成轨迹，复用旧片段，只有当前片段是当前迭代生成，需处理片段掩码和旧策略版本。long2short 比较模型合并、最短正确拒绝采样、DPO、带长度惩罚的 RL。

结果：k1.5-short w/ RL 在 AIME 2024、8 次运行平均 pass@1 为 60.8、平均 3,272 token；长 CoT 报告为 77.5。它是准确率与预算权衡，不是“越短越好”。

### E23-02 Kimi K2：MuonClip 裁剪的信号

来源：[Kimi K2: Open Agentic Intelligence](https://arxiv.org/html/2507.20534)，MuonClip／QK-Clip。

> “rescaling the query and key projection weights post-update to bound the growth of attention logits”
>
> “maximum input to softmax in this batch”

纠正：逐注意力头观察当前 batch 的最大 attention logit，据阈值缩放 Q/K 投影；不是检查 Q/K 谱范数超过阈值。MHA 和 MLA 的实际缩放部件不同，不能把简化公式直接当 MLA 实现。报告 15.5T 预训练 token 无 loss spike 是该次运行结果，MuonClip 是预训练优化器设计，不是 RL 的概率比裁剪。

### E23-03 Kimi K2：工具合成与 self-critique

来源：[同报告 Agentic Data Synthesis、General RL](https://arxiv.org/html/2507.20534)。

> “Each task is paired with an explicit rubric”
>
> “we curated a mixture of open-source and in-house preference datasets”

采用：工具／领域规格 → Agent 与任务 rubric → 有状态工具模拟、轨迹生成与 judge 过滤；RL 混合真实与合成环境。Self-Critique Rubric Reward 有 SFT 初始化的 judge 能力和偏好数据，不能宣称“完全无 RM、无人工监督”。这里的 critic 执行成对偏好判断，不应与 PPO 的状态价值 critic 混写。

### E23-04 Kimi K2.5：模态迁移与 PARL

来源：[Kimi K2.5: Visual Agentic Intelligence](https://arxiv.org/html/2602.02276)，Table 1、Zero-Vision SFT、Agent Swarm、Toggle。

> “varying the vision ratio and vision injection timing”
>
> “only the orchestrator is updated via reinforcement learning”

纠正：early fusion 的消融改变的是视觉数据进入预训练的**时间与比例**，不是视觉 embedding 在浅层／深层注入。Zero-Vision SFT 不用视觉 SFT 样本，但已有图文联合预训练，后续还有视觉 RL，绝不等于模型没见过图像。

采用：PARL 冻结子 Agent，将返回作为环境观察，只更新编排器；任务结果加探索并行和有效完成的辅助奖励，辅助项退火。报告 wide-search 场景最多 4.5 倍延迟改善，不是所有任务的加速。Toggle 的 25–30% token 降幅实验在 **K2 Thinking** 上评估，不能误写成所有 K2.5 请求的固定节省。

### E23-05 MiniMax-01：长上下文不是每阶段都长

来源：[MiniMax-01](https://arxiv.org/html/2501.08313)，Section 5、Table 7。

> “Stage V: Online Reinforcement Learning”
>
> “with a sequence length of 8,192 tokens”

采用：Text-01 的短 SFT、长 SFT、短 DPO、长 DPO、短 online RL 五阶段；长阶段长度为 1,032,192，短阶段 8,192。奖励维度为 correctness、truthfulness、helpfulness、harmlessness；Vision-01 另有多模态配方。混合 Lightning／softmax attention 降低长上下文成本，但并不保证每类长程检索任务无损。

### E23-06 MiniMax-M1：CISPO 不是 GSPO

来源：[MiniMax-M1: Scaling Test-Time Compute Efficiently with Lightning Attention](https://arxiv.org/html/2506.13585)，CISPO、Eq. 3–4。

> “clips importance sampling weights rather than token updates”
>
> “sg denotes the stop-gradient operation”

采用：token 级 ratio 经裁剪后 detach，乘 group-relative advantage 与当前 token log-prob。超过权重上界不意味着该 token 的 log-prob 梯度为零。正式缩写为 Clipped IS-weight Policy Optimization；上游“Clipped Importance-ratio Sequence”“几何平均序列裁剪”的描述错误。

报告对 Qwen2.5-32B 数学实验称达到 DAPO 表现只需约一半更新步数；不能推导成显存和 FLOPs 必然减半。M1 使用 7.5T CPT、冷启动 SFT、CISPO RL。Table 2 的 M1-80k AIME 2024 是 86.0，不能照抄上游 86.5。

### E23-07 M1：成本、精度与优化器

来源：[同报告摘要、RL Challenges](https://arxiv.org/html/2506.13585)。

> “full RL training on 512 H800 GPUs”
>
> “rental cost of just $534,700”
>
> “the majority of the gradients being smaller than 1e-14”

采用：该金额是 M1 的一次完整 RL 租赁估算，不含基座／CPT／全部研发，不能与 V3 正式训练合计直接比较。FP32 LM head 用于缓解实际观测的训推 kernel 概率偏差；不要声称 BF16 的指数范围无法区分 1e-7 与 1e-8。AdamW epsilon 调小是针对微小梯度被分母常数支配的现象，不是通用防 NaN 建议；超参数需重新测量。

### E23-08 M2／M2.5／M2.7：披露已更新

来源：[The MiniMax-M2 Series](https://arxiv.org/html/2605.26494v1)，2026-05-26，Sections 2、4–8。

> “229.9B total parameters with only 9.8B activated per token”
>
> “M2 adopts full multi-head attention across all layers”

采用：M2 系列已发表覆盖 M2、M2.5、M2.7 的公开报告，不能沿用上游“只有博客”的当前时态。报告包含 interleaved-thinking SFT、可验证工作区和产物反馈、CISPO、Forge、self-evolution。M2 的全注意力／GQA 不应继承为 01/M1 的 Lightning Attention。报告级机制可用于教学，仍不可凭家族名称推定每个 checkpoint 完全相同的数据比例及超参数。

补核 Section 8 与 Table 4，使用原始 HTML 结构化提取相应段落与表格：

> “M2.7 and M2.5 are evaluated with thinking enabled and the interleaved-thinking trajectory protocol”
>
> “the benchmarks where the M2.5 / M2.7 corpora introduced new task families”

采用：系列迭代引入深度搜索、工具使用与工作区任务族；在报告 Table 4 的共享脚手架／工具环境设置下，M2.5 → M2.7 的 Terminal-Bench 2.0 为 51.7 → 57.0，GDPval-AA 为 35.0 → 50.0，但 MMLU-Pro 为 85.2 → 81.8。因此不能将选定 Agent 子集的改善写成“所有能力单调提升”。默认生成温度 1.0、top-p 0.95，例外以报告评测设置为准；这些是作者结果，不是本项目独立复现，也不单独证明某一技术的因果收益。

### E23-09 Forge：Windowed FIFO 不是驱逐最长任务

来源：[2026-02 官方 Forge 博客](https://www.minimax.io/news/forge-scalable-agent-rl-framework-and-algorithm)、[M2 系列报告 Section 6.2](https://arxiv.org/html/2605.26494v1#S6.SS2)。

> “may only fetch completed trajectories within a sliding window”
>
> “the window advances only as head-of-window tasks are consumed”

纠正：窗口内可以优先提取已完成任务，窗口外保持顺序限制；不是“队列满就丢弃／替换最老未完成任务”。Prefix Tree Merging 共享相同前缀计算，依赖正确的分支 causal mask、位置与损失权重。报告最多 40 倍训练加速是特定冗余程度下的系统观察，不是端到端服务延迟、单请求价格或任意负载的固定比例。

复合奖励包括结果、过程、完成时间；reward-to-go 用来将将来的奖励归给先前动作，不是凭空获得每步因果真值。以产物测试与人工 rubric 校准反馈，避免为格式而格式、只追求短耗时。

### E23-10 M2.7：自我进化的权限与证据范围

来源：[2026-03-18 官方发布](https://www.minimax.io/news/minimax-m27-en)、[后续报告 Section 7.2](https://arxiv.org/html/2605.26494v1#S7.SS2)。

> “under the guidance set by researchers”
>
> “handling 30%-50% of the workflow”

采用：官方描述模型协助实验监控、日志诊断、脚手架修改和评测迭代。30–50% 是指定内部工作流自报比例；博客信息有限，不是全球研发工作替代率，也不是模型无需人类约束便能修改生产权重的证据。后续报告补充方法，不消除独立复现和保留集验证的需要。

### E23-11 GLM-5：思考模式、数据与异步训练

来源：[GLM-5: from Vibe Coding to Agentic Engineering](https://arxiv.org/html/2602.15763)，Sections 3–4。

> “the model thinks before every response and tool call”
>
> “consumes the exact tokenization and decoded-token stream produced by the inference engine”

采用：SFT → reasoning RL → agentic RL → general RL，最后以跨阶段蒸馏缓解能力回退。Interleaved、preserved、turn-level 分别控制调用前思考、历史保留与逐轮开关。TITO 保存实际 token ID、边界和元数据，防止文本往返重分词破坏动作对齐；不保证整个训练系统从此一致。

数据：SWE 的真实 issue／修复／测试，Terminal 的环境与脚本，Search 的网页图和多跳问题。异步 slime 将训练和推理解耦，使用 rollout log-prob、双边 token masking、版本 freshness 控制；并非天然 on-policy。

### E23-12 GLM-5：IcePop、top-k 与蒸馏勘误

来源：[同报告 Reasoning RL、Cross-Stage Distillation、Agentic RL](https://arxiv.org/html/2602.15763)。

> “we remove the KL regularization term”
>
> “accompanied by a sharp drop in entropy”
>
> “the group size in the GRPO algorithm is configured to 1”

纠正：IcePop 处理 train/infer 分布不匹配，不是普通 KL 惩罚的别名。报告中的非确定性 DSA top-k 故障伴随熵**下降**，上游另处写“激增”不一致；采用报告描述。作者在所测栈使用 torch.topk 并冻结 indexer，不应声称 PyTorch topk 在所有设备、并列输入、版本下保证确定性。

跨阶段蒸馏的 token 优势是 `sg[log(pi_teacher_infer / pi_student_train)]`，不是两个终局标量分数相减。group=1 可行是因为教师分布提供信号，不靠组内均值。它缓解遗忘，不保证“同时恢复一切能力”。

Table 7：SWE-bench Verified 为 77.8；BrowseComp 无上下文管理 62.0、有上下文管理 75.9。同表包含更高 SWE 分的闭源模型，不能称 GLM-5 全面最佳。

### E23-13 OpenAI：Deliberative Alignment 的实际阶段

来源：[Deliberative Alignment: Reasoning Enables Safer Language Models](https://arxiv.org/html/2412.16339)。

> “two core stages”
>
> “supervised fine-tuning on (prompt, CoT, output) examples”

采用：先基于安全规范生成并过滤带规范推理的样本，通过 SFT 教模型；再用带规范的 judge 进行高计算 RL。不是上游所写“规则生成 → CoT → 过滤 → 监控”四个训练阶段。该论文提供安全训练方法，不等于公开 o1/o3 的完整能力训练配方；不将未经核验的“CoT 一律对 RM 隐藏”作为普遍原则。

### E23-14 OpenAI：Safe-Completions 的奖励与安全边界

来源：[From Hard Refusals to Safe-Completions](https://arxiv.org/html/2508.09224)。

> “Both RMs assign rewards based on the prompt and the assistant’s final response.”
>
> “yields zero reward regardless of helpfulness”

采用：公开的安全训练部分组合 helpfulness 与 safety 分数，乘法形式让判为 safety=0 的回答得零分，目标是安全约束内的帮助性，包括安全替代回答。数学上为零依赖判分正确；分类器漏判、分布外输入、奖励投机仍然存在，不能宣称消除现实安全风险。

### E23-15 Google／Anthropic：方法披露不能跨产品移植

来源：[Gemini 2.5 报告](https://arxiv.org/html/2507.06261)、[Constitutional AI](https://arxiv.org/html/2212.08073)、[HH-RLHF](https://arxiv.org/html/2204.05862)。

> Gemini: “verifiable rewards and model-based generative rewards”
>
> CAI: “generate self-critiques and revisions”
>
> HH-RLHF: “updated on a weekly cadence with fresh human feedback data”

采用：Gemini 披露 SFT/RM/RL、增加 RL 计算、多模态工具环境和预算控制，未据此核实固定 PPO／GRPO／critic 配方；不采纳含糊“DRM+critic=RL*F”的断言，也不把 Gemma 的 BOND/WARM/WARP 迁移成 Gemini 的事实。CAI 先批评与修订做监督学习，再由 AI 偏好训练 PM 并用于 RL；HH-RLHF 是历史公开证据。它们不构成 Claude 3.5/4 完整训练配方。

## 未采纳的推断与教学边界

1. **固定 actor-critic 成本倍数**：没有统一分母。正文只定义教学性分项账本，分别计 rollout、actor、critic、judge、环境、通信和教师。
2. **从曲线相关性推出机制必然性**：更长推理与更高分共同出现，不证明所有多写 token 都有用；多阶段后更好，不证明唯一原因是阶段数。
3. **把模型产品路线当优化算法升级链**：DAPO、VAPO、CISPO、GSPO、SAPO 的约束对象不同；工程一致性和奖励质量仍可决定成败。
4. **上游的宏观判断**：“RL 释放能力”“actor-critic 复兴”“后训练未饱和”“自进化时代”只作为可检验假设。应固定底座、数据、预算、评估 harness，再进行消融和重复实验。
5. **教学数字**：22 章查询组方差、任务混合和预算手算；23 章分片、并行关键路径、token 裁剪及教师概率差，均为本项目例子，不是上述公司训练日志。

## 本工作单元的独立验收

验收日期：2026-09-27。直接导入两个章节，不依赖尚待主任务集成的 catalog。

| 检查项 | 第 22 章 | 第 23 章 |
| --- | ---: | ---: |
| `validateChapter` 错误数 | 0 | 0 |
| 必需 section 类型，按约定顺序 | 9 | 9 |
| section 正文汉字数，不含题目答案和引用 | 4,881 | 5,449 |
| 学习目标 | 5 | 5 |
| 自测问题 | 7 | 8 |
| 引用条目 | 15 | 16 |
| 图节点 / 合法链接 | 6 / 5 | 7 / 10 |
| 本地 KaTeX 成功解析的公式 | 35 | 44 |
| Python 标准库示例，全部断言通过 | 1 | 1 |

代码输出核对：

- 第 22 章：有效查询 `['C', 'B']`；B 优势 `[-0.577, -0.577, -0.577, 1.732]`；假设生成量 `261816320`；混合奖励 `0.72`；V3 后训练占合计 `0.179%`。
- 第 23 章：两个 CISPO 系数 `0.6, 0.4`；OPD 差值 `0.693, -0.693`；理想并行时延加速 `1.875`。
- `renderChapter` 字符串级检查通过：学习模式各 9 节、面试模式各 4 节，公式占位数量、代码块和折叠答案数量正确。
- 先修章节均早于当前章节，引用 URL 使用 HTTPS，图链接索引通过 schema 验证。

以上不是浏览器视觉验收，也不是工业训练复现。未改 catalog、共享渲染器、其他章节或测试文件，未提交 commit；全站目录、分支图实际视觉呈现和响应式验收由主集成任务负责。
