# 评分矩阵 V5

## 核心构念

V5 将“抗蒸性”定义为：

> 一个人在被文档、聊天记录、工作流和过往产出蒸馏成 Skill 或 agent 时，关键判断被低损耗复制的难度。

这不是临床或职业诊断，而是一个产品化测评。它的专业性来自：

- 明确定义构念。
- 用情境判断题采样行为选择。
- 六维相互区分。
- 同时记录可 Skill 化、表达转译和伪抗蒸噪声。
- 用锚点题奖励成熟判断，而不是奖励“更怪”。

## 六维正向指标

| 字段 | 前台名 | 专业含义 |
|---|---|---|
| context | 情境辨识 | 识别场景、关系、时机、潜台词和隐含约束 |
| boundary | 边界校准 | 判断流程、模板、AI 建议在当前情境中是否适用 |
| generative | 生成重构 | 生成新表达、新方案、新问题框架 |
| taste | 审美判别 | 判断方案的取舍、分寸、气质和判断痕迹 |
| stance | 价值定向 | 识别价值冲突，并做出可表达取舍 |
| groundedness | 经验内化 | 将真实经历沉淀为可迁移判断 |

每个选项在相关维度上给 0-3 分。

## 三个辅助指标

### 可 Skill 化 skillable

0-2 分。衡量用户选择是否体现稳定、流程化、可复用、可调用。

高可 Skill 化不是坏事。只有当可 Skill 化高而六维抗蒸分低时，才降低含活人量。

### 表达转译 expressive

0-2 分。衡量用户是否能把隐性判断转成别人能理解、验证、协商的语言。

表达转译是成熟抗蒸性的加分项。

### 伪抗蒸噪声 noise

0-2 分。衡量选项是否把混乱、犬儒、拒绝表达、故作神秘包装成不可复制。

噪声用于保护测试初心：难懂不等于难替代。

## 选项评分模式

每道题 4 个选项不做固定 A 低 D 高，而是尽量覆盖四类反应：

| 模式 | 常见表现 | 评分倾向 |
|---|---|---|
| 流程执行 | 稳定、清晰、照流程 | Skill 高，六维低到中 |
| 成熟边界 | 能说明适用条件、代价和例外 | 六维中高，表达转译高 |
| 复杂判断 | 能识别隐含问题、重构问题、验证直觉 | 六维高，噪声低 |
| 伪抗蒸 | 说不清、拒绝定义、犬儒化、只凭不舒服 | 可能有六维分，但噪声高 |

## 判断力锚点

V5 锚点题：

- Q2B：写步骤，也写什么时候不能照做。
- Q5C：把“不对劲”变成一个可验证的风险。
- Q10C：做个小验证，看模板和直觉谁更接近现实。
- Q21C：说清冲突，并提出替代做法。
- Q24C：知道何时该用、何时不该用工具。

锚点题不在前台展示。它们奖励的是“可表达的复杂判断”。

## 总分公式

```text
positive_raw =
  context
  + boundary
  + generative
  + taste
  + stance
  + groundedness
```

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

健康表达加成：

```text
expression_bonus = min(expressive_score, positive_score) * 0.15
```

可 Skill 化惩罚：

```text
skill_penalty =
  if skillable_score <= 0.45:
    0
  else:
    (skillable_score - 0.45) * (1 - positive_score) * 0.35
```

噪声惩罚：

```text
noise_penalty = noise_score * 0.18
```

锚点加成：

```text
anchor_bonus =
  0.00 if anchor_hits <= 1
  0.025 if anchor_hits in [2, 3]
  0.05 if anchor_hits >= 4
```

原始含活人量：

```text
human_score =
  positive_score * 0.70
  + expression_bonus
  + balance_score * 0.10
  + anchor_bonus
  - skill_penalty
  - noise_penalty
```

## 展示分校准

```text
if human_score <= 0.05:
  display_human_score = 18
else:
  display_human_score = clamp(round(20 + human_score * 85), 20, 100)
```

噪声保护：

```text
if noise_score >= 0.70:
  display_human_score = min(display_human_score, 52)
if noise_score >= 0.50:
  display_human_score = min(display_human_score, 65)
```

## 同事 Skill 适配度

```text
skill_fit =
  skillable_score * 0.55
  + expressive_score * 0.30
  + (1 - noise_score) * 0.15
```

解释：

- 可 Skill 化高：容易被整理成 Skill。
- 表达转译高：容易被别人学会和复用。
- 噪声低：更容易形成稳定工具。

## 不可蒸馏度

不可蒸馏度比含活人量更正式，少一点玩笑校准：

```text
undistillable_score =
  positive_score * 0.75
  + balance_score * 0.10
  + expression_bonus
  + anchor_bonus * 0.70
  - noise_score * 0.10
  - skill_penalty * 0.50
```

## V5 相比 V4 的变化

- “读空气”升级为“情境辨识”。
- “识边界”升级为“边界校准”。
- “会生成”升级为“生成重构”。
- “有品味”升级为“审美判别”。
- “有立场”升级为“价值定向”。
- “有来处”升级为“经验内化”。
- “健康表达”升级为“表达转译”。
- 最终题量从 36 题收敛到 24 题。
- 每章加入用户可见的维度说明。

