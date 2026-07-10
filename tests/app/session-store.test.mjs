import assert from "node:assert/strict";
import test from "node:test";
import {
  SESSION_SCHEMA_VERSION,
  SESSION_TTL_MS,
  STORAGE_KEY,
  readAssessmentSession,
  writeAssessmentSession,
} from "../../src/app/session-store.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("writes and restores a compatible assessment session", () => {
  const storage = createStorage();
  writeAssessmentSession(storage, "12.0", { view: "question", snapshot: { item: "Q1" } }, 1_000);
  const saved = readAssessmentSession(storage, "12.0", 1_500);
  assert.equal(saved.schemaVersion, SESSION_SCHEMA_VERSION);
  assert.equal(saved.snapshot.item, "Q1");
});

test("discards expired or config-incompatible sessions", () => {
  const storage = createStorage();
  writeAssessmentSession(storage, "12.0", { view: "result", result: { score: 66 } }, 1_000);
  assert.equal(readAssessmentSession(storage, "13.0", 1_500), null);
  assert.equal(storage.getItem(STORAGE_KEY), null);

  writeAssessmentSession(storage, "12.0", { view: "result", result: { score: 66 } }, 1_000);
  assert.equal(readAssessmentSession(storage, "12.0", 1_000 + SESSION_TTL_MS + 1), null);
});

test("removes malformed persisted data without throwing", () => {
  const storage = createStorage();
  storage.setItem(STORAGE_KEY, "not-json");
  assert.equal(readAssessmentSession(storage, "12.0", 1_000), null);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});
