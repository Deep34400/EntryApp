/**
 * VisitorTypeScreen — Create Visitor Entry
 *
 * API calling logic:
 *  1. Phone blur → fetch by phone → auto-fill name + vehicle list
 *     (if exactly 1 vehicle, auto-select it)
 *  2. Reg blur → fetch by reg → auto-fill name + phone
 *  3. Cross (✕) on reg clears field WITHOUT triggering fetch
 *  4. After reg-fetch fills phone, focusing phone does NOT re-fetch
 *     (guard: skip if driver already loaded for that phone)
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
  Platform,
  Keyboard,
  Animated,
  Easing,
  RefreshControl,
  Dimensions,
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

// ─── Design tokens ───────────────────────────────────────────────────────────
const FONT = "Poppins";
const RED = "#B31D38";
const RED_BG = "rgba(179,29,56,0.06)";
const BORDER = "#D4D8DA";
const TEXT = "#161B1D";
const MUTED = "#77878E";
const WHITE = "#FFFFFF";

const INPUT_R = 12;
const H_PAD = 20;
const NEXT_BTN_HEIGHT = 52;

const SCREEN_H = Dimensions.get("window").height;
const IS_COMPACT = SCREEN_H < 700;

const INPUT_H = IS_COMPACT ? 46 : 50;
const GAP = IS_COMPACT ? 12 : 18;
const LABEL_SIZE = IS_COMPACT ? 12 : 13;
const TOGGLE_H = IS_COMPACT ? 46 : 52;
const INPUT_PAD_H = IS_COMPACT ? 12 : 14;
const INPUT_FONT_SIZE = IS_COMPACT ? 14 : 15;

type NavProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;
type Vehicle = { regNumber: string; modelName?: string };
const EMPTY: EntryFormData = { phone: "", name: "", vehicle_reg_number: "" };
const TOGGLE_TRACK = "#EBEDF1";
const TOGGLE_TEXT_MUTED = "#3F4C52";

// ─── SegmentedPill ────────────────────────────────────────────────────────────
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
    <View style={[s.segmentedTrack, { height: TOGGLE_H }]}>
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

type FocusedFieldKey = "phone" | "name" | "vehicle" | null;

// ─── FormInput ────────────────────────────────────────────────────────────────
function FormInput({
  label,
  prefix,
  fieldKey,
  isFocused,
  onFocused,
  onBlurField,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  prefix?: string;
  fieldKey: FocusedFieldKey;
  isFocused: boolean;
  onFocused?: () => void;
  onBlurField?: (key: FocusedFieldKey) => void;
}) {
  const handleFocus = useCallback(() => {
    onFocused?.();
    props.onFocus?.({} as any);
  }, [onFocused, props.onFocus]);

  const handleBlur = useCallback(
    (e: any) => {
      onBlurField?.(fieldKey);
      props.onBlur?.(e);
    },
    [fieldKey, onBlurField, props.onBlur],
  );

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {prefix ? (
        <View
          style={[
            s.inputRow,
            { height: INPUT_H },
            isFocused && s.inputRowFocused,
          ]}
        >
          <Text style={s.prefix}>{prefix}</Text>
          <TextInput
            style={s.input}
            placeholderTextColor={MUTED}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectionColor={RED}
            {...props}
          />
        </View>
      ) : (
        <TextInput
          style={[
            s.inputSingle,
            { height: INPUT_H },
            isFocused && s.inputSingleFocused,
          ]}
          placeholderTextColor={MUTED}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={RED}
          {...props}
        />
      )}
    </View>
  );
}

// ─── VehicleField ─────────────────────────────────────────────────────────────
/**
 * Two modes:
 *
 * A) NO vehicles (vehicles.length === 0):
 *    Plain text input. User types reg number manually.
 *    On blur → triggers fetchByReg in parent.
 *    ✕ clears WITHOUT triggering fetch.
 *
 * B) HAS vehicles (vehicles.length > 0):
 *    Dropdown picker showing the driver's registered vehicles.
 *    User can ONLY pick from the list — no free-type that triggers API.
 *    ✕ clears selection WITHOUT triggering fetch.
 *    "Remove vehicle" in dropdown also clears without fetch.
 */
