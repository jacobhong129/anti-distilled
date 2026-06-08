# 抗蒸性测试 UI/UX 正式视觉稿 v1

状态：视觉方向已通过，作为后续前端开发的视觉母版。

本目录用于管理正式 UI/UX 设计稿、视觉规则和开发拆解。后续开发不得只参考聊天记录，应以本目录中的图片和说明文件为准。

## 设计稿

- [01-首页](images/01-home.png)
- [02-什么是抗蒸性](images/02-what-is-anti-distilled.png)
- [03-工作场景校准](images/03-work-context.png)
- [04-动态答题桌面/移动](images/04-question-desktop-mobile.png)
- [04-动态答题移动端烟雾修订](images/04-question-mobile-smoke-revision.png)
- [05-结果总览](images/05-result-overview.png)
- [06-结果详情抽屉/弹窗](images/06-result-detail-drawer.png)
- [07-产品旅程与组件系统](images/07-product-system.png)

## 配套说明

- [视觉说明](visual-spec.md)
- [前端实现拆解](implementation-breakdown.md)
- [逐页视觉元素拆解](assets-spec/page-visual-breakdown.md)
- [视觉元素资产清单](assets-spec/visual-elements-inventory.md)
- [视觉资产矩阵](assets-spec/asset-matrix.md)
- [P0 资产交付说明](assets-spec/p0-assets.md)
- [全量视觉资产覆盖表](assets-spec/full-asset-coverage.md)
- [全量资产交付说明](assets-spec/full-assets-delivery.md)
- [开发资产映射表](assets-spec/asset-map.json)

## 已确认的核心原则

1. 桌面端采用横向大画布，不做移动端布局的放大版。
2. 移动端必须重排，不得简单缩放桌面端。
3. 烟雾不是装饰，而是含活人量和蒸馏损耗的可视化语言。
4. 含活人量越高，烟雾越多彩、越有机；含活人量越低，烟雾越灰、越规整。
5. 首页要表达完整因果链：人的想法/判断/经验/取舍 -> 蒸馏过程 -> 工作流/插件/Skill/提示词。
6. 结果页分数单位为百分比，例如 `86%`，不得使用“分”。
7. 不向用户展示版本号、测试环境功能、导入虚拟用户等内部功能。
