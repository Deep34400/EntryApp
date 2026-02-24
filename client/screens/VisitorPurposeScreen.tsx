/**
 * VisitorPurposeScreen — CLEAN FINAL (Fixed)
 *
 * Fixes applied:
 *   1. Bottom bar now transparent (no white box / border) — blends with screen
 *   2. CTA button is pill-shaped (borderRadius: 100) for premium feel
 *   3. Auto-scroll: scrollToEnd when referral "Yes" is selected and when referral input focuses (dropdown above keyboard)
 *
 * Architecture:
 *   SafeAreaView (flex: 1)
 *   └── KeyboardAvoidingView (flex: 1)
 *       ├── ScrollView (flex: 1, pb = BUTTON_H)
 *       │   └── content (user card, grid, referral)
 *       └── BottomBar (NOT inside ScrollView)
 */

import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  UIManager,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeIn,
  LinearTransition,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { createTicket } from "@/apis";
import { UnauthorizedError } from "@/api/requestClient";
import { SERVER_UNAVAILABLE_MSG } from "@/lib/server-unavailable";
import { isApiError } from "@/lib/api-error";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList, EntryType } from "@/navigation/RootStackNavigator";
import { isPhoneValid, phoneForApi } from "@/utils/validation";
import { formatPurposeDisplay } from "@/constants/entryPurpose";
import { usePurposeConfig } from "@/hooks/usePurposeConfig";
import { PurposeGridShimmer } from "@/components/Shimmer";
import { ReferralSection } from "@/components/ReferralSection";
import type { PurposeConfigItem, PurposeConfigSubItem } from "@/types/purposeConfig";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BOTTOM_BAR_CONTENT_HEIGHT = 68;

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  screenBg: "#F6F7F9",
  cardBg: "#FFFFFF",
  cardBorder: "#E8EBEC",
  brandRed: "#B31D38",
  brandRedLight: "#FFF0F3",
  brandRedMid: "#F5DADF",
  textPrimary: "#161B1D",
  textSecondary: "#5C6B72",
  successGreen: "#1A8A4A",
  // FIX 1: bottomBarBg is now transparent — no more white box
  bottomBarBg: "transparent",
  bottomBarBorder: "transparent",
  segmentedBg: "#EBEDF1",
  segmentedSelectedBg: "#FFFFFF",
  segmentedSelectedText: "#B31D38",
  segmentedUnselectedText: "#3F4C52",
  selectedCardBorder: "#B31D38",
  selectedCardFill: "#FFF5F7",
  cardRadius: 14,
  buttonRadius: 100, // FIX 2: pill shape
  buttonHeight: 52,
  avatarSize: 42,
  cardMinHeight: 88,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorPurpose">;
type VisitorPurposeRouteProp = RouteProp<RootStackParamList, "VisitorPurpose">;
type SelectedPurpose = { categoryTitle: string | null; item: string };

