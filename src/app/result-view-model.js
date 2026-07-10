import { assetMap } from "./assets.js";
import { DIMENSION_DETAILS } from "./product-content.js";

export function resultTone(score) {
  if (score >= 80) return "high";
  if (score >= 52) return "mid";
  return "low";
}

export function scoreHelpText(score) {
  if (score >= 90) return "你的判断很难被完整复制，关键差异藏在现场感、分寸和责任感里。";
  if (score >= 80) return "你的很多方法可以被学习，但真正影响结果的判断仍需要本人到场。";
  if (score >= 70) return "流程能复制一部分，例外、边界和取舍会保留明显的人味。";
  if (score >= 52) return "你有一部分适合沉淀成方法，也有一部分还需要你亲自把关。";
  if (score >= 35) return "你很适合标准化协作；这个结果提醒你看清哪些判断还没有长出自己的来源。";
  return "你很适合把事情做稳做清楚；下一步是把自己的判断来源练得更明显。";
}

export function bandRoastText(result) {
  const label = result.labelDetails?.name || "判断标签";
  if (result.score >= 90) return `彩烟很足：${label}这块，别人学得到话术，未必学得到你为什么这么判断。`;
  if (result.score >= 80) return `你不是不能总结，而是总结完还会漏掉一截关键人味：那部分通常来自${label}。`;
  if (result.score >= 70) return "你不是反流程的人，但流程遇到复杂现场时，还得问一句“这次到底哪里不一样”。";
  if (result.score >= 62) return "招牌正在成形，接下来要看清：哪些是稳定判断，哪些只是这次答得顺。";
  if (result.score >= 52) return "有些部分能沉淀成方法，但别把自己整理得太干，关键判断还要留住。";
  if (result.score >= 48) return "你很适合协作和对齐；这个结果更像提醒：别只交付答案，也要看见判断来源。";
  if (result.score >= 35) return "你很适合稳定交付。真正的问题不是要不要流程，而是流程之外还保留什么判断。";
  return "你很可靠，也很容易被整理成方法。这个结果可以用来反问：哪些经验还没长成自己的判断。";
}

export function buildShareLine(result) {
  return `我做了抗蒸性测试：含活人量 ${result.score}%｜${result.band.name}｜判断标签：${result.labelDetails.name}。${result.labelDetails.shareLine || result.labelDetails.plainMeaning}`;
}

export function buildLabelDetail(result) {
  return {
    type: "判断标签",
    title: result.labelDetails.name,
    subtitle: result.labelDetails.plainMeaning,
    asset: assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable,
    sections: [
      ["这是什么意思", result.labelDetails.plainMeaning],
      ["为什么你可能是这个标签", `这次答题里，${result.signals.slice(0, 3).map((signal) => signal.name).join("、")} 的信号比较明显。`],
      ["容易被误解成什么", "标签不是人格定型，只是这次答题里最突出的判断线索。你可能同时具备多个候选标签。"],
      ["它提醒你思考什么", result.labelDetails.shareLine || "你可以反问自己：这个判断来自经验、审美、责任，还是只是对流程的熟练执行。"],
      ["本次表现证据", `这次比较明显的信号集中在：${result.signals.slice(0, 3).map((signal) => `${signal.name} ${signal.value}%`).join("、")}。`],
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
      ["这是什么意思", detail.meaning],
      ["为什么你可能是这个表现", detail.evidence],
      ["容易被误解成什么", detail.misunderstanding],
      ["它提醒你思考什么", detail.growth],
      ["本次表现证据", `在你的结果中，${detail.name} 为 ${dimension.value}%。整体段位为 ${result.band.name}，判断标签为 ${result.labelDetails.name}。`],
    ],
  };
}
