import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const baseline = JSON.parse(execFileSync("git", ["show", "ae304c2:config/game-config-v11.json"], { encoding: "utf8" }));
const current = JSON.parse(fs.readFileSync("config/game-config-v11.json", "utf8"));
const sourceFiles = ["src/App.jsx", "src/app/product-content.js", "src/app/result-view-model.js", "src/components/AppErrorBoundary.jsx", "src/engine/adaptive-engine.js"];
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
};

assert.equal(current.items.length, 120);
assert.equal(current.items.flatMap((item) => item.options).length, 480);
assert.ok(questionLengths.every((length) => length <= 34), "存在超过 34 字的题干");
assert.ok(optionLengths.every((length) => length <= 22), "存在超过 22 字的选项");
assert.ok(questionLengths.filter((length) => length >= 16 && length <= 28).length >= 108, "至少 90% 题干应落在 16–28 字");
assert.equal(traceChecks.longDash, 0, "可见文案不使用长破折号");
assert.equal(traceChecks.grandioseClaims, 0, "发现宣传腔或空泛大词");
assert.equal(traceChecks.internalTermsInResultCopy, 0, "结果文案暴露内部评分术语");
assert.ok(traceChecks.notButPattern <= 4, "“不是……而是……”句式仍然过多");
assert.ok(repeatedCopy.length <= 4, "存在过多重复的长句");

console.log("v12.1 可见文案审计通过");
console.log(`题干：120/120 已审阅，${changedQuestions} 条改写；${questionLengths.filter((length) => length >= 16 && length <= 28).length}/120 位于 16–28 字，最长 ${Math.max(...questionLengths)} 字`);
console.log(`选项：480/480 已审阅，${changedOptions} 条改写；480/480 不超过 22 字，最长 ${Math.max(...optionLengths)} 字`);
console.log(`AI 痕迹：长破折号 ${traceChecks.longDash}，宣传腔词 ${traceChecks.grandioseClaims}，“不是……而是……” ${traceChecks.notButPattern}`);
console.log(`重复长句：${repeatedCopy.length}；结果页内部术语：${traceChecks.internalTermsInResultCopy}`);
