/**
 * Global Server Unavailable screen when any API fails with 5xx/network.
 * Retry: hide screen and re-run identity so user can continue.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setServerUnavailableHandler } from "@/lib/server-unavailable";
import { GlobalErrorScreen } from "@/components/GlobalErrorScreen";
import { useAuth } from "@/contexts/AuthContext";

type ContextValue = {
  serverUnavailable: boolean;
  retry: () => void;
};

const ServerUnavailableContext = createContext<ContextValue | null>(null);

export function ServerUnavailableProvider({ children }: { children: React.ReactNode }) {
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const auth = useAuth();

  const retry = useCallback(() => {
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
