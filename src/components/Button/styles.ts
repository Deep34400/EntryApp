import { StyleSheet } from "react-native";
import { layout } from "@/constants/layout";
import { spacing, radius } from "@/theme";

export const buttonStyles = StyleSheet.create({
  button: {
    minHeight: Math.max(layout.minTouchTarget, spacing.buttonHeight),
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
