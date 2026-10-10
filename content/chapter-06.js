const chapter = {
  id: "06",
  slug: "optimization-stability",
  part: "深度学习地基",
  title: "优化、初始化、归一化与正则化",
  subtitle: "让模型学得动、学得稳、不过拟合",
  level: "基础",
  duration: 130,
  prerequisites: ["05"],
  tags: ["SGD", "AdamW", "warmup", "cosine", "初始化", "归一化", "正则化"],
  objectives: [
    "解释 SGD、Momentum、Adam 与 AdamW 的更新差异",
    "计算 warmup 与 cosine 调度，并区分优化步和微批次计数",
    "理解 Xavier、Kaiming 和残差缩放的目标",
    "区分 BatchNorm、LayerNorm 与 RMSNorm",
    "按现象排查学习率、梯度和过拟合问题",
  ],
  summary:
    "优化器决定怎样使用梯度，初始化与归一化维持信号尺度，正则化限制模型对训练数据的过度适应；四者共同决定训练是否稳定。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：训练是一场有噪声的下山",
      body: String.raw`第 05 章已经检查过梯度，可训练曲线仍然忽上忽下，甚至加深网络后几乎不再下降。梯度没有算错，为什么模型还是学不好？先观察连续几批数据的梯度：一个方向始终一致，另一个方向却正负交替。这个具体问题会带我们区分“误差如何传回来”和“参数实际怎样移动”。

随机梯度下降每步只用一个小批次估计方向，成本低，但不同批次会带来噪声。Momentum 把近期梯度平均起来，让一致方向累积、交替方向部分抵消。Adam 进一步记录每个坐标的梯度及平方梯度历史，用各自尺度调节更新；AdamW 再把权重衰减独立出来。下面的两维算例先解释为什么值得保存历史，再推这些更新规则。

但优化器只能处理已经传到参数的梯度。如果信号在第一次前向就逐层放大或衰减，要回到初始化；如果训练过程中各层输入尺度不断变化，要检查归一化；如果训练集越来越好、验证集却变差，才转向正则化和数据划分。这里的每种工具都对应不同的失败位置。

读完本章，应能从激活统计、梯度范数、参数更新和验证误差四类证据选择下一步实验。LayerNorm 不能替代 weight decay，dropout 也不能修复错误学习率；我们会分别计算它们改变的量，而不把“稳定训练”当作同一种效果。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：为什么 Momentum 能减轻来回震荡",
      body: String.raw`想象损失面是一条狭长山谷。沿谷底方向，不同批次给出的梯度大多一致；横跨谷底的方向却经常正负交替。普通 SGD 只看当前批次，因此容易在两侧来回摆动。

Momentum 保存近期梯度的移动平均：

$$v_t=\beta v_{t-1}+(1-\beta)g_t$$

长期一致的方向会逐步积累，反复变号的方向则部分抵消，所以更新更倾向沿谷底前进。它不是凭空找到更好的方向，而是在时间上平滑随机梯度。

这也带来边界：当真实方向突然改变，历史会造成滞后；Momentum 也不能修复错误梯度、过大学习率或数据问题。Adam 在此基础上继续记录各坐标的典型幅度，用于调整相对步长，但全局学习率仍然需要选择。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：先定位尺度，再选择稳定性工具",
      body: String.raw`沿用刚才的两维梯度，如果平滑方向后训练仍失败，该往哪里查？先把优化器的历史统计和实际步长算清，再向前追溯到第一步之前的初始化，最后分析训练中的归一化、随机正则化和异常梯度限制。

优化器节用同一初始权重比较 AdamW 与加 L2 的 Adam；调度节把 warmup 与 cosine 变成每次更新的学习率；初始化节检查信号经过一层 ReLU 后剩下多少；归一化节追踪共享均值、方差怎样改变反向路径；最后把 dropout 的输出波动与裁剪的梯度界分开。期望方差需要时回看第 03 章，链式法则回看第 05 章。每算完一项，都将数字对应到一种可监控现象，再决定是否使用该工具。`,
      links: [
        { label: "优化器与偏差修正", sectionId: "derivation", level: "必会" },
        { label: "Warmup 与 cosine 的实际步长", sectionId: "math-learning-rate-schedule", level: "必会" },
        { label: "Xavier/He 方差传播", sectionId: "math-initialization", level: "推导" },
        { label: "BN/LN 完整前后向", sectionId: "math-normalization", level: "推导" },
        { label: "Dropout、裁剪与更新边界", sectionId: "math-dropout-clipping", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "稳定训练的四道关",
      body: String.raw`训练信号依次经过初始化、前向激活、反向梯度和参数更新。初始化使起点处的方差合适；归一化和残差让深层信号保持可传播；梯度裁剪限制梯度范数；优化器把梯度转成实际步长；正则化约束最终解的复杂度。

监控也应沿这条链排查。loss 第一批就 NaN，先看输入、精度、初始化和学习率；训练一段后突然崩溃，再看梯度范数、异常 batch 和 loss scaling；训练集持续变好而验证集恶化，则看数据、正则化和早停。

不要一次改五个超参数。先确保小数据能过拟合，证明代码和梯度通路可用；再扩大数据，调学习率；最后处理泛化与效率。`,
      diagram: {
        kind: "flow",
        nodes: [
          "初始化尺度",
          "前向激活",
          "反向梯度",
          "优化器更新",
          "验证集泛化",
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
      title: "Adam、偏差修正与 AdamW",
      body: String.raw`刚才的移动平均能削弱震荡，但梯度大的坐标仍可能走得太远。能否根据每个坐标自己的历史尺度调整步长？我们从零状态开始算一次 Adam，再用同一个权重比较两种衰减方式，看看名字相近的配置是否真的等价。

**先算一个坐标的第一步。** 梯度为 2，两个历史状态从零开始，衰减系数分别为 0.9、0.999：

| 状态 | 第一步计算 | 修正初始化偏小后 |
|---|---|---|
| 梯度平均方向 m | 0.1×2=0.2 | 0.2/0.1=2 |
| 梯度平方幅度 v | 0.001×4=0.004 | 0.004/0.001=4 |

忽略很小的稳定常数，方向 2 除以幅度的平方根 2，得到 1。因此学习率为 0.1 时，参数减去 0.1。这不是说所有训练步都减去相同大小；这里是从零状态开始的单坐标例子。

**再写历史如何更新。** 参数向量记为 $\theta_t$，当前数据损失梯度为 $g_t$，学习率为 $\eta$。SGD 直接减去学习率乘梯度；Adam 则先维护两个与参数同形的状态：

$$m_t=\beta_1m_{t-1}+(1-\beta_1)g_t$$

$$v_t=\beta_2v_{t-1}+(1-\beta_2)g_t^2$$

平方、开方和除法都逐坐标进行。初期历史还没填满，需要除以已累计的权重：

$$\hat m_t=\frac{m_t}{1-\beta_1^t},\qquad
\hat v_t=\frac{v_t}{1-\beta_2^t}$$

更新为：

$$\theta_{t+1}=\theta_t-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}$$

若把 L2 正则直接加进梯度，$g_t+\lambda\theta_t$ 会一起进入自适应分母，不同参数受到的衰减被扭曲。AdamW 把衰减独立写为：

$$\theta_{t+1}=(1-\eta\lambda)\theta_t
-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}$$

**回访：偏差修正的依据。** 从零状态展开，$m_t=(1-\beta_1)\sum_{k=1}^t\beta_1^{t-k}g_k$。若各步梯度期望为固定的 $\mu$，几何级数给出 $\mathbb E[m_t]=(1-\beta_1^t)\mu$；对梯度平方可作相同论证。

这只消除平稳矩假设下零初始化造成的偏小，不保证非平稳训练中修正后的比值是无偏下降方向；v 记录的也不是中心化方差。

**用同一例子比较衰减。** 初始参数为 2，学习率 0.1，衰减系数 0.1。AdamW 在刚才的 0.1 更新之外再减去 0.02，得到 1.88；Adam 加 L2 则把梯度改成 2.2，首步修正后仍减去 0.1，得到 1.9（均忽略稳定常数）。

同样的系数得到不同结果，差别在于衰减是否进入历史矩和分母。普通 SGD 中，L2 与乘性衰减等价；加入动量或自适应历史后不能直接套用。

本章动量使用含 $(1-\beta)$ 的指数平均，有些实现省去该系数，学习率不可直接照搬。是否衰减 bias 和归一化参数则是参数组策略，不是 AdamW 的数学定义。下一节再让全局学习率随进度变化。`,
    },
    {
      id: "math-learning-rate-schedule",
      type: "derivation",
      title: "学习率调度：先稳定启动，再逐步细调",
      body: String.raw`Adam 会按历史梯度缩放坐标，却仍需要全局学习率。第一步就使用很大的步长，可能破坏尚未稳定的表示；训练后期仍保持大步，也可能在低损失区域来回波动。怎样把“先慢、再快、最后细调”变成每步可核对的数字？

设总优化步数为 $T$，warmup 步数为 $W$，满足 $0\le W<T$；最高、最低学习率为 $\eta_{\max}\ge\eta_{\min}\ge0$。$u$ 表示优化进度，本节约定**第 $u=1$ 次 optimizer update 使用 $\eta(1)$**。先线性升温，再做一次不重启的 cosine 衰减：

$$\eta(u)=
\begin{cases}
\eta_{\max}u/W,&0\le u<W,\ W>0,\\
\eta_{\min}+\dfrac{\eta_{\max}-\eta_{\min}}2
\left[1+\cos\left(\pi\dfrac{u-W}{T-W}\right)\right],&W\le u\le T.
\end{cases}$$

线性分支连接 0 与 $\eta_{\max}$；余弦分支把进度 $v=(u-W)/(T-W)$ 映射到 $[0,1]$，因为 $\cos0=1,\cos\pi=-1$，在两端分别得到最高和最低学习率。$W=0$ 时跳过升温分支，不计算除以零；$u>T$ 时本节保持 $\eta_{\min}$。这是线性 warmup 与单段 cosine 的教学组合；SGDR 的 warm restart 会重新升高学习率并保留模型参数，与 warmup 不是一回事。

**手算。** $W=2,T=10,\eta_{\max}=0.001,\eta_{\min}=0.0001$：

| 优化步 $u$ | 计算依据 | 学习率 |
|---|---|---|
| 1 | 升温走到一半 | 0.0005 |
| 2 | 升温终点、余弦起点 | 0.001 |
| 6 | 衰减进度 1/2，$\cos(\pi/2)=0$ | 0.00055 |
| 10 | 衰减终点 | 0.0001 |

若 Adam 该步的预条件方向幅度为 1，这四个数就是数据梯度造成的参数步长；方向幅度变化时仍须乘相应方向，不能把调度曲线直接当真实更新范数。

每累积 4 个 microbatch 才更新一次参数，就每 4 批推进一次 $u$，而不是每批推进。若因非有限梯度跳过 optimizer update，本约定也不推进；恢复 checkpoint 要恢复优化器状态和步数。框架在 update 前后调用 scheduler 的约定可能不同，应打印前两次和最后一次实际学习率核对，不能只看配置名。改变 batch/token 预算后也要重新解释 $T$。

得到 0.00055 说明第 6 步已经开始细调，却仍高于最低学习率；它没有证明该调度适合所有任务。若降低首步仍无法避免激活逐层爆炸，下一节需检查初始化的方差传播。`,
    },
    {
      id: "math-initialization",
      type: "derivation",
      title: "Xavier 与 He：为什么方差里出现 fan-in 和 2",
      body: String.raw`还没做任何参数更新，输入经过许多层后就几乎全变成零，优化器能补救吗？先算一层随机权重怎样改变信号的平方幅度，再选择让这种幅度不会层层缩水的初始化。线性层与 ReLU 丢失的幅度不同，所以需要不同的方差。

对一层 $z_j=\sum_{i=1}^{n_{in}}W_{ij}x_i$，$W\in\mathbb R^{n_{in}\times n_{out}}$，输入、输出宽度分别为 $n_{in},n_{out}$。先假设权重独立、零均值，权重与输入独立；不同求和项不相关。展开平方后交叉项消失，只剩每项的二阶矩相加：

$$\mathbb E[z_j^2]=n_{in}\operatorname{Var}(W_{ij})\mathbb E[x_i^2].$$

线性/近线性激活下，前向保二阶矩要求 $\operatorname{Var}(W)=1/n_{in}$；反向 $\nabla_xL=(\nabla_zL)W^\top$ 类似地要求 $1/n_{out}$。当两者不等，Xavier 折中选 $2/(n_{in}+n_{out})$。若均匀分布 $U[-a,a]$，其方差 $a^2/3$，所以 $a=\sqrt{6/(n_{in}+n_{out})}$。

对关于 0 对称的 $z$，ReLU 满足 $\mathbb E[\max(0,z)^2]=\mathbb E[z^2]/2$；注意这是二阶矩减半，不是中心化方差严格减半，因为 ReLU 均值大于 0。保持层间二阶矩得 He fan-in 初始化：

$$\operatorname{Var}(W)=\frac{2}{n_{in}}.$$

**数值例。** $n_{in}=n_{out}=256$：Xavier 方差 $1/256$，标准差 $0.0625$；He 方差 $1/128$，标准差约 $0.0883883$。若输入二阶矩为 1，Xavier 后 ReLU 二阶矩约 0.5，He 后约 1。

这个 256 维例子说明，He 更大的标准差是在补偿 ReLU 截断后的二阶矩损失，不是让模型任意放大输出。实际可以在第一次更新前逐层记录二阶矩，检查假设是否大致成立。

矩阵相关性、非零偏置和深层分布漂移都会破坏独立假设。残差 $x+f(x)$ 的方差还包含 $2\operatorname{Cov}(x,f(x))$，不能盲目按层数相加。初始化只控制起点附近尺度，不保证所有 Jacobian 奇异值接近 1；后者是更强的动力学条件。训练后分布还会变化，下一节因此研究在前向过程中重新计算尺度的归一化。`,
    },
    {
      id: "math-normalization",
      type: "derivation",
      title: "BN 与 LN：统计轴、运行状态和完整反向",
      body: String.raw`初始尺度合适，后续层的输入仍会随训练改变。我们想把一组数按它们自己的均值和波动重新缩放，但这一组究竟包含哪些数？当其中一个输入改变时，共享均值和方差也会改变，所以反向不能只除一个常数。

先对一个包含 $n$ 个元素的向量 $x$ 定义统计量：$\mu=n^{-1}\sum_i x_i$，$v=n^{-1}\sum_i(x_i-\mu)^2$，$r=\sqrt{v+\epsilon}$，$\hat x_i=(x_i-\mu)/r$，$y_i=\gamma_i\hat x_i+\beta_i$。其中 $\gamma,\beta$ 是可学习缩放和偏移，$\epsilon$ 防止分母为零；具体由哪些元素组成一组，才是 BN 与 LN 的区别。

LN 对 $[B,S,H]$ 的每个 token 独立沿 $H$ 计算，$\gamma,\beta\in\mathbb R^H$，训练与推理使用同一规则。CNN 的 BN 对 $[B,C,H,W]$ 每通道沿 $B,H,W$ 计算，组大小 $n=BHW$，同一通道的 $\gamma_c,\beta_c$ 共享；推理改用运行均值/方差。BN 训练前向常用上述除以 $n$ 的方差，某些框架更新 running variance 时用无偏估计，需核对实现。

若约定 $\rho$ 是新 batch 的权重，运行均值更新为 $\mu_{run}\leftarrow(1-\rho)\mu_{run}+\rho\mu_{batch}$，方差作同类更新，但使用有偏还是无偏 batch 方差由实现决定。以一组 $[1,3]$ 为例，均值 2、训练前向方差 1、无偏方差 2；若旧运行均值/方差为 0/1、$\rho=0.1$ 且用无偏方差更新，新的运行统计为 0.2/1.1。这里的“momentum”命名可能与优化器保留旧状态的系数相反。

运行统计解决推理时使用哪一组尺度；反向还要回答当前输入参与了哪些计算。设 $g_i=\partial L/\partial y_i$，$u_i=g_i\gamma_i$。微分满足 $d\mu=\operatorname{mean}(dx)$、$dv=2n^{-1}\sum_i(x_i-\mu)dx_i$，代入 $d\hat x_i=(dx_i-d\mu)/r-(x_i-\mu)dv/(2r^3)$ 并收集 $dx_i$，分别得到直接路径、均值路径和方差路径：

$$\frac{\partial L}{\partial x_i}
=\frac1r\left[u_i-\operatorname{mean}(u)
-\hat x_i\operatorname{mean}(u\odot\hat x)\right].$$

仿射参数梯度为 $\nabla_\gamma L=\sum_{\text{共享轴}}g\odot\hat x$，$\nabla_\beta L=\sum_{\text{共享轴}}g$。上式适用于统计量依赖当前输入的训练 BN/LN；BN 推理统计冻结后，输入导数是简单的 $g_i\gamma_i/r$，不能继续使用去均值项。

**手算。** LN 的 $x=[1,2,3],\gamma=\mathbf1,\beta=0,\epsilon=0$，$\mu=2,v=2/3$，$\hat x=[-\sqrt{3/2},0,\sqrt{3/2}]$。若 $g=[1,0,0]$，则：

$$\nabla_xL=\sqrt{3/2}[1/6,-1/3,1/6]
\approx[0.204124,-0.408248,0.204124].$$

虽然上游只要求改变第一个输出，三个输入都收到梯度，因为它们共同决定均值和分母。梯度和为 0，因为平移 $x+c\mathbf1$ 不改变 LN。零方差时必须有 $\epsilon>0$；此时输出归一化项为 0，但 Jacobian 一般不是 0。BN 组大小为 1 时统计退化，许多训练实现直接拒绝；这不等于卷积 BN 的 batch=1 必定不可用，因为空间轴也可能提供样本。调试时先打印统计轴和 train/eval 状态，再用这个三元素例核对反向；不要用 dropout 或裁剪掩盖统计规则错误。`,
    },
    {
      id: "math-dropout-clipping",
      type: "derivation",
      title: "Dropout 的期望与梯度裁剪的几何含义",
      body: String.raw`尺度和更新都检查过后，还可能有两种不同问题：模型过度依赖少数特征，或者某个异常批次给出过大的梯度。随机丢弃激活和缩短梯度分别改动哪里？我们先算丢弃后均值是否改变，再算裁剪到底约束了什么，避免把二者当成同一种“稳训练”按钮。

Dropout 的保留概率为 $q=1-p$，随机掩码 $m_i\sim\operatorname{Bernoulli}(q)$，训练时 inverted dropout 输出 $\tilde x_i=m_ix_i/q$。在给定输入条件下，对保留和丢弃两种结果加权：

$$\mathbb E[\tilde x_i\mid x_i]=x_i,\quad
\mathbb E[\tilde x_i^2\mid x_i]=x_i^2/q,\quad
\operatorname{Var}(\tilde x_i\mid x_i)=x_i^2(1-q)/q.$$

因此推理关闭 dropout 可保持这一层的条件均值，不保证 $\mathbb E[f(\tilde x)]=f(x)$，非线性与期望不能交换。固定 mask 的反向是 $g_i m_i/q$。

**手算。** $x=2,q=3/4$ 时以 $3/4$ 概率输出 $8/3$、以 $1/4$ 概率输出 0，均值 2、方差 $4/3$。若忘记除以 $q$，均值变为 1.5。$q=0$ 无法使用该公式，$q=1$ 为恒等映射。

得到均值 2、方差 $4/3$，说明补偿保住了平均输入，却主动引入波动，这是正则化的机制，不是异常梯度的上界。要限制反向后的异常梯度，换到另一个对象：把所有待裁剪参数的梯度拼成 $g\in\mathbb R^P$，给阈值 $\tau>0$：

$$g'=g\min\left(1,\frac{\tau}{\|g\|_2}\right),$$

$g=0$ 时直接返回 0。这是把梯度投影到半径 $\tau$ 的欧氏球：只在越界时沿同一方向缩短，不等于逐元素 clip。$g=[3,4],\tau=2$ 时范数 5，结果 $[1.2,1.6]$。SGD 的更新范数不超过 $\eta\tau$；Adam 之后还会自适应预条件化，不能保证同一个更新上界。

裁剪例把范数从 5 降到 2，并保留 3:4 的方向比例，因而适合检查实现是否误做了逐元素截断。混合精度先 unscale，再判断非有限值，再裁剪；梯度累积通常在所有 micro-batch 累加完才裁剪。分片梯度的全局范数需要跨设备汇总平方和。裁剪只能限制已有梯度，不能恢复消失梯度，也不应把 NaN 静默当成 0。到这里，前向统计、反向信号、实际更新和泛化已有各自的检查对象；第 07 章会把同一套反传工具用于跨位置共享的网络。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：观察 Adam 的第一步",
      body: String.raw`下面计算单参数 Adam。偏差修正后，第一步的幅度几乎只由学习率和梯度符号决定，这也是训练初期常需要 warmup 的原因之一。

~~~python
from math import sqrt

gradient = 100.0
beta1, beta2 = 0.9, 0.999
learning_rate = 1e-3
epsilon = 1e-8

m = (1 - beta1) * gradient
v = (1 - beta2) * gradient ** 2
m_hat = m / (1 - beta1)
v_hat = v / (1 - beta2)
step = learning_rate * m_hat / (sqrt(v_hat) + epsilon)

print("raw moments:", m, v)
print("corrected moments:", m_hat, v_hat)
print("first step:", step)  # 接近 0.001
~~~

若没有偏差修正，早期矩估计被零初始化压小。warmup 则逐步把全局学习率从很小值升到目标值，为参数统计、激活尺度和优化器状态提供过渡；它与偏差修正相关，但不是只为修正 Adam 一个公式。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：名字相近的操作作用位置不同",
      body: String.raw`**梯度裁剪与 PPO clip 不同。** 前者在反向后限制梯度向量范数，但不直接给出 Adam 参数步的同一上界；后者抑制样本 surrogate 超出区间后的部分更新激励，不保证实际概率比或 KL 的硬界，见第 16 章。

**Adam 加 L2 不总等于 AdamW。** 对普通 SGD 二者可等价，但 Adam 会按历史平方梯度缩放混合后的梯度，所以应使用解耦 weight decay。

**Batch 越大不一定越好。** 大 batch 降低梯度噪声并提高硬件利用率，但可能需要学习率缩放，且减少噪声带来的隐式正则。超过临界 batch 后，继续增大 batch 对减少优化步数的收益通常趋于饱和。

**归一化不等于把所有值限制在固定区间。** LayerNorm 标准化后还有可学习缩放与偏移，后续线性层也能改变范围。

**dropout 推理时不能保持原样。** 训练时随机丢弃并做尺度补偿，推理时关闭随机性。忘记切换 eval 模式会导致结果漂移。

**初始化不能治愈结构缺陷。** 它只保证起点附近的信号尺度，深层训练仍依赖残差、归一化和优化设置。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "优化器与归一化怎么选",
      body: String.raw`| 方法 | 核心状态 | 优势 | 常见场景 |
|---|---|---|---|
| SGD | 当前梯度 | 简单、内存低 | 经典视觉模型 |
| Momentum | 一阶动量 | 减少震荡、加速一致方向 | CNN、大批训练 |
| Adam | 一阶与二阶矩 | 对尺度自适应、易起步 | Transformer |
| AdamW | Adam + 解耦衰减 | 正则语义更清晰 | 现代 LLM 默认选择 |
| Adafactor | 因式分解二阶矩 | 降低优化器状态显存 | 超大矩阵 |
| 8-bit Adam | 量化状态 | 节省显存 | 微调和大模型训练 |

BatchNorm 按 batch 统计每个通道，需要训练与推理两套行为，适合卷积网络；LayerNorm 对单样本的特征维归一化，不依赖其他样本，适合变长序列；RMSNorm 省去均值中心化，只按均方根缩放，现代 LLM 常用。

初始化上，tanh 类网络常用 Xavier 保持前后向方差；ReLU 类常用 Kaiming 补偿半数激活归零；深残差网络还会缩放残差分支，避免层数增加时方差累积。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：AdamW 为什么不是 Adam 加 L2",
      body: String.raw`**30 秒回答：**“L2 正则把 $\lambda\theta$ 加进梯度，Adam 随后会用每个参数的二阶矩对它一起缩放，导致实际衰减强度依赖梯度历史。AdamW 把权重衰减从自适应梯度更新中分离，直接做 $\theta\leftarrow(1-\eta\lambda)\theta$，因此控制更一致。” 

若追问 Adam 偏差修正：一二阶矩从零开始，训练早期会被初始化系统性压小；偏差修正除去对应的累计衰减系数。它修正的是矩估计的零初始化效应，不能声称整个非线性参数更新无偏。

若追问 Pre-LN 与 Post-LN：Post-LN 在残差相加后归一化，原始 Transformer 使用它但深层梯度更难；Pre-LN 在子层前归一化，残差主干提供更直接梯度路径，训练通常更稳，但最终表示性质有所不同。

若追问调参顺序：先排除数据和实现错误，做小样本过拟合；再找到稳定学习率与 warmup；之后调 batch、weight decay 和 dropout；一次只改变少数因素并保存完整实验配置。

白板推导需要进一步说明：LayerNorm 的统计量参与当前计算图，而冻结统计的 BatchNorm 推理不再对均值方差求导；梯度裁剪限制的对象也不等于 Adam 最终参数更新。精确公式与算例见本章白板练习。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：更新、方差与归一化",
      body: "所有数值题均先写假设；优化器题忽略 epsilon，归一化题另行明确 epsilon。",
      questions: [
        {
          q: "theta=2、g=2、学习率 0.1、衰减 0.1，Adam 从零状态开始。求 AdamW 与 Adam 加 L2 的第一步并解释差异。",
          a: String.raw`偏差修正后 $\hat m=g,\hat v=g^2$，Adam 数据更新为 0.1。AdamW 得 $(1-0.01)2-0.1=1.88$；L2 梯度变为 $2+0.1\times2=2.2$，进入一二阶矩后首步仍为 0.1，得 1.9。**得分点：**展开零初始化偏差；指出 L2 进入矩统计；不把普通 SGD 的等价关系搬到 Adam。`,
        },
        {
          q: "fan-in=fan-out=256、对称零均值预激活且输入二阶矩为 1。为什么 ReLU 常用 He 而非 Xavier？",
          a: String.raw`线性层二阶矩为 $256\operatorname{Var}(W)$，ReLU 保留其一半。Xavier 方差 $1/256$ 给输出二阶矩 $1/2$；He 方差 $2/256$ 给 1，标准差分别为 0.0625 与 0.0883883。**得分点：**独立/对称假设；用二阶矩而非错误声称 ReLU 中心化方差严格减半；说明训练后不保证仍成立。`,
        },
        {
          q: "LN 输入 [1,2,3]、gamma=1、beta=0、epsilon=0，上游 [1,0,0]，求输入梯度。若改为冻结统计的 BN 推理呢？",
          a: String.raw`$\mu=2,r=\sqrt{2/3}$，代入 $[u-\bar u-\hat x\,\overline{u\hat x}]/r$ 得 $\sqrt{3/2}[1/6,-1/3,1/6]$。若 BN 推理固定同一组数值统计，均值方差不对输入求导，结果为 $[1/r,0,0]$。**得分点：**统计轴及统计是否参与计算图；LN 梯度和为 0；不能混用训练和推理 Jacobian。`,
        },
        {
          q: "x=2、dropout 保留率 0.75；梯度 [3,4]、裁剪阈值 2。分别求 dropout 均值方差与裁剪结果，裁剪能保证 Adam 步长不超过 2 eta 吗？",
          a: String.raw`输出为 $8/3$ 或 0，均值 2，方差 $4(1-0.75)/0.75=4/3$。梯度范数 5，乘 $2/5$ 得 $[1.2,1.6]$。只能对直接使用此梯度的 SGD 得到更新界 $\eta\tau$；Adam 的历史矩和逐坐标缩放可能改变它。**得分点：**区分保持均值与保持网络输出；区分梯度界与更新界。`,
        },
        {
          q: "线性 warmup 接单段 cosine，W=2、T=10、最高/最低学习率为 0.001/0.0001。求第 1、2、6、10 次更新的学习率。累积 4 批更新一次时如何计数？",
          a: String.raw`分别为 0.0005、0.001、0.00055、0.0001；第 6 步的衰减进度是 $(6-2)/(10-2)=1/2$。每 4 个 microbatch 后的一次真实参数更新推进一次计数。**得分点：**声明首步索引、两个端点、无 warmup 分支、恢复步数；warm restart 不是 warmup。`,
        },
      ],
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：训练稳定性工具箱",
      body: "回答时说明每个方法作用于训练链的哪个位置。",
      questions: [
        {
          q: "Momentum 为什么能降低狭长谷底中的左右震荡？",
          a: "震荡方向的梯度正负交替，在指数移动平均中互相抵消；长期一致的下降方向会累积，因此更新更平滑。",
        },
        {
          q: "只改变同批其他样本，某条固定样本的 LayerNorm 结果会因此改变吗？与训练时的 BatchNorm 有何不同？",
          a: "标准 LayerNorm 按这一条样本自身的特征计算统计量，因此不变；训练时 BatchNorm 使用批内统计，可能受其他样本影响。关键是均值和方差沿哪些轴计算。",
        },
        {
          q: "训练集损失下降、验证集损失持续上升，优先怀疑什么？",
          a: "这是过拟合信号。先检查数据划分和泄漏，再考虑更多数据、weight decay、dropout、数据增强、早停或减小模型容量。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "SGDR: Stochastic Gradient Descent with Warm Restarts",
      url: "https://arxiv.org/html/1608.03983v5#S3",
      evidence: "§3 的 cosine 与重启；本章明确采用另行组合的线性 warmup＋不重启调度",
    },
    {
      label: "Adam",
      url: "https://arxiv.org/abs/1412.6980",
      evidence: "原始论文",
    },
    {
      label: "Decoupled Weight Decay Regularization",
      url: "https://arxiv.org/abs/1711.05101",
      evidence: "原始论文",
    },
    {
      label: "Delving Deep into Rectifiers",
      url: "https://arxiv.org/abs/1502.01852",
      evidence: "原始论文",
    },
    {
      label: "Understanding the difficulty of training deep feedforward neural networks",
      url: "https://proceedings.mlr.press/v9/glorot10a.html",
      evidence: "Xavier 初始化原始论文；正文数字为教学算例",
    },
    {
      label: "Batch Normalization",
      url: "https://arxiv.org/abs/1502.03167",
      evidence: "原始论文；运行方差约定需另核具体框架",
    },
    {
      label: "Layer Normalization",
      url: "https://arxiv.org/abs/1607.06450",
      evidence: "原始论文；正文反向为链式法则推导",
    },
  ],
};

export default chapter;
