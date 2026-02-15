import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing } from "@/constants/theme";

export type ScreenLayoutProps = {
  children: ReactNode;
  /** Optional top offset (e.g. custom header height). */
  topOffset?: number;
  /** Optional bottom padding in addition to safe area. */
  bottomPadding?: number;
  /** No horizontal padding when true (e.g. full-bleed list). */
  noHorizontalPadding?: boolean;
  style?: ViewStyle;
};

/**
 * Global layout wrapper for screens. Handles safe area and horizontal padding.
 * Use on every screen for consistent, responsive layout.
 */
export function ScreenLayout({
  children,
  topOffset = 0,
  bottomPadding = 0,
  noHorizontalPadding = false,
  style,
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + topOffset,
          paddingBottom: insets.bottom + bottomPadding,
          paddingHorizontal: noHorizontalPadding ? 0 : Layout.horizontalScreenPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
