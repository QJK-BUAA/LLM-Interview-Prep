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
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：Attention 不能只会前向",
      body: String.raw`先修：第 05 章 softmax Jacobian 与矩阵反传，第 06 章 LN，第 08 章 token shift 和 mask。学习顺序是完整前向 shape → 缩放与 mask 边界 → Attention 对 Q/K/V 的反向 → 多头参数/FLOPs → Pre/Post-LN Jacobian。面试验收要求从标量 loss 一路写回输入和投影矩阵，并明确“理论 FLOPs”和“实测延迟”不是同一个指标。`,
      links: [
        { label: "多头前向与语言模型目标", sectionId: "derivation", level: "必会" },
        { label: "缩放、mask 与退化行", sectionId: "math-attention-scaling-mask", level: "推导" },
        { label: "Attention 完整反向", sectionId: "math-attention-backward", level: "推导" },
        { label: "参数与 FLOPs", sectionId: "math-transformer-flops", level: "必会" },
        { label: "Pre/Post-LN Jacobian", sectionId: "math-residual-jacobian", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
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

$M$ 是 mask：数学上允许位置加 0，禁止位置加 $-\infty$；有限负数是实现近似，需要与 dtype、kernel 约定一起验证。沿最后一个 key 轴做 softmax：

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
      id: "math-attention-scaling-mask",
      type: "derivation",
      title: "缩放与 Mask：成立假设和全屏蔽边界",
      body: String.raw`**缩放推导。** 单个头 $q,k\in\mathbb R^D$，若每维零均值、单位方差，q 与 k 独立，且不同维的乘积不相关，则：

$$\mathbb E[q^\top k]=0,\quad
\operatorname{Var}(q^\top k)=\sum_{i=1}^D\mathbb E[q_i^2]\mathbb E[k_i^2]=D.$$

所以除以 $\sqrt D$ 后方差约为 1。更一般，在零均值且 q、k 独立时，方差是 $\operatorname{tr}(\Sigma_q\Sigma_k)$；若同一位置的 q/k 相关，还会出现额外项。缩放是稳定尺度的设计，不是任意训练分布下严格单位方差定理。$D=64$、每项方差 1 时未缩放标准差 8，缩放后为 1。

**Mask 是定义支持集。** 对查询 $i$ 的允许键集合 $\mathcal A_i$：

$$A_{ij}=
\begin{cases}
\exp(S_{ij})/\sum_{k\in\mathcal A_i}\exp(S_{ik})&j\in\mathcal A_i\\
0&j\notin\mathcal A_i.
\end{cases}$$

禁止位置不参与分母，也没有分数梯度。先对所有键 softmax 再把禁止项置零会破坏归一化；例如均匀 $[1/2,1/2]$ 遮住第二项后是 $[1/2,0]$，但正确结果为 $[1,0]$。

**边界追问。** 全屏蔽行 $\mathcal A_i=\varnothing$ 的概率分布没有定义。朴素 $-\infty-\max(-\infty)$ 产生 NaN；应使用明确支持返回零行的 kernel 或在计算前跳过无效 query，并排除相应 loss。把所有分数设成同一个有限大负数反而可能得到均匀分布，并非“全零注意力”。只有一个允许 key 时权重恒为 1，对该行 Q/K 的梯度为 0，但 V 仍可获得梯度。`,
    },
    {
      id: "math-attention-backward",
      type: "derivation",
      title: "Attention 反向：从输出到 Q、K、V 和投影权重",
      body: String.raw`**单头维度。** $Q\in\mathbb R^{n_q\times d_k}$，$K\in\mathbb R^{n_k\times d_k}$，$V\in\mathbb R^{n_k\times d_v}$，$S=QK^\top/\sqrt{d_k}$，$A=\operatorname{softmax}_{row}(S+M)$，$O=AV\in\mathbb R^{n_q\times d_v}$。Cross-Attention 不要求 $n_q=n_k$。给定标量目标的上游 $G_O=\partial L/\partial O$：

由 $dO=dA\,V+A\,dV$，先得：

$$G_V=A^\top G_O\in\mathbb R^{n_k\times d_v},\qquad
G_A=G_OV^\top\in\mathbb R^{n_q\times n_k}.$$

每行用 softmax 向量-Jacobian 乘积，令 $c_i=\sum_jA_{ij}(G_A)_{ij}$：

$$G_S=A\odot(G_A-c\mathbf1^\top),\quad
G_Q=\frac{G_SK}{\sqrt{d_k}},\quad
G_K=\frac{G_S^\top Q}{\sqrt{d_k}}.$$

固定 mask 的禁止位置梯度为 0。注意缩放对 Q、K 梯度各出现一次；V 的路径不经过缩放。若 $Q=XW_Q$ 等来自同一 $X$，拆头反向先撤销 transpose/reshape，再用 $\nabla W_Q=X^\top G_Q$；输入梯度为 $G_QW_Q^\top+G_KW_K^\top+G_VW_V^\top$。多头输出投影 $Y=CW_O$ 另给 $\nabla W_O=C^\top G_Y,G_C=G_YW_O^\top$。

**完整手算。** 一条 query、两个 key，$d_k=d_v=2$，$q=[1,0]$，$K=[[0,0],[\sqrt2\log3,0]]$，$V=[[2,0],[0,4]]$，无 mask，损失 $L=O_1+2O_2$：

$$S=[0,\log3],\quad A=[1/4,3/4],\quad O=[1/2,3],\quad L=6.5.$$

上游 $G_O=[1,2]$，所以 $G_A=[2,8]$、$c=6.5$：

$$G_S=[-9/8,9/8],\quad
G_Q=[(9/8)\log3,0],$$

$$G_K=\begin{bmatrix}-9/(8\sqrt2)&0\\9/(8\sqrt2)&0\end{bmatrix},\quad
G_V=\begin{bmatrix}1/4&1/2\\3/4&3/2\end{bmatrix}.$$

对每个 Q/K/V 元素中心差分检查 $L$，可以同时发现漏转置、漏缩放、softmax 轴和错误 mask。**追问：**本推导未加 attention dropout；若 dropout 作用在 A 上，反向先按同一 mask 和保留率处理，再进入 softmax Jacobian，不能直接使用丢弃后的 A 作为原 softmax 概率。`,
    },
    {
      id: "math-transformer-flops",
      type: "derivation",
      title: "MHA 参数与 FLOPs：头数、长度和隐藏维分别影响什么",
      body: String.raw`**计数口径。** 输入 $[B,S,H]$，$N$ 个头、$D=H/N$，标准 MHA 的 Q/K/V/O 均为 $H\times H$，忽略 bias 时参数为 $4H^2$。把一个乘法加一次加法记作 2 FLOPs，不含 softmax、norm、非线性和通信：

$$F_{\rm proj}=4(2BSH^2)=8BSH^2,$$

$$F_{QK^\top}=2BNS^2D=2BS^2H,\quad
F_{AV}=2BS^2H.$$

普通两矩阵 FFN 中间宽度为 $F$，参数 $2HF$，计算 $4BSHF$。若 $F=4H$，单层前向总计约 $24BSH^2+4BS^2H$。反向另有矩阵乘法，不能把前向数直接称为训练总 FLOPs。稠密计数包含被因果 mask 屏蔽的位置；跳过上三角的专用实现可把注意力项接近减半，投影和 FFN 不减半。

**手算。** $B=1,S=128,H=512,N=8,F=2048$：MHA 参数 $1,048,576$，FFN 参数 $2,097,152$；投影 $268,435,456$ FLOPs，QK 与 AV 合计 $33,554,432$，FFN 为 $536,870,912$，合计 $838,860,800$。保持 H 不变改为 16 头，不改变这些主项，但注意力概率张量 $[B,N,S,S]$ 的元素数翻倍，softmax 开销和 kernel 效率也会变。

**追问。** 二次注意力项超过投影+FFN 的长度，在上述普通 FFN/稠密口径下满足 $4BS^2H>24BSH^2$，即 $S>6H$。这只是算术量交点，不是显存或延迟的交点；后两者还依赖 HBM、FlashAttention 与并行策略。`,
    },
    {
      id: "math-residual-jacobian",
      type: "derivation",
      title: "Pre-LN 与 Post-LN：把“梯度直通”写成 Jacobian",
      body: String.raw`**定义。** 对一个 token 的 $x\in\mathbb R^H$，归一化记为 $N$、子层记为 $F$，Jacobian 均采用输出对输入的列向量约定。Pre-LN 是 $y=x+F(N(x))$，Post-LN 是 $y=N(x+F(x))$。链式法则给：

$$J_{\rm pre}=I+J_FJ_N,\qquad
J_{\rm post}=J_N(I+J_F).$$

上游列梯度分别乘这些矩阵的转置。Pre-LN 的反向含不经过 norm 和子层的恒等加项；Post-LN 的每条路径都先被末端 norm 的 Jacobian 变换。不能据此保证 Pre-LN 永不爆炸，因为多层 $I+A_\ell$ 连乘仍可能放大或相消。

对 LN，令 $P=I-\mathbf1\mathbf1^\top/H$，$x_c=Px$，$r=\sqrt{\|x_c\|^2/H+\epsilon}$：

$$J_N=\frac{\operatorname{diag}(\gamma)}r
\left(P-\frac{x_cx_c^\top}{Hr^2}\right).$$

因此 $J_N\mathbf1=0$：共同平移不会改变 LN 输出；$\epsilon=0$ 且非零方差时，径向中心化方向 $x_c$ 也被消去。$\epsilon>0$ 时后者只近似成立。

**数值方向例。** 取 $x=[1,2,3]$、$\gamma=\mathbf1$、$F(u)=0.1u$。沿 $v=[1,1,1]$ 扰动：Pre-LN 中 $N(x+\delta v)=N(x)$，所以 $dy/d\delta=v$；Post-LN 的内部变为 $1.1x+1.1\delta v$，被 LN 去掉共同平移，所以 $dy/d\delta=0$。这展示了梯度通道差异，不是声称 Post-LN 的所有方向都无梯度。

**面试追问。** 深度、残差缩放、初始化、warmup、最后一层 norm 都会影响训练；最终 norm 也会变换 Pre-LN 主干的梯度，因此不能只画一条恒等线就宣称完整模型没有归一化瓶颈。`,
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

若追问缩放原因：在 q/k 独立、各维乘积不相关且单位方差的假设下，点积方差随 D 增长；除以 $\sqrt D$ 控制分数尺度。这不保证实际训练后方差严格为 1，也不意味着 softmax 后所有损失在饱和时都有零梯度。

若追问 Transformer 为什么比 RNN 易并行：训练时每个位置的 QKV 和注意力矩阵可用批量矩阵乘法同时计算，而 RNN 的 $h_t$ 依赖 $h_{t-1}$。代价是标准注意力对序列长度有 $O(S^2)$ 的分数矩阵。

若追问残差的作用：写出 $J_{pre}=I+J_FJ_N$ 与 $J_{post}=J_N(I+J_F)$，展示 Pre-LN 的恒等加项；同时说明连乘仍可放大、最后 norm 仍影响全模型，不能把局部路径当作稳定性证明。

**白板加问。** 给 $G_O$ 后依次写 $G_V=A^\top G_O$、$G_A=G_OV^\top$、逐行 softmax VJP，再写 $G_Q=G_SK/\sqrt D$ 与 $G_K=G_S^\top Q/\sqrt D$。若只剩一个可见 key，Q/K 的本行梯度为零，V 仍有梯度；全屏蔽行则必须另设处理规则。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：Attention 反向与复杂度",
      body: "写出中间变量和维度；边界题不能只回答“加 mask”。",
      questions: [
        {
          q: "q=[1,0]，K=[[0,0],[sqrt(2) log 3,0]]，V=[[2,0],[0,4]]，缩放维度 2，L=O1+2O2。求 Q/K/V 梯度。",
          a: String.raw`分数 $[0,\log3]$，A 为 $[1/4,3/4]$，O 为 $[1/2,3]$。$G_O=[1,2]$，$G_A=[2,8]$，其 A 加权均值为 6.5；故 $G_S=[-9/8,9/8]$。$G_Q=[(9/8)\log3,0]$，$G_K$ 两行为 $[-9/(8\sqrt2),0],[9/(8\sqrt2),0]$；$G_V$ 两行为 $[1/4,1/2],[3/4,3/2]$。**得分点：**softmax 非对角耦合；K 路径转置；Q/K 各一次缩放、V 不缩放。`,
        },
        {
          q: "H=512，S=128，B=1，普通 FFN 宽度 2048。求 MHA 参数和整层主矩阵前向 FLOPs；头数 8 改 16 会翻倍吗？",
          a: String.raw`MHA 参数 $4H^2=1,048,576$。投影 $8BSH^2=268,435,456$；注意力两次乘法 $4BS^2H=33,554,432$；FFN $4BSHF=536,870,912$，总计 838,860,800。固定 H 改头数不翻倍主矩阵 FLOPs，但概率矩阵元素数翻倍。**得分点：**乘加记 2 FLOPs；忽略项与因果稠密口径明确；不把参数量、激活量、运行时间混同。`,
        },
        {
          q: "一行 attention 仅有一个可见 key，或者一个都没有，对前向和 Q/K/V 梯度分别意味着什么？",
          a: String.raw`单 key 时 A=1，softmax 的导数 $1(1-1)=0$，本行对 Q/K 梯度为 0，输出等于该 V，V 接收输出梯度。无可见 key 时分母为空，数学分布未定义；必须显式跳过该 query 或使用约定零行的 kernel，不能对全 $-\infty$ 朴素 softmax。**得分点：**有限大负数不是可靠的全屏蔽处理；loss mask 不自动修复前向 NaN。`,
        },
        {
          q: "证明 Pre-LN 与 Post-LN 的 Jacobian 形式，并给一个能区分它们的扰动方向。",
          a: String.raw`链式法则得 $J_{pre}=I+J_FJ_N$、$J_{post}=J_N(I+J_F)$。LN 满足 $J_N\mathbf1=0$，令 $F(u)=0.1u$，则 Pre-LN 对共同平移方向的导数为 $\mathbf1$，Post-LN 为 0。**得分点：**矩阵乘法顺序；恒等加项不等于全网梯度有界；指出 final norm 仍会影响完整模型。`,
        },
      ],
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
      label: "On Layer Normalization in the Transformer Architecture",
      url: "https://arxiv.org/abs/2002.04745",
      evidence: "Pre-LN/Post-LN 分析论文；本章方向例为教学推导",
    },
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
