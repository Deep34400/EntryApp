/**
 * Polished "Session expired" screen — used when refresh fails or auth error.
 * Clear hierarchy, theme-aware, single primary action. Not a bare error message.
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

export type SessionExpiredScreenProps = {
  /** Main message (e.g. "Your session expired. Please sign in again."). */
  message?: string;
  /** Primary action: fetch new guest token and allow user to sign in again. */
  onSignInAgain: () => void;
  /** Optional: show a loading state on the button after tap. */
  isLoading?: boolean;
};

const DEFAULT_MESSAGE = "Your session expired. Please sign in again.";

export function SessionExpiredScreen({
  message = DEFAULT_MESSAGE,
  onSignInAgain,
  isLoading = false,
}: SessionExpiredScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSignInAgain();
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + Spacing["2xl"] }]}>
      <Animated.View
        entering={FadeIn.duration(280)}
        style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
      >
        <Animated.View entering={FadeInDown.duration(320).delay(80)} style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: theme.backgroundTertiary }]}>
            <Feather name="clock" size={ICON_SIZE * 0.5} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.title}>
            Session expired
          </ThemedText>
          <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]} numberOfLines={4}>
            {message}
          </ThemedText>
          <Pressable
            onPress={handlePress}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.primary,
                opacity: isLoading ? 0.7 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <ThemedText type="body" style={[styles.buttonText, { color: theme.onPrimary }]}>
              {isLoading ? "Getting ready…" : "Sign in again"}
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
