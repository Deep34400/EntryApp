import React, { useLayoutEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
  TextInput,
  TouchableOpacity,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

import { AppFooter, useFooterTotalHeight } from "@/components/AppFooter";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { DesignTokens } from "@/constants/designTokens";
import { getTicketCounts, getTicketList } from "@/apis";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatEntryTime, formatDurationHours } from "@/lib/format";
import type { TicketListItem } from "@/types/ticket";
import { getWaitingMinutes } from "@/lib/ticket-utils";
import { getEntryTypeDisplayLabel } from "@/utils/entryType";
import { TicketListShimmer } from "@/components/Shimmer";

export type { TicketListItem } from "@/types/ticket";

type TabId = "Delayed" | "Open" | "Closed";

// ── Search filter types ──────────────────────────────────────────────────────
type FilterType = "all" | "token" | "name" | "vehicle";

// icon     = emoji shown inside chip
// label    = bold chip text
// sublabel = small hint text below label
const FILTER_OPTIONS: {
  id: FilterType;
  icon: string;
  label: string;
}[] = [
  { id: "all", icon: "", label: "All" },
  { id: "token", icon: "🎫", label: "Token #" },
  { id: "name", icon: "👤", label: "Name" },
  { id: "vehicle", icon: "🚗", label: "Vehicle" },
];

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "TicketList"
>;

const FONT_POPPINS = "Poppins";
const primaryRed = DesignTokens.login.headerRed;
const PAGE_SIZE = 50;
const STALE_TIME_MS = 10_000;

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatWaitingLabel(entryTime?: string | null): string {
  const mins = getWaitingMinutes(entryTime);
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function applySearch(
  list: TicketListItem[],
  query: string,
  filterType: FilterType,
): TicketListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((item) => {
    switch (filterType) {
      case "token":
        return String(item.token_no).toLowerCase().includes(q);
      case "name":
        return (item.name ?? "").toLowerCase().includes(q);
      case "vehicle":
        return (item.regNumber ?? "").toLowerCase().includes(q);
      default:
        return (
          String(item.token_no).toLowerCase().includes(q) ||
          (item.name ?? "").toLowerCase().includes(q) ||
          (item.regNumber ?? "").toLowerCase().includes(q)
        );
    }
  });
}

