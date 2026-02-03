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

export default function TokenDisplayScreen() {
  const route = useRoute<TokenDisplayRouteProp>();
  const { token, agentName, gate } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const handlePrintShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = [
      `Token: ${token}`,
      `Proceed to: ${agentName}`,
      `Gate: ${gate}`,
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
          <Animated.View
            entering={ZoomIn.delay(200).springify()}
            style={[styles.tokenCard, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.tokenLabel}>TOKEN</ThemedText>
            <ThemedText style={[styles.tokenNumber, Typography.token]}>
              {token}
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(400).springify()}
            style={styles.agentSection}
          >
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBadge, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="user" size={20} color={theme.primary} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Proceed to
                </ThemedText>
                <ThemedText type="h3">{agentName}</ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconBadge, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="map-pin" size={20} color={theme.primary} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Gate Location
                </ThemedText>
                <ThemedText type="h4">{gate}</ThemedText>
              </View>
            </View>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(600).springify()}
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["3xl"],
  },
  tokenLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  tokenNumber: {
    color: "#FFFFFF",
  },
  agentSection: {
    gap: Spacing.xl,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  infoContent: {
    flex: 1,
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
