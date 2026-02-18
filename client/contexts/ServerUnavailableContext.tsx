/**
 * Global Server Unavailable screen when any API fails with network/timeout/Failed to fetch.
 * Retry is user-driven only: dismisses the screen so the user can try again (no extra backend health call).
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setServerUnavailableHandler } from "@/lib/server-unavailable-bridge";
import { GlobalErrorScreen } from "@/components/GlobalErrorScreen";

type ContextValue = {
  /** True when global Server Unavailable screen is shown. */
  serverUnavailable: boolean;
  /** User taps Retry: dismiss screen so they can retry their action. No backend health check. */
  retry: () => void;
};

const ServerUnavailableContext = createContext<ContextValue | null>(null);

export function ServerUnavailableProvider({ children }: { children: React.ReactNode }) {
  const [serverUnavailable, setServerUnavailable] = useState(false);

  const retry = useCallback(() => {
    setServerUnavailable(false);
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
      retry: () => {},
    };
  }
  return ctx;
}
