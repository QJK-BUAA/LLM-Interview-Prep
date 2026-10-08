# 学习可读性修订记录（2026-10-08）

原页面将全部推导直接展开，初学者需要同时处理新概念、维度、梯度与边界条件。修订后先给具体问题、算例和文字要点，详细公式按需展开；面试复习仍可直接查看完整过程。重点正文也重新组织，避免只把原来的困难藏进折叠框。

## 核查范围

基线为 `f66109b`。本轮逐章阅读了 31 章的摘要、例子、路线和全部 148 个原推导的开场；13–29 章另外检查推导收尾。完整阅读 01、02、30 章，并细读 03 的熵/MLE、04 的 logistic/SVM/XGBoost、05 的 gradient check、06 的 Adam、09 的 attention backward、15 的 GAE。

这不是重新全文核验全部 31 章及其全部参考文献。既有全面审查见 [2026-10-07 报告](comprehensive-audit-2026-10-07.md)。本轮结论针对阅读层次、选定密集正文与发现的 SFT 错误。

## 阅读结构

- 31 章各有独立的首轮目标、完成判断、重点链接与回访建议，保存在 `content/reading-guides.js`。
- 147 个详细推导各有具体文字要点，放在原生 `details` 外，折叠后仍可读。
- 学习模式默认收起详细推导，面试模式默认展开；两种模式都保留图解、代码、例子和问题。
- 目录、路线、公式索引和搜索可以展开目标专题；自测及白板答案仍需单独打开。
- 隐藏详情使用独立术语作用域，不会提前消耗后面可见正文的首次释义。
- 31 章顺序、458 个小节 ID、全部题目原文和进度分母保持。SFT 的 `math-completion-criteria` 保留 ID，类型从推导改为对照说明，因此推导专题为 147 个。

## 正文改写示例

| 内容 | 原来的负担 | 修订后的入口 |
|---|---|---|
| 01 矩阵反传 | 先连续声明五组张量，再写三个梯度 | 先算第一权重收到 1×1+3×2=7，再对应求和轴 |
| 01 广播与 masked mean | 同时引入多个下标与分母 | 用表比较 16/20、14/22、36 的共享范围，以及 3.2 与 3 的权重 |
| 02 矩阵求导与 Lasso | 数值验证位于长推导之后 | 先看梯度 7/10、系数 0.5 被压到 0/0.25，再回访微分和次梯度 |
| 02 白板 | 答案为紧密的长段落 | 拆成结果、步骤、得分点，保留问题与边界 |
| 03 熵、MLE/MAP | 定义、估计、先验密集切换 | 分别比较三笔代价、三个不同估计问题，再解释公式 |
| 04 logistic/SVM/XGBoost | 一阶与二阶、原问题与对偶混在首轮 | 先走一步更新、画两个点、核算父叶和子叶的完整目标 |
| 06 Adam | 递推和修正同时出现 | 先用表算方向 2、平方幅度 4，再解释修正与衰减 |
| 09 Attention 反向 | Q/K/V 尺寸和五组梯度同时出现 | 先分开“改内容”与“改读取比例”两条反馈 |
| 15 GAE | 有限几何和先于实际倒推 | 先倒推 0.5、0.51、0.4372，再解释混合权重和端点 |
| 30 SFT | 多种例子、三种聚合多次重复 | 围绕同一翻译示范的三个目标建立主线，聚合集中讲一次 |

第 24 章的两组长行内数值改为可换行的普通数字，解决手机正文溢出。保留关键等式与成立条件，不用删符号留下残句。

## SFT 正确性修订

