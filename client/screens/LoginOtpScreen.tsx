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
import { sendOtp, verifyOtp } from "@/lib/auth";
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

/** Responsive OTP box constraints */
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
  const { theme } = useTheme();
  const auth = useAuth();
  const { setUser: setUserContext } = useUser();
  const otpInputRef = useRef<TextInput>(null);
  const sessionExpiredMessage = route.params?.message ?? null;

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [retryingGuest, setRetryingGuest] = useState(false);

  const { width: screenWidth } = useWindowDimensions();

  // --- START LOGIC: Don't touch this ---
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
      const route = !auth.hasValidRole
        ? "NoRoleBlock"
        : !auth.hasHub
          ? "NoHubBlock"
          : "VisitorType";
      const t = setTimeout(() => navigation.replace(route), 0);
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
            data.user.userContacts?.find((c) => c.isPrimary)?.phoneNo ||
            data.user.userContacts?.[0]?.phoneNo ||
            data.user.name;
          setUserContext({
            name: data.user.name?.trim() || primaryPhone,
            phone: primaryPhone,
          });
        }
      } catch (_e) {
        auth.logout();
        setStep("phone");
        setError(SESSION_EXPIRED_MSG);
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
      auth.logout();
      setError(SESSION_EXPIRED_MSG);
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
      auth.logout();
      setError(SESSION_EXPIRED_MSG);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const setOtpDigits = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
  };

  const goBackToPhone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("phone");
    setError(null);
  };

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

  const sessionExpiredMessageFromRoute = route.params?.message ?? null;
  if (!!(auth.authError || sessionExpiredMessageFromRoute)) {
    return (
      <SessionExpiredScreen
        message={auth.authError || sessionExpiredMessageFromRoute || undefined}
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
  // --- END LOGIC ---

  const inputBorderColor = phoneFocused ? loginTokens.headerRed : "#D7D7D7";

  // --- UI SCREENS ---

  if (step === "otp") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: loginTokens.cardBg }]}
        edges={["top"]}
      >
        <BackArrow onPress={goBackToPhone} color={loginTokens.otpText} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
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
                  onChangeText={setOtpDigits}
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
                          i === otp.length
                            ? loginTokens.otpBoxBorderActive
                            : loginTokens.otpBoxBorder,
                        borderWidth: i === otp.length ? 2 : 1,
                      },
                    ]}
                  >
                    <ThemedText
                      type="h5"
                      style={[
                        styles.otpBoxDigit,
                        {
                          color: loginTokens.otpText,
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

              <View style={styles.resendRowOtp}>
                <ThemedText type="body">
                  Didn&apos;t receive the code?{" "}
                </ThemedText>
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

  // --- PHONE SCREEN (MAIN CHANGES HERE) ---
  return (
    <View
      style={[styles.container, { backgroundColor: loginTokens.headerRed }]}
    >
      <View style={[styles.loginHeader, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn.duration(280)} style={styles.hero}>
          <LatestLogo
            width={206}
            height={139}
            style={styles.heroLogoOnRed}
          />
        </Animated.View>
      </View>

      <View style={styles.whiteCard}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.welcomeBlock}>
              <ThemedText style={styles.welcomeTitle}>Welcome</ThemedText>
              <ThemedText style={styles.welcomeSubtitle}>
                Entry/ Exit Application
              </ThemedText>
            </View>

            <View
              style={[styles.phoneInputWrap, { borderColor: inputBorderColor }]}
            >
              <ThemedText style={styles.phonePrefix}>+91</ThemedText>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter mobile number"
                placeholderTextColor="#A2ACB1"
                value={phone}
                onChangeText={(v) => setPhone(normalizePhoneInput(v))}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
                maxLength={PHONE_MAX_DIGITS}
              />
            </View>

            <Button
              onPress={handleSendOtp}
              disabled={!isPhoneValid || loading}
              style={[
                styles.sentOtpButton,
                {
                  backgroundColor: isPhoneValid
                    ? loginTokens.headerRed
                    : "#D7D7D7",
                },
              ]}
            >
              <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
                {loading ? "Sending…" : "Sent OTP"}
              </ThemedText>
            </Button>

            <View style={styles.termsRow}>
              <ThemedText style={styles.termsText}>
                By continuing, I agree to the{" "}
              </ThemedText>
              <Pressable
                onPress={() => Linking.openURL("https://example.com/terms")}
              >
                <ThemedText style={[styles.termsText, styles.termsLink]}>
                  terms & conditions
                </ThemedText>
              </Pressable>
              <ThemedText style={styles.termsText}> and </ThemedText>
              <Pressable
                onPress={() => Linking.openURL("https://example.com/privacy")}
              >
                <ThemedText style={[styles.termsText, styles.termsLink]}>
                  privacy policy
                </ThemedText>
              </Pressable>
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
  scrollView: { flex: 1 },
  loginHeader: {
    height: 401,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B31D38",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  hero: { alignItems: "center", justifyContent: "center" },
  heroLogoOnRed: { width: 206, height: 139 },
  whiteCard: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 474,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
  },
  scrollContent: { alignItems: "center", paddingTop: 40, paddingBottom: 24 },
  welcomeBlock: { alignItems: "center", marginBottom: 32 },
  welcomeTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 24,
    color: "#000",
  },
  welcomeSubtitle: {
    fontFamily: "Poppins",
    fontWeight: "500",
    fontSize: 18,
    color: "#000",
  },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: 328,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 24,
  },
  phonePrefix: {
    fontWeight: "600",
    fontSize: 16,
    color: "#77878E",
    marginRight: 10,
  },
  phoneInput: { flex: 1, fontSize: 16, color: "#000" },
  sentOtpButton: {
    width: 328,
    height: 46,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  termsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 120,
    width: 327,
  },
  termsText: { fontSize: 14, color: "#3F4C52", textAlign: "center" },
  termsLink: { color: "#1A8477", fontWeight: "600" },
  // OTP Styles (Keep yours)
  otpContent: { width: "100%", paddingHorizontal: 16 },
  otpTitle: { fontSize: 28, fontWeight: "700", marginTop: 40 },
  otpSubtitle: { fontSize: 16, color: "#77878E", marginBottom: 24 },
  otpRowWrap: { flexDirection: "row", width: "100%" },
  otpHiddenInput: { position: "absolute", opacity: 0, width: "100%" },
  otpBox: { borderRadius: 8, alignItems: "center", justifyContent: "center" },
  otpBoxDigit: { fontWeight: "600" },
  resendRowOtp: { flexDirection: "row", marginTop: 24 },
});
