/**
 * Global Server Unavailable screen when any API fails with network/timeout/Failed to fetch.
 * Retry: clear both serverUnavailable and sessionExpired so identity/refresh can re-run cleanly (no bounce).
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setServerUnavailableHandler, clearServerUnavailableFlag } from "@/lib/server-unavailable-bridge";
import { GlobalErrorScreen } from "@/components/GlobalErrorScreen";
import { useAuth } from "@/contexts/AuthContext";

type ContextValue = {
  /** True when global Server Unavailable screen is shown. */
  serverUnavailable: boolean;
  /** User taps Retry: clear server + session-expired state so only one error state; re-run flows. */
  retry: () => void;
};

const ServerUnavailableContext = createContext<ContextValue | null>(null);

export function ServerUnavailableProvider({ children }: { children: React.ReactNode }) {
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const auth = useAuth();

  const retry = useCallback(() => {
    clearServerUnavailableFlag();
    auth.clearSessionExpiredFlag();
    setServerUnavailable(false);
    auth.retryGuestIdentity();
  }, [auth]);

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
