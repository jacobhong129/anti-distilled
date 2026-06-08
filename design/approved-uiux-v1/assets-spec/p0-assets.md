# P0 资产交付说明

P0 资产用于进入正式前端开发前的最低视觉保障。缺少这些资产时，页面很容易退化成普通排版或临时图形。

注意：P0 不等于全量资产。当前正式配置包含 8 个段位和 19 个结构标签，完整覆盖情况见 [全量视觉资产覆盖表](full-asset-coverage.md)。

## 已完成资产

### 烟雾组

| 资产 | 路径 | 用途 | 来源 |
| --- | --- | --- | --- |
| 高含活人量烟雾 | `web/assets/ui-art/smoke-score-high.png` | 80% 以上结果、详情、分享 | Image Gen 生成 |
| 中含活人量烟雾 | `web/assets/ui-art/smoke-score-mid.png` | 60%-79% 或中档结果 | 由高分烟雾降彩度派生 |
| 低含活人量烟雾 | `web/assets/ui-art/smoke-score-low.png` | 低分结果、灰度结果 | 由高分烟雾灰度派生 |
| 移动答题页烟雾 | `web/assets/ui-art/smoke-question-mobile.png` | 移动端答题页边缘烟雾 | 由高分烟雾移动端裁切派生 |
| 烟雾浓度条 | `web/assets/ui-art/smoke-question-density.png` | 答题页底部烟雾浓度控件 | 由高分烟雾横向裁切派生 |

### 段位徽章

| 资产 | 路径 | 用途 |
| --- | --- | --- |
| 关键真人型 | `web/assets/ui-art/badge-key-human.svg` | 高含活人量段位 |
| 高损蒸馏型 | `web/assets/ui-art/badge-high-distill.svg` | 中高含活人量/高损提示段位 |
| 优质蒸馏原料 | `web/assets/ui-art/badge-quality-material.svg` | 低含活人量段位 |

### 结构标签

| 资产 | 路径 | 用途 |
| --- | --- | --- |
| 边界感 | `web/assets/ui-art/tag-boundary.svg` | 结构标签、详情弹窗 |
| 执行力 | `web/assets/ui-art/tag-execution.svg` | 结构标签、详情弹窗 |

### 六维图标

| 资产 | 路径 | 用途 |
| --- | --- | --- |
| 六维图标组 | `web/assets/ui-art/icons-dimensions.svg` | 说明页、结果页、详情页 |

## 资产同步

上述资产同时复制到 `design/approved-uiux-v1/assets-spec/`，用于视觉稿管理和后续核对。

## 使用规则

- 结果页按含活人量百分比选择高、中、低烟雾。
- 移动答题页必须使用 `smoke-question-mobile.png`，不能直接拿桌面结果烟雾缩放。
- 段位徽章和结构标签必须使用资产文件，不能用 emoji、临时图标或 CSS 圆形替代。
- 六维图标必须保持同一套线性风格，不要混用不同图标库。
