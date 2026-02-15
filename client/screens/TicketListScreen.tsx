import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing } from "@/constants/theme";
import { getScreenPalette } from "@/constants/screenPalette";
import { fetchWithAuthRetry } from "@/lib/query-client";
import { getEntryAppListPath } from "@/lib/api-endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatEntryTime, formatWaitingHours, formatDurationHours } from "@/lib/format";
import type { TicketListItem } from "@/types/ticket";
import { normalizeTicketListItem } from "@/types/ticket";
import { getCategoryLabel, isEntryOlderThan2Hours } from "@/lib/ticket-utils";

/** Min height for header bar so title + subtitle don't clip; flexible, respects safe area. */
const HEADER_BAR_MIN_HEIGHT = 72;
const HEADER_TOUCH_SIZE = Layout.backButtonTouchTarget;
const HEADER_ICON_SIZE = 24;

const CARD_RADIUS = 12;
const SEARCH_RADIUS = 10;
const OVERDUE_STRIP_INDICATOR_WIDTH = 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "TicketList">;
type TicketListRouteProp = RouteProp<RootStackParamList, "TicketList">;

// Re-export for any screen that needs the list item type
export type { TicketListItem } from "@/types/ticket";

function TicketRow({
  item,
  onPress,
  isOpenList,
  palette,
}: {
  item: TicketListItem;
  onPress: () => void;
  isOpenList: boolean;
  palette: ReturnType<typeof getScreenPalette>;
}) {
  const category = getCategoryLabel(item);
  const isOverdue = isOpenList && isEntryOlderThan2Hours(item.entry_time);
  const duration = formatDurationHours(item.entry_time, item.exit_time);
  const stripColor = isOverdue ? palette.overdueStrip : palette.divider;
  const slaLabel = isOpenList ? formatWaitingHours(item.entry_time) : `Completed • ${duration}`;
  const slaBadgeOverdue = isOpenList && isOverdue;

  return (
    <View style={styles.cardOuter}>
      <View style={[styles.cardStrip, { backgroundColor: stripColor }]} />
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: palette.card,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardTop}>
            <ThemedText type="h4" style={[styles.tokenNo, { color: palette.textPrimary }]}>
              #{item.token_no}
            </ThemedText>
            {isOpenList ? (
              <View
                style={[
                  styles.timeBadge,
                  { backgroundColor: slaBadgeOverdue ? palette.overdueStrip : `${palette.textSecondary}33` },
                ]}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.timeBadgeText,
                    { color: slaBadgeOverdue ? palette.overdueBadgeText : palette.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {slaLabel}
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.timeBadge, { backgroundColor: `${palette.successGreen}33` }]}>
                <ThemedText type="small" style={[styles.timeBadgeText, { color: palette.successGreen }]} numberOfLines={1}>
                  {slaLabel}
                </ThemedText>
              </View>
            )}
          </View>

          {isOpenList ? (
            <>
              {item.name != null && item.name !== "" && (
                <View style={styles.cardRow}>
                  <Feather name="user" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="body" style={[styles.cardName, { color: palette.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
                    {item.name}
                  </ThemedText>
                </View>
              )}
              {item.phone != null && item.phone !== "" && (
                <View style={styles.cardRow}>
                  <Feather name="phone" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="small" style={[styles.cardMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                    {item.phone}
                  </ThemedText>
                </View>
              )}
              {(item.purpose != null || item.reason != null) && category !== "—" && (
                <View style={styles.cardRow}>
                  <Feather name="target" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="small" style={[styles.cardMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                    {category}
                  </ThemedText>
                </View>
              )}
              <View style={styles.cardRow}>
                <Feather name="log-in" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                <ThemedText type="small" style={[styles.cardTime, { color: palette.textSecondary }]}>
                  Entered {formatEntryTime(item.entry_time)}
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              {item.name != null && item.name !== "" && (
                <View style={styles.cardRow}>
                  <Feather name="user" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="body" style={[styles.cardName, { color: palette.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
                    {item.name}
                  </ThemedText>
                </View>
              )}
              {item.phone != null && item.phone !== "" && (
                <View style={styles.cardRow}>
                  <Feather name="phone" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="small" style={[styles.cardMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                    {item.phone}
                  </ThemedText>
                </View>
              )}
              {(item.purpose != null || item.reason != null) && category !== "—" && (
                <View style={styles.cardRow}>
                  <Feather name="target" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="small" style={[styles.cardMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                    {category}
                  </ThemedText>
                </View>
              )}
              <View style={styles.cardRow}>
                <Feather name="log-in" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                <ThemedText type="small" style={[styles.cardTime, { color: palette.textSecondary }]}>
                  Entered {formatEntryTime(item.entry_time)}
                </ThemedText>
              </View>
              {item.exit_time && (
                <View style={styles.cardRow}>
                  <Feather name="log-out" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="small" style={[styles.cardTime, { color: palette.textSecondary }]}>
                    Exited {formatEntryTime(item.exit_time)}
                  </ThemedText>
                </View>
              )}
              {item.regNumber != null && item.regNumber !== "" && (
                <View style={styles.cardRow}>
                  <Feather name="package" size={16} color={palette.textSecondary} style={styles.cardRowIcon} />
                  <ThemedText type="small" style={[styles.cardMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                    {item.regNumber}
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
}

/** GET /api/v1/entry-app?view=open|closed&limit=50 → { success, data: [...] }. On 401 tries refresh then retries. */
async function fetchTicketList(
  filter: "open" | "closed",
  _hubId?: string,
  accessToken?: string | null,
): Promise<TicketListItem[]> {
  try {
    const path = getEntryAppListPath(filter, 50);
    const res = await fetchWithAuthRetry(path, accessToken);
    if (!res.ok) return [];
    const json = (await res.json()) as { success?: boolean; data?: unknown[] };
    const list = Array.isArray(json.data) ? json.data as Record<string, unknown>[] : [];
    return list.map((item) => normalizeTicketListItem(item));
  } catch {
    return [];
  }
}

export default function TicketListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TicketListRouteProp>();
  const { filter } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const palette = getScreenPalette(theme);
  const auth = useAuth();

  const {
    data: list = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ticket-list", filter, auth.accessToken],
    queryFn: () => fetchTicketList(filter, undefined, auth.accessToken),
    staleTime: 15_000,
  });

  const isOpen = filter === "open";
  const [searchQuery, setSearchQuery] = useState("");
  const [showOver2HoursOnly, setShowOver2HoursOnly] = useState(false);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(
      (t) =>
        (t.token_no ?? "").toLowerCase().includes(q) ||
        (t.name ?? "").toLowerCase().includes(q) ||
        (t.phone ?? "").toLowerCase().includes(q) ||
        (t.reason ?? "").toLowerCase().includes(q) ||
        (t.purpose ?? "").toLowerCase().includes(q) ||
        (t.desk_location ?? "").toLowerCase().includes(q) ||
        (t.regNumber ?? "").toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const over2HoursList = useMemo(
    () =>
      isOpen
        ? filteredList.filter((t) => isEntryOlderThan2Hours(t.entry_time))
        : [],
    [filteredList, isOpen]
  );
  const over2HoursCount = over2HoursList.length;

  const displayList = useMemo(() => {
    if (isOpen && showOver2HoursOnly) return over2HoursList;
    return filteredList;
  }, [isOpen, showOver2HoursOnly, filteredList, over2HoursList]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const headerTitle = isOpen ? "Open Tickets" : "Closed Tickets";
  const headerSubtitle =
    list.length === 0
      ? isOpen
        ? "No tickets"
        : "No completed tickets"
      : isOpen
        ? `${list.length} active`
        : `${list.length} completed`;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Flat header: safe-area aware, flexible min height for title + subtitle */}
      <View style={[styles.headerWrap, { paddingTop: insets.top, paddingBottom: Spacing.sm }]}>
        <View style={[styles.headerBar, { minHeight: HEADER_BAR_MIN_HEIGHT }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={8}
            accessibilityLabel="Go back"
          >
            <Feather name="chevron-left" size={HEADER_ICON_SIZE} color={palette.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="h3" style={[styles.headerTitle, { color: palette.textPrimary }]}>
              {headerTitle}
            </ThemedText>
            <ThemedText type="small" variant="secondary" style={styles.headerSubtitle}>
              {headerSubtitle}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refetch();
            }}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={8}
            accessibilityLabel="Refresh"
          >
            <Feather name="refresh-cw" size={HEADER_ICON_SIZE} color={palette.textSecondary} />
          </Pressable>
        </View>
        {isOpen && over2HoursCount > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowOver2HoursOnly((prev) => !prev);
            }}
            style={({ pressed }) => [
              styles.overdueStrip,
              { backgroundColor: palette.overdueStrip, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText type="small" style={[styles.overdueStripText, { color: palette.overdueBadgeText }]}>
              ⚠ {over2HoursCount} ticket{over2HoursCount === 1 ? "" : "s"} overdue &gt; 2h
            </ThemedText>
            <ThemedText type="small" style={[styles.overdueStripAction, { color: palette.overdueBadgeText }]}>
              {showOver2HoursOnly ? "Show all" : "View"}
            </ThemedText>
          </Pressable>
        )}
        <View style={[styles.headerDivider, { backgroundColor: palette.divider }]} />
      </View>

      {isLoading ? (
        <View style={[styles.center, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <ActivityIndicator size="large" color={isOpen ? palette.primaryRed : palette.successGreen} />
          <ThemedText type="body" variant="secondary" style={styles.loadingText}>
            Loading {isOpen ? "open" : "closed"} tickets…
          </ThemedText>
        </View>
      ) : list.length === 0 ? (
        <View style={[styles.center, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Feather name={isOpen ? "inbox" : "archive"} size={48} color={palette.textSecondary} />
          <ThemedText type="h4" style={[styles.emptyTitle, { color: palette.textPrimary }]}>
            No {isOpen ? "open" : "closed"} tickets
          </ThemedText>
          <ThemedText type="body" variant="secondary" style={styles.emptySubtitle}>
            {isOpen ? "Tickets will appear here when created." : "Closed tickets will appear here."}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketRow
              item={item}
              isOpenList={isOpen}
              palette={palette}
              onPress={() => navigation.navigate("TicketDetail", { ticketId: item.id })}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: palette.divider }]} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={isOpen ? palette.primaryRed : palette.successGreen}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={[styles.searchBarWrap, { backgroundColor: palette.card, borderColor: palette.divider }]}>
                <Feather name="search" size={18} color={palette.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: palette.textPrimary }]}
                  placeholder="Search token, name, phone"
                  placeholderTextColor={palette.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 ? (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={Spacing.md} style={styles.searchClear}>
                    <Feather name="x-circle" size={18} color={palette.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <ThemedText type="body" variant="secondary">
                {showOver2HoursOnly ? "No overdue tickets (2h+)." : "No tickets match your search."}
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Layout.horizontalScreenPadding,
  },
  headerWrap: {
    paddingBottom: 0,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: HEADER_TOUCH_SIZE,
    height: HEADER_TOUCH_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.lg,
    marginRight: Spacing.md,
    minWidth: 0,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontWeight: "600",
    lineHeight: 28,
  },
  headerSubtitle: {
    marginTop: 2,
    lineHeight: 20,
  },
  overdueStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  overdueStripText: {
    fontWeight: "500",
  },
  overdueStripAction: {
    fontWeight: "600",
    marginLeft: Spacing.md,
  },
  headerDivider: {
    height: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.md,
  },
  emptyTitle: {
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  listContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: 0,
  },
  listHeader: {
    marginBottom: Spacing.lg,
  },
  separator: {
    height: Spacing.md,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: SEARCH_RADIUS,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 16,
  },
  searchClear: {
    padding: Spacing.xs,
  },
  emptySearch: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  cardOuter: {
    position: "relative",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  cardStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: OVERDUE_STRIP_INDICATOR_WIDTH,
    borderTopLeftRadius: CARD_RADIUS,
    borderBottomLeftRadius: CARD_RADIUS,
    zIndex: 2,
  },
  card: {
    borderRadius: CARD_RADIUS,
    padding: Spacing.xl,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  cardRowIcon: {
    marginRight: Spacing.sm,
  },
  cardMain: {
    gap: Spacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  tokenNo: {
    fontWeight: "600",
  },
  timeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontWeight: "500",
  },
  cardName: {
    fontWeight: "500",
    lineHeight: 24,
    flex: 1,
    minWidth: 0,
  },
  cardMeta: {
    opacity: 0.9,
  },
  cardTime: {
    marginTop: 2,
    opacity: 0.85,
  },
});
