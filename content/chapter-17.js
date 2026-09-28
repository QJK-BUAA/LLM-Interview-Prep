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
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：组估计、归一化与 DAPO 配方",
      body: String.raw`先修 PPO 的有符号裁剪、采样分布与 baseline 证明。按“完整 GRPO 目标 → 自身进入 baseline 的偏差 → std/长度归一化 → RLOO → DAPO 四项”学习。不要把去 critic、去 RM 和去 reference 三个决定混在一起。面试必须能写分母、说明组样本是否独立，并给全同奖励和变长回答的反例。`,
      links: [
        { label: "完整 GRPO 目标", sectionId: "derivation", level: "必会" },
        { label: "组标准化与 RLOO", sectionId: "math-normalization-rloo", level: "推导" },
        { label: "DAPO 与长度聚合", sectionId: "math-dapo", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
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

明确 outcome-supervision 的常见完整写法。令 $T_i$ 是有效 response token 数（含实际生成的 EOS，不含 prompt/padding），$\mu=G^{-1}\sum_iR_i$，教学约定 $\sigma^2=G^{-1}\sum_i(R_i-\mu)^2$、$\hat A_i=\operatorname{sg}[(R_i-\mu)/(\sigma+\epsilon_{\rm std})]$。最大化：

$$J_{\rm GRPO}(\theta)=
\mathbb E_{\substack{x\sim D\\y_{1:G}\sim\pi_{\rm old}(\cdot|x)}}
\left[\frac1G\sum_{i=1}^G\frac1{T_i}\sum_{t=1}^{T_i}
\left\{\min\left(r_{i,t}\hat A_i,
\operatorname{clip}(r_{i,t},1-\epsilon,1+\epsilon)\hat A_i\right)
-\beta k_{i,t}(\theta)\right\}\right]$$

$$k_{i,t}(\theta)=
\frac{\pi_{\rm ref}(y_{i,t}|s_{i,t})}{\pi_\theta(y_{i,t}|s_{i,t})}
-1-\log\frac{\pi_{\rm ref}(y_{i,t}|s_{i,t})}{\pi_\theta(y_{i,t}|s_{i,t})}$$

reference 固定，old 是本批 rollout 策略，current $\theta$ 可训练；old log-prob、奖励和组统计停止梯度，ratio 分子与显式 KL 项保留梯度。这里展示的是原始形式的采样 KL surrogate，不能声称多 epoch 旧样本平均始终等于当前分布 KL，更不能把固定样本 k3 的梯度当作精确 reverse-KL 梯度；第 16 章给出条件。全同奖励时只有相对奖励项为零，KL 项仍可能更新。

组样本假设条件独立采样；共享随机种子、去重、best-of-N 选择都会改变估计性质。标准差用总体还是样本分母、epsilon 加在开方内还是外，都应报告。本章数字用总体标准差，不能把代码库默认的无偏样本标准差混入手算。

“每条序列先平均再对序列平均”和“所有 token 直接平均”是不同目标。后者让长回答贡献更多 token，前者使每个 token 权重随长度缩小。也不能把任一种归一化称为对原始序列奖励目标的无偏梯度。

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
      id: "math-normalization-rloo",
      type: "derivation",
      title: "从含自身的组均值到 RLOO：无偏条件与标准差效应",
      body: String.raw`先研究没有 clip、没有长度平均、没有 std 的 on-policy 序列梯度。令 $u_i=\nabla\log\pi_\theta(y_i|x)$，同 prompt 的 $G>1$ 条轨迹条件独立，$g=\mathbb E[u_iR_i|x]$。由于 $\mathbb E[u_i|x]=0$，对 $j\ne i$ 有 $\mathbb E[u_iR_j|x]=0$，但自身项不消失：

$$\mathbb E[u_i(R_i-\bar R)|x]
=g-\frac1Gg=\left(1-\frac1G\right)g$$

含自身 baseline 会产生有限组的缩小因子。RLOO 使用其他样本：

$$b_{-i}=\frac1{G-1}\sum_{j\ne i}R_j,\quad
A_i^{\rm LOO}=R_i-b_{-i}
=\frac{G}{G-1}(R_i-\bar R)$$
$$\hat g_{\rm LOO}=\frac1G\sum_i\operatorname{sg}(A_i^{\rm LOO})u_i,\qquad
\mathbb E[\hat g_{\rm LOO}|x]=g$$

这依赖条件独立、同策略采样、序列 log-prob 求和和冻结奖励。加 clip、长度平均、同组随机 std 后不再自动成立；“RLOO baseline 无偏”不证明任意名为 RLOO 的训练配方无偏。

**数值例。** 奖励 $[1,1,0,0]$，中心化为 $[0.5,0.5,-0.5,-0.5]$，RLOO 为 $[2/3,2/3,-2/3,-2/3]$，总体 std 标准化为 $[1,1,-1,-1]$。若使用样本标准差 $\sqrt{1/3}$，优势变为约 $\pm0.866025$，不是同一个梯度尺度。

对于二元奖励，设组内通过比例 $p=k/G$，$0<p<1$，忽略 epsilon：

$$\sigma=\sqrt{p(1-p)},\quad
A_{\rm correct}=\sqrt{\frac{1-p}{p}},\quad
A_{\rm wrong}=-\sqrt{\frac{p}{1-p}}$$

$[1,0,0,0]$ 给 $[\sqrt3,-1/\sqrt3,-1/\sqrt3,-1/\sqrt3]$，稀少的正确样本被放大。随机分母又与自身奖励相关，这不是简单减去动作无关 baseline。正仿射奖励变换在 epsilon=0 时不改变标准化 A，但改变 RLOO 的尺度；epsilon 非零时尺度不变性仅近似成立。

当 $p=0$ 或 1，直接计算会 $0/0$；加 epsilon 或跳过可避免 NaN，但不能制造方向。$G=1$ 时组中心化为零，RLOO 分母为零不可用；第 19 章教师差值能用单样本，是另一种信号而非这一公式。`,
    },
    {
      id: "math-dapo",
      type: "derivation",
      title: "DAPO 四项的公式、长度分母和筛选分布",
      body: String.raw`**1. Clip-Higher。** 令 $l=1-\epsilon_{\rm low}$、$u=1+\epsilon_{\rm high}$，仍使用 $f(r,A)=\min(rA,\operatorname{clip}(r,l,u)A)$。扩大上界只延后正优势侧的封顶，不取消负优势侧的纠偏梯度。论文的一组上下参数为 0.2、0.28，它们不是所有任务的最佳设置。

**2. Dynamic Sampling。** 对二元正确性过滤 $0<\sum_iR_i<G$ 的组并补采。若单次成功率 p 且条件独立，则保留概率：

$$P({\rm keep}|x)=1-p(x)^G-(1-p(x))^G,\qquad
D_{\rm keep}(x)\propto D(x)P({\rm keep}|x)$$

因此过滤更改了 prompt 分布；$G=4,p=0.5$ 时保留率 0.875，不是 1。难题全错不代表永远不可学；统计总生成成本时必须包括丢弃的 rollout。连续奖励下“非零方差”和“有对有错”不是同一判据。

**3. Token-level loss。** 对一个已保留的 prompt 组，写出不含显式 KL 的 DAPO surrogate：

$$J_{\rm DAPO}=
\mathbb E_{\rm kept\ groups}
\left[\frac{\sum_i\sum_{t=1}^{T_i}f(r_{i,t},\hat A_i)}
{\sum_iT_i}\right]$$

若实现把多个 prompt 的整个 minibatch token 一起平均，分母要改为该 batch 的总 token，且 prompt 权重也随总长度改变。对比 Dr.GRPO 的固定尺度奖励项：

$$J_{\rm DrGRPO,reward}=
\mathbb E\left[\frac1{G L_{\max}}\sum_i\sum_{t=1}^{T_i}
f(r_{i,t},\operatorname{sg}(R_i-\bar R))\right]$$

它去掉随机 std 和单条实际长度分母；$L_{\max}$ 是预先固定的尺度，不是当前 batch 平均长度。这消除所讨论的特定归一化偏差，但不消除自身 baseline、clip、旧数据和采样选择的所有偏差。

教学例两条回答长度 $[2,8]$、优势 $[1,-1]$，所有 ratio=1、KL=0。序列先平均目标为 0；组内 token 平均为 $(2-8)/10=-0.6$；固定 $G L_{\max}=20$ 时为 -0.3。虽然序列优势和为零，token 聚合不一定为零。这只是该 batch 的目标值，不代表梯度向量恰好按这三个数排序。

**4. Overlong Reward Shaping。** 软长度修正为：

$$R_{\rm length}(T)=
\begin{cases}
0,&T\leq L_{\max}-L_{\rm cache}\\
\frac{L_{\max}-L_{\rm cache}-T}{L_{\rm cache}},
&L_{\max}-L_{\rm cache}<T\leq L_{\max}\\
-1,&T>L_{\max}
\end{cases}$$

叠加到任务奖励，而不是改写为 token 级因果标签。教学取 $L_{\max}=10,L_{\rm cache}=2$，长度 8、9、10 的惩罚为 0、-0.5、-1。真正在硬上限停止的回答还涉及截断样本的 mask/有效性处理；软惩罚、丢弃超长样本和 bootstrap 是不同操作，应分别记录。`,
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
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：组统计、偏差与长度反例",
      body: "先写采样和归一化假设，再回答算法名称。",
      questions: [
        {
          q: "G=4、奖励 [1,1,0,0]。分别算中心化、总体 std 标准化与 RLOO 优势，并证明 RLOO 的缩放关系。",
          a: String.raw`$\bar R=0.5,\sigma=0.5$，结果为 $\pm0.5,\pm1,\pm2/3$。$R_i-(G\bar R-R_i)/(G-1)=G(R_i-\bar R)/(G-1)$。独立同策略样本下，其他轨迹奖励与本条 score 的乘积期望为零。**得分点：**三种分母；$G>1$；无偏性不延伸到随机 std 或 clip。`,
        },
        {
          q: "长度 [2,8]、优势 [1,-1]、ratio 均为 1。算序列平均、token 平均和固定分母 20 的目标，说明反例。",
          a: String.raw`序列平均 $(1-1)/2=0$；token 平均 $(2-8)/10=-0.6$；固定分母 $(2-8)/20=-0.3$。组优势和为零不代表 token loss 为零，长短样本的权重不同。**得分点：**明确求和单位；不把 scalar loss 大小当梯度方向；不宣称 token 平均就是精确信用分配。`,
        },
        {
          q: "四条回答全错时，哪些 GRPO 项没有信号？动态采样能解决什么，不能保证什么？",
          a: String.raw`中心化奖励全零，标准化必须处理 $\sigma=0$。相对奖励 surrogate 无梯度，但显式 reference KL 等正则仍可能有梯度。动态采样补充混合组，改变为 $D_{\rm keep}\propto D[1-p^G-(1-p)^G]$；全错难题可能长期被排除。**得分点：**奖励项与完整 loss 区分；无 NaN；数据分布和丢弃成本。`,
        },
        {
          q: "证明含自身组均值 baseline 的原始 on-policy 序列梯度有 (G-1)/G 因子。G=1 能否改用 RLOO？",
          a: String.raw`令 $u_i=\nabla\log\pi(y_i|x)$。交叉项 $\mathbb E[u_iR_j]=0$，自身项 $\mathbb E[u_iR_i]=g$，故 $\mathbb E[u_i(R_i-\bar R)]=g-g/G$。$G=1$ 中心化全零，RLOO 除以零，不能使用。**得分点：**条件独立；用完整序列 score；不能把教师差值单样本算法称为组均值特例。`,
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
