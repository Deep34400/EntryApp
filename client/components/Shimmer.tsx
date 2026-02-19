/**
 * Shimmer / skeleton placeholder for loading states. Production-ready list and grid placeholders.
 */

import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const SHIMMER_BG = "#E8EBEC";
const SHIMMER_HIGHLIGHT = "#F2F3F5";

export function ShimmerBox({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.box, style, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: SHIMMER_BG,
    borderRadius: 8,
  },
});

/** Grid of shimmer cards matching purpose grid (2 columns). */
export function PurposeGridShimmer() {
  return (
    <View style={gridStyles.grid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={gridStyles.cardWrap}>
          <ShimmerBox style={gridStyles.icon} />
          <ShimmerBox style={gridStyles.label} />
        </View>
      ))}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrap: {
    width: "48%",
    marginBottom: 16,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 80,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EBEC",
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginBottom: 8,
  },
  label: {
    height: 14,
    width: 80,
  },
});

/** Shimmer for ticket list cards (matches TicketCard layout). */
export function TicketListShimmer({ count = 5 }: { count?: number }) {
  return (
    <View style={listStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={listStyles.card}>
          <View style={listStyles.cardTop}>
            <ShimmerBox style={listStyles.token} />
            <ShimmerBox style={listStyles.badge} />
          </View>
          <View style={listStyles.divider} />
          <View style={listStyles.driverRow}>
            <ShimmerBox style={listStyles.avatar} />
            <View style={listStyles.driverInfo}>
              <ShimmerBox style={listStyles.driverName} />
              <ShimmerBox style={listStyles.driverRole} />
            </View>
          </View>
          <ShimmerBox style={listStyles.button} />
        </View>
      ))}
    </View>
  );
}

const listStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8EBEC",
    backgroundColor: "#FFFFFF",
    gap: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  token: { height: 20, width: 80 },
  badge: { height: 28, width: 70 },
  divider: { height: 1, backgroundColor: "#E8EBEC" },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  driverInfo: { flex: 1, gap: 4 },
  driverName: { height: 14, width: 120 },
  driverRole: { height: 12, width: 80 },
  button: { height: 44, width: "100%", borderRadius: 22 },
});
