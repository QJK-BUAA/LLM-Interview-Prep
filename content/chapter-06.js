const chapter = {
  id: "06",
  slug: "optimization-stability",
  part: "深度学习地基",
  title: "优化、初始化、归一化与正则化",
  subtitle: "让模型学得动、学得稳、不过拟合",
  level: "基础",
  duration: 110,
  prerequisites: ["05"],
  tags: ["SGD", "AdamW", "初始化", "归一化", "正则化"],
  objectives: [
    "解释 SGD、Momentum、Adam 与 AdamW 的更新差异",
    "理解 Xavier、Kaiming 和残差缩放的目标",
    "区分 BatchNorm、LayerNorm 与 RMSNorm",
    "按现象排查学习率、梯度和过拟合问题",
  ],
  summary:
    "优化器决定怎样使用梯度，初始化与归一化维持信号尺度，正则化限制模型对训练数据的过度适应；四者共同决定训练是否稳定。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：先定位尺度，再选择稳定性工具",
      body: String.raw`先修：第 05 章的链式法则、batch 梯度与计算图，第 03 章的期望和方差。学习顺序是 SGD/动量与 Adam 偏差修正 → 解耦衰减 → 初始化方差 → BN/LN 的统计轴与反传 → dropout 与裁剪。面试时先区分“前向尺度”“反向梯度”“参数更新”“泛化约束”，再说明工具的作用位置；不能把所有不稳定现象都归因于学习率。`,
      links: [
        { label: "优化器与偏差修正", sectionId: "derivation", level: "必会" },
        { label: "Xavier/He 方差传播", sectionId: "math-initialization", level: "推导" },
        { label: "BN/LN 完整前后向", sectionId: "math-normalization", level: "推导" },
        { label: "Dropout、裁剪与更新边界", sectionId: "math-dropout-clipping", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：训练是一场有噪声的下山",
      body: String.raw`损失面像高维山区，梯度给出脚下最陡的上坡方向。SGD 沿反方向走，但每次只看一个 mini-batch，所以方向带噪声。噪声并非纯坏事：它降低单步成本，也可能帮助离开尖锐区域；但噪声过大会让训练震荡。

Momentum 像给移动加入惯性，连续方向一致时加速，来回震荡的方向相互抵消。Adam 再为每个参数维护梯度的一阶矩和平方梯度的二阶矩，让不同尺度的参数获得自适应步长。AdamW 把权重衰减从梯度适配中解耦，避免 L2 项被不同参数的自适应缩放扭曲。

初始化解决“第一步之前”的尺度问题。权重过大，激活和梯度可能爆炸；过小则逐层消失。Xavier 针对前后向方差平衡，Kaiming 考虑 ReLU 丢掉约一半信号。

归一化在训练过程中稳定激活尺度，正则化则限制过拟合。它们目的不同：LayerNorm 不是为了替代 weight decay，dropout 也不能修复错误的学习率。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：为什么 Momentum 能穿过之字形山谷",
      body: String.raw`假设连续三步梯度分别为 $g_1=[2,10]$、$g_2=[2,-8]$、$g_3=[2,9]$。第一维方向一直为正，第二维正负震荡。普通 SGD 每步直接使用当前梯度，第二维会左右摆动。

Momentum 定义速度：

$$v_t=\beta v_{t-1}+(1-\beta)g_t$$

取 $\beta=0.9$、$v_0=0$：

$$v_1=[0.2,1.0]$$

$$v_2=0.9[0.2,1.0]+0.1[2,-8]=[0.38,0.1]$$

第二维的 10 与 -8 大量抵消，第一维因方向一致继续积累。参数更新 $\theta\leftarrow\theta-\eta v_t$ 因而更沿山谷前进，而不是撞向两侧。

Adam 还会用平方梯度估计每一维的典型尺度。某维梯度长期很大，分母随之增大，实际步长被压低；稀疏或较小梯度方向获得相对更大更新。它不是自动找到最佳学习率，整体学习率仍是最重要超参数之一。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "稳定训练的四道关",
      body: String.raw`训练信号依次经过初始化、前向激活、反向梯度和参数更新。初始化使起点处的方差合适；归一化和残差让深层信号保持可传播；梯度裁剪限制异常更新；优化器把梯度转成实际步长；正则化约束最终解的复杂度。

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
      body: String.raw`**统一约定。** 参数 $\theta_t\in\mathbb R^P$，$g_t=\nabla_\theta L_t$ 同维。SGD 为 $\theta_{t+1}=\theta_t-\eta g_t$。本章动量用 $u_t=\beta u_{t-1}+(1-\beta)g_t$ 再更新 $\theta-\eta u_t$；另一常见实现省去 $1-\beta$，其学习率不可直接照搬。

Adam 对梯度 $g_t$ 维护逐元素指数移动平均：

$$m_t=\beta_1m_{t-1}+(1-\beta_1)g_t$$

$$v_t=\beta_2v_{t-1}+(1-\beta_2)g_t^2$$

从 $m_0=0$ 展开递推，$m_t=(1-\beta_1)\sum_{k=1}^t\beta_1^{t-k}g_k$。若 $\mathbb E[g_k]=\mu$ 固定，则几何级数给 $\mathbb E[m_t]=(1-\beta_1^t)\mu$；对 $g_k^2$ 作相同论证得到二阶原始矩修正：

$$\hat m_t=\frac{m_t}{1-\beta_1^t},\qquad
\hat v_t=\frac{v_t}{1-\beta_2^t}$$

更新为：

$$\theta_{t+1}=\theta_t-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}$$

若把 L2 正则直接加进梯度，$g_t+\lambda\theta_t$ 会一起进入自适应分母，不同参数受到的衰减被扭曲。AdamW 把衰减独立写为：

$$\theta_{t+1}=(1-\eta\lambda)\theta_t
-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}$$

这就是“解耦权重衰减”。偏差修正消除的是零初始化在平稳矩假设下的偏差，不保证非平稳训练中 $\hat m/\sqrt{\hat v}$ 是无偏下降方向；$v$ 也不是中心化方差。

**手算与反例。** 第一维 $g=2,\beta_1=0.9,\beta_2=0.999$，第一步 $m=0.2,v=0.004,\hat m=2,\hat v=4$，忽略 $\epsilon$ 的 Adam 更新为 $\eta$。若 $\theta=2,\eta=0.1,\lambda=0.1$，AdamW 得 $2-0.1-0.02=1.88$；Adam 加 L2 的第一步使用 $g'=2.2$，修正后仍是符号步长 0.1，结果 1.9。可见二者不等价。

普通 SGD 对 $L+\lambda\|\theta\|^2/2$ 更新恰为 $(1-\eta\lambda)\theta-\eta g$；加上动量或自适应历史后不能直接套这个等价式。实践中通常不衰减 bias 和归一化缩放参数，这是参数组策略，不是 AdamW 数学定义。`,
    },
    {
      id: "math-initialization",
      type: "derivation",
      title: "Xavier 与 He：为什么方差里出现 fan-in 和 2",
      body: String.raw`**目标与假设。** 一层 $z_j=\sum_{i=1}^{n_{in}}W_{ij}x_i$，$W\in\mathbb R^{n_{in}\times n_{out}}$。先假设权重独立、零均值，权重与输入独立；不同求和项不相关。于是交叉项消失：

$$\mathbb E[z_j^2]=n_{in}\operatorname{Var}(W_{ij})\mathbb E[x_i^2].$$

线性/近线性激活下，前向保二阶矩要求 $\operatorname{Var}(W)=1/n_{in}$；反向 $\nabla_xL=(\nabla_zL)W^\top$ 类似地要求 $1/n_{out}$。当两者不等，Xavier 折中选 $2/(n_{in}+n_{out})$。若均匀分布 $U[-a,a]$，其方差 $a^2/3$，所以 $a=\sqrt{6/(n_{in}+n_{out})}$。

对关于 0 对称的 $z$，ReLU 满足 $\mathbb E[\max(0,z)^2]=\mathbb E[z^2]/2$；注意这是二阶矩减半，不是中心化方差严格减半，因为 ReLU 均值大于 0。保持层间二阶矩得 He fan-in 初始化：

$$\operatorname{Var}(W)=\frac{2}{n_{in}}.$$

**数值例。** $n_{in}=n_{out}=256$：Xavier 方差 $1/256$，标准差 $0.0625$；He 方差 $1/128$，标准差约 $0.0883883$。若输入二阶矩为 1，Xavier 后 ReLU 二阶矩约 0.5，He 后约 1。

**边界与追问。** 矩阵相关性、非零偏置和深层分布漂移都会破坏独立假设。残差 $x+f(x)$ 的方差还包含 $2\operatorname{Cov}(x,f(x))$，不能盲目按层数相加。初始化只控制起点附近尺度，不保证所有 Jacobian 奇异值接近 1；后者是更强的动力学条件。`,
    },
    {
      id: "math-normalization",
      type: "derivation",
      title: "BN 与 LN：统计轴、运行状态和完整反向",
      body: String.raw`**先确定归一化组。** 对一个包含 $n$ 个元素的向量 $x$，定义 $\mu=n^{-1}\sum_i x_i$，$v=n^{-1}\sum_i(x_i-\mu)^2$，$r=\sqrt{v+\epsilon}$，$\hat x_i=(x_i-\mu)/r$，$y_i=\gamma_i\hat x_i+\beta_i$。

LN 对 $[B,S,H]$ 的每个 token 独立沿 $H$ 计算，$\gamma,\beta\in\mathbb R^H$，训练与推理使用同一规则。CNN 的 BN 对 $[B,C,H,W]$ 每通道沿 $B,H,W$ 计算，组大小 $n=BHW$，同一通道的 $\gamma_c,\beta_c$ 共享；推理改用运行均值/方差。BN 训练前向常用上述除以 $n$ 的方差，某些框架更新 running variance 时用无偏估计，需核对实现。

若约定 $\rho$ 是新 batch 的权重，运行均值更新为 $\mu_{run}\leftarrow(1-\rho)\mu_{run}+\rho\mu_{batch}$，方差作同类更新，但使用有偏还是无偏 batch 方差由实现决定。以一组 $[1,3]$ 为例，均值 2、训练前向方差 1、无偏方差 2；若旧运行均值/方差为 0/1、$\rho=0.1$ 且用无偏方差更新，新的运行统计为 0.2/1.1。这里的“momentum”命名可能与优化器保留旧状态的系数相反。

**反向推导。** 设 $g_i=\partial L/\partial y_i$，$u_i=g_i\gamma_i$。微分满足 $d\mu=\operatorname{mean}(dx)$、$dv=2n^{-1}\sum_i(x_i-\mu)dx_i$，代入 $d\hat x_i=(dx_i-d\mu)/r-(x_i-\mu)dv/(2r^3)$ 并收集 $dx_i$：

$$\frac{\partial L}{\partial x_i}
=\frac1r\left[u_i-\operatorname{mean}(u)
-\hat x_i\operatorname{mean}(u\odot\hat x)\right].$$

仿射参数梯度为 $\nabla_\gamma L=\sum_{\text{共享轴}}g\odot\hat x$，$\nabla_\beta L=\sum_{\text{共享轴}}g$。上式适用于统计量依赖当前输入的训练 BN/LN；BN 推理统计冻结后，输入导数是简单的 $g_i\gamma_i/r$，不能继续使用去均值项。

**手算。** LN 的 $x=[1,2,3],\gamma=\mathbf1,\beta=0,\epsilon=0$，$\mu=2,v=2/3$，$\hat x=[-\sqrt{3/2},0,\sqrt{3/2}]$。若 $g=[1,0,0]$，则：

$$\nabla_xL=\sqrt{3/2}[1/6,-1/3,1/6]
\approx[0.204124,-0.408248,0.204124].$$

梯度和为 0，因为平移 $x+c\mathbf1$ 不改变 LN。零方差时必须有 $\epsilon>0$；此时输出归一化项为 0，但 Jacobian 一般不是 0。BN 组大小为 1 时统计退化，许多训练实现直接拒绝；这不等于卷积 BN 的 batch=1 必定不可用，因为空间轴也可能提供样本。`,
    },
    {
      id: "math-dropout-clipping",
      type: "derivation",
      title: "Dropout 的期望与梯度裁剪的几何含义",
      body: String.raw`**Dropout。** 保留概率 $q=1-p$，$m_i\sim\operatorname{Bernoulli}(q)$，训练时 inverted dropout 输出 $\tilde x_i=m_ix_i/q$。在给定输入条件下：

$$\mathbb E[\tilde x_i\mid x_i]=x_i,\quad
\mathbb E[\tilde x_i^2\mid x_i]=x_i^2/q,\quad
\operatorname{Var}(\tilde x_i\mid x_i)=x_i^2(1-q)/q.$$

因此推理关闭 dropout 可保持这一层的条件均值，不保证 $\mathbb E[f(\tilde x)]=f(x)$，非线性与期望不能交换。固定 mask 的反向是 $g_i m_i/q$。

**手算。** $x=2,q=3/4$ 时以 $3/4$ 概率输出 $8/3$、以 $1/4$ 概率输出 0，均值 2、方差 $4/3$。若忘记除以 $q$，均值变为 1.5。$q=0$ 无法使用该公式，$q=1$ 为恒等映射。

**全局范数裁剪。** 把所有待裁剪参数的梯度拼成 $g\in\mathbb R^P$，给阈值 $\tau>0$：

$$g'=g\min\left(1,\frac{\tau}{\|g\|_2}\right),$$

$g=0$ 时直接返回 0。这是把梯度投影到半径 $\tau$ 的欧氏球：只在越界时沿同一方向缩短，不等于逐元素 clip。$g=[3,4],\tau=2$ 时范数 5，结果 $[1.2,1.6]$。SGD 的更新范数不超过 $\eta\tau$；Adam 之后还会自适应预条件化，不能保证同一个更新上界。

**工程追问。** 混合精度先 unscale，再判断非有限值，再裁剪；梯度累积通常在所有 micro-batch 累加完才裁剪。分片梯度的全局范数需要跨设备汇总平方和。裁剪只能限制已有梯度，不能恢复消失梯度，也不应把 NaN 静默当成 0。`,
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
      body: String.raw`**梯度裁剪与 PPO clip 不同。** 前者在反向后限制梯度向量范数，防止一次异常更新；后者裁剪概率比目标，限制策略离采样策略过远。

**Adam 加 L2 不总等于 AdamW。** 对普通 SGD 二者可等价，但 Adam 会按历史平方梯度缩放混合后的梯度，所以应使用解耦 weight decay。

**Batch 越大不一定越好。** 大 batch 降低梯度噪声并提高硬件利用率，但可能需要学习率缩放，且减少噪声带来的隐式正则。超过临界 batch 后，增加 batch 不再减少达到目标所需的优化步数。

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

若追问 Adam 偏差修正：展开 $m_t=(1-\beta)\sum_{k=1}^t\beta^{t-k}g_k$，在梯度均值固定的假设下求几何级数，得到 $\mathbb E[m_t]=(1-\beta^t)\mu$。除以该系数修正零初始化偏差，但不能声称整个非线性更新是无偏的。$\beta_2=0.999$ 时第一步未修正的二阶矩只有当前平方梯度的千分之一。

若追问 Pre-LN 与 Post-LN：Post-LN 在残差相加后归一化，原始 Transformer 使用它但深层梯度更难；Pre-LN 在子层前归一化，残差主干提供更直接梯度路径，训练通常更稳，但最终表示性质有所不同。

若追问调参顺序：先排除数据和实现错误，做小样本过拟合；再找到稳定学习率与 warmup；之后调 batch、weight decay 和 dropout；一次只改变少数因素并保存完整实验配置。

**白板加问。** 写出 LN 的 $[u-\bar u-\hat x\,\overline{u\hat x}]/r$，说明哪一项在冻结统计的 BN 推理中消失；再用 $g=[3,4]$、阈值 2 算出 $[1.2,1.6]$。能说明“梯度裁剪界不等于 Adam 更新界”，才算把前向尺度、梯度和优化器三个层次分开。`,
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
          q: "LayerNorm 为什么比 BatchNorm 更适合自回归语言模型？",
          a: "它对每个 token 或样本自身的特征维计算统计量，不依赖 batch 中其他样本，也没有训练与推理统计不一致，适合变长序列和小 batch。",
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
