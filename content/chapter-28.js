const chapter = {
  id: "28",
  slug: "agent-environments-training-systems",
  part: "Agentic RL",
  title: "环境合成与训练系统",
  subtitle: "让任务可验证、轨迹可追溯、异步更新仍有正确含义",
  level: "前沿",
  duration: 190,
  prerequisites: ["11", "17", "23", "25", "26", "27"],
  tags: [
    "Environment", "Verifier", "SWE", "Terminal", "Search", "TITO",
    "IcePop", "DSA", "MoE", "Partial Rollout", "Forge",
    "Agent Swarm", "PARL", "ABE", "Agent World Model", "ASTRA", "GEM",
  ],
  objectives: [
    "把训练样本拆成任务、环境、验证器与轨迹四种产物",
    "设计 SWE、Terminal 和 Search 的合成与验收流程",
    "检查异步轨迹的 token、版本、上下文与损失掩码",
    "区分 IcePop 训推校正、PPO 更新裁剪及离散路由一致性",
    "计算 partial rollout、前缀共享与多 Agent 并行的收益边界",
  ],
  summary:
    "Agent 训练不仅需要题目，还需要能执行的世界、可信验证器与可还原的轨迹协议。本章沿任务生产到异步更新的链路，解释 TITO、IcePop、DSA/MoE 路由、前缀复用和 PARL，并把环境生成与轨迹合成严格区分。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：考题、考场、阅卷规则和答题记录",
      body: String.raw`训练一个修复软件的 Agent，就像组织一次可重复的操作考试。Issue 是考题，固定版本的代码仓库与依赖是考场，测试是阅卷规则，模型读取文件、执行命令、修改代码的过程是答题记录。只收集“问题和正确补丁”，并没有得到一个可以在线强化学习的环境。

**任务 task**说明目标、约束和初态；**环境 environment**定义可执行动作、状态转移与观测；**验证器 verifier**把最终产物或中间状态映射为奖励；**轨迹 trajectory**记录实际动作、工具返回、模型版本和生成概率。这四种产物必须通过任务 ID、环境版本与轨迹 ID 关联。环境变了而测试没变，或轨迹少了一次工具返回，都可能让同一个奖励失去原来含义。

Kimi K2 的工具数据流程从工具规范出发，再生成 Agent、任务和交互轨迹，结合真实 MCP 工具规范与合成工具。MCP 是连接约定，不自动提供可解题目和正确奖励。对于能执行验证的任务，可以用 RLVR；对偏好等难以完全验证的目标，报告还使用 self-critique rubric reward。后者是评价模型和规则提供的信号，不能冒充可执行环境的客观真值。

环境生成也不必等于“让 LLM 随口编一个工具返回”。Agent World Model（AWM）生成由代码和数据库支撑的可执行环境，工具会改变数据库状态，验证器可查询状态检查结果。它和自由文本模拟器的主要区别是转移与状态可以执行、检查和重放；但若生成的业务规则本身错了，可执行性仍不能证明现实有效性。

训练系统的另一半是时间。同步训练等所有 rollout 完成再更新，长任务容易拖住短任务；异步系统让训练和采样解耦，GPU 可以持续工作，却会收到旧策略甚至混合多个策略版本生成的轨迹。GLM-5 的做法包含版本追踪与过期过滤。freshness 是控制策略滞后，不是把异步数据重新命名为严格 on-policy；是否需要 critic 取决于算法，而不是由异步架构决定。

因此系统的核心契约不是“队列能跑通”，而是训练器能回答：这些 token 是谁在什么上下文、用哪个版本生成的，哪些位置有策略损失，奖励是否来自一次有效环境运行。TITO（Token-in-Token-out）先保存原始 token 流，防止重新分词改变动作序列，后续才有条件比较同一前缀上的训推概率。吞吐优化必须保住这个契约。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：三类任务怎样变成可训练数据",
      body: String.raw`**SWE：修复空列表输入。** 任务要求函数在空列表时返回零，同时保持正常输入行为。环境锁定 base commit、依赖和测试命令。补丁前，两个 Fail-to-Pass（F2P）测试失败，三个 Pass-to-Pass（P2P）测试通过。补丁后只有两个 F2P 和两个 P2P 通过，总体 4/5，不能说任务已解决：一个原来通过的行为回归了。若采用全部要求通过的二元奖励，此补丁奖励为零；2/2 F2P、3/3 P2P 才得到一。

SWE 的基本生产链是 Issue-PR 种子、固定初态、构建依赖、提取 F2P/P2P、验证参考补丁、评测新补丁。依赖下载失败属于基础设施错误，应与有效运行后测试失败分开。退出码为零也可能只是测试根本没收集到，因此还要检查测试列表和每项状态。

**Terminal：配置一个可工作的服务。** 可以从已有任务种子扩展，或从技术文档提取技能生成任务草案，再落实容器、输入文件、测试与参考解。Harbor 的任务结构包括 instruction.md、task.toml、environment/、solution/ 和 tests/。参考解在干净环境中应通过，空操作和一个针对性错误解应失败；这三种验收比“生成模型说任务没问题”更有信息。

例如任务要求监听指定端口且返回特定 JSON，验证器应实际发请求并检查内容，而不是搜索配置文件中是否出现端口号。参考解和测试答案不应暴露给被训练 Agent，奖励文件也不能由 Agent 自己随意写成一。上述检查是实现建议，不是声称某个报告已经公开全部隔离细节。

**Search：从证据图生成多跳题。** GLM-5 报告用早期访问网页构建 Web Knowledge Graph（WKG），抽取实体与关系后组合问题，并过滤不需要工具或少数步骤即可解决的题，再检查候选答案与标注的一致性。题目应保存支持答案的网页、证据片段和采集时间，否则网页变化后很难区分模型退化与证据消失。

MiniMax 的后续报告还支持迭代改写问题、隐去部分实体线索，并以真实检索证据验收。这里不把未经独立核验的三种固定改写名称当作官方配方。短事实题可以有规范答案；开放研究任务应按证据覆盖、引用支持与约束满足评价，不能都压成唯一短字符串 exact match。

**一个异步轨迹。** 当前训练版本为 12，一条轨迹两次生成分别来自版本 9 和 11。若允许的最大版本差是 2，最旧版本差为 3，应整条拒收；只看最后一次生成就会误判为新鲜。另一条由 11 和 12 生成的轨迹可以通过版本检查，但仍需要核对 token 与概率。

**两种概率差异。** 同一 token 的旧推理概率为 0.20，旧训练引擎概率为 0.24，新训练概率为 0.30。旧权重训推差是 1.2，策略更新比是 1.25，新训练与旧推理总比是 1.5。三者不同：先核对比较的引擎、checkpoint 和上下文，才知道应该校正哪一项。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从任务工厂到异步更新",
      body: String.raw`任务工厂同时交付任务说明、可执行环境和验证器。参考解、空操作与错误解验收通过后，任务才进入 rollout 队列。采样引擎通过 Gateway 记录轨迹，工具运行在隔离环境，验证器在可控边界内产出状态和奖励。Data Pool 保存可追溯记录，而不是只保存回答文本与分数。

TITO 是 Token-in-Token-out。GLM-5 的 Gateway 拦截生成请求，保留推理引擎真实使用的 token IDs 与输出 token 流，避免先 decode 成文本再重新 tokenize。后者可能因空白、特殊 token、chat template 或截断处理改变序列，导致训练器对错误前缀计算 log-prob。TITO 不是“工具输入输出网关”的缩写，虽然同一系统也可以负责工具编排。

训练入口先检查轨迹身份、环境运行状态、token 与角色、loss mask、策略版本和 log-prob，再计算训练概率、执行所选校正与更新。权重同步回采样引擎后，下一个生成段可以使用新版本，所以版本信息应按生成段或 token 记录，不能给整条长轨迹随意标一个最新版本。

图中更新到 rollout 的回边是权重发布，不代表清空全部队列；采样到环境、环境到轨迹的边表示工具观测也属于下一动作的条件。屏蔽工具返回的策略损失，不等于从上下文中删掉工具返回。`,
      diagram: {
        kind: "flow",
        nodes: [
          "任务 / 环境 / 验证器工厂",
          "参考解与反例验收",
          "Rollout 引擎与工具环境",
          "TITO 原始 Token 与版本",
          "验证状态 / 奖励 / Data Pool",
          "身份、Mask、Freshness 检查",
          "训推校正与策略更新",
          "发布新权重",
        ],
        links: [
          [0, 1], [1, 2], [2, 3], [2, 4], [3, 4],
          [4, 5], [5, 6], [6, 7], [7, 2],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "推导：版本滞后、IcePop 与并行关键路径",
      body: String.raw`**SWE 的验收量。** 令 $F$ 为 F2P 测试集合，$P$ 为 P2P 集合，$b_j\in\{0,1\}$ 表示补丁后测试 $j$ 是否通过。对一次基础设施有效的执行，全部要求通过的教学奖励为：

$$R_{\mathrm{SWE}}=
\left(\prod_{j\in F}b_j\right)
\left(\prod_{j\in P}b_j\right)$$

任何一项为零，整体为零。集合来自任务的测试规范，不能靠模型自行删除失败测试。真实 harness 还需区分未运行、超时和基础设施故障，不能把这些状态都偷偷变成同一个分数。

**版本滞后。** 当前训练版本为 $v$，轨迹 $i$ 的生成 token 集合为 $\mathcal A_i$，每个 token 的 rollout 版本为 $v_{i,t}$。按最旧生成版本定义：

$$d_i=v-\min_{t\in\mathcal A_i}v_{i,t},
\qquad \operatorname{keep}_i=\mathbf1[d_i\le d_{\max}]$$

$d_{\max}$ 是允许的最大版本差，$\mathbf1$ 是指示函数。这里包括复用前缀中的旧生成 token，而不是只检查当前参与损失的后缀。版本差不是 KL 距离：一次更新很大或十次更新很小，都可能破坏“版本数代表偏移大小”的近似，因此还应监控概率比和有效样本分布。

**IcePop 的两层比率。** 令 $s_t$ 为完全一致的 token 前缀，$y_t$ 为实际生成 token，$\pi_{\mathrm{old}}^{\mathrm{infer}}$ 为采样推理引擎，$\pi_{\mathrm{old}}^{\mathrm{train}}$ 为相同旧权重的训练引擎，$\pi_\theta^{\mathrm{train}}$ 为正在更新的训练策略：

$$\rho_t=\frac{\pi_{\mathrm{old}}^{\mathrm{train}}(y_t|s_t)}
{\pi_{\mathrm{old}}^{\mathrm{infer}}(y_t|s_t)},\qquad
r_t=\frac{\pi_\theta^{\mathrm{train}}(y_t|s_t)}
{\pi_{\mathrm{old}}^{\mathrm{train}}(y_t|s_t)}$$

$\rho_t$ 描述同一旧权重的训推不一致；$r_t$ 描述训练引擎中新旧策略变化。设 $L,U$ 为允许的训推比率区间，原始 IcePop 可独立设定上下界；GLM-5 的采用版本使用 $L=1/\beta,U=\beta$，$\beta>1$：

$$\bar\rho_t=\rho_t\mathbf1[L\le\rho_t\le U]$$

设 $m_t\in\{0,1\}$ 为响应 token 损失掩码，$A_t$ 为停止梯度的优势，$N=\sum_t m_t>0$，$\epsilon>0$ 为 PPO 裁剪参数，则可将 IcePop 加权 PPO 写成：

$$\mathcal L_{\mathrm{IcePop}}=-\frac1N\sum_t
m_t\operatorname{sg}(\bar\rho_t)
\min\!\left(r_tA_t,\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)A_t\right)$$

$\operatorname{sg}$ 表示停止梯度。区间外把训推权重置零，与 PPO 的 min+clip 不是同一操作：前者过滤该 token，后者根据优势符号限制继续推动策略的方向。它们的边界也不应共用一个名字。

沿用 0.20、0.24、0.30 的例子，$\rho_t=1.2$、$r_t=1.25$。若 $\beta=1.25$、$\epsilon=0.2$、$A_t=1$，训推权重保留，PPO 项为 $\min(1.25,1.2)=1.2$，加权贡献为 $1.2\times1.2=1.44$。这是单项数值，不是损失整体必然变好的证明。

**异步直接比率。** GLM-5 的异步改版用当前训练策略与实际 rollout 策略直接比较，省去旧 train 前向。令 $\mu_t$ 为产生 token 的 rollout 分布：

$$q_t=\frac{\pi_\theta^{\mathrm{train}}(y_t|s_t)}{\mu_t(y_t|s_t)}$$

为讲清梯度路径，下面给出一个带双边 mask 的教学性 score-function loss，而不把它冒充厂商完整优化器：

$$w_t=\mathbf1[1/\beta\le q_t\le\beta]q_t,\qquad
\mathcal L_{\mathrm{demo}}=-\frac1N\sum_t
m_t\operatorname{sg}(w_tA_t)\log\pi_\theta^{\mathrm{train}}(y_t|s_t)$$

同一数例中 $q_t=1.5$，若仍用 $\beta=1.25$ 就被过滤。这说明直接总比率过滤和只过滤旧训推误差会得到不同保留集合。停止梯度确保反传来自 log-prob；直接最小化脱离 log-prob 或 ratio 的组中心化优势均值没有学习意义，因为组均值减自身均值后恒为零。

**PARL 与 Agent Swarm。** Kimi K2.5 的 Parallel Agent Reinforcement Learning（PARL）训练编排器，把固定 checkpoint 子 Agent 的输出当作环境观测。奖励含任务结果、实例化行为和子任务完成辅助项，辅助权重逐渐退火，避免长期只奖励创建更多子 Agent。冻结子 Agent 使其参数分布固定，但不会消除采样随机性。

设并行阶段编号为 $h=1,\ldots,H$，主 Agent 在该阶段使用 $M_h$ 步，子 Agent $j$ 使用 $S_{h,j}$ 步。论文的关键路径代理量与总步骤量可写为：

$$C=\sum_{h=1}^{H}\left(M_h+\max_j S_{h,j}\right),\qquad
W=\sum_{h=1}^{H}\left(M_h+\sum_j S_{h,j}\right)$$

没有子 Agent 的阶段，最大值按零处理。单阶段主 Agent 两步、三个子 Agent 分别五、三、四步，得到 $C=7$、$W=14$。并行可以缩短关键路径，却没有把总工作量降为七步；真实时延还受工具耗时、资源争用与调度开销影响。CriticalSteps 不是 GPU 用量，也不是精确 wall-clock。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：训练入口拒绝错位轨迹",
      body: String.raw`下面是可运行的 Python 标准库例子。每个数组位置代表一个 token；为缩短样例，每种消息只示意一个 token，真实系统需保留完整原始序列。上下文元数据在这里用示意 digest，生产中必须由实际规范化输入计算，不能让调用方随意声称两者相同。

代码接受已完成且基础设施有效的轨迹；partial rollout 应先续写完成，再进入这个简化入口。旧前缀的 assistant token 可以没有损失，但仍保留版本和概率。有效执行后的零奖励也必须接收，不能把真实失败混同为基础设施故障丢弃。

~~~python
from copy import deepcopy
from math import exp, isclose, isfinite, log

def validate_trace(trace, current_version, max_lag):
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    require(trace["verifier_status"] == "valid", "invalid environment run")
    require(trace["terminated"] is True, "resume unfinished rollout first")
    require(trace["rollout_context"] == trace["train_context"], "context drift")
    context_keys = {"trajectory_id", "tokenizer", "template", "environment",
                    "context_digest"}
    for context in (trace["rollout_context"], trace["train_context"]):
        require(context_keys <= context.keys(), "missing context identity")
        require(all(isinstance(context[k], str) and context[k]
                    for k in context_keys), "empty context identity")
    require(trace["token_ids"] == trace["train_token_ids"], "token drift")
    require(trace["request_ids"] == trace["train_request_ids"], "request drift")
    n = len(trace["token_ids"])
    keys = ("roles", "loss_mask", "versions", "rollout_logp", "request_ids")
    require(n > 0 and all(len(trace[k]) == n for k in keys), "length drift")
    require(all(type(t) is int and t >= 0 for t in trace["token_ids"]),
            "invalid token ID")
    require(type(current_version) is int and current_version >= 0
            and type(max_lag) is int and max_lag >= 0, "invalid version limit")
    seen_versions = []
    for role, mask, version, logp, request in zip(*(trace[k] for k in keys)):
        require(role in {"system", "user", "assistant", "tool"}, "unknown role")
        require(type(mask) is int and mask in (0, 1), "invalid mask")
        if role == "assistant":
            require(type(version) is int and 0 <= version <= current_version,
                    "invalid rollout version")
            require(isinstance(logp, (int, float)) and isfinite(logp)
                    and logp <= 0, "invalid rollout log-prob")
            require(isinstance(request, str) and request, "missing request ID")
            seen_versions.append(version)
        else:
            require(mask == 0, "non-policy token has policy loss")
            require(version is None and logp is None and request is None,
                    "observation marked as generated token")
    require(seen_versions and sum(trace["loss_mask"]) > 0, "no learning tokens")
    require(current_version - min(seen_versions) <= max_lag, "stale trajectory")
    return True

context = dict(trajectory_id="traj-7", tokenizer="tok-v1", template="chat-v2",
               environment="refund-env-v3", context_digest="demo-prefix-7")
trace = dict(
    verifier_status="valid", terminated=True, reward=0.0,
    rollout_context=context, train_context=dict(context),
    token_ids=[101, 202, 303, 204], train_token_ids=[101, 202, 303, 204],
    roles=["user", "assistant", "tool", "assistant"],
    loss_mask=[0, 0, 0, 1],
    versions=[None, 11, None, 12],
    rollout_logp=[None, log(0.4), None, log(0.2)],
    request_ids=[None, "req-1", None, "req-2"],
    train_request_ids=[None, "req-1", None, "req-2"],
)
assert validate_trace(trace, current_version=12, max_lag=2)

def rejects(field, value):
    bad = deepcopy(trace)
    bad[field] = value
    try:
        validate_trace(bad, current_version=12, max_lag=2)
    except ValueError:
        return True
    return False

assert rejects("versions", [None, 9, None, 11])
assert rejects("train_token_ids", [101, 999, 303, 204])
assert rejects("loss_mask", [0, 0, 1, 1])
assert rejects("train_request_ids", [None, "req-1", None, "other"])
assert rejects("train_context", dict(context, template="chat-v3"))
assert rejects("rollout_logp", [None, log(0.4), None, float("nan")])
assert rejects("terminated", False)
assert rejects("verifier_status", "infra_error")

def bilateral_weight(ratio, beta):
    return ratio if 1 / beta <= ratio <= beta else 0.0

rho = exp(log(0.24) - log(0.20))
update_ratio = exp(log(0.30) - log(0.24))
direct_ratio = exp(log(0.30) - log(0.20))
icepop_term = bilateral_weight(rho, 1.25) * min(update_ratio, 1.2)
assert isclose(icepop_term, 1.44)
assert bilateral_weight(direct_ratio, 1.25) == 0.0
assert all([1, 1]) * all([1, 1, 0]) == 0
assert all([1, 1]) * all([1, 1, 1]) == 1
assert 2 + max(5, 3, 4) == 7
assert 2 + sum([5, 3, 4]) == 14
print("trace checks passed; IcePop term =", round(icepop_term, 2))
print("direct ratio =", round(direct_ratio, 2), "; masked weight = 0")
~~~

生产接入还需检查前缀截断规则、position IDs、attention mask、生成长度、工具调用 ID、概率移位对齐和环境快照。第 $t$ 个目标 token 的 log-prob 应来自其前缀预测位置，不能错用读取该 token 之后的 logits。示例验证的是输入契约，不证明模型前向、梯度或环境语义已经正确。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见故障：概率对齐前先检查离散路径",
      body: String.raw`**DSA 的选择会放大数值差。** DeepSeek Sparse Attention（DSA）需要选择历史 KV 位置。两个引擎即使只有微小分数差，也可能选中不同索引，后续注意力上下文随之变化。GLM-5 报告在其特定实现中换用 torch.topk，并默认冻结 indexer 参数以改善稳定性；但 PyTorch 官方明确指出，相同分数元素的索引不保证稳定。sorted=True、固定随机种子都不是所有设备、版本和 ties 情况下确定性的承诺。

测试离散选择时，应构造平分与近似平分输入，比较不同 batch 布局、精度和引擎的索引及最终 log-prob。若业务要求稳定 tie-break，需要显式定义并验证规则，而不是只更换函数名。记录每个 token 的大量 KV 索引再 replay 有存储与带宽代价，GLM-5 因成本没有采用，不等于该思路数学上不可行。

**MoE 路由与损失端校正互补。** MoE 选择专家，DSA 选择注意力位置，两者都是离散路径，但索引语义不同。Routing Replay 记录推理时的路由信息并在训练中重放，可以减少路径偏差；IcePop 从概率层面处理差异，不能把已选错的专家变成相同计算。应分别量化路由不一致率、token 概率差和 replay 成本，不宣称一个方法让另一个永远多余。

**工具错误必须归因。** 环境镜像损坏和远端服务故障可标为无效运行；Agent 传错参数导致的工具错误却可能是有效失败。若统一丢弃所有异常，模型学不到合法调用；若统一给负奖励，基础设施故障又会被错误归因给策略。错误类别应由可复查事件定义，不由最终是否成功倒推。

**过滤改变任务分布。** 过期丢弃通常更容易影响长任务，完成即训练可能更偏向短任务。应按任务族和长度监控提交量、完成量、接收量、过期率与队列等待时间。只报平均 GPU 利用率，可能掩盖训练集已经被调度器重新加权。

**保留文本不等于保留交互状态。** partial rollout 恢复时，外部文件、数据库、浏览器登录状态可能已经改变。需要稳定快照或明确的恢复协议。截断是预算事件，不一定是 episode 终止；若尚未拿到终局奖励，不能无声地把未完成任务设为失败。

**上下文压缩需要新身份。** 某些 Agent 在长对话中会做摘要。压缩后输入与生成原 token 时的上下文不同，即使回答文字相同，也不是同一条件分布。必须记录变换边界，重新定义哪些 token 能参与所选损失；TITO 解决原始 token 保真，不会自动修复任意上下文改写。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "三组取舍：生成什么、复用什么、并行什么",
      body: String.raw`**环境生成和轨迹生成不能混称。**

| 方法 | 主要产物与机制 | 接入训练前检查 |
|---|---|---|
| ABE | 场景分解、文档生成、函数集成、难度扩展、本地部署 | 工具是否真执行，反馈是否对应任务状态 |
| Agent World Model / AWM | 代码与数据库支撑的可执行环境 | 状态转移、约束和数据库奖励是否符合业务语义 |
| ASTRA | 工具调用图引导轨迹合成，语义分解构造规则可验环境 | 拓扑可达性、独立运行、完成与效率奖励 |
| GEM | 从文本经验提取工作流、落地并细化工具轨迹 | 轨迹是否由真实工具协议支持，是否还缺在线环境 |

ABE 的 Automated Build Environments 将工具任务落实为本地可运行环境，不只是写一段模拟说明。AWM 用可查询数据库状态提高转移和验证的一致性。ASTRA 同时处理轨迹与环境：工具调用图提供结构，问题分解帮助生成独立可执行、规则可验证的场景，再结合 SFT 与在线 RL。三者仍要验收生成世界是否符合目标任务，而不只是代码能启动。

这里的 GEM 指 Unlocking Implicit Experience 中从文本合成工具轨迹的方法：相关性过滤、工作流与工具抽取、轨迹 grounding、复杂度细化，并训练专门 Trajectory Synthesizer 降低后续合成开销。它的主要产物不是天然带 reset/step 的环境，也不能与其他同名 GEM 框架混用。若只有轨迹，适合先做 SFT 或离线分析；在线 RL 还需要可交互状态和可靠反馈。

**三种复用解决不同成本。**

| 机制 | 复用对象 | 必须保持的语义 |
|---|---|---|
| Kimi K1.5 partial rollout | 未完成响应的前缀，跨迭代续写 | 原 token 和版本，旧片段 loss mask，真实终止条件 |
| Forge prefix tree merging | 多样本完全相同的计算前缀 | causal attention、position IDs、分支隔离、逐样本损失 |
| TreePO | 采样树公共前缀及分叉结构 | 分支采样概率、片段级信用与剪枝规则 |

Kimi K1.5 的 partial rollout 给一次生成设置预算，保存未完成部分到 replay buffer，在后续迭代续写，并可排除某些旧片段的损失。它平滑长输出的调度压力，但不是让旧前缀自动变成当前策略新样本。若扩展到工具环境，还要保存文本之外的真实状态。

Forge 在官方博客及后续技术报告中描述 Gateway、Data Pool 与训练和推理引擎解耦。其 Windowed FIFO 只在提交队列的局部窗口中选择已完成任务，兼顾等待与快任务偏置；它不是无限制地谁先完成就只训练谁，也不保证所有任务分布完全不变。

Forge 的 prefix tree merging 把完全相同的前缀在前向中计算一次，再按样本恢复各自损失。例如两条样本共享 100 个前缀 token，各有 20 个独立后缀，朴素输入 token 处理量是 240，理想共享结构是 140；这只是示意 token 计数，不等于 attention FLOPs 或 wall-clock 按同比下降。训练时共享节点的梯度应汇总所有对应分支贡献；若错误去重损失，就改变了样本权重。低精度、dropout 和 MoE 路由也要求额外的数值等价性验证。

**并行不等于把一个任务随便复制多份。** Agent Swarm 的 PARL 让编排器学习何时拆分、怎样下发子任务、怎样利用固定子 Agent 返回。彼此独立的检索可以并行，依赖前一步结果的数据库修改不能直接并行。任务完成奖励应约束编排器，辅助实例化奖励要退火，否则可能只学会增加子 Agent 数量。

方法选择依瓶颈而定：缺可执行训练世界，先看 ABE/AWM/ASTRA；只有文本经验，GEM 帮助获取轨迹但还要补环境；长轨迹拖慢迭代，评估 partial rollout 与异步；公共前缀开销高，评估 Forge 式计算共享；任务天然可分解，再考虑 PARL。它们作用在不同层，不能用一个榜单总分替代逐层验收。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：为什么 Agent RL 首先是数据协议问题",
      body: String.raw`**30 秒回答：**“Agent RL 的训练单元不是问题和答案，而是任务、可执行环境、验证器和完整轨迹。异步提高吞吐，却带来策略滞后和混合版本；TITO 保留原始 token，freshness 控制旧样本，IcePop 处理训推概率差，路由重放控制离散计算路径。每项优化都要检查是否仍在对同一前缀、同一行为分布计算损失。”

**为什么 F2P 通过还不够？** 修复目标缺陷不代表没有破坏旧功能，所以需要 P2P 检查回归。测试全过也只证明满足该测试集合，不能证明程序全部性质。

**为什么多记一个 rollout_version 不够？** 一条长轨迹的多次生成可能跨版本，最旧段决定过期程度；此外概率还取决于引擎实现、tokenizer、模板和上下文。版本对齐不能替代 token 与 log-prob 对齐。

**IcePop 和 PPO clipping 是一回事吗？** 不是。IcePop 的训推比率校正在区间外置零，在区间内保留权重；PPO 根据新旧策略比率及优势符号控制策略更新。异步直接 train/rollout 比率又把多个差异合在一起，比较时必须先写分子和分母。

**prefix sharing 如何证明没改训练目标？** 用同一小批样本跑合并与未合并两条路径，对齐 logits、每样本 loss 和参数梯度，再测不同长度、分支数量及路由配置。仅验证 forward 值相似，不足以证明样本损失权重和反向累加正确。

**怎样选异步系统的监控指标？** 除吞吐和等待时间，还要看版本差分位数、过期率、双边 mask 比例、环境失败分类、任务族接收分布与固定评估集成功率。系统更快但长任务被大量过滤时，应先修采样偏差。

**AWM 和 GEM 为什么不是一回事？** AWM 主要构造代码和数据库支撑的环境，GEM 从文本经验构造工具轨迹。前者提供交互世界，后者提供示范数据；能否在线 RL 取决于是否真正具备状态转移与可验证反馈。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：发现那些不会直接报错的错位",
      body: "每题先指出被破坏的契约，再给出应检查的字段或算式。",
      questions: [
        {
          q: "两个 F2P 全过，三个 P2P 中一个失败，二元 SWE 奖励是多少？",
          a: "在有效执行且要求全部测试通过的规则下为零。F2P 证明修复了目标缺陷，P2P 的失败表明发生回归；不能用总体 4/5 冒充 resolved。",
        },
        {
          q: "训练版本是 12，轨迹由版本 9 和 11 生成，最大滞后是 2。最后一段很新就能接收吗？",
          a: "不能。按最旧生成版本检查，滞后为 12-9=3，应整条拒收。旧前缀即使不参与当前损失，也仍影响后缀条件。",
        },
        {
          q: "旧 infer、旧 train、新 train 概率分别为 0.20、0.24、0.30，三个比率是多少？",
          a: "旧训推比率是 1.2，训练新旧比率是 1.25，当前训练对实际 rollout 比率是 1.5。它们对应不同误差来源，不可共用一个 clipping 解释。",
        },
        {
          q: "TITO 是否就是工具 I/O？工具返回不算策略损失，能否从训练上下文删掉？",
          a: "TITO 是 Token-in-Token-out，保留原始 token 流和元数据。工具返回可以没有策略损失，但必须作为后续动作的观测条件保留，除非另行定义并记录上下文变换。",
        },
        {
          q: "torch.topk 配合 sorted=True 是否保证所有设备上平分元素的选择一致？",
          a: "不保证。PyTorch 文档明确不保证 tied elements 的索引稳定性；必须在目标设备、版本和 batch 配置上验证，必要时显式定义稳定 tie-break。",
        },
        {
          q: "PARL 中主 Agent 两步，子 Agent 并行五、三、四步，关键路径和总步骤各是多少？",
          a: "关键路径代理量是 2+max(5,3,4)=7，总步骤是 2+5+3+4=14。前者不是总算力，也不直接等于真实时延。",
        },
        {
          q: "只有 GEM 合成的工具轨迹，是否已经具备在线 RL 训练环境？",
          a: "不一定。轨迹可用于 SFT，但在线交互还需要可执行动作、状态转移、reset/step 或等价接口，以及可信验证器；不能把数据记录当作可运行世界。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "GLM-5: Agentic RL Infrastructure and Environments, §4",
      url: "https://arxiv.org/html/2602.15763v1#S4",
      evidence: "原始报告：异步、TITO、版本过滤、SWE/Terminal/Search 任务生产与直接比率 masking",
    },
    {
      label: "GLM-5: Train-Inference Consistency, §3.2",
      url: "https://arxiv.org/html/2602.15763v1#S3.SS2",
      evidence: "原始报告：IcePop 采用版本、DSA indexer 与离散计算路径；不推广为全平台确定性",
    },
    {
      label: "IcePop: Official Method Note",
      url: "https://ringtech.notion.site/icepop",
      evidence: "原始官方博客：双边训推校正；原版上下界不必互为倒数",
    },
    {
      label: "PyTorch torch.topk API",
      url: "https://docs.pytorch.org/docs/stable/generated/torch.topk.html",
      evidence: "官方文档：平分元素索引不保证稳定，sorted=True 不提供稳定 tie-break 保证",
    },
    {
      label: "Stabilizing MoE RL by Aligning Training and Inference Routers",
      url: "https://arxiv.org/abs/2510.11370v2",
      evidence: "原论文摘要：记录推理路由并在训练中 replay，与损失端校正互补",
    },
    {
      label: "SWE-bench Evaluation Guide",
      url: "https://www.swebench.com/SWE-bench/guides/evaluation/",
      evidence: "官方 harness 文档：真实仓库应用补丁、运行测试并区分基础设施错误",
    },
    {
      label: "Harbor Task Tutorial",
      url: "https://harborframework.com/docs/tasks/task-tutorial",
      evidence: "官方任务结构：说明、环境、参考解和测试；Oracle 用于检查可解性",
    },
    {
      label: "Kimi K2 Technical Report",
      url: "https://arxiv.org/html/2507.20534v2",
      evidence: "原始报告：工具规范、Agent/任务/轨迹合成，RLVR 与 self-critique rubric reward",
    },
    {
      label: "Kimi K1.5: Partial Rollout",
      url: "https://arxiv.org/html/2501.12599v1",
      evidence: "原始报告：保存未完成响应、跨迭代续写和选择性片段 loss mask",
    },
    {
      label: "Forge: Scalable Agent RL Framework and Algorithm",
      url: "https://www.minimax.io/news/forge-scalable-agent-rl-framework-and-algorithm",
      evidence: "官方博客：解耦系统与前缀共享；系统数值不作为通用加速承诺",
    },
    {
      label: "The MiniMax-M2 Series: Data and Forge",
      url: "https://arxiv.org/html/2605.26494v1",
      evidence: "后续官方报告：问题改写与证据规范、Windowed FIFO、prefix tree merging 的逐样本损失",
    },
    {
      label: "Kimi K2.5: Agent Swarm and PARL",
      url: "https://arxiv.org/html/2602.02276v2#S3",
      evidence: "原始报告：固定子 Agent、训练编排器、辅助奖励退火和 CriticalSteps",
    },
    {
      label: "ABE: Automated Build Environments",
      url: "https://arxiv.org/abs/2508.08791v3",
      evidence: "原论文摘要：场景分解、函数集成、复杂度扩展与本地可执行工具环境",
    },
    {
      label: "Agent World Model",
      url: "https://arxiv.org/abs/2602.10090v3",
      evidence: "原论文摘要：代码与数据库支撑的可执行环境，不是纯文本模拟工具输出",
    },
    {
      label: "ASTRA",
      url: "https://arxiv.org/abs/2601.21558v2",
      evidence: "原论文摘要：工具调用图、可执行规则环境与 SFT/在线 RL",
    },
    {
      label: "GEM: Unlocking Implicit Experience",
      url: "https://arxiv.org/abs/2601.10355",
      evidence: "原论文摘要：从文本经验合成工具轨迹并训练 Trajectory Synthesizer，非同名环境框架",
    },
  ],
};

export default chapter;
