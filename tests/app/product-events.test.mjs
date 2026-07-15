import test from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_EVENTS, sanitizeProperties } from "../../src/app/product-events.js";

test("keeps only privacy-safe primitive funnel properties", () => {
  assert.deepEqual(sanitizeProperties({
    answeredCount: 18,
    stage: "followup",
    showScore: true,
    optionKey: "A",
    questionText: "不应记录",
    nested: { answer: "不应记录" },
  }), {
    answeredCount: 18,
    stage: "followup",
    showScore: true,
  });
});

test("exposes only the intended local funnel event names", () => {
  assert.equal(ALLOWED_EVENTS.has("assessment_complete"), true);
  assert.equal(ALLOWED_EVENTS.has("assessment_answer_text"), false);
});
