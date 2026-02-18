/**
 * Visitor Purpose screen: select visit reason and submit entry.
 * Receives entryType + formData from VisitorType (Home) or EntryForm.
 * On submit → TokenDisplay.
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequestWithAuthRetry, UNAUTHORIZED_MSG } from "@/lib/query-client";
import { isApiError } from "@/lib/api-error";
import { ENTRY_APP_CREATE_PATH } from "@/lib/api-endpoints";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  RootStackParamList,
  EntryType,
  EntryFormData,
} from "@/navigation/RootStackNavigator";
import { isPhoneValid, phoneForApi } from "@/utils/validation";
import {
  DP_ONBOARDING,
  DP_SETTLEMENT,
  DP_MAINTENANCE,
  RUNNING_REPAIR_SUB_ITEMS,
  NON_DP_PURPOSES,
  PURPOSE_DISPLAY_LABELS,
  PURPOSE_ICONS,
} from "@/constants/entryPurpose";

/** Screen-specific design tokens (purpose selection UI). */
const DESIGN = {
  screenBg: "#F6F7F9",
  cardBg: "#FFFFFF",
  cardBorder: "#E8EBEC",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 5,
  brandRed: "#B31D38",
  nameSize: 14,
  roleSize: 12,
  sectionTitleSize: 16,
  labelSize: 12,
  cardMinHeight: 80,
  buttonHeight: 48,
  buttonRadius: 24,
  avatarSize: 40,
  cardRadius: 12,
  segmentedBg: "#EBEDF1",
  segmentedSelectedBg: "#FFFFFF",
  segmentedSelectedText: "#B31D38",
  segmentedUnselectedText: "#3F4C52",
  selectedCardBorder: "#B31D38",
  selectedCardFill: "#FFF5F7",
  bottomBarBorder: "#E8EBEC",
  textPrimary: "#161B1D",
  textSecondary: "#3F4C52",
} as const;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorPurpose">;
type VisitorPurposeRouteProp = RouteProp<RootStackParamList, "VisitorPurpose">;

