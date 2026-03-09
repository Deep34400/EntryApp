/**
 * Access denied (403) screen — used when user's role has no access to the app.
 * Shows backend message and a single "Back to login" action. Not session expired.
 */

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const CONTENT_MAX_WIDTH = 320;
const ICON_SIZE = 64;
const CARD_PADDING = Spacing["3xl"];

const DEFAULT_MESSAGE =
  "Due to your default role, you do not have access to this application.";

export type AccessDeniedScreenProps = {
  /** Message from backend (e.g. "Due to your default role, you do not have access to this application."). */
  message?: string;
  /** Called when user taps "Back to login" — clear accessDenied flag and stay on login. */
  onBackToLogin: () => void;
};

export function AccessDeniedScreen({
  message = DEFAULT_MESSAGE,
  onBackToLogin,
}: AccessDeniedScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBackToLogin();
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing["2xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <Animated.View
        entering={FadeIn.duration(280)}
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          },
        ]}
      >
        <Animated.View
          entering={FadeInDown.duration(320).delay(80)}
          style={styles.content}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            <Feather name="lock" size={ICON_SIZE * 0.5} color={theme.error} />
          </View>
          <ThemedText type="h2" style={styles.title}>
            Access denied
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.message, { color: theme.textSecondary }]}
            numberOfLines={5}
          >
            {message}
          </ThemedText>
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <ThemedText
              type="body"
              style={[styles.buttonText, { color: theme.onPrimary }]}
            >
              Back to login
            </ThemedText>
          </Pressable>
        </Animated.View>
      </Animated.View>
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
  card: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: CARD_PADDING,
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.xs,
  },
  button: {
    width: "100%",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
