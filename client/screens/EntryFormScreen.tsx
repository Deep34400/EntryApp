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
          <ThemedText type="h3" style={{ fontWeight: "700" }}>
            {headerTitle}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginRight: Spacing.xs }} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Visitor details
            </ThemedText>
          </View>
        </View>
      ),
    });
  }, [navigation, headerTitle, theme.primary, theme.textSecondary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.buttonHeight + Spacing["4xl"],
          },
        ]}
      >
        {/* Visitor Details card with orange top border */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={[
            styles.visitorCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.primary,
            },
          ]}
        >
          <ThemedText type="h4" style={styles.visitorCardTitle}>
            Visitor Details
          </ThemedText>
          <ThemedText type="body" style={[styles.visitorCardDesc, { color: theme.textSecondary }]}>
            Please fill in the information below to generate a gate pass.
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
                <Feather name={field.icon} size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                    },
                  ]}
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
    paddingHorizontal: Spacing.lg,
  },
  visitorCard: {
    borderRadius: BorderRadius.md,
    borderTopWidth: 4,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  visitorCardTitle: {
    marginBottom: Spacing.sm,
  },
  visitorCardDesc: {
    marginBottom: Spacing["2xl"],
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
  errorText: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  submitButton: {
    borderRadius: BorderRadius.sm,
  },
});
