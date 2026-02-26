import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, Typography } from "@/constants/theme";
import LatestLogo from "../../assets/images/latestLogo.svg";

interface HeaderTitleProps {
  title: string;
  /** Use "light" for light header (e.g. Visitor's Purpose - Categorization). Renders logo with tint for contrast on light background per Figma. */
  variant?: "default" | "light";
}

export function HeaderTitle({ title, variant = "default" }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <LatestLogo
        width={28}
        height={28}
        style={[styles.icon, variant === "light" && styles.iconLight]}
      />
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  icon: {
    width: 28,
    height: 28,
    marginRight: Spacing.sm,
  },
  iconLight: {},
  title: {
    ...Typography.body,
    fontWeight: "600",
    flexShrink: 1,
  },
});
