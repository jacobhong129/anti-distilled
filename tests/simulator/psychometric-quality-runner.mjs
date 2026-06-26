import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);

function readJson(relativePath, required = true) {
  const fullPath = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    if (!required) return null;
    throw new Error(`${relativePath} not found. Run npm run test:simulator and npm run test:simulator:coverage first.`);
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function failedGates(gates = {}) {
  return Object.entries(gates).filter(([, passed]) => !passed).map(([name]) => name);
}

function gateValue(gates = {}, key) {
  return gates[key] === true;
}

function distributionShare(rows = []) {
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  return rows.map(([name, count]) => ({
    name,
    count,
    share: total ? Number(((count / total) * 100).toFixed(1)) : 0,
  }));
}

function totalRows(rows = []) {
  return rows.reduce((sum, [, count]) => sum + count, 0);
}

function layer(id, title, ok, evidence, risks = [], recommendations = [], meta = {}) {
  return {
    id,
    title,
    ok,
    status: meta.status || (ok ? "通过" : "未通过"),
    verified: meta.verified ?? true,
    evidence,
    risks,
    recommendations,
  };
}

function compactRiskText(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) || text;
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}

function classifyFailure(gate) {
  if (/config|metadata|labelDelta|scoring/.test(gate)) return "计分元数据/配置";
  if (/semantic|u21|u25|x99|boundary/.test(gate)) return "题目语义/语义模型";
  if (/coverage|consumed|path|followup|item|question/.test(gate)) return "动态引擎/题库消费";
  if (/label/.test(gate)) return "标签设计";
  if (/accuracy|stability|u16|u30|band/.test(gate)) return "评分标准/结果分段";
  return "待人工复核";
}

function appIntegrationStatus(app) {
  if (!app) {
    return {
      ok: false,
      verified: false,
      status: "未运行",
      evidence: "页面集成测试未运行",
      risks: ["缺少页面集成测试证据"],
    };
  }
  if (app.ok) {
    return {
      ok: true,
      verified: true,
      status: "通过",
      evidence: "页面集成测试通过",
      risks: [],
    };
  }
  const risks = (app.failures || ["页面集成测试失败"]).map(compactRiskText).filter(Boolean);
  const blockedByEnvironment = risks.some((risk) =>
    /webServer was not able to start|listen EPERM|operation not permitted|usage limit|ECONNREFUSED|browser executable/i.test(risk)
  );
  return {
    ok: false,
    verified: !blockedByEnvironment,
    status: blockedByEnvironment ? "未验证（环境阻断）" : "未通过",
    evidence: blockedByEnvironment ? "页面集成测试受本地环境限制，未形成应用缺陷证据" : "页面集成测试失败",
    risks,
  };
}

