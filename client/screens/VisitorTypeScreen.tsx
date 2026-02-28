/**
 * VisitorTypeScreen — Create Visitor Entry
 * Two pill toggles: (1) Onboarding | Entry, (2) Staff | Driver Partner.
 * Form: phone, name, vehicle. Next: DP → CategorySelect; Staff → StaffPurpose (no second screen).
 */
import React, {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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
  Keyboard,
  Animated,
  Easing,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import {
  RootStackParamList,
  EntryFormData,
} from "@/navigation/RootStackNavigator";
import {
  normalizePhoneInput,
  isPhoneValid,
  PHONE_MAX_DIGITS,
} from "@/utils/validation";
import { usePermissions } from "@/permissions/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { getDriverDetails, type DriverDetails } from "@/apis/driver/driver.api";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const FONT = "Poppins";
const RED = "#B31D38";
const RED_BG = "rgba(179,29,56,0.06)";
const BORDER = "#D4D8DA";
const TEXT = "#161B1D";
const MUTED = "#77878E";
const WHITE = "#FFFFFF";

const INPUT_H = 50;
const INPUT_R = 12;
const H_PAD = 20;
const GAP = 20;
const NEXT_BTN_HEIGHT = 52;
const NEXT_FOOTER_PADDING = 16;

type NavProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;
type Vehicle = { regNumber: string; modelName?: string };

const EMPTY: EntryFormData = { phone: "", name: "", vehicle_reg_number: "" };

const TOGGLE_TRACK = "#EBEDF1";
const TOGGLE_TEXT_MUTED = "#3F4C52";

// ─── SegmentedPill (Onboarding|Entry, Staff|Driver Partner) ───────────────────
function SegmentedPill({
  leftLabel,
  rightLabel,
  value,
  onSelect,
}: {
  leftLabel: string;
  rightLabel: string;
  value: "left" | "right";
  onSelect: (v: "left" | "right") => void;
}) {
  return (
    <View style={s.segmentedTrack}>
      <Pressable
        style={[s.segmentedOption, value === "left" && s.segmentedOptionActive]}
        onPress={() => {
          if (value !== "left") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect("left");
          }
        }}
      >
        <Text
          style={[
            s.segmentedLabel,
            value === "left"
              ? s.segmentedLabelActive
              : s.segmentedLabelInactive,
          ]}
        >
          {leftLabel}
        </Text>
      </Pressable>
      <Pressable
        style={[
          s.segmentedOption,
          value === "right" && s.segmentedOptionActive,
        ]}
        onPress={() => {
          if (value !== "right") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect("right");
          }
        }}
      >
        <Text
          style={[
            s.segmentedLabel,
            value === "right"
              ? s.segmentedLabelActive
              : s.segmentedLabelInactive,
          ]}
        >
          {rightLabel}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── FormInput ────────────────────────────────────────────────────────────────
function FormInput({
  label,
  prefix,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {prefix ? (
        <View style={s.inputRow}>
          <Text style={s.prefix}>{prefix}</Text>
          <TextInput
            style={s.input}
            placeholderTextColor={MUTED}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            selectionColor={RED}
            {...props}
          />
        </View>
      ) : (
        <TextInput
          style={[s.inputSingle, focused && s.inputSingleFocused]}
          placeholderTextColor={MUTED}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={RED}
          {...props}
        />
      )}
    </View>
  );
}

// ─── VehicleField ─────────────────────────────────────────────────────────────
function VehicleField({
  vehicles,
  selectedReg,
  onSelect,
  onClear,
  onCustomChange,
  onBlur,
}: {
  vehicles: Vehicle[];
  selectedReg: string;
  onSelect: (reg: string) => void;
  onClear: () => void;
  onCustomChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const [query, setQuery] = useState(selectedReg ?? "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    setQuery(selectedReg ?? "");
  }, [selectedReg]);

  const openDrop = useCallback(() => {
    setOpen(true);
    Animated.timing(heightAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const closeDrop = useCallback(() => {
    Animated.timing(heightAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => setOpen(false));
  }, []);

  const pick = useCallback(
    (reg: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setQuery(reg);
      onSelect(reg);
      closeDrop();
      inputRef.current?.blur();
    },
    [onSelect, closeDrop],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    setQuery("");
    openDrop();
  }, [openDrop]);
  const handleBlur = useCallback(() => {
    setFocused(false);
    const t = query.trim().toUpperCase();
    if (t && !vehicles.some((v) => v.regNumber === t)) onCustomChange(t);
    onBlur?.();
    closeDrop();
  }, [query, vehicles, onCustomChange, onBlur, closeDrop]);

  const handleChange = useCallback(
    (text: string) => {
      const u = text.toUpperCase();
      setQuery(u);
      onCustomChange(u);
      if (!open) openDrop();
    },
    [open, openDrop, onCustomChange],
  );

  if (vehicles.length === 0) {
    return (
      <View style={s.field}>
        <Text style={s.label}>Vehicle Number (optional)</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="e.g. HR55AB3849"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            autoCapitalize="characters"
            returnKeyType="done"
            selectionColor={RED}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery("");
                onClear();
              }}
              hitSlop={10}
            >
              <View style={s.clearCircle}>
                <Text style={s.clearX}>✕</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const filtered = query.trim()
    ? vehicles.filter((v) => v.regNumber.includes(query.trim().toUpperCase()))
    : vehicles;
  const isCustom =
    query.trim().length > 0 &&
    !vehicles.some((v) => v.regNumber === query.trim().toUpperCase());
  const listH = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 252],
  });
  const listAlpha = heightAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });
  const isOpen = focused || open;

  return (
    <View style={s.vehicleWrapper}>
      <Text style={s.label}>Vehicle Number (optional)</Text>
      <View style={[s.unifiedBox, isOpen && s.unifiedBoxOpen]}>
        <View style={s.vehicleInputRow}>
          <TextInput
            ref={inputRef}
            style={s.vehicleSearchInput}
            placeholder="Search or type reg number..."
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            selectionColor={RED}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => {
                setQuery("");
                onClear();
                inputRef.current?.focus();
              }}
              hitSlop={10}
            >
              <View style={s.clearCircle}>
                <Text style={s.clearX}>✕</Text>
              </View>
            </Pressable>
          ) : (
            <Text style={[s.chevron, isOpen && s.chevronUp]}>▼</Text>
          )}
        </View>
        {open && (
          <Animated.View
            style={[s.dropInner, { maxHeight: listH, opacity: listAlpha }]}
          >
            <View style={s.dropSeparator} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {isCustom && (
                <Pressable
                  onPress={() => pick(query.trim().toUpperCase())}
                  style={({ pressed }) => [
                    s.dropRow,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.dropCustomLabel}>
                      Use "{query.trim().toUpperCase()}"
                    </Text>
                    <Text style={s.dropCustomHint}>Tap to confirm</Text>
                  </View>
                  <Text style={s.dropPlus}>＋</Text>
                </Pressable>
              )}
              {filtered.length === 0 && !isCustom ? (
                <View style={s.dropEmpty}>
                  <Text style={s.dropEmptyTxt}>No registered vehicles</Text>
                </View>
              ) : (
                filtered.map((v, idx) => {
                  const sel = selectedReg === v.regNumber;
                  return (
                    <React.Fragment key={v.regNumber}>
                      <Pressable
                        onPress={() => pick(v.regNumber)}
                        style={({ pressed }) => [
                          s.dropRow,
                          sel && s.dropRowSel,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={[s.dropRowReg, sel && s.dropRowRegSel]}>
                          {v.regNumber}
                        </Text>
                        {v.modelName ? (
                          <Text style={s.dropRowModel}>{v.modelName}</Text>
                        ) : null}
                        {sel && <Text style={s.dropTick}>✓</Text>}
                      </Pressable>
                      {idx < filtered.length - 1 && (
                        <View style={s.dropRowDivider} />
                      )}
                    </React.Fragment>
                  );
                })
              )}
              {selectedReg.length > 0 && (
                <>
                  <View style={s.dropSectionDivider} />
                  <Pressable
                    onPress={() => {
                      onClear();
                      setQuery("");
                      closeDrop();
                      inputRef.current?.blur();
                    }}
                    style={({ pressed }) => [
                      s.dropRemoveRow,
                      pressed && { opacity: 0.55 },
                    ]}
                  >
                    <Text style={s.dropRemoveTxt}>✕ Remove vehicle</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { canCreateEntry } = usePermissions();
  const { accessToken } = useAuth();

  const [visitorType, setVisitorType] = useState<"dp" | "staff">("dp");
  const [kbVisible, setKbVisible] = useState(false);
  const [form, setForm] = useState<EntryFormData>(EMPTY);
  const [driver, setDriver] = useState<DriverDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const vehicles = driver?.vehicles ? driver.vehicles : ([] as Vehicle[]);

  React.useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKbVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKbVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setForm(EMPTY);
    setDriver(null);
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

  const isValid = useMemo(
    () => isPhoneValid(form.phone) && form.name.trim().length > 0,
    [form],
  );

  const set = (key: keyof EntryFormData, val: string) => {
    if (key === "phone") {
      setForm((p) => ({ ...p, phone: normalizePhoneInput(val) }));
      if (!val.trim()) setDriver(null);
    } else {
      setForm((p) => ({ ...p, [key]: val }));
    }
  };

  const fetchByPhone = async () => {
    if (visitorType !== "dp" || !isPhoneValid(form.phone) || !accessToken)
      return;
    setLoading(true);
    setDriver(null);
    try {
      const d = await getDriverDetails({
        phoneNo: form.phone.trim(),
        accessToken,
      });
      if (d) {
        setDriver(d);
        setForm((p) => ({
          ...p,
          name: d.name,
          vehicle_reg_number: p.vehicle_reg_number || "",
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchByReg = async () => {
    if (visitorType !== "dp" || !accessToken) return;
    const reg = (form.vehicle_reg_number ?? "").trim();
    if (reg.length < 2 || vehicles.some((v) => v.regNumber === reg)) return;
    setLoading(true);
    setDriver(null);
    try {
      const d = await getDriverDetails({ regNumber: reg, accessToken });
      if (d) {
        setDriver(d);
        setForm((p) => ({
          ...p,
          name: d.name,
          phone: normalizePhoneInput(d.phone),
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const formData = {
      ...form,
      vehicle_reg_number: form.vehicle_reg_number || undefined,
    };
    if (visitorType === "staff") {
      navigation.navigate("StaffPurpose", { formData });
    } else {
      navigation.navigate("CategorySelect", { formData });
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={s.container}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={s.mainContent}>
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[
              s.scroll,
              {
                paddingTop: insets.top + 8,
                paddingBottom: 24,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={RED}
                colors={[RED]}
              />
            }
          >
            {!kbVisible && (
              <View style={s.illWrap}>
                <Image
                  source={require("../../assets/images/car.png")}
                  style={s.ill}
                  resizeMode="contain"
                />
              </View>
            )}

            <Text style={[s.title, kbVisible && { marginTop: 12 }]}>
              Create Visitor Entry
            </Text>

            {canCreateEntry ? (
              <>
                <View style={s.togglesSection}>
                  <SegmentedPill
                    leftLabel="Driver Partner"
                    rightLabel="Staff"
                    value={visitorType === "dp" ? "left" : "right"}
                    onSelect={(v) =>
                      setVisitorType(v === "left" ? "dp" : "staff")
                    }
                  />
                </View>

                <View style={s.formSection}>
                  <FormInput
                    label="Phone Number"
                    prefix="+91"
                    placeholder=""
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={(v) => set("phone", v)}
                    onBlur={fetchByPhone}
                    maxLength={PHONE_MAX_DIGITS}
                  />
                  {loading && visitorType === "dp" && (
                    <Text style={s.loadingTxt}>Looking up driver…</Text>
                  )}

                  <View style={{ height: GAP }} />

                  <FormInput
                    label="Name"
                    placeholder="Enter name"
                    value={form.name}
                    onChangeText={(v) => set("name", v)}
                    returnKeyType="next"
                  />

                  <View style={{ height: GAP }} />

                  <VehicleField
                    vehicles={vehicles}
                    selectedReg={form.vehicle_reg_number ?? ""}
                    onSelect={(r) =>
                      setForm((p) => ({ ...p, vehicle_reg_number: r }))
                    }
                    onClear={() =>
                      setForm((p) => ({ ...p, vehicle_reg_number: "" }))
                    }
                    onCustomChange={(v) => set("vehicle_reg_number", v)}
                    onBlur={fetchByReg}
                  />
                </View>
              </>
            ) : (
              <Text style={s.hint}>
                Use the menu below to view tickets or open your profile.
              </Text>
            )}
          </ScrollView>

          {canCreateEntry && (
            <View
              style={[
                s.nextFooter,
                {
                  paddingTop: NEXT_FOOTER_PADDING,
                  paddingBottom:
                    NEXT_FOOTER_PADDING + APP_FOOTER_HEIGHT + insets.bottom,
                },
              ]}
            >
              <Pressable
                onPress={handleNext}
                disabled={!isValid}
                style={({ pressed }) => [
                  s.nextBtn,
                  !isValid && s.nextOff,
                  pressed && isValid && s.nextPressed,
                ]}
              >
                <Text style={[s.nextTxt, !isValid && s.nextTxtOff]}>Next</Text>
              </Pressable>
            </View>
          )}
        </View>

        <AppFooter activeTab="Entry" />
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: WHITE },
  mainContent: { flex: 1 },
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: H_PAD },
  illWrap: { alignItems: "center", marginTop: 16, marginBottom: 8 },
  ill: { width: "90%", height: 150 },
  title: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: "600",
    color: TEXT,
    textAlign: "center",
    marginBottom: 20,
  },

  field: { gap: 8 },
  label: { fontFamily: FONT, fontSize: 13, fontWeight: "500", color: TEXT },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: INPUT_H,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: INPUT_R,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
  },
  prefix: { fontFamily: FONT, fontSize: 15, color: MUTED, marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 15,
    color: TEXT,
    paddingVertical: 0,
  },
  inputSingle: {
    height: INPUT_H,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: INPUT_R,
    paddingHorizontal: 16,
    fontFamily: FONT,
    fontSize: 15,
    color: TEXT,
    backgroundColor: "#FAFAFA",
  },
  inputSingleFocused: { borderColor: RED },
  loadingTxt: { fontFamily: FONT, fontSize: 13, color: MUTED, marginTop: 4 },
  hint: {
    fontFamily: FONT,
    fontSize: 15,
    color: MUTED,
    textAlign: "center",
    paddingVertical: 24,
  },

  clearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E0E4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  clearX: { fontSize: 9, color: MUTED, fontWeight: "700" },

  nextFooter: {
    paddingHorizontal: H_PAD,
    paddingTop: NEXT_FOOTER_PADDING,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8EAED",
  },
  nextBtn: {
    height: NEXT_BTN_HEIGHT,
    borderRadius: 25,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    boxShadow: "0px 4px 12px rgba(179,29,56,0.30)",
  },
  nextOff: { backgroundColor: "#E8EAED", elevation: 0, boxShadow: "none" },
  nextPressed: { opacity: 0.87, transform: [{ scale: 0.985 }] },
  nextTxt: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: "600",
    color: WHITE,
    letterSpacing: 0.3,
  },
  nextTxtOff: { color: "#9AA3AA" },

  togglesSection: { marginBottom: 24 },
  segmentedTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 6,
    height: 52,
    backgroundColor: TOGGLE_TRACK,
    borderRadius: 24,
  },
  segmentedOption: {
    flex: 1,
    height: 40,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentedOptionActive: {
    backgroundColor: WHITE, // Active button background is White
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  segmentedLabel: {
    fontFamily: FONT,
    fontSize: 14,
    lineHeight: 22,
  },
  segmentedLabelInactive: {
    color: TOGGLE_TEXT_MUTED, // Inactive text is Greyish
    fontWeight: "500",
  },
  segmentedLabelActive: {
    color: RED, // Active text color is Red
    fontWeight: "600",
  },
  formSection: {},

  vehicleWrapper: { gap: 8 },
  unifiedBox: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: INPUT_R,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  unifiedBoxOpen: { elevation: 8, boxShadow: "0px 4px 16px rgba(0,0,0,0.07)" },
  vehicleInputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: INPUT_H,
    paddingHorizontal: 16,
  },
  vehicleSearchInput: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 15,
    color: TEXT,
    paddingVertical: 0,
  },
  chevron: { fontSize: 11, color: MUTED },
  chevronUp: { transform: [{ rotate: "180deg" }] },

  dropInner: { backgroundColor: "#F2F4F6", overflow: "hidden" },
  dropSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  dropRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  dropRowSel: {
    backgroundColor: RED_BG,
    borderLeftWidth: 3,
    borderLeftColor: RED,
    paddingLeft: 13,
  },
  dropRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#DDE0E3",
    marginHorizontal: 16,
  },
  dropRowReg: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    color: TEXT,
    letterSpacing: 0.3,
    flex: 1,
  },
  dropRowRegSel: { color: RED, fontWeight: "700" },
  dropRowModel: {
    fontFamily: FONT,
    fontSize: 12,
    color: MUTED,
    marginRight: 8,
  },
  dropTick: { fontSize: 13, color: RED, fontWeight: "700" },
  dropCustomLabel: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },
  dropCustomHint: {
    fontFamily: FONT,
    fontSize: 11,
    color: MUTED,
    marginTop: 1,
  },
  dropPlus: { fontSize: 18, color: MUTED, fontWeight: "300" },
  dropEmpty: { paddingVertical: 20, alignItems: "center" },
  dropEmptyTxt: { fontFamily: FONT, fontSize: 13, color: MUTED },
  dropSectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginTop: 4,
  },
  dropRemoveRow: { paddingVertical: 13, alignItems: "center" },
  dropRemoveTxt: { fontFamily: FONT, fontSize: 12, color: MUTED },
});
