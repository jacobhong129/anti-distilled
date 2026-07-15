import assert from "node:assert/strict";
import test from "node:test";
import {
  RESULT_HISTORY_KEY,
  RESULT_HISTORY_LIMIT,
  RESULT_HISTORY_TTL_MS,
  clearResultHistory,
  readResultHistory,
  upsertResultHistory,
} from "../../src/app/result-history-store.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function result(score = 68) {
  return {
    score,
    band: { name: "招牌养成型" },
    labelDetails: { name: "教得会替不了" },
    dimensions: [{ key: "CXT", name: "情境", value: 70 }],
  };
}

test("stores newest compatible results and upserts the same assessment session", () => {
  const storage = createStorage();
  upsertResultHistory(storage, "12.1", { id: "one", result: result(), roleContext: null }, 1_000);
  upsertResultHistory(storage, "12.1", { id: "one", result: result(), roleContext: { roleId: "product" } }, 2_000);
  const entries = readResultHistory(storage, "12.1", 2_500);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].completedAt, 1_000);
  assert.equal(entries[0].roleContext.roleId, "product");
});

test("drops expired and config-incompatible results", () => {
  const storage = createStorage();
  upsertResultHistory(storage, "12.1", { id: "old", result: result() }, 1_000);
  assert.deepEqual(readResultHistory(storage, "13.0", 2_000), []);

  upsertResultHistory(storage, "12.1", { id: "expired", result: result() }, 1_000);
  assert.deepEqual(readResultHistory(storage, "12.1", 1_000 + RESULT_HISTORY_TTL_MS + 1), []);
});

test("caps history and can clear it", () => {
  const storage = createStorage();
  for (let index = 0; index < RESULT_HISTORY_LIMIT + 2; index += 1) {
    upsertResultHistory(storage, "12.1", { id: `result-${index}`, result: result(50 + index) }, 1_000 + index);
  }
  assert.equal(readResultHistory(storage, "12.1", 3_000).length, RESULT_HISTORY_LIMIT);
  clearResultHistory(storage);
  assert.equal(storage.getItem(RESULT_HISTORY_KEY), null);
});
