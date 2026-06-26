const FEATURE_PATTERNS = {
  process: ["步骤", "流程", "模板", "照着", "标准", "方法文档", "规则", "节点", "执行"],
  skill: ["skill", "训练", "可复制", "学到做法", "写清楚", "沉淀"],
  compliance: ["合规", "制度", "审批", "原则", "必须"],
  clarify: ["问清", "明确", "拆成", "条件", "依据", "确认", "列出"],
  learner: ["学习", "请教", "先问", "不知道"],
  tryAdjust: ["试", "验证", "小验证", "调整"],
  relationship: ["对方", "协作", "团队", "关系", "情绪", "会议", "群里", "状态"],
  context: ["上下文", "场合", "时机", "真正需要", "场景", "气氛", "受众"],
  calm: ["稳", "缓", "安抚", "不急", "先停"],
  project: ["推进", "拆", "节点", "任务", "目标", "方案"],
  evidence: ["依据", "证据", "验证", "异常信号", "说明", "案例"],
  method: ["方法", "沉淀", "复用", "变通"],
  boundary: ["边界", "例外", "核心判断", "重要判断", "做决定", "假设", "取舍", "责任"],
  risk: ["风险", "隐患", "后果", "代价", "坑", "错误结果", "出错"],
  tradeoff: ["取舍", "牺牲", "代价", "保留", "放弃"],
  alternative: ["替代", "更稳", "短期方案", "长期代价", "改得更实用", "更稳的做法", "新方案"],
  value: ["价值", "底线", "不能接受", "责任", "承担", "牺牲", "造假"],
  power: ["权力", "组织", "谁", "反对空间"],
  timing: ["时机", "会议", "快结束", "没人回"],
  experience: ["经验", "踩坑", "现场", "判断条件", "来处", "做过", "失败"],
  oldExperience: ["以前", "老", "旧", "一直", "过去"],
  update: ["更新", "新", "改变", "调整"],
  intuition: ["直觉", "感觉", "不对劲", "现场感觉"],
  practical: ["落地", "实用", "现实", "可做", "目标", "做法"],
  reframe: ["重写", "重构", "重新定义", "框架外", "问法", "改写", "从根上", "换个角度", "重新看"],
  generative: ["新方向", "生成", "创意", "想法", "惊喜", "有趣"],
  novelty: ["新", "惊喜", "有趣", "方向"],
  taste: ["审美", "漂亮", "高级", "表达", "选择", "用力过猛", "鸡汤"],
  emptyDetector: ["空心", "空话", "漂亮废话", "没有真正", "没有判断", "想得不够清楚", "好听的话"],
  empty: ["包装", "看起来", "完整"],
  polished: ["专业", "成熟", "得体", "完整", "高级", "漂亮"],
  matureTone: ["取舍", "代价", "后果", "边界", "负责", "核心", "重要"],
  jargon: ["专业", "框架", "高级", "方案", "材料"],
  specific: ["具体", "哪一步", "哪部分", "条件", "标准", "对象"],
  ai: ["AI", "工具", "初稿", "效率", "自动"],
  tool: ["工具", "工具箱", "帮我", "效率"],
  aiBoundary: ["核心判断", "重要判断", "关键判断", "低风险", "外包", "工具箱", "不要离", "做决定"],
  outsource: ["外包", "替我", "确认按钮", "交给别人或 AI", "做决定"],
  aiAnxiety: ["AI", "替代", "担心", "反感", "焦虑"],
  avoidance: ["不用", "远离", "拒绝", "少用"],
  cynical: ["没意义", "都一样", "装", "虚", "套路", "反正"],
  negative: ["拒绝", "反感", "讨厌", "没必要"],
  posture: ["清醒", "不被复制", "看穿", "姿态", "包装"],
  emotionalReject: ["烦", "反感", "不舒服", "排斥", "情绪"],
  expressionLow: ["说不清", "卡住", "不擅长", "慢", "讲不出"],
  directConflict: ["当场", "反对", "冲突", "说不"],
};

const GENERIC_PATTERNS = ["问题", "判断", "影响", "不能"];

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function hitsFor(text, patterns) {
  return patterns.filter((pattern) => text.includes(pattern));
}

