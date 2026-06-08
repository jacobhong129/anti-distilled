# 抗蒸性测试 V10.10：开发交接说明

## 1. 配置入口

开发主配置：

```text
config/game-config-v10.10.json
```

该配置已经包含：

- 120 道题。
- 480 个选项。
- 每个选项的分数向量。
- 证据标签。
- 结果段位。
- 结构标签。
- 标签展示名、短名和解释。
- 岗位蒸馏度模块。
- 自适应抽题规则。
- 停止规则。
- 稳定性分级与 20 题前硬阻断规则。
- 标签互斥规则、风险规则和应用开发准入门槛。

前端或后端可以直接读取该 JSON 作为规则源。V10.10 的历史问题复盘与应用开发准入见 `docs/v10.10-historical-regression-and-app-readiness.md`。

当前边界：

- 可以进入应用开发和内测引擎实现。
- 正式对外发布前，必须跑 V10.10 虚拟人回归并通过 `appReadinessGate.mustPassBeforePublicLaunch`。

重要：

- 不要按 `options` 数组顺序直接展示选项。
- 前台应使用每道题的 `presentationOrder`。
- 前台不显示 A/B/C/D，只显示选项文本。
- 用户选择后，后台仍记录原始 `optionKey`，用于计分。

## 2. 选项展示规则

V10.5 为了避免“C 看起来更像高分答案”，配置中新增：

```json
"optionPresentationPolicy": {
  "hideOptionKeys": true,
  "defaultOrderField": "presentationOrder",
  "shuffleBySessionSeed": true
}
```

开发要求：

1. 默认按 `presentationOrder` 渲染。
2. 如果要进一步打乱，用 sessionId 做 seed，确保同一用户同一题顺序稳定。
3. 不显示 A/B/C/D，也不要显示“选项 1/2/3/4”这种暗示顺位的标号。
4. 只记录用户选择对应的原始 `option.key`。

## 3. 职业/岗位上下文

V10.6 新增 `roleContext`。

开发原则：

- 职业因素可选收集。
- 职业因素不直接加减个人含活人量。
- 结果页把它作为“岗位蒸馏度”单独展示。
- 用户跳过职业题，不影响主测试完成。

建议 session 中增加：

```ts
type RoleContextAnswer = {
  taskRepeatability?: number
  contextDependence?: number
  humanTrustLoad?: number
  tasteAndJudgmentLoad?: number
  accountabilityLoad?: number
  toolExposure?: number
  roleArchetype?: string
}
```

## 4. Session 状态

每个用户测评过程维护一个 session。

```ts
type TestSession = {
  sessionId: string
  answeredItemIds: string[]
  answers: Answer[]
  rawScores: MetricScores
  possibleScores: MetricScores
  normalizedScores: MetricScores
  evidenceCounts: Record<string, number>
  labelConfidence: Record<string, number>
  blockedLabels: Record<string, string[]>
  activeRisks: Record<string, RiskState>
  strongCandidateLabels: string[]
  contradictionFlags: string[]
  countercheckFlags: Record<string, boolean>
  currentStage: "screening" | "confirming" | "splitting" | "counterchecking" | "done"
  stabilityChecks: StabilityCheck[]
  roleContext?: RoleContextAnswer
}
```

```ts
type Answer = {
  itemId: string
  optionKey: "A" | "B" | "C" | "D"
  position: number
  scores: MetricScores
  evidence: string[]
  labelDelta: Record<string, number>
}

type RiskState = {
  active: boolean
  trigger: string
  evidence: string[]
  handled: boolean
  handling?: "routeTo" | "countercheckFrom" | "scoreEffect"
}
```

## 5. 每次答题后的更新顺序

### Step 1：写入答案

把 `itemId`、`optionKey`、`position`、选项分数和证据写入 `answers`。

### Step 2：更新 rawScores

把选项 scores 加到 rawScores。

### Step 3：更新 possibleScores

对当前题的 4 个选项逐一取每个 metric 的最大可能分，加到 possibleScores。

例如：

```text
某题四个选项里 BND 最高可得 3
则 possibleScores.BND += 3
```

这样不同题量的用户可以标准化比较。

### Step 4：更新 normalizedScores

```text
normalizedScores[metric] =
  possibleScores[metric] > 0
    ? rawScores[metric] / possibleScores[metric] * 100
    : 0
```

### Step 5：更新 evidenceCounts

每个 evidence +1。

### Step 6：更新 labelConfidence

