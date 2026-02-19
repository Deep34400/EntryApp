import React, { useEffect, useState, useRef, useMemo } from "react";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { DesignTokens } from "@/constants/designTokens";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { sendOtp, verifyOtp } from "@/lib/auth";
import { normalizePhoneInput, isPhoneValid as checkPhoneValid, PHONE_MAX_DIGITS } from "@/utils/validation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "LoginOtp">;

type Step = "phone" | "otp";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const SESSION_EXPIRED_MSG = "Your session expired. Please request OTP again.";

/** Responsive OTP box constraints (no overflow on small screens, reasonable on tablets). */
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
      const route =
        !auth.hasValidRole
          ? "NoRoleBlock"
          : !auth.hasHub
            ? "NoHubBlock"
            : "VisitorType";
      const t = setTimeout(() => navigation.replace(route), 0);
      return () => clearTimeout(t);
    }
  }, [auth.isRestored, auth.isGuestReady, auth.accessToken, auth.user, auth.hasValidRole, auth.hasHub, setUserContext, navigation]);

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

  const verifyTriggeredRef = useRef(false);

  useEffect(() => {
    if (otp.trim().length < OTP_LENGTH) verifyTriggeredRef.current = false;
  }, [otp]);

  useEffect(() => {
    const guestToken = auth.guestToken;
    if (step !== "otp" || !isOtpComplete || !guestToken || loading || verifyTriggeredRef.current) return;
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
  }, [step, isOtpComplete, otp, phoneTrimmed, auth.guestToken, loading, auth, setUserContext]);

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

  if (hasUser) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" numberOfLines={1} style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
          Loading…
        </ThemedText>
      </View>
    );
  }

  if (!auth.isGuestReady || !auth.isRestored) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" numberOfLines={1} style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
          Preparing…
        </ThemedText>
      </View>
    );
  }

  // Show polished Session Expired screen whenever we have a session-expired message
  // (from refresh fail = authError, or from OTP fail = route.params.message). Never show
  // the login form with the error in a grey box — always this screen, then clean form after "Sign in again".
  const sessionExpiredMessageFromRoute = route.params?.message ?? null;
  const showSessionExpiredScreen = !!(auth.authError || sessionExpiredMessageFromRoute);

  if (showSessionExpiredScreen) {
    return (
      <SessionExpiredScreen
        message={auth.authError || sessionExpiredMessageFromRoute || undefined}
        isLoading={retryingGuest}
        onSignInAgain={async () => {
          setRetryingGuest(true);
          try {
            await auth.ensureGuestToken();
            // Clear route params so when we show the login form it has no error banner
            navigation.replace("LoginOtp");
          } finally {
            setRetryingGuest(false);
          }
        }}
      />
    );
  }

  const inputBorderColor = phoneFocused ? theme.primary : loginTokens.inputBorder;

  if (step === "otp") {
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: loginTokens.cardBg }]} edges={["top"]}>
          <BackArrow
    onPress={goBackToPhone}
    color={loginTokens.otpText}
    
    // topOffset={0} 
  />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              styles.otpScrollContent,
              {
                paddingTop: Layout.backButtonTouchTarget + Spacing.sm - 8,
                paddingBottom: insets.bottom + Spacing["2xl"],
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeIn.duration(260)} style={styles.otpContent}>
              <ThemedText type="h3" style={styles.otpTitle} numberOfLines={1}>
                Enter OTP
              </ThemedText>
              <ThemedText type="body" style={styles.otpSubtitle} numberOfLines={1}>
                OTP sent to {phoneTrimmed || "..."}
              </ThemedText>
              {(sessionExpiredMessage || error) ? (
                <View style={[styles.errorBanner, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border, marginTop: Spacing.lg, marginBottom: Layout.contentGap }]}>
                  <ThemedText type="small" numberOfLines={3} style={{ color: theme.error }}>{sessionExpiredMessage || error}</ThemedText>
                </View>
              ) : null}
              <Pressable
                onPress={() => otpInputRef.current?.focus()}
                style={[
                  styles.otpRowWrap,
                  {
                    minHeight: otpLayout.boxSize,
                    height: otpLayout.boxSize,
                    marginBottom: Spacing.lg,
                  },
                ]}
              >
                <TextInput
                  ref={otpInputRef}
                  value={otp}
                  onChangeText={setOtpDigits}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  editable={!loading}
                  style={[styles.otpHiddenInput, { height: otpLayout.boxSize }]}
                  testID="input-otp"
                />
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const digit = otp[i] ?? "";
                  const isActive = i === otp.length;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.otpBox,
                        {
                          width: otpLayout.boxSize,
                          height: otpLayout.boxSize,
                          marginRight: i < OTP_LENGTH - 1 ? otpLayout.gapSize : 0,
                          borderColor: isActive
                            ? loginTokens.otpBoxBorderActive
                            : loginTokens.otpBoxBorder,
                          borderWidth: isActive ? 2 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        type="h5"
                        style={[
                          styles.otpBoxDigit,
                          {
                            color: loginTokens.otpText,
                            opacity: digit ? 1 : 0.4,
                            fontSize: otpLayout.digitFontSize,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {digit}
                      </ThemedText>
                    </View>
                  );
                })}
              </Pressable>
              <View style={styles.resendRowOtp}>
                <ThemedText type="body" style={styles.resendLabel} numberOfLines={1}>Didn&apos;t receive the code? </ThemedText>
                {resendCooldown > 0 ? (
                  <ThemedText type="body" style={styles.resendCooldown} numberOfLines={1}>Resend in {resendCooldown}s</ThemedText>
                ) : (
                  <Pressable onPress={handleResendOtp} disabled={loading} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                    <ThemedText type="body" style={[styles.resendLink, { color: loginTokens.resendGreen }]} numberOfLines={1}>Resend</ThemedText>
                  </Pressable>
                )}
              </View>
              {loading ? (
                <View style={[styles.verifyingRow, { backgroundColor: theme.backgroundSecondary }]}>
                  <ActivityIndicator size="small" color={loginTokens.headerRed} />
                  <ThemedText type="body" style={[styles.verifyingText, { color: loginTokens.otpText }]}>
                    Verifying…
                  </ThemedText>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: loginTokens.cardBg }]} edges={["top"]}>
      <View style={styles.phoneStepWrapper}>
        <View
          style={[
            styles.loginHeader,
            {
              minHeight: Layout.loginHeaderMinHeight,
              maxHeight: Layout.loginHeaderMaxHeight,
              paddingTop: insets.top,
              backgroundColor: loginTokens.headerRed,
            },
          ]}
        >
          <Animated.View entering={FadeIn.duration(280)} style={styles.hero}>
            <Image source={require("../../assets/images/latestLogo.png")} style={styles.heroLogoOnRed} resizeMode="contain" />
            <ThemedText type="h4" style={[styles.heroTitle, { color: loginTokens.onHeader }]} numberOfLines={1}>carrum</ThemedText>
            <ThemedText type="small" style={[styles.heroSubtitle, { color: loginTokens.onHeader }]} numberOfLines={1}>MOBILITY SOLUTIONS</ThemedText>
          </Animated.View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={[styles.scrollView, styles.whiteCard]}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Layout.contentGap + 20,
                paddingBottom: insets.bottom + Spacing["2xl"] + 44 + Spacing["2xl"],
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeIn.delay(120).duration(260)} style={styles.contentBlock}>
              <View style={styles.welcomeBlock}>
                <ThemedText style={styles.welcomeTitle} numberOfLines={1}>Welcome</ThemedText>
                <ThemedText style={styles.welcomeSubtitle} numberOfLines={1}>Entry/ Exit Application</ThemedText>
              </View>
              {(sessionExpiredMessage || error) ? (
                <View style={[styles.errorBanner, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                  <ThemedText type="small" numberOfLines={3} style={{ color: theme.error }}>{sessionExpiredMessage || error}</ThemedText>
                </View>
              ) : null}
              <View style={[styles.phoneInputWrap, { borderColor: inputBorderColor }]}>
                <ThemedText style={styles.phonePrefix} numberOfLines={1}>+91</ThemedText>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor={loginTokens.placeholder}
                  selectionColor={loginTokens.headerRed}
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
              <View style={styles.primaryButtonWrap}>
                <Button
                  onPress={handleSendOtp}
                  disabled={!isPhoneValid || loading}
                  style={[styles.sentOtpButton, { backgroundColor: isPhoneValid ? loginTokens.headerRed : theme.backgroundSecondary, opacity: isPhoneValid && !loading ? 1 : 0.8, borderWidth: 0 }]}
                >
                  {loading ? "Sending…" : "Sent OTP"}
                </Button>
              </View>

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
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
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
  phoneStepWrapper: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.horizontalScreenPadding,
    width: "100%",
    maxWidth: Layout.contentMaxWidth + Layout.horizontalScreenPadding * 2,
    alignSelf: "center",
  },
  loginHeader: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  hero: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  heroLogoOnRed: {
    width: "100%",
    maxWidth: 206,
    aspectRatio: 206 / 139.15,
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
  whiteCard: {
    flex: 1,
    marginTop: -Layout.loginWhiteCardOverlap,
    backgroundColor: DesignTokens.login.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  contentBlock: {
    flexDirection: "column",
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
    backgroundColor: DesignTokens.login.cardBg,
    paddingHorizontal: 0,
    gap: Layout.contentGap,
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
    backgroundColor: DesignTokens.login.cardBg,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    minHeight: 56,
    paddingVertical: 13,
    paddingHorizontal: Layout.cardPadding,
    gap: 10,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
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
    minWidth: 0,
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
    maxWidth: Layout.contentMaxWidth,
    minHeight: 46,
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
    padding: Layout.cardPadding,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  termsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  termsText: {
    fontFamily: "Poppins",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 22,
    color: DesignTokens.login.termsText,
    textAlign: "center",
  },
  termsLink: {
    color: DesignTokens.login.termsLink,
    fontWeight: "600",
  },
  otpContent: {
    width: "100%",
  },
  otpTitle: {
    fontFamily: "Poppins",
    color: DesignTokens.login.otpText,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
    marginTop: Spacing["4xl"],
  },
  otpSubtitle: {
    fontFamily: "Poppins",
    color: DesignTokens.login.otpSub,
    fontSize: 16,
    marginBottom: Spacing.xl,
  },
  resendLabel: {
    fontFamily: "Poppins",
    color: DesignTokens.login.otpSub,
  },
  resendCooldown: {
    fontFamily: "Poppins",
    color: DesignTokens.login.otpSub,
  },
  resendLink: {
    fontFamily: "Poppins",
    fontWeight: "600",
  },
  otpScrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  otpRowWrap: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  otpHiddenInput: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    fontSize: 16,
  },
  otpBox: {
    borderRadius: BorderRadius.sm,
    backgroundColor: DesignTokens.login.cardBg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
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
  verifyingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  verifyingText: {
    fontFamily: "Poppins",
    fontWeight: "600",
  },
  pillButton: {
    borderRadius: 22,
    minHeight: 46,
  },
});
