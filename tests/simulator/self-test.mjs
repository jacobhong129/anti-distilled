import assert from "node:assert/strict";
import gameConfig from "../../config/game-config-v11.json" with { type: "json" };
import { loadPersonaRegistry } from "./persona-schema.mjs";
import { rankOptionsSemantically } from "./semantic-model.mjs";

const registry = loadPersonaRegistry();
const coreIds = registry.corePersonas.map((persona) => persona.id);

assert.equal(registry.corePersonas.length, 30, "registry keeps 30 core personas");
assert.deepEqual(coreIds.slice(0, 3), ["U01", "U02", "U03"], "core personas keep stable IDs");
assert.ok(registry.stressPersonas.some((persona) => persona.id === "X99"), "registry keeps X99 as stress persona");

const item = gameConfig.items.find((candidate) => candidate.id === "SCREEN_04");
const persona = registry.corePersonas.find((candidate) => candidate.id === "U17");
const ranked = rankOptionsSemantically(item, item.options, persona, { seed: "self-test" });

assert.equal(ranked.length, 4, "semantic model ranks all options");
assert.ok(ranked[0].reasons.length > 0, "semantic model explains the top option");
assert.ok(!ranked[0].debugText.includes("labelDelta"), "semantic model does not expose scoring metadata");

console.log("simulator self-test passed");
