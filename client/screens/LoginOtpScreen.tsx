import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { sendOtp, verifyOtp } from "@/lib/auth-api";
import { normalizePhoneInput, isPhoneValid as checkPhoneValid, PHONE_MAX_DIGITS } from "@/utils/validation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "LoginOtp">;

type Step = "phone" | "otp";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
/** Figma: Rectangle 4736 background */
const PRIMARY_RED = "#B31D38";
const RESEND_GREEN = "#388E3C";
/** Figma: red header height exactly 401px */
const HEADER_HEIGHT = 401;
/** Figma: white card overlaps red by 75px (401 + 474 - 800) */
const WHITE_CARD_OVERLAP = 75;
/** Figma: content top offset inside white card (358 - 326) */
const CONTENT_TOP_OFFSET = 32;
/** Figma: content width 328px, horizontal padding 16 each side */
const CONTENT_WIDTH = 328;
const SCREEN_PADDING_H = 16;


export default function LoginOtpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const auth = useAuth();
  const { setUser: setUserContext } = useUser();
  const otpInputRef = useRef<TextInput>(null);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const phoneTrimmed = phone.trim().replace(/\D/g, "");
  const isPhoneValid = checkPhoneValid(phone);
  const isOtpComplete = otp.trim().length === OTP_LENGTH;

  useEffect(() => {
    if (!auth.isRestored || !auth.isGuestReady) return;
    if (auth.accessToken && auth.user) {
      setUserContext({ name: auth.user.name, phone: auth.user.phone });
      const t = setTimeout(() => navigation.replace("VisitorType"), 0);
      return () => clearTimeout(t);
    }
  }, [auth.isRestored, auth.isGuestReady, auth.accessToken, auth.user, setUserContext, navigation]);

  const hasUser = auth.isRestored && auth.isGuestReady && auth.accessToken && auth.user;

  useEffect(() => {
    if (step === "otp") {
      const t = setTimeout(() => otpInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isOtpComplete || !auth.guestToken) return;
    setError(null);
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await verifyOtp(phoneTrimmed, otp.trim(), auth.guestToken);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP. Please try again.");
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

  if (hasUser) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
          Loading…
        </ThemedText>
      </View>
    );
  }

  if (!auth.isGuestReady || !auth.isRestored) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
          Preparing…
        </ThemedText>
      </View>
    );
  }

  if (auth.authError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText type="body" style={{ color: theme.error, marginBottom: Spacing.lg, textAlign: "center" }}>
          {auth.authError}
        </ThemedText>
        <Button onPress={() => auth.ensureGuestToken()}>Retry</Button>
      </View>
    );
  }

  const inputBorderColor = phoneFocused ? theme.primary : "#D7D7D7";

  if (step === "otp") {
    return (
      <View style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
        <View style={[styles.otpTopBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={goBackToPhone}
            style={({ pressed }) => [styles.backArrowAbsolute, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={16}
            accessibilityLabel="Back to phone number"
          >
            <Feather name="chevron-left" size={26} color="#1C1917" />
          </Pressable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContentPhone, styles.otpScrollContent, { paddingTop: Spacing.xl, paddingBottom: insets.bottom + Spacing["2xl"] }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeIn.duration(260)} style={styles.otpContent}>
              <ThemedText type="h3" style={styles.otpTitle}>Enter OTP</ThemedText>
              <ThemedText type="body" style={styles.otpSubtitle}>OTP sent to {phoneTrimmed || "..."}</ThemedText>
              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border, marginTop: Spacing.lg, marginBottom: Spacing.md }]}>
                  <ThemedText type="small" style={{ color: theme.error }}>{error}</ThemedText>
                </View>
              ) : null}
              <Pressable onPress={() => otpInputRef.current?.focus()} style={styles.otpRowWrap}>
                <TextInput ref={otpInputRef} value={otp} onChangeText={setOtpDigits} keyboardType="number-pad" maxLength={OTP_LENGTH} editable={!loading} style={styles.otpHiddenInput} testID="input-otp" />
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const digit = otp[i] ?? "";
                  const isActive = i === otp.length;
                  return (
                    <View key={i} style={[styles.otpBox, { borderColor: isActive ? "#1C1917" : "#E5E7EB", borderWidth: isActive ? 2 : 1 }]}>
                      <ThemedText type="h5" style={[styles.otpBoxDigit, { color: "#1C1917", opacity: digit ? 1 : 0.4 }]}>{digit}</ThemedText>
                    </View>
                  );
                })}
              </Pressable>
              <View style={styles.resendRowOtp}>
                <ThemedText type="body" style={styles.resendLabel}>Didn&apos;t receive the code? </ThemedText>
                {resendCooldown > 0 ? (
                  <ThemedText type="body" style={styles.resendCooldown}>Resend in {resendCooldown}s</ThemedText>
                ) : (
                  <Pressable onPress={handleResendOtp} disabled={loading} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                    <ThemedText type="body" style={[styles.resendLink, { color: RESEND_GREEN }]}>Resend</ThemedText>
                  </Pressable>
                )}
              </View>
              <View style={styles.primaryButtonWrap}>
                <Button
                  onPress={handleVerifyOtp}
                  disabled={!isOtpComplete || loading}
                  style={[styles.primaryButton, styles.pillButton, { backgroundColor: isOtpComplete ? PRIMARY_RED : theme.backgroundSecondary, opacity: isOtpComplete && !loading ? 1 : 0.8, borderWidth: 0 }]}
                >
                  {loading ? "Verifying…" : "Verify & Continue"}
                </Button>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
      {/* Figma: Rectangle 4736 — red header 360×401, bottom radius 24px */}
      <View style={[styles.loginHeader, { height: HEADER_HEIGHT, paddingTop: insets.top, backgroundColor: PRIMARY_RED }]}>
        <Animated.View entering={FadeIn.duration(280)} style={styles.hero}>
          <Image
            source={require("../../assets/images/latestLogo.png")}
            style={styles.heroLogoOnRed}
            resizeMode="contain"
          />
          <ThemedText type="h4" style={[styles.heroTitle, { color: "#FFFFFF" }]}>carrum</ThemedText>
          <ThemedText type="small" style={[styles.heroSubtitle, { color: "#FFFFFF" }]}>MOBILITY SOLUTIONS</ThemedText>
        </Animated.View>
      </View>
      {/* Figma: Rectangle 2 — white card overlaps by 75px, top radius 20px, no shadow */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView
          style={[styles.scrollView, styles.whiteCard]}
          contentContainerStyle={[styles.scrollContentPhone, { paddingTop: CONTENT_TOP_OFFSET, paddingBottom: insets.bottom + 24 + 44 + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Figma: Frame 1000002192 — 328px content, gap 24px */}
          <Animated.View
            entering={FadeIn.delay(120).duration(260)}
            style={styles.contentBlock}
          >
            {/* Figma: Frame 1000002186 / 1000002185 — Welcome + Entry/ Exit, gap 4px */}
            <View style={styles.welcomeBlock}>
              <ThemedText style={styles.welcomeTitle}>Welcome</ThemedText>
              <ThemedText style={styles.welcomeSubtitle}>Entry/ Exit Application</ThemedText>
            </View>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                <ThemedText type="small" style={{ color: theme.error }}>{error}</ThemedText>
              </View>
            ) : null}
            {/* Figma: Frame 36809 — input 328×56, padding 13×16, gap 10, border #D7D7D7, radius 12 */}
            <View style={[styles.phoneInputWrap, { borderColor: inputBorderColor }]}>
              <ThemedText style={styles.phonePrefix}>+91</ThemedText>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter mobile number"
                placeholderTextColor="#A2ACB1"
                selectionColor={PRIMARY_RED}
                value={phone}
                onChangeText={(v) => setPhone(normalizePhoneInput(v))}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
                maxLength={PHONE_MAX_DIGITS}
                editable={!loading}
                testID="input-phone"
              />
            </View>
            {/* Figma: Frame 1000002156 — button 328×46, radius 22, Sent OTP 14px 600 */}
            <View style={styles.primaryButtonWrap}>
              <Button
                onPress={handleSendOtp}
                disabled={!isPhoneValid || loading}
                style={[styles.sentOtpButton, { backgroundColor: isPhoneValid ? PRIMARY_RED : theme.backgroundSecondary, opacity: isPhoneValid && !loading ? 1 : 0.8, borderWidth: 0 }]}
              >
                {loading ? "Sending…" : "Sent OTP"}
              </Button>
            </View>
          </Animated.View>
        </ScrollView>
        {/* Figma: terms — absolute bottom 24px, 327×44, 14px 400, color #3F4C52 */}
        <View style={[styles.termsWrap, { bottom: 24 + insets.bottom }]}>
          <View style={styles.termsRow}>
            <ThemedText style={styles.termsText}>By continuing, I agree to the </ThemedText>
            <Pressable onPress={() => Linking.openURL("https://example.com/terms").catch(() => {})} hitSlop={8}>
              <ThemedText style={[styles.termsText, styles.termsLink]}>terms & conditions</ThemedText>
            </Pressable>
            <ThemedText style={styles.termsText}> and </ThemedText>
            <Pressable onPress={() => Linking.openURL("https://example.com/privacy").catch(() => {})} hitSlop={8}>
              <ThemedText style={[styles.termsText, styles.termsLink]}>privacy policy</ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentPhone: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING_H,
    maxWidth: CONTENT_WIDTH + SCREEN_PADDING_H * 2,
    width: "100%",
    alignSelf: "center",
  },
  // --- Login (phone) step: Figma Rectangle 4736 ---
  loginHeader: {
    width: "100%",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  hero: {
    paddingTop: 108,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  heroLogoOnRed: {
    width: 206,
    height: 139.15,
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 20,
    marginBottom: Spacing.xs,
    textAlign: "center",
    textTransform: "lowercase",
  },
  heroSubtitle: {
    fontFamily: "Poppins",
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 12,
  },
  // --- Figma Rectangle 2: white card, overlap 75px, top radius 20px ---
  whiteCard: {
    flex: 1,
    marginTop: -WHITE_CARD_OVERLAP,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  contentBlock: {
    flexDirection: "column",
    width: "100%",
    maxWidth: CONTENT_WIDTH,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 0,
    gap: 24,
  },
  welcomeBlock: {
    alignSelf: "center",
    alignItems: "center",
    gap: 4,
  },
  welcomeTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 24,
    lineHeight: 32,
    color: "#000000",
  },
  welcomeSubtitle: {
    fontFamily: "Poppins",
    fontWeight: "500",
    fontSize: 18,
    lineHeight: 30,
    color: "#000000",
  },
  phoneInputWrap: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: CONTENT_WIDTH,
    height: 56,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  phonePrefix: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 24,
    color: "#77878E",
    textAlign: "center",
  },
  phoneInput: {
    flex: 1,
    fontFamily: "Poppins",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 24,
    color: "#000000",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  sentOtpButton: {
    width: "100%",
    maxWidth: CONTENT_WIDTH,
    height: 46,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonWrap: {
    width: "100%",
  },
  primaryButton: {
    borderRadius: BorderRadius.md,
    minHeight: 56,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  // --- Figma: terms absolute bottom 24px, 14px 400, #3F4C52 ---
  termsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING_H,
  },
  termsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 327,
  },
  termsText: {
    fontFamily: "Poppins",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 22,
    color: "#3F4C52",
    textAlign: "center",
  },
  termsLink: {
    color: "#0D9488",
    fontWeight: "600",
  },
  // --- OTP step ---
  otpTopBar: {
    paddingHorizontal: SCREEN_PADDING_H,
    paddingBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  backArrowAbsolute: {
    width: Layout.backButtonTouchTarget,
    height: Layout.backButtonTouchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  otpContent: {
    width: "100%",
  },
  otpTitle: {
    fontFamily: "Poppins",
    color: "#1C1917",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  otpSubtitle: {
    fontFamily: "Poppins",
    color: "#4B5563",
    fontSize: 16,
    marginBottom: Spacing.xl,
  },
  resendLabel: {
    fontFamily: "Poppins",
    color: "#4B5563",
  },
  resendCooldown: {
    fontFamily: "Poppins",
    color: "#4B5563",
  },
  resendLink: {
    fontFamily: "Poppins",
    fontWeight: "600",
  },
  otpScrollContent: {
    flexGrow: 1,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  otpRowWrap: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: Spacing.sm,
    position: "relative",
    minHeight: 56,
    marginBottom: Spacing.lg,
  },
  otpHiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 56,
    left: 0,
    right: 0,
    fontSize: 16,
  },
  otpBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxDigit: {
    fontFamily: "Poppins",
    fontWeight: "600",
  },
  resendRowOtp: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
    flexWrap: "wrap",
  },
  pillButton: {
    borderRadius: 22,
    minHeight: 46,
  },
});
