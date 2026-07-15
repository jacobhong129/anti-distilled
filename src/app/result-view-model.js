import { assetMap } from "./assets.js";
import { DIMENSION_DETAILS, RESULT_DETAIL_TITLES } from "./product-content.js";

export function resultTone(score) {
  if (score >= 80) return "high";
  if (score >= 52) return "mid";
  return "low";
}

export function scoreHelpText(result) {
  return result.band.summary || result.band.line;
}

export function bandRoastText(result) {
  return result.band.playfulAside || result.band.line;
}

function dimensionRange(result) {
  const ordered = [...(result.dimensions || [])].sort((left, right) => right.value - left.value);
  return {
    strongest: ordered[0],
    quietest: ordered[ordered.length - 1],
  };
}

export function buildResultPortrait(result) {
  const { strongest, quietest } = dimensionRange(result);
  const dimensionLine = strongest && quietest
    ? `六维里，你在${strongest.name}上的反应最明显（${strongest.value}%）；${quietest.name}相对少一些（${quietest.value}%）。这不列长短板，只说明你这次答题时，注意力更多落在了哪里。`
    : "这次的答案已经露出一些习惯，但还不必急着替自己下结论。";
  return [
    [result.band.line, result.labelDetails.shareLine].filter(Boolean).join(" "),
    dimensionLine,
    result.labelDetails.playfulAside,
  ].filter(Boolean);
}

export function buildResultReading(result) {
  const { strongest, quietest } = dimensionRange(result);
  const dimensionLine = strongest && quietest
    ? `你在${strongest.name}上的反应最明显，可以想想它最近在哪件事上帮过你。${quietest.name}相对少一些，也许只是缺少练习，或刚好不是你这阵子的用力处。`
    : "分数只记录这一次作答，不替以后盖章。";
  return [
    result.band.growthNudge,
    result.labelDetails.misunderstanding,
    dimensionLine,
  ].filter(Boolean);
}

export function buildShareLine(result) {
  const { strongest, quietest } = dimensionRange(result);
  const dimensionLine = strongest && quietest
    ? `六维里，我在${strongest.name}上的反应最明显（${strongest.value}%），${quietest.name}相对少一些（${quietest.value}%）。前者是我常用的判断，后者还有慢慢积累的余地。`
    : "这只是此刻的一张侧影，过段时间再测，也许会有不同。";
  return [
    `刚做完「抗蒸性测试」。如果把我的工作方法写成流程、插件或 Skill，最后还能剩下多少我自己？这次的答案是 ${result.score}%。`,
    `我落在「${result.band.name}」，判断底色是「${result.labelDetails.name}」。${result.band.line}${result.labelDetails.shareLine ? ` ${result.labelDetails.shareLine}` : ""}`,
    dimensionLine,
    "能交给 AI 的，我愿意交出去。至于方向、分寸和最后那一下判断，还是想留在自己手里。",
    `#抗蒸性测试 #含活人量${result.score}%`,
  ].join("\n\n");
}

export function buildLabelDetail(result) {
  const [meaningTitle, resonanceTitle, misunderstandingTitle, growthTitle, signalsTitle, asideTitle] = RESULT_DETAIL_TITLES.label;
  const visibleSignals = [...(result.dimensions || [])]
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);
  return {
    type: "判断标签",
    title: result.labelDetails.name,
    subtitle: result.labelDetails.resonance || result.labelDetails.plainMeaning,
    asset: assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable,
    sections: [
      [meaningTitle, result.labelDetails.plainMeaning],
      [resonanceTitle, result.labelDetails.resonance],
      [misunderstandingTitle, result.labelDetails.misunderstanding],
      [growthTitle, result.labelDetails.growthNudge],
      [signalsTitle, `这次最显眼的三处线索是 ${visibleSignals.map((signal) => `${signal.name} ${signal.value}%`).join("、")}。它们合在一起，才把“${result.labelDetails.name}”推到了前面。`],
      [asideTitle, result.labelDetails.playfulAside],
    ],
  };
}

export function buildDimensionDetail(dimension, result) {
  const detail = DIMENSION_DETAILS[dimension.key];
  const [meaningTitle, reasonTitle, misunderstandingTitle, growthTitle, signalsTitle] = RESULT_DETAIL_TITLES.dimension;
  return {
    type: "维度详情",
    title: detail.name,
    subtitle: `${detail.subtitle}，本次 ${dimension.value}%`,
    asset: assetMap.labels?.[detail.assetKey] || assetMap.labels?.latent_human_variable,
    sections: [
      [meaningTitle, detail.meaning],
      [reasonTitle, detail.evidence],
      [misunderstandingTitle, detail.misunderstanding],
      [growthTitle, detail.growth],
      [signalsTitle, `${detail.name}这次是 ${dimension.value}%。和“${result.band.name}”“${result.labelDetails.name}”放在一起看，它更像你近来的用力习惯，不是能力上限。`],
    ],
  };
}
