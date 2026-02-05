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
import { ThemeToggleHeaderButton } from "@/components/ThemeToggleHeaderButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { fetchTicketCountsSafe } from "@/lib/query-client";
import { toTitleCase } from "@/lib/format";
import { useHub } from "@/contexts/HubContext";
import { useUser } from "@/contexts/UserContext";
import { RootStackParamList, EntryType } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;

interface VisitorTypeCardProps {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  type: EntryType;
  delay: number;
  onPress: (type: EntryType) => void;
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
  const { user } = useUser();

  const { data: counts, isFetching } = useQuery({
    queryKey: ["ticket-counts", hub?.id],
    queryFn: () => fetchTicketCountsSafe(hub?.id),
    staleTime: 30_000,
  });
  const openCount = counts?.open ?? 0;
  const closedCount = counts?.closed ?? 0;

  const handleSelectType = (type: EntryType) => {
    navigation.navigate("EntryForm", { entryType: type });
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
          <Feather name="map-pin" size={18} color={theme.primary} style={styles.headerPinIcon} />
          <View style={styles.headerLeftTextBlock}>
            <ThemedText type="small" style={[styles.headerHubText, { color: theme.primary }]} numberOfLines={1}>
              {hub ? toTitleCase(hub.hub_name) + " Hub" : "Hub"}
            </ThemedText>
            {user?.name ? (
              <ThemedText type="small" style={[styles.headerNameText, { color: theme.textSecondary }]} numberOfLines={1}>
                {user.name}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <ThemeToggleHeaderButton />
        </View>
      ),
    });
  }, [navigation, hub?.hub_name, user?.name, theme.primary, theme.textSecondary]);

  const visitorTypes = [
    {
      type: "new_dp" as EntryType,
      title: "New DP Entry",
      description: "New delivery partner onboarding and registration",
      icon: "user-plus" as keyof typeof Feather.glyphMap,
    },
    {
      type: "old_dp" as EntryType,
      title: "Old DP Entry",
      description: "Existing delivery partner – settlement, maintenance",
      icon: "users" as keyof typeof Feather.glyphMap,
    },
    {
      type: "non_dp" as EntryType,
      title: "Non DP Entry",
      description: "Self recovery, testing, police, test drive, personal use",
      icon: "log-in" as keyof typeof Feather.glyphMap,
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
        {/* Subtitle only — "Gate Entry" is in the header */}
        {/* <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.titleBlock}>
          <ThemedText type="body" style={[styles.mainSubtitle, { color: theme.textSecondary }]}>
            Select an action to proceed
          </ThemedText>
        </Animated.View> */}

        {/* OPEN / CLOSED — same button style */}
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={styles.countsBar}
        >
          <Pressable
            onPress={handleOpenTickets}
            style={({ pressed }) => [
              styles.countCard,
              styles.countCardButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityLabel={`OPEN: ${openCount}`}
          >
            <View style={styles.countCardContent}>
              <ThemedText type="small" style={[styles.countCardLabel, { color: theme.buttonText }]}>
                OPEN
              </ThemedText>
              {isFetching ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <ThemedText type="h1" style={[styles.countCardNumber, { color: theme.buttonText }]}>
                  {openCount}
                </ThemedText>
              )}
            </View>
            <Feather name="chevron-right" size={22} color={theme.buttonText} />
          </Pressable>
          <Pressable
            onPress={handleClosedTickets}
            style={({ pressed }) => [
              styles.countCard,
              styles.countCardButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityLabel={`CLOSED: ${closedCount}`}
          >
            <View style={styles.countCardContent}>
              <ThemedText type="small" style={[styles.countCardLabel, { color: theme.buttonText }]}>
                CLOSED
              </ThemedText>
              {isFetching ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <ThemedText type="h1" style={[styles.countCardNumber, { color: theme.buttonText }]}>
                  {closedCount}
                </ThemedText>
              )}
            </View>
            <Feather name="chevron-right" size={22} color={theme.buttonText} />
          </Pressable>
        </Animated.View>

        {/* Select Entry Purpose section */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.sectionHeader}>
          <Feather name="shield" size={20} color={theme.primary} />
          <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
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
  titleBlock: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  mainSubtitle: {
    textAlign: "center",
  },
  countsBar: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  countCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  countCardButton: {
    borderRadius: BorderRadius.md,
  },
  countCardContent: {
    flex: 1,
  },
  countCardLabel: {
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  countCardNumber: {
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {},
  changeHubButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
    maxWidth: 200,
  },
  headerPinIcon: {
    marginRight: Spacing.xs,
  },
  headerLeftTextBlock: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  headerHubText: {
    fontWeight: "600",
  },
  headerNameText: {
    marginTop: 1,
    fontSize: 12,
    opacity: 0.95,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  gateLabel: {},
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
