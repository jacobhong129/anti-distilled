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

function evidenceScore(evidence, tags, weight = 1) {
  return tags.reduce((sum, tag) => sum + Math.min(evidence[tag] || 0, 3) * weight, 0);
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
      selectionDecisions: [],
      latestEstimate: null,
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

  getSnapshot() {
    return {
      seed: this.seed,
      state: JSON.parse(JSON.stringify(this.state)),
      currentItemId: this.currentItem?.id || null,
    };
  }

  restoreSnapshot(snapshot) {
    if (!snapshot) return;
    if (snapshot.seed) this.seed = snapshot.seed;
    this.state = JSON.parse(JSON.stringify(snapshot.state));
    this.currentItem = snapshot.currentItemId ? this.items.find((item) => item.id === snapshot.currentItemId) || null : null;
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
    const estimate = this.stateEstimate();

    if (answered < this.flow.screeningCount) {
      this.state.currentStage = "screening";
      const next = this.pickScreeningItem(pool, answered);
      this.recordSelectionDecision(next, estimate, [{ item: next, utility: 1, reasons: ["screening_coverage"] }]);
      return next;
    }

    const decision = this.selectionDecision(pool, estimate);
    const next = decision.item;
    this.recordSelectionDecision(next, estimate, decision.ranked);
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
    const scored = candidates.map((item) => ({
      item,
      utility: this.positionFit(item, answered + 1) + this.topicFreshness(item) * 0.12 - this.topicCooldownPenalty(item),
      reasons: [`screening:${target}`],
    }));
    return this.seededTopKPick(scored, `screening:${answered}:${target}`, { minimumPool: 4, threshold: 0.84 }).item;
  }

  stateEstimate(normalized = this.getNormalizedScores(), overrides = {}) {
    const labels = overrides.labels || this.sortedLabels(normalized);
    const top = labels[0] || ["latent_human_variable", 0];
    const second = labels[1] || ["", 0];
    const topThree = labels.slice(0, 3);
    const total = labels.reduce((sum, [, value]) => sum + Math.max(value, 0), 0) || 1;
    const labelLead = (Math.max(top[1], 0) - Math.max(second[1], 0)) / total;
    const labelUncertainty = clamp(1 - labelLead / 0.24, 0, 1);
    const score = overrides.score ?? Math.round(this.estimateScore(normalized));
    const band = overrides.band || this.findBand(score);
    const openRisks = overrides.openRisks || this.openRisks(normalized, false);
    const potentialMisreadRisk = this.potentialMisreadRisk(normalized);
    const riskCounterchecked = !(this.hasMisreadRisk(normalized) || potentialMisreadRisk) || this.hasCountercheckEvidence();
    const metricConfidence = Object.fromEntries(
      this.metrics.map((metric) => {
        const possible = this.state.possibleScores[metric] || 0;
        const coverage = clamp(possible / 8, 0, 1);
        const ambiguityPenalty = normalized[metric] > 42 && normalized[metric] < 68 ? 0.22 : 0;
        return [metric, clamp(coverage - ambiguityPenalty, 0, 1)];
      })
    );
    const coreCoverage = CORE_METRICS.filter((metric) => metricConfidence[metric] >= 0.45).length / CORE_METRICS.length;
    const evidenceCovered = this.minimumEvidenceCoverageMet(top[0]);
    const previous = this.state.stabilityChecks.at(-1);
    const bandStable = previous ? previous.band === band.name : false;
    const labelStable = previous ? previous.top === top[0] : false;
    const nearBoundary = (this.config.resultBands || []).some((candidate) => Math.abs(score - candidate.min) <= 2 || Math.abs(score - candidate.max) <= 2);

    let confidence =
      28 +
      coreCoverage * 18 +
      (evidenceCovered ? 14 : 0) +
      clamp(labelLead / 0.24, 0, 1) * 18 +
      (riskCounterchecked ? 12 : 0) +
      (bandStable ? 8 : 0) +
      (labelStable ? 8 : 0);
    if (nearBoundary) confidence -= 10;
    if (openRisks.length) confidence -= Math.min(16, openRisks.length * 8);
    if (potentialMisreadRisk && !this.hasCountercheckEvidence()) confidence -= 12;
    if (this.state.answers.length < (this.flow.minimumQuestions || 16)) confidence -= 12;
    confidence = Math.round(clamp(confidence, 0, 100));

    const confidenceReasons = [];
    confidenceReasons.push(bandStable ? "分数段稳定" : "分数段仍在校准");
    confidenceReasons.push(labelStable ? "标签路径稳定" : labelUncertainty > 0.55 ? "标签仍有摇摆" : "标签领先度可用");
    confidenceReasons.push(evidenceCovered ? "证据覆盖达标" : "证据覆盖不足");
    confidenceReasons.push(riskCounterchecked ? "误读风险已反证" : "误读风险待反证");
    if (nearBoundary) confidenceReasons.push("接近分段边界");
    if (potentialMisreadRisk) confidenceReasons.push("高姿态答案需要反证");
    if (openRisks.includes("polished_answer_risk")) confidenceReasons.push("体面答案风险待校验");

    const estimate = {
      normalized,
      score,
      band,
      topLabel: top[0],
      topLabels: topThree.map(([key, value]) => ({ key, value })),
      labelLead,
      labelUncertainty,
      openRisks,
      potentialMisreadRisk,
      riskCounterchecked,
      metricConfidence,
      coreCoverage,
      evidenceCovered,
      nearBoundary,
      assessmentConfidence: confidence,
      confidenceReasons,
    };
    this.state.latestEstimate = estimate;
    return estimate;
  }

  candidateRoutes(estimate = this.stateEstimate()) {
    const topLabelKeys = estimate.topLabels.map((label) => label.key);
    const keyLabelCounterchecks = this.flow.keyLabelCounterchecks || {};
    const labelRoutes = topLabelKeys.flatMap((label) => keyLabelCounterchecks[label] || []);
    const riskRoutes = estimate.openRisks.flatMap((risk) => this.riskRules[risk]?.routeTo || this.riskRules[risk]?.countercheckFrom || []);
    if (estimate.potentialMisreadRisk) riskRoutes.push("NOI", "noise_probe");
    const lowConfidenceMetrics = Object.entries(estimate.metricConfidence)
      .filter(([metric, confidence]) => confidence < (CORE_METRICS.includes(metric) ? 0.72 : 0.58))
      .map(([metric]) => metric);
    const supportingEvidence = topLabelKeys.flatMap((label) => this.labelRules[label]?.supportingEvidence || []);
    const evidenceGaps = [...new Set(supportingEvidence.filter((tag) => !this.state.evidenceCounts[tag]))];
    return {
      topLabelKeys,
      labelRoutes,
      riskRoutes,
      lowConfidenceMetrics,
      evidenceGaps,
    };
  }

  selectionDecision(pool, estimate = this.stateEstimate()) {
    const routes = this.candidateRoutes(estimate);
    const answered = this.state.answeredItemIds.length;
    const ranked = pool
      .map((item) => {
        const detail = this.diagnosticUtility(item, estimate, routes, answered + 1);
        return { item, ...detail };
      })
      .sort((left, right) => right.utility - left.utility);
    const picked = this.seededTopKPick(ranked, `followup:${answered}:${estimate.topLabel}:${estimate.openRisks.join(",")}`, {
      minimumPool: 6,
      threshold: 0.9,
    });
    return {
      item: picked.item,
      ranked,
    };
  }

  diagnosticUtility(item, estimate, routes, position) {
    const weights = this.flow.selectionPriority || {};
    const metricSet = itemMetrics(item);
    const metricNeed = metricSet.reduce((sum, metric) => {
      const confidence = estimate.metricConfidence[metric] ?? 0.35;
      const ambiguity = estimate.normalized[metric] > 42 && estimate.normalized[metric] < 68 ? 0.22 : 0;
      return sum + (1 - confidence) + ambiguity;
    }, 0) / Math.max(metricSet.length, 1);

    const labelRoute =
      routes.labelRoutes.some((route) => this.matchesRoute(item, route)) ||
      routes.topLabelKeys.some((label) => LABEL_DIMENSIONS[label]?.some((metric) => metricSet.includes(metric)))
        ? 1
        : 0.25;
    const riskRoute = estimate.openRisks.length || estimate.potentialMisreadRisk
      ? item.role === "noise_probe" || item.primaryMetric === "NOI" || routes.riskRoutes.some((route) => this.matchesRoute(item, route))
        ? 1
        : 0.18
      : item.role === "noise_probe"
        ? 0.12
        : 0.35;
    const itemEvidence = new Set(item.options.flatMap((option) => option.evidence || []));
    const evidenceGap = routes.evidenceGaps.length
      ? routes.evidenceGaps.filter((tag) => itemEvidence.has(tag)).length / Math.min(routes.evidenceGaps.length, 4)
      : 0.25;
    const lowMetricRoute = metricSet.some((metric) => routes.lowConfidenceMetrics.includes(metric)) ? 1 : 0.2;
    const topicFreshness = this.topicFreshness(item);
    const keyLabelNeed = this.keyLabelNeed(item, estimate.normalized);
    const stageBoost = item.stage === "split" ? 0.08 : item.stage === "auxiliary" ? 0.05 : 0;
    const positionPenalty = this.positionFit(item, position) >= 1 ? 0 : 0.32;
    const cooldownPenalty = this.topicCooldownPenalty(item);
    const riskUrgencyBoost = estimate.potentialMisreadRisk
      ? item.role === "noise_probe" || item.primaryMetric === "NOI"
        ? 0.42
        : -0.06
      : 0;

    const utility =
      metricNeed * (weights.lowConfidence ?? 0.34) +
      labelRoute * (weights.labelImpact ?? 0.3) +
      riskRoute * (weights.contradictionRisk ?? 0.24) +
      topicFreshness * (weights.topicFreshness ?? 0.08) +
      keyLabelNeed * (weights.underrepresentedKeyLabel ?? 0.04) +
      lowMetricRoute * 0.1 +
      evidenceGap * 0.12 +
      stageBoost -
      positionPenalty -
      cooldownPenalty +
      riskUrgencyBoost;

    const reasons = [];
    if (metricNeed >= 0.55) reasons.push("low_confidence_metric");
    if (labelRoute >= 1) reasons.push("label_route");
    if (riskRoute >= 1) reasons.push("risk_countercheck");
    if (evidenceGap > 0.25) reasons.push("evidence_gap");
    if (topicFreshness >= 0.8) reasons.push("fresh_topic");

    return { utility, reasons };
  }

  seededTopKPick(scored, namespace, options = {}) {
    const ordered = [...scored].sort((left, right) => right.utility - left.utility);
    const best = ordered[0]?.utility ?? 0;
    const minimumPool = options.minimumPool ?? 6;
    const threshold = options.threshold ?? 0.9;
    const thresholdFloor = best >= 0 ? best * threshold : best / threshold;
    const nearBest = ordered.filter((candidate) => candidate.utility >= thresholdFloor);
    const candidatePool = ordered.slice(0, Math.max(minimumPool, nearBest.length));
    return candidatePool
      .map((candidate) => ({
        ...candidate,
        pickNoise: seededNoise(`${this.seed}:${namespace}:${this.state.answeredItemIds.join(">")}`, candidate.item.id),
        pickScore: candidate.utility + seededNoise(`${this.seed}:${namespace}:${this.state.answeredItemIds.join(">")}`, candidate.item.id) * (options.noiseWeight ?? 0.04),
      }))
      .sort((left, right) => right.pickScore - left.pickScore)[0];
  }

  recordSelectionDecision(item, estimate, ranked = []) {
    if (!item) return;
    this.state.selectionDecisions.push({
      afterAnswered: this.state.answers.length,
      itemId: item.id,
      stage: item.stage,
      primaryMetric: item.primaryMetric,
      confidence: estimate.assessmentConfidence,
      topLabel: estimate.topLabel,
      topCandidates: ranked.slice(0, 6).map((candidate) => ({
        itemId: candidate.item.id,
        utility: Number((candidate.utility ?? 0).toFixed(3)),
        reasons: candidate.reasons || [],
      })),
    });
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

  topicCooldownPenalty(item) {
    const recent = this.state.answers.slice(-3);
    if (!recent.length) return 0;
    const recentTags = new Set();
    for (const answer of recent) {
      const answeredItem = this.items.find((candidate) => candidate.id === answer.itemId);
      for (const tag of answeredItem?.topicTags || []) recentTags.add(tag);
    }
    const tags = item.topicTags || [];
    const avoid = item.avoidWithinTags || [];
    const overlap = tags.filter((tag) => recentTags.has(tag)).length / Math.max(tags.length, 1);
    const avoidHit = avoid.some((tag) => recentTags.has(tag));
    return overlap * 0.18 + (avoidHit ? 0.22 : 0);
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
    const estimate = this.stateEstimate(result.normalized, {
      score: result.score,
      band: result.band,
      labels,
      openRisks: result.openRisks || [],
    });
    const check = {
      band: result.band.name,
      top,
      lead,
      confidence: estimate.assessmentConfidence,
      riskCounterchecked: estimate.riskCounterchecked,
      evidenceCovered: estimate.evidenceCovered,
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
      check.confidence >= 74,
    ].filter(Boolean).length;
    const exceptionalStable = answered >= (this.flow.exceptionalEarlyStop?.minimumQuestions || 14) &&
      check.confidence >= 86 &&
      previous.band === check.band &&
      previous.top === check.top &&
      !estimate.openRisks.length &&
      !estimate.nearBoundary;
    return exceptionalStable || (check.confidence >= 74 && met >= 4);
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
    return nearBoundary || openRisks.length > 0 || this.potentialMisreadRisk(result.normalized) || labelChanged || bandChanged || splitNeeded;
  }

  hasMisreadRisk(normalized = this.getNormalizedScores()) {
    return this.openRisks(normalized).length > 0 || normalized.NOI >= 45 || (normalized.SKL >= 72 && (normalized.BND + normalized.CXT + normalized.GRD) / 3 < 52);
  }

  potentialMisreadRisk(normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    const answered = Math.max(this.state.answers.length, 1);
    const matureAnswerCount = this.state.answers.filter((answer) => answer.type === "mature_judgment").length;
    const matureDensity = matureAnswerCount / answered;
    const highCoreCount = CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const professionalPolish = evidenceScore(evidence, ["professional_polish", "polished_answer", "smooth_without_source_or_tradeoff"]);
    const sourceEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "failure_boundary",
      "failure_refined_judgment",
      "data_validated",
      "updates_judgment_conditions",
    ]);
    const tradeoffEvidence = evidenceScore(evidence, [
      "boundary_signal",
      "risk_with_alternative",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "practical_rework",
      "problem_reframed",
    ]);
    const highPostureLowSource =
      answered >= 10 &&
      matureDensity >= 0.5 &&
      highCoreCount >= 3 &&
      normalized.EXP <= 22 &&
      normalized.SKL <= 18 &&
      sourceEvidence + tradeoffEvidence <= 4 &&
      normalized.NOI < 45;
    const polishedLowSource =
      answered >= 8 &&
      professionalPolish >= 1 &&
      normalized.EXP <= 28 &&
      sourceEvidence + tradeoffEvidence <= 3 &&
      normalized.NOI < 45;
    return highPostureLowSource || polishedLowSource;
  }

  scoreSuppressionRisk(normalized = this.getNormalizedScores()) {
    const highCoreCount = CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const concreteEvidence = evidenceScore(this.state.evidenceCounts, [
      "specific_experience",
      "case_validated",
      "failure_boundary",
      "failure_refined_judgment",
      "problem_reframed",
      "practical_rework",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
    ]);
    return (
      highCoreCount >= 4 &&
      normalized.EXP <= 12 &&
      normalized.SKL <= 12 &&
      normalized.NOI < 45 &&
      concreteEvidence < 8
    );
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
    const specific = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "failure_boundary",
      "data_validated",
      "failure_refined_judgment",
      "updates_judgment_conditions",
    ]);
    const tradeoff = evidenceScore(evidence, [
      "boundary_signal",
      "tool_boundary",
      "judgment_reserved",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "risk_with_alternative",
      "practical_rework",
    ]);
    const concreteCriticalTaste = evidenceScore(evidence, [
      "anti_empty_professionalism",
      "cliche_without_judgment",
      "empty_but_polished_detected",
      "ai_empty_judgment_check",
      "judgment_selection_gap",
    ]);
    const aiJudgmentReserved = evidenceScore(evidence, [
      "ai_amplifier",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "ai_direction_boundary",
      "ai_goal_check",
    ]);
    const professionalPolish = evidenceScore(evidence, ["professional_polish", "polished_answer", "smooth_without_source_or_tradeoff", "posture_hiding_low_judgment"]);
    const highCoreCount = CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const concreteCounterEvidence = specific + tradeoff + concreteCriticalTaste + aiJudgmentReserved;
    const matureAnswerCount = this.state.answers.filter((answer) => answer.type === "mature_judgment").length;
    const highPolishDensity = matureAnswerCount >= 10 && matureAnswerCount / Math.max(this.state.answers.length, 1) >= 0.58;
    const collaborativeSource =
      normalized.EXP >= 55 &&
      normalized.TST <= 65 &&
      normalized.NOI <= 30 &&
      evidenceScore(evidence, ["condition_clarification", "process_execution", "context_signal", "expression_signal"]) >= 3;
    const genuineAiAmplification = normalized.SKL >= 35 && normalized.TLB >= 45 && aiJudgmentReserved >= 3 && (this.state.labelConfidence.ai_amplified_professional || 0) >= 4;
    const genuineCriticalTaste = normalized.TST >= 55 && concreteCriticalTaste >= 1 && (this.state.labelConfidence.empty_professional_detector || 0) >= 4;
    const generationEvidence = evidenceScore(evidence, ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"]);
    const genuineReframing = normalized.GEN >= 65 && generationEvidence >= 2 && (this.state.labelConfidence.generative_reframer || 0) >= 4;
    const boundaryEvidence = evidenceScore(evidence, ["boundary_signal", "risk_with_alternative", "context_boundary_tradeoff", "condition_check", "failure_boundary"]);
    const contextEvidence = evidenceScore(evidence, ["context_signal", "pause_to_identify_reason", "audience_need_check"]);
    const valueEvidence = evidenceScore(evidence, ["value_signal", "compliance_first", "risk_with_alternative"]);
    const hardValueEvidence = evidenceScore(evidence, ["compliance_first", "risk_with_alternative"]);
    const genuineBoundaryJudgment =
      normalized.BND >= 64 && normalized.CXT >= 52 && boundaryEvidence >= 2 && (!highPolishDensity || boundaryEvidence >= 4);
    const genuineContextStabilizing =
      normalized.CXT >= 62 && contextEvidence >= 2 && (this.state.labelConfidence.relationship_stabilizer || 0) >= 3 && (!highPolishDensity || contextEvidence >= 4);
    const genuineValueGuardrail =
      normalized.STN >= 68 &&
      normalized.BND >= 55 &&
      ((hardValueEvidence >= 1 && valueEvidence >= 2) || (hardValueEvidence >= 1 && normalized.STN >= 82)) &&
      (this.state.labelConfidence.value_low_generation || 0) >= 1.5 &&
      (!highPolishDensity || hardValueEvidence >= 1);
    const genuineStrategicBoundary =
      normalized.BND >= 76 &&
      normalized.CXT >= 72 &&
      normalized.STN >= 70 &&
      normalized.NOI <= 12 &&
      (boundaryEvidence + contextEvidence + valueEvidence >= 2);
    const genuineBoundaryContext =
      normalized.BND >= 78 &&
      normalized.CXT >= 80 &&
      normalized.NOI <= 12 &&
      (normalized.GEN >= 60 || normalized.TLB >= 60 || normalized.STN >= 50) &&
      (boundaryEvidence + contextEvidence + valueEvidence >= 1);
    const genuineContextValueJudgment =
      normalized.CXT >= 85 &&
      normalized.STN >= 80 &&
      normalized.BND >= 60 &&
      normalized.NOI <= 12 &&
      (contextEvidence + valueEvidence >= 1);
    const genuineCreativeReframe =
      normalized.GEN >= 88 &&
      normalized.TST >= 42 &&
      normalized.NOI <= 20 &&
      generationEvidence >= 1;
    const genuinePeakDensity =
      (highCoreCount >= 4 &&
        normalized.NOI <= 30 &&
        (concreteCounterEvidence >= 4 || (this.state.labelConfidence.high_density_human || 0) >= 4)) ||
      (professionalPolish === 0 && highCoreCount >= 3 && normalized.NOI <= 28 && concreteCounterEvidence >= 3);
    const genuineCounterSignal =
      genuineAiAmplification ||
      genuineCriticalTaste ||
      genuineReframing ||
      genuineBoundaryJudgment ||
      genuineContextStabilizing ||
      genuineValueGuardrail ||
      genuineStrategicBoundary ||
      genuineBoundaryContext ||
      genuineContextValueJudgment ||
      genuineCreativeReframe ||
      genuinePeakDensity;
    const lowSourceHighPosture =
      highPolishDensity &&
      normalized.EXP <= 18 &&
      specific <= 2 &&
      concreteCounterEvidence < 5 &&
      contextEvidence < 2 &&
      generationEvidence < 2 &&
      valueEvidence < 2 &&
      !genuineStrategicBoundary &&
      !genuineBoundaryContext &&
      !genuineContextValueJudgment &&
      !genuineCreativeReframe;
    const polishedLowSourceDetector =
      highPolishDensity &&
      normalized.EXP <= 18 &&
      normalized.NOI >= 18 &&
      normalized.TST >= 68 &&
      normalized.GEN <= 55 &&
      specific <= 2 &&
      concreteCounterEvidence < 5;
    const lowSourceToolPolish =
      normalized.EXP <= 5 &&
      normalized.NOI >= 18 &&
      normalized.TST >= 68 &&
      normalized.GEN <= 55 &&
      normalized.TLB >= 60 &&
      normalized.SKL <= 18 &&
      specific <= 2 &&
      concreteCounterEvidence < 5 &&
      !genuineCounterSignal;
    const lowSourcePolishedPosture =
      normalized.EXP <= 12 &&
      normalized.SKL <= 12 &&
      professionalPolish >= 2 &&
      (normalized.GEN >= 80 || normalized.TLB >= 80 || normalized.STN >= 80) &&
      concreteCounterEvidence < 4 &&
      !genuineCounterSignal;
    const matureWithoutSource =
      highPolishDensity &&
      matureAnswerCount >= 6 &&
      normalized.TST >= 58 &&
      normalized.TLB >= 58 &&
      normalized.EXP <= 30 &&
      normalized.SKL <= 20 &&
      specific <= 2 &&
      concreteCriticalTaste < 2 &&
      generationEvidence < 2;
    const polishedToolPosture =
      normalized.TST >= 70 &&
      normalized.TLB >= 70 &&
      normalized.BND >= 68 &&
      normalized.EXP <= 35 &&
      normalized.SKL <= 12;
    const polishedBoundaryPosture =
      normalized.TST >= 62 &&
      normalized.BND >= 55 &&
      normalized.EXP <= 40 &&
      normalized.SKL <= 22 &&
      normalized.NOI >= 12 &&
      specific <= 2 &&
      generationEvidence <= 2;
    const polishedEmptyPosture =
      normalized.TST >= 62 &&
      normalized.EXP <= 32 &&
      normalized.GRD <= 45 &&
      normalized.NOI >= 12 &&
      normalized.GEN <= 55 &&
      (normalized.BND >= 55 || normalized.STN >= 45 || normalized.SKL <= 24 || (normalized.EXP <= 10 && normalized.NOI >= 35));
    const polishedOverclaimPosture =
      normalized.EXP <= 16 &&
      normalized.SKL <= 14 &&
      normalized.NOI >= 35 &&
      normalized.BND >= 72 &&
      normalized.STN >= 72 &&
      (normalized.CXT >= 72 || normalized.GEN >= 82);
    if (!collaborativeSource && (polishedLowSourceDetector || lowSourceToolPolish || lowSourcePolishedPosture || matureWithoutSource || polishedToolPosture || polishedBoundaryPosture || polishedEmptyPosture || polishedOverclaimPosture)) {
      risks.push("polished_answer_risk");
    } else if (lowSourceHighPosture) {
      risks.push("polished_answer_risk");
    } else if (!collaborativeSource && professionalPolish >= 2 && highPolishDensity && specific <= 2 && concreteCounterEvidence < 4) {
      risks.push("polished_answer_risk");
    } else if (
      !collaborativeSource &&
      !genuineCounterSignal &&
      ((sociallyDesirable >= 5 && specific <= 1 && tradeoff <= 2 && concreteCounterEvidence < 4) ||
        (highPolishDensity && specific <= 1 && concreteCriticalTaste < 2 && aiJudgmentReserved < 4))
    ) {
      risks.push("polished_answer_risk");
    }
    const aiCandidate = this.state.labelConfidence.ai_amplified_professional || 0;
    if (normalized.TLB >= 40 && normalized.SKL >= 50 && aiCandidate < 2.4) risks.push("ai_underrecognized_risk");
    const estimatedScore = this.estimateBaseScore(normalized);
    if (estimatedScore >= 35 && estimatedScore <= 44 && normalized.SKL >= 62 && normalized.NOI < 40) risks.push("low_band_flattening_risk");
    if (updateState) this.state.openRisks = risks;
    return risks;
  }

  sortedLabels(normalized = this.getNormalizedScores()) {
    const flags = this.signalFlags(normalized);
    const evidence = this.state.evidenceCounts;
    const exclusions = new Map(this.labelExclusionRules.map((rule) => [rule.label, rule.blockedWhenAny || []]));
    return Object.entries(this.state.labelConfidence)
      .map(([label, value]) => {
        const priorityBoost = ((this.labelPriority.get(label) ?? 55) - 55) * 0.045;
        const rule = this.labelRules[label];
        const evidenceBoost = (rule?.supportingEvidence || []).reduce((sum, tag) => sum + Math.min(evidence[tag] || 0, 2) * 0.55, 0);
        const specificBoost = this.specificLabelBoost(label, normalized);
        const blocked = (exclusions.get(label) || []).some((flag) => flags[flag]);
        const exclusionPenalty = blocked ? 4 : 0;
        const fallbackPenalty = this.fallbackLabelPenalty(label, normalized);
        return [label, value + priorityBoost + evidenceBoost + specificBoost - exclusionPenalty - fallbackPenalty];
      })
      .sort((left, right) => right[1] - left[1]);
  }

  specificLabelBoost(label, normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    const boosts = {
      ai_amplified_professional:
        (normalized.TLB >= 45 ? 1.2 : 0) +
        (normalized.TLB >= 50 && normalized.BND >= 62 ? 3.8 : 0) +
        (normalized.TLB >= 70 && normalized.EXP >= 35 ? 1.2 : 0) +
        evidenceScore(evidence, ["ai_amplifier", "tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides", "ai_direction_boundary"], 0.72) +
        evidenceScore(evidence, ["ai_judgment_outsource_risk", "ai_kept_away_from_core"], 0.92),
      empty_professional_detector:
        (normalized.TST >= 58 ? 0.9 : 0) +
        (normalized.TST >= 42 && normalized.BND >= 62 && normalized.NOI >= 16 ? 0.8 : 0) +
        evidenceScore(evidence, ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected", "ai_empty_judgment_check", "correct_but_empty_words"], 1.05),
      generative_reframer:
        (normalized.GEN >= 62 ? 1.1 : 0) +
        (normalized.GEN >= 78 ? 2.2 : 0) +
        (normalized.GEN >= 90 ? 1.4 : 0) +
        evidenceScore(evidence, ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"], 1.0),
      relationship_stabilizer:
        (normalized.CXT >= 58 && normalized.STN >= 42 ? 0.9 : 0) +
        evidenceScore(evidence, ["context_signal", "expression_signal", "pause_to_identify_reason", "audience_need_check", "condition_clarification"], 0.78),
      teachable_irreplaceable:
        (normalized.EXP >= 35 && normalized.BND >= 36 && normalized.SKL >= 20 ? 0.9 : 0) +
        evidenceScore(evidence, ["condition_clarification", "process_execution", "reusable_method", "standardizable_work", "data_validated"], 0.52),
      intuition_grounded:
        (normalized.GRD >= 56 ? 0.8 : 0) +
        (normalized.GRD >= 64 && normalized.SKL <= 24 ? 1.2 : 0) +
        (normalized.GRD >= 58 && normalized.NOI <= 18 && evidenceScore(evidence, ["intuition_or_countercheck"]) >= 4 ? 1.4 : 0) +
        evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions"], 0.78),
      grounded_experience:
        (normalized.GRD >= 58 && normalized.SKL <= 28 ? 0.9 : 0) +
        evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions", "experience_signal_calibrated"], 0.68),
      experience_locked:
        evidenceScore(evidence, ["old_method_continues", "rarely_update_experience", "old_experience_rejected_broadly"], 0.8),
      fake_resistance:
        (normalized.NOI >= 24 && normalized.BND < 45 ? 1.1 : 0) +
        (normalized.NOI >= 20 && normalized.BND < 40 && normalized.STN < 30 ? 2.6 : 0) +
        evidenceScore(evidence, ["personal_feeling_without_basis", "refuses_explanation", "complexity_feeling_unclear", "noi_signal"], 0.85),
      value_low_generation:
        (normalized.STN >= 68 && normalized.BND >= 55 && normalized.GEN < 62 ? 0.9 : 0) +
        (normalized.STN >= 80 && normalized.BND >= 65 && normalized.GRD < 62 ? 1.4 : 0) +
        (normalized.STN >= 90 && normalized.BND >= 70 ? 0.8 : 0) +
        evidenceScore(evidence, ["risk_with_alternative", "compliance_first", "value_signal"], 0.72) +
        evidenceScore(evidence, ["ai_judgment_outsource_risk", "ai_kept_away_from_core"], 0.22),
      taste_low_expression:
        (normalized.TST >= 52 && normalized.EXP < 50 ? 0.7 : 0) +
        evidenceScore(evidence, ["expression_lag", "specific_experience", "case_validated"], 0.6),
      method_distilled:
        evidenceScore(evidence, ["reusable_method", "process_execution", "skl_signal"], 0.18),
      skill_friendly:
        evidenceScore(evidence, ["process_execution", "skl_signal", "standardizable_work"], 0.16),
    };
    return boosts[label] || 0;
  }

  fallbackLabelPenalty(label, normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    if (label === "boundary_radar") {
      const specificAlternative =
        evidenceScore(evidence, [
          "ai_amplifier",
          "tool_boundary",
          "ai_options_human_decision",
          "ai_challenges_but_human_decides",
          "anti_empty_professionalism",
          "cliche_without_judgment",
          "empty_but_polished_detected",
          "problem_reframed",
          "practical_rework",
          "target_relevance_cleanup",
          "judgment_selection_gap",
          "specific_experience",
          "case_validated",
          "value_signal",
          "risk_with_alternative",
          "context_signal",
          "pause_to_identify_reason",
        ]) >= 3;
      const strongerSpecificStructure =
        (normalized.GEN >= 72 && evidenceScore(evidence, ["problem_reframed", "practical_rework", "judgment_selection_gap"]) >= 1) ||
        (normalized.STN >= 68 && evidenceScore(evidence, ["value_signal", "risk_with_alternative", "compliance_first"]) >= 1) ||
        (normalized.CXT >= 72 && evidenceScore(evidence, ["context_signal", "pause_to_identify_reason"]) >= 1) ||
        (normalized.TLB >= 55 && evidenceScore(evidence, ["tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides"]) >= 1) ||
        (normalized.TST >= 62 && evidenceScore(evidence, ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected"]) >= 1);
      const boundaryIsDominant = normalized.BND >= 68 && normalized.CXT >= 56;
      if (strongerSpecificStructure) return 5.2;
      if (specificAlternative && !boundaryIsDominant) return 4.2;
      if (specificAlternative) return 0.9;
      if (normalized.BND < 70 && (normalized.GRD >= 58 || normalized.TST >= 58 || normalized.TLB >= 58 || normalized.GEN >= 62)) return 2.4;
      if (normalized.TLB >= 50 && evidenceScore(evidence, ["ai_judgment_outsource_risk", "ai_kept_away_from_core", "tool_boundary", "ai_challenges_but_human_decides"]) >= 3) return 6.2;
      if (normalized.TLB >= 70 && evidenceScore(evidence, ["tool_boundary", "ai_challenges_but_human_decides", "ai_judgment_outsource_risk", "ai_kept_away_from_core"]) >= 1) return 5.2;
    }
    if (label === "fake_resistance" && normalized.NOI < 48) {
      const constructiveEvidence = evidenceScore(evidence, ["practical_rework", "risk_with_alternative", "tool_boundary", "specific_experience"]);
      if (constructiveEvidence >= 2) return 2.5;
    }
    if (label === "ai_amplified_professional") {
      const aiPositive = evidenceScore(evidence, ["ai_amplifier", "ai_options_human_decision", "ai_challenges_but_human_decides", "ai_direction_boundary", "tool_boundary"]);
      const boundaryValue = evidenceScore(evidence, ["risk_with_alternative", "judgment_and_consequence", "value_signal", "ai_judgment_outsource_risk", "ai_kept_away_from_core", "signal_conditions"]);
      if (normalized.CXT >= 68 && normalized.BND >= 62 && normalized.TLB >= 48) return 0;
      if (boundaryValue >= 3 && aiPositive <= 3) return 2.4;
      if (boundaryValue >= 4) return 3.2;
    }
    if (label === "value_low_generation") {
      const hardValue = evidenceScore(evidence, ["risk_with_alternative", "compliance_first"]);
      const aiBoundary = evidenceScore(evidence, ["ai_judgment_outsource_risk", "ai_kept_away_from_core", "tool_boundary", "ai_challenges_but_human_decides"]);
      const criticalTaste = evidenceScore(evidence, ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected"]);
      const grounded = evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions"]);
      if (hardValue === 0 && normalized.STN < 82 && (aiBoundary >= 3 || criticalTaste >= 1 || grounded >= 3)) return 2.8;
      if (hardValue === 0 && normalized.GRD >= 58 && normalized.SKL <= 28) return 2.2;
      if (hardValue === 0 && normalized.TST >= 55 && criticalTaste >= 1) return 2.2;
    }
    if ((label === "intuition_grounded" || label === "grounded_experience") && normalized.NOI >= 20 && normalized.BND < 40 && normalized.STN < 30) {
      return 3.2;
    }
    return 0;
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
    const openRisks = this.openRisks(normalized);
    const estimate = this.stateEstimate(normalized, { score, band, labels, openRisks });
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
      openRisks,
      labelCandidates: labels.slice(0, 3).map(([key]) => this.config.labelDetails?.[key]?.name || this.config.labels?.[key] || key),
      stabilityLevel: this.stabilityLevel(),
      confidence: estimate.assessmentConfidence,
      confidenceReasons: estimate.confidenceReasons,
      questionPath: this.state.answers.map((answer) => answer.itemId),
      role: this.roleResult(),
      answeredCount: this.state.answers.length,
    };
  }

  estimateScore(normalized, includeRiskPenalty = true) {
    const formula = this.config.scoringFormula || {};
    const rawScore = this.estimateBaseScore(normalized) - (includeRiskPenalty ? this.riskScorePenalty(normalized) : 0);
    const calibrated = this.applyScoreCalibration(rawScore, normalized, includeRiskPenalty);
    return clamp(calibrated, formula.minDisplayScore ?? 20, formula.maxDisplayScore ?? 98);
  }

  estimateBaseScore(normalized = this.getNormalizedScores()) {
    const formula = this.config.scoringFormula || {};
    const weights = formula.coreWeights || {};
    const coreScore = CORE_METRICS.reduce((sum, metric) => sum + normalized[metric] * (weights[metric] || 0), 0);
    const replacementGap = Math.max(0, normalized.SKL - (normalized.BND + normalized.CXT + normalized.GRD + normalized.EXP) / 4);
    return (
      coreScore +
      normalized.EXP * (formula.translationBonusWeight ?? 0.08) +
      normalized.TLB * (formula.toolBoundaryBonusWeight ?? 0.05) -
      replacementGap * (formula.replacementPenaltyWeight ?? 0.12) -
      normalized.NOI * (formula.noisePenaltyWeight ?? 0.16)
    );
  }

  riskScorePenalty(normalized = this.getNormalizedScores()) {
    const risks = this.openRisks(normalized, false);
    let penalty = 0;
    if (risks.includes("polished_answer_risk")) penalty += 8;
    if (this.scoreSuppressionRisk(normalized)) penalty += 8;
    if (risks.includes("ai_underrecognized_risk")) penalty -= 1.5;
    return penalty;
  }

  applyScoreCalibration(score, normalized = this.getNormalizedScores(), includeRiskPenalty = true) {
    const calibration = this.config.scoreCalibration || {};
    let calibrated = score;
    const polishedRiskOpen = includeRiskPenalty && (this.openRisks(normalized, false).includes("polished_answer_risk") || this.scoreSuppressionRisk(normalized));
    if (calibration.highConfidenceLift?.enabled) {
      const highCore = CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
      const labelStrength = this.sortedLabels(normalized).filter(([, value]) => value >= 5).length;
      if (score >= 66 && normalized.NOI <= 32 && highCore >= 2 && labelStrength >= 2 && !polishedRiskOpen) {
        calibrated += highCore >= 4 ? 14 : highCore >= 3 ? 10 : 6;
        calibrated = Math.min(calibrated, calibration.highConfidenceLift.cap ?? 94);
      }
    }
    if (calibration.peakScoreAccess?.enabled && !polishedRiskOpen) {
      const peak = this.peakScoreAccess(normalized);
      if (peak.qualified && calibrated >= (calibration.peakScoreAccess.minimumBaseScore ?? 74)) {
        calibrated += clamp(peak.strength * 1.15, 8, 16);
        if (peak.elite) calibrated = Math.max(calibrated, calibration.peakScoreAccess.minimumScore ?? 90);
        calibrated = Math.min(calibrated, calibration.peakScoreAccess.cap ?? 98);
      }
    }
    if (calibration.midBandSpread?.enabled && calibrated >= 43 && calibrated <= 69) {
      const dimensions = calibration.midBandSpread.dimensionsForSpread || ["BND", "EXP", "GRD", "GEN"];
      const spreadBase = dimensions.reduce((sum, metric) => sum + (normalized[metric] || 0), 0) / Math.max(dimensions.length, 1);
      calibrated += clamp((spreadBase - 58) * 0.16, -4, 5);
    }
    if (calibration.lowEndAccess?.enabled) {
      calibrated = this.applyLowEndAccess(calibrated, normalized);
    }
    calibrated = this.applyEvidenceFloors(calibrated, normalized);
    if (calibration.lowScoreDignityFloor?.enabled) {
      const evidence = this.state.evidenceCounts;
      const hasMethodEvidence = (evidence.common_issue_playbook || 0) + (evidence.task_decomposition_method || 0) + (evidence.reuse_as_strength || 0) + (evidence.framework_trainable || 0) > 0;
      const reliableExecution = normalized.SKL >= 62 && normalized.NOI <= 35 && (normalized.EXP >= 45 || hasMethodEvidence);
      if (reliableExecution && calibrated >= 20 && calibrated < 40) calibrated = Math.max(calibrated, 38);
      if (reliableExecution && normalized.EXP >= 55 && calibrated < 45) calibrated = Math.max(calibrated, 45);
    }
    if (includeRiskPenalty) calibrated = this.applyRiskScoreEffects(calibrated, normalized);
    return calibrated;
  }

  peakScoreAccess(normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    const labels = this.sortedLabels(normalized).slice(0, 5).map(([label]) => label);
    const highCore = CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const veryHighCore = CORE_METRICS.filter((metric) => normalized[metric] >= 82).length;
    const directPeakEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "failure_boundary",
      "failure_refined_judgment",
      "risk_with_alternative",
      "practical_rework",
      "problem_reframed",
      "judgment_selection_gap",
      "anti_empty_professionalism",
      "cliche_without_judgment",
      "empty_but_polished_detected",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "value_signal",
    ]);
    const sourceBackedPeak =
      normalized.GRD >= 45 ||
      normalized.GEN >= 85 ||
      normalized.TST >= 62 ||
      (normalized.TLB >= 82 && directPeakEvidence >= 2) ||
      directPeakEvidence >= 3 ||
      labels[0] === "high_density_human";
    const peakEvidence =
      directPeakEvidence + evidenceScore(evidence, ["context_signal"]) + veryHighCore + highCore;
    const peakLabels = new Set(this.config.scoreCalibration?.peakScoreAccess?.requiresAnyLabel || [
      "high_density_human",
      "generative_reframer",
      "empty_professional_detector",
      "value_low_generation",
      "boundary_radar",
      "teachable_irreplaceable",
      "ai_amplified_professional",
    ]);
    const hasPeakLabel = labels.some((label) => peakLabels.has(label));
    const qualified = normalized.NOI <= 28 && highCore >= 3 && peakEvidence >= 6 && hasPeakLabel && sourceBackedPeak;
    return {
      qualified,
      elite: qualified && (veryHighCore >= 2 || peakEvidence >= 9 || labels[0] === "high_density_human"),
      strength: peakEvidence + highCore + veryHighCore,
    };
  }

  applyLowEndAccess(score, normalized = this.getNormalizedScores()) {
    let adjusted = score;
    const evidence = this.state.evidenceCounts;
    const processEvidence = evidenceScore(evidence, ["process_execution", "standardizable_work", "fixed_process_and_format", "efficient_standard_task"]);
    const judgmentEvidence = evidenceScore(evidence, [
      "specific_experience",
      "risk_with_alternative",
      "problem_reframed",
      "tool_boundary",
      "ai_options_human_decision",
      "anti_empty_professionalism",
      "value_signal",
      "judgment_and_consequence",
      "signal_conditions",
      "ai_judgment_outsource_risk",
      "ai_kept_away_from_core",
    ]);
    const contextOnlyEvidence = evidenceScore(evidence, ["context_signal", "pause_to_identify_reason", "audience_need_check"]);
    const sourceEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "failure_boundary",
      "failure_refined_judgment",
      "problem_reframed",
      "practical_rework",
      "target_relevance_cleanup",
      "judgment_selection_gap",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "anti_empty_professionalism",
      "cliche_without_judgment",
      "empty_but_polished_detected",
      "value_signal",
      "risk_with_alternative",
    ]);
    const coreAverage = CORE_METRICS.reduce((sum, metric) => sum + normalized[metric], 0) / CORE_METRICS.length;
    if (
      contextOnlyEvidence >= 1 &&
      sourceEvidence <= 2 &&
      normalized.CXT >= 85 &&
      normalized.EXP < 30 &&
      normalized.GRD < 45 &&
      normalized.GEN < 80 &&
      normalized.TST < 60 &&
      normalized.TLB < 82
    ) {
      adjusted = Math.min(adjusted, 74);
    }
    if (normalized.NOI >= 62 && normalized.EXP < 45) adjusted = Math.min(adjusted, 32);
    if (
      normalized.EXP <= 16 &&
      normalized.SKL <= 14 &&
      normalized.NOI >= 35 &&
      normalized.BND >= 72 &&
      normalized.STN >= 72 &&
      (normalized.CXT >= 72 || normalized.GEN >= 82)
    ) {
      adjusted = Math.min(adjusted, normalized.NOI >= 50 ? 32 : 54);
    }
    if (
      normalized.CXT >= 90 &&
      normalized.BND >= 60 &&
      normalized.STN >= 58 &&
      normalized.GRD < 30 &&
      normalized.SKL <= 8 &&
      normalized.EXP < 72 &&
      normalized.NOI <= 12 &&
      normalized.TLB >= 72
    ) {
      adjusted = Math.min(adjusted, 74);
    }
    if (processEvidence >= 4 && judgmentEvidence <= 1 && coreAverage < 46) adjusted = Math.min(adjusted, 34);
    if (this.openRisks(normalized, false).includes("polished_answer_risk") && judgmentEvidence <= 2) adjusted = Math.min(adjusted, 54);
    return adjusted;
  }

  applyEvidenceFloors(score, normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    let adjusted = score;
    const collaborativeEvidence = evidenceScore(evidence, [
      "reusable_method",
      "condition_clarification",
      "context_signal",
      "expression_signal",
      "data_validated",
      "value_signal",
      "pause_to_identify_reason",
    ]);
    const experienceEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "failure_boundary",
      "failure_refined_judgment",
      "data_validated",
    ]);
    const generationAttemptEvidence = evidenceScore(evidence, [
      "problem_reframed",
      "practical_rework",
      "target_relevance_cleanup",
      "judgment_selection_gap",
      "surface_overdecorated",
      "audience_overload",
    ]);
    const semanticHighValueEvidence = evidenceScore(evidence, [
      "risk_with_alternative",
      "value_signal",
      "problem_reframed",
      "practical_rework",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "signal_conditions",
      "anti_empty_professionalism",
    ]) + Math.min(evidenceScore(evidence, ["mature_judgment"], 0.22), 2.5);
    const concreteSourceEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "failure_boundary",
      "failure_refined_judgment",
      "risk_with_alternative",
      "practical_rework",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "anti_empty_professionalism",
      "cliche_without_judgment",
      "empty_but_polished_detected",
      "signal_conditions",
    ]);
    const topLabelKeys = this.sortedLabels(normalized).slice(0, 5).map(([label]) => label);
    const hasTopLabel = (labels) => labels.some((label) => topLabelKeys.includes(label));
    const hasPolishedRisk = this.openRisks(normalized, false).includes("polished_answer_risk");
    if (!hasPolishedRisk && normalized.NOI <= 12 && normalized.BND >= 68 && normalized.STN >= 70 && normalized.GRD >= 55 && semanticHighValueEvidence >= 7 && concreteSourceEvidence >= 4) {
      adjusted = Math.max(adjusted, 86);
    }
    if (!hasPolishedRisk && normalized.NOI <= 8 && normalized.BND >= 64 && normalized.GRD >= 62 && normalized.STN >= 60 && (normalized.GEN >= 70 || concreteSourceEvidence >= 5) && concreteSourceEvidence >= 4) {
      adjusted = Math.max(adjusted, 90);
    }
    if (!hasPolishedRisk && normalized.NOI <= 18 && normalized.BND >= 55 && normalized.STN >= 70 && (normalized.CXT >= 60 || normalized.GEN >= 58) && semanticHighValueEvidence >= 5.5 && concreteSourceEvidence >= 3) {
      adjusted = Math.max(adjusted, 66);
    }
    if (!hasPolishedRisk && normalized.NOI <= 28 && normalized.BND >= 55 && normalized.STN >= 60 && semanticHighValueEvidence >= 5 && concreteSourceEvidence >= 2) {
      adjusted = Math.max(adjusted, 58);
    }
    if (!hasPolishedRisk && normalized.NOI <= 48 && collaborativeEvidence >= 3 && normalized.EXP >= 45) {
      adjusted = Math.max(adjusted, normalized.BND >= 58 || normalized.CXT >= 58 || normalized.EXP >= 58 ? 47 : 45);
    }
    if (!hasPolishedRisk && normalized.NOI <= 35 && collaborativeEvidence >= 2 && normalized.EXP >= 80) {
      adjusted = Math.max(adjusted, 47);
    }
    if (!hasPolishedRisk && normalized.NOI <= 45 && experienceEvidence >= 3 && normalized.GRD >= 55) {
      adjusted = Math.max(adjusted, 52);
    }
    if (!hasPolishedRisk && normalized.NOI <= 45 && experienceEvidence >= 4 && normalized.GRD >= 58) {
      adjusted = Math.max(adjusted, 55);
    }
    if (
      !hasPolishedRisk &&
      normalized.GRD >= 50 &&
      normalized.TST >= 55 &&
      normalized.NOI <= 82 &&
      hasTopLabel(["intuition_grounded", "grounded_experience", "experience_locked"])
    ) {
      adjusted = Math.max(adjusted, normalized.GRD >= 80 && normalized.NOI <= 55 ? 52 : 45);
    }
    if (!hasPolishedRisk && normalized.NOI <= 48 && normalized.TST >= 45 && normalized.GRD >= 48 && (evidence.expression_lag || 0) > 0) {
      adjusted = Math.max(adjusted, 45);
    }
    if (!hasPolishedRisk && normalized.NOI <= 58 && normalized.GEN >= 55 && generationAttemptEvidence >= 1) {
      adjusted = Math.max(adjusted, 38);
    }
    return adjusted;
  }

  applyRiskScoreEffects(score, normalized = this.getNormalizedScores()) {
    const risks = this.openRisks(normalized, false);
    let adjusted = score;
    if (risks.includes("polished_answer_risk") && !this.polishedRiskResolved()) {
      const evidence = this.state.evidenceCounts;
      const judgmentEvidence = evidenceScore(evidence, [
        "specific_experience",
        "risk_with_alternative",
        "problem_reframed",
        "tool_boundary",
        "ai_options_human_decision",
        "anti_empty_professionalism",
        "value_signal",
      ]);
      const cap = judgmentEvidence >= 3 ? 56 : judgmentEvidence >= 1 ? 52 : 46;
      adjusted = Math.min(adjusted, cap);
    }
    return adjusted;
  }

  polishedRiskResolved() {
    if (!this.hasCountercheckForRisk("polished_answer_risk")) return false;
    const evidence = this.state.evidenceCounts;
    const specific = evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment"]);
    const tradeoff = evidenceScore(evidence, ["tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides", "risk_with_alternative", "practical_rework"]);
    const criticalTaste = evidenceScore(evidence, ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected"]);
    return specific + tradeoff + criticalTaste >= 5;
  }

  hasCountercheckForRisk(risk) {
    const routes = this.riskRules[risk]?.countercheckFrom || this.riskRules[risk]?.routeTo || [];
    if (!routes.length) return this.hasCountercheckEvidence();
    const answeredItems = this.state.answers
      .map((answer) => this.items.find((item) => item.id === answer.itemId))
      .filter(Boolean);
    return answeredItems.some((item) => routes.some((route) => this.matchesRoute(item, route)));
  }

  stabilityLevel() {
    if (this.state.answers.length >= this.flow.maximumQuestions && !this.state.stopped) return "forced_at_24";
    const latest = this.state.stabilityChecks.at(-1);
    if (!latest) return this.openRisks().length ? "risk_pending" : "path_stable";
    if (this.openRisks().length) return "risk_pending";
    if (latest.riskCounterchecked && latest.evidenceCovered && latest.lead >= 0.18) return "stable";
    if (latest.lead >= 0.12 && latest.evidenceCovered) return "path_stable";
    return "label_swing";
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
    if (context.skipped) {
      return "你跳过了工作场景校准，因此本次只展示个人含活人量，不判断岗位蒸馏度。";
    }
    const values = Object.entries(context)
      .filter(([key, value]) => key !== "skipped" && Boolean(value))
      .map(([, value]) => value);
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
