import React, { useState, useMemo, useLayoutEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
  Image,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { HomeHeaderButton } from "@/components/HomeHeaderButton";
import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import { fetchDriverDetails } from "@/lib/query-client";
import { RootStackParamList, EntryType, EntryFormData } from "@/navigation/RootStackNavigator";
import { normalizePhoneInput, isPhoneValid, PHONE_MAX_DIGITS } from "@/utils/validation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "EntryForm">;
type EntryFormRouteProp = RouteProp<RootStackParamList, "EntryForm">;

const FONT_POPPINS = "Poppins";

interface FormFieldConfig {
  key: keyof EntryFormData;
  label: string;
  placeholder: string;
  keyboardType: "default" | "phone-pad" | "numeric";
  optional?: boolean;
}

function getFormFields(entryType: EntryType): FormFieldConfig[] {
  const phoneField: FormFieldConfig = {
    key: "phone",
    label: "Mobile Number",
    placeholder: `${PHONE_MAX_DIGITS}-digit number`,
    keyboardType: "phone-pad",
  };
  const nameField: FormFieldConfig = {
    key: "name",
    label: "Name",
    placeholder: "Enter name",
    keyboardType: "default",
  };
  const vehicleOptional: FormFieldConfig = {
    key: "vehicle_reg_number",
    label: "Vehicle Number (optional)",
    placeholder: "Enter vehicle number",
    keyboardType: "default",
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
    return phoneOk && nameOk;
  }, [formData]);

  const handleNext = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const effectiveType: "new_dp" | "old_dp" | "non_dp" =
      entryType === "dp"
        ? (formData.vehicle_reg_number?.trim() ? "old_dp" : "new_dp")
        : entryType;
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Create Visitor Entry",
      headerTitleAlign: "center",
      headerLeft: () => null,
      headerRight: () => <HomeHeaderButton />,
      headerStyle: {
        backgroundColor: "#FFFFFF",
      },
      headerTitleStyle: {
        fontFamily: FONT_POPPINS,
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#161B1D",
      },
      headerShadowVisible: false,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight,
            paddingBottom: APP_FOOTER_HEIGHT + insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.illustrationWrap}>
          <Image
            source={require("../../assets/images/car.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Create Visitor Entry</Text>
          <Text style={styles.formSubtitle}>
            Please enter the phone number of the visitor
          </Text>

          <View style={styles.phoneInputRow}>
            <Text style={styles.phonePrefix}>+91 </Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter phone number"
              placeholderTextColor="#A2ACB1"
              value={formData.phone ?? ""}
              onChangeText={(value) => updateField("phone", value)}
              maxLength={PHONE_MAX_DIGITS}
              onBlur={handlePhoneBlur}
              keyboardType="phone-pad"
              testID="input-phone"
            />
            {(fields.some((f) => f.key === "phone") && fetchingDriver) && (
              <ActivityIndicator size="small" color="#B31D38" style={styles.fetchIndicator} />
            )}
          </View>

          {fields.map((field) => {
            if (field.key === "phone") return null;
            return (
              <View key={field.key} style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{field.label}</Text>
                  {!field.optional && <Text style={styles.labelRequired}> *</Text>}
                  {field.key === "vehicle_reg_number" && fetchingDriver && (
                    <ActivityIndicator size="small" color="#B31D38" style={styles.fetchIndicator} />
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor="#A2ACB1"
                  value={formData[field.key] ?? ""}
                  onChangeText={(value) => updateField(field.key, value)}
                  onBlur={
                    field.key === "vehicle_reg_number" ? handleRegNumberBlur : undefined
                  }
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.key === "name" ? "words" : "none"}
                  testID={`input-${field.key}`}
                />
              </View>
            );
          })}

          <Pressable
            onPress={handleNext}
            disabled={!isFormValid}
            style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>

      <AppFooter activeTab="Entry" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "flex-start",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  illustrationWrap: {
    marginTop: 16,
    alignSelf: "center",
  },
  illustration: {
    width: 218,
    height: 70,
    alignSelf: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 328,
    alignSelf: "center",
    marginTop: 24,
    gap: 24,
  },
  formTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "600",
    color: "#161B1D",
    textAlign: "center",
  },
  formSubtitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "400",
    color: "#161B1D",
    textAlign: "center",
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: "#D4D8DA",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  phonePrefix: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "400",
    color: "#161B1D",
  },
  phoneInput: {
    flex: 1,
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    color: "#161B1D",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  fieldContainer: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  labelRequired: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  fetchIndicator: {
    marginLeft: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D4D8DA",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    color: "#161B1D",
  },
  nextButton: {
    height: 48,
    backgroundColor: "#B31D38",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    width: "100%",
  },
  nextButtonDisabled: {
    backgroundColor: "#D4D8DA",
    opacity: 0.7,
  },
  nextButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
