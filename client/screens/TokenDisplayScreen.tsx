import React from "react";
import { View, StyleSheet, Share, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type TokenDisplayRouteProp = RouteProp<RootStackParamList, "TokenDisplay">;

// Token card uses theme primary (brand color from logo)

export default function TokenDisplayScreen() {
  const route = useRoute<TokenDisplayRouteProp>();
  const { token, assignee, desk_location } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const handlePrintShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = [
      `Token: ${token}`,
      `Proceed to: ${assignee}`,
      `Desk / Location: ${desk_location}`,
    ].join("\n");
    try {
      await Share.share({
        message,
        title: "Entry Token",
      });
    } catch {
      // User cancelled or share not available
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.tokenSection}>
          {/* Main token card — no QR */}
          <Animated.View
            entering={ZoomIn.delay(200).springify()}
            style={[styles.tokenCard, { backgroundColor: theme.primary }]}
          >
            <View style={styles.tokenCardGradient}>
              <ThemedText style={styles.tokenLabel}>TOKEN NUMBER</ThemedText>
              <ThemedText style={[styles.tokenNumber, Typography.token]}>
                {token}
              </ThemedText>
              <ThemedText style={styles.validityText}>
                Valid for 24 hours at all gates
              </ThemedText>
            </View>
          </Animated.View>

          {/* Proceed To & Gate Location — two separate cards */}
          <Animated.View
            entering={FadeInUp.delay(350).springify()}
            style={styles.detailCards}
          >
            <View
              style={[
                styles.detailCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather name="user" size={22} color={theme.primary} style={styles.detailCardIcon} />
              <View style={styles.detailCardContent}>
                <ThemedText type="small" style={[styles.detailCardLabel, { color: theme.textSecondary }]}>
                  PROCEED TO
                </ThemedText>
                <ThemedText type="h3" style={{ color: theme.text }}>
                  {assignee}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.detailCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather name="map-pin" size={22} color={theme.primary} style={styles.detailCardIcon} />
              <View style={styles.detailCardContent}>
                <ThemedText type="small" style={[styles.detailCardLabel, { color: theme.textSecondary }]}>
                  GATE LOCATION
                </ThemedText>
                <ThemedText type="h3" style={{ color: theme.text }}>
                  {desk_location}
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.buttonSection}
        >
          <Pressable
            onPress={handlePrintShare}
            style={({ pressed }) => [
              styles.printButton,
              { borderColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="printer" size={20} color={theme.primary} />
            <ThemedText type="body" style={{ color: theme.primary, marginLeft: Spacing.sm, fontWeight: "600" }}>
              Print / Share token
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
  },
  tokenSection: {
    flex: 1,
    justifyContent: "center",
  },
  tokenCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  tokenCardGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing["3xl"],
    backgroundColor: "transparent",
  },
  tokenLabel: {
    color: "rgba(0,0,0,0.6)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  tokenNumber: {
    color: "#1a1a1a",
    fontWeight: "800",
  },
  validityText: {
    marginTop: Spacing.xl,
    fontSize: 13,
    color: "rgba(0,0,0,0.65)",
    fontWeight: "600",
  },
  detailCards: {
    gap: Spacing.lg,
  },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  detailCardIcon: {
    marginRight: Spacing.lg,
  },
  detailCardContent: {
    flex: 1,
  },
  detailCardLabel: {
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  buttonSection: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  printButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    paddingVertical: Spacing.md,
  },
});
