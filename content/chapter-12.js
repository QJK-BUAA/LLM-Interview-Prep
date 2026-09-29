const chapter = {
  id: "12",
  slug: "lora-qlora-peft",
  part: "LLM 主线",
  title: "LoRA、QLoRA 与参数高效微调",
  subtitle: "用低秩增量适配大模型",
  level: "进阶",
  duration: 120,
  prerequisites: ["02", "06", "11"],
  tags: ["LoRA", "QLoRA", "NF4", "DoRA", "AdaLoRA", "PEFT"],
  objectives: [
    "从矩阵秩解释 LoRA 的参数节省",
    "计算 rank、alpha 与目标模块对应的参数量",
    "说明 QLoRA 的 NF4、双重量化与分页优化器",
    "根据显存、部署和任务差异选择 PEFT 方案",
  ],
  summary:
    "LoRA 冻结基座权重，只训练两个低秩矩阵表示任务增量；QLoRA 再把基座量化到 4 bit 以降低微调显存，而秩、缩放、目标模块与数据质量共同决定效果。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：不重写整本书，只贴一组可训练批注",
      body: String.raw`一个预训练模型已经会处理大部分输入，现在只想让它适应一个特定任务，却承担不起上一章算出的全参数训练状态。能不能保留原有权重，只训练一条小的修正分支？本章先用八个数构造一个四乘四的增量，再检查这种节省带来的表达、梯度和部署限制。

LoRA（Low-Rank Adaptation）把任务所需的变化约束到低维子空间：冻结原权重 $W$，只学习增量 $\Delta W=BA$。若原矩阵大小为 $d_{out}\times d_{in}$，完整增量需要 $d_{out}d_{in}$ 个参数；LoRA 使用 $A\in\mathbb{R}^{r\times d_{in}}$ 与 $B\in\mathbb{R}^{d_{out}\times r}$，只需 $r(d_{in}+d_{out})$。当秩 $r$ 远小于输入输出维时，训练参数和对应优化器状态显著减少。这是对更新空间的约束，不保证所有任务都恰好需要低秩变化。

少训练参数以后，基座权重和前向激活仍在。QLoRA 再把冻结基座以 4-bit 形式保存，计算时按块反量化到 bf16 等计算 dtype；低秩分支用较高精度学习，梯度仍需穿过冻结基座传向更早的可训练模块。我们会先算低秩梯度，再用明确非 NF4 的均匀量化例解释存储代码与计算权重的区别。

最后回到第 11 章的账单，把全部目标矩阵的 adapter 状态、量化元数据、激活和临时空间加起来。多个任务可以保存不同适配器，也可在部署前合并到浮点基座；选择取决于质量与部署需求，不是单看文件小了多少。rank 太小、目标层太少或任务差异太大时，仍需用验证集检查约束是否过强。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：一个 4×4 权重只训练 8 个数",
      body: String.raw`只允许训练八个数，怎样给一个四乘四线性层提供修正？先让输入被压成一个标量，再用这个标量生成四维输出修正。这个例子展示低秩分支能做什么，也暴露它不能自由选择十六个独立增量。

设冻结权重 $W\in\mathbb{R}^{4\times4}$，输入列向量 $x\in\mathbb{R}^{4}$。完整微调要训练 16 个权重。取 LoRA rank $r=1$：

$$A=[1,-1,0,2]\in\mathbb{R}^{1\times4}$$

$$B=[0.5,0,-0.5,1]^\top\in\mathbb{R}^{4\times1}$$

低秩增量为外积 $BA$，虽然 shape 仍是 $4\times4$，但只由 $A$ 和 $B$ 共 8 个数决定。对输入 $x=[1,2,0,-1]^\top$：

$$Ax=1-2+0-2=-3$$

$$BAx=B(-3)=[-1.5,0,1.5,-3]^\top$$

前向输出写为：

$$y=Wx+\frac{\alpha}{r}BAx$$

若 $\alpha=2,r=1$，LoRA 分支贡献变成 $[-3,0,3,-6]^\top$。四个输出修正都由同一个中间标量 -3 驱动，方向受 B 的列空间限制，这正是节省参数的代价。这里指定非零 A/B 是为展示前向，不是推荐的初始状态；真实训练通常把 A 随机初始化、B 初始化为零，使初始 $\Delta W=0$，模型一开始与基座完全一致，同时 A 的非零值让 B 能在第一步获得梯度。后面的反向例会直接检验为什么不能把两者都置零。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：低秩梯度、量化误差与实际账单",
      body: String.raw`八个数已经生成了一个修正，放大到真实模型时究竟省了多少，又能否正常开始学习？先将单层参数比例和前向写清，再沿两条分支反传，解释一零一随机的初始化；随后检查秩、缩放和合并的条件。

低秩分支正确以后，再压缩冻结基座：量化节区分存储代码、尺度和计算权重，最后把所有目标矩阵与量化元数据一起计入显存。矩阵秩与乘法需要时回看第 02 章，梯度累积回看第 05 章，优化器状态和峰值账单分别接第 06、11 章。先得到可复算的预算与合并一致性检查，再比较不同 PEFT 方案的任务效果。`,
      links: [
        { label: "参数、rank 与合并", sectionId: "derivation", level: "必会" },
        { label: "A/B 梯度及零初始化", sectionId: "math-lora-gradients", level: "推导" },
        { label: "缩放与合并边界", sectionId: "math-rank-scale-merge", level: "推导" },
        { label: "量化和反量化误差", sectionId: "math-quantization", level: "进阶" },
        { label: "QLoRA 内存账单", sectionId: "math-peft-memory", level: "必会" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "冻结基座与可训练旁路",
      body: String.raw`输入同时经过冻结的主矩阵 $W$ 和低秩旁路 A→B，两路输出相加。反向传播需要穿过 W 来计算输入梯度，但 W 本身不保存可训练梯度或 Adam 状态；A、B 才由优化器更新。

QLoRA 把主矩阵替换为分块 4-bit 存储。前向时小块反量化参与矩阵乘法，LoRA 分支通常保持 bf16/fp32 可训练精度。NF4 是针对近似正态分布权重设计的 4-bit 数据类型；double quantization 再量化每个块的量化尺度，进一步减少元数据；paged optimizer 使用统一内存机制缓解偶发显存峰值。

保存 checkpoint 时应明确只保存 adapter 还是合并模型。adapter 文件依赖准确的基座模型版本、tokenizer 和目标模块命名；少一个版本信息就可能无法复现。`,
      diagram: {
        kind: "flow",
        nodes: [
          "输入 x",
          "冻结 W 或 4-bit W",
          "可训练 A: 降维",
          "可训练 B: 升维",
          "缩放并相加",
          "输出 y",
        ],
        links: [
          [0, 1],
          [0, 2],
          [2, 3],
          [1, 4],
          [3, 4],
          [4, 5],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "参数量、缩放与合并",
      body: String.raw`四乘四例只把可训练数目减半，真实的宽矩阵能省多少？我们把相同的降维、升维结构放到一个 4096 维线性层，先数独立可训练参数，再检查推理时能否把旁路并回原矩阵。

原线性层使用 $W\in\mathbb{R}^{d_{out}\times d_{in}}$，输入 x、输出 h 均采用列向量：

$$h=Wx$$

LoRA 前向为：

$$h=Wx+sBAx,\qquad
A\in\mathbb{R}^{r\times d_{in}},\quad
B\in\mathbb{R}^{d_{out}\times r}$$

冻结 W 不计入可训练参数；A 有 r 行输入系数，B 有 r 列输出方向，两者相加而不是相乘。经典缩放 $s=\alpha/r$。LoRA 参数比例为：

$$\rho=
\frac{r(d_{in}+d_{out})}{d_{in}d_{out}}$$

若 $d_{in}=d_{out}=4096,r=16$，完整矩阵有 16,777,216 个参数，LoRA 有 $16(4096+4096)=131,072$ 个，只占约 0.78125%。但若同时适配 Q、K、V、O 和 FFN 多个矩阵，应逐层求和，不能只报一个矩阵比例。

推理前可合并：

$$W'=W+sBA$$

之后前向仍是 $W'x$，没有额外旁路延迟。多个 adapter 动态切换时通常保持未合并，服务需要管理额外矩阵乘法和批内 adapter 分组。

0.78125% 表示这个目标矩阵的可训练参数比例，不是总训练显存比例；冻结基座和激活还需保留。rsLoRA（rank-stabilized LoRA）使用与 $\alpha/\sqrt r$ 相关的缩放，使提高 rank 时更新幅度不至于按 $1/r$ 过快减小。它改变的是缩放规律，不是把矩阵从低秩变成满秩。rank、alpha 和学习率相互作用，比较实验时必须同时报告。先确认这条旁路能收到正确梯度，下一节再由此判断哪种零初始化可以启动训练。`,
    },
    {
      id: "math-lora-gradients",
      type: "derivation",
      title: "LoRA 反向：A/B 梯度、输入梯度与零初始化",
      body: String.raw`想让初始模型与基座完全一致，可以把低秩分支的两个矩阵都置零吗？输出确实不会改变，但乘法结构也可能让两边都学不动。我们先对非零分支求导，再只把升维矩阵置零，对比第一步到底谁能更新。

单样本列向量 $x\in\mathbb R^{d_{in}}$，$W\in\mathbb R^{d_{out}\times d_{in}}$ 冻结，$A\in\mathbb R^{r\times d_{in}}$、$B\in\mathbb R^{d_{out}\times r}$ 可训练，$s=\alpha/r$，$y=Wx+sBAx$。给定上游 $g=\nabla_yL\in\mathbb R^{d_{out}}$，令 $u=Ax\in\mathbb R^r$。

微分 $dy=Wdx+s(dB)Ax+sB(dA)x+sBA\,dx$。将 $g^\top dy$ 中各参数的系数收集，得到：

$$\nabla_BL=s\,g\,u^\top,\qquad
\nabla_AL=s(B^\top g)x^\top,\qquad
\nabla_xL=W^\top g+sA^\top B^\top g.$$

B 的梯度需要 A 产生的中间输入，A 的梯度需要 B 将误差传回；输入梯度则要合并主路与旁路。batch 列堆叠 $X\in\mathbb R^{d_{in}\times n}$、上游 $G\in\mathbb R^{d_{out}\times n}$ 时，梯度为 $sG(AX)^\top$ 与 $sB^\top GX^\top$；若 G 已含均值缩放，不再除一次 n。冻结 W 只是不更新 W，不代表可跳过 $W^\top g$。

为逐坐标检查反向，把开场四维例缩成两维，并指定一个线性损失作为固定上游；低秩机制不变。取 $W=I_2,A=[1,-1],B=[1/2,1]^\top,x=[2,1]^\top,s=2$，$u=1$，$y=[3,3]^\top$。取 $L=3y_1-2y_2$，$g=[3,-2]^\top$，$B^\top g=-1/2$：

$$\nabla_A L=[-2,-1],\quad
\nabla_B L=[6,-4]^\top,\quad
\nabla_x L=[2,-1]^\top.$$

**为什么一零一随机。** 保留同一 A 和 x，把 B 初始化为 0，则 $BA=0$，初始输出等于基座；$\nabla_A=0$，但 $\nabla_B=s\,g(Ax)^\top=[6,-4]^\top$，通常非零。第一步 B 更新后，A 才可能获得非零梯度。若 A=B=0，两支任务梯度都为 0，会困在乘法参数化的驻点；不能说“两者都可能没梯度”，本设定下就是零。随机 A 也不保证每个 batch 的 $Ax$ 或聚合梯度必非零，例如 x=0。

这组数中，只把 B 置零后，B 仍收到 [6,-4]，A 则暂时收到零；所以“初始增量为零”不等于“整个旁路没有训练信号”。若 adapter 输入带 dropout，A/B 梯度使用同一丢弃后的输入，传回 x 时再乘该 mask 的缩放；基座分支不应同时被误丢弃。接下来沿用这个两维例，检查训练出的固定增量怎样合并，以及提高 rank 究竟放宽了什么约束。`,
    },
    {
      id: "math-rank-scale-merge",
      type: "derivation",
      title: "Rank 与缩放：可表达空间和合并的成立条件",
      body: String.raw`把 rank 加大是在增加整个模型的秩，还是只增加可学习修正的方向？训练好以后，两条分支又能否无损合成一条？这两个问题都要先看低秩增量实际能到达的空间，再区分固定线性映射与随机训练行为。

对任何 x，$BAx$ 都在 B 的 r 列张成的空间内，因此 $\operatorname{rank}(BA)\le\min(r,d_{in},d_{out})$。原权重 $W+sBA$ 仍可能满秩；低秩约束的是增量而非整个层。r=0 时经典 $\alpha/r$ 未定义，禁用 adapter 应走独立路径。

参数化并不唯一：可逆 $C\in\mathbb R^{r\times r}$ 给 $(BC)(C^{-1}A)=BA$，函数相同但 A/B 的梯度尺度和优化轨迹可不同。不能只由有效 rank 判断训练难度。

**为什么缩放影响比较。** 粗略假设 r 项独立、零均值且方差相同，则未缩放 $(BAx)_i$ 的方差随 r 增长。经典 $s=\alpha/r$ 后分支方差约正比 $\alpha^2/r$；$s=\alpha/\sqrt r$ 后约正比 $\alpha^2$。这是解释 rsLoRA 的尺度启发，不是零初始化 B 时的非零输出方差，也不保证训练中独立假设持续成立。改变 rank 应同时报告 alpha、学习率、目标模块和初始化。

秩决定可表达方向，缩放决定同样因子值形成多大的修正；两者都不能绕过部署时的计算规则。eval 时若分支是固定线性映射、dropout 关闭，分配律给：

$$Wx+sBAx=(W+sBA)x.$$

上节 $W=I,A=[1,-1],B=[1/2,1]^\top,s=2$，合并矩阵为 $\begin{bmatrix}2&-1\\2&-1\end{bmatrix}$，对 $[2,1]^\top$ 给 $[3,3]^\top$，与两支相加相同。训练 dropout 的 mask 随样本变化，不能合并成一个固定矩阵。

两种执行方式都输出 [3,3]，检验的是这个固定线性分支的代数一致性；示例中的合并矩阵恰好秩为 1，也不能据此声称所有合并权重都低秩。多 adapter 加权求和的增量秩最多为各自 rank 之和，不保证仍为原 rank；用 SVD 截断回小 rank 是额外近似。QLoRA 若重新量化合并权重，$\operatorname{dequant}(\operatorname{quant}(W+sBA))$ 通常不等于原浮点合并值，必须重新做误差和任务评估。下面用一个四元素块算出这类量化误差来自哪里。`,
    },
    {
      id: "math-quantization",
      type: "derivation",
      title: "QLoRA 的量化链：存储代码、尺度与计算权重",
      body: String.raw`冻结基座已经不用保存梯度，权重本身却仍然太大。若用少量代码代替浮点数，实际矩阵乘法会用到什么值，误差有多大？先选能手算的均匀量化说明编码与反量化，再明确它和 QLoRA 所用 NF4 的区别。

一块权重 $w\in\mathbb R^n$，对称 4-bit 教学量化使用整数区间 [-7,7]（15 个值），scale $s=\max_i|w_i|/7$。本段 s 是量化尺度，不是上一节的 LoRA 缩放：

$$q_i=\operatorname{clip}(\operatorname{round}(w_i/s),-7,7),\qquad
\hat w_i=sq_i.$$

无饱和时舍入误差 $\lvert\hat w_i-w_i\rvert\le s/2$。全零块单独处理，不能除以 0。取 $w=[-1,-0.2,0.3,1]$，$s=1/7$，整数代码为 $[-7,-1,2,7]$，反量化 $[-1,-1/7,2/7,1]$，最大误差 $2/35\approx0.057143<1/14$。对输入全 1，精确点积为 0.1，量化后为 $1/7\approx0.142857$。

点积从 0.1 变成约 0.142857，是计算权重经过舍入后的真实变化；代码 [-7,-1,2,7] 本身不应直接拿来与原输入相乘。这个例子不是 NF4。NF4 使用非均匀的 16 个码本值 $c_0,\ldots,c_{15}$，针对近似正态权重分布设计。归一化到块尺度 a 后，示意编码 $q_i=\arg\min_j|w_i/a-c_j|$，反量化为 $\hat w_i=a\,c_{q_i}$。代码占 4 bit，但 a、计算输入、LoRA 权重及累积器不因此都变成 4 bit；具体码本、block size、偏移和 scale dtype 按库实现核对。

若 $E=\hat W-W$，线性层误差满足 $\|\hat Wx-Wx\|_2\le\|E\|_2\|x\|_2$。小权重量化误差可被大输入范数或多层累积放大，因此不能仅看单块 MSE 就保证下游质量。块内 outlier 会拉大均匀 scale，是非均匀表示和更细分块的重要动机之一。

回到 QLoRA 分支，此处 s 恢复为 LoRA 缩放，训练函数是 $y=\hat Wx+sBAx$，冻结量化代码和 scale，计算时按块恢复 $\hat W$。无需对 round 求导，因为任务不更新这些代码；输入梯度仍含 $\hat W^\top g$，A/B 仍按高精度链式法则更新。这与要更新量化前权重、常使用 straight-through estimator 的量化感知训练不同。下一步不能只按每参数半字节报显存，还要把块尺度和可训练分支的状态计入预算。`,
    },
    {
      id: "math-peft-memory",
      type: "derivation",
      title: "PEFT 显存：低秩状态、量化元数据与激活",
      body: String.raw`单矩阵只训练约 13 万参数，能否据此宣布整个 7B 模型微调只要很小显存？还不能：每层可能有多个目标矩阵，低比特权重也带量化元数据。我们把这些重复项全部展开，再接回上一章的激活与临时空间账单。

目标矩阵集合 $\mathcal M$ 的 adapter 参数量为 $P_A=\sum_{m\in\mathcal M}r_m(d_{in,m}+d_{out,m})$。同一 4096 方阵、r=16 时为 131,072 参数；若 32 层每层仅适配 Q/V 两个同形矩阵，共 $32\times2\times131072=8,388,608$，不是整个模型都只需 13 万参数。此例假设 Q/V 同形，GQA 的 V 矩阵要按实际较小输出维重算。

如果 adapter 每参数仍用权重2、梯度2、主副本4、Adam8 字节，总状态是 $16P_A=134,217,728$ 字节，即 128 MiB。冻结 7B 基座的理想 4-bit payload 为 3.5 十进制 GB，另外有 scale、码本、未量化模块、激活与临时空间。

128 MiB 是这些 adapter 的训练状态，并未包含基座。基座的 3.5 GB 又只是四位代码负载：每块还需尺度才能恢复权重。每 k=64 个权重共享一个 fp32 scale，则仅一级 scale 开销为 $32/64=0.5$ bit/parameter，总计 4.5 bit。教学上假设把 scale 再用 8-bit 代码存储，每 256 个 scale 共享一个 fp32 二级 scale，则：

$$b_{\rm effective}=4+\frac8{64}+\frac{32}{64\times256}
=4.126953125\text{ bit/parameter}.$$

7B 参数在这个理想化布局约占 $7\times10^9\times4.126953125/8=3.611084$ GB。这里忽略 offset、对齐、码本和未量化模块，只解释 double quantization 为何能省元数据，不是特定库/模型的实测峰值。

4.126953125 bit 说明二次压缩的是量化尺度元数据，不是把所有训练状态变成四位；3.611084 GB 因此也只是所设布局的小计。QLoRA 总显存约为量化基座及元数据 + adapter 训练状态 + 保存激活 + 临时反量化/矩阵乘 workspace + 分配器余量。基座冻结仍需为更早的 adapter 回传，长序列激活不会消失。paged optimizer 把峰值压力转移到统一内存迁移，降低 OOM 风险但可能增加 CPU/GPU 传输；它不会把理论状态字节凭空消除，也不保证比浮点 LoRA 更快。

实际选型时先打印全部目标矩阵和 dtype，逐项求和，再测目标长度下的峰值与验证集效果。这样才闭合了开场的问题：低秩与量化分别节省哪一笔，代价是否可接受；它们决定可训练的参数和资源，不代替后续课程要讨论的数据与训练目标。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：手写 LoRA 线性层",
      body: String.raw`下面使用接近 NumPy/PyTorch 的伪代码。dropout 只作用于 LoRA 输入，推理时关闭。基座参数 requires_grad=False，但计算图仍允许梯度传向更早的可训练模块。

~~~python
class LoRALinear:
    def __init__(self, base_weight, rank, alpha, dropout):
        self.weight = freeze(base_weight)               # [out, in]
        self.A = random_normal(rank, base_weight.in_dim) # [r, in]
        self.B = zeros(base_weight.out_dim, rank)        # [out, r]
        self.scale = alpha / rank
        self.dropout = dropout

    def forward(self, x, training=True):
        base = x @ transpose(self.weight)
        adapter_input = self.dropout(x) if training else x
        delta = (adapter_input @ transpose(self.A)) @ transpose(self.B)
        return base + self.scale * delta

    def merged_weight(self):
        return self.weight + self.scale * (self.B @ self.A)
~~~

训练前应打印所有可训练参数，确认只有预期 adapter、必要 bias 或分类头开放。训练后还要验证合并前后在 eval 模式下输出接近，避免 dropout、dtype 或转置约定导致部署偏差。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：PEFT 不会自动修复数据和目标",
      body: String.raw`**误区一：LoRA rank 越高越好。** 更高 rank 增加容量、显存和过拟合风险；若数据少或任务接近基座，较小 rank 可能足够。应看验证集和多个种子。

**误区二：QLoRA 把所有训练量都变成 4 bit。** 冻结基座按 4 bit 存储，但矩阵乘法常在 bf16 中进行，LoRA 权重、梯度和优化器状态也不是 4 bit。

**误区三：NF4 等于普通均匀 int4。** NF4 的量化点针对近似正态权重分布设计，通常按块缩放；实现、block size 和计算 dtype 都影响误差。

**误区四：只适配 q_proj 总是足够。** 注意力输出、K/V 和 FFN 也可能承载任务变化。目标模块应结合任务差异、预算和消融选择。

**误区五：adapter 可以搭配任意同名模型。** 行索引、层命名和权重版本必须一致。即使架构相同，基座 revision 不同也会改变增量语义。

**误区六：合并 4-bit 基座后仍精确保持 4 bit。** 通常要先反量化或在更高精度中形成 $W+\Delta W$，再重新量化；二次量化会产生新误差，应重新评估。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "LoRA 家族与训练方案选择",
      body: String.raw`| 方法 | 核心变化 | 优势 | 更适合 |
|---|---|---|---|
| Full fine-tuning | 更新全部参数 | 容量最大 | 数据和算力充足、域差异大 |
| LoRA | 固定 rank 低秩增量 | 简单、易保存和合并 | 常规指令/领域微调 |
| QLoRA | 4-bit 冻结基座 + LoRA | 单卡显存显著下降 | 显存受限微调 |
| AdaLoRA | 按重要性动态分配秩预算 | 容量分配更灵活 | 各层需求差异明显 |
| DoRA | 分解权重方向与幅值 | 低 rank 下可能更接近全调 | 可接受额外复杂度 |
| rsLoRA | 调整高 rank 缩放 | rank 增大时更稳定 | 需要较高秩的任务 |
| Prefix/Prompt tuning | 训练虚拟 token/前缀 | 参数极少 | 模型足够大、任务较接近 |

选择顺序可以很务实：先确认基座本身具备目标能力；显存足够且追求最大适应能力时考虑全参；需要多租户 adapter 或快速迭代时用 LoRA；单卡放不下可训练基座时用 QLoRA；只有固定 rank 表现不足且消融支持时，再引入 AdaLoRA、DoRA 等复杂方案。

QLoRA 的优势主要在训练内存，不保证训练时间同比缩短。量化与反量化 kernel、CPU offload、序列长度和数据管线都可能成为新瓶颈。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：LoRA 为什么能省参数",
      body: String.raw`**30 秒回答：**“LoRA 冻结原矩阵 $W$，把任务增量限制为 $BA$，其中秩 $r$ 远小于输入输出维。完整增量要 $d_{out}d_{in}$ 个参数，LoRA 只要 $r(d_{in}+d_{out})$。前向把缩放后的 $BAx$ 加到 $Wx$，部署时还能合并为新权重。”

若追问初始化：由 $\nabla_B=s\,g(Ax)^\top$、$\nabla_A=s(B^\top g)x^\top$ 可知，A 随机、B 为零时初始增量为零，A 首步梯度为零，B 通常可更新但也取决于输入与上游。若 A、B 都为零，标准乘法旁路的两支任务梯度都严格为零。

若追问 QLoRA 三个关键词：NF4 为正态分布权重设计 4-bit 表示；double quantization 继续压缩量化常数；paged optimizer 利用统一内存处理显存峰值。核心训练仍是冻结量化基座并更新 LoRA。

若追问 alpha 与 rank：经典 LoRA 用 $\alpha/r$ 缩放。不能脱离学习率和目标模块单独比较 rank；rsLoRA 改用近似 $\alpha/\sqrt r$ 以改善高 rank 稳定性。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：低秩反向、量化与预算",
      body: "先写矩阵朝向、缩放和冻结对象，再开始求导或计算字节。",
      questions: [
        {
          q: "W=I，A=[1,-1]，B=[0.5,1]^T，x=[2,1]^T，s=2，L=3y1-2y2。求 A/B/x 梯度；把 B 改成零又如何？",
          a: String.raw`$Ax=1,g=[3,-2]^\top,B^\top g=-1/2$，所以 $\nabla A=s(B^\top g)x^\top=[-2,-1]$，$\nabla B=s\,g(Ax)^\top=[6,-4]^\top$，$\nabla x=W^\top g+sA^\top B^\top g=[2,-1]^\top$。B=0 时 $\nabla A=0,\nabla B=[6,-4]^\top,\nabla x=[3,-2]^\top$。**得分点：**缩放、外积维度、冻结 W 仍传输入梯度；A/B 同零会停在零任务梯度。`,
        },
        {
          q: "对 w=[-1,-0.2,0.3,1] 用 scale=max|w|/7 的对称均匀 4-bit 教学量化，求代码、反量化与最大误差。它是 NF4 吗？",
          a: String.raw`scale $=1/7$，round 后代码 $[-7,-1,2,7]$，反量化 $[-1,-1/7,2/7,1]$；最大误差来自 -0.2，等于 $2/35\approx0.057143$，小于 $s/2=1/14$。不是 NF4：该例是 15 个整数值，NF4 使用 16 个非均匀码本值。**得分点：**存储 code 与计算权重不同；说明零块/饱和边界；不伪称复现 NF4 码本。`,
        },
        {
          q: "32 层每层 Q/V 两个 4096 方阵都加 rank16 LoRA，训练状态按 16B/参数。求可训练参数与状态，为什么不能用这个数断言 QLoRA 总峰值？",
          a: String.raw`单矩阵 $16(4096+4096)=131072$，共 $64\times131072=8388608$ 参数，状态 $134217728$ 字节=128 MiB。还要加冻结基座量化 payload、scale、未量化层、激活、通信和临时反量化空间。**得分点：**逐矩阵求和；Q/V 同形是假设；4-bit 仅是部分存储格式，非所有训练状态。`,
        },
        {
          q: "LoRA 合并何时精确？rank1 的增量是否意味着整个 W+BA 也只有 rank1？",
          a: String.raw`eval、dropout 关闭且旁路为固定线性变换时，分配律给 $Wx+sBAx=(W+sBA)x$；低精度舍入仍可能产生微差。只有增量的 rank 不超过 1，原 W 满秩时和矩阵完全可以满秩。重新量化合并结果又引入新的近似。**得分点：**rank 约束对象；训练随机 mask 不能固定合并；浮点代数等价不等于重数量化无误差。`,
        },
      ],
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：低秩不是低要求",
      body: "回答时给出参数量、精度和部署三个层面的影响。",
      questions: [
        {
          q: "4096×4096 线性层使用 rank 8 的 LoRA，需要多少可训练矩阵参数？",
          a: "A 为 8×4096，B 为 4096×8，共 65,536 个参数；未计 bias。",
        },
        {
          q: "为什么常把 B 初始化为零而 A 随机初始化？",
          a: "这样初始 BA 为零，模型输出与基座一致；A 已非零，使损失可在第一步给 B 产生梯度。",
        },
        {
          q: "QLoRA 中哪些对象通常不是 4 bit？",
          a: "LoRA 可训练权重、其梯度和优化器状态通常保持更高精度，计算也常在 bf16；4 bit 主要用于冻结基座的存储。",
        },
        {
          q: "什么时候更应选择全参数微调而不是 LoRA？",
          a: "当任务与基座差异大、数据和算力充足、需要最大容量且不在意多 adapter 存储时；仍需用受控实验验证收益是否值得成本。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "LoRA",
      url: "https://arxiv.org/abs/2106.09685",
      evidence: "原始论文",
    },
    {
      label: "QLoRA",
      url: "https://arxiv.org/abs/2305.14314",
      evidence: "原始论文",
    },
    {
      label: "AdaLoRA",
      url: "https://arxiv.org/abs/2303.10512",
      evidence: "原始论文",
    },
    {
      label: "DoRA",
      url: "https://arxiv.org/abs/2402.09353",
      evidence: "原始论文",
    },
    {
      label: "Hugging Face PEFT LoRA documentation",
      url: "https://huggingface.co/docs/peft/main/en/package_reference/lora",
      evidence: "官方实现文档",
    },
  ],
};

export default chapter;
