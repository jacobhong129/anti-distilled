import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdaptiveAssessment } from "../../src/engine/adaptive-engine.js";
import { expandLabelTerms } from "./label-aliases.mjs";
import { loadPersonaRegistry, selectPersonas } from "./persona-schema.mjs";
import { chooseSemanticOption, rankOptionsSemantically } from "./semantic-model.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

function matchesAny(row, terms = []) {
  return expandLabelTerms(terms).some((term) => row.band.includes(term) || row.label.includes(term) || row.candidates.some((candidate) => candidate.includes(term)));
}

function semanticHit(row, persona) {
  const gate = persona.acceptanceGate || persona.expectedOutcome || {};
  const range = gate.scoreRange || [20, 100];
  const labels = gate.labels || persona.expectedOutcome?.labels || [];
  const risksAny = gate.risksAny || persona.expectedOutcome?.risksAny || [];
  const forbiddenBands = gate.forbiddenBands || [];
  if (row.score < range[0] || row.score > range[1]) return false;
  if (labels.length && !matchesAny(row, labels)) return false;
  if (risksAny.length && !risksAny.some((risk) => row.risks.includes(risk))) return false;
  if (forbiddenBands.some((band) => row.band.includes(band))) return false;
  return true;
}

function runOne(config, persona, round) {
  const assessment = new AdaptiveAssessment(config);
  assessment.seed = `${persona.id}:semantic:${round}`;
  assessment.start({ skipped: true });
  const pathRows = [];
  let guard = 0;

  while (assessment.currentItem && !assessment.state.stopped && guard < 32) {
    guard += 1;
    const item = assessment.currentItem;
    const options = assessment.orderedOptions(item);
    const ranked = rankOptionsSemantically(item, options, persona, { seed: `${persona.id}:${round}:${item.id}` });
    const chosen = ranked[0] || chooseSemanticOption(item, options, persona);
    pathRows.push({
      order: guard,
      itemId: item.id,
      dimension: item.dimensionText || "",
      question: item.question || "",
      chosenKey: chosen.option.key,
      chosenText: chosen.option.text,
      semanticScore: chosen.semanticScore,
      reasons: chosen.reasons,
      optionRanking: ranked.map((row) => ({
        key: row.option.key,
        text: row.option.text,
        semanticScore: row.semanticScore,
        reasons: row.reasons,
      })),
      postHocMetadata: {
        optionType: chosen.option.type,
        scores: chosen.option.scores || {},
        evidence: chosen.option.evidence || [],
        labelDelta: chosen.option.labelDelta || {},
      },
    });
    assessment.answerCurrent(chosen.option.key);
  }

  const result = assessment.result();
  return {
    personaId: persona.id,
    personaName: persona.name,
    group: persona.group,
    socialLayer: persona.socialLayer,
    round,
    score: result.score,
    band: result.band.name,
    labelKey: result.labelKey,
    label: result.labelDetails.name,
    candidates: result.labelCandidates || [],
    risks: result.openRisks || [],
    stability: result.stabilityLevel,
    answered: result.answeredCount,
    normalized: Object.fromEntries(Object.entries(result.normalized || {}).map(([key, value]) => [key, Number(value.toFixed(1))])),
    path: pathRows,
  };
}

function personaSummary(persona, rows, summaryOnly) {
  const hits = rows.filter((row) => semanticHit(row, persona)).length;
  const range = scoreRange(rows);
  const highRuns = rows.filter((row) => row.score >= 90).length;
  const gate = persona.acceptanceGate || {};
  const averageScore = Number(average(rows.map((row) => row.score)).toFixed(1));
  const stable = hits >= (gate.minHitRounds || 4)
    && range[1] - range[0] <= (gate.scoreSpreadLimit || 56)
    && (!Number.isFinite(gate.averageScoreAtLeast) || averageScore >= gate.averageScoreAtLeast)
    && (!Number.isFinite(gate.minHighRuns) || highRuns >= gate.minHighRuns);
  return {
    personaId: persona.id,
    personaName: persona.name,
    group: persona.group,
    socialLayer: persona.socialLayer,
    coreProfile: persona.coreProfile,
    expectedOutcome: persona.expectedOutcome,
    averageScore,
    scoreRange: range,
    scoreSpread: range[1] - range[0],
    dominantBand: countBy(rows, "band")[0],
    dominantLabel: countBy(rows, "label")[0],
    semanticHits: hits,
    semanticStable: stable,
    rounds: rows.map(({ path, ...row }) => summaryOnly ? row : { ...row, path }),
  };
}

function countScoreAtLeast(summary, min) {
  return summary ? summary.rounds.filter((row) => row.score >= min).length : 0;
}

