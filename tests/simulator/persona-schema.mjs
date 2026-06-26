import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_REGISTRY_PATH = path.join(ROOT, "config/personas-v12.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveFromConfig(filePath, maybeRelative) {
  return path.resolve(path.dirname(filePath), maybeRelative);
}

function mergeSemanticAnswerModel(legacy, entry) {
  const legacyWeights = legacy?.semanticPolicy?.weights || {};
  const model = entry.semanticAnswerModel || {};
  return {
    featureWeights: { ...legacyWeights, ...(model.featureWeights || {}) },
    positivePatterns: model.positivePatterns || entry.semanticPolicy?.attractedTo || legacy?.semanticPolicy?.attractedTo || [],
    negativePatterns: model.negativePatterns || entry.semanticPolicy?.avoids || legacy?.semanticPolicy?.avoids || [],
    tieBreak: model.tieBreak || "stable",
  };
}

function mergePersona(entry, legacyById, group) {
  const prototype = legacyById.get(entry.prototypeId || entry.id) || {};
  const merged = {
    ...prototype,
    ...entry,
    id: entry.id,
    prototypeId: entry.prototypeId || entry.id,
    group,
    name: entry.name || prototype.name || entry.id,
    socialLayer: entry.socialLayer || prototype.socialLayer || group,
    coreProfile: entry.coreProfile || prototype.coreProfile || "",
    sampleWeight: entry.sampleWeight ?? prototype.sampleWeight ?? 0,
    demographicProxy: {
      ageBand: "unspecified",
      careerLevel: "unspecified",
      workComplexity: "unspecified",
      aiExposure: "unspecified",
      expressionFluency: "unspecified",
      socialCommonness: "unspecified",
      ...(prototype.demographicProxy || {}),
      ...(entry.demographicProxy || {}),
    },
    behaviorModel: {
      decisionStyle: "unspecified",
      riskBias: "unspecified",
      expressionStyle: "unspecified",
      collaborationMode: "unspecified",
      ...(prototype.behaviorModel || {}),
      ...(entry.behaviorModel || {}),
    },
    semanticAnswerModel: mergeSemanticAnswerModel(prototype, entry),
    semanticPolicy: entry.semanticPolicy || prototype.semanticPolicy || {},
    expectedOutcome: entry.expectedOutcome || prototype.expectedOutcome || {},
    acceptanceGate: {
      ...(prototype.acceptanceGate || {}),
      ...(entry.acceptanceGate || {}),
    },
  };

  return merged;
}

export function validatePersonaRegistry(registry) {
  const errors = [];
  const warnings = [];
  const coreIds = registry.corePersonas.map((persona) => persona.id);
  const expectedCoreIds = Array.from({ length: 30 }, (_, index) => `U${String(index + 1).padStart(2, "0")}`);
  if (registry.corePersonas.length !== 30) errors.push(`expected 30 core personas, got ${registry.corePersonas.length}`);
  for (const id of expectedCoreIds) {
    if (!coreIds.includes(id)) errors.push(`missing core persona ${id}`);
  }
  if (!registry.stressPersonas.some((persona) => persona.id === "X99")) errors.push("missing X99 stress persona");

  for (const persona of [...registry.corePersonas, ...registry.calibrationPool, ...registry.stressPersonas]) {
    for (const key of ["id", "name", "socialLayer", "coreProfile", "demographicProxy", "behaviorModel", "semanticAnswerModel", "expectedOutcome", "acceptanceGate"]) {
      if (persona[key] === undefined || persona[key] === null) errors.push(`${persona.id}: missing ${key}`);
    }
    if (!Object.keys(persona.semanticAnswerModel?.featureWeights || {}).length) warnings.push(`${persona.id}: no semantic feature weights`);
    if (!persona.expectedOutcome?.scoreRange && !persona.acceptanceGate?.scoreRange) warnings.push(`${persona.id}: no score range expectation`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function loadPersonaRegistry(options = {}) {
  const registryPath = path.resolve(ROOT, options.registryPath || DEFAULT_REGISTRY_PATH);
  const raw = readJson(registryPath);
  const sourceCorePath = raw.sourceCore ? resolveFromConfig(registryPath, raw.sourceCore) : null;
  const sourceCore = sourceCorePath ? readJson(sourceCorePath) : { personas: [] };
  const legacyById = new Map((sourceCore.personas || []).map((persona) => [persona.id, persona]));

  const corePersonas = (raw.corePersonas || []).map((entry) => mergePersona(entry, legacyById, "core"));
  const mergedById = new Map([...legacyById, ...corePersonas.map((persona) => [persona.id, persona])]);
  const calibrationPool = (raw.calibrationPool || []).map((entry) => mergePersona(entry, mergedById, "calibration"));
  const stressPersonas = (raw.stressPersonas || []).map((entry) => mergePersona(entry, mergedById, "stress"));

  const registry = {
    personaVersion: raw.personaVersion,
    defaults: raw.defaults || {},
    corePersonas,
    calibrationPool,
    stressPersonas,
  };
  const validation = validatePersonaRegistry(registry);
  if (validation.errors.length && !options.allowInvalid) {
    const error = new Error(`persona registry invalid: ${validation.errors.join("; ")}`);
    error.validation = validation;
    throw error;
  }
  registry.validation = validation;
  return registry;
}

export function selectPersonas(registry, options = {}) {
  const ids = new Set(options.ids || []);
  const rows = [
    ...registry.corePersonas,
    ...(options.includeCalibration ? registry.calibrationPool : []),
    ...(options.includeStress ? registry.stressPersonas : []),
  ];
  const selected = ids.size ? rows.filter((persona) => ids.has(persona.id)) : rows;
  if (options.includeX99 && !selected.some((persona) => persona.id === "X99")) {
    const x99 = registry.stressPersonas.find((persona) => persona.id === "X99");
    if (x99) selected.push(x99);
  }
  return selected;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const registry = loadPersonaRegistry({ allowInvalid: true });
  const summary = {
    personaVersion: registry.personaVersion,
    corePersonas: registry.corePersonas.length,
    calibrationPool: registry.calibrationPool.length,
    stressPersonas: registry.stressPersonas.length,
    validation: registry.validation,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!registry.validation.valid) process.exitCode = 1;
}
