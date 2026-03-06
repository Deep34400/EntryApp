import React, { useState, useMemo, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Image,
  Pressable,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AppFooter, useFooterTotalHeight } from "@/components/AppFooter";
import { useTheme } from "@/hooks/useTheme";
import {
  RootStackParamList,
  EntryFormData,
} from "@/navigation/RootStackNavigator";
import {
  normalizePhoneInput,
  isPhoneValid,
  PHONE_MAX_DIGITS,
} from "@/utils/validation";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EntryForm"
>;
type EntryFormRouteProp = RouteProp<RootStackParamList, "EntryForm">;

const FONT = "Poppins";

export default function EntryFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EntryFormRouteProp>();
  const footerTotalHeight = useFooterTotalHeight();
  const entryType = route.params?.entryType;
  const { theme, isDark } = useTheme();

  const [formData, setFormData] = useState<EntryFormData>({
    phone: "",
    name: "",
    vehicle_reg_number: "",
  });

  const isFormValid = useMemo(() => {
    return (
      isPhoneValid(formData.phone) &&
      formData.name.trim().length > 0
    );
  }, [formData]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleNext = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.push("CategorySelect", {
      formData: {
        ...formData,
        vehicle_reg_number: formData.vehicle_reg_number || undefined,
      },
      ...(entryType ? { entryType } : {}),
    });
  };

  const updateField = (key: keyof EntryFormData, value: string) => {
    if (key === "phone") {
      setFormData((p) => ({
        ...p,
        phone: normalizePhoneInput(value),
      }));
    } else {
      setFormData((p) => ({ ...p, [key]: value }));
    }
  };

  const isPhoneFilled = formData.phone.length >= 10;

  const containerBg = isDark ? theme.backgroundRoot : undefined;
  const illustrationBg = isDark ? theme.backgroundDefault : undefined;
  const titleColor = isDark ? theme.text : undefined;
  const subtitleColor = isDark ? theme.textSecondary : undefined;
  const phoneRowBg = isDark ? theme.backgroundSecondary : undefined;
  const phoneRowBorder = isDark ? theme.border : undefined;
  const phoneRowValidBorder = isDark ? "rgba(179, 29, 56, 0.3)" : undefined;
  const prefixColor = isDark ? theme.text : undefined;
  const prefixDividerBg = isDark ? theme.border : undefined;
  const phoneInputColor = isDark ? theme.text : undefined;
  const placeholderColor = isDark ? theme.textSecondary : "#A2ACB1";
  const labelColor = isDark ? theme.text : undefined;
  const inputWrapperBg = isDark ? theme.backgroundSecondary : undefined;
  const inputWrapperBorder = isDark ? theme.border : undefined;
  const inputColor = isDark ? theme.text : undefined;
  const optionalLabelColor = isDark ? theme.textSecondary : undefined;
  const nextBtnBg = isDark ? (isFormValid ? theme.primary : theme.backgroundTertiary) : undefined;
  const nextTextColor = isDark ? (isFormValid ? theme.onPrimary : theme.textSecondary) : undefined;
  const disabledBtnBg = isDark ? theme.backgroundTertiary : undefined;

  return (
    <View style={[styles.container, isDark && containerBg && { backgroundColor: containerBg }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: footerTotalHeight,
          },
        ]}
      >
        {/* Header illustration area — Figma: pt-10 pb-2, h-[140px] */}
        <View style={[styles.illustrationWrapper, isDark && illustrationBg && { backgroundColor: illustrationBg }]}>
          <Image
            source={require("../../assets/images/car.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Main content — px-6 py-4, gap-8 */}
        <View style={styles.mainContent}>
          {/* Title section — gap-2, center */}
          <View style={styles.titleSection}>
            <Text style={[styles.title, isDark && titleColor && { color: titleColor }]}>Create Visitor Entry</Text>
            <Text style={[styles.subtitle, isDark && subtitleColor && { color: subtitleColor }]}>
              Please enter the phone number of the visitor
            </Text>
          </View>

          {/* Form — gap-6 */}
          <View style={styles.formContainer}>
            {/* Phone input — h-56, rounded-16, bg #FDFDFD */}
            <View style={styles.field}>
              <View
                style={[
                  styles.phoneRow,
                  isDark && phoneRowBg && { backgroundColor: phoneRowBg, borderColor: isPhoneFilled ? phoneRowValidBorder : phoneRowBorder },
                  !isDark && isPhoneFilled && styles.phoneRowValid,
                ]}
              >
                <Text style={[styles.prefix, isDark && prefixColor && { color: prefixColor }]}>+91</Text>
                <View style={[styles.prefixDivider, isDark && prefixDividerBg && { backgroundColor: prefixDividerBg }]} />
                <TextInput
                  style={[styles.phoneInput, isDark && phoneInputColor && { color: phoneInputColor }]}
                  placeholder="Phone number"
                  placeholderTextColor={placeholderColor}
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(v) => updateField("phone", v)}
                  maxLength={PHONE_MAX_DIGITS}
                />
              </View>
            </View>

            {/* Name — label + input */}
            <View style={styles.field}>
              <Text style={[styles.label, isDark && labelColor && { color: labelColor }]}>
                Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, isDark && inputWrapperBg && { backgroundColor: inputWrapperBg, borderColor: inputWrapperBorder }]}>
                <TextInput
                  style={[styles.input, isDark && inputColor && { color: inputColor }]}
                  placeholder="Enter full name"
                  placeholderTextColor={placeholderColor}
                  value={formData.name}
                  onChangeText={(v) => updateField("name", v)}
                />
              </View>
            </View>

            {/* Vehicle — optional label */}
            <View style={styles.field}>
              <Text style={[styles.label, isDark && labelColor && { color: labelColor }]}>
                Vehicle Number{" "}
                <Text style={[styles.optionalLabel, isDark && optionalLabelColor && { color: optionalLabelColor }]}>(optional)</Text>
              </Text>
              <View style={[styles.inputWrapper, isDark && inputWrapperBg && { backgroundColor: inputWrapperBg, borderColor: inputWrapperBorder }]}>
                <TextInput
                  style={[styles.input, styles.vehicleInput, isDark && inputColor && { color: inputColor }]}
                  placeholder="e.g. HR55AB3849"
                  placeholderTextColor={placeholderColor}
                  value={formData.vehicle_reg_number}
                  onChangeText={(v) =>
                    updateField("vehicle_reg_number", v)
                  }
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Next button — h-56, rounded-28, mt-4 */}
            <Pressable
              onPress={handleNext}
              disabled={!isFormValid}
              style={({ pressed }) => [
                styles.nextBtn,
                !isFormValid && !isDark && styles.disabledBtn,
                isDark && { backgroundColor: nextBtnBg },
                isFormValid && styles.nextBtnActive,
                pressed && isFormValid && styles.nextBtnPressed,
              ]}
            >
              <Text style={[styles.nextText, isDark && { color: nextTextColor }]}>Next</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>

      <AppFooter activeTab="Entry" />
    </View>
  );
}

