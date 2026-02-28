/**
 * VisitorTypeScreen — Create Visitor Entry
 *
 * Key UX rules:
 *  - On first field focus: scroll so ALL inputs + Next button are
 *    visible just above the keyboard — no over-scroll, no gap
 *  - Next button sticks right below Vehicle field with normal padding
 *  - Footer hidden when keyboard is open
 *  - Compact mode for small phones (< 700px height)
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

  const handleFocus = useCallback(() => {
    setFocused(true);
    setQuery("");
    openDrop();
    onFocused?.();
  }, [openDrop, onFocused]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const t = query.trim().toUpperCase();
    if (t && !vehicles.some((v) => v.regNumber === t)) onCustomChange(t);
    onBlurField?.();
    onBlur?.();
    closeDrop();
  }, [query, vehicles, onCustomChange, onBlur, onBlurField, closeDrop]);

  const handleChange = useCallback(
    (text: string) => {
      const u = text.toUpperCase();
      setQuery(u);
      onCustomChange(u);
      if (!open) openDrop();
    },
    [open, openDrop, onCustomChange],
  );

  const filtered = query.trim()
    ? vehicles.filter((v) => v.regNumber.includes(query.trim().toUpperCase()))
    : vehicles;
  const isCustom =
    query.trim().length > 0 &&
    !vehicles.some((v) => v.regNumber === query.trim().toUpperCase());
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
            onChangeText={handleChange}
            onFocus={() => {
              setFocused(true);
              onFocused?.();
            }}
            onBlur={() => {
              setFocused(false);
              onBlurField?.();
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
        <View style={[s.vehicleInputRow, { height: INPUT_H }]}>
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
  const [kbHeight, setKbHeight] = useState(0);
  const [form, setForm] = useState<EntryFormData>(EMPTY);
  const [driver, setDriver] = useState<DriverDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedFieldKey>(null);

  const scrollRef = useRef<ScrollView>(null);
  const kbHeightRef = useRef(0);
  // We track the absolute Y position of the form block within the ScrollView
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

      // Trigger scroll immediately when keyboard height is known
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

  /**
   * Scroll so the form block (all 3 inputs + Next button) sits snugly
   * just above the keyboard with only a small 8px breathing room.
   * No over-scroll, no large gaps.
   */
  const doScroll = useCallback((kb: number) => {
    const { y, height } = formBlockLayout.current;
    if (!y && !height) return;

    // Available visible area above keyboard
    const visibleH = SCREEN_H - kb;
    // Negative gap = scroll LESS, so content above stays visible
    const GAP_BELOW = -80;

    // Target: bottom of form block lands at (visibleH - GAP_BELOW)
    const targetScrollY = y + height - visibleH + GAP_BELOW;

    scrollRef.current?.scrollTo({
      y: Math.max(0, targetScrollY),
      animated: true,
    });
  }, []);

  const handleFieldFocus = useCallback(
    (_fieldKey: FocusedFieldKey) => {
      // If keyboard already visible, scroll now; otherwise wait for keyboardWillShow
      if (hasScrolled.current) return;
      const kb = kbHeightRef.current;
      if (kb > 0) {
        hasScrolled.current = true;
        doScroll(kb);
      }
      // else: keyboardWillShow listener will call doScroll when height is known
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
    if (visitorType === "staff")
      navigation.navigate("StaffPurpose", { formData });
    else navigation.navigate("CategorySelect", { formData });
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const footerTotalH = APP_FOOTER_HEIGHT + insets.bottom;

  // Bottom padding: enough to scroll form above keyboard; when closed, footer height
  const scrollBottomPad = kbVisible
    ? kbHeight + NEXT_BTN_HEIGHT + 16 // ensures Next is reachable
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
        {/* Hero image — only when keyboard is hidden */}
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

            {/*
             * KEY: We measure this entire block (inputs + Next button together)
             * so we know exactly how tall it is and where it starts.
             * We scroll so its BOTTOM lands just above the keyboard.
             */}
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
                  onClear={() =>
                    setForm((p) => ({ ...p, vehicle_reg_number: "" }))
                  }
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

              {/* Next button sits immediately below the last input — no gap */}
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

      {/* Footer — hidden when keyboard open */}
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
    paddingTop: IS_COMPACT ? 12 : 14, // small gap above Next
    paddingBottom: 0, // NO extra padding below
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

  // ── Vehicle dropdown ─────────────────────────────────────────────────────
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
