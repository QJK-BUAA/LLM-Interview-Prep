const chapter = {
  id: "05",
  slug: "neural-networks-backprop",
  part: "深度学习地基",
  title: "神经网络、计算图与反向传播",
  subtitle: "从一个神经元到可训练的多层网络",
  level: "基础",
  duration: 90,
  prerequisites: ["02", "03"],
  tags: ["MLP", "激活函数", "计算图", "反向传播", "Autograd"],
  objectives: [
    "手算一个神经元和两层网络的前向过程",
    "解释非线性激活为何不可缺少",
    "沿计算图计算参数梯度",
    "区分参数、激活值和梯度在训练中的角色",
  ],
  summary:
    "神经网络把线性变换与非线性激活反复组合；反向传播复用计算图中的局部导数，使所有参数都能从同一个损失获得更新信号。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：每层都在重画坐标系",
      body: String.raw`一个神经元先把输入加权求和，再通过激活函数。权重决定关注哪个方向，偏置移动决策边界，激活函数让不同区域产生不同响应。很多神经元并排组成一层，多层串联便形成神经网络。

只堆线性层没有意义。若 $h=W_1x+b_1$，输出 $y=W_2h+b_2$，整理后仍是 $y=(W_2W_1)x+(W_2b_1+b_2)$，再深也只是一层线性变换。ReLU、GELU 或 sigmoid 等非线性打破这种可合并性，让网络能弯折空间并表示复杂边界。

训练分为两段。前向传播根据当前参数得到预测和损失；反向传播计算损失对每个参数的梯度；优化器再更新参数。反向传播本身不负责“走哪一步”，优化器才负责使用梯度。

层数增加后，网络不一定学习到人类可命名的特征，但常呈现逐层组合：低层捕捉局部模式，中层组合结构，高层形成任务相关表示。不要把这个直觉误解为每个神经元都有唯一、固定的人类语义。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：一个两输入神经元",
      body: String.raw`输入 $x=[2,-1]$，权重 $w=[0.5,1]$，偏置 $b=0.5$。线性部分为：

$$z=w^\top x+b=0.5\times2+1\times(-1)+0.5=0.5$$

使用 ReLU：

$$a=\max(0,z)=0.5$$

若目标为 1，使用平方损失 $L=\frac12(a-1)^2=0.125$。因为当前 $z>0$，ReLU 的局部导数是 1：

$$\frac{\partial L}{\partial a}=a-1=-0.5,\quad
\frac{\partial a}{\partial z}=1$$

权重梯度为：

$$\frac{\partial L}{\partial w}
=\frac{\partial L}{\partial a}
\frac{\partial a}{\partial z}
\frac{\partial z}{\partial w}
=-0.5[2,-1]=[-1,0.5]$$

若学习率为 0.1，新权重是 $[0.6,0.95]$。第一个权重增加，因为增大第一个输入的贡献能把输出推向目标；第二个输入本身为负，所以梯度方向不同。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "训练一步的计算图",
      body: String.raw`计算图中的每条边都携带值，反向时还携带梯度。线性层需要保存输入，因为权重梯度依赖输入；激活函数常需要保存输入或输出，以判断局部导数；损失节点产生最初的梯度 1，再向前驱传播。

这解释了训练显存为何远大于只存参数：前向产生的中间激活不能立刻丢弃，反向还要使用。梯度检查点会选择丢弃一部分激活，反向时重新计算，用算力换显存。

若一个参数在多处共享，例如同一个 embedding 矩阵被许多 token 查询，它收到来自所有路径的梯度之和。自动微分负责正确累积，而优化器最终只看到与参数同 shape 的总梯度。`,
      diagram: {
        kind: "flow",
        nodes: [
          "输入 x",
          "线性 z=Wx+b",
          "激活 h=φ(z)",
          "预测 ŷ",
          "损失 L",
          "反向梯度",
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
      title: "两层 MLP 的 Shape 与梯度",
      body: String.raw`设 batch 输入 $X\in\mathbb{R}^{B\times d}$，隐藏宽度为 $h$，输出类别数为 $c$：

$$Z_1=XW_1+b_1,\quad H=\phi(Z_1),\quad Z_2=HW_2+b_2$$

其中 $W_1\in\mathbb{R}^{d\times h}$，$b_1\in\mathbb{R}^{h}$，$W_2\in\mathbb{R}^{h\times c}$。因此 $Z_1,H$ 的 shape 为 $[B,h]$，logits $Z_2$ 为 $[B,c]$。

令上游梯度 $G_2=\partial L/\partial Z_2$。第二层参数梯度：

$$\frac{\partial L}{\partial W_2}=H^\top G_2,\qquad
\frac{\partial L}{\partial b_2}=\sum_{i=1}^{B}G_{2,i}$$

传回隐藏层：

$$G_H=G_2W_2^\top,\qquad
G_1=G_H\odot\phi'(Z_1)$$

第一层参数梯度：

$$\frac{\partial L}{\partial W_1}=X^\top G_1$$

$\odot$ 表示逐元素乘法。矩阵转置不是装饰，而是为了让样本轴 $B$ 在求和中被消去，最终梯度 shape 与对应权重一致。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：手写一个 ReLU 网络",
      body: String.raw`下面只展示前向与反向核心，数组运算写成接近 NumPy 的形式。检查每个中间量的 shape，再理解公式会更稳。

~~~python
import numpy as np

X = np.array([[2.0, -1.0]])      # [B=1, d=2]
y = np.array([[1.0]])            # [1, 1]
W1 = np.array([[0.5, -0.2], [1.0, 0.3]])  # [2, 2]
b1 = np.zeros((1, 2))
W2 = np.array([[0.4], [-0.6]])   # [2, 1]

z1 = X @ W1 + b1
h = np.maximum(z1, 0)
y_hat = h @ W2
loss = 0.5 * ((y_hat - y) ** 2).mean()

g_y_hat = y_hat - y
g_W2 = h.T @ g_y_hat
g_h = g_y_hat @ W2.T
g_z1 = g_h * (z1 > 0)
g_W1 = X.T @ g_z1

print("shapes:", z1.shape, y_hat.shape, g_W1.shape, g_W2.shape)
print("loss:", float(loss))
~~~

真实训练还会在 batch 维取平均、处理 dtype、清空旧梯度并由优化器更新。手写一次后再用框架 autograd，可把每个 API 对应到计算图中的明确角色。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：网络更深不自动更聪明",
      body: String.raw`**误区一：激活值和参数是一回事。** 参数在样本之间共享并被优化；激活值由当前输入临时产生，训练时为了反向传播而保存。

**误区二：反向传播等于梯度下降。** 前者计算梯度，后者使用梯度更新。Adam 也使用反向传播得到的梯度，只是更新规则不同。

**误区三：ReLU 永远优于 sigmoid。** ReLU 在深层网络中缓解饱和，但负区间梯度为零，可能出现死亡神经元。sigmoid 在门控和二分类输出中仍有明确用途。

**误区四：训练损失不降一定是模型太小。** 也可能是标签错误、学习率不合适、激活饱和、初始化失衡、梯度被错误清零或数据 shape 错。

**误区五：梯度爆炸只看 loss 是否变大。** 混合精度下可能先出现 inf/NaN，或梯度范数异常但 loss 暂时正常。应监控梯度范数、激活统计和更新比率。

**误区六：参数越多就越容易过拟合是完整结论。** 模型容量、优化隐式偏置、数据规模和正则化共同决定泛化，不能只看参数计数。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "常见激活函数对比",
      body: String.raw`| 激活 | 形式与范围 | 优点 | 风险与常见位置 |
|---|---|---|---|
| sigmoid | $1/(1+e^{-x})$，0 到 1 | 可解释为门或概率 | 两端饱和；门控、二分类输出 |
| tanh | -1 到 1 | 零中心 | 两端饱和；传统 RNN 状态 |
| ReLU | $\max(0,x)$ | 简单、正区梯度稳定 | 负区为零；CNN/MLP |
| GELU | 平滑门控输入 | 对小负值不完全截断 | 计算稍复杂；Transformer |
| SiLU | $x\sigma(x)$ | 平滑且效果稳定 | 非单调小区间；现代网络 |
| SwiGLU | 两支线性投影后门控 | 表达力强 | 参数与算力增加；现代 LLM FFN |

输出层激活由任务决定：多分类常用 softmax，多个独立标签常用 sigmoid，实数回归常不加有界激活。中间层激活则主要影响表达能力和梯度传播。

选择时不要只凭排行榜。还要看模型家族、算子支持、吞吐、量化兼容和初始化。已有成熟架构通常优先遵循其默认配置。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：为什么反向传播高效",
      body: String.raw`**30 秒回答：**“反向传播把网络写成计算图，用反向模式自动微分从标量损失向输入遍历。每个算子只计算局部的向量-Jacobian 乘积，公共中间结果被复用，因此一次前向加一次同量级反向就能得到所有参数梯度，而不必逐参数扰动。” 

若追问训练与推理区别：推理只做前向并可逐步生成；训练还要保存激活、计算损失、反向梯度和优化器状态，所以显存与计算更高。自回归 LLM 的训练可并行计算整段 token 的 loss，而生成必须按 token 依次进行。

若追问为什么需要激活函数：多层线性层可合并，无法形成复杂非线性决策边界。非线性使网络在不同输入区域学习不同响应。

若追问参数共享：共享参数在计算图中被多次使用，反向时各路径梯度累加。例如 tied embedding 同时参与输入查表和输出 logits，两端都会贡献梯度。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：从神经元到计算图",
      body: "写出局部导数和 shape，不要只给最终数字。",
      questions: [
        {
          q: "若 ReLU 输入 z=-2，上游梯度为 5，传到 z 的梯度是多少？",
          a: "标准 ReLU 在负区间局部导数为 0，因此传回梯度为 5×0=0。",
        },
        {
          q: "X 为 [8,16]、W 为 [16,32]，线性层输出和 W 的梯度 shape 分别是什么？",
          a: "输出是 [8,32]，W 的梯度必须与 W 相同，为 [16,32]。",
        },
        {
          q: "为什么训练时要保存中间激活？",
          a: "许多局部导数依赖前向输入或输出，反向传播需要它们。梯度检查点可丢弃部分激活，但必须在反向时重算。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Deep Learning: Deep Feedforward Networks",
      url: "https://www.deeplearningbook.org/contents/mlp.html",
      evidence: "教材",
    },
    {
      label: "Automatic Differentiation in Machine Learning",
      url: "https://www.jmlr.org/papers/v18/17-468.html",
      evidence: "综述论文",
    },
  ],
};

export default chapter;
