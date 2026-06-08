import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdaptiveAssessment } from "../web/adaptive-engine.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "web/data/game-config.json");
const ROUNDS = 5;

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

const TYPE_WEIGHTS = {
  process: { process_execution: 2.2, condition_clarification: 0.7, mature_judgment: -0.3, intuition_or_countercheck: -0.8 },
  learner: { process_execution: 1.2, condition_clarification: 1.6, mature_judgment: 0.2, intuition_or_countercheck: -0.4 },
  method: { process_execution: 0.8, condition_clarification: 1.5, mature_judgment: 1.1, intuition_or_countercheck: 0.1 },
  mature: { process_execution: -0.2, condition_clarification: 1.0, mature_judgment: 1.8, intuition_or_countercheck: 0.8 },
  intuitive: { process_execution: -0.4, condition_clarification: 0.7, mature_judgment: 1.0, intuition_or_countercheck: 2.0 },
  performer: { process_execution: -0.6, condition_clarification: 0.4, mature_judgment: 2.7, intuition_or_countercheck: 1.6 },
  noise: { process_execution: -0.5, condition_clarification: -0.2, mature_judgment: 0.4, intuition_or_countercheck: 2.4 },
};

const profiles = [
  ["U01", "流程型 SOP 执行者", "流程/执行", "好复制型", "process", { SKL: 1.3, EXP: 0.5 }, ["process_execution", "standardizable_work"]],
  ["U02", "行政协同执行者", "流程/执行", "流程友好型", "process", { SKL: 1.2, EXP: 0.7, CXT: 0.2 }, ["process_execution", "clarity_check"]],
  ["U03", "数据理性流程派", "流程/执行", "方法型", "method", { SKL: 1.1, EXP: 0.9, BND: 0.4 }, ["process_execution", "data_validated"]],
  ["U04", "初级学习型执行者", "流程/执行", "待开机型", "learner", { SKL: 0.8, EXP: 0.8, CXT: 0.25 }, ["condition_clarification", "try_then_adjust"]],
  ["U05", "空心专业执行者", "流程/执行", "好复制型", "performer", { SKL: 0.9, EXP: 0.5, NOI: 0.7 }, ["professional_polish", "smooth_without_source_or_tradeoff"]],
  ["U06", "稳定客服运营者", "流程/执行", "协作易蒸型", "method", { CXT: 0.8, EXP: 1.0, STN: 0.3 }, ["context_signal", "expression_signal"]],
  ["U07", "规则合规执行者", "流程/执行", "流程友好型", "process", { STN: 0.7, BND: 0.4, SKL: 1.0 }, ["compliance_first", "condition_check"]],
  ["U08", "成熟协作型方法沉淀者", "主流中段", "可教不好替", "method", { EXP: 1.2, BND: 0.8, SKL: 0.8, GRD: 0.5 }, ["reusable_method", "condition_clarification"]],
  ["U09", "项目推进协调者", "主流中段", "稳场型", "method", { CXT: 1.0, EXP: 1.1, STN: 0.7 }, ["context_signal", "expression_signal", "pause_to_identify_reason"]],
  ["U10", "关系维护协调者", "主流中段", "稳场型", "mature", { CXT: 1.2, EXP: 0.9, STN: 0.6, GEN: -0.2 }, ["context_signal", "value_signal"]],
  ["U11", "会看场的中层执行者", "主流中段", "稳场型", "mature", { CXT: 1.2, BND: 0.6, EXP: 0.7 }, ["context_signal", "pause_to_identify_reason"]],
  ["U12", "业务分析执行者", "主流中段", "可教不好替", "method", { EXP: 1.0, BND: 0.8, CXT: 0.7 }, ["data_validated", "condition_clarification"]],
  ["U13", "专业工种经验者", "主流中段", "经验型", "intuitive", { GRD: 1.3, EXP: 0.5, CXT: 0.4 }, ["specific_experience", "case_validated"]],
  ["U14", "低表达专业骨干", "主流中段", "慢表达品味型", "intuitive", { GRD: 1.0, TST: 0.9, EXP: -0.5 }, ["expression_lag", "specific_experience"]],
  ["U15", "普通管理协作者", "主流中段", "可教不好替", "method", { EXP: 1.0, BND: 0.8, STN: 0.6, CXT: 0.6 }, ["condition_clarification", "value_signal"]],
  ["U16", "标准答案型体面用户", "主流中段", "标准答案风险", "performer", { BND: 0.8, CXT: 0.8, TST: 0.6 }, ["mature_judgment", "professional_polish", "polished_answer"]],
  ["U17", "复杂判断型策略人", "经验/边界", "边界感", "mature", { BND: 1.5, CXT: 1.1, STN: 0.9, GRD: 0.5 }, ["boundary_signal", "risk_with_alternative"]],
  ["U18", "组织雷达型读空气者", "经验/边界", "边界感/稳场型", "mature", { CXT: 1.5, BND: 1.0, EXP: 0.7, STN: 0.6 }, ["context_signal", "pause_to_identify_reason"]],
  ["U19", "现场经验型救火专家", "经验/边界", "老练直觉/经验型", "intuitive", { GRD: 1.5, BND: 0.8, CXT: 0.7 }, ["specific_experience", "failure_boundary", "case_validated"]],
  ["U20", "经验固化老手", "经验/边界", "经验固化型", "intuitive", { GRD: 1.2, NOI: 0.6, EXP: -0.5, BND: -0.2 }, ["old_method_continues", "rarely_update_experience"]],
  ["U21", "高价值低生成守门人", "经验/边界", "有底线型", "mature", { STN: 1.4, BND: 0.9, GEN: -0.4 }, ["value_signal", "risk_with_alternative"]],
  ["U22", "均衡专业 AI 放大型", "AI 工具", "AI 放大型", "method", { TLB: 1.7, SKL: 1.0, BND: 0.8, EXP: 0.7, NOI: -0.5 }, ["ai_amplifier", "tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides"]],
  ["U23", "AI 浅层提效用户", "AI 工具", "协作易蒸型", "process", { TLB: 0.6, SKL: 1.2, EXP: 0.7, BND: -0.2 }, ["ai_as_option_expander", "process_execution"]],
  ["U24", "AI 焦虑规避者", "AI 工具", "伪抗蒸风险", "noise", { NOI: 1.0, BND: 0.6, TLB: -0.4 }, ["ai_vibe_discomfort", "old_experience_rejected_broadly"]],
  ["U25", "审美生成型创意导演", "生成/审美", "改题型", "mature", { GEN: 1.6, TST: 1.3, BND: 0.5, EXP: 0.5 }, ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"]],
  ["U26", "点子型生成者", "生成/审美", "改题待校准", "intuitive", { GEN: 1.4, TST: 0.7, BND: -0.3, NOI: 0.4 }, ["surface_overdecorated", "audience_overload"]],
  ["U27", "空话免疫批评者", "生成/审美", "空话免疫", "mature", { TST: 1.7, BND: 0.7, STN: 0.6, EXP: 0.2 }, ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected", "correct_but_empty_words"]],
  ["U28", "伪抗蒸犬儒型", "噪声/风险", "伪抗蒸型", "noise", { NOI: 1.8, EXP: -0.7, BND: 0.4 }, ["posture_hiding_low_judgment", "ai_vibe_discomfort"]],
  ["U29", "情绪拒绝型价值噪声", "噪声/风险", "伪抗蒸型", "noise", { NOI: 1.7, STN: 0.4, EXP: -0.8 }, ["ai_vibe_discomfort", "old_experience_rejected_broadly"]],
  ["U30", "表演型成熟答题者", "噪声/风险", "标准答案风险", "performer", { CXT: 0.9, BND: 0.9, TST: 0.8, NOI: 0.2 }, ["mature_judgment", "professional_polish", "polished_answer", "smooth_without_source_or_tradeoff"]],
].map(([id, name, layer, expected, typeStyle, metricWeights, evidenceLikes]) => ({
  id,
  name,
  layer,
  expected,
  typeWeights: TYPE_WEIGHTS[typeStyle],
  metricWeights,
  evidenceWeights: Object.fromEntries(evidenceLikes.map((tag) => [tag, 2.4])),
}));

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function optionScore(option, profile, seed) {
  const scores = option.scores || {};
  const evidence = option.evidence || [];
  const typeScore = profile.typeWeights[option.type] || 0;
  const metricScore = Object.entries(profile.metricWeights).reduce((sum, [metric, weight]) => sum + (scores[metric] || 0) * weight, 0);
  const evidenceScore = evidence.reduce((sum, tag) => sum + (profile.evidenceWeights[tag] || 0), 0);
  const labelScore = Object.entries(option.labelDelta || {}).reduce((sum, [label, value]) => {
    const expected = profile.expected;
    const wanted = expected.includes("AI") && label === "ai_amplified_professional"
      || expected.includes("空话") && label === "empty_professional_detector"
      || expected.includes("改题") && label === "generative_reframer"
      || expected.includes("稳场") && label === "relationship_stabilizer"
      || expected.includes("经验固化") && label === "experience_locked"
      || expected.includes("伪抗蒸") && label === "fake_resistance"
      || expected.includes("好复制") && label === "skill_friendly"
      || expected.includes("待开机") && label === "latent_human_variable";
    return sum + (wanted ? value * 0.65 : value * 0.15);
  }, 0);
  const noise = (hash(seed) % 1000) / 1000 * 0.18;
  return typeScore + metricScore + evidenceScore + labelScore + noise;
}

function runOne(profile, round) {
  const assessment = new AdaptiveAssessment(config);
  assessment.seed = `${profile.id}:${round}`;
  assessment.start({ skipped: true });
  let guard = 0;
  while (assessment.currentItem && !assessment.state.stopped && guard < 30) {
    guard += 1;
    const item = assessment.currentItem;
    const options = assessment.orderedOptions(item);
    const ranked = options
      .map((option) => ({ option, score: optionScore(option, profile, `${profile.id}:${round}:${item.id}:${option.key}`) }))
      .sort((left, right) => right.score - left.score);
    assessment.answerCurrent(ranked[0].option.key);
  }
  const result = assessment.result();
  return {
    personaId: profile.id,
    personaName: profile.name,
    layer: profile.layer,
    expected: profile.expected,
    round,
    score: result.score,
    band: result.band.name,
    labelKey: result.labelKey,
    label: result.labelDetails.name,
    candidates: result.labelCandidates || [],
    risks: result.openRisks || [],
    stability: result.stabilityLevel,
    answered: result.answeredCount,
  };
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) || 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function hasCandidate(row, text) {
  return row.label.includes(text) || row.candidates.some((candidate) => candidate.includes(text));
}

const rows = profiles.flatMap((profile) => Array.from({ length: ROUNDS }, (_, index) => runOne(profile, index + 1)));
const avg = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const labels = countBy(rows, "label");
const bands = countBy(rows, "band");
const maxLabelShare = labels[0][1] / rows.length;
const u22 = rows.filter((row) => row.personaId === "U22");
const u27 = rows.filter((row) => row.personaId === "U27");
const u30 = rows.filter((row) => row.personaId === "U30");
const low = rows.filter((row) => /^U0[1-7]$/.test(row.personaId));
const highValue = rows.filter((row) => /^(U17|U18|U19|U21|U25|U27)$/.test(row.personaId));

const gates = [
  ["avg_questions_between_18_and_22", avg(rows.map((row) => row.answered)) >= 18 && avg(rows.map((row) => row.answered)) <= 22],
  ["no_single_label_over_30_percent", maxLabelShare <= 0.3],
  ["u22_ai_hit_or_candidate_3_of_5", u22.filter((row) => hasCandidate(row, "AI 放大")).length >= 3],
  ["u27_empty_professional_hit_or_candidate_3_of_5", u27.filter((row) => hasCandidate(row, "空话免疫")).length >= 3],
  ["u30_polished_risk_all_rounds", u30.every((row) => row.risks.includes("polished_answer_risk"))],
  ["u30_not_stably_above_62", u30.filter((row) => row.score > 62).length <= 1],
  ["high_value_personas_keep_80_plus_space", Math.max(...highValue.map((row) => row.score)) >= 80],
  ["high_value_personas_average_at_least_55", avg(highValue.map((row) => row.score)) >= 55],
  ["low_band_not_all_same_label", new Set(low.map((row) => row.label)).size >= 2],
  ["label_copy_covers_all_labels", Object.keys(config.labels || {}).every((key) => config.labelDetails?.[key]?.plainMeaning)],
  ["all_options_scores_and_evidence", config.items.every((item) => item.options.every((option) => option.scores && option.evidence?.length))],
];

const summary = {
  configVersion: config.version,
  totalRuns: rows.length,
  averageScore: Number(avg(rows.map((row) => row.score)).toFixed(1)),
  averageQuestions: Number(avg(rows.map((row) => row.answered)).toFixed(2)),
  questionRange: [Math.min(...rows.map((row) => row.answered)), Math.max(...rows.map((row) => row.answered))],
  scoreRange: [Math.min(...rows.map((row) => row.score)), Math.max(...rows.map((row) => row.score))],
  topLabels: labels.slice(0, 10),
  bands,
  gates: Object.fromEntries(gates),
  highValueTop: highValue
    .map(({ personaId, personaName, score, band, label, candidates, risks }) => ({ personaId, personaName, score, band, label, candidates, risks }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 12),
  targetPersonas: {
    U22: u22.map(({ score, band, label, candidates, risks }) => ({ score, band, label, candidates, risks })),
    U27: u27.map(({ score, band, label, candidates, risks }) => ({ score, band, label, candidates, risks })),
    U30: u30.map(({ score, band, label, candidates, risks }) => ({ score, band, label, candidates, risks })),
  },
};

console.log(JSON.stringify(summary, null, 2));

if (process.argv.includes("--strict") && gates.some(([, passed]) => !passed)) {
  process.exitCode = 1;
}
