/**
 * ReferralSection — Referral Yes/No + Referral Name dropdown.
 * Used on VisitorPurposeScreen for new_dp (DP without vehicle) only.
 *
 * Props:
 *   hideToggle — when true, skips rendering the Yes/No row entirely.
 *                The parent is responsible for controlling `referral` state.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  getReferralNames,
  getReferralDisplayLabel,
  type ReferralNameItem,
} from "@/apis/referral/referral.api";

const RED = "#B31D38";
const RED_BG = "rgba(179,29,56,0.06)";
const BORDER = "#D4D8DA";
const TEXT = "#161B1D";
const MUTED = "#77878E";
const INPUT_H = 50;
const INPUT_R = 12;
const GAP = 16;

const styles = StyleSheet.create({
  section: { gap: GAP },
  field: { gap: 8 },
  label: {
    fontFamily: "Poppins",
    fontSize: 13,
    fontWeight: "500",
    color: TEXT,
  },
  yesNoRow: { flexDirection: "row", gap: 8 },
  yesNoBtn: {
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  yesNoBtnActive: { backgroundColor: RED, borderColor: RED },
  yesNoTxt: { fontFamily: "Poppins", fontSize: 13, fontWeight: "500", color: MUTED },
  yesNoTxtActive: { color: "#FFFFFF", fontWeight: "600" },
  wrapper: { gap: 8 },
  unifiedBox: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: INPUT_R,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  unifiedBoxOpen: {
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: INPUT_H,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins",
    fontSize: 15,
    color: TEXT,
    paddingVertical: 0,
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
  dropRowReg: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "500",
    color: TEXT,
    letterSpacing: 0.3,
    flex: 1,
  },
  dropRowRegSel: { color: RED, fontWeight: "700" },
  dropRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#DDE0E3",
    marginHorizontal: 16,
  },
  dropTick: { fontSize: 13, color: RED, fontWeight: "700" },
  dropCustomLabel: { fontFamily: "Poppins", fontSize: 13, fontWeight: "700", color: TEXT },
  dropCustomHint: { fontFamily: "Poppins", fontSize: 11, color: MUTED, marginTop: 1 },
  dropPlus: { fontSize: 18, color: MUTED, fontWeight: "300" },
  dropEmpty: { paddingVertical: 20, alignItems: "center" },
  dropEmptyTxt: { fontFamily: "Poppins", fontSize: 13, color: MUTED },
  dropSectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginTop: 4 },
  dropRemoveRow: { paddingVertical: 13, alignItems: "center" },
  dropRemoveTxt: { fontFamily: "Poppins", fontSize: 12, color: MUTED },
});

export type ReferralSectionProps = {
  visible: boolean;
  referral: "yes" | "no";
  referralName: string;
  onReferralChange: (v: "yes" | "no") => void;
  onReferralNameChange: (v: string) => void;
  onClear: () => void;
  accessToken: string | null | undefined;
  /** When true, hides the built-in Yes/No toggle row.
   *  The parent screen controls referral state via its own UI. */
  hideToggle?: boolean;
  /** Called when user selects an item from the referral dropdown (e.g. to dismiss keyboard). */
  onItemSelect?: () => void;
};

