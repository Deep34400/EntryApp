import React, { useLayoutEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, ScrollView, Image, RefreshControl, Alert, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, CommonActions } from "@react-navigation/native";
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
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
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
          {
            backgroundColor: theme.backgroundDefault,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          },
          animatedStyle,
        ]}
        testID={`card-${type}`}
      >
        <View
          style={[styles.iconContainer, { backgroundColor: theme.primary }]}
        >
          <Feather name={icon} size={30} color="#FFFFFF" />
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
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
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

  const { clearUser } = useUser();
  const { clearAuth } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out? You will need to sign in again with OTP.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            clearAuth();
            clearUser();
            setTimeout(() => {
              navigation.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: "WhoAreYou" }] })
              );
            }, 0);
          },
        },
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerLeft: () => {
        const { width } = Dimensions.get("window");
        const maxLeftWidth = Math.min(width * 0.52, width - 120);
        return (
          <View style={[styles.headerLeftWrap, { maxWidth: maxLeftWidth }]}>
            <View style={[styles.headerLogoWrap, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerWelcomeBlock}>
              <Pressable
                onPress={() => navigation.navigate("Profile")}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ThemedText
                  type="h4"
                  style={[styles.headerUserName, { color: theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {user?.name?.trim() || "User"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        );
      },
      headerRight: () => (
        <View style={styles.headerRight}>
          <ThemeToggleHeaderButton />
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.headerIconButton, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityLabel="Log out"
          >
            <Feather name="log-out" size={22} color={theme.text} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, user?.name, theme.text, theme.textSecondary, theme.primary, theme.backgroundDefault, theme.border]);

  const visitorTypes = [
    {
      type: "dp" as EntryType,
      title: "DP Entry",
      description: "Delivery partner – onboarding, settlement, maintenance. Vehicle optional.",
      icon: "users" as keyof typeof Feather.glyphMap,
    },
    {
      type: "non_dp" as EntryType,
      title: "Staff Entry",
      description: "Self recovery, testing, police, test drive, personal use",
      icon: "log-in" as keyof typeof Feather.glyphMap,
    },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          styles.contentFullScreen,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.lg,
          },
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
        {/* Gate Entry — open/closed counts (larger for mobile) */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.gateEntrySection}>
          <ThemedText type="body" style={[styles.gateEntryTitle, { color: theme.textSecondary }]}>
            Gate Entry
          </ThemedText>
          <View style={styles.countsBar}>
            <Pressable
              onPress={handleOpenTickets}
              style={({ pressed }) => [
                styles.countCard,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.92 : 1,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
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
                  <ThemedText type="h2" style={[styles.countCardNumber, { color: theme.buttonText }]}>
                    {openCount}
                  </ThemedText>
                )}
              </View>
            </Pressable>
            <Pressable
              onPress={handleClosedTickets}
              style={({ pressed }) => [
                styles.countCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  opacity: pressed ? 0.92 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                },
              ]}
              accessibilityLabel={`CLOSED: ${closedCount}`}
            >
              <View style={styles.countCardContent}>
                <ThemedText type="small" style={[styles.countCardLabel, { color: theme.textSecondary }]}>
                  CLOSED
                </ThemedText>
                {isFetching ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <ThemedText type="h2" style={[styles.countCardNumber, { color: theme.text }]}>
                    {closedCount}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Select Entry Purpose section */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.sectionHeader}>
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
              delay={80 + index * 80}
              onPress={handleSelectType}
            />
          ))}
        </View>
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
  content: {
    paddingHorizontal: Spacing.xl,
  },
  contentFullScreen: {
    flexGrow: 1,
  },
  headerLeftWrap: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    flexShrink: 1,
    gap: Spacing.md,
  },
  headerLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  headerWelcomeBlock: {
    justifyContent: "center",
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
  },
  headerUserName: {
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  headerIconButton: {
    minWidth: 48,
    minHeight: 48,
    padding: Spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  gateEntrySection: {
    marginBottom: Spacing["2xl"],
  },
  gateEntryTitle: {
    marginBottom: Spacing.lg,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  countsBar: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  countCard: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  countCardContent: {
    justifyContent: "center",
  },
  countCardLabel: {
    letterSpacing: 0.4,
    marginBottom: Spacing.xs,
  },
  countCardNumber: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardsContainer: {
    gap: Spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
