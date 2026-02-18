/**
 * Gate before showing app: check internet and backend availability.
 * Login screen must NOT open until backend is reachable.
 * No response / timeout → Server Unavailable (never "Failed to fetch"). 503 → Maintenance.
 */

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { GlobalErrorScreen, type GlobalErrorVariant } from "@/components/GlobalErrorScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { checkBackendHealth, type BackendHealthResult } from "@/lib/backend-health";

type GateState = "checking" | "ready" | GlobalErrorVariant;

function gateStateFromHealth(result: BackendHealthResult): GateState {
  if (result === "ready") return "ready";
  if (result === "offline") return "offline";
  if (result === "maintenance") return "maintenance";
  if (result === "server_unavailable") return "server_unavailable";
  return "server_error";
}

type BackendGateProps = {
  children: React.ReactNode;
};

export function BackendGate({ children }: BackendGateProps) {
  const { theme } = useTheme();
  const [state, setState] = useState<GateState>("checking");

  const runCheck = useCallback(async () => {
    setState("checking");
    const result = await checkBackendHealth();
    setState(gateStateFromHealth(result));
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (state === "ready") {
    return <>{children}</>;
  }

  if (state === "checking") {
    return (
      <ThemedView style={styles.checking}>
        <ActivityIndicator size="large" color={theme?.link ?? "#333"} />
        <ThemedText type="body" style={styles.checkingText}>
          Checking…
        </ThemedText>
      </ThemedView>
    );
  }

  return <GlobalErrorScreen variant={state} onRetry={runCheck} />;
}

const styles = StyleSheet.create({
  checking: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkingText: {
    opacity: 0.8,
  },
});
