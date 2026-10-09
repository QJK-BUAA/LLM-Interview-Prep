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
      body: String.raw`一段测量信号从低值突然跳到高值，我们希望无论跳变出现在开头还是末尾，都能用同一条规则找到它。需要为每个位置训练一套独立权重吗？如果还要记住很早以前的读数，局部窗口又够不够？本章围绕这两个问题，把前两章的网络和反向传播放到有空间、时间结构的输入上。

先用卷积让一个小核在所有位置重复使用。相邻读数的差能发现跳变，图像里的相邻像素也能构成边缘；共享参数使同一探测器不必在每个位置重新学习。下面先算四个窗口，再看重叠窗口怎样把梯度累加回同一个输入和卷积核。

若任务需要持续记住历史，RNN 每读一个元素就更新摘要状态，同一组参数沿时间复用。早期信息要影响末步输出，便要穿过多次状态更新；第 06 章的梯度尺度问题在这里变成时间上的连乘。LSTM 用受门控制的记忆通道决定保留、写入和读取，缓解衰减，却没有消除逐步计算：第 $t$ 步仍依赖第 $t-1$ 步。

卷积窗口、递归状态和门控记忆因此是在回答不同的通信需求。最后我们还会检查“读到了未来答案”这种错误：即使梯度完全正确，预测也可能无效。第 08 章先把文本变成输入向量，第 09 章再用注意力研究如何直接读取允许的历史位置。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：卷积核怎样发现边缘",
      body: String.raw`怎样让两个权重就能找到信号里的跳变，而不必事先知道跳变在哪？我们取一段先保持低值、再保持高值的信号，让同一个“后项减前项”探测器逐格移动。

输入为一维信号 $x=[1,1,1,4,4]$，卷积核 $k=[-1,1]$，步幅为 1，不填充。这里采用深度学习常用的不翻转核的互相关约定，每个输出是相邻两项的差：

$$y_1=-1\times1+1\times1=0$$

四个窗口得到 0、0、3、0，因此输出为 $[0,0,3,0]$。数值 3 出现在从 1 跳到 4 的边界，说明这个核是一个简单边缘探测器。

检测到边界以后，还要知道探测器能放几次。核覆盖两个位置，从长度为五的输入左端滑到右端，共有四个合法起点。推广到填充、跨步和间隔采样后，卷积输出长度公式是：

$$L_{out}=\left\lfloor\frac{L_{in}+2P-D(K-1)-1}{S}+1\right\rfloor$$

$P$ 是每侧补几个位置（padding），$D$ 是核内相邻取样点的间隔（dilation，1 表示连续取样），$K$ 是核大小，$S$ 是窗口每次移动几格（stride）。代入 $L_{in}=5,P=0,D=1,K=2,S=1$，得到 4。初读先用“四个合法起点”核对答案，需要跨步或填充时再用通式。