// ─── PurposeGridCard ──────────────────────────────────────────────────────────
function PurposeGridCard({
  displayTitle,
  icon,
  onPress,
  selected,
  showArrow = false,
  delay,
}: {
  title: string;
  displayTitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  selected: boolean;
  showArrow?: boolean;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={styles.gridCardWrap}
      entering={FadeInDown.delay(delay).springify()}
      layout={LinearTransition.springify()}
    >
      <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, { damping: 18, stiffness: 220 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 220 }); }}
        style={[styles.gridCard, selected && styles.gridCardSelected]}
      >
        {selected && (
          <Animated.View entering={FadeIn.duration(180)} style={styles.selectedDot}>
            <Feather name="check" size={9} color="#FFF" />
          </Animated.View>
        )}
        <View style={[styles.gridCardIconWrap, selected && styles.gridCardIconWrapSelected]}>
          <Feather name={icon} size={20} color={selected ? "#FFF" : D.brandRed} />
        </View>
        {showArrow ? (
          <View style={styles.gridCardLabelRow}>
            <ThemedText
              type="small"
              style={[styles.gridCardLabel, selected ? styles.gridCardLabelSelected : styles.gridCardLabelDefault]}
              numberOfLines={2}
            >
              {displayTitle}
            </ThemedText>
            <Feather name="chevron-right" size={14} color={selected ? D.brandRed : D.textSecondary} />
          </View>
        ) : (
          <ThemedText
            type="small"
            style={[styles.gridCardLabel, selected ? styles.gridCardLabelSelected : styles.gridCardLabelDefault]}
            numberOfLines={2}
          >
            {displayTitle}
          </ThemedText>
        )}
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ─── ReferralBlock ────────────────────────────────────────────────────────────
function ReferralBlock({
  referral,
  referralName,
  onReferralChange,
  onReferralNameChange,
  onClear,
  accessToken,
  onInputFocus,
}: {
  referral: "yes" | "no";
  referralName: string;
  onReferralChange: (v: "yes" | "no") => void;
  onReferralNameChange: (v: string) => void;
  onClear: () => void;
  accessToken: string | null;
  onInputFocus?: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(260).springify()} style={styles.referralWrap}>
      <View style={styles.referralDivider} />
      <View style={styles.referralRow}>
        <ThemedText type="small" style={styles.referralQuestion}>
          Was this driver referred by someone?
        </ThemedText>
        <View style={styles.referralChipRow}>
          {(["yes", "no"] as const).map((val) => (
            <Pressable
              key={val}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onReferralChange(val);
                if (val === "no") { onClear(); Keyboard.dismiss(); }
              }}
              style={[
                styles.referralChip,
                referral === val && (val === "yes" ? styles.chipYes : styles.chipNo),
              ]}
            >
              <ThemedText
                type="small"
                style={[styles.chipText, referral === val && styles.chipTextActive]}
              >
                {val === "yes" ? "Yes" : "No"}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
      <ReferralSection
        visible={true}
        referral={referral}
        referralName={referralName}
        onReferralChange={onReferralChange}
        onReferralNameChange={onReferralNameChange}
        onClear={onClear}
        accessToken={accessToken}
        hideToggle
        onItemSelect={Keyboard.dismiss}
        onInputFocus={onInputFocus}
      />
    </Animated.View>
  );
}

// ─── BottomBar ────────────────────────────────────────────────────────────────
/**
 * FIX 1: transparent background, no border, no shadow on the bar itself.
 * The button has its own shadow — the bar wrapper is invisible.
 * This removes the "white box" / "separate panel" visual entirely.
 */
