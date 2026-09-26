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
      body: String.raw`Adam 对梯度 $g_t$ 维护指数移动平均：

$$m_t=\beta_1m_{t-1}+(1-\beta_1)g_t$$

$$v_t=\beta_2v_{t-1}+(1-\beta_2)g_t^2$$

初始 $m_0=v_0=0$，早期估计会偏向零。若梯度均值近似稳定，期望中会多出 $1-\beta_1^t$，因此做偏差修正：

$$\hat m_t=\frac{m_t}{1-\beta_1^t},\qquad
\hat v_t=\frac{v_t}{1-\beta_2^t}$$

更新为：

$$\theta_{t+1}=\theta_t-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}$$

若把 L2 正则直接加进梯度，$g_t+\lambda\theta_t$ 会一起进入自适应分母，不同参数受到的衰减被扭曲。AdamW 把衰减独立写为：

$$\theta_{t+1}=(1-\eta\lambda)\theta_t
-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}$$

这就是“解耦权重衰减”。实践中通常不对 bias 和归一化缩放参数做 weight decay，因为它们的作用与大权重矩阵不同。`,
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

若追问 Adam 偏差修正：指数移动平均从零开始，前几步系统偏小；除以 $1-\beta^t$ 恢复无偏尺度。$\beta_2=0.999$ 时第一步未修正的二阶矩只有真实平方梯度的千分之一。

若追问 Pre-LN 与 Post-LN：Post-LN 在残差相加后归一化，原始 Transformer 使用它但深层梯度更难；Pre-LN 在子层前归一化，残差主干提供更直接梯度路径，训练通常更稳，但最终表示性质有所不同。

若追问调参顺序：先排除数据和实现错误，做小样本过拟合；再找到稳定学习率与 warmup；之后调 batch、weight decay 和 dropout；一次只改变少数因素并保存完整实验配置。`,
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
  ],
};

export default chapter;
