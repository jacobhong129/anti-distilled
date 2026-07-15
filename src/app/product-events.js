const EVENT_STORAGE_KEY = "anti-distilled-product-events-v1";
const MAX_EVENTS = 50;
const ALLOWED_EVENTS = new Set([
  "home_start",
  "assessment_resume",
  "assessment_exit",
  "assessment_answer",
  "assessment_complete",
  "result_detail_open",
  "work_context_open",
  "work_context_saved",
  "share_open",
  "share_copy",
  "share_download",
  "share_native",
  "history_open",
  "retest_start",
]);

const ALLOWED_PROPERTIES = new Set([
  "answeredCount",
  "stage",
  "scoreBand",
  "detailType",
  "format",
  "tone",
  "showScore",
  "showDimensions",
  "historyCount",
  "roleId",
]);

export function sanitizeProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties || {})
      .filter(([key, value]) => ALLOWED_PROPERTIES.has(key) && ["string", "number", "boolean"].includes(typeof value))
  );
}

export function trackProductEvent(name, properties = {}) {
  if (!ALLOWED_EVENTS.has(name) || typeof window === "undefined") return;
  const detail = {
    name,
    properties: sanitizeProperties(properties),
    at: Date.now(),
  };

  window.dispatchEvent(new CustomEvent("anti-distilled:product-event", { detail }));

  try {
    const current = JSON.parse(window.sessionStorage.getItem(EVENT_STORAGE_KEY) || "[]");
    const next = [...(Array.isArray(current) ? current : []), detail].slice(-MAX_EVENTS);
    window.sessionStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local diagnostics must never interrupt the assessment.
  }
}

export { ALLOWED_EVENTS, EVENT_STORAGE_KEY };
