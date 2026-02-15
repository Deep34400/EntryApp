import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";

import { Layout } from "@/constants/theme";

const MIN_SIZE = Layout.backButtonTouchTarget;
const ICON_SIZE = 24;
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 16 };
const PADDING_LEFT = 8;

type Props = {
  onPress: () => void;
  canGoBack: boolean;
};

/**
 * Header back button that fits on all screen sizes.
 * No negative margin so it never overflows; padding keeps it inside layout.
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
        <Feather name="chevron-left" size={ICON_SIZE} color={theme.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minWidth: MIN_SIZE,
    minHeight: MIN_SIZE,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 0,
    paddingLeft: PADDING_LEFT,
  },
  inner: {
    justifyContent: "center",
    alignItems: "center",
  },
});
