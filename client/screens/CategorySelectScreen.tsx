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
  textPrimary: "#161B1D",
  textSecondary: "#5C6B72",
  chevronTint: "#E8A4B0",
  cardRadius: 12,
  driverCardRadius: 14,
  iconWrapSize: 44,
  iconWrapRadius: 10,
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
    subtitle: "View earnings and payout history",
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
              size={22}
              color={D.brandRed}
            />
          </View>
          <View style={styles.cardContent}>
            <ThemedText type="body" style={styles.cardTitle}>
              {label}
            </ThemedText>
            <ThemedText type="small" style={styles.cardSubtitle}>
              {subtitle}
            </ThemedText>
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(`${id}Purpose` as any, { formData });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Banner */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.userCard}
        >
          <View style={styles.avatar}>
            <Feather name="user" size={18} color="#FFF" />
          </View>
          <View style={styles.userCardCenter}>
            <ThemedText type="small" style={styles.userName}>
              {formData.name || "—"}
            </ThemedText>
            <View style={styles.rolePill}>
              <ThemedText type="small" style={styles.roleText}>
                Driver Partner
              </ThemedText>
            </View>
          </View>
          <View style={styles.phonePill}>
            <Feather
              name="phone"
              size={11}
              color={D.brandRed}
              style={{ marginRight: 4 }}
            />
            <ThemedText type="small" style={styles.phoneText}>
              {formData.phone || "—"}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Categories Header with Line like the image */}
        <Animated.View
          entering={FadeInDown.delay(40).springify()}
          style={styles.headerRow}
        >
          <ThemedText type="h6" style={styles.headerTitle}>
            CATEGORIES
          </ThemedText>
          <View style={styles.headerLine} />
        </Animated.View>

        {/* Category List */}
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
  scrollContent: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.md,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: D.driverCardRadius,
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

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: D.textSecondary,
    letterSpacing: 0.8,
    marginRight: 12,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: D.cardBorder,
  },

  list: { gap: Spacing.md },
  cardWrap: { width: "100%" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: D.cardRadius,
    borderWidth: 1,
    borderColor: D.cardBorder,
    backgroundColor: D.cardBg,
    minHeight: 85,
  },
  cardPressed: { opacity: 0.9 },
  iconWrap: {
    width: D.iconWrapSize,
    height: D.iconWrapSize,
    borderRadius: D.iconWrapRadius,
    backgroundColor: "#FCF3F4", // Light tint for icon background
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: D.textPrimary },
  cardSubtitle: { fontSize: 13, color: D.textSecondary },
});
