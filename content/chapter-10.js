const chapter = {
  id: "10",
  slug: "modern-llm-components",
  part: "LLM 主线",
  title: "现代 LLM 组件",
  subtitle: "位置、归一化、注意力、专家与状态空间模型",
  level: "进阶",
  duration: 145,
  prerequisites: ["06", "09"],
  tags: ["RoPE", "RMSNorm", "SwiGLU", "GQA", "MLA", "MoE", "Mamba", "NSA"],
  objectives: [
    "解释 RoPE、ALiBi 与 YaRN 如何处理位置和长度外推",
    "比较 MHA、MQA、GQA 与 MLA 的 KV 成本",
    "说明 RMSNorm、SwiGLU 和 MoE 的作用位置",
    "区分成熟默认组件与仍需按模型验证的研究方案",
  ],
  summary:
    "现代 LLM 不是单一新发明，而是围绕位置表示、训练稳定性、KV 共享、稀疏计算与长序列效率的一组组合选择；每个选择都在质量、显存、吞吐和实现复杂度之间交换。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：把组件收益落实到代数和资源量",
      body: String.raw`先修：第 06 章归一化、第 09 章 Attention 前后向与 FLOPs。学习顺序为 RoPE 相对位置代数 → RMSNorm 导数 → SwiGLU 参数匹配 → GQA/MLA 缓存布局 → MoE 路由和负载目标。不要只报组件名称；要说明哪个张量被改变、节省哪笔账、哪些性质只是特定假设下成立。Mamba/NSA 等扩展保留在比较部分，不把研究路线写成无条件替代结论。`,
      links: [
        { label: "RoPE 相对位移", sectionId: "math-rope-relative", level: "推导" },
        { label: "RMSNorm 完整导数", sectionId: "math-rmsnorm-backward", level: "推导" },
        { label: "SwiGLU 等参数比较", sectionId: "math-swiglu-budget", level: "必会" },
        { label: "MHA/GQA/MQA/MLA 缓存", sectionId: "math-kv-mla", level: "进阶" },
        { label: "MoE 路由与辅助损失", sectionId: "math-moe-routing", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：组件是在替不同瓶颈付账",
      body: String.raw`标准 Transformer 给出骨架，现代 LLM 则逐项处理实际瓶颈。RoPE 或 ALiBi 告诉注意力“相隔多远”；RMSNorm 和残差布局让深层训练稳定；SwiGLU 提升 FFN 的条件化表达；GQA、MLA 压缩生成时反复读取的 KV Cache；MoE 用稀疏路由扩大总参数但限制每 token 计算；Mamba 和稀疏注意力尝试降低长序列成本。

这些组件不能按论文热度任意拼装。一个改动会影响其他边界：位置编码决定外推方式，注意力结构决定缓存布局，MoE 决定通信模式，量化又可能改变算子支持。工程上更可靠的做法是先确认模型家族的完整配方，再做受控消融。

截至当前，RoPE、RMSNorm、SwiGLU 和 GQA 已在多种公开大模型中形成成熟实践；MoE 也已大规模部署，但路由与通信调优复杂。MLA 在特定模型家族中有明确实证，Mamba/SSM 与 NSA（Native Sparse Attention）仍属于快速演进的替代或混合路线，不能笼统说已经取代全注意力。

评价组件时至少问四件事：训练时节省什么，推理时节省什么，质量在哪个任务上验证，硬件是否有高效 kernel。只有公式复杂度下降，不代表真实延迟一定下降。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：GQA 怎样缩小 KV Cache",
      body: String.raw`设隐藏维 $H=4096$，query 头数 $N_q=32$，每头维度 $D=128$。标准 MHA（Multi-Head Attention）也有 32 个 K/V 头，每个 token 每层需缓存：

$$32\times128\times2=8192\text{ 个元素}$$

最后的 2 表示 K 和 V。若使用 GQA（Grouped-Query Attention），每 4 个 query 头共享一组 K/V，因此 $N_{kv}=8$，缓存变为：

$$8\times128\times2=2048\text{ 个元素}$$

恰好缩小 4 倍。MQA（Multi-Query Attention）让所有 query 头共享唯一 K/V 头，只需 $1\times128\times2=256$ 个元素，压缩 32 倍，但共享更强，质量与训练迁移需要验证。

GQA 的计算仍有 32 个 query 头，每组 query 读取同一 K/V。它主要减少 KV 投影、缓存容量和内存带宽，不把整个注意力矩阵的查询工作降为八分之一。生成阶段经常受内存带宽限制，所以缓存压缩可能显著提升并发。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "现代 decoder block 的组件位置",
      body: String.raw`一个常见现代 block 从 RMSNorm 开始，用 RoPE 变换 Q/K 的二维通道对，再进入 GQA 或 MLA 注意力；残差相加后，第二个 RMSNorm 接 SwiGLU 或 MoE FFN。

RoPE 只变换 Q 与 K，不直接旋转 V；它让点积包含相对位置差。GQA 改变 K/V 头数量，MLA 则把 K/V 信息投影进更小潜变量并在需要时恢复相关表示。MoE 位于 FFN 位置，通过 router 为每个 token 选择少数专家。

Mamba/SSM 不是给这个注意力块换一个 mask，而是用输入相关的状态更新传播历史；混合架构可以交替放置注意力与状态空间层。NSA 则仍属于注意力范式，通过稀疏选择压低长上下文计算。`,
      diagram: {
        kind: "flow",
        nodes: [
          "隐藏状态",
          "RMSNorm",
          "RoPE + GQA/MLA",
          "残差",
          "RMSNorm",
          "SwiGLU 或 MoE",
          "下一层",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 6],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "RoPE、RMSNorm 与 SwiGLU 的核心公式",
      body: String.raw`RoPE（Rotary Position Embedding）把向量相邻两维看成二维平面。位置 $m$ 对向量对 $(x_{2i},x_{2i+1})$ 施加旋转：

$$R_{\theta_i,m}
\begin{bmatrix}x_{2i}\\x_{2i+1}\end{bmatrix}
=
\begin{bmatrix}
\cos(m\theta_i)&-\sin(m\theta_i)\\
\sin(m\theta_i)&\cos(m\theta_i)
\end{bmatrix}
\begin{bmatrix}x_{2i}\\x_{2i+1}\end{bmatrix}$$

当 query 在位置 $m$、key 在位置 $n$ 时，旋转后的点积满足 $q^\top R_{n-m}k$ 的形式，因此自然依赖相对位移。长于训练窗口时，旋转频率落入未见区域；YaRN 等方法通过频率插值和尺度修正扩展上下文，但仍需长上下文数据与评估。

RMSNorm 对隐藏向量 $x\in\mathbb{R}^{H}$ 计算：

$$\operatorname{RMS}(x)=\sqrt{\frac1H\sum_{i=1}^{H}x_i^2+\epsilon}$$

$$y_i=g_i\frac{x_i}{\operatorname{RMS}(x)}$$

它不像 LayerNorm 那样减去均值，减少部分计算。正缩放不变性在 $\epsilon=0$、输入非零时精确成立；非零 epsilon 下是近似性质。

SwiGLU 使用两条投影：

$$\operatorname{SwiGLU}(x)
=\operatorname{SiLU}(xW_g)\odot(xW_u),\qquad
y=\operatorname{SwiGLU}(x)W_d$$

$W_g$ 产生门，$W_u$ 产生内容，逐元素相乘后由 $W_d$ 压回隐藏维。为保持与普通 FFN 相近的参数量，其中间宽度通常不会直接照搬原来的 $4H$。`,
    },
    {
      id: "math-rope-relative",
      type: "derivation",
      title: "RoPE：从旋转矩阵证明相对位置",
      body: String.raw`**定义与维度。** 每头的旋转维度 $d_R$ 为偶数，$R_m\in\mathbb R^{d_R\times d_R}$ 是由 $2\times2$ 旋转块组成的块对角矩阵，第 $i$ 对角度为 $m\theta_i$，常见频率 $\theta_i=b^{-2i/d_R}$。令 $\tilde q_m=R_mq_m,\tilde k_n=R_nk_n$。

二维旋转满足 $R(a)^\top=R(-a)$ 和 $R(a)R(b)=R(a+b)$，因此逐块有：

$$\tilde q_m^\top\tilde k_n
=q_m^\top R_m^\top R_nk_n
=q_m^\top R_{n-m}k_n.$$

相同平移 $m\mapsto m+c,n\mapsto n+c$ 不改变旋转带来的相对位移，但内容向量 $q_m,k_n$ 仍依赖文本，不能说“注意力只与距离有关”。旋转正交，也保长度：$\|R_mq\|_2=\|q\|_2$。

**数值例。** 仅一对通道，$q=k=[1,0]^\top,\theta=\pi/2,m=1,n=2$，旋转后 q 为 $[0,1]$、k 为 $[-1,0]$，点积 0，等于 $\cos((n-m)\theta)=0$；$m=0,n=2$ 时点积为 -1。这也说明“距离越远权重严格越小”并不成立，因为旋转相位是周期的。

**反向与边界。** 位置和频率固定时，$\nabla_qL=R_m^\top\nabla_{\tilde q}L$，只需逆旋转。未参与旋转的通道照常点积。实现的 interleaved 与 split-half 配对必须与 checkpoint 一致，否则长度保持仍成立但模型语义错误。

**追问外推。** 统一把位置缩成 $m/s$ 会改变频率分辨率和局部相位；YaRN 等采用更细的频段策略。相对位置代数不等于分布外长序列质量保证，需单独测长程召回、位置偏差与 PPL。`,
    },
    {
      id: "math-rmsnorm-backward",
      type: "derivation",
      title: "RMSNorm：归一化分母也必须反传",
      body: String.raw`**定义。** $x,g\in\mathbb R^H$，$r=\sqrt{H^{-1}\sum_jx_j^2+\epsilon}$，$y_i=g_ix_i/r$。上游 $a_i=\partial L/\partial y_i$，记 $u_i=a_ig_i$。由 $dr=(Hr)^{-1}\sum_jx_jdx_j$，先求局部 Jacobian：

$$\frac{\partial y_i}{\partial x_j}
=g_i\left(\frac{\delta_{ij}}r-\frac{x_ix_j}{Hr^3}\right).$$

将上游对输出维求和得：

$$\nabla_xL=\frac ur-\frac{x}{Hr^3}(x^\top u),\qquad
\frac{\partial L}{\partial g_i}=a_i\frac{x_i}r.$$

gamma 在所有 token 共享时，第二个式子还要沿 batch/token 轴求和。与 LN 相比，没有减去 $\operatorname{mean}(u)$ 的项，因为前向不中心化。

**手算。** $x=[1,2],g=[1,1],a=[1,0],\epsilon=0$，$r=\sqrt{5/2}$，$y=[1/r,2/r]$：

$$\nabla_xL=[0.8/r,-0.4/r]
\approx[0.505964,-0.252982],\quad
\nabla_gL=[1/r,0].$$

$x^\top\nabla_xL=0$，对应无 epsilon 时对正尺度的精确不变性。若错误把 r detach，输入梯度将变成 $[1/r,0]$，沿径向出现不该有的梯度。

**数值边界。** 取 $\epsilon>0$ 时，$x^\top\nabla_xL=\epsilon(x^\top u)/r^3$，不再严格为 0；$x=0$ 时 Jacobian 为 $\operatorname{diag}(g)/\sqrt\epsilon$，可能很大但有限。移位 $x+c\mathbf1$ 会改变 RMSNorm，不能把 LN 的平移不变性搬过来。实际平方和通常提高累积精度，避免低精度溢出。`,
    },
    {
      id: "math-swiglu-budget",
      type: "derivation",
      title: "SwiGLU：三矩阵预算与门控梯度",
      body: String.raw`**维度。** 对行向量 $x\in\mathbb R^{1\times H}$，$a=xW_g,b=xW_u\in\mathbb R^{1\times F}$，$W_g,W_u\in\mathbb R^{H\times F}$，$W_d\in\mathbb R^{F\times H}$。输出 $y=(\operatorname{SiLU}(a)\odot b)W_d$。

普通宽度 $4H$ 的两矩阵 FFN 参数为 $8H^2$；SwiGLU 为 $3HF$。等参数预算解：

$$3HF=8H^2\quad\Longrightarrow\quad F=8H/3.$$

忽略 bias 时，线性主项的 FLOPs 分别为 $16H^2$ 与 $6HF$，在这个宽度也匹配，实际还多出门控激活和乘法。$H=12$ 时普通 FFN 宽度 48、参数 1152，SwiGLU 宽度 32、参数也为 1152。真实硬件需把宽度对齐到合适倍数，匹配通常是近似。

**反向为什么有两路。** 设输出上游 $G_y$，$u=G_yW_d^\top$。由 $\operatorname{SiLU}(a)=a\sigma(a)$：

$$G_a=u\odot b\odot[\sigma(a)+a\sigma(a)(1-\sigma(a))],\quad
G_b=u\odot\operatorname{SiLU}(a),$$

$$G_x=G_aW_g^\top+G_bW_u^\top,\quad
G_{W_d}=(\operatorname{SiLU}(a)\odot b)^\top G_y.$$

另外 $G_{W_g}=x^\top G_a,G_{W_u}=x^\top G_b$。标量 $a=0,b=2,u=3$，SiLU 导数为 $1/2$，所以 $G_a=3,G_b=0$。门输出为 0 不代表门参数完全没有梯度；这与把两支都初始化为零的乘法结构有不同后果。

**追问。** SwiGLU 的“门”不在 [0,1] 内，因为使用的是 SiLU，不是单独 sigmoid；不能把它当成概率路由。`,
    },
    {
      id: "math-kv-mla",
      type: "derivation",
      title: "KV 布局：GQA 共享头与 MLA 潜变量吸收",
      body: String.raw`**普通缓存账单。** 层数 L、batch B、缓存长度 S、每元素 b 字节。Q 头数 $N_q$、KV 头数 $N_{kv}$、每头维度 D 时：

$$M_{KV}=2LBSN_{kv}Db.$$

MHA 为 $N_{kv}=N_q$，MQA 为 1，GQA 介于两者之间。投影参数忽略 bias 为 $2H(N_qD)+2H(N_{kv}D)$（Q/O 与 K/V 各两份）；query 头数不变，因此 QK/AV 主算术量不直接按 KV 压缩比下降。

**MLA 改变的是缓存表示。** 以下为带解耦 RoPE 的结构示意，不声称适用于每种实现。对 token 隐状态 $h_t\in\mathbb R^H$，缓存压缩向量 $c_t=W^{DKV}h_t\in\mathbb R^{d_c}$ 和独立旋转 key $k_t^R\in\mathbb R^{d_R}$。第 i 头内容 key/value 为 $k_{t,i}^C=W_i^{UK}c_t$、$v_{t,i}=W_i^{UV}c_t$。内容分数可吸收上投影：

$$ (q_{s,i}^C)^\top W_i^{UK}c_t
=\left((W_i^{UK})^\top q_{s,i}^C\right)^\top c_t.$$

总分数还需加入 $(q_{s,i}^R)^\top k_t^R$ 并按完整 key 维度缩放；不能把位置旋转不加区分地吸收进一组与位置无关的权重。value 聚合满足 $\sum_ta_{st,i}W_i^{UV}c_t=W_i^{UV}\sum_ta_{st,i}c_t$，可把 $W_i^{UV}$ 与输出投影组合。

这样解码无需永久缓存每头展开后的 K/V，理想每 token 每层存 $d_c+d_R$ 个元素：

$$M_{MLA}=LBS(d_c+d_R)b.$$

**统一数字例。** $N_q=32,D=128$，MHA/GQA(8 heads)/MQA 分别缓存 8192/2048/256 个元素。示意 MLA 取 $d_c=512,d_R=64$，缓存 576 个元素，比 MHA 少约 14.22 倍，但比此例 MQA 多。不能无条件声称 MLA 总比 MQA 更省。临时展开、页表、量化 scale 和 padding 另计；压缩后的矩阵尺寸也会改变 kernel 算力效率。

**追问。** 仅知道压缩维度不能反推出吞吐；必须知道 Q 的内容/旋转维度、是否采用投影吸收、缓存 dtype 和服务 batch。`,
    },
    {
      id: "math-moe-routing",
      type: "derivation",
      title: "MoE：Top-k 路由、辅助损失与容量",
      body: String.raw`**定义。** T 个 token，E 个专家，router 权重 $W_r\in\mathbb R^{H\times E}$，$p_t=\operatorname{softmax}(x_tW_r)$。选取集合 $\mathcal K_t=\operatorname{TopK}(p_t,k)$，本节选择后重归一化：

$$\tilde p_{te}=\frac{p_{te}}{\sum_{j\in\mathcal K_t}p_{tj}},\quad
y_t=\sum_{e\in\mathcal K_t}\tilde p_{te}F_e(x_t).$$

Top-k 的离散索引通常不反传；固定集合内部的连续权重和专家可微。若 k=1 且唯一权重重归一化成 1，主任务就没有通过混合权重传给 router 的梯度，因此实际 top-1 架构常保留未重归一化的 gate 或依赖另外的路由学习机制。不能把一种 top-2 教学实现套给所有 MoE。

**负载均衡的一个明确版本。** Switch 风格 top-1 辅助项定义：

$$f_e=\frac1T\sum_t\mathbf1[\arg\max_jp_{tj}=e],\quad
P_e=\frac1T\sum_tp_{te},\quad
L_{aux}=\alpha E\sum_ef_eP_e.$$

$f_e$ 作为离散统计 stop-gradient，$P_e$ 保留梯度。对第 t 个 token 的 router logit $z_{tj}$：

$$\frac{\partial L_{aux}}{\partial z_{tj}}
=\frac{\alpha E}{T}p_{tj}\left(f_j-\sum_ef_ep_{te}\right).$$

过载专家的 $f_j$ 大，会受到降低其概率的梯度压力。此式不是所有 top-k 模型的统一损失；top-k 的分配计数需明确按 T 还是 kT 归一化。

**手算与边界。** E=4，完全均匀的 $f=P=[1/4,1/4,1/4,1/4]$ 得 $L_{aux}=\alpha$。若全部 token 选专家 0、$P=[0.7,0.1,0.1,0.1]$，则 $L_{aux}=2.8\alpha$，$\alpha=0.01$ 时为 0.028；不应把均匀值误写成 0。

每专家容量常按 $C=\lceil c\,kT/E\rceil$ 设定，c 是 capacity factor。T=8、E=4、k=2、c=1.25 时 C=5，总容量 20 个分配槽，实际有 16 次路由；即使总容量够，热门专家仍可超过 5。溢出可丢弃、重路由或采用 dropless 调度，语义和通信不同。总专家参数约 E 倍，激活 FFN 计算约 k 倍，但全部权重仍要存储，all-to-all 和尾部负载可能主导延迟。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：模拟 top-2 MoE 路由",
      body: String.raw`MoE（Mixture of Experts）先由 router 给每个 token 的专家 logits，再选择少数专家。下面展示 top-2 分配；真实系统还要处理容量、跨设备 all-to-all 通信和反向梯度。

~~~python
import math

router_logits = [1.2, -0.4, 0.8, 0.1]  # 一个 token 对四个专家的分数
top_indices = sorted(range(4), key=lambda i: router_logits[i], reverse=True)[:2]
top_values = [router_logits[i] for i in top_indices]
weights = [math.exp(value) for value in top_values]
normalizer = sum(weights)
weights = [value / normalizer for value in weights]

expert_outputs = {
    0: [2.0, 0.0],
    2: [0.0, 4.0],
}
output = [
    sum(weight * expert_outputs[index][dimension]
        for index, weight in zip(top_indices, weights))
    for dimension in range(2)
]
print(top_indices, weights, output)
~~~

若 router 总把 token 发给少数专家，热门专家会溢出、其他专家得不到训练。辅助负载均衡损失、容量因子或无辅助损失的偏置更新可改善分配，但过强平衡也可能迫使语义不合适的路由。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：理论复杂度不等于端到端速度",
      body: String.raw`**误区一：RoPE 本身保证任意长度外推。** 它提供相对位置结构，但模型仍只在有限长度和频率范围训练。扩窗需插值、继续训练及 needle、困惑度和实际任务评估。

**误区二：MQA 总优于 MHA。** MQA 极省缓存，但强共享可能损失质量；GQA 是常见折中，最优 KV 头数依模型和服务负载而定。

**误区三：MoE 的总参数都参与每个 token 计算。** top-k 路由只激活少数专家，因此激活参数少于总参数；但模型权重仍需存储，跨卡通信也可能成为瓶颈。

**误区四：线性复杂度模型一定更快。** SSM 可能降低长序列渐近成本，但硬件 kernel、短序列常数、训练并行性和状态缓存都会影响实际速度。

**误区五：稀疏注意力天然不损失信息。** 稀疏选择必须保留任务所需的远程依赖；选择器训练、不可见 token 和检索错误都可能影响质量。

**误区六：所有新组件可独立替换。** MLA、RoPE、量化与并行实现可能共享投影假设。迁移 checkpoint 时 shape 和参数语义不兼容，通常需要专门转换或重新训练。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "成熟实践与活跃研究分层",
      body: String.raw`| 组件 | 主要收益 | 当前定位 | 关键验证 |
|---|---|---|---|
| RoPE | 相对位置结构 | 广泛成熟 | 上下文长度与频率设置 |
| RMSNorm | 稳定尺度、实现简洁 | 广泛成熟 | 精度与 kernel |
| SwiGLU | 更强 FFN 门控 | 广泛成熟 | 中间宽度与参数预算 |
| GQA | 缩小 KV Cache | 广泛成熟 | KV 头数与质量 |
| MoE | 扩总参数、控每 token FLOPs | 成熟但系统复杂 | 路由、容量、通信 |
| MLA | 压缩 KV 表示 | 已有大规模实证、生态较窄 | 训练配方与解码 kernel |
| Mamba/SSM | 线性序列扫描 | 活跃研究与混合应用 | 长程召回、硬件效率 |
| NSA/稀疏注意力 | 降低长上下文注意力量 | 活跃研究 | 稀疏选择质量与实现 |

ALiBi 把与距离成比例的头特定偏置加到注意力分数，不增加位置 embedding；实现简单，具有一定长度外推表现。YaRN 面向 RoPE 扩窗，通过频率缩放和幅度修正减轻插值问题。二者不是通用“升级关系”，而是不同位置方案。

选择应从瓶颈出发：显存受 KV 限制时优先看 GQA/MLA；训练参数规模受限而算力可控时看 MoE；超长序列注意力成为主成本时再评估 FlashAttention、稀疏注意力或混合 SSM。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：GQA、MLA、MoE 分别省什么",
      body: String.raw`**30 秒回答：**“GQA 让多组 query 共享较少的 K/V 头，主要压缩 KV Cache 和内存带宽；MLA 把键值信息压入低维潜变量，进一步改变缓存表示；MoE 则在 FFN 位置只激活少数专家，用稀疏计算扩大总参数。三者解决的不是同一个维度。”

若追问 RoPE：它对 Q/K 的二维通道施加随位置变化的旋转，使内积包含相对位移；它不直接作用 V，也不等于自动具备无限上下文。

若追问 MoE 参数与 FLOPs：总参数可很大，但每 token 只经过 top-k 专家，所以激活参数和 FLOPs 较小；代价包括路由不平衡、专家容量、跨设备通信和服务部署复杂度。写 top-1 辅助项 $\alpha E\sum_ef_eP_e$ 时必须声明 f 是离散负载且停梯度，P 是可微平均概率；它不是所有 MoE 共用的损失。

若追问 Mamba 与 Attention：Attention 显式比较当前位置和历史位置，易做内容寻址但标准成本二次增长；选择性 SSM 把历史压进递推状态，扫描成本近线性，但精确检索和通用生态需具体评估。

**白板加问。** 从 $r=\sqrt{\sum x_i^2/H+\epsilon}$ 推出 RMSNorm 的 $u/r-x(x^\top u)/(Hr^3)$，不要漏掉分母梯度。再把 GQA 的 $2N_{kv}D$ 与解耦 MLA 的 $d_c+d_R$ 放在同一每 token 每层口径比较；MLA 缓存更小不代表它在每种配置下小于 MQA。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：位置、归一化、缓存与路由",
      body: "每题至少写一个中间代数步骤，并指出适用边界。",
      questions: [
        {
          q: "证明 RoPE 内积只在位置因子上依赖 n-m。q=k=[1,0]，theta=pi/2，m=1,n=2 时内积是多少？",
          a: String.raw`$(R_mq)^\top R_nk=q^\top R_m^\top R_nk=q^\top R_{n-m}k$。例中旋转向量为 $[0,1]$ 与 $[-1,0]$，内积 0。内容 q/k 仍依赖文本；周期旋转不保证距离单调衰减或无限长度外推。**得分点：**转置变逆旋转；顺序给 n-m；保范数不代表保质量。`,
        },
        {
          q: "RMSNorm x=[1,2]、gamma=[1,1]、epsilon=0，上游 [1,0]，求输入梯度。若把分母 detach 会错在哪里？",
          a: String.raw`$r=\sqrt{5/2}$，$u=[1,0]$，$x^\top u=1$。$\nabla x=u/r-x/(2r^3)=[0.8/r,-0.4/r]\approx[0.505964,-0.252982]$，径向内积为 0。detach 会丢掉第二项并给 $[1/r,0]$，违反本例尺度不变性。**得分点：**对分母求导；gamma 梯度另为 $[1/r,0]$；epsilon 非零时径向梯度不必为零。`,
        },
        {
          q: "32 个 Q 头、每头 128 维，比较 MHA、8-KV GQA、MQA，以及 dc=512、dR=64 的解耦 MLA 每 token 每层缓存。",
          a: String.raw`普通方案为 $2N_{kv}D$，依次 8192、2048、256 元素；MLA 为 $d_c+d_R=576$ 元素。MLA 相对 MHA 压缩 $8192/576\approx14.22$ 倍，但此例并不小于 MQA。**得分点：**普通 K/V 双份，MLA 共享潜变量只存一份并加旋转 key；缓存减少不等于所有 FLOPs 同比例减少。`,
        },
        {
          q: "E=4 的 top-1 辅助损失中 f=[1,0,0,0]，P=[0.7,0.1,0.1,0.1]，alpha=0.01，求损失。top-1 gate 归一化成 1 是否还能从加权输出学习 router？",
          a: String.raw`$L_{aux}=0.01\times4\times0.7=0.028$；均匀 f/P 时为 0.01 而不是 0。固定 top-1 索引且权重恒为 1 时，主任务没有经混合权重到 router 的连续梯度；需保留 gate 幅值或其他学习机制。**得分点：**离散 f 停梯度、P 可微；不混用 top-1 与归一化 top-2 公式。`,
        },
      ],
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：先定位瓶颈，再选组件",
      body: "每题同时说明收益与代价。",
      questions: [
        {
          q: "32 个 query 头、8 个 KV 头的 GQA，相对同维 MHA 的每 token KV 元素数缩小多少？",
          a: "K/V 头数从 32 降到 8，因此缓存约缩小 4 倍；query 头仍为 32。",
        },
        {
          q: "RMSNorm 与 LayerNorm 的关键公式差异是什么？",
          a: "RMSNorm 只按均方根缩放，不减去特征均值；LayerNorm 同时中心化并按标准差缩放。",
        },
        {
          q: "为什么 MoE 的低激活 FLOPs 不等于部署简单？",
          a: "全部专家权重仍要存储，路由可能不均衡，专家跨设备时需要 all-to-all 通信，批量与容量管理也更复杂。",
        },
        {
          q: "何时不能仅凭 O(S) 与 O(S²) 断言 SSM 更快？",
          a: "短序列、kernel 不成熟、并行扫描开销或硬件利用率不同时，常数项和内存访问会主导，必须用目标硬件实测端到端吞吐与延迟。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "GLU Variants Improve Transformer",
      url: "https://arxiv.org/abs/2002.05202",
      evidence: "SwiGLU 组件论文；参数匹配为本章代数计算",
    },
    {
      label: "Switch Transformers",
      url: "https://arxiv.org/abs/2101.03961",
      evidence: "top-1 辅助负载均衡定义；非所有 MoE 的统一配方",
    },
    {
      label: "RoFormer",
      url: "https://arxiv.org/abs/2104.09864",
      evidence: "RoPE 原始论文",
    },
    {
      label: "Train Short, Test Long: ALiBi",
      url: "https://arxiv.org/abs/2108.12409",
      evidence: "原始论文",
    },
    {
      label: "YaRN",
      url: "https://arxiv.org/abs/2309.00071",
      evidence: "原始论文",
    },
    {
      label: "Root Mean Square Layer Normalization",
      url: "https://arxiv.org/abs/1910.07467",
      evidence: "原始论文",
    },
    {
      label: "GQA: Training Generalized Multi-Query Transformer Models",
      url: "https://arxiv.org/abs/2305.13245",
      evidence: "原始论文",
    },
    {
      label: "DeepSeek-V2",
      url: "https://arxiv.org/abs/2405.04434",
      evidence: "MLA 与 MoE 技术报告",
    },
    {
      label: "Mamba",
      url: "https://arxiv.org/abs/2312.00752",
      evidence: "选择性状态空间模型原始论文",
    },
    {
      label: "Native Sparse Attention",
      url: "https://arxiv.org/abs/2502.11089",
      evidence: "研究论文",
    },
  ],
};

export default chapter;