本轮定向读取 [TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer) 的数据格式、loss、assistant/completion-only、packing 和工具对话内容，以及 [Transformers Chat templates](https://huggingface.co/docs/transformers/chat_templating)。访问时分别显示 TRL v1.14.2、Transformers v5.17.0；文档后续可能更新。章节来源移除失效的 ChatML 路径，不再将未核实的模型配方概括为通则。

1. 明确本章选择 assistant-only，而非宣称所有 SFT 都必须屏蔽 prompt。上下文不作直接标签，仍可经注意力收到梯度。
2. 标出 prompt 长 7、回答长 3 时，标签位置为 7/8/9，预测 logits 为 6/7/8；显式 shift 和内部 shift 只能做一次。
3. 修正权重方向：token mean 让长回答占更多总权重；sequence mean 让各回答等权。
4. 固定 batch 下，sequence sum/B 与 token mean 只差平均有效长度。不能声称两者必有不同最优参数，也不能给 sequence mean 与 token mean 的梯度范数套一个通用倍数。
5. 固定示范的 teacher forcing 不能靠提前生成 EOS 逃避剩余 CE；不训练 EOS 也不意味着模型永远不会停止。
6. 隔离 packing 同时检查同样本因果注意力和跨段首标签。separator、position reset 本身不阻断 attention。
7. 改模板需兼容性验证，未必完整重训；reference 可在明确的新阶段改变，需相应更新定义和概率缓存。
8. 用验证趋势、真实生成、能力保留和预算选择 checkpoint，删除无依据的固定 epoch 通则与停止训练“当且仅当”公式。

第 30 章代码为实际可运行的 PyTorch 小模型，使用显式教学 ID、角色与段标记，不冒充真实 tokenizer 输出。验证包含：独立与 packed 前向一致；修改 A 不影响 B；未来 token 和 padding 不影响有效预测；prompt 表示得到梯度；EOS 与 pad 共用 ID 时按位置区分；跨段首标签被屏蔽。

## 验证证据

已运行：

```bash
npm test
npm run validate
node scripts/validate-content.mjs --range 30-30
node scripts/check-math-rendering.mjs
python3 scripts/check-interview-math.py
python3 scripts/check-comprehensive-math.py
python3 scripts/check-lesson-code.py
ROADMAP_URL=http://127.0.0.1:8011/ ROADMAP_AUDIT_PREFIX=readability node scripts/audit-browser.mjs
ROADMAP_URL=http://127.0.0.1:8011/ ROADMAP_AUDIT_PREFIX=readability node scripts/audit-interactions.mjs
```

40 项 Node 测试通过；31 章内容与指引通过校验；KaTeX 4,460 次数学标记出现全部解析成功。五批既有数值校验全部通过，综合数值检查 8 项、实际正文代码检查 8 项通过。PyTorch 版本为 2.8.0，使用小型 CPU 张量，不代表大模型训练实验。

布局覆盖 31 章 × 3 宽度 × 2 模式，共 186 组，每组同时检查默认视图和全部展开后的视图。没有正文溢出、边界越界或公式降级；导航顺序与 458 个进度项一致。结果见 [布局记录](../../artifacts/readability-layout-audit.json)。

额外用新增要点“前向在哪些位置复用参数”进行原生搜索，点击后进入 `#01/math-broadcast-backward`，学习模式保持，目标推导自动展开，要点可见。

三种宽度的原生交互全部通过，包含模式切换、首轮重点链接、搜索、目录、展开/收起全部、键盘切换、题目答案、复制代码、主题、完成记录与刷新持久化。结果见 [交互记录](../../artifacts/readability-interaction-audit.json)。验收脚本先检查按钮是否可点击，只在遮挡时滚动，避免对手机 sticky 顶栏重复滚动造成假回跳；换行的首轮重点链接采用整块点击区域。

已查看 01、02、30 的桌面及手机截图，以及长篇第 24 章的平板和手机截图。代表结果：[01 学习要点](../../artifacts/readability-01-folded-390x844.png)、[02 展开正文](../../artifacts/readability-02-expanded-390x844.png)、[SFT 分行公式](../../artifacts/readability-sft-mobile-formulas.png)。最后将 SFT 的并排公式改成分行，额外检查其七个可见 display 区域，390px 屏幕下均无横向滚动需求。

## 数量只用于核对呈现

[基线](../../artifacts/readability-baseline.json) 和 [修订摘要](../../artifacts/readability-summary.json) 记录 ID、题目与数量。旧版共 4,808 次数学标记出现，修订后 4,460 次。这包含单符号、重复公式和答案，不能称为 4,460 个独立公式，也不能用“每千字公式数”判定是否适合学习。

同一修订版中，学习模式默认未折叠区域共 502 次数学标记出现，面试模式为 3,930 次，答案仍折叠。这里的“可见”指不被 `details` 折叠，包含向下滚动后可读的内容，并非一个屏幕同时出现的数量。变化表明首轮呈现负担下降；本轮未做学习者实验，不据此声称记忆或面试成绩已提高。
