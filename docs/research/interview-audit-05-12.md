# 第 05–12 章数学与面试深度修订审计

日期：2026-09-28。依据已批准的 `2026-09-28-interview-math-design.md` 与 `2026-09-28-interview-math.md` 执行。

## 范围与锁定状态

- 仅修改 `content/chapter-05.js` 至 `content/chapter-12.js`、本文件和 `scripts/check-math-05-12.py`。
- 正文已锁定；未修改共享 UI、schema、catalog、source-manifest 或其他章节，未创建提交。
- 八章共 118 个小节：保留原 72 个小节，新增 8 个 roadmap、30 个独立数学主题、8 个 whiteboard。
- 每章首节均为 `id: "roadmap", type: "roadmap"`，说明先修能力和学习顺序；每章至少 3 个真实章内目标，level 仅使用“必会”“推导”“进阶”。
- 白板题共 31 道，每章至少 3 道，均使用 `q/a`，答案包含完整过程和“得分点”。
- 所有原九个 ID 均保留：`intuition`、`example`、`diagram`、`derivation`、`code`、`pitfall`、`comparison`、`interview`、`quiz`。原自测未被白板题替换。

最后一批正文变化已通知主集成：05–11 的原 `interview` 增加公式追问；06 的 `math-normalization` 增加 BN 运行统计算例；07 的 `code` 澄清谱半径不能完整刻画有限时间梯度，并补充遗忘门来源。之后只补数值检查与本审计，不再修改正文。

## 精确新增 ID

下表中的 ID 都是各章局部 ID；每章另外新增 `roadmap` 和 `whiteboard`。

| 章 | 新增独立数学小节 ID | 总小节数 | 白板题数 |
| --- | --- | ---: | ---: |
| 05 | `math-activations`、`math-softmax-ce`、`math-gradient-check` | 14 | 3 |
| 06 | `math-initialization`、`math-normalization`、`math-dropout-clipping` | 14 | 4 |
| 07 | `math-convolution`、`math-lstm`、`math-gru-causality` | 14 | 4 |
| 08 | `math-tokenizer-objectives`、`math-embedding-gradients`、`math-temperature`、`math-likelihood-perplexity` | 15 | 4 |
| 09 | `math-attention-scaling-mask`、`math-attention-backward`、`math-transformer-flops`、`math-residual-jacobian` | 15 | 4 |
| 10 | `math-rope-relative`、`math-rmsnorm-backward`、`math-swiglu-budget`、`math-kv-mla`、`math-moe-routing` | 16 | 4 |
| 11 | `math-memory-zero`、`math-flashattention-online`、`math-prefill-decode`、`math-parallel-communication` | 15 | 4 |
| 12 | `math-lora-gradients`、`math-rank-scale-merge`、`math-quantization`、`math-peft-memory` | 15 | 4 |

## 覆盖与推导链

