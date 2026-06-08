# 视觉资产矩阵

本文件用于管理正式视觉方案里的所有资产。开发前先对照本表补齐 P0 资产，再进入页面实现。

## 状态定义

- `Ready`：资产已存在，可进入开发。
- `Generate`：需要用 Image Gen 或设计工具生成。
- `Draw`：可用统一 SVG 图标系统绘制，但必须成套。
- `Native`：前端代码实现，不需要独立图片。
- `Blocked`：缺少该资产会导致页面视觉明显偏离设计稿。

## 核心资产

| 资产 ID | 资产名称 | 使用页面 | 类型 | 状态 | 开发路径 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `home-distillation-desktop` | 首页桌面蒸馏因果链 | 首页 | PNG | Ready | `web/assets/ui-art/home-distillation-desktop.png` | 已改为“工作流 / 插件 / Skill / 提示词” |
| `home-distillation-mobile` | 首页移动蒸馏因果链 | 首页 | PNG | Ready | `web/assets/ui-art/home-distillation-mobile.png` | 移动端竖向重排，不得用桌面图缩放替代 |
| `smoke-home-ambient` | 首页背景彩色烟雾 | 首页 | PNG | Ready | `web/assets/ui-art/smoke-home-ambient.png` | 低饱和青绿、紫灰、淡珊瑚，作为首屏环境层 |
| `smoke-theory-edge` | 说明页边缘烟雾 | 什么是抗蒸性 | PNG | Ready | `web/assets/ui-art/smoke-theory-edge.png` | 专业页用青灰烟雾，低干扰 |
| `smoke-work-context` | 工作场景背景烟雾 | 工作场景 | PNG | Ready | `web/assets/ui-art/smoke-work-context.png` | 左暖灰、右青灰，弱化装饰感 |
| `smoke-question-mobile` | 移动答题页烟雾 | 动态答题 | PNG | Ready | `web/assets/ui-art/smoke-question-mobile.png` | 移动端边缘和底部可见，不能遮挡题目 |
| `smoke-question-density` | 答题页烟雾浓度条 | 动态答题 | PNG | Ready | `web/assets/ui-art/smoke-question-density.png` | 底部烟雾 slider 背景 |
| `smoke-score-high` | 高含活人量结果烟雾 | 结果/详情/分享 | PNG | Ready | `web/assets/ui-art/smoke-score-high.png` | 多色、丰富、有机，80% 以上优先使用 |
| `smoke-score-mid` | 中含活人量结果烟雾 | 结果/详情/分享 | PNG | Ready | `web/assets/ui-art/smoke-score-mid.png` | 彩色适中，灰烟增加 |
| `smoke-score-low` | 低含活人量结果烟雾 | 结果/详情/分享 | PNG | Ready | `web/assets/ui-art/smoke-score-low.png` | 灰度为主，形态更规整 |
| `smoke-drawer-header` | 详情弹窗头部烟雾 | 结果详情 | PNG | Ready | `web/assets/ui-art/smoke-drawer-header.png` | 可按分数套用高/中/低透明版本 |
| `smoke-share-card` | 分享卡烟雾 | 分享 | PNG | Ready | `web/assets/ui-art/smoke-share-card.png` | 可复用结果烟雾，但需要适配分享卡裁切 |

## 徽章与标签资产

| 资产 ID | 资产名称 | 使用页面 | 类型 | 状态 | 开发路径 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `badge-key-human` | 关键真人型段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-key-human.svg` | 高分段位，彩色/晶体/奖章质感 |
| `badge-high-distill` | 高损蒸馏型段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-high-distill.svg` | 中高分段位，可带金色奖章感 |
| `badge-quality-material` | 优质蒸馏原料段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-quality-material.svg` | 低分段位，灰度金属/晶体质感 |
| `badge-human-concentrate` | 真人浓缩型段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-human-concentrate.svg` | 最高段位，彩色精华质感 |
| `badge-signature-growing` | 招牌养成型段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-signature-growing.svg` | 正在形成招牌能力 |
| `badge-half-distilled` | 半蒸半活型段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-half-distilled.svg` | 半彩半灰 |
| `badge-collab-distillable` | 协作易蒸型段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-collab-distillable.svg` | 协作稳定但易复用 |
| `badge-process-friendly` | 流程友好型段位徽章 | 结果 | SVG | Ready | `web/assets/ui-art/badge-process-friendly.svg` | 流程节点和模块化 |
| `tag-boundary` | 边界感标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-boundary.svg` | 需与详情头部一致 |
| `tag-execution` | 执行力标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-execution.svg` | 低分样例常用 |
| `tag-aesthetic` | 审美判别标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-aesthetic.svg` | 体现审美/风格判断 |
| `tag-reconstruction` | 生成重构标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-reconstruction.svg` | 体现重组、再生成能力 |
| `tag-teachable-irreplaceable` | 可教不好替标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-teachable-irreplaceable.svg` | 可被讲清但核心难替 |
| `tag-intuition-grounded` | 老练直觉标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-intuition-grounded.svg` | 罗盘/沉淀轨迹 |
| `tag-empty-professional-detector` | 空话免疫标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-empty-professional-detector.svg` | 放大镜/空心文档 |
| `tag-generative-reframer` | 改题型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-generative-reframer.svg` | 重构框架 |
| `tag-ai-amplified` | AI 放大型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-ai-amplified.svg` | 人与工具分工 |
| `tag-value-guardrail` | 有底线型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-value-guardrail.svg` | 盾牌/底线 |
| `tag-taste-low-expression` | 慢表达品味型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-taste-low-expression.svg` | 眼睛/慢速笔触 |
| `tag-fake-resistance` | 伪抗蒸型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-fake-resistance.svg` | 破裂面具 |
| `tag-latent-human-variable` | 待开机型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-latent-human-variable.svg` | 休眠变量 |
| `tag-skill-friendly` | 好复制型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-skill-friendly.svg` | 模块/复制轨道 |
| `tag-method-distilled` | 方法型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-method-distilled.svg` | 方法提炼 |
| `tag-high-density-human` | 真人核心型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-high-density-human.svg` | 高密度人味核心 |
| `tag-grounded-experience` | 经验型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-grounded-experience.svg` | 年轮/经验沉淀 |
| `tag-context-reader` | 会看场型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-context-reader.svg` | 场域雷达 |
| `tag-expressive-high` | 会翻译型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-expressive-high.svg` | 语言转换 |
| `tag-expressive-low` | 表达堵车型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-expressive-low.svg` | 堵塞路径 |
| `tag-relationship-stabilizer` | 稳场型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-relationship-stabilizer.svg` | 稳定场域 |
| `tag-experience-locked` | 经验固化型标签徽章 | 结果/详情 | SVG | Ready | `web/assets/ui-art/tag-experience-locked.svg` | 锁住的经验 |

