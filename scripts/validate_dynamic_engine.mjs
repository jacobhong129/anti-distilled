import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdaptiveAssessment } from "../src/engine/adaptive-engine.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "config/game-config-v11.json");
const RUN_COUNT = 200;
const CORE_METRICS = ["CXT", "BND", "GEN", "TST", "STN", "GRD"];

const TYPE_WEIGHTS = {
  process_execution: 0.4,
  condition_clarification: 1.0,
  mature_judgment: 1.4,
  intuition_or_countercheck: 1.1,
};

const profiles = [
  {
    id: "boundary_strategy",
    metricWeights: { BND: 1.7, CXT: 1.1, STN: 0.8, GRD: 0.5, NOI: -0.8 },
    evidenceLikes: ["boundary_signal", "risk_with_alternative", "condition_check", "failure_boundary"],
  },
  {
    id: "context_stabilizer",
    metricWeights: { CXT: 1.6, EXP: 1.0, STN: 0.8, BND: 0.6, NOI: -0.7 },
    evidenceLikes: ["context_signal", "pause_to_identify_reason", "audience_need_check", "value_signal"],
  },
  {
    id: "generative_reframer",
    metricWeights: { GEN: 1.7, TST: 0.9, BND: 0.7, CXT: 0.6, NOI: -0.5 },
    evidenceLikes: ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"],
  },
  {
    id: "taste_detector",
    metricWeights: { TST: 1.7, BND: 0.7, STN: 0.5, EXP: 0.3, NOI: -0.4 },
    evidenceLikes: ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected"],
  },
  {
    id: "value_guardrail",
    metricWeights: { STN: 1.7, BND: 1.0, CXT: 0.6, GEN: -0.2, NOI: -0.5 },
    evidenceLikes: ["value_signal", "risk_with_alternative", "compliance_first"],
  },
  {
    id: "grounded_experience",
    metricWeights: { GRD: 1.8, CXT: 0.7, BND: 0.6, EXP: 0.4, NOI: -0.8 },
    evidenceLikes: ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment"],
  },
  {
    id: "ai_amplifier",
    metricWeights: { TLB: 1.7, SKL: 0.9, BND: 0.8, EXP: 0.6, NOI: -0.7 },
    evidenceLikes: ["ai_amplifier", "tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides"],
  },
  {
    id: "polished_noise",
    metricWeights: { NOI: 1.7, TST: 0.8, BND: 0.6, EXP: -0.5, GRD: -0.5 },
    evidenceLikes: ["professional_polish", "polished_answer", "smooth_without_source_or_tradeoff"],
  },
];

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const itemById = new Map(config.items.map((item) => [item.id, item]));

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function deterministicNoise(seed) {
  return (hash(seed) % 1000) / 1000;
}

function optionScore(option, profile, seed) {
  const scores = option.scores || {};
  const evidence = option.evidence || [];
  const typeScore = TYPE_WEIGHTS[option.type] || 0;
  const metricScore = Object.entries(profile.metricWeights).reduce((sum, [metric, weight]) => {
    return sum + (scores[metric] || 0) * weight;
  }, 0);
  const evidenceScore = evidence.reduce((sum, tag) => {
    return sum + (profile.evidenceLikes.includes(tag) ? 1.8 : 0);
  }, 0);
  return typeScore + metricScore * 0.35 + evidenceScore + deterministicNoise(seed) * 0.12;
}

function chooseOption(assessment, item, profile, seed) {
  return assessment
    .orderedOptions(item)
    .map((option) => ({ option, score: optionScore(option, profile, `${seed}:${item.id}:${option.key}`) }))
    .sort((left, right) => right.score - left.score)[0].option.key;
}

