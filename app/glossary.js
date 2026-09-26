export const GLOSSARY = Object.freeze({
  scalar: "标量：只有一个数值、没有额外轴的量。",
  vector: "向量：按一个轴排列的一组数。",
  matrix: "矩阵：按行和列排列的二维数表。",
  tensor: "张量：带一个或多个语义轴的多维数组。",
  shape: "Shape：张量各轴长度组成的尺寸描述。",
  axis: "轴：张量中具有特定语义的一个维度。",
  broadcasting: "广播：按兼容规则扩展长度为 1 或缺失的轴。",
  parameter: "参数：由训练更新并在样本间共享的模型数值。",
  activation: "激活值：模型前向时由当前输入临时产生的中间结果。",
  gradient: "梯度：损失对参数各方向局部变化率组成的数组。",
  loss: "损失：训练时被优化器最小化的可微标量目标。",
  metric: "指标：用于评价模型、但不一定直接参与反向传播的量。",
  logit: "Logit：softmax 或 sigmoid 之前未经归一化的分数。",
  softmax: "Softmax：把一组实数转成总和为 1 的概率分布。",
  entropy: "熵：分布不确定性或平均信息量的度量。",
  "cross-entropy": "交叉熵：用一个分布编码另一个分布时的平均代价。",
  KL: "KL 散度：衡量两个概率分布差异的非对称量。",
  token: "Token：tokenizer 输出、供模型处理的离散符号单位。",
  tokenizer: "Tokenizer：把文本与 token id 相互转换的规则和词表。",
  vocabulary: "词表：token 与整数 id 之间的有限映射集合。",
  embedding: "Embedding：把离散 id 映射到连续向量的可学习查表。",
  padding: "Padding：为组成等长 batch 而加入的补位符号。",
  mask: "Mask：显式禁止某些位置参与注意力或损失的标记。",
  attention: "注意力：按查询与键的匹配权重聚合值向量的机制。",
  query: "Query：注意力中表达当前位置检索需求的向量。",
  key: "Key：注意力中用于与查询计算匹配分数的向量。",
  value: "Value：注意力中被匹配权重实际聚合的内容向量。",
  residual: "残差连接：把子层输入直接加回输出的信息通路。",
  Transformer: "Transformer：以注意力和逐位置前馈网络为核心的架构。",
  FFN: "FFN：对每个 token 独立应用的前馈神经网络。",
  RoPE: "RoPE：通过旋转 query 与 key 通道注入相对位置信息的方法。",
  RMSNorm: "RMSNorm：按均方根缩放特征、不减均值的归一化。",
  SwiGLU: "SwiGLU：用 SiLU 门控两路线性投影的前馈结构。",
  MHA: "MHA：每个 query 头都有独立 key/value 头的多头注意力。",
  MQA: "MQA：所有 query 头共享一组 key/value 的注意力。",
  GQA: "GQA：若干 query 头共享一组 key/value 的折中结构。",
  MLA: "MLA：把键值信息压到潜变量以降低缓存成本的注意力结构。",
  MoE: "MoE：每个 token 只激活少数专家的稀疏混合架构。",
  SSM: "SSM：用状态递推描述序列动态的状态空间模型。",
  "KV Cache": "KV Cache：自回归生成时保存历史 key/value 的缓存。",
  prefill: "Prefill：一次处理完整提示词并建立 KV Cache 的阶段。",
  decode: "Decode：利用缓存逐 token 生成后续内容的阶段。",
  throughput: "吞吐：单位时间内系统处理的请求或 token 数。",
  latency: "延迟：单个请求从提交到获得结果所等待的时间。",
  checkpointing: "梯度检查点：反向时重算部分前向以减少激活存储。",
  LoRA: "LoRA：用两个低秩矩阵学习冻结权重的任务增量。",
  QLoRA: "QLoRA：用 4-bit 冻结基座配合 LoRA 训练的方案。",
  rank: "秩：线性变换中独立方向数量；LoRA 中也指瓶颈维度。",
  quantization: "量化：用更少比特近似表示权重或激活。",
  policy: "策略：给定状态时对动作给出概率的规则。",
  state: "状态：对预测未来转移和奖励足够的信息表示。",
  action: "动作：智能体在状态中作出的选择。",
  reward: "奖励：环境在一步交互后返回的标量反馈。",
  trajectory: "轨迹：状态、动作和奖励按时间组成的交互序列。",
  return: "回报：从当前时刻起未来奖励的折扣累计。",
  discount: "折扣因子：控制未来奖励在当前回报中权重的系数。",
  critic: "Critic：估计状态或动作价值、帮助降低策略梯度方差的模型。",
  baseline: "Baseline：从回报中减去以降低梯度方差的基准。",
  advantage: "优势：某动作价值相对该状态平均价值的差。",
  "on-policy": "On-policy：训练数据由当前策略或非常接近的策略产生。",
  "off-policy": "Off-policy：训练数据可由不同于目标策略的行为策略产生。",
  bootstrap: "Bootstrap：用当前价值估计构造尚未观测的未来目标。",
  "Monte Carlo": "Monte Carlo：通过完整采样回报估计期望的方法。",
  TD: "TD：用一步奖励和下一状态估值构造时序差分目标。",
  GAE: "GAE：按折扣加权多个 TD residual 的优势估计方法。",
  RLHF: "RLHF：利用人类反馈训练奖励或偏好目标来对齐模型。",
  RLVR: "RLVR：使用可自动验证结果作为奖励的强化学习。",
  PPO: "PPO：用新旧策略概率比和截断 surrogate 控制更新的方法。",
  GRPO: "GRPO：用同一 prompt 多条回答的组内奖励构造优势的方法。",
  DPO: "DPO：直接用偏好对和 reference log-ratio 训练策略的方法。",
  SFT: "SFT：在示范输入输出上进行监督式微调。",
  distillation: "蒸馏：让学生模型学习教师输出或分布的训练过程。",
  OPD: "OPD：在学生自己的 rollout 前缀上进行逐 token 教师蒸馏。",
  OPSD: "OPSD：同一模型以普通和特权上下文分别充当学生与教师。",
  "privileged information":
    "特权信息：训练教师可见、部署时学生不可见的答案、提示或反馈。",
  verifier: "验证器：按可执行规则判断回答是否满足目标的程序。",
  rollout: "Rollout：按策略从初始状态采样得到的一条完整交互。",
  "reward hacking": "奖励作弊：策略利用代理奖励漏洞而非完成真实目标。",
  "exposure bias": "Exposure bias：训练前缀与模型推理时自生成前缀不一致。",
  "credit assignment": "信用分配：判断序列中哪些动作应为结果负责。",
  "importance ratio": "重要性比率：当前策略与行为策略对同一动作的概率比。",
  "reference policy": "参考策略：用于约束当前模型不要过度漂移的基准策略。",
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const entries = Object.entries(GLOSSARY).sort(
  ([left], [right]) => right.length - left.length,
);
const definitionByLowercaseTerm = new Map(
  entries.map(([term, definition]) => [term.toLowerCase(), { term, definition }]),
);
const termPattern = new RegExp(
  entries.map(([term]) => escapeRegExp(term)).join("|"),
  "gi",
);

function isAsciiWordCharacter(character) {
  return Boolean(character && /[A-Za-z0-9_]/.test(character));
}

export function getDefinition(term) {
  return definitionByLowercaseTerm.get(String(term).toLowerCase())?.definition;
}

export function annotateGlossary(value, seenTerms = new Set()) {
  const source = String(value);
  let cursor = 0;
  let output = "";

  for (const match of source.matchAll(termPattern)) {
    const matchedText = match[0];
    const start = match.index ?? 0;
    const end = start + matchedText.length;
    const entry = definitionByLowercaseTerm.get(matchedText.toLowerCase());
    const canonical = entry?.term;

    if (
      !entry ||
      seenTerms.has(canonical) ||
      (isAsciiWordCharacter(matchedText[0]) &&
        (isAsciiWordCharacter(source[start - 1]) ||
          isAsciiWordCharacter(source[end])))
    ) {
      continue;
    }

    output += escapeHtml(source.slice(cursor, start));
    output +=
      `<dfn class="glossary-term" tabindex="0" ` +
      `data-definition="${escapeHtml(entry.definition)}">` +
      `${escapeHtml(matchedText)}</dfn>`;
    cursor = end;
    seenTerms.add(canonical);
  }

  output += escapeHtml(source.slice(cursor));
  return output;
}