如果选项有 `labelDelta`，直接叠加。

如果没有，则根据指标组合推断标签置信度。

### Step 7：应用标签互斥规则

读取 `config.labelExclusionRules`。

如果某个标签命中 `blockedWhenAny`，不要直接删除它的分数，而是：

1. 写入 `blockedLabels[label]`，记录阻断原因。
2. 不把它作为主标签。
3. 可以在结果页作为“摇摆解释”或“为什么不是这个标签”的内部依据。

V10.10 重点互斥：

| 标签 | 被阻断场景 |
|---|---|
| 慢表达品味型 | GEN/BND/STN/CXT/TLB 或空话免疫证据更强 |
| 待开机型 | 已有稳定流程执行证据 |
| 可教不好替 | AI 放大或稳场证据更强 |

### Step 8：更新风险标记

典型风险：

| 风险 | 触发 |
|---|---|
| fake_resistance_risk | NOI 高，EXP 低 |
| social_desirability_risk | 连续选择成熟判断型，但证据不一致 |
| skill_replacement_risk | SKL 高，BND/CXT/GRD/EXP 低 |
| intuition_unclear_risk | GRD 高但 EXP 低且没有来源证据 |
| high_taste_low_expression_risk | TST 高，EXP 低 |
| polished_answer_risk | 体面成熟答案多，但具体取舍证据不足 |
| ai_underrecognized_risk | TLB/SKL 都不低，但 AI 放大型没有进入候选 |
| low_band_flattening_risk | 35-44 分且 SKL 高、NOI 低，低分段可能被压扁 |

V10.10 新增风险从 `config.riskRules` 读取。风险触发后：

- 有 `routeTo`：下一题优先从这些题组抽。
- 有 `countercheckFrom`：必须完成至少一道反证题。
- 有 `scoreEffect`：结果计算时应用限制，例如不让表演型成熟直接进入高段。

## 6. 下一题选择

### 4.1 初筛阶段

前 8 题从 `stage = screening` 中抽。

必须覆盖：

```text
CXT, BND, GEN, TST, STN, GRD, SKL/TLB, EXP/NOI
```

推荐实现：

1. 先按覆盖需求选题。
2. 再用 topicTags 避免连续重复。
3. 如果多个候选同分，随机选一个。

### 4.2 追问阶段

第 9 题后使用优先级：

```text
priority =
  lowConfidence * 0.40 +
  labelImpact * 0.30 +
  contradictionRisk * 0.20 +
  topicFreshness * 0.10
```

候选池：

- 如果核心维度不确定，选对应 `primaryMetric` 题。
- 如果标签摇摆，选 `stage = split` 且 splitBetween 命中 top2 label 的题。
- 如果风险未处理，选 `role = noise_probe` 或对应反证题。

### 4.3 反证题优先级

| 当前风险 | 优先题类 |
|---|---|
| fake_resistance_risk | NOISE, SPLIT_01 |
| intuition_unclear_risk | GROUND, EXPRESS, SPLIT_01 |
| skill_replacement_risk | SKILL, BOUNDARY, SPLIT_08 |
| high_taste_low_expression_risk | TASTE, EXPRESS, SPLIT_07 |
| value_low_generation_risk | STANCE, GENERATIVE, SPLIT_06 |
| social_desirability_risk | NOISE, BOUNDARY, GROUND |

## 7. V10.9 停止判断

默认最少 16 题，不再把 14 题作为常规结束点。14 题只保留为极少数提前结束例外。

```ts
function canStop(session) {
  if (session.answers.length >= 24) return true

  if (session.answers.length === 14) {
    return isExceptionalEarlyStop(session)
  }

  if (session.answers.length < 16) return false
  if (mustContinueBefore20(session) && session.answers.length < 20) return false
  if (isComplexPersona(session) && session.answers.length < 18) return false

  const checks = [
    bandStableForTwoChecks(session),
    topLabelStableForTwoChecks(session),
    topLabelLeadAtLeast(session, 0.18),
    highestRiskCounterchecked(session),
    minimumEvidenceCoverageMet(session)
  ]

  return checks.filter(Boolean).length >= 3
}
```

14 题提前结束必须同时满足：

- 分段连续两次稳定。
- 第一标签连续两次稳定。
- 第一标签领先第二标签至少 0.24。
- 六个核心维度都有证据。
- 主标签证据覆盖达标。
- 没有开放误判风险。
- 不是高潜、复杂、中高分用户。

