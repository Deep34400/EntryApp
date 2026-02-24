import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { AppIcon } from "@/components/AppIcon";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Layout, Spacing } from "@/constants/theme";
import type { IconLibrary } from "@/types/purposeConfig";

const D = {
  screenBg: "#F6F7F9",
  cardBg: "#FFFFFF",
  cardBorder: "#E8EBEC",
  brandRed: "#B31D38",
  brandRedMid: "#F5DADF",
  textPrimary: "#1C1F21",
  textSecondary: "#64748B",
  chevronTint: "#CBD5E1",
  cardRadius: 16,
  driverCardRadius: 14,
  iconWrapSize: 52, // Slightly bigger icon wrap
  iconWrapRadius: 14,
  avatarSize: 42,
} as const;

type NavProp = NativeStackNavigationProp<RootStackParamList, "CategorySelect">;
type RoutePropType = RouteProp<RootStackParamList, "CategorySelect">;

const CATEGORIES: {
  id: "Onboarding" | "Settlement" | "Maintenance";
  label: string;
  subtitle: string;
  icon_key: string;
  icon_library?: IconLibrary;
}[] = [
  {
    id: "Onboarding",
    label: "Onboarding",
    subtitle: "Manage your registration and documents",
    icon_key: "user-plus",
  },
  {
    id: "Settlement",
    label: "Settlement",
    subtitle: "Manage settlement, car drop, exchange & rejoining",
    icon_key: "currency-inr",
    icon_library: "material",
  },
  {
    id: "Maintenance",
    label: "Maintenance",
    subtitle: "Vehicle service and repair logs",
    icon_key: "tool",
  },
];

function CategoryRowCard({
  label,
  subtitle,
  iconKey,
  iconLibrary,
  onPress,
  delay,
}: {
  label: string;
  subtitle: string;
  iconKey: string;
  iconLibrary?: IconLibrary;
  onPress: () => void;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={styles.cardWrap}
      entering={FadeInDown.delay(delay).springify()}
    >
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            scale.value = withSpring(0.98);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.iconWrap}>
            <AppIcon
              name={iconKey}
              library={iconLibrary}
              size={24}
              color={D.brandRed}
            />
          </View>
          <View style={styles.cardContent}>
            <ThemedText style={styles.cardTitle}>{label}</ThemedText>
            <ThemedText style={styles.cardSubtitle}>{subtitle}</ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={D.chevronTint} />
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

  const handleCategoryPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(`${id}Purpose` as any, { formData });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card - Same as your image */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={18} color="#FFF" />
          </View>
          <View style={styles.userCardCenter}>
            <ThemedText style={styles.userName}>
              {formData.name || "ddd"}
            </ThemedText>
            <View style={styles.rolePill}>
              <ThemedText style={styles.roleText}>Driver Partner</ThemedText>
            </View>
          </View>
          <View style={styles.phonePill}>
            <Feather
              name="phone"
              size={10}
              color={D.brandRed}
              style={{ marginRight: 4 }}
            />
            <ThemedText style={styles.phoneText}>
              {formData.phone || "7474747477"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.headerRow}>
          <ThemedText style={styles.headerTitle}>CATEGORIES</ThemedText>
          <View style={styles.headerLine} />
        </View>

        {/* Category List - Cards are now bigger */}
        <View style={styles.list}>
          {CATEGORIES.map((cat, i) => (
            <CategoryRowCard
              key={cat.id}
              label={cat.label}
              subtitle={cat.subtitle}
              iconKey={cat.icon_key}
              iconLibrary={cat.icon_library}
              delay={80 + i * 50}
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    padding: 14,
    borderRadius: D.driverCardRadius,
    backgroundColor: D.cardBg,
    borderWidth: 1,
    borderColor: D.cardBorder,
  },
  avatar: {
    width: D.avatarSize,
    height: D.avatarSize,
    borderRadius: D.avatarSize / 2,
    backgroundColor: D.brandRed,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userCardCenter: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: "600", color: "#000" },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: D.brandRedMid,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: { fontSize: 10, fontWeight: "500", color: D.brandRed },
  phonePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  phoneText: { color: "#475569", fontSize: 11, fontWeight: "500" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  headerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
    marginLeft: 10,
  },

  list: { gap: 16 }, // Balanced gap between big cards
  cardWrap: { width: "100%" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 24, // Increased vertical padding for "Bade" cards
    paddingHorizontal: 16,
    borderRadius: D.cardRadius,
    backgroundColor: D.cardBg,
    borderWidth: 1,
    borderColor: D.cardBorder,
    minHeight: 110, // Explicit height to make it look prominent
  },
  cardPressed: { backgroundColor: "#F8FAFC" },
  iconWrap: {
    width: D.iconWrapSize,
    height: D.iconWrapSize,
    borderRadius: D.iconWrapRadius,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: 19,
    fontWeight: "600",
    color: "#1E293B",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
    lineHeight: 18,
  },
});
