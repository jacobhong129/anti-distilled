import { assetMap } from "./assets.js";
import { DIMENSION_DETAILS } from "./product-content.js";

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

export function buildShareLine(result) {
  return `测完抗蒸性，我的含活人量是 ${result.score}%：${result.band.name}，${result.labelDetails.name}。${result.labelDetails.shareLine || result.band.line}`;
}

export function buildLabelDetail(result) {
  return {
    type: "判断标签",
    title: result.labelDetails.name,
    subtitle: result.labelDetails.resonance || result.labelDetails.plainMeaning,
    asset: assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable,
    sections: [
      ["翻成人话", result.labelDetails.plainMeaning],
      ["为什么像你", result.labelDetails.resonance],
      ["最容易被误会的地方", result.labelDetails.misunderstanding],
      ["下一步不用大改", result.labelDetails.growthNudge],
      ["这次露出的线索", `你这次最明显的三处线索是：${result.signals.slice(0, 3).map((signal) => `${signal.name} ${signal.value}%`).join("、")}。它们拼在一起，更像一种当下的判断习惯，不是给你盖章。`],
      ["顺手说一句", result.labelDetails.playfulAside],
    ],
  };
}

export function buildDimensionDetail(dimension, result) {
  const detail = DIMENSION_DETAILS[dimension.key];
  return {
    type: "维度详情",
    title: detail.name,
    subtitle: `${detail.subtitle}｜本次 ${dimension.value}%`,
    asset: assetMap.labels?.[detail.assetKey] || assetMap.labels?.latent_human_variable,
    sections: [
      ["翻成人话", detail.meaning],
      ["为什么会这样", detail.evidence],
      ["最容易被误会的地方", detail.misunderstanding],
      ["下一步不用大改", detail.growth],
      ["这次露出的线索", `${detail.name}这次是 ${dimension.value}%。放在“${result.band.name}”和“${result.labelDetails.name}”里看，它更像你当下最常用的一种判断方式，不是能力上限。`],
    ],
  };
}
