import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runEngineRegression } from "./engine-runner.mjs";
import { runSemanticRegression } from "./semantic-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function countBy(values) {
  const counts = new Map();
  for (const value of values) counts.set(value || "N/A", (counts.get(value || "N/A") || 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percent(value, total) {
  return total ? Number(((value / total) * 100).toFixed(1)) : 0;
}

function gini(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  const weighted = sorted.reduce((sum, value, index) => sum + value * (index + 1), 0);
  return Number(((2 * weighted) / (sorted.length * total) - (sorted.length + 1) / sorted.length).toFixed(3));
}

function flattenRunPaths(result) {
  return (result.perPersona || []).flatMap((persona) =>
    (persona.rounds || []).flatMap((round) =>
      (round.path || []).map((step) => ({
        ...step,
        personaId: persona.personaId,
        personaName: persona.personaName,
        group: persona.group,
        round: round.round,
        score: round.score,
        band: round.band,
        label: round.label,
      }))
    )
  );
}

function itemMetadataComplete(item) {
  return (item.options || []).every((option) =>
    option.scores && Object.keys(option.scores).length &&
    Array.isArray(option.evidence) &&
    option.labelDelta && Object.keys(option.labelDelta).length
  );
}

function analyzeMode(name, result, config) {
  const itemMeta = new Map(config.items.map((item) => [item.id, item]));
  const paths = flattenRunPaths(result).map((step) => {
    const item = itemMeta.get(step.itemId) || {};
    return {
      ...step,
      stage: step.stage || item.stage || "",
      role: step.role || item.role || "",
      primaryMetric: step.primaryMetric || item.primaryMetric || "",
      secondaryMetrics: step.secondaryMetrics?.length ? step.secondaryMetrics : item.secondaryMetrics || [],
      topicTags: step.topicTags?.length ? step.topicTags : item.topicTags || [],
    };
  });
  const byItem = new Map(config.items.map((item) => [item.id, {
    itemId: item.id,
    stage: item.stage || "",
    role: item.role || "",
    primaryMetric: item.primaryMetric || "",
    secondaryMetrics: item.secondaryMetrics || [],
    topicTags: item.topicTags || [],
    optionCount: item.options?.length || 0,
    metadataComplete: itemMetadataComplete(item),
    selectedCount: 0,
    firstEightCount: 0,
    followupCount: 0,
    personas: new Set(),
    rounds: new Set(),
    reasons: new Map(),
    candidateTop6Count: 0,
  }]));

  for (const step of paths) {
    const row = byItem.get(step.itemId);
    if (!row) continue;
    row.selectedCount += 1;
    if (step.order <= 8) row.firstEightCount += 1;
    if (step.order > 8) row.followupCount += 1;
    row.personas.add(step.personaId);
    row.rounds.add(`${step.personaId}:${step.round}`);
    for (const reason of step.selectionDecision?.topCandidates?.find((candidate) => candidate.itemId === step.itemId)?.reasons || []) {
      row.reasons.set(reason, (row.reasons.get(reason) || 0) + 1);
    }
    for (const candidate of step.selectionDecision?.topCandidates || []) {
      const candidateRow = byItem.get(candidate.itemId);
      if (candidateRow) candidateRow.candidateTop6Count += 1;
    }
  }

  const itemRows = [...byItem.values()].map((row) => ({
    ...row,
    personas: [...row.personas].sort(),
    personaCount: row.personas.size,
    roundCount: row.rounds.size,
    reasons: [...row.reasons.entries()].sort((left, right) => right[1] - left[1]),
  }));
  const usedItems = itemRows.filter((row) => row.selectedCount > 0);
  const unusedItems = itemRows.filter((row) => row.selectedCount === 0);
  const totalSelections = paths.length;
  const topItem = [...itemRows].sort((left, right) => right.selectedCount - left.selectedCount)[0];
  const uniqueSequences = new Set((result.perPersona || []).flatMap((persona) =>
    (persona.rounds || []).map((round) => (round.path || []).map((step) => step.itemId).join(">"))
  ));
  const totalRuns = result.totalRuns || 0;
  const reasonCounts = countBy(paths.flatMap((step) =>
    step.selectionDecision?.topCandidates?.find((candidate) => candidate.itemId === step.itemId)?.reasons || []
  ));
  const selectedCounts = itemRows.map((row) => row.selectedCount);
  const gates = {
    all_120_items_consumed: usedItems.length === config.items.length,
    all_consumed_items_have_metadata: usedItems.every((row) => row.metadataComplete),
    no_item_above_5_percent_of_selections: percent(topItem?.selectedCount || 0, totalSelections) <= 5,
    path_diversity_at_least_70_percent: percent(uniqueSequences.size, totalRuns) >= 70,
    followup_questions_at_least_55_percent: percent(paths.filter((step) => step.order > 8).length, totalSelections) >= 55,
    all_core_metrics_consumed: ["CXT", "BND", "GEN", "TST", "STN", "GRD"].every((metric) => usedItems.some((row) => row.primaryMetric === metric || row.secondaryMetrics.includes(metric))),
  };

  return {
    mode: name,
    ok: Object.values(gates).every(Boolean),
    totalItems: config.items.length,
    usedItemCount: usedItems.length,
    unusedItemCount: unusedItems.length,
    itemUseRate: percent(usedItems.length, config.items.length),
    totalSelections,
    averageQuestions: result.averageQuestions,
    totalRuns,
    uniquePathCount: uniqueSequences.size,
    uniquePathRate: percent(uniqueSequences.size, totalRuns),
    topItemShare: percent(topItem?.selectedCount || 0, totalSelections),
    usageGini: gini(selectedCounts),
    gates,
    stageDistribution: countBy(paths.map((step) => step.stage)),
    metricDistribution: countBy(paths.map((step) => step.primaryMetric)),
    reasonDistribution: reasonCounts,
    topItems: [...itemRows].sort((left, right) => right.selectedCount - left.selectedCount).slice(0, 15),
    lowUseItems: [...itemRows].filter((row) => row.selectedCount > 0).sort((left, right) => left.selectedCount - right.selectedCount).slice(0, 15),
    unusedItems,
    itemRows,
  };
}

function renderMode(mode) {
  const failed = Object.entries(mode.gates).filter(([, passed]) => !passed).map(([gate]) => gate);
  const unusedPreview = mode.unusedItems.slice(0, 30).map((item) => `- ${item.itemId}｜${item.stage}｜${item.primaryMetric}｜${item.topicTags.join(",") || "no_tags"}`).join("\n") || "无";
  const topRows = mode.topItems.slice(0, 10).map((item) => `| ${item.itemId} | ${item.selectedCount} | ${item.personaCount} | ${item.stage} | ${item.primaryMetric} |`).join("\n");
  return [
    `## ${mode.mode}`,
    "",
    `- 结论：${mode.ok ? "通过" : "未通过"}`,
    `- 题库消费：${mode.usedItemCount}/${mode.totalItems}（${mode.itemUseRate}%）`,
    `- 总抽题次数：${mode.totalSelections}`,
    `- 平均题量：${mode.averageQuestions}`,
    `- 唯一路径：${mode.uniquePathCount}/${mode.totalRuns}（${mode.uniquePathRate}%）`,
    `- 单题最高占比：${mode.topItemShare}%`,
    `- 使用集中度 Gini：${mode.usageGini}`,
    `- 失败 gate：${failed.join("、") || "无"}`,
    "",
    "### 高频题",
    "",
    "| 题目 | 命中 | 人格数 | 阶段 | 主维度 |",
    "|---|---:|---:|---|---|",
    topRows || "| 无 | 0 | 0 | - | - |",
    "",
    "### 未消费题预览",
    "",
    unusedPreview,
    "",
  ].join("\n");
}

function writeCoverageReport(data) {
  const docsDir = path.resolve(ROOT, "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const jsonPath = path.join(docsDir, "latest-dynamic-coverage-report.json");
  const mdPath = path.join(docsDir, "latest-dynamic-coverage-report.md");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  fs.writeFileSync(mdPath, [
    "# 动态抽题与题库消费评测",
    "",
    `生成时间：${new Date().toISOString()}`,
    "",
    "本报告检验动态引擎是否在多轮评测中真实消费题库、保持路径差异，并避免少数题目过度集中。",
    "",
    renderMode(data.engineCoverage),
    renderMode(data.semanticCoverage),
  ].join("\n"));
  return {
    jsonPath: path.relative(ROOT, jsonPath),
    mdPath: path.relative(ROOT, mdPath),
  };
}

export function runDynamicCoverage(options = {}) {
  const configPath = path.resolve(ROOT, options.configPath || "config/game-config-v11.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const rounds = options.rounds || 20;
  const shared = {
    rounds,
    includeX99: true,
    includeCalibration: Boolean(options.includeCalibration),
    includeStress: Boolean(options.includeStress),
    summaryOnly: false,
  };
  const engine = runEngineRegression(shared);
  const semantic = runSemanticRegression(shared);
  const data = {
    configVersion: config.version,
    rounds,
    personaScope: {
      includeX99: true,
      includeCalibration: Boolean(options.includeCalibration),
      includeStress: Boolean(options.includeStress),
    },
    engine: {
      ok: engine.ok,
      averageScore: engine.averageScore,
      averageQuestions: engine.averageQuestions,
      bands: engine.bands,
      labels: engine.labels,
      gates: engine.gates,
      quality: engine.quality,
    },
    semantic: {
      ok: semantic.ok,
      averageScore: semantic.averageScore,
      averageQuestions: semantic.averageQuestions,
      bands: semantic.bands,
      labels: semantic.labels,
      gates: semantic.gates,
      semanticQuality: semantic.semanticQuality,
    },
    engineCoverage: analyzeMode("普通引擎回归路径", engine, config),
    semanticCoverage: analyzeMode("语义真人模拟路径", semantic, config),
  };
  return {
    ...data,
    reportPaths: writeCoverageReport(data),
  };
}

function parseCli(argv) {
  const value = (name, fallback = "") => {
    const inline = argv.find((arg) => arg.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1);
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] || fallback : fallback;
  };
  return {
    rounds: Number.parseInt(value("--rounds", "20"), 10),
    includeCalibration: argv.includes("--include-calibration"),
    includeStress: argv.includes("--include-stress"),
    summaryOnly: argv.includes("--summary-only"),
    strict: argv.includes("--strict"),
  };
}

function compact(result) {
  return {
    configVersion: result.configVersion,
    rounds: result.rounds,
    reportPaths: result.reportPaths,
    engine: {
      ok: result.engine.ok,
      averageScore: result.engine.averageScore,
      averageQuestions: result.engine.averageQuestions,
      failedGates: Object.entries(result.engine.gates || {}).filter(([, passed]) => !passed).map(([gate]) => gate),
    },
    semantic: {
      ok: result.semantic.ok,
      averageScore: result.semantic.averageScore,
      averageQuestions: result.semantic.averageQuestions,
      failedGates: Object.entries(result.semantic.gates || {}).filter(([, passed]) => !passed).map(([gate]) => gate),
      stableCorePersonas: result.semantic.semanticQuality?.stableCorePersonas,
    },
    engineCoverage: {
      ok: result.engineCoverage.ok,
      usedItemCount: result.engineCoverage.usedItemCount,
      itemUseRate: result.engineCoverage.itemUseRate,
      uniquePathRate: result.engineCoverage.uniquePathRate,
      topItemShare: result.engineCoverage.topItemShare,
      failedGates: Object.entries(result.engineCoverage.gates || {}).filter(([, passed]) => !passed).map(([gate]) => gate),
    },
    semanticCoverage: {
      ok: result.semanticCoverage.ok,
      usedItemCount: result.semanticCoverage.usedItemCount,
      itemUseRate: result.semanticCoverage.itemUseRate,
      uniquePathRate: result.semanticCoverage.uniquePathRate,
      topItemShare: result.semanticCoverage.topItemShare,
      failedGates: Object.entries(result.semanticCoverage.gates || {}).filter(([, passed]) => !passed).map(([gate]) => gate),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseCli(process.argv.slice(2));
  const result = runDynamicCoverage(options);
  console.log(JSON.stringify(options.summaryOnly ? compact(result) : result, null, 2));
  if (options.strict && !(result.engineCoverage.ok && result.semanticCoverage.ok && result.engine.ok && result.semantic.ok)) process.exitCode = 1;
}
