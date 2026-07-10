const CORE_METRICS = ["CXT", "BND", "GEN", "TST", "STN", "GRD"];
const AUX_METRICS = ["SKL", "EXP", "NOI", "TLB"];
const METRIC_NAMES = {
  CXT: "情境判断",
  BND: "边界判断",
  GEN: "问题重构",
  TST: "审美判断",
  STN: "价值取舍",
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

function dominantShare(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  return Math.max(...values) / total;
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
      intro: this.sectionIntros[this.state.currentStage] || "会顺着前面的答案，继续问还没看清的地方。",
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
    const structureTendency = this.structuralTendency(normalized);
    const structuralMisreadRisk = structureTendency.misreadRisk;
    const requiresStrictCountercheck =
      potentialMisreadRisk ||
      structuralMisreadRisk ||
      openRisks.includes("polished_answer_risk");
    const riskCounterchecked =
      !(this.hasMisreadRisk(normalized) || potentialMisreadRisk || structuralMisreadRisk) ||
      this.hasCountercheckEvidence({ strict: requiresStrictCountercheck });
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
    if ((potentialMisreadRisk || structuralMisreadRisk) && !this.hasCountercheckEvidence({ strict: requiresStrictCountercheck })) confidence -= 12;
    if (structuralMisreadRisk && structureTendency.uncertainty > 0.5) confidence -= 4;
    if (structuralMisreadRisk && structureTendency.styleMonoculture) confidence -= 4;
    if (this.state.answers.length < (this.flow.minimumQuestions || 16)) confidence -= 12;
    confidence = Math.round(clamp(confidence, 0, 100));

    const confidenceReasons = [];
    confidenceReasons.push(bandStable ? "分数段稳定" : "分数段还在确认");
    confidenceReasons.push(labelStable ? "标签路径稳定" : labelUncertainty > 0.55 ? "标签仍有摇摆" : "标签领先度可用");
    confidenceReasons.push(evidenceCovered ? "证据覆盖达标" : "证据覆盖不足");
    confidenceReasons.push(riskCounterchecked ? "看偏风险已反证" : "看偏风险待反证");
    if (nearBoundary) confidenceReasons.push("接近分段边界");
    if (potentialMisreadRisk) confidenceReasons.push("高姿态答案需要反证");
    if (structuralMisreadRisk) confidenceReasons.push("结构倾向需要反证");
    if (structureTendency.styleMonoculture) confidenceReasons.push("答题风格过于单一");
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
      structuralMisreadRisk,
      riskCounterchecked,
      structureTendency,
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
    if (estimate.potentialMisreadRisk || estimate.structuralMisreadRisk) riskRoutes.push("NOI", "noise_probe");
    const lowConfidenceMetrics = Object.entries(estimate.metricConfidence)
      .filter(([metric, confidence]) => confidence < (CORE_METRICS.includes(metric) ? 0.72 : 0.58))
      .map(([metric]) => metric);
    const supportingEvidence = topLabelKeys.flatMap((label) => this.labelRules[label]?.supportingEvidence || []);
    const evidenceGaps = [...new Set(supportingEvidence.filter((tag) => !this.state.evidenceCounts[tag]))];
    const structureRoutes = this.structureRoutes(estimate.structureTendency);
    return {
      topLabelKeys,
      labelRoutes,
      riskRoutes,
      lowConfidenceMetrics,
      evidenceGaps,
      structureRoutes,
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
    const riskRoute = estimate.openRisks.length || estimate.potentialMisreadRisk || estimate.structuralMisreadRisk
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
    const structureRoute = routes.structureRoutes.some((route) => this.matchesRoute(item, route)) ? 1 : 0.2;
    const lowMetricRoute = metricSet.some((metric) => routes.lowConfidenceMetrics.includes(metric)) ? 1 : 0.2;
    const topicFreshness = this.topicFreshness(item);
    const keyLabelNeed = this.keyLabelNeed(item, estimate.normalized);
    const stageBoost = item.stage === "split" ? 0.08 : item.stage === "auxiliary" ? 0.05 : 0;
    const positionPenalty = this.positionFit(item, position) >= 1 ? 0 : 0.32;
    const cooldownPenalty = this.topicCooldownPenalty(item);
    const riskUrgencyBoost = estimate.potentialMisreadRisk || estimate.structuralMisreadRisk
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
      structureRoute * 0.14 +
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
    if (structureRoute >= 1) reasons.push("structure_route");
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
      structure: estimate.structureTendency?.top || "",
      structureUncertainty: Number((estimate.structureTendency?.uncertainty || 0).toFixed(3)),
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

    const stopConfidence =
      estimate.openRisks.length || estimate.potentialMisreadRisk || estimate.structuralMisreadRisk
        ? 76
        : 71;
    const met = [
      previous.band === check.band,
      previous.top === check.top,
      check.lead >= 0.18,
      check.riskCounterchecked,
      check.evidenceCovered,
      check.confidence >= stopConfidence,
    ].filter(Boolean).length;
    const exceptionalStable = answered >= (this.flow.exceptionalEarlyStop?.minimumQuestions || 14) &&
      check.confidence >= 86 &&
      previous.band === check.band &&
      previous.top === check.top &&
      !estimate.openRisks.length &&
      !estimate.nearBoundary;
    return exceptionalStable || (check.confidence >= stopConfidence && met >= 4);
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
    const structure = this.structuralTendency(normalized);
    const denseHuman = this.highDensityHumanEvidence(normalized, structure);
    if (denseHuman.qualified) return false;
    return highPostureLowSource || polishedLowSource || structure.misreadRisk;
  }

  scoreSuppressionRisk(normalized = this.getNormalizedScores()) {
    if (this.highDensityHumanEvidence(normalized).qualified) return false;
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

  hasCountercheckEvidence(options = {}) {
    const countercheckAnswers = this.state.answers.filter((answer) => answer.stage === "auxiliary" || answer.primaryMetric === "NOI");
    if (!options.strict) return countercheckAnswers.length > 0;
    const evidence = this.state.evidenceCounts;
    const nonMatureCountercheck = countercheckAnswers.some((answer) => answer.type !== "mature_judgment");
    const explicitNoiseEvidence = evidenceScore(evidence, [
      "noi_signal",
      "professional_polish",
      "polished_answer",
      "smooth_without_source_or_tradeoff",
      "posture_hiding_low_judgment",
      "personal_feeling_without_basis",
      "refuses_explanation",
      "complexity_feeling_unclear",
    ]);
    const concreteSourceEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "failure_refined_judgment",
      "experience_signal_calibrated",
      "source_and_experience_gap",
      "updates_judgment_conditions",
    ]);
    return countercheckAnswers.length >= 2 && (nonMatureCountercheck || explicitNoiseEvidence >= 2 || concreteSourceEvidence >= 3);
  }

  minimumEvidenceCoverageMet(topLabel) {
    const evidenceCount = Object.values(this.state.evidenceCounts).reduce((sum, count) => sum + count, 0);
    const topRule = this.labelRules[topLabel];
    const supporting = topRule?.supportingEvidence || [];
    const supportingMet = supporting.length ? supporting.filter((tag) => this.state.evidenceCounts[tag]).length : 1;
    return evidenceCount >= 8 && supportingMet >= Math.min(2, supporting.length || 1);
  }

  answerTypeProfile() {
    const counts = this.state.answers.reduce((map, answer) => {
      const type = answer.type || "unknown";
      map[type] = (map[type] || 0) + 1;
      return map;
    }, {});
    const total = Math.max(this.state.answers.length, 1);
    const shares = Object.fromEntries(Object.entries(counts).map(([type, count]) => [type, count / total]));
    const concentration = dominantShare(Object.values(counts));
    return {
      counts,
      shares,
      concentration,
      matureDensity: shares.mature_judgment || 0,
      processDensity: shares.process_execution || 0,
      conditionDensity: shares.condition_clarification || 0,
      intuitionDensity: shares.intuition_or_countercheck || 0,
    };
  }

  structuralTendency(normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    const typeProfile = this.answerTypeProfile();
    const answered = Math.max(this.state.answers.length, 1);
    const evidenceGroups = {
      source: evidenceScore(evidence, [
        "specific_experience",
        "case_validated",
        "failure_refined_judgment",
        "experience_signal_calibrated",
        "source_and_experience_gap",
        "updates_judgment_conditions",
      ]),
      boundary: evidenceScore(evidence, ["boundary_signal", "failure_boundary", "condition_check", "context_boundary_tradeoff"]),
      generation: evidenceScore(evidence, ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"]),
      value: evidenceScore(evidence, ["value_signal", "risk_with_alternative", "compliance_first"]),
      taste: evidenceScore(evidence, ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected", "ai_empty_judgment_check"]),
      aiBoundary: evidenceScore(evidence, ["ai_amplifier", "tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides", "ai_direction_boundary"]),
      process: evidenceScore(evidence, ["process_execution", "skl_signal", "standardizable_work", "reusable_method"]),
      polish: evidenceScore(evidence, ["professional_polish", "polished_answer", "smooth_without_source_or_tradeoff", "posture_hiding_low_judgment"]),
      noise: evidenceScore(evidence, ["noi_signal", "personal_feeling_without_basis", "refuses_explanation", "complexity_feeling_unclear"]),
    };
    const coreAverage = CORE_METRICS.reduce((sum, metric) => sum + (normalized[metric] || 0), 0) / CORE_METRICS.length;
    const highCoreCount = CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const styleMonoculture = answered >= 8 && typeProfile.concentration >= 0.82;
    const lowTransfer = ((normalized.EXP || 0) + (normalized.SKL || 0) + (normalized.TLB || 0)) / 3 <= 28;
    const sourceIntegrity = clamp(
      (evidenceGroups.source + evidenceGroups.boundary * 0.45 + evidenceGroups.generation * 0.35 + evidenceGroups.taste * 0.35 + evidenceGroups.aiBoundary * 0.35) /
        Math.max(typeProfile.counts.mature_judgment || 1, 1),
      0,
      1
    );

    const scores = {
      performative_mature:
        typeProfile.matureDensity * 3.4 +
        (styleMonoculture ? 1.1 : 0) +
        (lowTransfer ? 0.9 : 0) +
        (highCoreCount >= 3 ? 0.8 : 0) +
        evidenceGroups.polish * 0.5 +
        evidenceGroups.noise * 0.22 -
        sourceIntegrity * 1.4,
      source_backed_experience:
        (normalized.GRD || 0) / 24 +
        evidenceGroups.source * 0.72 +
        evidenceGroups.boundary * 0.28 +
        typeProfile.intuitionDensity * 0.8 -
        evidenceGroups.polish * 0.28,
      boundary_value_judgment:
        ((normalized.BND || 0) + (normalized.STN || 0) + (normalized.CXT || 0)) / 80 +
        evidenceGroups.boundary * 0.34 +
        evidenceGroups.value * 0.34,
      generative_reframe:
        ((normalized.GEN || 0) + (normalized.TST || 0)) / 70 +
        evidenceGroups.generation * 0.52 +
        evidenceGroups.taste * 0.22,
      tool_amplified:
        ((normalized.TLB || 0) + (normalized.SKL || 0) + (normalized.BND || 0)) / 82 +
        evidenceGroups.aiBoundary * 0.62,
      process_distillable:
        ((normalized.SKL || 0) + (normalized.EXP || 0)) / 52 +
        evidenceGroups.process * 0.62 +
        typeProfile.processDensity * 1.1,
      expressive_transfer:
        ((normalized.EXP || 0) + (normalized.CXT || 0)) / 58 +
        typeProfile.conditionDensity * 0.9,
      noise_resistance:
        (normalized.NOI || 0) / 26 +
        evidenceGroups.noise * 0.7 +
        evidenceGroups.polish * 0.4,
    };
    const ranked = Object.entries(scores).sort((left, right) => right[1] - left[1]);
    const top = ranked[0] || ["latent", 0];
    const second = ranked[1] || ["", 0];
    const total = ranked.reduce((sum, [, value]) => sum + Math.max(value, 0), 0) || 1;
    const lead = (Math.max(top[1], 0) - Math.max(second[1], 0)) / total;
    const postureCue =
      evidenceGroups.polish >= 1 ||
      evidenceGroups.noise >= 2 ||
      normalized.NOI >= 18 ||
      normalized.EXP <= 12;
    const highCoreLowTransferPosture =
      highCoreCount >= 4 &&
      (typeProfile.matureDensity >= 0.62 || (styleMonoculture && typeProfile.matureDensity >= 0.5)) &&
      lowTransfer &&
      sourceIntegrity < 0.36;
    const misreadRisk =
      answered >= 10 &&
      highCoreCount >= 3 &&
      lowTransfer &&
      sourceIntegrity < 0.42 &&
      postureCue &&
      (typeProfile.matureDensity >= 0.72 || highCoreLowTransferPosture) &&
      !this.hasCountercheckEvidence({ strict: true });
    return {
      top: top[0],
      ranked: ranked.slice(0, 4).map(([key, value]) => ({ key, value: Number(value.toFixed(3)) })),
      lead,
      uncertainty: clamp(1 - lead / 0.22, 0, 1),
      misreadRisk,
      styleMonoculture,
      sourceIntegrity: Number(sourceIntegrity.toFixed(3)),
      postureCue,
      highCoreLowTransferPosture,
      highCoreCount,
      coreAverage: Number(coreAverage.toFixed(1)),
      typeProfile,
      evidenceGroups,
    };
  }

  highDensityHumanEvidence(normalized = this.getNormalizedScores(), structure = this.structuralTendency(normalized)) {
    const evidence = structure?.evidenceGroups || {};
    const highCoreCount = structure?.highCoreCount ?? CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const veryHighCoreCount = CORE_METRICS.filter((metric) => normalized[metric] >= 82).length;
    const coreAverage =
      structure?.coreAverage ?? CORE_METRICS.reduce((sum, metric) => sum + (normalized[metric] || 0), 0) / CORE_METRICS.length;
    const humanEvidence =
      (evidence.source || 0) +
      (evidence.boundary || 0) +
      (evidence.generation || 0) +
      (evidence.value || 0) +
      (evidence.taste || 0) +
      (evidence.aiBoundary || 0);
    const anchorGroups = [
      evidence.source || 0,
      evidence.boundary || 0,
      evidence.generation || 0,
      evidence.value || 0,
      (evidence.taste || 0) + (evidence.aiBoundary || 0),
    ].filter((value) => value >= 2).length;
    const lowNoise =
      normalized.NOI <= 18 &&
      (evidence.polish || 0) === 0 &&
      ((evidence.noise || 0) <= 1 || ((evidence.noise || 0) <= 2 && (evidence.source || 0) >= 2 && (evidence.boundary || 0) >= 4));
    const tacitDensity = normalized.EXP <= 24 && normalized.SKL <= 12;
    const distinctiveAnchor =
      (evidence.source || 0) >= 2 ||
      (evidence.taste || 0) + (evidence.aiBoundary || 0) >= 2 ||
      normalized.TLB >= 80;
    const denseCore = highCoreCount >= 5 && coreAverage >= 88;
    const broadEvidence = humanEvidence >= 12 && (anchorGroups >= 3 || ((evidence.generation || 0) >= 6 && (evidence.value || 0) >= 4));
    const qualified = denseCore && broadEvidence && lowNoise && tacitDensity && distinctiveAnchor;
    const elite =
      qualified &&
      coreAverage >= 92 &&
      humanEvidence >= 14 &&
      (anchorGroups >= 3 || (veryHighCoreCount >= 5 && (evidence.generation || 0) >= 6 && (evidence.value || 0) >= 4));
    return {
      qualified,
      elite,
      highCoreCount,
      veryHighCoreCount,
      coreAverage,
      humanEvidence,
      anchorGroups,
      scoreFloor: elite ? 90 : 84,
    };
  }

  highScoreEvidenceAccess(normalized = this.getNormalizedScores(), structure = this.structuralTendency(normalized)) {
    const evidence = structure?.evidenceGroups || {};
    const highCoreCount = structure?.highCoreCount ?? CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const veryHighCoreCount = CORE_METRICS.filter((metric) => normalized[metric] >= 82).length;
    const coreAverage =
      structure?.coreAverage ?? CORE_METRICS.reduce((sum, metric) => sum + (normalized[metric] || 0), 0) / CORE_METRICS.length;
    const polishNoise = (evidence.polish || 0) + (evidence.noise || 0);
    const sourceBoundaryPeak = (evidence.source || 0) >= 2 && (evidence.boundary || 0) >= 4;
    const pureReframePeak =
      (evidence.generation || 0) >= 10 &&
      (evidence.value || 0) >= 6 &&
      polishNoise <= 1 &&
      highCoreCount >= 5;
    const toolReframePeak =
      normalized.TLB >= 80 &&
      (evidence.generation || 0) >= 6 &&
      (evidence.value || 0) >= 6 &&
      coreAverage >= 92 &&
      polishNoise <= 1;
    const tasteAiPeak =
      (evidence.taste || 0) + (evidence.aiBoundary || 0) >= 3 &&
      (evidence.value || 0) >= 5 &&
      coreAverage >= 94 &&
      (evidence.source || 0) >= 1 &&
      (evidence.polish || 0) <= 1;
    const semanticCreativePeak =
      normalized.CXT >= 90 &&
      normalized.GEN >= 98 &&
      normalized.TST >= 90 &&
      normalized.BND >= 70 &&
      normalized.STN >= 70 &&
      (evidence.generation || 0) >= 8 &&
      (evidence.value || 0) >= 6 &&
      normalized.NOI <= 35 &&
      (evidence.polish || 0) <= 1;
    const semanticDenseReframe =
      coreAverage >= 62 &&
      coreAverage <= 80 &&
      normalized.CXT >= 80 &&
      normalized.BND >= 60 &&
      normalized.STN >= 60 &&
      (evidence.generation || 0) >= 8 &&
      (evidence.value || 0) >= 5 &&
      (evidence.process || 0) <= 2 &&
      (evidence.polish || 0) === 0 &&
      (evidence.noise || 0) <= 1 &&
      normalized.NOI <= 5;
    const creativeTasteEvidence =
      normalized.GEN >= 88 &&
      normalized.TST >= 88 &&
      (evidence.generation || 0) >= 6 &&
      (evidence.value || 0) >= 5 &&
      (evidence.taste || 0) >= 2 &&
      normalized.NOI <= 24 &&
      (evidence.noise || 0) <= 2 &&
      (evidence.polish || 0) <= 3;
    const sourceBackedKey =
      (evidence.source || 0) >= 2 &&
      ((evidence.boundary || 0) >= 4 || (evidence.taste || 0) + (evidence.aiBoundary || 0) >= 3) &&
      coreAverage >= 86;
    const groundedTasteKey =
      (evidence.taste || 0) + (evidence.aiBoundary || 0) >= 3 &&
      (evidence.value || 0) >= 5 &&
      highCoreCount >= 4 &&
      coreAverage >= 90 &&
      (evidence.source || 0) >= 1 &&
      (evidence.polish || 0) <= 1;
    const peak90 = sourceBoundaryPeak || pureReframePeak || toolReframePeak || tasteAiPeak || semanticCreativePeak || semanticDenseReframe;
    const key80 = peak90 || sourceBackedKey || groundedTasteKey;
    return {
      peak90,
      key80,
      creativeTasteEvidence,
      semanticDenseReframe,
      highCoreCount,
      veryHighCoreCount,
      coreAverage,
    };
  }

  structureRoutes(structure) {
    if (!structure) return [];
    const routes = {
      performative_mature: ["NOISE", "noise_probe", "EXPRESS", "GROUND"],
      noise_resistance: ["NOISE", "TASTE", "SPLIT_04"],
      source_backed_experience: ["GROUND", "SPLIT_01", "TASTE"],
      boundary_value_judgment: ["BOUNDARY", "STANCE", "SPLIT_03", "SPLIT_09"],
      generative_reframe: ["GENERATIVE", "SPLIT_04", "SPLIT_12"],
      tool_amplified: ["SKILL", "SPLIT_05", "SPLIT_10"],
      process_distillable: ["SKILL", "EXPRESS", "CONTEXT"],
      expressive_transfer: ["EXPRESS", "CONTEXT", "SPLIT_08"],
    };
    const selected = new Set(routes[structure.top] || []);
    if (structure.misreadRisk || structure.styleMonoculture) {
      for (const route of ["NOISE", "noise_probe", "EXPRESS", "SKILL", "CONTEXT"]) selected.add(route);
    }
    if (structure.uncertainty > 0.55) {
      for (const candidate of structure.ranked.slice(0, 2)) {
        for (const route of routes[candidate.key] || []) selected.add(route);
      }
    }
    return [...selected];
  }

  serviceTranslationSignature(structure, normalized = this.getNormalizedScores()) {
    const evidence = structure?.evidenceGroups || this.structuralTendency(normalized).evidenceGroups || {};
    return (
      normalized.CXT >= 90 &&
      normalized.BND >= 90 &&
      normalized.STN >= 88 &&
      normalized.SKL <= 12 &&
      normalized.TST < 94 &&
      evidence.taste === 0 &&
      evidence.polish === 0 &&
      evidence.noise <= 1 &&
      (normalized.EXP >= 28 || evidence.process >= 1)
    );
  }

  creativeReframeSignature(structure, normalized = this.getNormalizedScores()) {
    const evidence = structure?.evidenceGroups || this.structuralTendency(normalized).evidenceGroups || {};
    return (
      normalized.CXT >= 80 &&
      normalized.BND >= 88 &&
      normalized.GEN >= 88 &&
      normalized.TST >= 80 &&
      normalized.STN >= 88 &&
      normalized.GRD >= 70 &&
      normalized.NOI <= 24 &&
      evidence.generation >= 6 &&
      evidence.taste >= 2 &&
      (evidence.aiBoundary >= 1 || normalized.EXP >= 26 || (evidence.source + evidence.boundary >= 2 && evidence.polish + evidence.noise <= 1))
    );
  }

  structuralScorePenalty(normalized = this.getNormalizedScores()) {
    const structure = this.structuralTendency(normalized);
    const denseHuman = this.highDensityHumanEvidence(normalized, structure);
    if (denseHuman.qualified) return 0;
    const types = structure.typeProfile;
    const evidence = structure.evidenceGroups;
    const highCore = structure.highCoreCount;
    const lowTransferAverage = ((normalized.EXP || 0) + (normalized.SKL || 0) + (normalized.TLB || 0)) / 3;
    const overclaimStructure = ["performative_mature", "generative_reframe", "boundary_value_judgment"].includes(structure.top);
    const matureOverclaim =
      this.state.answers.length >= 14 &&
      types.matureDensity >= 0.82 &&
      highCore >= 4 &&
      lowTransferAverage <= 30 &&
      structure.sourceIntegrity < 0.55 &&
      overclaimStructure &&
      (structure.postureCue || structure.styleMonoculture);
    const proceduralValueOverclaim =
      this.state.answers.length >= 14 &&
      ["boundary_value_judgment", "performative_mature"].includes(structure.top) &&
      evidence.value >= 5 &&
      evidence.process >= 2 &&
      evidence.generation <= 2 &&
      structure.sourceIntegrity < 0.22 &&
      highCore <= 3 &&
      normalized.GEN < 55;
    if (!matureOverclaim && !proceduralValueOverclaim) return 0;

    const concreteSource = evidence.source + evidence.boundary * 0.35 + evidence.generation * 0.28 + evidence.taste * 0.28 + evidence.aiBoundary * 0.28;
    const strongHumanSignature =
      normalized.NOI <= 10 &&
      concreteSource >= 4.5 &&
      ((normalized.GRD >= 82 && evidence.source >= 2) ||
        (normalized.BND >= 86 && evidence.boundary >= 3) ||
        (normalized.GEN >= 86 && evidence.generation >= 4 && (evidence.source >= 2 || evidence.boundary >= 3 || evidence.polish + evidence.noise === 0)));
    if (strongHumanSignature || this.creativeReframeSignature(structure, normalized)) return 0;

    let penalty = proceduralValueOverclaim ? 26 : normalized.EXP <= 16 && normalized.SKL <= 16 ? 22 : 14;
    if (structure.top === "performative_mature") penalty += 4;
    if (structure.top === "performative_mature" && structure.sourceIntegrity < 0.25) penalty += 6;
    if (structure.styleMonoculture && types.matureDensity >= 0.95 && structure.sourceIntegrity < 0.3 && highCore >= 5) penalty += 8;
    if (evidence.polish + evidence.noise >= 3) penalty += 4;
    if (normalized.NOI <= 10 && concreteSource >= 3.5 && (evidence.source >= 2 || evidence.boundary >= 4 || (evidence.generation >= 8 && evidence.polish + evidence.noise === 0))) penalty -= 6;
    return clamp(penalty, 0, 34);
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
    const noiseEvidence = evidenceScore(evidence, ["noi_signal", "personal_feeling_without_basis", "refuses_explanation", "complexity_feeling_unclear"]);
    const highCoreCount = CORE_METRICS.filter((metric) => normalized[metric] >= 72).length;
    const concreteCounterEvidence = specific + tradeoff + concreteCriticalTaste + aiJudgmentReserved;
    const sourcePedigreeEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "case_explanation",
      "knows_experience_failure_boundary",
      "failure_refined_judgment",
    ]);
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
    const strongCreativeSource =
      normalized.GEN >= 92 &&
      normalized.TST >= 82 &&
      generationEvidence >= 4 &&
      evidenceScore(evidence, ["target_relevance_cleanup", "judgment_selection_gap", "specific_problem"]) >= 1;
    const creativeDirectionSignature =
      normalized.CXT >= 80 &&
      normalized.BND >= 90 &&
      normalized.GEN >= 88 &&
      normalized.TST >= 82 &&
      normalized.STN >= 90 &&
      normalized.GRD >= 70 &&
      normalized.NOI <= 24 &&
      generationEvidence >= 5 &&
      concreteCriticalTaste >= 2 &&
      (normalized.EXP >= 26 || normalized.TLB >= 50);
    const creativeReframeSignature = this.creativeReframeSignature({ evidenceGroups: {
      source: sourcePedigreeEvidence,
      boundary: boundaryEvidence,
      generation: generationEvidence,
      value: valueEvidence,
      taste: concreteCriticalTaste,
      aiBoundary: aiJudgmentReserved,
      process: evidenceScore(evidence, ["process_execution", "skl_signal", "standardizable_work", "reusable_method"]),
      polish: professionalPolish,
      noise: noiseEvidence,
    } }, normalized);
    const explicitToolOrAntiEmptySource =
      aiJudgmentReserved >= 2 ||
      evidenceScore(evidence, ["tool_boundary", "ai_options_human_decision", "ai_challenges_but_human_decides", "anti_empty_professionalism"]) >= 2;
    const strongBoundaryHumanSignature =
      normalized.CXT >= 84 &&
      normalized.BND >= 88 &&
      normalized.STN >= 88 &&
      normalized.GRD >= 80 &&
      normalized.NOI <= 24;
    const strongValueGuardSignature =
      normalized.BND >= 84 &&
      normalized.STN >= 84 &&
      normalized.GEN < 58 &&
      normalized.NOI <= 45;
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
      normalized.SKL <= 12 &&
      !explicitToolOrAntiEmptySource;
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
    const lowExpressionNoisePosture =
      normalized.NOI >= 35 &&
      normalized.EXP <= 20 &&
      (normalized.BND >= 50 || normalized.STN >= 50 || normalized.TST >= 55) &&
      sourcePedigreeEvidence <= 1 &&
      !explicitToolOrAntiEmptySource;
    const lowGroundingNoisePosture =
      normalized.NOI >= 40 &&
      normalized.BND < 35 &&
      normalized.STN < 35 &&
      normalized.GRD < 30 &&
      sourcePedigreeEvidence <= 1;
    const polishedOverclaimPosture =
      normalized.EXP <= 16 &&
      normalized.SKL <= 14 &&
      normalized.NOI >= 35 &&
      normalized.BND >= 72 &&
      normalized.STN >= 72 &&
      (normalized.CXT >= 72 || normalized.GEN >= 82);
    const matureNoSourceOverclaim =
      normalized.EXP <= 14 &&
      normalized.NOI >= 50 &&
      normalized.BND >= 78 &&
      normalized.STN >= 76 &&
      normalized.TST >= 60 &&
      specific <= 1 &&
      concreteCriticalTaste <= 2 &&
      generationEvidence <= 2;
    const highPostureNoSource =
      normalized.EXP <= 8 &&
      normalized.SKL <= 12 &&
      normalized.NOI >= 30 &&
      normalized.BND >= 82 &&
      normalized.STN >= 80 &&
      normalized.TST >= 74 &&
      specific <= 1;
    const matureValuePostureNoSource =
      highPolishDensity &&
      matureAnswerCount >= 8 &&
      normalized.EXP <= 32 &&
      normalized.SKL <= 25 &&
      normalized.NOI <= 28 &&
      normalized.BND >= 60 &&
      normalized.STN >= 60 &&
      ((evidence.mature_judgment || 0) + (evidence.judgment_and_consequence || 0)) >= 12 &&
      valueEvidence + generationEvidence >= 6 &&
      sourcePedigreeEvidence <= 1 &&
      !strongCreativeSource &&
      !creativeDirectionSignature &&
      !creativeReframeSignature &&
      !explicitToolOrAntiEmptySource;
    const maturePerformanceRiskSignature =
      ((evidence.mature_judgment || 0) + (evidence.judgment_and_consequence || 0)) >= 13 &&
      normalized.EXP <= 45 &&
      normalized.SKL <= 30 &&
      normalized.TLB <= 25 &&
      normalized.BND >= 58 &&
      normalized.STN >= 58 &&
      valueEvidence >= 3 &&
      (professionalPolish >= 2 || normalized.NOI >= 25 || normalized.GRD >= 64 || sourcePedigreeEvidence === 0) &&
      !genuineStrategicBoundary &&
      !genuineBoundaryContext &&
      !strongBoundaryHumanSignature &&
      !strongValueGuardSignature &&
      !creativeDirectionSignature &&
      !creativeReframeSignature &&
      !explicitToolOrAntiEmptySource;
    const maturePackagingRiskSignature =
      ((evidence.mature_judgment || 0) + (evidence.judgment_and_consequence || 0)) >= 14 &&
      professionalPolish >= 4 &&
      sourcePedigreeEvidence <= 1 &&
      normalized.EXP <= 45 &&
      normalized.SKL <= 30 &&
      normalized.TLB <= 25 &&
      normalized.BND >= 58 &&
      normalized.STN >= 55 &&
      !strongBoundaryHumanSignature &&
      !strongValueGuardSignature &&
      !creativeDirectionSignature &&
      !creativeReframeSignature &&
      !explicitToolOrAntiEmptySource;
    const sourceBackedExperience =
      specific >= 2 &&
      normalized.GRD >= 42 &&
      normalized.EXP >= 10 &&
      evidenceScore(evidence, ["expression_lag", "source_and_experience_gap", "signal_conditions"]) >= 1;
    if ((!sourceBackedExperience && !collaborativeSource && (polishedLowSourceDetector || lowSourceToolPolish || lowSourcePolishedPosture || matureWithoutSource || polishedToolPosture || polishedBoundaryPosture || polishedEmptyPosture || lowExpressionNoisePosture || lowGroundingNoisePosture || polishedOverclaimPosture || matureNoSourceOverclaim || highPostureNoSource)) || matureValuePostureNoSource || maturePerformanceRiskSignature || maturePackagingRiskSignature) {
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
    if (strongBoundaryHumanSignature) {
      const index = risks.indexOf("polished_answer_risk");
      if (index >= 0) risks.splice(index, 1);
    }
    if (strongValueGuardSignature) {
      const index = risks.indexOf("polished_answer_risk");
      if (index >= 0) risks.splice(index, 1);
    }
    const lowExpressionOverclaim =
      normalized.EXP <= 12 &&
      normalized.SKL <= 12 &&
      CORE_METRICS.filter((metric) => normalized[metric] >= 82).length >= 5 &&
      sourcePedigreeEvidence <= 2;
    const lowTransferMatureOverclaim =
      normalized.EXP <= 22 &&
      normalized.SKL <= 12 &&
      CORE_METRICS.filter((metric) => normalized[metric] >= 82).length >= 5 &&
      sourcePedigreeEvidence <= 2 &&
      generationEvidence >= 5 &&
      valueEvidence >= 3 &&
      (normalized.NOI >= 18 || professionalPolish + noiseEvidence >= 3 || matureAnswerCount / Math.max(this.state.answers.length, 1) >= 0.55) &&
      !creativeDirectionSignature &&
      !creativeReframeSignature;
    const lowExpressionNoiseOverclaim =
      normalized.NOI >= 20 &&
      normalized.EXP <= 22 &&
      normalized.GEN >= 35 &&
      normalized.GRD < 30 &&
      sourcePedigreeEvidence <= 1;
    const expressiveGenerationOverclaim =
      normalized.EXP >= 24 &&
      normalized.SKL <= 18 &&
      sourcePedigreeEvidence + boundaryEvidence + concreteCriticalTaste + aiJudgmentReserved <= 2 &&
      generationEvidence + valueEvidence >= 10 &&
      (professionalPolish >= 1 || matureAnswerCount >= 8 || normalized.NOI >= 20);
    const lowCoreProfessionalShell =
      CORE_METRICS.reduce((sum, metric) => sum + (normalized[metric] || 0), 0) / CORE_METRICS.length < 36 &&
      normalized.EXP >= 45 &&
      normalized.TST >= 45 &&
      normalized.STN < 35 &&
      normalized.GRD < 25;
    if (!risks.includes("polished_answer_risk") && (lowExpressionOverclaim || lowTransferMatureOverclaim || lowExpressionNoiseOverclaim || expressiveGenerationOverclaim || lowCoreProfessionalShell)) {
      risks.push("polished_answer_risk");
    }
    if (!risks.includes("polished_answer_risk") && this.structuralTendency(normalized).misreadRisk) {
      risks.push("polished_answer_risk");
    }
    const denseHuman = this.highDensityHumanEvidence(normalized);
    if (denseHuman.qualified) {
      const index = risks.indexOf("polished_answer_risk");
      if (index >= 0) risks.splice(index, 1);
    }
    const estimatedScore = this.estimateBaseScore(normalized);
    if (estimatedScore >= 35 && estimatedScore <= 44 && normalized.SKL >= 62 && normalized.NOI < 40) risks.push("low_band_flattening_risk");
    if (updateState) this.state.openRisks = risks;
    return risks;
  }

  sortedLabels(normalized = this.getNormalizedScores()) {
    const flags = this.signalFlags(normalized);
    const evidence = this.state.evidenceCounts;
    const structure = this.structuralTendency(normalized);
    const exclusions = new Map(this.labelExclusionRules.map((rule) => [rule.label, rule.blockedWhenAny || []]));
    return Object.entries(this.state.labelConfidence)
      .map(([label, value]) => {
        const priorityBoost = ((this.labelPriority.get(label) ?? 55) - 55) * 0.045;
        const rule = this.labelRules[label];
        const evidenceBoost = (rule?.supportingEvidence || []).reduce((sum, tag) => sum + Math.min(evidence[tag] || 0, 2) * 0.55, 0);
        const specificBoost = this.specificLabelBoost(label, normalized);
        const structureFit = this.structureLabelFit(label, structure, normalized);
        const blocked = (exclusions.get(label) || []).some((flag) => flags[flag]);
        const exclusionPenalty = blocked ? 4 : 0;
        const fallbackPenalty = this.fallbackLabelPenalty(label, normalized);
        return [label, value + priorityBoost + evidenceBoost + specificBoost + structureFit - exclusionPenalty - fallbackPenalty];
      })
      .sort((left, right) => right[1] - left[1]);
  }

  structureLabelFit(label, structure, normalized = this.getNormalizedScores()) {
    if (!structure) return 0;
    const evidence = structure.evidenceGroups || {};
    if (label === "high_density_human") {
      const denseHuman = this.highDensityHumanEvidence(normalized, structure);
      if (denseHuman.elite) return 14;
      if (denseHuman.qualified) return 8;
      if (structure.highCoreCount >= 5 && structure.coreAverage >= 86 && normalized.NOI <= 18 && evidence.polish === 0) return 3.5;
      return 0;
    }
    if (label === "value_low_generation") {
      let fit = 0;
      const valueDominant = evidence.value >= 4 && evidence.generation <= 3 && normalized.GEN < 68;
      if (structure.top === "boundary_value_judgment" && valueDominant) fit += 2.8;
      if (structure.top === "generative_reframe" && evidence.generation >= 4 && normalized.GEN >= 72) fit -= 8.5;
      if (structure.top === "performative_mature" && structure.sourceIntegrity < 0.36) fit -= 6;
      if ((structure.top === "tool_amplified" || normalized.TLB >= 70) && normalized.GEN < 70) fit -= 3.5;
      if (!valueDominant && evidence.generation >= evidence.value && normalized.GEN >= 72) fit -= 3;
      if (structure.top === "process_distillable" && evidence.process >= 3 && normalized.STN < 60) fit -= 4.2;
      if (structure.top === "noise_resistance" && normalized.NOI >= 70 && normalized.EXP <= 12) fit -= 8;
      return fit;
    }
    if (label === "boundary_radar") {
      let fit = 0;
      const boundaryDominant = evidence.boundary >= 3 || (evidence.boundary >= 2 && structure.top === "boundary_value_judgment");
      if (boundaryDominant) fit += 1.8;
      if (normalized.BND >= 55 && normalized.STN >= 55 && normalized.GRD >= 60 && normalized.EXP >= 50 && normalized.GEN < 20) fit += 7.2;
      if (structure.top === "performative_mature" && structure.sourceIntegrity < 0.36) fit -= 7;
      if (structure.top === "generative_reframe" && evidence.generation >= 4 && evidence.boundary < 3) fit -= 5;
      if (structure.top === "noise_resistance" && evidence.noise + evidence.polish >= 3) fit -= 4;
      if (structure.top === "noise_resistance" && normalized.NOI >= 75 && normalized.EXP <= 12) fit -= 12;
      if (normalized.NOI >= 20 && normalized.EXP <= 15 && normalized.STN < 95) fit -= 8;
      return fit;
    }
    if (label === "generative_reframer" && structure.top === "generative_reframe") {
      const weakAnchors = (evidence.source || 0) + (evidence.boundary || 0) + (evidence.taste || 0) + (evidence.aiBoundary || 0);
      if (evidence.generation >= 6 && weakAnchors <= 2 && normalized.EXP >= 24 && normalized.SKL <= 18) return -12;
      return evidence.generation >= 4 ? 3.8 : 1.8;
    }
    if (label === "generative_reframer" && normalized.NOI >= 70 && normalized.EXP <= 12) {
      return -10;
    }
    if (label === "generative_reframer" && normalized.BND < 36 && normalized.STN < 36 && normalized.GRD < 45) {
      return -14;
    }
    if (label === "generative_reframer" && normalized.EXP >= 70 && normalized.BND < 45 && normalized.STN < 40) {
      return -18;
    }
    if (label === "generative_reframer" && evidence.generation < 4 && normalized.GEN < 72) {
      return -4.5;
    }
    if (label === "skill_friendly" && structure.top === "process_distillable") {
      return evidence.process >= 3 && normalized.SKL >= 28 ? 5.2 : 2.4;
    }
    if (label === "method_distilled" && structure.top === "process_distillable") {
      return evidence.process >= 3 && normalized.EXP >= 35 ? 5.8 : 2.2;
    }
    if (label === "method_distilled" && normalized.SKL >= 35 && normalized.EXP >= 45 && normalized.BND >= 35 && normalized.GEN < 35) {
      return 5.4;
    }
    if (label === "method_distilled" && normalized.TLB >= 75 && normalized.GRD >= 55 && normalized.BND >= 45 && normalized.SKL >= 15 && normalized.EXP >= 25) {
      return 10.2;
    }
    if (label === "teachable_irreplaceable" && structure.top === "process_distillable") {
      return evidence.process >= 3 && normalized.EXP >= 45 && normalized.BND >= 32 ? 2.6 : 0.8;
    }
    if (label === "teachable_irreplaceable" && normalized.BND >= 80 && normalized.STN >= 80 && normalized.GRD >= 65 && normalized.EXP >= 43 && normalized.SKL < 18 && normalized.GEN <= 55) {
      return 12.4;
    }
    if (label === "teachable_irreplaceable" && normalized.BND >= 44 && normalized.STN >= 40 && normalized.GRD >= 60 && normalized.EXP >= 38 && normalized.SKL <= 18 && normalized.GEN <= 15) {
      return 7.2;
    }
    if (label === "method_distilled" && normalized.BND >= 78 && normalized.STN >= 78 && normalized.GRD >= 60 && normalized.EXP >= 45 && normalized.SKL <= 18 && normalized.GEN <= 58) {
      return evidence.process >= 1 || evidence.source >= 2 ? 4.8 : 2.8;
    }
    if (label === "expressive_high" && (structure.top === "expressive_transfer" || structure.top === "process_distillable")) {
      return normalized.EXP >= 55 && evidence.process + evidence.source < 8 ? 3.6 : 1.2;
    }
    if (label === "expressive_high" && normalized.EXP >= 70 && normalized.CXT >= 70 && normalized.BND < 45 && normalized.STN < 40) {
      return 24;
    }
    if (label === "relationship_stabilizer") {
      const relationshipEvidence = evidenceScore(this.state.evidenceCounts, [
        "condition_clarification",
        "context_signal",
        "expression_signal",
        "pause_to_identify_reason",
        "audience_need_check",
        "value_signal",
      ]);
      const serviceCoordination =
        normalized.CXT >= 88 &&
        structure.typeProfile.conditionDensity >= 0.08 &&
        (evidence.process >= 1 || relationshipEvidence >= 3) &&
        normalized.NOI <= 35;
      if (serviceCoordination) return normalized.EXP >= 38 ? 13.5 : 9.5;
      if ((structure.top === "expressive_transfer" || normalized.EXP >= 38) && relationshipEvidence >= 4 && normalized.GEN < 74) return 4.2;
      if (relationshipEvidence >= 3 && normalized.CXT >= 42 && normalized.GEN < 70) return 2.4;
      if (this.serviceTranslationSignature(structure, normalized)) return 8.6;
      if (normalized.CXT >= 85 && normalized.BND >= 70 && normalized.STN >= 70 && normalized.SKL < 12 && normalized.GEN < 95) return 9;
    }
    if (label === "context_reader") {
      const contextEvidence = evidenceScore(this.state.evidenceCounts, ["condition_clarification", "context_signal", "pause_to_identify_reason", "audience_need_check"]);
      const serviceCoordination =
        normalized.CXT >= 88 &&
        structure.typeProfile.conditionDensity >= 0.08 &&
        (evidence.process >= 1 || contextEvidence >= 3) &&
        normalized.NOI <= 35;
      if (serviceCoordination) return normalized.EXP >= 38 ? 12 : 8.5;
      if ((structure.top === "expressive_transfer" || normalized.EXP >= 38) && contextEvidence >= 3 && normalized.CXT >= 38) return 3.4;
      if (this.serviceTranslationSignature(structure, normalized)) return 8.8;
      if (normalized.CXT >= 85 && normalized.BND >= 70 && normalized.STN >= 70 && normalized.SKL < 12 && normalized.GEN < 95) return 8.2;
    }
    if (label === "empty_professional_detector" && structure.top === "performative_mature") {
      return evidence.polish + evidence.noise + evidence.taste >= 3 ? 5.4 : 2.2;
    }
    if (label === "fake_resistance" && (structure.top === "noise_resistance" || structure.misreadRisk)) {
      if (normalized.NOI >= 75 && normalized.EXP <= 12) return 9.5;
      return evidence.noise + evidence.polish >= 3 ? 3.2 : 1.4;
    }
    if (label === "fake_resistance" && evidence.noise + evidence.polish >= 3 && normalized.NOI >= 18 && normalized.EXP <= 28 && normalized.SKL <= 18) {
      return 8.4;
    }
    if (label === "fake_resistance" && normalized.NOI >= 28 && normalized.BND < 40 && normalized.STN < 38 && normalized.GRD < 65) {
      return 12;
    }
    if (label === "empty_professional_detector" && evidence.taste + evidence.polish + evidence.noise >= 3 && normalized.TST >= 76 && normalized.SKL <= 18) {
      return 5.6;
    }
    if (label === "fake_resistance" && normalized.NOI >= 30 && normalized.EXP <= 22 && normalized.TLB >= 75) {
      return 14;
    }
    if (label === "fake_resistance" && normalized.NOI >= 75 && normalized.EXP <= 20) {
      return 8;
    }
    if (label === "taste_low_expression" && normalized.TST >= 85 && normalized.EXP <= 20 && normalized.NOI >= 20 && normalized.SKL < 10 && normalized.STN < 95) {
      return 7.2;
    }
    if (label === "fake_resistance" && normalized.NOI >= 28 && normalized.BND < 40 && normalized.STN < 35) {
      return 3.2;
    }
    if (label === "fake_resistance" && normalized.NOI >= 40 && normalized.BND < 35 && normalized.STN < 35 && normalized.GRD < 30) {
      return 5.4;
    }
    if ((label === "intuition_grounded" || label === "grounded_experience") && normalized.NOI >= 70 && normalized.EXP <= 12) {
      return -7;
    }
    if ((label === "intuition_grounded" || label === "grounded_experience") && normalized.NOI >= 20 && normalized.EXP <= 15 && normalized.STN < 95) {
      return -6;
    }
    if ((label === "intuition_grounded" || label === "grounded_experience") && structure.top === "source_backed_experience") {
      return evidence.source >= 2 ? 2.6 : 1.2;
    }
    if (label === "ai_amplified_professional" && evidence.aiBoundary >= 2 && normalized.TLB >= 70 && normalized.GEN >= 65) {
      return 12;
    }
    if (label === "ai_amplified_professional" && (structure.top === "tool_amplified" || normalized.TLB >= 70)) {
      return evidence.aiBoundary >= 1 || normalized.TLB >= 70 ? 3.4 : 1.4;
    }
    return 0;
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
        (normalized.GEN >= 78 && normalized.TST >= 55 ? 1.1 : 0) +
        evidenceScore(evidence, ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"], 1.18),
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
        (normalized.GRD >= 58 && evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions"]) >= 2 ? 1.2 : 0) +
        evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions"], 0.92),
      grounded_experience:
        (normalized.GRD >= 58 && normalized.SKL <= 28 ? 0.9 : 0) +
        (normalized.GRD >= 52 && evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment"]) >= 2 ? 1.4 : 0) +
        evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions", "experience_signal_calibrated"], 0.84),
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
        (normalized.STN >= 62 && evidenceScore(evidence, ["risk_with_alternative", "value_signal"]) >= 2 && normalized.GEN < 75 ? 1.3 : 0) +
        evidenceScore(evidence, ["risk_with_alternative", "compliance_first", "value_signal"], 0.86) +
        evidenceScore(evidence, ["ai_judgment_outsource_risk", "ai_kept_away_from_core"], 0.22),
      taste_low_expression:
        (normalized.TST >= 52 && normalized.EXP < 50 ? 0.7 : 0) +
        (normalized.TST >= 55 && normalized.EXP < 35 && normalized.GRD >= 42 ? 1.4 : 0) +
        evidenceScore(evidence, ["expression_lag", "specific_experience", "case_validated", "source_and_experience_gap"], 0.88),
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
      const generativeEvidence = evidenceScore(evidence, ["problem_reframed", "practical_rework", "target_relevance_cleanup", "judgment_selection_gap"]);
      const experienceSourceEvidence = evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions"]);
      const valueGuardEvidence = evidenceScore(evidence, ["risk_with_alternative", "value_signal"]);
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
      if (normalized.GEN >= 76 && normalized.TST >= 52 && generativeEvidence >= 2) return 6.4;
      if (normalized.GRD >= 58 && experienceSourceEvidence >= 2 && normalized.BND < 72) return 5.4;
      if (normalized.STN >= 62 && normalized.GEN < 70 && valueGuardEvidence >= 2) return 4.8;
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
    if (label === "fake_resistance") {
      const experienceSourceEvidence = evidenceScore(evidence, ["specific_experience", "case_validated", "failure_boundary", "failure_refined_judgment", "signal_conditions"]);
      const expressionEvidence = evidenceScore(evidence, ["expression_lag", "source_and_experience_gap"]);
      if (experienceSourceEvidence >= 2 && normalized.GRD >= 42) return 5.2;
      if (expressionEvidence >= 1 && normalized.TST >= 55 && normalized.GRD >= 35) return 4.6;
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
      const noiseEvidence = evidenceScore(evidence, ["noi_signal", "refuses_explanation", "personal_feeling_without_basis", "complexity_feeling_unclear"]);
      if (normalized.STN < 58 && hardValue < 1) return 4.8;
      if (normalized.NOI >= 24 && normalized.EXP <= 20 && normalized.TST >= 55 && noiseEvidence >= 1) return 4.6;
      if (normalized.NOI >= 20 && criticalTaste >= 1 && hardValue <= 1) return 3.8;
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
    if (answered < this.flow.screeningCount) return `先凭直觉答 ${answered + 1}/${this.flow.screeningCount}`;
    if (this.state.currentStage === "split") return "再分清几种相近反应";
    if (this.state.currentStage === "countercheck") return "换个方向确认一次";
    if (answered >= this.flow.minimumQuestions) return "快问完了";
    return "顺着你的答案继续问";
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
      plainMeaning: "你的个人判断还在慢慢成形，这次没有急着露出一个特别鲜明的方向。",
      shareLine: "我的人味没消失，只是还在慢慢开机。",
      resonance: "你能把事情做下去，但问到为什么这样选时，自己的取舍还不总是站到台前。",
      misunderstanding: "待开机不等于没有想法，只是这次答案里还看不出一条稳定的个人路线。",
      growthNudge: "从一个最熟的任务开始，记下你临时改动的地方和原因。判断常常藏在这些小偏离里。",
      playfulAside: "系统没有坏，个性化插件还在后台加载。",
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
      structureTendency: estimate.structureTendency,
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
    const denseHuman = this.highDensityHumanEvidence(normalized);
    let penalty = 0;
    if (risks.includes("polished_answer_risk") && !denseHuman.qualified) penalty += 8;
    if (this.scoreSuppressionRisk(normalized) && !denseHuman.qualified) penalty += 8;
    penalty += this.structuralScorePenalty(normalized);
    if (risks.includes("ai_underrecognized_risk")) penalty -= 1.5;
    return penalty;
  }

  applyScoreCalibration(score, normalized = this.getNormalizedScores(), includeRiskPenalty = true) {
    const calibration = this.config.scoreCalibration || {};
    let calibrated = score;
    const denseHuman = this.highDensityHumanEvidence(normalized);
    const structuralPenalty = includeRiskPenalty ? this.structuralScorePenalty(normalized) : 0;
    const polishedRiskOpen =
      includeRiskPenalty &&
      (this.openRisks(normalized, false).includes("polished_answer_risk") ||
        this.scoreSuppressionRisk(normalized) ||
        structuralPenalty >= 12);
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
    if (denseHuman.qualified) {
      calibrated = Math.max(calibrated, denseHuman.scoreFloor);
      if (denseHuman.elite) calibrated = Math.max(calibrated, calibration.peakScoreAccess?.minimumScore ?? 90);
      calibrated = Math.min(calibrated, calibration.peakScoreAccess?.cap ?? 98);
    }
    if (includeRiskPenalty) calibrated = this.applyRiskScoreEffects(calibrated, normalized);
    calibrated = this.applyStructureCaps(calibrated, normalized);
    if (structuralPenalty >= 20) {
      const structure = this.structuralTendency(normalized);
      const evidence = structure.evidenceGroups || {};
      const proceduralCap = structure.sourceIntegrity < 0.22 && evidence.process >= 2 && evidence.value >= 5 && evidence.generation <= 2 && normalized.GEN < 55;
      const hardCap = proceduralCap || (structure.sourceIntegrity < 0.36 && evidence.polish + evidence.noise >= 2) ? 62 : 79;
      calibrated = Math.min(calibrated, hardCap);
    }
    return calibrated;
  }

  applyStructureCaps(score, normalized = this.getNormalizedScores()) {
    const evidence = this.state.evidenceCounts;
    let adjusted = score;
    const structure = this.structuralTendency(normalized);
    const denseHuman = this.highDensityHumanEvidence(normalized, structure);
    const highScoreAccess = this.highScoreEvidenceAccess(normalized, structure);
    const groundedGenerationEvidence = evidenceScore(evidence, [
      "risk_with_alternative",
      "failure_boundary",
      "failure_refined_judgment",
      "signal_conditions",
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "specific_experience",
      "case_validated",
    ]);
    const ungroundedHighGeneration =
      normalized.CXT >= 75 &&
      normalized.GEN >= 82 &&
      normalized.TST >= 70 &&
      normalized.BND < 62 &&
      normalized.STN < 58 &&
      normalized.EXP < 24 &&
      groundedGenerationEvidence <= 4;
    if (ungroundedHighGeneration) {
      adjusted = Math.min(adjusted, normalized.NOI >= 35 ? 48 : 54);
    }
    const pointGenerationWithoutGuards =
      normalized.GEN >= 82 &&
      normalized.TST >= 70 &&
      normalized.BND < 60 &&
      normalized.STN < 58 &&
      (normalized.EXP < 32 || normalized.GRD < 45) &&
      (normalized.CXT >= 75 || (normalized.GEN >= 92 && normalized.GRD < 38)) &&
      !(normalized.EXP >= 60 && normalized.TLB >= 50 && normalized.TST >= 80);
    if (pointGenerationWithoutGuards) {
      adjusted = Math.min(adjusted, normalized.NOI >= 35 ? 48 : 54);
    }
    const expressiveGenerationLowGuard =
      normalized.EXP >= 70 &&
      normalized.GEN >= 75 &&
      normalized.CXT >= 70 &&
      normalized.BND < 36 &&
      normalized.STN < 36;
    if (expressiveGenerationLowGuard) {
      adjusted = Math.min(adjusted, 54);
    }
    const lowCoreProcessDistillable =
      structure.top === "process_distillable" &&
      structure.coreAverage < 42 &&
      normalized.BND < 45 &&
      normalized.STN < 42 &&
      normalized.GRD < 45 &&
      normalized.SKL < 58;
    if (lowCoreProcessDistillable) {
      adjusted = Math.min(adjusted, 44);
    }
    const weakTransferHighCore =
      structure.highCoreCount >= 5 &&
      structure.sourceIntegrity < 0.36 &&
      normalized.SKL < 18 &&
      normalized.EXP < 45 &&
      structure.typeProfile.matureDensity >= 0.5;
    if (weakTransferHighCore && !denseHuman.qualified) {
      const concreteSource = evidenceScore(evidence, [
        "specific_experience",
        "case_validated",
        "failure_boundary",
        "failure_refined_judgment",
        "updates_judgment_conditions",
        "tool_boundary",
        "ai_options_human_decision",
        "ai_challenges_but_human_decides",
      ]);
      const strongCreativeTrace =
        normalized.CXT >= 85 &&
        ((normalized.GEN >= 90 && normalized.TST >= 85) || (normalized.GEN >= 88 && normalized.TST >= 95)) &&
        normalized.GRD >= 70 &&
        normalized.EXP >= 18;
      const cap = normalized.NOI >= 18 && !strongCreativeTrace ? 54 : concreteSource >= 5 || normalized.TLB >= 72 || strongCreativeTrace ? 74 : normalized.EXP >= 32 ? 68 : 62;
      adjusted = Math.min(adjusted, cap);
    }
    const narrowValueGuardOverclaim =
      normalized.BND >= 78 &&
      normalized.STN >= 78 &&
      normalized.GEN < 35 &&
      normalized.CXT < 50 &&
      normalized.SKL < 22 &&
      structure.sourceIntegrity < 0.45;
    if (narrowValueGuardOverclaim) {
      adjusted = Math.min(adjusted, 54);
    }
    const proceduralValueOverclaim =
      normalized.BND >= 90 &&
      normalized.STN >= 90 &&
      normalized.GEN <= 55 &&
      structure.sourceIntegrity < 0.12;
    if (proceduralValueOverclaim) {
      adjusted = Math.min(adjusted, 54);
    }
    const earlyValueBoundaryOverclaim =
      normalized.CXT < 80 &&
      normalized.GEN < 72 &&
      normalized.SKL < 18 &&
      normalized.BND >= 70 &&
      normalized.STN >= 70 &&
      structure.evidenceGroups.value >= 5 &&
      structure.evidenceGroups.source + structure.evidenceGroups.boundary + structure.evidenceGroups.generation <= 5;
    if (earlyValueBoundaryOverclaim) {
      adjusted = Math.min(adjusted, 54);
    }
    const highCoreLowSkillPackaging =
      structure.highCoreCount >= 4 &&
      normalized.SKL < 10 &&
      normalized.EXP < 45 &&
      normalized.BND >= 96 &&
      normalized.STN >= 96 &&
      structure.sourceIntegrity < 0.28;
    if (highCoreLowSkillPackaging) {
      adjusted = denseHuman.qualified ? Math.max(adjusted, denseHuman.scoreFloor) : Math.min(adjusted, 74);
    }
    const valuePackagingWithoutTransfer =
      normalized.BND >= 96 &&
      normalized.STN >= 96 &&
      normalized.TST >= 75 &&
      normalized.GEN < 72 &&
      normalized.SKL < 10 &&
      normalized.EXP < 45 &&
      structure.sourceIntegrity < 0.3;
    if (valuePackagingWithoutTransfer) {
      adjusted = denseHuman.qualified ? Math.max(adjusted, denseHuman.scoreFloor) : Math.min(adjusted, 74);
    }
    const highCoreServicePackaging =
      structure.highCoreCount >= 5 &&
      normalized.SKL < 10 &&
      normalized.EXP >= 55 &&
      normalized.BND < 80 &&
      normalized.STN < 80;
    if (highCoreServicePackaging) {
      adjusted = Math.min(adjusted, 64);
    }
    const highContextServicePackaging =
      structure.highCoreCount >= 5 &&
      normalized.CXT >= 90 &&
      normalized.SKL < 10 &&
      normalized.EXP >= 50 &&
      normalized.BND >= 70 &&
      normalized.STN >= 70;
    if (highContextServicePackaging) {
      adjusted = Math.min(adjusted, 64);
    }
    const lowCoreTransferInflation =
      adjusted > 44 &&
      structure.coreAverage < 46 &&
      normalized.SKL >= 25 &&
      normalized.EXP >= 45 &&
      normalized.BND < 55 &&
      normalized.STN < 55 &&
      normalized.GRD < 55;
    if (lowCoreTransferInflation) {
      adjusted = Math.min(adjusted, 44);
    }
    const toolOnlyInflation =
      adjusted > 54 &&
      normalized.TLB >= 75 &&
      normalized.BND < 55 &&
      normalized.STN < 55 &&
      normalized.SKL < 35 &&
      normalized.EXP < 45 &&
      !(normalized.GEN >= 70 && normalized.TST >= 80);
    if (toolOnlyInflation) {
      adjusted = Math.min(adjusted, 54);
    }
    const expressiveProcessLowGuard =
      adjusted > 54 &&
      normalized.EXP >= 70 &&
      normalized.SKL >= 40 &&
      normalized.BND < 35 &&
      normalized.STN < 35 &&
      structure.evidenceGroups.process >= 2;
    if (expressiveProcessLowGuard) {
      adjusted = Math.min(adjusted, 54);
    }
    const shallowContextReframe =
      adjusted > 64 &&
      normalized.CXT >= 85 &&
      normalized.GEN >= 90 &&
      normalized.TST >= 85 &&
      normalized.BND < 60 &&
      normalized.STN < 60 &&
      structure.evidenceGroups.source === 0 &&
      structure.evidenceGroups.taste === 0 &&
      structure.evidenceGroups.aiBoundary === 0 &&
      structure.evidenceGroups.process >= 2;
    if (shallowContextReframe) {
      adjusted = Math.min(adjusted, 64);
    }
    const isolatedBoundaryInflation =
      adjusted > 54 &&
      normalized.CXT < 30 &&
      normalized.SKL < 18 &&
      normalized.EXP < 32 &&
      normalized.GRD < 55 &&
      normalized.BND >= 60 &&
      normalized.STN >= 60;
    if (isolatedBoundaryInflation) {
      adjusted = Math.min(adjusted, 54);
    }
    const lowContextExperienceNoise =
      adjusted > 54 &&
      normalized.CXT < 12 &&
      normalized.BND >= 44 &&
      normalized.STN >= 40 &&
      normalized.GRD >= 60 &&
      normalized.EXP <= 45 &&
      normalized.NOI >= 35;
    if (lowContextExperienceNoise) {
      adjusted = Math.min(adjusted, 54);
    }
    const toolPeakLowCreative =
      adjusted > 74 &&
      normalized.CXT < 50 &&
      normalized.GEN < 45 &&
      normalized.TST < 50 &&
      normalized.TLB >= 75 &&
      structure.evidenceGroups.generation <= 2 &&
      structure.evidenceGroups.taste === 0;
    if (toolPeakLowCreative) {
      adjusted = Math.min(adjusted, 74);
    }
    const complianceProcessCap =
      adjusted > 54 &&
      normalized.CXT < 70 &&
      normalized.GEN < 65 &&
      normalized.TST < 70 &&
      normalized.BND >= 90 &&
      normalized.STN >= 90 &&
      structure.evidenceGroups.process >= 2 &&
      structure.evidenceGroups.source === 0 &&
      structure.evidenceGroups.taste === 0;
    if (complianceProcessCap) {
      adjusted = Math.min(adjusted, 54);
    }
    const peakWithoutSourceDifferentiator =
      adjusted > 90 &&
      structure.highCoreCount >= 4 &&
      normalized.SKL < 12 &&
      structure.evidenceGroups.source === 0 &&
      (structure.evidenceGroups.polish >= 2 || structure.evidenceGroups.generation <= 4 || normalized.CXT < 80);
    if (peakWithoutSourceDifferentiator) {
      adjusted = Math.min(adjusted, denseHuman.qualified ? Math.max(denseHuman.scoreFloor, 84) : 84);
    }
    const valueGuardFloor =
      normalized.BND >= 64 &&
      normalized.BND <= 82 &&
      normalized.STN >= 60 &&
      normalized.STN <= 82 &&
      normalized.GEN < 30 &&
      normalized.SKL < 25 &&
      structure.evidenceGroups.value >= 4 &&
      normalized.NOI <= 25;
    if (valueGuardFloor) adjusted = Math.max(adjusted, 55);
    const coordinationProcessFloor =
      structure.typeProfile.conditionDensity >= 0.3 &&
      structure.typeProfile.processDensity >= 0.09 &&
      normalized.EXP >= 25 &&
      structure.evidenceGroups.value >= 5 &&
      normalized.NOI <= 35;
    if (coordinationProcessFloor) adjusted = Math.max(adjusted, 44);
    const contextCoordinationFloor =
      normalized.CXT >= 44 &&
      normalized.BND >= 44 &&
      normalized.GEN >= 40 &&
      structure.evidenceGroups.generation >= 4 &&
      structure.evidenceGroups.value >= 4 &&
      structure.typeProfile.conditionDensity >= 0.18 &&
      normalized.NOI <= 35;
    if (contextCoordinationFloor) adjusted = Math.max(adjusted, 45);
    const semanticCreativeReframe =
      normalized.CXT >= 80 &&
      normalized.GEN >= 90 &&
      normalized.TST >= 80 &&
      structure.coreAverage <= 88 &&
      normalized.BND >= 45 &&
      normalized.STN >= 45 &&
      structure.evidenceGroups.generation >= 8 &&
      (structure.evidenceGroups.value >= 4 || normalized.TLB >= 80) &&
      normalized.NOI <= 35 &&
      structure.evidenceGroups.process <= 2 &&
      structure.evidenceGroups.polish <= 1;
    if (semanticCreativeReframe) {
      const peakCreative =
        normalized.CXT >= 90 &&
        normalized.GEN >= 98 &&
        normalized.TST >= 90 &&
        normalized.BND >= 70 &&
        normalized.STN >= 70 &&
        structure.evidenceGroups.generation >= 8 &&
        structure.evidenceGroups.value >= 6;
      adjusted = Math.max(adjusted, peakCreative ? 90 : 65);
    }
    if (highScoreAccess.semanticDenseReframe) adjusted = Math.max(adjusted, 90);
    if (denseHuman.qualified) adjusted = Math.max(adjusted, denseHuman.scoreFloor);
    if (highScoreAccess.creativeTasteEvidence) adjusted = Math.max(adjusted, 68);
    if (adjusted > 89 && !highScoreAccess.peak90) adjusted = Math.min(adjusted, highScoreAccess.key80 ? 84 : 74);
    if (adjusted > 79 && !highScoreAccess.key80) adjusted = Math.min(adjusted, 74);
    return adjusted;
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
    const valueGuardEvidence = evidenceScore(evidence, ["value_signal", "risk_with_alternative"]);
    const expressionLagEvidence = evidenceScore(evidence, ["expression_lag", "source_and_experience_gap"]);
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
      "case_explanation",
      "knows_experience_failure_boundary",
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
    const sourcePedigreeEvidence = evidenceScore(evidence, [
      "specific_experience",
      "case_validated",
      "case_explanation",
      "knows_experience_failure_boundary",
      "failure_refined_judgment",
    ]);
    const toolAntiEmptyEvidence = evidenceScore(evidence, [
      "tool_boundary",
      "ai_options_human_decision",
      "ai_challenges_but_human_decides",
      "anti_empty_professionalism",
      "cliche_without_judgment",
      "ai_empty_judgment_check",
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
    if (
      !hasPolishedRisk &&
      normalized.NOI <= 28 &&
      normalized.BND >= 62 &&
      normalized.STN >= 60 &&
      normalized.GEN <= 24 &&
      valueGuardEvidence >= 3 &&
      hasTopLabel(["value_low_generation", "boundary_radar"])
    ) {
      adjusted = Math.max(adjusted, normalized.GRD >= 56 || normalized.TST >= 52 ? 58 : 55);
    }
    if (
      normalized.NOI <= 48 &&
      normalized.BND >= 62 &&
      normalized.STN >= 60 &&
      normalized.GEN <= 15 &&
      valueGuardEvidence >= 3 &&
      hasTopLabel(["value_low_generation", "boundary_radar"])
    ) {
      adjusted = Math.max(adjusted, hasPolishedRisk ? 55 : 58);
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
    if (!hasPolishedRisk && normalized.NOI <= 82 && experienceEvidence >= 2 && normalized.GRD >= 45 && normalized.TST >= 55) {
      adjusted = Math.max(adjusted, 45);
    }
    if (!hasPolishedRisk && normalized.NOI <= 82 && experienceEvidence >= 2 && normalized.GRD >= 40 && normalized.TST >= 55 && normalized.EXP >= 18) {
      adjusted = Math.max(adjusted, 45);
    }
    if (!hasPolishedRisk && normalized.NOI <= 72 && experienceEvidence >= 3 && normalized.GRD >= 58) {
      adjusted = Math.max(adjusted, 52);
    }
    if (!hasPolishedRisk && normalized.NOI <= 95 && normalized.TST >= 58 && normalized.GRD >= 30 && (experienceEvidence >= 1 || expressionLagEvidence >= 1)) {
      adjusted = Math.max(adjusted, 32);
    }
    if (hasPolishedRisk && normalized.NOI <= 88 && normalized.TST >= 60 && normalized.GRD >= 26 && expressionLagEvidence >= 1) {
      adjusted = Math.max(adjusted, 32);
    }
    if (normalized.NOI <= 80 && normalized.TST >= 50 && normalized.GRD >= 27 && normalized.EXP <= 16 && normalized.TLB >= 80) {
      adjusted = Math.max(adjusted, 32);
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
    if (!hasPolishedRisk && normalized.NOI <= 88 && expressionLagEvidence >= 1 && normalized.TST >= 55 && normalized.GRD >= 35) {
      adjusted = Math.max(adjusted, 38);
    }
    if (!hasPolishedRisk && normalized.NOI <= 78 && expressionLagEvidence >= 1 && experienceEvidence >= 1 && normalized.TST >= 58) {
      adjusted = Math.max(adjusted, 45);
    }
    if (!hasPolishedRisk && normalized.NOI <= 58 && normalized.GEN >= 55 && generationAttemptEvidence >= 1) {
      adjusted = Math.max(adjusted, 38);
    }
    if (!hasPolishedRisk && normalized.NOI <= 28 && normalized.GEN >= 78 && normalized.TST >= 55 && generationAttemptEvidence >= 2) {
      adjusted = Math.max(adjusted, 65);
    }
    if (!hasPolishedRisk && normalized.NOI <= 20 && normalized.GEN >= 90 && normalized.TST >= 58 && generationAttemptEvidence >= 3) {
      adjusted = Math.max(adjusted, 70);
    }
    if (
      !hasPolishedRisk &&
      normalized.CXT >= 80 &&
      normalized.GEN >= 85 &&
      normalized.TST >= 80 &&
      normalized.NOI <= 35 &&
      (normalized.EXP >= 35 || normalized.TLB >= 50 || (normalized.BND >= 70 && normalized.STN >= 70 && normalized.GRD >= 55))
    ) {
      adjusted = Math.max(adjusted, 65);
    }
    if (!hasPolishedRisk && normalized.CXT >= 68 && normalized.GEN >= 72 && normalized.TST >= 82 && normalized.TLB >= 70 && normalized.EXP >= 30 && normalized.NOI <= 35) {
      adjusted = Math.max(adjusted, 65);
    }
    const creativeDirectionEvidence =
      normalized.CXT >= 80 &&
      normalized.BND >= 90 &&
      normalized.GEN >= 88 &&
      normalized.TST >= 82 &&
      normalized.STN >= 90 &&
      normalized.GRD >= 70 &&
      normalized.NOI <= 24 &&
      generationAttemptEvidence >= 5 &&
      toolAntiEmptyEvidence >= 1 &&
      (normalized.EXP >= 26 || normalized.TLB >= 50);
    if (creativeDirectionEvidence) {
      adjusted = Math.max(adjusted, 66);
    }
    if (!hasPolishedRisk && normalized.BND >= 49 && normalized.STN >= 39 && normalized.GRD >= 35 && normalized.NOI <= 35) {
      adjusted = Math.max(adjusted, 40);
    }
    if (!hasPolishedRisk && normalized.CXT >= 45 && normalized.BND >= 37 && normalized.GEN >= 39 && normalized.EXP >= 27 && normalized.NOI <= 45) {
      adjusted = Math.max(adjusted, 45);
    }
    if (normalized.CXT >= 50 && normalized.GEN >= 80 && normalized.EXP >= 45 && normalized.BND >= 35 && normalized.NOI <= 20) {
      adjusted = Math.max(adjusted, 45);
    }
    if (normalized.BND >= 46 && normalized.STN >= 39 && normalized.GRD >= 39 && normalized.EXP >= 53 && normalized.NOI <= 15) {
      adjusted = Math.max(adjusted, 39);
    }
    if (normalized.CXT >= 60 && normalized.GRD >= 60 && normalized.NOI <= 30) {
      adjusted = Math.max(adjusted, 46);
    }
    if (normalized.BND >= 50 && normalized.STN >= 45 && normalized.TST >= 50 && normalized.TLB >= 50 && normalized.NOI <= 20) {
      adjusted = Math.max(adjusted, 46);
    }
    if (normalized.TLB >= 70 && normalized.EXP >= 55 && normalized.BND >= 55 && normalized.NOI <= 45) {
      adjusted = Math.max(adjusted, 45);
    }
    if (!hasPolishedRisk && normalized.BND >= 58 && normalized.STN >= 55 && normalized.GRD >= 65 && normalized.SKL <= 18 && normalized.NOI <= 10) {
      adjusted = Math.max(adjusted, 55);
    }
    if (normalized.BND >= 57 && normalized.STN >= 52 && normalized.GRD >= 67 && normalized.SKL <= 18 && normalized.EXP <= 32 && normalized.NOI <= 10) {
      adjusted = Math.max(adjusted, 65);
    }
    if (normalized.BND >= 57 && normalized.STN >= 52 && normalized.GRD >= 70 && normalized.SKL <= 18 && normalized.EXP <= 20 && normalized.NOI <= 10) {
      adjusted = Math.max(adjusted, 56);
    }
    if (!hasPolishedRisk && normalized.NOI <= 20 && normalized.BND >= 52 && normalized.STN >= 45 && normalized.GRD >= 38 && normalized.GEN < 70) {
      adjusted = Math.max(adjusted, 47);
    }
    if (!hasPolishedRisk && normalized.NOI <= 35 && normalized.CXT >= 42 && normalized.BND >= 52 && normalized.STN >= 45 && normalized.EXP >= 30 && normalized.GEN < 72) {
      adjusted = Math.max(adjusted, 46);
    }
    if (normalized.NOI <= 35 && normalized.TLB >= 50 && normalized.EXP >= 30 && (normalized.BND >= 55 || normalized.SKL >= 35)) {
      adjusted = Math.max(adjusted, 46);
    }
    if (!hasPolishedRisk && normalized.NOI <= 35 && normalized.STN >= 60 && normalized.BND >= 45 && normalized.GEN < 78 && valueGuardEvidence >= 2) {
      adjusted = Math.max(adjusted, 55);
    }
    if (!hasPolishedRisk && normalized.NOI <= 28 && normalized.STN >= 68 && normalized.BND >= 55 && normalized.GEN < 75 && valueGuardEvidence >= 3) {
      adjusted = Math.max(adjusted, 62);
    }
    if (normalized.BND >= 84 && normalized.STN >= 84 && normalized.GEN < 58 && normalized.NOI <= 45) {
      adjusted = Math.max(adjusted, 55);
    }
    if (
      !hasPolishedRisk &&
      normalized.NOI <= 30 &&
      normalized.TLB >= 50 &&
      toolAntiEmptyEvidence >= 5 &&
      normalized.CXT >= 68 &&
      normalized.BND >= 62 &&
      normalized.TST >= 68 &&
      generationAttemptEvidence >= 3
    ) {
      adjusted = Math.max(adjusted, 90);
    }
    const highMaturePerformanceSignature =
      normalized.EXP <= 46 &&
      normalized.SKL <= 25 &&
      normalized.TLB <= 25 &&
      normalized.BND >= 64 &&
      normalized.STN >= 64 &&
      normalized.GRD >= 64 &&
      (normalized.GEN >= 70 || normalized.TST >= 60) &&
      ((evidence.mature_judgment || 0) + (evidence.judgment_and_consequence || 0)) >= 14 &&
      valueGuardEvidence >= 4 &&
      toolAntiEmptyEvidence === 0 &&
      sourcePedigreeEvidence <= 4 &&
      !(normalized.CXT >= 84 && normalized.BND >= 88 && normalized.STN >= 88 && normalized.GRD >= 80 && normalized.NOI <= 24);
    if (highMaturePerformanceSignature) {
      adjusted = Math.min(adjusted, 62);
    }
    const highReframeNoSourcePerformance =
      normalized.EXP <= 40 &&
      normalized.SKL <= 25 &&
      normalized.TLB <= 25 &&
      normalized.CXT >= 64 &&
      normalized.BND >= 64 &&
      normalized.GEN >= 70 &&
      normalized.TST >= 64 &&
      normalized.STN >= 60 &&
      sourcePedigreeEvidence === 0 &&
      toolAntiEmptyEvidence === 0 &&
      ((evidence.mature_judgment || 0) + (evidence.judgment_and_consequence || 0)) >= 16 &&
      valueGuardEvidence >= 4 &&
      !(normalized.CXT >= 84 && normalized.BND >= 88 && normalized.STN >= 88 && normalized.GRD >= 80 && normalized.NOI <= 24);
    if (highReframeNoSourcePerformance) {
      adjusted = Math.min(adjusted, 62);
    }
    const serviceOverclaimWithoutTaste =
      normalized.CXT >= 90 &&
      normalized.BND >= 90 &&
      normalized.STN >= 88 &&
      normalized.GEN >= 88 &&
      normalized.SKL <= 12 &&
      normalized.EXP <= 50 &&
      normalized.NOI <= 12 &&
      generationAttemptEvidence >= 5 &&
      toolAntiEmptyEvidence <= 1 &&
      evidenceScore(evidence, ["anti_empty_professionalism", "cliche_without_judgment", "empty_but_polished_detected"]) === 0;
    if (serviceOverclaimWithoutTaste) {
      adjusted = Math.min(adjusted, 64);
    }
    const experienceValueWithoutPeakDifferentiator =
      adjusted > 84 &&
      normalized.GRD >= 70 &&
      normalized.BND >= 60 &&
      normalized.STN >= 60 &&
      normalized.GEN < 65 &&
      normalized.TST < 60 &&
      toolAntiEmptyEvidence <= 1;
    if (experienceValueWithoutPeakDifferentiator) {
      adjusted = Math.min(adjusted, 84);
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
      const sourcePedigreeEvidence = evidenceScore(evidence, [
        "specific_experience",
        "case_validated",
        "case_explanation",
        "knows_experience_failure_boundary",
        "failure_refined_judgment",
      ]);
      if (sourcePedigreeEvidence === 0 && normalized.EXP <= 26 && normalized.SKL <= 12) {
        adjusted = Math.min(adjusted, 54);
      }
      if (normalized.BND >= 46 && normalized.STN >= 39 && normalized.GRD >= 39 && normalized.EXP >= 53 && normalized.NOI <= 15) {
        adjusted = Math.max(adjusted, 39);
      }
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
        line: "已经看见一点方向，再多几道题会更稳。",
        summary: "已经看见一点方向，再多几道题会更稳。",
        playfulAside: "锅已经热了，菜还差最后两下。",
        growthNudge: "继续按真实反应选择，不用为了得到某个结果调整答案。",
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
      return "你跳过了工作场景，所以这次只聊你的判断，不替你的岗位做猜测。";
    }
    const values = Object.entries(context)
      .filter(([key, value]) => key !== "skipped" && Boolean(value))
      .map(([, value]) => value);
    if (!values.length) {
      return "你没有填写工作场景，所以这里不做岗位影响分析；含活人量仍然只按答题表现计算。";
    }

    const low = ["direction", "guarded", "taste", "trust"].filter((value) => values.includes(value)).length;
    const high = ["routine", "standard", "efficiency"].filter((value) => values.includes(value)).length;
    if (low >= 2) return "岗位接手风险偏低：方向、信任、审美或责任占了不少分量。AI 很适合当放大器，暂时还不太适合独自值班。";
    if (high >= 2) return "岗位接手风险偏高：不少表层任务已经能写进流程。这不替你本人扣分，只提醒你把例外和边界说得更清楚。";
    return "岗位接手风险中等：一部分工作可以放心交给工具，碰到关键场景，仍然要有人判断能不能用、该不该用。";
  }
}

export { CORE_METRICS, AUX_METRICS, METRIC_NAMES };
