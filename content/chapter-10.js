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

它不像 LayerNorm 那样减去均值，保留重缩放不变性并减少部分计算。

SwiGLU 使用两条投影：

$$\operatorname{SwiGLU}(x)
=\operatorname{SiLU}(xW_g)\odot(xW_u),\qquad
y=\operatorname{SwiGLU}(x)W_d$$

$W_g$ 产生门，$W_u$ 产生内容，逐元素相乘后由 $W_d$ 压回隐藏维。为保持与普通 FFN 相近的参数量，其中间宽度通常不会直接照搬原来的 $4H$。`,
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

若追问 MoE 参数与 FLOPs：总参数可很大，但每 token 只经过 top-k 专家，所以激活参数和 FLOPs 较小；代价包括路由不平衡、专家容量、跨设备通信和服务部署复杂度。

若追问 Mamba 与 Attention：Attention 显式比较当前位置和历史位置，易做内容寻址但标准成本二次增长；选择性 SSM 把历史压进递推状态，扫描成本近线性，但精确检索和通用生态需具体评估。`,
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