export function ReferralSection({
  visible,
  referral,
  referralName,
  onReferralChange,
  onReferralNameChange,
  onClear,
  accessToken,
  hideToggle = false,
  onItemSelect,
}: ReferralSectionProps) {
  const [allNames, setAllReferralNames] = useState<ReferralNameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const nameFieldAnim = useRef(new Animated.Value(0)).current;

  // When hideToggle=true the parent drives `referral`; we just react to it.
  // When hideToggle=false this component owns the animation trigger internally via toggleReferral.
  useEffect(() => {
    if (!visible) {
      nameFieldAnim.setValue(0);
      return;
    }
    if (hideToggle) {
      // Animate name field in/out based on parent-controlled `referral`
      Animated.timing(nameFieldAnim, {
        toValue: referral === "yes" ? 1 : 0,
        duration: referral === "yes" ? 220 : 180,
        easing: referral === "yes"
          ? Easing.out(Easing.cubic)
          : Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Fetch names when switching to "yes"
      if (referral === "yes" && !fetchedRef.current && accessToken) {
        setLoading(true);
        getReferralNames(accessToken)
          .then(setAllReferralNames)
          .catch(() => {})
          .finally(() => {
            setLoading(false);
            fetchedRef.current = true;
          });
      }
    }
  }, [visible, hideToggle, referral, nameFieldAnim, accessToken]);

  const toggleReferral = useCallback(
    (val: "yes" | "no") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReferralChange(val);
      if (val === "no") {
        onReferralNameChange("");
        onClear();
        Animated.timing(nameFieldAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }).start();
        return;
      }
      Animated.timing(nameFieldAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      if (fetchedRef.current || !accessToken) return;
      setLoading(true);
      getReferralNames(accessToken)
        .then(setAllReferralNames)
        .catch(() => {})
        .finally(() => {
          setLoading(false);
          fetchedRef.current = true;
        });
    },
    [onReferralChange, onReferralNameChange, onClear, accessToken, nameFieldAnim],
  );

  if (!visible) return null;

  return (
    <View style={styles.section}>
      {/* ── Yes / No toggle — hidden when parent owns it ── */}
      {!hideToggle && (
        <View style={styles.field}>
          <Text style={styles.label}>Referral</Text>
          <View style={styles.yesNoRow}>
            {(["yes", "no"] as const).map((val) => {
              const active = referral === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => toggleReferral(val)}
                  style={({ pressed }) => [
                    styles.yesNoBtn,
                    active && styles.yesNoBtnActive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.yesNoTxt, active && styles.yesNoTxtActive]}>
                    {val === "yes" ? "Yes" : "No"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Referral Name field — animated in/out ── */}
      <Animated.View
        style={{
          opacity: nameFieldAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          }),
        }}
        pointerEvents={referral === "yes" ? "auto" : "none"}
      >
        {/* Only add gap when toggle is shown above */}
        {!hideToggle && <View style={{ height: GAP }} />}
        <ReferralNameFieldInner
          allNames={allNames}
          loading={loading}
          selectedName={referralName}
          onSelect={(item) => {
            onReferralNameChange(getReferralDisplayLabel(item));
            onItemSelect?.();
          }}
          onClear={onClear}
          onCustomChange={onReferralNameChange}
        />
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal name field with search + dropdown
// ─────────────────────────────────────────────────────────────────────────────
function ReferralNameFieldInner({
  allNames,
  loading,
  selectedName,
  onSelect,
  onClear,
  onCustomChange,
}: {
  allNames: ReferralNameItem[];
  loading: boolean;
  selectedName: string;
  onSelect: (item: ReferralNameItem) => void;
  onClear: () => void;
  onCustomChange: (v: string) => void;
}) {
  const [query, setQuery] = useState(selectedName ?? "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const didPickRef = useRef(false);

  useEffect(() => {
    setQuery(selectedName ?? "");
  }, [selectedName]);

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
    (item: ReferralNameItem) => {
      didPickRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setQuery(getReferralDisplayLabel(item));
      onSelect(item);
      closeDrop();
      inputRef.current?.blur();
    },
    [onSelect, closeDrop],
  );

  const handleFocus = useCallback(() => {
    didPickRef.current = false;
    setFocused(true);
    setQuery("");
    openDrop();
  }, [openDrop]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (!didPickRef.current) {
      const trimmed = query.trim();
      const exact = allNames.find(
        (n) => getReferralDisplayLabel(n).toLowerCase() === trimmed.toLowerCase(),
      );
      if (trimmed && !exact) onCustomChange(trimmed);
      else if (!trimmed) setQuery(selectedName ?? "");
    }
    didPickRef.current = false;
    closeDrop();
  }, [query, allNames, selectedName, onCustomChange, closeDrop]);

  const handleChange = useCallback(
    (text: string) => {
      didPickRef.current = false;
      setQuery(text);
      onCustomChange(text);
      if (!open) openDrop();
    },
    [open, openDrop, onCustomChange],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? allNames.filter((n) =>
          getReferralDisplayLabel(n).toLowerCase().includes(q),
        )
      : allNames;
  }, [query, allNames]);

  const isCustom =
    query.trim().length > 0 &&
    !allNames.some(
      (n) =>
        getReferralDisplayLabel(n).toLowerCase() === query.trim().toLowerCase(),
    );

  const listH = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });
  const listAlpha = heightAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });
  const isOpen = focused || open;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Referral Name</Text>
      <View style={[styles.unifiedBox, isOpen && styles.unifiedBoxOpen]}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
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
            <Pressable
              onPress={() => {
                setQuery("");
                onClear();
                inputRef.current?.focus();
              }}
              hitSlop={10}
            >
              <View style={styles.clearCircle}>
                <Text style={styles.clearX}>✕</Text>
              </View>
            </Pressable>
          ) : (
            <Text style={[styles.chevron, isOpen && styles.chevronUp]}>▼</Text>
          )}
        </View>
        {open && !loading && (
          <Animated.View
            style={[styles.dropInner, { maxHeight: listH, opacity: listAlpha }]}
          >
            <View style={styles.dropSeparator} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {isCustom && (
                <Pressable
                  onPress={() =>
                    pick({ id: `__custom__${Date.now()}`, name: query.trim() })
                  }
                  style={({ pressed }) => [
                    styles.dropRow,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropCustomLabel}>
                      Use "{query.trim()}"
                    </Text>
                    <Text style={styles.dropCustomHint}>Tap to confirm</Text>
                  </View>
                  <Text style={styles.dropPlus}>＋</Text>
                </Pressable>
              )}
              {filtered.map((n, idx) => {
                const displayLabel = getReferralDisplayLabel(n);
                const sel = selectedName === displayLabel;
                return (
                  <React.Fragment key={n.id}>
                    <Pressable
                      onPress={() => pick(n)}
                      style={({ pressed }) => [
                        styles.dropRow,
                        sel && styles.dropRowSel,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={[styles.dropRowReg, sel && styles.dropRowRegSel]}>
                        {displayLabel}
                      </Text>
                      {sel && <Text style={styles.dropTick}>✓</Text>}
                    </Pressable>
                    {idx < filtered.length - 1 && (
                      <View style={styles.dropRowDivider} />
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && !isCustom && (
                <View style={styles.dropEmpty}>
                  <Text style={styles.dropEmptyTxt}>No names found</Text>
                </View>
              )}
              {selectedName.trim().length > 0 && (
                <>
                  <View style={styles.dropSectionDivider} />
                  <Pressable
                    onPress={() => {
                      didPickRef.current = false;
                      onClear();
                      setQuery("");
                      closeDrop();
                      inputRef.current?.blur();
                    }}
                    style={({ pressed }) => [
                      styles.dropRemoveRow,
                      pressed && { opacity: 0.55 },
                    ]}
                  >
                    <Text style={styles.dropRemoveTxt}>✕  Remove referral</Text>
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
