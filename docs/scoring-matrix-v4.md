# 评分矩阵 V4

## 版本变化

V4 从 24 题扩展到 36 题，并将六维改成更容易理解的前台标签：

- 读空气
- 识边界
- 会生成
- 有品味
- 有立场
- 有来处

后台仍保留三个辅助因子：

- 可 Skill 化
- 健康表达
- 伪抗蒸噪声

## 原始字段

每个选项记录 9 个字段：

```text
context       读空气 0-3
boundary      识边界 0-3
generative    会生成 0-3
taste         有品味 0-3
stance        有立场 0-3
groundedness  有来处 0-3
skillable     可 Skill 化 0-2
expressive    健康表达 0-2
noise         伪抗蒸噪声 0-2
```

## 总分原则

含活人量不是简单奖励“怪”“独特”“不配合”。

高分来自三类能力：

1. 能识别复杂局面。
2. 能生成新的判断和表达。
3. 能把隐性判断说清楚、试出来、协商出来。

低分也不等于差。低分可能代表这个人稳定、流程化、可复用，只是目前更容易被做成同事 Skill。

## 推荐公式

先计算六维正向分：

```text
positive_raw =
  context
  + boundary
  + generative
  + taste
  + stance
  + groundedness
```

按题库实际最高可得分归一：

```text
positive_score = positive_raw / positive_max_for_bank
expressive_score = expressive_raw / expressive_max_for_bank
skillable_score = skillable_raw / skillable_max_for_bank
noise_score = noise_raw / noise_max_for_bank
```

维度均衡度：

```text
balance_score = 1 - coefficient_of_variation(six_dimension_scores)
```

推荐总分：

```text
healthy_expression_bonus = min(expressive_score, positive_score) * 0.15

skill_penalty =
  if skillable_score <= 0.45:
    0
  else:
    (skillable_score - 0.45) * (1 - positive_score) * 0.35

noise_penalty = noise_score * 0.18

anchor_bonus =
  0.00 if anchor_hits <= 1
  0.025 if anchor_hits in [2, 3]
  0.05 if anchor_hits >= 4

human_score =
  positive_score * 0.70
  + healthy_expression_bonus
  + balance_score * 0.10
  + anchor_bonus
  - skill_penalty
  - noise_penalty
```

```text
含活人量 = clamp(round(human_score * 100), 0, 100)
```

## 展示分校准

上面的 `human_score` 更像原始测量分。真实产品里建议再做一次展示校准，否则高分用户可能只有 70 多分，成就感偏弱；低分用户可能出现 0 分，调侃感会变成羞辱感。

建议展示分：

```text
if human_score <= 0.05:
  display_human_score = 18
else:
  display_human_score = clamp(round(20 + human_score * 85), 20, 100)
```

V4.1 增加噪声保护，避免“伪抗蒸”被展示分抬得过高：

```text
if noise_score >= 0.70:
  display_human_score = min(display_human_score, 52)
if noise_score >= 0.50:
  display_human_score = min(display_human_score, 65)
```

解释：

- 低分不显示冰冷的 0，而是保留“还有活人变量可以训练”的空间。
- 中分用户更接近直觉上的 55-65。
- 高分用户更容易进入 80+，获得“高含活人量”的成就感。
- 原始分仍可用于后台分析和调参。
- 高噪声用户会触发上限保护，避免“难以理解”被误判为“高抗蒸”。

## 判断力锚点

V2 里叫“关键题命中”。V4 建议只在后台叫“判断力锚点”，不在前台展示。

它奖励的是最能代表本测试初心的成熟抗蒸方式：

- 不是拒绝表达，而是能说明边界。
- 不是迷信直觉，而是能验证直觉。
- 不是情绪化反对，而是能提出替代做法。
- 不是反 AI，而是知道什么时候不该把判断外包给工具。

V4 建议锚点：

- Q3B：写步骤，也写什么时候不能照做。
- Q7C：把“不对劲”变成一个可验证的风险。
- Q14C：做个小验证，看模板和直觉谁更接近现实。
- Q31C：说清冲突，并提出替代做法。
- Q36C：知道何时该用、何时不该用工具。

## 同事 Skill 适配度

同事 Skill 适配度不是含活人量的反面。

它衡量的是：这个人的工作方式有多容易被整理、复用和调用。

```text
skill_fit =
  skillable_score * 0.55
  + expressive_score * 0.30
  + (1 - noise_score) * 0.15
```

```text
同事 Skill 适配度 = clamp(round(skill_fit * 100), 0, 100)
```

这会产生更有意思的组合：

- 含活人量高，Skill 适配度也高：方法可学，判断不可复制。
- 含活人量高，Skill 适配度低：人味强，但难沉淀。
- 含活人量低，Skill 适配度高：优质蒸馏原料。
- 含活人量低，Skill 适配度低：不是不可蒸，是个人价值还不稳定。

## 不可蒸馏度

不可蒸馏度比含活人量更正式，减少玩笑惩罚的影响：

```text
undistillable_score =
  positive_score * 0.75
  + balance_score * 0.10
  + healthy_expression_bonus
  + anchor_bonus * 0.70
  - noise_score * 0.10
  - skill_penalty * 0.50
```

```text
不可蒸馏度 = clamp(round(undistillable_score * 100), 0, 100)
```

## 题目数量与疲劳控制

36 题比 24 题更能拉开差异，但需要控制体验：

- 每 6 题一个轻章节。
- 选项尽量短。
- 前 12 题保留职场梗和快速进入感。
- 中间 12 题测边界、品味，避免全程像职场题。
- 最后 12 题进入生成、价值和经验，让结果更有后劲。

如果产品测试中发现 36 题偏长，可以做两种版本：

- 标准版：24 题，从每章抽 4 题。
- 完整版：36 题，显示“深度检测”或“蒸馏加强版”。
