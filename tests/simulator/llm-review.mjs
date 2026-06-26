import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);

function argValue(name, fallback = "") {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function readReport() {
  const reportPath = path.resolve(ROOT, argValue("--report", "docs/latest-simulator-report.json"));
  if (!fs.existsSync(reportPath)) {
    throw new Error(`missing simulator report: ${path.relative(ROOT, reportPath)}`);
  }
  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

function reviewItems(report) {
  const failures = [
    ...(report.engine?.quality?.failures || []).slice(0, 8).map((failure) => ({ layer: "engine", failure })),
    ...(report.semantic?.semanticQuality?.failures || []).slice(0, 12).map((failure) => ({ layer: "semantic", failure })),
  ];
  return failures.map((item) => ({
    id: `${item.layer}:${item.failure.personaId}`,
    layer: item.layer,
    personaId: item.failure.personaId,
    personaName: item.failure.personaName,
    prompt: [
      "你是一个评测设计审阅员。请只基于以下模拟测试摘要判断失败更可能来自：评测设计、题目语义、计分元数据、动态引擎、虚拟人设定。",
      "请输出 JSON：{classification, reason, suggestedFix, confidence}。",
      JSON.stringify(item.failure),
    ].join("\n"),
  }));
}

async function callOpenAI(item) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const response = await fetch(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REVIEW_MODEL || "gpt-4.1-mini",
      input: item.prompt,
      text: { format: { type: "json_object" } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI review failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function main() {
  const report = readReport();
  const items = reviewItems(report);
  const outputPath = path.resolve(ROOT, argValue("--output", "docs/llm-review-package.jsonl"));
  fs.writeFileSync(outputPath, items.map((item) => JSON.stringify(item)).join("\n") + "\n");

  const execute = args.includes("--execute");
  const result = {
    exported: path.relative(ROOT, outputPath),
    itemCount: items.length,
    executed: false,
    reviews: [],
  };
  if (execute) {
    for (const item of items) {
      result.reviews.push({ id: item.id, response: await callOpenAI(item) });
    }
    result.executed = true;
    fs.writeFileSync(path.resolve(ROOT, "docs/llm-review-results.json"), JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
