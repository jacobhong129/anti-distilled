import { useCallback, useEffect, useState } from "react";
import { clearResultHistory, readResultHistory, upsertResultHistory } from "../app/result-history-store.js";

export function useResultHistory(configVersion) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(readResultHistory(window.localStorage, configVersion));
  }, [configVersion]);

  const saveResult = useCallback((result, roleContext, sessionId) => {
    if (!result || !sessionId) return;
    setEntries(upsertResultHistory(window.localStorage, configVersion, {
      id: sessionId,
      result,
      roleContext: roleContext || null,
    }));
  }, [configVersion]);

  const clearHistory = useCallback(() => {
    clearResultHistory(window.localStorage);
    setEntries([]);
  }, []);

  return { entries, saveResult, clearHistory };
}
