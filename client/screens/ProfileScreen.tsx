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
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
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
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { user: contextUser, clearUser } = useUser();

  const displayName =
    auth.user?.name?.trim() || contextUser?.name?.trim() || "—";
  const displayPhone = auth.user?.phone || contextUser?.phone || "";

  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const phoneFormatted = useMemo(
    () => formatPhoneDisplay(displayPhone),
    [displayPhone]
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top,
            paddingBottom: APP_FOOTER_HEIGHT + insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.profileSection}
        >
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitials} numberOfLines={1}>
              {initials}
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={2} ellipsizeMode="tail">
            {displayName}
          </Text>
          <Text style={styles.userPhone} numberOfLines={1} ellipsizeMode="tail">
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
              pressed && styles.logoutCardPressed,
            ]}
          >
            <View style={styles.logoutIconWrap}>
              <Feather name="log-out" size={20} color={LOGOUT_ICON_COLOR} />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
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
    backgroundColor: BG,
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
    marginTop:50,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: AVATAR_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: FONT_SERIF,
    fontSize: 36,
    fontWeight: "700",
    color: INITIALS_COLOR,
  },
  userName: {
    fontFamily: FONT_SERIF,
    fontSize: 22,
    fontWeight: "700",
    color: NAME_COLOR,
    textAlign: "center",
    marginTop: GAP_AVATAR_TO_NAME,
    paddingHorizontal: 16,
  },
  userPhone: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    fontWeight: "400",
    color: PHONE_COLOR,
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
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: LOGOUT_BORDER,
    paddingLeft: 12,
  },
  logoutCardPressed: {
    opacity: 0.92,
  },
  logoutIconWrap: {
    width: LOGOUT_ICON_SIZE,
    height: LOGOUT_ICON_SIZE,
    borderRadius: LOGOUT_ICON_SIZE / 2,
    backgroundColor: LOGOUT_ICON_BG,
    alignItems: "center",
    justifyContent: "center",
    marginRight: LOGOUT_ICON_TEXT_GAP,
    
  },
  logoutText: {
    fontFamily: FONT_SERIF,
    fontSize: 18,
    fontWeight: "500",
    color: LOGOUT_TEXT_COLOR,
  },
});
