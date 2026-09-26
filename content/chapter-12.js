const chapter = {
  id: "12",
  slug: "lora-qlora-peft",
  part: "LLM 主线",
  title: "LoRA、QLoRA 与参数高效微调",
  subtitle: "用低秩增量适配大模型",
  level: "进阶",
  duration: 120,
  prerequisites: ["02", "06", "11"],
  tags: ["LoRA", "QLoRA", "NF4", "DoRA", "AdaLoRA", "PEFT"],
  objectives: [
    "从矩阵秩解释 LoRA 的参数节省",
    "计算 rank、alpha 与目标模块对应的参数量",
    "说明 QLoRA 的 NF4、双重量化与分页优化器",
    "根据显存、部署和任务差异选择 PEFT 方案",
  ],
  summary:
    "LoRA 冻结基座权重，只训练两个低秩矩阵表示任务增量；QLoRA 再把基座量化到 4 bit 以降低微调显存，而秩、缩放、目标模块与数据质量共同决定效果。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：不重写整本书，只贴一组可训练批注",
      body: String.raw`全参数微调会为基座模型的每个权重计算梯度并保存优化器状态，成本很高。LoRA（Low-Rank Adaptation）假设下游任务所需的权重变化主要位于低维子空间，因此冻结原权重 $W$，只学习增量 $\Delta W=BA$。

若原矩阵大小为 $d_{out}\times d_{in}$，完整增量需要 $d_{out}d_{in}$ 个参数；LoRA 使用 $A\in\mathbb{R}^{r\times d_{in}}$ 与 $B\in\mathbb{R}^{d_{out}\times r}$，只需 $r(d_{in}+d_{out})$。当秩 $r$ 远小于输入输出维时，训练参数和对应优化器状态显著减少。

LoRA 省的是可训练参数相关内存，并不自动消除基座权重和前向激活。QLoRA 把冻结基座以 4-bit 形式保存，计算时按块反量化到 bf16 等计算 dtype，再让梯度通过量化权重流向 LoRA 参数；基座量化码本本身不更新。

适配器像一层可插拔增量：可以为多个任务保存不同小文件，也可在部署前把增量合并进浮点基座。它不是免费能力压缩。rank 太小、目标层太少或数据与任务差异太大时，低秩约束会限制性能。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：一个 4×4 权重只训练 8 个数",
      body: String.raw`设冻结权重 $W\in\mathbb{R}^{4\times4}$，输入列向量 $x\in\mathbb{R}^{4}$。完整微调要训练 16 个权重。取 LoRA rank $r=1$：

$$A=[1,-1,0,2]\in\mathbb{R}^{1\times4}$$

$$B=[0.5,0,-0.5,1]^\top\in\mathbb{R}^{4\times1}$$

低秩增量为外积 $BA$，虽然 shape 仍是 $4\times4$，但只由 $A$ 和 $B$ 共 8 个数决定。对输入 $x=[1,2,0,-1]^\top$：

$$Ax=1-2+0-2=-3$$

$$BAx=B(-3)=[-1.5,0,1.5,-3]^\top$$

前向输出写为：

$$y=Wx+\frac{\alpha}{r}BAx$$

若 $\alpha=2,r=1$，LoRA 分支贡献变成 $[-3,0,3,-6]^\top$。真实训练通常把 A 随机初始化、B 初始化为零，使初始 $\Delta W=0$，模型一开始与基座完全一致，同时 A 的非零值让 B 能在第一步获得梯度。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "冻结基座与可训练旁路",
      body: String.raw`输入同时经过冻结的主矩阵 $W$ 和低秩旁路 A→B，两路输出相加。反向传播需要穿过 W 来计算输入梯度，但 W 本身不保存可训练梯度或 Adam 状态；A、B 才由优化器更新。

QLoRA 把主矩阵替换为分块 4-bit 存储。前向时小块反量化参与矩阵乘法，LoRA 分支通常保持 bf16/fp32 可训练精度。NF4 是针对近似正态分布权重设计的 4-bit 数据类型；double quantization 再量化每个块的量化尺度，进一步减少元数据；paged optimizer 使用统一内存机制缓解偶发显存峰值。

保存 checkpoint 时应明确只保存 adapter 还是合并模型。adapter 文件依赖准确的基座模型版本、tokenizer 和目标模块命名；少一个版本信息就可能无法复现。`,
      diagram: {
        kind: "flow",
        nodes: [
          "输入 x",
          "冻结 W 或 4-bit W",
          "可训练 A: 降维",
          "可训练 B: 升维",
          "缩放并相加",
          "输出 y",
        ],
        links: [
          [0, 1],
          [0, 2],
          [2, 3],
          [1, 4],
          [3, 4],
          [4, 5],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "参数量、缩放与合并",
      body: String.raw`原线性层使用 $W\in\mathbb{R}^{d_{out}\times d_{in}}$：

$$h=Wx$$

LoRA 前向为：

$$h=Wx+sBAx,\qquad
A\in\mathbb{R}^{r\times d_{in}},\quad
B\in\mathbb{R}^{d_{out}\times r}$$

经典缩放 $s=\alpha/r$。LoRA 参数比例为：

$$\rho=
\frac{r(d_{in}+d_{out})}{d_{in}d_{out}}$$

若 $d_{in}=d_{out}=4096,r=16$，完整矩阵有 16,777,216 个参数，LoRA 有 $16(4096+4096)=131,072$ 个，只占约 0.78125%。但若同时适配 Q、K、V、O 和 FFN 多个矩阵，应逐层求和，不能只报一个矩阵比例。

推理前可合并：

$$W'=W+sBA$$

之后前向仍是 $W'x$，没有额外旁路延迟。多个 adapter 动态切换时通常保持未合并，服务需要管理额外矩阵乘法和批内 adapter 分组。

rsLoRA（rank-stabilized LoRA）使用与 $\alpha/\sqrt r$ 相关的缩放，使提高 rank 时更新幅度不至于按 $1/r$ 过快减小。它改变的是缩放规律，不是把矩阵从低秩变成满秩。rank、alpha 和学习率相互作用，比较实验时必须同时报告。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：手写 LoRA 线性层",
      body: String.raw`下面使用接近 NumPy/PyTorch 的伪代码。dropout 只作用于 LoRA 输入，推理时关闭。基座参数 requires_grad=False，但计算图仍允许梯度传向更早的可训练模块。

~~~python
class LoRALinear:
    def __init__(self, base_weight, rank, alpha, dropout):
        self.weight = freeze(base_weight)               # [out, in]
        self.A = random_normal(rank, base_weight.in_dim) # [r, in]
        self.B = zeros(base_weight.out_dim, rank)        # [out, r]
        self.scale = alpha / rank
        self.dropout = dropout

    def forward(self, x, training=True):
        base = x @ transpose(self.weight)
        adapter_input = self.dropout(x) if training else x
        delta = (adapter_input @ transpose(self.A)) @ transpose(self.B)
        return base + self.scale * delta

    def merged_weight(self):
        return self.weight + self.scale * (self.B @ self.A)
~~~

训练前应打印所有可训练参数，确认只有预期 adapter、必要 bias 或分类头开放。训练后还要验证合并前后在 eval 模式下输出接近，避免 dropout、dtype 或转置约定导致部署偏差。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：PEFT 不会自动修复数据和目标",
      body: String.raw`**误区一：LoRA rank 越高越好。** 更高 rank 增加容量、显存和过拟合风险；若数据少或任务接近基座，较小 rank 可能足够。应看验证集和多个种子。

**误区二：QLoRA 把所有训练量都变成 4 bit。** 冻结基座按 4 bit 存储，但矩阵乘法常在 bf16 中进行，LoRA 权重、梯度和优化器状态也不是 4 bit。

**误区三：NF4 等于普通均匀 int4。** NF4 的量化点针对近似正态权重分布设计，通常按块缩放；实现、block size 和计算 dtype 都影响误差。

**误区四：只适配 q_proj 总是足够。** 注意力输出、K/V 和 FFN 也可能承载任务变化。目标模块应结合任务差异、预算和消融选择。

**误区五：adapter 可以搭配任意同名模型。** 行索引、层命名和权重版本必须一致。即使架构相同，基座 revision 不同也会改变增量语义。

**误区六：合并 4-bit 基座后仍精确保持 4 bit。** 通常要先反量化或在更高精度中形成 $W+\Delta W$，再重新量化；二次量化会产生新误差，应重新评估。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "LoRA 家族与训练方案选择",
      body: String.raw`| 方法 | 核心变化 | 优势 | 更适合 |
|---|---|---|---|
| Full fine-tuning | 更新全部参数 | 容量最大 | 数据和算力充足、域差异大 |
| LoRA | 固定 rank 低秩增量 | 简单、易保存和合并 | 常规指令/领域微调 |
| QLoRA | 4-bit 冻结基座 + LoRA | 单卡显存显著下降 | 显存受限微调 |
| AdaLoRA | 按重要性动态分配秩预算 | 容量分配更灵活 | 各层需求差异明显 |
| DoRA | 分解权重方向与幅值 | 低 rank 下可能更接近全调 | 可接受额外复杂度 |
| rsLoRA | 调整高 rank 缩放 | rank 增大时更稳定 | 需要较高秩的任务 |
| Prefix/Prompt tuning | 训练虚拟 token/前缀 | 参数极少 | 模型足够大、任务较接近 |

选择顺序可以很务实：先确认基座本身具备目标能力；显存足够且追求最大适应能力时考虑全参；需要多租户 adapter 或快速迭代时用 LoRA；单卡放不下可训练基座时用 QLoRA；只有固定 rank 表现不足且消融支持时，再引入 AdaLoRA、DoRA 等复杂方案。

QLoRA 的优势主要在训练内存，不保证训练时间同比缩短。量化与反量化 kernel、CPU offload、序列长度和数据管线都可能成为新瓶颈。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：LoRA 为什么能省参数",
      body: String.raw`**30 秒回答：**“LoRA 冻结原矩阵 $W$，把任务增量限制为 $BA$，其中秩 $r$ 远小于输入输出维。完整增量要 $d_{out}d_{in}$ 个参数，LoRA 只要 $r(d_{in}+d_{out})$。前向把缩放后的 $BAx$ 加到 $Wx$，部署时还能合并为新权重。”

若追问初始化：常用 A 随机、B 为零，使初始增量为零，不改变基座输出；同时 A 非零使 B 第一轮能得到有效梯度。若 A、B 都为零，两者最初都可能没有可用梯度。

若追问 QLoRA 三个关键词：NF4 为正态分布权重设计 4-bit 表示；double quantization 继续压缩量化常数；paged optimizer 利用统一内存处理显存峰值。核心训练仍是冻结量化基座并更新 LoRA。

若追问 alpha 与 rank：经典 LoRA 用 $\alpha/r$ 缩放。不能脱离学习率和目标模块单独比较 rank；rsLoRA 改用近似 $\alpha/\sqrt r$ 以改善高 rank 稳定性。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：低秩不是低要求",
      body: "回答时给出参数量、精度和部署三个层面的影响。",
      questions: [
        {
          q: "4096×4096 线性层使用 rank 8 的 LoRA，需要多少可训练矩阵参数？",
          a: "A 为 8×4096，B 为 4096×8，共 65,536 个参数；未计 bias。",
        },
        {
          q: "为什么常把 B 初始化为零而 A 随机初始化？",
          a: "这样初始 BA 为零，模型输出与基座一致；A 已非零，使损失可在第一步给 B 产生梯度。",
        },
        {
          q: "QLoRA 中哪些对象通常不是 4 bit？",
          a: "LoRA 可训练权重、其梯度和优化器状态通常保持更高精度，计算也常在 bf16；4 bit 主要用于冻结基座的存储。",
        },
        {
          q: "什么时候更应选择全参数微调而不是 LoRA？",
          a: "当任务与基座差异大、数据和算力充足、需要最大容量且不在意多 adapter 存储时；仍需用受控实验验证收益是否值得成本。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "LoRA",
      url: "https://arxiv.org/abs/2106.09685",
      evidence: "原始论文",
    },
    {
      label: "QLoRA",
      url: "https://arxiv.org/abs/2305.14314",
      evidence: "原始论文",
    },
    {
      label: "AdaLoRA",
      url: "https://arxiv.org/abs/2303.10512",
      evidence: "原始论文",
    },
    {
      label: "DoRA",
      url: "https://arxiv.org/abs/2402.09353",
      evidence: "原始论文",
    },
    {
      label: "Hugging Face PEFT LoRA documentation",
      url: "https://huggingface.co/docs/peft/main/en/package_reference/lora",
      evidence: "官方实现文档",
    },
  ],
};

export default chapter;
