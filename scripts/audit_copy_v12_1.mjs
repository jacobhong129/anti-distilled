import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { RESULT_DETAIL_TITLES, UI_COPY } from "../src/app/product-content.js";

const baseline = JSON.parse(execFileSync("git", ["show", "ae304c2:config/game-config-v11.json"], { encoding: "utf8" }));
const current = JSON.parse(fs.readFileSync("config/game-config-v11.json", "utf8"));
const sourceFiles = [
  "src/App.jsx",
  "src/app/product-content.js",
  "src/app/result-view-model.js",
  "src/app/role-context.js",
  "src/components/AppErrorBoundary.jsx",
  "src/components/ProductShell.jsx",
  "src/features/home/HomePages.jsx",
  "src/features/assessment/QuestionPage.jsx",
  "src/features/results/ResultPage.jsx",
  "src/features/results/ResultDialogs.jsx",
  "src/features/share/ShareStudioPage.jsx",
  "src/features/history/HistoryPage.jsx",
];
const sourceText = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

const configCopy = [
  current.title,
  ...Object.values(current.sectionIntros),
  ...current.resultBands.flatMap((band) => [band.line, band.summary, band.playfulAside, band.growthNudge]),
  ...Object.values(current.labelDetails).flatMap((detail) => [detail.plainMeaning, detail.shareLine, detail.resonance, detail.misunderstanding, detail.growthNudge, detail.playfulAside]),
  ...current.items.flatMap((item) => [item.prefix, item.dimensionText, item.question, ...item.options.map((option) => option.text)]),
].filter(Boolean);
const narrativeCopy = [
  ...Object.values(current.sectionIntros),
  ...current.resultBands.flatMap((band) => [band.line, band.summary, band.playfulAside, band.growthNudge]),
  ...Object.values(current.labelDetails).flatMap((detail) => [detail.plainMeaning, detail.shareLine, detail.resonance, detail.misunderstanding, detail.growthNudge, detail.playfulAside]),
  ...current.items.flatMap((item) => [item.question, ...item.options.map((option) => option.text)]),
].filter(Boolean);
const allCopy = `${configCopy.join("\n")}\n${sourceText}`;

const questionLengths = current.items.map((item) => [...item.question].length);
const optionLengths = current.items.flatMap((item) => item.options.map((option) => [...option.text].length));
const changedQuestions = current.items.filter((item, index) => item.question !== baseline.items[index].question).length;
const changedOptions = current.items.reduce((count, item, index) => count + item.options.filter((option, optionIndex) => option.text !== baseline.items[index].options[optionIndex].text).length, 0);
const exactDuplicates = narrativeCopy.reduce((counts, text) => counts.set(text, (counts.get(text) || 0) + 1), new Map());
const repeatedCopy = [...exactDuplicates.entries()].filter(([text, count]) => count > 1 && text.length >= 8);

const traceChecks = {
  longDash: (allCopy.match(/—/g) || []).length,
  notButPattern: (allCopy.match(/不是[^。！？\n]{0,30}而是/g) || []).length,
  grandioseClaims: (allCopy.match(/赋能|重塑|颠覆|全方位|多维度|深度洞察|至关重要/g) || []).length,
  internalTermsInResultCopy: current.resultBands.concat(Object.values(current.labelDetails)).flatMap(Object.values).filter((value) => typeof value === "string" && /labelDelta|scoreProfile|evidence|置信度|内部权重|题目路径/.test(value)).length,
  techMetaphorsInResultCopy: current.resultBands.concat(Object.values(current.labelDetails)).flatMap(Object.values).filter((value) => typeof value === "string" && /脑内|HDMI|个性化插件|风险提示|安装包|空文件夹/.test(value)).length,
};
const parallelTitleGroups = [
  ["页头导航", ...Object.values(UI_COPY.header)],
  ["流程步骤", ...UI_COPY.steps],
  ["答题侧栏", ...Object.values(UI_COPY.quizMenu)],
  ["结果栏目", ...Object.values(UI_COPY.resultSections)],
];

assert.equal(current.items.length, 120);
assert.equal(current.items.flatMap((item) => item.options).length, 480);
assert.ok(questionLengths.every((length) => length <= 34), "存在超过 34 字的题干");
assert.ok(optionLengths.every((length) => length <= 22), "存在超过 22 字的选项");
assert.ok(questionLengths.filter((length) => length >= 16 && length <= 28).length >= 108, "至少 90% 题干应落在 16–28 字");
assert.equal(traceChecks.longDash, 0, "可见文案不使用长破折号");
assert.equal(traceChecks.grandioseClaims, 0, "发现宣传腔或空泛大词");
assert.equal(traceChecks.internalTermsInResultCopy, 0, "结果文案暴露内部评分术语");
assert.equal(traceChecks.techMetaphorsInResultCopy, 0, "结果文案仍在堆叠技术梗");
assert.ok(traceChecks.notButPattern <= 4, "“不是……而是……”句式仍然过多");
assert.ok(repeatedCopy.length <= 4, "存在过多重复的长句");
for (const [group, ...titles] of parallelTitleGroups) {
  assert.ok(titles.every((title) => [...title].length === 4), `${group} 未保持四字对仗：${titles.join(" / ")}`);
}
assert.deepEqual(RESULT_DETAIL_TITLES.label, ["翻成人话", "为什么像你", "最容易被误会的地方", "下一步不用大改", "这次露出的线索", "顺手说一句"], "标签详情标题应保持自然中文层级");
assert.deepEqual(RESULT_DETAIL_TITLES.dimension, ["翻成人话", "为什么会这样", "最容易被误会的地方", "下一步不用大改", "这次露出的线索"], "维度详情标题应保持自然中文层级");

console.log("v12.1 可见文案审计通过");
console.log(`题干：120/120 已审阅，${changedQuestions} 条改写；${questionLengths.filter((length) => length >= 16 && length <= 28).length}/120 位于 16–28 字，最长 ${Math.max(...questionLengths)} 字`);
console.log(`选项：480/480 已审阅，${changedOptions} 条改写；480/480 不超过 22 字，最长 ${Math.max(...optionLengths)} 字`);
console.log(`AI 痕迹：长破折号 ${traceChecks.longDash}，宣传腔词 ${traceChecks.grandioseClaims}，“不是……而是……” ${traceChecks.notButPattern}`);
console.log(`重复长句：${repeatedCopy.length}；结果页内部术语：${traceChecks.internalTermsInResultCopy}；技术梗堆叠：${traceChecks.techMetaphorsInResultCopy}`);
console.log(`栏目对仗：${parallelTitleGroups.map(([group, ...titles]) => `${group} ${titles.length}/${titles.length}`).join("；")}`);
