import assert from "node:assert/strict";
import test from "node:test";
import { buildRoleContextReading, normalizeRoleContext } from "../../src/app/role-context.js";

test("normalizes supported work roles without exposing them to scoring", () => {
  assert.deepEqual(normalizeRoleContext("product"), { roleId: "product" });
  assert.equal(normalizeRoleContext("unknown"), null);
});

test("builds a concrete optional work reading", () => {
  assert.match(buildRoleContextReading({ roleId: "brand" }), /市场和品牌工作/);
  assert.equal(buildRoleContextReading(null), "");
});
