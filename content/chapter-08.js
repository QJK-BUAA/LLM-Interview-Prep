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
      body: String.raw`要让上一章的序列网络接着“机器”预测“学习”，先得把这段文字变成它能计算的输入。应该按字、按词，还是按更小的片段切？同一句话为什么换个模型就占用不同数量的上下文位置？本章先把这条文本输入管线走通，再解释它怎样决定输出概率和评估分母。

语言模型先规范化文本，再切成 token，为每个片段分配整数 id，最后从 embedding 矩阵查出向量。“机器学习”可能是两个词、四个汉字，也可能经过 UTF-8 字节后形成其他子词片段，具体由 tokenizer 决定。token 不是固定的语言学单位，标点和前导空格也可能进入片段；因此 32k token 不能直接换成固定字数。

常见片段整体保留可以缩短序列，但需要更大的词表和输出分类头；拆得更细可以复用基础单位，却让模型处理更多位置。下面的四词语料把这个权衡缩小到两轮相邻片段合并，让每个计数都能复查。之后再看另一种允许多条切分路径的训练目标。

切分规则确定后，embedding 才为每个编号提供可学习坐标。同一 token 的输入向量相同，在上下文网络中得到的状态却可以不同。本章暂不展开这个网络内部，只跟踪查表、输出分类、共享梯度和有效标签；第 09 章再填入 Transformer。这样读到语言模型损失时，你已经知道概率对应哪个事件，而不只是看到一个求和式。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：手算两轮 BPE",
      body: String.raw`如果词表只能再增加两个片段，怎样选才能压缩当前语料？我们用 low、lower、new、newer 四个词，并故意给出不同出现次数，让“数相邻对”与“凭词形猜片段”的区别显现出来。

假设训练语料只有以下四个词，并在词尾加终止符：</w>。频次表示这个词在语料里重复了多少次，每次出现都要贡献计数：

| 词 | 频次 | 初始符号序列 |
|---|---:|---|
| low | 5 | l o w </w> |
| lower | 2 | l o w e r </w> |
| new | 6 | n e w </w> |
| newer | 3 | n e w e r </w> |

统计时必须包含词尾符号：(w,</w>) 在 low 和 new 中共出现 $5+6=11$ 次，超过 (e,w) 的 9 次和 (n,e) 的 9 次，所以第一轮合并 w 与词尾为一个符号。重新统计后，(n,e) 仍有 $6+3=9$ 次，成为最高频对，第二轮合并为 ne。此时 new 切为 ne、带词尾的 w；不能跳过更高频的词尾对，直接声称标准 BPE 首先合并 ew。

第一轮有 11 次不重叠替换，语料总符号数减少 11；第二轮又减少 9。词尾虽然不是词根，也可能比可见字母对更值得合并。BPE（Byte Pair Encoding）每轮选择当前语料中频率最高的相邻对并加入词表，是贪心压缩过程，不理解语义，也不保证词根边界。WordPiece 常选择能最大提升语言模型似然或具有较高关联度的片段，而 SentencePiece 可直接在原始文本上训练，把空格也视为符号。

