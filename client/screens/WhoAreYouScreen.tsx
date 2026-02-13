import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "WhoAreYou">;

type Step = "phone" | "otp";

export default function WhoAreYouScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const auth = useAuth();
  const { setUser: setUserContext } = useUser();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneTrimmed = phone.trim().replace(/\D/g, "");
  const isPhoneValid = phoneTrimmed.length >= 10;
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

  const handleSendOtp = async () => {
    if (!isPhoneValid || !auth.guestToken) return;
    setError(null);
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendOtp(phoneTrimmed, auth.guestToken);
      setStep("otp");
      setOtp("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
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
    } finally {
      setLoading(false);
    }
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

  // Waiting for guest token
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

  // Guest token error (e.g. network)
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

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={[styles.topSection, { paddingTop: insets.top + Spacing.xl }]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.logoWrapSmall,
              {
                backgroundColor: theme.backgroundRoot,
                borderColor: "rgba(255,255,255,0.4)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 6,
              },
            ]}
          >
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoSmall}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroTextWrap}>
            <ThemedText type="h3" style={styles.heroTitle}>
              Gate Entry / Exit
            </ThemedText>
            <ThemedText type="small" style={styles.heroSubtitle}>
              Gate Management System
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(80).springify()}
        style={[
          styles.bottomCard,
          {
            backgroundColor: theme.backgroundRoot,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 12,
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
            <ThemedText type="body" style={[styles.signInLabel, { color: theme.textSecondary }]}>
              {step === "phone" ? "Sign in with your mobile number" : "Enter the OTP we sent you"}
            </ThemedText>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.backgroundTertiary }]}>
                <ThemedText type="small" style={{ color: theme.error }}>{error}</ThemedText>
              </View>
            ) : null}

            {step === "phone" ? (
              <>
                <View style={styles.fieldContainer}>
                  <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                    Mobile Number
                  </ThemedText>
                  <View
                    style={[
                      styles.inputRow,
                      styles.inputRowPhone,
                      {
                        backgroundColor: theme.backgroundSecondary ?? theme.backgroundRoot,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather name="phone" size={20} color={theme.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputPhone, { color: theme.text }]}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={theme.textSecondary}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      maxLength={14}
                      editable={!loading}
                      testID="input-phone"
                    />
                  </View>
                </View>
                <View style={styles.continueButtonWrap}>
                  <Button
                    onPress={handleSendOtp}
                    disabled={!isPhoneValid || loading}
                    style={[
                      styles.continueButton,
                      {
                        backgroundColor: isPhoneValid ? theme.primary : theme.backgroundTertiary,
                        borderWidth: 1,
                        borderColor: isPhoneValid ? theme.primary : theme.border,
                        opacity: isPhoneValid ? 1 : 0.92,
                        ...(isPhoneValid && Platform.OS === "ios"
                          ? {
                              shadowColor: theme.primary,
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.35,
                              shadowRadius: 8,
                            }
                          : {}),
                        ...(isPhoneValid && Platform.OS === "android" ? { elevation: 4 } : { elevation: 2 }),
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
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: theme.backgroundSecondary ?? theme.backgroundRoot,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather name="lock" size={20} color={theme.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor={theme.textSecondary}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                      testID="input-otp"
                    />
                  </View>
                </View>
                <View style={styles.continueButtonWrap}>
                  <Button
                    onPress={handleVerifyOtp}
                    disabled={!isOtpValid || loading}
                    style={[
                      styles.continueButton,
                      {
                        backgroundColor: isOtpValid ? theme.primary : theme.backgroundTertiary,
                        borderWidth: 1,
                        borderColor: isOtpValid ? theme.primary : theme.border,
                        opacity: isOtpValid ? 1 : 0.92,
                        ...(isOtpValid && Platform.OS === "ios"
                          ? {
                              shadowColor: theme.primary,
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.35,
                              shadowRadius: 8,
                            }
                          : {}),
                        ...(isOtpValid && Platform.OS === "android" ? { elevation: 4 } : { elevation: 2 }),
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
  topSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  logoWrapSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoSmall: {
    width: 32,
    height: 32,
  },
  heroTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.4,
    fontSize: 20,
    marginBottom: 2,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  bottomCard: {
    flex: 1,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["2xl"],
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
  signInLabel: {
    marginBottom: Spacing.xl,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  errorBanner: {
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
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingLeft: Spacing.lg,
  },
  inputRowPhone: {
    minHeight: 52,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  inputPhone: {
    fontSize: 17,
    letterSpacing: 0.5,
  },
  continueButtonWrap: {
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.lg,
    alignSelf: "stretch",
  },
  continueButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    minHeight: 52,
    alignSelf: "stretch",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