| 章/小节 | 完整教学内容与边界 |
| --- | --- |
| 05 / `math-activations` | sigmoid 商法则、tanh 与 sigmoid 的关系、ReLU 分段导数；饱和连乘、零点不可导、隐藏激活与输出 BCE 的区别。 |
| 05 / `math-softmax-ce` | C 维 logits 与归一化标签；完整 Jacobian、任意上游 VJP、CE 化简、非归一化标签、平移零空间和稳定 log-sum-exp。 |
| 05 / `derivation` | batch 平均 CE 到两层 MLP 的全部权重、偏置、输入梯度；外积、转置、广播求和与完整数值矩阵。 |
| 05 / `math-gradient-check` | 中心差分 Taylor 误差、浮点步长权衡、方向导数、固定随机性、ReLU 边界反例。 |
| 06 / `derivation` | SGD、两种 momentum 系数约定、Adam 几何级数偏差修正、二阶原始矩、AdamW/L2 的可计算反例。 |
| 06 / `math-initialization` | fan-in/fan-out 的前后向二阶矩传播；Xavier 折中、均匀范围、He 的对称性假设；不把 ReLU 二阶矩减半说成中心化方差减半。 |
| 06 / `math-normalization` | BN/LN 统计轴、affine 参数维度、BN 运行均值/方差与估计约定、LN/训练 BN 完整反向、冻结统计推理导数。 |
| 06 / `math-dropout-clipping` | inverted dropout 条件均值/方差/反向；全局范数投影、零梯度、unscale/累积/分片顺序，梯度界与 Adam 更新界不同。 |
| 07 / `math-convolution` | 互相关约定、stride/padding/dilation/group、输出尺寸、参数/MAC/FLOPs、感受野递推、重叠窗口反向与转置卷积的伴随含义。 |
| 07 / `derivation` | 列向量 RNN、逐步 loss 上游与未来梯度相加、完整 BPTT 共享参数求和；Jacobian 连乘顺序、范数上界及 detach 梯度反例。 |
| 07 / `math-lstm` | 现代无 peephole LSTM 四组投影、两个状态、参数量、四门反向、cell/hidden 两条梯度路径；直接遗忘边不等于全状态 Jacobian。 |
| 07 / `math-gru-causality` | 完整 GRU、reset-before/after 与更新门含义、完整局部 Jacobian、参数量；双向模型和因果卷积的未来泄漏边界。 |
| 08 / `example`、`math-tokenizer-objectives` | 修正原 BPE 首轮计数：词尾对频数 11 大于 e/w 的 9；第二轮 n/e 为 9。Unigram 切分边缘似然、EM、动态规划/Viterbi 区别。 |
| 08 / `derivation`、`math-embedding-gradients` | 查表/输出维度与显式 label shift；scatter-add、输入/输出共享矩阵的两路梯度、输出侧稠密梯度。 |
| 08 / `math-temperature` | 概率比、logits/温度导数、温度 CE 的链式因子、零温并列最大值、截断后采样分布。 |
| 08 / `math-likelihood-perplexity` | 序列链式 likelihood、EOS/提示边界、有效 token mean、PPL、跨设备计数加权与全零 mask；跨 tokenizer 不可直接比较。 |
| 09 / `derivation`、`math-attention-scaling-mask` | 完整多头前向/LM loss；缩放方差的独立性条件和协方差推广；支持集、singleton 与全屏蔽行。 |
| 09 / `math-attention-backward` | 非方形 Q/K/V 维度、AV 反向、softmax 行 VJP、QK 反向、QKV/O 投影及共享输入梯度、dropout 边界。 |
| 09 / `math-transformer-flops` | MHA 与 FFN 参数和前向 FLOPs；稠密因果口径、固定隐藏维改变头数、注意力/FFN 算术量交点。 |
| 09 / `math-residual-jacobian` | Pre/Post-LN 的矩阵链式法则、LN Jacobian、共同平移方向反例、epsilon/最终 norm 与稳定性边界。 |
| 10 / `math-rope-relative` | 旋转正交性、相对位置代数、逆旋转反向、周期反例、通道配对与扩窗条件。 |
| 10 / `math-rmsnorm-backward` | 分母完整导数、gamma 梯度、与 LN 的差异、径向尺度不变性、epsilon/零输入边界。 |
| 10 / `math-swiglu-budget` | 三矩阵维度、等参数宽度 8H/3、对应 FLOPs、SiLU 与两支反向、门输出零但门梯度非零的例子。 |
| 10 / `math-kv-mla` | MHA/MQA/GQA 头数、投影量与缓存；解耦 RoPE MLA 的压缩缓存、key/value 上投影吸收及位置项；不宣称 MLA 总比 MQA 小。 |
| 10 / `math-moe-routing` | top-k 索引/连续 gate、选后归一化、top-1 主任务 router 梯度边界；Switch 风格辅助项及 logits 梯度、capacity 和 all-to-all。 |
| 11 / `math-memory-zero` | 逐状态 dtype 账单、ZeRO-1/2/3 分片式、激活矩阵实例、workspace/预取/碎片与理论常驻量不同。 |
| 11 / `math-flashattention-online` | m/分母/分子不变量、新最大值重缩放、两块算例、SRAM tile/HBM 保存、反向重算、全屏蔽与浮点顺序边界。 |
| 11 / `math-prefill-decode` | prefill 平方项与 decode 单步线性项、生成多步长度求和、KV/权重搬运、roofline 下界与 TTFT/TPOT。 |
| 11 / `math-parallel-communication` | ring 发送量与延迟/带宽项、列/行张量分片、序列并行边界、fill-drain 气泡、专家通信。 |
| 12 / `derivation`、`math-lora-gradients` | LoRA 参数/缩放、逐步微分到 A/B/x、batch 求和、冻结基座输入梯度、B 零初始化与双零驻点。 |
| 12 / `math-rank-scale-merge` | 增量秩而非整体权重秩、因子不可辨识、两种 rank 缩放的方差假设、eval 合并、多 adapter 和重数量化边界。 |
| 12 / `math-quantization`、`math-peft-memory` | 明确非 NF4 的均匀量化手算、NF4 查表/尺度、输出误差界、冻结量化参数反向；双重量化元数据与逐目标矩阵状态账单。 |

