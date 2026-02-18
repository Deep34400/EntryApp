/**
 * Single reusable global screen for: offline, 503 (maintenance), 500/timeout (server error).
 * Human-readable messages only; one clear action (Retry or Login). No raw backend errors, no infinite loaders.
 */

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export type GlobalErrorVariant = "offline" | "maintenance" | "server_error" | "server_unavailable";

const VARIANT_CONFIG: Record<
  GlobalErrorVariant,
  { title: string; message: string; icon: keyof typeof Feather.glyphMap }
> = {
  offline: {
    title: "You're offline",
    message: "Please check your internet connection and try again.",
    icon: "wifi-off",
  },
  maintenance: {
    title: "Under maintenance",
    message: "We're updating our systems. Please try again in a few minutes.",
    icon: "tool",
  },
  server_error: {
    title: "Something went wrong",
    message: "We're having trouble connecting. Please try again.",
    icon: "alert-circle",
  },
  server_unavailable: {
    title: "Server temporarily unavailable",
    message: "Please try again in a few minutes.",
    icon: "cloud-off",
  },
};

export type GlobalErrorScreenProps = {
  variant: GlobalErrorVariant;
  onRetry: () => void;
  /** Optional: show Login button (e.g. after session expired). */
  onLogin?: () => void;
};

export function GlobalErrorScreen({ variant, onRetry, onLogin }: GlobalErrorScreenProps) {
  const { theme } = useTheme();
  const config = VARIANT_CONFIG[variant];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Feather name={config.icon} size={48} color={theme.textSecondary} style={styles.icon} />
        <ThemedText type="h1" style={styles.title}>
          {config.title}
        </ThemedText>
        <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]}>
          {config.message}
        </ThemedText>
        <View style={styles.actions}>
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.link, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText type="body" style={[styles.buttonText, { color: theme.buttonText }]}>
              Retry
            </ThemedText>
          </Pressable>
          {onLogin ? (
            <Pressable
              onPress={onLogin}
              style={({ pressed }) => [
                styles.buttonSecondary,
                { borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <ThemedText type="body" style={[styles.buttonTextSecondary, { color: theme.text }]}>
                Login
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  icon: {
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  actions: {
    gap: Spacing.md,
    width: "100%",
  },
  button: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
  buttonSecondary: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
    borderWidth: 1,
  },
  buttonTextSecondary: {
    fontWeight: "600",
  },
});
