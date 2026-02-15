import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing } from "@/constants/theme";

type Props = {
  onRefresh: () => void;
};

/** Header button that triggers a refresh (e.g. refetch). */
export function RefreshHeaderButton({ onRefresh }: Props) {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRefresh();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      hitSlop={Spacing.lg}
      accessibilityLabel="Refresh"
    >
      <Feather name="refresh-cw" size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: Layout.backButtonTouchTarget,
    minHeight: Layout.backButtonTouchTarget,
    padding: Spacing.sm,
    marginRight: Spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
});
