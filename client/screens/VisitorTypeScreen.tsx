import React, { useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { fetchTicketCountsSafe } from "@/lib/query-client";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList, EntryType } from "@/navigation/RootStackNavigator";

const FONT_POPPINS = "Poppins";


type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;

interface VisitorTypeCardProps {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  type: EntryType;
  delay: number;
  iconBgColor: string;
  onPress: (type: EntryType) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function VisitorTypeCard({
  title,
  description,
  icon,
  type,
  delay,
  iconBgColor,
  onPress,
}: VisitorTypeCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const cardBg = isDark ? theme.backgroundDefault : theme.surface;

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
          styles.entryCard,
          {
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: theme.shadowColor,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.12 : 0.04,
            shadowRadius: 4,
            elevation: 2,
          },
          animatedStyle,
        ]}
        testID={`card-${type}`}
      >
        <View style={[styles.entryCardIconWrap, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={20} color={theme.onPrimary} />
        </View>
        <View style={styles.entryCardContent}>
          <ThemedText type="h4" style={styles.entryCardTitle}>
            {title}
          </ThemedText>
          <ThemedText type="small" variant="secondary" style={styles.entryCardDescription}>
            {description}
          </ThemedText>
        </View>
        <View style={styles.entryCardArrow}>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const auth = useAuth();

  const { data: counts, isFetching, isRefetching, refetch } = useQuery({
    queryKey: ["ticket-counts", auth.accessToken],
    queryFn: () => fetchTicketCountsSafe(undefined, auth.accessToken),
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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const pageBg = theme.backgroundRoot;

  const visitorTypes = [
    {
      type: "dp" as EntryType,
      title: "Delivery Partner Entry",
      description: "Delivery partner – onboarding, settlement, vehicle optional.",
      icon: "truck" as keyof typeof Feather.glyphMap,
      iconBgColor: theme.primaryDark,
    },
    {
      type: "non_dp" as EntryType,
      title: "Staff Entry",
      description: "Self recovery, testing, police, test drive, personal use.",
      icon: "user" as keyof typeof Feather.glyphMap,
      iconBgColor: theme.primary,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      {/* Simple header: Welcome + user name, no logo or menu */}
      <View style={[styles.headerBar, { paddingTop: insets.top, backgroundColor: "#FFFFFF" }]}>
        <View style={styles.headerCenterBlock}>
          <Text style={styles.headerWelcomeLabelNew}>Welcome</Text>
          <Text style={styles.headerUserNameNew} numberOfLines={2} ellipsizeMode="tail">
            {user?.name?.trim() || "Deepak Singh Chauhan"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: APP_FOOTER_HEIGHT + insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.primary}
          />
        }
      >
        {/* Stats: OPEN | CLOSED */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.statsSection}>
          <View style={styles.statsRow}>
            <Pressable
              onPress={handleOpenTickets}
              style={({ pressed }) => [
                styles.statCard,
                styles.statCardOpen,
                {
                  opacity: pressed ? 0.92 : 1,
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                },
              ]}
              accessibilityLabel={`OPEN: ${openCount}`}
            >
              <View style={styles.statCardTop}>
                <Feather name="shield" size={20} color={theme.onPrimary} />
                <ThemedText type="small" style={[styles.statCardSubtitle, { color: theme.onPrimary }]}>
                  Active Inside
                </ThemedText>
              </View>
              {isFetching ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <ThemedText type="h1" style={[styles.statCardNumber, { color: theme.onPrimary }]}>
                  {openCount}
                </ThemedText>
              )}
              <ThemedText type="small" style={[styles.statCardLabel, { color: theme.onPrimary }]}>
                OPEN
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleClosedTickets}
              style={({ pressed }) => [
                styles.statCard,
                styles.statCardClosed,
                {
                  backgroundColor: `${theme.success}20`,
                  opacity: pressed ? 0.92 : 1,
                  borderWidth: 1,
                  borderColor: theme.success,
                  shadowColor: theme.shadowColor,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.15 : 0.04,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              accessibilityLabel={`CLOSED: ${closedCount}`}
            >
              <View style={styles.statCardTop}>
                <ThemedText type="small" style={[styles.statCardSubtitle, { color: theme.success }]}>
                  Today Completed
                </ThemedText>
              </View>
              {isFetching ? (
                <ActivityIndicator size="small" color={theme.success} />
              ) : (
                <ThemedText type="h1" style={[styles.statCardNumber, { color: theme.success }]}>
                  {closedCount}
                </ThemedText>
              )}
              <ThemedText type="small" style={[styles.statCardLabel, { color: theme.success }]}>
                CLOSED
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        {/* Entry purpose */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.sectionHeader}>
          <ThemedText type="label" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Entry purpose
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
              delay={80 + index * 80}
              iconBgColor={item.iconBgColor}
              onPress={handleSelectType}
            />
          ))}
        </View>
      </ScrollView>

      <AppFooter activeTab="Entry" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    minHeight: Layout.minTouchTarget + 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.horizontalScreenPadding,
  },
  headerCenterBlock: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerWelcomeLabelNew: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
  },
  headerUserNameNew: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
    marginTop: 2,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.sm,
  },
  statsSection: {
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: Layout.statCardMinHeight,
    justifyContent: "space-between",
  },
  statCardOpen: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardClosed: {},
  statCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statCardSubtitle: {
    letterSpacing: 0.3,
  },
  statCardNumber: {
    fontWeight: "700",
  },
  statCardLabel: {
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardsContainer: {
    gap: Spacing.sm,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  entryCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  entryCardContent: {
    flex: 1,
    minWidth: 0,
  },
  entryCardTitle: {
    marginBottom: Spacing.xs,
  },
  entryCardDescription: {
    opacity: 0.9,
  },
  entryCardArrow: {
    marginLeft: Spacing.sm,
  },
});
