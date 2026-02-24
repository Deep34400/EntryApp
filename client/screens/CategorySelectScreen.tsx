/**
 * CategorySelectScreen — Select visit category.
 * Shows driver card + 3 grid cards: Onboarding, Settlement, Maintenance.
 * No vehicle/dp_type/effectiveType logic. Navigate to respective purpose screen.
 */
import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Layout, Spacing } from "@/constants/theme";

const D = {
  screenBg: "#F6F7F9",
  cardBg: "#FFFFFF",
  cardBorder: "#E8EBEC",
  brandRed: "#B31D38",
  brandRedMid: "#F5DADF",
  textPrimary: "#161B1D",
  textSecondary: "#5C6B72",
  cardRadius: 14,
  cardMinHeight: 88,
  avatarSize: 42,
} as const;

type NavProp = NativeStackNavigationProp<RootStackParamList, "CategorySelect">;
type RoutePropType = RouteProp<RootStackParamList, "CategorySelect">;

const CATEGORIES: { id: "Onboarding" | "Settlement" | "Maintenance"; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "Onboarding", label: "Onboarding", icon: "user-plus" },
  { id: "Settlement", label: "Settlement", icon: "dollar-sign" },
  { id: "Maintenance", label: "Maintenance", icon: "tool" },
];

function CategoryGridCard({
  label,
  icon,
  onPress,
  delay,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={styles.gridCardWrap}
      entering={FadeInDown.delay(delay).springify()}
    >
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => { scale.value = withSpring(0.94, { damping: 18, stiffness: 220 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 220 }); }}
          style={styles.gridCard}
        >
          <View style={styles.gridCardIconWrap}>
            <Feather name={icon} size={20} color={D.brandRed} />
          </View>
          <ThemedText type="small" style={styles.gridCardLabel} numberOfLines={2}>
            {label}
          </ThemedText>
          <Feather name="chevron-right" size={14} color={D.textSecondary} style={{ marginTop: 4 }} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function CategorySelectScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { formData } = route.params;

  const displayName = (formData.name ?? "").trim() || "—";
  const displayPhone = (formData.phone ?? "").trim() || "—";

  const handleCategoryPress = (id: "Onboarding" | "Settlement" | "Maintenance") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (id === "Onboarding") {
      navigation.navigate("OnboardingPurpose", { formData });
    } else if (id === "Settlement") {
      navigation.navigate("SettlementPurpose", { formData });
    } else {
      navigation.navigate("MaintenancePurpose", { formData });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.userCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={18} color="#FFF" />
          </View>
          <View style={styles.userCardCenter}>
            <ThemedText type="small" style={styles.userName} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <View style={styles.rolePill}>
              <ThemedText type="small" style={styles.roleText}>Driver Partner</ThemedText>
            </View>
          </View>
          <View style={styles.phonePill}>
            <Feather name="phone" size={11} color={D.brandRed} style={{ marginRight: 4 }} />
            <ThemedText type="small" style={styles.phoneText} numberOfLines={1}>
              {displayPhone}
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.sectionRow}>
          <ThemedText type="h6" style={styles.sectionTitle}>
            Select category
          </ThemedText>
        </Animated.View>

        <View style={styles.grid}>
          {CATEGORIES.map((cat, i) => (
            <CategoryGridCard
              key={cat.id}
              label={cat.label}
              icon={cat.icon}
              delay={80 + i * 45}
              onPress={() => handleCategoryPress(cat.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: D.screenBg },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: D.cardRadius,
    borderWidth: 1,
    borderColor: D.cardBorder,
    backgroundColor: D.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: D.avatarSize,
    height: D.avatarSize,
    borderRadius: D.avatarSize / 2,
    backgroundColor: D.brandRed,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  userCardCenter: { flex: 1, minWidth: 0, gap: 4 },
  userName: { fontSize: 14, fontWeight: "700", color: D.textPrimary },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: D.brandRedMid,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  roleText: { fontSize: 11, fontWeight: "600", color: D.brandRed },
  phonePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: Spacing.sm,
  },
  phoneText: { color: D.textPrimary, fontSize: 12, fontWeight: "600" },
  sectionRow: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: D.textPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCardWrap: { width: "48.5%", marginBottom: Spacing.md },
  gridCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: D.cardRadius,
    minHeight: D.cardMinHeight,
    borderWidth: 1.5,
    borderColor: D.cardBorder,
    backgroundColor: D.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    backgroundColor: D.brandRedMid,
  },
  gridCardLabel: { textAlign: "center", fontWeight: "500", fontSize: 12, lineHeight: 17, color: D.textPrimary },
});
