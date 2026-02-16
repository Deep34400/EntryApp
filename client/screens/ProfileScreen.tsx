import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Profile">;

const AVATAR_ICONS: (keyof typeof Feather.glyphMap)[] = [
  "briefcase",
  "user-check",
  "award",
  "shield",
  "headphones",
];

function getAvatarIcon(name: string): keyof typeof Feather.glyphMap {
  const hash = (name || "user").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_ICONS[hash % AVATAR_ICONS.length];
}

function formatRole(userType: string | undefined): string {
  if (!userType?.trim()) return "—";
  const normalized = userType.trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const auth = useAuth();
  const { user: contextUser, clearUser } = useUser();

  const displayName = auth.user?.name?.trim() || contextUser?.name?.trim() || "—";
  const displayPhone = auth.user?.phone || contextUser?.phone || "—";
  const role = auth.user?.userType;

  const avatarIcon = useMemo(() => getAvatarIcon(displayName), [displayName]);

  const hasDetails = role?.trim();
  const detailItems = useMemo(() => {
    const items: { label: string; value: string; icon: keyof typeof Feather.glyphMap }[] = [];
    if (role?.trim()) {
      items.push({ label: "Role", value: formatRole(role), icon: "briefcase" });
    }
    return items;
  }, [role]);

  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out? You will need to sign in again with OTP.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            auth.clearAuth();
            clearUser();
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: "LoginOtp" }] })
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Layout.horizontalScreenPadding,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Identity section: avatar, name once, primary identifier (phone) */}
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={[styles.identityCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
      >
        <View style={[styles.avatarWrap, { backgroundColor: theme.primary }]}>
          <Feather name={avatarIcon} size={28} color={theme.onPrimary} />
        </View>
        <ThemedText
          type="h4"
          style={[styles.identityName, { color: theme.text }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {displayName}
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.identityIdentifier, { color: theme.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayPhone}
        </ThemedText>
      </Animated.View>

      {/* Details: only additional/editable info (role, hub) — no name, no phone */}
      {hasDetails && (
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            DETAILS
          </ThemedText>
          <View style={[styles.detailCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            {detailItems.map((item, index) => (
              <View key={item.label}>
                {index > 0 && <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrap}>
                    <Feather name={item.icon} size={18} color={theme.primary} />
                  </View>
                  <View style={styles.detailLabelValue}>
                    <ThemedText type="small" style={[styles.detailLabel, { color: theme.textSecondary }]}>
                      {item.label}
                    </ThemedText>
                    <ThemedText type="body" style={[styles.detailValue, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {item.value}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Logout: bottom, subtle background, red text/icon */}
      <Animated.View entering={FadeInDown.delay(hasDetails ? 120 : 60).springify()} style={styles.logoutWrap}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={18} color={theme.error} style={styles.logoutIcon} />
          <ThemedText type="body" style={[styles.logoutText, { color: theme.error }]}>
            Log out
          </ThemedText>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  identityCard: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  identityName: {
    marginBottom: Spacing.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
    maxWidth: "100%",
  },
  identityIdentifier: {
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  detailCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  detailIconWrap: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabelValue: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing.sm,
  },
  detailLabel: {
    marginBottom: 2,
  },
  detailValue: {
    lineHeight: 22,
  },
  detailDivider: {
    height: 1,
    marginLeft: 36 + Spacing.sm + Spacing.lg,
  },
  logoutWrap: {
    marginTop: "auto",
    paddingTop: Spacing.lg,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  logoutIcon: {
    marginRight: Spacing.sm,
  },
  logoutText: {
    fontWeight: "500",
  },
});
