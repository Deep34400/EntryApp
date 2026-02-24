/**
 * MaintenancePurposeScreen — Select maintenance purpose only.
 * Single responsibility: show maintenance items from config, Running Repair sub-modal, submit same payload.
 */
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
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
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
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
import { buildEntryPayload } from "@/lib/entrySubmit";
import type {
  PurposeConfigItem,
  PurposeConfigSubItem,
} from "@/types/purposeConfig";

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
  cardRadius: 14,
  buttonHeight: 52,
  avatarSize: 42,
  cardMinHeight: 88,
  selectedCardBorder: "#B31D38",
  selectedCardFill: "#FFF5F7",
} as const;

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "MaintenancePurpose"
>;
type RoutePropType = RouteProp<RootStackParamList, "MaintenancePurpose">;

function PurposeGridCard({
  displayTitle,
  icon,
  onPress,
  selected,
  showArrow = false,
  delay,
}: {
  displayTitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  selected: boolean;
  showArrow?: boolean;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
          style={[styles.gridCard, selected && styles.gridCardSelected]}
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
            ]}
          >
            <Feather
              name={icon}
              size={20}
              color={selected ? "#FFF" : D.brandRed}
            />
          </View>
          {showArrow ? (
            <View style={styles.gridCardLabelRow}>
              <ThemedText
                type="small"
                style={[
                  styles.gridCardLabel,
                  selected
                    ? styles.gridCardLabelSelected
                    : styles.gridCardLabelDefault,
                ]}
                numberOfLines={2}
              >
                {displayTitle}
              </ThemedText>
              <Feather
                name="chevron-right"
                size={14}
                color={selected ? D.brandRed : D.textSecondary}
              />
            </View>
          ) : (
            <ThemedText
              type="small"
              style={[
                styles.gridCardLabel,
                selected
                  ? styles.gridCardLabelSelected
                  : styles.gridCardLabelDefault,
              ]}
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

export default function MaintenancePurposeScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { formData } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useUser();
  const { accessToken, clearAuth } = useAuth();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showRRModal, setShowRRModal] = useState(false);

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
  const maintenanceCategory = purposeConfig?.find(
    (c) => c.key === "maintenance",
  );
  const items = maintenanceCategory?.items ?? [];
  const rrSubItems: PurposeConfigSubItem[] =
    maintenanceCategory?.items.find((i) => i.key === "Running Repair")
      ?.sub_items ?? [];

  const getIcon = (key: string): keyof typeof Feather.glyphMap =>
    key && Feather.glyphMap[key as keyof typeof Feather.glyphMap]
      ? (key as keyof typeof Feather.glyphMap)
      : "circle";

  const submitMutation = useMutation({
    mutationFn: async (subCategory: string) => {
      setSubmitError(null);
      const body = buildEntryPayload({
        formData,
        category: "Maintenance",
        subCategory,
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
      const apiType = raw.type ?? raw.entry_type ?? "old_dp";
      navigation.navigate("TokenDisplay", {
        token: String(token),
        assignee: String(assignee),
        desk_location: String(desk_location),
        driverName: formData.name?.trim() || undefined,
        driverPhone: formData.phone?.trim() || undefined,
        entryType: apiType != null ? String(apiType) : "old_dp",
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
    if (itemKey === "Running Repair") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowRRModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedItem((prev) => (prev === itemKey ? null : itemKey));
  };

  const handleRRSelect = (sub: PurposeConfigSubItem) => {
    setShowRRModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate(`Running Repair - ${sub.key}`);
  };

  const handleConfirm = () => {
    if (!selectedItem) return;
    submitMutation.mutate(selectedItem);
  };

  const bottomBarHeight =
    Spacing.md + D.buttonHeight + Spacing.sm + insets.bottom;
  const isCtaDisabled =
    !selectedItem ||
    submitMutation.isPending ||
    configLoading ||
    !!configError ||
    !purposeConfig;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomBarHeight },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.userCard}
        >
          <View style={styles.avatar}>
            <Feather name="user" size={18} color="#FFF" />
          </View>
          <View style={styles.userCardCenter}>
            <ThemedText type="small" style={styles.userName} numberOfLines={1}>
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
            <ThemedText type="small" style={styles.phoneText} numberOfLines={1}>
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
            <ThemedText type="small" style={styles.errorText} numberOfLines={3}>
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
              {(configErrorObj as Error)?.message ?? "Failed to load options."}
            </ThemedText>
            <Pressable onPress={() => refetchConfig()} style={styles.retryBtn}>
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
            {items.map((item: PurposeConfigItem, i: number) => {
              const isRR = item.key === "Running Repair";
              return (
                <PurposeGridCard
                  key={item.key}
                  displayTitle={item.label}
                  icon={getIcon(item.icon_key)}
                  delay={80 + i * 45}
                  onPress={() => handleCardPress(item.key)}
                  selected={!isRR && selectedItem === item.key}
                  showArrow={isRR}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + Spacing.sm },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={isCtaDisabled}
          style={({ pressed }) => [
            styles.ctaButton,
            !selectedItem && styles.ctaButtonInactive,
            pressed &&
              selectedItem &&
              !submitMutation.isPending &&
              styles.ctaButtonPressed,
          ]}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={styles.ctaInner}>
              <ThemedText type="label" style={styles.ctaText}>
                {selectedItem ? "Confirm & Generate Token" : "Select a Purpose"}
              </ThemedText>
              {selectedItem && (
                <Feather
                  name="arrow-right"
                  size={17}
                  color="#FFF"
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
          )}
        </Pressable>
      </View>

      <Modal
        visible={showRRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRRModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.overlayBackdrop },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowRRModal(false)}
          />
          <Animated.View
            entering={FadeInDown.springify().damping(20)}
            style={[
              styles.modalCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Feather name="tool" size={16} color={D.brandRed} />
              </View>
              <ThemedText
                type="h4"
                style={[styles.modalTitle, { color: theme.text }]}
              >
                Running Repair
              </ThemedText>
              <Pressable
                onPress={() => setShowRRModal(false)}
                hitSlop={16}
                style={{ padding: 4 }}
              >
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText
              type="small"
              style={[styles.modalSubtitle, { color: theme.textSecondary }]}
            >
              Select the type of running repair
            </ThemedText>
            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: Spacing.sm }}>
                {rrSubItems.map((sub, i) => (
                  <Animated.View
                    key={sub.key}
                    entering={FadeInDown.delay(i * 55).springify()}
                  >
                    <Pressable
                      onPress={() => handleRRSelect(sub)}
                      style={({ pressed }) => [
                        styles.modalItem,
                        {
                          backgroundColor: pressed
                            ? D.brandRedLight
                            : theme.backgroundDefault,
                          borderColor: pressed ? D.brandRed : theme.border,
                        },
                      ]}
                    >
                      <View style={styles.modalItemIcon}>
                        <Feather name="tool" size={13} color={D.brandRed} />
                      </View>
                      <ThemedText
                        type="body"
                        style={[styles.modalItemLabel, { color: theme.text }]}
                      >
                        {sub.label}
                      </ThemedText>
                      <Feather
                        name="chevron-right"
                        size={15}
                        color={theme.textSecondary}
                      />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: D.screenBg },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.lg,
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
  gridCardLabelRow: { flexDirection: "row", alignItems: "center", gap: 3 },
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Layout.horizontalScreenPadding,
  },
  modalCard: {
    borderRadius: BorderRadius.md + 4,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
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
