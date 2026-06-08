# 全量视觉资产覆盖表

本文件对照当前正式配置 `config/game-config-v10.10.json` 和 `web/data/game-config.json`，检查视觉资产是否足以覆盖所有可能展示结果。

结论：全量段位徽章、结构标签徽章、六维图标和主要烟雾资产已补齐。当前资产库可以覆盖完整正式测评会展示的结果元素。

## 段位徽章覆盖

当前配置共有 8 个结果段位。

| 分数区间 | 段位 | 资产 ID | 当前状态 | 建议视觉方向 |
| --- | --- | --- | --- | --- |
| 90-100 | 真人浓缩型 | `badge-human-concentrate` | Ready | 最高段位，彩色烟雾内核、晶体/精华质感，比关键真人型更稀有 |
| 80-89 | 关键真人型 | `badge-key-human` | Ready | 已完成，高分彩色晶体/人形核心 |
| 70-79 | 高损蒸馏型 | `badge-high-distill` | Ready | 已完成，金色奖章/蒸馏损耗感 |
| 62-69 | 招牌养成型 | `badge-signature-growing` | Ready | 温润绿色/青金，像正在形成的招牌能力 |
| 55-61 | 半蒸半活型 | `badge-half-distilled` | Ready | 半彩半灰，一半有机烟雾，一半规整结构 |
| 45-54 | 协作易蒸型 | `badge-collab-distillable` | Ready | 稳定协作、可复用组件感，低彩度但不负面 |
| 35-44 | 流程友好型 | `badge-process-friendly` | Ready | 流程节点/轨道/模块化图形，灰绿低饱和 |
| 20-34 | 优质蒸馏原料 | `badge-quality-material` | Ready | 已完成，灰度金属/原料晶体 |

缺口：无。

## 结构标签徽章覆盖

当前配置共有 19 个结构标签。

| 标签 code | 展示名 | 资产 ID | 当前状态 | 建议视觉方向 |
| --- | --- | --- | --- | --- |
| `teachable_irreplaceable` | 可教不好替 | `tag-teachable-irreplaceable` | Ready | 可被讲清但核心难替，书页/锁芯/人味核心 |
| `intuition_grounded` | 老练直觉 | `tag-intuition-grounded` | Ready | 罗盘/年轮/沉淀轨迹 |
| `boundary_radar` | 边界感 | `tag-boundary` | Ready | 已完成，边界星芒/雷达感 |
| `empty_professional_detector` | 空话免疫 | `tag-empty-professional-detector` | Ready | 放大镜/空心文档/噪声屏蔽 |
| `generative_reframer` | 改题型 | `tag-generative-reframer` | Ready | 重构框架/折叠问题/箭头改写 |
| `ai_amplified_professional` | AI 放大型 | `tag-ai-amplified` | Ready | 人与工具分工、增幅光环、插件节点 |
| `value_low_generation` | 有底线型 | `tag-value-guardrail` | Ready | 盾牌/底线/取舍刻度 |
| `taste_low_expression` | 慢表达品味型 | `tag-taste-low-expression` | Ready | 眼睛/慢速笔触/审美留白 |
| `fake_resistance` | 伪抗蒸型 | `tag-fake-resistance` | Ready | 破裂面具/噪声烟雾，需克制避免羞辱感 |
| `latent_human_variable` | 待开机型 | `tag-latent-human-variable` | Ready | 未点亮核心/休眠变量/弱彩火种 |
| `skill_friendly` | 好复制型 | `tag-skill-friendly` | Ready | 模块/模板/复制轨道，灰度规整 |
| `method_distilled` | 方法型 | `tag-method-distilled` | Ready | 方法卡片/流程提炼/蒸馏滴管 |
| `high_density_human` | 真人核心型 | `tag-high-density-human` | Ready | 高密度人味核心，可复用高分视觉语言 |
| `grounded_experience` | 经验型 | `tag-grounded-experience` | Ready | 年轮/脚印/案例沉淀 |
| `context_reader` | 会看场型 | `tag-context-reader` | Ready | 场域雷达/关系节点/眼睛 |
| `expressive_high` | 会翻译型 | `tag-expressive-high` | Ready | 语言转换/桥接/字幕气泡 |
| `expressive_low` | 表达堵车型 | `tag-expressive-low` | Ready | 堵塞路径/半开的口/卡住的气泡 |
| `relationship_stabilizer` | 稳场型 | `tag-relationship-stabilizer` | Ready | 稳定场域/锚点/关系环 |
| `experience_locked` | 经验固化型 | `tag-experience-locked` | Ready | 结晶年轮/锁住的经验/灰色沉淀 |

缺口：无。

## 六维图标覆盖

六维图标组已完成：

- 情境辨识
- 边界校准
- 生成重构
- 审美判别
- 价值定向
- 经验内化

资产：`web/assets/ui-art/icons-dimensions.svg`

状态：Ready。

## 烟雾资产覆盖

当前 P0 烟雾可以覆盖主要结果状态和移动端答题页：

- `smoke-score-high.png`
- `smoke-score-mid.png`
- `smoke-score-low.png`
- `smoke-question-mobile.png`
- `smoke-question-density.png`

P1 页面烟雾也已补齐：

- 首页环境烟雾：`smoke-home-ambient.png`
- 说明页边缘烟雾：`smoke-theory-edge.png`
- 工作场景背景烟雾：`smoke-work-context.png`
- 详情弹窗头部烟雾：`smoke-drawer-header.png`
- 分享卡烟雾：`smoke-share-card.png`

## 开发建议

现在可以进入完整正式产品开发。开发时不需要再用“视觉家族映射”临时代替具体段位或标签。

正式上线标准：所有可能出现在结果页和详情弹窗里的段位、标签，都应有对应资产或明确的视觉家族映射，不得临时用 emoji、普通圆形、占位图替代。