若基础单位是 Unicode 字符，未登录字符仍可能出现；BBPE（Byte-level BPE）先把 UTF-8 编码分解成 256 种字节，因此理论上可表示任意输入。代价是某些字符需要多个字节，罕见脚本可能被切得很碎。这个手算只训练合并规则，尚未训练语言模型；下一步要区分“片段如何选”和“选好片段后怎样预测”。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：离散切分如何影响连续梯度和评估",
      body: String.raw`现在已有切分片段，怎样把它们接到可训练的语言模型，并判断预测是否变好了？先用 BPE 与 Unigram 区分两种 tokenizer 训练目标，再把离散编号送入 embedding、从隐藏状态输出下一 token 概率，最后讨论采样和评价。

查表前向必须先于共享梯度：重复编号要累加，输入输出共用一张表还要合并两条路径。概率定义好以后，温度节只改变采样分布，似然节则固定有效标签集合计算损失和困惑度；两者不能混为一种模型能力变化。索引与广播回看第 01 章，似然回看第 03 章，softmax 反向回看第 05 章。带着正确的 label shift 和 mask 进入下一章，注意力才有明确的输入与目标。`,
      links: [
        { label: "BPE 与 Unigram 的训练目标", sectionId: "math-tokenizer-objectives", level: "必会" },
        { label: "查表、分类头与标签错位", sectionId: "derivation", level: "必会" },
        { label: "查表与 tied embedding 梯度", sectionId: "math-embedding-gradients", level: "推导" },
        { label: "温度采样与极限", sectionId: "math-temperature", level: "推导" },
        { label: "序列似然、mask 与 PPL", sectionId: "math-likelihood-perplexity", level: "必会" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
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
      id: "math-tokenizer-objectives",
      type: "derivation",
      title: "BPE 的贪心计数与 Unigram 的隐切分似然",
      body: String.raw`刚才按计数选出两个合并，是否就等于找到了最可能的切分？并不是。我们先把 BPE 的计数规则写清，再用同一个字符串可以拆成一块或两块的例子，看看 Unigram 为什么要把不同切分的概率相加。

对 BPE，给词或预切分片段 $w$ 的频数 $f(w)$，当前符号序列为 $s(w)$。每轮先统计片段内部的相邻对，再按语料频数加权：

$$C(a,b)=\sum_w f(w)\sum_{j=1}^{|s(w)|-1}
\mathbf1[s_j=a,s_{j+1}=b],\qquad
(a^*,b^*)=\arg\max_{a,b}C(a,b).$$

按实现规定处理不重叠出现与平局，将该对替换为新符号，然后重计数。它贪心减少当前符号长度，不等于最大化下游神经语言模型似然。上节语料第一轮 $(w,\text{词尾})$ 计数 11，第二轮 $(n,e)$ 计数 9；重复串中的重叠对须遵循实际替换规则，不能把计数都当作独立可替换位置。

**Unigram 的不同问题。** 给定词表 $\mathcal V$ 与 token 概率 $\pi_v>0,\sum_v\pi_v=1$，同一字符串 $x$ 可有多个合法切分 $s\in\mathcal S(x)$。不预先固定唯一切分，而对切分求和：

$$P(x)=\sum_{s\in\mathcal S(x)}\prod_{v\in s}\pi_v,\quad
\mathcal L=\sum_xf(x)\log P(x).$$

这里未知的是实际采用了哪条切分路径，而非原始字符串。E 步用 $q(s\mid x)=\prod_{v\in s}\pi_v/P(x)$ 给每个切分加权，累计 token 的期望次数 $n_v$；固定词表的 M 步为 $\pi_v=n_v/\sum_un_u$。实际训练还会剪枝候选词表并保留字符覆盖，不能只说“删除最低频 token”。

**手算。** 词表 a、b、ab 的概率为 $0.4,0.4,0.2$，字符串 ab 有切分 [ab] 与 [a,b]，概率分别为 0.2 和 0.16，总和 0.36；后验分别为 $5/9,4/9$。只有该样本时，期望计数为 $n_a=n_b=4/9,n_{ab}=5/9$，一次 M 步给 $[4/13,4/13,5/13]$。训练边缘似然 $\log0.36$ 不等于最佳切分的 $\log0.2$。

0.36 包含两条合法路径，0.2 只包含最优的一条；一次更新把整块 ab 的概率提高到 $5/13$，但没有把字符路径直接删除。求和可用前向动态规划：$\alpha[0]=1$，$\alpha[t]=\sum_{v:\ x_{t-|v|:t}=v}\alpha[t-|v|]\pi_v$；Viterbi 把求和改为取最大，实际实现用 log 空间。

SentencePiece 是支持 BPE/Unigram 等模型的工具，不是 Unigram 的同义词；随机切分可作正则化，但线上编码必须使用与模型配套的规则。选定切分规则以后，下面固定 token IDs，开始训练它们对应的连续向量；不对合并选择本身做神经网络反传。`,
    },
    {
      id: "derivation",
      type: "derivation",
      title: "Embedding 查表、输出 logits 与权重共享",
      body: String.raw`切分得到的是整数编号，怎样让网络使用它们，并输出下一个编号的概率？我们沿“BOS、机器、学习、EOS”这条短序列走一遍，明确查哪一行、预测哪个位置，以及补齐出来的位置为什么不应计分。

词表大小为 $V$，隐藏维为 $H$。输入 embedding 矩阵记作 $E\in\mathbb{R}^{V\times H}$。某个 token id 为 $i$ 时，查表结果就是第 $i$ 行：

$$x=E[i]\in\mathbb{R}^{H}$$

也可把 id 写成长度为 $V$ 的 one-hot 行向量 $o_i$，则 $x=o_iE$。实际实现不会显式构造巨大的 one-hot，而是直接索引。对 batch token ids $T\in\mathbb{N}^{B\times S}$，输出为：

$$X=\operatorname{Embed}(T)\in\mathbb{R}^{B\times S\times H}$$

最后一层隐藏状态 $h\in\mathbb{R}^{H}$ 要预测下一个 token。若输出权重为 $W_{\text{out}}\in\mathbb{R}^{V\times H}$，logits 为：

$$z=W_{\text{out}}h+b\in\mathbb{R}^{V},\qquad
p_i=\frac{e^{z_i}}{\sum_{j=1}^{V}e^{z_j}}$$

tied embedding 令 $W_{\text{out}}=E$，输入查表与输出分类共享参数。这样参数从 $2VH$ 降到约 $VH$，两个空间也被显式联系起来，但输入与输出角色并不完全相同，是否共享仍是架构选择。以代码中的七个词表行、每行两个坐标为例，共享表只存 14 个数，两张独立表则存 28 个；输出仍然要给七个候选分别打分。

训练时 padding 位置不能贡献语言模型损失。设已经左移一位的标签 $y_{b,s}=T_{b,s+1}$，有效位置指示量 $m_{b,s}\in\{0,1\}$，则：

$$L=-\frac{\sum_{b,s}m_{b,s}\log p(y_{b,s}\mid T_{b,\le s})}
{\sum_{b,s}m_{b,s}}$$

这条短序列形成三个预测：BOS 预测机器，机器预测学习，学习预测 EOS；三个有效标签才是损失分母，而不是补齐后的数组长度。attention mask 控制“能看哪里”，loss mask 控制“哪里计分”，二者不能互相替代。前向路线已经完整，下一节检查同一个词表行既被查表又参与输出分类时，梯度怎样合并。`,
    },
    {
      id: "math-embedding-gradients",
      type: "derivation",
      title: "Embedding 梯度：重复 ID 累加与输入输出共享",
      body: String.raw`一个 token 在句子里出现两次，它的 embedding 应当用哪次梯度更新？如果这张表还负责输出分类，没有在输入里出现的 token 是否就不用更新？把重复查询和共享输出分开计算，才能避免覆盖梯度或漏掉整条分类路径。

展平 batch 与 token 轴为 $N=BS$，索引选择矩阵 $O\in\{0,1\}^{N\times V}$，每行一个 1，$E\in\mathbb R^{V\times H}$，$X=OE\in\mathbb R^{N\times H}$。给输入侧上游 $G_X$，由 $dX=O\,dE$ 得：

$$\nabla_E^{input}L=O^\top G_X,\qquad
(\nabla_E^{input}L)_{v,:}=\sum_{n:T_n=v}(G_X)_{n,:}.$$

因此不是“每个 ID 覆盖一行梯度”，而是 scatter-add。未查询行的输入侧梯度为 0。整数 ID 和离散分词过程通常不参与反向传播。

这是同一行在多个输入位置被使用的梯度总和，还没包含分类头。共享输出权重时，隐藏状态 $H_c\in\mathbb R^{N\times H}$，logits $Z=H_cE^\top$，上游 $G_Z=(P-Y)/N$（假设全有效、均值 CE）：

$$\nabla_E^{output}L=G_Z^\top H_c,\quad
\nabla_{H_c}L=G_ZE,\quad
\nabla_EL=\nabla_E^{input}L+\nabla_E^{output}L.$$

输入侧稀疏不代表共享后的总梯度稀疏，因为 softmax 输出通常给每个词表行梯度；对 padding 行也要区分“禁止查表更新”和“禁止输出头更新”。

**手算。** 输入 ID 为 $[1,1,2]$（从 0 起），对应局部上游为 $[1,2],[3,-1],[0,4]$，输入梯度三行是 $[0,0],[4,1],[0,4]$。另有一个输出位置的隐藏向量 $h=[2,-1]$、概率 $[1/2,1/4,1/4]$、标签为 ID 1，未平均 CE 给输出梯度三行 $[1,-1/2],[-3/2,3/4],[1/2,-1/4]$。把两路局部贡献相加得到：

$$\nabla_EL=\begin{bmatrix}1&-1/2\\5/2&7/4\\1/2&15/4\end{bmatrix}.$$

输入未查到 ID 0，但总梯度第一行仍为 [1,-0.5]，来自输出分类；ID 1 的两次输入贡献先相加，再与分类贡献合并。此处指定的是已从后续网络传回的局部上游，不把输入端和输出端误当两个独立模型。共享省一个 $VH$ 参数矩阵及相应训练状态，不会省掉输出 $N\times V$ logits 的计算。下一节固定已算出的 logits，只改变采样温度，区分参数学习与生成决策。`,
    },
    {
      id: "math-temperature",
      type: "derivation",
      title: "温度采样：概率比、导数与零温边界",
      body: String.raw`模型对两个候选给出了固定分数，为什么只改温度，较不可能的候选就更容易被采到？这次不更新任何权重，只改变从 logits 到概率的规则；随后再问，如果训练损失也用了这个温度，梯度是否仍然相同。

给 logits $z\in\mathbb R^V$ 与温度 $T>0$，$p_i(T)=\exp(z_i/T)/\sum_j\exp(z_j/T)$。两类概率相除时共同分母消掉，因此：

$$\frac{p_i(T)}{p_j(T)}=\exp((z_i-z_j)/T).$$

增大 $T$ 缩小 log-odds，分布更平；有限 logits、有限词表下 $T\to\infty$ 趋于均匀分布。$T\to0^+$ 时质量集中在最大 logit 集合，若有多个并列最大值则在该集合上均匀，不是必然唯一答案。实际 greedy decoding 是 argmax 规则，而不是计算 $z/0$。

概率比解释了排序不变而差距改变；要连接训练，就对第 05 章的 softmax 输入再乘一次温度缩放的链式导数：

$$\frac{\partial p_i}{\partial z_j}=\frac1T p_i(\delta_{ij}-p_j),\quad
\frac{\partial p_i}{\partial T}=\frac{p_i}{T^2}
\left(\mathbb E_p[z]-z_i\right).$$

若训练损失为温度后 CE，对原 logits 的梯度是 $(p-y)/T$；不能改了温度仍写成 $p-y$。蒸馏有时另乘 $T^2$ 补偿梯度尺度，属于目标定义而非采样必需步骤。

**手算。** $z=[\log4,0]$，$T=1$ 给 $[4/5,1/5]$，$T=2$ 给 $[2/3,1/3]$。若第二类为目标，$T=2$ 时 CE 梯度为 $[1/3,-1/3]$。top-k/top-p 在截断后还要重归一化，所得行为分布不同于原模型 softmax；记录采样概率时必须说明记录哪一种。

例中第二类从 20% 增加到约 33.3%，并不是模型新学到了它，而是同一分数差被缩小；CE 梯度还多除了一次温度。温度不改变未截断 logits 的排序，但会改变 top-p 累计质量达到阈值时的候选集合。高温不创造模型没有学过的信息，也不保证准确率提高。比较下一节的困惑度时，应固定评价分布，不能把采样规则变化误报成模型预测能力变化。`,
    },
    {
      id: "math-likelihood-perplexity",
      type: "derivation",
      title: "序列似然、有效 token 归一化与困惑度",
      body: String.raw`两个有效标签预测得一样好，只多补了一个 pad，报告的困惑度却下降了，这是真的进步吗？我们从整条目标序列的概率开始，逐步得到每个有效 token 的平均损失，让分子、分母和评价事件始终一致。

给定 BOS/提示条件 $c$，目标 token 序列 $x_{1:S}$，把每一步真实前缀下正确 token 的条件概率记为 $p_t$。概率链式法则给：

$$P_\theta(x_{1:S}\mid c)=\prod_{t=1}^SP_\theta(x_t\mid c,x_{<t}),\quad
\log P_\theta=\sum_t\log p_t.$$

若报告完整生成序列概率，应说明是否把 EOS 纳入目标；提示 token 作为条件通常不计分。训练时 teacher forcing 用真实前缀，但不能把当前位置标签未经 shift 就作为可见答案。

把乘积取负对数，就能把每步错误相加；再除以实际计分的 token 数，才可比较不同长度。设有效标签 mask $m_{bt}$，$N=\sum_{b,t}m_{bt}>0$，token 平均负对数似然和 perplexity 为：

$$L=-\frac1N\sum_{b,t}m_{bt}\log p_{bt},\qquad
\operatorname{PPL}=e^L
=\left(\prod_{m_{bt}=1}\frac1{p_{bt}}\right)^{1/N}.$$

**数值例。** 正确标签概率为 $[1/2,1/4,1/100]$，mask 为 $[1,1,0]$。有效序列概率 $1/8$，总 NLL 为 $\log8$，均值为 $\log8/2\approx1.039721$，PPL 为 $\sqrt8\approx2.828427$。错误把 pad 加入分母会得到 $e^{\log8/3}=2$，即使 pad 没有计 loss，也会伪造更好的 PPL。

**跨样本与跨设备。** 一条 1-token 样本 loss 为 $\log2$，一条 3-token 样本每 token loss 为 $\log4$，全局 token mean 是 $7\log2/4$、PPL 约 3.363586；平均两个样本的 mean loss 则为 $3\log2/2$，对应不同权重。分布式训练应汇总有效 loss 总和与计数，不能不加权平均各卡 mean。$N=0$ 时应跳过更新/报告无有效标签，而不是除零。

本例从 2.828427 降到 2 的“改善”完全由错误分母造成，正确标签概率一次也没变。排查指标时应同时打印有效 token 数和 NLL 总和，而不只看最后的均值。

不同 tokenizer 的每 token PPL 通常不可直接比较，因为事件空间与分母改变；可在相同原始文本上报告总 NLL 与每字节 bits（使用相同规范化和边界口径）。attention mask 决定条件信息，loss mask 只决定哪些位置进入上式。现在输入、标签和计分范围已经明确，第 09 章将检查 Transformer 如何在不读取未来标签的前提下算出这些条件概率。`,
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

若追问 tied embedding：输入矩阵将 token 映射到隐藏空间，输出矩阵把隐藏状态映射回词表 logits。共享可减少约一个 $VH$ 矩阵，梯度必须相加为 $O^\top G_X+G_Z^\top H_c$；前者对重复 ID 做 scatter-add，后者通常对整个词表非零，不能声称总梯度仍是稀疏查表梯度。

若追问 padding mask 和 causal mask：padding mask 排除补位键，因果 mask 阻止当前位置读取未来 token。训练 decoder 时通常二者同时存在，广播后作用于注意力分数。

**白板加问。** Unigram 训练对合法切分概率求和，不能只选 Viterbi 最优路径；PPL 则是有效标签 NLL 的指数。请分别写它们的求和范围，再解释为什么 pad 不计 loss 却仍计入分母会伪造更低 PPL，以及不同 tokenizer 的 token PPL 不能直接比较。`,
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：切分、共享梯度与评估口径",
      body: "不要把 tokenizer 训练目标、模型训练目标和采样分布混为一谈。",
      questions: [
        {
          q: "Unigram 词表 a、b、ab 的概率为 0.4、0.4、0.2。字符串 ab 的边缘概率、切分后验和一次 EM 更新分别是什么？",
          a: String.raw`两个切分概率为 0.16 和 0.2，边缘概率 0.36。后验 $q([a,b])=4/9,q([ab])=5/9$；期望计数 $[4/9,4/9,5/9]$，总数 $13/9$，归一化后 $\pi'=[4/13,4/13,5/13]$。最佳切分概率仅 0.2，不能代替求和。**得分点：**隐切分边缘化；期望 token 数可非整数；区分 sum-product 与 Viterbi。`,
        },
        {
          q: "embedding ID=[1,1,2]，输入上游为 [1,2]、[3,-1]、[0,4]。若与输出头共享，为什么不能只更新查到的行？",
          a: String.raw`输入侧 scatter-add 得行 1 为 $[4,1]$，行 2 为 $[0,4]$，行 0 为 0。共享输出 $Z=H_cE^\top$ 还贡献 $G_Z^\top H_c$，CE 的 $G_Z=P-Y$ 通常每类非零，因此总梯度是两路之和，不再行稀疏。**得分点：**重复 ID 相加而非覆盖；明确转置维度；共享参数只保存一份但接收多条梯度路径。`,
        },
        {
          q: "正确类概率 [0.5,0.25,0.01]、mask=[1,1,0]，求 NLL/PPL；全部 mask=0 怎么办？",
          a: String.raw`有效概率乘积 $0.125$，NLL 总和 $\log8$，mean 为 $\log8/2=1.039721$，PPL $=\sqrt8=2.828427$。若误除以 3，会得到虚假的 PPL=2。全部 mask 为 0 时目标没有定义，训练应跳过或明确报错，不能静默当作可比较的 0 loss。**得分点：**分子分母使用同一有效集合；区分序列概率、总 NLL 与 token mean。`,
        },
        {
          q: "logits=[log 4,0]，温度从 1 改为 2，概率和第二类 CE 对原 logits 的梯度如何变化？零温是否总选唯一 token？",
          a: String.raw`概率由 $[4/5,1/5]$ 变成 $[2/3,1/3]$；CE 梯度由 $[4/5,-4/5]$ 变为 $(p-y)/2=[1/3,-1/3]$。$T\to0^+$ 若最大 logits 并列，则极限在并列集合上均匀；greedy 的平局规则需单独约定。**得分点：**softmax 输入缩放的链式法则；区分极限与除以零。`,
        },
      ],
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
      label: "Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates",
      url: "https://arxiv.org/abs/1804.10959",
      evidence: "Unigram 子词模型与采样切分原始论文；EM 数字为教学算例",
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
