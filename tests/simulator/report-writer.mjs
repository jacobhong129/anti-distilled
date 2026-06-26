import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function failedGates(gates = {}) {
  return Object.entries(gates).filter(([, passed]) => !passed).map(([name]) => name);
}

export function countShare(count, total) {
  return total ? `${((count / total) * 100).toFixed(1)}%` : "0.0%";
}

function renderDistribution(rows = [], total = 0) {
  if (!rows.length) return "无";
  return rows.map(([name, count]) => `| ${name} | ${count} | ${countShare(count, total)} |`).join("\n");
}

function renderFailures(failures = []) {
  if (!failures.length) return "无";
  return failures.map((failure) => {
    const range = Array.isArray(failure.scoreRange) ? failure.scoreRange.join("-") : "";
    const band = Array.isArray(failure.dominantBand) ? failure.dominantBand.join(":") : "";
    const label = Array.isArray(failure.dominantLabel) ? failure.dominantLabel.join(":") : "";
    const hits = failure.semanticHits ?? failure.qualityHits ?? "";
    return `| ${failure.personaId} | ${failure.personaName} | ${failure.averageScore ?? ""} | ${range} | ${band} | ${label} | ${hits} |`;
  }).join("\n");
}

export function renderSimulatorMarkdown(data) {
  const engineFailures = data.engine?.quality?.failures || [];
  const semanticFailures = data.semantic?.semanticQuality?.failures || [];
  const appFailures = data.app?.failures || [];
  const coverageOk = data.coverage ? data.coverage.engineCoverage?.ok && data.coverage.semanticCoverage?.ok : true;
  const allOk = data.audit?.ok && data.engine?.ok && data.semantic?.ok && coverageOk && (data.app ? data.app.ok : true);
  return [
    "# 独立模拟测试总报告",
    "",
    `生成时间：${new Date().toISOString()}`,
    "",
    "## 1. 总体判断",
    "",
    allOk
      ? "当前模拟测试通过。仍建议结合真实用户小样本验证后再判断发布。"
      : "当前模拟测试未通过。应优先处理失败 gate 对应的设计、元数据、语义或应用集成问题。",
    "",
    "## 2. 配置审计",
    "",
    `- 配置版本：${data.audit?.configVersion ?? "N/A"}`,
    `- 题目/选项：${data.audit?.itemCount ?? "N/A"} / ${data.audit?.optionCount ?? "N/A"}`,
    `- 完整计分元数据选项：${data.audit?.metadataComplete ?? "N/A"}`,
    `- 失败 gate：${failedGates(data.audit?.gates).join("、") || "无"}`,
    "",
    "## 3. 普通引擎回归",
    "",
    `- 结果：${data.engine?.ok ? "通过" : "未通过"}`,
    `- 总轮次：${data.engine?.totalRuns ?? "N/A"}`,
    `- 平均分：${data.engine?.averageScore ?? "N/A"}`,
    `- 平均题量：${data.engine?.averageQuestions ?? "N/A"}`,
    `- 分数范围：${data.engine?.scoreRange?.join("-") ?? "N/A"}`,
    `- 失败 gate：${failedGates(data.engine?.gates).join("、") || "无"}`,
    "",
    "| 分段 | 次数 | 占比 |",
    "|---|---:|---:|",
    renderDistribution(data.engine?.bands, data.engine?.totalRuns),
    "",
    "### 普通回归失败人格",
    "",
    "| 编号 | 人格 | 平均分 | 分数范围 | 主段位 | 主标签 | 命中 |",
    "|---|---|---:|---|---|---|---:|",
    renderFailures(engineFailures),
    "",
    "## 4. 语义虚拟人回归",
    "",
    `- 结果：${data.semantic?.ok ? "通过" : "未通过"}`,
    `- 总轮次：${data.semantic?.totalRuns ?? "N/A"}`,
    `- 平均分：${data.semantic?.averageScore ?? "N/A"}`,
    `- 稳定核心人格：${data.semantic?.semanticQuality?.stableCorePersonas ?? data.semantic?.semanticQuality?.stableFormalPersonas ?? "N/A"} / ${data.semantic?.semanticQuality?.corePersonaCount ?? data.semantic?.semanticQuality?.formalPersonaCount ?? "N/A"}`,
    `- 失败 gate：${failedGates(data.semantic?.gates).join("、") || "无"}`,
    "",
    "| 分段 | 次数 | 占比 |",
    "|---|---:|---:|",
    renderDistribution(data.semantic?.bands, data.semantic?.totalRuns),
    "",
    "### 语义回归失败人格",
    "",
    "| 编号 | 人格 | 平均分 | 分数范围 | 主段位 | 主标签 | 命中 |",
    "|---|---|---:|---|---|---|---:|",
    renderFailures(semanticFailures),
    "",
    "## 5. 动态抽题与题库消费",
    "",
    data.coverage
      ? [
          `- 普通引擎路径：${data.coverage.engineCoverage.ok ? "通过" : "未通过"}，消费 ${data.coverage.engineCoverage.usedItemCount}/${data.coverage.engineCoverage.totalItems} 题，唯一路径率 ${data.coverage.engineCoverage.uniquePathRate}%`,
          `- 语义真人路径：${data.coverage.semanticCoverage.ok ? "通过" : "未通过"}，消费 ${data.coverage.semanticCoverage.usedItemCount}/${data.coverage.semanticCoverage.totalItems} 题，唯一路径率 ${data.coverage.semanticCoverage.uniquePathRate}%`,
          `- 覆盖报告：${data.coverage.reportPaths?.mdPath || "N/A"}`,
        ].join("\n")
      : "未运行。",
    "",
    "## 6. 应用集成测试",
    "",
    data.app
      ? [
          `- 结果：${data.app.ok ? "通过" : "未通过"}`,
          `- 覆盖人格：${(data.app.personas || []).join("、") || "N/A"}`,
          `- 失败：${appFailures.length ? appFailures.join("、") : "无"}`,
        ].join("\n")
      : "未运行。",
    "",
  ].join("\n");
}

