import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Profile">;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const auth = useAuth();
  const { user: contextUser, clearUser } = useUser();

  const displayName = auth.user?.name?.trim() || contextUser?.name?.trim() || "—";
  const displayPhone = auth.user?.phone || contextUser?.phone || "—";

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
              CommonActions.reset({ index: 0, routes: [{ name: "WhoAreYou" }] })
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
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["2xl"],
        paddingHorizontal: Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={[styles.profileCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
      >
        <View style={[styles.avatarWrap, { backgroundColor: theme.primary }]}>
          <Feather name="user" size={44} color="#FFFFFF" />
        </View>
        <ThemedText
          type="h3"
          style={[styles.profileName, { color: theme.text }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {displayName}
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.profilePhone, { color: theme.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayPhone}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          DETAILS
        </ThemedText>
        <View style={[styles.detailCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Feather name="user" size={20} color={theme.primary} />
            </View>
            <View style={styles.detailLabelValue}>
              <ThemedText type="small" style={[styles.detailLabel, { color: theme.textSecondary }]}>Name</ThemedText>
              <ThemedText type="body" style={[styles.detailValue, { color: theme.text }]} numberOfLines={2} ellipsizeMode="tail">
                {displayName}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Feather name="phone" size={20} color={theme.primary} />
            </View>
            <View style={styles.detailLabelValue}>
              <ThemedText type="small" style={[styles.detailLabel, { color: theme.textSecondary }]}>Mobile</ThemedText>
              <ThemedText type="body" style={[styles.detailValue, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {displayPhone}
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.logoutWrap}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: theme.backgroundTertiary ?? theme.backgroundSecondary,
              borderWidth: 1,
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={20} color={theme.error} style={{ marginRight: Spacing.sm }} />
          <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>
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
  profileCard: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  profileName: {
    marginBottom: Spacing.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
    maxWidth: "100%",
  },
  profilePhone: {
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  detailCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  detailIconWrap: {
    width: 40,
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
    flexWrap: "wrap",
  },
  detailDivider: {
    height: 1,
    marginLeft: 40 + Spacing.sm + Spacing.lg,
  },
  logoutWrap: {
    marginTop: Spacing.lg,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