// ── TicketCard (unchanged) ───────────────────────────────────────────────────
function TicketCard({
  item,
  variant,
  onPress,
  isDark,
  theme,
}: {
  item: TicketListItem;
  variant: "Delayed" | "Open" | "Closed";
  onPress: () => void;
  isDark?: boolean;
  theme?: {
    backgroundDefault: string;
    border: string;
    text: string;
    textSecondary: string;
  };
}) {
  const isDelayed = variant === "Delayed";
  const isOpen = variant === "Open";

  const timeBadgeBg = isDelayed ? "#FBEBEB" : "#E8F7F5";
  const timeBadgeColor = isDelayed ? "#D33636" : "#147D6A";
  const cardBg =
    isDark && theme ? theme.backgroundDefault : DesignTokens.login.cardBg;
  const cardBorder = isDark && theme ? theme.border : "#E8EBEC";
  const ticketIdColor =
    isDark && theme ? theme.text : DesignTokens.login.otpText;
  const cardDateColor =
    isDark && theme ? theme.textSecondary : DesignTokens.login.termsText;
  const avatarBg = isDark && theme ? theme.border : "#E8EBEC";
  const driverNameColor =
    isDark && theme ? theme.text : DesignTokens.login.otpText;
  const driverRoleColor =
    isDark && theme ? theme.textSecondary : DesignTokens.login.termsText;

  const timeLabel =
    variant === "Closed"
      ? formatDurationHours(item.entry_time, item.exit_time)
      : formatWaitingLabel(item.entry_time);

  const driverName = item.name ?? "—";
  const role = getEntryTypeDisplayLabel(item.type);

  return (
    <View style={styles.cardWrapper}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.card,
          isDark &&
            theme && { backgroundColor: cardBg, borderColor: cardBorder },
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <Text
                style={[
                  styles.ticketId,
                  isDark && theme && { color: ticketIdColor },
                ]}
              >
                #{item.token_no}
              </Text>
              <Text
                style={[
                  styles.cardDate,
                  isDark && theme && { color: cardDateColor },
                ]}
              >
                {formatEntryTime(item.entry_time)}
              </Text>
            </View>
            <View style={[styles.timeBadge, { backgroundColor: timeBadgeBg }]}>
              <Text
                style={[styles.timeBadgeValue, { color: timeBadgeColor }]}
                numberOfLines={1}
              >
                {timeLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              isDark && theme && { backgroundColor: cardBorder },
            ]}
          />

          <View style={styles.driverRow}>
            <View
              style={[
                styles.avatarPlaceholder,
                isDark && theme && { backgroundColor: avatarBg },
              ]}
            >
              <Text
                style={[
                  styles.avatarLetter,
                  isDark && theme && { color: ticketIdColor },
                ]}
              >
                {driverName !== "—"
                  ? driverName.trim().charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text
                style={[
                  styles.driverName,
                  isDark && theme && { color: driverNameColor },
                ]}
                numberOfLines={1}
              >
                {driverName}
              </Text>
              <Text
                style={[
                  styles.driverRole,
                  isDark && theme && { color: driverRoleColor },
                ]}
                numberOfLines={1}
              >
                {role}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress();
            }}
            style={({ pressed }) => [
              styles.viewDetailBtn,
              pressed && styles.viewDetailBtnPressed,
            ]}
          >
            <Text style={styles.viewDetailBtnText}>View Detail</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function TicketListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabId>("Open");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const handleTabSwitch = (tab: TabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setFilterType("all");
  }, []);

  // ── Queries (unchanged) ──────────────────────────────────────────────────
  const {
    data: counts = { open: 0, closed: 0, delayed: 0 },
    isLoading: loadingCounts,
    isRefetching: refetchingCounts,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["ticket-counts"],
    queryFn: () => getTicketCounts(auth.accessToken),
    staleTime: STALE_TIME_MS,
  });

  const openQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "open"],
    queryFn: ({ pageParam }) =>
      getTicketList("open", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p.page * p.limit < p.total ? p.page + 1 : undefined,
    staleTime: STALE_TIME_MS,
    enabled: activeTab === "Open",
  });

  const delayedQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "delayed"],
    queryFn: ({ pageParam }) =>
      getTicketList("delayed", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p.page * p.limit < p.total ? p.page + 1 : undefined,
    staleTime: STALE_TIME_MS,
    enabled: activeTab === "Delayed",
  });

  const closedQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "closed"],
    queryFn: ({ pageParam }) =>
      getTicketList("closed", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p.page * p.limit < p.total ? p.page + 1 : undefined,
    staleTime: STALE_TIME_MS,
    enabled: activeTab === "Closed",
  });

  const activeQuery = useMemo(() => {
    if (activeTab === "Delayed") return delayedQuery;
    if (activeTab === "Closed") return closedQuery;
    return openQuery;
  }, [activeTab, openQuery, delayedQuery, closedQuery]);

  const isLoading = loadingCounts || activeQuery.isLoading;
  const isRefetching = refetchingCounts || activeQuery.isRefetching;
  const refetch = () => {
    refetchCounts();
    activeQuery.refetch();
  };

  const { currentList, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMemo(
      () => ({
        currentList: activeQuery.data?.pages.flatMap((p) => p.list) ?? [],
        fetchNextPage: activeQuery.fetchNextPage,
        hasNextPage: activeQuery.hasNextPage ?? false,
        isFetchingNextPage: activeQuery.isFetchingNextPage,
      }),
      [
        activeQuery.data?.pages,
        activeQuery.fetchNextPage,
        activeQuery.hasNextPage,
        activeQuery.isFetchingNextPage,
      ],
    );

  const filteredList = useMemo(
    () => applySearch(currentList, searchQuery, filterType),
    [currentList, searchQuery, filterType],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "Open", label: "Open", count: counts.open },
    { id: "Delayed", label: "Delayed", count: counts.delayed },
    { id: "Closed", label: "Closed", count: counts.closed },
  ];

  const footerTotalHeight = useFooterTotalHeight();
  const listContentPaddingBottom = footerTotalHeight;
  const showShimmer = isLoading || isRefetching;

  // Theme colours
  const screenBg = isDark ? theme.backgroundRoot : DesignTokens.login.cardBg;
  const headerBg = isDark ? theme.backgroundDefault : DesignTokens.login.cardBg;
  const headerTitleColor = isDark ? theme.text : DesignTokens.login.otpText;
  const tabLabelActiveColor = isDark ? theme.primary : primaryRed;
  const tabLabelInactiveColor = isDark
    ? theme.textSecondary
    : DesignTokens.login.otpText;
  const emptyTextColor = isDark
    ? theme.textSecondary
    : DesignTokens.login.termsText;
  const loadMoreTextColor = isDark
    ? theme.textSecondary
    : DesignTokens.login.termsText;
  const searchBg = isDark ? theme.backgroundRoot : "#F4F6F7";
  const searchBorder = isDark ? theme.border : "#E8EBEC";
  const searchText = isDark ? theme.text : DesignTokens.login.otpText;
  const searchPlaceholder = isDark ? theme.textSecondary : "#9CA3AF";
  const chipActiveBg = isDark ? theme.primary : primaryRed;
  const chipInactiveBg = isDark ? theme.backgroundRoot : "#F4F6F7";
  const chipActiveBorder = isDark ? theme.primary : primaryRed;
  const chipInactiveBorder = isDark ? theme.border : "#E8EBEC";

  const searchPlaceholderText =
    filterType === "token"
      ? "Enter token number…"
      : filterType === "name"
        ? "Enter driver name…"
        : filterType === "vehicle"
          ? "Enter vehicle reg. no…"
          : "Search by token, name, vehicle…";

  return (
    <View style={[styles.screen, isDark && { backgroundColor: screenBg }]}>
      <View
        style={[
          styles.headerSection,
          { paddingTop: insets.top },
          isDark && { backgroundColor: headerBg },
        ]}
      >
        {/* Title */}
        <View style={styles.headerTitleRow}>
          <Text
            style={[styles.headerTitle, isDark && { color: headerTitleColor }]}
          >
            Tickets
          </Text>
        </View>

        {/* ── Search bar (height 50) ───────────────────────────────────── */}
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchInputWrap,
              { backgroundColor: searchBg, borderColor: searchBorder },
            ]}
          >
            <Text style={[styles.searchIcon, { color: searchPlaceholder }]}>
              🔍
            </Text>
            <TextInput
              style={[styles.searchInput, { color: searchText }]}
              placeholder={searchPlaceholderText}
              placeholderTextColor={searchPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[styles.clearBtnText, { color: searchPlaceholder }]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* "X found" badge inline with search bar */}
          {searchQuery.length > 0 && (
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeText}>
                {filteredList.length}
                {"\n"}found
              </Text>
            </View>
          )}
        </View>

        {/* ── Filter chips: icon + bold label + sublabel ───────────────── */}
        <View style={styles.filterChipRow}>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filterType === opt.id;
            const labelColor = isActive
              ? "#FFFFFF"
              : isDark
                ? theme.text
                : DesignTokens.login.otpText;

            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterType(opt.id);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? chipActiveBg : chipInactiveBg,
                    borderColor: isActive
                      ? chipActiveBorder
                      : chipInactiveBorder,
                  },
                ]}
              >
                <Text style={styles.chipIcon}>{opt.icon}</Text>
                <Text style={[styles.chipLabel, { color: labelColor }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabSwitch(tab.id)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                    isDark && {
                      color: isActive
                        ? tabLabelActiveColor
                        : tabLabelInactiveColor,
                    },
                  ]}
                >
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      {showShimmer ? (
        <TicketListShimmer count={6} />
      ) : (
        <FlatList
          style={styles.list}
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketCard
              item={item}
              variant={activeTab}
              onPress={() =>
                navigation.navigate("TicketDetail", { ticketId: item.id })
              }
              isDark={isDark}
              theme={theme}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listContentPaddingBottom },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text
                style={[styles.emptyText, isDark && { color: emptyTextColor }]}
              >
                {searchQuery.length > 0
                  ? `No results for "${searchQuery}"`
                  : `No ${activeTab.toLowerCase()} tickets`}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasNextPage && isFetchingNextPage ? (
              <View style={styles.loadMoreWrap}>
                <ActivityIndicator
                  size="small"
                  color={isDark ? theme.primary : primaryRed}
                />
                <Text
                  style={[
                    styles.loadMoreText,
                    isDark && { color: loadMoreTextColor },
                  ]}
                >
                  Loading more…
                </Text>
              </View>
            ) : null
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={isDark ? theme.primary : primaryRed}
            />
          }
        />
      )}

      <AppFooter activeTab="Ticket" />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DesignTokens.login.cardBg },
  list: { flex: 1 },

  headerSection: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingBottom: 0,
    backgroundColor: DesignTokens.login.cardBg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  headerTitleRow: { paddingVertical: Spacing.md + 3 },
  headerTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.login.otpText,
  },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    height: 50, // ← taller search bar
    gap: Spacing.xs,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: { padding: 2 },
  clearBtnText: { fontSize: 13, fontWeight: "600" },

  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E8F7F5",
    borderRadius: 10,
    alignItems: "center",
  },
  resultBadgeText: {
    fontFamily: FONT_POPPINS,
    fontSize: 10,
    fontWeight: "700",
    color: "#147D6A",
    textAlign: "center",
  },

  // ── Filter chips ──────────────────────────────────────────────────────────
  filterChipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    flex: 1, // equal width for all 4
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 9, // taller chip
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipIcon: { fontSize: 14 },
  chipLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: "row",
    minHeight: Layout.minTouchTarget,
    alignItems: "stretch",
  },
  tab: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: primaryRed },
  tabLabel: { fontFamily: FONT_POPPINS, fontSize: 14 },
  tabLabelActive: { color: primaryRed, fontWeight: "600" },
  tabLabelInactive: { color: DesignTokens.login.otpText, fontWeight: "400" },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    flexGrow: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Layout.horizontalScreenPadding,
    width: "100%",
  },
  emptyWrap: { paddingVertical: Spacing["3xl"], alignItems: "center" },
  emptyText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: DesignTokens.login.termsText,
  },
  loadMoreWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadMoreText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: DesignTokens.login.termsText,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  cardWrapper: { marginBottom: Spacing.lg, width: "100%" },
  card: {
    backgroundColor: DesignTokens.login.cardBg,
    borderWidth: 1,
    borderColor: "#E8EBEC",
    borderRadius: BorderRadius.sm,
    padding: Layout.cardPadding,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  cardPressed: { opacity: 0.92 },
  cardInner: { gap: Spacing.lg },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTopLeft: { flex: 1, minWidth: 0 },
  ticketId: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.login.otpText,
  },
  cardDate: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "400",
    color: DesignTokens.login.termsText,
    marginTop: Spacing.xs,
  },
  timeBadge: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  timeBadgeValue: { fontFamily: FONT_POPPINS, fontSize: 16, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#E8EBEC" },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.contentGap,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8EBEC",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.login.otpText,
  },
  driverInfo: { flex: 1, minWidth: 0 },
  driverName: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: DesignTokens.login.otpText,
  },
  driverRole: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "400",
    color: DesignTokens.login.termsText,
    marginTop: 2,
  },
  viewDetailBtn: {
    minHeight: Layout.minTouchTarget,
    backgroundColor: "#1DB398",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetailBtnPressed: { opacity: 0.9 },
  viewDetailBtnText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
