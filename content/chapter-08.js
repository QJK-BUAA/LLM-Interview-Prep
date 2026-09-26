const chapter = {
  id: "08",
  slug: "tokenization-embeddings",
  part: "LLM 主线",
  title: "Tokenization 与 Embedding",
  subtitle: "把原始文本变成模型能够计算的向量",
  level: "基础",
  duration: 90,
  prerequisites: ["01", "03", "05"],
  tags: ["Tokenization", "BPE", "BBPE", "WordPiece", "Embedding"],
  objectives: [
    "追踪文本、字节、token id 与 embedding 的完整 shape",
    "手算一次 BPE 合并并解释词表大小的权衡",
    "区分输入 embedding、位置表示和输出分类头",
    "正确处理 padding、attention mask 与 tied embedding",
  ],
  summary:
    "Tokenizer 决定模型看到的离散符号，embedding 把符号映射为可学习向量；词表、切分、padding 与权重共享会共同影响长度、算力、跨语言公平性和输出概率。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：模型看到的不是字，而是编号",
      body: String.raw`神经网络不能直接对字符串做矩阵乘法。语言模型的输入管线先把文本规范化，再切成 token，将每个 token 查表变成整数 id，最后用 id 从 embedding 矩阵取出向量。于是“机器学习”可能被切成两个汉字、一个整词，也可能经过 UTF-8 字节后形成若干子词；切法由 tokenizer 的词表和算法决定。

token 不是稳定的语言学单位。它可能是词、词根、标点、空格前缀或一个字节片段。同一个可见字符串在不同 tokenizer 中会得到不同长度，因此“模型支持 32k token”不能直接换算成固定字数。代码、中文和低资源语言若切得更碎，会消耗更多上下文和计算。

词表太小，几乎所有文本都能表示，但序列变长；词表太大，序列变短，却增加输入 embedding 和输出 softmax 的参数量，还会让稀有 token 学得不充分。子词算法在两者之间折中：常见片段整体保留，罕见词拆成可复用的小片段。

embedding 不是词典释义，而是训练得到的坐标。初始向量通常随机，经过语言建模后，相似使用环境的 token 往往获得相近表示。相同 token 的输入 embedding 起点相同，但经过 Transformer 与上下文交互后，每个位置的隐藏状态会不同。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：手算两轮 BPE",
      body: String.raw`假设训练语料只有四个词，并在词尾加终止符：</w>：

| 词 | 频次 | 初始符号序列 |
|---|---:|---|
| low | 5 | l o w </w> |
| lower | 2 | l o w e r </w> |
| new | 6 | n e w </w> |
| newer | 3 | n e w e r </w> |

统计相邻符号对时，(e,w) 在 new 与 newer 中共出现 9 次，是高频候选；把它合并成 ew。重新统计后，(n,ew) 同样出现 9 次，于是再合并成 new。此时 new 的完整前缀可用一个 token 表示，而 lower 仍由多个片段组成。

BPE（Byte Pair Encoding）每轮选择当前语料中频率最高的相邻对并加入词表。它是贪心压缩过程，不理解语义，也不保证词根边界。WordPiece 常选择能最大提升语言模型似然或具有较高关联度的片段，而 SentencePiece 可直接在原始文本上训练，把空格也视为符号。

若基础单位是 Unicode 字符，未登录字符仍可能出现；BBPE（Byte-level BPE）先把 UTF-8 编码分解成 256 种字节，因此理论上可表示任意输入。代价是某些字符需要多个字节，罕见脚本可能被切得很碎。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "文本进入 Transformer 前的流水线",
      body: String.raw`以两句话组成的 batch 为例。先分别分词并加入 BOS、EOS 等特殊 token，再补齐到统一长度。token id 的 shape 是 $[B,S]$；从词表矩阵 $E\in\mathbb{R}^{V\times H}$ 查表后得到 $X\in\mathbb{R}^{B\times S\times H}$。

$B$ 是 batch 大小，$S$ 是补齐后的序列长度，$V$ 是词表大小，$H$ 是隐藏维。attention mask 通常为 $[B,S]$，其中真实位置为 1、padding 为 0；进入注意力时会广播到 $[B,1,1,S]$，阻止查询读取补位键值。

位置表示随后注入顺序信息。绝对位置 embedding 可直接与 token embedding 相加；RoPE 则不在输入端加向量，而是在注意力内部旋转 query 和 key。二者作用位置不同，但都解决“注意力本身对排列缺少顺序感”的问题。`,
      diagram: {
        kind: "flow",
        nodes: [
          "原始文本",
          "规范化与切分",
          "Token IDs [B,S]",
          "查表 [B,S,H]",
          "位置与 Mask",
          "Transformer",
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
      id: "derivation",
      type: "derivation",
      title: "Embedding 查表、输出 logits 与权重共享",
      body: String.raw`词表大小为 $V$，隐藏维为 $H$。输入 embedding 矩阵记作 $E\in\mathbb{R}^{V\times H}$。某个 token id 为 $i$ 时，查表结果就是第 $i$ 行：

$$x=E[i]\in\mathbb{R}^{H}$$

也可把 id 写成长度为 $V$ 的 one-hot 行向量 $o_i$，则 $x=o_iE$。实际实现不会显式构造巨大的 one-hot，而是直接索引。对 batch token ids $T\in\mathbb{N}^{B\times S}$，输出为：

$$X=\operatorname{Embed}(T)\in\mathbb{R}^{B\times S\times H}$$

最后一层隐藏状态 $h\in\mathbb{R}^{H}$ 要预测下一个 token。若输出权重为 $W_{\text{out}}\in\mathbb{R}^{V\times H}$，logits 为：

$$z=W_{\text{out}}h+b\in\mathbb{R}^{V},\qquad
p_i=\frac{e^{z_i}}{\sum_{j=1}^{V}e^{z_j}}$$

tied embedding 令 $W_{\text{out}}=E$，输入查表与输出分类共享参数。这样参数从 $2VH$ 降到约 $VH$，两个空间也被显式联系起来，但输入与输出角色并不完全相同，是否共享仍是架构选择。

训练时 padding 位置不能贡献语言模型损失。设标签 $y_{b,s}$，有效位置指示量 $m_{b,s}\in\{0,1\}$，则：

$$L=-\frac{\sum_{b,s}m_{b,s}\log p(y_{b,s}\mid T_{b,\le s})}
{\sum_{b,s}m_{b,s}}$$

attention mask 控制“能看哪里”，loss mask 控制“哪里计分”，二者不能互相替代。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从 token id 到上下文窗口",
      body: String.raw`下面用普通 Python 模拟词表、右侧 padding 与查表。真实 tokenizer 还会处理 Unicode 规范化、特殊 token、未知字节和批量截断。

~~~python
vocab = {"<pad>": 0, "<bos>": 1, "<eos>": 2, "机器": 3, "学习": 4, "很": 5, "有趣": 6}
sentences = [
    ["<bos>", "机器", "学习", "<eos>"],
    ["<bos>", "学习", "很", "有趣", "<eos>"],
]

max_length = max(len(tokens) for tokens in sentences)
input_ids, attention_mask = [], []
for tokens in sentences:
    ids = [vocab[token] for token in tokens]
    pad_count = max_length - len(ids)
    input_ids.append(ids + [vocab["<pad>"]] * pad_count)
    attention_mask.append([1] * len(ids) + [0] * pad_count)

embedding = [[token_id, token_id / 10] for token_id in range(len(vocab))]
hidden = [[embedding[token_id] for token_id in row] for row in input_ids]

print(input_ids)       # [B=2, S=5]
print(attention_mask)  # [2, 5]
print(len(hidden), len(hidden[0]), len(hidden[0][0]))  # 2, 5, H=2
~~~

训练自回归模型时，输入和标签通常错开一位：输入是 BOS、机器、学习，标签是机器、学习、EOS。框架常在模型内部完成 shift，但阅读代码时必须确认边界，否则可能让模型预测当前位置本身。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：切分细节会进入模型行为",
      body: String.raw`**误区一：一个 token 就是一个词。** 标点、前导空格、汉字和字节片段都可能成为 token。估算成本应实际运行目标 tokenizer，而不是按字数猜。

**误区二：decode(encode(text)) 必然逐字符相同。** 规范化、非法 Unicode、空格折叠或特殊 token 规则可能改变结果。训练数据清洗和线上 tokenizer 必须保持同版本。

**误区三：padding 只影响外观。** 若未屏蔽，pad token 会参与注意力或损失，模型可能学习补位规律。左 padding 与右 padding 还会影响位置编号和生成缓存。

**误区四：增加词表一定加速。** 序列可能变短，但 embedding 与输出 softmax 更大，通信和显存增加；稀有 token 的统计也更差。

**误区五：embedding 相近就证明语义相同。** 距离取决于训练目标和各向异性，静态输入向量还不包含当前句子的上下文。需要明确比较哪一层、何种归一化和何种距离。

**误区六：换 tokenizer 后可以直接复用模型。** token id 语义和 embedding 行对应关系已经改变。除非有明确的词表扩展与权重初始化方案，否则输入和输出都不兼容。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "BPE、WordPiece、Unigram 与字节级方案",
      body: String.raw`| 方法 | 基本做法 | 优点 | 主要代价 |
|---|---|---|---|
| BPE | 反复合并最高频相邻对 | 简单、确定、应用广 | 贪心频率不等于语言边界 |
| BBPE | 从 256 个字节开始做 BPE | 无未知字符、覆盖任意输入 | 多字节文字可能序列更长 |
| WordPiece | 选择提升似然或关联度的片段 | 与词形片段常较协调 | 训练规则与实现版本相关 |
| Unigram | 从大候选词表逐步删除低价值片段 | 可保留多种切分概率 | 训练和解码更复杂 |
| 字符级 | 每个字符一个单位 | 词表小、边界直观 | 序列长，跨 Unicode 处理复杂 |

实践中还要比较标准化规则、特殊 token、数字与代码切法、不同语言的 token/字符比，以及推理服务是否支持。Tokenizer 是模型契约的一部分，应随 checkpoint 一起版本化。

词表选择没有脱离数据的最优答案。多语言模型需要检查每种脚本的压缩率；代码模型要避免把常见运算符和缩进切得过碎；领域模型可扩展高频术语，但必须训练新增 embedding，并评估是否破坏原有分布。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：为什么现代 LLM 常用子词或字节 BPE",
      body: String.raw`**30 秒回答：**“整词词表会遇到未登录词且规模巨大，字符级又让序列过长。子词方法保留高频片段、拆分罕见词，在词表参数量与序列计算量之间折中。字节级 BPE 进一步保证任何 Unicode 输入都可表示，但某些语言会被切得更碎，所以要检查跨语言压缩率和成本。”

若追问 BPE 训练：从基础符号序列开始，统计相邻对频次，每轮合并最频繁的一对并加入词表，直到达到目标词表大小。推理时按已学合并规则切分，不再根据单句重新统计。

若追问 tied embedding：输入矩阵将 token 映射到隐藏空间，输出矩阵把隐藏状态映射回词表 logits。共享可减少约一个 $VH$ 矩阵并建立两者联系，但输出侧可能需要独立偏置。

若追问 padding mask 和 causal mask：padding mask 排除补位键，因果 mask 阻止当前位置读取未来 token。训练 decoder 时通常二者同时存在，广播后作用于注意力分数。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：从字符串到向量",
      body: "回答时写出每一步的对象类型与 shape。",
      questions: [
        {
          q: "token ids 为 [4,128]，词表为 50,000，隐藏维为 768，查表后的 shape 是什么？",
          a: "得到 [4,128,768]。词表维只用于选择 embedding 的行，不会保留在输出 shape 中。",
        },
        {
          q: "为什么 BBPE 理论上不需要未知字符 token？",
          a: "任意输入都能编码成 UTF-8 字节，而基础词表覆盖全部 256 种字节；即使没有更长合并片段，也能退回字节序列。",
        },
        {
          q: "attention mask 与 loss mask 分别解决什么问题？",
          a: "attention mask 控制一个查询可读取哪些键值；loss mask 控制哪些标签位置参与目标函数。padding 位置通常两者都需处理。",
        },
        {
          q: "词表从 32k 扩到 128k 一定更省算力吗？",
          a: "不一定。序列通常变短，但输入与输出矩阵变大，softmax 和通信成本上升，还需看语言压缩率、模型宽度和硬件实现。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Neural Machine Translation of Rare Words with Subword Units",
      url: "https://arxiv.org/abs/1508.07909",
      evidence: "BPE 原始论文",
    },
    {
      label: "SentencePiece",
      url: "https://arxiv.org/abs/1808.06226",
      evidence: "原始论文",
    },
    {
      label: "Language Models are Unsupervised Multitask Learners",
      url: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
      evidence: "GPT-2 技术报告，字节级 BPE",
    },
    {
      label: "Using the Output Embedding to Improve Language Models",
      url: "https://arxiv.org/abs/1608.05859",
      evidence: "权重共享原始论文",
    },
  ],
};

export default chapter;
