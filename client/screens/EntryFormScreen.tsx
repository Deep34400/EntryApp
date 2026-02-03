import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { ENTRY_PASS_PATH, VISITOR_PURPOSE, VISITOR_REASON } from "@/lib/api-endpoints";
import { useHub } from "@/contexts/HubContext";
import { RootStackParamList, VisitorType } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "EntryForm">;
type EntryFormRouteProp = RouteProp<RootStackParamList, "EntryForm">;

interface FormField {
  key: string;
  label: string;
  placeholder: string;
  keyboardType: "default" | "phone-pad" | "numeric";
  /** If true, field is optional (e.g. vehicle for collection). */
  optional?: boolean;
}

// Sourcing: phone, driver name, email only. Collection/Maintenance: full fields.
const formFields: Record<VisitorType, FormField[]> = {
  sourcing: [
    { key: "phone", label: "Phone Number", placeholder: "Enter phone number", keyboardType: "phone-pad" },
    { key: "name", label: "Driver Name", placeholder: "Enter driver name", keyboardType: "default" },
    { key: "email", label: "Email", placeholder: "Enter email", keyboardType: "default" },
  ],
  maintenance: [
    { key: "vehicle_reg_number", label: "Vehicle Registration Number", placeholder: "Enter vehicle number", keyboardType: "default" },
    { key: "name", label: "Name", placeholder: "Enter your name", keyboardType: "default" },
    { key: "phone", label: "Phone Number", placeholder: "Enter phone number", keyboardType: "phone-pad" },
    { key: "driver_small_id", label: "Driver Small ID", placeholder: "Enter driver small ID", keyboardType: "default" },
  ],
  collection: [
    { key: "name", label: "Name", placeholder: "Enter your name", keyboardType: "default" },
    { key: "phone", label: "Phone Number", placeholder: "Enter phone number", keyboardType: "phone-pad" },
    { key: "driver_small_id", label: "Driver Small ID", placeholder: "Enter driver small ID", keyboardType: "default" },
    { key: "vehicle_reg_number", label: "Vehicle Registration (optional)", placeholder: "Enter vehicle number", keyboardType: "default", optional: true },
  ],
};

export default function EntryFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EntryFormRouteProp>();
  const { visitorType, maintenanceReason } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { hub } = useHub();

  const fields = formFields[visitorType];
  const initialFormData = useMemo(() => {
    const data: Record<string, string> = {};
    fields.forEach((field) => {
      data[field.key] = "";
    });
    return data;
  }, [fields]);

  const [formData, setFormData] = useState(initialFormData);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    return fields.every((field) => field.optional || (formData[field.key]?.trim().length ?? 0) > 0);
  }, [formData, fields]);

  // POST — entry pass: purpose, reason, name, phone, driver_small_id, vehicle_reg_number? (your backend)
  const submitMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);
      const purpose = VISITOR_PURPOSE[visitorType] ?? "driver_manager";
      // For maintenance, use selected sub-reason (Accident, PMS, Running Repair, Vehicle Breakdown)
      const reason =
        visitorType === "maintenance" && maintenanceReason
          ? maintenanceReason
          : VISITOR_REASON[visitorType] ?? visitorType;
      const body: Record<string, string> = {
        purpose,
        reason,
        name: formData.name ?? "",
        email: formData.email ?? "",
        phone: formData.phone ?? "",
        driver_small_id: visitorType === "sourcing" ? "" : (formData.driver_small_id ?? ""),
      };
      if (hub?.id) {
        body.hub_id = hub.id;
      }
      if (visitorType === "collection") {
        if ((formData.vehicle_reg_number ?? "").trim()) {
          body.vehicle_reg_number = formData.vehicle_reg_number!.trim();
        }
      }
      if (visitorType === "maintenance") {
        body.vehicle_reg_number = formData.vehicle_reg_number ?? "";
      }
      const response = await apiRequest("POST", ENTRY_PASS_PATH, body);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmitError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const results = data.results ?? data;
      const token = results.token_no ?? results.token ?? results.id ?? "";
      const agentName = results.agent_name ?? results.agentName ?? results.agent ?? "—";
      const gate = results.desk_location ?? results.gate ?? results.gate_name ?? "—";
      navigation.navigate("TokenDisplay", {
        token: String(token),
        agentName: String(agentName),
        gate: String(gate),
      });
    },
    onError: (error: Error) => {
      setSubmitError(error.message || "Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleSubmit = () => {
    if (isFormValid) {
      submitMutation.mutate();
    }
  };

  const updateField = (key: string, value: string) => {
    setSubmitError(null);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.buttonHeight + Spacing["4xl"],
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <ThemedText type="body" style={[styles.instruction, { color: theme.textSecondary }]}>
            Please fill in your details to proceed
          </ThemedText>
        </Animated.View>

        {fields.map((field, index) => (
          <Animated.View
            key={field.key}
            entering={FadeInDown.delay(100 + index * 100).springify()}
            style={styles.fieldContainer}
          >
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              {field.label}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={field.placeholder}
              placeholderTextColor={theme.textSecondary}
              value={formData[field.key]}
              onChangeText={(value) => updateField(field.key, value)}
              keyboardType={field.keyboardType}
              autoCapitalize={field.key === "name" ? "words" : "none"}
              testID={`input-${field.key}`}
            />
          </Animated.View>
        ))}
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
        {submitError != null && (
          <ThemedText
            type="small"
            style={[styles.errorText, { color: theme.error }]}
            numberOfLines={3}
          >
            {submitError}
          </ThemedText>
        )}
        <Button
          onPress={handleSubmit}
          disabled={!isFormValid || submitMutation.isPending}
          style={[
            styles.submitButton,
            { backgroundColor: isFormValid ? theme.primary : theme.backgroundSecondary },
          ]}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            "Submit"
          )}
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
  instruction: {
    marginBottom: Spacing["2xl"],
  },
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
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
