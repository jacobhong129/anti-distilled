# 评分矩阵 V2

## 原始字段

每题每个选项包含：

```text
context       情境感知 0-3
aesthetic     审美判断 0-3
originality   原创生成 0-3
anti_template 反模板能力 0-3
values        价值立场 0-3
experience    经验密度 0-3
skillable     可 Skill 化 0-2
expressive    健康表达 0-2
noise         伪抗蒸噪声 0-2
```

## 总分计算思路

先计算六个正向维度的总分和标准化分数。

```text
positive_raw =
  context + aesthetic + originality + anti_template + values + experience
```

由于每题通常只命中 1-3 个维度，不按理论满分 24 * 6 * 3 归一，而按题库实际可得最高分归一。

```text
positive_score = positive_raw / positive_max_for_bank
```

健康表达分：

```text
expressive_score = expressive_raw / expressive_max_for_bank
```

可 Skill 化分：

```text
skillable_score = skillable_raw / skillable_max_for_bank
```

噪声分：

```text
noise_score = noise_raw / noise_max_for_bank
```

维度均衡度：

```text
balance_score = 1 - coefficient_of_variation(six_dimension_scores)
```

如果某个维度得分为 0，不直接重罚，但 balance_score 会降低。

## 推荐公式

```text
healthy_skill_bonus = min(expressive_score, positive_score) * 0.15

skill_penalty =
  if skillable_score <= 0.45:
    0
  else:
    (skillable_score - 0.45) * (1 - positive_score) * 0.35

noise_penalty = noise_score * 0.18

human_score =
  positive_score * 0.70
  + healthy_skill_bonus
  + balance_score * 0.10
  + key_question_bonus * 0.05
  - skill_penalty
  - noise_penalty
```

最后映射到 0-100：

```text
human_percent = clamp(round(human_score * 100), 0, 100)
```

## 关键题加成

关键题不是奖励“漂亮答案”，而是奖励全局计分理念中最成熟的判断模式。

建议关键题：

- Q3B：写步骤，也写适用边界和不适用场景。
- Q7C：把“太顺了”的感觉转成一个可验证的风险。
- Q15C：找小实验验证模板和直觉。
- Q22C：明确说出价值冲突，以及可能的替代做法。
- Q24C：判断何时该用工具、何时不该用工具。

如果用户命中 0-1 个，key_question_bonus = 0。
命中 2-3 个，key_question_bonus = 0.025。
命中 4-5 个，key_question_bonus = 0.05。

## 同事 Skill 适配度

同事 Skill 适配度不是含活人量的简单反面。

它表达的是：这个人的工作方式有多容易被整理、复用、调用。

```text
skill_fit =
  skillable_score * 0.55
  + expressive_score * 0.30
  + (1 - noise_score) * 0.15
```

解释：

- 可 Skill 化高，适配度高。
- 健康表达高，适配度高。
- 噪声高会降低适配度，因为混乱的人也不容易被做成好 Skill。

这允许出现几种有趣结果：

- 含活人量高，同事 Skill 适配度也高：方法可学，判断不可复制。
- 含活人量高，同事 Skill 适配度低：很有个人性，但难协作、难沉淀。
- 含活人量低，同事 Skill 适配度高：优质蒸馏原料。
- 含活人量低，同事 Skill 适配度低：不是不可蒸，是还没形成稳定价值。

## 不可蒸馏度

不可蒸馏度比含活人量更正式，建议略少使用玩笑惩罚。

```text
undistillable_score =
  positive_score * 0.75
  + balance_score * 0.10
  + healthy_skill_bonus
  - noise_score * 0.10
  - skill_penalty * 0.50
```

## 结果文案原则

低分不羞辱，高分不神化。

- 低分：强调稳定、可复制、适合被 AI 放大，但提醒需要训练判断、审美、立场。
- 中分：强调一部分可蒸，一部分不可蒸。
- 高分：强调方法可被学习，但关键判断低损耗复制困难。

禁止把“混乱”“不写文档”“拒绝协作”“说不清”写成高分特质。