function buildAssessment(simulator, coverageReport) {
  const coverage = simulator.coverage || coverageReport || {};
  const engineCoverage = coverage.engineCoverage || {};
  const semanticCoverage = coverage.semanticCoverage || {};
  const auditFailed = failedGates(simulator.audit?.gates);
  const engineFailed = failedGates(simulator.engine?.gates);
  const semanticFailed = failedGates(simulator.semantic?.gates);
  const engineCoverageFailed = failedGates(engineCoverage.gates);
  const semanticCoverageFailed = failedGates(semanticCoverage.gates);

  const engineTotalRuns = simulator.engine?.totalRuns || 0;
  const semanticTotalRuns = simulator.semantic?.totalRuns || 0;
  const engineLabelTop = distributionShare(simulator.engine?.labels || [])[0];
  const semanticLabelTop = distributionShare(simulator.semantic?.labels || [])[0];
  const engineBandCount = (simulator.engine?.bands || []).length;
  const semanticBandCount = (simulator.semantic?.bands || []).length;
  const stableCore = simulator.semantic?.semanticQuality?.stableCorePersonas ?? 0;
  const coreCount = simulator.semantic?.semanticQuality?.corePersonaCount ?? 30;
  const appStatus = appIntegrationStatus(simulator.app);

  const layers = [
    layer(
      "construct_content",
      "构念与内容覆盖",
      Boolean(simulator.audit?.ok) && gateValue(engineCoverage.gates, "all_core_metrics_consumed") && gateValue(semanticCoverage.gates, "all_core_metrics_consumed"),
      [
        `配置版本 ${simulator.audit?.configVersion || coverage.configVersion || "N/A"}`,
        `题目/选项 ${simulator.audit?.itemCount ?? "N/A"} / ${simulator.audit?.optionCount ?? "N/A"}`,
        `计分元数据完整选项 ${simulator.audit?.metadataComplete ?? "N/A"}`,
        `核心维度消费：普通 ${gateValue(engineCoverage.gates, "all_core_metrics_consumed") ? "完整" : "不足"}，语义 ${gateValue(semanticCoverage.gates, "all_core_metrics_consumed") ? "完整" : "不足"}`,
      ],
      auditFailed,
      auditFailed.length ? ["先修配置合法性和元数据完整性；这类问题会污染后续所有判断。"] : []
    ),
    layer(
      "implementation_equivalence",
      "应用实现一致性",
      appStatus.ok,
      [
        `页面集成测试：${appStatus.status}`,
        appStatus.evidence,
        `配置副本一致：public ${gateValue(simulator.audit?.gates, "config_matches_public_data") ? "一致" : "不一致"}，web ${gateValue(simulator.audit?.gates, "config_matches_web_data") ? "一致" : "不一致"}`,
      ],
      appStatus.risks,
      appStatus.ok ? [] : ["在可启动本地服务的环境中重跑页面集成，确认页面点击路径、结果页展示和引擎回放结果一致。"],
      { status: appStatus.status, verified: appStatus.verified }
    ),
    layer(
      "adaptive_quality",
      "动态抽题质量",
      Boolean(engineCoverage.ok) && Boolean(semanticCoverage.ok),
      [
        `普通路径题库消费 ${engineCoverage.usedItemCount ?? "N/A"}/${engineCoverage.totalItems ?? "N/A"}，唯一路径率 ${engineCoverage.uniquePathRate ?? "N/A"}%，单题最高占比 ${engineCoverage.topItemShare ?? "N/A"}%`,
        `语义路径题库消费 ${semanticCoverage.usedItemCount ?? "N/A"}/${semanticCoverage.totalItems ?? "N/A"}，唯一路径率 ${semanticCoverage.uniquePathRate ?? "N/A"}%，单题最高占比 ${semanticCoverage.topItemShare ?? "N/A"}%`,
        `追问题占比 gate：普通 ${gateValue(engineCoverage.gates, "followup_questions_at_least_55_percent") ? "通过" : "未通过"}，语义 ${gateValue(semanticCoverage.gates, "followup_questions_at_least_55_percent") ? "通过" : "未通过"}`,
      ],
      [...engineCoverageFailed, ...semanticCoverageFailed],
      engineCoverageFailed.includes("all_120_items_consumed")
        ? ["先检查未消费题是否只有位置/路由问题；若题目有价值，应补充 candidateRoutes 或 topicTags，让它能进入候选池。"]
        : []
    ),
    layer(
      "response_process",
      "语义作答过程有效性",
      Boolean(simulator.semantic?.ok) && stableCore >= 24,
      [
        "语义回归按题干和选项文字作答，不读取 scores/evidence/labelDelta。",
        `核心人格稳定 ${stableCore}/${coreCount}`,
        `语义平均分 ${simulator.semantic?.averageScore ?? "N/A"}，平均题量 ${simulator.semantic?.averageQuestions ?? "N/A"}`,
      ],
      semanticFailed,
      semanticFailed.length ? ["逐题查看失败人格的语义选择理由，优先修正选项字面信号与计分意图不一致的题。"] : []
    ),
    layer(
      "known_groups_accuracy",
      "已知群体准确性",
      Boolean(simulator.engine?.quality?.accuracyRate >= 90) && stableCore >= 24 && gateValue(simulator.engine?.gates, "x99_not_systematically_underestimated"),
      [
        `普通回归准确率 ${simulator.engine?.quality?.accuracyRate ?? "N/A"}%，准确 ${simulator.engine?.quality?.accurateRuns ?? "N/A"}/${simulator.engine?.quality?.totalRuns ?? engineTotalRuns}`,
        `语义核心命中门槛：${stableCore >= 24 ? "通过" : "未通过"}（${stableCore}/${coreCount}）`,
        `X99 系统性低估 gate：${gateValue(simulator.engine?.gates, "x99_not_systematically_underestimated") ? "通过" : "未通过"}`,
      ],
      [...engineFailed, ...semanticFailed].filter((gate) => /accuracy|u16|u30|x99|u21|u25|core_personas/.test(gate)),
      ["不要通过改虚拟人过测；应回到评分区间、标签证据和风险反证规则。"]
    ),
    layer(
      "test_retest_reliability",
      "多轮稳定性",
      Boolean(simulator.engine?.quality?.stabilityRate >= 90) && stableCore >= 24,
      [
        `普通回归稳定率 ${simulator.engine?.quality?.stabilityRate ?? "N/A"}%，稳定人格 ${simulator.engine?.quality?.stablePersonas ?? "N/A"}/${simulator.engine?.quality?.totalPersonas ?? "N/A"}`,
        `语义稳定核心人格 ${stableCore}/${coreCount}`,
      ],
      [...engineFailed, ...semanticFailed].filter((gate) => /stability|stable|core_personas/.test(gate)),
      ["稳定性不足时，优先检查边界分数段、停止条件和追问分叉是否让同一人格被不同路径拉到不同段位。"]
    ),
    layer(
      "label_interpretability",
      "标签解释与分化",
      gateValue(simulator.engine?.gates, "no_single_label_over_45_percent") && gateValue(simulator.semantic?.gates, "no_single_label_over_45_percent"),
      [
        `普通主标签最高占比：${engineLabelTop ? `${engineLabelTop.name} ${engineLabelTop.share}%` : "N/A"}`,
        `语义主标签最高占比：${semanticLabelTop ? `${semanticLabelTop.name} ${semanticLabelTop.share}%` : "N/A"}`,
        `普通分段数 ${engineBandCount}，语义分段数 ${semanticBandCount}`,
      ],
      [...engineFailed, ...semanticFailed].filter((gate) => /label|band/.test(gate)),
      ["若单标签吞并，检查 labelDelta 权重、主标签选择优先级和结果页候选标签展示。"]
    ),
    layer(
      "item_utility",
      "题库利用与题目有用性",
      gateValue(engineCoverage.gates, "all_120_items_consumed") && gateValue(semanticCoverage.gates, "all_120_items_consumed"),
      [
        `普通未消费题 ${engineCoverage.unusedItemCount ?? "N/A"}，语义未消费题 ${semanticCoverage.unusedItemCount ?? "N/A"}`,
        `普通使用集中度 Gini ${engineCoverage.usageGini ?? "N/A"}，语义使用集中度 Gini ${semanticCoverage.usageGini ?? "N/A"}`,
        `普通低使用题样本 ${(engineCoverage.lowUseItems || []).slice(0, 5).map((item) => item.itemId).join("、") || "无"}`,
      ],
      [...engineCoverageFailed, ...semanticCoverageFailed].filter((gate) => /consumed|item|metadata/.test(gate)),
      ["未消费不等于无用；先判断它是路由不可达、题意重复、只适合罕见人格，还是计分价值低。"]
    ),
  ];

  const failuresByCategory = {};
  for (const gate of [...auditFailed, ...engineFailed, ...semanticFailed, ...engineCoverageFailed, ...semanticCoverageFailed]) {
    const category = classifyFailure(gate);
    if (!failuresByCategory[category]) failuresByCategory[category] = [];
    if (!failuresByCategory[category].includes(gate)) failuresByCategory[category].push(gate);
  }

  const okLayerCount = layers.filter((item) => item.ok).length;
  const overallOk = layers.every((item) => item.ok);
  const failedLayerTitles = layers.filter((item) => !item.ok).map((item) => item.title);
  const conclusion = overallOk
    ? "当前证据支持进入正式发布前小样本真人校准。"
    : `当前还不能作为稳定、准确的正式测评结论系统；未通过或未验证层级包括：${failedLayerTitles.join("、")}。`;

  return {
    generatedAt: new Date().toISOString(),
    sourceReports: {
      simulator: "docs/latest-simulator-report.json",
      dynamicCoverage: "docs/latest-dynamic-coverage-report.json",
    },
    overallOk,
    okLayerCount,
    totalLayerCount: layers.length,
    conclusion,
    summary: {
      auditOk: Boolean(simulator.audit?.ok),
      appOk: simulator.app ? Boolean(simulator.app.ok) : null,
      appStatus: appStatus.status,
      appVerified: appStatus.verified,
      engineOk: Boolean(simulator.engine?.ok),
      semanticOk: Boolean(simulator.semantic?.ok),
      engineCoverageOk: Boolean(engineCoverage.ok),
      semanticCoverageOk: Boolean(semanticCoverage.ok),
      engineAccuracyRate: simulator.engine?.quality?.accuracyRate ?? null,
      engineStabilityRate: simulator.engine?.quality?.stabilityRate ?? null,
      semanticStableCorePersonas: stableCore,
      semanticCorePersonaCount: coreCount,
      engineUsedItems: engineCoverage.usedItemCount ?? null,
      semanticUsedItems: semanticCoverage.usedItemCount ?? null,
      engineTotalRuns,
      semanticTotalRuns,
      engineBandCount,
      semanticBandCount,
      engineTopLabel: engineLabelTop || null,
      semanticTopLabel: semanticLabelTop || null,
    },
    layers,
    failuresByCategory,
    unusedItems: {
      engine: (engineCoverage.unusedItems || []).map((item) => ({
        itemId: item.itemId,
        stage: item.stage,
        primaryMetric: item.primaryMetric,
        topicTags: item.topicTags,
      })),
      semantic: (semanticCoverage.unusedItems || []).map((item) => ({
        itemId: item.itemId,
        stage: item.stage,
        primaryMetric: item.primaryMetric,
        topicTags: item.topicTags,
      })),
    },
  };
}

