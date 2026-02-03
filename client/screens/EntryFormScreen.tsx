import React, { useState, useMemo, useLayoutEffect } from "react";
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
import { Feather } from "@expo/vector-icons";
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
  optional?: boolean;
  icon: keyof typeof Feather.glyphMap;
}

// Sourcing: phone, driver name, email. Collection/Maintenance: full fields. Each field has an icon.
const formFields: Record<VisitorType, FormField[]> = {
  sourcing: [
    { key: "phone", label: "Phone Number", placeholder: "+91 99999 99999", keyboardType: "phone-pad", icon: "phone" },
    { key: "name", label: "Driver/Visitor Name", placeholder: "Enter full name", keyboardType: "default", icon: "user" },
    { key: "email", label: "Email", placeholder: "visitor@example.com", keyboardType: "default", icon: "mail" },
  ],
  maintenance: [
    { key: "vehicle_reg_number", label: "Vehicle Registration Number", placeholder: "MH 01 AB 1234", keyboardType: "default", icon: "truck" },
    { key: "name", label: "Driver/Visitor Name", placeholder: "Enter full name", keyboardType: "default", icon: "user" },
    { key: "phone", label: "Phone Number", placeholder: "+91 99999 99999", keyboardType: "phone-pad", icon: "phone" },
    { key: "driver_small_id", label: "Driver Small ID", placeholder: "Enter driver small ID", keyboardType: "default", icon: "hash" },
  ],
  collection: [
    { key: "name", label: "Driver/Visitor Name", placeholder: "Enter full name", keyboardType: "default", icon: "user" },
    { key: "phone", label: "Phone Number", placeholder: "+91 99999 99999", keyboardType: "phone-pad", icon: "phone" },
    { key: "driver_small_id", label: "Driver Small ID", placeholder: "Enter driver small ID", keyboardType: "default", icon: "hash" },
    { key: "vehicle_reg_number", label: "Vehicle Number (Optional)", placeholder: "MH 01 AB 1234", keyboardType: "default", optional: true, icon: "truck" },
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

  const headerTitle =
    visitorType === "maintenance" && maintenanceReason
      ? `Maintenance - ${maintenanceReason}`
      : visitorType.charAt(0).toUpperCase() + visitorType.slice(1);

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
              New Entry
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
                  value={formData[field.key]}
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
            "Generate Gate Pass"
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
