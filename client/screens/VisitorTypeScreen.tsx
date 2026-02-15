import React, { useLayoutEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
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
  const { theme, isDark, themeContext } = useTheme();
  const { user } = useUser();
  const auth = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setDrawerOpen(false);
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
                CommonActions.reset({ index: 0, routes: [{ name: "LoginOtp" }] })
              );
            }, 0);
          },
        },
      ]
    );
  };

  const openDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleToggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    themeContext?.toggleTheme();
  };

  const handleViewProfile = () => {
    closeDrawer();
    navigation.navigate("Profile");
  };

  // Hide default header so we use custom gradient header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const drawerWidth = Math.min(Dimensions.get("window").width * 0.82, 320);
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
      {/* Flat compact header — enterprise style, safe-area aware */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + Spacing.xs,
            paddingBottom: Spacing.sm,
            paddingHorizontal: Layout.horizontalScreenPadding,
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerAvatarWrap, { backgroundColor: theme.backgroundTertiary }]}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.headerAvatar}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerWelcomeBlock}>
              <ThemedText type="small" style={[styles.headerWelcomeLabel, { color: theme.textSecondary }]}>
                Welcome
              </ThemedText>
              <ThemedText
                type="h6"
                style={[styles.headerUserName, { color: theme.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {user?.name?.trim() || "Sumit"}
              </ThemedText>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={openDrawer}
              style={({ pressed }) => [styles.headerIconBtn, { opacity: pressed ? 0.8 : 1 }]}
              hitSlop={16}
              accessibilityLabel="Menu"
            >
              <Feather name="menu" size={22} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.sm) + Spacing.xl },
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
                {
                  backgroundColor: theme.surface,
                  opacity: pressed ? 0.92 : 1,
                  borderWidth: 1,
                  borderColor: theme.border,
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
                <ThemedText type="small" style={[styles.statCardSubtitleGrey, { color: theme.textSecondary }]}>
                  Today Completed
                </ThemedText>
              </View>
              {isFetching ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <ThemedText type="h1" style={{ color: theme.text }}>
                  {closedCount}
                </ThemedText>
              )}
              <ThemedText type="small" style={[styles.statCardLabelGrey, { color: theme.textSecondary }]}>
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

      {/* Side drawer */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDrawer}
      >
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={[styles.drawerBackdrop, { backgroundColor: theme.overlayBackdrop }]} />
        </TouchableWithoutFeedback>
        <View style={[styles.drawerWrap, { width: drawerWidth }]} pointerEvents="box-none">
            <View
              style={[
                styles.drawerPanel,
                {
                  backgroundColor: theme.surface,
                  paddingTop: insets.top,
                  paddingBottom: insets.bottom + Spacing.md,
                },
              ]}
            >
            {/* Compact header: title and close vertically centered */}
            <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
              <ThemedText type="h4" style={{ color: theme.text }}>Menu</ThemedText>
              <Pressable
                onPress={closeDrawer}
                style={({ pressed }) => [styles.drawerCloseBtn, { opacity: pressed ? 0.7 : 1 }]}
                hitSlop={16}
                accessibilityLabel="Close menu"
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            {/* Profile: tight spacing, immediately after header */}
            <View style={styles.drawerProfile}>
              <View style={[styles.drawerAvatar, { backgroundColor: theme.primary }]}>
                <ThemedText type="h3" style={{ color: theme.onPrimary }}>
                  {(user?.name?.trim() || "S").charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText
                type="h4"
                style={[styles.drawerProfileName, { color: theme.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {user?.name?.trim() || "Sumit"}
              </ThemedText>
            </View>
            {/* Menu items + logout near bottom with natural spacing */}
            <View style={styles.drawerMenu}>
              <View style={styles.drawerMenuItems}>
                <Pressable
                  onPress={handleViewProfile}
                  style={({ pressed }) => [styles.drawerItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name="user" size={22} color={theme.text} />
                  <ThemedText type="body" style={{ color: theme.text }}>View Profile</ThemedText>
                </Pressable>
                {themeContext && (
                  <Pressable
                    onPress={handleToggleTheme}
                    style={({ pressed }) => [styles.drawerItem, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Feather name={isDark ? "sun" : "moon"} size={22} color={theme.text} />
                    <ThemedText type="body" style={{ color: theme.text }}>
                      {isDark ? "Light mode" : "Dark mode"}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [styles.drawerItem, styles.drawerItemDanger, styles.drawerItemLogout, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="power" size={22} color={theme.error} />
                <ThemedText type="body" style={[styles.drawerItemDangerText, { color: theme.error }]}>Logout</ThemedText>
              </Pressable>
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
  headerBar: {
    minHeight: Layout.compactBarHeight,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: Layout.compactBarHeight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  headerWelcomeBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  headerWelcomeLabel: {
    marginBottom: 0,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  headerAvatarWrap: {
    width: Layout.headerAvatarSize,
    height: Layout.headerAvatarSize,
    borderRadius: Layout.headerAvatarSize / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: Layout.headerAvatarSize - 4,
    height: Layout.headerAvatarSize - 4,
  },
  headerUserName: {
    fontWeight: "700",
    flex: 1,
    lineHeight: 24,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  headerIconBtn: {
    minWidth: Layout.backButtonTouchTarget,
    minHeight: Layout.backButtonTouchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
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
  statCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statCardSubtitle: {
    letterSpacing: 0.3,
  },
  statCardSubtitleGrey: {
    letterSpacing: 0.3,
  },
  statCardNumber: {
    fontWeight: "700",
  },
  statCardLabel: {
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  statCardLabelGrey: {
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
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: "flex-end",
  },
  drawerPanel: {
    flex: 1,
    width: "100%",
    paddingHorizontal: Spacing.lg,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: Layout.minTouchTarget,
    paddingVertical: 0,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  drawerCloseBtn: {
    minWidth: Layout.backButtonTouchTarget,
    minHeight: Layout.backButtonTouchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  drawerProfileName: {
    flex: 1,
    textAlign: "left",
    lineHeight: 22,
  },
  drawerAvatar: {
    width: Layout.headerAvatarSize + 8,
    height: Layout.headerAvatarSize + 8,
    borderRadius: (Layout.headerAvatarSize + 8) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerMenu: {
    flex: 1,
    justifyContent: "space-between",
  },
  drawerMenuItems: {
    gap: Spacing.xs,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: Layout.minTouchTarget,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  drawerItemLogout: {
    marginTop: Spacing.sm,
  },
  drawerItemDanger: {},
  drawerItemDangerText: {
    fontWeight: "600",
  },
});
