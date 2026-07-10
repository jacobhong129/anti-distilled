import { useCallback, useEffect, useState } from "react";
import { publicAsset } from "../app/assets.js";

const CONFIG_PATH = "data/game-config.json";

export function useGameConfig() {
  const [requestId, setRequestId] = useState(0);
  const [state, setState] = useState({ config: null, error: null, loading: true });

  const retry = useCallback(() => setRequestId((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, error: null, loading: true }));

    async function load() {
      try {
        const response = await fetch(publicAsset(CONFIG_PATH), {
          cache: "no-cache",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
        const config = await response.json();
        setState({ config, error: null, loading: false });
      } catch (error) {
        if (error?.name !== "AbortError") {
          setState({ config: null, error, loading: false });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [requestId]);

  return { ...state, retry };
}
