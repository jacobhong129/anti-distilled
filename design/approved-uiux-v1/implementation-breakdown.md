# 前端实现拆解

## 推荐架构

现有应用可以继续保留评测引擎和题库配置，但前端建议按产品页面重新拆分。

建议模块：

```text
AppShell
  SmokeBackdrop
  BrandHeader
  Stepper
  HomePage
  ExplanationPage
  WorkContextPage
  QuestionPage
  ResultPage
  ResultDetailDrawer
  SharePanel
```

数据与展示拆分：

```text
assessment engine -> result view model -> UI components
```

不要把分数计算、结果文案、页面布局混在一个巨大的 `App` 里。

## 视觉资产

资产生成和开发优先级以以下文件为准：

- [逐页视觉元素拆解](assets-spec/page-visual-breakdown.md)
- [视觉元素资产清单](assets-spec/visual-elements-inventory.md)
- [视觉资产矩阵](assets-spec/asset-matrix.md)

需要单独实现或生成的视觉资产：

- 首页蒸馏因果链插画：人 -> 蒸馏瓶 -> 工作流/插件/Skill/提示词。
- 彩色烟雾纹理：高含活人量用。
- 灰色烟雾纹理：低含活人量用。
- 结构标签徽章：边界感、执行力等。
- 段位徽章：关键真人型、优质蒸馏原料等。
- 六维图标：情境辨识、边界校准、生成重构、审美判别、价值定向、经验内化。

开发实现建议：

- 烟雾可使用 PNG/WebP 背景层 + CSS opacity/mix-blend-mode。
- 首页因果链可使用 SVG + 独立烟雾图片层。
- 徽章可使用 SVG 或高质量 PNG，但文字和按钮必须是原生 HTML。

## 页面拆解

### 1. 首页

核心组件：

- `HeroHeader`
- `DistillationFlow`
- `PrimaryCTA`
- `MeaningCallout`

首页视觉资产：

- 桌面端必须使用 `web/assets/ui-art/home-distillation-desktop.png`
- 移动端必须使用 `web/assets/ui-art/home-distillation-mobile.png`
- 禁止用 CSS 简笔画替代人像、蒸馏瓶、烟雾流和输出卡片

验收点：

- 能看出“人的想法 -> 蒸馏 -> 工作流/插件/Skill/提示词”的因果链。
- 桌面端横向叙事，移动端纵向重排。
- 彩色烟雾明显但不遮挡文字。

### 2. 什么是抗蒸性

核心组件：

- `TheoryIntro`
- `ThreeLayerModel`
- `DimensionGrid`
- `ImportancePanel`
- `CultivationPanel`

验收点：

- 专业感强于趣味感。
- 内容能解释“人被蒸馏成 Skill”的概念。
- 移动端为可阅读知识卡，不缩放桌面端。

### 3. 工作场景校准

核心组件：

- `AssessmentStepper`
- `WorkContextForm`
- `SkipNotice`

验收点：

- 不出现在首页。
- 可跳过。
- 解释跳过影响：仍可得到个人含活人量，只是不显示岗位蒸馏度判断。

### 4. 动态答题

核心组件：

- `QuestionProgress`
- `QuestionCard`
- `OptionCard`
- `PreviousButton`
- `SmokeIntensityControl`

验收点：

- 桌面题目阅读宽度合理，不一行只有七八个字。
- 移动端无 hover 态误导。
- 已选项与未选项状态清晰。
- 移动端也有烟雾，但只在边缘、进度区、底部浓度控件中出现。

### 5. 结果总览

核心组件：

- `ScoreHero`
- `RankBadge`
- `StructureTagCard`
- `ShareCopyCard`
- `RoleDistillationCard`
- `DimensionBars`
- `ReasonEvidenceCard`
- `SmokeLegend`

验收点：

- 分数单位为 `%`。
- 高分显示彩色烟雾，低分显示灰色/规整烟雾。
- 六维表现使用彩色进度条。
- 标签和维度可点击进入详情。
- 不显示版本号。

### 6. 标签/维度详情

核心组件：

- `ResultDetailDrawer`
- `DetailTabs`
- `ExplanationSections`
- `EvidenceChips`

验收点：

- 桌面端为右侧抽屉。
- 移动端为底部弹窗。
- 内容结构包含：这是什么意思、为什么你可能是这个标签、容易被误解成什么、怎么提升含活人量、本次表现证据。

### 7. 分享/重测

核心组件：

- `ShareCard`
- `CopyShareTextButton`
- `RestartButton`

验收点：

- 分享卡可读、可截图。
- 只展示用户需要的信息，不展示内部版本或测试参数。

## 开发验收清单

- [ ] 桌面端和移动端分别截图对照设计稿。
- [ ] 首页烟雾与蒸馏因果链实现到位。
- [ ] 移动端所有页面无右侧异常留白。
- [ ] 移动端答题页有烟雾，但不遮挡题目与选项。
- [ ] 结果页烟雾颜色随含活人量变化。
- [ ] 六维进度条颜色不在 iOS 上变成默认蓝色。
- [ ] 移动端字体不全部落成黑体。
- [ ] 答题页可返回上一题。
- [ ] 工作场景校准可跳过。
- [ ] 结果详情桌面抽屉、移动底部弹窗均可用。
- [ ] 页面不出现版本号或测试环境功能。
