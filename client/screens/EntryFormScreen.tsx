import React, { useState, useMemo, useLayoutEffect, useCallback } from "react";
import { View, StyleSheet, TextInput, ActivityIndicator } from "react-native";
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
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { fetchDriverDetails } from "@/lib/query-client";
import { RootStackParamList, EntryType, EntryFormData } from "@/navigation/RootStackNavigator";
import { normalizePhoneInput, isPhoneValid, PHONE_MAX_DIGITS } from "@/utils/validation";

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

// Phone (10 digits, mandatory), Driver name (mandatory), Vehicle/Reg No (optional).
function getFormFields(entryType: EntryType): FormField[] {
  const phoneField: FormField = {
    key: "phone",
    label: "Mobile Number",
    placeholder: `${PHONE_MAX_DIGITS}-digit number`,
    keyboardType: "phone-pad",
    icon: "phone",
  };
  const nameField: FormField = {
    key: "name",
    label: "Driver Name",
    placeholder: "Enter full name",
    keyboardType: "default",
    icon: "user",
  };
  const vehicleOptional: FormField = {
    key: "vehicle_reg_number",
    label: "Vehicle No (optional)",
    placeholder: "e.g. MH 01 AB 1234",
    keyboardType: "default",
    icon: "truck",
    optional: true,
  };
  if (entryType === "old_dp") {
    return [phoneField, vehicleOptional, nameField];
  }
  if (entryType === "dp") {
    return [phoneField, nameField, vehicleOptional];
  }
  return [phoneField, nameField];
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
    if (entryType === "old_dp" || entryType === "dp") {
      data.vehicle_reg_number = "";
    }
    return data;
  }, [entryType]);

  const [formData, setFormData] = useState<EntryFormData>(initialFormData);
  const [fetchingDriver, setFetchingDriver] = useState(false);

  const isFormValid = useMemo(() => {
    const phoneOk = isPhoneValid(formData.phone ?? "");
    const nameOk = (formData.name ?? "").trim().length > 0;
    const vehicleOk = true;
    return phoneOk && nameOk && vehicleOk;
  }, [formData]);

  const handleNext = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // For unified "dp" form: if vehicle number provided → old_dp flow, else new_dp flow
    const effectiveType: "new_dp" | "old_dp" | "non_dp" =
      entryType === "dp"
        ? (formData.vehicle_reg_number?.trim() ? "old_dp" : "new_dp")
        : entryType;
    // Use push so after "Back" and form edit, Next always opens a fresh screen with current formData
    navigation.push("VisitorPurpose", { entryType: effectiveType, formData: { ...formData } });
  };

  const updateField = (key: keyof EntryFormData, value: string) => {
    if (key === "phone") {
      setFormData((prev) => ({ ...prev, phone: normalizePhoneInput(value) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const fetchDriverByRegNumber = useCallback(async () => {
    const reg = formData.vehicle_reg_number?.trim() ?? "";
    if (reg.length < 2) return;
    setFetchingDriver(true);
    try {
      const details = await fetchDriverDetails({ reg_number: reg });
      if (details?.driver_name && details?.phone) {
        setFormData((prev) => ({
          ...prev,
          name: details.driver_name,
          phone: details.phone,
          ...(details.reg_number != null ? { vehicle_reg_number: details.reg_number } : {}),
        }));
      }
    } finally {
      setFetchingDriver(false);
    }
  }, [formData.vehicle_reg_number]);

  const fetchDriverByPhone = useCallback(async () => {
    const ph = formData.phone?.trim() ?? "";
    if (ph.length < 5) return;
    setFetchingDriver(true);
    try {
      const details = await fetchDriverDetails({ phone: ph });
      if (details?.driver_name && details?.phone) {
        setFormData((prev) => ({
          ...prev,
          name: details.driver_name,
          phone: details.phone,
          ...(details.reg_number != null ? { vehicle_reg_number: details.reg_number } : {}),
        }));
      }
    } finally {
      setFetchingDriver(false);
    }
  }, [formData.phone]);

  const handleRegNumberBlur = useCallback(() => {
    if (entryType === "dp" || entryType === "old_dp") fetchDriverByRegNumber();
  }, [entryType, fetchDriverByRegNumber]);

  const handlePhoneBlur = useCallback(() => {
    if (entryType === "dp" || entryType === "old_dp") fetchDriverByPhone();
  }, [entryType, fetchDriverByPhone]);

  const headerTitle =
    entryType === "dp"
      ? "DP Entry"
      : entryType === "new_dp"
        ? "New DP Entry"
        : entryType === "old_dp"
          ? "Old DP Entry"
          : "Staff Entry";

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
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.buttonHeight + Spacing.md,
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
              shadowColor: theme.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            },
          ]}
        >
          <View style={styles.visitorCardHeader}>
            <View style={[styles.shieldIconWrap, { backgroundColor: theme.primary }]}>
              <Feather name="shield" size={20} color={theme.onPrimary} />
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
              <View style={styles.labelRow}>
                <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                  {field.label}
                </ThemedText>
                {!field.optional ? (
                  <ThemedText type="small" style={[styles.label, { color: theme.error }]}> *</ThemedText>
                ) : null}
                {(field.key === "vehicle_reg_number" || field.key === "phone") && fetchingDriver && (
                  <ActivityIndicator size="small" color={theme.primary} style={styles.fetchIndicator} />
                )}
              </View>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: theme.backgroundSecondary,
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
                  maxLength={field.key === "phone" ? PHONE_MAX_DIGITS : undefined}
                  onBlur={
                    field.key === "vehicle_reg_number"
                      ? handleRegNumberBlur
                      : field.key === "phone"
                        ? handlePhoneBlur
                        : undefined
                  }
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
    paddingHorizontal: Layout.horizontalScreenPadding,
    flexGrow: 1,
  },
  visitorCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  visitorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  shieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  visitorCardTitle: {
    fontWeight: "600",
  },
  visitorCardDesc: {
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  fetchIndicator: {
    marginLeft: Spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Layout.minTouchTarget,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingLeft: Spacing.md,
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
    paddingHorizontal: Layout.horizontalScreenPadding,
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
