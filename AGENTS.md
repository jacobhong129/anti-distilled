# AGENTS.md

本文件是 `/Users/bytedance/Documents/anti-distilled` 的项目级协作说明。后续代理在本仓库工作时，优先遵守这里的规则；若用户在对话中给出更新要求，以用户最新要求为准。

## Project Goal

本项目是“抗蒸性 / 含活人量”公开 Web 测评应用。目标不是维护一个固定问卷，而是把题库、元数据、动态引擎和产品 UI 组合成一个可长期迭代的正式产品：

- 根据用户每次答题实时估计状态。
- 根据不确定点动态选择下一题。
- 通过追问验证判断、降低误判。
- 在同一考察维度内做可复现随机化，避免每次都命中同一批前排题。
- 面向公开用户时隐藏题目路径、内部权重、虚拟人和测试开关。
- UI、评测设计、动态引擎彼此解耦：可以单独更新其中一层，不要让 UI 调整反向污染评分设计，也不要为了回归结果牺牲正式产品体验。

## Current Architecture

当前应用是 React + Vite 项目：

- `src/`：正式应用源码。
- `src/App.jsx`：主应用流程、页面组件和结果页展示。
- `src/engine/adaptive-engine.js`：当前动态评测引擎实现。
- `src/data/asset-map.json`：前端源码使用的视觉资产映射。
- `config/game-config-v11.json`：当前评测配置源。虽然文件名仍是 v11，当前配置内容版本可为 `12.0`，以文件内容和校验结果为准。
- `public/data/game-config.json`：前端开发/构建运行配置副本。
- `public/assets/ui-art/`：正式应用使用的视觉资产源。
- `web/`：Vite 构建后的静态发布目录，Netlify 生产部署使用该目录或由该目录裁剪出的最小静态包。
- `design/approved-uiux-v1/`：已定稿 UI/UX、视觉规范、页面稿和资产标准。
- `docs/v12-scoring-label-standards.md`：当前评分、标签和重点人格验收口径。
- `tests/simulator/`：独立模拟测试体系，包括配置审计、引擎回归、语义回归、应用集成测试和报告生成。
- `scripts/`：兼容命令入口，部分脚本会委托到 `tests/simulator/`。

不要把旧版 `web/adaptive-engine.js`、`web/app.js`、`web/styles.css` 当作当前源码入口。若这些文件存在，应先确认它们是否只是历史残留或待删除构建遗留。

## Source Of Truth

- 题库、选项、评分维度、标签、风险和停止规则以 `config/game-config-v11.json` 为源配置。
- 前端运行副本必须与源配置同步到 `public/data/game-config.json`；如发布包或旧部署仍包含 `web/data/game-config.json`，也必须保持一致。
- 视觉实现以 `design/approved-uiux-v1/visual-spec.md`、`design/approved-uiux-v1/implementation-breakdown.md` 和 `design/approved-uiux-v1/assets-spec/` 为标准。
- 评分和标签判别以 `docs/v12-scoring-label-standards.md` 为当前口径。
- 虚拟人样本和模拟器只用于诊断，不是产品规则来源。

## Assessment Design Rules

含活人量测的是一个人的判断、经验、审美、边界和取舍被低损耗蒸馏成 Skill、工作流、插件或提示词的难度。

开发和调参时遵守：

- 高分必须同时具备强维度和真实证据，不能靠成熟措辞、漂亮表达或单个强选项直达。
- 低表达不等于低价值，表达慢、经验重、审美强的人不能默认落入伪抗蒸。
- `边界感` 是具体结构标签，不是复杂人格的兜底标签。
- 每个高价值选项必须有清楚链路：语义意图 -> 维度分 -> evidence -> labelDelta。
- 题目表达可以人话化，但不能删掉区分选项所需的关键信号。
- 调整回归结果时，优先修题库元数据和通用引擎规则；发现虚拟人问题只记录，不通过修改虚拟人过测。

六个核心维度：

