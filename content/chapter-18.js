const chapter = {
  id: "18",
  slug: "dpo-preference-optimization",
  part: "LLM 后训练",
  title: "DPO 与偏好优化家族",
  subtitle: "从 KL 正则奖励最大化到成对分类损失",
  level: "进阶",
  duration: 145,
  prerequisites: ["03", "08", "16"],
  tags: ["DPO", "IPO", "KTO", "ORPO", "SimPO", "Preference Optimization"],
  objectives: [
    "从 KL 正则策略目标推导 DPO 隐式奖励",
    "手算 chosen/rejected 的 DPO logit",
    "比较 IPO、KTO、ORPO 与 SimPO 的数据和目标",
    "解释离线、在线、迭代与 step-level 偏好优化",
  ],
  summary:
    "DPO 把奖励模型和在线 RL 合并为一个基于偏好对的分类目标，用相对 reference 的似然差提高 chosen、压低 rejected；它更简单，但仍受偏好数据覆盖、长度偏差和离线分布限制。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：学习相对偏好，不预测绝对分数",
      body: String.raw`经典 RLHF 先训练标量奖励模型，再用 PPO 采样并优化。DPO（Direct Preference Optimization）观察到，在特定 KL 正则奖励最大化假设下，最优策略与 reference policy 的概率比已经编码隐式奖励，因此可直接用 chosen/rejected 对训练策略，无需显式 reward model 和 rollout loop。

一条数据是 $(x,y_w,y_l)$：同一个 prompt $x$ 下，$y_w$ 被偏好，$y_l$ 被拒绝。DPO 不只提高 chosen 的绝对似然，而是提高“当前策略相对 reference 对 chosen 的增幅”与“对 rejected 的增幅”之间的差。

reference 很重要。若 chosen 本来就在基座中概率很高，当前策略无需无限提高；若 rejected 也同步被提高，偏好间隔没有改善。DPO 通过 log-ratio 比较这种相对变化。

它常被称为“RL-free”，更准确的说法是训练过程不显式运行奖励模型与在线策略梯度；推导仍来自 KL 正则控制目标。离线偏好数据固定后，模型不会看到自己更新后新产生的错误状态，这与 on-policy RL、OPD 的数据闭环有根本差异。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：四个 log 概率决定一对偏好",
      body: String.raw`对某 prompt，当前策略给 chosen 与 rejected 的序列 log 概率分别为 -2.0 与 -3.0；reference 对应为 -2.5 与 -2.7。当前策略相对 reference 的变化：

$$\log\frac{\pi_\theta(y_w|x)}{\pi_{\mathrm{ref}}(y_w|x)}
=-2.0-(-2.5)=0.5$$

$$\log\frac{\pi_\theta(y_l|x)}{\pi_{\mathrm{ref}}(y_l|x)}
=-3.0-(-2.7)=-0.3$$

偏好 margin 为 $\Delta=0.5-(-0.3)=0.8$。若 $\beta=0.1$，DPO 分类 logit 为 0.08，模型认为 chosen 胜出的概率为 $\sigma(0.08)\approx0.52$，仍有继续学习空间。

注意序列 log 概率是 token log 概率之和。长回答自然累加更多负数，因此长度分布会影响 margin。使用相同 prompt 的成对数据可部分抵消，但 chosen 与 rejected 长度系统不同仍会形成偏差。

若当前策略同时把两条回答都提高相同的相对 log-ratio，$\Delta$ 不变，DPO 不认为偏好改善。这体现了成对目标，也说明单看 chosen loss 不能诊断 DPO。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从偏好对到 DPO 更新",
      body: String.raw`数据构造先对同一 prompt 产生候选，再由人类、规则、reward model 或 judge 选择 preferred/rejected。训练时 current policy 和 frozen reference 分别计算两条回答的 log probability，形成一个偏好 logit，经 logistic loss 更新 current policy。

若偏好数据来自旧模型，DPO 是离线优化。Iterative/online DPO 会周期性用当前策略生成新候选、重新标注并训练，使数据覆盖跟上策略变化；但只要标注器是外部 judge，它仍有 judge 偏差和额外推理成本。

Step-level preference 把一条推理轨迹拆成中间步骤比较，信用更细，但标注“哪一步更好”更难，且局部正确不一定带来全局正确。数据粒度和目标粒度必须一致。`,
      diagram: {
        kind: "flow",
        nodes: [
          "Prompt",
          "候选回答",
          "偏好标注",
          "Current + Reference",
          "相对 Log-Ratio",
          "Pairwise Loss",
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
      title: "从 KL 正则最优策略到 DPO",
      body: String.raw`对固定 prompt $x$，考虑奖励 $r(x,y)$ 与 reference $\pi_{\mathrm{ref}}$：

$$\max_\pi
\mathbb E_{y\sim\pi}[r(x,y)]
-\beta D_{\mathrm{KL}}(\pi(\cdot|x)\|\pi_{\mathrm{ref}}(\cdot|x))$$

带归一化约束求最优，可得：

$$\pi^*(y|x)=\frac{1}{Z(x)}
\pi_{\mathrm{ref}}(y|x)\exp\left(\frac{r(x,y)}{\beta}\right)$$

整理隐式奖励：

$$r(x,y)=\beta\log\frac{\pi^*(y|x)}
{\pi_{\mathrm{ref}}(y|x)}+\beta\log Z(x)$$

Bradley-Terry 偏好概率为 $\sigma(r(x,y_w)-r(x,y_l))$。同一 prompt 的 $\log Z(x)$ 抵消，把 $\pi^*$ 换成可训练策略 $\pi_\theta$，得到：

$$L_{\mathrm{DPO}}=
-\mathbb E\log\sigma\left(
\beta\left[
\log\frac{\pi_\theta(y_w|x)}{\pi_{\mathrm{ref}}(y_w|x)}
-\log\frac{\pi_\theta(y_l|x)}{\pi_{\mathrm{ref}}(y_l|x)}
\right]\right)$$

推导依赖偏好模型、KL 正则形式与策略可表示性。DPO 损失成立不代表真实人类偏好严格服从 Bradley-Terry，也不代表离线数据覆盖了更新后策略。$\beta$ 控制隐式奖励尺度和相对 reference 的变化，不宜只按“越大约束越强”口头记忆，应结合具体实现公式。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从 token log-prob 算 DPO loss",
      body: String.raw`下面把序列 log 概率显式求和。实际训练应 mask prompt 与 padding，只累计 response token，并用稳定的 logsigmoid。

~~~python
import math

def logsigmoid(value):
    return -math.log1p(math.exp(-value))

chosen_policy_tokens = [-0.4, -0.7, -0.9]
rejected_policy_tokens = [-0.8, -1.0, -1.2]
chosen_reference_tokens = [-0.5, -0.9, -1.1]
rejected_reference_tokens = [-0.7, -0.9, -1.1]
beta = 0.1

chosen_ratio = sum(chosen_policy_tokens) - sum(chosen_reference_tokens)
rejected_ratio = sum(rejected_policy_tokens) - sum(rejected_reference_tokens)
logit = beta * (chosen_ratio - rejected_ratio)
loss = -logsigmoid(logit)

print(chosen_ratio, rejected_ratio, logit, loss)
~~~

调试时分别记录 chosen/rejected 的 policy log-prob、reference log-prob、margin、accuracy 和长度。只看总 loss 下降可能掩盖“chosen 与 rejected 都下降，只是 rejected 降得更快”的退化模式。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：目标简单不表示数据问题消失",
      body: String.raw`**误区一：DPO 不需要奖励信息。** chosen/rejected 标签就是离线奖励信号，只是没有显式拟合标量 reward model。

**误区二：DPO 一定比 PPO 便宜且更好。** 它省 rollout、critic 和 reward inference，但要同时跑 current/reference 的两条回答；更关键的是，固定数据无法探索当前策略的新状态。

**误区三：所有偏好对都同样可靠。** 标注者分歧、judge 偏差、微小质量差和错误配对会直接进入梯度。应保存置信度、来源和 tie。

**误区四：chosen likelihood 必然上升。** 成对目标只要求相对 margin 改善，可能通过主要压低 rejected 达成。若需要保持 chosen，须监控或加入 NLL 正则。

**误区五：reference-free 就没有正则。** ORPO、SimPO 等通过 odds、长度归一化、margin 或 SFT 项形成隐式约束，只是没有单独 reference forward。

**误区六：step-level 偏好天然更准确。** 局部步骤可能看似合理却导向错误，或必须结合后续才能判断。细粒度标签成本和一致性往往更难。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "DPO 变体按数据需求与目标区分",
      body: String.raw`| 方法 | 需要的数据 | Reference | 核心差异 |
|---|---|---|---|
| DPO | 成对 chosen/rejected | 需要 | logistic 相对 log-ratio |
| IPO | 成对偏好 | 需要 | 用平方目标控制有限 margin |
| KTO | 单条 desirable/undesirable 也可 | 通常需要 | 基于效用/损失不对称的前景理论目标 |
| ORPO | 成对偏好 | 不需要独立模型 | SFT NLL + odds-ratio 偏好项 |
| SimPO | 成对偏好 | 不需要 | 长度归一化平均 log-prob + 目标 margin |
| Online/Iterative DPO | 当前策略候选与新偏好 | 视方法而定 | 周期刷新数据、降低静态分布错配 |

IPO 的动机之一是避免 logistic 目标在可分数据上持续扩大 margin；KTO 面向只有好/坏单样本而无严格配对的数据；ORPO 把 chosen 的监督学习和偏好 odds 结合；SimPO 让隐式 reward 与生成时常用的平均 log probability 对齐并加入 margin。它们的假设不同，不应统称为“换个 loss 就一样”。

偏好优化适合难以写标量 verifier、但能稳定比较两个答案的任务。数学最终答案可直接验证时，RLVR 能在线探索；若已有大量高质量静态偏好对、在线生成昂贵，DPO 家族更直接。

**工业 Pipeline 中的 DPO。** Qwen2.5 报告把离线偏好优化和在线 RL 分阶段使用；MiniMax-01 把短、长上下文的 SFT 与 DPO 分开组织，以适配不同的数据分布。它们说明 DPO 可负责某个阶段的行为校准，不代表所有模型都应按同一顺序训练。第 22、23 章会比较这些配方。若给长文摘要标注“更完整”，给短问答标注“更简洁”，必须把任务上下文带入偏好对；否则一个总长度偏好可能互相冲突。评估应按长度与任务分桶，不能仅看合并后的 pairwise accuracy。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：DPO 为什么不需要显式奖励模型",
      body: String.raw`**30 秒回答：**“KL 正则奖励最大化的最优策略满足 $\pi^*\propto\pi_{\mathrm{ref}}\exp(r/\beta)$，所以奖励差可写成当前策略与 reference 的 log-ratio 差。把它代入 Bradley-Terry 偏好似然，就得到直接用 chosen/rejected 训练的 logistic loss，不必单独拟合 reward model 或跑 PPO。”

若追问 DPO 是否 on-policy：标准 DPO 使用固定偏好数据，是离线方法。Online/iterative DPO 会用当前策略刷新候选，但还需外部偏好标注或 judge。

若追问 reference 作用：它定义隐式奖励的基准，并限制模型只需学习相对基座的偏好变化；去掉 reference 的变体必须用其他形式控制漂移和长度。

若追问失败模式：静态数据覆盖不足、偏好噪声、长度偏差、chosen 概率下降、过度优化 judge 偏好和通用能力遗忘。应分项监控，而不是只看 pairwise accuracy。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：偏好目标究竟比较什么",
      body: "先写出 current 与 reference 的四个序列 log 概率。",
      questions: [
        {
          q: "current 相对 reference 对 chosen 提高 0.4、对 rejected 提高 0.1，DPO margin 是多少？",
          a: "margin 为 0.4-0.1=0.3，再乘 β 后进入 sigmoid。",
        },
        {
          q: "DPO 的 pairwise accuracy 上升，能否证明 chosen 的绝对概率上升？",
          a: "不能。也可能 chosen 与 rejected 都下降，只是 rejected 下降更多；要单独监控两侧 log probability。",
        },
        {
          q: "只有单条 desirable/undesirable 标签、没有成对回答时，哪类方法更直接？",
          a: "KTO 针对非成对的二元好坏反馈设计；也可重新构造配对，但会引入额外假设。",
        },
        {
          q: "在线 DPO 相比标准离线 DPO 多了什么闭环？",
          a: "周期性让当前策略生成候选、获取新偏好并更新，使训练数据跟随策略分布；代价是生成和标注成本。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Qwen2.5 Technical Report",
      url: "https://arxiv.org/abs/2412.15115",
      evidence: "离线与在线偏好阶段的工业实例",
    },
    {
      label: "MiniMax-01: Scaling Foundation Models with Lightning Attention",
      url: "https://arxiv.org/abs/2501.08313",
      evidence: "短长上下文后训练配方；不是普适顺序",
    },
    {
      label: "Direct Preference Optimization",
      url: "https://arxiv.org/abs/2305.18290",
      evidence: "DPO 原始论文",
    },
    {
      label: "A General Theoretical Paradigm to Understand Learning from Human Preferences",
      url: "https://arxiv.org/abs/2310.12036",
      evidence: "IPO 原始论文",
    },
    {
      label: "KTO: Model Alignment as Prospect Theoretic Optimization",
      url: "https://arxiv.org/abs/2402.01306",
      evidence: "KTO 原始论文",
    },
    {
      label: "ORPO: Monolithic Preference Optimization without Reference Model",
      url: "https://arxiv.org/abs/2403.07691",
      evidence: "ORPO 原始论文",
    },
    {
      label: "SimPO",
      url: "https://arxiv.org/abs/2405.14734",
      evidence: "SimPO 原始论文",
    },
  ],
};

export default chapter;
