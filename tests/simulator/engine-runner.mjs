import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdaptiveAssessment } from "../../src/engine/adaptive-engine.js";
import { expandLabelTerms } from "./label-aliases.mjs";
import { loadPersonaRegistry, selectPersonas } from "./persona-schema.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORE_LABEL_MAP = {
  "好复制型": { SKL: 1.5, EXP: 0.5 },
  "流程友好型": { SKL: 1.2, EXP: 0.7, CXT: 0.2 },
  "方法型": { SKL: 1.1, EXP: 1.0, BND: 0.5 },
  "待开机型": { SKL: 0.7, EXP: 0.7, CXT: 0.2 },
  "可教不好替": { EXP: 1.2, BND: 0.8, SKL: 0.8, GRD: 0.4 },
  "稳场型": { CXT: 1.2, EXP: 1.0, STN: 0.6 },
  "会看场型": { CXT: 1.5, BND: 0.8, EXP: 0.7 },
  "会翻译型": { EXP: 1.5, CXT: 0.7, SKL: 0.4 },
  "边界感": { BND: 1.6, CXT: 1.0, STN: 0.8, NOI: -0.5 },
  "有底线型": { STN: 1.5, BND: 1.0, GEN: -0.2, NOI: -0.4 },
  "改题型": { GEN: 1.7, TST: 1.1, CXT: 0.7, BND: 0.5 },
  "空话免疫": { TST: 1.7, BND: 0.7, NOI: -0.2 },
  "AI 放大型": { TLB: 1.7, SKL: 0.9, BND: 0.8, EXP: 0.6, NOI: -0.5 },
  "老练直觉": { GRD: 1.5, BND: 0.7, CXT: 0.7 },
  "经验型": { GRD: 1.7, EXP: 0.5, CXT: 0.5 },
  "经验固化型": { GRD: 1.1, NOI: 0.8, EXP: -0.4 },
  "慢表达品味型": { TST: 1.1, GRD: 0.9, EXP: -0.4 },
  "伪抗蒸型": { NOI: 1.8, EXP: -0.7, BND: 0.3 },
  "真人核心型": { CXT: 1.5, BND: 1.5, GEN: 1.3, TST: 1.2, STN: 1.5, GRD: 1.5, NOI: -1 },
};

const EVIDENCE_LIKES = {
  "边界感": ["boundary_signal", "risk_with_alternative", "condition_check", "failure_boundary"],
  "有底线型": ["value_signal", "risk_with_alternative", "compliance_first", "judgment_and_consequence"],
  "改题型": ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"],
  "空话免疫": ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected", "correct_but_empty_words"],
  "AI 放大型": ["ai_amplifier", "tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides"],
  "老练直觉": ["specific_experience", "case_validated", "failure_boundary"],
  "经验型": ["specific_experience", "case_validated", "failure_refined_judgment"],
  "伪抗蒸型": ["professional_polish", "polished_answer", "smooth_without_source_or_tradeoff", "posture_hiding_low_judgment"],
};

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) || 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function scoreRange(rows) {
  return rows.length ? [Math.min(...rows.map((row) => row.score)), Math.max(...rows.map((row) => row.score))] : [0, 0];
}

function labelTerms(persona) {
  return [...(persona.acceptanceGate?.labels || []), ...(persona.expectedOutcome?.labels || [])];
}

function expectedMetricWeights(persona) {
  const weights = {};
  for (const label of labelTerms(persona)) {
    const labelWeights = CORE_LABEL_MAP[label] || {};
    for (const [metric, value] of Object.entries(labelWeights)) {
      weights[metric] = (weights[metric] || 0) + value;
    }
  }
  return weights;
}

function expectedEvidenceWeights(persona) {
  const weights = {};
  for (const label of labelTerms(persona)) {
    for (const evidence of EVIDENCE_LIKES[label] || []) {
      weights[evidence] = Math.max(weights[evidence] || 0, persona.id === "X99" ? 5 : 2.5);
    }
  }
  return weights;
}

function typePreference(persona, optionType) {
  const style = `${persona.behaviorModel?.decisionStyle || ""} ${persona.behaviorModel?.expressionStyle || ""}`;
  if (/procedure|rule|process|efficiency/.test(style)) return { process_execution: 2, condition_clarification: 1, mature_judgment: -0.2, intuition_or_countercheck: -0.5 }[optionType] || 0;
  if (/polished|performative|professional/.test(style)) return { process_execution: -0.4, condition_clarification: 0.5, mature_judgment: 2.4, intuition_or_countercheck: 1.2 }[optionType] || 0;
  if (/field|tacit|experience|craft/.test(style)) return { process_execution: -0.2, condition_clarification: 0.8, mature_judgment: 1, intuition_or_countercheck: 2 }[optionType] || 0;
  return { process_execution: 0.3, condition_clarification: 1, mature_judgment: 1.4, intuition_or_countercheck: 1 }[optionType] || 0;
}

