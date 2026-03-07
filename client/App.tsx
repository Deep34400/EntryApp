import React, { Suspense, useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/query/queryClient";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { useTheme } from "@/hooks/useTheme";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SessionExpiredHandler } from "@/components/SessionExpiredHandler";
import { ServerUnavailableProvider } from "@/contexts/ServerUnavailableContext";

import type { RootStackParamList } from "@/navigation/RootStackNavigator";

// ─── In-app network logger for debugging API calls only (method, URL, status, headers, body, response time). ───
// Control via .env: EXPO_PUBLIC_ENABLE_NETWORK_LOGGER="true" | "false". Only runs on native (iOS/Android), not web.
const networkLoggerEnv =
  typeof process !== "undefined"
    ? process.env?.EXPO_PUBLIC_ENABLE_NETWORK_LOGGER?.toLowerCase?.().trim()
    : undefined;
const isNetworkLoggerEnabled =
  Platform.OS !== "web" &&
  networkLoggerEnv !== "false" &&
  (__DEV__ || networkLoggerEnv === "true");

// Lazy-loaded so the logger bundle is not loaded when disabled or on web; no performance impact when disabled.
const NetworkLoggerLazy = isNetworkLoggerEnabled
  ? React.lazy(() =>
      import("@/components/NetworkLoggerDev").then((m) => ({ default: m.default }))
    )
  : null;

function StatusBarStyle() {
  const { theme, isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setBackgroundColorAsync(theme.backgroundRoot);
  }, [isDark]);

  return (
    <StatusBar
      style={isDark ? "light" : "dark"}
      backgroundColor={theme.backgroundRoot}
      translucent={false}
    />
  );
}

function AppRoot() {
  const { theme, isDark } = useTheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <GestureHandlerRootView
      style={[styles.root, isDark && { backgroundColor: theme.backgroundRoot }]}
    >
      <StatusBarStyle />
      <KeyboardProvider>
        <NavigationContainer ref={navigationRef}>
          <RootStackNavigator />
        </NavigationContainer>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  // Preload the network logger chunk in dev/test so startNetworkLogging() runs early and captures all API calls.
  useEffect(() => {
    if (isNetworkLoggerEnabled) {
      import("@/components/NetworkLoggerDev");
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ServerUnavailableProvider>
              <UserProvider>
                <SafeAreaProvider>
                  <AppRoot />
                  {isNetworkLoggerEnabled && NetworkLoggerLazy && (
                    <Suspense fallback={null}>
                      <NetworkLoggerLazy />
                    </Suspense>
                  )}
                </SafeAreaProvider>
              </UserProvider>
            </ServerUnavailableProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
