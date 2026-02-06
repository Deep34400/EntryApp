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
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { HomeHeaderButton } from "@/components/HomeHeaderButton";
import { RefreshHeaderButton } from "@/components/RefreshHeaderButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { getTicketListPath, appendHubIdToPath } from "@/lib/api-endpoints";
import { useHub } from "@/contexts/HubContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

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
  vehicle_reg_number?: string;
}

function normalizeTicket(item: Record<string, unknown>): TicketListItem {
  const id =
    String(item.id ?? item.token_no ?? item.token ?? "") || `row-${Date.now()}`;
  return {
    id,
    token_no: String(item.token_no ?? item.token ?? item.id ?? ""),
    name: item.name != null ? String(item.name) : undefined,
    purpose: item.purpose != null ? String(item.purpose) : undefined,
    reason: item.reason != null ? String(item.reason) : undefined,
    entry_time:
      item.entry_time != null ? String(item.entry_time) : undefined,
    exit_time:
      item.exit_time != null ? String(item.exit_time) : undefined,
    agent_name:
      item.agent_name != null ? String(item.agent_name) : undefined,
    desk_location:
      item.desk_location != null ? String(item.desk_location) : undefined,
    status: item.status != null ? String(item.status) : undefined,
    vehicle_reg_number:
      item.vehicle_reg_number != null
        ? String(item.vehicle_reg_number)
        : item.vehicle != null
          ? String(item.vehicle)
          : undefined,
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

function isEntryOlderThan2Hours(entryTime?: string): boolean {
  if (!entryTime) return false;
  try {
    const entry = new Date(entryTime).getTime();
    return Date.now() - entry > TWO_HOURS_MS;
  } catch {
    return false;
  }
}

function TicketRow({
  item,
  theme,
  primary,
  onPress,
  errorColor,
  isOpenList,
}: {
  item: TicketListItem;
  theme: { text: string; textSecondary: string; backgroundDefault: string };
  primary: string;
  onPress: () => void;
  errorColor: string;
  isOpenList: boolean;
}) {
  const category = getCategoryLabel(item);
  const isOver2Hours = isOpenList && isEntryOlderThan2Hours(item.entry_time);
  const borderColor = isOver2Hours ? errorColor : primary;
  const timeColor = isOver2Hours ? errorColor : theme.textSecondary;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderLeftColor: borderColor,
          opacity: pressed ? 0.92 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 3,
        },
      ]}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardTop}>
          <ThemedText type="h4" style={[styles.tokenNo, { color: primary }]}>
            #{item.token_no}
          </ThemedText>
          {isOpenList ? (
            <ThemedText type="h4" style={[styles.waitingHours, { color: timeColor }]}>
              {formatWaitingHours(item.entry_time)}
            </ThemedText>
          ) : (
            <ThemedText type="h4" style={[styles.waitingHours, { color: theme.textSecondary }]}>
              {formatDurationHours(item.entry_time, item.exit_time)}
            </ThemedText>
          )}
        </View>
        {isOpenList ? (
          <View style={styles.infoRow}>
            <Feather name="log-in" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
              Entered: {formatEntryTime(item.entry_time)}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.timeBlock}>
            <View style={styles.infoRow}>
              <Feather name="log-in" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
                Entered: {formatEntryTime(item.entry_time)}
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Feather name="log-out" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
                Exited: {formatEntryTime(item.exit_time)}
              </ThemedText>
            </View>
          </View>
        )}
        {item.name != null && item.name !== "" && (
          <View style={styles.infoRow}>
            <Feather name="user" size={14} color={theme.textSecondary} />
            <ThemedText type="body" style={[styles.infoText, { color: theme.text }]}>
              {item.name}
            </ThemedText>
          </View>
        )}
        {item.vehicle_reg_number != null && item.vehicle_reg_number !== "" && (
          <View style={styles.infoRow}>
            <Feather name="truck" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
              Reg: {item.vehicle_reg_number}
            </ThemedText>
          </View>
        )}
        {(item.purpose != null || item.reason != null) && category !== "—" && (
          <View style={styles.infoRow}>
            <Feather name="file-text" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
              {category}
            </ThemedText>
          </View>
        )}
        {item.desk_location != null && item.desk_location !== "" && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
              {item.desk_location}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

async function fetchTicketList(
  filter: "open" | "closed",
  hubId?: string,
): Promise<TicketListItem[]> {
  try {
    const baseUrl = getApiUrl();
    const path = appendHubIdToPath(getTicketListPath(filter), hubId);
    const url = new URL(path, baseUrl);
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return [];
    const data = (await res.json()) as Record<string, unknown>;
    const results = data.results as Record<string, unknown> | undefined;
    const rawList = results?.data;
    const list = Array.isArray(rawList) ? rawList as Record<string, unknown>[] : [];
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
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { hub } = useHub();

  const {
    data: list = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ticket-list", filter, hub?.id],
    queryFn: () => fetchTicketList(filter, hub?.id),
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
        (t.reason ?? "").toLowerCase().includes(q) ||
        (t.purpose ?? "").toLowerCase().includes(q) ||
        (t.desk_location ?? "").toLowerCase().includes(q) ||
        (t.vehicle_reg_number ?? "").toLowerCase().includes(q)
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
      headerRight: () => (
        <View style={styles.headerRight}>
          <RefreshHeaderButton onRefresh={() => refetch()} />
          <HomeHeaderButton />
        </View>
      ),
    });
  }, [navigation, refetch]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText
            type="body"
            style={[styles.loadingText, { color: theme.textSecondary }]}
          >
            Loading {isOpen ? "open" : "closed"} tickets…
          </ThemedText>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Feather
            name={isOpen ? "inbox" : "archive"}
            size={48}
            color={theme.textSecondary}
          />
          <ThemedText
            type="h4"
            style={[styles.emptyTitle, { color: theme.text }]}
          >
            No {isOpen ? "open" : "closed"} tickets
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptySubtitle, { color: theme.textSecondary }]}
          >
            {isOpen
              ? "Tickets will appear here when created."
              : "Closed tickets will appear here."}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketRow
              item={item}
              theme={theme}
              primary={theme.primary}
              errorColor={theme.error}
              isOpenList={isOpen}
              onPress={() =>
                navigation.navigate("TicketDetail", { ticketId: item.id })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={{ height: Spacing.md }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {isOpen && over2HoursCount > 0 ? (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowOver2HoursOnly((prev) => !prev);
                  }}
                  style={({ pressed }) => [
                    styles.alertBanner,
                    { backgroundColor: theme.error, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <View style={styles.alertBannerContent}>
                    <View style={styles.alertBannerRow}>
                      <Feather name="alert-triangle" size={20} color="#FFFFFF" style={styles.alertIcon} />
                      <ThemedText type="body" style={styles.alertTitle}>
                        {over2HoursCount} ticket{over2HoursCount === 1 ? "" : "s"} waiting over 2 hours
                      </ThemedText>
                    </View>
                    <View style={styles.alertBannerAction}>
                      <ThemedText type="body" style={styles.alertActionText}>
                        {showOver2HoursOnly ? "Show all tickets" : "Show only these"}
                      </ThemedText>
                      <Feather
                        name={showOver2HoursOnly ? "list" : "filter"}
                        size={18}
                        color="#FFFFFF"
                        style={styles.alertActionIcon}
                      />
                    </View>
                  </View>
                </Pressable>
              ) : null}
              <View style={[styles.searchBarWrap, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search by token, name, reason..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 ? (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={Spacing.md} style={styles.searchClear}>
                    <Feather name="x-circle" size={20} color={theme.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.countRow}>
                <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
                  <ThemedText type="body" style={[styles.countNumber, { color: theme.buttonText }]}>
                    {displayList.length}
                  </ThemedText>
                </View>
                <ThemedText type="body" style={[styles.countLabel, { color: theme.textSecondary }]}>
                  {displayList.length === 1 ? "ticket" : "tickets"}
                  {showOver2HoursOnly ? " (overdue 2h+)" : ` (${isOpen ? "open" : "closed"})`}
                </ThemedText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {showOver2HoursOnly
                  ? "No overdue tickets (2h+)."
                  : "No tickets match your search."}
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
    paddingHorizontal: Spacing.lg,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.xs,
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
    paddingBottom: Spacing.xl,
  },
  listHeader: {
    marginBottom: Spacing.lg,
  },
  alertBanner: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  alertBannerContent: {
    gap: Spacing.sm,
  },
  alertBannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertIcon: {
    marginRight: Spacing.sm,
  },
  alertTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    flex: 1,
  },
  alertBannerAction: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  alertActionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  alertActionIcon: {
    opacity: 0.95,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
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
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  countBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  countNumber: {
    fontWeight: "700",
  },
  countLabel: {},
  emptySearch: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.lg,
  },
  cardMain: {
    flex: 1,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenNo: {
    fontWeight: "700",
  },
  waitingHours: {
    fontWeight: "700",
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  time: {},
  timeBlock: {
    gap: Spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
  },
});
