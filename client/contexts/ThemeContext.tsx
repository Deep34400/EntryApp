import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@entry_app_theme";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  /** Resolved scheme: "light" or "dark" */
  colorScheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Toggle between light and dark (skips "system") */
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(THEME_STORAGE_KEY, value);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((prev) => {
      const resolved =
        prev === "system"
          ? systemScheme === "dark"
            ? "dark"
            : "light"
          : prev;
      const next = resolved === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, [systemScheme]);

  const colorScheme: "light" | "dark" =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const value: ThemeContextValue = {
    colorScheme,
    preference,
    setPreference,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
