/**
 * OnboardingPurposeScreen — Select onboarding purpose only.
 * Single responsibility: show onboarding items from config, referral block, submit same payload.
 */
import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing } from "@/constants/theme";
import { createTicket } from "@/apis";
import { UnauthorizedError } from "@/api/requestClient";
import { SERVER_UNAVAILABLE_MSG } from "@/lib/server-unavailable";
import { isApiError } from "@/lib/api-error";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatPurposeDisplay } from "@/constants/entryPurpose";
import { usePurposeConfig } from "@/hooks/usePurposeConfig";
import { PurposeGridShimmer } from "@/components/Shimmer";
import { ReferralSection } from "@/components/ReferralSection";
import { buildEntryPayload } from "@/lib/entrySubmit";
import { AppIcon } from "@/components/AppIcon";
import type { PurposeConfigItem } from "@/types/purposeConfig";
import type { IconLibrary } from "@/types/purposeConfig";

const D = {
  screenBg: "#F6F7F9",
  cardBg: "#FFFFFF",
  cardBorder: "#E8EBEC",
  brandRed: "#B31D38",
  brandRedMid: "#F5DADF",
  textPrimary: "#161B1D",
  textSecondary: "#5C6B72",
  successGreen: "#1A8A4A",
  cardRadius: 14,
  buttonHeight: 52,
  avatarSize: 42,
  cardMinHeight: 88,
  selectedCardBorder: "#B31D38",
  selectedCardFill: "#FFF5F7",
} as const;

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "OnboardingPurpose"
>;
type RoutePropType = RouteProp<RootStackParamList, "OnboardingPurpose">;

