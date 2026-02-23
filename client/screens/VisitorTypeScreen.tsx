/**
 * VisitorTypeScreen — Create Visitor Entry
 *
 * Features:
 * - Pull to refresh → resets the whole form
 * - Vehicle bottom sheet: search, sections, tap to select instantly
 * - Remove vehicle option inside sheet + on trigger
 * - Editable manual reg if not in list
 * - Auto-selects first vehicle from API
 * - Simple clean code, all functionality intact
 */
import React, { useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
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
  Modal,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ReAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import { RootStackParamList, EntryType, EntryFormData } from "@/navigation/RootStackNavigator";
import { normalizePhoneInput, isPhoneValid, PHONE_MAX_DIGITS } from "@/utils/validation";
import { usePermissions } from "@/permissions/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { getDriverDetails, type DriverDetails } from "@/apis/driver/driver.api";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const FONT    = "Poppins";
const RED     = "#B31D38";
const RED_BG  = "rgba(179,29,56,0.07)";
const BORDER  = "#D4D8DA";
const TEXT    = "#161B1D";
const MUTED   = "#77878E";
const WHITE   = "#FFFFFF";
const SURFACE = "#F5F6F8";

const INPUT_H = 50;
const INPUT_R = 12;
const H_PAD   = 20;
const GAP     = 20;

type TabId   = "staff" | "driver_partner";
type NavProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;

const EMPTY_FORM: EntryFormData = { phone: "", name: "", vehicle_reg_number: "" };

// ─── SegmentedToggle ─────────────────────────────────────────────────────────
function SegmentedToggle({ value, onChange }: { value: TabId; onChange: (t: TabId) => void }) {
  const idx        = value === "driver_partner" ? 0 : 1;
  const tx         = useSharedValue(0);
  const [segW, setSegW] = useState(0);

  React.useEffect(() => {
    if (segW > 0) tx.value = withSpring(idx * segW, { damping: 20, stiffness: 150 });
  }, [idx, segW]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  return (
    <View
      onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w > 0) setSegW((w - 8) / 2); }}
    >
      <View style={s.track}>
        <ReAnimated.View style={[s.pill, pillStyle, segW > 0 && { width: segW }]} pointerEvents="none" />
        <View style={s.tabsRow}>
          {(["driver_partner", "staff"] as TabId[]).map((tab) => (
            <Pressable key={tab} style={s.tab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(tab); }}>
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

// ─── FormInput ───────────────────────────────────────────────────────────────
function FormInput({ label, prefix, ...props }: React.ComponentProps<typeof TextInput> & { label: string; prefix?: string }) {
  const [focused, setFocused] = useState(false);
  const bc = focused ? RED : BORDER;
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {prefix ? (
        <View style={[s.inputRow, { borderColor: bc }]}>
          <Text style={s.prefix}>{prefix}</Text>
          <TextInput style={s.input} placeholderTextColor={MUTED} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props} />
        </View>
      ) : (
        <TextInput style={[s.inputSingle, { borderColor: bc }]} placeholderTextColor={MUTED} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props} />
      )}
    </View>
  );
}

// ─── VehicleTrigger — what shows on the main form ────────────────────────────
function VehicleTrigger({
  vehicles, selectedReg, onOpen, onClear, onCustomChange, onBlur,
}: {
  vehicles: { regNumber: string }[];
  selectedReg: string;
  onOpen: () => void;
  onClear: () => void;
  onCustomChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const hasVehicles  = vehicles.length > 0;
  const isFromList   = vehicles.some((v) => v.regNumber === selectedReg);
  const bc           = focused ? RED : selectedReg ? RED : BORDER;

  // No API vehicles → plain editable input
  if (!hasVehicles) {
    return (
      <View style={s.field}>
        <Text style={s.label}>Vehicle Number (optional)</Text>
        <TextInput
          style={[s.inputSingle, { borderColor: bc }]}
          placeholder="e.g. HR55AB3849"
          placeholderTextColor={MUTED}
          value={selectedReg}
          onChangeText={onCustomChange}
          onBlur={onBlur}
          onFocus={() => setFocused(true)}
          autoCapitalize="characters"
          returnKeyType="done"
        />
      </View>
    );
  }

  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        <Text style={s.label}>Vehicle Number (optional)</Text>
        {selectedReg ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={s.removeLink}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Tap to open sheet */}
      <Pressable onPress={onOpen} style={[s.inputRow, { borderColor: bc, paddingRight: 12 }]}>
        <Text style={[s.input, selectedReg ? { color: RED, fontWeight: "600" } : { color: MUTED }]} numberOfLines={1}>
          {selectedReg || "Tap to select vehicle"}
        </Text>
        <Text style={{ fontSize: 12, color: MUTED }}>▼</Text>
      </Pressable>

      {/* If manually typed reg (not from API list), show editable input below */}
      {selectedReg && !isFromList && (
        <TextInput
          style={[s.inputSingle, { borderColor: RED, marginTop: 8 }]}
          placeholder="Edit vehicle number"
          placeholderTextColor={MUTED}
          value={selectedReg}
          onChangeText={onCustomChange}
          onBlur={onBlur}
          autoCapitalize="characters"
          returnKeyType="done"
        />
      )}
    </View>
  );
}

