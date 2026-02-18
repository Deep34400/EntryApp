/**
 * Home / Create Entry screen: Staff vs Driver Partner toggle + visitor form.
 * On Next → VisitorPurpose (purpose selection + API submit) → TokenDisplay.
 */
import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import {
  RootStackParamList,
  EntryType,
  EntryFormData,
} from "@/navigation/RootStackNavigator";
import {
  normalizePhoneInput,
  isPhoneValid,
  PHONE_MAX_DIGITS,
} from "@/utils/validation";
import { usePermissions } from "@/permissions/usePermissions";

const FONT_POPPINS = "Poppins";

// Design tokens from spec
const TITLE_COLOR = "#161B1D";
const TOGGLE_BG = "#EBEDF1";
const TOGGLE_INACTIVE_COLOR = "#3F4C52";
const TOGGLE_ACTIVE_COLOR = "#B31D38";
const LABEL_COLOR = "#161B1D";
const INPUT_BORDER = "#D4D8DA";
const INPUT_TEXT = "#161B1D";
const PREFIX_MUTED = "#77878E";
const BUTTON_BG = "#B31D38";

type TabId = "staff" | "driver_partner";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;

const TOGGLE_HEIGHT = 52;
const TOGGLE_RADIUS = 24;
const PILL_RADIUS = 21;
const INPUT_HEIGHT = 48;
const INPUT_RADIUS = 12;
const BUTTON_RADIUS = 22;
const FIELD_GAP = 24;
const HORIZONTAL_PADDING = 16;

