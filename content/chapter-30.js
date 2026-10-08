const chapter = {
  id: "30",
  slug: "supervised-finetuning",
  part: "LLM 后训练",
  title: "监督微调（SFT）：从预训练到可指令模型",
  subtitle: "用一条示范理解目标、mask、聚合与 packing",
  level: "核心",
  duration: 150,
  prerequisites: ["06", "08", "09", "11"],
  tags: ["SFT", "Instruction Tuning", "Chat Template", "Packing", "Prompt Mask"],
  objectives: [
    "从三个目标 token 算出一次 SFT 损失，并解释更新方向",
    "区分可见的上下文、直接训练的标签与 label shift",
    "比较每条回答等权和每个 token 等权，说明序列和的尺度",
    "检查多轮模板、padding 和 packing 的样本边界",
    "结合验证趋势、真实生成与能力保留选择 checkpoint",
  ],
  summary:
    "SFT 用示范继续训练下一 token 预测器，让它更可靠地按指令完成任务。本章采用 assistant-only 目标：用户和工具内容可被读取，助手回答作为直接标签；先算一条示范，再检查分母、模板和样本边界。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：用示范教模型怎样回答",
      body: String.raw`给模型“把 hello 翻成中文”，我们希望它回答“你好”。预训练模型可能已经具备翻译能力，却不一定稳定遵循这种指令和对话格式。SFT 把请求与合适回答配在一起，用示范调整这种行为；它也可以教任务知识、输出结构与风格，不只是格式转换。

训练时不是先让模型自由回答，再对整句话打分。我们把示范放在上下文里，让每个位置预测示范中的下一个 token。例如预测“好”时，前面的“你”来自训练数据。这叫 teacher forcing。

本章选择只将助手应输出的内容作为直接标签，称为 assistant-only。用户问题和工具返回仍然在上下文里，回答的损失可以通过注意力传回这些位置的表示。**不把某位置作为标签，不等于该位置完全没有反向传播。**

全序列语言建模也是合法的训练目标，部分 SFT 配置会使用它；不能把“必须屏蔽 prompt”说成 SFT 的定义。选择哪种目标，要与模型在使用时负责生成的内容、数据格式及验证结果对应。

下面只围绕一条翻译示范展开：先算损失，再找标签位置，最后讨论同批多条回答该怎样加权。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：三个目标 token，先算一笔账",
      body: String.raw`为了手算，假设“你好”被切成“你”“好”，再加一个结束 token，共三个目标。这是教学切分，不是承诺真实 tokenizer 会这样分词。

| 当前预测的目标 | 给定的前文 | 模型分配的概率 | 负对数损失 |
|---|---|---|---|
| 你 | 用户问题 | 0.5 | 约 0.693 |
| 好 | 用户问题、你 | 0.4 | 约 0.916 |
| 结束 | 用户问题、你、好 | 0.8 | 约 0.223 |

三项加起来约为 1.832，再除以三个有效目标，平均损失约为 **0.611**。目标概率越高，对应损失越低。这里先记住“加哪些项、除以几个”，不必先背整条似然公式。

若只看“你”这个位置，假设四个候选的概率为 0.1、0.5、0.3、0.1，正确答案是第二个。单 token CE 对 logits 的梯度为 0.1、-0.5、0.3、0.1；负梯度更新倾向提高正确 token 的 logit。若看整条三 token 平均损失，这组直接梯度还要除以 3。

再检查位置：假设 prompt 长度为 7，回答长度为 3，采用从 0 开始的编号。回答标签位于 7、8、9；负责预测它们的 logits 位于 **6、7、8**。第一条回答由最后一个 prompt 位置预测，不能把“最后三个标签”误写成“最后三个 logits”。

第一次阅读到这里，应能说清 0.611 从哪里来，以及 prompt 为什么既不作为直接标签，又能影响回答。多样本的权重留到聚合专题再算。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从三个目标到可靠的数据流",
      body: String.raw`先跟着翻译示范确认预测和标签相差一个位置，再把这个计算写成 CE。随后分两次回访：一次检查多轮模板与 packing 的边界；另一次比较不同长度回答的权重。最后用真实生成和保留集选择模型。

第 08 章提供 tokenizer 与下一 token 目标，第 09 章提供因果注意力，第 06、11 章帮助理解更新与训练系统。本章位于 RLHF/DPO 之前，作为后训练起点；第 21 章的数据获取路线可在此后回看。

首轮完成翻译手算和 mask 检查即可；完整聚合证明、隔离 packing 代码与白板题供回访。`,
      links: [
        { label: "上下文、标签与预测位置", sectionId: "diagram", level: "必会" },
        { label: "token 级 CE", sectionId: "derivation", level: "必会" },
        { label: "三个目标的手算", sectionId: "example", level: "必会" },
        { label: "chat template 与多轮对话", sectionId: "math-chat-template", level: "推导" },
        { label: "packing 与样本边界", sectionId: "math-packing", level: "推导" },
        { label: "聚合与长度权重", sectionId: "math-aggregation", level: "推导" },
        { label: "选择 checkpoint 与交接", sectionId: "math-completion-criteria", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "SFT 数据流：先标角色，再对齐标签",
      body: String.raw`训练数据处理需要保留两类信息：文本如何变成 token，以及每个 token 属于哪条样本、哪个角色。不要指望普通 tokenizer 自动返回可靠的角色边界；这些信息来自模板和数据处理流程。

| 信息 | 回答的问题 |
|---|---|
| input_ids | 每个位置输入什么 token？ |
| attention 可见性 | 这个 query 可以读取哪些 key？ |
| position_ids | 位置编码使用哪个编号？ |
| assistant/loss mask | 哪些 token 是直接训练的目标？ |
| segment IDs / 序列边界 | packing 后哪个 token 属于哪条样本？ |

attention mask 与 loss mask 的维度不必相同。前者可以是二维 padding 标记，也可以由算子表示成 query-key 可见性；后者通常逐 token 标记目标。工具返回在本章作为可读上下文，不作为助手目标。

最后将位置 t 的 logits 与位置 t+1 的标签配对，mask 跟着标签走。若模型内部已经完成 shift，就不要在外面再做一次。`,
      diagram: {
        kind: "flow",
        nodes: [
          "带角色的原始对话",
          "模板渲染与 token 编码",
          "记录角色、padding、样本边界",
          "因果可见性 → 模型 logits",
          "下一 token 标签 + 对齐的 mask",
          "有效目标 CE → 聚合 → 更新",
        ],
        links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "SFT 目标：把翻译示范写成条件似然",
      body: String.raw`开头的三个目标分别得到概率 0.5、0.4、0.8。整条示范的条件概率是三者相乘，取负对数后就变成三项相加。这正是 token 级 CE 的来源。

**只引入必要符号。** x 表示请求，y 表示示范回答，T 表示回答的目标 token 数，模型参数为 $\theta$。teacher forcing 下每一步都给定示范前缀：

$$\begin{aligned}
P_\theta(y\mid x)&=\prod_{t=1}^T\pi_\theta(y_t\mid x,y_{<t}),\\
\ell_t&=-\log\pi_\theta(y_t\mid x,y_{<t}).
\end{aligned}$$

这条完整回答全部作为目标时，负对数似然就是逐项损失之和。若只选择其中一些位置，得到的是**所选 token 的训练目标**，不能仍无条件称为整条序列的对数概率。

**mask 与分母。** 在实际拼接序列上，用固定的二值 m 标记要学习的标签，用 N 表示有效标签数：

$$L=\frac{\sum_t m_t\ell_t}{N},\qquad N=\sum_t m_t>0.$$

对翻译示范，N=3，代入得到约 0.611。被忽略标签的直接 CE 不参与目标；作为上下文的表示仍可通过被选中的预测影响损失。padding 或非法前向应正确处理，不能依赖“NaN 乘零”来消除错误。

**单 token 的更新。** 对该位置的 logits z，softmax 概率为 p，真实标签 one-hot 为 e：

$$\frac{\partial\ell}{\partial z}=p-e.$$

平均损失还会乘该 token 的聚合权重。第 05、08 章的梯度结构没有变，SFT 更需要明确哪些标签被选择、给定什么上下文。

预训练同样是根据前缀预测下一 token，不是“无条件预测”。它也可能屏蔽 padding 或文档边界。SFT 的区别主要来自示范数据和目标位置的选择，而不是换了一套 CE。

下游 RLHF/DPO 经常用 SFT checkpoint 初始化策略并构建 reference。两者比较概率时要使用约定一致的文本、tokenizer、模板和目标范围；改变这些配置后，旧的缓存 log-prob 需要重新核算。`,
    },
    {
      id: "math-chat-template",
      type: "derivation",
      title: "chat template：先确定模型需要输出哪一段",
      body: String.raw`同一句“你好”，放在 user 角色与 assistant 角色下，训练含义不同。chat template 负责把角色、内容和结束标记串成模型熟悉的格式。模板必须来自所用模型的 tokenizer 配置，不能把一套手写标记当成所有模型都接受的标准。

**真实数据先这样处理。** Transformers 中可通过 tokenizer.apply_chat_template 渲染带角色的 messages。训练完整对话通常使用 add_generation_prompt=False；推理时是否需要生成提示，取决于模板。先查看渲染文本、实际 token IDs 和目标范围，再启动训练。

本章翻译例子的角色结构是：

~~~text
system：你是一名助手。
user：把 hello 翻成中文。
assistant：你好 [该模板规定的回答结束标记]
~~~

以上只表示角色归属，不是某个真实模型的序列化格式。角色或结束标记可能对应一个或多个 token，也可能和内容分词发生交互，不能通过“找角色字符串编码的最后一个 ID”定位。

**多轮时逐段决定目标。** 对 sys、u1、a1、u2、a2，若长度分别为 10、15、20、18、30（题中忽略结束标记），本章选取：

| 段 | sys | u1 | a1 | u2 | a2 |
|---|---|---|---|---|---|
| 作为直接标签 | 否 | 否 | 是 | 否 | 是 |
| 目标数 | 0 | 0 | 20 | 0 | 30 |

共 50 个有效目标。可选择训练全部助手轮次，也可只选最后一轮，但必须声明。全部非 padding token 都可作为本样本的前文，因果约束仍禁止读取未来。

与模型输出配对时，目标 mask 必须跟标签移动一位。本样本内，若 m 按原 token 位置记录，则预测位置使用的 mask 为：

$$m^{\rm prediction}_t=m^{\rm target}_{t+1}.$$

**结束与工具。** 本章将助手结束标记纳入目标，为停止行为提供直接监督。若忽略它，会缺少这部分监督，但不能据此断言模型永远不会停止：基座已有知识与推理停止规则也有作用。pad 与 EOS 共用 ID 时，应按真实 padding 位置屏蔽，不能按 ID 一刀切删掉结束标签。

工具调用由 assistant 发出，可作为目标；工具返回由环境产生，在本章只作上下文。若故意训练环境模拟器，则是另一个任务，不能沿用这里的角色契约。

更换模板应做兼容性检查与生成回归；是否需要补充微调取决于变化和结果，并非每次都必须完整重训。下游缓存的 reference 概率也要与新输入重新对齐。`,
    },
    {
      id: "math-packing",
      type: "derivation",
      title: "packing：既隔离注意力，也检查标签边界",
      body: String.raw`短样本补齐到统一长度，会浪费 padding 位置。packing 将多条样本装入同一序列。本节的目标是：计算更紧凑，同时仍让每条示范像独立训练时一样，只依赖自己的前文。

**先用两条样本检查。** 将 A 放前面、B 放后面，普通因果注意力只禁止看未来，因此 B 仍能读取 A。若原任务要求样本独立，这就改变了条件上下文；不能因为 loss 下降就认定优化正确。显式允许跨文档上下文是另一种目标，应单独说明。

**注意力如何隔离？** 给每个 token 一个样本编号 segment。query 只能读取同一样本中、不晚于自己的有效 key。用 M 记录可见性：

$$M_{ij}=\begin{cases}
1,&\text{有效、同段且 }j\le i,\\
0,&\text{否则}.
\end{cases}$$

可以显式构造分块因果 mask，也可将边界交给支持独立序列的 varlen 算子。后者用累积长度等元数据描述序列。**仅插入 separator 或将 position ID 归零，都不会自动阻断注意力**；需要确认实际调用的算子确实使用了边界。

**标签还有一处容易漏。** 若直接用 logits[:-1] 配 labels[1:]，A 的末位置会配到 B 的首 token。独立 packing 必须屏蔽这种跨段标签；即使 B 的第一个 token 被标为 assistant，也不能让 A 去预测它。

在样本内重置 position IDs 能保持与独立输入相同的位置约定，但它与注意力隔离是两件事。padding query 也要有安全处理，不能让全被屏蔽的一行在 softmax 中产生 NaN。

**聚合不该因装箱方式而变。** 同一组样本若有效标签与权重不变，隔离 packing 不应改变声明的损失。token 平均的分母仍是全部有效标签数；按样本平均则必须保留原样本身份，不能把每个 packed 容器当成一个新样本。下一节单独比较这两种权重。`,
    },
    {
      id: "math-aggregation",
      type: "derivation",
      title: "聚合：每条回答等权，还是每个 token 等权？",
      body: String.raw`给翻译示范加一条仅有一个有效目标的短回答，其 NLL 为 log 4，约 1.386。第一条的三个目标损失和约 1.832，平均约 0.611。

| 聚合口径 | 两条回答的算法 | 结果 |
|---|---|---|
| sequence mean（本文也称 sample mean） | 两条各自平均，再取平均 | 约 0.999 |
| token mean | 所有损失相加，除以四个目标 | 约 0.805 |
| sequence sum / B | 两条损失和相加，除以两条样本 | 约 1.609 |

token mean 中长回答占总权重的 3/4，短回答占 1/4；sequence mean 中两条各占 1/2。相对于 token mean，sequence mean 提高了短回答每个 token 的权重。名称在不同代码库中不统一，应以实现和分母为准。

**把权重写清楚。** 固定 B 条非空示范，第 i 条有 $T_i$ 个有效标签，损失为 $\ell_{i,t}$：

$$\begin{aligned}
L_{\rm seq}&=\frac1B\sum_i\frac1{T_i}\sum_t\ell_{i,t},\\
L_{\rm token}&=\frac{\sum_{i,t}\ell_{i,t}}{\sum_iT_i}.
\end{aligned}$$

前者每个 token 的系数为 $1/(BT_i)$，后者为 $1/\sum_iT_i$。这是目标对该损失项的权重，不保证实际梯度向量的范数按同样比例变化；不同 token 的梯度还会相加或抵消。

**序列和与 token 平均的特殊关系。** 定义 $L_{\rm sum}=\sum_{i,t}\ell_{i,t}/B$，固定这批示范及其目标长度，则：

$$L_{\rm sum}=\overline T\,L_{\rm token},\qquad
\overline T=\frac{\sum_iT_i}{B}.$$

因此这两个目标在固定批次上只差正常数，梯度也同倍缩放；不能说它们必有不同最优参数。训练中若每批平均长度变化、另有正则或不同采样，实际更新轨迹仍可能变化。sequence mean 与 token mean 通常改变相对权重，二者梯度范数没有一个通用的“平均长度倍数”。

**再做一个白板例。** 两条长度为 2、8，各自每 token 损失为 1、3。sequence mean 为 2，sequence sum/B 为 13，token mean 为 2.6；后两者相差的倍数恰好是平均长度 5。

**微批次怎样累积？** 每个 microbatch 的 token 均值要按它的有效 token 数加权。累加损失总和再除以全局有效数，或给各微批均值乘相应占比；简单平均不等长微批的均值会改变目标。跨卡时再核对框架是否已经平均梯度。

**不会因为自己早停就少交损失。** SFT 的示范和 EOS 位置是固定的，teacher forcing 仍计算后续标签；模型不能靠提前生成 EOS 逃避剩余 CE。实际回答长度受数据、模型和解码共同影响，不能从 token mean 单独推出必然早停。`,
    },
    {
      id: "math-completion-criteria",
      type: "comparison",
      title: "怎样选择 SFT checkpoint：观察什么，再做什么",
      body: String.raw`SFT 没有一个适用于所有任务的停止公式，也没有通用的最佳 epoch 数。先确定独立验证集、真实生成指标、能力保留要求与计算预算，再按多个 checkpoint 的趋势作选择。

| 观察到的现象 | 优先检查与处理 |
|---|---|
| 训练 loss 降，验证 loss 持续升 | 检查过拟合、重复数据和分布差异，比较更早的 checkpoint |
| 验证 loss 降，但生成格式或任务分数差 | 核对模板、标签与解码，查看真实失败样本 |
| 指令遵循仍未达标 | 可能还需训练或补数据；并非“未达标就必须停止” |
| 新任务改善，原有能力明显下降 | 比较预设保留要求，尝试较早 checkpoint、调整学习率或数据混合 |
| 改善小于预设收益要求或预算耗尽 | 根据既定标准选择已有 checkpoint |

保留集应与训练数据按题目或题族隔离。单个 checkpoint 的一次波动不能自动证明遗忘；既要看多项能力，也要看样本数和不确定性。数据重复多少遍同样应由结果决定，不能把某篇论文的 epoch 数当成规律。

**与 RLHF/DPO 交接。** SFT 常用于初始化 actor，并提供冻结 reference。在一次约定的训练阶段内保持 reference 固定，便于解释相对变化。有些迭代方法会明确更新 reference；这会改变约束基准，但不等于必然无效，也不自动让原偏好数据失去意义。

交接时绑定 checkpoint、tokenizer、chat template、目标 mask 规则与评测配置。若换 reference，应显式定义新阶段并重算相关概率缓存；若换模板，应重新验证输入与生成行为。不要把这些工程选择压成一个看似精确的“继续训练当且仅当”公式。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：可运行的 assistant mask 与隔离 packing",
      body: String.raw`下面用一个很小的 PyTorch 注意力模型完成真实的前向、CE 与更新，只用于观察数据流。ID 是手工教学编号，不是真实 tokenizer 输出；角色和样本边界由数据明确给出。需要安装 PyTorch。

A 的输入由两个 prompt token、三个 assistant 目标组成；B 由一个 prompt token、一个 assistant 目标组成，末尾有 padding。模型显式 shift 一次，展示目标 mask 如何跟着标签移动。

~~~python
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.manual_seed(7)
ids = torch.tensor([1, 2, 3, 4, 5, 6, 7, 0])
segment = torch.tensor([0, 0, 0, 0, 0, 1, 1, -1])
assistant = torch.tensor([0, 0, 1, 1, 1, 0, 1, 0], dtype=torch.bool)
position = torch.tensor([0, 1, 2, 3, 4, 0, 1, 0])

def packed_masks(segment, assistant):
    length = segment.numel()
    valid = segment >= 0
    causal = torch.ones(length, length, dtype=torch.bool).tril()
    same = segment[:, None] == segment[None, :]
    visible = same & causal & valid[:, None] & valid[None, :]
    # pad query 只读自身，防止全 -inf 的 softmax；有效 query 仍看不到 pad。
    visible |= torch.diag(~valid)
    # logits[t] 预测 ids[t+1]：目标、前驱都有效，且不能跨样本。
    target = assistant[1:] & valid[1:] & valid[:-1]
    target &= segment[1:] == segment[:-1]
    return visible, target

class TinyLM(nn.Module):
    def __init__(self):
        super().__init__()
        self.token = nn.Embedding(8, 8)
        self.pos = nn.Embedding(8, 8)
        self.qkv = nn.Linear(8, 24, bias=False)
        self.head = nn.Linear(8, 8, bias=False)

    def forward(self, ids, position, visible):
        x = self.token(ids) + self.pos(position)
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        scores = (q @ k.T) / q.size(-1) ** 0.5
        weights = scores.masked_fill(~visible, float("-inf")).softmax(-1)
        return self.head(weights @ v)

model = TinyLM()
optimizer = torch.optim.SGD(model.parameters(), lr=0.05)
visible, target = packed_masks(segment, assistant)
logits = model(ids, position, visible)
nll = F.cross_entropy(logits[:-1], ids[1:], reduction="none")
assert target.sum().item() == 4
assert not visible[5:7, :5].any()  # B 不读取 A
assert torch.isfinite(logits).all()
loss = nll[target].mean()
optimizer.zero_grad()
loss.backward()
optimizer.step()
print("有效目标:", target.sum().item(), "loss:", loss.item())
~~~

这里手工构造二维可见性适合检查逻辑，真实大模型通常需要框架支持的 attention/varlen 接口，不能把该布尔矩阵直接传给任意模型就假设语义相同。代码只有一层、没有完整残差与归一化，也不是训练配方。

检查顺序是：先打印 token 与角色；再看有效目标是否含结束标记、是否排除 padding；接着验证跨样本注意力和首标签；最后确认 CE 只平均一次。实际 tokenizer 的 assistant mask 还取决于模板支持，应检查真实输出。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：loss 下降还不能证明数据流正确",
      body: String.raw`**把 loss mask 当成断开梯度。** 它只选择直接监督的标签；prompt 仍可经注意力影响回答并收到梯度。

**按 token ID 屏蔽所有 EOS/pad。** 同 ID 不代表同用途，应使用真实长度和角色边界保留回答结束目标。

**只重置位置就以为样本隔离。** position IDs 不控制注意力可见性；label shift 还会在段边界产生另一种串联。

**用聚合名称猜权重。** 先查看到底在哪个轴求和、除以什么。sample mean 不自动代表数据质量更高，token mean 也不保证长回答能力更强。

**声称没训练 EOS 就永远不停。** 缺少直接监督会带来风险，但基座知识和解码配置也决定停止行为。反过来，固定示范的 SFT 也无法靠自己提前生成 EOS 来躲过后续损失。

**用 epoch 或单次 loss 当完成标准。** 需要看独立验证趋势与真实生成。模板变更和 reference 变更应版本化并回归验证，不能分别概括成“必须完整重训”与“永远不能换”。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "SFT 与相邻方法：监督信号从哪里来？",
      body: String.raw`| 方法 | 主要数据 | 学习信号 | 本章之后去哪里 |
|---|---|---|---|
| 预训练 | 广泛文本或多模态序列 | 根据前文预测后续内容 | 08、09 |
| SFT | 请求与示范回答 | 所选目标 token 的 CE | 本章 |
| DPO | 同请求下的偏好对 | 调整相对 reference 的偏好间隔 | 18 |
| RLHF/PPO | 策略采样回答与奖励 | 优势、策略约束与价值学习 | 16 |
| OPD | 学生轨迹与教师反馈 | 所选位置的分布差异 | 19 |
| RS-SFT | 采样后经验证保留的回答 | 对通过轨迹再做 SFT | 21 |

SFT 的示范可以由人工、程序或模型产生，硬标签不等于教师的 argmax：教师也可以采样回答。软标签蒸馏则需要概率分布等更丰富的反馈。

DPO 使用偏好对，提升 chosen 相对 rejected、相对 reference 的间隔，不能无条件说每次都会降低 rejected 的绝对概率。常见流程先有可用的指令模型，再做偏好训练；若已有合适 checkpoint，未必需要额外跑一次 SFT。

instruction tuning 通常强调指令示范，chat tuning 强调对话；alignment 范围更宽，还包含偏好学习和基于奖励的后训练。面试时先说明讨论哪种数据与信号，再展开公式。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：先说监督信号，再说实现边界",
      body: String.raw`**30 秒回答：** “SFT 用示范继续训练下一 token 预测器。我这里选择 assistant-only，用户和工具内容作为上下文，助手目标参与 CE。实现要确保标签只 shift 一次、mask 跟标签对齐、packing 同时隔离注意力和跨段标签，并声明按 token 还是按回答聚合。最终结合验证、真实生成与能力保留选 checkpoint，供后续 RLHF/DPO 使用。”

**为什么不训 prompt？** 这是本章选择的目标范围，与助手负责输出的内容一致；并非所有 SFT 都必须如此，也不表示 prompt 表示没有梯度。

**三种聚合怎样比较？** 先说每个 token 的系数。每条回答等权与每个 token 等权通常不同；固定批次下，sequence sum/B 与 token mean 只差平均有效长度。

**packing 怎么验？** B 不能读取 A，A 的末 logits 不能预测 B 的首 token；重置 position IDs 本身不解决这两件事。

**训多少 epoch？** 由数据量、重复度、任务和验证趋势决定，没有通用数值。示范目标固定，也不能从 token mean 推出必然提前结束。

**模板或 reference 能否变？** 能，但需显式定义变化、重算受影响概率缓存并做生成回归；不把版本兼容问题说成一条永远不能违反的定理。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：SFT 的 loss、mask 与聚合",
      body: "先独立作答，再核对结果、步骤与边界。若题目包含过强前提，也应指出。",
      questions: [
        {
          q: "一条样本 response 的 3 个 token 概率为 0.5、0.4、0.8。写出 seq-sum、seq-mean 两种 loss，并给出第一个 token logits 的梯度结构（词表大小 4，softmax 后 p=(0.1,0.5,0.3,0.1)，真值是第 2 个）。",
          a: String.raw`**结果：** 损失和约 1.832，均值约 0.611。

**步骤：** 分别取负自然对数，得到约 0.693、0.916、0.223，再相加；均值除以三个有效标签。单 token CE 的 logits 梯度是 $p-e$，即 (0.1,-0.5,0.3,0.1)。若对整条序列均值求导，该组还要除以 3。

**得分点：** 有效分母、自然对数、梯度方向、区分单项与聚合后梯度。`,
        },
        {
          q: "batch 两条样本有效长度 2 和 8，各样本每 token NLL 恒为 1 和 3。分别计算 sample-mean、seq-sum/B、token-mean 并解释差异。",
          a: String.raw`**结果：** 依次为 2、13、2.6。

**步骤：** 两条损失和是 2、24。sample mean 算 (1+3)/2；seq-sum/B 算 (2+24)/2；token mean 算 (2+24)/10。

**得分点：** 前者两条回答各占一半；token mean 按 2/10、8/10 加权两条均值。固定本批长度，seq-sum/B 恰好是 token mean 的 5 倍，不能说它们必有不同最优点。`,
        },
        {
          q: "多轮对话 [sys, u1, a1, u2, a2]，长度分别为 10、15、20、18、30。写出 attention_mask 与 loss_mask，并给出有效 token 数（忽略 end token）。",
          a: String.raw`**结果：** 本章 assistant-only 目标有 50 个有效 token。

**步骤：** 目标 mask 依次拼接 10 个 0、15 个 0、20 个 1、18 个 0、30 个 1。无 padding 时二维有效位置标记可以全为 1，但实际 attention 还要施加因果约束，不能让 a1 读取未来的 u2。

**得分点：** 区分有效位置、因果可见性与目标 mask；20+30=50；shift 后 mask 跟随标签，不表示 prompt 的表示没有梯度。`,
        },
        {
          q: "packing 四条样本到一条长 1024 的序列。朴素做法用全 1 attention_mask 为什么错？正确做法是什么？用 token-mean 时分母是什么？",
          a: String.raw`**结果：** 若要求样本独立，普通因果 mask 会让后面的样本读取前面的样本，改变条件上下文。

**步骤：** 用分块因果可见性或真正使用序列边界的 varlen 接口；再屏蔽跨段的 next-token 标签。position reset 仅改变位置编码，不能代替隔离。分母是所有实际参与训练的标签数，而不是 1024。

**得分点：** 说明独立样本假设；同时检查 attention、label shift、padding 与有效分母。`,
        },
        {
          q: "SFT 后训练 loss 继续下降但 MMLU 下降 4 个百分点，下一步该怎么办？为什么不能用 RLHF 后的 checkpoint 当新一轮 DPO 的 reference？",
          a: String.raw`**先纠正前提：** 新一轮 DPO 可以显式选择 RLHF 后的 checkpoint 作为 reference；它改变约束基准，不是理论上禁止。

**处理步骤：** 核对评测口径、样本误差与预设能力保留要求，再比较早期 checkpoint、学习率和数据混合；训练 loss 不能替代保留集。若开启新 reference 阶段，要记录来源并重算相关 log-prob，而不是沿用旧缓存。

**得分点：** 不把 4 个百分点当通用停止阈值；理解能力保留；区分阶段内冻结和阶段间明确更新 reference。`,
        },
      ],
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：从一条样本走到梯度",
      body: "先说明本章采用的目标，再检查问题中是否混淆了直接监督与上下文。",
      questions: [
        {
          q: "为什么 SFT 不训 prompt token？",
          a: "本章采用 assistant-only：训练目标对应助手应生成的内容，prompt 作为条件。全序列目标也是合法选择，不能把不训 prompt 当成 SFT 的普适定义；prompt 表示仍可能经注意力收到梯度。",
        },
        {
          q: "工具调用返回的 observation 要不要进 loss？",
          a: "在本章训练助手的任务中不作为直接标签，但必须作为可读上下文。助手发出的工具调用可以训练；若要模拟环境输出，则是另一个需要明确定义的任务。",
        },
        {
          q: "sample-mean 和 token-mean 的梯度范数为什么不同？",
          a: "二者分配给各 token 的系数不同，梯度向量相加后的方向和范数可能改变，也可能恰好一致。一般不存在固定的平均长度倍率；固定批次上具有该比例关系的是 seq-sum/B 与 token-mean。",
        },
        {
          q: "SFT 与 DPO 的典型顺序？",
          a: "常见流程先得到可用的指令模型，再用偏好对做 DPO。若已有合适模型，可直接从它开始，不必额外训练一轮 SFT；是否适合取决于模型与数据。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "InstructGPT",
      url: "https://arxiv.org/abs/2203.02155",
      evidence: "SFT、奖励模型和 PPO 的阶段划分；不把该论文配方当成通用停止规则",
    },
    {
      label: "LIMA: Less Is More for Alignment",
      url: "https://arxiv.org/abs/2305.11206",
      evidence: "少量高质量示范的实证案例，不代表普适最小数据量",
    },
    {
      label: "Hugging Face TRL — SFTTrainer",
      url: "https://huggingface.co/docs/trl/sft_trainer",
      evidence: "官方文档：数据格式、assistant/completion-only 目标、packing 与工具对话",
    },
    {
      label: "Hugging Face Transformers — Chat templates",
      url: "https://huggingface.co/docs/transformers/chat_templating",
      evidence: "官方文档：模型模板、apply_chat_template 与训练时的生成提示选项",
    },
  ],
};

export default chapter;
