import React, { useState, useMemo, useLayoutEffect } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useHub } from "@/contexts/HubContext";
import { RootStackParamList, EntryType, EntryFormData } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "EntryForm">;
type EntryFormRouteProp = RouteProp<RootStackParamList, "EntryForm">;

interface FormField {
  key: keyof EntryFormData;
  label: string;
  placeholder: string;
  keyboardType: "default" | "phone-pad" | "numeric";
  optional?: boolean;
  icon: keyof typeof Feather.glyphMap;
}

// Mobile number, Reg No (if Old DP), Visitor's Name. Order: phone, then reg no if old_dp, then name.
function getFormFields(entryType: EntryType): FormField[] {
  const base: FormField[] = [
    { key: "phone", label: "Mobile Number", placeholder: "+91 99999 99999", keyboardType: "phone-pad", icon: "phone" },
    { key: "name", label: "Visitor's Name", placeholder: "Enter full name", keyboardType: "default", icon: "user" },
  ];
  if (entryType === "old_dp") {
    return [
      { key: "phone", label: "Mobile Number", placeholder: "+91 99999 99999", keyboardType: "phone-pad", icon: "phone" },
      { key: "vehicle_reg_number", label: "Reg No", placeholder: "MH 01 AB 1234", keyboardType: "default", icon: "truck" },
      { key: "name", label: "Visitor's Name", placeholder: "Enter full name", keyboardType: "default", icon: "user" },
    ];
  }
  return base;
}

export default function EntryFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EntryFormRouteProp>();
  const { entryType } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const fields = useMemo(() => getFormFields(entryType), [entryType]);
  const initialFormData = useMemo((): EntryFormData => {
    const data: EntryFormData = { phone: "", name: "" };
    if (entryType === "old_dp") {
      data.vehicle_reg_number = "";
    }
    return data;
  }, [entryType]);

  const [formData, setFormData] = useState<EntryFormData>(initialFormData);

  const isFormValid = useMemo(() => {
    return fields.every((field) => field.optional || (formData[field.key]?.trim().length ?? 0) > 0);
  }, [formData, fields]);

  const handleNext = () => {
    if (isFormValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("VisitorPurpose", { entryType, formData });
    }
  };

  const updateField = (key: keyof EntryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const headerTitle =
    entryType === "new_dp" ? "New DP Entry" : entryType === "old_dp" ? "Old DP Entry" : "Non DP Entry";

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View>
          {/* <ThemedText type="h3" style={{ fontWeight: "700", color: theme.text }}>
            {headerTitle}
          </ThemedText> */}
          {/* <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.primary, marginRight: Spacing.xs }} />
            <ThemedText type="small" style={{ color: theme.textSecondary, letterSpacing: 0.5 }}>
              VISITOR DETAILS
            </ThemedText>
          </View> */}
        </View>
      ),
    });
  }, [navigation, headerTitle, theme.primary, theme.textSecondary, theme.text]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.buttonHeight + Spacing.lg,
          },
        ]}
      >
        {/* Visitor Details card — reference style: rounded, shield icon */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={[
            styles.visitorCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
            },
          ]}
        >
          <View style={styles.visitorCardHeader}>
            <View style={[styles.shieldIconWrap, { backgroundColor: theme.primary }]}>
              <Feather name="shield" size={24} color="#FFFFFF" />
            </View>
            <ThemedText type="h4" style={[styles.visitorCardTitle, { color: theme.text }]}>
              Visitor Details
            </ThemedText>
          </View>
          <ThemedText type="body" style={[styles.visitorCardDesc, { color: theme.textSecondary }]}>
            Please fill in the information below to generate a secure gate pass.
          </ThemedText>

          {fields.map((field, index) => (
            <Animated.View
              key={field.key}
              entering={FadeInDown.delay(80 + index * 80).springify()}
              style={styles.fieldContainer}
            >
              <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                {field.label}
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
                <Feather name={field.icon} size={20} color={theme.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.textSecondary}
                  value={formData[field.key] ?? ""}
                  onChangeText={(value) => updateField(field.key, value)}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.key === "name" ? "words" : "none"}
                  testID={`input-${field.key}`}
                />
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        <ThemedText type="small" style={[styles.footerText, { color: theme.textSecondary }]}>
          Secure check-in powered by Carrum™
        </ThemedText>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.buttonContainer,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.sm) + Spacing.sm,
            paddingTop: Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Button
          onPress={handleNext}
          disabled={!isFormValid}
          style={[
            styles.submitButton,
            { backgroundColor: isFormValid ? theme.primary : theme.backgroundSecondary },
          ]}
        >
          Next
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
  },
  visitorCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing["2xl"],
    marginBottom: Spacing.xl,
  },
  visitorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  shieldIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  visitorCardTitle: {
    fontWeight: "700",
  },
  visitorCardDesc: {
    marginBottom: Spacing["2xl"],
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.2,
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
  footerText: {
    textAlign: "center",
    marginBottom: Spacing.md,
    letterSpacing: 0.3,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  errorText: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  submitButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
});
