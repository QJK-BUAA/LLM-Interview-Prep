const chapter = {
  id: "03",
  slug: "probability-statistics-information",
  part: "数学与机器学习地基",
  title: "概率、统计与信息论",
  subtitle: "理解不确定性、损失与采样",
  level: "入门",
  duration: 95,
  prerequisites: ["02"],
  tags: ["概率", "MLE", "熵", "交叉熵", "KL", "采样"],
  objectives: [
    "区分概率分布、样本、期望和方差",
    "从最大似然推导分类交叉熵",
    "解释熵、交叉熵和 KL 散度的关系",
    "理解采样估计的偏差、方差和有效样本量",
  ],
  summary:
    "概率描述不确定性，统计用有限样本推断总体，信息论衡量分布中的惊讶与差异；它们共同解释了 LLM 的训练目标、采样和评估。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：分布是一张对未来的下注表",
      body: String.raw`概率不是对单次事件的保证，而是对重复情形的长期描述。模型说某 token 概率为 0.7，不表示这次必然选它，而是表示在相同条件下反复采样，它应大约出现七成。

随机变量把现实结果映射成数字，概率分布列出各数字可能出现的程度。期望是按概率加权的平均位置，方差衡量结果围绕期望的波动。两个模型平均准确率相同，方差可能完全不同；训练稳定性和置信区间因此不能只看均值。

统计推断的困难在于我们只看到有限样本。样本均值是总体均值的估计，换一批数据会变化。样本越多，标准误通常按 $1/\sqrt N$ 缩小，因此想把误差减半，往往需要四倍样本。

信息论从“一个结果有多令人意外”出发。高概率事件信息量小，低概率事件信息量大。语言模型的交叉熵训练，就是让真实 token 在模型分布下不再令人意外。KL 散度进一步衡量用一个分布近似另一个分布时多付出的编码代价。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：一枚硬币连接 MLE 与交叉熵",
      body: String.raw`抛一枚未知硬币三次，观察到“正、正、反”。设正面概率为 $p$。在独立假设下，这组具体序列的似然是：

$$P(D|p)=p\times p\times(1-p)=p^2(1-p)$$

最大似然估计选择让已观察数据最可能的 $p$。直接乘很多小概率容易数值下溢，因此取对数：

$$\log P(D|p)=2\log p+\log(1-p)$$

对 $p$ 求导并令其为零：

$$\frac{2}{p}-\frac{1}{1-p}=0\Rightarrow p=\frac{2}{3}$$

这就是“正面次数除以总次数”。若把正面记为标签 1、反面记为 0，负对数似然平均后正是二分类交叉熵：

$$L=-\frac{1}{3}[2\log p+\log(1-p)]$$

所以交叉熵不是随意发明的惩罚函数，而是伯努利分布假设下的最大似然目标。多分类 softmax 交叉熵和语言模型 next-token loss 具有相同来源。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从真实世界到估计结果",
      body: String.raw`真实世界存在一个未知分布，我们无法直接读取它，只能抽取有限样本。统计量把样本压缩成估计，模型再用参数化分布表达规律。评估的任务是判断这个规律能否推广到未见数据。

采样会产生波动，模型假设会产生偏差，优化不充分会产生额外误差。看到一次实验结果时，需要问：数据是否独立同分布、样本量多大、随机种子是否改变结论、比较是否配对、置信区间是否重叠。

LLM 生成也是从条件分布采样。温度改变 logits 的尺度，top-k 只保留概率最高的 k 个候选，top-p 保留累计概率达到阈值的最小集合。它们改变输出分布，不会让模型学到新知识。`,
      diagram: {
        kind: "flow",
        nodes: [
          "未知总体分布",
          "有限样本",
          "统计量与损失",
          "参数估计",
          "未见数据评估",
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
      title: "熵、交叉熵与 KL 的关系",
      body: String.raw`设真实离散分布为 $p(x)$，模型分布为 $q(x)$。事件 $x$ 的信息量定义为 $-\log p(x)$，于是分布自身的平均信息量，即熵，是：

$$H(p)=-\sum_x p(x)\log p(x)$$

若真实数据来自 $p$，却用 $q$ 的编码方案表示，平均代价是交叉熵：

$$H(p,q)=-\sum_x p(x)\log q(x)$$

两者相减：

$$H(p,q)-H(p)=\sum_x p(x)\log\frac{p(x)}{q(x)}
=D_{\mathrm{KL}}(p\|q)$$

因此：

$$H(p,q)=H(p)+D_{\mathrm{KL}}(p\|q)$$

训练时真实数据分布 $p$ 固定，$H(p)$ 不随模型参数变化，所以最小化交叉熵等价于最小化 $D_{\mathrm{KL}}(p\|q)$。

KL 不对称。$D_{\mathrm{KL}}(p\|q)$ 对 $p$ 有概率而 $q$ 接近零的位置惩罚极大，倾向覆盖 $p$ 的多种模式；$D_{\mathrm{KL}}(q\|p)$ 的期望由 $q$ 采样，更倾向把质量集中在 $p$ 的高概率模式。讨论蒸馏时必须明确哪个分布在左、哪个在右，不能只说“用了 KL”。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：计算熵与 KL",
      body: String.raw`下面用标准库计算两个二元分布。注意 KL 的两个方向通常不同，并验证交叉熵等于熵加 KL。

~~~python
from math import log

p = [0.8, 0.2]  # 数据分布
q = [0.6, 0.4]  # 模型分布

entropy_p = -sum(pi * log(pi) for pi in p)
cross_entropy = -sum(pi * log(qi) for pi, qi in zip(p, q))
kl_pq = sum(pi * log(pi / qi) for pi, qi in zip(p, q))
kl_qp = sum(qi * log(qi / pi) for pi, qi in zip(p, q))

print(round(entropy_p + kl_pq, 6))
print(round(cross_entropy, 6))
print("KL(p||q):", round(kl_pq, 6))
print("KL(q||p):", round(kl_qp, 6))
~~~

实际计算 softmax 交叉熵时应使用 log-sum-exp 等稳定实现，不要先算很小的概率再取对数。深度学习框架把 log-softmax 与负对数似然融合，既快又减少上溢、下溢。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：概率高不等于校准好",
      body: String.raw`**误区一：期望一定是可能取到的值。** 骰子的期望是 3.5，但单次不会掷出 3.5。期望描述长期平均，不是典型样本。

**误区二：KL 是距离。** KL 非对称，也不满足三角不等式，严格说不是度量。交换方向会改变惩罚重点。

**误区三：低交叉熵必然高准确率。** 交叉熵关注完整概率，准确率只看最大类别。两个模型准确率相同，给正确类 0.51 与 0.99 的交叉熵不同。

**误区四：置信度就是正确概率。** 模型可能过度自信。校准要求在预测置信度约 80% 的样本中，真实正确率也约 80%。

**误区五：样本多就没有偏差。** 增加来自同一错误采样过程的数据，只会更精确地估计错误目标。选择偏差、标签泄漏和分布漂移不会被数量自动修复。

**误区六：重要性采样权重均值为一，所以单样本也可靠。** 校正在期望上成立，权重可能高方差；有效样本量过低时，少数样本会支配估计。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "偏差、方差与采样方法",
      body: String.raw`| 概念 | 问题 | 常见改善 |
|---|---|---|
| 估计偏差 | 平均估计是否系统偏离真值 | 修正目标或采样机制 |
| 估计方差 | 换一批样本结果波动多大 | 更多样本、基线、分层采样 |
| 模型偏差 | 模型是否表达不了真实规律 | 更合适的特征或模型 |
| 模型方差 | 是否过度响应训练样本噪声 | 正则化、更多数据 |

蒙特卡洛用完整样本平均估计期望，通常无偏但方差较高；自助法通过有放回重采样估计统计量不确定性；重要性采样用 $p(x)/q(x)$ 把从 $q$ 采到的数据重加权为 $p$ 下的期望。

有效样本量常近似为：

$$ESS=\frac{(\sum_i w_i)^2}{\sum_i w_i^2}$$

权重越集中，ESS 越小。PPO 对概率比值裁剪、GSPO 调整重要性采样粒度，都与控制权重方差有关。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：为什么分类常用交叉熵",
      body: String.raw`**30 秒回答：**“softmax 把 logits 参数化为类别分布，假设标签来自 categorical 分布，最大化正确类别的似然等价于最小化负对数似然，也就是交叉熵。它直接惩罚分给真实类别的低概率，且与 softmax 组合后的梯度形式简洁。” 

若追问为什么不用 MSE，可以说 MSE 不是绝对错误，但它对应不同噪声假设；与 sigmoid/softmax 组合时还可能在饱和区提供较弱梯度。分类的概率建模下，交叉熵更自然。

若追问 forward 与 reverse KL，先声明命名可能随优化变量不同而混乱，再写出公式。$D_{\mathrm{KL}}(p\|q)$ 要求 $q$ 覆盖 $p$ 的质量，常称 mass-covering；$D_{\mathrm{KL}}(q\|p)$ 更偏向选择 $p$ 的高密度模式，常称 mode-seeking。

若追问降方差为什么重要，可以指出样本均值误差只按 $1/\sqrt N$ 降低，四倍样本才约减半；合适的 baseline、控制变量或分层设计可能以更低成本减少方差。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：从概率到训练目标",
      body: "计算时可以使用自然对数，只要所有项使用同一底数。",
      questions: [
        {
          q: "真实类别概率从 0.5 提升到 0.9，负对数似然怎样变化？",
          a: "从 -log(0.5) 约 0.693 降到 -log(0.9) 约 0.105，模型给真实类别更高概率时损失下降。",
        },
        {
          q: "为什么 KL(p||q) 与 KL(q||p) 一般不相等？",
          a: "两者分别在 p 和 q 下取期望，概率比也互为倒数；它们关注的样本区域与惩罚权重不同。",
        },
        {
          q: "把标准误缩小到原来的三分之一，样本量大约要变成多少倍？",
          a: "约九倍，因为标准误按 1/√N 缩放。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Elements of Information Theory",
      url: "https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X",
      evidence: "教材",
    },
    {
      label: "A Mathematical Theory of Communication",
      url: "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf",
      evidence: "原始论文",
    },
    {
      label: "Dive into Deep Learning: Probability",
      url: "https://d2l.ai/chapter_preliminaries/probability.html",
      evidence: "开源教材",
    },
  ],
};

export default chapter;
