/**
 * Shown when user is authenticated but has no allowed role (guard/hm).
 * Global role check: block access; single action (Back to Login).
 */
import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";

type NavProp = NativeStackNavigationProp<RootStackParamList, "NoRoleBlock">;

const { width } = Dimensions.get("window");

export default function NoRoleBlockScreen() {
  const { theme, isDark } = useTheme();
  const auth = useAuth();
  const navigation = useNavigation<NavProp>();

  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.85);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(12);
  const msgOpacity = useSharedValue(0);
  const msgY = useSharedValue(12);
  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(12);

  useEffect(() => {
    iconOpacity.value = withTiming(1, { duration: 400 });
    iconScale.value = withSpring(1, { damping: 14, stiffness: 120 });

    titleOpacity.value = withDelay(180, withTiming(1, { duration: 350 }));
    titleY.value = withDelay(
      180,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }),
    );

    msgOpacity.value = withDelay(300, withTiming(1, { duration: 350 }));
    msgY.value = withDelay(
      300,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }),
    );

    btnOpacity.value = withDelay(420, withTiming(1, { duration: 350 }));
    btnY.value = withDelay(
      420,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const msgStyle = useAnimatedStyle(() => ({
    opacity: msgOpacity.value,
    transform: [{ translateY: msgY.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  const handleBackToLogin = async () => {
    await auth.logoutToLoginScreen();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "LoginOtp" }],
      }),
    );
  };

  const iconBg = isDark ? "rgba(220,53,69,0.12)" : "rgba(220,53,69,0.07)";
  const cardBg = isDark ? theme.backgroundDefault : "#FFFFFF";
  const supportBg = isDark ? "rgba(255,255,255,0.05)" : "#F5F6F7";

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        {/* Icon */}
        <Animated.View
          style={[styles.iconWrap, { backgroundColor: iconBg }, iconStyle]}
        >
          <Feather name="shield-off" size={36} color="#DC3545" />
        </Animated.View>

        {/* Title */}
        <Animated.View style={titleStyle}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Access Denied
          </ThemedText>
        </Animated.View>

        {/* Message */}
        <Animated.View style={msgStyle}>
          <ThemedText style={[styles.message, { color: theme.textSecondary }]}>
            Your account doesn't have permission to access the Guard
            application.
          </ThemedText>
        </Animated.View>

        {/* Support note */}
        <Animated.View
          style={[styles.supportRow, { backgroundColor: supportBg }, msgStyle]}
        >
          <Feather name="info" size={13} color={theme.textSecondary} />
          <ThemedText
            style={[styles.supportText, { color: theme.textSecondary }]}
          >
            Think this is a mistake?{" "}
            <ThemedText style={[styles.supportBold, { color: theme.text }]}>
              Contact Carrum Support.
            </ThemedText>
          </ThemedText>
        </Animated.View>

        {/* Button */}
        <Animated.View style={[{ width: "100%" }, btnStyle]}>
          <Pressable
            onPress={handleBackToLogin}
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <ThemedText style={styles.buttonText}>Back to Login</ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </ThemedView>
  );
}

const CARD_WIDTH = Math.min(width - 48, 380);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
    maxWidth: 280,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 28,
    width: "100%",
  },
  supportText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  supportBold: {
    fontWeight: "600",
    fontSize: 13,
  },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    backgroundColor: "#DC3545",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
