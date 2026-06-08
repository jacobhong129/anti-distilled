# 视觉元素资产清单

本文件用于约束前端实现：哪些视觉元素必须来自正式美术资产，哪些可以用 CSS/SVG 原生实现。

## 原则

前端开发不能只还原排版。以下元素是产品识别度的核心，必须先资产化，再进入页面开发：

- 蒸馏瓶
- 真人头像 / 人的想法视觉
- 彩色烟雾 / 灰度烟雾
- AI 输出卡片组
- 段位徽章
- 结构标签徽章
- 六维图标
- 分享卡视觉

## 必须资产化的元素

### 1. 首页蒸馏因果链插画

用途：首页桌面端和移动端。

必须表达：

```text
人的想法 / 判断 / 经验 / 审美 / 取舍 / 场景感
  -> 蒸馏瓶
  -> 工作流 / 插件 / Skill / 提示词
```

要求：

- 蒸馏瓶必须使用正式设计稿里的美术质感，不得用 CSS 边框画简笔瓶。
- 人像必须是有质感的侧脸/剪影，不得用圆形头肩简笔图。
- 烟雾必须是有真实纹理的彩色烟雾，不得用 radial-gradient 光斑替代。
- 输出卡片必须有图标、标题、副标题和轻阴影。

建议资产：

- `home-distillation-desktop.png`：已生成，见本目录。
- `home-distillation-mobile.png`：已生成，见本目录。

开发资产已同步到：

- `web/assets/ui-art/home-distillation-desktop.png`
- `web/assets/ui-art/home-distillation-mobile.png`

### 2. 彩色烟雾组

用途：首页、答题页、结果页、详情弹窗。

要求：

- 至少包含高、中、低三档彩色程度。
- 高含活人量：紫、青绿、珊瑚、琥珀较丰富。
- 中含活人量：彩色减少，灰色增加。
- 低含活人量：灰色为主，形态更规整。

已完成资产：

- `smoke-score-high.png`
- `smoke-score-mid.png`
- `smoke-score-low.png`
- `smoke-question-mobile.png`
- `smoke-question-density.png`
- `smoke-home-ambient.png`
- `smoke-theory-edge.png`
- `smoke-work-context.png`
- `smoke-drawer-header.png`
- `smoke-share-card.png`

### 3. 段位徽章

用途：结果页主段位展示。

要求：

- 需要有美术质感，接近设计稿里的 medal/cube/晶体徽章。
- 高分徽章可以彩色、金色、紫色。
- 低分徽章应灰度、金属、规整。

已完成资产：

- `badge-human-concentrate.svg`
- `badge-key-human.svg`
- `badge-high-distill.svg`
- `badge-signature-growing.svg`
- `badge-half-distilled.svg`
- `badge-collab-distillable.svg`
- `badge-process-friendly.svg`
- `badge-quality-material.svg`

### 4. 结构标签徽章

用途：结果页“结构标签”和详情弹窗。

要求：

- 每个标签应有独立识别形态。
- 不要仅用 emoji 或简单 CSS 圆形。

已完成资产：

- 19 个正式结构标签徽章，见 `asset-map.json` 的 `labels`。
- 3 个补充视觉标签：`tag-execution.svg`、`tag-aesthetic.svg`、`tag-reconstruction.svg`。

### 5. 六维图标

用途：说明页、结果页、详情页。

六维：

- 情境辨识
- 边界校准
- 生成重构
- 审美判别
- 价值定向
- 经验内化

要求：

- 可以用 SVG 实现，但必须统一风格：线性图标、2px 左右描边、圆角端点、墨绿/维度色。
- 不能使用零散 Unicode 符号。

已完成资产：

- `icons-dimensions.svg`

## 可以代码实现的元素

- 页面布局网格
- 标题、正文、按钮、选项卡
- 表单单选项
- 步骤条
- 答题进度点
- 选项卡选中态
- 六维进度条
- 抽屉/底部弹窗容器
- 分享文案按钮

这些元素仍需遵守视觉说明中的字体、颜色、间距、圆角和阴影规则。

## 开发顺序

1. 生成并确认核心美术资产。
2. 将资产放入 `web/assets/ui-art/`。
3. 在 CSS 中建立资产变量和 smoke tier 规则。
4. 先实现首页，做设计稿对照。
5. 首页通过后，再实现工作场景、答题、结果、详情。

## 禁止事项

- 禁止用 CSS 简笔画替代正式蒸馏瓶。
- 禁止用普通渐变光斑替代彩色烟雾。
- 禁止用 emoji 替代段位徽章和结构标签徽章。
- 禁止把桌面端直接缩小成移动端。
- 禁止只看布局，不看美术元素一致性。
