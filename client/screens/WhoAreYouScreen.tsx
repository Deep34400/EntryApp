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
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "WhoAreYou">;

export default function WhoAreYouScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, isRestored, setUser } = useUser();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const isFormValid = name.trim().length > 0 && phone.trim().length > 0;

  useEffect(() => {
    if (!isRestored) return;
    if (user?.name?.trim() && user?.phone?.trim()) {
      navigation.replace("HubSelect");
    }
  }, [isRestored, user, navigation]);

  const hasUser = isRestored && user?.name?.trim() && user?.phone?.trim();

  const handleContinue = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUser({ name: name.trim(), phone: phone.trim() });
    navigation.replace("HubSelect");
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

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Top branding — logo card with shadow, strong typography */}
      <View style={[styles.topSection, { paddingTop: insets.top + Spacing["2xl"] }]}>
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.logoCardWrap}>
          <View
            style={[
              styles.logoCard,
              {
                backgroundColor: theme.backgroundRoot,
                borderColor: "rgba(255,255,255,0.4)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 8,
              },
            ]}
          >
            <View style={[styles.logoImageWrap, { backgroundColor: "rgba(255,255,255,0.95)" }]}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.heroTextWrap}>
          <ThemedText type="h2" style={styles.heroTitle}>
            Gate Entry / Exit
          </ThemedText>
          <ThemedText type="body" style={styles.heroSubtitle}>
            Gate Management System
          </ThemedText>
        </Animated.View>
      </View>

      {/* Bottom card — elevated panel, refined form */}
      <Animated.View
        entering={FadeInDown.delay(120).springify()}
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
            <ThemedText type="h2" style={[styles.welcomeTitle, { color: theme.text }]}>
              Welcome Back
            </ThemedText>
            <ThemedText type="body" style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
              Sign in to continue
            </ThemedText>

            <View style={styles.fieldContainer}>
              <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                Name
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
                <Feather name="user" size={20} color={theme.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  testID="input-name"
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                Mobile Number
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
                <Feather name="phone" size={20} color={theme.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={theme.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  testID="input-phone"
                />
              </View>
            </View>

            <View style={styles.continueButtonWrap}>
              <Button
                onPress={handleContinue}
                disabled={!isFormValid}
                style={[
                  styles.continueButton,
                  {
                    backgroundColor: isFormValid ? theme.primary : theme.backgroundTertiary,
                    borderWidth: 1,
                    borderColor: isFormValid ? theme.primary : theme.border,
                    opacity: isFormValid ? 1 : 0.92,
                    ...(isFormValid && Platform.OS === "ios"
                      ? {
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.35,
                          shadowRadius: 8,
                        }
                      : {}),
                    ...(isFormValid && Platform.OS === "android" ? { elevation: 4 } : { elevation: 2 }),
                  },
                ]}
              >
                Continue
              </Button>
            </View>
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
    paddingBottom: Spacing["3xl"],
    alignItems: "center",
  },
  logoCardWrap: {
    marginBottom: Spacing.xl,
  },
  logoCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    minWidth: 180,
  },
  logoImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  heroTextWrap: {
    alignItems: "center",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    fontSize: 26,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  bottomCard: {
    flex: 1,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["3xl"],
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
  welcomeTitle: {
    fontWeight: "800",
    marginBottom: Spacing.xs,
    fontSize: 28,
    letterSpacing: 0.3,
  },
  welcomeSubtitle: {
    marginBottom: Spacing["2xl"],
    fontSize: 16,
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
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: Spacing.md,
    fontSize: 16,
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
