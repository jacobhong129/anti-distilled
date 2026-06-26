import { compactSemanticResult, runSemanticRegression } from "../tests/simulator/semantic-runner.mjs";

function value(args, name, fallback = "") {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

const args = process.argv.slice(2);
const result = runSemanticRegression({
  rounds: Number.parseInt(value(args, "--rounds", process.env.ROUNDS || "5"), 10),
  personaIds: value(args, "--personas", process.env.PERSONAS || "").split(",").map((id) => id.trim()).filter(Boolean),
  includeX99: args.includes("--include-x99"),
  includeStress: args.includes("--include-stress"),
  includeCalibration: args.includes("--include-calibration"),
  summaryOnly: args.includes("--summary-only"),
});

console.log(JSON.stringify(args.includes("--summary-only") ? compactSemanticResult(result) : result, null, 2));
if (args.includes("--strict") && !result.ok) process.exitCode = 1;
