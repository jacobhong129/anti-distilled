const CORE_METRICS = ["CXT", "BND", "GEN", "TST", "STN", "GRD"];
const AUX_METRICS = ["SKL", "EXP", "NOI", "TLB"];
const METRIC_NAMES = {
  CXT: "情境辨识",
  BND: "边界校准",
  GEN: "生成重构",
  TST: "审美判别",
  STN: "价值定向",
  GRD: "经验内化",
  SKL: "可 Skill 化",
  EXP: "表达转译",
  NOI: "伪抗蒸噪声",
  TLB: "工具边界",
};

const DEFAULT_LABEL_KEYS = [
  "teachable_irreplaceable",
  "intuition_grounded",
  "boundary_radar",
  "empty_professional_detector",
  "generative_reframer",
  "ai_amplified_professional",
  "value_low_generation",
  "taste_low_expression",
  "fake_resistance",
  "latent_human_variable",
  "relationship_stabilizer",
  "experience_locked",
  "skill_friendly",
  "method_distilled",
  "high_density_human",
  "grounded_experience",
  "context_reader",
  "expressive_high",
  "expressive_low",
];

const LABEL_DIMENSIONS = {
  teachable_irreplaceable: ["EXP", "BND", "GRD"],
  intuition_grounded: ["GRD", "CXT"],
  boundary_radar: ["BND", "CXT"],
  empty_professional_detector: ["TST", "STN"],
  generative_reframer: ["GEN", "CXT"],
  ai_amplified_professional: ["TLB", "SKL", "BND"],
  value_low_generation: ["STN", "BND"],
  taste_low_expression: ["TST", "EXP"],
  fake_resistance: ["NOI"],
  latent_human_variable: ["CXT", "GEN", "GRD"],
  relationship_stabilizer: ["CXT", "EXP", "STN"],
  experience_locked: ["GRD", "BND", "EXP"],
  skill_friendly: ["SKL", "EXP"],
  method_distilled: ["SKL", "EXP", "BND"],
  high_density_human: ["CXT", "BND", "GEN", "TST", "STN", "GRD"],
  grounded_experience: ["GRD", "EXP"],
  context_reader: ["CXT", "BND"],
  expressive_high: ["EXP", "CXT"],
  expressive_low: ["EXP", "TST"],
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createSeed() {
  const key = new Uint32Array(2);
  crypto.getRandomValues(key);
  return `${key[0].toString(36)}${key[1].toString(36)}`;
}

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededNoise(seed, id) {
  return (hashString(`${seed}:${id}`) % 1000) / 1000;
}

function scoreVector(option) {
  return option?.scores || {};
}

function maxScoresByMetric(item, metrics) {
  const totals = Object.fromEntries(metrics.map((metric) => [metric, 0]));
  for (const metric of metrics) {
    totals[metric] = Math.max(...item.options.map((option) => scoreVector(option)[metric] || 0), 0);
  }
  return totals;
}

function itemMetrics(item) {
  return [item.primaryMetric, ...(item.secondaryMetrics || [])].filter(Boolean);
}

export class AdaptiveAssessment {
  constructor(config) {
    this.config = config;
    this.metrics = config.scoreMetrics || [...CORE_METRICS, ...AUX_METRICS];
    this.labelKeys = Object.keys(config.labelDetails || config.labels || {}).length
      ? Object.keys(config.labelDetails || config.labels)
      : DEFAULT_LABEL_KEYS;
    this.labelPriority = new Map((config.labelPriority || []).map((item) => [item.id, item.priority]));
    this.labelRules = config.labelRules || {};
    this.labelExclusionRules = config.labelExclusionRules || [];
    this.riskRules = config.riskRules || {};
    this.items = config.items || [];
    this.flow = {
      screeningCount: 8,
      minimumQuestions: 14,
      targetAverageQuestions: 18,
      maximumQuestions: 24,
      checkStabilityEvery: 2,
      ...(config.adaptiveFlow || {}),
    };
    this.sectionIntros = config.sectionIntros || {};
    this.seed = createSeed();
    this.reset();
  }

  reset() {
    this.state = {
      roleContext: {},
      answeredItemIds: [],
      answers: [],
      rawScores: Object.fromEntries(this.metrics.map((metric) => [metric, 0])),
      possibleScores: Object.fromEntries(this.metrics.map((metric) => [metric, 0])),
      evidenceCounts: {},
      labelConfidence: Object.fromEntries(this.labelKeys.map((key) => [key, 0])),
      stabilityChecks: [],
      openRisks: [],
      currentStage: "screening",
      stopped: false,
    };
    this.currentItem = this.pickNextItem();
  }

  start(roleContext = {}) {
    this.reset();
    this.state.roleContext = roleContext;
    return this.currentItem;
  }

  get progress() {
    const answered = this.state.answers.length;
    const target = this.flow.targetAverageQuestions || 18;
    return {
      answered,
      percent: clamp((answered / target) * 100, 8, 100),
      stage: this.state.currentStage,
      label: this.stageLabel(),
      intro: this.sectionIntros[this.state.currentStage] || "系统会根据前面的回答继续确认关键判断。",
    };
  }

  answerCurrent(optionKey) {
    if (!this.currentItem || this.state.stopped) return this.result();
    const option = this.currentItem.options.find((candidate) => candidate.key === optionKey);
    if (!option) throw new Error(`Unknown option ${optionKey} for ${this.currentItem.id}`);

    this.state.answeredItemIds.push(this.currentItem.id);
    this.state.answers.push({
      itemId: this.currentItem.id,
      optionKey,
      stage: this.currentItem.stage,
      primaryMetric: this.currentItem.primaryMetric,
      evidence: option.evidence || [],
      type: option.type,
    });

    const possible = maxScoresByMetric(this.currentItem, this.metrics);
    for (const metric of this.metrics) {
      this.state.rawScores[metric] += scoreVector(option)[metric] || 0;
      this.state.possibleScores[metric] += possible[metric] || 0;
    }

    for (const evidence of option.evidence || []) {
      this.state.evidenceCounts[evidence] = (this.state.evidenceCounts[evidence] || 0) + 1;
    }

    this.updateLabelConfidence(option);
    if (this.shouldStop()) {
      this.state.stopped = true;
      return this.result();
    }

    this.currentItem = this.pickNextItem();
    return null;
  }

  getNormalizedScores() {
    const normalized = {};
    for (const metric of this.metrics) {
      const possible = this.state.possibleScores[metric] || 0;
      normalized[metric] = possible > 0 ? clamp((this.state.rawScores[metric] / possible) * 100, 0, 100) : 0;
    }
    return normalized;
  }

  orderedOptions(item) {
    const byKey = Object.fromEntries(item.options.map((option) => [option.key, option]));
    const order = Array.isArray(item.presentationOrder) ? item.presentationOrder : item.options.map((option) => option.key);
    const ordered = order.map((key) => byKey[key]).filter(Boolean);
    const missing = item.options.filter((option) => !ordered.includes(option));
    return [...ordered, ...missing];
  }

  pickNextItem() {
    const answered = this.state.answeredItemIds.length;
    const answeredIds = new Set(this.state.answeredItemIds);
    const pool = this.items.filter((item) => !answeredIds.has(item.id));
    if (!pool.length) return null;

    if (answered < this.flow.screeningCount) {
      this.state.currentStage = "screening";
      return this.pickScreeningItem(pool, answered);
    }

    const ranked = pool
      .map((item) => ({ item, priority: this.itemPriority(item) + seededNoise(this.seed, item.id) * 0.03 }))
      .sort((left, right) => right.priority - left.priority);

    const next = ranked[0].item;
    this.state.currentStage = next.role === "noise_probe" ? "countercheck" : next.stage || "followup";
    return next;
  }

  pickScreeningItem(pool, answered) {
    const coverage = this.flow.screeningCoverage || ["CXT", "BND", "GEN", "TST", "STN", "GRD", "SKL_OR_TLB", "EXP_OR_NOI"];
    const target = coverage[answered] || coverage[coverage.length - 1];
    const wanted = target.split("_OR_");
    const screeningPool = pool.filter((item) => item.stage === "screening");
    const matched = screeningPool.filter((item) => itemMetrics(item).some((metric) => wanted.includes(metric)));
    const candidates = matched.length ? matched : screeningPool.length ? screeningPool : pool;
    return candidates
      .map((item) => ({ item, priority: this.positionFit(item, answered + 1) + seededNoise(this.seed, item.id) * 0.05 }))
      .sort((left, right) => right.priority - left.priority)[0].item;
  }

  positionFit(item, position) {
    const min = item.minPosition || 1;
    const max = item.maxPosition || this.flow.maximumQuestions;
    if (position >= min && position <= max) return 1;
    return 0.25;
  }

  itemPriority(item) {
    const weights = this.flow.selectionPriority || {};
    const normalized = this.getNormalizedScores();
    const metricSet = itemMetrics(item);
    const lowConfidence = metricSet.reduce((sum, metric) => {
      const seen = this.state.possibleScores[metric] || 0;
      const coverageGap = seen < 4 ? 1 : seen < 8 ? 0.55 : 0.15;
      const ambiguity = normalized[metric] > 42 && normalized[metric] < 68 ? 0.35 : 0;
      return sum + coverageGap + ambiguity;
    }, 0) / Math.max(metricSet.length, 1);

    const topLabels = this.sortedLabels().slice(0, 3).map(([key]) => key);
    const labelImpact = topLabels.some((label) => LABEL_DIMENSIONS[label]?.some((metric) => metricSet.includes(metric))) ? 1 : 0.25;

    const openRisks = this.openRisks(normalized, false);
    const riskRoutes = openRisks.flatMap((risk) => this.riskRules[risk]?.routeTo || this.riskRules[risk]?.countercheckFrom || []);
    const contradictionRisk = this.hasMisreadRisk(normalized) || openRisks.length
      ? item.role === "noise_probe" || item.primaryMetric === "NOI" || riskRoutes.some((route) => this.matchesRoute(item, route))
        ? 1
        : 0.3
      : 0.18;
    const underrepresentedKeyLabel = this.keyLabelNeed(item, normalized);
    const topicFreshness = this.topicFreshness(item);
    const stageBoost = item.stage === "split" ? 0.1 : item.stage === "auxiliary" ? 0.06 : 0;

    return (
      lowConfidence * (weights.lowConfidence ?? 0.4) +
      labelImpact * (weights.labelImpact ?? 0.3) +
      contradictionRisk * (weights.contradictionRisk ?? 0.2) +
      topicFreshness * (weights.topicFreshness ?? 0.1) +
      underrepresentedKeyLabel * (weights.underrepresentedKeyLabel ?? 0.04) +
      stageBoost
    );
  }

  matchesRoute(item, route) {
    if (!route) return false;
    return item.id?.startsWith(route) || item.prefix === route || item.primaryMetric === route || item.role === route;
  }

  keyLabelNeed(item, normalized = this.getNormalizedScores()) {
    const topLabels = this.sortedLabels(normalized).slice(0, 2).map(([key]) => key);
    const counterchecks = this.flow.keyLabelCounterchecks || {};
    const direct = topLabels.some((label) => (counterchecks[label] || []).some((route) => this.matchesRoute(item, route)));
    if (direct) return 1;
    if (normalized.TLB >= 45 && ["SCREEN_08", "SCREEN_10", "SKILL_02", "SPLIT_05", "SPLIT_10"].some((route) => this.matchesRoute(item, route))) return 1;
    if (normalized.TST >= 55 && ["SCREEN_13", "TASTE_04", "TASTE_08", "TASTE_11", "TASTE_12", "SPLIT_04"].some((route) => this.matchesRoute(item, route))) return 1;
    return 0;
  }

  topicFreshness(item) {
    const answeredTags = new Set();
    for (const answer of this.state.answers) {
      const answeredItem = this.items.find((candidate) => candidate.id === answer.itemId);
      for (const tag of answeredItem?.topicTags || []) answeredTags.add(tag);
    }
    const tags = item.topicTags || [];
    if (!tags.length) return 0.6;
    const overlap = tags.filter((tag) => answeredTags.has(tag)).length / tags.length;
    return 1 - overlap;
  }

  updateLabelConfidence(option) {
    const deltas = option.labelDelta || option.labelDeltas || {};
    for (const [label, value] of Object.entries(deltas)) {
      if (!(label in this.state.labelConfidence)) this.state.labelConfidence[label] = 0;
      this.state.labelConfidence[label] += value;
    }

    const scores = scoreVector(option);
    const add = (label, value) => {
      if (label in this.state.labelConfidence) this.state.labelConfidence[label] += value;
    };
    add("teachable_irreplaceable", (scores.EXP || 0) * 0.7 + (scores.BND || 0) * 0.45);
    add("intuition_grounded", (scores.GRD || 0) * 0.8 + (scores.CXT || 0) * 0.3);
    add("boundary_radar", (scores.BND || 0) * 0.85 + (scores.CXT || 0) * 0.3);
    add("empty_professional_detector", (scores.TST || 0) * 0.7 + (scores.STN || 0) * 0.35);
    add("generative_reframer", (scores.GEN || 0) * 0.8 + (scores.CXT || 0) * 0.2);
    add("ai_amplified_professional", (scores.TLB || 0) * 0.9 + (scores.SKL || 0) * 0.25);
    add("value_low_generation", (scores.STN || 0) * 0.7 - (scores.GEN || 0) * 0.12);
    add("taste_low_expression", (scores.TST || 0) * 0.45 - (scores.EXP || 0) * 0.16);
    add("fake_resistance", (scores.NOI || 0) * 1.2);
    add("latent_human_variable", 0.12);
    add("relationship_stabilizer", (scores.CXT || 0) * 0.55 + (scores.EXP || 0) * 0.35 + (scores.STN || 0) * 0.22 - (scores.GEN || 0) * 0.08);
    add("experience_locked", (scores.GRD || 0) * 0.5 + (scores.NOI || 0) * 0.35 - (scores.BND || 0) * 0.12 - (scores.EXP || 0) * 0.08);
    add("skill_friendly", (scores.SKL || 0) * 0.7 + (scores.EXP || 0) * 0.15 - (scores.BND || 0) * 0.08);
    add("method_distilled", (scores.SKL || 0) * 0.45 + (scores.EXP || 0) * 0.45 + (scores.BND || 0) * 0.12);
    add("high_density_human", CORE_METRICS.reduce((sum, metric) => sum + (scores[metric] || 0), 0) * 0.16);
    add("grounded_experience", (scores.GRD || 0) * 0.68 + (scores.EXP || 0) * 0.22);
    add("context_reader", (scores.CXT || 0) * 0.7 + (scores.BND || 0) * 0.18);
    add("expressive_high", (scores.EXP || 0) * 0.72 + (scores.CXT || 0) * 0.14);
    add("expressive_low", (scores.TST || 0) * 0.26 - (scores.EXP || 0) * 0.24);
  }

  shouldStop() {
    const answered = this.state.answers.length;
    if (answered >= this.flow.maximumQuestions) return true;
    const result = this.result();
    const requiredMinimum = this.requiredMinimumQuestions(result);
    if (answered < requiredMinimum) return false;
    if (answered % (this.flow.checkStabilityEvery || 2) !== 0) return false;

    const previous = this.state.stabilityChecks.at(-1);
    const labels = this.sortedLabels(result.normalized);
    const top = labels[0]?.[0];
    const second = labels[1]?.[1] || 0;
    const topValue = labels[0]?.[1] || 0;
    const total = labels.reduce((sum, [, value]) => sum + Math.max(value, 0), 0) || 1;
    const lead = (topValue - second) / total;
    const check = {
      band: result.band.name,
      top,
      lead,
      riskCounterchecked: !this.hasMisreadRisk(result.normalized) || this.hasCountercheckEvidence(),
      evidenceCovered: this.minimumEvidenceCoverageMet(top),
    };
    this.state.stabilityChecks.push(check);

    if (!previous) return false;
    if (answered < 20 && this.hasHardStopBlocker(result, previous, check)) return false;

    const met = [
      previous.band === check.band,
      previous.top === check.top,
      check.lead >= 0.18,
      check.riskCounterchecked,
      check.evidenceCovered,
    ].filter(Boolean).length;
    return met >= 3;
  }

  requiredMinimumQuestions(result) {
    const early = this.flow.exceptionalEarlyStop;
    const defaultMinimum = this.flow.defaultMinimumQuestions || this.flow.minimumQuestions || 16;
    if (early?.enabled && this.exceptionalEarlyStopAllowed(result)) return early.minimumQuestions || 14;
    const complex = this.flow.complexPersonaMinimumQuestions;
    if (!complex?.enabled) return defaultMinimum;
    const labels = this.sortedLabels(result.normalized);
    const topLabel = labels[0]?.[0] || "";
    const second = labels[1]?.[1] || 0;
    const topValue = labels[0]?.[1] || 0;
    const total = labels.reduce((sum, [, value]) => sum + Math.max(value, 0), 0) || 1;
    const lead = (topValue - second) / total;
    const topLabelNeedsDepth = /generative_reframer|ai_amplified_professional|teachable_irreplaceable|boundary_radar|relationship_stabilizer|experience_locked/.test(topLabel);
    const highKeyMetric = result.normalized.GEN >= 65 || result.normalized.BND >= 65 || result.normalized.TLB >= 55;
    if ((result.score >= 55 && result.score <= 79) || topLabelNeedsDepth || lead < 0.18 || highKeyMetric) {
      return complex.minimumQuestions || 18;
    }
    return defaultMinimum;
  }

  exceptionalEarlyStopAllowed(result) {
    if (this.state.answers.length < (this.flow.exceptionalEarlyStop?.minimumQuestions || 14)) return false;
    const last = this.state.stabilityChecks.at(-1);
    if (!last) return false;
    const labels = this.sortedLabels(result.normalized);
    const second = labels[1]?.[1] || 0;
    const topValue = labels[0]?.[1] || 0;
    const total = labels.reduce((sum, [, value]) => sum + Math.max(value, 0), 0) || 1;
    return last.band === result.band.name && last.top === labels[0]?.[0] && (topValue - second) / total >= 0.24 && this.minimumEvidenceCoverageMet(labels[0]?.[0]) && !this.openRisks(result.normalized).length;
  }

  hasHardStopBlocker(result, previous, check) {
    const nearBoundary = (this.config.resultBands || []).some((band) => Math.abs(result.score - band.min) <= 2 || Math.abs(result.score - band.max) <= 2);
    const openRisks = this.openRisks(result.normalized);
    const labelChanged = previous.top !== check.top;
    const bandChanged = previous.band !== check.band;
    const splitNeeded = result.score >= 55 && result.score <= 69 && !this.state.answers.some((answer) => answer.stage === "split");
    return nearBoundary || openRisks.length > 0 || labelChanged || bandChanged || splitNeeded;
  }

  hasMisreadRisk(normalized = this.getNormalizedScores()) {
    return this.openRisks(normalized).length > 0 || normalized.NOI >= 45 || (normalized.SKL >= 72 && (normalized.BND + normalized.CXT + normalized.GRD) / 3 < 52);
  }

  hasCountercheckEvidence() {
    return this.state.answers.some((answer) => answer.stage === "auxiliary" || answer.primaryMetric === "NOI");
  }

  minimumEvidenceCoverageMet(topLabel) {
    const evidenceCount = Object.values(this.state.evidenceCounts).reduce((sum, count) => sum + count, 0);
    const topRule = this.labelRules[topLabel];
    const supporting = topRule?.supportingEvidence || [];
    const supportingMet = supporting.length ? supporting.filter((tag) => this.state.evidenceCounts[tag]).length : 1;
    return evidenceCount >= 8 && supportingMet >= Math.min(2, supporting.length || 1);
  }

  signalFlags(normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    return {
      CXT_high: normalized.CXT >= 68,
      BND_high: normalized.BND >= 68,
      GEN_high: normalized.GEN >= 68,
      TST_high: normalized.TST >= 68,
      STN_high: normalized.STN >= 68,
      GRD_high: normalized.GRD >= 68,
      TLB_high: normalized.TLB >= 55,
      empty_professional_detector_high: (this.state.labelConfidence.empty_professional_detector || 0) >= 3,
      stable_execution_evidence: (evidence.process_execution || 0) + (evidence.skl_signal || 0) >= 4,
      fixed_process_and_format: (evidence.process_execution || 0) >= 3,
      efficient_standard_task: normalized.SKL >= 70 && normalized.BND < 55,
      reuse_as_strength: normalized.SKL >= 65 && normalized.NOI < 35,
      TLB_high_and_ai_judgment_reserved: normalized.TLB >= 45 && (evidence.ai_options_human_decision || 0) + (evidence.ai_challenges_but_human_decides || 0) > 0,
      relationship_stabilizer_high: (this.state.labelConfidence.relationship_stabilizer || 0) >= 3,
    };
  }

  openRisks(normalized = this.getNormalizedScores(), updateState = true) {
    const risks = [];
    const evidence = this.state.evidenceCounts;
    const sociallyDesirable = (evidence.mature_judgment || 0) + (evidence.professional_polish || 0) + (evidence.polished_answer || 0);
    const specific = (evidence.specific_experience || 0) + (evidence.case_validated || 0) + (evidence.failure_boundary || 0);
    const tradeoff = (evidence.value_signal || 0) + (evidence.boundary_signal || 0) + (evidence.tool_boundary || 0);
    if (sociallyDesirable >= 5 && specific <= 1 && tradeoff <= 2) risks.push("polished_answer_risk");
    const aiCandidate = this.state.labelConfidence.ai_amplified_professional || 0;
    if (normalized.TLB >= 40 && normalized.SKL >= 50 && aiCandidate < 2.4) risks.push("ai_underrecognized_risk");
    const estimatedScore = this.estimateScore(normalized, false);
    if (estimatedScore >= 35 && estimatedScore <= 44 && normalized.SKL >= 62 && normalized.NOI < 40) risks.push("low_band_flattening_risk");
    if (updateState) this.state.openRisks = risks;
    return risks;
  }

  sortedLabels(normalized = this.getNormalizedScores()) {
    const flags = this.signalFlags(normalized);
    const exclusions = new Map(this.labelExclusionRules.map((rule) => [rule.label, rule.blockedWhenAny || []]));
    return Object.entries(this.state.labelConfidence)
      .map(([label, value]) => {
        const priorityBoost = ((this.labelPriority.get(label) ?? 55) - 55) * 0.035;
        const rule = this.labelRules[label];
        const evidenceBoost = (rule?.supportingEvidence || []).reduce((sum, tag) => sum + Math.min(this.state.evidenceCounts[tag] || 0, 2) * 0.25, 0);
        const blocked = (exclusions.get(label) || []).some((flag) => flags[flag]);
        const exclusionPenalty = blocked ? 4 : 0;
        return [label, value + priorityBoost + evidenceBoost - exclusionPenalty];
      })
      .sort((left, right) => right[1] - left[1]);
  }

  stageLabel() {
    const answered = this.state.answers.length;
    if (answered < this.flow.screeningCount) return `初筛中 ${answered + 1}/${this.flow.screeningCount}`;
    if (this.state.currentStage === "split") return "正在确认关键分叉";
    if (this.state.currentStage === "countercheck") return "正在排除误读";
    if (answered >= this.flow.minimumQuestions) return "接近完成";
    return "正在追问";
  }

  result() {
    const normalized = this.getNormalizedScores();
    const score = Math.round(this.estimateScore(normalized));

    const band = this.findBand(score);
    const labels = this.sortedLabels(normalized);
    const [labelKey] = labels[0] || ["latent_human_variable"];
    const labelDetails = this.config.labelDetails?.[labelKey] || {
      name: this.config.labels?.[labelKey] || "待开机型",
      shortName: "待机型",
      plainMeaning: "你的个人判断还在形成更稳定的结构。",
      shareLine: "我的含活人量还在加载中。",
    };

    return {
      score,
      band,
      labelKey,
      labelDetails,
      normalized,
      dimensions: CORE_METRICS.map((metric) => ({ key: metric, name: METRIC_NAMES[metric], value: Math.round(normalized[metric]) })),
      auxiliary: AUX_METRICS.map((metric) => ({ key: metric, name: METRIC_NAMES[metric], value: Math.round(normalized[metric]) })),
      signals: this.topSignals(),
      openRisks: this.openRisks(normalized),
      labelCandidates: labels.slice(0, 3).map(([key]) => this.config.labelDetails?.[key]?.name || this.config.labels?.[key] || key),
      stabilityLevel: this.stabilityLevel(),
      role: this.roleResult(),
      answeredCount: this.state.answers.length,
    };
  }

  estimateScore(normalized, includeRiskPenalty = true) {
    const formula = this.config.scoringFormula || {};
    const weights = formula.coreWeights || {};
    const coreScore = CORE_METRICS.reduce((sum, metric) => sum + normalized[metric] * (weights[metric] || 0), 0);
    const replacementGap = Math.max(0, normalized.SKL - (normalized.BND + normalized.CXT + normalized.GRD + normalized.EXP) / 4);
    const riskPenalty = includeRiskPenalty && this.openRisks(normalized, false).includes("polished_answer_risk") ? 6 : 0;
    return clamp(
      coreScore +
        normalized.EXP * (formula.translationBonusWeight ?? 0.08) +
        normalized.TLB * (formula.toolBoundaryBonusWeight ?? 0.05) -
        replacementGap * (formula.replacementPenaltyWeight ?? 0.12) -
        normalized.NOI * (formula.noisePenaltyWeight ?? 0.16) -
        riskPenalty,
      formula.minDisplayScore ?? 20,
      formula.maxDisplayScore ?? 98,
    );
  }

  stabilityLevel() {
    if (this.state.answers.length >= this.flow.maximumQuestions && !this.state.stopped) return "forced_at_24";
    const latest = this.state.stabilityChecks.at(-1);
    if (!latest) return "light_swing";
    if (latest.riskCounterchecked && latest.evidenceCovered && latest.lead >= 0.18) return "stable";
    return "light_swing";
  }

  findBand(score) {
    return (
      (this.config.resultBands || []).find((band) => score >= band.min && score <= band.max) || {
        name: "结构生成中",
        line: "系统已经看到一些信号，但还需要更多题目确认。",
      }
    );
  }

  topSignals() {
    const normalized = this.getNormalizedScores();
    const sorted = [...CORE_METRICS, ...AUX_METRICS].sort((left, right) => normalized[right] - normalized[left]);
    return sorted.slice(0, 4).map((metric) => ({
      key: metric,
      name: METRIC_NAMES[metric],
      value: Math.round(normalized[metric]),
    }));
  }

  roleResult() {
    const context = this.state.roleContext || {};
    const values = Object.values(context).filter(Boolean);
    if (!values.length) {
      return "你没有填写工作方式校准，因此这里不做岗位蒸馏度判断。个人分数仍然按答题表现计算。";
    }

    const low = ["direction", "guarded", "taste", "trust"].filter((value) => values.includes(value)).length;
    const high = ["routine", "standard", "efficiency"].filter((value) => values.includes(value)).length;
    if (low >= 2) return "你的岗位里有较多方向、信任、品味或责任负载，岗位蒸馏度偏低；AI 更像放大器，而不是完整替身。";
    if (high >= 2) return "你的岗位表层任务较容易被流程化，岗位蒸馏度偏高；这不代表你本人低分，而是提醒你把例外判断和边界能力显性化。";
    return "你的岗位蒸馏度中等：一部分工作可被工具接走，但关键场景仍需要人来判断能不能用、该不该用。";
  }
}

export { CORE_METRICS, AUX_METRICS, METRIC_NAMES };
