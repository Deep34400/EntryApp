import React, { ReactNode } from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  TouchableWithoutFeedback,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export type ThemedModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  /** Tap outside to close. */
  dismissOnBackdrop?: boolean;
  /** Full-screen panel (e.g. drawer) vs centered. */
  fullScreen?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Modal that uses global theme for backdrop and container.
 * No hardcoded colors.
 */
export function ThemedModal({
  visible,
  onRequestClose,
  children,
  dismissOnBackdrop = true,
  fullScreen = false,
  contentStyle,
}: ThemedModalProps) {
  const { theme } = useTheme();

  const backdrop = (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.overlayBackdrop },
      ]}
    />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={fullScreen ? "fade" : "slide"}
      onRequestClose={onRequestClose}
    >
      {dismissOnBackdrop ? (
        <TouchableWithoutFeedback onPress={onRequestClose}>
          <View style={styles.container}>
            {backdrop}
            <View style={[styles.inner, fullScreen && styles.fullScreen]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={(e) => e.stopPropagation()}
              >
                <View
                  style={[
                    styles.content,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderRadius: fullScreen ? 0 : BorderRadius.lg,
                    },
                    contentStyle,
                  ]}
                >
                  {children}
                </View>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <View style={styles.container}>
          {backdrop}
          <View
            style={[
              styles.content,
              { backgroundColor: theme.backgroundDefault },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  fullScreen: {
    justifyContent: "flex-end",
    alignItems: "stretch",
    padding: 0,
  },
  content: {
    overflow: "hidden",
    maxWidth: "100%",
  },
});
