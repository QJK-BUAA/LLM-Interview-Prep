const chapter = {
  id: "01",
  slug: "python-tensors-shapes",
  part: "数学与机器学习地基",
  title: "张量、Shape 与反向求和",
  subtitle: "从轴语义推到矩阵梯度、mask 与样本权重",
  level: "入门",
  duration: 120,
  prerequisites: ["00"],
  tags: ["Python", "Tensor", "Shape", "Broadcast", "矩阵梯度", "Masked Mean", "einsum"],
  objectives: [
    "给每个轴标注语义并判断矩阵乘法、广播和变形是否合法",
    "从下标求和推导线性层输入、权重和偏置的梯度",
    "推导 masked mean，区分 token、序列和微批次权重",
    "用 einsum 与编号算例证明 reshape 不等于 transpose",
  ],
  summary:
    "张量只是带多个轴的数字容器；读模型代码时先给每个轴贴上语义标签，再检查运算规则，绝大多数 shape 问题都会变得具体。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "两句话一起计算，怎样不把词和特征混在一起？",
      body: String.raw`上一章一次输入一个学习时长，现在想让模型同时处理两句话。每句话有多个词，每个词又用多个数字表示：如果把这些数字排错，即使乘法能运行，也可能把第一句话的词当成第二句话的特征。本章先解决“一个数字属于谁”的问题，再追踪共享参数如何接收各位置的反馈。

一个数字是标量，一排特征是向量，行列组成的表是矩阵；张量是这些数字容器的统一称呼。多一个轴，只是多回答一个定位问题，例如先找哪句话，再找哪个 token，最后找该 token 的哪项特征。

在机器学习中，shape 比变量名更可靠。看到形状 $[B,S,H]$，先写下：$B$ 是 batch 中样本数，$S$ 是每条序列的 token 数，$H$ 是每个 token 的隐藏维度。一个位置 $(b,s,h)$ 就对应“第 b 个样本、第 s 个 token、第 h 个特征”。

轴的顺序不是宇宙定律，而是接口约定。有的库使用 $[B,S,H]$，有的算子临时换成 $[B,N,S,D]$，其中 $N$ 是注意力头数、$D=H/N$。只要记住每次 reshape、transpose 前后的轴语义，就不会靠猜。

Python 列表可以存数字，但机器学习框架里的 tensor 还提供统一数据类型、设备位置和并行运算。tensor 可能在 CPU 或 GPU 上，也可能是 fp32、bf16 或整数。shape 相同不代表一定能运算，dtype 和 device 也必须兼容。

接下来用两句话、每句三个位置、每个位置四个特征的 24 个数字追踪一次线性变换。我们先确定哪些轴保持、哪个轴被求和，再处理短句的补齐位置；这样后面的梯度和平均数都有明确归属。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：两句话如何变成三维张量",
      body: String.raw`为了同时计算两句话，我们把每句补齐到三个 token 位置，并让每个 token 用四个数字表示。现在给每个位置使用同一个线性层，把四个特征换成六个；要检查的是输出仍有两句话、每句仍有三个位置，不能在变换中把它们混起来。

把这一批输入记为 $X$，它的 shape 是：

$$X\in\mathbb{R}^{2\times3\times4}$$

第一轴的 2 表示两句话，第二轴的 3 表示三个位置，第三轴的 4 表示四维特征。总元素数是 $2\times3\times4=24$。

若线性层权重 $W\in\mathbb{R}^{4\times6}$，每个四维 token 向量乘权重后变成六维。矩阵乘法只作用于最后一轴：

$$[2,3,\mathbf{4}]\times[\mathbf{4},6]\rightarrow[2,3,6]$$

粗体的两个 4 是必须对齐的收缩维。batch 和序列轴被原样保留。若再把 6 维拆成 2 个头，每头 3 维，可以 reshape 为 $[2,3,2,3]$，再 transpose 成 $[2,2,3,3]$，顺序依次是 batch、head、sequence、head dimension。

输入共有 24 个数，线性层输出共有 $2\times3\times6=36$ 个数；拆头和换轴只是重排这 36 个数，并不产生新的 token。Padding 是短句后的占位 token，需要用 mask 排除其对有效位置注意力和损失的影响。

所以这次变换真正改变的是每个 token 的特征数，句子数和位置数没有变。下面先用下标验证这一点，再问：同一个权重被六个位置共同使用，训练时应怎样汇总六份反馈？`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "从位置归属走到共享参数的反馈",
      body: String.raw`两句话的例子留下三个具体问题：线性层怎样汇总特征，共享偏置怎样接收多个位置的反馈，补齐位置又该不该计入平均损失？按这个顺序读，比只记操作名称更容易检查代码。

先读形状规则，用 $[B,S,H]$ 标注样本、位置和特征。随后从一个标量损失出发，把“输出变化对损失的影响”记为上游梯度，逐项推出矩阵反传和广播求和。第 00 章只需理解预测与误差，不要求已经会求导；这里的反向部分可与第 02 章的链式法则配合阅读，第一次先看数值路径，学完 02 再复算证明。

接着看 masked mean：同样五个有效 token，按 token 平均是 3.2，按序列平均是 3，分母决定了训练重视谁。最后用 einsum 写出收缩轴，用编号检查 reshape 与 transpose；注意力的 $[B,N,S,D]$ 只作为布局迁移例子，机制到 Transformer 章节再展开。

约 120 分钟包括首轮手算和回访。完成后应能说明 24 个输入数怎样变成 36 个输出数，并在共享权重反向时找对求和轴。带着“这些局部导数为何可以相乘”的问题进入第 02 章。`,
      links: [
        { label: "形状与下标规则", sectionId: "derivation", level: "必会" },
        { label: "矩阵乘法反向", sectionId: "math-matmul-backward", level: "推导" },
        { label: "广播反向求和", sectionId: "math-broadcast-backward", level: "推导" },
        { label: "mask 与权重", sectionId: "math-masked-mean", level: "必会" },
        { label: "einsum 与布局", sectionId: "math-einsum-layout", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "Shape 跟踪流水线",
      body: String.raw`把 shape 跟踪写在纸上，永远不要只在脑中想。下面是一条简化 Transformer 流程：token id 先查 embedding 表得到向量；线性投影产生 Q、K、V；隐藏维被拆成多个头；注意力完成后再合并。

每次变形都应回答两个问题：元素总数是否保持，轴的语义是否改变。reshape 只重新解释排列，不应凭空增减元素；transpose 只交换轴；矩阵乘法会消去对齐维并产生新维。

最常见错误不是“数学不会”，而是把序列长度和头维弄反，或者忽略 batch 轴的广播。调试时打印完整 shape，并在变量名里临时加入语义，例如 queries_bhsd，比只写 q 更容易检查。`,
      diagram: {
        kind: "flow",
        nodes: [
          "Token IDs [B,S]",
          "Embedding [B,S,H]",
          "Q/K/V [B,S,H]",
          "Split heads [B,N,S,D]",
          "Output [B,S,H]",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "三个运算规则：逐元素、矩阵乘法与广播",
      body: String.raw`给两句话的每个 token 换一组特征，然后加上共享偏置，需要两种不同的操作：前者汇总多个输入特征，后者让同一个数在许多位置复用。怎样从下标判断一次运算究竟在做哪件事，而不只看程序是否报错？

先以逐元素加法作对照：它要求两个位置可以一一对应。两个 $[2,3]$ 矩阵相加，结果仍是 $[2,3]$。它不会像矩阵乘法那样把一行和一列求和。

**矩阵乘法**中，$A\in\mathbb{R}^{m\times n}$ 与 $B\in\mathbb{R}^{n\times p}$ 相乘得到 $C\in\mathbb{R}^{m\times p}$：

$$C_{ij}=\sum_{k=1}^{n}A_{ik}B_{kj}$$

中间维 $n$ 被求和消去。若 $A$ 是 $[2,3]$，$B$ 是 $[3,4]$，结果是 $[2,4]$，不是 $[3,3]$。

**广播**让长度为 1 或缺失的轴重复使用。矩阵 $X$ 为 $[B,H]$，偏置 $b$ 为 $[H]$，执行 $X+b$ 时，$b$ 会被视为每个样本共享的一行。判断广播时从最右轴向左比较：维度相等，或其中一个为 1，才兼容。

例如 $[2,3,4]+[4]$ 合法，后者对 batch 和 sequence 广播；$[2,3,4]+[3]$ 不合法，因为最后轴 4 与 3 不兼容。若本意是给每个序列位置加偏置，应把 $[3]$ 变成 $[1,3,1]$。

把线性层缩成两行、每行两个特征来手算：若 $A=\begin{bmatrix}1&2\\3&4\end{bmatrix}$、$B=\begin{bmatrix}2\\-1\end{bmatrix}$，则 $AB=(0,2)^\top$，由每行的两个乘积相加得到。若对 $[2,3,4]$ 最后一轴求和，输出为 $[2,3]$；保留维度则为 $[2,3,1]$，后者可安全广播回原轴。mean 与 sum 的输出 shape 虽相同，mean 的反向还会乘被约简元素个数的倒数。

结果 0 和 2 分别属于原来的两行，不能解释成两个特征；加共享标量偏置 1 后，它们变成 1 和 3。下一节沿用这两个输出，看看当目标是 0 和 1 时，误差如何传给输入、权重和偏置。`,
    },
    {
      id: "math-matmul-backward",
      type: "derivation",
      title: "线性层反向：从下标推导三个梯度",
      body: String.raw`前一节的小线性层加偏置后输出 1 和 3，目标却是 0 和 1。若想减小这两条误差，应修改哪个权重、每个输入位置又受到什么影响？本节把每条依赖路径展开，尤其检查一个共享权重收到的反馈是否漏掉了某一行。

把 batch 和 token 暂时合成 $M=BS$ 行。$X\in\mathbb R^{M\times H}$，$W\in\mathbb R^{H\times O}$，$b\in\mathbb R^O$，$Y=XW+b\in\mathbb R^{M\times O}$。将标量损失 $L$ 对每个输出的变化率记为上游梯度 $G=\partial L/\partial Y\in\mathbb R^{M\times O}$。这里每行右乘权重；不要和使用列向量 $Wx$ 的约定混用。

**逐项推导。** $Y_{mo}=\sum_hX_{mh}W_{ho}+b_o$。某个 $X_{mh}$ 影响这一行全部输出，某个 $W_{ho}$ 被全部行共享：

$$\frac{\partial L}{\partial X_{mh}}=\sum_oG_{mo}W_{ho},\qquad
\frac{\partial L}{\partial W_{ho}}=\sum_mX_{mh}G_{mo},\qquad
\frac{\partial L}{\partial b_o}=\sum_mG_{mo}.$$

还原矩阵写法并验 shape：

$$\nabla_XL=GW^\top\in\mathbb R^{M\times H},\quad
\nabla_WL=X^\top G\in\mathbb R^{H\times O},\quad
\nabla_bL=\sum_mG_{m,:}\in\mathbb R^O.$$

**手算。** $M=H=2,O=1$，$X=\begin{bmatrix}1&2\\3&4\end{bmatrix}$，$W=(2,-1)^\top$，$b=1$，$y=(0,1)^\top$。先算 $Y=(1,3)^\top$。取 $L=\tfrac12\sum_m(Y_m-y_m)^2=2.5$，得到 $G=(1,2)^\top$：

$$\nabla_WL=(7,10)^\top,\quad \nabla_bL=3,\quad
\nabla_XL=\begin{bmatrix}2&-1\\4&-2\end{bmatrix}.$$

若损失改成 $\frac1{2M}\sum e_m^2$，上述梯度全部除以 $M$，不能只缩放权重梯度。回到 $[B,S,H]$ 时，$\nabla_W$ 要跨 $B,S$ 两轴求和；输入梯度仍保留这两轴。若张量同时进入两条支路，分别算贡献后相加，不可覆盖。

权重梯度中的 7 来自第一行的 1 和第二行的 6，10 来自 2 和 8；共享偏置的 3 则汇总两行的 1 和 2。这些正数表示小幅增大对应参数会使当前损失上升，不是参数的新值。下一节把偏置推广到三维张量，专门检查“共享在哪些轴上，就对哪些轴求和”。`,
    },
    {
      id: "math-broadcast-backward",
      type: "derivation",
      title: "广播的伴随操作：前向复用，反向累加",
      body: String.raw`上一节一个偏置服务两行，所以收到了两份反馈。回到两句话、多个 token 的场景，如果偏置按特征共享、按位置共享，或者所有位置共用一个数，反向结果会一样吗？三种写法都可能通过 shape 检查，只有追踪复用位置才能分清它们代表的模型。

先给 $X\in\mathbb R^{B\times S\times H}$ 加共享特征偏置 $b\in\mathbb R^H$。广播不是生成了 $BS$ 个独立参数，而是同一个 $b_h$ 在多个输出位置被重复使用。下标中的 $b$ 表示 batch 编号，$b_h$ 整体表示第 $h$ 个偏置参数。令 $Y_{bsh}=X_{bsh}+b_h$，上游梯度 $G$ 与 $Y$ 同形：

$$\frac{\partial L}{\partial b_h}
=\sum_{b=1}^B\sum_{s=1}^S
\frac{\partial L}{\partial Y_{bsh}}\frac{\partial Y_{bsh}}{\partial b_h}
=\sum_{b,s}G_{bsh}.$$

输入则没有复用：$\partial L/\partial X_{bsh}=G_{bsh}$。通用规则是先对前向新添的轴求和，再对原来长度为 1、后来被扩展的轴求和并保留维度，最终恢复原 shape。求和不是再求平均；平均系数应由损失定义提供。

**数字验证。** $B=S=H=2$，上游梯度的两个 batch 分别为
$\begin{bmatrix}1&2\\3&4\end{bmatrix}$ 和 $\begin{bmatrix}5&6\\7&8\end{bmatrix}$。对共享特征偏置 $[H]$：

$$\nabla_bL=(1+3+5+7,\ 2+4+6+8)=(16,20).$$

若是每个位置的偏置 $c\in\mathbb R^{1\times S\times1}$，则跨 batch 和特征求和，得到 $\nabla_cL=(14,22)$，shape 必须保留为 $[1,2,1]$。共享标量的梯度则是所有项之和 36。这三者前向都能广播，但表达的是不同模型。

前向 sum 的反向是把上游梯度广播到每个输入；前向 mean 的反向还除以参与平均的数量。因此广播与求和互为反向规则。实现通用算子时不要用无参数 squeeze 随意删维，它可能把 batch=1 的语义轴也删掉。

同一份上游反馈给出特征偏置梯度 16、20，位置偏置梯度 14、22，共享标量梯度 36：差别来自参数被哪些位置共同使用，不是反向算法的任意选择。下一节还要决定哪些位置有资格提供反馈，短句的 padding 应被排除在损失平均之外。`,
    },
    {
      id: "math-masked-mean",
      type: "derivation",
      title: "Masked mean：分母决定谁获得多少权重",
      body: String.raw`两句话分别有两个和三个有效 token，短句末尾补了一个占位位置。训练时不仅要去掉这个占位位置，还要决定长句是否应该获得更多权重。我们用同一组损失分别按 token 和按句子平均，看看只改分母会怎样改变优化目标。

把 token 损失记为 $\ell\in\mathbb R^{B\times S}$，固定非训练二值 mask 为 $m\in\{0,1\}^{B\times S}$，其中 1 表示参与损失。第 $b$ 句的有效数 $n_b=\sum_s m_{bs}$，总数 $T=\sum_b n_b>0$。按 token 平均的目标是

$$L_{\rm token}=\frac{\sum_{b,s}m_{bs}\ell_{bs}}{T},\qquad
\frac{\partial L_{\rm token}}{\partial\ell_{bs}}=\frac{m_{bs}}{T}.$$

mask 为零的梯度为零；这要求被 mask 的损失本身有限，浮点计算中 $0\cdot{\rm NaN}$ 仍是 NaN，不能靠乘零修复非法前向。

若每条非空序列应有同等权重，令 $B_+$ 为非空序列数，改成

$$L_{\rm seq}=\frac1{B_+}\sum_{b:n_b>0}
\frac{\sum_s m_{bs}\ell_{bs}}{n_b},\qquad
\frac{\partial L_{\rm seq}}{\partial\ell_{bs}}=\frac{m_{bs}}{B_+n_b}\quad(n_b>0).$$

**完整手算。** 两行损失为 $(1,3,99)$ 与 $(2,4,6)$，mask 为 $(1,1,0)$ 与 $(1,1,1)$。有效计数为 $(2,3)$，有效总和为 16：

$$L_{\rm token}=16/5=3.2,\qquad L_{\rm seq}=\tfrac12(4/2+12/3)=3.$$

token 梯度在五个有效位置都是 $1/5$；序列梯度第一行两个位置为 $1/4$，第二行三个位置为 $1/6$。前者按长度加权序列，后者相对重视短序列，没有脱离任务的“唯一正确平均”。

**微批次累积。** 第 $k$ 个微批有 $T_k$ 个有效 token，平均损失为 $L_k$。全局 token 目标应为

$$L=\frac{\sum_k T_kL_k}{\sum_kT_k},\quad
\nabla L=\sum_k\frac{T_k}{\sum_jT_j}\nabla L_k.$$

若上例两行各为一个微批，简单平均两个均值给出 3，而正确 token 平均是 3.2。在跨设备梯度平均时还须核对框架的平均系数，不能再无意除一次设备数。

全 mask 为零时目标本来未定义，应跳过该批并记录有效数，而非除零。若 mask 是可训练连续权重 $w$，分母也随权重变，商法则给出 $\partial L/\partial w_i=(\ell_i-L)/\sum_jw_j$；固定 mask 的零梯度结论不能推广到可训练门控。

所以 3.2 和 3 都算得正确，但回答不同问题：前者让长句占总权重的 3/5，后者让两句话各占 1/2。占位损失 99 对两者都不应有影响。实现前先声明训练单位，再检查累计梯度的分母；下一节用下标记号把这些保留轴和求和轴直接写进算子。`,
    },
    {
      id: "math-einsum-layout",
      type: "derivation",
      title: "einsum 与 reshape：计算下标和存储布局是两件事",
      body: String.raw`现在已经知道线性层该在哪个轴求和，但把 token 特征拆成多个头再合并时，仍可能不报错地混入别的位置。怎样同时验证计算对象和元素归属？先用下标写出线性层，再给每个头放入可识别的编号，检查一次错误合并到底拿错了谁的数字。

沿用输入 $X\in\mathbb R^{B\times S\times H}$、权重 $W\in\mathbb R^{H\times O}$，每个输出位置为

$$Y_{bso}=\sum_hX_{bsh}W_{ho}.$$

对应 einsum 记号为 **bsh,ho->bso**：不出现在输出的 $h$ 被求和，$b,s,o$ 保留。上游梯度为 $G_{bso}$，权重梯度记为 **bsh,bso->ho**，输入梯度为 **bso,ho->bsh**，正是前两节的公式。

把这个记法迁移到位置间的相似度计算：对 $Q,K\in\mathbb R^{B\times N\times S\times D}$，其中 $N$ 是头数、$D$ 是每头特征数，分数 $A_{bnst}=\sum_dQ_{bnsd}K_{bntd}$ 对应 **bnsd,bntd->bnst**。$s,t$ 是两个不同的序列位置，下标不能都写成 $s$，否则只算同位置相似度。这里先检查乘法对象，注意力的完整含义留到后续章节。

**编号手算。** 单个 batch，$S=N=2,D=1$。在 $[S,N,D]$ 顺序放入位置 0 的两个头 $(0,1)$ 和位置 1 的两个头 $(10,11)$，展平为 $[0,1,10,11]$。转为 $[N,S,D]$ 后逻辑顺序变成 $[0,10,1,11]$。若直接合并成 $[S,H]$，得到错误行 $(0,10)$、$(1,11)$，混入别的 token；正确做法先 transpose 回 $[S,N,D]$，再合并，得到 $(0,1)$、$(10,11)$。

reshape 保留当前逻辑遍历顺序，必要时可复制；transpose 改变轴到元素的映射，常产生非连续视图；view 还受 stride 条件约束。它们都不自动理解“头”和“token”。元素总数相等只证明形状可容纳，并不能证明语义正确。

错误输出的第一行是 0、10，把两个 token 混在一起；正确第一行是 0、1，只含位置 0 的两个头。即使 $S=N$ 使两个 shape 看起来相同，这个编号检查仍能发现错误。下一步运行本章代码，给每次变形写下轴语义；然后到第 02 章把逐项反向整理成通用矩阵求导。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：不用框架练习 shape",
      body: String.raw`下面用嵌套列表模拟 batch，并显式打印每个轴。先养成写断言的习惯，错误会在离源头最近的位置暴露。

~~~python
batch = [
    [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]],
    [[0, 0, 1, 1], [1, 0, 0, 1], [0, 1, 1, 0]],
]

B = len(batch)
S = len(batch[0])
H = len(batch[0][0])
print((B, S, H))  # (2, 3, 4)

assert all(len(sentence) == S for sentence in batch)
assert all(len(token) == H for sentence in batch for token in sentence)

# 对最后一维求和，相当于每个 token 得到一个标量
token_scores = [
    [sum(token) for token in sentence]
    for sentence in batch
]
print(token_scores)  # shape: [2, 3]
~~~

进入 NumPy 或 PyTorch 后，仍建议在关键边界加入 shape 断言，例如断言隐藏维能被头数整除。断言不是多余代码，它把隐含假设变成可检查契约。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：元素个数相同不等于语义相同",
      body: String.raw`**误区一：能 reshape 就代表正确。** $[2,3,4]$ 和 $[2,4,3]$ 都有 24 个元素，但后两轴语义相反。程序可能不报错，结果却完全错误，这比直接崩溃更危险。

**误区二：星号总是矩阵乘法。** Python 数字的星号是普通乘法，NumPy 数组的星号通常是逐元素乘法，矩阵乘法常写成 @。读代码必须看对象类型和 API。

**误区三：忽略 batch 维。** 公式常只写单个样本 $X\in\mathbb{R}^{S\times H}$，工程实现却多一维 $B$。公式省略不代表代码里不存在。

**误区四：把 rank 与 LoRA rank 混为一谈。** 张量 rank 有时指轴的数量，线性代数 rank 指独立方向数，LoRA 的 rank 是低秩瓶颈宽度。必须结合上下文。

**误区五：广播越方便越好。** 错误的广播往往不会报错。对重要加法显式写出 reshape 或 unsqueeze，并在注释中记录轴语义。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "常见张量操作对比",
      body: String.raw`| 操作 | 改变元素值 | 改变元素顺序 | 典型用途 |
|---|---|---|---|
| reshape/view | 否 | 通常不改逻辑顺序 | 拆头、合并轴 |
| transpose/permute | 否 | 改变轴顺序 | 把 head 轴移到前面 |
| element-wise | 是 | 否 | 激活、mask、缩放 |
| matmul | 是 | 通过求和收缩维 | 线性层、注意力分数 |
| concatenate | 否 | 拼接新范围 | 合并特征或序列 |
| reduction | 是 | 删除被聚合轴 | sum、mean、max |

选择操作时先用中文描述意图。例如“每个 token 独立乘同一权重矩阵”对应最后两维矩阵乘法；“给每个隐藏特征加共享偏置”对应广播；“把 8 个头重新并回隐藏维”对应 transpose 后 reshape。

很多性能问题也来自 shape。连续内存上的访问通常更高效，transpose 后的张量可能不连续；框架有时会隐式复制。先保证语义正确，再通过 profiler 判断是否需要 contiguous 或布局优化。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：三句话讲清注意力 Shape",
      body: String.raw`**30 秒回答：**“输入隐藏状态通常是 $[B,S,H]$。经过 Q、K、V 投影并把 $H$ 拆成 $N$ 个头后，变为 $[B,N,S,D]$，其中 $D=H/N$。Q 与 K 转置相乘得到注意力分数 $[B,N,S,S]$，再乘 V 回到 $[B,N,S,D]$，最后合并头得到 $[B,S,H]$。”

若追问为什么分数是 $S\times S$，回答：每个 query 位置都要和每个 key 位置计算一次相似度，所以两个序列轴分别代表“谁在查”和“查谁”。

若追问 mask 的 shape，可以说 padding mask 常从 $[B,S]$ 扩展为可广播的 $[B,1,1,S]$，因果 mask 常是 $[1,1,S,S]$；二者相加或逻辑合并后广播到所有头。

若代码出现 shape mismatch，排查顺序是：确认轴语义、检查矩阵乘法收缩维、检查 transpose 后顺序、检查广播维是否显式为 1，最后才怀疑框架。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：先写 Shape 再算",
      body: "不要只判断能否运行，还要解释每个轴在现实任务中的含义。",
      questions: [
        {
          q: "X 的 shape 为 [4, 10, 32]，W 为 [32, 64]，X @ W 的 shape 是什么？",
          a: "[4, 10, 64]。最后的 32 与权重第一维对齐并被收缩，batch 和序列轴保留。",
        },
        {
          q: "[2, 3, 4] 能否与 [3, 1] 相加？",
          a: "可以。从右向左比较：[3,4] 与 [3,1]，最后轴 1 广播为 4，倒数第二轴同为 3，缺失的 batch 轴再广播为 2。",
        },
        {
          q: "为什么把 [B,S,N,D] 直接 reshape 成 [B,S,H] 前通常不需要交换轴，而 [B,N,S,D] 需要？",
          a: "前者 N 和 D 已相邻且处于每个 token 内，可以直接合并；后者 S 位于 N 与 D 之间，需先转为 [B,S,N,D]，否则会混合 token 与头的排列语义。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：反向求和与布局排错",
      body: "每题先写 shape 和约简轴，算完再用标量路径检查。答案中的梯度对应题目明示的损失尺度。",
      questions: [
        {
          q: "X=[[1,2],[3,4]]，W=[2,-1]^T，b=1，目标 y=[0,1]^T，L=0.5*sum((XW+b-y)^2)。推导并计算 X、W、b 的梯度。",
          a: String.raw`前向 $Y=(1,3)^\top$，残差和上游梯度 $G=(1,2)^\top$，$L=2.5$。由 $Y_{mo}=\sum_hX_{mh}W_{ho}+b_o$，分别沿输出、样本两轴求和，得 $\nabla_X=GW^\top=[[2,-1],[4,-2]]$，$\nabla_W=X^\top G=(7,10)^\top$，$\nabla_b=\sum_mG_m=3$。**得分点**：下标链式法则、三个 shape、共享参数累加、不额外除以 batch 大小。`,
        },
        {
          q: "上游梯度 G=[[[1,2],[3,4]],[[5,6],[7,8]]]。分别求加到 [B,S,H] 上的 [H] 偏置和 [1,S,1] 偏置梯度。",
          a: String.raw`$B=S=H=2$。特征偏置跨 $B,S$ 复用：$(1+3+5+7,2+4+6+8)=(16,20)$。位置偏置跨 $B,H$ 复用：$(1+2+5+6,3+4+7+8)=(14,22)$，保留为 $[1,2,1]$。**得分点**：由共享依赖推求和轴，保留原 shape，反向是 sum 而非 mean。`,
        },
        {
          q: "损失为 [[1,3,99],[2,4,6]]，mask 为 [[1,1,0],[1,1,1]]。比较 token 平均、序列平均及其有效位置梯度；全空批怎么办？",
          a: String.raw`有效和为 $4+12=16$，总数为 $2+3=5$，token 平均为 3.2，有效梯度均为 $1/5$。两条序列均值是 2、4，序列平均为 3，第一行有效梯度为 $1/4$，第二行为 $1/6$；被 mask 的位置梯度为零。全空批分母为零，应跳过并记录，不得产生 NaN。**得分点**：分母定义、长度权重、梯度尺度、全空边界。`,
        },
        {
          q: "在 [S,N,D]=[2,2,1] 中编号为 [[0,1],[10,11]]。为什么交换 S/N 后不能直接 reshape 回 [S,2]？",
          a: String.raw`transpose 后当前逻辑顺序是 $[0,10,1,11]$，直接 reshape 得 $[[0,10],[1,11]]$，一行混合了两个位置。先把 $[N,S,D]$ 转回 $[S,N,D]$，逻辑顺序恢复为 $[0,1,10,11]$，再合并头得到原来的两行。**得分点**：展示元素映射而不只数元素、区分 transpose 与 reshape、指出 shape 相同仍可能错误。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "NumPy Broadcasting",
      url: "https://numpy.org/doc/stable/user/basics.broadcasting.html",
      evidence: "官方文档",
    },
    {
      label: "PyTorch Tensor Views",
      url: "https://pytorch.org/docs/stable/tensor_view.html",
      evidence: "官方文档",
    },
  ],
};

export default chapter;
