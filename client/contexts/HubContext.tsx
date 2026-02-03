import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HUB_STORAGE_KEY = "@entry_app_hub";

export type Hub = {
  id: string;
  hub_name: string;
  city: string;
};

type HubContextValue = {
  hub: Hub | null;
  /** Restored from storage; use to avoid flashing hub select when hub already chosen */
  isRestored: boolean;
  setHub: (hub: Hub) => void;
  clearHub: () => void;
};

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: React.ReactNode }) {
  const [hub, setHubState] = useState<Hub | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HUB_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Hub;
          if (parsed?.id && parsed?.hub_name != null) {
            setHubState({
              id: parsed.id,
              hub_name: parsed.hub_name ?? "",
              city: parsed.city ?? "",
            });
          }
        } catch {
          // ignore invalid stored data
        }
      }
      setIsRestored(true);
    });
  }, []);

  const setHub = useCallback((newHub: Hub) => {
    setHubState(newHub);
    AsyncStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(newHub));
  }, []);

  const clearHub = useCallback(() => {
    setHubState(null);
    AsyncStorage.removeItem(HUB_STORAGE_KEY);
  }, []);

  const value: HubContextValue = {
    hub,
    isRestored,
    setHub,
    clearHub,
  };

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub(): HubContextValue {
  const ctx = useContext(HubContext);
  if (!ctx) {
    return {
      hub: null,
      isRestored: true,
      setHub: () => {},
      clearHub: () => {},
    };
  }
  return ctx;
}
