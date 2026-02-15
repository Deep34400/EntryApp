import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { fetchWithAuthRetry } from "@/lib/query-client";
import { getEntryAppListPath } from "@/lib/api-endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

// Dark premium palette for Open/Closed Tickets screen
const PALETTE = {
  background: "#0F1115",
  card: "#1A1D24",
  primaryRed: "#E53935",
  warningOrange: "#FF8F00",
  successGreen: "#2ECC71",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A4AB",
  divider: "#2A2E36",
  headerGradientStart: "#0F1115",
  headerGradientEnd: "#151922",
  headerButtonBg: "#1A1D24",
  alertGradientStart: "#E53935",
  alertGradientEnd: "#B71C1C",
} as const;

const HEADER_HEIGHT = 56;
const HEADER_BUTTON_SIZE = 40;
const HEADER_PADDING_H = 16;

const CARD_RADIUS = 18;
const SEARCH_RADIUS = 16;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "TicketList">;
type TicketListRouteProp = RouteProp<RootStackParamList, "TicketList">;

export interface TicketListItem {
  id: string;
  token_no: string;
  name?: string;
  purpose?: string;
  reason?: string;
  entry_time?: string;
  exit_time?: string;
  agent_name?: string;
  desk_location?: string;
  status?: string;
  regNumber?: string;
  phone?: string;
}

/** Normalize API item (camelCase or snake_case) to TicketListItem */
function normalizeTicket(item: Record<string, unknown>): TicketListItem {
  const id =
    String(item.id ?? item.token_no ?? item.token ?? "") || `row-${Date.now()}`;
  const tokenNo = item.tokenNo ?? item.token_no ?? item.token ?? item.id;
  const entryTime = item.entryTime ?? item.entry_time;
  const exitTime = item.exitTime ?? item.exit_time;
  const regNumber = item.regNumber ?? item.reg_number ?? item.vehicle;
  return {
    id,
    token_no: String(tokenNo ?? ""),
    name: item.name != null ? String(item.name) : undefined,
    purpose: item.purpose != null ? String(item.purpose) : undefined,
    reason: item.reason != null ? String(item.reason) : undefined,
    entry_time: entryTime != null ? String(entryTime) : undefined,
    exit_time: exitTime != null ? String(exitTime) : undefined,
    agent_name: item.agentName != null ? String(item.agentName) : item.agent_name != null ? String(item.agent_name) : undefined,
    desk_location: item.deskLocation != null ? String(item.deskLocation) : item.desk_location != null ? String(item.desk_location) : undefined,
    status: item.status != null ? String(item.status) : undefined,
    regNumber: regNumber != null ? String(regNumber) : undefined,
    phone: item.phone != null ? String(item.phone) : undefined,
  };
}

function formatEntryTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Right-side label: hours only, e.g. "3h", "48h", or "45m" (waiting since entry for open) */
function formatWaitingHours(entryTime?: string): string {
  if (!entryTime) return "—";
  try {
    const entry = new Date(entryTime).getTime();
    const ms = Date.now() - entry;
    if (ms < 0) return "—";
    const mins = Math.floor(ms / 60_000);
    const hours = Math.floor(mins / 60);
    if (hours >= 1) return `${hours}h`;
    return mins < 60 ? `${mins}m` : "1h";
  } catch {
    return "—";
  }
}

/** Duration between entry and exit for closed tickets, e.g. "3h", "48h", "45m" */
function formatDurationHours(entryTime?: string, exitTime?: string): string {
  if (!entryTime || !exitTime) return "—";
  try {
    const entry = new Date(entryTime).getTime();
    const exit = new Date(exitTime).getTime();
    const ms = exit - entry;
    if (ms < 0) return "—";
    const mins = Math.floor(ms / 60_000);
    const hours = Math.floor(mins / 60);
    if (hours >= 1) return `${hours}h`;
    return mins < 60 ? `${mins}m` : "1h";
  } catch {
    return "—";
  }
}

