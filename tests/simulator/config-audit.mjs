import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OPTION_KEYS = new Set(["A", "B", "C", "D"]);
const VALID_STAGES = new Set(["screening", "followup", "auxiliary", "split"]);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), "utf8"));
}

function fileEquals(left, right) {
  return fs.readFileSync(path.resolve(ROOT, left)).equals(fs.readFileSync(path.resolve(ROOT, right)));
}

export function auditConfig(options = {}) {
  const configPath = options.configPath || "config/game-config-v11.json";
  const config = readJson(configPath);
  const errors = [];
  const warnings = [];
  const metrics = new Set(config.scoreMetrics || []);
  const labels = new Set(Object.keys(config.labels || {}));
  const labelDetails = new Set(Object.keys(config.labelDetails || {}));

  if ((config.items || []).length !== 120) errors.push(`expected 120 items, got ${(config.items || []).length}`);
  if ([...(config.items || [])].reduce((sum, item) => sum + (item.options || []).length, 0) !== 480) errors.push("expected 480 options");
  for (const label of labels) {
    if (!labelDetails.has(label)) errors.push(`labelDetails missing ${label}`);
  }

  let metadataComplete = 0;
  for (const item of config.items || []) {
    if (!VALID_STAGES.has(item.stage)) errors.push(`${item.id}: invalid stage ${item.stage}`);
    const keys = new Set((item.options || []).map((option) => option.key));
    for (const key of OPTION_KEYS) {
      if (!keys.has(key)) errors.push(`${item.id}: missing option ${key}`);
    }
    if (!Array.isArray(item.presentationOrder) || item.presentationOrder.length !== 4) warnings.push(`${item.id}: presentationOrder is not explicit A/B/C/D`);
    for (const option of item.options || []) {
      const scores = option.scores || {};
      const labelDelta = option.labelDelta || {};
      if (Object.keys(scores).length && (option.evidence || []).length && Object.keys(labelDelta).length) metadataComplete += 1;
      for (const metric of Object.keys(scores)) {
        if (!metrics.has(metric)) errors.push(`${item.id}.${option.key}: invalid score metric ${metric}`);
      }
      for (const label of Object.keys(labelDelta)) {
        if (!labels.has(label)) errors.push(`${item.id}.${option.key}: invalid labelDelta ${label}`);
      }
    }
  }

  const ranges = [...(config.resultBands || [])].sort((left, right) => left.min - right.min);
  let cursor = 20;
  for (const band of ranges) {
    if (band.min !== cursor) errors.push(`result band gap before ${band.name}`);
    cursor = band.max + 1;
  }
  if (cursor !== 101) errors.push("result bands must cover 20-100");

  const configMatchesWeb = fs.existsSync(path.resolve(ROOT, "web/data/game-config.json"))
    ? fileEquals(configPath, "web/data/game-config.json")
    : false;
  const configMatchesPublic = fs.existsSync(path.resolve(ROOT, "public/data/game-config.json"))
    ? fileEquals(configPath, "public/data/game-config.json")
    : false;

  const gates = {
    config_has_120_items: (config.items || []).length === 120,
    config_has_480_options: (config.items || []).reduce((sum, item) => sum + (item.options || []).length, 0) === 480,
    all_options_have_scoring_metadata: metadataComplete === 480,
    result_bands_cover_20_to_100: !errors.some((error) => error.includes("result band")),
    labels_have_details: labels.size > 0 && [...labels].every((label) => labelDetails.has(label)),
    risk_rules_present: Object.keys(config.riskRules || {}).length > 0,
    config_matches_web_data: configMatchesWeb,
    config_matches_public_data: configMatchesPublic,
  };

  return {
    configVersion: config.version,
    itemCount: (config.items || []).length,
    optionCount: (config.items || []).reduce((sum, item) => sum + (item.options || []).length, 0),
    metadataComplete,
    labelCount: labels.size,
    riskRuleCount: Object.keys(config.riskRules || {}).length,
    gates,
    errors,
    warnings,
    ok: errors.length === 0 && Object.values(gates).every(Boolean),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = auditConfig();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