function BottomBar({
  selected,
  loading,
  disabled,
  onPress,
  safeBottom,
}: {
  selected: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  safeBottom: number;
}) {
  return (
    <View style={[styles.bottomBar, { paddingBottom: safeBottom + Spacing.sm }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.ctaButton,
          !selected && styles.ctaButtonInactive,
          pressed && selected && !loading && styles.ctaButtonPressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <View style={styles.ctaInner}>
            <ThemedText type="label" style={styles.ctaText}>
              {selected ? "Confirm & Generate Token" : "Select a Purpose"}
            </ThemedText>
            {selected && (
              <Feather name="arrow-right" size={17} color="#FFF" style={{ marginLeft: 8 }} />
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function VisitorPurposeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VisitorPurposeRouteProp>();
  const { entryType, formData } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useUser();
  const { accessToken, clearAuth } = useAuth();

  const scrollViewRef = useRef<ScrollView>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRRModal, setShowRRModal] = useState(false);
  const [categoryTab, setCategoryTab] = useState<"Settlement" | "Maintenance">("Settlement");
  const [selectedPurpose, setSelectedPurpose] = useState<SelectedPurpose | null>(null);
  const [referral, setReferral] = useState<"yes" | "no">("no");
  const [referralName, setReferralName] = useState("");

  // ── Derived ──
  const hasVehicle = (formData.vehicle_reg_number ?? "").trim().length > 0;
  const effectiveType: EntryType =
    entryType === "dp" ? (hasVehicle ? "old_dp" : "new_dp") : entryType;
  const isDp = effectiveType === "new_dp" || effectiveType === "old_dp";
  const isNewDp = effectiveType === "new_dp";
  const displayName = (formData.name ?? "").trim() || (user?.name ?? "").trim() || "—";
  const displayPhone = (formData.phone ?? "").trim() || (user?.phone ?? "").trim() || "—";
  const displayRole = isDp ? "Driver Partner" : "Staff";
  const showReferral = isNewDp && selectedPurpose !== null;

  // ── Config ──
  const {
    data: purposeConfig,
    isLoading: configLoading,
    isRefetching: configRefetching,
    isError: configError,
    error: configErrorObj,
    refetch: refetchConfig,
  } = usePurposeConfig();

  const newDpCategory = purposeConfig?.find((c) => c.dp_type === "new_dp");
  const settlementCategory = purposeConfig?.find((c) => c.key === "settlement");
  const maintenanceCategory = purposeConfig?.find((c) => c.key === "maintenance");
  const staffCategory = purposeConfig?.find((c) => c.dp_type === "staff");
  const rrSubItems: PurposeConfigSubItem[] =
    maintenanceCategory?.items.find((i) => i.key === "Running Repair")?.sub_items ?? [];

  const getIcon = (key: string): keyof typeof Feather.glyphMap =>
    key && Feather.glyphMap[key as keyof typeof Feather.glyphMap]
      ? (key as keyof typeof Feather.glyphMap)
      : "circle";

  const getAssignee = (cat: string | null) => {
    if (cat === "Maintenance") return "FLEET EXECUTIVE";
    if (cat === "Settlement") return "DRIVER MANAGER";
    if (cat === "Onboarding") return "ONBOARDING";
    return null;
  };

  const handleReferralChange = (v: "yes" | "no") => {
    setReferral(v);
    if (v === "yes") {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 260);
    } else {
      setReferralName("");
      Keyboard.dismiss();
    }
  };

  const handleReferralInputFocus = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // ── Submit ──
  const submitMutation = useMutation({
    mutationFn: async ({ categoryTitle, item }: SelectedPurpose) => {
      setSubmitError(null);
      let phone = (formData.phone ?? "").trim() || (user?.phone ?? "").trim();
      const name = (formData.name ?? "").trim() || (user?.name ?? "").trim();
      phone = phoneForApi(phone);
      if (!isPhoneValid(phone)) throw new Error("Please enter a valid 10-digit mobile number.");
      if (!name) throw new Error("Driver name is required.");

      const body: Record<string, string> = {
        type: displayRole,
        name,
        phone,
        category: categoryTitle ?? "Staff",
        subCategory: item,
      };
      if (effectiveType === "old_dp") {
        const reg = (formData.vehicle_reg_number ?? "").trim();
        if (reg) body.regNumber = reg;
      }
      const useReferral = isNewDp ? referral : formData.referral;
      const useReferralName = isNewDp ? referralName : (formData.referralName ?? "");
      body.isReferral = useReferral === "yes" ? "true" : "false";
      if (useReferral === "yes" && useReferralName.trim()) body.referralName = useReferralName.trim();
      const assignee = getAssignee(categoryTitle);
      if (assignee) body.assignee = assignee;
      return await createTicket(body, accessToken);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const raw = (data.data ?? data.results ?? data) as Record<string, unknown>;
      const token = raw.tokenNo ?? raw.token_no ?? raw.token ?? raw.id ?? "";
      const assignee = raw.assignee ?? raw.assignee_name ?? raw.agent ?? "—";
      const desk_location = raw.deskLocation ?? raw.desk_location ?? raw.gate ?? raw.gate_name ?? "—";
      const cat = raw.category ?? raw.category_name;
      const sub = raw.subCategory ?? raw.sub_category;
      const purposeStr =
        cat != null && sub != null
          ? formatPurposeDisplay(String(cat), String(sub))
          : (raw.reason ?? raw.purpose);
      const apiType = raw.type ?? raw.entry_type ?? effectiveType;
      navigation.navigate("TokenDisplay", {
        token: String(token),
        assignee: String(assignee),
        desk_location: String(desk_location),
        driverName: formData.name?.trim() || undefined,
        driverPhone: formData.phone?.trim() || undefined,
        entryType: apiType != null ? String(apiType) : effectiveType,
        purpose: purposeStr != null ? String(purposeStr) : undefined,
      });
    },
    onError: (error: Error) => {
      if (error instanceof UnauthorizedError) {
        clearAuth();
        navigation.reset({ index: 0, routes: [{ name: "LoginOtp" }] });
        return;
      }
      if (error.message === SERVER_UNAVAILABLE_MSG) return;
      const message = isApiError(error) ? error.message : error.message || "Something went wrong.";
      setSubmitError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  // ── Handlers ──
  const handleCardPress = (categoryTitle: string | null, item: string) => {
    if (categoryTitle === "Maintenance" && item === "Running Repair") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowRRModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isSame = selectedPurpose?.categoryTitle === categoryTitle && selectedPurpose?.item === item;
    setSelectedPurpose(isSame ? null : { categoryTitle, item });
  };

  const handleRRSelect = (sub: PurposeConfigSubItem) => {
    setShowRRModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate({ categoryTitle: "Maintenance", item: `Running Repair - ${sub.key}` });
  };

  const isSelected = (cat: string | null, item: string) =>
    selectedPurpose?.categoryTitle === cat && selectedPurpose?.item === item;

  const isCtaDisabled =
    !selectedPurpose || submitMutation.isPending || configLoading || !!configError || !purposeConfig;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* FIX 3: attach ref to ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BOTTOM_BAR_CONTENT_HEIGHT + insets.bottom + Spacing.sm + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* ── User card ── */}
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.userCard}>
            <View style={styles.avatar}>
              <Feather name="user" size={18} color="#FFF" />
            </View>
            <View style={styles.userCardCenter}>
              <ThemedText type="small" style={styles.userName} numberOfLines={1}>
                {displayName}
              </ThemedText>
              <View style={styles.rolePill}>
                <ThemedText type="small" style={styles.roleText}>{displayRole}</ThemedText>
              </View>
            </View>
            <View style={styles.phonePill}>
              <Feather name="phone" size={11} color={D.brandRed} style={{ marginRight: 4 }} />
              <ThemedText type="small" style={styles.phoneText} numberOfLines={1}>
                {displayPhone}
              </ThemedText>
            </View>
          </Animated.View>

          {/* ── Section heading ── */}
          <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.sectionRow}>
            <ThemedText type="h6" style={styles.sectionTitle}>
              Select purpose of visit
            </ThemedText>
            {selectedPurpose && (
              <Animated.View entering={FadeIn.duration(220)} style={styles.selectedBadge}>
                <Feather name="check-circle" size={12} color="#FFF" />
                <ThemedText type="small" style={styles.selectedBadgeText}>Selected</ThemedText>
              </Animated.View>
            )}
          </Animated.View>

          {/* ── Error banner ── */}
          {submitError != null && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={D.brandRed} style={{ marginRight: 6 }} />
              <ThemedText type="small" style={styles.errorText} numberOfLines={3}>
                {submitError}
              </ThemedText>
            </Animated.View>
          )}

          {/* ── Grid ── */}
          {(configLoading || configRefetching) && !purposeConfig ? (
            <PurposeGridShimmer />
          ) : configError ? (
            <View style={styles.errorState}>
              <View style={styles.errorStateIcon}>
                <Feather name="wifi-off" size={26} color={D.textSecondary} />
              </View>
              <ThemedText type="small" style={styles.errorStateText}>
                {(configErrorObj as Error)?.message ?? "Failed to load options."}
              </ThemedText>
              <Pressable onPress={() => refetchConfig()} style={styles.retryBtn}>
                <Feather name="refresh-cw" size={13} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText type="label" style={styles.retryText}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : purposeConfig ? (
            isDp ? (
              effectiveType === "old_dp" && settlementCategory && maintenanceCategory ? (
                <>
                  <View style={styles.tabBar}>
                    {(["Settlement", "Maintenance"] as const).map((tab) => (
                      <Pressable
                        key={tab}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCategoryTab(tab);
                          setSelectedPurpose(null);
                        }}
                        style={[styles.tabBtn, categoryTab === tab ? styles.tabBtnSelected : styles.tabBtnDefault]}
                      >
                        <ThemedText
                          type="body"
                          style={[styles.tabText, categoryTab === tab ? styles.tabTextSelected : styles.tabTextDefault]}
                        >
                          {tab}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.grid}>
                    {(categoryTab === "Settlement" ? settlementCategory.items : maintenanceCategory.items).map(
                      (item: PurposeConfigItem, i: number) => {
                        const isRR = categoryTab === "Maintenance" && item.key === "Running Repair";
                        return (
                          <PurposeGridCard
                            key={item.key}
                            title={item.key}
                            displayTitle={item.label}
                            icon={getIcon(item.icon_key)}
                            delay={80 + i * 45}
                            onPress={() => handleCardPress(categoryTab, item.key)}
                            selected={!isRR && isSelected(categoryTab, item.key)}
                            showArrow={isRR}
                          />
                        );
                      }
                    )}
                  </View>
                </>
              ) : newDpCategory ? (
                <View style={styles.grid}>
                  {newDpCategory.items.map((item: PurposeConfigItem, i: number) => (
                    <PurposeGridCard
                      key={item.key}
                      title={item.key}
                      displayTitle={item.label}
                      icon={getIcon(item.icon_key)}
                      delay={80 + i * 45}
                      onPress={() => handleCardPress("Onboarding", item.key)}
                      selected={isSelected("Onboarding", item.key)}
                    />
                  ))}
                </View>
              ) : null
            ) : staffCategory ? (
              <View style={styles.grid}>
                {staffCategory.items.map((item: PurposeConfigItem, i: number) => (
                  <PurposeGridCard
                    key={item.key}
                    title={item.key}
                    displayTitle={item.label}
                    icon={getIcon(item.icon_key)}
                    delay={80 + i * 45}
                    onPress={() => handleCardPress(null, item.key)}
                    selected={isSelected(null, item.key)}
                  />
                ))}
              </View>
            ) : null
          ) : null}

          {/* ── Referral block — scrollToEnd on "Yes" and on input focus keeps dropdown above keyboard ── */}
          {showReferral && (
            <ReferralBlock
              referral={referral}
              referralName={referralName}
              onReferralChange={handleReferralChange}
              onReferralNameChange={setReferralName}
              onClear={() => setReferralName("")}
              accessToken={accessToken}
              onInputFocus={handleReferralInputFocus}
            />
          )}

          {/* ── Submitting state ── */}
          {submitMutation.isPending && (
            <Animated.View entering={FadeIn.duration(180)} style={styles.loadingRow}>
              <ActivityIndicator size="small" color={D.brandRed} />
              <ThemedText type="small" style={styles.loadingText}>Generating token…</ThemedText>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom bar: outside ScrollView, inside KAV */}
        <BottomBar
          selected={!!selectedPurpose}
          loading={submitMutation.isPending}
          disabled={isCtaDisabled}
          onPress={() => selectedPurpose && submitMutation.mutate(selectedPurpose)}
          safeBottom={insets.bottom}
        />
      </KeyboardAvoidingView>

      {/* ── Running Repair Modal ── */}
      <Modal
        visible={showRRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRRModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlayBackdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowRRModal(false)} />
          <Animated.View
            entering={FadeInDown.springify().damping(20)}
            style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Feather name="tool" size={16} color={D.brandRed} />
              </View>
              <ThemedText type="h4" style={[styles.modalTitle, { color: theme.text }]}>
                Running Repair
              </ThemedText>
              <Pressable onPress={() => setShowRRModal(false)} hitSlop={16} style={{ padding: 4 }}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Select the type of running repair
            </ThemedText>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: Spacing.sm }}>
                {rrSubItems.map((sub, i) => (
                  <Animated.View key={sub.key} entering={FadeInDown.delay(i * 55).springify()}>
                    <Pressable
                      onPress={() => handleRRSelect(sub)}
                      style={({ pressed }) => [
                        styles.modalItem,
                        {
                          backgroundColor: pressed ? D.brandRedLight : theme.backgroundDefault,
                          borderColor: pressed ? D.brandRed : theme.border,
                        },
                      ]}
                    >
                      <View style={styles.modalItemIcon}>
                        <Feather name="tool" size={13} color={D.brandRed} />
                      </View>
                      <ThemedText type="body" style={[styles.modalItemLabel, { color: theme.text }]}>
                        {sub.label}
                      </ThemedText>
                      <Feather name="chevron-right" size={15} color={theme.textSecondary} />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: D.screenBg },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: D.cardRadius,
    borderWidth: 1,
    borderColor: D.cardBorder,
    backgroundColor: D.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: D.avatarSize,
    height: D.avatarSize,
    borderRadius: D.avatarSize / 2,
    backgroundColor: D.brandRed,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  userCardCenter: { flex: 1, minWidth: 0, gap: 4 },
  userName: { fontSize: 14, fontWeight: "700", color: D.textPrimary },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: D.brandRedMid,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  roleText: { fontSize: 11, fontWeight: "600", color: D.brandRed },
  phonePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: Spacing.sm,
  },
  phoneText: { color: D.textPrimary, fontSize: 12, fontWeight: "600" },

  // Section
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: D.textPrimary },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.successGreen,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  selectedBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  // Errors
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF0F2",
    borderWidth: 1,
    borderColor: "#FFD0D8",
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { color: D.brandRed, flex: 1 },
  errorState: { alignItems: "center", paddingVertical: Spacing["2xl"] },
  errorStateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F3F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  errorStateText: { color: D.textSecondary, textAlign: "center", marginBottom: Spacing.md },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: D.brandRed,
    borderRadius: 20,
  },
  retryText: { color: "#FFF", fontWeight: "700" },

  // Tabs
  tabBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: Spacing.lg,
    backgroundColor: D.segmentedBg,
    borderRadius: 22,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabBtnSelected: {
    backgroundColor: D.segmentedSelectedBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnDefault: { backgroundColor: "transparent" },
  tabText: { fontWeight: "600", fontSize: 13 },
  tabTextSelected: { color: D.segmentedSelectedText },
  tabTextDefault: { color: D.segmentedUnselectedText },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCardWrap: { width: "48.5%", marginBottom: Spacing.md },
  gridCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: D.cardRadius,
    minHeight: D.cardMinHeight,
    borderWidth: 1.5,
    borderColor: D.cardBorder,
    backgroundColor: D.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardSelected: {
    borderColor: D.selectedCardBorder,
    borderWidth: 2,
    backgroundColor: D.selectedCardFill,
    shadowColor: D.brandRed,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: D.brandRed,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    backgroundColor: D.brandRedMid,
  },
  gridCardIconWrapSelected: { backgroundColor: D.brandRed },
  gridCardLabel: { textAlign: "center", fontWeight: "500", fontSize: 12, lineHeight: 17 },
  gridCardLabelDefault: { color: D.textPrimary },
  gridCardLabelSelected: { color: D.brandRed, fontWeight: "700" },
  gridCardLabelRow: { flexDirection: "row", alignItems: "center", gap: 3 },

  // Referral
  referralWrap: { marginTop: Spacing.xs, marginBottom: Spacing.md },
  referralDivider: { height: 1, backgroundColor: D.cardBorder, marginBottom: Spacing.md },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  referralQuestion: { flex: 1, fontSize: 13, fontWeight: "600", color: D.textPrimary, marginRight: Spacing.md },
  referralChipRow: { flexDirection: "row", gap: 6 },
  referralChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D4D8DA",
    backgroundColor: "#FFF",
  },
  chipYes: { backgroundColor: D.brandRed, borderColor: D.brandRed },
  chipNo: { backgroundColor: D.textSecondary, borderColor: D.textSecondary },
  chipText: { fontSize: 13, fontWeight: "600", color: D.textSecondary },
  chipTextActive: { color: "#FFF" },

  // Loading
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  loadingText: { color: D.textSecondary },

  // ─── FIX 1: Bottom bar — transparent, no border, no box shadow ───────────
  bottomBar: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.md,
    // transparent background = blends with grey screen, no "white box" look
    backgroundColor: "transparent",
    // no borderTopWidth, no shadow — button has its own shadow
  },

  // ─── FIX 2: CTA Button — pill shape, strong branded shadow ───────────────
  ctaButton: {
    height: D.buttonHeight,
    borderRadius: D.buttonRadius, // 100 = pill
    backgroundColor: D.brandRed,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: D.brandRed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaButtonInactive: {
    backgroundColor: "#C5CBD0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  ctaButtonPressed: { opacity: 0.88, shadowOpacity: 0.15 },
  ctaInner: { flexDirection: "row", alignItems: "center" },
  ctaText: { color: "#FFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "center", paddingHorizontal: Layout.horizontalScreenPadding },
  modalCard: {
    borderRadius: BorderRadius.md + 4,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm, gap: Spacing.sm },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: D.brandRedMid,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { flex: 1, fontWeight: "700" },
  modalSubtitle: { marginBottom: Spacing.md, paddingLeft: 42, fontSize: 13 },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  modalItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: D.brandRedMid,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  modalItemLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
});