/* ================= STYLES (Figma-aligned) ================= */

const INPUT_HEIGHT = 56;
const INPUT_RADIUS = 16;
const BUTTON_RADIUS = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    flexGrow: 1,
  },

  illustrationWrapper: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },

  illustration: {
    width: 218,
    height: 90,
    alignSelf: "center",
  },

  mainContent: {
    paddingVertical: 16,
    paddingHorizontal: 0,
    gap: 32,
    flex: 1,
  },

  titleSection: {
    alignItems: "center",
    gap: 8,
  },

  title: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: "700",
    color: "#161B1D",
    textAlign: "center",
  },

  subtitle: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#77878E",
    textAlign: "center",
    maxWidth: 240,
  },

  formContainer: {
    gap: 24,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },

  field: {
    gap: 8,
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: "#D4D8DA",
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 16,
    backgroundColor: "#FDFDFD",
  },

  phoneRowValid: {
    borderColor: "rgba(179, 29, 56, 0.3)",
  },

  prefix: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "700",
    color: "#161B1D",
    width: 42,
  },

  prefixDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#F3F4F6",
    marginRight: 12,
  },

  phoneInput: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "500",
    color: "#161B1D",
    paddingVertical: 0,
  },

  label: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "600",
    color: "#161B1D",
    marginLeft: 4,
  },

  requiredAsterisk: {
    color: "#E06A6A",
  },

  optionalLabel: {
    fontWeight: "400",
    color: "#77878E",
  },

  inputWrapper: {
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: "#D4D8DA",
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 16,
    backgroundColor: "#FDFDFD",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "500",
    color: "#161B1D",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  vehicleInput: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  nextBtn: {
    height: INPUT_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: "#B31D38",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  nextBtnActive: {
    shadowColor: "#B31D38",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  nextBtnPressed: {
    opacity: 0.95,
  },

  disabledBtn: {
    backgroundColor: "#D4D8DA",
    shadowOpacity: 0,
    elevation: 0,
  },

  nextText: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
