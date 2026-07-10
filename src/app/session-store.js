export const STORAGE_KEY = "anti-distilled-session-v3";
export const SESSION_SCHEMA_VERSION = 3;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function readAssessmentSession(storage, configVersion, now = Date.now()) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const isCompatible =
      saved?.schemaVersion === SESSION_SCHEMA_VERSION &&
      saved?.configVersion === configVersion &&
      Number.isFinite(saved?.savedAt) &&
      now - saved.savedAt >= 0 &&
      now - saved.savedAt <= SESSION_TTL_MS &&
      (saved.view === "question" || saved.view === "result");

    if (!isCompatible) {
      clearAssessmentSession(storage);
      return null;
    }
    return saved;
  } catch {
    clearAssessmentSession(storage);
    return null;
  }
}

export function writeAssessmentSession(storage, configVersion, payload, now = Date.now()) {
  storage?.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...payload,
      schemaVersion: SESSION_SCHEMA_VERSION,
      configVersion,
      savedAt: now,
    })
  );
}

export function clearAssessmentSession(storage) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Persistence is optional; clearing a blocked storage area should not break the assessment.
  }
}
