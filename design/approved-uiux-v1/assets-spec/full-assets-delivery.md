# 全量资产交付说明

本轮已补齐正式测评开发所需的全量视觉资产。资产同时位于：

- 开发目录：`web/assets/ui-art/`
- 设计目录：`design/approved-uiux-v1/assets-spec/`

## 覆盖范围

- 8 个结果段位徽章：全部完成。
- 19 个正式结构标签徽章：全部完成。
- 3 个补充视觉标签：`tag-execution`、`tag-aesthetic`、`tag-reconstruction` 已完成，用于页面说明或维度详情扩展。
- 6 个六维图标：已完成。
- 主要烟雾资产：结果高/中/低、移动答题、浓度条、首页、说明页、工作场景、详情抽屉、分享卡，均已完成。
- 全局图标：品牌蒸馏瓶、工作场景图标组、星芒、印章，均已完成。

## 生成来源

- `smoke-score-high.png` 来自 Image Gen。
- 其他烟雾资产由高分烟雾统一派生，保证色彩逻辑和纹理一致。
- 段位徽章、结构标签、图标组由 `scripts/generate_visual_assets.py` 生成，保持同一套线性/晶体/低饱和视觉语言。

## 后续维护

如果评测配置新增段位或结构标签：

1. 先在 `full-asset-coverage.md` 增加对应行。
2. 在 `scripts/generate_visual_assets.py` 增加资产定义。
3. 运行 `python3 scripts/generate_visual_assets.py` 同步到开发目录和设计目录。
4. 更新 `asset-matrix.md` 状态。

## 开发映射

开发时优先读取 `web/assets/ui-art/asset-map.json`，其中已经把当前配置的 8 个段位和 19 个结构标签映射到具体资产路径。
