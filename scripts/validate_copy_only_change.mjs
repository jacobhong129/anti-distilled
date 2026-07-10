import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const baselineRef = process.env.COPY_BASELINE_REF || "ae304c2";
const sourcePath = "config/game-config-v11.json";
const publicPath = "public/data/game-config.json";
const webPath = "web/data/game-config.json";

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const hashFile = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const baseline = JSON.parse(execFileSync("git", ["show", `${baselineRef}:${sourcePath}`], { cwd: root, encoding: "utf8" }));
const current = readJson(sourcePath);

function copyShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(Object.keys(value).map((key) => [key, "<copy>"]));
}

function protectedShape(config) {
  const clone = structuredClone(config);

  clone.version = "<copy-version>";
  clone.title = "<copy>";
  clone.sectionIntros = copyShape(clone.sectionIntros);

  clone.resultBands = clone.resultBands.map((band) => {
    const next = { ...band };
    for (const field of ["line", "summary", "playfulAside", "growthNudge"]) delete next[field];
    return next;
  });

  clone.labelDetails = Object.fromEntries(Object.entries(clone.labelDetails).map(([key, detail]) => {
    const next = { ...detail };
    for (const field of ["plainMeaning", "shareLine", "resonance", "misunderstanding", "growthNudge", "playfulAside"]) delete next[field];
    return [key, next];
  }));

  if (clone.roleContext) {
    clone.roleContext.principle = "<copy>";
    clone.roleContext.displayName = "<copy>";
    clone.roleContext.description = "<copy>";
    clone.roleContext.dimensions = copyShape(clone.roleContext.dimensions);
    clone.roleContext.archetypes = clone.roleContext.archetypes.map((item) => ({ ...item, name: "<copy>", note: "<copy>" }));
    clone.roleContext.resultPolicy = { ...clone.roleContext.resultPolicy, copyTemplate: "<copy>" };
  }

  if (clone.resultExplanationPolicy) {
    clone.resultExplanationPolicy.stabilityCopy = copyShape(clone.resultExplanationPolicy.stabilityCopy);
    clone.resultExplanationPolicy.copyPrinciple = "<copy>";
  }

  clone.items = clone.items.map((item) => ({
    ...item,
    prefix: "<copy>",
    dimensionText: "<copy>",
    question: "<copy>",
    options: item.options.map((option) => ({ ...option, text: "<copy>" })),
  }));

  return clone;
}

function assertResultCopySchema(config) {
  const bandFields = ["summary", "playfulAside", "growthNudge", "line"];
  const labelFields = ["plainMeaning", "shareLine", "resonance", "misunderstanding", "growthNudge", "playfulAside"];
  assert.equal(config.resultBands.length, 8, "结果段位必须保持 8 个");
  assert.equal(Object.keys(config.labelDetails).length, 19, "判断标签必须保持 19 个");
  for (const band of config.resultBands) {
    for (const field of bandFields) assert.ok(band[field]?.trim(), `${band.name} 缺少 ${field}`);
  }
  for (const [key, detail] of Object.entries(config.labelDetails)) {
    for (const field of labelFields) assert.ok(detail[field]?.trim(), `${key} 缺少 ${field}`);
  }
}

assert.equal(current.version, "12.1", "纯文案版本必须为 12.1");
assert.deepEqual(protectedShape(current), protectedShape(baseline), `发现 ${baselineRef} 之外的非展示字段变化`);
assert.equal(current.items.length, 120, "题目数量变化");
assert.equal(current.items.flatMap((item) => item.options).length, 480, "选项数量变化");
assertResultCopySchema(current);

for (const item of current.items) {
  assert.ok(item.question.trim(), `${item.id} 题干为空`);
  assert.ok([...item.question].length <= 34, `${item.id} 题干超过 34 字`);
  assert.equal(item.options.length, 4, `${item.id} 选项数变化`);
  for (const option of item.options) {
    assert.ok(option.text.trim(), `${item.id}/${option.key} 选项为空`);
    assert.ok([...option.text].length <= 22, `${item.id}/${option.key} 选项超过 22 字`);
  }
}

const sourceText = fs.readFileSync(path.join(root, sourcePath), "utf8");
for (const mirrorPath of [publicPath, webPath]) {
  assert.ok(fs.existsSync(path.join(root, mirrorPath)), `缺少配置副本 ${mirrorPath}`);
  assert.equal(fs.readFileSync(path.join(root, mirrorPath), "utf8"), sourceText, `${mirrorPath} 未与源配置逐字同步`);
}

const hashes = [sourcePath, publicPath, webPath].map((file) => ({ file, sha256: hashFile(file) }));
assert.equal(new Set(hashes.map(({ sha256 }) => sha256)).size, 1, "三份配置哈希不一致");

console.log(`copy-only 校验通过（基线 ${baselineRef}）`);
console.log(`题目审阅：${current.items.length}/120`);
console.log(`选项审阅：${current.items.flatMap((item) => item.options).length}/480`);
for (const { file, sha256 } of hashes) console.log(`${file}: ${sha256}`);
