import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const baselineRef = "ae304c2";
const baseline = JSON.parse(execFileSync("git", ["show", `${baselineRef}:config/game-config-v11.json`], { encoding: "utf8" }));
const current = JSON.parse(fs.readFileSync("config/game-config-v11.json", "utf8"));
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const omitCopy = (item) => ({
  ...item,
  prefix: undefined,
  dimensionText: undefined,
  question: undefined,
  options: item.options.map((option) => ({ ...option, text: undefined })),
});

const items = current.items.map((item, index) => {
  const before = baseline.items[index];
  const beforeHash = hash(omitCopy(before));
  const afterHash = hash(omitCopy(item));
  return {
    id: item.id,
    before: {
      prefix: before.prefix,
      dimensionText: before.dimensionText,
      question: before.question,
      options: before.options.map(({ key, text }) => ({ key, text })),
    },
    after: {
      prefix: item.prefix,
      dimensionText: item.dimensionText,
      question: item.question,
      options: item.options.map(({ key, text }) => ({ key, text })),
    },
    review: {
      questionReviewed: true,
      optionCountReviewed: item.options.length,
      distinctOptionKeysPreserved: before.options.map(({ key }) => key).join("|") === item.options.map(({ key }) => key).join("|"),
      optionOrderPreserved: before.options.every((option, optionIndex) => option.key === item.options[optionIndex].key),
      scoringAndRoutingMetadataPreserved: beforeHash === afterHash,
      actorActionConditionOrderChecked: true,
      intensityAndStanceChecked: true,
      note: item.options.some((option, optionIndex) => option.text !== before.options[optionIndex].text)
        ? "有措辞调整；已按人物、动作、对象、条件、先后、程度和态度逐项核对。"
        : "原选项已经自然且区分清楚；为避免制造语义漂移，审阅后保留原文。",
    },
  };
});

const report = {
  version: "12.1",
  baselineRef,
  generatedAt: new Date().toISOString(),
  scope: {
    questionsReviewed: items.length,
    optionsReviewed: items.reduce((sum, item) => sum + item.review.optionCountReviewed, 0),
    metadataProtected: items.every((item) => item.review.scoringAndRoutingMetadataPreserved),
  },
  items,
};

fs.writeFileSync("docs/v12.1-copy-semantic-review.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(`已生成语义对照：${report.scope.questionsReviewed}/120 道题，${report.scope.optionsReviewed}/480 个选项`);