## 独立数值核验

执行命令：

```sh
python3 scripts/check-math-05-12.py
```

最终结果：**129 组数值比较通过，21 组有限差分测试覆盖 130 个坐标**。脚本仅使用 Python 标准库，没有调用 NumPy、autograd 或网络服务。

有限差分采用同一前向标量损失的正负扰动，不用第二份梯度公式充当“数值答案”。默认步长为 `1e-6`，每坐标接受误差为 `2e-6 + 2e-6 * max(abs(actual), abs(expected))`。手算输出另用通常 `1e-9` 的绝对/相对容差。

| 位置/测试 | 实际核验结果 |
| --- | --- |
| 05 softmax/CE | p=[0.5,0.25,0.25]，CE=log 4，梯度 [0.5,-0.75,0.25]；逐行 Jacobian 与 CE 均通过有限差分。 |
| 05 完整 MLP | loss=log 2；W1/W2/b1/b2/X 共 14 坐标通过，最大绝对误差 `9.664e-11`。 |
| 06 Adam/初始化/dropout/clip | AdamW=1.88，Adam+L2=1.9；He std≈0.0883883；dropout 均值2、方差4/3；裁剪=[1.2,1.6]。 |
| 06 BN/LN | 新运行均值/方差=0.2/1.1；LN 手算梯度≈[0.204124,-0.408248,0.204124]；epsilon=0 和 1e-5 均检查输入及 affine 梯度。 |
| 07 CNN/RNN | 卷积 dK=[5,8]、dx=[2,3,-2]、db=3；线性 RNN 最终状态2.25、共享 dw=1，均通过有限差分。 |
| 07 LSTM/GRU | LSTM h≈0.380797、直接旧 cell 梯度≈0.104994；GRU h≈1.690399，固定门状态导数通过有限差分。 |
| 08 BPE/Unigram | 首轮词尾对11、次轮n/e对9；Unigram P(ab)=0.36，一次 M 步=[4/13,4/13,5/13]。 |
| 08 embedding/T/PPL | 共享总梯度三行为 [1,-0.5]、[2.5,1.75]、[0.5,3.75]；T=2 的 CE 梯度=[1/3,-1/3]；masked PPL=√8≈2.828427。 |
| 09 Attention 手算 | O=[0.5,3]；Q/K/V 全10坐标通过，最大绝对误差 `3.742e-10`。 |
| 09 Attention 边界 | 两查询/三键、不同 key/value 维度、因果/padding mask 共19坐标通过，最大误差 `2.105e-10`；singleton Q 梯度与不可见 K/V 梯度为零，全屏蔽行明确拒绝。 |
| 09 FLOPs/LN | 主矩阵前向 FLOPs=838,860,800；Pre/Post-LN 共同平移方向导数分别为 [1,1,1] 和 [0,0,0]。 |
| 10 RoPE/RMSNorm | 非平凡向量验证相对旋转恒等式；RMS 手算梯度≈[0.505964,-0.252982]；正常输入最大有限差分误差约 `1.643e-10`。 |
| 10 RMS 零输入 | epsilon=1e-5，最大绝对误差 `1.581e-5`，对应约632量级导数的相对误差约 `2.5e-8`，满足混合容差；不把大绝对导数隐藏为“零梯度”。 |
| 10 缓存/MoE | MHA/GQA/MQA/MLA=8192/2048/256/576元素；辅助损失0.028，固定离散分配后的 router 梯度通过有限差分。 |
| 11 显存/FlashAttention | ZeRO 状态=112/38.5/26.25/14 GB；KV=512 MiB；在线归一化结果19/3，逆序分块、+1000分数平移、向量value均与全量结果一致。 |
| 11 通信/流水线 | 每卡 ring 发送1.75 GiB，示意通信35.07 ms；4-stage/8-microbatch 利用率8/11。 |
| 12 LoRA | dA=[-2,-1]、dB=[6,-4]、dx=[2,-1]；非零、B零、A/B双零三种初始化全18坐标通过；最大绝对误差 `7.484e-10`。 |
| 12 量化/内存 | 均匀码[-7,-1,2,7]、最大误差2/35；adapter=8,388,608参数、128 MiB状态；示意双重量化4.126953125 bit/参数、7B payload≈3.611084 GB。 |

