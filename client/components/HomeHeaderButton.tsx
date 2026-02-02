import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type NavProp = NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>;

/** Header button that resets the stack and goes to main (VisitorType) screen. */
export function HomeHeaderButton() {
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();

  const goHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "VisitorType" }],
      })
    );
  };

  return (
    <Pressable
      onPress={goHome}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      hitSlop={Spacing.lg}
      accessibilityLabel="Back to home"
    >
      <Feather name="home" size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
});
