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

const LABEL_KEYS = [
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
      labelConfidence: Object.fromEntries(LABEL_KEYS.map((key) => [key, 0])),
      stabilityChecks: [],
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

    const contradictionRisk = this.hasMisreadRisk() && (item.role === "noise_probe" || item.primaryMetric === "NOI") ? 1 : 0.25;
    const topicFreshness = this.topicFreshness(item);
    const stageBoost = item.stage === "split" ? 0.1 : item.stage === "auxiliary" ? 0.06 : 0;

    return (
      lowConfidence * (weights.lowConfidence ?? 0.4) +
      labelImpact * (weights.labelImpact ?? 0.3) +
      contradictionRisk * (weights.contradictionRisk ?? 0.2) +
      topicFreshness * (weights.topicFreshness ?? 0.1) +
      stageBoost
    );
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
      if (label in this.state.labelConfidence) this.state.labelConfidence[label] += value;
    }

    const scores = scoreVector(option);
    const add = (label, value) => {
      this.state.labelConfidence[label] += value;
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
  }

  shouldStop() {
    const answered = this.state.answers.length;
    if (answered >= this.flow.maximumQuestions) return true;
    if (answered < this.flow.minimumQuestions) return false;
    if (answered % (this.flow.checkStabilityEvery || 2) !== 0) return false;

    const result = this.result();
    const previous = this.state.stabilityChecks.at(-1);
    const top = this.sortedLabels()[0]?.[0];
    const second = this.sortedLabels()[1]?.[1] || 0;
    const topValue = this.sortedLabels()[0]?.[1] || 0;
    const total = this.sortedLabels().reduce((sum, [, value]) => sum + Math.max(value, 0), 0) || 1;
    const lead = (topValue - second) / total;
    const check = {
      band: result.band.name,
      top,
      lead,
      riskCounterchecked: !this.hasMisreadRisk() || this.hasCountercheckEvidence(),
    };
    this.state.stabilityChecks.push(check);

    if (!previous) return false;
    const met = [
      previous.band === check.band,
      previous.top === check.top,
      check.lead >= 0.12,
      check.riskCounterchecked,
    ].filter(Boolean).length;
    return met >= 3;
  }

  hasMisreadRisk() {
    const normalized = this.getNormalizedScores();
    return normalized.NOI >= 45 || (normalized.SKL >= 72 && (normalized.BND + normalized.CXT + normalized.GRD) / 3 < 52);
  }

  hasCountercheckEvidence() {
    return this.state.answers.some((answer) => answer.stage === "auxiliary" || answer.primaryMetric === "NOI");
  }

  sortedLabels() {
    return Object.entries(this.state.labelConfidence).sort((left, right) => right[1] - left[1]);
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
    const formula = this.config.scoringFormula || {};
    const weights = formula.coreWeights || {};
    const coreScore = CORE_METRICS.reduce((sum, metric) => sum + normalized[metric] * (weights[metric] || 0), 0);
    const replacementGap = Math.max(0, normalized.SKL - (normalized.BND + normalized.CXT + normalized.GRD + normalized.EXP) / 4);
    const score = Math.round(
      clamp(
        coreScore +
          normalized.EXP * (formula.translationBonusWeight ?? 0.08) +
          normalized.TLB * (formula.toolBoundaryBonusWeight ?? 0.05) -
          replacementGap * (formula.replacementPenaltyWeight ?? 0.12) -
          normalized.NOI * (formula.noisePenaltyWeight ?? 0.16),
        formula.minDisplayScore ?? 20,
        formula.maxDisplayScore ?? 98,
      ),
    );

    const band = this.findBand(score);
    const [labelKey] = this.sortedLabels()[0] || ["latent_human_variable"];
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
      role: this.roleResult(),
      answeredCount: this.state.answers.length,
    };
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
