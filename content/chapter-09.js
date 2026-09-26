const chapter = {
  id: "09",
  slug: "transformer-forward-pass",
  part: "LLM 主线",
  title: "Transformer 从零到完整前向过程",
  subtitle: "沿着 shape 看懂注意力、残差与语言模型损失",
  level: "核心",
  duration: 130,
  prerequisites: ["01", "05", "08"],
  tags: ["Transformer", "Self-Attention", "Mask", "FFN", "Causal LM"],
  objectives: [
    "手算缩放点积注意力和因果 mask",
    "追踪多头注意力从 [B,S,H] 到 [B,N,S,D] 的 shape",
    "解释残差、归一化和 FFN 的分工",
    "写出 decoder-only 语言模型的完整前向伪代码",
  ],
  summary:
    "Transformer 层先让每个 token 按内容聚合可见位置的信息，再由逐位置 FFN 变换特征；残差和归一化稳定深层堆叠，因果损失把整段序列变成并行训练样本。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：查询、索引与内容",
      body: String.raw`自注意力可以类比一次可微分检索。当前位置生成 query，表示“我现在需要什么”；每个可见位置生成 key，表示“我能被怎样匹配”；同一位置还生成 value，表示“匹配后真正取走什么信息”。query 与 key 的点积给出相关分数，softmax 把分数变成权重，再对 value 加权求和。

Q、K、V 来自同一隐藏状态的不同线性投影，因此“查什么”“如何被找到”“提供什么”可以分别学习。Self-Attention 表示查询与被检索内容来自同一序列；Cross-Attention 则让查询来自一条序列，键值来自另一条序列。

注意力负责 token 之间的信息混合，FFN（Feed-Forward Network）负责每个 token 内部的特征变换。同一 FFN 参数独立应用于所有位置，不直接跨位置通信。两者交替堆叠后，信息既能沿序列传播，也能在隐藏维上重组。

decoder-only 语言模型还必须保持因果性：预测第 $s$ 个位置的下一个 token 时，只能读取位置 $0$ 到 $s$。训练时虽然所有位置可并行计算，但上三角 mask 保证每行没有偷看未来答案。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：两个 token 的注意力",
      body: String.raw`设只有两个 token，每个头维度 $D=2$。第二个位置的 query 为 $q_2=[1,1]$，两个 key 分别为 $k_1=[1,0]$、$k_2=[0,2]$，value 为 $v_1=[2,0]$、$v_2=[0,3]$。

未缩放点积为：

$$q_2k_1^\top=1,\qquad q_2k_2^\top=2$$

除以 $\sqrt D=\sqrt2$ 后，分数约为 $[0.707,1.414]$。softmax 先指数化再归一化：

$$a=\operatorname{softmax}([0.707,1.414])\approx[0.330,0.670]$$

输出是 value 的加权和：

$$o_2=0.330[2,0]+0.670[0,3]\approx[0.660,2.010]$$

第一个位置若使用因果 mask，只允许看 $k_1$，对 $k_2$ 的分数加负无穷，softmax 后权重变成 $[1,0]$。mask 是在 softmax 前改分数，不是计算完输出后再删除未来信息。

为什么除以 $\sqrt D$？若 q、k 各维近似零均值、单位方差，点积是 $D$ 项之和，方差约为 $D$。缩放后方差回到约 1，避免 softmax 在大维度下过早饱和。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "一个 Pre-LN Transformer 块",
      body: String.raw`现代 decoder-only 模型常采用 Pre-LN：隐藏状态先归一化，再进入注意力，输出与原残差相加；随后再次归一化、经过 FFN，再做第二次残差相加。

设输入 $X$ 为 $[B,S,H]$。归一化不改 shape；Q、K、V 投影后仍可看作 $[B,S,H]$，拆头并转轴得到 $[B,N,S,D]$，其中 $H=N\times D$。注意力分数是 $[B,N,S,S]$，加权 value 后回到 $[B,N,S,D]$，合并头恢复 $[B,S,H]$。

残差相加要求两侧 shape 完全一致，所以注意力输出投影必须回到 $H$。FFN 通常先从 $H$ 扩展到中间宽度 $F$，经过激活再压回 $H$，从而也能接回残差主干。`,
      diagram: {
        kind: "flow",
        nodes: [
          "X [B,S,H]",
          "Norm + Attention",
          "残差 X + A",
          "Norm + FFN",
          "残差输出 [B,S,H]",
          "LM Head [B,S,V]",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "多头注意力与因果语言模型目标",
      body: String.raw`输入 $X\in\mathbb{R}^{B\times S\times H}$，头数为 $N$，每头维度 $D=H/N$。三个投影为：

$$Q=XW_Q,\quad K=XW_K,\quad V=XW_V$$

$W_Q,W_K,W_V\in\mathbb{R}^{H\times H}$。拆头后 $Q,K,V\in\mathbb{R}^{B\times N\times S\times D}$。交换 K 的最后两轴并相乘：

$$Z=\frac{QK^\top}{\sqrt D}+M
\quad\in\mathbb{R}^{B\times N\times S\times S}$$

$M$ 是 mask：允许位置加 0，禁止位置加一个足够大的负数。沿最后一个 key 轴做 softmax：

$$A_{b,n,i,j}=
\frac{\exp Z_{b,n,i,j}}{\sum_{k=1}^{S}\exp Z_{b,n,i,k}}$$

再聚合 value：

$$O=AV\in\mathbb{R}^{B\times N\times S\times D}$$

转回 $[B,S,N,D]$ 并合并后乘输出矩阵 $W_O\in\mathbb{R}^{H\times H}$。多头不是重复做相同事情；每个头拥有不同投影，可学习不同匹配子空间。

最后隐藏状态经 LM head 得到 logits $Z^{\text{vocab}}\in\mathbb{R}^{B\times S\times V}$。序列 $x_0,\ldots,x_{S-1}$ 的 next-token loss 为：

$$L=-\frac{1}{S-1}\sum_{s=0}^{S-2}
\log p_\theta(x_{s+1}\mid x_{\le s})$$

输入位置 $s$ 的输出预测标签位置 $s+1$。整段可以并行，是因为所有前缀都已在训练样本中给出；推理时下一个 token 尚不存在，所以仍需逐步生成。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：紧凑的 decoder block 伪代码",
      body: String.raw`下面省略 bias、dropout 与设备细节，但保留关键 shape。transpose 后必须在合并头前换回序列轴，否则元素数虽正确，语义却错位。

~~~python
def decoder_block(x, attention_mask, parameters):
    # x: [B, S, H], H = N * D
    residual = x
    x_norm = rms_norm(x, parameters.norm1)

    q = linear(x_norm, parameters.wq)  # [B, S, H]
    k = linear(x_norm, parameters.wk)
    v = linear(x_norm, parameters.wv)

    q = split_heads(q)  # [B, N, S, D]
    k = split_heads(k)
    v = split_heads(v)

    scores = matmul(q, transpose_last_two(k)) / sqrt(q.shape[-1])
    scores = scores + causal_mask(scores) + attention_mask
    weights = softmax(scores, axis=-1)
    context = matmul(weights, v)  # [B, N, S, D]

    context = merge_heads(context)  # [B, S, H]
    x = residual + linear(context, parameters.wo)

    residual = x
    x = residual + ffn(rms_norm(x, parameters.norm2), parameters.ffn)
    return x
~~~

完整模型在 token embedding 后循环多个 block，做最终 norm 与 LM head。训练代码还要把 labels 左移、屏蔽 padding，并使用数值稳定的 cross-entropy，而不是先显式算 softmax 再取对数。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：注意力图不是完整解释",
      body: String.raw`**误区一：softmax 作用在任意轴都一样。** 每个 query 要在可见 key 上归一化，所以应沿最后的 key 轴。沿 query 轴归一化会改变语义。

**误区二：因果 mask 与 padding mask 二选一。** 前者阻止看未来，后者阻止读取补位；变长 decoder batch 通常需要同时使用。

**误区三：多头会把参数量乘头数。** 标准实现保持总隐藏维 $H$ 不变，只把它拆成 $N$ 个 $D$ 维头；QKV 投影总规模主要由 $H$ 决定。

**误区四：Attention 层包含全部模型能力。** FFN 往往占大量参数并进行逐 token 特征变换，embedding、归一化、残差和训练数据同样关键。

**误区五：训练能并行就表示生成也能并行。** teacher forcing 时未来标签已知，可一次计算所有位置；自回归推理必须先生成 $x_t$ 才能构造下一步输入。

**误区六：观察高注意力权重就能证明因果解释。** 权重只描述某一层某一头的 value 混合，输出投影、残差和后续层都会改变结果。它是诊断信号，不是充分的因果归因。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "编码器、解码器与交叉注意力",
      body: String.raw`| 结构 | 自注意力可见范围 | 常见目标 | 典型用途 |
|---|---|---|---|
| Encoder-only | 通常双向 | masked token、分类 | 理解与表示 |
| Decoder-only | 严格因果 | next-token prediction | 通用生成式 LLM |
| Encoder-decoder | 编码器双向，解码器因果 | 条件生成 | 翻译、摘要 |
| Prefix LM | 前缀双向，生成段因果 | 条件续写 | 特定生成设置 |

Self-Attention 中 Q、K、V 都来自同一序列。Cross-Attention 中 decoder 隐藏状态产生 Q，encoder 输出产生 K、V，因此分数 shape 可为 $[B,N,S_{\text{target}},S_{\text{source}}]$，两个序列轴长度不必相等。

Post-LN 在子层与残差相加后归一化，原始 Transformer 使用此形式；Pre-LN 在子层前归一化，为残差主干提供更直接的梯度路径，深层训练通常更稳定。架构选择还会影响初始化、最终 norm 与训练动力学，不能只移动一行代码而不重新验证。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：完整说清一次 Attention",
      body: String.raw`**30 秒回答：**“输入 $[B,S,H]$ 经三个线性层得到 Q、K、V，再拆成 $[B,N,S,D]$。Q 与 K 转置相乘并除以 $\sqrt D$，得到 $[B,N,S,S]$ 的分数；加入因果和 padding mask，沿 key 轴 softmax，再乘 V。各头合并回 $[B,S,H]$，经输出投影与残差相加。”

若追问缩放原因：独立单位方差分量的点积方差随 $D$ 增长，softmax 会变得极尖、梯度变小；除以 $\sqrt D$ 使分数尺度更稳定。

若追问 Transformer 为什么比 RNN 易并行：训练时每个位置的 QKV 和注意力矩阵可用批量矩阵乘法同时计算，而 RNN 的 $h_t$ 依赖 $h_{t-1}$。代价是标准注意力对序列长度有 $O(S^2)$ 的分数矩阵。

若追问残差的作用：它保留恒等信息通路，让子层只需学习增量，也为反向梯度提供短路径；归一化则控制特征尺度，二者不是同一机制。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：沿 shape 复述 Transformer",
      body: "每题先标注 B、S、H、N、D 的含义，再回答。",
      questions: [
        {
          q: "X=[2,128,512]，8 个头时，拆头后的 Q 和注意力分数 shape 各是什么？",
          a: "每头 D=64，Q 为 [2,8,128,64]，QK 转置相乘后的分数为 [2,8,128,128]。",
        },
        {
          q: "为什么因果模型训练时能一次处理整个序列，却不能一次生成整个答案？",
          a: "训练时所有真实前缀 token 已给出，mask 保证每个位置只读过去；生成时未来 token 尚未知，必须把上一步采样结果加入上下文后继续。",
        },
        {
          q: "FFN 为什么仍然重要，它是否混合不同 token？",
          a: "FFN 对每个 token 独立做非线性特征变换，通常占大量参数；它本身不跨 token，跨位置通信由注意力承担。",
        },
        {
          q: "padding mask 应该在 softmax 前还是后应用？为什么？",
          a: "在 softmax 前把禁止位置分数设为负无穷，使其概率为零且剩余位置重新归一化；事后置零会让总权重不再为一。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      evidence: "Transformer 原始论文",
    },
    {
      label: "The Annotated Transformer",
      url: "https://nlp.seas.harvard.edu/annotated-transformer/",
      evidence: "教学实现",
    },
    {
      label: "Language Models are Few-Shot Learners",
      url: "https://arxiv.org/abs/2005.14165",
      evidence: "decoder-only 语言模型技术论文",
    },
  ],
};

export default chapter;