function VehicleField({
  vehicles,
  selectedReg,
  onSelect,
  onClear,
  onCustomChange,
  onBlur,
  onFocused,
  isFocusedBorder,
  onBlurField,
}: {
  vehicles: Vehicle[];
  selectedReg: string;
  onSelect: (reg: string) => void;
  onClear: () => void;
  onCustomChange: (v: string) => void;
  onBlur?: () => void;
  onFocused?: () => void;
  isFocusedBorder?: boolean;
  onBlurField?: () => void;
}) {
  const [query, setQuery] = useState(selectedReg ?? "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Suppress blur→fetch when ✕ was pressed
  const clearPressedRef = useRef(false);
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
  }, [heightAnim]);

  const closeDrop = useCallback(() => {
    Animated.timing(heightAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => setOpen(false));
  }, [heightAnim]);

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

  // ✕ pressed — clear without triggering fetch
  const handleClear = useCallback(() => {
    clearPressedRef.current = true;
    setQuery("");
    onClear();
    closeDrop();
  }, [onClear, closeDrop]);

  const maxDropH = IS_COMPACT ? 150 : 220;
  const listH = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxDropH],
  });
  const listAlpha = heightAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });
  const isOpen = focused || open;

  // ── MODE A: No vehicles loaded → plain input, fetch on blur ──────────────
  if (vehicles.length === 0) {
    return (
      <View style={s.field}>
        <Text style={s.label}>Vehicle Number (optional)</Text>
        <View
          style={[
            s.inputRow,
            { height: INPUT_H },
            isFocusedBorder && s.inputRowFocused,
          ]}
        >
          <TextInput
            style={s.input}
            placeholder="e.g. HR55AB3849"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={(text) => {
              const u = text.toUpperCase();
              setQuery(u);
              onCustomChange(u);
            }}
            onFocus={() => {
              setFocused(true);
              onFocused?.();
            }}
            onBlur={() => {
              setFocused(false);
              if (clearPressedRef.current) {
                // ✕ was pressed — skip fetch
                clearPressedRef.current = false;
                onBlurField?.();
                return;
              }
              onBlurField?.();
              onBlur?.(); // → triggers fetchByReg in parent
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            selectionColor={RED}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={10}>
              <View style={s.clearCircle}>
                <Text style={s.clearX}>✕</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // ── MODE B: Vehicles loaded → dropdown picker only, no free-type fetch ───
  return (
    <View style={s.vehicleWrapper}>
      <Text style={s.label}>Vehicle Number (optional)</Text>
      <View
        style={[
          s.unifiedBox,
          isOpen && s.unifiedBoxOpen,
          isFocusedBorder && s.unifiedBoxFocused,
        ]}
      >
        <Pressable
          onPress={() => {
            if (isOpen) {
              closeDrop();
              setFocused(false);
            } else {
              setFocused(true);
              openDrop();
              onFocused?.();
            }
          }}
          style={[s.vehicleInputRow, { height: INPUT_H }]}
        >
          <Text
            style={[s.vehicleSearchInput, !selectedReg && { color: MUTED }]}
            numberOfLines={1}
          >
            {selectedReg || "Select vehicle…"}
          </Text>
          {selectedReg ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                handleClear();
                setFocused(false);
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
        </Pressable>

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
              {vehicles.map((v, idx) => {
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
                    {idx < vehicles.length - 1 && (
                      <View style={s.dropRowDivider} />
                    )}
                  </React.Fragment>
                );
              })}
              {selectedReg.length > 0 && (
                <>
                  <View style={s.dropSectionDivider} />
                  <Pressable
                    onPress={() => {
                      handleClear();
                      setFocused(false);
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
  const [kbHeight, setKbHeight] = useState(0);
  const [form, setForm] = useState<EntryFormData>(EMPTY);
  const [driver, setDriver] = useState<DriverDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedFieldKey>(null);

  // Track the last phone/reg for which we successfully fetched a driver.
  // This prevents re-fetching when the user just switches focus.
  const lastFetchedPhone = useRef<string>("");
  const lastFetchedReg = useRef<string>("");

  const scrollRef = useRef<ScrollView>(null);
  const kbHeightRef = useRef(0);
  const formBlockRef = useRef<View>(null);
  const formBlockLayout = useRef({ y: 0, height: 0 });
  const hasScrolled = useRef(false);

  const vehicles = driver?.vehicles ?? ([] as Vehicle[]);

  React.useEffect(() => {
    const showEv =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEv =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEv, (e) => {
      const h = e.endCoordinates.height;
      kbHeightRef.current = h;
      setKbHeight(h);
      setKbVisible(true);
      if (!hasScrolled.current) {
        hasScrolled.current = true;
        doScroll(h);
      }
    });
    const hide = Keyboard.addListener(hideEv, () => {
      setKbHeight(0);
      setKbVisible(false);
      kbHeightRef.current = 0;
      hasScrolled.current = false;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const doScroll = useCallback((kb: number) => {
    const { y, height } = formBlockLayout.current;
    if (!y && !height) return;
    const visibleH = SCREEN_H - kb;
    const GAP_BELOW = -80;
    const targetScrollY = y + height - visibleH + GAP_BELOW;
    scrollRef.current?.scrollTo({
      y: Math.max(0, targetScrollY),
      animated: true,
    });
  }, []);

  const handleFieldFocus = useCallback(
    (_fieldKey: FocusedFieldKey) => {
      if (hasScrolled.current) return;
      const kb = kbHeightRef.current;
      if (kb > 0) {
        hasScrolled.current = true;
        doScroll(kb);
      }
    },
    [doScroll],
  );

  const handleBlurField = useCallback((key: FocusedFieldKey) => {
    setFocusedField((prev) => (prev === key ? null : prev));
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setForm(EMPTY);
    setDriver(null);
    lastFetchedPhone.current = "";
    lastFetchedReg.current = "";
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

  const isValid = useMemo(
    () => isPhoneValid(form.phone) && form.name.trim().length > 0,
    [form],
  );

  const set = (key: keyof EntryFormData, val: string) => {
    if (key === "phone") {
      const normalized = normalizePhoneInput(val);
      setForm((p) => ({ ...p, phone: normalized }));
      // If user is typing a new phone, clear previous driver data
      if (!val.trim()) {
        setDriver(null);
        lastFetchedPhone.current = "";
        lastFetchedReg.current = "";
      }
    } else {
      setForm((p) => ({ ...p, [key]: val }));
    }
  };

  /**
   * Fetch by phone on blur.
   * Guard: skip if already fetched for this exact phone number.
   */
  const fetchByPhone = useCallback(async () => {
    if (visitorType !== "dp" || !accessToken) return;
    const phone = form.phone.trim();
    if (!isPhoneValid(phone)) return;

    // Skip if we already fetched this phone (e.g., after reg-fetch filled it)
    if (lastFetchedPhone.current === phone) return;

    setLoading(true);
    setDriver(null);
    lastFetchedPhone.current = phone;
    lastFetchedReg.current = "";

    try {
      const d = await getDriverDetails({ phoneNo: phone, accessToken });
      if (d) {
        setDriver(d);
        // Auto-fill name
        // Auto-select vehicle if exactly one is assigned
        const autoVehicle =
          d.vehicles?.length === 1 ? d.vehicles[0].regNumber : "";
        setForm((p) => ({
          ...p,
          name: d.name,
          vehicle_reg_number: autoVehicle,
        }));
      }
    } catch {
      lastFetchedPhone.current = "";
    } finally {
      setLoading(false);
    }
  }, [visitorType, accessToken, form.phone]);

  /**
   * Fetch by reg number on VehicleField blur.
   * Guard: skip if:
   *   - reg is empty or too short
   *   - reg already exists in current driver's vehicle list (selected from dropdown)
   *   - already fetched this exact reg
   */
  const fetchByReg = useCallback(async () => {
    if (visitorType !== "dp" || !accessToken) return;
    const reg = (form.vehicle_reg_number ?? "").trim().toUpperCase();

    if (reg.length < 2) return;
    // Skip if this reg is already in the loaded vehicle list (just selected from dropdown)
    if (vehicles.some((v) => v.regNumber === reg)) return;
    // Skip duplicate fetch
    if (lastFetchedReg.current === reg) return;

    setLoading(true);
    setDriver(null);
    lastFetchedReg.current = reg;
    lastFetchedPhone.current = "";

    try {
      const d = await getDriverDetails({ regNumber: reg, accessToken });
      if (d) {
        setDriver(d);
        const normalizedPhone = normalizePhoneInput(d.phone);
        // Mark phone as already "fetched" so phone-blur won't re-trigger
        lastFetchedPhone.current = normalizedPhone;
        setForm((p) => ({
          ...p,
          name: d.name,
          phone: normalizedPhone,
        }));
      }
    } catch {
      lastFetchedReg.current = "";
    } finally {
      setLoading(false);
    }
  }, [visitorType, accessToken, form.vehicle_reg_number, vehicles]);

  const handleNext = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const formData = {
      ...form,
      vehicle_reg_number: form.vehicle_reg_number || undefined,
    };
    if (visitorType === "staff")
      navigation.navigate("StaffPurpose", { formData });
    else navigation.navigate("CategorySelect", { formData });
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const footerTotalH = APP_FOOTER_HEIGHT + insets.bottom;
  const scrollBottomPad = kbVisible
    ? kbHeight + NEXT_BTN_HEIGHT + 16
    : footerTotalH + 16;

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollRef}
        style={s.scrollView}
        contentContainerStyle={[
          s.scroll,
          {
            paddingTop: insets.top + (IS_COMPACT ? 6 : 12),
            paddingBottom: scrollBottomPad,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bounces={!IS_COMPACT}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={RED}
            colors={[RED]}
          />
        }
      >
        {!kbVisible && !IS_COMPACT && (
          <View style={s.illWrap}>
            <Image
              source={require("../../assets/images/car.png")}
              style={s.ill}
              resizeMode="contain"
            />
          </View>
        )}

        <Text style={[s.title, IS_COMPACT && s.titleCompact]}>
          Create Visitor Entry
        </Text>

        {canCreateEntry ? (
          <>
            <View style={s.togglesSection}>
              <SegmentedPill
                leftLabel="Driver Partner"
                rightLabel="Staff"
                value={visitorType === "dp" ? "left" : "right"}
                onSelect={(v) => setVisitorType(v === "left" ? "dp" : "staff")}
              />
            </View>

            <View
              ref={formBlockRef}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                formBlockLayout.current = { y, height };
              }}
            >
              <View style={s.formSection}>
                <FormInput
                  label="Phone Number"
                  prefix="+91"
                  fieldKey="phone"
                  isFocused={focusedField === "phone"}
                  placeholder=""
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(v) => set("phone", v)}
                  onBlur={fetchByPhone}
                  maxLength={PHONE_MAX_DIGITS}
                  onFocused={() => {
                    setFocusedField("phone");
                    handleFieldFocus("phone");
                  }}
                  onBlurField={handleBlurField}
                />
                {loading && visitorType === "dp" && (
                  <Text style={s.loadingTxt}>Looking up driver…</Text>
                )}

                <View style={{ height: GAP }} />

                <FormInput
                  label="Name"
                  fieldKey="name"
                  isFocused={focusedField === "name"}
                  placeholder="Enter name"
                  value={form.name}
                  onChangeText={(v) => set("name", v)}
                  returnKeyType="next"
                  onFocused={() => {
                    setFocusedField("name");
                    handleFieldFocus("name");
                  }}
                  onBlurField={handleBlurField}
                />

                <View style={{ height: GAP }} />

                <VehicleField
                  vehicles={vehicles}
                  selectedReg={form.vehicle_reg_number ?? ""}
                  onSelect={(r) =>
                    setForm((p) => ({ ...p, vehicle_reg_number: r }))
                  }
                  onClear={() => {
                    setForm((p) => ({ ...p, vehicle_reg_number: "" }));
                    // Reset reg fetch guard so user can type a new reg
                    lastFetchedReg.current = "";
                  }}
                  onCustomChange={(v) => set("vehicle_reg_number", v)}
                  onBlur={fetchByReg}
                  onFocused={() => {
                    setFocusedField("vehicle");
                    handleFieldFocus("vehicle");
                  }}
                  onBlurField={() => handleBlurField("vehicle")}
                  isFocusedBorder={focusedField === "vehicle"}
                />
              </View>

              <View style={s.nextBarInline}>
                <Pressable
                  onPress={handleNext}
                  disabled={!isValid}
                  style={({ pressed }) => [
                    s.nextBtn,
                    !isValid && s.nextOff,
                    pressed && isValid && s.nextPressed,
                  ]}
                >
                  <Text style={[s.nextTxt, !isValid && s.nextTxtOff]}>
                    Next
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <Text style={s.hint}>
            Use the menu below to view tickets or open your profile.
          </Text>
        )}
      </ScrollView>

      {!kbVisible && <AppFooter activeTab="Entry" />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: H_PAD },

  illWrap: { alignItems: "center", marginTop: 8, marginBottom: 4 },
  ill: { width: "85%", height: 130 },

  title: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: "600",
    color: TEXT,
    textAlign: "center",
    marginBottom: 20,
  },
  titleCompact: { fontSize: 16, marginBottom: 14 },

  togglesSection: { marginBottom: IS_COMPACT ? 14 : 20 },

  segmentedTrack: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: TOGGLE_TRACK,
    borderRadius: 26,
  },
  segmentedOption: {
    flex: 1,
    height: 36,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentedOptionActive: {
    backgroundColor: WHITE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  segmentedLabel: { fontFamily: FONT, fontSize: 14, lineHeight: 20 },
  segmentedLabelInactive: { color: TOGGLE_TEXT_MUTED, fontWeight: "500" },
  segmentedLabelActive: { color: RED, fontWeight: "700" },

  formSection: {},
  field: { gap: 6 },
  label: {
    fontFamily: FONT,
    fontSize: LABEL_SIZE,
    fontWeight: "500",
    color: TEXT,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: INPUT_R,
    paddingHorizontal: INPUT_PAD_H,
    backgroundColor: "#FAFAFA",
  },
  inputRowFocused: { borderColor: RED },
  prefix: {
    fontFamily: FONT,
    fontSize: INPUT_FONT_SIZE,
    color: MUTED,
    marginRight: IS_COMPACT ? 6 : 8,
  },
  input: {
    flex: 1,
    fontFamily: FONT,
    fontSize: INPUT_FONT_SIZE,
    color: TEXT,
    paddingVertical: 0,
  },
  inputSingle: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: INPUT_R,
    paddingHorizontal: INPUT_PAD_H,
    fontFamily: FONT,
    fontSize: INPUT_FONT_SIZE,
    color: TEXT,
    backgroundColor: "#FAFAFA",
  },
  inputSingleFocused: { borderColor: RED },

  loadingTxt: { fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 3 },
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

  nextBarInline: {
    paddingTop: IS_COMPACT ? 12 : 14,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  nextBtn: {
    height: NEXT_BTN_HEIGHT,
    borderRadius: 26,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  nextOff: { backgroundColor: "#E8EAED", elevation: 0, shadowOpacity: 0 },
  nextPressed: { opacity: 0.88, transform: [{ scale: 0.984 }] },
  nextTxt: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: "600",
    color: WHITE,
    letterSpacing: 0.3,
  },
  nextTxtOff: { color: "#9AA3AA" },

  vehicleWrapper: { gap: 6 },
  unifiedBox: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: INPUT_R,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  unifiedBoxOpen: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  unifiedBoxFocused: { borderColor: RED },
  vehicleInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: INPUT_PAD_H,
  },
  vehicleSearchInput: {
    flex: 1,
    fontFamily: FONT,
    fontSize: INPUT_FONT_SIZE,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropRowSel: {
    backgroundColor: RED_BG,
    borderLeftWidth: 3,
    borderLeftColor: RED,
    paddingLeft: 11,
  },
  dropRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#DDE0E3",
    marginHorizontal: 14,
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
  dropEmpty: { paddingVertical: 16, alignItems: "center" },
  dropEmptyTxt: { fontFamily: FONT, fontSize: 13, color: MUTED },
  dropSectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginTop: 4,
  },
  dropRemoveRow: { paddingVertical: 12, alignItems: "center" },
  dropRemoveTxt: { fontFamily: FONT, fontSize: 12, color: MUTED },
});