function optionScore(option, persona, seed) {
  const metricWeights = expectedMetricWeights(persona);
  const evidenceWeights = expectedEvidenceWeights(persona);
  const metricScore = Object.entries(option.scores || {}).reduce((sum, [metric, value]) => sum + value * (metricWeights[metric] || 0), 0);
  const evidenceScore = (option.evidence || []).reduce((sum, evidence) => sum + (evidenceWeights[evidence] || 0), 0);
  const labelScore = Object.entries(option.labelDelta || {}).reduce((sum, [labelKey, value]) => {
    const labelText = labelKey.toLowerCase();
    const wanted = labelTerms(persona).some((term) =>
      (term.includes("改题") && labelText.includes("generative")) ||
      (term.includes("边界") && labelText.includes("boundary")) ||
      (term.includes("底线") && labelText.includes("value")) ||
      (term.includes("AI") && labelText.includes("ai")) ||
      (term.includes("空话") && labelText.includes("empty")) ||
      (term.includes("伪抗蒸") && labelText.includes("fake")) ||
      (term.includes("经验") && (labelText.includes("experience") || labelText.includes("intuition")))
    );
    return sum + value * (wanted ? 1.2 : 0.08);
  }, 0);
  const noise = ((hash(`${seed}:${option.key}`) % 1000) / 1000) * 0.16;
  return typePreference(persona, option.type) + metricScore * 0.32 + evidenceScore * 0.45 + labelScore + noise;
}

function runOne(config, persona, round) {
  const assessment = new AdaptiveAssessment(config);
  assessment.seed = `${persona.id}:engine:${round}`;
  assessment.start({ skipped: true });
  const pathRows = [];
  let guard = 0;
  while (assessment.currentItem && !assessment.state.stopped && guard < 32) {
    guard += 1;
    const item = assessment.currentItem;
    const chosen = assessment.orderedOptions(item)
      .map((option) => ({ option, score: optionScore(option, persona, `${persona.id}:${round}:${item.id}`) }))
      .sort((left, right) => right.score - left.score)[0];
    const decision = assessment.state.selectionDecisions.at(-1);
    pathRows.push({
      order: guard,
      itemId: item.id,
      stage: item.stage || "",
      role: item.role || "",
      primaryMetric: item.primaryMetric || "",
      secondaryMetrics: item.secondaryMetrics || [],
      topicTags: item.topicTags || [],
      question: item.question || "",
      chosenKey: chosen.option.key,
      chosenText: chosen.option.text,
      engineChoiceScore: Number(chosen.score.toFixed(3)),
      selectionDecision: decision && decision.itemId === item.id ? decision : null,
    });
    assessment.answerCurrent(chosen.option.key);
  }
  const result = assessment.result();
  return {
    personaId: persona.id,
    personaName: persona.name,
    group: persona.group,
    round,
    score: result.score,
    band: result.band.name,
    labelKey: result.labelKey,
    label: result.labelDetails.name,
    candidates: result.labelCandidates || [],
    risks: result.openRisks || [],
    stability: result.stabilityLevel,
    structure: result.structureTendency || null,
    answered: result.answeredCount,
    normalized: Object.fromEntries(Object.entries(result.normalized || {}).map(([key, value]) => [key, Number(value.toFixed(1))])),
    path: pathRows,
  };
}

function matchesAny(row, labels = []) {
  return expandLabelTerms(labels).some((label) => row.band.includes(label) || row.label.includes(label) || row.candidates.some((candidate) => candidate.includes(label)));
}

function qualityHit(row, persona) {
  const gate = persona.acceptanceGate || persona.expectedOutcome || {};
  const range = gate.scoreRange || [20, 100];
  const labels = gate.labels || persona.expectedOutcome?.labels || [];
  const risksAny = gate.risksAny || persona.expectedOutcome?.risksAny || [];
  const scoreOk = row.score >= range[0] && row.score <= range[1];
  const labelOk = labels.length ? matchesAny(row, labels) : true;
  const riskOk = risksAny.length ? risksAny.some((risk) => row.risks.includes(risk)) : true;
  return scoreOk && labelOk && riskOk;
}

function personaSummary(persona, rows) {
  const hits = rows.filter((row) => qualityHit(row, persona)).length;
  const range = scoreRange(rows);
  return {
    personaId: persona.id,
    personaName: persona.name,
    group: persona.group,
    averageScore: Number(average(rows.map((row) => row.score)).toFixed(1)),
    scoreRange: range,
    scoreSpread: range[1] - range[0],
    dominantBand: countBy(rows, "band")[0],
    dominantLabel: countBy(rows, "label")[0],
    qualityHits: hits,
    stable: hits >= (persona.acceptanceGate?.minHitRounds || 4) && range[1] - range[0] <= (persona.acceptanceGate?.scoreSpreadLimit || 56),
    rounds: rows,
  };
}

