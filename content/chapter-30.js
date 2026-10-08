const chapter = {
  id: "30",
  slug: "supervised-finetuning",
  part: "LLM 后训练",
  title: "监督微调（SFT）：从预训练到可指令模型",
  subtitle: "token 级交叉熵、mask、packing 与数据契约",
  level: "核心",
  duration: 150,
  prerequisites: ["06", "08", "09", "11"],
  tags: ["SFT", "Instruction Tuning", "Chat Template", "Packing", "Prompt Mask"],
  objectives: [
    "推导 SFT 的 token 级交叉熵损失，区分 prompt mask、response mask 与 loss mask",
    "手算单条样本的有效 token 数、聚合分母与一次参数更新方向",
    "比较 sample-mean、sequence-mean 与 token-mean 三种聚合，并解释长回答偏差",
    "设计 packing、chat template 与多轮对话的 attention/loss mask",
    "按验证集 loss、能力保留与 reward model 可用性判断 SFT 是否完成",
  ],
  summary:
    "SFT 把预训练好的下一 token 预测器微调成会按指令回答的模型。它仍然是最大似然，但目标分布受 prompt 条件约束，而且只对 assistant token 回传梯度；聚合方式、模板和 packing 会直接改变实际优化目标与能力迁移效果。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：从续写器到会答题的模型",
      body: String.raw`预训练模型看过很多文本，但遇到“请把下面这段英文翻成中文”时，它可能继续补几行英文，而不是输出中文翻译。它不是不会翻译，而是从未被告诉“当看到指令时该回答，而不是续写”。SFT 就是用一批 (prompt, response) 示范让它学会这件事。

把它当作一次性问答时，SFT 的目标非常朴素：模型在给定 prompt 条件下，最大化示范回答的概率。预训练目标 $\log p(x_t\mid x_{<t})$ 是无条件的下一 token 预测；SFT 变成 $\log p(y_t\mid x,y_{<t})$，prompt $x$ 作为固定条件，不参与 loss。两者都是 next-token，但条件集合和训练分母完全不同。

工程细节决定实际学到的是什么。prompt 要不要进 loss？chat template 的角色标记要不要训练？工具返回要不要被模型模仿？多条样本拼成一个序列后，有效 token 的归一化分母是多少？答错任何一个，报告的 loss 曲线依然会下降，模型的实际行为却可能偏离预期。例如把工具 observation 当成目标 token 训练，等于教模型伪造环境输出。

SFT 也不是只学格式。它同时教会任务能力、解题模板、拒答边界和风格偏好。能力遗忘与模板漂移往往出现在同一个阶段：少量高质量 SFT 可能让模型在训练任务上得分飙升，却在 MMLU 之类的通用集上损失准确率。因此必须按能力分组保留集估计泛化，不能只看训练集 loss。

本章用“英文→中文翻译”和“Python 列表求和”两类示范做手算，推导 token 级交叉熵、三种聚合分母、packing 下的 attention 边界，再接到第 16 章的 RLHF 和第 18 章的 DPO：它们都把 SFT 当成 reference policy 或起点，公式里的记号必须对得上。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：一次翻译示范的梯度",
      body: String.raw`取一条教学样本。prompt 是“把 hello 翻成中文：”，response 是 token 序列 “你 好 </s>” 共 3 个 token。假设当前模型对这三个 token 的条件概率分别为 $p_1=0.5,p_2=0.4,p_3=0.8$。先算这条样本的负对数似然，再看聚合分母。

逐 token 负对数似然为 $-\log 0.5=\log 2\approx0.693$、$-\log 0.4\approx0.916$、$-\log 0.8\approx0.223$。三项加起来为 $1.832$。若按**序列和**取 loss，就是 $1.832$；若按**序列内平均**（除以 response 的有效 token 数 3），得 $0.611$；若按**全 batch token 平均**，需要和同 batch 其他样本一起分母相加。

若 batch 中还有一条样本 response 是单 token，每 token NLL 为 $\log 4\approx1.386$，长度 1。两条序列级平均 loss 分别是 $0.611$ 和 $1.386$，sample-mean 为 $0.999$；token-mean 分母 $3+1=4$，分子 $1.832+1.386=3.218$，得 $0.805$。短样本在 token-mean 下权重更大，长样本在 sample-mean 下权重更大。两者不是数值误差，是选择不同的目标。

现在只看第一个 response token “你”。它的梯度与 cross-entropy 一致：$\nabla_{z}\mathrm{CE}=p-y$，其中 $y$ 是 one-hot 的真实 token。若词表只有 4 个 token、softmax 后 $p=(0.1,0.5,0.3,0.1)$、真值是第 2 个，则 logits 梯度为 $(0.1,-0.5,0.3,0.1)$，推高目标 token 的 logit，压低其它。这个局部结构和第 05、08 章完全一致。

prompt token 要被模型“看到”，但不参与 loss。设 prompt 共 7 个 token、response 共 3 个 token，整条序列长度 10。模型前向算全部 10 个位置的 logits，但只在后 3 个位置回传梯度；前 7 个位置的 CE 被 loss mask 乘零屏蔽。工具返回的 token 同理：它们必须在上下文里出现，才能让模型学会“读了之后再答”，但不能当作被模仿目标。

这一步给三件事定了量：具体的 $0.611$ 对 $0.805$ 说明分母会改变报告 loss；$(0.1,-0.5,0.3,0.1)$ 说明单 token 的梯度结构不变；loss mask 的存在说明有效长度不是序列长度。下一节用这个具体例子把路线铺开。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：先定义有效 token，再谈聚合和模板",
      body: String.raw`从上面两条数字出发，SFT 的学习主线可以拆成四段。首先把 prompt mask 和 response mask 写清楚，确认哪些位置回传梯度；其次推导 token-level loss 的三种聚合，并给出各自改变的是什么；再接到 chat template 与多轮对话的工程约定；最后判断 SFT 什么时候算完成、怎样和 RLHF/DPO 衔接。

数学部分依赖第 08 章的 tokenizer 与 cross-entropy、第 09 章的 Transformer 前向与 label shift、第 11 章的训练推理系统；本章是后训练的最简实例，RLHF（第 16 章）、DPO（第 18 章）、OPD（第 19 章）、数据工程（第 21 章）都把 SFT 作为起点或 reference policy。第 21 章的六条数据获取路线为后续内容，不作为本章先修；读完本章再回看，更容易区分 SFT 目标与 RS-SFT、OPD 等变体。

学完这一章应该能回答：给定一条多轮对话样本，哪些 token 在训练中被预测、哪些只是上下文；长回答为何在 token-mean 下主导梯度；packing 为什么必须切断跨样本注意力；以及如果验证 loss 继续下降但 MMLU 掉点，下一步该做什么。白板题会把这些问题一次性问清。`,
      links: [
        { label: "SFT 的四类 mask 与数据流", sectionId: "diagram", level: "必会" },
        { label: "token 级 CE 与三种聚合", sectionId: "derivation", level: "必会" },
        { label: "有效 token 数的手算", sectionId: "example", level: "必会" },
        { label: "chat template 与多轮对话", sectionId: "math-chat-template", level: "推导" },
        { label: "packing 与跨样本注意力隔离", sectionId: "math-packing", level: "推导" },
        { label: "聚合、长度偏差与权重", sectionId: "math-aggregation", level: "推导" },
        { label: "完成判据与 RLHF 衔接", sectionId: "math-completion-criteria", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "SFT 的数据流：从原始对话到有效梯度",
      body: String.raw`原始数据是一条多轮对话。tokenizer 把它编码为 token id 序列，并记录每个 token 的角色（system/user/assistant/tool）。模型只看一维 token id，但训练流程需要四个并行的辅助张量：input_ids、attention_mask、position_ids、loss_mask。

attention_mask 控制每个 query 可见哪些 key；loss_mask 控制哪些位置回传梯度。两个 mask 维度相同，但语义不同：工具返回在 attention_mask 中是 1（模型要读），在 loss_mask 中是 0（不被模仿）。label 需要右移一位：预测位置 $t$ 的目标是 $t+1$，所以最后一个位置通常不参与 loss。

packing 把多条样本拼到同一个序列里以提高吞吐。此时必须构造 block-diagonal attention mask，禁止一条样本的 query 读到另一条样本的 key。常见 bug 是用全 1 的 attention_mask，让 batch 内不同样本泄漏信息，训练 loss 看起来更低，泛化却变差。`,
      diagram: {
        kind: "flow",
        nodes: [
          "原始对话",
          "chat template 渲染",
          "tokenizer + 角色标记",
          "input_ids / attention_mask / loss_mask",
          "Transformer 前向",
          "token-level CE × loss_mask",
          "聚合与参数更新",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 6],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "SFT 目标：条件最大似然与 token 级 CE",
      body: String.raw`固定一条样本 $(x,y)$，$x$ 为 prompt token 序列、$y=(y_1,\ldots,y_T)$ 为 response token 序列。参数 $\theta$，模型给出条件概率 $\pi_\theta(y_t\mid x,y_{<t})$。loss mask $m_t\in\{0,1\}$ 指示位置 $t$ 是否计入 loss；对标准 SFT，response 对应 $m_t=1$，prompt 和工具返回 $m_t=0$。

**条件似然。** 样本 log-likelihood 为

$$\log P_\theta(y\mid x)=\sum_{t=1}^{T}m_t\log\pi_\theta(y_t\mid x,y_{<t}).$$

SFT loss 的三种聚合：

$$L_{\mathrm{seq-sum}}=-\sum_{t=1}^{T}m_t\log\pi_\theta(y_t\mid x,y_{<t}),$$

$$L_{\mathrm{seq-mean}}=-\frac{1}{\sum_t m_t}\sum_{t=1}^{T}m_t\log\pi_\theta(y_t\mid x,y_{<t}),$$

$$L_{\mathrm{token-mean}}=-\frac{\sum_{(x,y)}\sum_t m_t\log\pi_\theta}{\sum_{(x,y)}\sum_t m_t}.$$

**与预训练目标的关系。** 预训练使用无条件的 $-\sum_t\log p(x_t\mid x_{<t})$，分母是全部 token；SFT 的分母是 loss mask 为 1 的 response token。前者没有 prompt 概念，所以不会出现 mask；后者为了避免模型把 prompt 当成被预测对象，必须屏蔽。若不屏蔽 prompt，模型会学会复述问题，在 chat 场景产生“先重复问题再回答”的伪影。

**单 token 梯度。** 对 logits $z\in\mathbb R^{|V|}$，softmax 概率 $p=\mathrm{softmax}(z)$，真值 one-hot $y$，有 $\nabla_z\mathrm{CE}=p-y$。这与第 05 章的 softmax CE 完全一致。SFT 的全部“新东西”只在于：哪些位置的 $p-y$ 被 loss_mask 保留，以及最后怎样加起来。

**数值例回算。** 回到开场的 $p_1=0.5,p_2=0.4,p_3=0.8$：$L_{\mathrm{seq-sum}}=1.832$、$L_{\mathrm{seq-mean}}=0.611$。若该 batch 只有这一条样本，token-mean 与 seq-mean 相等。多条样本时三者关系由各样本有效长度决定。

**与 RLHF 的接口。** 第 16 章用冻结的 SFT 模型作为 reference policy $\pi_{\mathrm{ref}}$，KL 惩罚 $\beta\log\frac{\pi_\theta}{\pi_{\mathrm{ref}}}$ 的分母正是本节的 $\pi_\theta$ 定义。第 18 章 DPO 的隐式奖励 $\beta\log\frac{\pi_\theta}{\pi_{\mathrm{ref}}}$ 同理。因此 SFT 的 chat template 一旦改动，RLHF/DPO 的 reference 也必须同步重算，否则所有 log-ratio 都偏。`,
    },
    {
      id: "math-chat-template",
      type: "derivation",
      title: "chat template：角色标记与多轮对话 mask",
      body: String.raw`现代 LLM 的 SFT 几乎都用 chat template 把多轮对话渲染成一条序列。常见格式是 ChatML：

~~~text
<|system|>你是一名助手。<|end|>
<|user|>把 hello 翻成中文：<|end|>
<|assistant|>你好<|end|>
~~~

角色标记（$\langle\mid$system$\mid\rangle$、$\langle\mid$end$\mid\rangle$ 等）是特殊 token，由 tokenizer 单独分配 id。训练 SFT 时，有三种常见约定：

1. **只训 assistant content**：loss_mask 仅在 assistant 的 content token 上为 1，不含角色起止 token。
2. **训 assistant content + end token**：加入 $\langle\mid$end$\mid\rangle$，让模型学会何时停止生成。
3. **全程训**：所有 token（含 system/user）都计入 loss。等于把 prompt 也当成被模仿目标，通常只在特定场景下使用。

主流开源配方（Llama/Qwen/DeepSeek 的 instruct）采用第 2 种。原因有两个：若不训结束 token，模型永远不会主动停止，推理时必须靠外部 EOS 规则截断；若把 user token 也进 loss，模型会学会复述用户话。

**多轮对话。** 考虑一次 user→assistant→user→assistant 的对话。两段 assistant 回答都要被模仿，但只在各自的 token 上回传梯度。loss_mask 为

$$m = [\underbrace{0,\ldots,0}_{\text{sys+u1}},\underbrace{1,\ldots,1}_{\text{a1 content+end}},\underbrace{0,\ldots,0}_{\text{u2}},\underbrace{1,\ldots,1}_{\text{a2 content+end}}].$$

attention_mask 则对所有位置为 1：u2 要看到 a1，a2 要看到 u2 和 a1。因果 mask 保证不看未来。有效 token 数等于两段 assistant 的 content+end 长度之和。

**工具调用的变体。** 若对话包含工具调用，格式往往形如 assistant 发出 tool_call、tool 返回 observation、assistant 根据 observation 继续回答。工具 observation 的 loss_mask 必须为 0，否则模型会学会生成虚假的工具返回。这是第 25 章“策略只对 agent 自己的动作负责”在 SFT 阶段的对应约定。

**模板漂移。** chat template 一经选定不能随意改动。若 SFT 用 ChatML，推理却按 Alpaca 格式拼 prompt，模型会把陌生角色标记当成普通 token，输出退化到预训练分布。模板变更应作为一次完整的重新 SFT 处理，并同步更新 RLHF 的 reference policy。`,
    },
    {
      id: "math-packing",
      type: "derivation",
      title: "packing：吞吐优化与跨样本注意力隔离",
      body: String.raw`SFT 数据集的样本长度差异大。若 batch 内按最大长度 pad，短样本的 pad token 浪费计算。packing 把多条样本拼到一条序列里，直到达到 context length。

**朴素 packing 的 bug。** 若直接把样本 A（长度 300）、B（长度 500）、C（长度 200）拼成一条长度 1000 的序列，并用全 1 的 attention_mask 和标准因果 mask，则：B 的 query 可以读到 A 的 key；C 的 query 可以读到 A 和 B。这相当于用别人的 prompt 当上下文回答自己的问题。训练 loss 看起来略低，泛化却变差，推理时还可能出现样本间风格串扰。

**正确做法 1：block-diagonal attention。** 构造一个 $[L,L]$ 的 attention mask，仅允许同一样本内的 query 看自己的 key：

$$\mathrm{mask}[i,j]=\begin{cases}1,&\mathrm{sample}(i)=\mathrm{sample}(j)\text{ 且 }j\le i,\\0,&\text{否则}.\end{cases}$$

**正确做法 2：document separator + position reset。** 很多框架（FlashAttention 的 varlen 接口、Megatron 的 reset_position_ids）用一个 cu_seqlens 数组标注边界，position_id 在每个样本内从 0 重新计数。效果等价于 block-diagonal mask，但显存和算力都更友好。

**loss mask 的联动。** packing 后的 loss mask 是各样本 loss mask 的拼接。token-mean 分母是整条 packed 序列的有效 token 数，等于各样本有效 token 数之和。sample-mean 则需要单独记录每条样本边界，先在样本内取平均再在样本间取平均。这两种聚合在 packing 下的差异比 un-packed 更大，因为同一 microbatch 中样本数变多。

**数值例。** 四条样本有效 token 分别为 100、50、20、30，共 200 个有效 token。假设各样本平均 token NLL 为 1、2、3、4。
- sample-mean：$(1+2+3+4)/4=2.5$
- token-mean：$(100\cdot1+50\cdot2+20\cdot3+30\cdot4)/200=380/200=1.9$

两者相差 0.6。若长样本质量较低（NLL 较高），sample-mean 会给它和其它样本相等权重，token-mean 则按长度加权。选择哪一个取决于目标：产品希望每条样本都学会（倾向 sample-mean），还是希望模型在生成长内容时更稳（倾向 token-mean）。原论文（Llama/Qwen）常用 token-mean；不少开源配方（例如 Axolotl 默认）使用 sample-mean。公布 SFT 配方时必须明确。`,
    },
    {
      id: "math-aggregation",
      type: "derivation",
      title: "聚合的长度偏差：三种分母如何改变目标",
      body: String.raw`固定一个 batch 的 $B$ 条样本，第 $i$ 条样本有效长度 $T_i$，逐 token NLL 为 $\ell_{i,t}$。定义三种 loss：

$$L_{\mathrm{sample}}=\frac{1}{B}\sum_{i=1}^{B}\frac{1}{T_i}\sum_{t=1}^{T_i}\ell_{i,t},$$

$$L_{\mathrm{seq-sum}}=\frac{1}{B}\sum_{i=1}^{B}\sum_{t=1}^{T_i}\ell_{i,t},$$

$$L_{\mathrm{token}}=\frac{\sum_{i,t}\ell_{i,t}}{\sum_i T_i}.$$

**样本权重。** 把 batch 梯度写成 $\sum_i w_i\sum_t\nabla\ell_{i,t}$，$w_i$ 代表第 $i$ 条样本的权重：
- $L_{\mathrm{sample}}$：$w_i=\frac{1}{BT_i}$。短样本每 token 权重更大。
- $L_{\mathrm{seq-sum}}$：$w_i=\frac{1}{B}$ 乘以样本长度。长样本权重线性增大。
- $L_{\mathrm{token}}$：$w_i=\frac{1}{\sum_j T_j}$。所有 token 权重相等，各样本按长度加权。

**具体数值。** $B=2$，$T_1=2,T_2=8$，每 token NLL 恒等于 1、3：
- sample-mean $=(1+3)/2=2$
- seq-sum $=(2+24)/2=13$
- token-mean $=(2+24)/10=2.6$

三者分别对应三种“公平”的直觉：按样本公平、按序列总负责、按 token 公平。它们在同一数据集上的最优参数并不相同；换聚合等于换目标。这与第 19 章 OPSD 的分母、第 20 章 VAPO 的正例项、第 21 章 SFT 数据契约是同一类问题，必须一次性澄清。

**学习率与聚合的耦合。** 相同数据下，三种 loss 的梯度范数不同。seq-sum 的梯度范数比 sample-mean 大约 $\overline T$ 倍（$\overline T$ 为平均长度）；若直接把 sample-mean 配方的学习率搬到 seq-sum，等价于把学习率乘 $\overline T$，极易发散。公布配方时必须报告 loss 聚合与学习率的组合，不能单列一个“lr=2e-5”就完事。

**梯度累积的坑。** 若用 K 步 microbatch 累加后再更新，各 microbatch 的 token-mean 不能简单相加后除以 K。正确做法是累加分子（$\sum\ell$）和分母（$\sum T$），最后一次相除；或在每个 microbatch 乘以 $T_{\mathrm{micro}}/T_{\mathrm{total}}$ 的权重再累加。错误的实现会让 token-mean 退化为“等 microbatch”平均，长 microbatch 被低估。

**长度惩罚和 EOS 训练。** 若 EOS 不进 loss，模型永远不学“停”，推理必须靠长度上限截断。若 EOS 进 loss 且使用 token-mean，模型会倾向于早停（因为 EOS 之后的所有位置贡献 0 梯度，不如提早结束）。实践中通常把 EOS 作为一个普通 content token 训练，并在数据分布中保留合理长度，而不是额外加 length penalty。`,
    },
    {
      id: "math-completion-criteria",
      type: "derivation",
      title: "SFT 什么时候算完成：验证 loss、能力保留与 RLHF 起点",
      body: String.raw`“继续训会不会更好”不能只靠 loss 曲线判断。SFT 典型过拟合信号是训练 loss 继续下降，验证 loss 先降后升；但更常见的是训练与验证 loss 同向下降，MMLU/GSM8K 等能力集先升后降。这是能力遗忘（catastrophic forgetting），仅看 loss 看不出来。

**三条验收线并行监控。** 把每个 checkpoint 的三类指标写成一个联合判据。记预训练模型的能力保留集准确率为 $A_0$，当前 checkpoint 为 $A_t$，验证集 token-mean loss 为 $L_t$，指令遵循集通过率为 $I_t$。阈值 $\tau_A$（允许的能力下降）、$\tau_I$（指令遵循下界）由产品确定。SFT 继续训练的条件是

$$\text{继续训}\iff L_t<L_{t-1}\ \wedge\ A_0-A_t\le\tau_A\ \wedge\ I_t\ge\tau_I.$$

三项任何一项不满足都应停止：验证 loss 回升是常规过拟合；$A_0-A_t>\tau_A$ 是能力遗忘；$I_t<\tau_I$ 说明格式/遵循崩坏。只跟踪 $L_t$ 会错过后两种失败。

**和 RLHF 的接口。** SFT 产生两个产物：
- 用于后续 RLHF 的 **reference policy**（冻结，不再更新）。
- 用于初始化 RLHF **actor** 的 checkpoint。

常见错误是用 RLHF 后 checkpoint 当作下一轮的 reference。reference KL 的作用是约束长期漂移，锚点必须稳定；每轮都换 reference 等于把约束拿掉。DPO 同理，若用 RLHF 后模型当 $\pi_{\mathrm{ref}}$ 做新一轮 DPO，隐式奖励定义就改了，离线偏好数据的意义也变了。

**何时该停。** 经验规则：
- 若验证 loss 还在下降、保留集也没掉点，继续训。
- 若保留集开始掉点、训练 loss 还在降，考虑降学习率、减 epoch、增加通用数据回放。
- 若保留集严重下降（> 3-5 个百分点），停止并回退到前一个 checkpoint。SFT 单轮通常 1-3 epoch；超过 5 epoch 很少带来收益，往往只在训练集上过拟合。

**数据重复。** 高质量 SFT 数据重复 2-3 遍通常有收益；重复更多次会让模型记忆具体字面答案，推理时表现为“只会这种问法”。保留集必须按题族去重，否则记忆被误报为泛化。

**完成后的交接。** 产出三个文件：SFT checkpoint、chat template、tokenizer。三者绑定提交，RLHF/DPO 下游必须使用同一组。模板变更或 tokenizer 词表变更都应触发一次完整的回归验证，不能只跑 loss。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从 (prompt, response) 到一次梯度更新",
      body: String.raw`下面用普通 Python 和 numpy 风格的伪代码展示一次 SFT 前向、loss 计算与反向传播。实际训练用 transformers + trl 的 SFTTrainer 可以省去手写细节，但面试更关心每一步在做什么。

~~~python
# 1. 原始数据
example = {
    "prompt": "把 hello 翻成中文：",
    "response": "你好",
}

# 2. chat template 渲染
rendered = (
    "<|user|>" + example["prompt"] + "<|end|>"
    "<|assistant|>" + example["response"] + "<|end|>"
)

# 3. tokenize + 构造 mask
tokens = tokenizer.encode(rendered)                      # [t1, t2, ..., tN]
prompt_end = tokenizer.encode("<|assistant|>")[-1]       # 定位 assistant 起点
assistant_start = tokens.index(prompt_end) + 1
loss_mask = [0] * assistant_start + [1] * (len(tokens) - assistant_start)
# attention_mask 全 1；因果 mask 由模型内部添加

# 4. 前向 + label shift
logits = model(input_ids=tokens).logits                  # [L, V]
shifted_logits = logits[:-1]                             # 预测位置 t 的目标是 t+1
shifted_labels = tokens[1:]
shifted_mask = loss_mask[1:]

# 5. token 级 CE，mask 后聚合
nll_per_token = cross_entropy(shifted_logits, shifted_labels, reduction="none")
valid = sum(shifted_mask)
assert valid > 0, "no response token to train"
loss = sum(nll * m for nll, m in zip(nll_per_token, shifted_mask)) / valid

# 6. 反向 + 优化器
loss.backward()
optimizer.step()
optimizer.zero_grad()
~~~

**关键检查点。**
- **assistant_start** 必须严格对齐 chat template，否则 loss_mask 偏一个 token，模型会学会从结束标记开始续写。
- **shifted_mask = loss_mask[1:]** 不是 loss_mask[:-1]。预测位置 $t$ 的 label 是 $t+1$，mask 跟随 label 平移。
- **valid > 0** 的断言阻止 batch 中混入全 prompt（无 response）样本。packing 下这个检查变成累加整条序列的有效 token 数。
- 替换 cross_entropy 时注意是否自带 reduction：有的实现默认 mean，再除一次 valid 会得到错误 loss。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：loss 曲线正常不等于 SFT 正确",
      body: String.raw`**误区一：prompt 也进 loss。** 直接拿 $\log p(x,y)$ 作为目标，模型会学会先重述 user 问题。loss 曲线仍然下降，但推理阶段模型会把开头的用户话复述一遍，然后才回答。生产模型通常用户看不到前半段，仍然浪费 token 预算。

**误区二：工具 observation 进 loss。** 让模型模仿 tool 返回的 token，等于教它凭空生成环境输出。推理时它会在没有真实工具调用的情况下伪造 observation，继续按幻觉输出推理。SFT 对工具数据的处理必须和第 21、25 章一致：工具返回只是上下文，不是目标。

**误区三：packing 用全 1 attention mask。** 不同样本间的信息串扰看起来会降低 loss，但模型学到的是“查看别处的 prompt 来回答当前题”，推理时没有这个泄漏源，表现变差。所有 packing 实现都必须构造 block-diagonal mask 或等价的 varlen 接口。

**误区四：换聚合不换学习率。** 把配方从 sample-mean 换成 token-mean（或反之），梯度范数会按平均长度缩放。沿用旧学习率可能慢到不收敛或快到发散。

**误区五：EOS 不进 loss。** 模型永远不会主动停止生成，推理必须靠外部长度上限。更隐蔽的变体是：EOS 的 token id 和 pad id 相同，loss_mask 又屏蔽 pad，于是 EOS 永远被屏蔽。应检查 tokenizer 的 EOS/pad 配置。

**误区六：训多了比训少了好。** 高质量 SFT 的 epoch 一般 1-3。更多 epoch 会让模型记忆具体字面答案，在换一种问法时性能下降。保留集按题族去重后观察这个现象，不要用训练集 loss 判断过拟合。

**误区七：改了 chat template 不重跑 reference。** RLHF 的 KL 分母和 DPO 的 log-ratio 都依赖 $\pi_{\mathrm{ref}}$。模板一变，所有 reference 概率都偏，训练目标偷偷换了。应把 SFT checkpoint、tokenizer、chat template 作为一组产物版本化绑定。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "SFT 与相邻方法的边界",
      body: String.raw`| 方法 | 目标 | 数据 | 分母 | 更新信号 |
|---|---|---|---|---|
| 预训练 | $\log p(x_t\mid x_{<t})$ | 大规模无标签文本 | 全部 token | 下一 token |
| SFT | $\log\pi_\theta(y_t\mid x,y_{<t})$ | (prompt, response) | response token | 下一 assistant token |
| DPO | $\log\sigma(\beta\Delta\log\mathrm{ratio})$ | (prompt, chosen, rejected) | 偏好对 | 相对 reference 的 log-ratio |
| RLHF/PPO | $\mathbb E[A\cdot\log\pi_\theta]$ | prompt + 自生成 response + RM | 采样回答的 token | 奖励与 KL |
| OPD | 教师 $\pi_T$ 分布的 reverse KL | prompt + 学生 rollout | response token | 全词表教师分布差 |
| RS-SFT | SFT loss | 自己采样 + verifier 过滤 | 通过的 response token | 通过轨迹 |

**SFT 与 RS-SFT 的差。** SFT 用预先准备好的示范；RS-SFT 让当前模型采样，用 verifier 保留通过的轨迹，再做 SFT。后者是一种数据获取路线（第 21 章），但训练目标还是 SFT loss，不是新算法。

**SFT 与 DPO 的差。** SFT 单边提升示范的概率，不管别的回答；DPO 同时压低 rejected 的相对概率。只有示范而没有偏好对比时用 SFT；有成对偏好时用 DPO 更直接。两者不是替代关系——DPO 几乎都需要先 SFT 到可用的 reference。

**SFT 与蒸馏。** 二者形式上都用 teacher 产生数据。SFT 只学 teacher 采样的 argmax token（硬标签）；OPD 学 teacher 的完整分布（软标签）。软标签信息密度高，但要求 teacher 可调用；硬标签只需要 teacher 的输出文本。

**和 instruction tuning / chat tuning / alignment 的关系。** 这三个词在工业界常混用。本章说的 SFT 覆盖 instruction tuning（用指令-回答示范）和 chat tuning（用多轮对话示范）；alignment 更宽，还包含偏好学习、RLHF、宪法 AI 等。面试追问时先确认对方指的是哪一个。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：从 SFT 到 RLHF 的一句话串联",
      body: String.raw`**30 秒回答：** “SFT 把预训练模型微调成会按指令回答的样子。目标是对 (prompt, response) 示范做条件最大似然，只在 response token 上回传梯度，prompt 和工具返回只作上下文。实现要点在三个 mask——prompt_mask、loss_mask、packing 的 attention_mask——加上三种聚合（sample / seq / token）的选择，不同选择等于不同目标。SFT 完成后作为 RLHF 的 reference policy 和 actor 起点，chat template 必须和下游共用一套。”

**追问 1：为什么 prompt 不进 loss？** 直接训会让模型复述用户问题；条件概率 $\log p(y\mid x)$ 的 $x$ 已经作为上下文给模型看过，不需要再被预测。

**追问 2：三种聚合如何选？** sample-mean 关心每条样本平等，适合样本质量高度不均；token-mean 关心每个 token 平等，适合长回答占主的任务；seq-sum 是数学上的原始形式，但梯度范数随长度变化，需要配套的学习率。生产常用 token-mean + 适配的学习率，避免长回答被淡化。

**追问 3：packing 为什么容易出错？** 必须构造 block-diagonal attention 或 varlen 接口，否则 batch 内样本会互相看到。推理没有这个泄漏源，表现会差。

**追问 4：训多少 epoch？** 高质量数据 1-3 epoch，过多会记住字面答案。判据不是训练 loss，而是能力保留集的拐点。

**追问 5：SFT 和 DPO 顺序？** 几乎总是先 SFT 到可用的 reference，再用 DPO 做偏好对齐。没有示范数据的冷启动 DPO 可能让模型漂移到任意方向。

**追问 6：改了 chat template 怎么办？** 重新跑 SFT，并同步刷新所有 RLHF/DPO 用到的 reference。模板是一组产物（checkpoint + tokenizer + template）的一部分，不能单独改。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：SFT 的 loss、mask 与聚合",
      body: "回答时先写出假设与分母，再推导。所有题目都要包含“得分点”。",
      questions: [
        {
          q: "一条样本 response 的 3 个 token 概率为 0.5、0.4、0.8。写出 seq-sum、seq-mean 两种 loss，并给出第一个 token logits 的梯度结构（词表大小 4，softmax 后 p=(0.1,0.5,0.3,0.1)，真值是第 2 个）。",
          a: String.raw`逐 token NLL 为 $\log 2\approx0.693$、$\log 2.5\approx0.916$、$-\log 0.8\approx0.223$。seq-sum $=0.693+0.916+0.223=1.832$，seq-mean $=1.832/3\approx0.611$。logits 梯度 $p-y=(0.1,-0.5,0.3,0.1)$，推高目标 logit，压低其它。**得分点：** 分母声明；三值相加；mean 要除以有效 token 数；CE 梯度为 $p-y$ 而非 $p$。`,
        },
        {
          q: "batch 两条样本有效长度 2 和 8，各样本每 token NLL 恒为 1 和 3。分别计算 sample-mean、seq-sum/B、token-mean 并解释差异。",
          a: String.raw`sample-mean $=(1+3)/2=2$。seq-sum/B $=(2+24)/2=13$。token-mean $=(2+24)/10=2.6$。三者分别按样本、序列、token 加权。sample-mean 让短样本每 token 权重更大；token-mean 让长样本总贡献按长度加权；seq-sum 直接随长度放大梯度范数。**得分点：** 三个数值；三种权重的含义；换聚合等于换目标；学习率需要配套调整。`,
        },
        {
          q: "多轮对话 [sys, u1, a1, u2, a2]，长度分别为 10、15、20、18、30。写出 attention_mask 与 loss_mask，并给出有效 token 数（忽略 end token）。",
          a: String.raw`attention_mask 全 1（因果 mask 由模型内部添加）；loss_mask 为 $[\underbrace{0\times10}_{\text{sys}},\underbrace{0\times15}_{\text{u1}},\underbrace{1\times20}_{\text{a1}},\underbrace{0\times18}_{\text{u2}},\underbrace{1\times30}_{\text{a2}}]$。有效 token 数 $=20+30=50$。a2 的 query 要看到 a1、u1、u2，因果 mask 自然满足。**得分点：** 两个 mask 作用不同；assistant content 为 1；user/system 为 0；因果性由模型内部处理；有效长度是 assistant 段之和。`,
        },
        {
          q: "packing 四条样本到一条长 1024 的序列。朴素做法用全 1 attention_mask 为什么错？正确做法是什么？用 token-mean 时分母是什么？",
          a: String.raw`朴素做法让后面样本的 query 读到前面样本的 key，等于用别人的 prompt 回答自己题；训练 loss 看似下降，推理失去该泄漏源导致泛化变差。正确做法是 block-diagonal attention 或 varlen 接口（cu_seqlens + position_id reset），让每个 query 只看同一样本内的 key。token-mean 分母是整条 packed 序列的有效 token 数之和。**得分点：** 识别跨样本泄漏；给出 block-diagonal 或 varlen 两种实现；分母是全体有效 token 之和；提到 position_id 也要 reset。`,
        },
        {
          q: "SFT 后训练 loss 继续下降但 MMLU 下降 4 个百分点，下一步该怎么办？为什么不能用 RLHF 后的 checkpoint 当新一轮 DPO 的 reference？",
          a: String.raw`降学习率、减 epoch 或加入通用数据回放；必要时回退到前一个 checkpoint。SFT 过多会导致能力遗忘，训练 loss 看不到。RLHF 后 checkpoint 已经偏离 SFT，若当作 reference，DPO 的隐式奖励 $\beta\log\frac{\pi_\theta}{\pi_{\mathrm{ref}}}$ 的锚点就变了：相当于拿掉长期漂移约束，离线偏好数据的方向意义也随之改变。**得分点：** 能力保留集而非训练 loss 作为判据；回退/回放/降低 lr 三种处理；reference 必须稳定；对 DPO 隐式奖励定义的影响。`,
        },
      ],
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：从一条样本走到梯度",
      body: "每题先说出哪些 token 回传梯度、分母是什么，再回答。",
      questions: [
        {
          q: "为什么 SFT 不训 prompt token？",
          a: "prompt 是条件，不是被模仿的目标；训练它会让模型学会复述用户问题，推理时浪费 token 并偏离目标分布。",
        },
        {
          q: "工具调用返回的 observation 要不要进 loss？",
          a: "不进 loss。observation 是环境真实返回，必须在 attention_mask 中保留供模型阅读，但不能让模型模仿生成；否则推理时会伪造工具返回。",
        },
        {
          q: "sample-mean 和 token-mean 的梯度范数为什么不同？",
          a: "sample-mean 对每条样本的 token 平均再在样本间平均，权重 $\\propto 1/T_i$；token-mean 对所有 token 平均，权重相等。因此 token-mean 的梯度范数大约随平均长度缩放，不改学习率可能发散或过慢。",
        },
        {
          q: "SFT 与 DPO 的典型顺序？",
          a: "先 SFT 到可用的 reference 和初始化点，再用 DPO 做偏好对齐；没有示范的冷启动 DPO 会让模型漂移到任意方向。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "InstructGPT",
      url: "https://arxiv.org/abs/2203.02155",
      evidence: "SFT + RM + PPO 三阶段原始论文；本章使用其 SFT 阶段定义",
    },
    {
      label: "Llama 2 Technical Report",
      url: "https://arxiv.org/abs/2307.09288",
      evidence: "开源配方：chat template、SFT 数据过滤与 RLHF 衔接；超参数为报告实验",
    },
    {
      label: "LIMA: Less Is More for Alignment",
      url: "https://arxiv.org/abs/2305.11206",
      evidence: "少量高质量 SFT 的能力迁移实证；不作为普适最小规模规则",
    },
    {
      label: "FlashAttention varlen interface",
      url: "https://arxiv.org/abs/2205.14135",
      evidence: "packing 下 cu_seqlens 与 varlen 实现的工程参考",
    },
    {
      label: "ChatML tokenizer specification",
      url: "https://github.com/openai/openai-python/blob/main/chatml.md",
      evidence: "chat template 中角色标记与结束 token 的典型工业实现",
    },
  ],
};

export default chapter;
