import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const MIN_TOUCH_SIZE = 48;
const HIT_SLOP_EXTRA = { top: 16, bottom: 16, left: 16, right: 16 };

/** Header button to toggle dark/light mode. Large touch target for mobile. */
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
          color={theme.text}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
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
