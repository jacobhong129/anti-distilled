import { useEffect, useRef, useState } from "react";
import { clearAssessmentSession, readAssessmentSession, writeAssessmentSession } from "../app/session-store.js";
import { AdaptiveAssessment } from "../engine/adaptive-engine.js";

export function useAssessmentFlow(gameConfig) {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new AdaptiveAssessment(gameConfig);
  const [view, setView] = useState("home");
  const [currentItem, setCurrentItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [roleContext, setRoleContext] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const saved = readAssessmentSession(window.localStorage, gameConfig.version);
    if (!saved) return;

    try {
      const engine = new AdaptiveAssessment(gameConfig);
      if (saved.snapshot && saved.view === "question") {
        engine.restoreSnapshot(saved.snapshot);
        engineRef.current = engine;
        setHistory(Array.isArray(saved.history) ? saved.history : []);
        setRoleContext(saved.roleContext || null);
        setCurrentItem(engine.currentItem || null);
        setView("question");
      } else if (saved.view === "result" && saved.result) {
        engineRef.current = engine;
        setRoleContext(saved.roleContext || null);
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
          roleContext,
          history,
          snapshot: engineRef.current.getSnapshot(),
        });
      } else if (view === "result" && result) {
        writeAssessmentSession(window.localStorage, gameConfig.version, { view, roleContext, result });
      }
    } catch {
      // Local storage is a convenience only. The assessment remains usable without it.
    }
  }, [gameConfig.version, view, currentItem, history, roleContext, result]);

  const startAssessment = (context) => {
    const engine = new AdaptiveAssessment(gameConfig);
    engineRef.current = engine;
    const firstItem = engine.start(context);
    setRoleContext(context);
    setHistory([]);
    setResult(null);
    setCurrentItem(firstItem);
    setView("question");
  };

  const answer = (optionKey) => {
    const engine = engineRef.current;
    const snapshot = engine.getSnapshot();
    const nextResult = engine.answerCurrent(optionKey);
    setHistory((items) => [...items, snapshot]);
    if (nextResult) {
      setResult(nextResult);
      setCurrentItem(null);
      setView("result");
      return;
    }
    setCurrentItem(engine.currentItem);
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
    setCurrentItem(null);
    setHistory([]);
    setRoleContext(null);
    setResult(null);
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
    startAssessment,
    answer,
    previous,
    restart,
  };
}