脚本验证的是正文指定算例与有代表性的梯度边界，不声称覆盖所有随机张量、完整 LSTM/GRU 参数梯度、真实 CUDA kernel、实际 NF4 码本或系统性能。BPE 平局/重复串替换、BN 运行方差、GRU reset 位置、MLA 布局和 MoE 辅助目标均明确为实现相关约定。

## 结构、公式与来源

最终逐章 `node --check` 均通过；动态导入并调用当前 `validateChapter`，校验唯一 ID、首节路线、链接目标/level、白板题及得分点。另与 `git show HEAD:content/chapter-XX.js` 的原章对象比较，确认原 ID/type 与全部 **33 条原来源的 label/url/evidence** 保留。

使用当前 renderer 输出并在 Node VM 中加载离线 KaTeX，以 `throwOnError: true` 解析正文和答案；同时检查未闭合数学分隔符、面试模式是否保留每个 derivation。

| 章 | 渲染公式出现次数 |
| --- | ---: |
| 05 | 138 |
| 06 | 140 |
| 07 | 148 |
| 08 | 130 |
| 09 | 182 |
| 10 | 135 |
| 11 | 85 |
| 12 | 131 |
| 合计 | 1089 |

公式计数包含重复引用和答案，只用于防渲染回归，不作为内容质量或面试能力的代理指标。最终检查无解析失败。

新增10条来源：06 的 Xavier 原论文、BN、LN；07 的卷积教材、GRU 早期论文、LSTM 遗忘门论文；08 的 Subword Regularization；09 的 Transformer LayerNorm 分析；10 的 GLU Variants 与 Switch Transformers。来源用于定位机制定义，教学数字明确为自行构造与计算，不宣称来自论文实验或新完成原论文全面复现。尤其不把现代遗忘门全部归于1997年 LSTM，不把均匀 int4 教学例称作 NF4，不把示意 MLA/量化布局当成某个模型的已测配置。

已读取 `content/source-manifest.js`：当前共享综述映射没有指向05–12的锚点。本分工未修改该文件；章节自身原有来源完整保留。

## 集成交接

- 主集成于本轮反馈：数值 suite 已通过，全30章、两模式、三宽度布局已通过。这是主集成的验收结果，本分工没有重复执行浏览器，也不将其冒充独立浏览器证据。
- 正文锁定后的最后数值脚本增加了 BN 运行统计0.2/1.1检查，最终再次运行通过：129 checks、130 finite-difference coordinates。
- 正文锁定后的 scoped 语法/结构/KaTeX 检查已再次通过，最终公式出现次数为1089。
- 共享测试、UI和浏览器最终验收由主集成负责；本分工仅交付上述10个允许文件，无提交。
