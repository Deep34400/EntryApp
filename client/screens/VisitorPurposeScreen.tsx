import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorPurpose">;
type VisitorPurposeRouteProp = RouteProp<RootStackParamList, "VisitorPurpose">;

// ----- DP purposes: New DP gets only Onboarding; Old DP gets Settlement + Maintenance -----
export const DP_ONBOARDING = {
  title: "Onboarding",
  items: ["Enquiry", "New Registration", "Training", "Documentation"],
} as const;

export const DP_SETTLEMENT = {
  title: "Settlement",
  items: [
    "DM collection",
    "Settlement",
    "Car Drop",
    "Car Exchange",
    "Scheme Change",
    "Rejoining",
  ],
} as const;

export const DP_MAINTENANCE = {
  title: "Maintenance",
  items: ["Accident", "PMS", "Running Repair", "Washing"],
} as const;

/** Sub-options when user taps "Running Repair" — shown in a modal */
export const RUNNING_REPAIR_SUB_ITEMS = [
  "Part missing",
  "Mechanical Electrical fault",
  "Car bodyshop",
  "Repair Parking",
] as const;

/** Categories to show for New DP only (Onboarding). */
export const NEW_DP_CATEGORIES = [DP_ONBOARDING] as const;

/** Categories to show for Old DP only (Settlement + Maintenance). */
export const OLD_DP_CATEGORIES = [DP_SETTLEMENT, DP_MAINTENANCE] as const;

/** Icons for purpose grid cards (Feather names) */
const PURPOSE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  "DM collection": "credit-card",
  Settlement: "file-text",
  "Car Drop": "truck",
  "Car Exchange": "repeat",
  "Scheme Change": "sliders",
  Rejoining: "user-plus",
  Accident: "alert-triangle",
  PMS: "settings",
  "Running Repair": "tool",
  Washing: "droplet",
  Enquiry: "help-circle",
  "New Registration": "user-plus",
  Training: "book-open",
  Documentation: "file-text",
  "Self Recovery (QC)": "shield",
  Abscond: "alert-circle",
  Testing: "activity",
  "Police Station": "map-pin",
  "Test Drive": "truck",
  "Hub-Personal use": "home",
};

