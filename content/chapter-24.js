const chapter = {
  id: "24",
  slug: "post-training-selection-2026",
  part: "LLM 后训练",
  title: "跨模型经验、技术演进与方法选择",
  subtitle: "把算法、数据、成本和证据放进同一张决策表",
  level: "综合",
  duration: 140,
  prerequisites: ["16", "17", "18", "19", "20", "21", "22", "23"],
  tags: ["Post-Training", "OPD", "OPSD", "技术演进", "算法速查", "实验设计", "面试"],
  objectives: [
    "按数据、反馈、信用和资源八个维度比较后训练方法",
    "区分算法演进中的独立设计轴与历史时间顺序",
    "把跨模型经验和作者观点转化为可检验的实验",
    "在相同预算下设计有强基线的模型选择方案",
  ],
  summary: "后训练方法没有脱离任务的固定排名；先确定数据和反馈，再选择优势估计、概率比、约束和系统，用独立评估确认收益，而非从别家最高分反推万能配方。",
  sections: [
    {
      id: "intuition", type: "intuition", title: "先建立直觉：算法名是一组设计选择",
      body: String.raw`把后训练看成经营一所学校：题库决定学生遇到什么问题，评卷规则决定怎样算进步，教师决定如何指出错误，课表决定先学什么，再用预算安排训练次数。同一个学生成绩差，可能因为题目太难、答案标准有错，也可能因为更新过猛。直接换一个算法名字，未必碰到了真正的问题。

来源项目把 PPO、GRPO、DAPO、VAPO、CISPO、GSPO、SAPO 画成演进图。这个图适合解释问题怎样被发现，却不能当成“后一个严格替代前一个”的证明。PPO/VAPO 使用 critic，GRPO 用组统计；CISPO 改裁剪对象，GSPO 改概率比粒度，SAPO 改平滑门控。数据来源、奖励来源、优势估计、概率比、loss 聚合是不同的旋钮。

先回答八问：训练数据是谁生成的；反馈从谁而来；反馈粒度多细；需要什么教师；是否探索新轨迹；如何分配信用；在线还是离线；总成本与失败模式是什么。SFT、DPO、PPO、GRPO、OPD、OPSD 都能放到这套框架里，但不必硬凑成同一个数学目标。

历史也应分清。PPO 论文发表于 2017 年，InstructGPT 在 2022 年展示经典偏好后训练，DPO 在 2023 年简化偏好优化，DeepSeekMath 在 2024 年提出 GRPO，2025 年的推理 RL 配方与 2026 年的 Agentic RL 工作继续扩展任务和系统。它们是并行演化的路线；Alpaca、Vicuna 属于 2023 年，不能作为“2020–2022 SFT 时代”的具体发布实例。`,
    },
    {
      id: "example", type: "example", title: "最小例子：同样成功率背后的不同预算",
      body: String.raw`假设要训练一个 7B 代码助手，有 50,000 条可靠解答和可执行测试，预算有限，没有常驻大教师。合理起点是 SFT，然后比较 GRPO/RLOO 的可验证奖励训练。如果全错组很多，先检查格式和测试环境，再通过课程或示范补充可探索轨迹。只有确定需要外部教师密集监督时，才把 OPD 服务成本纳入方案；参考解答可用于 OPSD 实验，但要用无答案上下文评估。

下面是教学数字，不是任何论文成绩。方法 A 训练 100 步，每步生成 20,000 token，共 200 万；方法 B 只训 50 步，但每步生成 60,000 token，共 300 万。B 的步数减半，生成量反而增加一半。再假设 A 用 20 GPU 小时、隐藏测试成功率 60%，B 用 35 GPU 小时、成功率 63%，是否值得取决于部署要求和边际收益。

在 100 道相同测试题上，假设 A 对 B 错有 7 道、A 错 B 对有 10 道，两者共同答对 53 道，共同答错 30 道。B 比 A 高 3 个百分点，但真正决定成对证据的是 7 与 10 的不一致样本，不能把两个总成功率当成独立样本。如此少的差异不足以支持稳定优越的断言，应扩样或报告不确定性。

实验还要记录失败类型：编译失败、输出格式错误、测试漏洞、超时和真实逻辑错误。平均分相同的模型，如果一个频繁修改测试绕过验证，另一个只是偶尔算法错误，部署风险不同。`,
    },
    {
      id: "diagram", type: "diagram", title: "先诊断失败，再挑选干预",
      body: String.raw`先固定 SFT 起点、验证器和数据划分。没有可靠监督时，先补标注或验证环境；全错组意味着当前相对奖励无法提供方向，先看探索；分数上升而独立质量下降，先查 reward hacking；高 ratio、clip fraction 或引擎误差，先查系统和更新幅度。

选择过程不是一条只能向前走的链。数据工程可以与任何算法配合，MoE 路由一致性与序列比率可以互补，跨阶段 OPD 也可以接在推理和 Agent 训练之后。图中每条边表示一个诊断分支，不能把并列手段误读为必须连续执行的阶段。

确认候选后，每次只改变一个关键机制；若同时换题库、扩大 rollout、换教师和换 loss，结果只能归于整套系统，不能独立宣称算法贡献。`,
      diagram: {
        kind: "flow",
        nodes: ["固定起点与评估", "检查数据和反馈", "探索不足 → 课程/示范", "更新失稳 → ratio/系统", "多域遗忘 → 混合/蒸馏", "同预算对照", "独立验证与选型"],
        links: [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5], [5, 6]],
      },
    },
    {
      id: "derivation", type: "derivation", title: "统一分析框架与成对实验口径",
      body: String.raw`设输入为 $x$、完整轨迹为 $y$、数据分布为 $q(y|x)$、可训练策略为 $\pi_\theta$，冻结的信用权重为 $w_t$，锚点约束为 $\Omega$，系数为 $\beta$。许多更新可示意为：

$$L(\theta)=-\mathbb E_{x,y\sim q}\sum_t w_t\log\pi_\theta(y_t|x,y_{<t})+\beta\Omega$$

这是拆解工具而非所有算法的精确等式。SFT 用示范与正权重，策略梯度用优势，CISPO 可用裁剪后 detached ratio 乘优势；DPO 对 chosen/rejected 的序列 margin 做 logistic 分类；全词表 KL 蒸馏则直接比较分布。必须回到各章的原始目标看导数和采样处理。

设生成、教师评审、优化前反向与通信成本分别为 $C_r,C_t,C_u,C_c$，总成本：

$$C_{\mathrm{total}}=C_r+C_t+C_u+C_c$$

成本表应同时提供 token 数、GPU 时、硬件和峰值显存，而非把所有项目混成一个无单位指标。

对成对二元测试，记 $b$ 为 A 对 B 错的题数，$c$ 为 A 错 B 对的题数。在零假设下，$X\sim\operatorname{Binomial}(b+c,1/2)$。双侧 exact McNemar 检验可用：

$$p=\min\left(1,\ 2P[X\leq\min(b,c)]\right)$$

它不利用共同正确和共同错误项来证明差异。若比较 $m$ 个方法，将 $p$ 值排序为 $p_{(1)}\leq\cdots\leq p_{(m)}$，Holm 校正依次比较 $p_{(j)}$ 与 $\alpha/(m-j+1)$，遇到首个不拒绝即停止；不能只选最小的一个报告。

pass@k 也不是 k 次采样的平均通过率：它关心至少一个成功的覆盖。部署只生成一次就报告 pass@1；多采样评估还要固定温度、预算与选择机制。`,
    },
    {
      id: "code", type: "code", title: "代码实验：先核对预算，再算成对差异",
      body: String.raw`下面只用 Python 标准库，可直接运行。每个数字来自上一节教学例子。它不会自动决定哪种算法最好，而是防止“步数更少”与“成绩更高”被当成充分证据。

~~~python
from math import comb

def exact_mcnemar(b, c):
    n = b + c
    if n == 0:
        return 1.0
    tail = sum(comb(n, k) for k in range(min(b, c) + 1)) / 2 ** n
    return min(1.0, 2 * tail)

experiments = {
    "A": {"steps": 100, "tokens_per_step": 20_000, "gpu_hours": 20},
    "B": {"steps": 50, "tokens_per_step": 60_000, "gpu_hours": 35},
}
for name, cfg in experiments.items():
    tokens = cfg["steps"] * cfg["tokens_per_step"]
    print(name, tokens, cfg["gpu_hours"])
print("paired p:", exact_mcnemar(7, 10))
~~~

真实实验应保存每题预测与判定，让别人可以重算 b、c。不同 seed 的训练差异不能用同一模型重复解码完全代替；若主结果来自固定 seed，也应说明不确定性来自哪一层。`,
    },
    {
      id: "pitfall", type: "pitfall", title: "五个挑战与九条观点该怎样检验",
      body: String.raw`来源归纳的五个挑战仍值得保留：信任域如何兼顾学习与约束；critic 怎样兼顾成本和估计质量；开放任务如何获得可靠反馈；长序列怎样选择信用与聚合粒度；多阶段怎样减轻遗忘。但它们互相影响，不能用一次实验宣布全部解决。token ratio 不自动赋予 token 因果信用，非可微验证器也会被利用。

来源作者的九条观点在本课程中作为研究假设：

1. **硬裁剪走向软门控。** 比较相同起点、同预算的边界梯度与稳定性；L1/L2 类比只帮助理解，不是理论等价证明。
2. **Value-based 与 value-free 取决于规模。** 分别测 critic 成本、价值误差与收益；不能按未经证实的 100B/200B 参数阈值一刀切。
3. **Query 选择被低估。** 用随机、静态难度和动态筛选做等生成预算对照，包括丢弃样本的成本。
4. **算法边际收益递减。** 需同一测试、模型和预算序列才能判断；不同论文分数差不能拼成下降曲线。
5. **RL 先选择后教授。** 比较固定采样预算下基座与训练后覆盖，设计新任务泛化对照；“aha”词出现不能证明预训练从未见过此行为。
6. **产业形成大教师与小学生两层。** 是经济观察，应计算教师训练摊销、访问限制和任务迁移成本。
7. **数据构造比算法更重要。** 在固定算法下消融题库，在固定题库下消融算法，才能比较贡献。
8. **门控将自动适应任务。** 学习温度或粒度需要验证是否稳定、是否额外过拟合。
9. **终局是数据飞轮。** 追踪多轮自生成数据的独立质量与分布漂移，避免自评分越来越高、真实能力越来越窄。

这些观点不能写成“行业已证明”。它们的价值在于提出实验，而不是替代实验。`,
    },
    {
      id: "comparison", type: "comparison", title: "方法速查与六条有边界的跨模型经验",
      body: String.raw`| 方法 | 数据/反馈 | 信用与比率 | 主要资源和风险 |
|---|---|---|---|
| SFT | 固定示范、目标 token | 监督 NLL | 便宜稳定；前缀分布错配 |
| DPO | 固定偏好对 | 相对 reference 的 margin | 不需在线 rollout；覆盖受限 |
| PPO / VAPO | 策略生成、奖励 | critic + GAE；token ratio | critic 资源与估计误差 |
| GRPO / DAPO | 同题组采样、RM 或 verifier | 组优势；token ratio | 零方差组、长度与采样偏差 |
| CISPO | 策略生成、组奖励 | detached 的裁剪 token 权重 | 保留 log-prob 更新；仍要控偏差 |
| GSPO | 策略生成、序列奖励 | 长度归一化 sequence ratio | 共享序列权重；不是完整 IS 乘积 |
| SAPO | 策略生成、优势 | 连续软门控 | 温度和数值稳定性需验证 |
| OPD / OPSD | 学生轨迹、教师分布 | 分布差或 token 教师信号 | 教师计算；OPSD 额外信息不可迁移 |
| RLOO | 同题多样本奖励 | 其余样本均值 baseline | 样本方差与生成成本 |

六条跨模型经验可作为起点，不能视为定律：SFT 的规模与内容应服务于后续探索，而不是“越少越好”；裁剪与门控应根据 ratio 和有效梯度诊断；MoE 需要检查路由与引擎一致性，但非 MoE 也会失稳；Query 质量与覆盖共同决定训练价值；大教师蒸馏对小模型常有吸引力，但需摊销教师和监督成本；数据、系统与算法共同决定结果，不能固定宣称其中一个永远更重要。

具体选型顺序：只有示范先做 SFT；有可靠静态偏好且生成预算小可先 DPO；有可验证任务且需要探索可比较 GRPO/RLOO/PPO；能服务教师 logits 可比较 OPD；有参考答案但没有外部教师可小规模做 OPSD 及泄漏对照。之后再用本章实验协议比较，不能根据方法名直接选赢家。`,
    },
    {
      id: "interview", type: "interview", title: "从 MDP 到蒸馏的二十问",
      body: String.raw`**30 秒总答：**“我先检查任务、数据与反馈，再选信用分配和更新约束，最后比较完整系统成本。算法名不是实验设置；我会用固定 checkpoint、独立测试和同预算消融验证选型。”

1. MDP 五元组？状态、动作、转移、奖励和折扣；状态要对未来信息充分。
2. reward 与 return？单步反馈与未来折扣和。
3. V、Q、A？状态价值、动作价值，优势是 Q 减 V。
4. 贝尔曼期望与最优方程？固定策略平均与选择最优动作。
5. MC 与 TD？完整回报采样与 bootstrap 的偏差方差权衡。
6. Q-Learning 与 SARSA？最大化下一动作与使用实际下一动作。
7. replay 与 target network？减弱样本相关和目标快速漂移。
8. deadly triad？函数近似、bootstrap、off-policy 相互作用可能不稳定。
9. 为什么是 log-prob 梯度？利用概率导数等于概率乘 log 概率导数。
10. baseline 何时不改变期望？固定状态下不依赖被采样动作，满足 score-function 条件。
11. GAE 的 lambda？调节多步 TD residual 加权范围。
12. 四模型角色？actor、reference、reward、critic；逻辑不同，不要求四份同规模常驻。
13. clip 与 reference KL？本批 old-policy 约束与跨批 reference 锚点。
14. GRPO 怎样去 critic？同题多样本估计相对奖励。
15. 全错组为什么无组相对信号？相同奖励减均值为零，但可加入其他监督。
16. DPO 隐式奖励？beta 乘 policy/reference log-ratio，加上只依赖 prompt 的常数。
17. DPO 与在线 RL？固定偏好覆盖与当前策略探索。
18. OPD 与 SFT？学生前缀上的教师监督与固定示范前缀。
19. OPSD 教师来源？同模型在额外信息上下文下提供目标。
20. OPSD 与跨阶段 OPD？特权上下文教师与前序 checkpoint 教师，信息来源不同。

追问算法演进时再补：DAPO 改四个配方组件，VAPO 修复 critic 学习，CISPO 裁权重，GSPO 改序列尺度，SAPO 软门控。指出一个适用条件，比给它们排单一优劣名次更有信息。`,
    },
    {
      id: "quiz", type: "quiz", title: "自测：为选择和归因负责",
      body: "每题说出结论、比较口径和一个必要对照。",
      questions: [
        { q: "B 训练步数减半但生成 token 多一半，可以说算力减半吗？", a: "不能。还需计入教师、更新、通信与硬件时间，步数不是成本单位。" },
        { q: "为什么不能用两个不同论文中的 AIME 分数差推导算法演进收益？", a: "模型、年份、数据、预算和解码协议可能不同，混杂因素没有控制。" },
        { q: "同题成对测试 A 对 B 错 7 题、反向 10 题，McNemar 使用哪部分？", a: "用 17 道不一致题的方向分布；共同正确或错误不提供方向证据。" },
        { q: "奖励没有梯度能否排除 reward hacking？", a: "不能。策略仍可通过采样与奖励选择发现验证器漏洞，规则和沙箱同样需要独立检验。" },
        { q: "来源作者认为数据飞轮是终局，应怎样纳入课程？", a: "标为作者假设，给出独立质量、覆盖和退化监控的检验方案，不写成事实。" },
      ],
    },
  ],
  sources: [
    { label: "Post-Training 演进与观点（固定源版本）", url: "https://github.com/XavierZhang2002/agentic-rl-analysis/tree/66ae4423b36270ef50a288fb1bb2e1b31c46c329/docs/post-training/ch3", evidence: "二级综述；作者观点在本章明确作为待检验假设" },
    { label: "PPO", url: "https://arxiv.org/abs/1707.06347", evidence: "原始目标和 2017 年时间点" },
    { label: "InstructGPT", url: "https://arxiv.org/abs/2203.02155", evidence: "经典偏好后训练实例" },
    { label: "DPO", url: "https://arxiv.org/abs/2305.18290", evidence: "原始偏好目标" },
    { label: "DeepSeekMath", url: "https://arxiv.org/abs/2402.03300", evidence: "GRPO 来源；奖励来源与优化算法应区分" },
    { label: "GLM-5", url: "https://arxiv.org/html/2602.15763v1#S3", evidence: "多阶段后训练和跨阶段蒸馏的工业实例" },
  ],
};

export default chapter;
