import React, { useEffect, useRef } from "react";
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

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/query/queryClient";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { useTheme } from "@/hooks/useTheme";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SessionExpiredHandler } from "@/components/SessionExpiredHandler";
import { ServerUnavailableProvider } from "@/contexts/ServerUnavailableContext";

import type { RootStackParamList } from "@/navigation/RootStackNavigator";

/** Clears ticket-related React Query cache whenever auth becomes unauthenticated (logout or session expired). */
function ClearTicketCacheOnLogout() {
  const queryClient = useQueryClient();
  const { status } = useAuth();
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== "unauthenticated" && status === "unauthenticated") {
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "ticket-counts" ||
            key === "ticket-list" ||
            key === "ticket-detail"
          );
        },
      });
    }
    prevStatus.current = status;
  }, [status, queryClient]);

  return null;
}

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
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ClearTicketCacheOnLogout />
            <ServerUnavailableProvider>
              <UserProvider>
                <SafeAreaProvider>
                  <AppRoot />
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
