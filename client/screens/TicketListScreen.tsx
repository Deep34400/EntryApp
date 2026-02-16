import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { AppFooter, APP_FOOTER_HEIGHT } from "@/components/AppFooter";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { DesignTokens } from "@/constants/designTokens";
import { fetchWithAuthRetry } from "@/lib/query-client";
import { getEntryAppListPath } from "@/lib/api-endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatEntryTime, formatDurationHours } from "@/lib/format";
import type { TicketListItem } from "@/types/ticket";
import { normalizeTicketListItem } from "@/types/ticket";
import { isEntryOlderThan2Hours, getWaitingMinutes } from "@/lib/ticket-utils";

export type { TicketListItem } from "@/types/ticket";

type TabId = "Delayed" | "Open" | "Closed";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "TicketList">;
type TicketListRouteProp = RouteProp<RootStackParamList, "TicketList">;

const FONT_POPPINS = "Poppins";
const primaryRed = DesignTokens.login.headerRed;

async function fetchTicketList(
  filter: "open" | "closed",
  accessToken?: string | null,
): Promise<TicketListItem[]> {
  try {
    const path = getEntryAppListPath(filter, 50);
    const res = await fetchWithAuthRetry(path, accessToken);
    if (!res.ok) return [];
    const json = (await res.json()) as { success?: boolean; data?: unknown[] };
    const list = Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : [];
    return list.map((item) => normalizeTicketListItem(item));
  } catch {
    return [];
  }
}

function formatWaitingLabel(entryTime?: string | null): string {
  const mins = getWaitingMinutes(entryTime);
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function TicketCard({
  item,
  variant,
  onPress,
}: {
  item: TicketListItem;
  variant: "Delayed" | "Open" | "Closed";
  onPress: () => void;
}) {
  const isDelayed = variant === "Delayed";
  const isOpen = variant === "Open";

  const timeBadgeBg = isDelayed ? "#FBEBEB" : isOpen ? "#E8F7F5" : "#E8F7F5";
  const timeBadgeColor = isDelayed ? "#D33636" : isOpen ? "#147D6A" : "#147D6A";

  const timeLabel =
    variant === "Closed"
      ? formatDurationHours(item.entry_time, item.exit_time)
      : formatWaitingLabel(item.entry_time);

  const driverName = item.name ?? "—";
  const role = "Driver Partner";

  return (
    <View style={styles.cardWrapper}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <Text style={styles.ticketId}>#{item.token_no}</Text>
              <Text style={styles.cardDate}>{formatEntryTime(item.entry_time)}</Text>
            </View>
            <View style={[styles.timeBadge, { backgroundColor: timeBadgeBg }]}>
              <Text style={[styles.timeBadgeValue, { color: timeBadgeColor }]} numberOfLines={1}>
                {timeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.driverRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {driverName !== "—" ? driverName.trim().charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName} numberOfLines={1}>{driverName}</Text>
              <Text style={styles.driverRole} numberOfLines={1}>{role}</Text>
            </View>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress();
            }}
            style={({ pressed }) => [styles.viewDetailBtn, pressed && styles.viewDetailBtnPressed]}
          >
            <Text style={styles.viewDetailBtnText}>View Detail</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

export default function TicketListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TicketListRouteProp>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("Open");

  const { data: openList = [], isLoading: loadingOpen, isRefetching: refetchingOpen, refetch: refetchOpen } = useQuery({
    queryKey: ["ticket-list", "open", auth.accessToken],
    queryFn: () => fetchTicketList("open", auth.accessToken),
    staleTime: 15_000,
  });

  const { data: closedList = [], isLoading: loadingClosed, isRefetching: refetchingClosed, refetch: refetchClosed } = useQuery({
    queryKey: ["ticket-list", "closed", auth.accessToken],
    queryFn: () => fetchTicketList("closed", auth.accessToken),
    staleTime: 15_000,
  });

  const { delayedList, openListFiltered } = useMemo(() => {
    const delayed: TicketListItem[] = [];
    const open: TicketListItem[] = [];
    openList.forEach((t) => {
      if (isEntryOlderThan2Hours(t.entry_time)) delayed.push(t);
      else open.push(t);
    });
    return { delayedList: delayed, openListFiltered: open };
  }, [openList]);

  const delayedCount = delayedList.length;
  const openCount = openListFiltered.length;
  const closedCount = closedList.length;

  const currentList = useMemo(() => {
    switch (activeTab) {
      case "Delayed":
        return delayedList;
      case "Open":
        return openListFiltered;
      case "Closed":
        return closedList;
    }
  }, [activeTab, delayedList, openListFiltered, closedList]);

  const isLoading = loadingOpen || loadingClosed;
  const isRefetching = refetchingOpen || refetchingClosed;

  const refetch = () => {
    refetchOpen();
    refetchClosed();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "Delayed", label: "Delayed", count: delayedCount },
    { id: "Open", label: "Open", count: openCount },
    { id: "Closed", label: "Closed", count: closedCount },
  ];

  const listContentPaddingBottom = APP_FOOTER_HEIGHT + insets.bottom + Spacing["2xl"];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerSection, { paddingTop: insets.top }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Tickets</Text>
        </View>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.id);
                }}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={[styles.centered, { paddingBottom: listContentPaddingBottom }]}>
          <ActivityIndicator size="large" color={primaryRed} />
          <Text style={styles.loadingText} numberOfLines={1}>Loading tickets…</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={currentList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketCard
              item={item}
              variant={activeTab}
              onPress={() => navigation.navigate("TicketDetail", { ticketId: item.id })}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listContentPaddingBottom },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText} numberOfLines={1}>
                No {activeTab.toLowerCase()} tickets
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={primaryRed}
            />
          }
        />
      )}

      <AppFooter activeTab="Ticket" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DesignTokens.login.cardBg,
  },
  list: {
    flex: 1,
  },
  headerSection: {
    paddingTop: 0,
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingBottom: 0,
    minHeight: Layout.headerMinHeight + 36,
    backgroundColor: DesignTokens.login.cardBg,
    justifyContent: "flex-start",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTitleRow: {
    paddingVertical: Spacing.md + 3,
    paddingHorizontal: 0,
  },
  headerTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.login.otpText,
  },
  tabBar: {
    flexDirection: "row",
    minHeight: Layout.minTouchTarget,
    alignItems: "stretch",
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: primaryRed,
  },
  tabLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
  },
  tabLabelActive: {
    color: primaryRed,
    fontWeight: "600",
  },
  tabLabelInactive: {
    color: DesignTokens.login.otpText,
    fontWeight: "400",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Layout.contentGap,
  },
  loadingText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: DesignTokens.login.termsText,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingTop: Spacing.lg,
    alignSelf: "center",
    maxWidth: Layout.contentMaxWidth + Layout.horizontalScreenPadding * 2,
    width: "100%",
  },
  emptyWrap: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
  },
  emptyText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: DesignTokens.login.termsText,
  },
  cardWrapper: {
    marginBottom: Spacing.lg,
    maxWidth: Layout.contentMaxWidth,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: DesignTokens.login.cardBg,
    borderWidth: 1,
    borderColor: "#E8EBEC",
    borderRadius: BorderRadius.sm,
    padding: Layout.cardPadding,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardInner: {
    gap: Spacing.lg,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTopLeft: {
    flex: 1,
    minWidth: 0,
  },
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
  timeBadgeValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#E8EBEC",
  },
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
  driverInfo: {
    flex: 1,
    minWidth: 0,
  },
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
  viewDetailBtnPressed: {
    opacity: 0.9,
  },
  viewDetailBtnText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
