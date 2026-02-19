/**
 * Home / Create Entry screen: Staff vs Driver Partner toggle + visitor form.
 * On Next → VisitorPurpose (purpose selection + API submit) → TokenDisplay.
 *
 * FIX: Keyboard no longer overlaps inputs.
 * - iOS: KeyboardAvoidingView behavior="padding" with correct keyboardVerticalOffset
 * - Android: uses softwareKeyboardLayoutMode="adjustResize" (set in app.json/AndroidManifest)
 *   + ScrollView scrolls focused field into view automatically
 * - Illustration shrinks when keyboard is open so content fits
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  useWindowDimensions,
  Keyboard,
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

const TITLE_COLOR = "#161B1D";
const TOGGLE_BG = "#EBEDF1";
const TOGGLE_INACTIVE_COLOR = "#3F4C52";
const TOGGLE_ACTIVE_COLOR = "#B31D38";
const LABEL_COLOR = "#161B1D";
const INPUT_BORDER = "#D4D8DA";
const INPUT_FOCUSED_BORDER = "#B31D38";
const INPUT_TEXT = "#161B1D";
const PREFIX_MUTED = "#77878E";
const BUTTON_BG = "#B31D38";

type TabId = "staff" | "driver_partner";
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;

const TOGGLE_HEIGHT = 50;
const TOGGLE_RADIUS = 26;
const PILL_RADIUS = 20;
const INPUT_HEIGHT = 50;
const INPUT_RADIUS = 12;
const BUTTON_RADIUS = 25;
const FIELD_GAP = 20;
const HORIZONTAL_PADDING = 20;



function SegmentedToggle({
  value,
  onChange,
}: {
  value: TabId;
  onChange: (tab: TabId) => void;
}) {
  const tabIndex = value === "staff" ? 0 : 1;
  const translateX = useSharedValue(0);
  const [segmentWidthPx, setSegmentWidthPx] = useState(0);

  React.useEffect(() => {
    if (segmentWidthPx > 0) {
      translateX.value = withSpring(tabIndex * segmentWidthPx, {
        damping: 20,
        stiffness: 150,
        // overshootClamping: false,
      });
    }
  }, [tabIndex, segmentWidthPx]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={styles.toggleContainer}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setSegmentWidthPx((w - 8) / 2);
      }}
    >
      <View style={styles.toggleTrack}>
        <Animated.View
          style={[
            styles.togglePillSlider,
            pillStyle,
            segmentWidthPx > 0 ? { width: segmentWidthPx } : undefined,
          ]}
          pointerEvents="none"
        />
        <View style={styles.toggleTabsRow}>
          {(["staff", "driver_partner"] as TabId[]).map((tab) => (
            <Pressable
              key={tab}
              style={styles.toggleTab}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(tab);
              }}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  value === tab && styles.toggleLabelActive,
                ]}
              >
                {tab === "staff" ? "Staff" : "Driver Partner"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Focused input border helper
// ---------------------------------------------------------------------------
function FormInput({
  label,
  prefix,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = focused ? INPUT_FOCUSED_BORDER : INPUT_BORDER;

  if (prefix) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputBox, { borderColor }]}>
          <Text style={styles.prefix}>{prefix}</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={PREFIX_MUTED}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.inputBoxSingle, { borderColor }]}
        placeholderTextColor={PREFIX_MUTED}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { canCreateEntry } = usePermissions();
  const { height: windowHeight } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TabId>("driver_partner");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [formData, setFormData] = useState<EntryFormData>({
    phone: "",
    name: "",
    vehicle_reg_number: "",
  });

  // Track keyboard visibility to collapse illustration
  React.useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const entryType: EntryType = activeTab === "staff" ? "non_dp" : "dp";

  const isFormValid = useMemo(
    () => isPhoneValid(formData.phone) && formData.name.trim().length > 0,
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

  // Illustration height collapses when keyboard is open
  const illustrationHeight = keyboardVisible ? 0 : 150;
  const illustrationMarginTop = keyboardVisible ? 0 : 16;

  return (
    <View style={styles.container}>
      {/*
       * KEY FIX:
       * iOS  → behavior="padding" pushes the scroll view up by the keyboard height.
       * Android → set android:windowSoftInputMode="adjustResize" in AndroidManifest
       *           (or softwareKeyboardLayoutMode="adjustResize" in app.json expo config)
       *           so the OS resizes the window, then ScrollView handles the rest.
       */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        // Offset = status bar + any header height (0 here since header is hidden)
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 8,
              paddingBottom: APP_FOOTER_HEIGHT + insets.bottom + 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Automatically scroll focused TextInput into view
          keyboardDismissMode="interactive"
        >
          {/* Illustration — hidden when keyboard is open */}
          {!keyboardVisible && (
            <View
              style={[
                styles.illustrationWrap,
                { marginTop: illustrationMarginTop },
              ]}
            >
              <Image
                source={require("../../assets/images/car.png")}
                style={[styles.illustration, { height: illustrationHeight }]}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, keyboardVisible && { marginTop: 12 }]}>
            Create Visitor Entry
          </Text>

          {canCreateEntry ? (
            <>
              {/* Segmented Toggle */}
              <View style={styles.toggleWrap}>
                <SegmentedToggle value={activeTab} onChange={setActiveTab} />
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                <FormInput
                  label="Phone Number"
                  prefix="+91"
                  placeholder=""
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(v) => updateField("phone", v)}
                  maxLength={PHONE_MAX_DIGITS}
                />

                <View style={{ height: FIELD_GAP }} />

                <FormInput
                  label="Name"
                  placeholder="Enter name"
                  value={formData.name}
                  onChangeText={(v) => updateField("name", v)}
                  returnKeyType="next"
                />

                <View style={{ height: FIELD_GAP }} />

                <FormInput
                  label="Vehicle Number (optional)"
                  placeholder="e.g. HR55AB3849"
                  value={formData.vehicle_reg_number ?? ""}
                  onChangeText={(v) => updateField("vehicle_reg_number", v)}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />

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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  illustration: {
    width: "90%",
    height: 150,
  },
  title: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: TITLE_COLOR,
    textAlign: "center",
    marginBottom: 20,
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
    padding: 2
  },
  toggleTabsRow: {
    flexDirection: "row",
    flex: 1,
    position: "absolute",
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
  formSection: {},
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
    fontSize: 13,
    fontWeight: "500",
    color: LABEL_COLOR,
  },
  // Phone input row
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: INPUT_HEIGHT,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
  },
  prefix: {
    fontFamily: FONT_POPPINS,
    fontSize: 15,
    color: PREFIX_MUTED,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: FONT_POPPINS,
    fontSize: 15,
    color: INPUT_TEXT,
    paddingVertical: 0,
  },
  // Single-line inputs (name, vehicle)
  inputBoxSingle: {
    height: INPUT_HEIGHT,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 16,
    fontFamily: FONT_POPPINS,
    fontSize: 15,
    color: INPUT_TEXT,
    backgroundColor: "#FAFAFA",
  },
  // Next button
  nextButton: {
    height: 52,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: BUTTON_BG,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#B31D38",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonDisabled: {
    backgroundColor: "#D4D8DA",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  nextButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  nextButtonTextDisabled: {
    color: "#77878E",
  },
});
