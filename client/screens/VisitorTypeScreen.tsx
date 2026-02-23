/**
 * VisitorTypeScreen — Create Visitor Entry
 */
import React, { useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, StyleSheet, Text, Pressable, ScrollView, TextInput,
  Image, KeyboardAvoidingView, Platform, Keyboard, Animated, Easing, RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ReAnimated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import { RootStackParamList, EntryType, EntryFormData } from "@/navigation/RootStackNavigator";
import { normalizePhoneInput, isPhoneValid, PHONE_MAX_DIGITS } from "@/utils/validation";
import { usePermissions } from "@/permissions/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { getDriverDetails, type DriverDetails } from "@/apis/driver/driver.api";
import { getReferralNames, getReferralDisplayLabel, type ReferralNameItem } from "@/apis/referral/referral.api";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const FONT   = "Poppins";
const RED    = "#B31D38";
const RED_BG = "rgba(179,29,56,0.06)";
const BORDER = "#D4D8DA";
const TEXT   = "#161B1D";
const MUTED  = "#77878E";
const WHITE  = "#FFFFFF";

const INPUT_H = 50;
const INPUT_R = 12;
const H_PAD   = 20;
const GAP     = 20;

type TabId   = "staff" | "driver_partner";
type NavProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;
type Vehicle = { regNumber: string; modelName?: string };

const EMPTY: EntryFormData = { phone: "", name: "", vehicle_reg_number: "" };

// ─── SegmentedToggle ─────────────────────────────────────────────────────────
function SegmentedToggle({ value, onChange }: { value: TabId; onChange: (t: TabId) => void }) {
  const idx = value === "driver_partner" ? 0 : 1;
  const tx  = useSharedValue(0);
  const [segW, setSegW] = useState(0);

  React.useEffect(() => {
    if (segW > 0) tx.value = withSpring(idx * segW, { damping: 20, stiffness: 150 });
  }, [idx, segW]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  return (
    <View onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w > 0) setSegW((w - 8) / 2); }}>
      <View style={s.track}>
        <ReAnimated.View style={[s.pill, pillStyle, segW > 0 && { width: segW }]} pointerEvents="none" />
        <View style={s.tabsRow}>
          {(["driver_partner", "staff"] as TabId[]).map((tab) => (
            <Pressable key={tab} style={s.tab}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(tab); }}>
              <Text style={[s.tabTxt, value === tab && s.tabTxtOn]}>
                {tab === "driver_partner" ? "Driver Partner" : "Staff"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── FormInput ────────────────────────────────────────────────────────────────
function FormInput({ label, prefix, ...props }: React.ComponentProps<typeof TextInput> & { label: string; prefix?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {prefix ? (
        <View style={[s.inputRow, focused && s.inputRowFocused]}>
          <Text style={s.prefix}>{prefix}</Text>
          <TextInput style={s.input} placeholderTextColor={MUTED}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            selectionColor={RED} {...props} />
        </View>
      ) : (
        <TextInput style={[s.inputSingle, focused && s.inputSingleFocused]}
          placeholderTextColor={MUTED} onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)} selectionColor={RED} {...props} />
      )}
    </View>
  );
}

// ─── VehicleField ─────────────────────────────────────────────────────────────
function VehicleField({
  vehicles, selectedReg, onSelect, onClear, onCustomChange, onBlur,
}: {
  vehicles: Vehicle[]; selectedReg: string;
  onSelect: (reg: string) => void; onClear: () => void;
  onCustomChange: (v: string) => void; onBlur?: () => void;
}) {
  const [query, setQuery]     = useState(selectedReg ?? "");
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const inputRef   = useRef<TextInput>(null);

  React.useEffect(() => { setQuery(selectedReg ?? ""); }, [selectedReg]);

  const openDrop  = useCallback(() => { setOpen(true);  Animated.timing(heightAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, []);
  const closeDrop = useCallback(() => { Animated.timing(heightAnim, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic),  useNativeDriver: false }).start(() => setOpen(false)); }, []);

  const pick = useCallback((reg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(reg); onSelect(reg); closeDrop(); inputRef.current?.blur();
  }, [onSelect, closeDrop]);

  const handleFocus  = useCallback(() => { setFocused(true); setQuery(""); openDrop(); }, [openDrop]);
  const handleBlur   = useCallback(() => {
    setFocused(false);
    const t = query.trim().toUpperCase();
    if (t && !vehicles.some((v) => v.regNumber === t)) onCustomChange(t);
    onBlur?.(); closeDrop();
  }, [query, vehicles, onCustomChange, onBlur, closeDrop]);
  const handleChange = useCallback((text: string) => {
    const u = text.toUpperCase(); setQuery(u); onCustomChange(u);
    if (!open) openDrop();
  }, [open, openDrop, onCustomChange]);

  if (vehicles.length === 0) {
    return (
      <View style={s.field}>
        <Text style={s.label}>Vehicle Number (optional)</Text>
        <View style={[s.inputRow, focused && s.inputRowFocused]}>
          <TextInput style={s.input} placeholder="e.g. HR55AB3849" placeholderTextColor={MUTED}
            value={query} onChangeText={handleChange}
            onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); onBlur?.(); }}
            autoCapitalize="characters" returnKeyType="done" selectionColor={RED} />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); onClear(); }} hitSlop={10}>
              <View style={s.clearCircle}><Text style={s.clearX}>✕</Text></View>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const filtered  = query.trim() ? vehicles.filter((v) => v.regNumber.includes(query.trim().toUpperCase())) : vehicles;
  const isCustom  = query.trim().length > 0 && !vehicles.some((v) => v.regNumber === query.trim().toUpperCase());
  const listH     = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 252] });
  const listAlpha = heightAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  const isOpen    = focused || open;

  return (
    <View style={s.vehicleWrapper}>
      <Text style={s.label}>Vehicle Number (optional)</Text>
      <View style={[s.unifiedBox, isOpen && s.unifiedBoxOpen]}>
        <View style={s.vehicleInputRow}>
          <TextInput ref={inputRef} style={s.vehicleSearchInput}
            placeholder="Search or type reg number..." placeholderTextColor={MUTED}
            value={query} onChangeText={handleChange} onFocus={handleFocus} onBlur={handleBlur}
            autoCapitalize="characters" autoCorrect={false} returnKeyType="done" selectionColor={RED} />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(""); onClear(); inputRef.current?.focus(); }} hitSlop={10}>
              <View style={s.clearCircle}><Text style={s.clearX}>✕</Text></View>
            </Pressable>
          ) : (
            <Text style={[s.chevron, isOpen && s.chevronUp]}>▼</Text>
          )}
        </View>
        {open && (
          <Animated.View style={[s.dropInner, { maxHeight: listH, opacity: listAlpha }]}>
            <View style={s.dropSeparator} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
              bounces={false} contentContainerStyle={{ paddingVertical: 4 }}>
              {isCustom && (
                <Pressable onPress={() => pick(query.trim().toUpperCase())}
                  style={({ pressed }) => [s.dropRow, pressed && { opacity: 0.65 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dropCustomLabel}>Use "{query.trim().toUpperCase()}"</Text>
                    <Text style={s.dropCustomHint}>Tap to confirm</Text>
                  </View>
                  <Text style={s.dropPlus}>＋</Text>
                </Pressable>
              )}
              {filtered.length === 0 && !isCustom ? (
                <View style={s.dropEmpty}><Text style={s.dropEmptyTxt}>No registered vehicles</Text></View>
              ) : (
                filtered.map((v, idx) => {
                  const sel = selectedReg === v.regNumber;
                  return (
                    <React.Fragment key={v.regNumber}>
                      <Pressable onPress={() => pick(v.regNumber)}
                        style={({ pressed }) => [s.dropRow, sel && s.dropRowSel, pressed && { opacity: 0.6 }]}>
                        <Text style={[s.dropRowReg, sel && s.dropRowRegSel]}>{v.regNumber}</Text>
                        {v.modelName ? <Text style={s.dropRowModel}>{v.modelName}</Text> : null}
                        {sel && <Text style={s.dropTick}>✓</Text>}
                      </Pressable>
                      {idx < filtered.length - 1 && <View style={s.dropRowDivider} />}
                    </React.Fragment>
                  );
                })
              )}
              {selectedReg.length > 0 && (
                <>
                  <View style={s.dropSectionDivider} />
                  <Pressable onPress={() => { onClear(); setQuery(""); closeDrop(); inputRef.current?.blur(); }}
                    style={({ pressed }) => [s.dropRemoveRow, pressed && { opacity: 0.55 }]}>
                    <Text style={s.dropRemoveTxt}>✕  Remove vehicle</Text>
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

// ─── ReferralNameField ────────────────────────────────────────────────────────
// ┌─ HOW IT WORKS ─────────────────────────────────────────────────────────────┐
// │ 1. Parent fetches full list ONCE when user taps "Yes" → passes as `allNames`│
// │ 2. Typing filters allNames locally — ZERO extra API calls                   │
// │ 3. Same interaction model as VehicleField dropdown                          │
// └─────────────────────────────────────────────────────────────────────────────┘
function ReferralNameField({
  allNames,
  loading,
  selectedName,
  onSelect,
  onClear,
  onCustomChange,
}: {
  allNames: ReferralNameItem[];   // full list, loaded once
  loading: boolean;               // spinner while list is being fetched
  selectedName: string;           // confirmed selection
  onSelect: (item: ReferralNameItem) => void;
  onClear: () => void;
  onCustomChange: (v: string) => void;
}) {
  const [query, setQuery]     = useState(selectedName ?? "");
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const heightAnim            = useRef(new Animated.Value(0)).current;
  const inputRef              = useRef<TextInput>(null);
  // ── Critical: prevents onBlur from wiping a selection that was just made ────
  const didPickRef = useRef(false);

  // Sync when parent resets (e.g. "No" toggled, or vehicle removed)
  React.useEffect(() => { setQuery(selectedName ?? ""); }, [selectedName]);

  const openDrop  = useCallback(() => { setOpen(true);  Animated.timing(heightAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, []);
  const closeDrop = useCallback(() => { Animated.timing(heightAnim, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic),  useNativeDriver: false }).start(() => setOpen(false)); }, []);

  const pick = useCallback((item: ReferralNameItem) => {
    didPickRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const label = getReferralDisplayLabel(item);
    setQuery(label);
    onSelect(item);
    closeDrop();
    inputRef.current?.blur();
  }, [onSelect, closeDrop]);

  const handleFocus = useCallback(() => {
    didPickRef.current = false;
    setFocused(true);
    openDrop();
  }, [openDrop]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (!didPickRef.current) {
      const trimmed = query.trim();
      const exact = allNames.find((n) => getReferralDisplayLabel(n).toLowerCase() === trimmed.toLowerCase());
      if (trimmed && !exact) {
        onCustomChange(trimmed);
      } else if (!trimmed) {
        setQuery(selectedName ?? "");
      }
    }
    didPickRef.current = false;
    closeDrop();
  }, [query, allNames, selectedName, onCustomChange, closeDrop]);

  // ── Local filter ONLY — no API call on typing ────────────────────────────────
  const handleChange = useCallback((text: string) => {
    didPickRef.current = false;
    setQuery(text);
    onCustomChange(text);
    if (!open) openDrop();
  }, [open, openDrop, onCustomChange]);

  const handleClear = useCallback(() => {
    didPickRef.current = false;
    setQuery("");
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allNames.filter((n) => getReferralDisplayLabel(n).toLowerCase().includes(q)) : allNames;
  }, [query, allNames]);

  const isCustom = query.trim().length > 0 &&
    !allNames.some((n) => getReferralDisplayLabel(n).toLowerCase() === query.trim().toLowerCase());

  const listH     = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240] });
  const listAlpha = heightAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  const isOpen    = focused || open;

  return (
    <View style={s.vehicleWrapper}>
      <Text style={s.label}>Referral Name</Text>

      <View style={[s.unifiedBox, isOpen && s.unifiedBoxOpen]}>
        {/* Input row */}
        <View style={s.vehicleInputRow}>
          <TextInput
            ref={inputRef}
            style={s.vehicleSearchInput}
            placeholder={loading ? "Loading names…" : "Search or enter name…"}
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCorrect={false}
            returnKeyType="done"
            selectionColor={RED}
            editable={!loading}
            underlineColorAndroid="transparent"
          />
          {loading ? (
            <ActivityIndicator size="small" color={MUTED} />
          ) : query.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={10}>
              <View style={s.clearCircle}><Text style={s.clearX}>✕</Text></View>
            </Pressable>
          ) : (
            <Text style={[s.chevron, isOpen && s.chevronUp]}>▼</Text>
          )}
        </View>

        {/* Dropdown — only when open and names are ready */}
        {open && !loading && (
          <Animated.View style={[s.dropInner, { maxHeight: listH, opacity: listAlpha }]}>
            <View style={s.dropSeparator} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {/* Freetext custom entry */}
              {isCustom && (
                <Pressable
                  onPress={() => pick({ id: `__custom__${Date.now()}`, name: query.trim() })}
                  style={({ pressed }) => [s.dropRow, pressed && { opacity: 0.65 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.dropCustomLabel}>Use "{query.trim()}"</Text>
                    <Text style={s.dropCustomHint}>Tap to confirm</Text>
                  </View>
                  <Text style={s.dropPlus}>＋</Text>
                </Pressable>
              )}

              {/* Filtered name list — local filter only, no API on type */}
              {filtered.map((n, idx) => {
                const displayLabel = getReferralDisplayLabel(n);
                const sel = selectedName === displayLabel;
                return (
                  <React.Fragment key={n.id}>
                    <Pressable
                      onPress={() => pick(n)}
                      style={({ pressed }) => [s.dropRow, sel && s.dropRowSel, pressed && { opacity: 0.6 }]}
                    >
                      <Text style={[s.dropRowReg, sel && s.dropRowRegSel]}>{displayLabel}</Text>
                      {sel && <Text style={s.dropTick}>✓</Text>}
                    </Pressable>
                    {idx < filtered.length - 1 && <View style={s.dropRowDivider} />}
                  </React.Fragment>
                );
              })}

              {filtered.length === 0 && !isCustom && (
                <View style={s.dropEmpty}>
                  <Text style={s.dropEmptyTxt}>No names found</Text>
                </View>
              )}

              {/* Remove — only when a name is actually confirmed */}
              {selectedName.trim().length > 0 && (
                <>
                  <View style={s.dropSectionDivider} />
                  <Pressable
                    onPress={() => {
                      didPickRef.current = false;
                      onClear(); setQuery(""); closeDrop(); inputRef.current?.blur();
                    }}
                    style={({ pressed }) => [s.dropRemoveRow, pressed && { opacity: 0.55 }]}
                  >
                    <Text style={s.dropRemoveTxt}>✕  Remove referral</Text>
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
  const insets     = useSafeAreaInsets();
  const { canCreateEntry } = usePermissions();
  const { accessToken }    = useAuth();

  const [tab, setTab]               = useState<TabId>("driver_partner");
  const [kbVisible, setKbVisible]   = useState(false);
  const [form, setForm]             = useState<EntryFormData>(EMPTY);
  const [driver, setDriver]         = useState<DriverDetails | null>(null);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Referral state ──────────────────────────────────────────────────────────
  const [referral, setReferral]             = useState<"yes" | "no">("no");
  const [referralName, setReferralName]     = useState("");
  // ── API list: fetched ONCE when "Yes" is tapped — never re-fetched on search ─
  const [allReferralNames, setAllReferralNames] = useState<ReferralNameItem[]>([]);
  const [referralNamesLoading, setReferralNamesLoading] = useState(false);
  const referralNamesFetchedRef = useRef(false); // guard: don't re-fetch if already loaded

  const referralSectionAnim = useRef(new Animated.Value(0)).current;
  const referralNameAnim    = useRef(new Animated.Value(0)).current;

  const isDP        = tab === "driver_partner";
  const vehicles    = (isDP && driver?.vehicles) ? driver.vehicles : [] as Vehicle[];
  const entryType   = (isDP ? "dp" : "non_dp") as EntryType;
  const hasVehicle  = (form.vehicle_reg_number ?? "").trim().length > 0;
  // ── Referral only in Driver Partner tab AND when no vehicle selected ───────
  const showReferral = isDP && !hasVehicle;

  React.useEffect(() => {
    Animated.timing(referralSectionAnim, {
      toValue: showReferral ? 1 : 0,
      duration: showReferral ? 220 : 180,
      easing: showReferral ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (!showReferral) {
      setReferral("no");
      setReferralName("");
      setAllReferralNames([]);
      referralNamesFetchedRef.current = false;
      Animated.timing(referralNameAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    }
  }, [showReferral]);

  // ── Toggle Yes/No ────────────────────────────────────────────────────────────
  const toggleReferral = useCallback(async (val: "yes" | "no") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReferral(val);

    if (val === "no") {
      setReferralName("");
      Animated.timing(referralNameAnim, {
        toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: false,
      }).start();
      return;
    }

    // val === "yes" — animate name field in
    Animated.timing(referralNameAnim, {
      toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();

    // ── Fetch list ONCE ──────────────────────────────────────────────────────
    // If already fetched (user toggled Yes → No → Yes again), skip API call
    if (referralNamesFetchedRef.current || !accessToken) return;

    setReferralNamesLoading(true);
    try {
      const list = await getReferralNames(accessToken);
      setAllReferralNames(list);
      referralNamesFetchedRef.current = true;
    } catch (err) {
      console.error("Failed to load referral names:", err);
      // Leave allReferralNames empty — user can still type a custom name
    } finally {
      setReferralNamesLoading(false);
    }
  }, [accessToken]);

  // Interpolations
  const referralSectionH     = referralSectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 88] });
  const referralSectionAlpha = referralSectionAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const referralNameH        = referralNameAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 340] });
  const referralNameAlpha    = referralNameAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setForm(EMPTY); setDriver(null);
    setReferral("no"); setReferralName("");
    setAllReferralNames([]); referralNamesFetchedRef.current = false;
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

  React.useEffect(() => {
    if (!isDP) { setDriver(null); setForm((p) => ({ ...p, vehicle_reg_number: "" })); }
  }, [isDP]);

  React.useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hide  = Keyboard.addListener("keyboardDidHide",  () => setKbVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const isValid = useMemo(() => isPhoneValid(form.phone) && form.name.trim().length > 0, [form]);

  const set = (key: keyof EntryFormData, val: string) => {
    if (key === "phone") {
      setForm((p) => ({ ...p, phone: normalizePhoneInput(val) }));
      if (!val.trim()) setDriver(null);
    } else {
      setForm((p) => ({ ...p, [key]: val }));
    }
  };

  const fetchByPhone = async () => {
    if (!isDP || !isPhoneValid(form.phone) || !accessToken) return;
    setLoading(true); setDriver(null);
    try {
      const d = await getDriverDetails({ phoneNo: form.phone.trim(), accessToken });
      if (d) { setDriver(d); setForm((p) => ({ ...p, name: d.name, vehicle_reg_number: p.vehicle_reg_number || "" })); }
    } finally { setLoading(false); }
  };

  const fetchByReg = async () => {
    if (!isDP || !accessToken) return;
    const reg = (form.vehicle_reg_number ?? "").trim();
    if (reg.length < 2 || vehicles.some((v) => v.regNumber === reg)) return;
    setLoading(true); setDriver(null);
    try {
      const d = await getDriverDetails({ regNumber: reg, accessToken });
      if (d) { setDriver(d); setForm((p) => ({ ...p, name: d.name, phone: normalizePhoneInput(d.phone) })); }
    } finally { setLoading(false); }
  };

  const handleNext = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("VisitorPurpose", {
      entryType,
      formData: {
        ...form,
        vehicle_reg_number: form.vehicle_reg_number || undefined,
        referral: showReferral ? referral : undefined,
        referral_name: showReferral && referral === "yes" ? referralName.trim() || undefined : undefined,
      },
    });
  };

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  return (
    <View style={s.container}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 8, paddingBottom: APP_FOOTER_HEIGHT + insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} colors={[RED]} />}
        >
          {!kbVisible && (
            <View style={s.illWrap}>
              <Image source={require("../../assets/images/car.png")} style={s.ill} resizeMode="contain" />
            </View>
          )}

          <Text style={[s.title, kbVisible && { marginTop: 12 }]}>Create Visitor Entry</Text>

          {canCreateEntry ? (
            <>
              <View style={{ marginBottom: 24 }}>
                <SegmentedToggle value={tab} onChange={setTab} />
              </View>

              <FormInput label="Phone Number" prefix="+91" placeholder=""
                keyboardType="phone-pad" value={form.phone}
                onChangeText={(v) => set("phone", v)} onBlur={fetchByPhone} maxLength={PHONE_MAX_DIGITS} />
              {loading && <Text style={s.loadingTxt}>Looking up driver…</Text>}

              <View style={{ height: GAP }} />

              <FormInput label="Name" placeholder="Enter name"
                value={form.name} onChangeText={(v) => set("name", v)} returnKeyType="next" />

              <View style={{ height: GAP }} />

              <VehicleField
                vehicles={vehicles}
                selectedReg={form.vehicle_reg_number ?? ""}
                onSelect={(r) => setForm((p) => ({ ...p, vehicle_reg_number: r }))}
                onClear={() => setForm((p) => ({ ...p, vehicle_reg_number: "" }))}
                onCustomChange={(v) => set("vehicle_reg_number", v)}
                onBlur={fetchByReg}
              />

              {/* ── Referral Yes/No — only Driver Partner, only when no vehicle selected ─── */}
              <Animated.View style={{ maxHeight: referralSectionH, opacity: referralSectionAlpha, overflow: "hidden" }}>
                <View style={{ height: GAP }} />
                <View style={s.field}>
                  <Text style={s.label}>Referral</Text>
                  <View style={s.yesNoRow}>
                    {(["yes", "no"] as const).map((val) => {
                      const active = referral === val;
                      return (
                        <Pressable key={val} onPress={() => toggleReferral(val)}
                          style={({ pressed }) => [s.yesNoBtn, active && s.yesNoBtnActive, pressed && { opacity: 0.8 }]}>
                          <Text style={[s.yesNoTxt, active && s.yesNoTxtActive]}>
                            {val === "yes" ? "Yes" : "No"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>

              {/* ── Referral Name dropdown — slides in when "Yes" tapped ─────── */}
              <Animated.View style={{ maxHeight: referralNameH, opacity: referralNameAlpha, overflow: "hidden" }}>
                <View style={{ height: GAP }} />
                <ReferralNameField
                  allNames={allReferralNames}
                  loading={referralNamesLoading}
                  selectedName={referralName}
                  onSelect={(item) => setReferralName(getReferralDisplayLabel(item))}
                  onClear={() => setReferralName("")}
                  onCustomChange={(v) => setReferralName(v)}
                />
              </Animated.View>

              <View style={{ height: GAP + 8 }} />

              <Pressable onPress={handleNext} disabled={!isValid}
                style={({ pressed }) => [s.nextBtn, !isValid && s.nextOff, pressed && isValid && s.nextPressed]}>
                <Text style={[s.nextTxt, !isValid && s.nextTxtOff]}>Next</Text>
              </Pressable>
            </>
          ) : (
            <Text style={s.hint}>Use the menu below to view tickets or open your profile.</Text>
          )}
        </ScrollView>

        <AppFooter activeTab="Entry" />
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex:      { flex: 1 },
  container: { flex: 1, backgroundColor: WHITE },
  scroll:    { flexGrow: 1, paddingHorizontal: H_PAD },
  illWrap:   { alignItems: "center", marginTop: 16, marginBottom: 8 },
  ill:       { width: "90%", height: 150 },
  title:     { fontFamily: FONT, fontSize: 18, fontWeight: "600", color: TEXT, textAlign: "center", marginBottom: 20 },

  track:    { height: 50, borderRadius: 26, backgroundColor: "#EBEDF1", justifyContent: "center", padding: 4 },
  tabsRow:  { flexDirection: "row", position: "absolute", left: 4, right: 4, top: 4, bottom: 4 },
  tab:      { flex: 1, justifyContent: "center", alignItems: "center" },
  pill:     { position: "absolute", left: 4, top: 4, width: "48%", height: 42, borderRadius: 20, backgroundColor: WHITE, elevation: 2, boxShadow: "0px 1px 4px rgba(0,0,0,0.08)" },
  tabTxt:   { fontFamily: FONT, fontSize: 14, fontWeight: "500", color: "#3F4C52" },
  tabTxtOn: { fontWeight: "600", color: RED },

  field:              { gap: 8 },
  label:              { fontFamily: FONT, fontSize: 13, fontWeight: "500", color: TEXT },
  inputRow:           { flexDirection: "row", alignItems: "center", height: INPUT_H, borderWidth: 1.5, borderColor: BORDER, borderRadius: INPUT_R, paddingHorizontal: 16, backgroundColor: "#FAFAFA" },
  inputRowFocused:    { borderColor: BORDER },
  prefix:             { fontFamily: FONT, fontSize: 15, color: MUTED, marginRight: 8 },
  input:              { flex: 1, fontFamily: FONT, fontSize: 15, color: TEXT, paddingVertical: 0 },
  inputSingle:        { height: INPUT_H, borderWidth: 1.5, borderColor: BORDER, borderRadius: INPUT_R, paddingHorizontal: 16, fontFamily: FONT, fontSize: 15, color: TEXT, backgroundColor: "#FAFAFA" },
  inputSingleFocused: { borderColor: RED },
  loadingTxt:         { fontFamily: FONT, fontSize: 13, color: MUTED, marginTop: 4 },
  hint:               { fontFamily: FONT, fontSize: 15, color: MUTED, textAlign: "center", paddingVertical: 24 },

  clearCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#E0E4E6", alignItems: "center", justifyContent: "center" },
  clearX:      { fontSize: 9, color: MUTED, fontWeight: "700" },

  yesNoRow:       { flexDirection: "row", gap: 8 },
  yesNoBtn:       { paddingHorizontal: 28, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: "#FAFAFA", alignItems: "center", justifyContent: "center" },
  yesNoBtnActive: { backgroundColor: RED, borderColor: RED },
  yesNoTxt:       { fontFamily: FONT, fontSize: 13, fontWeight: "500", color: MUTED },
  yesNoTxtActive: { color: WHITE, fontWeight: "600" },

  nextBtn:     { height: 52, borderRadius: 25, backgroundColor: RED, justifyContent: "center", alignItems: "center", elevation: 4, boxShadow: "0px 4px 12px rgba(179,29,56,0.30)" },
  nextOff:     { backgroundColor: "#E8EAED", elevation: 0, boxShadow: "none" },
  nextPressed: { opacity: 0.87, transform: [{ scale: 0.985 }] },
  nextTxt:     { fontFamily: FONT, fontSize: 15, fontWeight: "600", color: WHITE, letterSpacing: 0.3 },
  nextTxtOff:  { color: "#9AA3AA" },

  vehicleWrapper:     { gap: 8 },
  unifiedBox:         { borderWidth: 1.5, borderColor: BORDER, borderRadius: INPUT_R, backgroundColor: "#FAFAFA", overflow: "hidden" },
  unifiedBoxOpen:     { elevation: 8, boxShadow: "0px 4px 16px rgba(0,0,0,0.07)" },
  vehicleInputRow:    { flexDirection: "row", alignItems: "center", height: INPUT_H, paddingHorizontal: 16 },
  vehicleSearchInput: { flex: 1, fontFamily: FONT, fontSize: 15, color: TEXT, paddingVertical: 0 },
  chevron:            { fontSize: 11, color: MUTED },
  chevronUp:          { transform: [{ rotate: "180deg" }] },

  dropInner:          { backgroundColor: "#F2F4F6", overflow: "hidden" },
  dropSeparator:      { height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  dropRow:            { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16 },
  dropRowSel:         { backgroundColor: RED_BG, borderLeftWidth: 3, borderLeftColor: RED, paddingLeft: 13 },
  dropRowDivider:     { height: StyleSheet.hairlineWidth, backgroundColor: "#DDE0E3", marginHorizontal: 16 },
  dropRowReg:         { fontFamily: FONT, fontSize: 14, fontWeight: "500", color: TEXT, letterSpacing: 0.3, flex: 1 },
  dropRowRegSel:      { color: RED, fontWeight: "700" },
  dropRowModel:       { fontFamily: FONT, fontSize: 12, color: MUTED, marginRight: 8 },
  dropTick:           { fontSize: 13, color: RED, fontWeight: "700" },
  dropCustomLabel:    { fontFamily: FONT, fontSize: 13, fontWeight: "700", color: TEXT },
  dropCustomHint:     { fontFamily: FONT, fontSize: 11, color: MUTED, marginTop: 1 },
  dropPlus:           { fontSize: 18, color: MUTED, fontWeight: "300" },
  dropEmpty:          { paddingVertical: 20, alignItems: "center" },
  dropEmptyTxt:       { fontFamily: FONT, fontSize: 13, color: MUTED },
  dropSectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginTop: 4 },
  dropRemoveRow:      { paddingVertical: 13, alignItems: "center" },
  dropRemoveTxt:      { fontFamily: FONT, fontSize: 12, color: MUTED },
});
