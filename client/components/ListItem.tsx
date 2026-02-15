import React, { ReactNode } from "react";
import { View, Pressable, StyleSheet, ViewStyle } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";

export type ListItemProps = {
  title: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress?: () => void;
  /** Use for destructive actions (e.g. Logout). */
  danger?: boolean;
  style?: ViewStyle;
};

/**
 * Reusable list/menu row. Uses theme only; compact and touch-friendly.
 */
export function ListItem({
  title,
  leftIcon,
  rightIcon,
  onPress,
  danger = false,
  style,
}: ListItemProps) {
  const { theme } = useTheme();
  const textColor = danger ? theme.error : theme.text;

  const content = (
    <>
      {leftIcon != null ? (
        <View style={styles.leftIcon}>{leftIcon}</View>
      ) : null}
      <ThemedText
        type="body"
        style={[styles.title, { color: textColor }]}
        numberOfLines={2}
      >
        {title}
      </ThemedText>
      {rightIcon != null ? (
        <View style={styles.rightIcon}>{rightIcon}</View>
      ) : null}
    </>
  );

  const minHeight = Math.max(48, Layout.minTouchTarget);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { minHeight, opacity: pressed ? 0.7 : 1 },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, { minHeight }, style]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  leftIcon: {
    minWidth: 24,
    alignItems: "center",
  },
  rightIcon: {
    minWidth: 24,
    alignItems: "center",
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
});
