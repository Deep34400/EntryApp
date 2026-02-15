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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { sendOtp, verifyOtp, isTokenVersionMismatch } from "@/lib/auth-api";

const HEADER_BG = "#8B2C2C";
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
  const { theme } = useTheme();
  const auth = useAuth();
  const { setUser: setUserContext } = useUser();

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

  // Missing phone: go back to login
  useEffect(() => {
    if (phone.length < 10) {
      navigation.replace("LoginOtp");
    }
  }, [phone, navigation]);

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

  const handleVerify = async () => {
    if (!isOtpComplete || !auth.guestToken) return;
    setError(null);
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await verifyOtp(phone, otpString, auth.guestToken);
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
        navigation.replace("VisitorType");
      }
    } catch (e) {
      if (isTokenVersionMismatch(e)) {
        auth.logout();
        navigation.replace("LoginOtp");
        return;
      }
      setError(e instanceof Error ? e.message : "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSec > 0 || !auth.guestToken) return;
    setError(null);
    setResendLoading(true);
    try {
      await sendOtp(phone, auth.guestToken);
      setResendSec(RESEND_COOLDOWN_SEC);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  // No valid phone param
  if (phone.length < 10) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: Spacing.xl,
            minHeight: 88 + insets.top,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backWrap}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextWrap}>
            <ThemedText style={styles.headerTitle}>Gate Entry / Exit</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Gate Management System</ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
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

            <ThemedText type="small" style={[styles.sentToLabel, { color: theme.textSecondary }]}>
              Code sent to
            </ThemedText>
            <ThemedText type="body" style={[styles.maskedPhone, { color: theme.text }]}>
              {masked}
            </ThemedText>

            <View style={styles.otpRow}>
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

            <View style={styles.buttonWrap}>
              {loading ? (
                <View style={[styles.verifyButton, styles.verifyButtonLoading, { backgroundColor: theme.primary }]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <ThemedText type="body" style={styles.buttonLoadingText}>
                    Verifying…
                  </ThemedText>
                </View>
              ) : (
                <Button
                  onPress={handleVerify}
                  disabled={!isOtpComplete || !auth.guestToken}
                  style={[
                    styles.verifyButton,
                    {
                      backgroundColor: isOtpComplete && auth.guestToken ? theme.primary : theme.backgroundTertiary,
                      opacity: isOtpComplete && auth.guestToken ? 1 : 0.7,
                    },
                  ]}
                >
                  Verify & Continue
                </Button>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: Layout.horizontalScreenPadding,
    borderBottomLeftRadius: BorderRadius["2xl"],
    borderBottomRightRadius: BorderRadius["2xl"],
    minHeight: 88,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  backWrap: {
    minWidth: Layout.backButtonTouchTarget,
    minHeight: Layout.backButtonTouchTarget,
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 32,
    height: 32,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing["2xl"],
    backgroundColor: "#FFFFFF",
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
    marginBottom: Spacing.sm,
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
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 24,
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
  buttonWrap: {
    alignSelf: "stretch",
  },
  verifyButton: {
    minHeight: 56,
    width: "100%",
    alignSelf: "stretch",
    borderRadius: BorderRadius.md,
  },
  verifyButtonLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  buttonLoadingText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
