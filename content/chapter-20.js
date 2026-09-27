const chapter = {
  id: "20",
  slug: "advanced-policy-optimization",
  part: "LLM 后训练",
  title: "VAPO、CISPO、GSPO 与 SAPO",
  subtitle: "分清价值估计、裁剪对象和梯度，再诊断长序列与 MoE 稳定性",
  level: "进阶",
  duration: 190,
  prerequisites: ["15", "16", "17"],
  tags: ["VAPO", "CISPO", "GSPO", "SAPO", "GAE", "MoE", "Routing Replay"],
  objectives: [
    "解释 VAPO 的价值预训练、解耦 GAE、长度自适应和正样本 NLL",
    "手算正负优势下的 PPO clipping 与 CISPO detached token 权重",
    "推导 GSPO 的归一化序列比率和 SAPO 的完整 log-policy 梯度",
    "区分优化器与 MoE 路由一致性问题，并设计可归因的对照实验",
  ],
  summary:
    "VAPO 改进 critic 和长序列信用分配；CISPO 裁剪并冻结 token 重要性权重；GSPO 在长度归一化的序列比率上裁剪；SAPO 用平滑门控替代硬裁剪。它们处理不同故障，不能排成彼此淘汰的升级链。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：老师估分、批改单位和更新力度是三件事",
      body: String.raw`把一次长推理看作学生交出一份多页解答。验证器只说最终答案对不对；critic 像逐页估计“从这里继续能拿多少分”的老师；策略目标决定收到评价后哪些步骤应该增强、增强多少。老师估分不准、把整篇评价机械复制到每一步、单次更新过猛，是三个不同的问题。

**VAPO 从估分开始。** 随机初始化的 value head 没学过推理成功率，却立即给 actor 提供优势，容易让策略追随错误信号。先固定 actor，收集完整轨迹，用实际 return 预训练 critic；之后 critic 尽量用完整回报，actor 则可用带 bootstrap 的低方差优势。两者没有理由强制共用同一个 GAE 参数。VAPO 还让 actor 的有效信用跨度随回答长度增长，并对正确轨迹加正样本 NLL，避免已经找到的正确行为迅速丢失。价值预训练和解耦 GAE 来自 VC-PPO，VAPO 将其组合到长推理方案中。

**CISPO 改的是权重。** PPO 在某些越界方向让 surrogate 变平；CISPO 把 token 的重要性权重压到上限后冻结，仍用这个权重乘优势和 log probability。像“奖金封顶，但正确动作继续得分”，不是“整个动作退出学习”。前提是优势非零、token 未被 mask，且数值计算正常。

**GSPO 改的是单位。** 如果奖励给整份答案，GSPO 也用整份答案的长度归一化 likelihood ratio 决定是否裁剪。一条回答中的 token 共享序列 gate，而不是各自被 token ratio 裁掉。长度归一化使用几何平均，不是把概率直接相乘，也不是 ratio 的算术平均。

**SAPO 改的是门控形状。** 不在硬边界突然停止某个方向，而是让偏离旧策略较远的 token 获得较小的平滑权重。理解它不能只看 sigmoid 图像：从 ratio 求导换到 log probability，还必须乘 ratio。正负优势可以用不同温度控制衰减速度。

阅读方法论文时依次问：奖励谁给，优势谁估，ratio 在 token 还是 sequence 上，clip 作用于目标还是冻结权重，最后怎样按 token 聚合。reward model 与 critic 不是同一个角色；GRPO 去掉 critic，不代表不能用 reward model。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：四个越界格子与两个 token",
      body: String.raw`设旧策略下某 token 的概率为 0.2，新策略概率为 0.3，ratio 为 $r=1.5$。取裁剪下界 $l=0.8$、上界 $u=1.2$，优势绝对值为 2。以下讨论最大化目标 $J$；实际最小化 loss 时符号相反。

| 优势与 ratio | 原项 $rA$ | 裁剪项 $\operatorname{clip}(r,l,u)A$ | PPO 的较小项 | 对 log probability 的梯度系数 |
|---|---|---|---|---|
| $A=2,r=1.5$ | 3 | 2.4 | 2.4，已足够增加好动作 | 0 |
| $A=-2,r=1.5$ | -3 | -2.4 | -3，坏动作增加太多仍须纠正 | -3 |
| $A=2,r=0.5$ | 1 | 1.6 | 1，好动作减少太多仍须纠正 | 1 |
| $A=-2,r=0.5$ | -1 | -1.6 | -1.6，已足够减少坏动作 | 0 |

因此“ratio 出界就没梯度”是错的。正优势只在上侧饱和；负优势只在下侧饱和。边界点不可用普通导数唯一描述，自动微分会采用实现规定的分支。

CISPO 若教学性地取同样的双侧权重范围，对四格的系数分别为 $2.4,-2.4,1.6,-1.6$；它不做 PPO 的 min 分支。MiniMax-M1 实验实际上只使用有效上界，所以 $r=0.5$ 时权重仍为 0.5，后两格变为 $1,-1$。不能把教学的 0.8/1.2 配置当作论文配置。

再看同一条两 token 回答，两个 ratio 为 $[0.5,2]$，序列优势 $A=1$。几何平均 $s=\sqrt{0.5\times2}=1$，算术平均却是 1.25。GSPO 在 $s=1$ 不裁剪，每个 token 的系数是 $sA/2=0.5$。按 token PPO 再平均时，第一个系数为 $0.5/2=0.25$，第二个因超过上界而为零。GSPO 保留了整条回答的协调更新，也可能掩盖单个 token 的极端 ratio，因此仍须记录 token 尾部分位数。

最后设 SAPO 的 $A=1,r=1.5,\tau=2$。sigmoid 输入为 1，$p\approx0.7311$，门控导数 $4p(1-p)\approx0.7864$，完整 log-policy 系数为 $1.5\times0.7864\approx1.1797$。写成 0.7864 会漏掉链式法则的 ratio。

这些是用于检查公式的手算数值，不是算法收益或推荐超参数。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从同一批轨迹分出信用、优化与一致性三条支路",
      body: String.raw`先冻结行为策略，记录 response token、old logprob、终止原因和 policy version。奖励支路经过 verifier 或 reward model；信用支路选择组相对优势或 VAPO critic；目标支路再选择 token/sequence ratio 与 clipping。它们最终在有效 response mask 上汇合成更新。

MoE 另有系统支路：rollout 引擎和训练引擎可能使用不同精度、并行布局或专家选择。Routing Replay 对齐被选专家，优化器控制比率的使用方式，两者可以同时存在。记录 old logprob 不能代替训练侧一致性检查；重放路由也不能代替可靠奖励。

读图时注意：critic 预热流向优势估计，而不是制造一个新外部 reward；R2/R3 流向概率重算，而不是替代 GSPO 或 SAPO。实验中应分别开关两条支路，避免把系统改进全部归给 loss。`,
      diagram: {
        kind: "flow",
        nodes: [
          "冻结策略 Rollout + 版本",
          "Verifier / RM 奖励",
          "组优势 或 VAPO Critic",
          "Token / Sequence Ratio",
          "CISPO / GSPO / SAPO 目标",
          "Response Mask + 更新",
          "MC Return 预热 Critic",
          "MoE R2 / R3 路由对齐",
          "独立评估 + 下一批 Rollout",
        ],
        links: [
          [0, 1],
          [1, 2],
          [1, 6],
          [6, 2],
          [0, 3],
          [0, 7],
          [7, 3],
          [2, 4],
          [3, 4],
          [4, 5],
          [5, 8],
          [8, 0],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "完整推导：GAE、冻结权重、序列比率与软门控",
      body: String.raw`**统一符号。** $x$ 是 prompt，$y_i$ 是第 $i$ 条回答，$T_i$ 是有效 response token 数；$s_{i,t}=(x,y_{i,<t})$ 是前缀状态，$a_{i,t}=y_{i,t}$ 是采样动作。$\theta$ 是当前 actor 参数，$\phi$ 是 critic 参数，$\pi_{\mathrm{old}}$ 是冻结行为策略。$R_{i,t}$ 是环境或评价器给出的单步奖励，$V_\phi(s)$ 是预期未来 return，$\gamma$ 是折扣，$\lambda$ 是 GAE 衰减，$\hat A$ 是更新时冻结的优势。下文省略 batch 常数、可选 KL 和 response mask 来突出单项梯度，实际实现必须恢复。

**一、VAPO：先让价值估计值得信任。** 对一次正常终止、长度为 $T$ 的轨迹，令终端 value 为零：

$$G_t=\sum_{k=t}^{T}\gamma^{k-t}R_k,\qquad
L_V=\frac1T\sum_{t=1}^{T}(V_\phi(s_t)-G_t)^2$$

先固定 actor，只训练 critic 逼近 Monte Carlo return，再联合训练。不能只以 warmup 步数判断完成：应在留出的 rollout 上检查 value MSE、校准和 explained variance；通常希望 MSE 下降、explained variance 提升。若数据是达到长度上限的截断而非真正终止，是否 bootstrap 必须按环境定义处理，不能一律把末尾 value 置零。

GAE 从 TD residual 递推：

$$\delta_t=R_t+\gamma V(s_{t+1})-V(s_t),\qquad
\hat A_t^{(\lambda)}=\sum_{j=0}^{T-t}(\gamma\lambda)^j\delta_{t+j}$$

critic 用 $\lambda_{\mathrm{critic}}=1$ 时，$V(s_t)+\hat A_t^{(1)}$ 在正确终止边界下望远镜消去为 $G_t$，不再由不准确的中间 value 充当 target。actor 则可选择较小 $\lambda$，缩短远端噪声的传播，代价是更依赖 bootstrap。**Decoupled GAE** 指二者分开，不是让 actor 学不到 critic。

VAPO 的 length-adaptive GAE 令 actor 的有效跨度随长度变化：

$$\frac{1}{1-\lambda_i}=\alpha T_i,\qquad
\lambda_i=1-\frac1{\alpha T_i}$$

$\alpha>0$ 控制跨度占序列长度的比例；这个跨度解释在 $\gamma=1$ 时最直接。以 $\alpha=0.05$ 为教学例，$T=100$ 得 $\lambda=0.8$，$T=1000$ 得 0.98。它不是任意短序列都有效：必须满足 $\alpha T\ge1$ 才使 $\lambda\in[0,1)$，工程应显式校验或记录所采用的边界策略。较长序列更大的 $\lambda$ 使终局信号能传播更远，同时也会保留更多方差；不能只说“长度越长优势越准”。

设 $D_+$ 为验证通过的正轨迹集合，正样本 NLL 的核心为：

$$L_{\mathrm{NLL}}=-\mathbb E_{(x,y)\sim D_+}
\left[\sum_{t=1}^{T_y}\log\pi_\theta(y_t|x,y_{<t})\right],
\qquad L_{\mathrm{actor}}=-J_{\mathrm{PPO}}+\mu L_{\mathrm{NLL}}$$

$\mu$ 是混合系数；token/sequence 归一化会改变它的实际尺度，复现实验须一并对齐。NLL 给正确轨迹额外的监督梯度，即使其相对优势较小也能巩固已有能力；但不能把所有“当前相对较好”的负奖励样本当作已验证正确。没有正样本时，该 batch 的 NLL 应为零，不能除以空集合大小。VAPO 的正样本项、Clip-Higher、token 聚合等是组合设计，需分别消融。

**二、PPO 与 CISPO：裁目标还是裁权重。** 定义 token ratio 与冻结权重：

$$r_t=\exp(\log\pi_\theta(a_t|s_t)-\log\pi_{\mathrm{old}}(a_t|s_t)),
\qquad \bar r_t=\operatorname{sg}(\operatorname{clip}(r_t,l,u))$$

$\operatorname{sg}$ 为 stop-gradient，$l=1-\epsilon_{\mathrm{low}}$、$u=1+\epsilon_{\mathrm{high}}$ 为边界。令 $M_t=0$ 当 $A_t>0,r_t>u$ 或 $A_t<0,r_t<l$，其余可导区域 $M_t=1$。PPO 与 CISPO 的单 token 项分别为：

$$J_{\mathrm{PPO},t}=\min(r_t\hat A_t,\operatorname{clip}(r_t,l,u)\hat A_t),
\qquad J_{\mathrm{CISPO},t}=\bar r_t\hat A_t\log\pi_\theta(a_t|s_t)$$

$$\frac{\partial J_{\mathrm{PPO},t}}{\partial r_t}=M_t\hat A_t,\qquad
\frac{\partial J_{\mathrm{PPO},t}}{\partial\log\pi_\theta}=M_t\hat A_t r_t,\qquad
\frac{\partial J_{\mathrm{CISPO},t}}{\partial\log\pi_\theta}=\bar r_t\hat A_t$$

CISPO 是 detached **TOKEN** 权重，不是 sequence ratio；原报告实验没有有效下界。若忘记 detach，在未裁剪区对 $r\log\pi$ 求导会出现额外的权重导数项，已经不是论文目标。裁剪权重会引入偏差，目的是控制极端权重，不是恢复完全无偏的离策略估计。

**三、GSPO：归一化 SEQUENCE 比率。** 对整条回答：

$$s_i=\left(\frac{\pi_\theta(y_i|x)}{\pi_{\mathrm{old}}(y_i|x)}\right)^{1/T_i}
=\exp\left(\frac1{T_i}\sum_{t=1}^{T_i}\log r_{i,t}\right)$$

$$J_{\mathrm{GSPO},i}=\min(s_i\hat A_i,\operatorname{clip}(s_i,l,u)\hat A_i),
\qquad
\frac{\partial J_{\mathrm{GSPO},i}}{\partial\log\pi_\theta(y_{i,t}|s_{i,t})}
=M_i\hat A_i\frac{s_i}{T_i}$$

$M_i$ 按序列比率和序列优势的符号决定，整条回答共享。原始整轨迹重要性比率是 $\prod_t r_{i,t}$；取 $T_i$ 次根后是稳定化 surrogate 的设计，不能继续声称满足原始 IS 恒等式。实现用 log space 求均值，且 $T_i$ 只数有效回答 token，不能把 padding 或 prompt 算进去。

**四、SAPO：软门控仍需链式法则。** 令 $\sigma(z)=1/(1+e^{-z})$，根据优势符号选择 $\tau=\tau_+$ 或 $\tau_-$，两者均为正数。单 token 目标：

$$f_\tau(r)=\frac4\tau\sigma(\tau(r-1)),\qquad
J_{\mathrm{SAPO},t}=f_\tau(r_t)\hat A_t$$

$$p_t=\sigma(\tau(r_t-1)),\qquad
f_\tau'(r_t)=4p_t(1-p_t),\qquad
\frac{\partial J_{\mathrm{SAPO},t}}{\partial\log\pi_\theta}
=\hat A_t\,r_t\,4p_t(1-p_t)$$

在 $r=1$ 处导数 gate 为 1；更大的温度让偏离 1 后衰减更快。论文采用负优势更紧的温度设计，需与奖励噪声和探索需求一起调参。门控导数关于 $r-1$ 对称，但完整系数还有 $r$，不能说增减两侧的更新完全对称。数学上有限正 ratio 的 sigmoid 导数为正，数值饱和、mask、零优势仍会让实际梯度为零。

SAPO 与 GSPO 的联系是有条件的近似：小步更新、同序列 token 的 log-ratio 离散度较小时，平均 token gate 可近似某个序列 gate；不是精确目标等价，更不是任意向量梯度和等价。判断近似是否可信，应测量 intra-sequence log-ratio 方差，而不是只看平均 KL。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：用有限差分抓出漏 ratio 与漏 detach",
      body: String.raw`这段标准库程序检验单项数学，不承担完整训练。把 log probability 当作局部标量坐标，固定 old logprob 和优势；真正网络更新还会乘其对参数的梯度。CISPO 的权重在建立局部目标时冻结，有限差分也不能随扰动重新计算它。

~~~python
from math import exp, log, isclose

def clip(x, low, high):
    return min(max(x, low), high)

def sigmoid(x):
    if x >= 0:
        return 1.0 / (1.0 + exp(-x))
    z = exp(x)
    return z / (1.0 + z)

def finite_diff(fn, x, h=1e-6):
    return (fn(x + h) - fn(x - h)) / (2 * h)

def ppo_value(logp, old, advantage, low=0.8, high=1.2):
    ratio = exp(logp - old)
    return min(ratio * advantage, clip(ratio, low, high) * advantage)

def ppo_coef(ratio, advantage, low=0.8, high=1.2):
    clipped = ((advantage > 0 and ratio > high)
               or (advantage < 0 and ratio < low))
    return 0.0 if clipped else ratio * advantage

def sapo_value(logp, old, advantage, tau):
    ratio = exp(logp - old)
    return advantage * 4.0 / tau * sigmoid(tau * (ratio - 1.0))

def sapo_coef(ratio, advantage, tau):
    p = sigmoid(tau * (ratio - 1.0))
    return advantage * ratio * 4.0 * p * (1.0 - p)

old = log(0.2)
for ratio, advantage in [(1.5, 2), (1.5, -2), (0.5, 2), (0.5, -2)]:
    logp = old + log(ratio)
    grad = finite_diff(lambda z: ppo_value(z, old, advantage), logp)
    assert isclose(grad, ppo_coef(ratio, advantage), abs_tol=1e-7)
    weight = clip(ratio, 0.8, 1.2)  # Frozen for this local objective.
    cispo_grad = finite_diff(lambda z: weight * advantage * z, logp)
    assert isclose(cispo_grad, weight * advantage, abs_tol=1e-7)
    tau = 2.0 if advantage > 0 else 3.0
    soft_grad = finite_diff(lambda z: sapo_value(z, old, advantage, tau), logp)
    assert isclose(soft_grad, sapo_coef(ratio, advantage, tau), abs_tol=1e-7)
    print("ratio/A/PPO/CISPO:", ratio, advantage, round(grad, 4),
          round(cispo_grad, 4))

logps = [old + log(0.5), old + log(2.0)]
def gspo_value(values):
    seq_ratio = exp(sum(z - old for z in values) / len(values))
    return min(seq_ratio, clip(seq_ratio, 0.8, 1.2))

for index in range(2):
    def vary(z):
        values = logps.copy()
        values[index] = z
        return gspo_value(values)
    assert isclose(finite_diff(vary, logps[index]), 0.5, abs_tol=1e-7)

def length_lambda(length, alpha):
    if length <= 0 or alpha <= 0 or alpha * length < 1:
        raise ValueError("length-adaptive GAE requires alpha * T >= 1")
    return 1.0 - 1.0 / (alpha * length)

def gae(rewards, values, gamma, lam):
    assert len(values) == len(rewards) + 1
    assert 0 <= gamma <= 1 and 0 <= lam <= 1
    advantages = [0.0] * len(rewards)
    carry = 0.0
    for t in reversed(range(len(rewards))):
        delta = rewards[t] + gamma * values[t + 1] - values[t]
        carry = delta + gamma * lam * carry
        advantages[t] = carry
    return advantages

rewards, values = [0.0, 0.0, 1.0], [0.2, 0.3, 0.4, 0.0]
critic_adv = gae(rewards, values, gamma=1.0, lam=1.0)
targets = [a + v for a, v in zip(critic_adv, values[:-1])]
assert all(isclose(target, 1.0) for target in targets)
assert isclose(length_lambda(100, 0.05), 0.8)
assert isclose(length_lambda(1000, 0.05), 0.98)
try:
    length_lambda(3, 0.05)
except ValueError:
    pass
else:
    raise AssertionError("invalid short sequence accepted")

def positive_token_nll(logprob_rows, verified):
    assert len(logprob_rows) == len(verified)
    tokens = [z for row, good in zip(logprob_rows, verified) if good for z in row]
    return -sum(tokens) / len(tokens) if tokens else 0.0

assert positive_token_nll([[-1.0]], [False]) == 0.0
assert isclose(positive_token_nll([[-1.0, -3.0], [-9.0]],
                                [True, False]), 2.0)
print("GSPO token coefficients: 0.5, 0.5")
print("terminal MC targets:", targets)
print("all gradient and boundary checks passed")
~~~

预期四行 PPO 系数为 $0,-3,1,0$；教学双侧 CISPO 系数为 $2.4,-2.4,1.6,-1.6$。NLL 函数选择正样本 token 均值，展示的是明确可检查的归一化约定；改成序列均值时应重新标定混合系数。程序拒绝无效短序列，不悄悄把非法 lambda 当成有效配置。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：MoE 的比率异常不能全靠换 loss",
      body: String.raw`**MoE 换专家不自动使重要性采样失去共同支撑。** 支撑指行为策略在需要估计的动作上是否有非零概率，不是两次是否选了同一个专家。通常输出 softmax 仍覆盖词表；真正要检查的是 top-k/top-p 采样截断、记录的行为概率是否含温度处理，以及训练端重算是否对应同一分布。裁剪和序列归一化也不等于无偏校正。

**GSPO 不会让路由噪声必然按长度消失。** 令 $z_t=\log r_t$，有 $\operatorname{Var}(\frac1T\sum_tz_t)=T^{-2}\sum_{t,u}\operatorname{Cov}(z_t,z_u)$。只有独立或合适的弱相关条件才能得到熟悉的均值方差衰减；同一专家、同一前缀和系统误差可能使 token 噪声强相关。

**Routing Replay 与策略优化器互补。** 在核验的 verl 官方实现中，R2 记录训练侧 logprob 重算时的专家选择，并在优化更新中重放；R3 进一步从 rollout 捕获选择，使 rollout、重算和更新沿用相同专家路径。R3 要求生成后端能返回路由结果，并增加存储与传输开销。具体开关随实现版本变化，名称不是所有框架的统一标准。

**重放专家选择不必冻结 router。** R3 论文重放选择 mask，仍在训练 logits 上算 softmax gate 权重以保留梯度。它对齐离散选择，却不会消除精度、kernel 或权重版本造成的一切差异。使用 GSPO 仍可开启 replay；“GSPO 不依赖 replay 才能工作”与“replay 已被淘汰”是两个完全不同的结论。

**clip fraction 不是统一意义的有效学习比例。** PPO 要结合优势符号看真正饱和方向；CISPO 裁掉权重不等于删掉 token 梯度；GSPO 一次裁一条序列；SAPO 没有同样的二值边界。比较日志前先写清统计口径。

**价值模型与门控都救不了错误奖励。** 若 verifier 奖励了测试漏洞，预热 critic 只是更准确地预测漏洞奖励，正样本 NLL 还可能进一步固化它。先检查独立隐藏评估、人工错误审计和奖励一致性，再优化 GAE 与温度。

诊断顺序可固定为：核对 policy version 和 response mask；检查 old/current logprob 的处理；检查 reward 与 advantage 分布；再看 ratio 分位数、序列内离散度、clip/gate、KL、entropy、长度和 value 指标。每次只改变一个机制，并统计被丢弃 rollout 在内的总预算。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "比较：不要把七种优化方法排成淘汰链",
      body: String.raw`| 方法 | 主要信用来源 | ratio / 裁剪单位 | 核心改动 | 仍需监控 |
|---|---|---|---|---|
| PPO | critic + GAE | token，min surrogate | 有符号的硬饱和 | critic 误差、KL、旧策略漂移 |
| GRPO | 同题组相对奖励 | 通常 token，min surrogate | 以组 baseline 替代 critic | 全同奖励组、归一化与长度偏差 |
| DAPO | 组相对奖励 | token，非对称上下界 | Clip-Higher、动态采样、token loss、超长处理 | 采样偏移与真实 token 成本 |
| VAPO | 预热 critic + 解耦 GAE | token，PPO 家族 | length-adaptive GAE、正样本 NLL 等组合 | value 泛化、lambda 边界、NLL 占比 |
| CISPO | 可配合组优势 | token，detached IS 权重 | 裁权重后继续优化 log probability | 权重偏差、detach、mask |
| GSPO | 序列组优势 | 归一化 sequence ratio | 一条回答共享有符号裁剪决策 | token 极值、长度、序列饱和 |
| SAPO | 组优势等冻结优势 | token，平滑 ratio 门控 | 符号相关温度和连续衰减 | 饱和、ratio 因子、序列内离散度 |

此外三个名字作用在另一层，不能漏学。**Dr.GRPO** 检查按回答长度与组标准差归一化带来的特定偏差，以固定尺度等修改避免相应优化倾向；“移除这些偏差”不等于所有有限样本估计都无偏。**REINFORCE++** 使用全局优势归一化等稳定设计，与同题组内标准化不同；跨 batch 的统计尺度和大 batch 条件应明确。**PRIME** 用 rollout 和 outcome label 在线更新隐式过程奖励模型，让稀疏终局反馈转成更细的过程信号；它改变奖励与信用分配，不是新增一种 clipping，也不免除奖励模型误差。

没有 critic 的方法通常少一套价值网络，但组采样、生成长度和更新次数也影响成本；不能只数模型个数。需要细粒度价值判断且能训练可靠 critic 时，VAPO 值得比较；发现少数 token ratio 尖峰时，可比较 CISPO/SAPO 的 token 处理与 GSPO 的序列处理；若 MoE 重算本身不一致，再加 R2/R3 对照。

这些是诊断驱动的实验建议，不是按参数量划出的必选算法。每个候选应共享初始 checkpoint、训练题、奖励实现、采样预算和独立评估，最后比较性能、稳定性与完整资源账单。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试回答：先写一个 token 的系数",
      body: String.raw`**问：PPO 和 CISPO 都有 clip，为什么越界后的行为不同？** PPO 对两个目标取 min，在已经沿有利方向变化过多时变平；CISPO 对 ratio 权重裁剪并 detach，然后乘优势和 log probability。前者单 token 系数是 $MAr$，后者是 $\bar rA$，不能只说二者裁剪阈值不同。

**问：GSPO 是把 CISPO 推广到序列吗？** 不是。CISPO 的核心是 detached token 权重；GSPO 用几何平均得到长度归一化 sequence ratio，再使用有符号 min surrogate。一个改权重的微分路径，一个改裁剪的统计单位。

**问：VAPO 为什么给 actor 和 critic 不同 lambda？** critic 初期估值差，训练 target 应尽量来自真实完整回报；actor 需要在 bootstrap 偏差与长期噪声之间折中。解耦后可以令 critic lambda 为 1，再按轨迹长度调整 actor lambda。预热、解耦并不是 VAPO 首次提出，需提到 VC-PPO。

**问：SAPO 的 gate 是不是 sigmoid 本身？** 目标用了缩放 sigmoid；对 ratio 求导得到 $4p(1-p)$，对 log probability 求导还要乘 $r$ 和优势。回答中应区分目标值、门控导数与完整策略梯度系数。

**问：为什么 GSPO 仍可能需要 Routing Replay？** 序列目标可以降低个别 token 影响，却不能保证行为与训练概率来自同一计算路径。Replay 对齐专家选择，GSPO 决定怎样使用序列 ratio，问题层次不同。

**问：训练发散时先换成最新算法吗？** 先验证 response mask、版本与概率记录，检查奖励、优势和 critic，再定位 token 极值或序列 gate。使用相同预算的一因子对照才能知道新 loss 是否真正解决了根因。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：公式、边界与工程责任",
      body: String.raw`先在纸上算出结果，再解释哪个变量被冻结、归一化在哪一层；不要只背方法名。`,
      questions: [
        {
          q: "PPO 中 A=-2、r=1.5、裁剪范围 [0.8,1.2]，对 log probability 的系数是多少？",
          a: "-3。负优势动作概率增加太多，min 选择原项 -3，仍需向下纠正；不是所有越界项都为零。",
        },
        {
          q: "CISPO 的 clipped ratio 为什么必须 detach？",
          a: "它是冻结的重要性权重，期望得到 weight × advantage × grad logpi。若权重参与求导，会增加权重导数项，改变算法。",
        },
        {
          q: "两个 token ratio 为 0.5 和 2，GSPO 的序列 ratio 与未裁剪单 token 系数是什么？设 A=1。",
          a: "序列 ratio 是几何平均 1；每个 token 的系数为 sA/T=0.5，不是算术平均 1.25，也不是两个 token 各自裁剪。",
        },
        {
          q: "SAPO 已算出 4p(1-p)，是否可以直接乘 grad logpi？",
          a: "不可以，还要乘 ratio 和冻结优势。完整系数为 A × r × 4p(1-p)，并考虑 mask 与聚合。",
        },
        {
          q: "VAPO 取 alpha=0.05、T=10，直接代入长度自适应 lambda 会怎样？",
          a: "得到 -1，超出 GAE 合法范围。应显式校验 alpha*T>=1 或定义有记录的边界策略，不能静默当作正常配置。",
        },
        {
          q: "R3 重放 rollout 专家选择，是否意味着 router 没有梯度、GSPO 无法使用？",
          a: "都不是。原方案重放选择 mask，但以训练 logits 计算 gate 保留梯度；路由一致性与 GSPO 的序列目标正交兼容。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Proximal Policy Optimization Algorithms",
      url: "https://arxiv.org/abs/1707.06347",
      evidence: "PPO 原始 clipped surrogate；正负优势下的梯度由原式直接推导。",
    },
    {
      label: "Generalized Advantage Estimation",
      url: "https://arxiv.org/abs/1506.02438",
      evidence: "GAE 原始论文：TD residual 的指数加权与偏差方差折中。",
    },
    {
      label: "DeepSeekMath / GRPO",
      url: "https://arxiv.org/html/2402.03300",
      evidence: "原始组相对优势和 outcome/process reward；critic-free 不等于无 RM。",
    },
    {
      label: "DAPO",
      url: "https://arxiv.org/abs/2503.14476",
      evidence: "Clip-Higher、动态采样、token-level loss 和超长奖励处理。",
    },
    {
      label: "VC-PPO",
      url: "https://arxiv.org/abs/2503.01491",
      evidence: "价值预训练与 actor/critic 解耦 GAE 的前置工作。",
    },
    {
      label: "VAPO: Efficient and Reliable Reinforcement Learning for Advanced Reasoning Tasks",
      url: "https://arxiv.org/html/2504.05118v1#S4",
      evidence: "第 4 节：critic 初始化、解耦/长度自适应 GAE、正样本 NLL。",
    },
    {
      label: "MiniMax-M1 / CISPO",
      url: "https://arxiv.org/html/2506.13585v1#S3.SS1",
      evidence: "式 4-5：detached token IS 权重；实验无有效下界。",
    },
    {
      label: "Group Sequence Policy Optimization",
      url: "https://arxiv.org/html/2507.18071v2#S4",
      evidence: "式 7、10：长度归一化 sequence ratio 与 sA/T 梯度。",
    },
    {
      label: "Soft Adaptive Policy Optimization",
      url: "https://arxiv.org/html/2511.20347v1#S3",
      evidence: "式 5-6 的 sigmoid 目标；链式法则给出 A*r*4p(1-p)，近似需小步与低离散度条件。",
    },
    {
      label: "R3: Rollout Routing Replay",
      url: "https://arxiv.org/html/2510.11370v1#S4",
      evidence: "重放专家选择而保留训练 gate 梯度；与 GRPO、GSPO、DAPO 互补。",
    },
    {
      label: "verl Router Replay 官方实现说明",
      url: "https://raw.githubusercontent.com/volcengine/verl/main/examples/router_replay/README.md",
      evidence: "2026-09-27 核验的可变文档：R2 训练侧重放，R3 要求 rollout 返回路由结果。",
    },
    {
      label: "Dr.GRPO",
      url: "https://arxiv.org/abs/2503.20783",
      evidence: "归一化诱导的长度与优化偏差；不据此推断所有估计无偏。",
    },
    {
      label: "REINFORCE++",
      url: "https://arxiv.org/abs/2501.03262",
      evidence: "全局优势归一化及其大 batch 条件。",
    },
    {
      label: "PRIME",
      url: "https://arxiv.org/abs/2502.01456",
      evidence: "用 policy rollout 和 outcome label 在线更新隐式过程奖励。",
    },
  ],
};

export default chapter;
