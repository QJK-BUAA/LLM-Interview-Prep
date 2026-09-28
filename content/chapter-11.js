const chapter = {
  id: "11",
  slug: "llm-memory-training-inference",
  part: "LLM 主线",
  title: "训练显存、并行与推理系统",
  subtitle: "算清参数、激活、KV Cache、吞吐和延迟",
  level: "进阶",
  duration: 150,
  prerequisites: ["06", "09", "10"],
  tags: ["Mixed Precision", "ZeRO", "FSDP", "FlashAttention", "KV Cache", "推理"],
  objectives: [
    "按字节估算训练参数状态与推理 KV Cache",
    "解释混合精度、梯度检查点和 ZeRO/FSDP 的节省来源",
    "区分数据、张量、流水线与序列并行",
    "分析 prefill、decode、吞吐、TTFT 与 TPOT",
  ],
  summary:
    "大模型系统优化的第一步是把显存和时间拆成可计算部件：训练主要受参数状态、激活和通信约束，生成主要受 KV Cache、内存带宽、批处理与调度约束。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：先算账，再讨论 kernel 和并行",
      body: String.raw`先修：第 06 章优化器状态，第 09 章 Attention 的矩阵计算，第 10 章 KV 布局。学习顺序是逐项显存与 ZeRO 分片 → FlashAttention 在线 softmax → prefill/decode 的计算和带宽 → 集合通信与流水线气泡。面试回答必须写单位、dtype、分片对象和峰值假设；“除以卡数”“线性显存”“更高吞吐”都不能替代完整账单。`,
      links: [
        { label: "显存与 ZeRO 分片", sectionId: "math-memory-zero", level: "必会" },
        { label: "FlashAttention 在线递推", sectionId: "math-flashattention-online", level: "推导" },
        { label: "Prefill/Decode 与 KV 带宽", sectionId: "math-prefill-decode", level: "推导" },
        { label: "通信与流水线气泡", sectionId: "math-parallel-communication", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：参数只是显存账单的一部分",
      body: String.raw`看到“70 亿参数”，不能直接用参数量判断能否训练。推理只需权重和运行时状态；全参数训练还要保存梯度、优化器一阶矩、二阶矩、可能的 fp32 主权重，以及等待反向使用的中间激活。激活又随 batch、序列长度、层数和隐藏宽度增长。

混合精度让大部分矩阵乘法使用 fp16 或 bf16，降低存储和提高 Tensor Core 吞吐，同时在必要位置保留 fp32 数值范围。梯度检查点不保存所有激活，反向时重算部分前向；ZeRO/FSDP 则把参数、梯度和优化器状态分片到多张卡。一个用计算换显存，一个用通信与编排换单卡显存。

推理有两个性质不同的阶段。prefill 一次处理完整提示词，矩阵规模大、并行度高，常更偏计算受限；decode 每步只产生一个新 token，却需要读取大量模型权重和历史 KV，常更偏内存带宽受限。优化首 token 延迟和优化每 token 延迟因此不是同一个问题。

系统指标也要分清：吞吐是单位时间完成的 token 或请求数；延迟是单个请求等待多久；TTFT 是首 token 时间；TPOT 是后续 token 间隔。动态批处理可以提高吞吐，却可能增加排队和尾延迟。

进入 RL 后还要检查训推一致性。rollout 引擎采样动作，trainer 重算动作概率，两边必须对应同一 token、前缀、采样设置和行为策略版本。TITO（Token-In-Token-Out）直接传递 token IDs，减少文本解码后重新分词引入的序列变化。异步 RL 把采样与更新解耦以减少等待，但会增加策略版本滞后；吞吐提高不代表有效样本数提高。第 28 章将展开 token 对齐、离散路由、确定性与过期样本控制。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：7B 训练状态与一条 KV Cache",
      body: String.raw`先估算 70 亿参数模型的 AdamW 全参数训练。假设每参数保存 bf16 权重 2 字节、bf16 梯度 2 字节、fp32 主权重 4 字节、两个 fp32 Adam 状态共 8 字节，总计约 16 字节：

$$7\times10^9\times16\text{ bytes}\approx112\text{ GB}$$

这还没算激活、临时 buffer、碎片和通信 bucket。不同框架可能不保存独立主权重，梯度 dtype 也可能不同，所以 16 bytes/parameter 是账目假设，不是固定常数。

再估算 GQA 模型的 KV Cache。设层数 $L=32$，batch $B=1$，已缓存序列 $S=4096$，KV 头数 $N_{kv}=8$，每头维度 $D=128$，bf16 每元素 2 字节。K 和 V 各一份：

$$M_{KV}=2LBSN_{kv}D\times2\text{ bytes}$$

$$=2\times32\times1\times4096\times8\times128\times2
=536{,}870{,}912\text{ bytes}\approx512\text{ MiB}$$

这只是一条请求。并发 100 条且都接近该长度时，缓存约 50 GiB，因此分页管理、连续批处理和 KV 量化会直接决定服务容量。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "训练与生成的两条资源路径",
      body: String.raw`训练路径从前向激活开始，随后反向产生梯度，优化器读取状态并更新权重。数据并行复制计算并同步梯度；FSDP/ZeRO 把状态分片，需要在计算边界聚合；张量并行把单个大矩阵切到多卡；流水线并行把层分段并用 micro-batch 填充。

生成路径先 prefill 提示词并写入每层 K/V，再循环执行 decode：读取当前 token、全部历史缓存和权重，生成 logits，采样下一个 token，追加新的 K/V。KV Cache 避免每一步重新计算旧 token，却以线性增长的显存换取速度。

优化时应先定位主瓶颈。显存不足、算力满载、显存带宽满载、卡间通信拥塞和请求调度空洞的解法不同。只看 GPU utilization 一个百分比通常不足以判断。`,
      diagram: {
        kind: "flow",
        nodes: [
          "训练前向与激活",
          "反向与梯度",
          "分片/通信/更新",
          "推理 Prefill",
          "写入 KV Cache",
          "循环 Decode",
        ],
        links: [
          [0, 1],
          [1, 2],
          [3, 4],
          [4, 5],
          [5, 4],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "显存公式、并行通信与注意力复杂度",
      body: String.raw`设参数量为 $P$，每类状态每参数字节数分别为 $b_w,b_g,b_m,b_v,b_{\text{master}}$。不分片时，仅模型状态近似：

$$M_{\text{state}}=P(b_w+b_g+b_m+b_v+b_{\text{master}})$$

训练总显存还包括激活 $M_{\text{act}}$、临时工作区 $M_{\text{temp}}$ 和碎片：

$$M_{\text{total}}\approx M_{\text{state}}+M_{\text{act}}+M_{\text{temp}}$$

ZeRO-1 主要分片优化器状态，ZeRO-2 再分片梯度，ZeRO-3/FSDP 还分片参数。理想均分到 $G$ 张卡时，对应部分接近除以 $G$，但 all-gather、reduce-scatter 缓冲和短暂峰值不能忽略。

标准注意力要形成 $S\times S$ 分数，算术复杂度约 $O(BNS^2D)$，朴素实现还把中间矩阵写回显存。FlashAttention 使用分块和在线 softmax，在片上 SRAM 中处理小块，避免物化完整分数矩阵到高带宽显存；它计算的是精确注意力，不是稀疏近似。

数据并行每卡处理不同样本并同步梯度，适合模型单卡可放下；张量并行切分层内矩阵，每层都有通信；流水线并行按层分段，通信频率较低但存在气泡；序列并行沿 token 轴分摊部分激活。实际大训练常组合多维并行。`,
    },
    {
      id: "math-memory-zero",
      type: "derivation",
      title: "训练显存账单：ZeRO 各阶段究竟除哪一项",
      body: String.raw`**先固定实现假设。** P 个参数，每参数 bf16 权重 2B、bf16 梯度 2B、fp32 主副本 4B、Adam m/v 共 8B，模型状态共 16P 字节。将主副本计入优化器侧状态，G 卡等量分片、忽略临时聚合和对齐时，每卡：

$$M_0=16P,\quad M_1=4P+\frac{12P}{G},\quad
M_2=2P+\frac{14P}{G},\quad M_3=\frac{16P}{G}.$$

ZeRO-1 只分片优化器及主副本；ZeRO-2 再分片梯度；ZeRO-3 再分片低精度参数。若框架保留 fp32 梯度或不保存主副本，应从字节表重算，不是把 16 当物理常数。

**数值例。** $P=7\times10^9,G=8$，上述状态分别为 112、38.5、26.25、14 十进制 GB。ZeRO-3 的 14 GB 不是总峰值：层/flat buffer all-gather、reduce-scatter、预取和参数重建会临时增加占用。

**激活不能漏算。** 一份 bf16 的稠密 attention 概率张量占 $2BNS^2$ 字节。$B=1,N=32,S=4096$ 时单层仅此张量就为 $1,073,741,824$ 字节，即 1 GiB。同例 H=4096 的 Q/K/V 共 $3BSH\times2=96$ MiB，此外还有输出、FFN 中间量、norm 状态及反向保存。FlashAttention 可去掉完整概率张量，不能去掉所有 $BSH$ 激活。

最终账单应为状态+保存激活+临时算子/通信空间+分配器碎片，报告 allocated 与 reserved 的口径。checkpointing 减少保存激活但增加重算；梯度累积降低单次 micro-batch 激活，却不会按累积步数压缩常驻参数。**追问：**两个配置 state bytes 相同，仍可因最长序列、预取深度和通信重叠产生不同峰值。`,
    },
    {
      id: "math-flashattention-online",
      type: "derivation",
      title: "FlashAttention：在线 Softmax 的精确递推与内存",
      body: String.raw`**一行的目标。** 给一条 query 与 n 个键的分数 $s_j=q^\top k_j/\sqrt d$ 和 value $v_j\in\mathbb R^{d_v}$，目标是 $o=\sum_je^{s_j}v_j/\sum_je^{s_j}$。不把全部分数存入 HBM，而逐块维护最大值 m、缩放分母 $\ell$、未归一化分子 $u\in\mathbb R^{d_v}$：

$$m=\max_{\text{已处理 }j}s_j,\quad
\ell=\sum_{\text{已处理 }j}e^{s_j-m},\quad
u=\sum_{\text{已处理 }j}e^{s_j-m}v_j.$$

新块 $\mathcal B$ 到来，先把旧统计换到新的指数基准：

$$m'=\max(m,\max_{j\in\mathcal B}s_j),\quad a=e^{m-m'},$$

$$\ell'=a\ell+\sum_{j\in\mathcal B}e^{s_j-m'},\quad
u'=au+\sum_{j\in\mathcal B}e^{s_j-m'}v_j,\qquad o=u/\ell.$$

等式来自 $e^{s_j-m'}=e^{s_j-m}e^{m-m'}$，因此每块后都保持同一个不变量，不是近似截断注意力。第一块令旧项系数为 0；空块跳过。全屏蔽行需显式零行/无效行约定，不能直接算 $-\infty-(-\infty)$。

**两块手算。** 第一块分数 $[\log2,0]$、标量 values $[2,4]$，得到 $m=\log2,\ell=1.5,u=4$。第二块分数 $\log3$、value=10，$m'=\log3,a=2/3$，所以 $\ell'=2,u'=38/3$，最终 $o=19/3\approx6.333333$。直接计算 $(2\times2+1\times4+3\times10)/(2+1+3)$ 相同。只更新分母却忘记把旧分子乘 a，会得到错误输出。

**从一行到 tile。** 在 SRAM 中保留一块 Q 和输出累积，流过 K/V tile，分数临时块为 $B_q\times B_k$，最终把输出与每行 log-sum-exp 写回 HBM。Q/K/V/O 与行统计的存储随 S 线性增长，不再物化 $BNS^2$ 的分数/概率矩阵；tile 暂存受片上空间约束。反向用保存的行统计和 Q/K 重新计算局部概率，再用第 09 章的同一梯度式。

**边界与追问。** 稠密精确 Attention 的算术量仍为 $O(BNS^2d)$，改变的是 IO 和中间保存；浮点加法顺序不同，等价不是 bitwise 相同。dropout 反向还要重建同一随机 mask。不能因注意力中间显存近线性，就宣称整个训练只需 O(S) 总资源或吞吐一定提升固定倍数。`,
    },
    {
      id: "math-prefill-decode",
      type: "derivation",
      title: "Prefill 与 Decode：计算量、缓存读取和延迟下界",
      body: String.raw`**固定口径。** L 层、隐藏维 H、标准普通 FFN 宽度 4H，忽略词表头和逐元素算子。长度 S、batch B 的稠密 prefill 约 $L(24BSH^2+4BS^2H)$ FLOPs；因果优化可减少注意力三角部分。带 KV Cache 的单步 decode 仅对新 token 做投影和 FFN，注意力读 S 个历史位置，约：

$$F_{\rm decode}\approx L(24BH^2+4BSH).$$

旧 K/V 不重算，但每个新 query 仍要读历史缓存；连续生成 T 步时注意力成本包含 $\sum_{t=0}^{T-1}(S+t)=TS+T(T-1)/2$，不是与上下文无关的常数。

**带宽账单。** 缓存字节 $M_{KV}=2LBSN_{kv}Db$。第一个例子的 L=32、B=1、S=4096、KV 头 8、D=128、bf16 给 512 MiB。理想无重复读取时，一次 decode 扫描这份 KV 也要搬运约这个量级。权重常驻容量为 $Pb_w$，batch 内一次读取可服务多个 token，所以增大 batch 能摊薄每 token 权重带宽。

粗略 roofline 下界：

$$t\ge\max(F/\mathcal C,\ M_{\rm moved}/\mathcal B),$$

$\mathcal C$ 是有效算力、$\mathcal B$ 是有效带宽，实际还含通信、kernel 启动和调度。教学例 P=7B、权重 bf16 14 GB、KV=0.536870912 GB，假定每步各读一次、带宽 1000 GB/s，则内存项下界约 14.5369 ms；这不是任何 GPU 的实测延迟，也没有计词表、临时访问或并行通信。

**延迟指标。** 一条请求生成 T 个 token，理想平均总时长近似 $\operatorname{TTFT}+(T-1)\operatorname{TPOT}$，TTFT 还含排队与 prefill。B 增大可能提高 tokens/s，却增加排队及 KV 容量；只有在目标尾延迟 SLO 下比较吞吐才有服务意义。`,
    },
    {
      id: "math-parallel-communication",
      type: "derivation",
      title: "并行：Ring 通信量、张量切分与流水线气泡",
      body: String.raw`**数据并行通信。** G 卡同步一份 V 字节梯度，ring all-reduce 可分为 reduce-scatter 与 all-gather。每阶段 G-1 步，每步每卡发送 V/G 字节，所以每卡发送量：

$$V_{\rm send}=2\frac{G-1}{G}V,\qquad
t_{\rm ring}\approx2(G-1)\alpha+
\frac{2(G-1)V}{G\mathcal B}.$$

$\alpha$ 是每跳启动延迟、$\mathcal B$ 是有效链路带宽；同量接收不要在全双工模型中再次机械翻倍。G=8、V=1 GiB 时发送 1.75 GiB，带宽 50 GiB/s、$\alpha=5\,\mu s$ 时约 35.07 ms。梯度 bucket 与计算重叠可隐藏一部分通信，但最后尾部和小消息延迟仍在。

**张量并行为何层层通信。** 对 $Y=XW$，若沿 W 输出列切分，卡上得到输出特征切片；若下一矩阵沿输入行切分，各卡产生部分和，必须 all-reduce/reduce-scatter 合并。以 FFN 为例，第一层列切分、局部激活、第二层行切分可把通信放在特定边界，而不是每次乘法都聚合完整矩阵。序列并行可让 norm/dropout 等逐 token 操作的激活分片，但不自动消除全局 Attention 所需的跨分片信息。

**流水线气泡。** p 个等速 stage、m 个 micro-batch，非交错 fill-drain 调度、无通信且前后向各 stage 成本均匀时，有效时间比例为：

$$U=\frac{m}{m+p-1},\qquad
\operatorname{bubble}=\frac{p-1}{m+p-1}.$$

p=4、m=8 时 $U=8/11\approx72.73\%$，气泡约 27.27%；m=32 时 $U=32/35\approx91.43\%$。更多 micro-batch 能摊薄填充排空，却影响激活寿命、global batch 和调度；1F1B/交错流水的峰值与气泡应按具体 schedule 重算，不能通用套用。

**追问。** 专家并行主要增加 token dispatch/combine 的 all-to-all，热点专家会形成尾部等待。并行维度与网络拓扑要一起设计，理论通信量相同不代表跨节点与 NVLink 域内延迟相同。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：做一张显存预算表",
      body: String.raw`下面的函数把假设写成参数，避免背诵“某模型需要多少卡”。先算理论下限，再给激活、临时空间和碎片留余量。

~~~python
def gib(byte_count):
    return byte_count / 1024 ** 3

def training_state_bytes(parameters, shards=1):
    bytes_per_parameter = {
        "bf16_weight": 2,
        "bf16_gradient": 2,
        "fp32_master_weight": 4,
        "fp32_adam_m": 4,
        "fp32_adam_v": 4,
    }
    total = parameters * sum(bytes_per_parameter.values())
    return total / shards

def kv_cache_bytes(layers, batch, sequence, kv_heads, head_dim, bytes_per_value=2):
    return 2 * layers * batch * sequence * kv_heads * head_dim * bytes_per_value

print("7B states, no sharding:", gib(training_state_bytes(7e9)), "GiB")
print("7B states, 8-way ideal shard:", gib(training_state_bytes(7e9, 8)), "GiB")
print("KV cache:", gib(kv_cache_bytes(32, 1, 4096, 8, 128)), "GiB")
~~~

估算后要用 profiler 校正。框架 allocator 会保留缓存，算子有临时 workspace，长序列激活可能超过参数状态，分片通信也会出现瞬时全量参数。报告峰值时注明是否包含 CUDA context、是否在稳态 batch、是否开启 checkpointing。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：省显存、提吞吐和降延迟不是同一目标",
      body: String.raw`**误区一：bf16 与 fp16 完全相同。** 二者都是 16 位，但 bf16 指数位更多、范围接近 fp32，通常更不易溢出；fp16 尾数更多但范围更窄，训练常需 loss scaling。

**误区二：梯度累积等于更大真实 batch。** 在无 BatchNorm 等跨样本状态且优化细节一致时可接近，但更新频率、随机性、学习率调度和分布式通信时机会变化。

**误区三：ZeRO-3 把总内存成本消失了。** 它把状态分布到设备，并以 all-gather/reduce-scatter 和更复杂调度为代价；跨慢速网络时可能通信受限。

**误区四：FlashAttention 是近似注意力。** 它改变 IO 调度并保持数学结果等价，数值舍入可能略有不同，但没有主动丢弃连接。

**误区五：有 KV Cache 后每步计算与上下文长度无关。** 旧 token 的 K/V 不重算，但新 query 仍要与全部缓存键计算并读取 value，单步注意力与缓存长度近似线性增长。

**误区六：吞吐最高的 batch 就是最佳线上配置。** 大 batch 可能增加排队、TTFT 和尾延迟。服务应在目标 SLO 下最大化有效吞吐，而非只看离线 tokens/s。

**误区七：同一 checkpoint 就保证训练和推理概率一致。** 精度、batch 形状、MoE 路由与稀疏注意力选择都可能影响概率。应对固定序列做逐 token 对齐和 log-prob 差值检查，再检查异步策略版本；一个确定性实现的名称不能替代在实际硬件上的验证。GLM-5 报告的 DSA top-k 修复属于特定实现经验。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "并行与省显存技术如何选择",
      body: String.raw`| 技术 | 切分或交换对象 | 主要收益 | 主要代价 |
|---|---|---|---|
| Gradient checkpointing | 中间激活 | 降激活显存 | 反向重算前向 |
| ZeRO/FSDP | 优化器、梯度、参数 | 降单卡模型状态 | 集合通信与峰值管理 |
| Data parallel | batch | 提吞吐、实现成熟 | 每卡仍需模型，梯度同步 |
| Tensor parallel | 层内矩阵/头 | 单层跨卡 | 高频通信、算子耦合 |
| Pipeline parallel | 层 | 容纳更深模型 | 流水气泡与调度 |
| Sequence parallel | 序列/激活 | 降长序列激活 | 额外通信和布局限制 |
| CPU/NVMe offload | 状态存储位置 | 极限省 GPU 显存 | 传输延迟显著 |

推理侧还有不同工具：continuous batching 动态把新请求加入批次；paged KV 把非连续缓存映射为逻辑连续块，降低碎片；speculative decoding 用小模型草拟、多 token 验证减少大模型串行步数；量化降低权重或 KV 的字节数。它们作用部位不同，可以组合，但必须检查质量和尾延迟。

硬件拓扑决定并行上限。NVLink 域内张量并行通常比跨节点更合适；跨节点常优先数据或流水线并行。最佳配置需要模型 shape、网络带宽和真实序列分布共同决定。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：训练显存怎么估算",
      body: String.raw`**30 秒回答：**“先按参数量乘每参数字节，分别列权重、梯度、fp32 主副本和 Adam 一二阶矩；再加随 batch、序列和层数增长的激活、临时 workspace 与碎片。之后说明 checkpointing 用重算省激活，ZeRO/FSDP 按阶段分片优化器、梯度和参数，理论除卡数外还要预留通信峰值。”

若追问 prefill 与 decode：prefill 对整段 prompt 做高并行矩阵计算并建立 KV，决定 TTFT 的重要部分；decode 每步生成一个 token，重复读权重和历史 KV，常受内存带宽限制并决定 TPOT。

若追问 FlashAttention：维护每行最大值 m、分母 $\ell$ 与分子 u。新块提高最大值后，旧分子和分母都乘 $e^{m-m'}$ 再加入新块。这样保持精确注意力的不变量并避免完整概率矩阵写回 HBM；没有把稠密注意力的二次算术量变成线性。

若追问并行策略：模型单卡能放下时先数据并行；单层过大用张量并行；层数多可用流水线；状态过大用 FSDP/ZeRO。真实训练通常根据节点内外带宽组成 3D 并行。

**白板加问。** 在本章 16B/参数假设下，写出 ZeRO-1 的 $4P+12P/G$、ZeRO-2 的 $2P+14P/G$、ZeRO-3 的 $16P/G$，再补激活和临时峰值。随后用 ring 的 $2(G-1)V/G$ 发送量估通信下界，并说明更高 tokens/s 可能仍违反 TTFT/TPOT 的尾延迟要求。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：在线归一化、显存与通信",
      body: "写清 GB/GiB、常驻/峰值和调度假设后再计算。",
      questions: [
        {
          q: "在线 softmax 先处理 scores=[log2,0]、values=[2,4]，再处理 score=log3、value=10，求 m、分母、分子和最终输出。",
          a: String.raw`首块 $m=\log2,\ell=1+1/2=1.5,u=2+4/2=4$。第二块改基准到 $\log3$，旧项乘 $a=2/3$，得 $\ell'=1.5(2/3)+1=2$，$u'=4(2/3)+10=38/3$，输出 $19/3$。**得分点：**新最大值触发旧分子/分母同时缩放；保持与全量 softmax 一致的不变量；全 mask 行另处理。`,
        },
        {
          q: "7B 参数、8 卡，每参数权重/梯度各 2B、主副本 4B、Adam 状态 8B，求 ZeRO-1/2/3 每卡状态，并说明为何不是峰值。",
          a: String.raw`将主副本计入优化器侧，ZeRO-1 为 $4P+12P/8=38.5$ GB；ZeRO-2 为 $2P+14P/8=26.25$ GB；ZeRO-3 为 $16P/8=14$ GB。激活、workspace、通信 bucket、all-gather/预取峰值与碎片另计。**得分点：**逐类分片而非所有阶段都除 8；十进制 GB；区分理想常驻状态与真实峰值。`,
        },
        {
          q: "8 卡 ring all-reduce 同步 1 GiB 梯度，每跳 5 微秒，有效带宽 50 GiB/s；4-stage/8-microbatch 的理想流水利用率是多少？",
          a: String.raw`每卡发送 $2(7/8)\times1=1.75$ GiB，通信约 $14\times5\,\mu s+1.75/50\,s=35.07$ ms。均匀 fill-drain 的利用率 $8/(8+4-1)=8/11=72.73\%$。**得分点：**明确发送量与双工假设；链路有效带宽；气泡公式不是所有 pipeline 调度的无条件定律。`,
        },
        {
          q: "有 FlashAttention 和 KV Cache 后，长上下文 decode 是否已变为与长度无关？",
          a: String.raw`没有。FlashAttention 不物化完整概率矩阵，但仍计算可见 QK/AV；decode 的单个新 query 读取 S 个键值，注意力项为 $O(SH)$，KV 容量为 $2LBSN_{kv}Db$。生成 T 步累积可见长度为 $TS+T(T-1)/2$。**得分点：**区分 prefill 的平方算术量、decode 的单步线性量与训练中间显存；KV 避免重算旧投影而非免读旧信息。`,
        },
      ],
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：把系统问题变成数字",
      body: "明确单位使用 GB 还是 GiB，并写出所有假设。",
      questions: [
        {
          q: "10 亿参数仅以 bf16 存权重，理论下限约多少十进制 GB？",
          a: "每参数 2 字节，共 2×10^9 字节，约 2 GB；尚未包括运行时状态、缓存和碎片。",
        },
        {
          q: "梯度检查点为什么省显存却增加计算？",
          a: "前向只保留部分边界激活，反向需要的中间结果被丢弃后必须重新执行对应前向计算。",
        },
        {
          q: "KV Cache 为什么让生成更快，又为什么限制并发？",
          a: "它避免重复计算历史 token 的 K/V，但缓存随层数、并发和序列长度线性增长，会占用大量设备内存。",
        },
        {
          q: "优化 tokens/s 后 TTFT 变差，是否矛盾？",
          a: "不矛盾。更大的动态 batch 可提高整体吞吐，却让单请求等待更久；吞吐与延迟是不同目标。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Mixed Precision Training",
      url: "https://arxiv.org/abs/1710.03740",
      evidence: "原始论文",
    },
    {
      label: "ZeRO",
      url: "https://arxiv.org/abs/1910.02054",
      evidence: "原始论文",
    },
    {
      label: "PyTorch Fully Sharded Data Parallel",
      url: "https://pytorch.org/docs/stable/fsdp.html",
      evidence: "官方文档",
    },
    {
      label: "FlashAttention",
      url: "https://arxiv.org/abs/2205.14135",
      evidence: "原始论文",
    },
    {
      label: "vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention",
      url: "https://arxiv.org/abs/2309.06180",
      evidence: "系统论文",
    },
  ],
};

export default chapter;
