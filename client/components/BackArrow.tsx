import React, { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/hooks/useTheme";

/** Prevent double navigation */
const TAP_guard_MS = 400;

/** Mobile-standard sizes */
const TOUCH_SIZE = 44;
const ICON_SIZE = 24;

export type BackArrowProps = {
  /** Override icon color; defaults to theme.text (visible in both light and dark) */
  color?: string;
  onPress?: () => void;
  inline?: boolean;
};

export function BackArrow({
  color,
  onPress,
  inline = false,
}: BackArrowProps) {
  const { theme } = useTheme();
  const iconColor = color ?? theme.text;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const lastTapRef = useRef(0);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < TAP_guard_MS) return;
    lastTapRef.current = now;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress ? onPress() : navigation.goBack();
  };

  const icon = (
    <View pointerEvents="none">
      <Feather name="arrow-left" size={ICON_SIZE} color={iconColor} />
    </View>
  );

  if (inline) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.inline,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        {icon}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.absolute,
        {
          top: insets.top + 2, 
          left: 4,         
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: "absolute",
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  inline: {
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});

export default BackArrow;
