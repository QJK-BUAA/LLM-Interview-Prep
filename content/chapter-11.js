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

若追问 FlashAttention：核心不是改变注意力公式，而是分块计算和在线 softmax，减少 HBM 读写及中间矩阵存储，所以既省显存又常提速。

若追问并行策略：模型单卡能放下时先数据并行；单层过大用张量并行；层数多可用流水线；状态过大用 FSDP/ZeRO。真实训练通常根据节点内外带宽组成 3D 并行。`,
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
