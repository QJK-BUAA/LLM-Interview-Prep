const chapter = {
  id: "19",
  slug: "opd-opsd",
  part: "LLM 后训练",
  title: "OPD、OPSD 与跨阶段蒸馏",
  subtitle: "在学生自己的轨迹上获得逐 token 教师信号",
  level: "前沿",
  duration: 175,
  prerequisites: ["03", "15", "17", "18"],
  tags: ["OPD", "OPSD", "Distillation", "RLSD", "Purified OPSD", "H2SD", "GLM-5", "Cross-Stage Distillation"],
  objectives: [
    "从 exposure bias 与稀疏奖励解释 OPD 的动机",
    "推导 student rollout 上的逐 token KL 目标",
    "区分外部教师 OPD 与 privileged-context OPSD",
    "诊断信息泄漏、长 CoT 失稳与教师错配",
    "比较 Purified OPSD、RLSD、H2SD 与 Lightning OPD",
  ],
  summary:
    "OPD 让学生在自己会访问的前缀上接受外部教师的密集分布监督；OPSD 用同一模型在 privileged context 下充当教师以省去外部大模型，但训练信息不对称会带来不可迁移捷径与长推理失稳风险。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：在学生真正迷路的位置教它",
      body: String.raw`学习助手在一道新算术题中间走错了一步，随后沿着这个错误继续推，最终答错。第 18 章的固定偏好对没有记录这个错误前缀，第 17 章的整组零分也分不出谁更好。如果请教师就在助手实际走到的位置说明下一步该怎么选，能否得到更具体的纠正？本章让学生先走，再在它的前缀上教学。

SFT 让学生模仿固定教师轨迹。训练时每个前缀都来自高质量答案，推理时却由学生自己生成；一旦学生走到教师数据没覆盖的错误前缀，后续误差会累积，这就是自回归场景的 exposure bias 与状态分布错配。

RLVR 用学生自己的 rollout，解决了数据来源问题，但最终答案验证器通常只给一条轨迹一个标量。它能说“这条路失败”，却不能直接指出第几个 token 开始偏离，也无法在一组全错答案中提供相对方向。

OPD（On-Policy Distillation）结合两者：学生先生成自己的回答，外部教师再在学生实际访问的每个前缀上输出完整词表分布。数据是 on-policy，监督是 dense token-level。教师不需要生成整条替代答案，而是在学生犯错的现场回答“下一步我会怎样分配概率”。

OPSD（On-Policy Self-Distillation）进一步让同一个模型承担两种角色。student context 只有问题，privileged teacher context 额外含验证答案、参考推理或环境反馈。模型参数来源相同，但条件信息不同，教师分布因而更有信息。它省去独立大教师，不代表没有教师前向，也不代表额外信息可以在部署时使用。

GLM-5 的 Cross-Stage Distillation（跨阶段蒸馏）解决另一个问题：连续完成推理、Agent 和通用对齐训练后，后阶段可能削弱前阶段能力。它保存前序阶段的最终 checkpoint 作为教师，在相应训练题目上让当前学生生成轨迹，再从教师与学生的 token log-prob 差构造优势。这仍是 OPD，但不要求教师看到 reference answer，不能与“同参数、不同特权上下文”的 OPSD 混称。先把这两种教师来源分开，再看同一前缀上的概率差如何变成训练信号。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：同一错误前缀上的密集纠正",
      body: String.raw`把助手停在那个容易出错的算术前缀，比较三个候选 token。学生倾向第一个，教师更支持第二个。为能列出完整分布，这里使用三 token 的教学词表；实际模型需对齐完整词表或明确记录截断近似。

用 $p_S,p_T$ 分别记学生与教师在同一前缀上的分布。学生在一道算术题的某个前缀后，对三个候选 token 的分布为：

$$p_S=[0.60,\ 0.30,\ 0.10]$$

教师在同一学生前缀上给出：

$$p_T=[0.20,\ 0.70,\ 0.10]$$

若学生实际采到了第一个 token 并最终答错，终局 RLVR 只给出失败分数；按第 17 章的 0/1 约定它是 0，是否形成负优势还取决于基准。OPD 的完整分布立即说明第二个 token 更受教师支持。以学生概率加权两者 log-ratio，reverse KL 为：

$$D_{\mathrm{KL}}(p_S\|p_T)
=0.6\log\frac{0.6}{0.2}
+0.3\log\frac{0.3}{0.7}
+0.1\log\frac{0.1}{0.1}
\approx0.404978$$

若用 OPSD，$p_T$ 可能来自同一 checkpoint，但 teacher prompt 额外包含正确答案。此时差异可能是真正的推理纠正，也可能只是教师从答案反推后偏好某种措辞。学生推理时没有答案，后者未必可迁移。

0.404978 衡量的是这个前缀上的分布差，不是答错概率，也不直接给出哪个 logit 应改多少；后面的梯度推导才回答后一问题。这说明“密集”只描述每个位置都有信号，不保证信号因果正确。必须验证教师优势、privileged context 设计和 OOD 泛化。尤其当教师见过正确答案时，还要问它偏好的下一步能否由不见答案的学生学会。`,
    },
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线：KL 梯度、轨迹分布与特权信息",
      body: String.raw`先明确学生生成前缀、教师给分布的局部训练目标，并把 GLM-5 的教师差值放在同一框架中。接着沿第 05 章的 softmax Jacobian 求两向 KL 的 logit 梯度，读懂三 token 例中每个分量的更新。再用第 15 章的 score-function 方法检查：早期动作改变后续前缀时，局部自动微分遗漏了什么？最后分析教师额外知道答案的 OPSD，区分可迁移的规律与部署输入根本没有的信息。每一步都固定采样者、教师版本、长度分母和停止梯度位置，才能比较不同“OPD loss”。`,
      links: [
        { label: "OPD 与跨阶段蒸馏目标", sectionId: "derivation", level: "必会" },
        { label: "两向 KL 的 logit 梯度", sectionId: "math-kl-logit-temperature", level: "推导" },
        { label: "固定前缀与整轨迹", sectionId: "math-trajectory-gradient", level: "推导" },
        { label: "OPSD 与信息条件", sectionId: "math-privileged-opsd", level: "进阶" },
        { label: "白板验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "diagram",
      type: "diagram",
      title: "四种数据与监督闭环",
      body: String.raw`四条主线可用“谁生成轨迹、谁提供反馈”区分：

| 方法 | 轨迹来源 | 反馈 | 粒度 |
|---|---|---|---|
| SFT | 教师/人工固定轨迹 | 目标 token | off-policy、dense |
| GRPO/RLVR | 学生当前策略 | verifier 标量 | on-policy、sparse |
| OPD | 学生当前策略 | 外部教师分布 | on-policy、dense |
| OPSD | 学生当前策略 | 同模型 + privileged context | on-policy、dense |

OPD/OPSD 的关键不是教师和学生名字，而是教师在学生生成的前缀上打分。若只把教师完整答案离线保存再做交叉熵，它仍更接近 sequence KD/SFT；若 rollout 长期不刷新，“on-policy”程度也会随策略更新而下降。

训练循环需要三个同步点：rollout policy 产生状态；teacher 在同一 tokenization 和前缀上计算 logits；student 用 stop-gradient teacher target 更新。任一处版本错位都会让监督语义变化。`,
      diagram: {
        kind: "flow",
        nodes: [
          "问题 x",
          "Student Rollout y",
          "学生访问的前缀",
          "Teacher + 可选特权信息",
          "逐 Token 分布差",
          "更新 Student",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [2, 4],
          [4, 5],
          [5, 1],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "逐 token KL、方向差异与 OPSD 条件",
      body: String.raw`开场的教师在学生错误前缀上给出了不同概率，但一批回答包含许多前缀，也可能来自不同版本的学生。我们先定义到底在哪里比较谁，再选择分布差的方向；最后解释怎样只用所选 token 的教师差值提供策略信号。

问题为 $x$，学生 rollout 为 $y\sim\pi_S(\cdot|x)$。第 $t$ 个学生前缀状态是 $s_t=(x,y_{<t})$。OPD 教师分布为 $\pi_T(\cdot|s_t)$；OPSD 额外给教师 privileged information $z$。令 v 为词表中的候选 token，两侧分布为：

$$p_S^t(v)=\pi_S(v|x,y_{<t})$$

$$p_T^t(v)=\pi_T(v|x,z,y_{<t})$$

每个位置已经有了两个可比较分布，先在词表上算 KL，再对回答位置平均。$|y|$ 是有效回答长度，不含 prompt 与 padding。常见 reverse KL 全词表目标为：

$$L_{\mathrm{RKL}}=
\mathbb E_{y\sim\pi_S}\left[
\frac1{|y|}\sum_t
D_{\mathrm{KL}}(p_S^t\|p_T^t)\right]$$

其中 $\mathcal V$ 是共同词表，学生当前更可能生成的 token 在这个方向上权重更大：

$$D_{\mathrm{KL}}(p_S\|p_T)
=\sum_{v\in\mathcal V}p_S(v)
\log\frac{p_S(v)}{p_T(v)}$$

它的期望权重来自学生，倾向集中到教师高概率模式。Forward KL：

$$D_{\mathrm{KL}}(p_T\|p_S)
=\sum_v p_T(v)\log\frac{p_T(v)}{p_S(v)}$$

更强地要求学生覆盖教师分配概率的各模式；教师交叉熵与它只差不依赖学生的教师熵。论文对“forward/reverse”的命名偶有视角差异，最可靠做法是直接写出左右分布。

on-policy 指外层状态 $y_{<t}$ 由学生采样；内部 KL 可以对全词表求和，也可只用 sampled token 构造策略梯度式近似。全词表更密集但需要教师 logits，词表大时通信和显存昂贵。上式按采样前缀计算局部 KL 时，常把前缀当作固定训练数据；若声称优化整条序列的精确 KL，则必须同时说明外层采样分布的梯度处理，二者不能直接混同。

实际一批数据由冻结的 $\pi_{\rm old}$ 生成，更准确的局部训练定义是：

$$\tilde L(\theta;\theta_{\rm old},\bar\theta)
=\mathbb E_{y\sim\pi_{\rm old}}
\left[\frac1{T(y)}\sum_t
D_{\rm KL}(\pi_\theta(\cdot|s_t)\|
\operatorname{sg}(\pi_{\bar\theta}(\cdot|s_t)))\right]$$

这里 old 是 rollout 版本，$\bar\theta$ 是教师版本，$\theta$ 是当前学生，三者职责不同。训练前缀和长度作为固定样本，不沿离散采样反传；只刷新数据可称 on-policy 数据闭环，并不自动添加外层分布的导数。

全词表 loss 是一种选择；也可以回到第 15 章“冻结权重乘策略 score”的接口，只对实际生成 token 计算教师差值。GLM-5 报告第 3.5 节采用逐 token 的教师差值，记教师推理引擎概率为 $\pi_T^{\mathrm{infer}}$、学生训练引擎概率为 $\pi_\theta^{\mathrm{train}}$：

$$\hat A_{i,t}=\operatorname{sg}\left[
\log\pi_T^{\mathrm{infer}}(y_{i,t}|x,y_{i,<t})
-\log\pi_\theta^{\mathrm{train}}(y_{i,t}|x,y_{i,<t})\right]$$

$\operatorname{sg}$ 表示不沿这一权重反向传播；梯度来自策略目标中的 log-prob 或 ratio。另取一个前缀演示差值尺度：教师给某 token 概率 0.4、学生给 0.2 时，权重为 $\log2\approx0.693$；反过来是 -0.693。它不再依赖组内均值，因此该报告可用 group size=1，而不是把一条样本放进标准 GRPO 的中心化公式。多域混合比例、教师能力和训推概率对齐仍要控制；恢复程度必须由前序任务的独立评估证明。

回到开场三 token 分布，第二个候选在教师侧更受支持，教师差值会鼓励它；完整局部 KL 的 0.404978 则综合了三个候选。两种接口都比同题全错的零相对优势多了教师信号，却不能仅凭此断言整条轨迹的优化完全相同。下一节先把局部 KL 对 logits 的导数算准，再检查外层前缀分布。`,
    },
    {
      id: "math-kl-logit-temperature",
      type: "derivation",
      title: "Forward/Reverse KL 对学生 logits 的完整梯度",
      body: String.raw`三 token 例显示学生过分偏好第一个候选，但要更新网络，仍需知道每个 logit 的导数。尤其第三个候选两侧概率相同，它是否就一定不更新？我们在同一前缀上分别求两向 KL，避免把概率差直接当成所有目标的梯度。

固定一个前缀，学生 logits $z\in\mathbb R^K$，教师 logits $v\in\mathbb R^K$ 冻结；K 是词表大小，这里的 z 是 logit 向量，不是上一节的特权信息。温度 $\tau>0$，$p_i=\operatorname{softmax}(z/\tau)_i$，$q_i=\operatorname{softmax}(v/\tau)_i$，两侧先按相同词表对齐。由 softmax 求导得到：

$$\frac{\partial p_i}{\partial z_j}=\frac1\tau p_i(\mathbf1[i=j]-p_j),
\qquad
\frac{\partial\log p_i}{\partial z_j}=\frac1\tau(\mathbf1[i=j]-p_j)$$

**Forward KL，即教师在左。** $L_F=\sum_iq_i\log(q_i/p_i)$，教师熵不依赖学生，且加权系数 q 固定，因此只需对学生 log-prob 求导：

$$\frac{\partial L_F}{\partial z_j}
=-\frac1\tau\sum_iq_i(\mathbf1[i=j]-p_j)
=\frac{p_j-q_j}{\tau}$$

**Reverse KL，即学生在左。** 换方向后不能只交换字母继续套用上式。$L_R=\sum_ip_i\log(p_i/q_i)$，须同时求导权重 p 与 log p：

$$\frac{\partial L_R}{\partial z_j}
=\frac1\tau\sum_ip_i(\mathbf1[i=j]-p_j)
[\log(p_i/q_i)+1]$$
$$=\frac{p_j}{\tau}\left[\log(p_j/q_j)-D_{\rm KL}(p\|q)\right]$$

常数 +1 由 softmax Jacobian 行和消去；忘记对 p 的权重求导会得出错误结论。两个梯度分量之和都为零，符合所有 logits 共同平移不改变概率。

**教学手算，温度 1。** $p=[0.6,0.3,0.1],q=[0.2,0.7,0.1]$。$L_F\approx0.373386$，$L_R\approx0.404978$；forward 梯度为 $[0.4,-0.4,0]$，reverse 约为 $[0.416181,-0.375683,-0.040498]$。第三个 token 虽然 p=q，reverse 梯度仍非零，因为归一化耦合所有 logits。两向 KL 在 p=q 时都为零梯度，但远离时形状不同；mode-covering/mode-seeking 是受模型容量和支撑影响的倾向，不是硬规则。

**温度与尺度。** 蒸馏常最小化 $\tau^2 L$，此时 forward logit 梯度为 $\tau(p-q)$，reverse 为 $\tau p_j[\log(p_j/q_j)-L_R]$。没有 $\tau^2$ 时保留上式的 $1/\tau$；二者是不同学习尺度约定。大温度下 p-q 也缩小，$\tau^2$ 有助于补偿；高温且 K 固定时，$\tau^2 L_F$ 近似中心化 logits 的平方差除以 $2K$。这不保证任意温度下梯度幅度恒定。

教师 logits 必须停止梯度，即使教师和学生来自同一参数存储；否则 loss 还会通过 q 回传，变成两侧共同移动的不同目标。采样温度与蒸馏温度可以不同，采样分布不匹配时要明确重新加权或承认 surrogate。

在开场例中做梯度下降，正的第一分量会压低第一个 logit，负的第二分量会提高第二个；reverse 的第三分量 -0.040498 还会提高第三个 logit，这是归一化耦合，不是教师额外判它“更正确”。这些结论都把当前前缀固定。下一节让第一个动作决定进入哪个后续前缀，检查是否还缺一项影响。`,
    },
    {
      id: "math-trajectory-gradient",
      type: "derivation",
      title: "固定前缀局部 KL 不等于整条轨迹 KL 的梯度",
      body: String.raw`助手可以在第一步选择继续原解法，或者转去检查计算。即使第一步的学生与教师分布完全相同，两条分支后面与教师的差距也可能很不一样。只在已经访问的前缀上求局部 KL 梯度，能否学会少进入差距更大的分支？本节用两步回答把遗漏项显式算出来。

先考虑固定有限时域 T、共同支持集和冻结因果教师。$s_t$ 是生成位置 t 的前缀，$p_\theta,q$ 为该位置的学生与教师条件分布。学生轨迹 $P_\theta(y)=\prod_tp_\theta(y_t|s_t)$，教师 $Q(y)=\prod_tq(y_t|s_t)$。将整句概率乘积取 log 后展开，再对各前缀下的下一 token 取条件期望，KL 链式法则给：

$$D_{\rm KL}(P_\theta\|Q)
=\mathbb E_{y\sim P_\theta}\sum_t\log\frac{p_\theta(y_t|s_t)}{q(y_t|s_t)}
=\mathbb E_{y\sim P_\theta}\sum_t K_\theta(s_t)$$

其中 $K_\theta(s)=D_{\rm KL}(p_\theta(\cdot|s)\|q(\cdot|s))$。这是不按长度平均的恒等式。变长回答可用 EOS 吸收状态及合适可积条件处理；直接除以样本长度 $T(y)$ 得到的是新目标，不是原始序列 KL。

**外层分布也求导。** 记 $u_k=\nabla\log p_\theta(y_k|s_k)$，局部 $\nabla K$ 把前缀固定：

$$\nabla D_{\rm KL}(P_\theta\|Q)
=\mathbb E\left[\sum_t\nabla K_\theta(s_t)
+\sum_k u_k\sum_{t>k}K_\theta(s_t)\right]$$

第二项是早期动作改变未来所到前缀的分布。过去及当前 K 对 $a_k$ 采样前可测，乘 score 的期望为零，所以剩余严格未来项。固定前缀全词表自动微分只算第一项。

等价的 sampled-token 形式是：

$$\nabla D_{\rm KL}(P_\theta\|Q)
=\mathbb E\left[\sum_k u_k
\sum_{t\geq k}\log\frac{p_\theta(y_t|s_t)}{q(y_t|s_t)}\right]$$

来自 $\nabla\mathbb E_P\log(P/Q)=\mathbb E_P[(\log(P/Q)+1)\nabla\log P]$，再用 score 均值为零和因果性消项。因此精确轨迹梯度需要后缀 KL cost-to-go，不是仅乘当前 token 的 log-ratio。

因此要区分“修正这个位置的概率”和“通过早期选择改变未来位置”。前一种正是逐 token 教师差值可以估计的量。若 $a\sim p_\theta$、固定前缀、温度 1，使用停止梯度的 $A(a)=\log q(a)-\log p_\theta(a)$，则：

$$\mathbb E_p[A(a)\nabla\log p_\theta(a)]
=-\nabla D_{\rm KL}(p_\theta\|q)$$

这是局部 reverse-KL 梯度的采样估计，不包含改变未来状态的那项。若 a 来自 old，需动作 importance ratio 才还原当前局部期望；长度平均和 clip 又进一步改变目标。GLM-5 的训练机制可据报告陈述，但不能据此宣称它无条件等于完整轨迹 KL 的精确梯度。

**两步反例。** 将开场三 token 分布换成受控的二分支模型，只为隔离“选择路径”的作用：第一步学生 $\pi(a=1)=\sigma(h)$，教师概率 0.5；在 h=0，两者一致。第二步分支 0 的两者相同，K0=0；分支 1 学生 $[0.75,0.25]$、教师 $[0.25,0.75]$，K1=$\tfrac12\log3$，第二步 logits 不依赖 h。固定前缀的 KL 对 h 导数为 0；精确轨迹目标却含 $\sigma(h)K1$，在 h=0 的导数为 $\tfrac18\log3\approx0.137327$。

0.137327 的正导数在梯度下降时降低进入分支 1 的概率，而局部训练对 h 没有这项直接压力；这就是“局部密集”不等于“整轨迹精确”的具体含义。最后，$D_{\rm KL}(Q\|P_\theta)=\mathbb E_{y\sim Q}\sum_tD_{\rm KL}(q(\cdot|s_t)\|p_\theta(\cdot|s_t))$ 的前缀来自教师。学生 rollout 上的 forward KL 局部训练不能直接冒充这个教师轨迹期望。以上还假设教师只按可见历史行动；下一节进一步问，当教师额外知道答案时，学生究竟能模仿到什么程度。`,
    },
    {
      id: "math-privileged-opsd",
      type: "derivation",
      title: "OPSD：条件信息、教师停梯度与不可迁移下界",
      body: String.raw`教师因为提前看过答案而偏好某个 token，不代表助手只看题目时也有依据做同样选择。上一节区分了局部与整轨迹梯度，现在再区分双方掌握的信息：哪些教师差异能被学生学成规律，哪些无论怎样优化都无法在部署时恢复？

OPSD 的 student 只见 $s=(x,y_{<t})$，teacher 额外见 z；这里 z 表示参考答案或反馈，不是上一节的 logit。$\theta$ 是学生参数，old 是采样版本，$D$ 是问题与特权信息的数据分布，$T(y)$ 为有效回答长度。明确冻结或周期刷新的教师参数 $\bar\theta$：

$$p_\theta(\cdot|s)=\pi_\theta(\cdot|x,y_{<t}),\qquad
q_{\bar\theta}(\cdot|s,z)=
\operatorname{sg}[\pi_{\bar\theta}(\cdot|x,z,y_{<t})]$$
$$\tilde L_{\rm OPSD}=
\mathbb E_{\substack{(x,z)\sim D\\y\sim\pi_{\rm old}(\cdot|x)}}
\left[\frac1{T(y)}\sum_t
D(p_\theta(\cdot|s_t),q_{\bar\theta}(\cdot|s_t,z))\right]$$

D 要明确为哪一向 KL。rollout、z、teacher 输出均固定，只更新学生分支；若 $\bar\theta$ 每次从当前学生复制，stop-gradient 只切当前计算图，不会把跨步移动目标变成静态优化问题。不得让 student prompt 含 reference，再声称评估无特权条件能力。

**更多信息何时能迁移？** 固定 s，教师随隐藏 z 变化，同一个学生分布却不能随不可见信息分别改变。以 forward KL 为例，$q_z$ 为给定 z 的教师分布，设 $\bar q=\mathbb E_{z|s}[q_z]$：

$$\mathbb E_{z|s}D_{\rm KL}(q_z\|p)
=\mathbb E_{z|s}D_{\rm KL}(q_z\|\bar q)
+D_{\rm KL}(\bar q\|p)$$

证明只需在 $\log(q_z/p)$ 中加减 $\log\bar q$，对 z 求均值。第二项可以通过拟合平均教师来减少，第一项则来自教师随隐藏信息变化。容量无限时最佳学生是 $\bar q$，第一项仍无法消去，它等于教师诱导的条件联合分布下 $I(V;Z|s)$，其中 V 是教师采样的 token、Z 是特权信息随机变量。这是固定前缀、forward-KL 的信息下界，不是所有 OPSD 目标的统一收敛定理。

教学反例：z 是从 s 完全无法预测的公平硬币，教师知道 z 后必选 token z。学生最多输出 $[0.5,0.5]$，最小平均 forward KL 为 $\log2$。不能靠密集模仿创造部署输入里不存在的信息。若 z 是问题可推导但学生尚未学会的答案，则可能通过训练学到规律；需要无 z 的保留集和 OOD 实验，而不是以训练 KL 下降作证。

硬币例的 $\log2$ 不是模型容量不足，而是同一部署输入对应了教师两种相反选择。回到算术助手，正确答案通常可由题目推得，是否能迁移就变成数据、容量与优化的实证问题，不能借硬币反例断言所有特权教学都无效。

工程上将 teacher 的额外前缀与学生 response 位置严格对齐，只对学生动作评分；reference-only、错 reference、无 reference、成功/失败轨迹、长预算与未见题族分别做对照。Purified OPSD、RLSD、H²SD 等原有来源提供的是各自条件下的方案与实证，不据名称补造未披露超参数或普适收益。接下来的代码据此隔离两种上下文，方法比较再说明哪些方案过滤教师捷径、哪些结合验证奖励；第 20 章则回到策略更新的粒度与稳定性，反馈来源和优化器仍是两条独立选择。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：OPSD 训练循环与防泄漏检查",
      body: String.raw`下面把 teacher context 与 student context 分开。teacher 必须 stop-gradient；若使用周期性 teacher checkpoint，还要记录更新间隔。先实现正文的归约：**每句按有效 token 平均，再对 batch 平均**，而非把所有句子的 token 混成一个均值。

两种 logits 均已对齐为 $[B,T,V]$，第 t 个位置预测相同的学生 response token；教师额外前缀不进入此 T 轴。输入为有限 logits，response_mask 为二值 $[B,T]$，每句至少有一个有效动作。空回答应在构造 batch 时拒绝或重新采样，不能悄悄改变平均分母。

~~~python
import torch
import torch.nn.functional as F

def opsd_reverse_kl(student_logits, teacher_logits, response_mask):
    assert student_logits.shape == teacher_logits.shape
    assert student_logits.shape[:-1] == response_mask.shape
    assert torch.all((response_mask == 0) | (response_mask == 1))
    mask = response_mask.bool()
    lengths = mask.sum(dim=-1)
    if (lengths == 0).any():
        raise ValueError("每条回答至少需要一个有效 response token")
    logp = F.log_softmax(student_logits.float(), dim=-1)
    logq = F.log_softmax(teacher_logits.detach().float(), dim=-1)
    token_kl = (logp.exp() * (logp - logq)).sum(dim=-1)
    sequence_mean = token_kl.masked_fill(~mask, 0).sum(dim=-1) / lengths
    return sequence_mean.mean()
~~~

训练循环中的 logits 接口负责 response 位置对齐；这里不重复做 label shift：

~~~python
for problems, references in loader:
    # 1. 只有问题的学生生成自己会访问的状态
    with no_grad():
        rollouts = student.generate(problems, temperature=1.0)

    # 2. 同一前缀，两种上下文分别评分
    student_logits = student.logits(problems, rollouts)
    with no_grad():
        teacher_inputs = attach_privileged_context(problems, references)
        teacher_logits = teacher.logits(teacher_inputs, rollouts)

    # 3. 全词表 KL，先每句 token mean，再 batch mean
    loss = opsd_reverse_kl(student_logits, teacher_logits,
                          response_mask(rollouts))
    update(student, loss)

    # 4. 必须同时监控无 privileged context 的真实推理
    evaluate_base_context(student)
    track_entropy_and_reasoning_markers(student)
~~~

若两句长度为 2、8，每个有效 token 的 KL 分别恒为 1、3，本目标为 $(1+3)/2=2$；全 batch token mean 却是 $(2+24)/10=2.6$，会改变样本相对权重。两种都可另行定义，但不能混用公式与实现。reverse KL 是本章教学实例，原 OPSD 还讨论 generalized JSD 等目标。

审计时加入三类对照：把正确 reference 换成无关 reference，检验是否只学风格；只给最终答案与给完整推理对比，检验 privileged density；在未见题型和更长 token budget 下评估，检验是否破坏探索与反思。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：有答案的教师不一定教会无答案的学生",
      body: String.raw`**教师错配。** 外部教师与学生 tokenizer、chat template 或推理风格不同，逐 token 分布无法直接对齐；即使词表相同，强教师在学生错误前缀上也可能给出退化分布。

**Privileged information leakage。** OPSD 教师知道 reference，某些 token 偏好只在知道答案时成立。学生可能机械记忆答案诱导的措辞或捷径，而不是学习从问题可推得的信号。

**长 CoT 失稳。** 2026 年多篇预印本报告，直接 OPSD 可能压制“等等、重新检查”等不确定性和分叉行为，使长预算下的探索退化。这是特定模型与实验设置的论文证据，不应外推为所有 OPSD 必然失败。

**移动教师。** 同一模型持续更新时，teacher target 也变化；完全共享当前参数、EMA 或周期冻结 checkpoint 的动力学不同。必须 stop-gradient 并报告 teacher schedule。

**全词表成本。** 每个学生 token 还需教师前向和 logits。若只传 top-k，可省通信但丢掉尾部质量；不同 KL 对截断更敏感。

**“自蒸馏”命名误导。** OPSD 仍依赖 reference solution 或反馈作为特权信息；没有外部大教师，不等于没有外部监督。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "2026 方向定位与方法选择树",
      body: String.raw`| 方法 | 教师/信号 | 主要目标 | 当前证据边界 |
|---|---|---|---|
| OPD/GKD | 外部教师 logits | 学生状态上密集模仿 | 原理成熟，成本依教师 |
| OPSD | 同模型 + reference | 去掉外部教师 | 2026 论文报告有效，也有长 CoT 反例 |
| Purified OPSD | question-only、question+reference、reference-only 三种冻结前向 | 用 PMI 残差调节 base 分布，抑制 reference 捷径 | 2026 预印本报告保留反思行为 |
| RLSD | 验证奖励产生的优势给 token 系数定正负，教师正权重调幅 | 保留各 token 优势符号，总参数梯度仍可变化 | 2026 预印本，依可靠 verifier |
| H²SD | 成功用已验证回答+改写指令评分原 token，失败用 hint 教师 | 按成功/失败构造不同监督 | 2026 预印本，hint 可能有外部生成成本 |
| Lightning OPD | 固定 SFT 学生在 OPD prompts 上生成，教师评分后缓存 | 移除在线 teacher server | 两阶段同教师，更新后仍有数据陈旧 |
| Cross-Stage Distillation | 前序阶段 checkpoint 教师 | 缓解顺序 RL 的能力遗忘 | GLM-5 的阶段组合与评估实例 |

Purified 用 question+reference 与 reference-only 的 log-prob 差形成 PMI 型信号，再调节 question-only base 分布，实际还做中心化与 tanh 裁剪；它不等于只减两次前向后直接训练。RLSD 的正权重保持的是 token 优势系数的符号，不保证整个共享参数梯度方向或成功行为不变。例如两 token 梯度 $(1,0),(-2,1)$，正权重从 $(1,1)$ 改为 $(3,1)$，总梯度就从 $(-1,1)$ 变成 $(1,1)$。verifier 的绝对奖励也要先转成相对优势，不能直接拿 0/1 充当其符号。

Lightning 先由教师产生 SFT 示范并训练出学生，再固定这个 SFT 学生生成 OPD 轨迹，由同一教师一次性评分并缓存。teacher consistency 指两阶段教师一致，不表示 OPD 轨迹由教师生成；后续学生更新后，缓存不会自动变成实时 on-policy。

**选择树：** 有可靠大教师且 tokenizer 对齐，可把标准 OPD 作为密集监督基线；无大教师但有高质量 reference，可试 OPSD，同时做无 reference、错 reference 与长预算对照；有可靠 verifier 时，比较 RLSD/H²SD 对成功与失败样本的不同信号；teacher 在线成本是瓶颈且满足上述两阶段来源，可评估 Lightning OPD；长 CoT 出现反思坍缩，再考虑 Purified OPSD 或更稀疏 privileged context。

这里“论文报告”表示作者在特定模型、数据和预算上的结果；“广泛共识”仅限学生轨迹能减少 train-inference 状态错配、全词表教师信号比终局标量更密集等机制；选择树是教学性工程建议，不是论文保证。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：OPD 与 OPSD 的核心差别",
      body: String.raw`**30 秒回答：**“两者都先让学生 rollout，再在学生实际前缀上做逐 token 分布监督，所以兼具 on-policy 状态与 dense feedback。OPD 的教师是外部更强模型；OPSD 用同一模型在额外 reference 等 privileged context 下当教师，因此省去外部大模型，但要防止只在有答案时成立的信号泄漏到训练目标。”

若追问与 SFT：SFT 在教师固定轨迹上模仿 token，是 off-policy dense；OPD 在学生轨迹上由教师重新评分，是 on-policy dense。

若追问与 GRPO：GRPO 在学生轨迹上用 verifier 的序列标量，是 on-policy sparse；OPD/OPSD 每个位置都有词表分布，但教师推理和 logits 成本更高。

若追问 forward/reverse KL：直接写公式。$D_{\mathrm{KL}}(p_T\|p_S)$ 更强调覆盖教师质量，$D_{\mathrm{KL}}(p_S\|p_T)$ 更强调学生当前质量落到教师高概率模式；命名不如左右顺序可靠。

若追问长 CoT 风险：privileged teacher 可能知道终点后减少探索分叉，学生逐 token 模仿后丢失无答案时必要的怀疑和回溯。应监控 entropy、反思 marker、长预算 pass@k 与 OOD，而非只看短预算 pass@1。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：四种训练范式不要混淆",
      body: "每题都回答轨迹来源、监督粒度和教师要求。",
      questions: [
        {
          q: "GLM-5 跨阶段 OPD 为什么可以用 group size=1，它就是 OPSD 吗？",
          a: "优势直接来自教师和学生的逐 token log-prob 差，不需要组相对奖励估计。教师是前序 checkpoint，不必加入参考答案，因此它不等同于特权上下文 OPSD。",
        },
        {
          q: "把外部教师生成的完整答案缓存后做交叉熵，为什么不是标准 OPD？",
          a: "轨迹来自教师而非当前学生，学生自己的错误前缀没有被教师评分，因此属于 off-policy sequence distillation/SFT 类。",
        },
        {
          q: "OPSD 为什么仍有额外计算，即使没有外部大教师？",
          a: "同一 rollout 前缀至少要在 student context 与 privileged teacher context 下分别前向，且全词表 KL 需要教师 logits；只是可共享架构和权重存储。",
        },
        {
          q: "Privileged information leakage 在这里具体指什么？",
          a: "教师分布的变化可能依赖部署时不可见的 reference 捷径，学生被迫模仿该变化，却无法从普通问题上下文重建其依据，导致机械记忆或推理行为退化。",
        },
        {
          q: "RLSD 为什么把 verifier 与 self-teacher 分工？",
          a: "验证奖励先产生相对优势，确定各 token 系数正负；teacher-student 差异通过正权重调幅。保留系数符号不保证共享参数的总梯度方向或成功行为不变，仍需独立评估。",
        },
        {
          q: "Lightning OPD 的关键适用假设是什么？",
          a: "教师先生成 SFT 示范；训练后的固定 SFT 学生再在 OPD prompts 上生成轨迹，由同一教师预计算监督。两阶段教师一致是 teacher consistency；缓存降低在线成本，但学生更新后数据不再严格实时 on-policy。",
        },
      ],
    },
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：两向 KL、轨迹梯度与信息边界",
      body: "先写左右分布、采样来源和冻结量，再求导。",
      questions: [
        {
          q: "固定教师 q，学生 p=softmax(z/τ)。推导两向 KL 的 logit 梯度，并解释 reverse 中的中心化项。",
          a: String.raw`softmax Jacobian 为 $p_i(\mathbf1[i=j]-p_j)/\tau$。forward 导数为 $(p_j-q_j)/\tau$；reverse 对 $p_i\log(p_i/q_i)$ 两部分求导，得 $p_j[\log(p_j/q_j)-D_{\rm KL}(p\|q)]/\tau$。**得分点：**教师冻结；reverse 权重也求导；各分量和为零；若 loss 乘 $\tau^2$ 则梯度同乘。`,
        },
        {
          q: "p=[0.6,0.3,0.1]、q=[0.2,0.7,0.1]、τ=1。计算两向 KL 和梯度，第三项 p=q 是否意味着梯度为零？",
          a: String.raw`forward KL≈0.373386、梯度 $[0.4,-0.4,0]$；reverse KL≈0.404978、梯度约 $[0.416181,-0.375683,-0.040498]$。reverse 第三项为 $0.1(0-L_R)$，并非零。**得分点：**log-ratio 方向；softmax 的全局归一化；不混同 p 的偏导与 logits 的偏导。`,
        },
        {
          q: "两步模型第一步 p=σ(h)、teacher=0.5，第二步 KL 分别为 0 和 log(3)/2。h=0 时精确轨迹与固定前缀梯度有何不同？",
          a: String.raw`根节点局部 KL 导数为零；第二步 logits 不依赖 h，因此固定前缀法对 h 也是零。但轨迹目标含 $\sigma(h)\log3/2$，导数为 $0.25\log3/2=\log3/8\approx0.137327$。**得分点：**早期动作影响后续状态分布；外层 score 项；按长度平均又是不同目标。`,
        },
        {
          q: "教师看到学生输入无法推断的公平硬币 z 并据此输出 token，学生能把平均 forward KL 降到零吗？",
          a: String.raw`不能。最佳学生为教师分布的均值 $[0.5,0.5]$，最小平均 KL 为 $\log2$。一般分解为 $\mathbb E_zD(q_z\|\bar q)+D(\bar q\|p)$，第一项是不含 z 的学生无法消去的项。**得分点：**信息条件；限定 forward KL 与固定前缀；teacher detach 不等于特权信息自动可迁移。`,
        },
      ],
    },
  ],
  sources: [
    {
      label: "GLM-5: On-Policy Cross-Stage Distillation, §3.5",
      url: "https://arxiv.org/html/2602.15763v1#S3.SS5",
      evidence: "原始技术报告：前序 checkpoint 教师、逐 token log-ratio 优势、group size=1",
    },
    {
      label: "On-Policy Distillation of Language Models",
      url: "https://arxiv.org/abs/2306.13649",
      evidence: "GKD/OPD 原始论文",
    },
    {
      label: "Self-Distilled Reasoner",
      url: "https://arxiv.org/abs/2601.18734",
      evidence: "OPSD 2026 原始预印本",
    },
    {
      label: "Self-Distilled RLVR",
      url: "https://arxiv.org/abs/2604.03128",
      evidence: "RLSD 2026 原始预印本",
    },
    {
      label: "Lightning OPD",
      url: "https://arxiv.org/abs/2604.13010",
      evidence: "2026 原始预印本",
    },
    {
      label: "Purified OPSD",
      url: "https://arxiv.org/abs/2607.02234",
      evidence: "2026 原始预印本",
    },
    {
      label: "H²SD: Hybrid Hindsight Self-Distillation",
      url: "https://arxiv.org/abs/2607.18955",
      evidence: "2026 原始预印本",
    },
    {
      label: "Rethinking OPSD for Thinking Models",
      url: "https://arxiv.org/abs/2607.05184",
      evidence: "2026 独立失效分析预印本",
    },
  ],
};

export default chapter;
