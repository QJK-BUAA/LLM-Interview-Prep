const chapter = {
  id: "21",
  slug: "post-training-data-engineering",
  part: "LLM 后训练",
  title: "后训练数据工程：获取、验证、课程与回灌",
  subtitle: "从一条数据的来源，追到它为什么值得被模型学习",
  level: "进阶",
  duration: 195,
  prerequisites: ["16", "17", "18", "19", "20"],
  tags: ["SFT", "RL Data", "Self-Instruct", "SWE-smith", "Self-Play", "DoReMi", "pass@k"],
  objectives: [
    "比较六类 SFT 数据获取路线及各自需要的监督与验证",
    "为 RL 同时设计 query、reward 和 environment 三个数据维度",
    "正确计算采样成功率与 pass@k，并据此诊断课程难度",
    "设计可追溯的去污染、质量过滤、混合与 SFT-RL 回灌流程",
  ],
  summary:
    "后训练数据不是一张问答表：SFT 需要值得模仿的轨迹，RL 需要可探索的任务、可信奖励和可复现环境。规模化获取必须与来源追踪、验证、评估隔离、token 配比和闭环停止条件一起设计。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：六种获取路线，不是六个互斥算法",
      body: String.raw`把后训练看作培养工程师：示范告诉他怎样做，练习允许他自己尝试，测例判断尝试是否正确，课程安排决定下一步练什么。复制更多讲义不等于安排了更好的练习；测例出错时，训练越充分反而可能越擅长钻漏洞。先定义目标能力和验收方式，再扩数据。

**一、Cold-start 人工标注。** 人写或精修问题、答案、推理和工具调用，建立输出格式、任务语义、安全边界与协议。少量种子可以启动生成，但“少量”不是永远最优的规模定律。检查标注规范、双人复核分歧和领域覆盖；格式正确但推理错误的精修样本仍是坏示范。SFT 不仅教格式，也会学习知识、解题方式和拒答行为。

**二、强模型蒸馏。** 对目标任务让教师生成答案或轨迹，再用学生做监督学习；多教师可覆盖不同领域。这是答案/轨迹蒸馏，不等于第 19 章在学生前缀上取得教师分布的 OPD。教师回答必须验证，且记录模型版本、提示和采样设置；不能按模型参数量断言蒸馏总比 RL 好，也不能把某个报告的算力比例推广为固定成本。

**三、拒绝采样 Rejection Sampling，简称 RS。** 让当前 checkpoint 或教师对同题多采样，用 verifier 留下通过的回答，整理成 SFT。它把已经探索到的成功行为固化下来。保留最短正确轨迹可以控制长度，却也可能丢掉必要检查或不同解法；应按能力、长度和题族分桶，而不是只有“通过/不通过”一个字段。全错题无法凭 RS 直接产生正样本，需要更多探索、更合适课程或外部监督。

**四、指令合成。** Self-Instruct 从少量人工种子生成 instruction、input、output，再过滤无效和相似项。Evol-Instruct 逐步改写任务，加入约束、具体条件或组合复杂度，并保留不同阶段的任务；题面更长不保证更难。OSS-Instruct 用真实开源代码片段锚定问题生成，降低纯空想任务的重复，但必须处理许可证、代码泄漏和题目可解性。

SelfCodeAlign 进一步从高质量片段抽取概念，生成任务、候选答案和测试，再通过沙箱执行筛选；它不要求一个更强外部教师替所有样本标注。Instruct-SkillMix 先抽取技能，再组合技能生成题，例如把“异步 IO”与“错误重试”放进同一个任务，检验组合覆盖而非只数题量。CodecLM 用目标用例和技能元数据编码需求、解码合成，Self-Rubrics 调节复杂度，Contrastive Filtering 比较目标模型与强模型回答质量来找有用样本；这不是另一种 embedding 去重。本文提到 SkillMix 时专指 Instruct-SkillMix。

**五、Agentic 合成。** 从真实工具或仓库种子出发做 Seed-then-Expand：生成任务、准备环境、运行 agent、验证结果，再整理成功轨迹。SWE-smith 在真实仓库中利用 LM 修改、AST 变异或组合修改制造缺陷，只保留会让原有通过测试失败的补丁；这一步产出修复任务，不自动产出可模仿的修复轨迹。还需 solver 真正完成任务，并确认未破坏原本正常的功能。Sol-Ver 让同一模型的求解与测试生成能力迭代改进，但同源代码和测例可能犯同一种错，仍需独立隐藏测试。

**六、自博弈与自改进。** 模型产生后续训练材料，但“自己生成”不等于不需要锚点。GASP 用真实困难目标题作 goalpost，先生成可学的较易变体，再逐步向目标题靠近。LSP 让同一个模型以 Challenger、Solver 两种角色出题和解题，实用版本加 reference-model quality self-reward，抑制无意义难题。SGALM 的正式名称是 Self-Generative Adversarial LLM，在同一模型内做生成与 Real/Fake 判别，并使用真实数据集作锚；不能描述为不需要真实数据。

STaR 是值得放在这一组对照学习的**答案监督自改进**，不是对抗博弈：用少量推理示例和有标准答案的题集，先尝试作答，失败时提供正确答案再生成理由，最后用答对的推理训练。答案条件化 rationalization 使它不只依赖“已经直接答对”的题，但生成的理由仍须审计。自博弈方法中的 RL rollout 只有通过筛选、去污染并整理成合法轨迹后，才是 SFT 材料。

这些路线会组合：人工种子引导 OSS-Instruct，教师生成候选，沙箱做 RS，再把成功轨迹用于 SFT。一个样本应记录完整来源链，而不是只填一个模糊的“synthetic”。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：八次尝试、两次成功，到底是什么指标？",
      body: String.raw`假设给训练题“修复分页接口重复返回最后一页”采样 8 条轨迹，隐藏于 agent 的训练测例判定 2 条成功。每题采样成功率为 $2/8=25\%$。这衡量当前 checkpoint、温度、工具预算和 verifier 下，一次采样的经验成功程度。

不能把它叫作 pass@8=25%。在这批八条回答中选全部八条，已经至少有一条通过；相应 pass@8 估计值是 1。若随机抽两条，全部失败的组合有 $\binom62=15$ 种，所有组合有 $\binom82=28$ 种，所以 pass@2 估计为 $1-15/28=13/28\approx46.43\%$。这里的 pass@8=1 是这道题这批样本的估计，不是模型对未来八次采样必然成功的保证。

对课程选择，2/8 提示目前能探索到成功行为，适合检查正负轨迹差异。0/8 可能是能力不足，也可能是题面不清、环境启动失败或 verifier 误判；8/8 则可能太容易，也可能测例太弱。先分解失败原因，再决定增加探索、降低难度或修复环境。

现在把两条成功轨迹用于 SFT。轨迹甲只做了字符串特判，过了公开样例却没覆盖分页边界；轨迹乙修改了状态更新并通过独立边界测试。RS 不应只看旧 verifier 的通过标记，还应重验并保留 verifier 版本。若两条来自同一基础题，不能把甲放训练、乙放评估；换变量名或重写题面不会打断它们的同源关系。

再算混合比例：数学 100 条，每条 1000 个 response token；代码 100 条，每条 4000 个。按条数是 1:1，按优化 token 却是 $100000:400000=1:4$，数学只占 20%。若要各占一半 token，必须调整采样或 token 配额，不能在配置里写“各 50%”就认为已实现。

以上百分比均由教学数据手算，不来自任何模型榜单。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "数据闭环：先隔离评估，再合成和回灌",
      body: String.raw`第一步按来源、仓库、题族和时间划分训练与评估，再让六条获取路线进入候选池。候选必须经过来源/许可证审计、去重与去污染、质量检查、环境验证。通过后才能形成两个不同产物：SFT 的可模仿轨迹，以及 RL 的任务、奖励定义和环境包。

SFT 给 RL 提供起点；RL 新探索到的轨迹进入 RS、重验和独立评估，再决定是否回灌。图中的回边只回到训练候选池，不能把评估题或评估失败案例直接反复生成成训练题。用于调课程的开发集与最终测试集也必须分开。

每次回灌保存 checkpoint、数据版本、来源祖先、采样参数、环境 digest、verifier version 和过滤理由。这样发现奖励漏洞时可以定位受污染批次、停止采样并回退，而不是从一堆无法追溯的问答中猜问题。`,
      diagram: {
        kind: "flow",
        nodes: [
          "来源 / 题族 / 时间划分",
          "冻结独立评估",
          "六类获取路线",
          "去污染 + 质量 + 合规",
          "环境执行与验证",
          "SFT 成功轨迹",
          "RL Query + Reward + Env",
          "策略 Rollout",
          "RS 重验 + 开发集门禁",
          "带版本的训练候选池",
        ],
        links: [
          [0, 1],
          [0, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [4, 6],
          [5, 7],
          [6, 7],
          [7, 8],
          [8, 9],
          [9, 3],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "把成功率、课程信号和混合目标写清楚",
      body: String.raw`**一、SFT 与 RL 的数据契约。** 令 $x$ 为任务输入，$y$ 为值得模仿的目标轨迹，$m_t\in\{0,1\}$ 为目标 token mask。SFT 用固定数据 $D$ 最小化：

$$L_{\mathrm{SFT}}=-\mathbb E_{(x,y)\sim D}
\left[\frac{\sum_t m_t\log\pi_\theta(y_t|x,y_{<t})}{\sum_t m_t}\right]$$

这是一种序列内平均的教学约定，实际也可选择全 batch token 平均。工具返回与用户输入常作为上下文而不计入 response loss；把工具 observation 当作模型目标会教模型伪造环境输出。固定轨迹依然能教会任务能力，不能把 SFT 简化成“只学格式”。

RL 则最大化 $\mathbb E_{x\sim q,\,y\sim\pi_\theta(\cdot|x,E)}[R(x,y,E)]$。$q$ 是任务采样分布，$E$ 是环境，$R$ 是奖励函数；三者共同定义训练问题。它可以没有逐 token 参考答案，但必须有可依据的反馈。数学验证可能需要 gold answer，代码验证需要规格和测例，agent 任务需要可检查终态。“无需示范解法”不等于“无需任何答案或监督”。

**二、成功率与 pass@k。** 对同一道题从固定解码策略采样 $n$ 个回答，其中 $c$ 个通过，$k$ 为推理预算且 $1\le k\le n$：

$$\hat p=\frac cn,\qquad
\widehat{\mathrm{pass@}k}=1-\frac{\binom{n-c}{k}}{\binom nk}$$

当 $n-c<k$ 时，分子组合数定义为零。$\hat p$ 是样本成功比例；pass@k 问的是 $k$ 个候选里至少一个正确。其组合估计器在通常的同分布独立采样设置下用于估计预算为 $k$ 的成功概率；各题算完再平均，不能把题间所有候选混成一个组合数。评估还必须说明是否有可信选择器：存在一个正确候选，不意味着部署系统知道该选哪一个。

若单次成功概率为 $p$，理想独立采样下 $k$ 次至少一成功的概率为 $1-(1-p)^k$。它不应简单用有限样本的 $\hat p$ 代入来冒充组合估计器。多条解答来自高度相关的同一路径、温度变化或验证器漂移时，协议改变，指标解释也要相应改变。

**三、课程为何关注有区分度的组？** 对二值奖励、每题采 $G$ 条，理想独立条件下同时出现成功和失败的概率：

$$P_{\mathrm{mixed}}=1-p^G-(1-p)^G$$

$G$ 是组大小。全对或全错的组在中心化 GRPO 中没有奖励差异，因此中间成功率往往更容易提供相对优势。但这只分析信号是否存在，不度量长期学习价值。最容易形成混合组的题未必最重要；不能从式子推出通用“20%-60% 难度最优”。应保留容易题用于能力保持、目标难题用于覆盖，并在训练 checkpoint 更新后重估难度。

**四、配比先确定计量单位。** 设域 $d$ 的样本采样概率为 $w_d$，平均有效 response 长度为 $\bar T_d$。忽略截断等因素时，预期 token 占比为：

$$\rho_d=\frac{w_d\bar T_d}{\sum_j w_j\bar T_j}$$

只有各域长度相等时，样本占比才等于 token 占比。还要区分生成 token、有效优化 token 和工具调用成本：一个被 RS 拒绝的长轨迹不贡献 SFT token，却已经消耗生成预算。

**五、DoReMi 优化的是相对可学习性，不是原始难度。** 原工作在预训练中先训练 reference，再用小 proxy 与域权重做 Group DRO，最后用平均域权重重采样目标模型训练数据。以每个 token 的 proxy/reference 交叉熵 $\ell_\theta,\ell_{\mathrm{ref}}$ 定义非负 excess loss 的域均值：

$$e_d=\mathbb E_{z\sim D_d}
[\max(\ell_\theta(z)-\ell_{\mathrm{ref}}(z),0)]$$

简化的域权重更新可写为 $w'_d\propto w_d\exp(\eta e_d)$，随后归一化；$\eta>0$ 为域权重学习率。完整算法还包含平滑等实现细节，proxy 同时学习减小加权损失。假设两个域的 reference loss 为 10 和 2，proxy loss 为 10.2 和 2.8；excess 为 0.2 和 0.8。从均匀权重、$\eta=1$ 出发，新权重约为 0.354 和 0.646，而不是把最多资源给原始 loss 为 10.2 的域。

因此 DoReMi 不是拟合 scaling law，也不是“越难越多采”。它的原证据是预训练数据混合；迁移到 SFT/RL 时，奖励噪声、重复采样和动态策略都变了，需用开发集检验，不能自动继承原论文收益。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：验证指标、来源隔离与 token 账单",
      body: String.raw`下面用标准库构造一个小型验收门禁。近重复、隐私和许可证判定在真实系统中需要专门工具或人工审计；程序只消费这些审计结果，不假装字符串比较能完成语义去污染。来源祖先必须保留完整链，而不是只检查直接 parent。

~~~python
from math import comb, exp, isclose

def pass_at_k(n, c, k):
    if not (isinstance(n, int) and isinstance(c, int) and isinstance(k, int)):
        raise ValueError("counts must be integers")
    if n <= 0 or not 0 <= c <= n or not 1 <= k <= n:
        raise ValueError("require n > 0, 0 <= c <= n, 1 <= k <= n")
    return 1.0 if n - c < k else 1.0 - comb(n - c, k) / comb(n, k)

assert isclose(pass_at_k(8, 2, 1), 0.25)
assert isclose(pass_at_k(8, 2, 2), 13 / 28)
assert pass_at_k(8, 2, 8) == 1.0
assert pass_at_k(8, 0, 8) == 0.0
assert pass_at_k(8, 8, 1) == 1.0
for invalid in [(0, 0, 1), (8, 9, 2), (8, 2, 9)]:
    try:
        pass_at_k(*invalid)
    except ValueError:
        pass
    else:
        raise AssertionError("invalid metric input accepted")

heldout_ids = {"eval-seed-001"}
heldout_groups = {"repo-eval", "family-eval"}

def sample(sample_id, domain, tokens, **changes):
    row = dict(
        id=sample_id, split="train", domain=domain, response_tokens=tokens,
        group="repo-train-" + sample_id, ancestors=[], source="licensed-seed",
        digest="hash-" + sample_id, license_ok=True, privacy_ok=True,
        semantic_overlap=False, verified=True, verifier="tests-v3",
        environment="sandbox-digest-v2", checkpoint="policy-v7",
    )
    row.update(changes)
    return row

rows = [
    sample("math", "math", 1000),
    sample("code", "code", 4000),
    sample("duplicate", "code", 4000, digest="hash-code"),
    sample("same-family", "code", 1200, group="repo-eval"),
    sample("derived", "math", 1000, ancestors=["train-parent", "eval-seed-001"]),
    sample("near-copy", "math", 1000, semantic_overlap=True),
    sample("privacy", "code", 1000, privacy_ok=False),
    sample("failed", "code", 1000, verified=False),
]

def gate(row, seen):
    if row["split"] != "train":
        return "wrong split"
    if row["id"] in heldout_ids or heldout_ids.intersection(row["ancestors"]):
        return "heldout lineage"
    if row["group"] in heldout_groups or row["semantic_overlap"]:
        return "heldout overlap"
    if not row["license_ok"] or not row["privacy_ok"]:
        return "compliance"
    if not row["source"] or not row["checkpoint"] or not row["environment"]:
        return "missing provenance"
    if not row["verified"] or row["verifier"] != "tests-v3":
        return "verification"
    if row["response_tokens"] <= 0:
        return "empty response"
    if row["digest"] in seen:
        return "duplicate"
    return None

accepted, rejected, seen = [], {}, set()
for row in rows:
    reason = gate(row, seen)
    if reason:
        rejected[row["id"]] = reason
    else:
        accepted.append(row)
        seen.add(row["digest"])
assert [row["id"] for row in accepted] == ["math", "code"]
assert rejected["derived"] == "heldout lineage"
assert rejected["same-family"] == "heldout overlap"
assert rejected["duplicate"] == "duplicate"
assert len(rejected) == 6

tokens = {}
for row in accepted:
    domain = row["domain"]
    tokens[domain] = tokens.get(domain, 0) + row["response_tokens"]
shares = {domain: count / sum(tokens.values()) for domain, count in tokens.items()}
assert isclose(shares["math"], 0.2)
assert isclose(shares["code"], 0.8)

weights, excess = [0.5, 0.5], [0.2, 0.8]
unnormalized = [w * exp(e) for w, e in zip(weights, excess)]
updated = [w / sum(unnormalized) for w in unnormalized]
assert isclose(sum(updated), 1.0)
assert updated[1] > updated[0]
print("success/pass@2/pass@8:", 2 / 8, pass_at_k(8, 2, 2), pass_at_k(8, 2, 8))
print("accepted/rejected:", len(accepted), len(rejected))
print("response token shares:", shares)
print("toy excess-loss weights:", [round(w, 4) for w in updated])
~~~

预期保留 2 条、拒绝 6 条，token 占比为 0.2/0.8，简化 excess-loss 权重约为 0.3543/0.6457。生产门禁还需保存拒绝理由的审计记录、跨版本祖先图和数据授权；评估 lineage 索引不能因为重新生成题面就被重置。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "质量控制：通过、干净、可学习，是不同要求",
      body: String.raw`**去重不等于去污染。** Exact hash 能发现相同文本，近重复检索能发现局部改写，语义审计和来源图才能进一步识别同题变体、同仓库补丁与被答案提示污染的派生题。先划分再生成，生成后还要重查。HumanEval、AIME、SWE-bench 等基准的名字不意味着它们的评估题可以直接进入训练集；应使用允许的训练划分或另建隔离任务。

**质量高不等于安全合规。** FineWeb 研究 Web 预训练数据的清洗、过滤与去重；FineWeb-Edu 的教育质量评分不是 PII、毒性或版权的通用证书。Seed-Coder 在基本规则与去重后使用 LLM 质量过滤，也讨论 SFT 质量/难度、沙箱自纠错和跨阶段去污染；这些能力不能合并成一个“高分即全部安全”的开关。需要分开检查来源许可、个人信息、机密、危险内容、正确性和教学价值。

**答案对不等于推理对。** 结果恰好正确、硬编码样例、利用环境残留文件或复制 gold，都可能通过脆弱 verifier。检查中间工具调用是否真实、测试覆盖是否独立、环境是否隔离以及答案是否可迁移到扰动输入。STaR 的答案条件化理由、教师生成的长 CoT 和自博弈胜出轨迹都不能免检。

**自生成测例不等于独立验证。** Sol-Ver、SelfCodeAlign 等循环能增加验证覆盖，但生成器与验证器共享模型或语料时容易有相关盲点。采用隐藏测试、变异测试、已知错误实现和人工样本审计，衡量 verifier 漏报，而不只统计“通过率上升”。Reward hacking 表示优化了判分漏洞，不等于真实能力提升。

**没有外部 RM 不等于没有监督。** SGALM 用真实数据；GASP 用真实目标题；LSP 实用算法用质量约束；STaR 用标准答案。VAPO 的 MC return 是已有 reward 的累计、用于 critic target，不是一种凭空增加的外部 reward。判分 self-critique 和估计未来 return 的 value critic 也不能混为一谈。

**拒绝采样会改变训练分布。** 高频简单题产出更多成功轨迹，容易挤走难题；只留最短会挤走严谨验证步骤；只追高 reward 会放大奖励漏洞。记录每个源域的候选数、通过数、去重数、保留 token 和独立通过率，才能看见真正进入训练的分布。

**课程不是固定难度阈值。** 同一题对不同 checkpoint、解码温度和工具预算的难度不同。全错组不代表永久不可学；连续失败也可能来自环境故障。先分类失败，再决定补教师轨迹、使用 GASP 式目标锚定的变体、增加探索或移出坏任务。

**飞轮不会自动上升。** 若开发集无增益、OOD/安全退化、成功轨迹越来越重复，或训练 verifier 与隐藏评估分离，应暂停回灌并调查。保留旧数据与旧 checkpoint 作为回退点，不用最终测试集反复挑配比。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "三条 RL 数据轴与可检验的 SFT-RL 飞轮",
      body: String.raw`| RL 数据维度 | 必须提供什么 | 常见获取方法 | 关键验收 |
|---|---|---|---|
| Query 获取与筛选 | 任务、规格、领域和相对难度 | 合法训练集、人工任务、指令合成、目标锚定变体 | 题族隔离、可解性、难度随 checkpoint 重估 |
| 奖励信号构建 | 可复现的评分逻辑与依据 | 答案规则、编译/单元测试、偏好 RM、rubric self-critique | 解析鲁棒、校准、隐藏审计、版本固定 |
| 环境与测例构建 | 初始状态、工具、依赖和终态检查 | 仓库容器、沙箱、数据库快照、工具模拟器 | 可重置、无答案泄漏、资源边界、测试覆盖 |

三轴缺一不可：有问题但无反馈只是未标注任务；有奖励但环境不可复现，无法判断分数变化来自策略还是依赖漂移；有环境但只有样例测例，可能奖励投机程序。数学等单轮任务的环境可以很轻量，也要固定答案解析和运行规则。多轮 agent 的环境还要记录工具 schema、权限、时间预算、错误返回和状态重置。

奖励来源与粒度应再分开：规则可能提供终局二值分，测试可给分项结果，RM 可给序列偏好，PRM 可评估步骤。不存在脱离任务的验证器“可靠性星级”；神经 RM 有偏差，规则也会写错。过程奖励难标注、步骤边界不清及策略利用漏洞都需单独评估，不能因某篇报告的负面结果就断言所有 PRM 仅适合 rerank。

**混合与课程怎么落地？** 先固定数学、代码、通用、安全和工具等目标域的评估切片，用 token 而不是只用条数记账；建立静态混合 baseline。之后每次只改一项：域权重、难度分桶、长度课程或某种合成来源。长短分阶段能用于控制早期成本，长短混合也能训练预算适应，二者都不是必须遵守的定律。SkillMix 适合补组合技能，CodecLM 适合按目标用例定向合成，GASP 适合用真实目标约束难度演化；它们都不能代替独立能力评估。

**可执行的飞轮。** 第一步，按目标任务做有审计的 SFT，得到格式与基础能力；第二步，用固定任务、奖励和环境做 RL 探索；第三步，RS 收集成功轨迹，按题族去重、用更新后的隐藏训练测例重验；第四步，与通用和安全保留集混合，训练新候选；第五步，在开发集比较正确性、多样性、成本与遗忘，满足门禁才替换旧 checkpoint。

DeepSeek-R1 报告了 cold SFT、reasoning RL、拒绝采样后与通用数据混合 SFT、再做全场景 RL 的阶段链；它证明该配置中使用了回灌，不证明所有模型都必须回到同一个 base 重训。Qwen3 的 Thinking Mode Fusion 混合 Stage 2 模型 RS 得到的 thinking 数据与另行整理的 non-thinking 数据，用模板条件化控制模式；不能说每个 query 都由同一个 RL checkpoint 生成了成对答案，也不能预设融合没有能力取舍。

验收表至少包括：固定预算 pass@1/pass@k、工具调用成功率、隐藏测试通过率、格式与安全、平均和尾部长度、去重后题族覆盖、生成/优化 token、环境失败率及数据人工审计结果。将“论文报告的流程”与“本项目建议的门禁”区分开，才能判断哪部分已经有证据，哪部分仍需实验。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试回答：从数据链路判断学习信号",
      body: String.raw`**问：SFT 数据与 RL 数据最大的区别是什么？** SFT 需要值得模仿的目标轨迹；RL 需要任务分布、可探索环境和可信奖励，不必有每个 token 的参考答案，但不能没有判分依据。两者共享来源审计与评估隔离要求。

**问：Self-Instruct、Evol-Instruct、OSS-Instruct 有何差别？** 第一个从种子生成指令输入输出并过滤；第二个逐步演化约束与复杂度；第三个用真实代码锚定生成。SelfCodeAlign 加入概念提取与执行验证，SkillMix 补组合技能，CodecLM 通过元数据贴近目标用例并做对比过滤。

**问：STaR 是“模型自己出题、自己答题”的博弈吗？** 不是。它有题集和正确答案，失败后会在答案条件下生成 rationale，再用最终答对的轨迹训练。LSP 才显式设置 Challenger/Solver；GASP、SGALM 又各有真实数据锚点。

**问：怎样判断 SWE-smith 合成出的是任务还是轨迹？** 注入缺陷并让原有测试失败只得到可验证的修复任务。要作为 SFT，必须额外运行 agent，收集确实修复且未引入回归的操作序列，并保留环境版本。

**问：DoReMi 为什么不用原始 loss 最大的域？** 原始 loss 可能主要反映噪声或不可约难度；它比较 proxy 与 reference 的 excess loss，用 Group DRO 学域权重，再将平均权重用于目标训练。原工作是预训练，后训练迁移需要重新验证。

**问：RS 数据越多，下一轮 SFT 一定越好吗？** 不一定。成功池可能高度重复、偏向简单题或被 verifier 漏洞污染，还可能挤走通用、安全和探索能力。必须看去重后覆盖、独立通过率和同预算消融，而不是只看文件行数。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：为每个数据结论附上协议",
      body: String.raw`回答时同时给出指标、数据来源、验证条件和可能的失败模式。`,
      questions: [
        {
          q: "一道题采样 8 次成功 2 次，采样成功率、pass@2 与该批次 pass@8 估计各是多少？",
          a: "成功率为 25%；pass@2=1-C(6,2)/C(8,2)=13/28，约 46.43%；pass@8 估计为 1。最后一个值不保证未来八次必成功。",
        },
        {
          q: "数学和代码各采 100 条，平均 response 长度为 1000 和 4000，是否已实现 token 1:1？",
          a: "没有。优化 token 为 10 万和 40 万，占比 20%/80%。应调整采样或 token 配额，并另计生成与工具成本。",
        },
        {
          q: "合成题改写了评估题题面、换了变量名，能加入训练吗？",
          a: "不能据此判断无污染。需检查题族、来源祖先和语义重叠；评估派生题仍应隔离，先划分再生成且生成后重查。",
        },
        {
          q: "SGALM、GASP、LSP、STaR 都可以写成无需外部数据吗？",
          a: "不可以。SGALM 用真实数据，GASP 用真实目标题，STaR 用题集与标准答案；LSP 的无额外 query 数据也不等于无预训练模型和质量约束。",
        },
        {
          q: "FineWeb-Edu 高教育质量分或 Seed-Coder 的 LLM 质量过滤，是否保证没有 PII 和版权问题？",
          a: "不保证。教育价值、代码质量、个人信息、许可证与污染是不同验收维度，必须分别审计。",
        },
        {
          q: "RL 训练分数上涨而隐藏评估下降，SFT-RL 飞轮下一步应该怎么做？",
          a: "暂停回灌，检查 verifier 漏洞、重复/污染、环境变化和遗忘；保留旧 checkpoint，用独立开发集门禁重新验证，而非继续放大有问题的数据。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Self-Instruct",
      url: "https://arxiv.org/abs/2212.10560",
      evidence: "种子指令扩增、instruction/input/output 生成及无效/相似过滤。",
    },
    {
      label: "WizardLM / Evol-Instruct",
      url: "https://arxiv.org/abs/2304.12244",
      evidence: "逐步演化指令复杂度；不把技能数与数据规模混写。",
    },
    {
      label: "Magicoder / OSS-Instruct",
      url: "https://arxiv.org/abs/2312.02120",
      evidence: "真实开源代码片段锚定合成指令。",
    },
    {
      label: "SelfCodeAlign",
      url: "https://arxiv.org/abs/2410.24198",
      evidence: "概念提取、任务/答案/测例生成与沙箱验证闭环。",
    },
    {
      label: "Instruct-SkillMix",
      url: "https://arxiv.org/abs/2408.14774",
      evidence: "提取技能并组合生成指令；区别于其他同名 SkillMix 工作。",
    },
    {
      label: "CodecLM",
      url: "https://arxiv.org/html/2404.05875",
      evidence: "目标用例元数据、Self-Rubrics 与模型回答质量差异驱动的 Contrastive Filtering。",
    },
    {
      label: "SWE-smith",
      url: "https://arxiv.org/html/2504.21798v1",
      evidence: "真实仓库中制造并验证缺陷任务；任务生成不等于成功轨迹采集。",
    },
    {
      label: "Sol-Ver",
      url: "https://arxiv.org/abs/2502.14948",
      evidence: "同模型联合改进代码求解和测试生成；不构成独立正确性证明。",
    },
    {
      label: "GASP",
      url: "https://arxiv.org/abs/2603.15957",
      evidence: "真实困难 goalpost 约束的渐进非对称自博弈。",
    },
    {
      label: "STaR: Self-Taught Reasoner",
      url: "https://arxiv.org/abs/2203.14465",
      evidence: "有答案题集、失败后答案条件化 rationalization 与正确推理回灌。",
    },
    {
      label: "Language Self-Play / LSP",
      url: "https://arxiv.org/html/2509.07414v3",
      evidence: "同模型 Challenger/Solver 角色与 reference-model quality self-reward；不泛化收敛保证。",
    },
    {
      label: "Self-Generative Adversarial LLM / SGALM",
      url: "https://arxiv.org/html/2602.01137v1",
      evidence: "真实数据锚定、同模型生成与 Real/Fake 判别。",
    },
    {
      label: "FineWeb",
      url: "https://arxiv.org/html/2406.17557",
      evidence: "Web 预训练数据清洗、去重、质量筛选；教育分数不是隐私安全认证。",
    },
    {
      label: "Seed-Coder",
      url: "https://arxiv.org/html/2506.03524v2",
      evidence: "LLM 质量过滤、SFT 难度与沙箱验证、跨阶段去污染；纠正上游错误论文编号。",
    },
    {
      label: "DoReMi",
      url: "https://arxiv.org/html/2305.10429",
      evidence: "预训练 reference/proxy 与 Group DRO excess loss 域混合，不是缩放律拟合。",
    },
    {
      label: "Evaluating Large Language Models Trained on Code",
      url: "https://arxiv.org/html/2107.03374",
      evidence: "pass@k 的至少一次成功定义与组合估计器。",
    },
    {
      label: "DeepSeek-R1",
      url: "https://arxiv.org/html/2501.12948v1",
      evidence: "cold SFT、reasoning RL、拒绝采样与通用数据混合、全场景 RL。",
    },
    {
      label: "Qwen3 Technical Report",
      url: "https://arxiv.org/html/2505.09388v1",
      evidence: "Thinking Mode Fusion：thinking RS 数据与另行整理的 non-thinking 数据混合。",
    },
  ],
};

export default chapter;
