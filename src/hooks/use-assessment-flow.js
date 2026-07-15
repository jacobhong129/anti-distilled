import { useEffect, useRef, useState } from "react";
import { clearAssessmentSession, readAssessmentSession, writeAssessmentSession } from "../app/session-store.js";
import { AdaptiveAssessment } from "../engine/adaptive-engine.js";

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useAssessmentFlow(gameConfig) {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new AdaptiveAssessment(gameConfig);

  const [view, setView] = useState("home");
  const [currentItem, setCurrentItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [roleContext, setRoleContext] = useState(null);
  const [result, setResult] = useState(null);
  const [resumeSession, setResumeSession] = useState(null);
  const [sessionId, setSessionId] = useState(createSessionId);

  useEffect(() => {
    const saved = readAssessmentSession(window.localStorage, gameConfig.version);
    if (!saved) return;

    try {
      if (saved.view === "question" && saved.snapshot) {
        setResumeSession(saved);
        setRoleContext(saved.roleContext || { skipped: true });
        setSessionId(saved.sessionId || createSessionId());
        return;
      }

      if (saved.view === "result" && saved.result) {
        setRoleContext(saved.roleContext || null);
        setSessionId(saved.sessionId || createSessionId());
        setResult(saved.result);
        setView("result");
      }
    } catch {
      clearAssessmentSession(window.localStorage);
    }
  }, [gameConfig]);

  useEffect(() => {
    try {
      if (view === "question" && currentItem) {
        writeAssessmentSession(window.localStorage, gameConfig.version, {
          view,
          sessionId,
          roleContext,
          history,
          snapshot: engineRef.current.getSnapshot(),
        });
      } else if (view === "result" && result) {
        writeAssessmentSession(window.localStorage, gameConfig.version, {
          view,
          sessionId,
          roleContext,
          result,
        });
      }
    } catch {
      // Persistence is optional. The assessment remains usable without it.
    }
  }, [gameConfig.version, view, currentItem, history, roleContext, result, sessionId]);

  const startAssessment = (context = { skipped: true }) => {
    clearAssessmentSession(window.localStorage);
    const engine = new AdaptiveAssessment(gameConfig);
    engineRef.current = engine;
    const firstItem = engine.start(context);
    setSessionId(createSessionId());
    setRoleContext(context);
    setResumeSession(null);
    setHistory([]);
    setResult(null);
    setCurrentItem(firstItem);
    setView("question");
  };

  const resumeAssessment = () => {
    if (!resumeSession?.snapshot) return false;
    try {
      const engine = new AdaptiveAssessment(gameConfig);
      engine.restoreSnapshot(resumeSession.snapshot);
      engineRef.current = engine;
      setSessionId(resumeSession.sessionId || createSessionId());
      setHistory(Array.isArray(resumeSession.history) ? resumeSession.history : []);
      setRoleContext(resumeSession.roleContext || { skipped: true });
      setResult(null);
      setCurrentItem(engine.currentItem || null);
      setView("question");
      return true;
    } catch {
      clearAssessmentSession(window.localStorage);
      setResumeSession(null);
      return false;
    }
  };

  const exitToHome = () => {
    if (currentItem) {
      const payload = {
        view: "question",
        sessionId,
        roleContext,
        history,
        snapshot: engineRef.current.getSnapshot(),
      };
      try {
        writeAssessmentSession(window.localStorage, gameConfig.version, payload);
      } catch {
        // Exiting still works when local storage is unavailable.
      }
      setResumeSession(payload);
    }
    setView("home");
  };

  const answer = (optionKey) => {
    const engine = engineRef.current;
    const snapshot = engine.getSnapshot();
    const nextResult = engine.answerCurrent(optionKey);
    setHistory((items) => [...items, snapshot]);
    if (nextResult) {
      setResult(nextResult);
      setResumeSession(null);
      setCurrentItem(null);
      setView("result");
      return nextResult;
    }
    setCurrentItem(engine.currentItem);
    return null;
  };

  const previous = () => {
    setHistory((items) => {
      const next = [...items];
      const snapshot = next.pop();
      if (!snapshot) return items;
      engineRef.current.restoreSnapshot(snapshot);
      setResult(null);
      setCurrentItem(engineRef.current.currentItem);
      setView("question");
      return next;
    });
  };

  const restart = () => {
    clearAssessmentSession(window.localStorage);
    engineRef.current = new AdaptiveAssessment(gameConfig);
    setSessionId(createSessionId());
    setCurrentItem(null);
    setHistory([]);
    setRoleContext(null);
    setResult(null);
    setResumeSession(null);
    setView("home");
  };

  return {
    engine: engineRef.current,
    view,
    setView,
    currentItem,
    history,
    roleContext,
    result,
    sessionId,
    resumeAvailable: Boolean(resumeSession?.snapshot),
    resumeAnsweredCount: resumeSession?.snapshot?.state?.answers?.length || 0,
    startAssessment,
    resumeAssessment,
    exitToHome,
    answer,
    previous,
    restart,
    updateRoleContext: setRoleContext,
  };
}