同一个核在四个位置复用，只需要两个参数。若用全连接层分别检测每个位置，需要为每个位置学习独立权重，无法自动获得这种共享约束。输出中的 3 表示局部上升幅度，不是已经学好的语义标签。接下来不再固定核为差分器，而是问损失如何训练这个被四个窗口共同使用的核。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：空间共享、时间共享与因果边界",
      body: String.raw`同一套参数被许多位置使用后，它最终收到哪些梯度？先沿卷积窗口算输出范围、感受野和重叠贡献，再把共享从空间移到时间，观察末步损失如何传回早期状态。

简单 RNN 的连乘会暴露长期记忆的困难，因此随后引入 LSTM 的两个状态和四组投影，再用更紧凑的 GRU 比较门控路径。最后检查双向模型与因果卷积的可见范围，因为共享与记忆都不能成为读取未知答案的理由。矩阵外积回看第 05 章，连乘尺度和饱和回看第 06 章；读完门控例后再进入白板练习，会更容易解释每个梯度来自哪条边。`,
      links: [
        { label: "CNN 几何与反传", sectionId: "math-convolution", level: "推导" },
        { label: "RNN 完整 BPTT", sectionId: "derivation", level: "必会" },
        { label: "LSTM 四门与 cell 梯度", sectionId: "math-lstm", level: "推导" },
        { label: "GRU、双向与因果", sectionId: "math-gru-causality", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "序列模型的通信路径",
      body: String.raw`RNN 的信息必须沿时间链传递，位置 1 影响位置 5 要经过四次状态更新。反向梯度也沿相反路径连乘，容易衰减或爆炸。LSTM 在这条链上增加近似加法的 cell state，使梯度有更平滑的通道，但计算依赖仍是串行的。

Self-Attention 中位置 1 与位置 5 可在一层内直接建立连接，路径长度变为常数。朴素实现显式保存 $S\times S$ 关系矩阵，算术量与该中间存储随长度平方增长。第 11 章的精确分块实现仍有二次算术量，却可避免在显存中保存完整平方矩阵。

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
      id: "math-convolution",
      type: "derivation",
      title: "CNN：输出尺寸、参数量、感受野与重叠反传",
      body: String.raw`差分核能找到跳变，但换成可训练的多通道卷积后，怎样确定输出大小、需要多少权重，以及一个输入会收到几个窗口的梯度？我们先确定窗口能落在哪里，再沿同一窗口规则做反向，避免把共享参数误当成每个位置独立的参数。

输入 $X\in\mathbb R^{B\times C_{in}\times H\times W}$，权重 $K\in\mathbb R^{C_{out}\times(C_{in}/G)\times K_h\times K_w}$，分组数 $G$ 必须整除两个通道数。这里 B 是样本数，两个 C 是输入、输出通道数，H/W 是空间尺寸。深度学习通常称不翻转核的互相关为“卷积”。先用一维单通道说明：

$$y_t=\sum_{a=0}^{K-1}k_a x_{tS-P+aD}+b.$$

把越界输入视为 0。有效核宽 $K_{\rm eff}=D(K-1)+1$，窗口起点不得越过填充后末尾，因此输出长度是 $\lfloor(L+2P-K_{\rm eff})/S\rfloor+1$，非对称填充时改用 $P_l+P_r$。二维分别对高宽套用；不整除时向下取整。

参数量为 $C_{out}(C_{in}/G)K_hK_w+C_{out}$，最后一项仅有 bias 时存在，与输出高宽无关。单层 MAC 数约为 $BH_{out}W_{out}C_{out}(C_{in}/G)K_hK_w$，乘加记 2 FLOPs 时再乘 2。

参数个数只回答模型要学多少数，还没回答叠两层后能看到多远。为此令初始感受野 $R_0=1$、相邻输出在输入上的间隔 $J_0=1$。第 $\ell$ 层的新核每扩一个位置，实际跨过上一层的输入间隔：

$$R_\ell=R_{\ell-1}+(K_\ell-1)D_\ell J_{\ell-1},\qquad
J_\ell=J_{\ell-1}S_\ell.$$

输入 $32\times32$、3 通道，第一层 16 个 $3\times3$ 核、padding=1、stride=2，输出 $16\times16\times16$，参数 $16(3\times9+1)=448$，$R_1=3,J_1=2$。第二层核 3、stride=1、dilation=1 后 $R_2=7,J_2=2$。理论感受野不等于实际梯度显著的有效感受野。

**反向是重叠贡献相加。** 设上游 $g_t=\partial L/\partial y_t$：

$$\frac{\partial L}{\partial k_a}=\sum_t g_t x_{tS-P+aD},\quad
\frac{\partial L}{\partial x_i}=\sum_{t,a:\ i=tS-P+aD}g_tk_a,\quad
\frac{\partial L}{\partial b}=\sum_tg_t.$$

为了逐项检查重叠反向，下面改用三元素单通道输入，并给两个窗口不同的上游权重；不再要求核恰好是开场的边缘探测器。取 $x=[1,2,3],k=[2,-1]$，stride=1、无填充，则 $y=[0,1]$；对 $L=y_0+2y_1$，$g=[1,2]$。核梯度为 $[1+4,2+6]=[5,8]$，输入梯度为 $[2,-1+4,-2]=[2,3,-2]$，bias 梯度 3。中间输入收到两个窗口的贡献，覆盖而非累加会算错。

核梯度 [5,8] 汇总了两次使用，输入中间位置的梯度 3 则是两条路径的净贡献；这就是共享和重叠在反传中的可见结果。转置卷积是该线性算子的伴随，用于把输出梯度映回输入空间，不是一般意义上的逆。stride>1 丢失的信息不能凭转置恢复；平移等变性也受 stride、边界填充与下采样限制。下一节仍然累加共享梯度，只是窗口位置改成了递归的时间步。`,
    },
    {
      id: "derivation",
      type: "derivation",
      title: "RNN 梯度为何会消失或爆炸",
      body: String.raw`如果末步预测需要第一步输入，早期信息要怎样穿过共享状态，误差又怎样传回来？我们把三个时间步展开，比较完整反传与中途切断历史两种结果，直接看出“保留状态值”和“保留学习路径”并不是一回事。

每步输入为列向量 $x_t\in\mathbb R^d$，状态 $h_t\in\mathbb R^h$，共享参数为 $W_h\in\mathbb R^{h\times h}$、$W_x\in\mathbb R^{h\times d}$、$b\in\mathbb R^h$，总损失 $L=\sum_{t=1}^T\ell_t(h_t)$。简单 RNN 的隐藏状态为：

$$h_t=\tanh(W_hh_{t-1}+W_xx_t+b)$$

令 $a_t=W_hh_{t-1}+W_xx_t+b$，直接来自当步损失的梯度为 $u_t=\nabla_{h_t}\ell_t$。逆时间递推：

$$\bar h_t=u_t+W_h^\top\delta_{t+1},\quad
\delta_t=\bar h_t\odot(1-h_t^2),\quad \delta_{T+1}=0.$$

一个状态既影响当步损失，也影响下一状态，所以先将这两股上游相加，再乘 tanh 的局部导数。每步使用同一参数，因此像卷积核一样把各次外积累加：

$$\nabla_{W_h}L=\sum_t\delta_th_{t-1}^\top,\quad
\nabla_{W_x}L=\sum_t\delta_tx_t^\top,\quad
\nabla_bL=\sum_t\delta_t,\quad \nabla_{x_t}L=W_x^\top\delta_t.$$

若只有末步损失，局部 $J_k=\operatorname{diag}(1-h_k^2)W_h$，列梯度满足 $\nabla_{h_t}L=J_{t+1}^\top\cdots J_T^\top\nabla_{h_T}L$。范数上界是 $\prod_k\|J_k\|_2$。小于 1 的一致上界会导致衰减；大于 1 只说明可能放大，不能仅看某个特征值断言每个方向都爆炸。

**可复算例。** 为隔离时间共享，暂用线性激活 $h_t=wh_{t-1}+x_t$，$w=0.5,h_0=0,x=[1,0,2]$，末步损失 $L=h_3$。前向为 $h=[1,0.5,2.25]$，逆传 $\bar h_3=1,\bar h_2=0.5,\bar h_1=0.25$。共享参数梯度 $dL/dw=1\times0.5+0.5\times1+0.25\times0=1$，也可直接由 $h_3=w^2+2$ 求导得到 $2w=1$。若在 $h_2$ detach，只保留最后一步，得到 0.5，说明截断 BPTT 对完整序列目标的梯度有偏。

上面的线性例中，完整梯度为 1，截断后只剩 0.5，缺掉的是早期使用共享权重的贡献，不是末步状态值变了。这个现象说明不能靠切断历史来学会长期依赖；前面的连乘又提示我们寻找更容易保留梯度的通道。

LSTM 为此引入单独的记忆状态 c；$f_t$ 表示遗忘门，$i_t$ 表示写入门，$\tilde c_t$ 是候选记忆。其 cell state 更新为：

$$c_t=f_t\odot c_{t-1}+i_t\odot\tilde c_t$$

对旧状态的直接局部导数包含 $f_t$。当遗忘门 $f_t$ 接近 1，梯度可沿加法通路较完整地传递；模型也能主动把 $f_t$ 设小以遗忘信息。它改善但不保证无限长期记忆，门仍可能饱和，序列仍需逐步展开。下一节把这些门和两条状态路径补全，检查直接通道之外还遗漏了哪些导数。`,
    },
    {
      id: "math-lstm",
      type: "derivation",
      title: "完整 LSTM：四门、两个状态与反向累积",
      body: String.raw`递归链需要记住一个旧值，又要决定何时写入新值、何时把记忆用于输出。LSTM 如何把这三件事分开，并让最终误差同时走回记忆通道和输出通道？先用所有门都处于中间值的标量例，避免把“有遗忘门”直接等同于“永不遗忘”。

使用不含 peephole 的标准 LSTM，输入 $x_t\in\mathbb R^d$，可见隐藏状态与内部记忆分别为 $h_t,c_t\in\mathbb R^h$。拼接 $v_t=[x_t;h_{t-1}]\in\mathbb R^{d+h}$，每个 $W_\bullet\in\mathbb R^{h\times(d+h)}$，每个偏置属于 $\mathbb R^h$：

$$i_t=\sigma(W_iv_t+b_i),\quad
f_t=\sigma(W_fv_t+b_f),\quad
o_t=\sigma(W_ov_t+b_o),\quad
g_t=\tanh(W_gv_t+b_g),$$

$$c_t=f_t\odot c_{t-1}+i_t\odot g_t,\qquad
h_t=o_t\odot\tanh(c_t).$$

$i,f,o$ 分别控制写入、保留和读取；$g$ 是候选内容而不是 sigmoid 门。合并实现是一次 $4h$ 输出的线性投影，参数数为 $4h(d+h+1)$，某些框架拆为两套偏置时需多算 $4h$。

**反向推导。** 令 $\bar h_t$ 已含当步损失和未来通过隐状态传回的梯度，$\bar c_t^{next}$ 表示未来沿 cell 通路回来的梯度。先合并同一节点的两条路径：

$$\bar c_t=\bar c_t^{next}+\bar h_t\odot o_t\odot(1-\tanh^2c_t).$$

合并后的 cell 梯度告诉保留门和写入门该怎样改变记忆，隐藏状态梯度则还直接影响读取门。再乘 sigmoid 或 tanh 的局部导数，依次求四个预激活梯度：

$$\delta_o=(\bar h_t\odot\tanh c_t)\odot o_t(1-o_t),$$

$$\delta_f=(\bar c_t\odot c_{t-1})\odot f_t(1-f_t),\quad
\delta_i=(\bar c_t\odot g_t)\odot i_t(1-i_t),\quad
\delta_g=(\bar c_t\odot i_t)\odot(1-g_t^2).$$

各门参数梯度 $\delta_\bullet v_t^\top$ 沿时间相加；$\bar v_t=\sum_\bullet W_\bullet^\top\delta_\bullet$ 拆成 $\bar x_t,\bar h_{t-1}$，而 cell 的直接回传为 $\bar c_{t-1}^{direct}=\bar c_t\odot f_t$。

**手算与边界。** 标量例令四组权重偏置均为 0、$c_{t-1}=2$，则 $i=f=o=1/2,g=0,c_t=1,h_t=\tanh(1)/2\approx0.380797$。损失 $L=h_t$、无未来项时，$\bar c_t=(1-\tanh^2 1)/2\approx0.209987$，直接旧 cell 梯度约 0.104994。通常说的 $\partial c_t/\partial c_{t-1}=f_t$ 只指固定门值的直接边；完整循环状态 Jacobian 还含 $c\to h\to$ 各门路径。即使长期 $f=0.99$，1000 步直接路径也只剩 $0.99^{1000}\approx4.3171\times10^{-5}$。

旧记忆是 2，保留一半后 cell 为 1，但输出还要经过 tanh 和读取门，只剩约 0.380797；回到旧 cell 的直接梯度也只剩约 0.104994。前向“保留了多少”和反向“还能学多少”要分别计算。遗忘门大有利于保留，但 sigmoid 饱和时门参数学习慢；cell 路径不衰减也不保证输出的 tanh 不饱和。下一节尝试去掉独立 cell，用 GRU 看更紧凑的状态更新保留了哪些路径。`,
    },
    {
      id: "math-gru-causality",
      type: "derivation",
      title: "完整 GRU：重置门约定、更新 Jacobian 与双向泄漏",
      body: String.raw`能不能只维护一个状态，就完成旧信息保留和新内容写入？GRU 把这两种内容混合在一起，但混合比例本身也依赖旧状态，所以不能只看保留比例就断言梯度大小。计算完这一点，我们再检查同样的状态网络在何种预测任务中会偷看未来。

本节采用 reset-before、更新门表示“保留旧状态”的约定。输入与状态为 $x_t\in\mathbb R^d,h_t\in\mathbb R^h$，$W_\bullet\in\mathbb R^{h\times d},U_\bullet\in\mathbb R^{h\times h}$，$z_t,r_t,n_t$ 分别表示保留门、重置门和候选内容：

$$z_t=\sigma(W_zx_t+U_zh_{t-1}+b_z),\quad
r_t=\sigma(W_rx_t+U_rh_{t-1}+b_r),$$

$$n_t=\tanh(W_nx_t+U_n(r_t\odot h_{t-1})+b_n),\quad
h_t=z_t\odot h_{t-1}+(1-z_t)\odot n_t.$$

没有独立 cell，参数为 $3h(d+h+1)$。有的文献让 $z$ 表示写入比例，公式会互换 $z$ 与 $1-z$；PyTorch 常用 reset-after，即在递归线性变换后乘 $r$。一般 $U(r\odot h)\ne r\odot(Uh)$，不能不转换参数就认作同一实现。

改变旧状态会直接改变保留项，也会通过两个门改变候选内容和混合比例。令 $D_z=\operatorname{diag}(z(1-z))U_z$、$D_r=\operatorname{diag}(r(1-r))U_r$，则候选状态的 Jacobian 为：

$$D_n=\operatorname{diag}(1-n^2)U_n
\left[\operatorname{diag}(r)+\operatorname{diag}(h_{t-1})D_r\right],$$

$$J_t=\frac{\partial h_t}{\partial h_{t-1}}
=\operatorname{diag}(z)+\operatorname{diag}(h_{t-1}-n)D_z
+\operatorname{diag}(1-z)D_n.$$

第一项是保留旧状态的直接路径，另两项来自门与候选的输入依赖。标量手算：固定 $z=0.75,r=0.5,h_{t-1}=2,U_n=1,W_nx+b_n=0$，$n=\tanh1\approx0.761594$，$h_t=1.5+0.25n\approx1.690399$；固定门时 $dh_t/dh_{t-1}=0.75+0.125(1-\tanh^21)\approx0.802497$，不是 0.75。

新状态约 1.690399，确实更靠近旧值 2；但导数约 0.802497 大于保留门的 0.75，因为候选也随旧状态改变。这个例子检验的是固定门的局部路径，不替代完整门网络的 Jacobian。

状态算对以后还要查可见输入。双向 RNN 把 $\overrightarrow h_t=f(x_{\le t})$ 与 $\overleftarrow h_t=g(x_{\ge t})$ 拼接成 $2h$ 维。句子分类或完整输入已知的编码器可用；若拿它直接预测 $x_{t+1}$，反向状态已看见该标签，会泄漏。预测目标未知时应限制可见输入，而不是只把 loss 的未来位置 mask 掉。因果卷积同样只在左侧填充 $D(K-1)$，不能使用对称填充读取未来。带着这项检查进入文本建模：第 08 章要先明确输入 token 与待预测标签怎样错开。`,
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

若 recurrent_weight 连续为 0.5，早期输入对很晚状态的直接影响会按 $0.5^k$ 衰减；若为 1.5，则按 $1.5^k$ 放大。真实网络要看包含激活导数的完整 Jacobian 连乘；单个循环矩阵的谱半径不足以给出非正规矩阵在有限时间的所有方向行为。

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

若追问 LSTM 如何缓解梯度消失，先写 $i,f,o$ 三个 sigmoid 门和 tanh 候选，再写 $c_t=f_tc_{t-1}+i_tg_t,h_t=o_t\tanh c_t$（乘法均逐元素）。固定门值的直接 cell 梯度乘 f，但全状态 Jacobian 还包含门对旧隐状态的依赖；$0.99^{1000}$ 仍会衰减，不能声称完全解决。

若追问卷积参数量，输入通道 $C_{in}$、输出通道 $C_{out}$、核 $K_h\times K_w$ 时，权重数为 $K_hK_wC_{in}C_{out}$，若有 bias 再加 $C_{out}$，与图像高宽无关。

若追问 exposure bias，说明 teacher forcing 训练时总看到真实历史，推理时只能看到自己生成的历史；一个早期错误会把后续输入带到训练少见区域。on-policy 学习与蒸馏正试图在学生自己的轨迹上提供监督。

**白板加问。** 写出共享梯度 $\nabla W_h=\sum_t\delta_th_{t-1}^\top$，解释 detach 为何保留状态值却改变该和式。比较 GRU 时必须先声明 z 表示保留还是写入，以及 reset-before/after；比较双向模型时先确认未来输入是否包含待预测标签。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：卷积、共享梯度与门控边界",
      body: "先声明卷积、门控和损失约定，再列中间计算。",
      questions: [
        {
          q: "一维互相关 x=[1,2,3]、k=[2,-1]、stride=1、无 padding、bias=0，L=y0+2y1。求 y、核/输入/bias 梯度。",
          a: String.raw`$y=[2-2,4-3]=[0,1]$，上游 $[1,2]$。核梯度是各窗口输入加权求和 $[1+2\times2,2+2\times3]=[5,8]$；输入梯度 $[2,-1+4,-2]=[2,3,-2]$；bias 梯度 $1+2=3$。**得分点：**核共享求和；中间位置重叠累加；输入梯度是伴随而非求逆。`,
        },
        {
          q: "线性 RNN h_t=w h_(t-1)+x_t，w=0.5、h0=0、x=[1,0,2]、L=h3。完整 BPTT 和在 h2 detach 后的 dw 是多少？",
          a: String.raw`前向 $h=[1,0.5,2.25]$，末步到首步状态梯度为 $[1,0.5,0.25]$。共享参数梯度 $1\times h_2+0.5\times h_1+0.25\times h_0=1$，等于 $d(w^2+2)/dw$。detach 后只有末步的 $h_2=0.5$。**得分点：**累加所有时间路径；截断保留数值但切断历史导数；不能称为完整目标的无偏梯度。`,
        },
        {
          q: "LSTM 四门权重偏置全为 0，旧 cell=2，L=h_t，求 c_t、h_t、直接旧 cell 梯度。为什么 f 接近 1 不保证无限记忆？",
          a: String.raw`$i=f=o=1/2,g=0$，$c_t=1,h_t=\tanh1/2\approx0.380797$。$\bar c_t=(1-\tanh^21)/2\approx0.209987$，直接旧 cell 梯度再乘 $1/2$ 得 0.104994。直接长期梯度乘 $\prod f_k$，$0.99^{1000}\approx4.3171\times10^{-5}$；还存在门依赖路径及输出饱和。**得分点：**完整四门；两个状态路径；区分直接边和全 Jacobian。`,
        },
        {
          q: "GRU 的 z=0.75、r=0.5、旧状态=2、候选为 tanh(r h)，求新状态；双向 GRU 能否直接做 next-token predictor？",
          a: String.raw`采用 $z$ 为保留比例，新状态 $0.75\times2+0.25\tanh1\approx1.690399$。双向的反向状态读取未来输入，若未来含待预测标签便泄漏；可用于完整源句编码，不能不加可见性约束就预测未知未来。**得分点：**说明门约定；识别 reset-before/after 差异；loss mask 不能撤回前向已经读到的信息。`,
        },
      ],
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
      label: "Deep Learning: Convolutional Networks",
      url: "https://www.deeplearningbook.org/contents/convnets.html",
      evidence: "教材；卷积梯度与数字例为本章教学推导",
    },
    {
      label: "Learning Phrase Representations using RNN Encoder-Decoder",
      url: "https://arxiv.org/abs/1406.1078",
      evidence: "GRU 早期论文；本章明确更新门的保留比例约定",
    },
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
      label: "Learning to Forget: Continual Prediction with LSTM",
      url: "https://doi.org/10.1162/089976600300015015",
      evidence: "遗忘门扩展论文；现代四门形式不全部归于 1997 年版本",
    },
    {
      label: "Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      evidence: "原始论文",
    },
  ],
};

export default chapter;