## 图标系统

| 资产 ID | 资产名称 | 使用页面 | 类型 | 状态 | 开发路径 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `icon-brand-flask` | 品牌蒸馏瓶图标 | 全局 | SVG | Ready | `web/assets/ui-art/icon-brand-flask.svg` | 可用线性 SVG，但必须保持品牌感 |
| `icons-dimensions` | 六维图标组 | 说明/结果/详情 | SVG | Ready | `web/assets/ui-art/icons-dimensions.svg` | 六个统一线性图标 |
| `icons-work-context` | 工作场景问题图标 | 工作场景 | SVG | Ready | `web/assets/ui-art/icons-work-context.svg` | briefcase、people、sliders 等 |
| `icon-selected-check` | 答题选中勾 | 答题 | SVG/Native | Native | 组件内实现 | 圆形紫色勾，移动端只在已选时出现 |
| `icon-sparkle-seal` | 首页说明卡星芒 | 首页 | SVG | Ready | `web/assets/ui-art/icon-sparkle-seal.svg` | 星芒必须视觉居中 |
| `stamp-human-hard` | 人味难蒸印章 | 首页/分享 | SVG | Ready | `web/assets/ui-art/stamp-human-hard.svg` | 移动端不挤压正文 |

## 代码原生组件

| 组件 ID | 组件名称 | 使用页面 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| `BrandHeader` | 品牌头部 | 全局 | Native | 桌面 nav，移动端菜单 |
| `PageShell` | 页面画布 | 全局 | Native | 桌面横向大画布，移动竖向重排 |
| `PrimaryCTA` | 主按钮 | 全局 | Native | 墨绿实心，带箭头/时钟图标 |
| `Stepper` | 测试步骤条 | 工作场景/答题/结果 | Native | 当前步骤和完成状态清晰 |
| `RadioGroup` | 工作场景单选 | 工作场景 | Native | 移动端竖排，选中状态明确 |
| `QuestionProgressDots` | 答题进度点 | 答题 | Native | 圆点进度，不用普通长进度条替代 |
| `OptionCard` | 答题选项卡 | 答题 | Native | 移动端禁用 hover 假选中 |
| `DimensionBars` | 六维彩色进度条 | 结果 | Native | 自定义颜色，避免 iOS 默认蓝 |
| `ResultDetailDrawer` | 详情抽屉/底部弹窗 | 详情 | Native | 桌面右抽屉，移动底部 sheet |
| `Accordion` | 移动详情折叠 | 详情 | Native | 默认只展开第一节 |
| `ShareCopyButton` | 复制分享文案 | 结果/分享 | Native | 包含复制成功状态 |

## P0 生成清单

P0 资产缺失时，不建议进入正式页面开发：

P0 资产已完成。后续进入正式开发前，可继续生成 P1 资产以增强完整度。

## P1 生成清单

P1 资产已完成。

## P2 生成清单

P2 当前不再有正式开发必需缺口。后续如果新增结果标签，再按生成脚本补齐。

## 开发前检查

- 首页因果链必须使用 Ready 资产。
- 结果页必须按分数选择高/中/低烟雾。
- 所有徽章、标签不能用 emoji 或临时图标替代。
- 所有移动端页面必须有单独布局规则。
- 任何资产缺失时，在页面中保留开发注释，不要用视觉上不相干的替代物上线。
