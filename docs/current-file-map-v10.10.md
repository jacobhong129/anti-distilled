# 抗蒸性测试 V10.10：当前文件地图

这份清单说明清理历史版本后，哪些文件是后续开发和迭代需要继续使用的当前版本。

## 主配置

- `config/game-config-v10.10.json`：当前唯一开发主配置。

## 核心设计

- `docs/game-design-complete-v10.10.md`：完整游戏设计。
- `docs/development-handoff-v10.10.md`：开发交接说明。
- `docs/v10.10-historical-regression-and-app-readiness.md`：历史问题复盘、V10.10 修复矩阵与应用开发准入。
- `docs/v10.10-comprehensive-readiness-eval.md`：最新全面测试与正式应用开发准入评估。
- `docs/app-implementation-regression-v10.10-30x5.md`：当前应用引擎实现回归报告。

## 题库与样本

- `docs/virtual-persona-registry.md`：虚拟人基础样本。
- `docs/virtual-persona-social-distribution-v10.10.md`：社会加权 30 人样本设计。

## 脚本

- `scripts/validate_game_config.py`：校验配置结构和开发准入字段。
- `scripts/fill_label_deltas.py`：为题库选项补齐结构标签增量元数据。
- `scripts/regress_app_engine.mjs`：使用当前 Web 引擎跑 30 虚拟人 x 5 轮严格回归。
- `scripts/generate_visual_assets.py`：生成 Web/UI 视觉资产。

## 设计与应用材料

- `design/approved-uiux-v1/`：当前定稿 UI/UX 视觉标准、页面设计稿、资产说明和视觉资产归档。
- `web/`：当前正式面向用户的静态 Web 应用。

## 后续原则

- 新增版本时，优先更新主配置和本文件地图。
- 当前阶段以 `config/game-config-v10.10.json` 和 `web/data/game-config.json` 作为配置基准，不再保留旧版本过程稿。
- 后续应用优化优先修改 `web/` 和 `design/approved-uiux-v1/`；若触及评测引擎，必须运行 `node scripts/regress_app_engine.mjs --strict`。
