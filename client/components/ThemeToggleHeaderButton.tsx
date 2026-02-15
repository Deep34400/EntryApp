import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing } from "@/constants/theme";

const HIT_SLOP_EXTRA = { top: 12, bottom: 12, left: 12, right: 12 };

/** Header button to toggle dark/light mode. Large touch target for mobile. */
export function ThemeToggleHeaderButton({ iconColor }: { iconColor?: string } = {}) {
  const { theme, isDark, themeContext } = useTheme();
  const color = iconColor ?? theme.text;

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    themeContext?.toggleTheme();
  };

  if (!themeContext) return null;

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.wrapper,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      hitSlop={HIT_SLOP_EXTRA}
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <View style={styles.button} collapsable={false}>
        <Feather
          name={isDark ? "sun" : "moon"}
          size={22}
          color={color}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minWidth: Layout.backButtonTouchTarget,
    minHeight: Layout.backButtonTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  button: {
    padding: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
