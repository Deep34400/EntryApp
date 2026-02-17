import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, Typography } from "@/constants/theme";

interface HeaderTitleProps {
  title: string;
  /** Use "light" for light header (e.g. Visitor's Purpose - Categorization). Renders logo with tint for contrast on light background per Figma. */
  variant?: "default" | "light";
}

export function HeaderTitle({ title, variant = "default" }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logo.png")}
        style={[styles.icon, variant === "light" && styles.iconLight]}
        resizeMode="contain"
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