export function runEngineRegression(options = {}) {
  const configPath = path.resolve(ROOT, options.configPath || "config/game-config-v11.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const registry = loadPersonaRegistry({ registryPath: options.personaPath });
  const ids = options.personaIds || [];
  const personas = selectPersonas(registry, {
    ids,
    includeX99: options.includeX99,
    includeStress: options.includeStress,
    includeCalibration: options.includeCalibration,
  }).filter((persona) => !options.socialOnly || persona.group === "core");
  const rounds = options.rounds || 5;
  const rows = personas.flatMap((persona) => Array.from({ length: rounds }, (_, index) => runOne(config, persona, index + 1)));
  const summaries = personas.map((persona) => personaSummary(persona, rows.filter((row) => row.personaId === persona.id)));
  const coreSummaries = summaries.filter((summary) => summary.group === "core");
  const accurateRuns = rows.filter((row) => {
    const persona = personas.find((candidate) => candidate.id === row.personaId);
    return persona ? qualityHit(row, persona) : true;
  }).length;
  const labelCounts = countBy(rows, "label");
  const bands = countBy(rows, "band");
  const allBands = new Set((config.resultBands || []).map((band) => band.name));
  const reachedBands = new Set(bands.map(([band]) => band));
  const topLabelShare = labelCounts[0] ? labelCounts[0][1] / rows.length : 0;
  const stableCore = coreSummaries.filter((summary) => summary.stable).length;
  const byId = Object.fromEntries(summaries.map((summary) => [summary.personaId, summary]));
  const gates = {
    avg_questions_between_18_and_22: average(rows.map((row) => row.answered)) >= 18 && average(rows.map((row) => row.answered)) <= 22,
    all_result_bands_reachable: [...allBands].every((band) => reachedBands.has(band)),
    no_single_label_over_45_percent: topLabelShare <= 0.45,
    quality_accuracy_90_percent: accurateRuns / Math.max(rows.length, 1) >= 0.9,
    quality_stability_90_percent: stableCore / Math.max(coreSummaries.length, 1) >= 0.9,
    u16_80_plus_zero_of_5: !byId.U16 || byId.U16.rounds.filter((row) => row.score >= 80).length === 0,
    u30_average_not_above_62: !byId.U30 || byId.U30.averageScore <= 62,
    u30_80_plus_zero_of_5: !byId.U30 || byId.U30.rounds.filter((row) => row.score >= 80).length === 0,
    x99_not_systematically_underestimated: !byId.X99 || byId.X99.averageScore >= 85,
  };
  return {
    mode: "engine_metadata_assisted_selection",
    ok: Object.values(gates).every(Boolean),
    configVersion: config.version,
    personaVersion: registry.personaVersion,
    personaCount: personas.length,
    roundsPerPersona: rounds,
    totalRuns: rows.length,
    averageScore: Number(average(rows.map((row) => row.score)).toFixed(1)),
    averageQuestions: Number(average(rows.map((row) => row.answered)).toFixed(2)),
    scoreRange: scoreRange(rows),
    bands,
    labels: labelCounts,
    gates,
    quality: {
      accuracyRate: Number(((accurateRuns / Math.max(rows.length, 1)) * 100).toFixed(1)),
      accurateRuns,
      totalRuns: rows.length,
      stabilityRate: Number(((stableCore / Math.max(coreSummaries.length, 1)) * 100).toFixed(1)),
      stablePersonas: stableCore,
      totalPersonas: coreSummaries.length,
      failures: summaries.filter((summary) => !summary.stable).map(({ rounds: _rounds, ...summary }) => summary),
    },
    perPersona: options.summaryOnly ? summaries.map(({ rounds: _rounds, ...summary }) => summary) : summaries,
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
    rounds: Number.parseInt(value("--rounds", "5"), 10),
    personaIds: value("--personas", "").split(",").map((id) => id.trim()).filter(Boolean),
    socialOnly: argv.includes("--social-only"),
    includeX99: argv.includes("--include-x99"),
    includeStress: argv.includes("--include-stress"),
    includeCalibration: argv.includes("--include-calibration"),
    summaryOnly: argv.includes("--summary-only"),
    strict: argv.includes("--strict"),
  };
}

export function compactEngineResult(result) {
  const failedGates = Object.entries(result.gates || {}).filter(([, passed]) => !passed).map(([gate]) => gate);
  return {
    mode: result.mode,
    ok: result.ok,
    configVersion: result.configVersion,
    personaVersion: result.personaVersion,
    personaCount: result.personaCount,
    roundsPerPersona: result.roundsPerPersona,
    totalRuns: result.totalRuns,
    averageScore: result.averageScore,
    averageQuestions: result.averageQuestions,
    scoreRange: result.scoreRange,
    bands: result.bands,
    labels: result.labels,
    failedGates,
    quality: {
      accuracyRate: result.quality?.accuracyRate,
      stabilityRate: result.quality?.stabilityRate,
      failedPersonas: (result.quality?.failures || []).map((failure) => failure.personaId),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseCli(process.argv.slice(2));
  const result = runEngineRegression(options);
  console.log(JSON.stringify(options.summaryOnly ? compactEngineResult(result) : result, null, 2));
  if (options.strict && !result.ok) process.exitCode = 1;
}