function PurposeGridCard({
  title,
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
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.gridCardWrap, animatedStyle]} entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        }}
        style={({ pressed }) => [
          styles.gridCard,
          selected && styles.gridCardSelected,
          {
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.gridCardIconWrap}>
        <Feather name={icon} size={20} color={DESIGN.brandRed} />
        </View>
        {showArrow ? (
          <View style={styles.gridCardLabelRow}>
            <ThemedText type="small" style={[styles.gridCardLabel, styles.gridCardLabelDark]} numberOfLines={2}>
              {displayTitle}
            </ThemedText>
            <Feather name="chevron-right" size={18} color={DESIGN.textSecondary} />
          </View>
        ) : (
          <ThemedText type="small" style={[styles.gridCardLabel, styles.gridCardLabelDark]} numberOfLines={2}>
            {displayTitle}
          </ThemedText>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function VisitorPurposeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VisitorPurposeRouteProp>();
  const { entryType, formData } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRunningRepairModal, setShowRunningRepairModal] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<"Settlement" | "Maintenance">("Settlement");
  const [selectedPurpose, setSelectedPurpose] = useState<{ categoryTitle: string | null; item: string } | null>(null);

  /** Unified DP: driver name + phone only → Onboarding; with vehicle number → Settlement + Maintenance. Do not disturb this logic — only UI matches design. */
  const hasVehicle = (formData.vehicle_reg_number ?? "").trim().length > 0;
  const effectiveEntryType: EntryType =
    entryType === "dp"
      ? hasVehicle
        ? "old_dp"
        : "new_dp"
      : entryType;
  const isDp = effectiveEntryType === "new_dp" || effectiveEntryType === "old_dp";

  const displayName = (formData.name ?? "").trim() || (user?.name ?? "").trim() || "—";
  const displayPhone = (formData.phone ?? "").trim() || (user?.phone ?? "").trim() || "—";
  const displayRole = isDp ? "Driver Partner" : "Staff";

  const getDisplayTitle = (item: string) => PURPOSE_DISPLAY_LABELS[item] ?? item;

  const getPurposeIcon = (item: string): keyof typeof Feather.glyphMap => {
    const icon = PURPOSE_ICONS[item];
    return (icon ?? "circle") as keyof typeof Feather.glyphMap;
  };

  /** assignee: Settlement/Onboarding → DRIVER MANAGER, Maintenance → FLEET EXECUTIVE, Non DP → empty */
  const getPurpose = (categoryTitle: string | null): string => {
    if (categoryTitle === "Maintenance") return "FLEET EXECUTIVE";
    else if (categoryTitle === "Settlement") return "DRIVER MANAGER";
    else if (categoryTitle === "Onboarding") return "ONBOARDING";
    else return ""; // non_dp
  };

  /** reason: combined like "Maintenance - Accident", "Settlement - DM collection"; non_dp just the item */
  const getReason = (categoryTitle: string | null, item: string): string => {
    if (categoryTitle) return `${categoryTitle} - ${item}`;
    return item;
  };

  const { accessToken, clearAuth } = useAuth();

  const submitMutation = useMutation({
    mutationFn: async ({
      categoryTitle,
      item,
    }: {
      categoryTitle: string | null;
      item: string;
    }) => {
      setSubmitError(null);
      const assignee = getPurpose(categoryTitle);
      const reason = getReason(categoryTitle, item);

      // Use form data as source of truth so edits after "Back" are sent; fall back to logged-in user only when form is empty
      let phone = (formData.phone ?? "").trim() || (user?.phone ?? "").trim();
      let name = (formData.name ?? "").trim() || (user?.name ?? "").trim();

      phone = phoneForApi(phone);
      if (!isPhoneValid(phone)) {
        throw new Error("Please enter a valid 10-digit mobile number.");
      }
      if (!name) {
        throw new Error("Driver name is required.");
      }

      const body: Record<string, string> = {
        type: effectiveEntryType,
        phone,
        name,
        assignee,
        reason,
      };
      if (effectiveEntryType === "old_dp") {
        const regNumber = (formData.vehicle_reg_number ?? "").trim();
        if (regNumber) body.reg_number = regNumber;
      }
      const response = await apiRequestWithAuthRetry("POST", ENTRY_APP_CREATE_PATH, body, accessToken);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmitError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const raw = data.data ?? data.results ?? data;
      const token = raw.tokenNo ?? raw.token_no ?? raw.token ?? raw.id ?? "";
      const assignee = raw.assignee ?? raw.assignee_name ?? raw.agent ?? "—";
      const desk_location = raw.deskLocation ?? raw.desk_location ?? raw.gate ?? raw.gate_name ?? "—";
      const purpose = raw.reason ?? raw.purpose;
      navigation.navigate("TokenDisplay", {
        token: String(token),
        assignee: String(assignee),
        desk_location: String(desk_location),
        driverName: formData.name?.trim() || undefined,
        driverPhone: formData.phone?.trim() || undefined,
        entryType: effectiveEntryType,
        purpose: purpose != null ? String(purpose) : undefined,
      });
    },
    onError: (error: Error) => {
      if (error.message === UNAUTHORIZED_MSG) {
        clearAuth();
        navigation.reset({ index: 0, routes: [{ name: "LoginOtp" }] });
        return;
      }
      const message = isApiError(error)
        ? error.message
        : (error.message || "Something went wrong. Please try again.");
      setSubmitError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleCardPress = (categoryTitle: string | null, item: string) => {
    const isRunningRepair = categoryTitle === "Maintenance" && item === "Running Repair";
    if (isRunningRepair) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowRunningRepairModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPurpose({ categoryTitle, item });
  };

  const handleNextPress = () => {
    if (!selectedPurpose) return;
    submitMutation.mutate(selectedPurpose);
  };

  const handleRunningRepairSubSelect = (subItem: string) => {
    setShowRunningRepairModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate({ categoryTitle: "Maintenance", item: `Running Repair - ${subItem}` });
  };



  const isSelected = (categoryTitle: string | null, item: string) =>
    selectedPurpose?.categoryTitle === categoryTitle && selectedPurpose?.item === item;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            styles.scrollContentFullScreen,
            {
              paddingTop: headerHeight + Spacing.lg,
              paddingBottom: Spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.userCard}>
            <View style={styles.userCardAvatar}>
              <Feather name="user" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.userCardCenter}>
              <ThemedText type="small" style={[styles.userCardName, styles.userCardTextDark]} numberOfLines={1}>
                {displayName}
              </ThemedText>
              <ThemedText type="small" style={[styles.userCardRole, styles.userCardRoleMuted]} numberOfLines={1}>
                {displayRole}
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.userCardPhone, styles.userCardTextDark]} numberOfLines={1}>
              {displayPhone}
            </ThemedText>
          </Animated.View>

          <ThemedText type="h6" style={[styles.sectionTitle, styles.sectionTitleDark]}>
            Select ticket for entry
          </ThemedText>

          {submitError != null && (
            <ThemedText type="small" style={[styles.errorText, { color: theme.error }]} numberOfLines={3}>
              {submitError}
            </ThemedText>
          )}

          {isDp ? (
            /* old_dp (vehicle number given): Settlement + Maintenance tabs — same design as above (user card, section title, grid cards, sticky Next). Functionality unchanged (Running Repair modal, assignee/reason). */
            effectiveEntryType === "old_dp" ? (
              <>
                <View style={styles.tabBar}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategoryTab("Settlement");
                    }}
                    style={[
                      styles.tabButton,
                      selectedCategoryTab === "Settlement" && styles.tabButtonSelected,
                      selectedCategoryTab !== "Settlement" && styles.tabButtonDefault,
                    ]}
                  >
                    <ThemedText
                      type="body"
                      style={[
                        styles.tabButtonText,
                        selectedCategoryTab === "Settlement" && styles.tabButtonTextSelected,
                        selectedCategoryTab !== "Settlement" && styles.tabButtonTextDefault,
                      ]}
                    >
                      Settlement 
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategoryTab("Maintenance");
                    }}
                    style={[
                      styles.tabButton,
                      selectedCategoryTab === "Maintenance" && styles.tabButtonSelected,
                      selectedCategoryTab !== "Maintenance" && styles.tabButtonDefault,
                    ]}
                  >
                    <ThemedText
                      type="body"
                      style={[
                        styles.tabButtonText,
                        selectedCategoryTab === "Maintenance" && styles.tabButtonTextSelected,
                        selectedCategoryTab !== "Maintenance" && styles.tabButtonTextDefault,
                      ]}
                    >
                      Maintenance
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.grid}>
                  {(selectedCategoryTab === "Settlement" ? DP_SETTLEMENT.items : DP_MAINTENANCE.items).map(
                    (item, index) => {
                      const categoryTitle = selectedCategoryTab;
                      const isRunningRepair = categoryTitle === "Maintenance" && item === "Running Repair";
                      return (
                        <PurposeGridCard
                          key={item}
                          title={item}
                          displayTitle={getDisplayTitle(item)}
                          icon={getPurposeIcon(item)}
                          delay={80 + index * 50}
                          onPress={() => handleCardPress(categoryTitle, item)}
                          selected={!isRunningRepair && isSelected(categoryTitle, item)}
                          showArrow={isRunningRepair}
                        />
                      );
                    }
                  )}
                </View>
              </>
            ) : (
              <View style={styles.grid}>
                {DP_ONBOARDING.items.map((item, index) => (
                  <PurposeGridCard
                    key={item}
                    title={item}
                    displayTitle={getDisplayTitle(item)}
                    icon={getPurposeIcon(item)}
                    delay={80 + index * 50}
                    onPress={() => handleCardPress("Onboarding", item)}
                    selected={isSelected("Onboarding", item)}
                  />
                ))}
              </View>
            )
          ) : (
            <View style={styles.grid}>
              {NON_DP_PURPOSES.map((item, index) => (
                <PurposeGridCard
                  key={item}
                  title={item}
                  displayTitle={getDisplayTitle(item)}
                  icon={getPurposeIcon(item)}
                  delay={80 + index * 50}
                  onPress={() => handleCardPress(null, item)}
                  selected={isSelected(null, item)}
                />
              ))}
            </View>
          )}

          {submitMutation.isPending && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={DESIGN.brandRed} />
              <ThemedText type="small" style={styles.loadingText}>
                Generating token…
              </ThemedText>
            </View>
          )}
        </ScrollView>

        <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <Pressable
            onPress={handleNextPress}
            disabled={!selectedPurpose || submitMutation.isPending}
            style={({ pressed }) => [
              styles.nextButton,
              (!selectedPurpose || submitMutation.isPending) ? styles.nextButtonDisabled : {},
              pressed && selectedPurpose && !submitMutation.isPending && styles.nextButtonPressed,
            ]}
          >
            <ThemedText type="label" style={styles.nextButtonText}>
              Next
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Running Repair sub-options modal */}
      <Modal
        visible={showRunningRepairModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRunningRepairModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlayBackdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowRunningRepairModal(false)}
          />
          <View style={[styles.runningRepairModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4" style={{ color: theme.text }}>
                Running Repair
              </ThemedText>
              <Pressable
                onPress={() => setShowRunningRepairModal(false)}
                hitSlop={Spacing.lg}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Select the type of running repair
            </ThemedText>
            <View style={styles.modalItems}>
              {RUNNING_REPAIR_SUB_ITEMS.map((subItem) => (
                <Pressable
                  key={subItem}
                  onPress={() => handleRunningRepairSubSelect(subItem)}
                  style={({ pressed }) => [
                    styles.modalItemCard,
                    {
                      backgroundColor: theme.backgroundDefault,
                      opacity: pressed ? 0.9 : 1,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText type="body" style={{ color: theme.text }}>
                    {subItem}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DESIGN.screenBg,
  },
  container: {
    flex: 1,
    backgroundColor: DESIGN.screenBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.horizontalScreenPadding,
  },
  scrollContentFullScreen: {
    flexGrow: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: DESIGN.cardRadius,
    borderWidth: 1,
    borderColor: DESIGN.cardBorder,
    backgroundColor: DESIGN.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: DESIGN.elevation,
  },
  userCardAvatar: {
    width: DESIGN.avatarSize,
    height: DESIGN.avatarSize,
    borderRadius: DESIGN.avatarSize / 2,
    backgroundColor: DESIGN.brandRed,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  userCardCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  userCardName: {
    fontSize: DESIGN.nameSize,
    fontWeight: "600",
    marginBottom: 2,
  },
  userCardRole: {
    fontSize: DESIGN.roleSize,
    fontWeight: "400",
  },
  userCardPhone: {
    fontSize: DESIGN.nameSize,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  userCardTextDark: {
    color: DESIGN.textPrimary,
  },
  userCardRoleMuted: {
    color: DESIGN.textSecondary,
  },
  sectionTitle: {
    fontSize: DESIGN.sectionTitleSize,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  sectionTitleDark: {
    color: DESIGN.textPrimary,
  },
  categorySubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  categorySubtitleMuted: {
    color: DESIGN.textSecondary,
  },
  errorText: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: Spacing.lg,
    backgroundColor: DESIGN.segmentedBg,
    borderRadius: 24,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonSelected: {
    backgroundColor: DESIGN.segmentedSelectedBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonDefault: {
    backgroundColor: "transparent",
  },
  tabButtonText: {
    fontWeight: "600",
  },
  tabButtonTextSelected: {
    color: DESIGN.segmentedSelectedText,
  },
  tabButtonTextDefault: {
    color: DESIGN.segmentedUnselectedText,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCardWrap: {
    width: "48%",
    marginBottom: Spacing.md,
  },
  gridCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: DESIGN.cardRadius,
    minHeight: DESIGN.cardMinHeight,
    borderWidth: 1,
    borderColor: DESIGN.cardBorder,
    backgroundColor: DESIGN.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: DESIGN.elevation,
  },
  gridCardSelected: {
    borderColor: DESIGN.selectedCardBorder,
    borderWidth: 2,
    backgroundColor: DESIGN.selectedCardFill,
  },
  gridCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    backgroundColor: "#F5DADF",
  },
  gridCardLabel: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: DESIGN.labelSize,
  },
  gridCardLabelDark: {
    color: DESIGN.textPrimary,
  },
  gridCardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  loadingText: {
    color: DESIGN.textSecondary,
    marginTop: Spacing.sm,
  },
  stickyBottom: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.sm,
    backgroundColor: DESIGN.cardBg,
    borderTopWidth: 1,
    borderTopColor: DESIGN.bottomBarBorder,
  },
  nextButton: {
    height: DESIGN.buttonHeight,
    borderRadius: DESIGN.buttonRadius,
    backgroundColor: DESIGN.brandRed,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonPressed: {
    opacity: 0.9,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.95,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Layout.horizontalScreenPadding,
  },
  runningRepairModalContent: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  modalSubtitle: {
    marginBottom: Spacing.md,
  },
  modalItems: {
    gap: Spacing.sm,
  },
  modalItemCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
