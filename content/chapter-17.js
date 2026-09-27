const chapter = {
  id: "17",
  slug: "grpo-rlvr-family",
  part: "LLM 后训练",
  title: "GRPO、DAPO、Dr.GRPO 与 RLOO",
  subtitle: "用组内比较替代价值模型，并看清稳定性改进",
  level: "进阶",
  duration: 155,
  prerequisites: ["15", "16"],
  tags: ["GRPO", "RLVR", "DAPO", "Dr.GRPO", "GSPO", "RLOO"],
  objectives: [
    "手算组内 reward baseline 和标准化 advantage",
    "解释 GRPO 为何可去掉 critic 以及零方差组问题",
    "比较 DAPO、Dr.GRPO、GSPO、RLOO 与 REINFORCE++",
    "识别 token/sequence 聚合、clipping 与长度偏差",
  ],
  summary:
    "GRPO 对同一 prompt 的多条回答做相对比较，以组均值替代 critic；它降低模型内存，却把稳定性转移到采样覆盖、组内方差、长度归一化和新旧策略概率比等设计上。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：同一道题内做相对排名",
      body: String.raw`经典 LLM PPO 的独立 critic 常采用相近规模骨干，增加训练资源，但其规模并非算法强制要求。GRPO（Group Relative Policy Optimization）对同一个 prompt 一次采样 $G$ 条回答，用组内奖励均值或标准差构造 baseline，不再训练独立价值模型。

例如数学题的验证器只能给最终答案 0/1。若一组中有对有错，正确回答的相对优势为正，错误回答为负，策略便提高正确轨迹 token 的概率。RLVR（Reinforcement Learning with Verifiable Rewards）指使用可自动验证奖励的强化学习范式，GRPO 是其中一种优化器，二者不是同义词。

critic-free 不等于没有 baseline，也不等于没有方差。组均值来自有限样本；组越小越噪，同组回答高度相似时有效样本更少。若全组都对或都错，奖励方差为零，标准化优势没有区分信号，这类 prompt 可能被浪费。

后续改进针对不同故障：DAPO 调整 clipping、动态采样、token 聚合和超长处理；Dr.GRPO 分析并移除特定归一化导致的长度偏差；GSPO 把 importance ratio 和 clipping 提升到序列级；RLOO 使用 leave-one-out baseline；REINFORCE++ 则使用更全局的归一化与稳定技巧。它们不能只按发布日期排成单一升级链。VAPO、CISPO、GSPO 和 SAPO 的完整比较放在第 20 章，本章先建立组采样、归一化和 DAPO 四项改进的基础。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：四条 rollout 的组内优势",
      body: String.raw`同一问题采样四条回答，验证奖励为 $[1,1,0,0]$。组均值 $\mu=0.5$，总体标准差：

$$\sigma=\sqrt{\frac{(0.5)^2+(0.5)^2+(-0.5)^2+(-0.5)^2}{4}}=0.5$$

标准化组优势为：

$$\hat A_i=\frac{R_i-\mu}{\sigma+\epsilon}
\approx[1,1,-1,-1]$$

正确回答的所有有效 response token 获得正的序列级信号，错误回答获得负信号。若奖励为 $[1,1,1,1]$ 或 $[0,0,0,0]$，每项都等于均值，优势全为零；模型即使“全错”也不知道往哪里修。

RLOO 对每条样本使用其他三条的均值。对第一条正确回答，其 baseline 为 $(1+0+0)/3=1/3$，优势为 $2/3$；对第三条错误回答，baseline 为 $(1+1+0)/3=2/3$，优势为 $-2/3$。leave-one-out 避免把自己的 reward 放进 baseline，在有限组下具有不同的估计性质。

组标准化会让同样 0/1 差异在不同通过率问题上获得不同尺度。它提供难度自适应，也可能放大标准差很小的组，因此必须监控有效组比例和优势分布。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从一组回答到策略更新",
      body: String.raw`每个 prompt 先由 rollout policy 采样多条回答。验证器检查格式、最终答案、代码测试或环境结果，得到序列奖励。组内统计产生每条回答的 advantage，再把同一回答的信号分配到有效 token，结合新旧策略概率比计算 surrogate。

数据层、信用层和优化层应分别诊断：数据层看 prompt 难度与采样多样性；信用层看奖励是否可靠、是否零方差、token 如何聚合；优化层看 ratio、clip fraction、KL、entropy 和更新步数。

动态采样可跳过当前全对或全错的组并补采有区分度的 prompt，但这会改变训练分布。若一直排除全错题，模型可能永远学不到真正困难样本；需要课程、额外监督或探索机制补足。`,
      diagram: {
        kind: "flow",
        nodes: [
          "Prompt",
          "G 条 Rollout",
          "Verifier 奖励",
          "组内 Baseline",
          "Token/Sequence 目标",
          "策略更新",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 1],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "GRPO 目标与 token、sequence 两种概率比",
      body: String.raw`对 prompt $x$ 采样 $G$ 条回答 $y_i$，奖励为 $R_i$。常见组优势：

$$\hat A_i=\frac{R_i-\operatorname{mean}(R_1,\ldots,R_G)}
{\operatorname{std}(R_1,\ldots,R_G)+\epsilon}$$

回答 $i$ 的第 $t$ 个 token 比率为：

$$r_{i,t}(\theta)=
\frac{\pi_\theta(y_{i,t}|x,y_{i,<t})}
{\pi_{\mathrm{old}}(y_{i,t}|x,y_{i,<t})}$$

一种 GRPO surrogate 对每个 token 使用同一序列优势，并做 PPO 式 clip，再对 token 与 batch 聚合。这里隐藏两个选择：是“每条序列先平均再对序列平均”，还是“所有 token 直接平均”。后者让长回答贡献更多 token，前者又可能使每个 token 权重随长度缩小，都会形成长度偏差。

GSPO 定义长度归一化的序列 likelihood ratio，例如：

$$r_i^{\mathrm{seq}}(\theta)=
\exp\left(\frac1{|y_i|}\sum_t
\log\frac{\pi_\theta(y_{i,t}|s_{i,t})}
{\pi_{\mathrm{old}}(y_{i,t}|s_{i,t})}\right)$$

然后在序列级 clipping、rewarding 与优化，使 importance unit 与序列级奖励更一致。它不是简单地把所有 token ratio 做算术平均。

Dr.GRPO 的核心批评是特定 advantage 标准差和按响应长度归一化会引入偏差；其配方移除这些项并用固定归一化尺度。具体实现应以论文和代码版本为准，不能把名称泛化为所有“改良 GRPO”。

**DAPO 的四项配方。** Clip-Higher 使用不同上下界 $1-\epsilon_{\mathrm{low}}$ 和 $1+\epsilon_{\mathrm{high}}$，例如论文配方的 0.2 与 0.28 给正优势动作更宽的上侧空间。它仍是有符号的 PPO min 目标，并非所有越界 token 都停止更新。Dynamic Sampling 在采样后过滤全对、全错组，补足有区分度的 batch；代价应包含被丢弃 rollout 的计算。

设两条回答长为 2 和 8，序列平均会给每个短回答 token 权重 $1/(2\times2)=1/4$，长回答 token 权重 $1/(2\times8)=1/16$；按全体 10 个 token 平均则每个权重都是 $1/10$。这改变的是 loss 聚合，不是把序列终局奖励变成了精确的 token 信用。

Overlong Reward Shaping 在最大长度 $L_{\max}$ 前保留宽度 $L_{\mathrm{cache}}$ 的缓冲区：缓冲区前奖励修正为 0，区间内按超出缓冲起点的比例降到 -1。必须区分真实结束与因长度上限截断，不能把“未完成”自动当成语义错误。DAPO 公开配方移除了显式 reference KL，但这是推理任务的实验选择，不能推广为所有多域训练都该去掉 KL。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：组优势与零方差过滤",
      body: String.raw`下面演示动态采样门禁。实际 DAPO 会持续补采 prompt，直到收集到足够有非零奖励方差的组，并配合其他目标改动。

~~~python
from math import sqrt

def group_advantages(rewards, epsilon=1e-8):
    mean = sum(rewards) / len(rewards)
    variance = sum((reward - mean) ** 2 for reward in rewards) / len(rewards)
    std = sqrt(variance)
    if std < epsilon:
        return None  # 此组没有相对排序信号
    return [(reward - mean) / (std + epsilon) for reward in rewards]

groups = [
    [1, 1, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [1, 0, 0, 0],
]

for rewards in groups:
    print(rewards, group_advantages(rewards))
~~~

训练日志应记录全对、全错和混合组比例。全对比例升高可能表示题目已学会，也可能是验证器被利用；全错比例高可能表示难度过大、采样温度不足或输出格式不匹配。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：去掉 Critic 不等于算法自然无偏",
      body: String.raw`**误区一：GRPO 是 PPO 减去 value model。** 组内 baseline、序列采样、奖励归一化和 token 聚合都改变了估计器，不能只按模型数量理解。

**误区二：零方差组没有信息，所以可永久删除。** 它们对组相对目标没有梯度，但全错题可能正是能力缺口。可通过更强探索、课程、蒸馏或过程反馈重新激活。

**误区三：回答变长等于推理变强。** 长度可能来自目标归一化偏差、超长截断奖励或重复。必须同时看准确率、有效推理、长度分布和单位 token 收益。

**误区四：token-level ratio 一定更细粒度。** 序列只有一个终局 advantage 时，每个 token 仍共享方向；独立 ratio 还可能破坏序列级 importance sampling 的一致性。

**误区五：可验证奖励不会被 hack。** 解析器漏洞、格式投机、测试集泄漏和不完整单测仍可能给错误解高分。验证器也需要对抗测试。

**误区六：不同开源实现里的 GRPO 完全相同。** KL 放置、std 计算、loss 聚合、clip、old-policy 更新、超长 mask 与采样策略常不同，复现实验必须记录公式与代码 commit。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "Critic-Free 家族解决的不是同一个问题",
      body: String.raw`| 方法 | Baseline / 粒度 | 主要设计 | 关键风险 |
|---|---|---|---|
| GRPO | 同 prompt 组均值与 std | 无 critic，token ratio | 零方差组、长度偏差 |
| DAPO | 组优势 | 非对称 clip、动态采样、token loss、超长 shaping | 训练分布被筛选 |
| Dr.GRPO | 组均值、固定尺度 | 去除 std 与长度归一化偏差 | reward 尺度需控制 |
| GSPO | 组优势、序列 ratio | 序列级 clipping 与优化 | token 局部修正较弱 |
| RLOO | 其他 rollout 的均值 | leave-one-out REINFORCE | 仍需多样本与可靠奖励 |
| REINFORCE++ | 全局 batch 归一化 | critic-free 稳定技巧 | 跨 prompt 难度混合 |

DAPO 是一组工程与算法配方，不只是 clip-higher：其论文同时强调动态采样、token-level policy-gradient loss、overlong reward shaping 和数据处理。Dr.GRPO 从偏差分析出发，主张更简洁的归一化。GSPO 则从 importance sampling unit 与序列奖励一致性出发。

选择时先定位失败：全错组多要改善探索或监督；长错误回答增长要查长度偏差；MoE ratio 噪声大可评估 sequence-level 方法；critic 显存不是瓶颈且 token value 有用时，PPO 仍可能更合适。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：GRPO 为什么不需要 Critic",
      body: String.raw`**30 秒回答：**“GRPO 对同一 prompt 采样多条回答，用组内平均奖励作为 prompt-specific baseline，并常用组标准差归一化，所以不再训练 $V(s)$ critic。每条回答的相对奖励作为其 token 优势，再结合新旧策略比和 clipping 更新。”

若追问局限：组采样增加生成成本；全对或全错时相对优势为零；终局奖励仍是粗粒度信用；std 与长度归一化还可能引入偏差。

若追问 GRPO 与 RLOO：二者都可用同 prompt 多样本。GRPO baseline 通常包含自身并标准化；RLOO 对每条轨迹用其余样本均值，构造 leave-one-out baseline。

若追问 GSPO：它用长度归一化的序列 likelihood ratio 做序列级 clipping 和更新，使 importance weight 与序列级 reward 对齐，并报告对 MoE RL 稳定性有帮助；这是论文实证，仍需在目标模型上验证。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：组内相对信号从哪里消失",
      body: "回答时写出 group rewards 与 baseline。",
      questions: [
        {
          q: "一组奖励 [1,0]，只减均值不除标准差时，优势是多少？",
          a: "均值为 0.5，优势为 [0.5,-0.5]。",
        },
        {
          q: "一组八条回答全部错误，GRPO 的组相对梯度为何消失？",
          a: "每条 reward 都等于组均值，中心化 advantage 全为零；没有相对优劣可学。",
        },
        {
          q: "DAPO 的动态采样主要处理什么，又带来什么风险？",
          a: "它补采有奖励方差的 prompt，减少无效组；但筛选会改变题目分布，困难的全错题可能被长期排除。",
        },
        {
          q: "GSPO 与标准 token-ratio GRPO 的核心差异是什么？",
          a: "GSPO 从整条回答的长度归一化 likelihood 构造 sequence ratio，并在序列级 clipping/优化，使权重单位与序列奖励一致。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "DeepSeekMath",
      url: "https://arxiv.org/abs/2402.03300",
      evidence: "GRPO 原始来源",
    },
    {
      label: "DAPO",
      url: "https://arxiv.org/abs/2503.14476",
      evidence: "原始论文",
    },
    {
      label: "Understanding R1-Zero-Like Training",
      url: "https://arxiv.org/abs/2503.20783",
      evidence: "Dr.GRPO 原始论文",
    },
    {
      label: "Group Sequence Policy Optimization",
      url: "https://arxiv.org/abs/2507.18071",
      evidence: "GSPO 原始论文",
    },
    {
      label: "Back to Basics: REINFORCE Style Optimization",
      url: "https://arxiv.org/abs/2402.14740",
      evidence: "RLOO 实证论文",
    },
    {
      label: "REINFORCE++",
      url: "https://arxiv.org/abs/2501.03262",
      evidence: "原始论文",
    },
  ],
};

export default chapter;
