import React, { useLayoutEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Text,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { AppFooter, useFooterTotalHeight } from "@/components/AppFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Profile">;

// Serif: Georgia on iOS, system serif on Android (per spec)
const FONT_SERIF = Platform.select({ ios: "Georgia", default: "serif" });

// Exact spec tokens
const BG = "#FFFFFF";
const AVATAR_BG = "#F8EBCF";
const INITIALS_COLOR = "#3F3F3F";
const NAME_COLOR = "#161B1D";
const PHONE_COLOR = "#161B1D";
const LOGOUT_BORDER = "#E6E6E6";
const LOGOUT_ICON_BG = "#F2F2F2";
const LOGOUT_ICON_COLOR = "#B31D38";
const LOGOUT_TEXT_COLOR = "#161B1D";

const AVATAR_SIZE = 96;
const GAP_AVATAR_TO_NAME = 24;
const GAP_NAME_TO_PHONE = 8;
const GAP_PHONE_TO_LOGOUT = 40;
const LOGOUT_CARD_HEIGHT = 56;
const LOGOUT_ICON_SIZE = 40;
const LOGOUT_ICON_TEXT_GAP = 12;

/** Get 2-letter initials from name */
function getInitials(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0].charAt(0);
    const b = parts[1].charAt(0);
    return (a + b).toUpperCase();
  }
  if (trimmed.length >= 2) return trimmed.slice(0, 2).toUpperCase();
  return trimmed.charAt(0).toUpperCase();
}

function formatPhoneDisplay(phone: string): string {
  const p = (phone || "").trim().replace(/\D/g, "");
  if (p.length === 10) return `+91-${p}`;
  if (phone) return phone;
  return "—";
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const footerTotalHeight = useFooterTotalHeight();
  const auth = useAuth();
  const { user: contextUser, clearUser } = useUser();
  const { theme, isDark } = useTheme();

  const displayName =
    auth.user?.name?.trim() || contextUser?.name?.trim() || "—";
  const displayPhone = auth.user?.phone || contextUser?.phone || "";

  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const phoneFormatted = useMemo(
    () => formatPhoneDisplay(displayPhone),
    [displayPhone],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out? You will need to sign in again with OTP.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            clearUser();
            await auth.logoutToLoginScreen();
            // Clear ticket cache after logout so new user never sees previous user's tickets
            queryClient.removeQueries({
              predicate: (query) => {
                const key = query.queryKey[0];
                return (
                  key === "ticket-counts" ||
                  key === "ticket-list" ||
                  key === "ticket-detail"
                );
              },
            });
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: "LoginOtp" }] }),
            );
          },
        },
      ],
    );
  };

  const containerBg = isDark ? theme.backgroundDefault : BG;
  const avatarBg = isDark ? theme.backgroundTertiary : AVATAR_BG;
  const avatarInitialsColor = isDark ? theme.text : INITIALS_COLOR;
  const nameColor = isDark ? theme.text : NAME_COLOR;
  const phoneColor = isDark ? theme.text : PHONE_COLOR;
  const logoutCardBg = isDark ? theme.surface : BG;
  const logoutBorder = isDark ? theme.border : LOGOUT_BORDER;
  const logoutIconBg = isDark ? theme.backgroundSecondary : LOGOUT_ICON_BG;
  const logoutIconColor = isDark ? theme.primary : LOGOUT_ICON_COLOR;
  const logoutTextColor = isDark ? theme.text : LOGOUT_TEXT_COLOR;

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top,
            paddingBottom: footerTotalHeight,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.profileSection}
        >
          <View style={[styles.avatarWrap, { backgroundColor: avatarBg }]}>
            <Text
              style={[styles.avatarInitials, { color: avatarInitialsColor }]}
              numberOfLines={1}
            >
              {initials}
            </Text>
          </View>
          <Text
            style={[styles.userName, { color: nameColor }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {displayName}
          </Text>
          <Text
            style={[styles.userPhone, { color: phoneColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {phoneFormatted}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={styles.logoutWrap}
        >
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutCard,
              { backgroundColor: logoutCardBg, borderColor: logoutBorder },
              pressed && styles.logoutCardPressed,
            ]}
          >
            <View
              style={[styles.logoutIconWrap, { backgroundColor: logoutIconBg }]}
            >
              <Feather name="log-out" size={20} color={logoutIconColor} />
            </View>
            <Text style={[styles.logoutText, { color: logoutTextColor }]}>
              Logout
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <AppFooter activeTab="Account" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
    alignItems: "center",
  },
  profileSection: {
    alignItems: "center",
    width: "100%",
    marginTop: 50,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: FONT_SERIF,
    fontSize: 36,
    fontWeight: "700",
  },
  userName: {
    fontFamily: FONT_SERIF,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: GAP_AVATAR_TO_NAME,
    paddingHorizontal: 16,
  },
  userPhone: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
    marginTop: GAP_NAME_TO_PHONE,
    paddingHorizontal: 16,
  },
  logoutWrap: {
    width: "90%",
    marginTop: GAP_PHONE_TO_LOGOUT,
    alignSelf: "center",
  },
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    height: LOGOUT_CARD_HEIGHT,
    borderRadius: LOGOUT_CARD_HEIGHT / 2,
    borderWidth: 1,
    paddingLeft: 12,
  },
  logoutCardPressed: {
    opacity: 0.92,
  },
  logoutIconWrap: {
    width: LOGOUT_ICON_SIZE,
    height: LOGOUT_ICON_SIZE,
    borderRadius: LOGOUT_ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: LOGOUT_ICON_TEXT_GAP,
  },
  logoutText: {
    fontFamily: FONT_SERIF,
    fontSize: 18,
    fontWeight: "500",
  },
});