export function renderFailureDiagnosis(data) {
  const engineFailed = failedGates(data.engine?.gates || {});
  const semanticFailed = failedGates(data.semantic?.gates || {});
  const auditFailed = failedGates(data.audit?.gates || {});
  const coverageFailed = [
    ...failedGates(data.coverage?.engineCoverage?.gates || {}),
    ...failedGates(data.coverage?.semanticCoverage?.gates || {}),
  ];
  const failedPersonaHints = [...(data.engine?.quality?.failures || []), ...(data.semantic?.semanticQuality?.failures || [])]
    .map((failure) => `${failure.personaId} ${failure.personaName}`)
    .filter((item, index, list) => list.indexOf(item) === index);
  const lines = [
    "# 模拟测试失败诊断",
    "",
    `生成时间：${new Date().toISOString()}`,
    "",
    "说明：这里的分类用于确定优先修复方向。失败人格清单只是复核线索，不自动等同于虚拟人设定错误。",
    "",
  ];
  const pushBucket = (title, items) => {
    lines.push(`## ${title}`, "");
    lines.push(items.length ? items.map((item) => `- ${item}`).join("\n") : "无", "");
  };
  pushBucket("评测设计/验收标准问题", [...engineFailed, ...semanticFailed].filter((gate) => /band|label|accuracy|stability|core_personas/.test(gate)));
  pushBucket("题目语义问题", semanticFailed.filter((gate) => /semantic|u21|u25|x99|boundary/.test(gate)));
  pushBucket("计分元数据/打分标准问题", [...auditFailed, ...engineFailed].filter((gate) => /metadata|score|u16|u30|x99/.test(gate)));
  pushBucket("动态引擎问题", [...engineFailed, ...coverageFailed].filter((gate) => /question|route|risk|coverage|average_questions|consumed|path|followup|item/.test(gate)));
  pushBucket("前端应用集成问题", data.app?.failures || []);
  pushBucket("虚拟人设定问题", data.personaValidation?.errors || []);
  pushBucket("失败人格复核线索", failedPersonaHints);
  return lines.join("\n");
}

export function writeReports(data, options = {}) {
  const docsDir = path.resolve(ROOT, options.docsDir || "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const jsonPath = path.join(docsDir, "latest-simulator-report.json");
  const mdPath = path.join(docsDir, "latest-simulator-report.md");
  const diagnosisPath = path.join(docsDir, "failure-diagnosis.md");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  fs.writeFileSync(mdPath, renderSimulatorMarkdown(data));
  fs.writeFileSync(diagnosisPath, renderFailureDiagnosis(data));
  return {
    jsonPath: path.relative(ROOT, jsonPath),
    mdPath: path.relative(ROOT, mdPath),
    diagnosisPath: path.relative(ROOT, diagnosisPath),
  };
}
