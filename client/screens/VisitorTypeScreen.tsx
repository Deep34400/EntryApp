import React, { useLayoutEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
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
import { fetchTicketCountsSafe } from "@/lib/query-client";
import { toTitleCase } from "@/lib/format";
import { useHub } from "@/contexts/HubContext";
import { RootStackParamList, VisitorType } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;

interface VisitorTypeCardProps {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  type: VisitorType;
  delay: number;
  onPress: (type: VisitorType) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function VisitorTypeCard({
  title,
  description,
  icon,
  type,
  delay,
  onPress,
}: VisitorTypeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(type);
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
        testID={`card-${type}`}
      >
        <View
          style={[styles.iconContainer, { backgroundColor: theme.primary }]}
        >
          <Feather name={icon} size={28} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <ThemedText type="h4" style={styles.cardTitle}>
            {title}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.cardDescription, { color: theme.textSecondary }]}
          >
            {description}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color={theme.textSecondary} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { hub } = useHub();

  const { data: counts, isFetching } = useQuery({
    queryKey: ["ticket-counts", hub?.id],
    queryFn: () => fetchTicketCountsSafe(hub?.id),
    staleTime: 30_000,
  });
  const openCount = counts?.open ?? 0;
  const closedCount = counts?.closed ?? 0;

  const handleSelectType = (type: VisitorType) => {
    if (type === "maintenance") {
      navigation.navigate("MaintenanceReason");
    } else {
      navigation.navigate("EntryForm", { visitorType: type });
    }
  };

  const handleOpenTickets = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("TicketList", { filter: "open" as const });
  };

  const handleClosedTickets = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("TicketList", { filter: "closed" as const });
  };

  const handleChangeHub = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("HubSelect");
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={handleChangeHub} style={styles.changeHubButton} hitSlop={Spacing.lg}>
          <Feather name="map-pin" size={18} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }} numberOfLines={1}>
            {hub ? toTitleCase(hub.hub_name) : "Hub"}
          </ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, hub?.hub_name, theme.primary]);

  const visitorTypes = [
    {
      type: "sourcing" as VisitorType,
      title: "Sourcing",
      description: "For procurement and vendor meetings",
      icon: "file-text" as keyof typeof Feather.glyphMap,
    },
    {
      type: "maintenance" as VisitorType,
      title: "Maintenance",
      description: "For repair and maintenance work",
      icon: "tool" as keyof typeof Feather.glyphMap,
    },
    {
      type: "collection" as VisitorType,
      title: "Collection",
      description: "For pickup and delivery",
      icon: "truck" as keyof typeof Feather.glyphMap,
    },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        {/* Top bar: Open / Closed ticket counts — tap to see list */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.countsBar}
        >
          <Pressable
            onPress={handleOpenTickets}
            style={[
              styles.countChip,
              { backgroundColor: theme.backgroundDefault },
            ]}
            accessibilityLabel={`Open tickets: ${openCount}`}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Feather name="log-in" size={20} color={theme.primary} />
                <ThemedText type="h4" style={styles.countNumber}>
                  {openCount}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[styles.countLabel, { color: theme.textSecondary }]}
                >
                  Open
                </ThemedText>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleClosedTickets}
            style={[
              styles.countChip,
              { backgroundColor: theme.backgroundDefault },
            ]}
            accessibilityLabel={`Closed tickets: ${closedCount}`}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Feather name="log-out" size={20} color={theme.textSecondary} />
                <ThemedText type="h4" style={styles.countNumber}>
                  {closedCount}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[styles.countLabel, { color: theme.textSecondary }]}
                >
                  Closed
                </ThemedText>
              </>
            )}
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ThemedText type="h3" style={styles.subtitle}>
            Select Entry Purpose
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          {visitorTypes.map((item, index) => (
            <VisitorTypeCard
              key={item.type}
              type={item.type}
              title={item.title}
              description={item.description}
              icon={item.icon}
              delay={100 + index * 100}
              onPress={handleSelectType}
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
  countsBar: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  countChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  countNumber: {
    marginRight: Spacing.xs,
  },
  countLabel: {},
  changeHubButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
    maxWidth: 140,
  },
  subtitle: {
    marginBottom: Spacing["3xl"],
  },
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
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    opacity: 0.8,
  },
});