复杂用户最少 18 题。命中以下任一情况，进入复杂用户规则：

- 分数在 55-79。
- 主标签候选包括 `改题型`、`AI 放大型`、`可教不好替`、`边界感`、`稳场型`、`经验固化型`。
- 第一标签与第二标签差距低于 0.18。
- GEN、BND、TLB 任一维度明显偏高。

20 题前遇到以下情况不得结束：

- 最近两次检查 Top2 标签变化。
- 最近两次检查分段变化超过 8 分。
- 分数距离段位边界小于等于 2 分。
- 高潜标签还没完成反证题。
- 伪抗蒸风险仍未处理。
- 55-69 中段用户还没完成分叉题。
- `老练直觉` 领先但缺少来源证据。

停止原因：

- `band_stable`
- `label_stable`
- `risk_counterchecked`
- `minimum_evidence_met`
- `exceptional_early_stop`
- `light_swing_after_20`
- `forced_max_questions`

## 8. 结果计算

### 6.1 含活人量

用 normalizedScores 计算。

```ts
const core =
  CXT * 0.16 +
  BND * 0.20 +
  GEN * 0.16 +
  TST * 0.15 +
  STN * 0.16 +
  GRD * 0.17

const score = clamp(
  core +
  EXP * 0.08 +
  TLB * 0.05 -
  Math.max(0, SKL - average(BND, CXT, GRD, EXP)) * 0.12 -
  NOI * 0.16,
  20,
  98
)
```

### 6.2 段位

用 score 匹配 `resultBands`。

### 6.3 标签

从 `labelConfidence` 里取最高标签。

前台展示时优先读取：

```text
config.labelDetails[label].name
config.labelDetails[label].plainMeaning
config.labelDetails[label].shareLine
```

没有 labelDetails 时再回退到 `config.labels[label]`。

如果最高与第二高差距小于 0.18：

- 结果页显示摇摆提示。
- 主标签仍取最高。
- 辅助标签显示第二高。

### 6.4 六维剖面

展示六个核心维度：

```text
CXT, BND, GEN, TST, STN, GRD
```

辅助指标不直接展示为六维，但可以用于解释：

- SKL：为什么你容易/不容易被 Skill 化。
- EXP：为什么你可教或难表达。
- NOI：是否存在伪抗蒸风险。
- TLB：你和 AI 的边界关系。

### 8.5 岗位蒸馏度

如果 session 有 `roleContext`，结果页单独展示：

```text
岗位蒸馏度：偏高 / 中等 / 偏低
```

文案必须说明：

> 岗位蒸馏度说明的是当前工作方式，不等同于你这个人的含活人量。

## 9. 虚拟人测试接口

建议提供一个测试函数：

```ts
runPersona(personaProfile, config): PersonaRunResult
```

输出：

```ts
type PersonaRunResult = {
  personaId: string
  answeredCount: number
  itemPath: string[]
  finalScore: number
  finalBand: string
  topLabel: string
  secondLabel?: string
  stopReason: string
  normalizedScores: MetricScores
  triggeredRisks: string[]
  countercheckedRisks: string[]
}
```

## 10. 配置校验规则

开发前先跑配置校验：

1. 总题数必须为 120。
2. 每题必须有 4 个选项。
3. 每个选项必须有 scores。
4. 每个选项必须有 evidence。
5. 所有 scores 的 key 必须属于 10 个合法指标。
6. 所有 split 题必须有 splitBetween。
7. 所有 labelDelta 的 key 必须属于 labels。
8. 所有 stage 必须属于 screening/followup/auxiliary/split。
9. 每题必须有 `presentationOrder`。
10. `presentationOrder` 必须包含 A/B/C/D 且不重复。
11. `resultBands` 必须覆盖 20-100，且区间不能重叠。
12. `labelDetails` 的 key 必须属于 labels。
13. V10.10 要求 `labelDetails` 覆盖所有 labels。
14. `labelExclusionRules` 中的 label 必须属于 labels。
15. `riskRules` 必须声明 trigger 和处理方式。
16. `appReadinessGate.mustPassBeforePublicLaunch` 不得为空。

## 11. 推荐开发顺序

1. 先做配置读取和校验。
2. 再做固定初筛 8 题。
3. 再做分数更新和结果页。
4. 再做标签互斥、风险识别和结果解释。
5. 再接入动态追问。
6. 再跑 30 人社会加权虚拟人 x 5 轮回归测试。
7. 最后做 UI 动效和分享图。