// ─── Vehicle Bottom Sheet ─────────────────────────────────────────────────────
function VehicleSheet({
  visible, vehicles, selectedReg, onSelect, onClose,
}: {
  visible: boolean;
  vehicles: { regNumber: string; modelName?: string }[];
  selectedReg: string;
  onSelect: (r: string) => void;
  onClose: () => void;
}) {
  const insets      = useSafeAreaInsets();
  const slide       = useRef(new Animated.Value(600)).current;
  const [query, setQuery] = useState("");

  React.useEffect(() => {
    if (visible) {
      setQuery("");
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }).start();
    } else {
      Animated.timing(slide, { toValue: 600, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible]);

  const filtered = vehicles.filter((v) =>
    v.regNumber.toLowerCase().includes(query.toLowerCase()) ||
    (v.modelName ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const recent = filtered.slice(0, 3);
  const others  = filtered.slice(3);

  const pick = (reg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(reg);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slide }] }]}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Select Vehicle</Text>
          <Pressable onPress={onClose} style={s.closeBtn} hitSlop={10}>
            <Text style={s.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search registration number..."
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="characters"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Text style={{ color: MUTED, fontSize: 13, padding: 4 }}>✕</Text>
            </Pressable>
          )}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
          {filtered.length === 0 ? (
            <>
              <Text style={s.noResults}>No match for "{query}"</Text>
              {query.length >= 4 && (
                <Pressable onPress={() => { onSelect(query.toUpperCase()); onClose(); }} style={s.useCustomBtn}>
                  <Text style={s.useCustomTxt}>Use "{query.toUpperCase()}"</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              {/* Recent */}
              {recent.length > 0 && <Text style={s.section}>RECENT VEHICLES</Text>}
              {recent.map((v) => <VRow key={v.regNumber} v={v} selected={selectedReg === v.regNumber} onPress={() => pick(v.regNumber)} />)}

              {/* Others */}
              {others.length > 0 && <Text style={[s.section, { marginTop: 18 }]}>OTHER VEHICLES</Text>}
              {others.map((v) => <VRow key={v.regNumber} v={v} selected={selectedReg === v.regNumber} onPress={() => pick(v.regNumber)} />)}
            </>
          )}

          {/* Remove vehicle option */}
          {selectedReg && !query && (
            <Pressable onPress={() => { onSelect(""); onClose(); }} style={s.removeVehicleBtn}>
              <Text style={s.removeVehicleTxt}>✕  Remove vehicle selection</Text>
            </Pressable>
          )}

          <View style={{ height: 8 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Single vehicle row ───────────────────────────────────────────────────────
function VRow({ v, selected, onPress }: { v: { regNumber: string; modelName?: string }; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, selected && s.rowOn, pressed && { opacity: 0.65 }]}
    >
      <View style={[s.radio, selected && s.radioOn]}>
        {selected && <View style={s.radioDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowReg, selected && s.rowRegOn]}>{v.regNumber}</Text>
        {v.modelName ? <Text style={s.rowModel}>{v.modelName}</Text> : null}
      </View>
      {selected && (
        <View style={s.badge}>
          <Text style={s.badgeTxt}>SELECTED</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavProp>();
  const insets     = useSafeAreaInsets();
  const { canCreateEntry } = usePermissions();
  const { accessToken }    = useAuth();

  const [tab, setTab]                 = useState<TabId>("driver_partner");
  const [kbVisible, setKbVisible]     = useState(false);
  const [form, setForm]               = useState<EntryFormData>(EMPTY_FORM);
  const [driver, setDriver]           = useState<DriverDetails | null>(null);
  const [loading, setLoading]         = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [sheetOpen, setSheetOpen]     = useState(false);

  const isDP      = tab === "driver_partner";
  const entryType: EntryType = isDP ? "dp" : "non_dp";
  const vehicles  = (isDP && driver?.vehicles) ? driver.vehicles : [];

  // ── Pull to refresh — resets the whole form ────────────────────────────────
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setForm(EMPTY_FORM);
    setDriver(null);
    setSheetOpen(false);
    // Small delay so spinner shows
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  React.useEffect(() => {
    if (!isDP) { setDriver(null); setForm((p) => ({ ...p, vehicle_reg_number: "" })); }
  }, [isDP]);

  React.useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hide  = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
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

  const applyDriver = (d: DriverDetails) => {
    setDriver(d);
    setForm((p) => ({
      ...p,
      name: d.name,
      vehicle_reg_number: d.vehicles.length >= 1 ? d.vehicles[0].regNumber : p.vehicle_reg_number,
    }));
  };

  const fetchByPhone = async () => {
    if (!isDP || !isPhoneValid(form.phone) || !accessToken) return;
    setLoading(true); setDriver(null);
    try { const d = await getDriverDetails({ phoneNo: form.phone.trim(), accessToken }); if (d) applyDriver(d); }
    finally { setLoading(false); }
  };

  const fetchByReg = async () => {
    if (!isDP || !accessToken) return;
    const reg = (form.vehicle_reg_number ?? "").trim();
    if (reg.length < 2 || vehicles.some((v) => v.regNumber === reg)) return;
    setLoading(true); setDriver(null);
    try {
      const d = await getDriverDetails({ regNumber: reg, accessToken });
      if (d) { setDriver(d); setForm((p) => ({ ...p, name: d.name, phone: normalizePhoneInput(d.phone), vehicle_reg_number: d.vehicles.length >= 1 ? d.vehicles[0].regNumber : p.vehicle_reg_number })); }
    } finally { setLoading(false); }
  };

  const handleNext = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("VisitorPurpose", {
      entryType,
      formData: { ...form, vehicle_reg_number: form.vehicle_reg_number || undefined },
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={RED}
              colors={[RED]}
              title="Release to reset form"
              titleColor={MUTED}
            />
          }
        >
          {/* Illustration */}
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

              {/* Phone */}
              <FormInput
                label="Phone Number" prefix="+91" placeholder=""
                keyboardType="phone-pad" value={form.phone}
                onChangeText={(v) => set("phone", v)}
                onBlur={fetchByPhone}
                maxLength={PHONE_MAX_DIGITS}
              />

              {loading && <Text style={s.loadingTxt}>Looking up driver…</Text>}

              <View style={{ height: GAP }} />

              {/* Name */}
              <FormInput
                label="Name" placeholder="Enter name"
                value={form.name}
                onChangeText={(v) => set("name", v)}
                returnKeyType="next"
              />

              <View style={{ height: GAP }} />

              {/* Vehicle */}
              <VehicleTrigger
                vehicles={vehicles}
                selectedReg={form.vehicle_reg_number ?? ""}
                onOpen={() => { Keyboard.dismiss(); setSheetOpen(true); }}
                onClear={() => setForm((p) => ({ ...p, vehicle_reg_number: "" }))}
                onCustomChange={(v) => set("vehicle_reg_number", v)}
                onBlur={fetchByReg}
              />

              <View style={{ height: GAP + 8 }} />

              {/* Next */}
              <Pressable
                onPress={handleNext}
                disabled={!isValid}
                style={({ pressed }) => [s.nextBtn, !isValid && s.nextOff, pressed && isValid && s.nextPressed]}
              >
                <Text style={[s.nextTxt, !isValid && s.nextTxtOff]}>Next</Text>
              </Pressable>
            </>
          ) : (
            <Text style={s.hint}>Use the menu below to view tickets or open your profile.</Text>
          )}
        </ScrollView>

        <AppFooter activeTab="Entry" />
      </KeyboardAvoidingView>

      {/* Vehicle bottom sheet */}
      <VehicleSheet
        visible={sheetOpen}
        vehicles={vehicles}
        selectedReg={form.vehicle_reg_number ?? ""}
        onSelect={(r) => setForm((p) => ({ ...p, vehicle_reg_number: r }))}
        onClose={() => setSheetOpen(false)}
      />
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

  // Toggle
  track:   { height: 50, borderRadius: 26, backgroundColor: "#EBEDF1", justifyContent: "center", padding: 4 },
  tabsRow: { flexDirection: "row", position: "absolute", left: 4, right: 4, top: 4, bottom: 4 },
  tab:     { flex: 1, justifyContent: "center", alignItems: "center" },
  pill:    { position: "absolute", left: 4, top: 4, width: "48%", height: 42, borderRadius: 20, backgroundColor: WHITE, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt:  { fontFamily: FONT, fontSize: 14, fontWeight: "500", color: "#3F4C52" },
  tabTxtOn:{ fontWeight: "600", color: RED },

  // Form fields
  field:      { gap: 8, marginBottom: 0 },
  labelRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label:      { fontFamily: FONT, fontSize: 13, fontWeight: "500", color: TEXT },
  removeLink: { fontFamily: FONT, fontSize: 12, color: RED, fontWeight: "500" },
  inputRow:   { flexDirection: "row", alignItems: "center", height: INPUT_H, borderWidth: 1.5, borderColor: BORDER, borderRadius: INPUT_R, paddingHorizontal: 16, backgroundColor: "#FAFAFA" },
  prefix:     { fontFamily: FONT, fontSize: 15, color: MUTED, marginRight: 8 },
  input:      { flex: 1, fontFamily: FONT, fontSize: 15, color: TEXT, paddingVertical: 0 },
  inputSingle:{ height: INPUT_H, borderWidth: 1.5, borderColor: BORDER, borderRadius: INPUT_R, paddingHorizontal: 16, fontFamily: FONT, fontSize: 15, color: TEXT, backgroundColor: "#FAFAFA" },

  loadingTxt: { fontFamily: FONT, fontSize: 13, color: MUTED, marginTop: 4 },
  hint:       { fontFamily: FONT, fontSize: 15, color: MUTED, textAlign: "center", paddingVertical: 24 },

  // Next button
  nextBtn:     { height: 52, borderRadius: 25, backgroundColor: RED, justifyContent: "center", alignItems: "center", shadowColor: RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  nextOff:     { backgroundColor: "#D4D8DA", shadowOpacity: 0, elevation: 0 },
  nextPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  nextTxt:     { fontFamily: FONT, fontSize: 15, fontWeight: "600", color: WHITE, letterSpacing: 0.3 },
  nextTxtOff:  { color: MUTED },

  // Bottom sheet
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:       { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: "80%", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 20 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  sheetTitle:  { fontFamily: FONT, fontSize: 17, fontWeight: "700", color: TEXT },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  closeTxt:    { fontSize: 13, color: MUTED, fontWeight: "600" },

  searchBox:   { flexDirection: "row", alignItems: "center", height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: "#FAFAFA", paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, fontFamily: FONT, fontSize: 14, color: TEXT, paddingVertical: 0 },

  noResults:    { fontFamily: FONT, fontSize: 14, color: MUTED, textAlign: "center", paddingVertical: 20 },
  useCustomBtn: { borderWidth: 1.5, borderColor: RED, borderRadius: INPUT_R, padding: 14, alignItems: "center", backgroundColor: "rgba(179,29,56,0.06)", marginBottom: 8 },
  useCustomTxt: { fontFamily: FONT, fontSize: 14, fontWeight: "600", color: RED },

  section: { fontFamily: FONT, fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 1, marginBottom: 10 },

  // Vehicle rows
  row:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: INPUT_R, borderWidth: 1.5, borderColor: BORDER, backgroundColor: "#FAFAFA", marginBottom: 10 },
  rowOn:    { borderColor: RED, backgroundColor: "rgba(179,29,56,0.07)" },
  radio:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  radioOn:  { borderColor: RED },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: RED },
  rowReg:   { fontFamily: FONT, fontSize: 14, fontWeight: "600", color: TEXT, letterSpacing: 0.4 },
  rowRegOn: { color: RED, fontWeight: "700" },
  rowModel: { fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 2 },
  badge:    { backgroundColor: "rgba(179,29,56,0.12)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeTxt: { fontFamily: FONT, fontSize: 10, fontWeight: "700", color: RED, letterSpacing: 0.5 },

  // Remove vehicle option inside sheet
  removeVehicleBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  removeVehicleTxt: { fontFamily: FONT, fontSize: 13, color: MUTED },
});