function PurposeGridCard({
  displayTitle,
  iconKey,
  iconLibrary = "feather",
  onPress,
  selected,
  delay,
  isDark,
  theme,
}: {
  displayTitle: string;
  iconKey: string;
  iconLibrary?: IconLibrary;
  onPress: () => void;
  selected: boolean;
  delay: number;
  isDark?: boolean;
  theme?: {
    backgroundDefault: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
  };
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardBg =
    isDark && theme
      ? selected
        ? theme.backgroundDefault
        : theme.backgroundDefault
      : undefined;
  const cardBorder = isDark && theme ? theme.border : undefined;
  const iconWrapBg =
    isDark && theme
      ? selected
        ? theme.primary
        : theme.backgroundDefault
      : undefined;
  const iconColor =
    isDark && theme
      ? selected
        ? "#FFF"
        : theme.primary
      : selected
        ? "#FFF"
        : D.brandRed;
  const labelColor =
    isDark && theme ? (selected ? theme.text : theme.textSecondary) : undefined;

  return (
    <Animated.View
      style={styles.gridCardWrap}
      entering={FadeInDown.delay(delay).springify()}
    >
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            scale.value = withSpring(0.94, { damping: 18, stiffness: 220 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 18, stiffness: 220 });
          }}
          style={[
            styles.gridCard,
            selected && styles.gridCardSelected,
            isDark &&
              cardBg !== undefined && {
                backgroundColor: cardBg,
                borderColor: cardBorder,
              },
          ]}
        >
          {selected && (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={styles.selectedDot}
            >
              <Feather name="check" size={9} color="#FFF" />
            </Animated.View>
          )}
          <View
            style={[
              styles.gridCardIconWrap,
              selected && styles.gridCardIconWrapSelected,
              isDark &&
                iconWrapBg !== undefined && { backgroundColor: iconWrapBg },
            ]}
          >
            <AppIcon
              name={iconKey || "circle"}
              library={iconLibrary}
              size={20}
              color={iconColor}
            />
          </View>
          <ThemedText
            type="small"
            style={[
              styles.gridCardLabel,
              selected
                ? styles.gridCardLabelSelected
                : styles.gridCardLabelDefault,
              isDark && labelColor !== undefined && { color: labelColor },
            ]}
            numberOfLines={2}
          >
            {displayTitle}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function ReferralBlock({
  referral,
  referralName,
  onReferralChange,
  onReferralNameChange,
  onClear,
  accessToken,
  onInputFocus,
  isDark,
  theme,
}: {
  referral: "yes" | "no";
  referralName: string;
  onReferralChange: (v: "yes" | "no") => void;
  onReferralNameChange: (v: string) => void;
  onClear: () => void;
  accessToken: string | null;
  onInputFocus?: () => void;
  isDark?: boolean;
  theme?: {
    text: string;
    textSecondary: string;
    border: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    primary: string;
    onPrimary: string;
  };
}) {
  const dividerBg = isDark && theme ? theme.border : undefined;
  const questionColor = isDark && theme ? theme.text : undefined;
  const chipBg = isDark && theme ? theme.backgroundSecondary : undefined;
  const chipBorder = isDark && theme ? theme.border : undefined;
  const chipYesBg = isDark && theme ? theme.primary : undefined;
  const chipNoBg = isDark && theme ? theme.backgroundTertiary : undefined;
  const chipTextColor = isDark && theme ? theme.textSecondary : undefined;
  const chipTextActiveColor = isDark && theme ? theme.onPrimary : undefined;

  return (
    <Animated.View
      entering={FadeInDown.duration(260).springify()}
      style={styles.referralWrap}
    >
      <View
        style={[
          styles.referralDivider,
          isDark && dividerBg && { backgroundColor: dividerBg },
        ]}
      />
      <View style={styles.referralRow}>
        <ThemedText
          type="small"
          style={[
            styles.referralQuestion,
            isDark && questionColor && { color: questionColor },
          ]}
        >
          Was this driver referred by someone?
        </ThemedText>
        <View style={styles.referralChipRow}>
          {(["yes", "no"] as const).map((val) => (
            <Pressable
              key={val}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onReferralChange(val);
                if (val === "no") {
                  onClear();
                  Keyboard.dismiss();
                }
              }}
              style={[
                styles.referralChip,
                isDark &&
                  chipBg !== undefined && {
                    backgroundColor: chipBg,
                    borderColor: chipBorder,
                  },
                referral === val &&
                  (val === "yes"
                    ? isDark && theme && chipYesBg
                      ? {
                          backgroundColor: chipYesBg,
                          borderColor: theme.primary,
                        }
                      : styles.chipYes
                    : isDark && theme && chipNoBg
                      ? {
                          backgroundColor: chipNoBg,
                          borderColor: theme.border,
                        }
                      : styles.chipNo),
              ]}
            >
              <ThemedText
                type="small"
                style={[
                  styles.chipText,
                  isDark &&
                    chipTextColor !== undefined && {
                      color:
                        referral === val ? chipTextActiveColor : chipTextColor,
                    },
                  referral === val && !isDark && styles.chipTextActive,
                ]}
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

export default function OnboardingPurposeScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { formData } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { accessToken, clearAuth } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const { theme, isDark } = useTheme();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [referral, setReferral] = useState<"yes" | "no">("no");
  const [referralName, setReferralName] = useState("");

  const displayName =
    (formData.name ?? "").trim() || (user?.name ?? "").trim() || "—";
  const displayPhone =
    (formData.phone ?? "").trim() || (user?.phone ?? "").trim() || "—";

  const {
    data: purposeConfig,
    isLoading: configLoading,
    isRefetching: configRefetching,
    isError: configError,
    error: configErrorObj,
    refetch: refetchConfig,
  } = usePurposeConfig();
  const onboardingCategory = purposeConfig?.find((c) => c.dp_type === "new_dp");
  const items = onboardingCategory?.items ?? [];

  const submitMutation = useMutation({
    mutationFn: async (subCategory: string) => {
      setSubmitError(null);
      const body = buildEntryPayload({
        formData,
        category: "Onboarding",
        subCategory,
        referral,
        referralName,
        userPhone: user?.phone,
        userName: user?.name,
      });
      return await createTicket(body, accessToken);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const raw = (data.data ?? data.results ?? data) as Record<
        string,
        unknown
      >;
      const token = raw.tokenNo ?? raw.token_no ?? raw.token ?? raw.id ?? "";
      const assignee = raw.assignee ?? raw.assignee_name ?? raw.agent ?? "—";
      const desk_location =
        raw.deskLocation ??
        raw.desk_location ??
        raw.gate ??
        raw.gate_name ??
        "—";
      const cat = raw.category ?? raw.category_name;
      const sub = raw.subCategory ?? raw.sub_category;
      const purposeStr =
        cat != null && sub != null
          ? formatPurposeDisplay(String(cat), String(sub))
          : (raw.reason ?? raw.purpose);
      const apiType = raw.type ?? raw.entry_type ?? "new_dp";
      navigation.navigate("TokenDisplay", {
        token: String(token),
        assignee: String(assignee),
        desk_location: String(desk_location),
        driverName: formData.name?.trim() || undefined,
        driverPhone: formData.phone?.trim() || undefined,
        entryType: apiType != null ? String(apiType) : "new_dp",
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
      setSubmitError(
        isApiError(error)
          ? error.message
          : error.message || "Something went wrong.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleCardPress = (itemKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedItem((prev) => (prev === itemKey ? null : itemKey));
  };

  const handleConfirm = () => {
    if (!selectedItem) return;
    submitMutation.mutate(selectedItem);
  };

  const bottomBarHeight =
    Spacing.md + D.buttonHeight + Spacing.sm + insets.bottom;
  const showReferral = selectedItem !== null;
  const isCtaDisabled =
    !selectedItem ||
    submitMutation.isPending ||
    configLoading ||
    !!configError ||
    !purposeConfig;

  const safeAreaBg = isDark ? theme.backgroundRoot : D.screenBg;
  const userCardBg = isDark ? theme.backgroundDefault : D.cardBg;
  const userCardBorder = isDark ? theme.border : D.cardBorder;

  return (
    <SafeAreaView
      style={[styles.safeArea, isDark && { backgroundColor: safeAreaBg }]}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomBarHeight },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Animated.View
            entering={FadeInDown.delay(0).springify()}
            style={[
              styles.userCard,
              isDark && {
                backgroundColor: userCardBg,
                borderColor: userCardBorder,
              },
            ]}
          >
            <View style={styles.avatar}>
              <Feather name="user" size={18} color="#FFF" />
            </View>
            <View style={styles.userCardCenter}>
              <ThemedText
                type="small"
                style={styles.userName}
                numberOfLines={1}
              >
                {displayName}
              </ThemedText>
              <View style={styles.rolePill}>
                <ThemedText type="small" style={styles.roleText}>
                  Driver Partner
                </ThemedText>
              </View>
            </View>
            <View style={styles.phonePill}>
              <Feather
                name="phone"
                size={11}
                color={D.brandRed}
                style={{ marginRight: 4 }}
              />
              <ThemedText
                type="small"
                style={styles.phoneText}
                numberOfLines={1}
              >
                {displayPhone}
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            style={styles.sectionRow}
          >
            <ThemedText type="h6" style={styles.sectionTitle}>
              Select purpose
            </ThemedText>
            {selectedItem && (
              <Animated.View
                entering={FadeIn.duration(220)}
                style={styles.selectedBadge}
              >
                <Feather name="check-circle" size={12} color="#FFF" />
                <ThemedText type="small" style={styles.selectedBadgeText}>
                  Selected
                </ThemedText>
              </Animated.View>
            )}
          </Animated.View>

          {submitError != null && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.errorBanner}
            >
              <Feather
                name="alert-circle"
                size={14}
                color={D.brandRed}
                style={{ marginRight: 6 }}
              />
              <ThemedText
                type="small"
                style={styles.errorText}
                numberOfLines={3}
              >
                {submitError}
              </ThemedText>
            </Animated.View>
          )}

          {(configLoading || configRefetching) && !purposeConfig ? (
            <PurposeGridShimmer />
          ) : configError ? (
            <View style={styles.errorState}>
              <View style={styles.errorStateIcon}>
                <Feather name="wifi-off" size={26} color={D.textSecondary} />
              </View>
              <ThemedText type="small" style={styles.errorStateText}>
                {(configErrorObj as Error)?.message ??
                  "Failed to load options."}
              </ThemedText>
              <Pressable
                onPress={() => refetchConfig()}
                style={styles.retryBtn}
              >
                <Feather
                  name="refresh-cw"
                  size={13}
                  color="#FFF"
                  style={{ marginRight: 6 }}
                />
                <ThemedText type="label" style={styles.retryText}>
                  Retry
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.grid}>
              {items.map((item: PurposeConfigItem, i: number) => (
                <PurposeGridCard
                  key={item.key}
                  displayTitle={item.label}
                  iconKey={item.icon_key || "circle"}
                  iconLibrary={item.icon_library}
                  delay={80 + i * 45}
                  onPress={() => handleCardPress(item.key)}
                  selected={selectedItem === item.key}
                  isDark={isDark}
                  theme={theme}
                />
              ))}
            </View>
          )}

          {showReferral && (
            <ReferralBlock
              referral={referral}
              referralName={referralName}
              onReferralChange={(v) => {
                setReferral(v);
                if (v === "yes")
                  setTimeout(
                    () =>
                      scrollViewRef.current?.scrollToEnd({ animated: true }),
                    260,
                  );
                else setReferralName("");
                Keyboard.dismiss();
              }}
              onReferralNameChange={setReferralName}
              onClear={() => setReferralName("")}
              accessToken={accessToken}
              onInputFocus={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
              isDark={isDark}
              theme={theme}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + Spacing.sm },
          isDark && { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={isCtaDisabled}
          style={({ pressed }) => [
            styles.ctaButton,
            isDark && {
              backgroundColor: isCtaDisabled
                ? theme.backgroundTertiary
                : theme.primary,
            },
            !selectedItem && !isDark && styles.ctaButtonInactive,
            pressed &&
              selectedItem &&
              !submitMutation.isPending &&
              styles.ctaButtonPressed,
          ]}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator
              size="small"
              color={isDark ? theme.onPrimary : "#FFF"}
            />
          ) : (
            <View style={styles.ctaInner}>
              <ThemedText
                type="label"
                style={[
                  styles.ctaText,
                  isDark && {
                    color: isCtaDisabled
                      ? theme.textSecondary
                      : theme.onPrimary,
                  },
                ]}
              >
                {selectedItem ? "Confirm & Generate Token" : "Select a Purpose"}
              </ThemedText>
              {selectedItem && (
                <Feather
                  name="arrow-right"
                  size={17}
                  color={isDark ? theme.onPrimary : "#FFF"}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: D.screenBg },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.md,
    flexGrow: 1,
  },
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
  errorStateText: {
    color: D.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: D.brandRed,
    borderRadius: 20,
  },
  retryText: { color: "#FFF", fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
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
  gridCardLabel: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: 12,
    lineHeight: 17,
  },
  gridCardLabelDefault: { color: D.textPrimary },
  gridCardLabelSelected: { color: D.brandRed, fontWeight: "700" },
  referralWrap: { marginTop: Spacing.xs, marginBottom: Spacing.md },
  referralDivider: {
    height: 1,
    backgroundColor: D.cardBorder,
    marginBottom: Spacing.md,
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  referralQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: D.textPrimary,
    marginRight: Spacing.md,
  },
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
  bottomBar: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.md,
    backgroundColor: "transparent",
  },
  ctaButton: {
    height: D.buttonHeight,
    borderRadius: 100,
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
  ctaText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