function SegmentedToggle({
  value,
  onChange,
}: {
  value: TabId;
  onChange: (tab: TabId) => void;
}) {
  const tabIndex = value === "staff" ? 0 : 1;
  const translateX = useSharedValue(tabIndex);
  const segmentWidth = useSharedValue(0);
  const [segmentWidthPx, setSegmentWidthPx] = useState(0);

  React.useEffect(() => {
    translateX.value = withSpring(tabIndex, {
      damping: 20,
      stiffness: 200,
    });
  }, [tabIndex]);

  React.useEffect(() => {
    if (segmentWidthPx > 0) segmentWidth.value = segmentWidthPx;
  }, [segmentWidthPx]);

  const pillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value * segmentWidth.value }],
    };
  });

  return (
    <View
      style={styles.toggleContainer}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setSegmentWidthPx((w - 8) / 2);
      }}
    >
      <View style={styles.toggleTrack}>
        {/* Sliding white pill */}
        <Animated.View
          style={[
            styles.togglePillSlider,
            pillStyle,
            segmentWidthPx > 0 ? { width: segmentWidthPx } : undefined,
          ]}
          pointerEvents="none"
        />
        <View style={styles.toggleTabsRow}>
          <Pressable
            style={styles.toggleTab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange("staff");
            }}
          >
            <Text
              style={[
                styles.toggleLabel,
                value === "staff" && styles.toggleLabelActive,
              ]}
            >
              Staff
            </Text>
          </Pressable>
          <Pressable
            style={styles.toggleTab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange("driver_partner");
            }}
          >
            <Text
              style={[
                styles.toggleLabel,
                value === "driver_partner" && styles.toggleLabelActive,
              ]}
            >
              Driver Partner
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { canCreateEntry } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabId>("driver_partner");
  const [formData, setFormData] = useState<EntryFormData>({
    phone: "",
    name: "",
    vehicle_reg_number: "",
  });

  const entryType: EntryType = activeTab === "staff" ? "non_dp" : "dp";

  const isFormValid = useMemo(
    () =>
      isPhoneValid(formData.phone) && formData.name.trim().length > 0,
    [formData]
  );

  const updateField = (key: keyof EntryFormData, value: string) => {
    if (key === "phone") {
      setFormData((p) => ({ ...p, phone: normalizePhoneInput(value) }));
    } else {
      setFormData((p) => ({ ...p, [key]: value }));
    }
  };

  const handleNext = () => {
    if (!isFormValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("VisitorPurpose", {
      entryType,
      formData: {
        ...formData,
        vehicle_reg_number: formData.vehicle_reg_number || undefined,
      },
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: APP_FOOTER_HEIGHT + insets.bottom + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top: Illustration */}
          <View style={[styles.illustrationWrap, { paddingTop: insets.top }]}>
            <Image
              source={require("../../assets/images/car.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Create Visitor Entry</Text>

          {canCreateEntry ? (
            <>
              {/* Segmented Toggle */}
              <View style={styles.toggleWrap}>
                <SegmentedToggle value={activeTab} onChange={setActiveTab} />
              </View>

              {/* Form */}
              <View style={styles.formSection}>
                {/* Phone Number */}
                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.prefix}>+91</Text>
                    <TextInput
                      style={styles.input}
                      placeholder=""
                      placeholderTextColor={PREFIX_MUTED}
                      keyboardType="phone-pad"
                      value={formData.phone}
                      onChangeText={(v) => updateField("phone", v)}
                      maxLength={PHONE_MAX_DIGITS}
                    />
                  </View>
                </View>

                <View style={{ height: FIELD_GAP }} />

                {/* Name */}
                <View style={styles.field}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.inputBoxSingle}
                    placeholder="Enter name"
                    placeholderTextColor={PREFIX_MUTED}
                    value={formData.name}
                    onChangeText={(v) => updateField("name", v)}
                  />
                </View>

                <View style={{ height: FIELD_GAP }} />

                {/* Vehicle Number (optional) */}
                <View style={styles.field}>
                  <Text style={styles.label}>Vehicle Number (optional)</Text>
                  <TextInput
                    style={styles.inputBoxSingle}
                    placeholder="e.g. HR55AB3849"
                    placeholderTextColor={PREFIX_MUTED}
                    value={formData.vehicle_reg_number ?? ""}
                    onChangeText={(v) => updateField("vehicle_reg_number", v)}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={{ height: FIELD_GAP + 8 }} />

                {/* Next CTA */}
                <Pressable
                  onPress={handleNext}
                  disabled={!isFormValid}
                  style={({ pressed }) => [
                    styles.nextButton,
                    !isFormValid && styles.nextButtonDisabled,
                    pressed && isFormValid && styles.nextButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.nextButtonText,
                      !isFormValid && styles.nextButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.formSection}>
              <Text style={styles.hmHint}>
                Use the menu below to view tickets or open your profile.
              </Text>
            </View>
          )}
        </ScrollView>

        <AppFooter activeTab="Entry" />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: 40,
  },
  illustration: {
    width: '95%',
    height: 160,
  },
  title: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: TITLE_COLOR,
    textAlign: "center",
    marginBottom: 16,
  },
  toggleWrap: {
    marginBottom: 24,
  },
  toggleContainer: {
    width: "100%",
  },
  toggleTrack: {
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_RADIUS,
    backgroundColor: TOGGLE_BG,
    justifyContent: "center",
    padding: 4,
  },
  toggleTabsRow: {
    flexDirection: "row",
    flex: 1,

  },
  toggleTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  togglePillSlider: {
    position: "absolute",
    left: 4,
    top: 4,
    width: "48%",
    height: TOGGLE_HEIGHT - 8,
    borderRadius: PILL_RADIUS,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: TOGGLE_INACTIVE_COLOR,
  },
  toggleLabelActive: {
    fontWeight: "600",
    color: TOGGLE_ACTIVE_COLOR,
  },
  formSection: {
    paddingHorizontal: 0,
  },
  hmHint: {
    fontFamily: FONT_POPPINS,
    fontSize: 15,
    color: TOGGLE_INACTIVE_COLOR,
    textAlign: "center",
    paddingVertical: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: LABEL_COLOR,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 16,
  },
  prefix: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    color: PREFIX_MUTED,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    color: INPUT_TEXT,
    paddingVertical: 0,
  },
  inputBoxSingle: {
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 16,
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    color: INPUT_TEXT,
  },
  nextButton: {
    height: 48,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: BUTTON_BG,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: "#D4D8DA",
    opacity: 0.8,
  },
  nextButtonPressed: {
    opacity: 0.9,
  },
  nextButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  nextButtonTextDisabled: {
    color: "#77878E",
  },
});
