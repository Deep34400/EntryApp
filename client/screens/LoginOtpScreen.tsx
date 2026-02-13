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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { sendOtp, verifyOtp } from "@/lib/auth-api";
import { normalizePhoneInput, isPhoneValid as checkPhoneValid, PHONE_MAX_DIGITS } from "@/utils/validation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "LoginOtp">;

type Step = "phone" | "otp";

const OTP_LENGTH = 6;
const MIN_BUTTON_HEIGHT = 50;

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

  const phoneTrimmed = phone.trim().replace(/\D/g, "");
  const isPhoneValid = checkPhoneValid(phone);
  const isOtpValid = otp.trim().length >= 4;

  // When we have a logged-in user (access token), go to main screen
  useEffect(() => {
    if (!auth.isRestored || !auth.isGuestReady) return;
    if (auth.accessToken && auth.user) {
      setUserContext({ name: auth.user.name, phone: auth.user.phone });
      const t = setTimeout(() => navigation.replace("VisitorType"), 0);
      return () => clearTimeout(t);
    }
  }, [auth.isRestored, auth.isGuestReady, auth.accessToken, auth.user, setUserContext, navigation]);

  const hasUser = auth.isRestored && auth.isGuestReady && auth.accessToken && auth.user;

  // Auto-focus OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      const t = setTimeout(() => otpInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handleSendOtp = async () => {
    if (!isPhoneValid || !auth.guestToken) return;
    setError(null);
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendOtp(phoneTrimmed, auth.guestToken);
      setStep("otp");
      setOtp("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isOtpValid || !auth.guestToken) return;
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
      setError(e instanceof Error ? e.message : "Invalid OTP");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const setOtpDigits = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
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
      <View style={[styles.container, styles.centered, { backgroundColor: theme.primary }]}>
        <ThemedText type="body" style={{ color: "#fff", marginBottom: Spacing.lg, textAlign: "center" }}>
          {auth.authError}
        </ThemedText>
        <Button onPress={() => auth.ensureGuestToken()}>Retry</Button>
      </View>
    );
  }

  const inputBorderColor = (focused: boolean) =>
    focused ? theme.primary : theme.border;

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.headerRow}>
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: theme.backgroundRoot,
                borderColor: "rgba(255,255,255,0.35)",
              },
            ]}
          >
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextWrap}>
            <ThemedText type="h4" style={styles.headerTitle}>
              Gate Entry / Exit
            </ThemedText>
            <ThemedText type="small" style={styles.headerSubtitle}>
              Gate Management System
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(60).springify()}
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing["2xl"],
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
            <ThemedText type="body" style={[styles.screenLabel, { color: theme.textSecondary }]}>
              {step === "phone" ? "Sign in with your mobile number" : "Enter the OTP we sent you"}
            </ThemedText>

            {error ? (
              <View style={[styles.errorInline, { backgroundColor: theme.backgroundTertiary }]}>
                <ThemedText type="small" style={{ color: theme.error }}>{error}</ThemedText>
              </View>
            ) : null}

            {step === "phone" ? (
              <>
                <View style={styles.fieldContainer}>
                  <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                    Mobile Number <ThemedText style={{ color: theme.error }}>*</ThemedText>
                  </ThemedText>
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        backgroundColor: "#FFFFFF",
                        borderColor: inputBorderColor(phoneFocused),
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Feather name="phone" size={18} color={theme.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder={`${PHONE_MAX_DIGITS}-digit mobile number`}
                      placeholderTextColor={theme.textSecondary}
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
                </View>
                <View style={styles.buttonWrap}>
                  <Button
                    onPress={handleSendOtp}
                    disabled={!isPhoneValid || loading}
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: isPhoneValid ? theme.primary : theme.backgroundTertiary,
                        opacity: isPhoneValid && !loading ? 1 : 0.7,
                      },
                    ]}
                  >
                    {loading ? "Sending…" : "Send OTP"}
                  </Button>
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldContainer}>
                  <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                    OTP
                  </ThemedText>
                  <Pressable
                    onPress={() => otpInputRef.current?.focus()}
                    style={styles.otpRowWrap}
                  >
                    {/* Hidden input for actual typing */}
                    <TextInput
                      ref={otpInputRef}
                      value={otp}
                      onChangeText={setOtpDigits}
                      keyboardType="number-pad"
                      maxLength={OTP_LENGTH}
                      editable={!loading}
                      style={styles.otpHiddenInput}
                      testID="input-otp"
                    />
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                      const digit = otp[i] ?? "";
                      const isActive = i === otp.length;
                      const isFilled = digit !== "";
                      return (
                        <View
                          key={i}
                          style={[
                            styles.otpBox,
                            {
                              backgroundColor: "#FFFFFF",
                              borderColor: isActive ? theme.primary : theme.border,
                              borderWidth: isActive ? 2 : 1,
                            },
                          ]}
                        >
                          <ThemedText
                            type="body"
                            style={[
                              styles.otpBoxDigit,
                              {
                                color: theme.text,
                                opacity: isFilled ? 1 : 0.4,
                              },
                            ]}
                          >
                            {digit}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </Pressable>
                </View>
                <View style={styles.buttonWrap}>
                  <Button
                    onPress={handleVerifyOtp}
                    disabled={!isOtpValid || loading}
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: isOtpValid ? theme.primary : theme.backgroundTertiary,
                        opacity: isOtpValid && !loading ? 1 : 0.7,
                      },
                    ]}
                  >
                    {loading ? "Verifying…" : "Verify & Continue"}
                  </Button>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logo: {
    width: 26,
    height: 26,
  },
  headerTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 0,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    overflow: "hidden",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing["3xl"],
    alignItems: "stretch",
    flexGrow: 1,
  },
  screenLabel: {
    marginBottom: Spacing.lg,
    fontSize: 15,
  },
  errorInline: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: BorderRadius.md,
    paddingLeft: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    paddingVertical: 0,
  },
  otpRowWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    position: "relative",
    minHeight: 52,
  },
  otpHiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 52,
    left: 0,
    right: 0,
    fontSize: 16,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 52,
  },
  otpBoxDigit: {
    fontSize: 20,
    fontWeight: "600",
  },
  buttonWrap: {
    marginTop: Spacing.xl,
    alignSelf: "stretch",
  },
  primaryButton: {
    borderRadius: BorderRadius.md,
    minHeight: MIN_BUTTON_HEIGHT,
    alignSelf: "stretch",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
