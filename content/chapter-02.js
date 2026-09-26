const chapter = {
  id: "02",
  slug: "linear-algebra-calculus",
  part: "数学与机器学习地基",
  title: "线性代数与微积分",
  subtitle: "把方向、变化率和链式法则连起来",
  level: "入门",
  duration: 80,
  prerequisites: ["01"],
  tags: ["向量", "矩阵", "导数", "梯度", "链式法则"],
  objectives: [
    "用几何语言解释向量、点积和矩阵变换",
    "理解导数、偏导数和梯度分别描述什么",
    "逐步计算一个两层表达式的链式法则",
    "解释梯度下降为什么沿负梯度更新",
  ],
  summary:
    "线性代数描述模型怎样变换表示，微积分描述参数变化怎样影响损失，反向传播则用链式法则把这种影响高效传回每一层。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：矩阵改变空间，梯度指向上坡",
      body: String.raw`向量既是一组数字，也可以看成空间中的方向和长度。用户画像、token embedding、模型隐藏状态都把对象表示成向量。两个向量的点积同时受长度和夹角影响：方向越接近，点积通常越大，所以它能作为相似度的基础。

矩阵可以看成一台“空间变换机”。它接收一个向量，旋转、缩放、剪切或投影后输出另一个向量。神经网络的线性层 $y=Wx+b$ 正是在学习这种变换；后续激活函数再加入非线性，使多层组合不再等价于单个矩阵。

微积分关心“轻轻改变一个量，结果会怎样变”。一元导数是曲线在某一点的斜率；多参数模型的损失依赖许多变量，于是每个参数都有一个偏导数。把所有偏导数组成向量就是梯度。

梯度指向函数增长最快的方向，因此要减小损失就沿负梯度走。学习率控制步长：太大可能跨过谷底甚至发散，太小则移动缓慢。训练神经网络，本质上是在高维空间里重复“算坡度、往下走”。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：两层计算怎样传回梯度",
      body: String.raw`设输入 $x=2$，第一层参数 $w=3$，先计算 $z=wx=6$；第二步平方得到预测 $\hat y=z^2=36$；目标 $y=20$，损失取：

$$L=\frac{1}{2}(\hat y-y)^2$$

前向计算得到 $L=\frac12(36-20)^2=128$。现在问：$w$ 增加一点，损失会怎样变化？从外向内分三段：

$$\frac{\partial L}{\partial \hat y}=\hat y-y=16$$

$$\frac{\partial \hat y}{\partial z}=2z=12$$

$$\frac{\partial z}{\partial w}=x=2$$

链式法则把局部变化率相乘：

$$\frac{\partial L}{\partial w}
=\frac{\partial L}{\partial \hat y}
\frac{\partial \hat y}{\partial z}
\frac{\partial z}{\partial w}
=16\times12\times2=384$$

梯度为正，说明增加 $w$ 会增加损失，所以更新应减小 $w$。若学习率为 0.001，新参数为 $3-0.001\times384=2.616$。这就是反向传播最小但完整的样子。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "前向算数值，反向算影响",
      body: String.raw`计算图把复杂表达式拆成局部操作。前向时，数据从左到右生成中间值；反向时，上游梯度从右到左，乘上每个局部导数。每个节点只需要知道自己的输入和局部规则，不需要重新理解整条函数。

这种局部性是自动微分能扩展到几十亿参数的原因。反向传播不是新的求导规则，而是对链式法则的动态规划实现：公共子表达式的梯度只汇总一次，避免为每个参数重复展开完整公式。

如果一个变量分叉到多条路径，反向时来自各路径的梯度要相加；如果一条路径经过多个操作，局部导数要相乘。可记成“分叉相加，串联相乘”。`,
      diagram: {
        kind: "flow",
        nodes: ["x,w", "z = wx", "ŷ = z²", "L = ½(ŷ-y)²", "梯度反向返回"],
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
      title: "从点积到梯度下降",
      body: String.raw`两个 $n$ 维向量的点积为：

$$x^\top w=\sum_{j=1}^{n}x_jw_j$$

线性回归对第 $i$ 个样本的预测是 $\hat y_i=x_i^\top w+b$。使用均方误差：

$$L(w)=\frac{1}{N}\sum_{i=1}^{N}(\hat y_i-y_i)^2$$

对参数 $w_j$ 求偏导。外层平方的导数给出 $2(\hat y_i-y_i)$，内层 $\hat y_i$ 对 $w_j$ 的导数是 $x_{ij}$，所以：

$$\frac{\partial L}{\partial w_j}
=\frac{2}{N}\sum_{i=1}^{N}(\hat y_i-y_i)x_{ij}$$

把所有 $j$ 的偏导合成向量：

$$\nabla_w L=\frac{2}{N}X^\top(Xw+b-y)$$

梯度与参数 shape 相同。方向导数满足 $D_uL=\nabla L^\top u$；在单位向量中，选择 $u=\nabla L/\|\nabla L\|$ 时内积最大，因此梯度是最陡上升方向，负梯度就是最陡下降方向。

更新式 $w\leftarrow w-\eta\nabla_wL$ 是局部方法，只保证当前附近下降。非凸神经网络里没有承诺一步走到全局最优，因此初始化、学习率和优化器都很重要。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：手写计算图",
      body: String.raw`这段代码把每个局部导数单独写出，便于核对链式法则。真实框架会在前向时记录计算图，在 backward 时自动完成同样的乘法。

~~~python
x, y = 2.0, 20.0
w = 3.0

# forward
z = w * x
y_hat = z ** 2
loss = 0.5 * (y_hat - y) ** 2

# backward: dL/dw = dL/dy_hat * dy_hat/dz * dz/dw
d_loss_d_y_hat = y_hat - y
d_y_hat_d_z = 2 * z
d_z_d_w = x
d_loss_d_w = d_loss_d_y_hat * d_y_hat_d_z * d_z_d_w

w -= 0.001 * d_loss_d_w
print(loss, d_loss_d_w, w)
~~~

可以用数值差分检查解析梯度：比较 $[L(w+\epsilon)-L(w-\epsilon)]/(2\epsilon)$ 与 384 是否接近。工程中的 gradient check 也用这一思想，但只适合小模型，因为每个参数都做额外前向计算会非常慢。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：导数小不一定训练良好",
      body: String.raw`**误区一：梯度是一个数。** 单参数函数的导数是一个数，多参数函数的梯度是与参数同 shape 的数组。模型有多少可训练参数，就有对应的局部变化率。

**误区二：偏导数考虑其他变量一起变化。** 求 $\partial L/\partial w_j$ 时，定义上把其他独立变量暂时固定。计算图再通过链式法则处理它们之间的依赖。

**误区三：梯度为零就到最小值。** 它也可能位于最大值、鞍点或平坦区域。高维网络中鞍点和平坦方向很常见。

**误区四：矩阵乘法满足交换律。** 通常 $AB\neq BA$，甚至其中一个顺序根本无法相乘。每次都检查内侧维度。

**误区五：loss 下降代表泛化提高。** 训练损失只描述已见数据。模型可能记住训练集而验证集变差，这需要数据划分和正则化处理。

**误区六：自动微分可以替代理解 shape。** 框架能算合法图的梯度，却无法判断这个图是否表达了你的真实意图。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "几个容易混淆的数学对象",
      body: String.raw`| 名称 | 输入变化 | 输出 | 在训练中的角色 |
|---|---|---|---|
| 导数 | 一个变量 | 一个变化率 | 一维参数敏感度 |
| 偏导数 | 固定其他变量，只变一个 | 一个变化率 | 单个参数敏感度 |
| 梯度 | 同时收集所有偏导 | 向量或张量 | 最陡上升方向 |
| Jacobian | 向量输入、向量输出 | 矩阵 | 层间完整局部映射 |
| Hessian | 梯度再求导 | 矩阵 | 曲率与二阶优化 |

反向传播通常不显式构造完整 Jacobian。它计算向量-Jacobian 乘积，把上游梯度直接乘过局部算子，节省大量内存和计算。

一阶优化只使用梯度，如 SGD、Adam；二阶方法还利用 Hessian 或其近似，能感知不同方向的曲率，但大模型中计算和存储代价很高。TRPO 中的自然梯度与 Fisher 信息矩阵会在 PPO 章节重新出现。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：反向传播不是求导公式",
      body: String.raw`**30 秒回答：**“反向传播是利用计算图和链式法则高效计算梯度的算法。前向保存必要的中间值，反向从损失开始传播上游梯度；串联路径的局部导数相乘，分叉路径的贡献相加。它避免对每个参数重复展开整个复合函数。” 

若追问梯度为什么能指导下降，可从方向导数回答：单位方向 $u$ 上的变化率是 $\nabla L^\top u$，由柯西不等式，和梯度反向的方向取得最小值，因此小步沿负梯度会降低一阶近似下的损失。

若追问为什么需要非线性，回答：若各层都只有线性变换，$W_2(W_1x)$ 可合并成一个矩阵 $W_2W_1x$，深度没有增加表达能力。激活函数让不同输入区域采用不同的局部线性组合。

若追问梯度消失，可指出链式法则连续相乘许多小于 1 的局部导数，使早期层信号指数衰减；残差连接、恰当初始化和归一化都在改善梯度传播。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：把局部变化连起来",
      body: "建议在纸上写出计算图和每个局部导数，再查看答案。",
      questions: [
        {
          q: "若 z=wx+b，L=z²，求 dL/dw。",
          a: "dL/dz=2z，dz/dw=x，所以 dL/dw=2zx=2(wx+b)x。",
        },
        {
          q: "为什么梯度 shape 必须和参数 shape 一致？",
          a: "梯度为每个参数位置保存一个偏导数，描述该位置发生微小变化对损失的影响，因此要与参数一一对应。",
        },
        {
          q: "两个没有激活函数的线性层为什么等价于一个线性层？",
          a: "W₂(W₁x+b₁)+b₂ 可整理为 (W₂W₁)x+(W₂b₁+b₂)，仍是一次线性或仿射变换。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Mathematics for Machine Learning",
      url: "https://mml-book.github.io/",
      evidence: "开放教材",
    },
    {
      label: "Dive into Deep Learning: Calculus",
      url: "https://d2l.ai/chapter_preliminaries/calculus.html",
      evidence: "开源教材",
    },
  ],
};

export default chapter;