function renderMarkdown(report) {
  const status = report.overallOk ? "通过" : "未通过";
  const categoryLines = Object.entries(report.failuresByCategory)
    .map(([category, gates]) => `- ${category}：${gates.join("、")}`)
    .join("\n") || "- 无";
  const layerRows = report.layers.map((item) => `| ${item.title} | ${item.status} | ${item.risks.join("、") || "无"} |`).join("\n");
  const layerDetails = report.layers.map((item) => [
    `## ${item.title}`,
    "",
    `- 状态：${item.status}`,
    `- 证据：${item.evidence.join("；")}`,
    `- 风险：${item.risks.join("、") || "无"}`,
    `- 建议：${item.recommendations.join("；") || "暂无"}`,
    "",
  ].join("\n")).join("\n");
  const engineUnused = report.unusedItems.engine.map((item) => `- ${item.itemId}｜${item.stage}｜${item.primaryMetric}｜${(item.topicTags || []).join(",")}`).join("\n") || "无";
  const semanticUnused = report.unusedItems.semantic.map((item) => `- ${item.itemId}｜${item.stage}｜${item.primaryMetric}｜${(item.topicTags || []).join(",")}`).join("\n") || "无";
  const adaptiveOk = report.layers.find((item) => item.id === "adaptive_quality")?.ok;
  const labelOk = report.layers.find((item) => item.id === "label_interpretability")?.ok;
  const repairOrder = [
    adaptiveOk
      ? "1. 动态抽题当前已覆盖 120/120，后续只需持续监控低使用题和题目暴露集中度。"
      : "1. 先修动态引擎的题库消费与路径可达性，确认普通路径 120/120 可被消费。",
    "2. 再修评分标准和风险反证，让 U16/U30 等低估值样本不能稳定进入高分段，同时避免 X99 被低估。",
    labelOk
      ? "3. 标签分化当前未触发吞并 gate，但仍需观察关键标签是否和用户证据一致。"
      : "3. 再修标签分化，降低单一主标签吞并，尤其检查有底线型、边界感与改题型/经验型/AI放大型之间的证据分配。",
    "4. 最后做语义逐题复核，确认选项字面语义和计分元数据一致；不要为虚拟人过测而牺牲真实用户可读性。",
  ];
  return [
    "# 测评专业质量审计报告",
    "",
    `生成时间：${report.generatedAt}`,
    "",
    "## 总体结论",
    "",
    `- 结论：${status}`,
    `- 通过层数：${report.okLayerCount}/${report.totalLayerCount}`,
    `- 判断：${report.conclusion}`,
    "",
    "本报告按心理测量证据链审计现有模拟测试结果：构念与内容、作答过程、已知群体准确性、多轮稳定性、适应式抽题质量、标签解释、题库利用和页面实现一致性。",
    "",
    "## 快速摘要",
    "",
    `- 配置审计：${report.summary.auditOk ? "通过" : "未通过"}`,
    `- 页面集成：${report.summary.appStatus || (report.summary.appOk === null ? "未运行" : report.summary.appOk ? "通过" : "未通过")}`,
    `- 普通回归：${report.summary.engineOk ? "通过" : "未通过"}，准确率 ${report.summary.engineAccuracyRate ?? "N/A"}%，稳定率 ${report.summary.engineStabilityRate ?? "N/A"}%`,
    `- 语义回归：${report.summary.semanticOk ? "通过" : "未通过"}，稳定核心人格 ${report.summary.semanticStableCorePersonas}/${report.summary.semanticCorePersonaCount}`,
    `- 动态覆盖：普通 ${report.summary.engineUsedItems}/120，语义 ${report.summary.semanticUsedItems}/120`,
    `- 分段覆盖：普通 ${report.summary.engineBandCount} 段，语义 ${report.summary.semanticBandCount} 段`,
    `- 最高主标签：普通 ${report.summary.engineTopLabel ? `${report.summary.engineTopLabel.name} ${report.summary.engineTopLabel.share}%` : "N/A"}；语义 ${report.summary.semanticTopLabel ? `${report.summary.semanticTopLabel.name} ${report.summary.semanticTopLabel.share}%` : "N/A"}`,
    "",
    "## 分层结果",
    "",
    "| 层级 | 状态 | 失败/风险 |",
    "|---|---|---|",
    layerRows,
    "",
    "## 失败归因",
    "",
    categoryLines,
    "",
    "## 未消费题",
    "",
    "### 普通引擎路径",
    "",
    engineUnused,
    "",
    "### 语义路径",
    "",
    semanticUnused,
    "",
    layerDetails,
    "## 修复顺序",
    "",
    ...repairOrder,
    "",
  ].join("\n");
}

