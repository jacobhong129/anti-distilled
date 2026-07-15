export const RESULT_HISTORY_KEY = "anti-distilled-result-history-v1";
export const RESULT_HISTORY_SCHEMA_VERSION = 1;
export const RESULT_HISTORY_LIMIT = 6;
export const RESULT_HISTORY_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function isCompatibleEntry(entry, configVersion, now) {
  return Boolean(
    entry &&
    typeof entry.id === "string" &&
    entry.configVersion === configVersion &&
    Number.isFinite(entry.completedAt) &&
    now - entry.completedAt >= 0 &&
    now - entry.completedAt <= RESULT_HISTORY_TTL_MS &&
    Number.isFinite(entry.result?.score) &&
    typeof entry.result?.band?.name === "string" &&
    Array.isArray(entry.result?.dimensions)
  );
}

export function readResultHistory(storage, configVersion, now = Date.now()) {
  try {
    const raw = storage?.getItem(RESULT_HISTORY_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw);
    if (saved?.schemaVersion !== RESULT_HISTORY_SCHEMA_VERSION || !Array.isArray(saved.entries)) {
      storage?.removeItem(RESULT_HISTORY_KEY);
      return [];
    }
    const entries = saved.entries
      .filter((entry) => isCompatibleEntry(entry, configVersion, now))
      .sort((left, right) => right.completedAt - left.completedAt)
      .slice(0, RESULT_HISTORY_LIMIT);
    if (entries.length !== saved.entries.length) writeResultHistory(storage, entries);
    return entries;
  } catch {
    try {
      storage?.removeItem(RESULT_HISTORY_KEY);
    } catch {
      // Result history is optional.
    }
    return [];
  }
}

export function upsertResultHistory(storage, configVersion, entry, now = Date.now()) {
  const current = readResultHistory(storage, configVersion, now);
  const existing = current.find((item) => item.id === entry.id);
  const nextEntry = {
    ...existing,
    ...entry,
    configVersion,
    completedAt: existing?.completedAt || entry.completedAt || now,
  };
  const next = [nextEntry, ...current.filter((item) => item.id !== entry.id)]
    .sort((left, right) => right.completedAt - left.completedAt)
    .slice(0, RESULT_HISTORY_LIMIT);
  writeResultHistory(storage, next);
  return next;
}

export function writeResultHistory(storage, entries) {
  storage?.setItem(RESULT_HISTORY_KEY, JSON.stringify({
    schemaVersion: RESULT_HISTORY_SCHEMA_VERSION,
    entries,
  }));
}

export function clearResultHistory(storage) {
  try {
    storage?.removeItem(RESULT_HISTORY_KEY);
  } catch {
    // Result history is optional.
  }
}
