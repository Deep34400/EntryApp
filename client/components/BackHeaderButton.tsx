import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";

const MIN_SIZE = 56;
const HIT_SLOP = { top: 24, bottom: 24, left: 24, right: 32 };

type Props = {
  onPress: () => void;
  canGoBack: boolean;
};

/**
 * Header back button that responds on first tap.
 * Uses TouchableOpacity (no nested touchables) and a single icon
 * so taps register immediately like in standard apps.
 */
export function BackHeaderButton({ onPress, canGoBack }: Props) {
  const { theme } = useTheme();

  if (!canGoBack) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.6}
      hitSlop={HIT_SLOP}
      style={styles.wrapper}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <View style={styles.inner} pointerEvents="none">
        <Feather name="chevron-left" size={28} color={theme.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minWidth: MIN_SIZE,
    minHeight: MIN_SIZE,
    justifyContent: "center",
    alignItems: "flex-start",
    marginLeft: -8,
  },
  inner: {
    justifyContent: "center",
    alignItems: "center",
  },
});
