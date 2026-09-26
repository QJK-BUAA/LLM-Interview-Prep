const chapter = {
  id: "07",
  slug: "cnn-rnn-sequences",
  part: "深度学习地基",
  title: "CNN、RNN、LSTM 与序列建模",
  subtitle: "理解局部结构、记忆和并行瓶颈",
  level: "基础",
  duration: 105,
  prerequisites: ["05", "06"],
  tags: ["CNN", "RNN", "LSTM", "GRU", "序列模型"],
  objectives: [
    "计算卷积输出尺寸与感受野",
    "解释参数共享为何适合局部模式",
    "沿时间展开 RNN 并说明 BPTT",
    "解释 LSTM 门控和 Transformer 的并行动机",
  ],
  summary:
    "CNN 用局部连接和参数共享处理网格结构，RNN 用共享递归状态处理序列；LSTM 改善长期梯度，而注意力进一步绕开串行信息通路。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：看局部、带记忆、直接互相查找",
      body: String.raw`图像有局部结构：相邻像素共同形成边缘，边缘再组成纹理和物体。CNN 让一个小卷积核在所有位置重复使用，相当于用同一副探测器扫描整张图。参数共享降低了参数量，也注入“同一模式可出现在不同位置”的先验。

序列的关键是顺序。RNN 每读一个元素就更新隐藏状态，像边阅读边写摘要；同一组参数在所有时间步复用，所以能处理可变长度输入。但第一个 token 的信息若要影响很后面的输出，必须穿过很长的递归链。

LSTM 给隐藏状态增加一条受门控制的记忆通道。遗忘门决定保留多少旧信息，输入门决定写入多少新信息，输出门决定暴露多少记忆。门控缓解长期依赖，却没有消除逐步计算：第 $t$ 步仍依赖第 $t-1$ 步。

注意力改变了通信方式：每个位置可直接读取其他位置，不必把所有历史压进单个状态。训练时整段序列能并行，这正是 Transformer 扩展到大规模语料的重要原因。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：卷积核怎样发现边缘",
      body: String.raw`考虑一维信号 $x=[1,1,1,4,4]$，卷积核 $k=[-1,1]$，步幅为 1，不填充。每个输出是相邻两项的差：

$$y_1=-1\times1+1\times1=0$$

前三个窗口得到 0、0、3、0，因此输出为 $[0,0,3,0]$。数值 3 出现在从 1 跳到 4 的边界，说明这个核是一个简单边缘探测器。

卷积输出长度公式是：

$$L_{out}=\left\lfloor\frac{L_{in}+2P-D(K-1)-1}{S}+1\right\rfloor$$

$P$ 是 padding，$D$ 是 dilation，$K$ 是核大小，$S$ 是 stride。代入 $L_{in}=5,P=0,D=1,K=2,S=1$，得到 4。

同一个核在四个位置复用，只需要两个参数。若用全连接层分别检测每个位置，需要为每个位置学习独立权重，既浪费参数，也无法自然迁移“边缘”概念。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "序列模型的通信路径",
      body: String.raw`RNN 的信息必须沿时间链传递，位置 1 影响位置 5 要经过四次状态更新。反向梯度也沿相反路径连乘，容易衰减或爆炸。LSTM 在这条链上增加近似加法的 cell state，使梯度有更平滑的通道，但计算依赖仍是串行的。

Self-Attention 中位置 1 与位置 5 可在一层内直接建立连接，路径长度变为常数。代价是标准注意力需要构造 $S\times S$ 关系矩阵，长序列计算和显存随长度平方增长。

架构选择是在归纳偏置与计算模式之间权衡。CNN 擅长局部和平移结构，RNN 天然逐步维护状态，注意力擅长全局内容寻址，状态空间模型尝试兼顾长序列线性计算和可并行训练。`,
      diagram: {
        kind: "flow",
        nodes: [
          "CNN：局部窗口",
          "RNN：递归状态",
          "LSTM：门控记忆",
          "Attention：全局查找",
          "Transformer：并行堆叠",
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
      title: "RNN 梯度为何会消失或爆炸",
      body: String.raw`简单 RNN 的隐藏状态为：

$$h_t=\tanh(W_hh_{t-1}+W_xx_t+b)$$

若最终损失 $L$ 依赖 $h_T$，它对早期状态 $h_t$ 的梯度包含多个 Jacobian 连乘：

$$\frac{\partial L}{\partial h_t}
=\frac{\partial L}{\partial h_T}
\prod_{k=t+1}^{T}
\frac{\partial h_k}{\partial h_{k-1}}$$

每个局部 Jacobian 包含 $W_h$ 和 tanh 导数。若这些矩阵的典型尺度小于 1，连乘随距离指数衰减；大于 1 则可能指数增长。这分别是梯度消失和梯度爆炸。

LSTM 的 cell state 更新：

$$c_t=f_t\odot c_{t-1}+i_t\odot\tilde c_t$$

对旧状态的直接局部导数包含 $f_t$。当遗忘门 $f_t$ 接近 1，梯度可沿加法通路较完整地传递；模型也能主动把 $f_t$ 设小以遗忘信息。它改善但不保证无限长期记忆，门仍可能饱和，序列仍需逐步展开。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：手算一个 RNN 状态",
      body: String.raw`用一个标量隐藏状态观察“旧记忆加新输入”。为便于计算，这里暂时省略 tanh；真实 RNN 会加入非线性并使用向量矩阵。

~~~python
sequence = [1.0, 0.0, 2.0]
hidden = 0.0
recurrent_weight = 0.5
input_weight = 1.0

for token in sequence:
    hidden = recurrent_weight * hidden + input_weight * token
    print(round(hidden, 3))

# t1: 1.0
# t2: 0.5，旧信息衰减一半
# t3: 2.25，新输入与旧摘要相加
~~~

若 recurrent_weight 连续为 0.5，早期输入对很晚状态的直接影响会按 $0.5^k$ 衰减；若为 1.5，则按 $1.5^k$ 放大。真实网络的激活导数和矩阵谱半径共同决定梯度行为。

BPTT（Backpropagation Through Time）就是把共享 RNN 单元沿时间展开后做反向传播。截断 BPTT 只回传固定步数，降低计算与显存，但更难学习超出截断窗口的依赖。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：结构先验不是绝对能力边界",
      body: String.raw`**误区一：卷积只能用于图像。** 一维卷积可处理音频和 token 序列，二维卷积适合图像，三维卷积可处理视频或体数据；关键是局部网格结构。

**误区二：池化一定保留重要信息。** 最大池化保留局部最大响应，但会丢失精确位置；是否合适取决于任务对空间分辨率的需求。

**误区三：LSTM 完全解决长期依赖。** 它改善梯度通路，但串行计算、有限状态容量和门控饱和仍存在。

**误区四：teacher forcing 就是知识蒸馏。** teacher forcing 指训练序列模型时把真实前一个 token 作为下一步输入；知识蒸馏指用教师模型的输出监督学生。二者的 teacher 含义不同。

**误区五：attention 一定比 CNN/RNN 便宜。** 标准全注意力对序列长度是平方复杂度，短序列或强局部任务中卷积可能更高效。

**误区六：残差连接只是方便堆层。** 它提供恒等路径，改善表示和梯度传播，是深网络能稳定优化的重要结构。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "CNN、RNN、LSTM 与 Attention 对比",
      body: String.raw`| 结构 | 核心先验 | 训练并行 | 长距离路径 | 主要代价 |
|---|---|---|---|---|
| CNN | 局部性、平移共享 | 高 | 多层扩大感受野 | 深层才能连远处 |
| RNN | 顺序状态递归 | 低 | 距离随时间增长 | 梯度与串行瓶颈 |
| LSTM/GRU | 门控记忆 | 低 | 比简单 RNN 稳定 | 仍需逐步计算 |
| Self-Attention | 内容寻址 | 高 | 一层可全局连接 | 长度平方成本 |
| SSM/Mamba | 状态递推与结构化核 | 训练可并行 | 线性扫描状态 | 内容寻址方式不同 |

CNN 的感受野会随层数增长。核大小 3、stride 1 的连续卷积，每增加一层，理论感受野增加 2；残差网络让非常深的局部组合可训练。

RNN 适合流式、状态紧凑的场景；Transformer 适合大规模并行训练和灵活依赖；混合架构也很常见。不要把架构演进讲成简单淘汰史，而应说明计算预算、序列长度和任务结构。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：Transformer 为什么替代 RNN",
      body: String.raw`**30 秒回答：**“RNN 在时间维串行，训练吞吐受限，远距离信息和梯度要穿过很多状态更新。Self-Attention 让任意位置一层直接交互，并能对整段序列并行计算，因此更适合大规模训练。代价是标准注意力随序列长度平方增长，所以并非所有场景都无条件优于递归或卷积。” 

若追问 LSTM 如何缓解梯度消失，回答 cell state 使用加法更新，梯度沿该通路主要乘遗忘门；当门接近 1 时能较长时间保留。门由数据学习，允许选择性写入、遗忘和输出。

若追问卷积参数量，输入通道 $C_{in}$、输出通道 $C_{out}$、核 $K_h\times K_w$ 时，权重数为 $K_hK_wC_{in}C_{out}$，若有 bias 再加 $C_{out}$，与图像高宽无关。

若追问 exposure bias，说明 teacher forcing 训练时总看到真实历史，推理时只能看到自己生成的历史；一个早期错误会把后续输入带到训练少见区域。on-policy 学习与蒸馏正试图在学生自己的轨迹上提供监督。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：从局部模式到全局依赖",
      body: "回答时同时考虑表达能力与计算代价。",
      questions: [
        {
          q: "长度 8、核 3、padding 1、stride 2 的一维卷积输出长度是多少？",
          a: "floor((8+2×1-1×(3-1)-1)/2+1)=4。",
        },
        {
          q: "LSTM 的遗忘门接近 1 时，对旧 cell state 有什么影响？",
          a: "旧状态大部分保留，沿 cell state 的梯度衰减较慢；但其他路径和长期数值行为仍会影响最终记忆。",
        },
        {
          q: "为什么 Self-Attention 训练可并行，但自回归生成仍然串行？",
          a: "训练时整段真实 token 已知，可一次计算所有位置；生成时第 t 个 token 是第 t+1 个 token 的输入，未来 token 尚不存在。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Deep Residual Learning",
      url: "https://arxiv.org/abs/1512.03385",
      evidence: "原始论文",
    },
    {
      label: "Long Short-Term Memory",
      url: "https://www.bioinf.jku.at/publications/older/2604.pdf",
      evidence: "原始论文",
    },
    {
      label: "Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      evidence: "原始论文",
    },
  ],
};

export default chapter;
