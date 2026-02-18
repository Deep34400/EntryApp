/**
 * Global Server Unavailable screen when any API fails with network/timeout/Failed to fetch.
 * Retry is user-driven only: re-runs backend health check; if up → resume app, else stay on screen.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { checkBackendHealth } from "@/lib/backend-health";
import { setServerUnavailableHandler } from "@/lib/server-unavailable-bridge";
import { GlobalErrorScreen } from "@/components/GlobalErrorScreen";

type ContextValue = {
  /** True when global Server Unavailable screen is shown. */
  serverUnavailable: boolean;
  /** User taps Retry: run health check; if ready, clear and resume. No auto retry. */
  retry: () => Promise<void>;
};

const ServerUnavailableContext = createContext<ContextValue | null>(null);

export function ServerUnavailableProvider({ children }: { children: React.ReactNode }) {
  const [serverUnavailable, setServerUnavailable] = useState(false);

  const retry = useCallback(async () => {
    const result = await checkBackendHealth();
    if (result === "ready") {
      setServerUnavailable(false);
    }
  }, []);

  useEffect(() => {
    setServerUnavailableHandler(() => setServerUnavailable(true));
    return () => setServerUnavailableHandler(null);
  }, []);

  const value: ContextValue = { serverUnavailable, retry };

  return (
    <ServerUnavailableContext.Provider value={value}>
      {serverUnavailable ? (
        <GlobalErrorScreen
          variant="server_unavailable"
          onRetry={retry}
        />
      ) : (
        children
      )}
    </ServerUnavailableContext.Provider>
  );
}

export function useServerUnavailable(): ContextValue {
  const ctx = useContext(ServerUnavailableContext);
  if (!ctx) {
    return {
      serverUnavailable: false,
      retry: async () => {},
    };
  }
  return ctx;
}
