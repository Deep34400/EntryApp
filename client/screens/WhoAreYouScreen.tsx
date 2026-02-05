import React, { useEffect, useState } from "react";
import { View, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "WhoAreYou">;

export default function WhoAreYouScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user, isRestored, setUser } = useUser();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const isFormValid = (name.trim().length > 0 && phone.trim().length > 0);

  // If user already saved, go to hub selection
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
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.buttonHeight + Spacing["4xl"],
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primary }]}>
            <Feather name="user" size={40} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>
            Who are you?
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your name and phone number to continue
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.fieldContainer}>
            <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
              Your name
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
              <Feather name="user" size={20} color={theme.textSecondary} style={styles.inputIcon} />
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
              Phone number
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
              <Feather name="phone" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="+91 99999 99999"
                placeholderTextColor={theme.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                testID="input-phone"
              />
            </View>
          </View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.buttonContainer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Button
          onPress={handleContinue}
          disabled={!isFormValid}
          style={[
            styles.continueButton,
            { backgroundColor: isFormValid ? theme.primary : theme.backgroundSecondary },
          ]}
        >
          Continue
        </Button>
      </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingLeft: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: Spacing.sm,
    fontSize: 16,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  continueButton: {
    borderRadius: BorderRadius.sm,
  },
});
