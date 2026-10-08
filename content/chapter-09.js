const chapter = {
  id: "09",
  slug: "transformer-forward-pass",
  part: "LLM 主线",
  title: "Transformer 从零到完整前向过程",
  subtitle: "沿着 shape 看懂注意力、残差与语言模型损失",
  level: "核心",
  duration: 150,
  prerequisites: ["01", "05", "06", "08"],
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
      body: String.raw`读到“机器学习”后要预测下一片段，模型应当怎样从已有的两个位置取信息？第 08 章已经给出了输入向量和预测目标，但还没有解释上下文如何进入当前表示。我们现在让当前位置比较可见的历史，再按匹配程度取回内容，同时禁止它偷看训练样本中已经写好的未来答案。

为此，每个位置产生三种向量：query 表示当前要查什么，key 用于与查询匹配，value 是匹配后取走的内容。query 与 key 的点积得到分数，softmax 把分数变成权重，再加权求和 value。把三者记作 Q、K、V，它们来自隐藏状态的不同线性投影，因而匹配规则和内容表示可以分别学习。

下面先手算两个位置的混合比例，再扩展到多头和多层。Self-Attention 的查询与内容来自同一序列，Cross-Attention 则从另一序列取内容。注意力只负责跨位置混合；随后逐位置的 FFN（Feed-Forward Network）用共享参数变换特征，残差保留原输入，归一化控制子层尺度。这些部分接起来才是一层 Transformer。

decoder-only 语言模型还必须保持因果性：预测第 $s$ 个位置的下一个 token 时，只能读取位置 $0$ 到 $s$。训练时所有前缀已知，因此可以并行处理各行，但每行的可见范围不同。接下来所有 shape、梯度和计算量，都围绕这次“合法地读取上下文并预测下一项”的任务展开。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：两个 token 的注意力",
      body: String.raw`第二个位置应该从第一个位置取多少内容，又保留多少来自自身的内容？我们先指定两组容易手算的匹配向量和值，不把坐标冒充真实词义，单独观察“打分、归一化、取内容”这三个步骤。

设只有两个 token，每个头维度 $D=2$。第二个位置的 query 为 $q_2=[1,1]$，两个 key 分别为 $k_1=[1,0]$、$k_2=[0,2]$，value 为 $v_1=[2,0]$、$v_2=[0,3]$。

未缩放点积为：

$$q_2k_1^\top=1,\qquad q_2k_2^\top=2$$

除以 $\sqrt D=\sqrt2$ 后，分数约为 $[0.707,1.414]$。softmax 先指数化再归一化：

$$a=\operatorname{softmax}([0.707,1.414])\approx[0.330,0.670]$$

输出是 value 的加权和：

$$o_2=0.330[2,0]+0.670[0,3]\approx[0.660,2.010]$$

输出约 [0.660,2.010]，是两份 value 的混合，不是 key 的平均，也不是下一 token 的概率；还要经过输出投影和后续网络才能到分类头。第一个位置若使用因果 mask，只允许看 $k_1$，对 $k_2$ 的分数加负无穷，softmax 后权重变成 $[1,0]$。mask 是在 softmax 前改分数，不是计算完输出后再删除未来信息。

为什么除以 $\sqrt D$？若 q、k 各维近似零均值、单位方差，点积是 $D$ 项之和，在独立性条件下方差约为 $D$。缩放后方差回到约 1，避免 softmax 在大维度下过早饱和。先记住这个尺度问题，下面在完整前向之后再证明条件；同时检验只剩一个可见位置、甚至一个都没有时应怎么办。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从一次上下文读取到完整训练",
      body: String.raw`两个位置的混合已经算出，怎样把它变成可训练、可堆叠的语言模型层？先沿图把单头扩展成多头并接到下一 token 损失，再检查这次前向依赖的缩放和可见范围，随后将同一损失反传到查询、键、值及投影参数。

反向复用第 05 章的矩阵求导和 softmax 耦合；标签错位与有效位置沿用第 08 章。算通一层以后，才统计长度、头数和隐藏维分别增加哪些资源，最后借第 06 章的 LN 导数解释残差布局为何影响深层梯度。数值例用来检查机制，FLOPs 用来估算算术工作量，两者都不冒充实测延迟。`,
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
      body: String.raw`刚才只算了一个查询的一次读取。怎样让一批句子的所有位置同时做这件事，再用每个位置的结果预测下一 token？我们保持“一个查询在可见键上归一化”的含义不变，只增加 batch、头和序列轴。

输入 $X\in\mathbb{R}^{B\times S\times H}$，B 是样本数，S 是序列长度，H 是每个位置的隐藏宽度；头数为 $N$，每头维度 $D=H/N$。三个投影为：

$$Q=XW_Q,\quad K=XW_K,\quad V=XW_V$$

$W_Q,W_K,W_V\in\mathbb{R}^{H\times H}$。拆头后 $Q,K,V\in\mathbb{R}^{B\times N\times S\times D}$。交换 K 的最后两轴并相乘：

$$Z=\frac{QK^\top}{\sqrt D}+M
\quad\in\mathbb{R}^{B\times N\times S\times S}$$

$M$ 是 mask：数学上允许位置加 0，禁止位置加 $-\infty$；有限负数是实现近似，需要与 dtype、kernel 约定一起验证。沿最后一个 key 轴做 softmax：

$$A_{b,n,i,j}=
\frac{\exp Z_{b,n,i,j}}{\sum_{k=1}^{S}\exp Z_{b,n,i,k}}$$

每行分母只遍历键的位置，不跨查询、头或样本相加。因此得到的是当前查询自己的读取比例。再按这个比例聚合 value：

$$O=AV\in\mathbb{R}^{B\times N\times S\times D}$$

转回 $[B,S,N,D]$ 并合并后乘输出矩阵 $W_O\in\mathbb{R}^{H\times H}$。多头不是重复做相同事情；每个头拥有不同投影，可学习不同匹配子空间。

投影后的注意力结果与残差相加，再经过图中的归一化、逐位置 FFN 和第二次残差，保持原隐藏维；堆叠多个块并做最终归一化后，才到 LM head。其 logits 为 $Z^{\text{vocab}}\in\mathbb{R}^{B\times S\times V}$，这里 V 表示词表大小，不是前面的 value 张量。对一条无 padding 的序列 $x_0,\ldots,x_{S-1}$，next-token loss 为：

$$L=-\frac{1}{S-1}\sum_{s=0}^{S-2}
\log p_\theta(x_{s+1}\mid x_{\le s})$$

输入位置 $s$ 的输出预测标签位置 $s+1$。沿用两 token、单头、二维例，分数矩阵有两行两列，但若没有额外后继标签，损失只有第一个位置预测第二个 token 这一项。假设分类头给该真实 token 的概率为 1/2，本例损失就是 log 2，约 0.6931；注意力输出 [0.660,2.010] 本身并不是这个概率。

整段可以并行，是因为所有前缀都已在训练样本中给出；推理时下一个 token 尚不存在，所以仍需逐步生成。变长 batch 要沿用第 08 章的有效标签分母。下一节检查分数缩放与 mask，确认这条前向既有稳定尺度，也没有读取不该看的位置。`,
    },
    {
      id: "math-attention-scaling-mask",
      type: "derivation",
      title: "缩放与 Mask：成立假设和全屏蔽边界",
      body: String.raw`把刚才的二维头扩到 64 维，匹配分数会不会仅因维度增加就变得极端？把未来位置屏蔽后，剩余权重又是否仍是一份合法分布？这两个检查都发生在取回 value 之前，分别约束分数尺度和可见支持集。

单个头的查询和键为 $q,k\in\mathbb R^D$，若每维零均值、单位方差，q 与 k 独立，且不同维的乘积不相关，则展开点积的方差时交叉项消失：

$$\mathbb E[q^\top k]=0,\quad
\operatorname{Var}(q^\top k)=\sum_{i=1}^D\mathbb E[q_i^2]\mathbb E[k_i^2]=D.$$

所以除以 $\sqrt D$ 后方差约为 1。更一般，在零均值且 q、k 独立时，方差是 $\operatorname{tr}(\Sigma_q\Sigma_k)$；若同一位置的 q/k 相关，还会出现额外项。缩放是稳定尺度的设计，不是任意训练分布下严格单位方差定理。$D=64$、每项方差 1 时未缩放标准差 8，缩放后为 1。

缩放只改变分数幅度，不能限制可见位置。要排除未来或 padding，必须在归一化的求和范围中删除它们。对查询 $i$ 的允许键集合 $\mathcal A_i$，把未加 mask 的缩放分数记为 $S_{ij}$：

$$A_{ij}=
\begin{cases}
\exp(S_{ij})/\sum_{k\in\mathcal A_i}\exp(S_{ik})&j\in\mathcal A_i\\
0&j\notin\mathcal A_i.
\end{cases}$$

禁止位置不参与分母，也没有分数梯度。先对所有键 softmax 再把禁止项置零会破坏归一化；例如均匀 $[1/2,1/2]$ 遮住第二项后是 $[1/2,0]$，但正确结果为 $[1,0]$。

例中的 [1/2,0] 会把唯一合法 value 错误缩小一半；正确的 [1,0] 才表示完整读取它。这不是微小数值误差，而是归一化对象改变了。

全屏蔽行 $\mathcal A_i=\varnothing$ 的概率分布没有定义。朴素 $-\infty-\max(-\infty)$ 产生 NaN；应使用明确支持返回零行的 kernel 或在计算前跳过无效 query，并排除相应 loss。把所有分数设成同一个有限大负数反而可能得到均匀分布，并非“全零注意力”。只有一个允许 key 时权重恒为 1，对该行 Q/K 的梯度为 0，但 V 仍可获得梯度。下一节把这一判断写进完整反向，检验匹配参数与内容参数为何收到不同信号。`,
    },
    {
      id: "math-attention-backward",
      type: "derivation",
      title: "Attention 反向：从输出到 Q、K、V 和投影权重",
      body: String.raw`如果损失要求改变读取结果，模型应该修改所读的内容，还是修改从哪里读取的比例？两条路都可能需要。我们把误差先拆到 value 与注意力权重，再沿 softmax 和点积回到查询、键，最后回到生成它们的投影矩阵。

**先分开两条反馈。** 假设只读两个 value：第一份是 (2,0)，第二份是 (0,4)，读取比例分别为 1/4、3/4。输出就是 (1/2,3)。取损失为“第一维加两倍第二维”，得到 6.5，上游反馈为 (1,2)。

改变 value 时，反馈按读取比例分配：第一份收到 (1/4,1/2)，第二份收到 (3/4,3/2)。改变读取比例时，则要问各份内容对损失贡献多大，答案是 2 和 8。后者还要经过 softmax，才能变成打分的梯度。

**给各张表标上尺寸。** Q 每行是一条查询，K 每行是一条键；它们有相同的匹配维度。V 与 K 行数相同，每行放可取回的内容。查询数和键数可以不同。下面用 $n_q,n_k$ 表示这两个行数，$d_k,d_v$ 表示匹配和内容宽度。

前向依次产生分数 S、读取比例 A、输出 O：

$$S=QK^\top/\sqrt{d_k},\qquad
A=\operatorname{softmax}_{row}(S+M),\qquad O=AV.$$

M 是固定 mask。用 $G_O=\partial L/\partial O$ 表示输出收到的反馈，形状与 O 一样。

由 $dO=dA\,V+A\,dV$，先得：

$$G_V=A^\top G_O\in\mathbb R^{n_k\times d_v},\qquad
G_A=G_OV^\top\in\mathbb R^{n_q\times n_k}.$$

第一式把输出误差按读取比例分给 value；第二式询问提高某个读取权重会怎样改变损失。读取比例彼此耦合，因此每行用第 05 章的 softmax 向量-Jacobian 乘积，令 $c_i=\sum_jA_{ij}(G_A)_{ij}$：

$$G_S=A\odot(G_A-c\mathbf1^\top),\quad
G_Q=\frac{G_SK}{\sqrt{d_k}},\quad
G_K=\frac{G_S^\top Q}{\sqrt{d_k}}.$$

固定 mask 的禁止位置梯度为 0。缩放对 Q、K 梯度各出现一次；V 的路径不经过缩放。

要构造开头的 1/4、3/4 读取比例，可以让两个匹配分数分别为 0、log 3。下面补出一组满足条件的查询和键。

**补全开头的 Q/K 手算。** 一条 query、两个 key，匹配和内容宽度均为 2。取 $q=[1,0]$、$K=[[0,0],[\sqrt2\log3,0]]$，V 和损失沿用开头，无 mask：

$$S=[0,\log3],\quad A=[1/4,3/4],\quad O=[1/2,3],\quad L=6.5.$$

上游 $G_O=[1,2]$，所以 $G_A=[2,8]$、$c=6.5$：

$$G_S=[-9/8,9/8],\quad
G_Q=[(9/8)\log3,0],$$

$$G_K=\begin{bmatrix}-9/(8\sqrt2)&0\\9/(8\sqrt2)&0\end{bmatrix},\quad
G_V=\begin{bmatrix}1/4&1/2\\3/4&3/2\end{bmatrix}.$$

第二份 value 对这个损失的贡献更大，所以其分数梯度为正；沿负梯度更新会降低读取它的比例。同时它仍收到较大的 value 梯度，因为当前有四分之三权重读它。两条路径回答的是不同问题。

**回访：再传给投影参数。** 若 Q、K、V 来自同一输入 X 的三组投影，先撤销拆头的 transpose/reshape，再用第 01 章矩阵反传。例如 $\nabla W_Q=X^\top G_Q$，三条输入路径要相加：

$$\nabla_XL=G_QW_Q^\top+G_KW_K^\top+G_VW_V^\top.$$

多头拼接结果 C 还会经过输出投影 $Y=CW_O$，另有 $\nabla W_O=C^\top G_Y$ 和 $G_C=G_YW_O^\top$。

对每个 Q/K/V 元素做中心差分，可以检查转置、缩放和 softmax 轴。本推导未加 attention dropout；若使用它，先按前向相同的 mask 和保留率反传，再进入 softmax，不能把丢弃后的 A 当作原 softmax 概率。下一节再统计计算成本。`,
    },
    {
      id: "math-transformer-flops",
      type: "derivation",
      title: "MHA 参数与 FLOPs：头数、长度和隐藏维分别影响什么",
      body: String.raw`把头数从 8 增到 16，会不会让这一层的参数和计算都翻倍？答案取决于总隐藏宽度是否也增加。我们固定隐藏宽度，沿刚才的投影、匹配、内容聚合和 FFN 分别计数，区分参数、运算和中间张量三笔账。

输入 $[B,S,H]$，$N$ 个头、$D=H/N$，标准 MHA 的 Q/K/V/O 均为 $H\times H$，忽略 bias 时参数为 $4H^2$。把一个乘法加一次加法记作 2 FLOPs，不含 softmax、norm、非线性和通信：

$$F_{\rm proj}=4(2BSH^2)=8BSH^2,$$

$$F_{QK^\top}=2BNS^2D=2BS^2H,\quad
F_{AV}=2BS^2H.$$

注意力两次乘法中的头数与每头宽度相乘后恰好回到 H，这就是固定总宽度时主算术量不随头数翻倍的原因。普通两矩阵 FFN 中间宽度为 $F$，参数 $2HF$，计算 $4BSHF$。若 $F=4H$，单层前向总计约 $24BSH^2+4BS^2H$。反向另有矩阵乘法，不能把前向数直接称为训练总 FLOPs。稠密计数包含被因果 mask 屏蔽的位置；跳过上三角的专用实现可把注意力项接近减半，投影和 FFN 不减半。

**手算。** $B=1,S=128,H=512,N=8,F=2048$：MHA 参数 $1,048,576$，FFN 参数 $2,097,152$；投影 $268,435,456$ FLOPs，QK 与 AV 合计 $33,554,432$，FFN 为 $536,870,912$，合计 $838,860,800$。保持 H 不变改为 16 头，不改变这些主项，但注意力概率张量 $[B,N,S,S]$ 的元素数翻倍，softmax 开销和 kernel 效率也会变。

本例总计约 8.39 亿 FLOPs，其中 FFN 占大部分，说明在这个短序列设置下，不能只优化注意力点积就期待整层同比加速。二次注意力项超过投影+FFN 的长度，在上述普通 FFN/稠密口径下满足 $4BS^2H>24BSH^2$，即 $S>6H$。这只是算术量交点，不是显存或延迟的交点；后两者还依赖 HBM、FlashAttention 与并行策略。第 11 章会继续算系统账单；本章最后先解决堆深这些层时梯度走哪条路的问题。`,
    },
    {
      id: "math-residual-jacobian",
      type: "derivation",
      title: "Pre-LN 与 Post-LN：把“梯度直通”写成 Jacobian",
      body: String.raw`同样有残差连接，为什么把归一化放在子层前面或后面，会改变深层误差的传播？我们挑一个可直接检验的变化：给所有输入坐标加上同一个小量，观察这份变化能否沿残差到达输出。

对一个 token 的 $x\in\mathbb R^H$，归一化记为 $N$、子层记为 $F$，Jacobian 均采用输出对输入的列向量约定。Pre-LN 是 $y=x+F(N(x))$，Post-LN 是 $y=N(x+F(x))$。链式法则给：

$$J_{\rm pre}=I+J_FJ_N,\qquad
J_{\rm post}=J_N(I+J_F).$$

上游列梯度分别乘这些矩阵的转置。Pre-LN 的反向含不经过 norm 和子层的恒等加项；Post-LN 的每条路径都先被末端 norm 的 Jacobian 变换。不能据此保证 Pre-LN 永不爆炸，因为多层 $I+A_\ell$ 连乘仍可能放大或相消。

对 LN，令 $P=I-\mathbf1\mathbf1^\top/H$，$x_c=Px$，$r=\sqrt{\|x_c\|^2/H+\epsilon}$：

$$J_N=\frac{\operatorname{diag}(\gamma)}r
\left(P-\frac{x_cx_c^\top}{Hr^2}\right).$$

括号里的 P 先去掉共同均值方向，第二项再扣除尺度变化的影响，这与第 06 章 LN 反向的两项修正一致。因此 $J_N\mathbf1=0$：共同平移不会改变 LN 输出；$\epsilon=0$ 且非零方差时，径向中心化方向 $x_c$ 也被消去。$\epsilon>0$ 时后者只近似成立。

**数值方向例。** 取 $x=[1,2,3]$、$\gamma=\mathbf1$、$F(u)=0.1u$。沿 $v=[1,1,1]$ 扰动：Pre-LN 中 $N(x+\delta v)=N(x)$，所以 $dy/d\delta=v$；Post-LN 的内部变为 $1.1x+1.1\delta v$，被 LN 去掉共同平移，所以 $dy/d\delta=0$。这展示了梯度通道差异，不是声称 Post-LN 的所有方向都无梯度。

这个方向上一个结果是 [1,1,1]，另一个是 [0,0,0]，差别来自归一化是否位于每条路径上，而不是参数量不同。深度、残差缩放、初始化、warmup、最后一层 norm 都会影响训练；最终 norm 也会变换 Pre-LN 主干的梯度，因此不能只画一条恒等线就宣称完整模型没有归一化瓶颈。至此从上下文读取、合法预测到反向与堆叠的链条已经闭合；下一章的现代组件都应在这条链上指出自己改了哪个位置。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从二值 mask 到完整 decoder-only 前向",
      body: String.raw`接第 08 章的 input_ids 和 0/1 attention_mask，两者都是 $[B,S]$。本例使用绝对位置 embedding 与 Pre-LN；第 10 章再讨论 RoPE 和 RMSNorm。下面省略训练循环与缓存，保留整网前向、全屏蔽行约定和一次标签错位。

model 持有 token_embedding、position_embedding、blocks、final_norm、lm_head。每个 block 的 norm1/norm2 是 LayerNorm，qkv 是 $H\to3H$ 线性层，wo 是 $H\to H$，ffn 是 $H\to F\to H$ 的逐位置非线性网络，num_heads 为头数；这些都是通常的 PyTorch 模块。位置表需覆盖本次有效长度。transpose 后先换回序列轴再 reshape，不能只凭元素数合并头。

~~~python
import math
import torch
import torch.nn.functional as F

def attention_weights(scores, key_mask):
    # scores: [B, N, S, S]; key_mask: bool [B, S]
    S = scores.shape[-1]
    causal = torch.ones(S, S, dtype=torch.bool,
                        device=scores.device).tril()
    allowed = (causal[None, None, :, :]
               & key_mask[:, None, None, :]
               & key_mask[:, None, :, None])
    has_key = allowed.any(dim=-1, keepdim=True)
    masked = scores.float().masked_fill(~allowed, -torch.inf)
    # 全屏蔽 query 先设有限分数，softmax 后明确置零。
    safe = torch.where(has_key, masked, torch.zeros_like(masked))
    return safe.softmax(dim=-1).masked_fill(~allowed, 0)

def decoder_block(x, key_mask, parameters):
    B, S, H = x.shape
    N = parameters.num_heads
    assert H % N == 0
    D = H // N
    q, k, v = parameters.qkv(parameters.norm1(x)).chunk(3, dim=-1)
    q, k, v = [z.reshape(B, S, N, D).transpose(1, 2)
               for z in (q, k, v)]
    scores = q.float() @ k.float().transpose(-2, -1) / math.sqrt(D)
    weights = attention_weights(scores, key_mask)
    context = (weights @ v.float()).to(x.dtype)
    context = context.transpose(1, 2).reshape(B, S, H)
    x = x + parameters.wo(context)
    x = x + parameters.ffn(parameters.norm2(x))
    return x.masked_fill(~key_mask[:, :, None], 0)

def decoder_lm(input_ids, attention_mask, model):
    assert input_ids.shape == attention_mask.shape
    assert torch.all((attention_mask == 0) | (attention_mask == 1))
    key_mask = attention_mask.bool()
    # 左/右 padding 下，有效 token 的位置都从 0 开始。
    positions = (key_mask.long().cumsum(dim=-1) - 1).clamp_min(0)
    x = model.token_embedding(input_ids) + model.position_embedding(positions)
    x = x.masked_fill(~key_mask[:, :, None], 0)
    for block in model.blocks:
        x = decoder_block(x, key_mask, block)
    return model.lm_head(model.final_norm(x))  # [B, S, V]

def next_token_loss(logits, labels, attention_mask):
    # labels 与 input_ids 原始对齐；不计分标签可预先设为 -100。
    targets = labels[:, 1:]  # 只在这里 shift 一次
    valid = (attention_mask[:, :-1].bool()
             & attention_mask[:, 1:].bool() & (targets != -100))
    if not valid.any():
        return None  # 无有效标签，本 batch 跳过更新
    return F.cross_entropy(logits[:, :-1][valid].float(),
                           targets[valid], reduction="mean")

# labels = input_ids.clone()；按任务将 prompt/pad 标签设为 -100
# logits = decoder_lm(input_ids, attention_mask, model)
# loss = next_token_loss(logits, labels, attention_mask)
~~~

二值 mask 通过扩轴和布尔选择，把禁止分数变为负无穷；不能直接把 1/0 加到 scores。两键分数都为 0、mask=[1,0] 时，直接相加仍给 pad 约 0.269 的概率，本例则给 [1,0]。padding query 的整行权重按约定为零，避免依赖 loss mask 去“清除”前向 NaN。

对于 [BOS,A,B,EOS,PAD]，有效配对为 BOS→A、A→B、B→EOS，共三个标签。左 padding 时还排除 PAD→BOS。交叉熵内部使用稳定的 log-softmax，先选择有效位置再求均值。若库模型已内部 shift，就传原始对齐 labels 并使用库的 loss，不能再调用这份 shift。此例不包含 packed 独立序列；拼接样本还需 segment mask，不能只靠因果三角形。`,
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
