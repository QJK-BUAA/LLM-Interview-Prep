import { SOURCE_FILES, SOURCE_REVISION } from "./source-revision.js";

export { SOURCE_REVISION };
export const SOURCE_REPOSITORY = "https://github.com/XavierZhang2002/agentic-rl-analysis";
const anchor = (chapterId, sectionId, ...terms) => ({ chapterId, sectionId, terms });
const mapping = [
  ["README.md", ["00"], "两份报告的学习入口", [anchor("00", "intuition", "Post-Training", "Agentic RL")]],
  ["README_zh.md", ["00"], "中文学习路线与来源说明", [anchor("00", "comparison", "完整路线", "Agentic RL")]],
  ["docs/index.md", ["00", "24", "29"], "算法、工业与Agent三层全景", [anchor("00", "intuition", "30 章"), anchor("24", "intuition", "PPO"), anchor("29", "intuition", "两份报告")]],
  ["docs/post-training/index.md", ["00", "24"], "算法基础、工业实践与综合选择", [anchor("00", "comparison", "后训练面试路线"), anchor("24", "comparison", "选型")]],
  ["docs/post-training/ch1/1.1-training-landscape.md", ["00"], "Pre/Mid/Post训练的任务与边界", [anchor("00", "intuition", "Mid-Training", "数据分布")]],
  ["docs/post-training/ch1/1.2-rlhf-rlvr.md", ["16", "25"], "奖励来源与多轮任务独立于更新算法", [anchor("16", "intuition", "RLHF", "RLVR"), anchor("25", "intuition", "RL")]],
  ["docs/post-training/ch1/1.3-dpo.md", ["18"], "隐式奖励、离线分布与工业位置", [anchor("18", "derivation", "Bradley-Terry", "DPO"), anchor("18", "comparison", "工业 Pipeline")]],
  ["docs/post-training/ch1/1.4-ppo.md", ["16"], "PPO、GAE、old/reference与clip", [anchor("16", "derivation", "PPO", "GAE")]],
  ["docs/post-training/ch1/1.5-grpo.md", ["17"], "组相对优势及零方差组", [anchor("17", "example", "RLOO", "标准化")]],
  ["docs/post-training/ch1/1.6-dapo.md", ["17"], "DAPO四项配方与成本", [anchor("17", "derivation", "Clip-Higher", "Dynamic Sampling", "Overlong Reward Shaping")]],
  ["docs/post-training/ch1/1.7-vapo.md", ["20"], "价值预训练、解耦GAE与正例NLL", [anchor("20", "derivation", "VAPO")]],
  ["docs/post-training/ch1/1.8-cispo.md", ["20"], "CISPO裁剪IS权重而非GSPO序列目标", [anchor("20", "derivation", "CISPO")]],
  ["docs/post-training/ch1/1.9-gspo.md", ["20", "28"], "序列ratio、MoE与路由重放互补", [anchor("20", "derivation", "GSPO"), anchor("28", "pitfall", "路由")]],
  ["docs/post-training/ch1/1.10-sapo.md", ["20"], "软门控、温度和梯度边界", [anchor("20", "derivation", "SAPO")]],
  ["docs/post-training/ch1/1.11-cheatsheet.md", ["20", "24"], "更新机制与七种算法的速查", [anchor("20", "comparison", "CISPO", "GSPO"), anchor("24", "comparison", "VAPO", "SAPO")]],
  ["docs/post-training/ch1/1.12-evolution.md", ["20", "24"], "演进分支而非单一替代链", [anchor("20", "intuition", "PPO"), anchor("24", "intuition", "演进图", "CISPO")]],
  ["docs/post-training/ch2/2.1-deepseek.md", ["22"], "R1/V3/V3.2、专家蒸馏与资源口径", [anchor("22", "intuition", "DeepSeek")]],
  ["docs/post-training/ch2/2.2-kimi.md", ["23", "28"], "K1.5/K2/K2.5、partial rollout与PARL", [anchor("23", "intuition", "Kimi"), anchor("28", "comparison", "Kimi")]],
  ["docs/post-training/ch2/2.3-qwen.md", ["22"], "Qwen迭代、思考模式与混合架构", [anchor("22", "intuition", "Qwen")]],
  ["docs/post-training/ch2/2.4-minimax.md", ["23", "28"], "长短训练、CISPO与Forge工程", [anchor("23", "intuition", "MiniMax"), anchor("28", "comparison", "Forge")]],
  ["docs/post-training/ch2/2.5-glm.md", ["19", "23", "28"], "GLM-5阶段蒸馏与TITO、异步一致性", [anchor("19", "derivation", "GLM-5"), anchor("23", "intuition", "GLM"), anchor("28", "intuition", "TITO")]],
  ["docs/post-training/ch2/2.6-seed.md", ["22"], "DAPO/VAPO与Seed案例，区分实证和推断", [anchor("22", "intuition", "Seed")]],
  ["docs/post-training/ch2/2.7-closed-source.md", ["23"], "闭源公开对齐与技术披露边界", [anchor("23", "comparison", "OpenAI")]],
  ["docs/post-training/ch2/2.8-cross-model.md", ["24"], "跨模型经验、奖励和阶段比较", [anchor("24", "comparison", "六条跨模型经验")]],
  ["docs/post-training/ch2/2.9-data-engineering.md", ["21", "28"], "数据获取、质量、课程与环境", [anchor("21", "intuition", "SFT", "RL"), anchor("28", "example", "环境")]],
  ["docs/post-training/ch2/2.10-agentic-training.md", ["19", "23", "25", "28"], "从ARC基座到多轮Agent训练系统", [anchor("19", "intuition", "Cross-Stage"), anchor("23", "intuition", "GLM"), anchor("25", "diagram", "环境"), anchor("28", "derivation", "策略")]],
  ["docs/post-training/ch3/3.1-timeline-paradigms.md", ["00", "24", "25"], "训练阶段与有条件的历史脉络", [anchor("00", "intuition", "Pre-Training"), anchor("24", "intuition", "2017", "2023"), anchor("25", "intuition", "Agentic RL")]],
  ["docs/post-training/ch3/3.2-challenges-future.md", ["20", "24", "26", "28"], "信任域、critic、反馈、粒度和遗忘", [anchor("20", "pitfall", "梯度"), anchor("24", "pitfall", "五个挑战"), anchor("26", "intuition", "奖励"), anchor("28", "pitfall", "训练")]],
  ["docs/post-training/ch3/3.3-opinions.md", ["24", "29"], "九条作者观点作为可检验假设", [anchor("24", "pitfall", "九条观点"), anchor("29", "pitfall", "观点")]],
  ["docs/agentic-rl/index.md", ["25", "29"], "四挑战与有边界的方法索引", [anchor("25", "intuition", "Agentic RL"), anchor("29", "comparison", "索引表")]],
  ["docs/agentic-rl/ch1/1.1-overview.md", ["25"], "多轮状态、反馈与四个挑战", [anchor("25", "intuition", "环境")]],
  ["docs/agentic-rl/ch1/1.2-reward-stability.md", ["26"], "IGPO/CM2/SeeUPO/SAMPO/VCPO及相关方法", [anchor("26", "comparison", "IGPO", "VCPO")]],
  ["docs/agentic-rl/ch1/1.3-exploration-credit.md", ["27"], "记忆探索与步骤信用分配方法", [anchor("27", "comparison", "GiGPO", "ProxMO")]],
  ["docs/agentic-rl/ch1/1.4-engineering.md", ["28"], "工业异步系统、环境与轨迹构造", [anchor("28", "comparison", "环境")]],
  ["docs/agentic-rl/ch1/1.5-algorithm-summary.md", ["29"], "按失败位置检索方法，校正Tier依据", [anchor("29", "comparison", "SeeUPO", "EMPO²", "Tier")]],
  ["docs/agentic-rl/ch2/2.1-landscape.md", ["29"], "三路线、生态与统计证据边界", [anchor("29", "diagram", "路线 A", "路线 B", "路线 C"), anchor("29", "comparison", "开源生态")]],
  ["docs/agentic-rl/ch2/2.2-outlook.md", ["29"], "六个判断与短中长期预测", [anchor("29", "pitfall", "六条核心判断", "2027")]],
];