function featureHits(text) {
  const hits = {};
  for (const [feature, patterns] of Object.entries(FEATURE_PATTERNS)) {
    const matched = hitsFor(text, patterns);
    if (matched.length) hits[feature] = matched;
  }
  return hits;
}

function comboBonuses(features, weights) {
  const bonuses = [];
  const has = (name) => Boolean(features[name]?.length);
  const add = (name, weight, reason) => bonuses.push({ feature: name, hits: [reason], weight, contribution: Number(weight.toFixed(2)) });

  if (has("boundary") && (has("risk") || has("tradeoff"))) add("boundaryRiskCombo", Math.max(weights.boundary || 0, weights.risk || 0, 0) * 0.55, "边界同时包含风险/取舍");
  if (has("reframe") && (has("practical") || has("context") || has("taste"))) add("reframeGroundedCombo", Math.max(weights.reframe || 0, weights.generative || 0, 0) * 0.6, "重构同时包含落地/对象/审美");
  if (has("experience") && (has("specific") || has("risk"))) add("sourceEvidenceCombo", Math.max(weights.experience || 0, weights.evidence || 0, 0) * 0.55, "经验同时包含来源/风险");
  if (has("ai") && has("aiBoundary")) add("aiBoundaryCombo", Math.max(weights.ai || 0, weights.aiBoundary || 0, 0) * 0.65, "AI 使用同时保留人工判断");
  if (has("polished") && !has("specific") && !has("experience") && !has("alternative")) add("genericPolishPenalty", -Math.abs(weights.polished || weights.matureTone || 1) * 0.4, "体面表达缺少具体来源");
  return bonuses;
}

export function rankOptionsSemantically(item, options, persona, context = {}) {
  const model = persona.semanticAnswerModel || {};
  const weights = model.featureWeights || {};
  const questionFeatures = featureHits(`${item.dimensionText || ""} ${item.question || ""}`);
  const questionFeatureNames = new Set(Object.keys(questionFeatures));

  return options
    .map((option) => {
      const optionText = option.text || "";
      const features = featureHits(optionText);
      let score = 0;
      const reasons = [];

      for (const [feature, hits] of Object.entries(features)) {
        const weight = weights[feature] || 0;
        if (!weight) continue;
        const questionLeakPenalty = questionFeatureNames.has(feature) ? 0.35 : 1;
        const contribution = weight * hits.length * questionLeakPenalty;
        score += contribution;
        reasons.push({
          feature,
          hits,
          weight,
          contribution: Number(contribution.toFixed(2)),
          ...(questionLeakPenalty < 1 ? { note: "question-common-feature-downweighted" } : {}),
        });
      }

      for (const pattern of model.positivePatterns || []) {
        if (optionText.includes(pattern)) {
          score += 0.8;
          reasons.push({ feature: "positivePattern", hits: [pattern], weight: 0.8, contribution: 0.8 });
        }
      }
      for (const pattern of model.negativePatterns || []) {
        if (optionText.includes(pattern)) {
          score -= 1;
          reasons.push({ feature: "negativePattern", hits: [pattern], weight: -1, contribution: -1 });
        }
      }

      for (const pattern of GENERIC_PATTERNS) {
        if (optionText.includes(pattern) && !features.boundary && !features.risk && !features.reframe && !features.experience && !features.specific) {
          score -= 0.25;
          reasons.push({ feature: "genericWordPenalty", hits: [pattern], weight: -0.25, contribution: -0.25 });
        }
      }

      for (const bonus of comboBonuses(features, weights)) {
        score += bonus.contribution;
        reasons.push(bonus);
      }

      if (!reasons.length) {
        reasons.push({ feature: "neutralSemanticFit", hits: ["无强语义特征，按稳定 tie-break 排序"], weight: 0, contribution: 0 });
      }

      const tieBreak = ((hash(`${context.seed || ""}:${persona.id}:${item.id}:${option.key}`) % 1000) / 1000) * 0.04;
      score += tieBreak;
      return {
        option,
        semanticScore: Number(score.toFixed(3)),
        reasons: reasons.sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution)).slice(0, 6),
        debugText: `${item.dimensionText || ""} ${item.question || ""} ${optionText}`,
      };
    })
    .sort((left, right) => right.semanticScore - left.semanticScore);
}

export function chooseSemanticOption(item, options, persona, context = {}) {
  return rankOptionsSemantically(item, options, persona, context)[0];
}
