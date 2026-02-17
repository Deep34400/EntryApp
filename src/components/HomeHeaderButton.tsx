import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { layout } from "@/constants/layout";
import { spacing } from "@/theme";
import type { RootStackParamList } from "@/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type NavProp = NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>;

const HIT_SLOP_EXTRA = { top: 12, bottom: 12, left: 12, right: 12 };

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
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={HIT_SLOP_EXTRA}
      accessibilityLabel="Back to home"
    >
      <View style={styles.button} collapsable={false}>
        <Feather name="home" size={22} color={theme.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minWidth: layout.backButtonTouchTarget,
    minHeight: layout.backButtonTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  button: {
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