/** Category line: "Reason • Purpose" or just purpose (e.g. "Accident • Maintenance", "Sourcing • Sourcing") */
function getCategoryLabel(item: TicketListItem): string {
  const reason = (item.reason ?? "").trim();
  const purpose = (item.purpose ?? "").trim();
  if (reason && purpose && reason !== purpose) return `${reason} • ${purpose}`;
  if (reason) return reason;
  if (purpose) return purpose;
  return "—";
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_MINS_MS = 30 * 60 * 1000;

function isEntryOlderThan2Hours(entryTime?: string): boolean {
  if (!entryTime) return false;
  try {
    const entry = new Date(entryTime).getTime();
    return Date.now() - entry > TWO_HOURS_MS;
  } catch {
    return false;
  }
}

/** Waiting minutes since entry (for open tickets). */
function getWaitingMinutes(entryTime?: string): number | null {
  if (!entryTime) return null;
  try {
    const entry = new Date(entryTime).getTime();
    const ms = Date.now() - entry;
    return ms < 0 ? null : Math.floor(ms / 60_000);
  } catch {
    return null;
  }
}

/** Time badge color: grey <30m, orange 30m–2h, red >2h */
function getTimeBadgeColor(waitingMinutes: number | null): string {
  if (waitingMinutes == null) return PALETTE.textSecondary;
  if (waitingMinutes < 30) return PALETTE.textSecondary;
  if (waitingMinutes < 120) return PALETTE.warningOrange;
  return PALETTE.primaryRed;
}

function TicketRow({
  item,
  onPress,
  isOpenList,
}: {
  item: TicketListItem;
  onPress: () => void;
  isOpenList: boolean;
}) {
  const category = getCategoryLabel(item);
  const isOverdue = isOpenList && isEntryOlderThan2Hours(item.entry_time);
  const waitingMinutes = isOpenList ? getWaitingMinutes(item.entry_time) : null;
  const timeBadgeColor = getTimeBadgeColor(waitingMinutes);
  const duration = formatDurationHours(item.entry_time, item.exit_time);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: PALETTE.card,
          borderLeftWidth: isOverdue ? 2 : 0,
          borderLeftColor: PALETTE.primaryRed,
          opacity: pressed ? 0.92 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
        },
      ]}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardTop}>
          <ThemedText
            type="h4"
            style={[styles.tokenNo, { color: isOpenList ? PALETTE.primaryRed : PALETTE.textPrimary }]}
          >
            #{item.token_no}
          </ThemedText>
          {isOpenList ? (
            <View style={[styles.timeBadge, { backgroundColor: `${timeBadgeColor}22` }]}>
              <ThemedText
                type="small"
                style={[styles.timeBadgeText, { color: timeBadgeColor }]}
                numberOfLines={1}
              >
                {formatWaitingHours(item.entry_time)}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.completedBadge, { backgroundColor: PALETTE.successGreen }]}>
              <ThemedText type="small" style={styles.completedBadgeText} numberOfLines={1}>
                Completed • {duration}
              </ThemedText>
            </View>
          )}
        </View>

        {isOpenList ? (
          <>
            {item.name != null && item.name !== "" && (
              <ThemedText type="body" style={[styles.cardName, { color: PALETTE.textPrimary }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
            )}
            {item.phone != null && item.phone !== "" && (
              <ThemedText type="small" style={[styles.cardMeta, { color: PALETTE.textSecondary }]} numberOfLines={1}>
                {item.phone}
              </ThemedText>
            )}
            {(item.purpose != null || item.reason != null) && category !== "—" && (
              <ThemedText type="small" style={[styles.cardMeta, { color: PALETTE.textSecondary }]} numberOfLines={1}>
                {category}
              </ThemedText>
            )}
            <ThemedText type="small" style={[styles.cardTime, { color: PALETTE.textSecondary }]}>
              Entered {formatEntryTime(item.entry_time)}
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="small" style={[styles.cardTime, { color: PALETTE.textSecondary }]}>
              Entered: {formatEntryTime(item.entry_time)}
            </ThemedText>
            {item.exit_time && (
              <ThemedText type="small" style={[styles.cardTime, { color: PALETTE.textSecondary }]}>
                Exited: {formatEntryTime(item.exit_time)}
              </ThemedText>
            )}
            {item.name != null && item.name !== "" && (
              <ThemedText type="body" style={[styles.cardName, styles.cardNameClosed, { color: PALETTE.textPrimary }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
            )}
            {item.phone != null && item.phone !== "" && (
              <ThemedText type="small" style={[styles.cardMeta, { color: PALETTE.textSecondary }]} numberOfLines={1}>
                {item.phone}
              </ThemedText>
            )}
            {item.regNumber != null && item.regNumber !== "" && (
              <ThemedText type="small" style={[styles.cardMeta, styles.cardVehicle, { color: PALETTE.textSecondary }]} numberOfLines={1}>
                {item.regNumber}
              </ThemedText>
            )}
            {(item.purpose != null || item.reason != null) && category !== "—" && (
              <ThemedText type="small" style={[styles.cardMeta, { color: PALETTE.textSecondary }]} numberOfLines={1}>
                {category}
              </ThemedText>
            )}
            <View style={styles.cardDivider} />
            <ThemedText type="small" style={[styles.cardDuration, { color: PALETTE.textSecondary }]}>
              Total Duration: {duration}
            </ThemedText>
          </>
        )}
      </View>
    </Pressable>
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
    return list.map((item) => normalizeTicket(item));
  } catch {
    return [];
  }
}

export default function TicketListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TicketListRouteProp>();
  const { filter } = route.params;
  const insets = useSafeAreaInsets();
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
        ? `${list.length} ${list.length === 1 ? "ticket" : "tickets"} active`
        : `${list.length} completed`;

  const screenWidth = Dimensions.get("window").width;

  return (
    <View style={[styles.container, { backgroundColor: PALETTE.background }]}>
      {/* Premium header: dark charcoal gradient, circular buttons, title + subtitle */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerGradientWrap}>
          <Svg width={screenWidth} height={HEADER_HEIGHT} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={PALETTE.headerGradientStart} stopOpacity={1} />
                <Stop offset="100%" stopColor={PALETTE.headerGradientEnd} stopOpacity={1} />
              </SvgLinearGradient>
            </Defs>
            <Rect x={0} y={0} width={screenWidth} height={HEADER_HEIGHT} fill="url(#headerGrad)" />
          </Svg>
          <View style={styles.headerRowOverlay}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              style={({ pressed }) => [styles.headerCircleBtn, { opacity: pressed ? 0.8 : 1 }]}
              hitSlop={12}
              accessibilityLabel="Go back"
            >
              <View style={styles.headerCircleInner}>
                <Feather name="chevron-left" size={22} color={PALETTE.textPrimary} />
              </View>
            </Pressable>
            <View style={styles.headerCenter}>
              <ThemedText type="h3" style={styles.headerTitle}>
                {headerTitle}
              </ThemedText>
              <ThemedText type="small" style={styles.headerSubtitle}>
                {headerSubtitle}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                refetch();
              }}
              style={({ pressed }) => [styles.headerCircleBtn, { opacity: pressed ? 0.8 : 1 }]}
              hitSlop={12}
              accessibilityLabel="Refresh"
            >
              <View style={styles.headerCircleInner}>
                <Feather name="refresh-cw" size={20} color={PALETTE.textPrimary} />
              </View>
            </Pressable>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </View>

      {isLoading ? (
        <View style={[styles.center, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <ActivityIndicator size="large" color={isOpen ? PALETTE.primaryRed : PALETTE.successGreen} />
          <ThemedText type="body" style={[styles.loadingText, { color: PALETTE.textSecondary }]}>
            Loading {isOpen ? "open" : "closed"} tickets…
          </ThemedText>
        </View>
      ) : list.length === 0 ? (
        <View style={[styles.center, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Feather name={isOpen ? "inbox" : "archive"} size={48} color={PALETTE.textSecondary} />
          <ThemedText type="h4" style={[styles.emptyTitle, { color: PALETTE.textPrimary }]}>
            No {isOpen ? "open" : "closed"} tickets
          </ThemedText>
          <ThemedText type="body" style={[styles.emptySubtitle, { color: PALETTE.textSecondary }]}>
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
              onPress={() => navigation.navigate("TicketDetail", { ticketId: item.id })}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={isOpen ? PALETTE.primaryRed : PALETTE.successGreen}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {isOpen && over2HoursCount > 0 && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowOver2HoursOnly((prev) => !prev);
                  }}
                  style={({ pressed }) => [styles.alertBanner, { opacity: pressed ? 0.9 : 1 }]}
                >
                  <ThemedText type="body" style={styles.alertText}>
                    {over2HoursCount} ticket{over2HoursCount === 1 ? "" : "s"} waiting over 2 hours
                  </ThemedText>
                  <View style={styles.alertPill}>
                    <ThemedText type="small" style={styles.alertPillText}>
                      {showOver2HoursOnly ? "Show all" : "Filter Overdue"}
                    </ThemedText>
                  </View>
                </Pressable>
              )}
              <View style={styles.searchBarWrap}>
                <View style={styles.searchBarInner}>
                  <Feather name="search" size={20} color={PALETTE.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by token, name, phone…"
                    placeholderTextColor={PALETTE.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 ? (
                    <Pressable onPress={() => setSearchQuery("")} hitSlop={Spacing.md} style={styles.searchClear}>
                      <Feather name="x-circle" size={20} color={PALETTE.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <ThemedText type="body" style={{ color: PALETTE.textSecondary }}>
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
    paddingHorizontal: HEADER_PADDING_H,
  },
  headerWrap: {
    paddingHorizontal: HEADER_PADDING_H,
    paddingBottom: 0,
  },
  headerGradientWrap: {
    height: HEADER_HEIGHT,
    position: "relative",
  },
  headerRowOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  headerCircleBtn: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    backgroundColor: PALETTE.headerButtonBg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCircleInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.md,
    minWidth: 0,
    justifyContent: "center",
  },
  headerTitle: {
    color: PALETTE.textPrimary,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: PALETTE.textSecondary,
    marginTop: 2,
  },
  headerDivider: {
    height: 1,
    backgroundColor: PALETTE.divider,
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
  alertBanner: {
    backgroundColor: PALETTE.alertGradientEnd,
    borderRadius: CARD_RADIUS,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  alertText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  alertPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
  },
  alertPillText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  searchBarWrap: {
    height: 48,
    borderRadius: SEARCH_RADIUS,
    overflow: "hidden",
    backgroundColor: "rgba(42, 46, 54, 0.8)",
    borderWidth: 1,
    borderColor: PALETTE.divider,
  },
  searchBarInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    height: "100%",
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 16,
    color: PALETTE.textPrimary,
  },
  searchClear: {
    padding: Spacing.xs,
  },
  emptySearch: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  card: {
    borderRadius: CARD_RADIUS,
    padding: Spacing.xl,
    borderLeftWidth: 0,
  },
  cardMain: {
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  tokenNo: {
    fontWeight: "700",
  },
  timeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  timeBadgeText: {
    fontWeight: "600",
  },
  completedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  completedBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  cardName: {
    fontWeight: "600",
  },
  cardNameClosed: {
    fontSize: 17,
    marginTop: 2,
  },
  cardMeta: {
    opacity: 0.9,
  },
  cardVehicle: {
    opacity: 0.85,
  },
  cardTime: {
    marginTop: 2,
    opacity: 0.8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: PALETTE.divider,
    marginVertical: Spacing.md,
  },
  cardDuration: {
    fontWeight: "600",
    opacity: 0.95,
  },
});
