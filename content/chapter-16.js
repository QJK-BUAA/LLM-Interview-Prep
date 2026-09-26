const chapter = {
  id: "16",
  slug: "ppo-classic-rlhf",
  part: "LLM 后训练",
  title: "PPO、奖励模型与经典 RLHF",
  subtitle: "理解四模型管线、概率比和受约束策略更新",
  level: "核心",
  duration: 150,
  prerequisites: ["11", "15"],
  tags: ["RLHF", "Reward Model", "PPO", "KL", "GAE"],
  objectives: [
    "解释经典 RLHF 的 SFT、奖励建模与 PPO 三阶段",
    "写出 Bradley-Terry 奖励模型损失",
    "手算 PPO 概率比与 clip 目标",
    "区分 reference KL、PPO clipping 和梯度裁剪",
  ],
  summary:
    "经典 RLHF 先把人类偏好拟合为奖励模型，再用 PPO 提高高奖励回答的概率；价值模型降低方差，reference KL 与 clip 分别约束长期偏移和单批更新。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：先学会评分，再谨慎提高高分回答概率",
      body: String.raw`指令微调（SFT）让模型模仿高质量答案，但很多要求很难写成唯一标准答案。例如“更有帮助且不过度承诺”更适合比较两个回答。经典 RLHF（Reinforcement Learning from Human Feedback）先收集同一 prompt 下的回答偏好，用 chosen/rejected 对训练奖励模型，再把奖励模型当环境反馈优化语言模型。

奖励模型把 prompt 与完整回答映射为标量。它只是人类偏好的代理，不能直接当真理。PPO 让策略生成新回答、得到奖励，再提高高于预期的动作概率；因为策略一旦离开奖励模型训练分布，可能找到评分漏洞，所以还用 SFT reference policy 的 KL 惩罚限制漂移。

经典实现常同时涉及四个模型角色：policy/actor 生成并更新；reference 提供不更新的基准概率；reward model 对完整回答评分；value/critic 预测每个前缀的未来回报。它们可共享部分权重或分时部署，但逻辑职责必须分开。

PPO 的“proximal”不是保证永不退化，而是用旧策略采样后，对新旧动作概率比做截断，限制一次数据复用期间的激进更新。训练稳定还依赖奖励尺度、优势估计、KL 系数、数据分布和实现细节。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：一个 token 的 PPO clip",
      body: String.raw`某 token 在 rollout 的旧策略概率为 0.20，更新后的当前策略概率为 0.26，概率比为：

$$r_t(\theta)=\frac{\pi_\theta(a_t|s_t)}
{\pi_{\theta_{\mathrm{old}}}(a_t|s_t)}
=\frac{0.26}{0.20}=1.3$$

设优势 $\hat A_t=2$，clip 范围 $\epsilon=0.2$。未截断项为 $1.3\times2=2.6$，截断比率为 1.2，对应 $1.2\times2=2.4$。PPO 最大化两者较小值，因此本样本贡献按 2.4 封顶，继续增加该动作概率不再获得额外目标收益。

若优势是 -2，策略应降低该动作概率。此时 min 的方向会阻止概率比过度降到 0.8 以下：PPO 的写法对正负优势产生不同边界，不能简单理解为“把所有 ratio 数值夹进区间再乘”。

再看 reference KL。即使当前策略与本轮 old policy 很接近，它们都可能已经逐轮远离最初 SFT reference。PPO clip 约束一次更新；reference KL 约束累计行为偏移。两者比较对象与时间尺度都不同。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "经典 RLHF 的三阶段与四模型循环",
      body: String.raw`第一阶段用人工或专家示范训练 SFT policy。第二阶段让模型生成多个候选，由标注者排序，训练 reward model。第三阶段从 SFT 初始化 actor 与 reference：actor 生成回答，reward model 给终局分数，reference 提供 KL 代价，critic 估计前缀价值，PPO 更新 actor 与 critic。

rollout 与 update 必须区分。回答由冻结的 old policy 采样；一次 rollout batch 可切成多个 mini-batch 训练，但每多做一轮 epoch，当前策略与行为策略偏差都会增大，importance ratio 和 clipping 才有意义。

上线模型通常只保留训练后的 actor，不需要 reward、critic 和 reference。但训练时四者的权重、KV、激活与通信会造成显著系统成本。`,
      diagram: {
        kind: "flow",
        nodes: [
          "示范数据 → SFT",
          "偏好对 → Reward Model",
          "Actor Rollout",
          "Reward + Reference KL",
          "Critic / GAE",
          "PPO 更新",
        ],
        links: [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 2],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "奖励模型、KL 正则与 PPO 目标",
      body: String.raw`对 prompt $x$、偏好回答 $y_w$ 和非偏好回答 $y_l$，Bradley-Terry 模型假设：

$$P(y_w\succ y_l|x)
=\sigma(r_\phi(x,y_w)-r_\phi(x,y_l))$$

奖励模型损失为负对数似然：

$$L_{\mathrm{RM}}(\phi)=
-\mathbb E\log\sigma(r_\phi(x,y_w)-r_\phi(x,y_l))$$

策略阶段常优化：

$$\max_\theta\ \mathbb E_{y\sim\pi_\theta(\cdot|x)}
\left[r_\phi(x,y)-\beta
\log\frac{\pi_\theta(y|x)}{\pi_{\mathrm{ref}}(y|x)}\right]$$

第二项是 sample-based KL 代价的常见形式，$\beta$ 控制离 reference 的代价。实际实现可把每 token log-ratio 作为 shaping reward，再用 critic 和 GAE 得到优势。

对旧策略采样动作，定义 $r_t(\theta)=\pi_\theta(a_t|s_t)/\pi_{\mathrm{old}}(a_t|s_t)$。PPO clipped surrogate 为：

$$L^{\mathrm{clip}}(\theta)=
\mathbb E_t\left[
\min\left(r_t\hat A_t,
\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)\hat A_t\right)
\right]$$

Actor 最大化它，critic 则回归 value target。熵 bonus、value clipping、优势标准化和 adaptive KL 都是常见实现选项，但不能在报告算法时省略，因为它们会显著改变训练行为。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：PPO-RLHF 训练循环伪代码",
      body: String.raw`下面把四个模型的职责显式写开。真实系统会批量计算 token log-probability、mask prompt token，并在分布式 worker 间调度生成与训练。

~~~python
for prompts in prompt_loader:
    with no_grad():
        responses, old_logp = actor.generate_with_logprobs(prompts)
        ref_logp = reference.logprobs(prompts, responses)
        scores = reward_model.score(prompts, responses)
        old_values = critic.values(prompts, responses)

        token_rewards = -kl_beta * (old_logp - ref_logp)
        token_rewards[:, -1] += scores
        advantages, returns = gae(token_rewards, old_values)

    for epoch in range(update_epochs):
        logp = actor.logprobs(prompts, responses)
        values = critic.values(prompts, responses)
        ratio = exp(logp - stop_gradient(old_logp))

        policy_loss = -masked_mean(
            minimum(ratio * advantages,
                    clip(ratio, 1 - epsilon, 1 + epsilon) * advantages)
        )
        value_loss = masked_mean((values - returns) ** 2)
        update(actor, policy_loss)
        update(critic, value_coefficient * value_loss)
~~~

工程验收至少记录：raw reward、KL、总 shaped reward、优势均值方差、clip fraction、entropy、response length、value error 和验证集质量。只看总 reward 上升无法发现 reward hacking。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：代理奖励会主动寻找漏洞",
      body: String.raw`**误区一：奖励模型分数越高，真实偏好一定越高。** 策略会搜索训练分布之外的高分区域，放大奖励模型偏差。必须保留人工审计、独立评估和长度/风格控制。

**误区二：PPO clip 就是严格 trust region。** 它是易实现的 surrogate，不能保证所有状态上的 KL 都小；多 epoch、长序列和共享参数会产生复杂变化。

**误区三：KL 只有一种。** reference KL 约束策略与 SFT 基准，PPO ratio 比较当前与 rollout old policy；奖励模型内部也可能有正则。必须写清分布和方向。

**误区四：critic 只增加显存，没有算法价值。** critic 用前缀价值构造低方差优势，使终局奖励能更稳定地分配给 token；但 critic 误差也会带来偏差。

**误区五：高 reward 的所有 token 都同样正确。** 终局标量无法定位因果步骤，格式 token 也可能一起被强化。过程奖励可增加粒度，但评审误差同样会扩散。

**误区六：训练不崩就代表稳定。** entropy 缓慢坍缩、回答长度漂移、KL 增长、能力遗忘和隐藏 reward hacking 都可能在 loss 正常时发生。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "三种约束不要混用名称",
      body: String.raw`| 机制 | 作用对象 | 比较基准 | 目的 |
|---|---|---|---|
| PPO ratio clip | 采样动作概率比 | rollout old policy | 限制一次数据复用的激进更新 |
| Reference KL penalty | 整体 token 分布/采样 log-ratio | 固定或慢更新 reference | 防止累计漂移与能力损失 |
| Gradient norm clipping | 反向后的参数梯度向量 | 设定范数阈值 | 防止异常优化步 |
| Reward clipping | 环境/模型奖励值 | 数值边界 | 限制异常奖励尺度 |
| Value clipping | critic 预测变化 | old value | 稳定价值网络更新 |

PPO 相对 REINFORCE 的主要新增负担是 critic、old policy 逻辑与多轮 surrogate 更新。它在通用连续控制中有成熟经验，但 LLM 整句终局奖励让更简单的 critic-free 方法也可能有竞争力。

是否使用 PPO 取决于反馈与系统：奖励密集、需要细致 token advantage、已有成熟基础设施时 PPO 仍有价值；只有可验证终局奖励且 critic 成本过高时，可比较 GRPO、RLOO 或 REINFORCE++。算法名不能替代同预算实验。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：PPO 在 RLHF 中解决什么",
      body: String.raw`**30 秒回答：**“奖励模型把偏好对转成标量反馈，Actor 在自己生成的回答上最大化奖励。PPO 用新旧策略概率比和 clipped surrogate 限制一次更新过大，critic 与 GAE 降低终局奖励的梯度方差；另用 reference KL 约束模型不要逐轮偏离 SFT 策略。”

若追问四模型：policy 生成并学习，reference 冻结并提供 KL，reward model 给完整回答分数，value model 为每个前缀估计未来回报。

若追问奖励模型如何训练：用 Bradley-Terry 偏好概率 $\sigma(r_w-r_l)$，最小化 chosen 未胜过 rejected 的负对数似然；标量可平移，绝对值没有跨模型天然含义。

若追问 clip 对负优势：当动作应被压低时，目标阻止 ratio 低于 $1-\epsilon$ 后继续获得收益；所以不能先无条件 clamp ratio 再忽略 min 的符号逻辑。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：把 PPO 的每个模型和约束放回正确位置",
      body: "回答时指出数据由谁生成、哪个模型更新。",
      questions: [
        {
          q: "old probability=0.5，new probability=0.55，ratio 是多少？ε=0.2 时是否触发上界？",
          a: "ratio=1.1，位于 [0.8,1.2]，不触发上界。",
        },
        {
          q: "reference policy 与 old policy 为什么不是同一个概念？",
          a: "reference 通常是固定 SFT 基准，约束长期漂移；old policy 是本轮 rollout 行为策略，用于 importance ratio，随迭代更新。",
        },
        {
          q: "奖励模型对 chosen 打 8、rejected 打 7，和打 1、0 的 Bradley-Terry 偏好概率是否相同？",
          a: "相同，因为都只看差值 1，概率均为 σ(1)。这说明奖励绝对平移不影响该偏好模型。",
        },
        {
          q: "PPO clip 能否替代 reference KL？",
          a: "不能。clip 主要约束当前策略相对本轮旧策略的局部更新，逐轮累积后仍可能远离最初 reference。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Proximal Policy Optimization Algorithms",
      url: "https://arxiv.org/abs/1707.06347",
      evidence: "PPO 原始论文",
    },
    {
      label: "Learning to Summarize from Human Feedback",
      url: "https://arxiv.org/abs/2009.01325",
      evidence: "奖励建模与 RLHF 论文",
    },
    {
      label: "Training Language Models to Follow Instructions with Human Feedback",
      url: "https://arxiv.org/abs/2203.02155",
      evidence: "InstructGPT 原始论文",
    },
    {
      label: "High-Dimensional Continuous Control Using GAE",
      url: "https://arxiv.org/abs/1506.02438",
      evidence: "GAE 原始论文",
    },
  ],
};

export default chapter;
