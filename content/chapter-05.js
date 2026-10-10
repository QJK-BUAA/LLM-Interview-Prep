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
      body: String.raw`一套预测器把两个输入合成一个分数，却总在某些输入区域犯错。能不能让它先提取几种不同特征，再组合成预测？如果加上这些中间层，最终的误差又该怎样告诉每一层该改哪一个权重？本章从一个输出偏低的神经元开始，把第 02 章的链式法则变成可执行的训练过程。

一个神经元先把输入加权求和，再通过激活函数。权重决定关注哪个方向，偏置移动响应位置，激活函数让不同区域产生不同响应。很多神经元并排组成一层，多层串联便形成神经网络。但如果各层只做线性变换，增加层数并没有增加这种表达能力：把中间结果记为 $h=W_1x+b_1$，输出 $y=W_2h+b_2$，整理后仍是 $y=(W_2W_1)x+(W_2b_1+b_2)$，可合并成一层。ReLU、GELU 或 sigmoid 等非线性才打破这种可合并性。

下面先让一个神经元预测目标 1，查看输出偏低时两个权重为什么要朝不同方向更新。接着把这个局部计算串起来：前向传播得到预测和损失，反向传播把损失对输出的要求逐层传回参数，优化器再决定实际更新多远。这里先把梯度算对，第 06 章再讨论怎样使用它。

多层组合可以形成任务相关表示，却不保证每个神经元都对应一个固定的人类概念。判断这套机制是否工作，要沿同一损失检查计算和更新，而不是仅凭“学到了特征”的说法。本章是教材与自动微分综述支持的基础补充，为后面的语言模型训练提供工具。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：误差信号怎样到达不同权重",
      body: String.raw`一个神经元先对多项输入做加权求和，再通过激活函数产生输出。若输出偏低，不能简单地把所有权重都调大：每个输入的符号和大小不同，同一方向的权重变化可能让某些贡献增加、另一些反而减少。

ReLU（Rectified Linear Unit，修正线性单元）会保留正的线性结果，将负值截为零。它给网络加入非线性，也会改变反向路径：

| 前向状态 | 反向含义 |
|---|---|
| 线性结果为正 | 误差信号可以沿该位置继续传播 |
| 线性结果为负 | 标准 ReLU 在该位置截断局部梯度 |

反向传播把输出误差依次经过激活函数和线性层，分配给各个权重。共享参数会汇总所有使用位置的贡献；一个变量若进入多条支路，各支路的梯度相加。

