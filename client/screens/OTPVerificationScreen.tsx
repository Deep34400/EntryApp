import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { BackArrow } from "@/components/BackArrow";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth, getRoleAndHubFromVerifyData } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { sendOtp, verifyOtp } from "@/lib/auth";

const OTP_SESSION_EXPIRED_MSG = "Your session expired. Please request OTP again.";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;

/** Mask phone for display: +91 9XXXXXX321 */
function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(0, 10);
  if (d.length < 10) return `+91 ${d}`;
  return `+91 ${d[0]}XXXXXX${d.slice(-3)}`;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "OTPVerification">;
type OTPVerificationRouteProp = RouteProp<RootStackParamList, "OTPVerification">;

export default function OTPVerificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPVerificationRouteProp>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const auth = useAuth();
  const { setUser: setUserContext } = useUser();

  // Responsive: smaller OTP boxes and padding on narrow phones
  const isNarrow = screenWidth < 360;
  const otpBoxSize = isNarrow ? 42 : 48;
  const otpGap = isNarrow ? Spacing.xs : Spacing.sm;

  const phone = route.params?.phone ?? "";
  const masked = maskPhone(phone);

  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSec, setResendSec] = useState(RESEND_COOLDOWN_SEC);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const otpString = otpDigits.join("");
  const isOtpComplete = otpString.length === OTP_LENGTH;
  const verifyTriggeredRef = useRef(false);

  // Missing phone: go back to login
  useEffect(() => {
    if (phone.length < 10) {
      navigation.replace("LoginOtp");
    }
  }, [phone, navigation]);

  // Reset auto-verify trigger when OTP is edited (e.g. after error or backspace)
  useEffect(() => {
    if (otpString.length < OTP_LENGTH) verifyTriggeredRef.current = false;
  }, [otpString]);

  // Auto-verify when 6 digits entered (no button click required)
  useEffect(() => {
    const guestToken = auth.guestToken;
    if (!isOtpComplete || !guestToken || loading || verifyTriggeredRef.current) return;
    verifyTriggeredRef.current = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const data = await verifyOtp(phone, otpString, guestToken);
        if (data) {
          await auth.setTokensAfterVerify(data);
          const primaryPhone =
            data.user.userContacts?.find((c) => c.isPrimary)?.phoneNo ||
            data.user.userContacts?.[0]?.phoneNo ||
            data.user.name;
          setUserContext({
            name: data.user.name?.trim() || primaryPhone,
            phone: primaryPhone,
          });
          const { allowedRole, hasHub } = getRoleAndHubFromVerifyData(data);
          if (!allowedRole) {
            navigation.replace("NoRoleBlock");
          } else if (!hasHub) {
            navigation.replace("NoHubBlock");
          } else {
            navigation.replace("VisitorType");
          }
        }
      } catch (_e) {
        // OTP/login error → logout + identity; no retry, no refresh. Hard stop.
        auth.logout();
        navigation.replace("LoginOtp", { message: OTP_SESSION_EXPIRED_MSG });
      } finally {
        setLoading(false);
      }
    })();
  }, [isOtpComplete, otpString, phone, auth.guestToken, loading, auth, setUserContext, navigation]);

  // Resend countdown
  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const focusIndex = useCallback((index: number) => {
    const ref = inputRefs.current[index];
    ref?.focus();
  }, []);

  const handleChangeDigit = useCallback(
    (index: number, value: string) => {
      const digitsOnly = value.replace(/\D/g, "");
      setError(null);

      // Paste: fill multiple boxes (e.g. "123456")
      if (digitsOnly.length > 1) {
        const chars = digitsOnly.slice(0, OTP_LENGTH).split("");
        const next = [...otpDigits];
        chars.forEach((char, i) => {
          const idx = index + i;
          if (idx < OTP_LENGTH) next[idx] = char;
        });
        setOtpDigits(next);
        const lastFilled = Math.min(index + chars.length, OTP_LENGTH) - 1;
        setTimeout(() => focusIndex(lastFilled), 0);
        return;
      }

      const digit = digitsOnly.slice(-1);
      const next = [...otpDigits];
      next[index] = digit;
      setOtpDigits(next);
      if (digit && index < OTP_LENGTH - 1) {
        setTimeout(() => focusIndex(index + 1), 0);
      }
    },
    [otpDigits, focusIndex],
  );

  const handleKeyPress = useCallback(
    (index: number, e: { nativeEvent: { key: string } }) => {
      if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
        focusIndex(index - 1);
      }
    },
    [otpDigits, focusIndex],
  );

  const handleResend = async () => {
    if (resendSec > 0 || !auth.guestToken) return;
    setError(null);
    setResendLoading(true);
    try {
      await sendOtp(phone, auth.guestToken);
      setResendSec(RESEND_COOLDOWN_SEC);
    } catch (_e) {
      auth.logout();
      navigation.replace("LoginOtp", { message: OTP_SESSION_EXPIRED_MSG });
    } finally {
      setResendLoading(false);
    }
  };

  // No valid phone param
  if (phone.length < 10) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.primary,
            paddingTop: insets.top + (isNarrow ? Spacing.md : Spacing.lg),
            paddingBottom: isNarrow ? Spacing.lg : Spacing.xl,
            paddingHorizontal: isNarrow ? Spacing.md : Layout.horizontalScreenPadding,
            minHeight: (isNarrow ? 76 : 88) + insets.top,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.backWrap}>
            <BackArrow
              color={theme.onPrimary}
              onPress={() => navigation.goBack()}
              inline
            />
          </View>
          <View style={[styles.logoWrap, { backgroundColor: theme.backgroundTertiary }]}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextWrap}>
            <ThemedText style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
              Gate Entry / Exit
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: theme.onPrimary }]} numberOfLines={1}>
              Gate Management System
            </ThemedText>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.content,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing["2xl"],
            paddingHorizontal: isNarrow ? Spacing.md : Layout.horizontalScreenPadding,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText type="body" style={[styles.introText, { color: theme.textSecondary }]}>
              Enter the OTP we sent you
            </ThemedText>
            <ThemedText type="small" style={[styles.autoVerifyHint, { color: theme.textSecondary }]}>
              Enter 6 digits — we&apos;ll verify automatically
            </ThemedText>

            <ThemedText type="small" style={[styles.sentToLabel, { color: theme.textSecondary }]}>
              Code sent to
            </ThemedText>
            <ThemedText type="body" style={[styles.maskedPhone, { color: theme.text }]}>
              {masked}
            </ThemedText>

            <View style={[styles.otpRow, { gap: otpGap }]}>
              {Array.from({ length: OTP_LENGTH }, (_, i) => {
                const isFocused = focusedIndex === i;
                const hasError = !!error;
                return (
                  <TextInput
                    key={i}
                    ref={(r) => {
                      inputRefs.current[i] = r;
                    }}
                    style={[
                      styles.otpBox,
                      {
                        width: otpBoxSize,
                        height: otpBoxSize + 8,
                        fontSize: isNarrow ? 20 : 24,
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: hasError
                          ? theme.error
                          : isFocused
                            ? theme.primary
                            : theme.border,
                        borderWidth: isFocused && !hasError ? 2 : 1,
                        color: theme.text,
                      },
                    ]}
                    value={otpDigits[i]}
                    onChangeText={(v) => handleChangeDigit(i, v)}
                    onKeyPress={(e) => handleKeyPress(i, e)}
                    onFocus={() => setFocusedIndex(i)}
                    onBlur={() => setFocusedIndex(null)}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    selectTextOnFocus
                    autoFocus={i === 0}
                  />
                );
              })}
            </View>

            <View style={styles.errorSlot}>
              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: theme.backgroundTertiary }]}>
                  <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={styles.resendWrap}>
              {resendSec > 0 ? (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Resend OTP in {resendSec}s
                </ThemedText>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resendLoading || !auth.guestToken}
                  activeOpacity={0.7}
                >
                  <ThemedText type="small" style={{ color: theme.link }}>
                    {resendLoading ? "Sending…" : "Resend OTP"}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={[styles.verifyingRow, { backgroundColor: theme.backgroundSecondary }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="body" style={[styles.verifyingText, { color: theme.text }]}>
                  Verifying…
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    borderBottomLeftRadius: BorderRadius["2xl"],
    borderBottomRightRadius: BorderRadius["2xl"],
    minHeight: 88,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: Layout.backButtonTouchTarget,
  },
  backWrap: {
    width: Layout.backButtonTouchTarget,
    minWidth: Layout.backButtonTouchTarget,
    minHeight: Layout.backButtonTouchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 28,
    height: 28,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    flexGrow: 1,
  },
  introText: {
    marginBottom: Spacing.xs,
  },
  autoVerifyHint: {
    marginBottom: Spacing.sm,
    opacity: 0.9,
  },
  sentToLabel: {
    marginBottom: 2,
  },
  maskedPhone: {
    marginBottom: Spacing.xl,
    fontWeight: "600",
    fontSize: 17,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  otpBox: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontWeight: "600",
    textAlign: "center",
    padding: 0,
  },
  errorSlot: {
    minHeight: 32,
    marginBottom: Spacing.sm,
    justifyContent: "center",
  },
  errorBanner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    fontWeight: "500",
  },
  resendWrap: {
    marginBottom: Spacing.xl,
  },
  verifyingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  verifyingText: {
    fontWeight: "600",
  },
});