function countTerm(summary, term) {
  return summary ? summary.rounds.filter((row) => matchesAny(row, [term])).length : 0;
}

export function runSemanticRegression(options = {}) {
  const configPath = path.resolve(ROOT, options.configPath || "config/game-config-v11.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const registry = loadPersonaRegistry({ registryPath: options.personaPath });
  const personas = selectPersonas(registry, {
    ids: options.personaIds || [],
    includeX99: options.includeX99,
    includeStress: options.includeStress,
    includeCalibration: options.includeCalibration,
  });
  const rounds = options.rounds || 5;
  const rows = personas.flatMap((persona) => Array.from({ length: rounds }, (_, index) => runOne(config, persona, index + 1)));
  const perPersona = personas.map((persona) => personaSummary(persona, rows.filter((row) => row.personaId === persona.id), options.summaryOnly));
  const coreSummaries = perPersona.filter((persona) => persona.group === "core");
  const byId = Object.fromEntries(perPersona.map((persona) => [persona.personaId, persona]));
  const bands = countBy(rows, "band");
  const labels = countBy(rows, "label");
  const allBands = new Set((config.resultBands || []).map((band) => band.name));
  const reachedBands = new Set(bands.map(([band]) => band));
  const topLabelShare = labels[0] ? labels[0][1] / rows.length : 0;
  const stableCore = coreSummaries.filter((persona) => persona.semanticStable).length;
  const coreGate = coreSummaries.length >= 30 ? stableCore >= 24 : stableCore === coreSummaries.length;
  const gates = {
    all_result_bands_reachable: [...allBands].every((band) => reachedBands.has(band)),
    core_personas_semantic_stable_at_least_24: coreGate,
    no_single_label_over_45_percent: topLabelShare <= 0.45,
    u16_80_plus_zero_of_5: !byId.U16 || countScoreAtLeast(byId.U16, 80) === 0,
    u30_80_plus_zero_of_5: !byId.U30 || countScoreAtLeast(byId.U30, 80) === 0,
    u21_average_score_at_least_55: !byId.U21 || byId.U21.averageScore >= 55,
    u25_reframer_hit_or_candidate_at_least_4_of_5: !byId.U25 || countTerm(byId.U25, "改题型") >= 4,
    x99_average_score_at_least_85: !byId.X99 || byId.X99.averageScore >= 85,
    x99_90_plus_at_least_3_of_5: !byId.X99 || countScoreAtLeast(byId.X99, 90) >= 3,
  };

  return {
    mode: "semantic_text_only_selection_v2",
    ok: Object.values(gates).every(Boolean),
    configVersion: config.version,
    personaVersion: registry.personaVersion,
    personaCount: personas.length,
    roundsPerPersona: rounds,
    totalRuns: rows.length,
    averageScore: Number(average(rows.map((row) => row.score)).toFixed(1)),
    averageQuestions: Number(average(rows.map((row) => row.answered)).toFixed(2)),
    questionRange: scoreRange(rows.map((row) => ({ score: row.answered }))),
    scoreRange: scoreRange(rows),
    bands,
    labels,
    gates,
    semanticQuality: {
      stableCorePersonas: stableCore,
      corePersonaCount: coreSummaries.length,
      stableAllPersonas: perPersona.filter((persona) => persona.semanticStable).length,
      allPersonaCount: perPersona.length,
      failures: perPersona.filter((persona) => !persona.semanticStable).map(({ rounds: _rounds, ...summary }) => summary),
    },
    perPersona: options.summaryOnly ? perPersona.map(({ rounds: _rounds, ...summary }) => summary) : perPersona,
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
    includeX99: argv.includes("--include-x99"),
    includeStress: argv.includes("--include-stress"),
    includeCalibration: argv.includes("--include-calibration"),
    summaryOnly: argv.includes("--summary-only"),
    strict: argv.includes("--strict"),
  };
}

export function compactSemanticResult(result) {
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
    questionRange: result.questionRange,
    scoreRange: result.scoreRange,
    bands: result.bands,
    labels: result.labels,
    failedGates,
    semanticQuality: {
      stableCorePersonas: result.semanticQuality?.stableCorePersonas,
      corePersonaCount: result.semanticQuality?.corePersonaCount,
      stableAllPersonas: result.semanticQuality?.stableAllPersonas,
      allPersonaCount: result.semanticQuality?.allPersonaCount,
      failedPersonas: (result.semanticQuality?.failures || []).map((failure) => failure.personaId),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseCli(process.argv.slice(2));
  const result = runSemanticRegression(options);
  console.log(JSON.stringify(options.summaryOnly ? compactSemanticResult(result) : result, null, 2));
  if (options.strict && !result.ok) process.exitCode = 1;
}
