import React from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SessionExpiredHandler } from "@/components/SessionExpiredHandler";

function StatusBarStyle() {
  const ctx = useThemeContext();
  const isDark = ctx?.colorScheme === "dark";
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <SessionExpiredHandler navigationRef={navigationRef} />
            <UserProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <NavigationContainer ref={navigationRef}>
                      <RootStackNavigator />
                    </NavigationContainer>
                    <StatusBarStyle />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </UserProvider>
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