function runAssessment(profile, seed) {
  const assessment = new AdaptiveAssessment(config);
  assessment.seed = seed;
  assessment.start({ skipped: true });

  const pathIds = [];
  let guard = 0;
  while (assessment.currentItem && !assessment.state.stopped && guard < 40) {
    guard += 1;
    const item = assessment.currentItem;
    pathIds.push(item.id);
    assessment.answerCurrent(chooseOption(assessment, item, profile, seed));
  }

  return {
    profileId: profile.id,
    seed,
    pathIds,
    result: assessment.result(),
  };
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function followupItems(metric) {
  return config.items.filter((item) => item.stage === "followup" && item.primaryMetric === metric);
}

function validate() {
  const deterministicA = runAssessment(profiles[0], "determinism-check");
  const deterministicB = runAssessment(profiles[0], "determinism-check");
  assert(
    deterministicA.pathIds.join(">") === deterministicB.pathIds.join(">") &&
      deterministicA.result.score === deterministicB.result.score &&
      deterministicA.result.labelKey === deterministicB.result.labelKey,
    "same seed must produce the same path and result",
    { first: deterministicA, second: deterministicB }
  );

  const diversityRuns = Array.from({ length: 24 }, (_, index) => runAssessment(profiles[0], `diversity-${index + 1}`));
  const distinctPaths = new Set(diversityRuns.map((run) => run.pathIds.join(">")));
  assert(distinctPaths.size >= 3, "same persona with different seeds must produce at least 3 paths", {
    distinctPaths: distinctPaths.size,
  });

  const runs = Array.from({ length: RUN_COUNT }, (_, index) => {
    const profile = profiles[index % profiles.length];
    return runAssessment(profile, `${profile.id}-${index + 1}`);
  });

  const duplicateRuns = runs
    .map((run) => ({
      seed: run.seed,
      duplicates: run.pathIds.filter((id, index) => run.pathIds.indexOf(id) !== index),
    }))
    .filter((run) => run.duplicates.length);
  assert(!duplicateRuns.length, "a run must not ask the same item twice", { duplicateRuns });

  const missingStructure = runs.filter((run) => !run.result.structureTendency?.top || !Array.isArray(run.result.structureTendency?.ranked));
  assert(!missingStructure.length, "each result must include an internal structure tendency estimate", {
    missingStructure: missingStructure.map((run) => run.seed),
  });

  const invalidConfidence = runs.filter((run) => typeof run.result.confidence !== "number" || run.result.confidence < 0 || run.result.confidence > 100);
  assert(!invalidConfidence.length, "each result must include a 0-100 assessment confidence", {
    invalidConfidence: invalidConfidence.map((run) => ({ seed: run.seed, confidence: run.result.confidence })),
  });

  const averageQuestions = runs.reduce((sum, run) => sum + run.pathIds.length, 0) / runs.length;
  assert(averageQuestions >= 18 && averageQuestions <= 22, "average question count must stay between 18 and 22", {
    averageQuestions: Number(averageQuestions.toFixed(2)),
  });

  const followupHits = Object.fromEntries(CORE_METRICS.map((metric) => [metric, new Map()]));
  for (const run of runs) {
    for (const id of run.pathIds) {
      const item = itemById.get(id);
      if (item?.stage === "followup" && CORE_METRICS.includes(item.primaryMetric)) {
        const metricHits = followupHits[item.primaryMetric];
        metricHits.set(id, (metricHits.get(id) || 0) + 1);
      }
    }
  }

  for (const metric of CORE_METRICS) {
    const metricItems = followupItems(metric);
    const hits = followupHits[metric];
    const totalHits = [...hits.values()].reduce((sum, count) => sum + count, 0);
    const covered = hits.size;
    const firstThree = new Set(metricItems.slice(0, 3).map((item) => item.id));
    const firstThreeHits = [...hits.entries()]
      .filter(([id]) => firstThree.has(id))
      .reduce((sum, [, count]) => sum + count, 0);
    const firstThreeShare = totalHits ? firstThreeHits / totalHits : 0;

    assert(covered >= 6, `${metric} followup coverage must hit at least 6 of 12 items`, {
      covered,
      totalHits,
      hitItems: [...hits.entries()].sort((left, right) => right[1] - left[1]),
    });
    assert(firstThreeShare <= 0.6, `${metric} first three followups must not dominate more than 60%`, {
      firstThreeShare: Number(firstThreeShare.toFixed(3)),
      firstThreeHits,
      totalHits,
    });
  }

  return {
    configVersion: config.version,
    runs: runs.length,
    averageQuestions: Number(averageQuestions.toFixed(2)),
    diversityPaths: distinctPaths.size,
    structureTendencies: [...runs.reduce((map, run) => {
      const key = run.result.structureTendency.top;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map()).entries()].sort((left, right) => right[1] - left[1]),
    followupCoverage: Object.fromEntries(
      CORE_METRICS.map((metric) => [
        metric,
        {
          covered: followupHits[metric].size,
          topHits: [...followupHits[metric].entries()].sort((left, right) => right[1] - left[1]).slice(0, 5),
        },
      ])
    ),
  };
}

try {
  console.log(JSON.stringify(validate(), null, 2));
} catch (error) {
  console.error(`dynamic engine validation failed: ${error.message}`);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exitCode = 1;
}