export const SOURCE_DOCUMENTS = Object.freeze(mapping.map(([path, chapters, topics, coverage]) => {
  const identity = SOURCE_FILES.find(file => file.path === path);
  if (!identity) throw new Error(`Unrecognized source path: ${path}`);
  return Object.freeze({
    ...identity, chapters, topics, coverage,
    url: `${SOURCE_REPOSITORY}/blob/${SOURCE_REVISION}/${path}`,
    evidence: /opinions|outlook|landscape|challenges-future/.test(path)
      ? "来源观点与综述；在课程中区分事实、条件与假设"
      : "二级综述；算法定义和技术结果以课程所列原始来源校准",
  });
}));

export function sourcesForChapter(chapterId) {
  return SOURCE_DOCUMENTS.filter(source => source.chapters.includes(chapterId));
}

export function validateSourceManifest(chapters) {
  const errors = [];
  const expected = new Set(SOURCE_FILES.map(file => file.path));
  const found = new Set();
  for (const source of SOURCE_DOCUMENTS) {
    if (found.has(source.path)) errors.push(`duplicate source: ${source.path}`);
    found.add(source.path);
    if (!expected.has(source.path)) errors.push(`unknown source: ${source.path}`);
    if (source.coverage.length === 0) errors.push(`no coverage: ${source.path}`);
    for (const id of source.chapters) {
      if (!chapters.some(chapter => chapter.id === id)) errors.push(`${source.path}: missing chapter ${id}`);
      if (!source.coverage.some(anchor => anchor.chapterId === id)) errors.push(`${source.path}: no anchor for ${id}`);
    }
    for (const anchor of source.coverage) {
      const section = chapters.find(chapter => chapter.id === anchor.chapterId)?.sections.find(section => section.id === anchor.sectionId);
      if (!section) {
        errors.push(`${source.path}: missing ${anchor.chapterId}/${anchor.sectionId}`);
        continue;
      }
      for (const term of anchor.terms) {
        if (!section.body.normalize("NFKC").toLowerCase().includes(term.normalize("NFKC").toLowerCase())) {
          errors.push(`${source.path}: ${anchor.chapterId}/${anchor.sectionId} missing body term ${term}`);
        }
      }
    }
  }
  for (const path of expected) if (!found.has(path)) errors.push(`unmapped source: ${path}`);
  return errors;
}
