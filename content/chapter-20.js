const chapter = {
  id: "20",
  slug: "post-training-selection-2026",
  part: "LLM 后训练",
  title: "2026 后训练前沿、方法选择与综合面试",
  subtitle: "按证据、反馈和系统约束选择方法，而不是追逐缩写",
  level: "综合",
  duration: 180,
  prerequisites: ["16", "17", "18", "19"],
  tags: ["Post-Training", "RLHF", "RLVR", "Preference", "OPD", "OPSD", "面试"],
  objectives: [
    "按八个维度比较后训练方法",
    "根据反馈、探索与算力约束选择训练路线",
    "设计可归因、可复现的后训练实验",
    "系统回答第 13 至 20 章的核心面试题",
  ],
  summary:
    "后训练没有脱离问题设置的最佳算法；先确定数据由谁产生、反馈是否可靠及其粒度，再选择策略目标、约束和系统实现，并用同预算、成对统计与失败模式监控验证。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：方法名只是八个设计旋钮的套餐",
      body: String.raw`面对 PPO、GRPO、DPO、OPD、OPSD 等缩写，最有效的整理方式不是背时间线，而是拆成八个问题：数据来自谁；反馈从哪里来；反馈是序列还是 token 粒度；是否需要外部教师；是否允许探索新轨迹；如何做信用分配；训练是在线还是离线；计算与主要失败模式是什么。

SFT 的优势是稳定便宜，但只模仿固定轨迹；DPO 用偏好对学习相对排序，省去在线 rollout；PPO 与 GRPO 用当前策略探索，可直接优化 reward，却会放大奖励漏洞；OPD 在学生状态上提供教师全分布，信号密集但教师服务昂贵；OPSD 用 privileged self-teacher 降低独立教师需求，又引入信息不对称风险。

同一项目通常不只用一个阶段。常见合理链路是：高质量 SFT 建立格式与基本能力；离线偏好优化校正交互风格；RLVR 在可验证任务上探索；OPD/OPSD 为难以信用分配的位置提供 dense signal。阶段组合的收益要通过消融证明，不能把最终提升全部归给最后一个算法。

前沿论文结果必须带证据边界。本章把原论文中的实验结论称为“论文报告”，把跨工作反复出现且机制清楚的现象称为“较稳定经验”，把本章提供的选择流程称为“教学建议”。三者的可信层级不同。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：为代码模型选后训练路线",
      body: String.raw`目标：7B 代码模型，预算 8 张 GPU；有 50,000 条专家解答、可运行单元测试，但没有可长期在线服务的 70B 教师。先逐项判断：

1. 专家解答提供 dense token，但来自教师分布，适合先做 SFT。
2. 单元测试给可靠终局 0/1，可做 RLVR，让当前模型探索不同程序。
3. 8 卡预算不适合长期维护 policy、critic、reward、reference 四套大模型，可优先比较 GRPO/RLOO，而非默认 PPO。
4. 全错题的组优势为零，可保留失败集，使用课程、增加采样或在少量样本上引入参考提示自蒸馏。
5. 没有在线大教师，不适合标准 OPD；若参考程序可靠，可小规模测试 OPSD/RLSD，并做泄漏对照。

实验顺序应是 SFT baseline → 同计算量 RLVR baseline → 只改变一个机制的变体。主指标用隐藏测试 pass@1，补充 pass@k、编译率、平均 token、训练生成 token 总量和墙钟成本。

若只报告“新方法达到 60%”而没有相同 SFT 起点、样本预算和解码设置，就无法归因。方法选择首先是实验设计问题。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从反馈条件出发的方法选择树",
      body: String.raw`先问是否有可靠的可执行 verifier。有则优先建立 RLVR baseline；没有则问能否获得稳定偏好对，有则比较 DPO/IPO/SimPO；只有高质量示范时先做 SFT。

如果存在强教师并能在学生前缀上返回 logits，可把 OPD 作为 dense on-policy 方案；没有外部教师但有部署时不可见的 reference/hint，可研究 OPSD。此时还要问 privileged signal 是否可从普通输入推断：若长 CoT 出现反思坍缩，应考虑 RLSD、H²SD、Purified OPSD 类防泄漏设计，而不是盲目延长训练。

最后再根据显存和服务限制选择 PPO critic、GRPO 组采样、RLOO、离线 preference 或 Lightning OPD。算法层和系统层必须同时可行。`,
      diagram: {
        kind: "flow",
        nodes: [
          "可靠 Verifier？",
          "RLVR: PPO/GRPO/RLOO",
          "高质量偏好对？",
          "DPO 家族",
          "强教师 Logits？",
          "OPD",
          "Privileged Context？",
          "OPSD/混合方案",
          "只有示范 → SFT",
        ],
        links: [
          [0, 1],
          [0, 2],
          [2, 3],
          [2, 4],
          [4, 5],
          [4, 6],
          [6, 7],
          [6, 8],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "用统一的“数据分布 × 信用权重 × 锚点”看目标",
      body: String.raw`许多策略更新可抽象为在某个轨迹分布 $q(y|x)$ 上，用 token 权重 $w_t$ 调整 log probability：

$$L_{\mathrm{policy}}(\theta)=
-\mathbb E_{x,y\sim q}
\left[\sum_t w_t(x,y)\log\pi_\theta(y_t|x,y_{<t})\right]
+\beta\Omega(\pi_\theta,\pi_{\mathrm{anchor}})$$

$q$ 决定训练访问哪些状态：SFT/DPO 多来自固定数据，PPO/GRPO/OPD 多由当前或旧策略 rollout。$w_t$ 决定信用：SFT 是目标 token 的统一正权重；PPO 用 GAE；GRPO 复制组相对序列 advantage；OPD 由教师与学生分布差产生逐 token 梯度。$\Omega$ 表示 reference KL、隐式 reference ratio 或其他锚点。

DPO 不能完全塞进同一个 sampled-token 形式，因为它对 chosen/rejected 的序列 margin 做 logistic 分类；但仍可用三问分析：数据是固定偏好对，信用来自 pairwise margin，锚点是 reference policy。

计算预算也可拆：

$$C_{\mathrm{total}}
=C_{\mathrm{rollout}}+C_{\mathrm{teacher/judge}}
+C_{\mathrm{forward/backward}}+C_{\mathrm{communication}}$$

SFT 几乎没有在线 rollout；PPO 有 actor 生成、reward/reference/critic；GRPO 去 critic 但每题采多条；OPD 增加教师逐 token forward；OPSD 至少有两种 context forward。比较“训练步数”而不比较生成 token 与模型调用量会失真。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：把需求转成可审计选择",
      body: String.raw`下面不是自动选算法的真理，而是迫使项目把假设显式化。输出候选后仍需同预算实验。

~~~python
def recommend_method(verifier, preference_pairs, live_teacher,
                     privileged_context, need_exploration, gpu_budget):
    candidates = ["SFT baseline"]

    if verifier and need_exploration:
        candidates.append("GRPO or RLOO")
        if gpu_budget == "high":
            candidates.append("PPO with critic")

    if preference_pairs:
        candidates.append("DPO family")

    if live_teacher:
        candidates.append("OPD")
    elif privileged_context:
        candidates.append("OPSD with leakage controls")

    return candidates

print(recommend_method(
    verifier=True,
    preference_pairs=False,
    live_teacher=False,
    privileged_context=True,
    need_exploration=True,
    gpu_budget="medium",
))
~~~

真正的实验表还应固定 base/SFT checkpoint、prompt 集、rollout 数、最大长度、采样温度、总生成 token、优化 token、GPU 时、验证器版本和评估脚本。任何一项变化都可能比 loss 名称影响更大。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：前沿结果最容易在比较协议中失真",
      body: String.raw`**只比峰值，不比预算。** 一种方法多采 8 倍 rollout 或调用更大教师，不能仅按最终分数宣称更高效。至少报告训练 token、teacher token、GPU 时和峰值显存。

**把 pass@k 提升当 pass@1 提升。** 高温多采样可提高覆盖，却不一定改善单次部署质量。必须固定 k、temperature 和 answer aggregation。

**用训练 verifier 做唯一评估。** 策略可能学会解析器漏洞。使用独立隐藏测试、不同 judge 和人工样本审计。

**忽略 base capability。** RL 往往重加权已有行为，弱基座在全错组中没有信号。先测 pass@k 是否存在可被强化的成功轨迹。

**把预印本结果当普遍定律。** 2026 OPSD、RLSD、H²SD、Purified OPSD 与 Lightning OPD 的结论来自特定模型和数据；复现前必须标注版本和适用条件。

**只看平均分。** 同时检查 OOD、长度、entropy、格式、校准、遗忘、安全和不同难度分桶。平均提升可能掩盖关键能力退化。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "后训练方法八维矩阵",
      body: String.raw`| 方法 | 数据来源 | 反馈粒度 | 教师要求 | 探索 | 在线性 | 相对成本 | 典型失败 |
|---|---|---|---|---|---|---|---|
| SFT | 专家固定轨迹 | token | 轨迹即可 | 无 | 离线 | 低 | exposure bias |
| DPO | 固定偏好对 | sequence pair | 标注/judge | 无 | 通常离线 | 中低 | 覆盖与长度偏差 |
| PPO | policy rollout | token advantage | reward + critic | 有 | 在线 | 高 | RM hacking、critic 不稳 |
| GRPO | group rollout | sequence reward 复制到 token | verifier/RM | 有 | 在线 | 中高 | 零方差组、长度偏差 |
| RLOO | group rollout | leave-one-out sequence | reward | 有 | 在线 | 中高 | 组样本方差 |
| OPD | student rollout | full-vocab token | 外部 teacher | 有 | 在线 | 高 | teacher/tokenizer 成本 |
| OPSD | student rollout | full-vocab token | 同模型 + privileged info | 有 | 在线 | 中高 | 信息泄漏、长 CoT 退化 |
| Lightning OPD | 缓存 SFT rollout | cached token signal | 一致 teacher | 弱 | 离线近似 | 中低 | teacher consistency |

没有 verifier 但有人类偏好时，DPO/PPO-RM 都可能成立；区别是是否需要在线探索。只有最终可验证答案时，RLVR 最直接；若全错题多，增加采样、课程或 dense teacher signal。需要迁移外部大模型知识且能承担 logits 服务，OPD 比只蒸馏教师答案更贴近学生状态。

决策结束后必须写“为什么不用其他方法”：这能暴露缺失假设。例如选择 OPSD 时，应明确为什么 reference 是可靠 privileged information、如何防泄漏、为何不直接 SFT reference 轨迹。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "综合面试题：从 MDP 到 2026 自蒸馏",
      body: String.raw`下面 20 题覆盖第 13 至 20 章。每题先给定义，再给公式或数据流，最后说一个失败模式。

1. **MDP 五元组是什么？** $\mathcal S,\mathcal A,P,R,\gamma$；补充马尔可夫状态必须对未来近似充分。
2. **Reward 与 return 差别？** 前者单步，后者是未来折扣奖励和 $G_t$。
3. **V、Q、A 的关系？** $A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s)$。
4. **贝尔曼期望与最优方程差别？** 固定策略加权平均与动作 max。
5. **MC 和 TD 如何权衡？** MC 低 bootstrap 偏差高方差；TD 相反且可逐步更新。
6. **Q-Learning 与 SARSA？** max 目标的 off-policy 与实际下一动作的 on-policy。
7. **DQN 为什么要 replay 和 target network？** 降样本相关、减慢目标漂移。
8. **Deadly triad 是什么？** 函数近似、bootstrap、off-policy 的不稳定组合。
9. **策略梯度为何用 log probability？** 用 $\nabla p=p\nabla\log p$ 得到可采样估计。
10. **Baseline 为何不改期望？** 只依赖状态时 score function 对动作期望为零。
11. **GAE 的 λ 控制什么？** bootstrap 偏差与 Monte Carlo 方差。
12. **经典 RLHF 四模型？** actor、reference、reward、critic。
13. **PPO clip 与 KL 区别？** 一批内相对 old 的局部约束，与相对 reference 的累计锚定。
14. **GRPO 如何去 critic？** 同 prompt 多 rollout 的组内 reward baseline。
15. **GRPO 全错组为何无梯度？** reward 全相等，中心化 advantage 为零。
16. **DPO 隐式奖励是什么？** $\beta\log(\pi_\theta/\pi_{\mathrm{ref}})$ 加 prompt 常数。
17. **DPO 与 online RL 的核心差别？** 固定偏好分布与当前策略探索闭环。
18. **OPD 比 SFT 多了什么？** 在学生生成前缀上由教师提供全分布监督。
19. **OPSD 如何不使用外部大教师？** 同模型在 privileged context 下做 teacher，普通 context 下做 student。
20. **OPSD 最大风险？** privileged teacher 信号可能不可迁移，压制无答案时必要的探索与反思。

高质量回答不以缩写数量取胜。面试官追问时，应画出数据从哪来、哪个分布在 KL 左右、哪个模型冻结、每一步的计算成本。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "最终自测：为方法选择负责",
      body: "每题给出首选方案、强基线、关键对照和停止条件。",
      questions: [
        {
          q: "有可靠数学 verifier、没有教师 logits、希望探索新解法，首个 RL baseline 选什么？",
          a: "从 GRPO 或 RLOO 这类 critic-free RLVR 开始，并保留 SFT baseline；监控零方差组、pass@k、长度和验证器漏洞。",
        },
        {
          q: "有大量静态人类偏好对、不能承担在线生成，优先比较哪类方法？",
          a: "DPO/IPO/SimPO 等离线偏好优化，并监控 chosen/rejected 两侧 likelihood、长度与 OOD 能力。",
        },
        {
          q: "OPSD 短预算分数上升但长预算 pass@k 和反思 token 下降，应怎样判断？",
          a: "视为可能的 privileged leakage 或探索坍缩；做无/错 reference 对照，比较 RLSD、H²SD 或 Purified OPSD，并在长预算 OOD 上选 checkpoint。",
        },
        {
          q: "新方法少用一半训练 step，能否直接宣称算力减半？",
          a: "不能。需统计 rollout、teacher/judge forward、优化 token、通信、GPU 时和硬件；每步成本可能完全不同。",
        },
        {
          q: "怎样证明收益来自算法而非更强起点？",
          a: "固定 base/SFT checkpoint、数据、采样、预算与评估；只改变目标机制，运行多种子并做配对统计与关键消融。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "DeepSeek-R1",
      url: "https://arxiv.org/abs/2501.12948",
      evidence: "RLVR 技术报告",
    },
    {
      label: "DAPO",
      url: "https://arxiv.org/abs/2503.14476",
      evidence: "可复现 RL 系统论文",
    },
    {
      label: "Group Sequence Policy Optimization",
      url: "https://arxiv.org/abs/2507.18071",
      evidence: "GSPO 原始论文",
    },
    {
      label: "Entropy-Aware On-Policy Distillation",
      url: "https://arxiv.org/abs/2603.07079",
      evidence: "2026 OPD 研究预印本",
    },
    {
      label: "Self-Distilled RLVR",
      url: "https://arxiv.org/abs/2604.03128",
      evidence: "2026 RLSD 原始预印本",
    },
    {
      label: "Purified OPSD",
      url: "https://arxiv.org/abs/2607.02234",
      evidence: "2026 OPSD 机制预印本",
    },
    {
      label: "H²SD",
      url: "https://arxiv.org/abs/2607.18955",
      evidence: "2026 混合自蒸馏预印本",
    },
    {
      label: "Lightning OPD",
      url: "https://arxiv.org/abs/2604.13010",
      evidence: "2026 离线 OPD 预印本",
    },
  ],
};

export default chapter;
