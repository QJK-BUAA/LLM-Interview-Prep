# 全量整合与主线校正记录

核验日期：2026-09-27。上游固定于 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`。

## 来源范围与教学落点

源仓库全部 37 个 Markdown 路径已与获批规格逐项比较。`source-inventory.json`
保存由固定 Git 对象读取的 SHA-256、字节数和标题；`content/source-revision.js`
保存同一来源身份，`content/source-manifest.js` 提供 61 个正文锚点。
校验不仅要求有外部引用，还要求目标章节、小节和主题词实际存在。

关键词门禁用于防遗漏，不能单独证明教学充分性。正文核验分别记录在：

- `advanced-policy-data-evidence.md`：算法定义、梯度系数、数据获取与质量。
- `industrial-evidence.md`：模型训练阶段、成本和评测口径、闭源披露边界。
- `agentic-core-evidence.md`：序贯建模、奖励、稳定性、理论条件。
- `agentic-exploration-systems-evidence.md`：探索、步骤信用、环境与训练系统。

来源主报告 ch3、Agentic ch2 和索引文档由主集成读取，重组至 00、24、29：
保留技术演进、五挑战、九条后训练观点、六条 Agentic 判断及三条路线。
未给出可复算编码表的论文频率、机构占比和影响力 Tier 不作为领域事实复述，
其证据局限在 29 章正文说明。作者预测转化为有反证条件的研究假设。

## 主集成追加的一手核验

### GLM-5 的 Mid-Training 与跨阶段 OPD

来源：https://arxiv.org/html/2602.15763v1#S2.SS3

短摘录：“We progressively extend the context window across three stages”。
支持中间训练按数据与上下文目标继续学习，不能把 Pre/Mid/Post 的阶段边界
或某个算力百分比写成所有模型的普适定义。对应第 00、11 章。

来源：https://arxiv.org/html/2602.15763v1#S3.SS5

短摘录：“the final checkpoints from the preceding training stages serve as teacher models”。
公式为停止梯度的教师推理概率与学生训练概率 log-ratio，并将 group size 设为 1。
第 19 章区分前序 checkpoint 教师与 privileged-context OPSD，解释无需组统计
而使用单样本的原因；不把 sampled-token 策略目标与固定前缀全词表 KL 混为
完整轨迹分布梯度的无条件等式。

### 工业案例中的补充主题

DeepSeek-V3 原始报告：https://arxiv.org/html/2412.19437
R1 原始报告：https://arxiv.org/html/2501.12948

第 22 章补充 Self-Rewarding、MTP 和 PRM/MCTS 负面尝试的定位。
MTP 的辅助预测与投机验证属于训练表示／推理效率，不是 GRPO 奖励创新。
过程奖励和树搜索的局部负面实验不构成所有任务上的不可能性定理。
未复述上游的固定接受率、加速倍数或未绑定协议的 RewardBench 排名。

Gemma 3 原始报告：https://arxiv.org/html/2503.19786v1

核对 Post-Training 的 Techniques 段与参考文献：
“improved versions of BOND … WARM … and WARP”。
文献正式题名分别含 Best-of-N Distillation、Weight Averaged Reward Models、
Weight Averaged Rewarded Policies。第 23 章说明三者分别作用于输出分布、
奖励模型、奖励优化后的策略。Gemma 3 的改进版本不是 Gemini 配方的证据，
也不能据该段推测未披露的全部改动。

## 课程完整性审查

- 00–19 的原基础内容保留；00、11、16–19 增加明确衔接。
- 原 20 的方法选择与二十道综合面试题转移至 24；旧 slug 仍指向该内容。
- 新 20–29 均有九层教学、数值例子、图示、可运行 Python、比较与问答。
- 源文所有具名主算法与次级方法均在正文讲解；避免仅把名字放到来源列表。
- 22、23 与 16–24 保持同一 Part，防止按 Part 分组时把 24 排到 22 前。
- 原渲染器把所有 flow nodes 串成直线；现在每一行表示数据契约里的真实边，
  保留分支、回边和孤立节点，不制造不存在的依赖。
- v1→v2 迁移保留 00–19 进度与设置，重置改换主题的 20，保留 v1 备份。

## 实现说明

继续沿用已存在的 `content/schema.js` 章节对象契约，没有为计数扩展另造格式。
30/270、代码围栏、目标数量、先修顺序及来源覆盖由全目录校验补强。
实现计划列出了 schema 作为可能改动点，最终不需要改其公共 API。

由于用户明确要求立即实施，已经通过的设计没有再引入审批步骤。
原始研究实验不在本任务复现范围；本地 Python 是教学数值验证，浏览器测试
证明课程交互与渲染，不证明厂商训练结果可由本项目复现。
