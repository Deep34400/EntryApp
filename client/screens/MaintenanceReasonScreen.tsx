import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export const MAINTENANCE_REASONS = [
  "Accident",
  "PMS",
  "Running Repair",
  "Vehicle Breakdown",
] as const;

export type MaintenanceReasonType = (typeof MAINTENANCE_REASONS)[number];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorPurpose">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ReasonCard({
  title,
  icon,
  delay,
  onPress,
  theme,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
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
          styles.card,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
          <Feather name={icon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <ThemedText type="h4">{title}</ThemedText>
        </View> 
      </AnimatedPressable>
    </Animated.View>
  );
}

const REASON_ICONS: Record<MaintenanceReasonType, keyof typeof Feather.glyphMap> = {
  Accident: "alert-triangle",
  PMS: "settings",
  "Running Repair": "tool",
  "Vehicle Breakdown": "truck",
};

export default function MaintenanceReasonScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const handleSelect = (reason: MaintenanceReasonType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("EntryForm", {
      entryType: "old_dp",
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <ThemedText type="h3" style={styles.title}>
            Select maintenance type
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose the reason for your visit
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          {MAINTENANCE_REASONS.map((reason, index) => (
            <ReasonCard
              key={reason}
              title={reason}
              icon={REASON_ICONS[reason]}
              delay={80 + index * 80}
              onPress={() => handleSelect(reason)}
              theme={theme}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing["3xl"],
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {},
  cardsContainer: {
    gap: Spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
});
