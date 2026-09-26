const chapter = {
  id: "01",
  slug: "python-tensors-shapes",
  part: "数学与机器学习地基",
  title: "Python、张量与 Shape",
  subtitle: "先学会读懂数据的形状",
  level: "入门",
  duration: 55,
  prerequisites: ["00"],
  tags: ["Python", "Tensor", "Shape", "Broadcast"],
  objectives: [
    "区分标量、向量、矩阵和高阶张量",
    "从代码和模型描述中追踪每个轴的含义",
    "判断逐元素乘法、矩阵乘法和广播是否合法",
    "读懂常见批次、序列和隐藏维度记号",
  ],
  summary:
    "张量只是带多个轴的数字容器；读模型代码时先给每个轴贴上语义标签，再检查运算规则，绝大多数 shape 问题都会变得具体。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：张量是有方向的数字盒子",
      body: String.raw`标量是一个数字，例如温度 23；向量是一排数字，例如一个学生的三科成绩；矩阵是行列构成的表，例如一个班所有学生的成绩；张量是对这些结构的统一称呼。二维以上并不神秘，只是需要更多轴描述位置。

在机器学习中，shape 比变量名更可靠。看到形状 $[B,S,H]$，先写下：$B$ 是 batch 中样本数，$S$ 是每条序列的 token 数，$H$ 是每个 token 的隐藏维度。一个位置 $(b,s,h)$ 就对应“第 b 个样本、第 s 个 token、第 h 个特征”。

轴的顺序不是宇宙定律，而是接口约定。有的库使用 $[B,S,H]$，有的算子临时换成 $[B,N,S,D]$，其中 $N$ 是注意力头数、$D=H/N$。只要记住每次 reshape、transpose 前后的轴语义，就不会靠猜。

Python 列表可以存数字，但机器学习框架里的 tensor 还提供统一数据类型、设备位置和并行运算。tensor 可能在 CPU 或 GPU 上，也可能是 fp32、bf16 或整数。shape 相同不代表一定能运算，dtype 和 device 也必须兼容。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：两句话如何变成三维张量",
      body: String.raw`假设一个 batch 有 2 句话，每句补齐到 3 个 token，每个 token 用 4 个数字表示。输入隐藏状态的 shape 是：

$$X\in\mathbb{R}^{2\times3\times4}$$

第一轴的 2 表示两句话，第二轴的 3 表示三个位置，第三轴的 4 表示四维特征。总元素数是 $2\times3\times4=24$。

若线性层权重 $W\in\mathbb{R}^{4\times6}$，每个四维 token 向量乘权重后变成六维。矩阵乘法只作用于最后一轴：

$$[2,3,\mathbf{4}]\times[\mathbf{4},6]\rightarrow[2,3,6]$$

粗体的两个 4 是必须对齐的收缩维。batch 和序列轴被原样保留。若再把 6 维拆成 2 个头，每头 3 维，可以 reshape 为 $[2,3,2,3]$，再 transpose 成 $[2,2,3,3]$，顺序依次是 batch、head、sequence、head dimension。

Padding 只是在短句后补占位 token，使同一批数据形成规则矩形。它不携带语义，所以后续要用 mask 阻止它参与注意力和损失。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "Shape 跟踪流水线",
      body: String.raw`把 shape 跟踪写在纸上，永远不要只在脑中想。下面是一条简化 Transformer 流程：token id 先查 embedding 表得到向量；线性投影产生 Q、K、V；隐藏维被拆成多个头；注意力完成后再合并。

每次变形都应回答两个问题：元素总数是否保持，轴的语义是否改变。reshape 只重新解释排列，不应凭空增减元素；transpose 只交换轴；矩阵乘法会消去对齐维并产生新维。

最常见错误不是“数学不会”，而是把序列长度和头维弄反，或者忽略 batch 轴的广播。调试时打印完整 shape，并在变量名里临时加入语义，例如 queries_bhsd，比只写 q 更容易检查。`,
      diagram: {
        kind: "flow",
        nodes: [
          "Token IDs [B,S]",
          "Embedding [B,S,H]",
          "Q/K/V [B,S,H]",
          "Split heads [B,N,S,D]",
          "Output [B,S,H]",
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
      title: "三个运算规则：逐元素、矩阵乘法与广播",
      body: String.raw`**逐元素运算**要求两个位置可以一一对应。两个 $[2,3]$ 矩阵相加，结果仍是 $[2,3]$。它不会像矩阵乘法那样把一行和一列求和。

**矩阵乘法**中，$A\in\mathbb{R}^{m\times n}$ 与 $B\in\mathbb{R}^{n\times p}$ 相乘得到 $C\in\mathbb{R}^{m\times p}$：

$$C_{ij}=\sum_{k=1}^{n}A_{ik}B_{kj}$$

中间维 $n$ 被求和消去。若 $A$ 是 $[2,3]$，$B$ 是 $[3,4]$，结果是 $[2,4]$，不是 $[3,3]$。

**广播**让长度为 1 或缺失的轴重复使用。矩阵 $X$ 为 $[B,H]$，偏置 $b$ 为 $[H]$，执行 $X+b$ 时，$b$ 会被视为每个样本共享的一行。判断广播时从最右轴向左比较：维度相等，或其中一个为 1，才兼容。

例如 $[2,3,4]+[4]$ 合法，后者对 batch 和 sequence 广播；$[2,3,4]+[3]$ 不合法，因为最后轴 4 与 3 不兼容。若本意是给每个序列位置加偏置，应把 $[3]$ 变成 $[1,3,1]$。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：不用框架练习 shape",
      body: String.raw`下面用嵌套列表模拟 batch，并显式打印每个轴。先养成写断言的习惯，错误会在离源头最近的位置暴露。

~~~python
batch = [
    [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]],
    [[0, 0, 1, 1], [1, 0, 0, 1], [0, 1, 1, 0]],
]

B = len(batch)
S = len(batch[0])
H = len(batch[0][0])
print((B, S, H))  # (2, 3, 4)

assert all(len(sentence) == S for sentence in batch)
assert all(len(token) == H for sentence in batch for token in sentence)

# 对最后一维求和，相当于每个 token 得到一个标量
token_scores = [
    [sum(token) for token in sentence]
    for sentence in batch
]
print(token_scores)  # shape: [2, 3]
~~~

进入 NumPy 或 PyTorch 后，仍建议在关键边界加入 shape 断言，例如断言隐藏维能被头数整除。断言不是多余代码，它把隐含假设变成可检查契约。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：元素个数相同不等于语义相同",
      body: String.raw`**误区一：能 reshape 就代表正确。** $[2,3,4]$ 和 $[2,4,3]$ 都有 24 个元素，但后两轴语义相反。程序可能不报错，结果却完全错误，这比直接崩溃更危险。

**误区二：星号总是矩阵乘法。** Python 数字的星号是普通乘法，NumPy 数组的星号通常是逐元素乘法，矩阵乘法常写成 @。读代码必须看对象类型和 API。

**误区三：忽略 batch 维。** 公式常只写单个样本 $X\in\mathbb{R}^{S\times H}$，工程实现却多一维 $B$。公式省略不代表代码里不存在。

**误区四：把 rank 与 LoRA rank 混为一谈。** 张量 rank 有时指轴的数量，线性代数 rank 指独立方向数，LoRA 的 rank 是低秩瓶颈宽度。必须结合上下文。

**误区五：广播越方便越好。** 错误的广播往往不会报错。对重要加法显式写出 reshape 或 unsqueeze，并在注释中记录轴语义。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "常见张量操作对比",
      body: String.raw`| 操作 | 改变元素值 | 改变元素顺序 | 典型用途 |
|---|---|---|---|
| reshape/view | 否 | 通常不改逻辑顺序 | 拆头、合并轴 |
| transpose/permute | 否 | 改变轴顺序 | 把 head 轴移到前面 |
| element-wise | 是 | 否 | 激活、mask、缩放 |
| matmul | 是 | 通过求和收缩维 | 线性层、注意力分数 |
| concatenate | 否 | 拼接新范围 | 合并特征或序列 |
| reduction | 是 | 删除被聚合轴 | sum、mean、max |

选择操作时先用中文描述意图。例如“每个 token 独立乘同一权重矩阵”对应最后两维矩阵乘法；“给每个隐藏特征加共享偏置”对应广播；“把 8 个头重新并回隐藏维”对应 transpose 后 reshape。

很多性能问题也来自 shape。连续内存上的访问通常更高效，transpose 后的张量可能不连续；框架有时会隐式复制。先保证语义正确，再通过 profiler 判断是否需要 contiguous 或布局优化。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：三句话讲清注意力 Shape",
      body: String.raw`**30 秒回答：**“输入隐藏状态通常是 $[B,S,H]$。经过 Q、K、V 投影并把 $H$ 拆成 $N$ 个头后，变为 $[B,N,S,D]$，其中 $D=H/N$。Q 与 K 转置相乘得到注意力分数 $[B,N,S,S]$，再乘 V 回到 $[B,N,S,D]$，最后合并头得到 $[B,S,H]$。”

若追问为什么分数是 $S\times S$，回答：每个 query 位置都要和每个 key 位置计算一次相似度，所以两个序列轴分别代表“谁在查”和“查谁”。

若追问 mask 的 shape，可以说 padding mask 常从 $[B,S]$ 扩展为可广播的 $[B,1,1,S]$，因果 mask 常是 $[1,1,S,S]$；二者相加或逻辑合并后广播到所有头。

若代码出现 shape mismatch，排查顺序是：确认轴语义、检查矩阵乘法收缩维、检查 transpose 后顺序、检查广播维是否显式为 1，最后才怀疑框架。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：先写 Shape 再算",
      body: "不要只判断能否运行，还要解释每个轴在现实任务中的含义。",
      questions: [
        {
          q: "X 的 shape 为 [4, 10, 32]，W 为 [32, 64]，X @ W 的 shape 是什么？",
          a: "[4, 10, 64]。最后的 32 与权重第一维对齐并被收缩，batch 和序列轴保留。",
        },
        {
          q: "[2, 3, 4] 能否与 [3, 1] 相加？",
          a: "可以。从右向左比较：[3,4] 与 [3,1]，最后轴 1 广播为 4，倒数第二轴同为 3，缺失的 batch 轴再广播为 2。",
        },
        {
          q: "为什么把 [B,S,N,D] 直接 reshape 成 [B,S,H] 前通常不需要交换轴，而 [B,N,S,D] 需要？",
          a: "前者 N 和 D 已相邻且处于每个 token 内，可以直接合并；后者 S 位于 N 与 D 之间，需先转为 [B,S,N,D]，否则会混合 token 与头的排列语义。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "NumPy Broadcasting",
      url: "https://numpy.org/doc/stable/user/basics.broadcasting.html",
      evidence: "官方文档",
    },
    {
      label: "PyTorch Tensor Views",
      url: "https://pytorch.org/docs/stable/tensor_view.html",
      evidence: "官方文档",
    },
  ],
};

export default chapter;
