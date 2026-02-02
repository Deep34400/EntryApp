import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

/** Header button to toggle dark/light mode. */
export function ThemeToggleHeaderButton() {
  const { theme, isDark, themeContext } = useTheme();

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    themeContext?.toggleTheme();
  };

  if (!themeContext) return null;

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      hitSlop={Spacing.lg}
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Feather
        name={isDark ? "sun" : "moon"}
        size={22}
        color={theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
});
