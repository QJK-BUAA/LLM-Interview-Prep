# 学习阅读层次修订

用户要求重新详细检查公式是否妨碍学习，并合理修正。此前还明确要求保留面试公式、讲清上下文，不能用隐藏符号破坏句子。当前已公开在 GitHub Pages；本轮先在 `feat/learning-readability` 完成和验证再同步网站。

## 确认的问题

基线 `f66109b`，31 章、458 小节、148 个 derivation。已逐章阅读 summary、example、roadmap、全部推导的开场（后半程另读结尾），完整阅读 01、02、30，以及 03 熵/MLE、04 logistic/SVM/XGBoost、05 gradient check、06 Adam、09 attention backward、15 GAE。此范围足以定位阅读层次问题，不声称再次全文核对所有论文或全部正文。

- 学习/面试都默认展开全部推导；01 的多个反向专题先于 02 的链式法则，00 的回访证明也直接铺开。
- 02 七个数学专题、04 十三个专题未区分一次学习任务；每个专题有问题开头，但读者无法先得到简明结论再决定是否展开。
- 01/02 的维度声明、03 的估计与先验、04 的对偶/Hessian、09/15 的矩阵反向与有限和，段内符号集中；白板答案缺分步停顿。
- 30 的三种聚合反复展示，还有权重方向反了、mask 等于不反传、无 EOS 就永远不停、换模板必须完整重训、reference 不能变、固定 epoch 通则等错误或过强结论。学习困难不能只归因于排版。
- 旧“公式/千字”把单符号、重复式与完整推导混算，不能据此给出适宜学习的正常阈值。

## 方案

采用正文编辑与渐进展开结合。仅删公式会损失面试内容；仅隐藏 KaTeX 会留下残句；仅折叠而无要点会变成标题墙。

1. `content/reading-guides.js` 为 31 章逐章写首轮目标、完成判断与继续深入的专题 ID；为每个 derivation 写 1–2 句自然语言要点，包含真实机制、算例结论或边界。不得按标题套模板自动生成。
2. 学习模式：例子与图/代码保留，每个推导先露出要点，详细公式与证明默认收起。每章有明确首轮任务；公式索引仍在路线之后。
3. 面试模式：完整推导默认展开，题目答案仍折叠；图和代码也保留，说明实现同样可能被问到。
4. 原生 details 支持键盘和触摸；深链接、搜索、路线点击自动展开目标推导。展开/收起全部继续有效。所有旧 section ID、storage key、完成记录保持。
5. 改写密集段落为问题→具体数字→解释→一般式→条件。重写 01 基础规则/矩阵反传/广播/masked mean，02 矩阵微分/Lasso/白板分步，03 熵/MLE，04 logistic/SVM/XGBoost，06 Adam，09 attention backward，15 GAE。30 按同一翻译示范重写，去掉伪必要公式和无依据通则。
6. 不增加第三个阅读模式，不重编号、不变更固定来源 37 文档映射，不扩写无关课程。

## SFT 纠错依据与决策

2026-10-08 定向读取 Hugging Face 官方 SFTTrainer 的 dataset、loss、packing、assistant-only/completion-only 与 tool-calling 段，以及 Transformers chat templates 页。网页当时显示 TRL v1.14.2、Transformers v5.17.0；未将其默认实现视为永恒规则。

- https://huggingface.co/docs/trl/sft_trainer
- https://huggingface.co/docs/transformers/chat_templating

统一写“本章采用 assistant-only 目标”；全序列 LM 目标是另一合法选择。prompt 不作为直接标签仍经注意力参与反传。预测位置与目标位置差一，显式 shift 或模型内部 shift 二选一。

token mean 对每个 token 等权，sequence mean 对每条回答等权；固定 batch 下 sequence-sum/B 与 token mean 仅差平均有效长度，非必有不同最优点，梯度范数不能普遍以均长换算。固定示范 teacher forcing 不能用模型提前生成 EOS 来逃避后面的 loss。

隔离 packing 要同时保证同样本因果可见性和跨样本 label 边界；只有 separator 或 position reset 不会阻止 attention。给出教学可运行的小张量代码，用显式段标记，不能用某个角色 token 的最后一个 ID 搜索边界。

以验证趋势、真实生成、任务保留与预设预算选 checkpoint；失败于指令下限可能说明还需训练，不能写成立即停止的 iff 定理。移除 `math-completion-criteria` 的假公式，保留 ID，将其类型改为 comparison（总小节/进度不变）。

## 验收

自动检查验证元数据覆盖、链接有效、模式和默认折叠、原题保留及进度。数学程序核验保留算例与 SFT 权重；代码行为核验 shift/assistant masks/跨样本隔离。全量 KaTeX、已有 Node 与 Python 套件必须通过。

浏览器以新 `readability-*` 前缀跑 31 章×3 宽度×2 模式，检查默认视图与展开全文两种状态；原生点击验证展开、深链、搜索、模式、完成、键盘、代码与术语。只把可见公式减少用作呈现证据，不声称它证明学习效果。查看 01/02/30 的代表截图。修复发现的已知 24 手机长公式溢出，验收不得隐藏失败。

最终报告说明实际阅读范围、实质变化、正确性修复、验证和未做学习者实验；网站核对到新文件才声称发布完成。