export function runPsychometricQualityAudit(options = {}) {
  const simulator = readJson(options.simulatorReport || "docs/latest-simulator-report.json");
  const coverageReport = readJson(options.coverageReport || "docs/latest-dynamic-coverage-report.json", false);
  const report = buildAssessment(simulator, coverageReport);
  const docsDir = path.resolve(ROOT, "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const jsonPath = path.join(docsDir, "latest-psychometric-quality-report.json");
  const mdPath = path.join(docsDir, "latest-psychometric-quality-report.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, renderMarkdown(report));
  return {
    ...report,
    reportPaths: {
      jsonPath: path.relative(ROOT, jsonPath),
      mdPath: path.relative(ROOT, mdPath),
    },
  };
}

function parseCli() {
  const summaryOnly = args.includes("--summary-only");
  const strict = args.includes("--strict");
  const report = runPsychometricQualityAudit();
  const output = {
    ok: report.overallOk,
    reportPaths: report.reportPaths,
    summary: report.summary,
    failedLayers: report.layers.filter((item) => !item.ok).map((item) => item.id),
    failuresByCategory: report.failuresByCategory,
    conclusion: report.conclusion,
  };
  console.log(JSON.stringify(summaryOnly ? output : report, null, 2));
  if (strict && !report.overallOk) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  parseCli();
}