- `CXT` 情境辨识：对象、场合、关系和真实需求。
- `BND` 边界校准：规则、模板、AI 或方法何时失效。
- `GEN` 生成重构：把问题改准、把方案做活。
- `TST` 审美判别：识别空话、假精致和表达失真。
- `STN` 价值定向：代价、后果、底线和责任。
- `GRD` 经验内化：经验是否变成可迁移判断。

辅助维度包括但不限于 `SKL`、`EXP`、`NOI`、`TLB`，用于识别可蒸馏度、表达、噪声和工具边界。

## Dynamic Engine Rules

动态引擎应保持清晰分层：

- `stateEstimate`：实时状态估计，包括维度分数、标签置信度、风险状态、覆盖情况和总置信度。
- `candidateRoutes`：下一题候选池，包括初筛覆盖、低置信维度、标签分叉、风险反证和证据缺口。
- `selectionDecision`：最终抽题决策，包括候选评分、主题冷却、同维度随机化、seed 可复现和不重复约束。

实现动态抽题时遵守：

- 初筛阶段仍覆盖 `CXT/BND/GEN/TST/STN/GRD/SKL_OR_TLB/EXP_OR_NOI`。
- 同一覆盖目标内使用 session seed 随机抽取，不固定选择配置中的第一题。
- 追问阶段按诊断价值选题：低置信维度、标签分叉、风险反证、题目新鲜度、证据缺口、配置路由匹配。
- 在最高分候选附近做 seeded top-k 随机抽样，保证判断方向稳定但路径可变化。
- 使用 `topicTags`、`avoidWithinTags` 或等价冷却逻辑，避免连续追问同一主题。
- 每次测试不得重复同一道题。
- 置信度足够且达到最低题量后可以停止；风险未反证、标签摇摆、分数临近边界时继续追问。
- 置信度、题目路径、选择决策、内部风险权重只用于内部运行和诊断，不在用户界面展示。

## Product And Frontend Rules

正式应用必须面向外部用户，而不是测试页。

- 前台优先展示“含活人量”这一百分比分数，标签和解释作为辅助层。
- 不向用户展示配置版本、题目版本、测试环境、虚拟用户、题目 ID、内部权重、题目路径、置信度状态或调试开关。
- 结果页可以解释“为什么这么判”，但只能使用用户可理解的维度、标签、证据和趣味文案，不暴露内部算法细节。
- 职业/岗位上下文是独立模块，不直接给个人含活人量加减分；用户可以跳过。
- 选项展示遵守配置中的展示顺序或 session seed 洗牌规则，不显示 A/B/C/D。
- 答题页必须支持上一题。
- 移动端不得出现 hover/focus 造成的“像已选中”误导状态。
- 页面底部保留浅色署名 `Designed by Jacob HONG`。

视觉要求：

- 遵守 `design/approved-uiux-v1/` 的定稿视觉标准。
- 首页必须清晰表达“人的想法 / 判断 / 经验 / 取舍 -> 蒸馏过程 -> 工作流 / 插件 / Skill / 提示词”的逻辑链。
- 烟雾不是装饰：彩色烟雾代表人味、判断、经验、审美；灰色烟雾代表流程化、标准化、工具化。
- 结果页烟雾必须随含活人量变化：含活人量越高，彩色成分越多；越低，灰度成分越高。
- 桌面端是横向大画布；移动端必须重新排版，不是缩放桌面版。
- 避免多层背景框导致烟雾视觉被切碎；优先使用少层级、透明、轻边框的布局。
- 字体应接近定稿的中文书卷感。可用系统宋体/楷体/衬线栈，控件使用系统 UI 字体；除非明确需要，不要引入沉重字体文件。

## Visual Assets

- 正式应用资产位于 `public/assets/ui-art/`，构建后复制到 `web/assets/ui-art/`。
- 当前运行优先使用透明 WebP 烟雾资产，例如 `smoke-*-alpha.webp`。
- 首页蒸馏示意优先使用 `home-distillation-cutout.webp`。
- 8 个段位徽章、19 个结构标签、维度图标、品牌烧瓶、印章等必须使用正式资产，不用简化 SVG 或 CSS 近似替代。
- 若新增或替换资产，必须同步 `src/data/asset-map.json` 和 `public/assets/ui-art/asset-map.json`；构建后检查 `web/assets/ui-art/asset-map.json`。

