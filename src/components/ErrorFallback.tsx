import React, { useState } from "react";
import { reloadAppAsync } from "expo";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { spacing, radius } from "@/theme";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="h4" style={styles.title}>
          Something went wrong
        </ThemedText>
        <ThemedText type="body" variant="secondary" style={styles.message}>
          {error.message}
        </ThemedText>
        <Pressable
          onPress={resetError}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText style={{ color: theme.onPrimary }}>Try again</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  content: { alignItems: "center", padding: spacing.xl },
  title: { marginTop: spacing.lg, marginBottom: spacing.sm },
  message: { textAlign: "center", marginBottom: spacing.xl },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
});
