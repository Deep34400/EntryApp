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
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from "react-native-svg";
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
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList, EntryType } from "@/navigation/RootStackNavigator";

// Gate Entry premium palette
const GATE_GRADIENT_START = "#C62828";
const GATE_GRADIENT_END = "#8E0000";
const GATE_BG_LIGHT = "#F7F9FC";
const GATE_CARD_WHITE = "#FFFFFF";
const GATE_ORANGE_RED = "#D84315";
const CARD_RADIUS = 18;
const HEADER_CURVE = 28;

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
  const cardBg = isDark ? theme.backgroundDefault : GATE_CARD_WHITE;
  const subtitleColor = isDark ? theme.textSecondary : "#6B7280";

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
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.2 : 0.08,
            shadowRadius: 12,
            elevation: 4,
          },
          animatedStyle,
        ]}
        testID={`card-${type}`}
      >
        <View style={[styles.entryCardIconWrap, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={26} color="#FFFFFF" />
        </View>
        <View style={styles.entryCardContent}>
          <ThemedText type="h4" style={styles.entryCardTitle}>
            {title}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.entryCardDescription, { color: subtitleColor }]}
          >
            {description}
          </ThemedText>
        </View>
        <View style={styles.entryCardArrow}>
          <Feather name="chevron-right" size={24} color={theme.textSecondary} />
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

  const screenWidth = Dimensions.get("window").width;
  const drawerWidth = Math.min(screenWidth * 0.82, 320);
  const pageBg = isDark ? theme.backgroundRoot : GATE_BG_LIGHT;

  const visitorTypes = [
    {
      type: "dp" as EntryType,
      title: "Delivery Partner Entry",
      description: "Delivery partner – onboarding, settlement, vehicle optional.",
      icon: "truck" as keyof typeof Feather.glyphMap,
      iconBgColor: GATE_GRADIENT_END,
    },
    {
      type: "non_dp" as EntryType,
      title: "Staff Entry",
      description: "Self recovery, testing, police, test drive, personal use.",
      icon: "user" as keyof typeof Feather.glyphMap,
      iconBgColor: GATE_ORANGE_RED,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      {/* Custom gradient header with curved bottom */}
      <View style={styles.headerOuter} pointerEvents="box-none">
        <View
          style={[
            styles.headerGradientWrap,
            {
              borderBottomLeftRadius: HEADER_CURVE,
              borderBottomRightRadius: HEADER_CURVE,
              overflow: "hidden",
            },
          ]}
        >
          <Svg
            width={screenWidth}
            height={100}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <SvgLinearGradient
                id="headerGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={GATE_GRADIENT_START} stopOpacity={1} />
                <Stop offset="100%" stopColor={GATE_GRADIENT_END} stopOpacity={1} />
              </SvgLinearGradient>
            </Defs>
            <Rect x={0} y={0} width={screenWidth} height={100} fill="url(#headerGrad)" />
          </Svg>
          <View
            style={[
              styles.headerInner,
              {
                paddingTop: insets.top + Spacing.md,
                paddingBottom: Spacing.lg,
                paddingHorizontal: Spacing.lg,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerAvatarWrap, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                  <Image
                    source={require("../../assets/images/logo.png")}
                    style={styles.headerAvatar}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.headerWelcomeBlock}>
                  <ThemedText type="small" style={styles.headerWelcomeLabel}>
                    Welcome
                  </ThemedText>
                  <ThemedText
                    type="h5"
                    style={styles.headerUserName}
                    numberOfLines={1}
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
                  <Feather name="menu" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={GATE_GRADIENT_END}
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
                { opacity: pressed ? 0.92 : 1 },
              ]}
              accessibilityLabel={`OPEN: ${openCount}`}
            >
              <View style={styles.statCardTop}>
                <Feather name="shield" size={20} color="rgba(255,255,255,0.9)" />
                <ThemedText type="small" style={styles.statCardSubtitle}>
                  Active Inside
                </ThemedText>
              </View>
              {isFetching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText type="h1" style={styles.statCardNumber}>
                  {openCount}
                </ThemedText>
              )}
              <ThemedText type="small" style={styles.statCardLabel}>
                OPEN
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleClosedTickets}
              style={({ pressed }) => [
                styles.statCard,
                {
                  backgroundColor: isDark ? theme.backgroundDefault : "#E8ECF1",
                  opacity: pressed ? 0.92 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.3 : 0.06,
                  shadowRadius: 8,
                  elevation: 3,
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

        {/* Select Entry Purpose */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.sectionHeader}>
          <Feather name="shield" size={20} color={GATE_GRADIENT_END} />
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
          <View style={styles.drawerBackdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.drawerWrap, { width: drawerWidth }]} pointerEvents="box-none">
          <View
            style={[
              styles.drawerPanel,
              {
                backgroundColor: isDark ? theme.backgroundDefault : GATE_CARD_WHITE,
                paddingTop: insets.top + Spacing.xl,
                paddingBottom: insets.bottom + Spacing.xl,
              },
            ]}
          >
            {/* Drawer header: Close button so guard can easily close menu */}
            <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
              <ThemedText type="h4" style={{ color: theme.text }}>Menu</ThemedText>
              <Pressable
                onPress={closeDrawer}
                style={({ pressed }) => [styles.drawerCloseBtn, { opacity: pressed ? 0.7 : 1 }]}
                hitSlop={16}
                accessibilityLabel="Close menu"
              >
                <Feather name="x" size={26} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.drawerProfile}>
              <View style={[styles.drawerAvatar, { backgroundColor: theme.primary }]}>
                <ThemedText type="h3" style={{ color: "#FFFFFF" }}>
                  {(user?.name?.trim() || "S").charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText type="h4" style={{ color: theme.text }}>
                {user?.name?.trim() || "Sumit"}
              </ThemedText>
            </View>
            <View style={styles.drawerMenu}>
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
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [styles.drawerItem, styles.drawerItemDanger, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="power" size={22} color="#DC2626" />
                <ThemedText type="body" style={styles.drawerItemDangerText}>Logout</ThemedText>
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
  headerOuter: {
    paddingBottom: 0,
  },
  headerGradientWrap: {
    height: 100,
  },
  headerInner: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: Spacing.md,
  },
  headerWelcomeBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  headerWelcomeLabel: {
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  headerAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
  },
  headerUserName: {
    color: "#FFFFFF",
    fontWeight: "700",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  headerIconBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["2xl"],
  },
  statsSection: {
    marginBottom: Spacing["2xl"],
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    padding: Spacing.xl,
    minHeight: 120,
    justifyContent: "space-between",
  },
  statCardOpen: {
    backgroundColor: GATE_GRADIENT_END,
    shadowColor: GATE_GRADIENT_END,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  statCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statCardSubtitle: {
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.3,
  },
  statCardSubtitleGrey: {
    letterSpacing: 0.3,
  },
  statCardNumber: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statCardLabel: {
    color: "rgba(255,255,255,0.85)",
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
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardsContainer: {
    gap: Spacing.lg,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: CARD_RADIUS,
  },
  entryCardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
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
    backgroundColor: "rgba(0,0,0,0.4)",
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
    paddingHorizontal: Spacing.xl,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  drawerCloseBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerProfile: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  drawerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  drawerMenu: {
    gap: Spacing.xs,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  drawerItemDanger: {},
  drawerItemDangerText: {
    color: "#DC2626",
    fontWeight: "600",
  },
});