## Virtual Personas And Simulator

虚拟人只用于测试和回归，不是产品规则来源。

- 不要在引擎设计中迁就某个虚拟人的剧本或个性描述。
- 不要把 `U17/U21/U25/U30/X99` 等样本名称写进正式引擎逻辑。
- 可以用虚拟人发现题库、评分、抽题路径和语义稳定性问题，但修复必须回到通用规则：维度、证据、风险、置信度、覆盖率和停止条件。
- 正式前端不得展示虚拟人导入、回放、题目路径、题目 ID、内部权重或测试开关。
- 测试报告可以保留虚拟人路径和诊断细节，但应放在 `docs/` 或脚本输出中，不进入用户可见页面。
- `tests/simulator/` 是当前更完整的模拟测试体系；旧 `scripts/` 命令作为兼容入口。

## Validation Gates

涉及配置、引擎、题目路径或结果逻辑时，至少运行：

```bash
npm run validate:config
npm run validate:engine
npm run regress
```

涉及语义判断、虚拟人稳定性或题库语义调整时，再运行：

```bash
npm run regress:semantic
```

涉及完整模拟体系或发布前综合验证时，优先运行：

```bash
npm run test:simulator:self
npm run test:simulator
```

涉及前端构建或部署前，至少运行：

```bash
npm run build
```

如果是完整发布前检查，可运行：

```bash
npm run test:suite
```

当前注意：

- 回归失败不一定阻断 UI 或部署更新；若用户明确将失败归类为“评测设计后续优化”，可以先发布应用集成版本。
- 但必须在回复中说明失败 gate 和风险，不要把未通过回归描述成通过。
- 发布前至少保证配置合法、动态引擎可运行、构建通过。

## Deployment Rules

当前主发布目标是 Netlify 项目 `anti-distilled`。

- GitHub 主分支：`main`，远端通常为 `jacobhong129/anti-distilled`。
- Netlify 站点 ID：`3ce8ec4f-6d3c-49bb-a652-770968e4adae`。
- 生产地址：`https://anti-distilled.netlify.app`。
- Vercel 暂停使用；除非用户重新明确要求，不要继续 Vercel 登录或部署流程。

发布方式：

- 优先从已经构建好的 `web/` 目录裁剪最小静态包部署到 Netlify，避免上传未提交的历史文档、测试报告、设计稿或虚拟人材料。
- 最小静态包通常只包含：
  - `index.html`
  - `assets/build/`
  - `assets/ui-art/*.svg`
  - `assets/ui-art/*.webp`
  - `assets/ui-art/asset-map.json`
  - `data/game-config.json`
  - 一个发布用 `netlify.toml`
- 不要上传 `docs/`、`design/`、`tests/`、`test-results/`、虚拟人配置或本地临时文件到部署包，除非用户明确要求。
- Netlify 额度或账号问题不是代码问题；遇到 `account credit usage exceeded` 时应明确说明。

GitHub 更新：

- 当前工作区经常有未提交历史文档、测试脚本和报告变更。除非用户明确要求全量提交，只暂存本次任务所需文件。
- 不要用 `git add -A` 覆盖式提交整个工作区，除非已经确认所有改动都属于本次任务。
- 旧文档删除、README/DEPLOY 修改、模拟器脚本新增等如果不是用户当前目标，不要顺手提交。
- 提交后推送到 `origin main`。

## Working Practice

- 先读当前文件结构、配置版本和用户最新要求，再动手改代码。
- 保持改动范围小，避免顺手清理无关历史文件。
- 当前工作区可能有未提交改动，不要回滚用户或其他代理的改动。
- 如果遇到用户中断，先确认是否有后台命令仍在运行，再继续。
- 新增架构能力时，优先让结构支撑长期迭代：状态估计、候选路由、抽题决策、结果置信度和诊断验证应保持可测试、可解释、可替换。
- 文档和代码中的内部命名可以技术化，但用户可见文案应保持中文、清楚、少术语。
- 对外回复要区分三类状态：已集成、已验证、已发布。不要把本地构建成功说成线上已更新。
