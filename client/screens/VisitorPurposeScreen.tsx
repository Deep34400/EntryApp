import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { ENTRY_PASS_PATH } from "@/lib/api-endpoints";
import { useHub } from "@/contexts/HubContext";
import { useUser } from "@/contexts/UserContext";
import {
  RootStackParamList,
  EntryType,
  EntryFormData,
} from "@/navigation/RootStackNavigator";

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
  items: [
    "Accident",
    "PMS",
    "Running Repair - Part missing, Mechanical / electrical fault, Car bodyshop, Repair Parking",
    "Washing",
  ],
} as const;

/** Categories to show for New DP only (Onboarding). */
export const NEW_DP_CATEGORIES = [DP_ONBOARDING] as const;

/** Categories to show for Old DP only (Settlement + Maintenance). */
export const OLD_DP_CATEGORIES = [DP_SETTLEMENT, DP_MAINTENANCE] as const;

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
}: {
  title: string;
  delay: number;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
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
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
      >
        <ThemedText type="body" style={styles.itemTitle} numberOfLines={3}>
          {title}
        </ThemedText>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </AnimatedPressable>
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
  const { hub } = useHub();
  const { user } = useUser();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isDp = entryType === "new_dp" || entryType === "old_dp";

  /** purpose: Settlement/Onboarding → driver_manager, Maintenance → fleet_manager, Non DP → empty */
  const getPurpose = (categoryTitle: string | null): string => {
    if (categoryTitle === "Maintenance") return "fleet_manager";
    if (categoryTitle === "Settlement" || categoryTitle === "Onboarding") return "driver_manager";
    return ""; // non_dp
  };

  /** reason: combined like "Maintenance - Accident", "Settlement - DM collection"; non_dp just the item */
  const getReason = (categoryTitle: string | null, item: string): string => {
    if (categoryTitle) return `${categoryTitle} - ${item}`;
    return item;
  };

  const submitMutation = useMutation({
    mutationFn: async ({
      categoryTitle,
      item,
    }: {
      categoryTitle: string | null;
      item: string;
    }) => {
      setSubmitError(null);
      const purpose = getPurpose(categoryTitle);
      const reason = getReason(categoryTitle, item);

      const body: Record<string, string> = {
        type: entryType,
        phone: (formData.phone ?? "").trim(),
        name: (formData.name ?? "").trim(),
        purpose,
        reason,
      };
      if (hub?.id) {
        body.hub_id = hub.id;
      }
      if (user?.name) body.staff_name = user.name;
      if (user?.phone) body.staff_phone = user.phone;
      if (entryType === "old_dp") {
        const vehicle = (formData.vehicle_reg_number ?? "").trim();
        if (vehicle) {
          body.vehicle_reg_number = vehicle;
          body.vehicle = vehicle;
        }
      }
      const response = await apiRequest("POST", ENTRY_PASS_PATH, body);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmitError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const results = data.results ?? data;
      const token = results.token_no ?? results.token ?? results.id ?? "";
      const agentName = results.agent_name ?? results.agentName ?? results.agent ?? "—";
      const gate = results.desk_location ?? results.gate ?? results.gate_name ?? "—";
      navigation.navigate("TokenDisplay", {
        token: String(token),
        agentName: String(agentName),
        gate: String(gate),
      });
    },
    onError: (error: Error) => {
      setSubmitError(error.message || "Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleSelectPurpose = (categoryTitle: string | null, item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate({ categoryTitle, item });
  };

  let delay = 0;
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["4xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isDp
              ? "Select visitor's purpose (categorization)"
              : "Select purpose for Non DP entry"}
          </ThemedText>
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
          (entryType === "new_dp" ? NEW_DP_CATEGORIES : OLD_DP_CATEGORIES).map((category) => (
            <View key={category.title} style={styles.categoryBlock}>
              <ThemedText
                type="small"
                style={[styles.categoryTitle, { color: theme.primary }]}
              >
                {category.title}
              </ThemedText>
              <View style={styles.itemsRow}>
                {category.items.map((item) => {
                  const d = delay;
                  delay += 60;
                  return (
                    <PurposeItem
                      key={item}
                      title={item}
                      delay={d}
                      onPress={() => handleSelectPurpose(category.title, item)}
                      theme={theme}
                    />
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.itemsRow}>
            {NON_DP_PURPOSES.map((item, index) => (
              <PurposeItem
                key={item}
                title={item}
                delay={80 + index * 60}
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
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  subtitle: {},
  errorText: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  categoryBlock: {
    marginBottom: Spacing["2xl"],
  },
  categoryTitle: {
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  itemsRow: {
    gap: Spacing.md,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  itemTitle: {
    flex: 1,
    marginRight: Spacing.md,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
});
