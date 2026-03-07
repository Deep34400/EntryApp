import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Linking,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { BackArrow } from "@/components/BackArrow";
import { Button } from "@/components/Button";
import { SessionExpiredScreen } from "@/components/SessionExpiredScreen";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import LatestLogo from "../../assets/images/latestLogo.svg";
import { DesignTokens } from "@/constants/designTokens";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { AuthError, sendOtp, verifyOtp } from "@/lib/auth";
import {
  normalizePhoneInput,
  isPhoneValid as checkPhoneValid,
  PHONE_MAX_DIGITS,
} from "@/utils/validation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "LoginOtp">;
type Step = "phone" | "otp";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
const SESSION_EXPIRED_MSG = "Your session expired. Please request OTP again.";

const OTP_BOX_MIN = 40;
const OTP_BOX_MAX = 56;
const OTP_GAP = 8;
const OTP_ROW_MAX_WIDTH = 440;
const OTP_FONT_RATIO = 0.44;
const OTP_FONT_MIN = 14;
const OTP_FONT_MAX = 22;

const loginTokens = DesignTokens.login;

export default function LoginOtpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "LoginOtp">>();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const auth = useAuth();
  const { setUser: setUserContext } = useUser();
  const otpInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [retryingGuest, setRetryingGuest] = useState(false);

  const { width: screenWidth } = useWindowDimensions();

  // --- START LOGIC: UNTOUCHED ---
  const otpLayout = useMemo(() => {
    const horizontalPadding = Layout.horizontalScreenPadding * 2;
    const availableWidth = Math.min(
      screenWidth - horizontalPadding,
      OTP_ROW_MAX_WIDTH,
    );
    const totalGap = (OTP_LENGTH - 1) * OTP_GAP;
    const rawBoxSize = (availableWidth - totalGap) / OTP_LENGTH;
    const boxSize = Math.round(
      Math.min(OTP_BOX_MAX, Math.max(OTP_BOX_MIN, rawBoxSize)),
    );
    const digitFontSize = Math.round(
      Math.min(OTP_FONT_MAX, Math.max(OTP_FONT_MIN, boxSize * OTP_FONT_RATIO)),
    );
    return { boxSize, gapSize: OTP_GAP, digitFontSize };
  }, [screenWidth]);

  const phoneTrimmed = phone.trim().replace(/\D/g, "");
  const isPhoneValid = checkPhoneValid(phone);
  const isOtpComplete = otp.trim().length === OTP_LENGTH;

  useEffect(() => {
    if (!auth.isRestored || !auth.isGuestReady) return;
    if (auth.accessToken && auth.user) {
      setUserContext({ name: auth.user.name, phone: auth.user.phone });
      const routeName = !auth.hasValidRole
        ? "NoRoleBlock"
        : !auth.hasHub
          ? "NoHubBlock"
          : "VisitorType";
      const t = setTimeout(() => navigation.replace(routeName), 0);
      return () => clearTimeout(t);
    }
  }, [
    auth.isRestored,
    auth.isGuestReady,
    auth.accessToken,
    auth.user,
    auth.hasValidRole,
    auth.hasHub,
    setUserContext,
    navigation,
  ]);

  const hasUser =
    auth.isRestored && auth.isGuestReady && auth.accessToken && auth.user;

  useEffect(() => {
    if (step === "otp") {
      const t = setTimeout(() => otpInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(
      () => setResendCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [resendCooldown]);

  const verifyTriggeredRef = useRef(false);
  useEffect(() => {
    if (otp.trim().length < OTP_LENGTH) verifyTriggeredRef.current = false;
  }, [otp]);

  useEffect(() => {
    const guestToken = auth.guestToken;
    if (
      step !== "otp" ||
      !isOtpComplete ||
      !guestToken ||
      loading ||
      verifyTriggeredRef.current
    )
      return;
    verifyTriggeredRef.current = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const data = await verifyOtp(phoneTrimmed, otp.trim(), guestToken);
        if (data) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await auth.setTokensAfterVerify(data);
          const primaryPhone =
            (data.user.phoneNo && String(data.user.phoneNo).trim()) ||
            data.user.userContacts?.find((c) => c.isPrimary)?.phoneNo ||
            data.user.userContacts?.[0]?.phoneNo ||
            data.user.name;
          setUserContext({
            name: data.user.name?.trim() || primaryPhone,
            phone: primaryPhone,
          });
        }
      } catch (_e) {
        const status = (_e as AuthError)?.statusCode;
        if (status === 401 || status === 403) {
          auth.logout();
          setStep("phone");
          setError(SESSION_EXPIRED_MSG);
        } else if ((status ?? 0) >= 500) {
          return;
        } else {
          setOtp("");
          verifyTriggeredRef.current = false;
          setError(
            (_e as AuthError)?.message || "Incorrect OTP, please try again.",
          );
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    step,
    isOtpComplete,
    otp,
    phoneTrimmed,
    auth.guestToken,
    loading,
    auth,
    setUserContext,
  ]);

  const handleSendOtp = async () => {
    if (!isPhoneValid || !auth.guestToken) return;
    setError(null);
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendOtp(phoneTrimmed, auth.guestToken);
      setStep("otp");
      setOtp("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_e) {
      const status = (_e as AuthError)?.statusCode;
      if (status === 401 || status === 403) {
        auth.logout();
        setError(SESSION_EXPIRED_MSG);
      } else if ((status ?? 0) >= 500) {
        return;
      } else {
        setError(
          (_e as AuthError)?.message ||
            "Something went wrong. Please try again.",
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!isPhoneValid || !auth.guestToken || resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendOtp(phoneTrimmed, auth.guestToken);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_e) {
      const status = (_e as AuthError)?.statusCode;
      if (status === 401 || status === 403) {
        auth.logout();
        setError(SESSION_EXPIRED_MSG);
      } else if ((status ?? 0) >= 500) {
        return;
      } else {
        setError(
          (_e as AuthError)?.message ||
            "Something went wrong. Please try again.",
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const goBackToPhone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("phone");
    setError(null);
  };
  // --- END LOGIC ---

  if (hasUser || !auth.isGuestReady || !auth.isRestored) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!!(auth.authError || route.params?.message)) {
    return (
      <SessionExpiredScreen
        message={auth.authError || route.params?.message || undefined}
        isLoading={retryingGuest}
        onSignInAgain={async () => {
          setRetryingGuest(true);
          try {
            await auth.ensureGuestToken();
            navigation.replace("LoginOtp");
          } finally {
            setRetryingGuest(false);
          }
        }}
      />
    );
  }

  if (step === "otp") {
    const otpCardBg = isDark ? theme.backgroundDefault : loginTokens.cardBg;
    const otpBoxBorder = isDark ? theme.border : loginTokens.otpBoxBorder;
    const otpBoxBorderActive = isDark
      ? theme.primary
      : loginTokens.otpBoxBorderActive;
    const otpTextColor = isDark ? theme.text : loginTokens.otpText;
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: otpCardBg }]}
        edges={["top"]}
      >
        <BackArrow
          onPress={goBackToPhone}
          color={isDark ? theme.text : loginTokens.otpText}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true} // Fixed for Build
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              entering={FadeIn.duration(260)}
              style={styles.otpContent}
            >
              <ThemedText type="h3" style={styles.otpTitle}>
                Enter OTP
              </ThemedText>
              <ThemedText type="body" style={styles.otpSubtitle}>
                OTP sent to {phoneTrimmed}
              </ThemedText>
              <Pressable
                onPress={() => otpInputRef.current?.focus()}
                style={[
                  styles.otpRowWrap,
                  { height: otpLayout.boxSize, marginBottom: Spacing.lg },
                ]}
              >
                <TextInput
                  ref={otpInputRef}
                  value={otp}
                  onChangeText={(v) =>
                    setOtp(v.replace(/\D/g, "").slice(0, OTP_LENGTH))
                  }
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  editable={!loading}
                  style={styles.otpHiddenInput}
                />
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      {
                        width: otpLayout.boxSize,
                        height: otpLayout.boxSize,
                        marginRight: i < OTP_LENGTH - 1 ? otpLayout.gapSize : 0,
                        borderColor:
                          i === otp.length ? otpBoxBorderActive : otpBoxBorder,
                        backgroundColor: isDark
                          ? theme.backgroundSecondary
                          : undefined,
                        borderWidth: i === otp.length ? 2 : 1,
                      },
                    ]}
                  >
                    <ThemedText
                      type="h5"
                      style={[
                        styles.otpBoxDigit,
                        {
                          color: otpTextColor,
                          opacity: otp[i] ? 1 : 0.4,
                          fontSize: otpLayout.digitFontSize,
                        },
                      ]}
                    >
                      {otp[i] || ""}
                    </ThemedText>
                  </View>
                ))}
              </Pressable>
              {error ? (
                <View style={styles.otpErrorWrap}>
                  <ThemedText
                    type="body"
                    style={[styles.otpErrorText, { color: theme.error }]}
                  >
                    {error}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.resendRowOtp}>
                <ThemedText type="body">Didn't receive the code? </ThemedText>
                {resendCooldown > 0 ? (
                  <ThemedText type="body">
                    Resend in {resendCooldown}s
                  </ThemedText>
                ) : (
                  <Pressable onPress={handleResendOtp} disabled={loading}>
                    <ThemedText
                      type="body"
                      style={{
                        color: loginTokens.resendGreen,
                        fontWeight: "600",
                      }}
                    >
                      Resend
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- PHONE SCREEN (FIXED FOR PRODUCTION BUILD SCROLLING) ---
  const whiteCardBg = isDark ? theme.backgroundDefault : "#FFFFFF";
  const welcomeTitleColor = isDark ? theme.text : "#000";
  const welcomeSubtitleColor = isDark ? theme.textSecondary : "#666";
  const phoneInputWrapBg = isDark ? theme.backgroundSecondary : "#F9FAFB";
  const phoneInputBorder = phoneFocused
    ? isDark
      ? theme.primary
      : loginTokens.headerRed
    : isDark
      ? theme.border
      : "#E0E0E0";
  const phonePrefixColor = isDark ? theme.text : "#333";
  const phoneInputColor = isDark ? theme.text : "#000";
  const placeholderColor = isDark ? theme.textSecondary : "#A2ACB1";
  const sentOtpBtnBg = isPhoneValid
    ? isDark
      ? theme.primary
      : loginTokens.headerRed
    : isDark
      ? theme.backgroundTertiary
      : "#D7D7D7";
  const termsTextColor = isDark ? theme.textSecondary : "#999";
  const termsLinkColor = isDark ? theme.link : "#17A589";

  return (
    <View
      style={[styles.container, { backgroundColor: loginTokens.headerRed }]}
    >
      <View style={[styles.loginHeader, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.hero}>
          <LatestLogo width={200} height={130} />
        </Animated.View>
      </View>

      <View style={[styles.whiteCard, { backgroundColor: whiteCardBg }]}>
        <KeyboardAvoidingView
          // Changed to height for Android Build stability
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true} // Fixed for Build
            bounces={false}
          >
            <View style={{ width: "100%", alignItems: "center" }}>
              <View style={styles.welcomeBlock}>
                <ThemedText
                  style={[styles.welcomeTitle, { color: welcomeTitleColor }]}
                >
                  Welcome
                </ThemedText>
                <ThemedText
                  style={[
                    styles.welcomeSubtitle,
                    { color: welcomeSubtitleColor },
                  ]}
                >
                  Entry/ Exit Application
                </ThemedText>
              </View>

              <View
                style={[
                  styles.phoneInputWrap,
                  {
                    borderColor: phoneInputBorder,
                    backgroundColor: phoneInputWrapBg,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.phonePrefix, { color: phonePrefixColor }]}
                >
                  🇮🇳 +91
                </ThemedText>
                <TextInput
                  style={[styles.phoneInput, { color: phoneInputColor }]}
                  placeholder="Enter mobile number"
                  placeholderTextColor={placeholderColor}
                  value={phone}
                  onChangeText={(v) => setPhone(normalizePhoneInput(v))}
                  onFocus={() => {
                    setPhoneFocused(true);
                    setTimeout(
                      () => scrollRef.current?.scrollToEnd({ animated: true }),
                      200, // Reduced delay for better feel
                    );
                  }}
                  onBlur={() => setPhoneFocused(false)}
                  keyboardType="phone-pad"
                  maxLength={PHONE_MAX_DIGITS}
                />
              </View>

              <Pressable
                onPress={handleSendOtp}
                disabled={!isPhoneValid || loading}
                style={({ pressed }) => [
                  styles.sentOtpButton,
                  {
                    backgroundColor: sentOtpBtnBg,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator
                    color={isDark ? theme.onPrimary : "#FFF"}
                  />
                ) : (
                  <ThemedText
                    style={[
                      styles.buttonText,
                      {
                        color: isDark
                          ? !isPhoneValid
                            ? theme.textSecondary
                            : theme.onPrimary
                          : "#FFF",
                      },
                    ]}
                  >
                    Sent OTP
                  </ThemedText>
                )}
              </Pressable>
            </View>

            <View style={styles.termsRow}>
              <ThemedText style={[styles.termsText, { color: termsTextColor }]}>
                By continuing, I agree to the{" "}
              </ThemedText>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      "https://www.carrum.co.in/terms-of-agreement",
                    )
                  }
                >
                  <ThemedText
                    style={[styles.termsLink, { color: termsLinkColor }]}
                  >
                    terms & conditions
                  </ThemedText>
                </Pressable>
                <ThemedText
                  style={[styles.termsText, { color: termsTextColor }]}
                >
                  {" "}
                  and{" "}
                </ThemedText>
                <Pressable
                  onPress={() =>
                    Linking.openURL("https://www.carrum.co.in/privacy-policy")
                  }
                >
                  <ThemedText
                    style={[styles.termsLink, { color: termsLinkColor }]}
                  >
                    privacy policy
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  keyboardView: { flex: 1 },
  loginHeader: {
    height: "35%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B31D38",
  },
  hero: { alignItems: "center", justifyContent: "center" },
  whiteCard: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingHorizontal: 24,
    overflow: "visible", // Removed 'hidden' for scroll stability
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 24,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeBlock: {
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  welcomeTitle: {
    fontWeight: "700",
    fontSize: 28,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontWeight: "500",
    fontSize: 16,
    marginTop: 4,
    textAlign: "center",
  },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 60,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 24,
  },
  phonePrefix: {
    fontWeight: "700",
    fontSize: 16,
    marginRight: 10,
  },
  phoneInput: { flex: 1, fontSize: 18 },
  sentOtpButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  termsRow: {
    width: "100%",
    paddingVertical: 20,
    alignItems: "center",
  },
  termsText: { fontSize: 12, textAlign: "center" },
  termsLink: { fontWeight: "600", fontSize: 12 },

  otpContent: { width: "100%", paddingHorizontal: 16 },
  otpTitle: { fontSize: 28, fontWeight: "700", marginTop: 40 },
  otpSubtitle: { fontSize: 16, color: "#77878E", marginBottom: 24 },
  otpRowWrap: { flexDirection: "row", width: "100%" },
  otpHiddenInput: { position: "absolute", opacity: 0, width: "100%" },
  otpBox: { borderRadius: 8, alignItems: "center", justifyContent: "center" },
  otpBoxDigit: { fontWeight: "600" },
  otpErrorWrap: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  otpErrorText: { fontWeight: "500", textAlign: "center" },
  resendRowOtp: { flexDirection: "row", marginTop: 24 },
});
