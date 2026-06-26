import { spawnSync } from "node:child_process";
import { auditConfig } from "./config-audit.mjs";
import { runEngineRegression } from "./engine-runner.mjs";
import { runSemanticRegression } from "./semantic-runner.mjs";
import { runDynamicCoverage } from "./dynamic-coverage-runner.mjs";
import { writeReports } from "./report-writer.mjs";
import { runPsychometricQualityAudit } from "./psychometric-quality-runner.mjs";

const args = process.argv.slice(2);

function argValue(name, fallback = "") {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function runAppIntegration() {
  const run = spawnSync("npx", ["playwright", "test", "tests/simulator/app-runner.spec.mjs", "--reporter=json"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  let parsed = null;
  try {
    parsed = JSON.parse(run.stdout);
  } catch {
    parsed = null;
  }
  const failures = [];
  if ((run.status ?? 1) !== 0) {
    const parsedErrors = (parsed?.errors || [])
      .map((error) => error.message || error.stack || String(error))
      .filter(Boolean);
    failures.push(...(parsedErrors.length ? parsedErrors : [run.stderr || run.stdout.slice(0, 1000) || "playwright failed"]));
  }
  return {
    ok: (run.status ?? 1) === 0,
    personas: ["X99", "U17", "U21", "U25", "U30"],
    failures,
    rawStatus: run.status ?? 1,
    parsed,
  };
}

const rounds = Number.parseInt(argValue("--rounds", "5"), 10);
const includeApp = args.includes("--include-app");
const includePsychometric = args.includes("--include-psychometric");
const includeCoverage = args.includes("--include-coverage") || includePsychometric;
const summaryOnly = args.includes("--summary-only");
const strict = args.includes("--strict");

const audit = auditConfig();
const engine = runEngineRegression({ rounds, includeX99: true, summaryOnly: true });
const semantic = runSemanticRegression({ rounds, includeX99: true, summaryOnly: true });
const coverage = includeCoverage ? runDynamicCoverage({ rounds: Math.max(rounds, 20) }) : null;
const app = includeApp ? runAppIntegration() : null;
const data = { audit, engine, semantic, ...(coverage ? { coverage } : {}), ...(app ? { app } : {}) };
const reportPaths = writeReports(data);
const psychometric = includePsychometric ? runPsychometricQualityAudit() : null;
const ok = audit.ok && engine.ok && semantic.ok && (!coverage || (coverage.engineCoverage.ok && coverage.semanticCoverage.ok)) && (!app || app.ok) && (!psychometric || psychometric.overallOk);

const output = {
  ok,
  reportPaths,
  audit: { ok: audit.ok, failedGates: Object.entries(audit.gates).filter(([, passed]) => !passed).map(([name]) => name) },
  engine: {
    ok: engine.ok,
    failedGates: Object.entries(engine.gates).filter(([, passed]) => !passed).map(([name]) => name),
    averageScore: engine.averageScore,
    totalRuns: engine.totalRuns,
  },
  semantic: {
    ok: semantic.ok,
    failedGates: Object.entries(semantic.gates).filter(([, passed]) => !passed).map(([name]) => name),
    stableCorePersonas: semantic.semanticQuality.stableCorePersonas,
    corePersonaCount: semantic.semanticQuality.corePersonaCount,
  },
  ...(coverage ? {
    coverage: {
      engine: {
        ok: coverage.engineCoverage.ok,
        usedItemCount: coverage.engineCoverage.usedItemCount,
        itemUseRate: coverage.engineCoverage.itemUseRate,
        uniquePathRate: coverage.engineCoverage.uniquePathRate,
        failedGates: Object.entries(coverage.engineCoverage.gates || {}).filter(([, passed]) => !passed).map(([name]) => name),
      },
      semantic: {
        ok: coverage.semanticCoverage.ok,
        usedItemCount: coverage.semanticCoverage.usedItemCount,
        itemUseRate: coverage.semanticCoverage.itemUseRate,
        uniquePathRate: coverage.semanticCoverage.uniquePathRate,
        failedGates: Object.entries(coverage.semanticCoverage.gates || {}).filter(([, passed]) => !passed).map(([name]) => name),
      },
      reportPaths: coverage.reportPaths,
    },
  } : {}),
  ...(app ? { app: { ok: app.ok, failures: app.failures } } : {}),
  ...(psychometric ? {
    psychometric: {
      ok: psychometric.overallOk,
      failedLayers: psychometric.layers.filter((layer) => !layer.ok).map((layer) => layer.id),
      reportPaths: psychometric.reportPaths,
      summary: psychometric.summary,
    },
  } : {}),
};

console.log(JSON.stringify(summaryOnly ? output : { ...output, full: data }, null, 2));
if (strict && !ok) process.exitCode = 1;