// ----- Non DP purposes: flat list -----
export const NON_DP_PURPOSES = [
  "Self Recovery (QC)",
  "Abscond",
  "Testing",
  "Police Station",
  "Test Drive",
  "Hub-Personal use",
] as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PurposeItem({
  title,
  delay,
  onPress,
  theme,
  showArrow = false,
}: {
  title: string;
  delay: number;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  showArrow?: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        }}
        style={[
          styles.itemCard,
          {
            backgroundColor: theme.backgroundDefault,
            shadowColor: theme.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          },
          animatedStyle,
        ]}
      >
        <ThemedText type="body" style={styles.itemTitle} numberOfLines={3}>
          {title}
        </ThemedText>
        {showArrow ? (
          <Feather name="chevron-right" size={22} color={theme.textSecondary} style={styles.itemCardArrow} />
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

function PurposeGridCard({
  title,
  icon,
  onPress,
  theme,
  showArrow = false,
  delay,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
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
          {
            backgroundColor: theme.backgroundDefault,
            opacity: pressed ? 0.92 : 1,
            shadowColor: theme.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        <View style={[styles.gridCardIconWrap, { backgroundColor: theme.primary }]}>
          <Feather name={icon} size={22} color={theme.onPrimary} />
        </View>
        {showArrow ? (
          <View style={styles.gridCardLabelRow}>
            <ThemedText type="small" style={[styles.gridCardLabel, { color: theme.text }]} numberOfLines={2}>
              {title}
            </ThemedText>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </View>
        ) : (
          <ThemedText type="small" style={[styles.gridCardLabel, { color: theme.text }]} numberOfLines={2}>
            {title}
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

  const isDp = entryType === "new_dp" || entryType === "old_dp";

  const getPurposeIcon = (item: string): keyof typeof Feather.glyphMap => {
    const key = item in PURPOSE_ICONS ? item : (item as string);
    return PURPOSE_ICONS[key] ?? "circle";
  };

  /** assignee: Settlement/Onboarding → DRIVER MANAGER, Maintenance → FLEET MANAGER, Non DP → empty */
  const getPurpose = (categoryTitle: string | null): string => {
    if (categoryTitle === "Maintenance") return "FLEET MANAGER";
    if (categoryTitle === "Settlement" || categoryTitle === "Onboarding") return "DRIVER MANAGER";
    return ""; // non_dp
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
        type: entryType,
        phone,
        name,
        assignee,
        reason,
      };
      if (entryType === "old_dp") {
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
      navigation.navigate("TokenDisplay", {
        token: String(token),
        assignee: String(assignee),
        desk_location: String(desk_location),
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

  const handleSelectPurpose = (categoryTitle: string | null, item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate({ categoryTitle, item });
  };

  const handleRunningRepairPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRunningRepairModal(true);
  };

  const handleRunningRepairSubSelect = (subItem: string) => {
    setShowRunningRepairModal(false);
    handleSelectPurpose("Maintenance", `Running Repair - ${subItem}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          styles.scrollContentFullScreen,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: Math.max(insets.bottom, Spacing.sm) + Spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={[
            styles.headerCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              shadowColor: theme.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            },
          ]}
        >
          <View style={[styles.headerCardIconWrap, { backgroundColor: theme.primary }]}>
            <Feather name="shield" size={20} color={theme.onPrimary} />
          </View>
          <View style={styles.headerCardText}>
            <ThemedText type="h4" style={[styles.headerCardTitle, { color: theme.text }]}>
              Select Purpose
            </ThemedText>
            <ThemedText type="body" style={[styles.headerCardDesc, { color: theme.textSecondary }]}>
              {isDp
                ? "Choose the visitor's purpose to generate a secure gate pass."
                : "Select purpose for Non DP entry."}
            </ThemedText>
          </View>
        </Animated.View>

        {submitError != null && (
          <ThemedText
            type="small"
            style={[styles.errorText, { color: theme.error }]}
            numberOfLines={3}
          >
            {submitError}
          </ThemedText>
        )}

        {isDp ? (
          entryType === "old_dp" ? (
            <>
              <View style={styles.tabBar}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategoryTab("Settlement");
                  }}
                  style={[
                    styles.tabButton,
                    selectedCategoryTab === "Settlement" && {
                      backgroundColor: theme.primary,
                    },
                    selectedCategoryTab !== "Settlement" && {
                      backgroundColor: theme.backgroundDefault,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="body"
                    style={[
                      styles.tabButtonText,
                      { color: selectedCategoryTab === "Settlement" ? theme.buttonText : theme.text },
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
                    selectedCategoryTab === "Maintenance" && {
                      backgroundColor: theme.primary,
                    },
                    selectedCategoryTab !== "Maintenance" && {
                      backgroundColor: theme.backgroundDefault,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="body"
                    style={[
                      styles.tabButtonText,
                      { color: selectedCategoryTab === "Maintenance" ? theme.buttonText : theme.text },
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
                        icon={getPurposeIcon(item)}
                        delay={80 + index * 50}
                        onPress={
                          isRunningRepair
                            ? handleRunningRepairPress
                            : () => handleSelectPurpose(categoryTitle, item)
                        }
                        theme={theme}
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
                  icon={getPurposeIcon(item)}
                  delay={80 + index * 50}
                  onPress={() => handleSelectPurpose("Onboarding", item)}
                  theme={theme}
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
                icon={getPurposeIcon(item)}
                delay={80 + index * 50}
                onPress={() => handleSelectPurpose(null, item)}
                theme={theme}
              />
            ))}
          </View>
        )}

        {submitMutation.isPending && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Generating token…
            </ThemedText>
          </View>
        )}
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  headerCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  headerCardText: {
    flex: 1,
    minWidth: 0,
  },
  headerCardTitle: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  headerCardDesc: {
    lineHeight: 22,
  },
  errorText: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonText: {
    fontWeight: "600",
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
    borderRadius: BorderRadius.md,
    minHeight: 100,
  },
  gridCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  gridCardLabel: {
    textAlign: "center",
    fontWeight: "500",
  },
  gridCardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  categoryBlock: {
    marginBottom: Spacing["2xl"],
  },
  categoryTitle: {
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
  },
  itemsRow: {
    gap: Spacing.lg,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  itemTitle: {
    flex: 1,
    marginRight: Spacing.md,
    fontWeight: "500",
  },
  itemCardArrow: {
    marginLeft: Spacing.xs,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
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