因此“误差相同”不意味着“参数更新相同”。真正需要检查的是每条依赖路径、局部导数和 shape。具体矩阵反传与数值核对放在折叠推导和代码实验中。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：从局部导数到整网梯度",
      body: String.raw`刚才只有一个神经元，我们还能跟住每一次乘法；换成多层、多类别和一批样本，怎样保证每条误差路径既不漏算也不重复？先看计算图需要保存什么，再分别解决激活的局部导数和分类输出的类别耦合，最后把它们接成完整两层网络。

激活节解释为什么同样的上游误差可能被压小；softmax 节借第 03 章的负对数似然把类别概率变成 logits 梯度。随后在两层网络中逐步消去样本轴、累加偏置梯度，最后用同一个损失的数值扰动核对结果。矩阵乘法或链式法则卡住时回看第 02 章，而不用同时记住所有公式。白板题留到整条计算走通后，用来检查哪些环节仍需回读。`,
      links: [
        { label: "激活函数及饱和", sectionId: "math-activations", level: "必会" },
        { label: "Softmax Jacobian 与交叉熵", sectionId: "math-softmax-ce", level: "推导" },
        { label: "完整 MLP 反向传播", sectionId: "derivation", level: "推导" },
        { label: "有限差分与不可导点", sectionId: "math-gradient-check", level: "进阶" },
        { label: "闭卷白板验收", sectionId: "whiteboard", level: "必会" },
      ],
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
      id: "math-activations",
      type: "derivation",
      title: "激活导数：饱和、死亡与链式法则",
      body: String.raw`刚才误差完整穿过了正区间的 ReLU。如果换成一个已经接近上限的 sigmoid，或者把 ReLU 输入移到负区间，前面的权重还能收到多大的更新信号？本节固定后续网络传来的误差，只计算它通过激活后剩下多少。

把加权和记为标量预激活 $z=w^\top x+b$，输出为 $a=\phi(z)$，上游梯度为 $u=\partial L/\partial a$。逐元素激活的各输出只依赖对应输入，向量 Jacobian 因而是对角矩阵；反向只需 $u\odot\phi'(z)$，不需要构造稠密矩阵。

由 $\sigma(z)=(1+e^{-z})^{-1}$ 对分母求导，再代回 $\sigma$：

$$\sigma'(z)=\frac{e^{-z}}{(1+e^{-z})^2}=\sigma(z)(1-\sigma(z)).$$

由 $\tanh z=2\sigma(2z)-1$ 得：

$$\tanh'(z)=4\sigma(2z)(1-\sigma(2z))=1-\tanh^2z.$$

ReLU 在正、负区间分别是恒等映射和常数，所以：

$$\operatorname{ReLU}'(z)=
\begin{cases}1&z>0\\0&z<0.\end{cases}$$

$z=0$ 没有经典导数；框架通常选 0 作为反传约定。sigmoid 在 0 处导数最大为 $1/4$，tanh 在 0 处为 1，但两端都会饱和。若十层标量链的权重全为 1、每个 sigmoid 都在 0 附近，局部导数连乘上界为 $(1/4)^{10}=9.5367\times10^{-7}$。矩阵网络还要乘权重 Jacobian，不能只由激活推断总梯度。

用一个不在中心的输入检验上述导数：$z=\log3$ 时 $\sigma(z)=3/4$，局部导数 $3/16$；若上游 $u=2$，传回 $3/8$。原来的信号 2 只剩 0.375；多层重复这种缩小，早层就可能学得很慢。ReLU 的 $z=-2,u=5$ 则传回 0，表示这条边在当前样本上关闭，不代表该样本对其他神经元没有梯度。

二分类 sigmoid 输出接 BCE 时，对 logits 的梯度可化为 $p-y$；这不意味着隐藏层 sigmoid 的饱和消失。GELU/SiLU 平滑，但也不能保证任意深度的梯度稳定。下一节把“局部导数与损失一起算”的想法用于多分类输出：此时增加一个类别的分数，还会改变其他类别的概率。`,
    },
    {
      id: "math-softmax-ce",
      type: "derivation",
      title: "Softmax Jacobian 到交叉熵梯度",
      body: String.raw`分类器把最高概率给了第一类，但正确答案是第二类。要降低这一次分类损失，应该只抬高第二类分数，还是所有分数都会收到梯度？和逐元素激活不同，softmax 的一个分数变化会影响所有类别，我们先把这个耦合算清。

单样本的未归一化分数称为 logits，记为 $z\in\mathbb R^C$；概率 $p_i=e^{z_i}/Z$，共同分母 $Z=\sum_j e^{z_j}$。目标分布 $y\in\mathbb R^C$ 满足 $y_i\ge0,\sum_i y_i=1$。类别之间共享分母，不能把 softmax 当逐元素函数。

用商法则：

$$\frac{\partial p_i}{\partial z_j}
=\frac{\delta_{ij}e^{z_i}Z-e^{z_i}e^{z_j}}{Z^2}
=p_i(\delta_{ij}-p_j),\qquad
J=\operatorname{diag}(p)-pp^\top\in\mathbb R^{C\times C}.$$

对任意上游列向量 $u=\nabla_p L$，每个 logit 都收集所有概率输出的贡献。把这些贡献合并后，不物化 $C^2$ 个元素也可算：

$$\nabla_zL=J^\top u=p\odot\bigl(u-(p^\top u)\mathbf1\bigr).$$

交叉熵 $L=-\sum_i y_i\log p_i=-y^\top z+\log Z$。对 $z_j$ 求导，第一项给 $-y_j$，第二项给 $p_j$，所以 $\nabla_zL=p-y$。这依赖目标归一化；若权重之和为 $a=\sum_i y_i$，结果是 $ap-y$。batch 均值则每行再除以 $B$，不能在每层重复平均。

**数值例。** $z=[\log2,0,0]$，$p=[1/2,1/4,1/4]$，正确类别为第二类：

$$J=\begin{bmatrix}
1/4&-1/8&-1/8\\
-1/8&3/16&-1/16\\
-1/8&-1/16&3/16
\end{bmatrix},\quad
L=\log4,\quad \nabla_zL=[1/2,-3/4,1/4].$$

沿负梯度更新时，第二类分数升高，第一、三类分数降低，正好修正“正确类别概率只有四分之一”的预测。梯度和为 0，因为把所有 logits 加同一常数不改变概率，$J\mathbf1=0$。$J$ 是半正定且奇异的，并非可随意求逆的满秩矩阵。

实现时用 $\log Z=m+\log\sum_j e^{z_j-m}$，$m=\max_jz_j$，避免先 softmax 再 log 的下溢。若正确类概率几乎为 0，CE 的 logits 梯度仍接近 -1，不能笼统说“softmax 饱和时任何损失都无梯度”。label smoothing 只改变归一化目标 $y$，推导仍成立。现在得到了分类头传出的起始梯度，下一节把它送回两层网络的每个参数。`,
    },
    {
      id: "derivation",
      type: "derivation",
      title: "两层 MLP 的 Shape 与梯度",
      body: String.raw`知道分类头该怎样修改 logits，这份误差怎样传到第一层权重？我们现在训练一个两层分类器：让同一份分类误差依次通过输出线性层、激活和输入线性层，并检查一批样本的贡献在哪里相加。

设 batch 输入 $X\in\mathbb{R}^{B\times d}$，其中每行是一个样本，隐藏宽度为 $h$，输出类别数为 $c$：

$$Z_1=XW_1+b_1,\quad H=\phi(Z_1),\quad Z_2=HW_2+b_2$$

其中 $W_1\in\mathbb{R}^{d\times h}$，$b_1\in\mathbb{R}^{h}$，$W_2\in\mathbb{R}^{h\times c}$。因此 $Z_1,H$ 的 shape 为 $[B,h]$，logits $Z_2$ 为 $[B,c]$。

对行 softmax 概率 $P$ 与 one-hot/软标签 $Y\in\mathbb R^{B\times c}$，取 batch 平均交叉熵 $L=-B^{-1}\sum_{i,j}Y_{ij}\log P_{ij}$，上游梯度 $G_2=(P-Y)/B$。第二层参数梯度：

$$\frac{\partial L}{\partial W_2}=H^\top G_2,\qquad
\frac{\partial L}{\partial b_2}=\sum_{i=1}^{B}G_{2,i}$$

第二层的每个权重在所有样本上复用，所以权重梯度是输入与误差的外积之和；偏置对每行贡献相同，反向就在样本轴求和。要继续找到第一层的责任，先沿第二层线性映射传回隐藏层，再乘上节得到的激活导数：

$$G_H=G_2W_2^\top,\qquad
G_1=G_H\odot\phi'(Z_1)$$

第一层参数梯度：

$$\frac{\partial L}{\partial W_1}=X^\top G_1,\quad
\frac{\partial L}{\partial b_1}=\sum_iG_{1,i},\quad
\frac{\partial L}{\partial X}=G_1W_1^\top.$$

$\odot$ 表示逐元素乘法。矩阵转置让样本轴 $B$ 在求和中被消去。由微分 $dZ_1=dXW_1+XdW_1+\mathbf1\,db_1^\top$，把 $dL=\langle G_1,dZ_1\rangle$ 中对应系数收集起来，便得到这三个式子；偏置广播的反向是对广播轴求和。

为把所有矩阵都写出来，下面从三分类输出缩成两分类，并选两个正的隐藏预激活，让 ReLU 导数都为 1，单独看清线性层的梯度累加。

**完整手算。** 取 $B=1,d=h=c=2$，$X=[1,2]$，$W_1=\begin{bmatrix}1&-1\\0&1\end{bmatrix}$，$W_2=I$，两个偏置均为 0，激活 ReLU，标签 $Y=[1,0]$。前向 $Z_1=H=[1,1]$，$Z_2=[1,1]$，$P=[1/2,1/2]$，$L=\log2$。依次反传：

$$G_2=[-1/2,1/2],\quad
\nabla_{W_2}L=\begin{bmatrix}-1/2&1/2\\-1/2&1/2\end{bmatrix},\quad
G_H=G_1=[-1/2,1/2],$$

$$\nabla_{W_1}L=\begin{bmatrix}-1/2&1/2\\-1&1\end{bmatrix},\quad
\nabla_{b_1}L=\nabla_{b_2}L=[-1/2,1/2],\quad
\nabla_XL=[-1,1/2].$$

例中第二个输入为 2，所以它对应的第一层权重梯度是第一个输入对应行的两倍；负梯度会提高正确的第一类得分。所有梯度分别与参数同 shape；若复制样本组成 $B=2$ 并保持均值损失，参数梯度应完全相同。共享权重时，把每次使用产生的梯度相加；冻结参数不等于切断传给输入的梯度。下一节不再推另一套公式，而是实际扰动这里的一个权重，检验损失变化是否符合算出的梯度。`,
    },
    {
      id: "math-gradient-check",
      type: "derivation",
      title: "梯度检查：中心差分检查的是哪个函数",
      body: String.raw`两层网络的梯度 shape 都对，并不代表数值和符号也对。怎样不用另一套反传实现，就检查刚才的权重梯度？把同一个权重轻轻向两边移动，观察真实损失的变化，就能给解析梯度一个独立对照。

给定标量损失 $L(\theta)$，解析梯度为 $g\in\mathbb R^P$。假设检查点附近足够光滑，例如相应三阶导数有界。对第 $j$ 个坐标做正负扰动，Taylor 展开后相减，偶数项抵消，线性项除以扰动间距：

$$g_j^{FD}=\frac{L(\theta+\varepsilon e_j)-L(\theta-\varepsilon e_j)}{2\varepsilon}
=g_j+O(\varepsilon^2).$$

仅“可微”不足以得到二阶误差：$f(x)=x|x|$ 在 0 的导数为 0，但中心差分为 $\varepsilon$，误差只有一阶。浮点误差则大致随 $u/\varepsilon$ 增大，因此步长不是越小越好。用双精度、固定数据与随机种子，尝试 $10^{-4},10^{-5},10^{-6}$，比较绝对误差及 $\lvert g_j-g_j^{FD}\rvert/\max(1,\lvert g_j\rvert,\lvert g_j^{FD}\rvert)$。大模型逐参数检查需约 $2P$ 次前向；可选单位方向 $v$，用 $[L(\theta+\varepsilon v)-L(\theta-\varepsilon v)]/(2\varepsilon)$ 检查 $g^\top v$，但单方向不能证明所有坐标正确。

**数值例。** 固定 $h=[1,1]$，只扰动上节 $W_{2,11}=1$，logits 是 $[1+\delta,1]$，正确类为第一类：

$$L(\delta)=\log(1+e^{-\delta}),\quad
\frac{L(\varepsilon)-L(-\varepsilon)}{2\varepsilon}=-1/2.$$

这验证了 $H_1G_{2,1}=-1/2$：增大这个权重会提高正确类 logit，损失在当前位置下降，方向与反传一致。检查对象必须与解析梯度使用相同的 sum/mean、mask、正则项与参数共享规则。

对 $\operatorname{ReLU}(z)$ 在 $z=0$ 做中心差分得到 $1/2$，而框架通常回传 0；此时不是 autograd 错，而是经典导数不存在。应避开跨越不可导边界的扰动。dropout 必须固定同一 mask 或关闭，BN 的运行状态也不能在两次评估中被偷偷修改；否则比较的是两个不同函数。先在这些受控条件下检查代码实验的光滑坐标；梯度可信之后，再进入第 06 章决定步长和稳定性工具。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：手写一个 ReLU 网络",
      body: String.raw`下面是可运行的 NumPy 代码，输入仍是 [2,-1]，这次并排放两个神经元，再用第二层汇总。首次使用 NumPy，可在已有 Python 虚拟环境中运行 python3 -m pip install numpy，然后保存代码并运行。

np.array 把列表变成数值数组；@ 是矩阵乘法；.T 交换行列；np.maximum(z,0) 逐位置执行 ReLU；mean 求平均，size 统计元素数。以 g_ 开头的变量保存梯度。先跟随 z1、h、y_hat、loss 四个前向值，再检查反向。

~~~python
import numpy as np

X = np.array([[2.0, -1.0]])      # [B=1, d=2]
y = np.array([[1.0]])            # [1, 1]
W1 = np.array([[0.5, -0.2], [1.0, 0.3]])  # [2, 2]
b1 = np.array([[0.5, 0.0]])  # 避开 ReLU 的 z=0 不可导点
W2 = np.array([[0.4], [-0.6]])   # [2, 1]

z1 = X @ W1 + b1
h = np.maximum(z1, 0)
y_hat = h @ W2
loss = 0.5 * ((y_hat - y) ** 2).mean()

g_y_hat = (y_hat - y) / y_hat.size  # 与上面的 mean 损失一致
g_W2 = h.T @ g_y_hat
g_h = g_y_hat @ W2.T
g_z1 = g_h * (z1 > 0)
g_W1 = X.T @ g_z1

print("shapes:", z1.shape, y_hat.shape, g_W1.shape, g_W2.shape)
print("forward:", z1, h, y_hat)
print("loss:", float(loss))
~~~

前向应得到 z1=[[0.5,-0.7]]，ReLU 后 h=[[0.5,0]]，预测为 [[0.2]]，损失约 0.32。第二个神经元当前被 ReLU 截断；这正好对应基础自测中的负区间梯度。

本例已按全部输出元素取平均，平均系数也已进入上游梯度，不能在各层再次除以 batch 大小。多输出任务需声明按样本还是按元素平均；真实训练还会处理 dtype、清空旧梯度并由优化器更新。手写一次后再用框架 autograd，可把每个 API 对应到计算图中的明确角色。`,
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

若追问参数共享：共享参数在计算图中被多次使用，反向时各路径梯度累加。例如 tied embedding 同时参与输入查表和输出 logits，两端都会贡献梯度。

**白板加问。** 请先写 $J_{\rm softmax}=\operatorname{diag}(p)-pp^\top$，再推出归一化目标的 $\nabla_zL=p-y$，最后把 $(P-Y)/B$ 接到 $H^\top G_2$。若只会最后一个式子，就继续问非归一化标签和 logits 共同平移；若怀疑实现错误，用相同损失的中心差分验证，避开 ReLU 的零点。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：从 Jacobian 写到数值检查",
      body: "先写目标、维度和中间步骤，再核对答案及得分点。",
      questions: [
        {
          q: "z=[log 2,0,0]，标签为第二类。推导 softmax Jacobian、CE 梯度，并解释梯度和为何为 0。",
          a: String.raw`商法则给 $J_{ij}=p_i(\delta_{ij}-p_j)$。$p=[1/2,1/4,1/4]$，$J$ 的三行是 $[1/4,-1/8,-1/8]$、$[-1/8,3/16,-1/16]$、$[-1/8,-1/16,3/16]$。$L=-\log p_2=\log4$，$\nabla_zL=p-y=[1/2,-3/4,1/4]$。各分量和为 0，对应 logits 平移不变性。**得分点：**分母对所有类别求导；写出非对角项；说明归一化标签条件，而非只背 $p-y$。`,
        },
        {
          q: "X=[1,2]，W1=[[1,-1],[0,1]]，W2=I，偏置全零，ReLU，标签 [1,0]。求两层权重、偏置及输入梯度。",
          a: String.raw`$H=Z_2=[1,1]$，$P=[1/2,1/2]$，$G_2=[-1/2,1/2]$。$\nabla W_2=H^\top G_2=[[-1/2,1/2],[-1/2,1/2]]$；$G_1=G_2W_2^\top\odot[1,1]=[-1/2,1/2]$；$\nabla W_1=X^\top G_1=[[-1/2,1/2],[-1,1]]$；两偏置梯度均为 $[-1/2,1/2]$，$\nabla X=G_1W_1^\top=[-1,1/2]$。**得分点：**反向顺序、转置、偏置求和和梯度 shape；复制 batch 后均值梯度不翻倍。`,
        },
        {
          q: "中心差分在 ReLU(0) 得到 0.5，autograd 给 0，能据此判定反传错误吗？如何设计可靠检查？",
          a: String.raw`不能。$[\max(0,\varepsilon)-\max(0,-\varepsilon)]/(2\varepsilon)=1/2$，左右导数分别为 1 和 0，不存在唯一导数。把输入移到离 0 大于扰动幅度的位置，用双精度、固定 dropout mask、相同 mean/mask/正则目标，再扫描几个步长；光滑例 $L(\delta)=\log(1+e^{-\delta})$ 在 0 处应得 $-1/2$。**得分点：**识别不可导边界；区分随机误差、舍入误差与解析梯度错误。`,
        },
      ],
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：从神经元到计算图",
      body: "写出局部导数和 shape，不要只给最终数字。",
      questions: [
        {
          q: "标准 ReLU 位于负区间时，为什么上游误差信号无法沿这条局部路径继续传播？",
          a: "负区间的 ReLU 输出对输入的局部变化率为零，因此链式法则会把该路径的上游梯度乘为零。",
        },
        {
          q: "为什么线性层权重的梯度必须与权重本身具有相同 shape？",
          a: "每个权重位置都需要一个对应的偏导数，说明该位置轻微变化对损失的影响，因此二者必须一一对应。",
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
