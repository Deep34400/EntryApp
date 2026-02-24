import React, { useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { BackArrow } from "@/components/BackArrow";
import { formatDateTime } from "@/lib/format";
import { getWaitingMinutes, getCategoryLabel } from "@/lib/ticket-utils";
import { getTicketById, updateTicket } from "@/apis";
import type { TicketDetailResult, TicketListItem } from "@/types/ticket";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getEntryTypeDisplayLabel } from "@/utils/entryType";
import { usePermissions } from "@/permissions/usePermissions";

type InfiniteListData = { pages: { list: TicketListItem[] }[] };

function getTicketFromListCache(
  queryClient: QueryClient,
  ticketId: string,
): TicketDetailResult | null {
  const listKeys = [
    ["ticket-list", "open"],
    ["ticket-list", "delayed"],
    ["ticket-list", "closed"],
  ] as const;
  for (const key of listKeys) {
    const queriesData = queryClient.getQueriesData<InfiniteListData>({ queryKey: key });
    for (const [, data] of queriesData) {
      const pages = data?.pages;
      if (!pages) continue;
      for (const page of pages) {
        const found = page.list?.find((item) => item.id === ticketId);
        if (found) return listItemToDetailResult(found);
      }
    }
  }
  return null;
}

function listItemToDetailResult(item: TicketListItem): TicketDetailResult {
  return {
    id: item.id,
    token_no: item.token_no,
    name: item.name,
    phone: item.phone,
    reason: item.reason,
    status: item.status,
    entry_time: item.entry_time,
    exit_time: item.exit_time,
    assignee: item.agent_name,
    desk_location: item.desk_location,
    purpose: item.purpose,
    category: item.category,
    subCategory: item.subCategory,
    type: item.type,
  };
}

const FONT_POPPINS = "Poppins";
const HEADER_HEIGHT = 56; // Standard height for the back button area
const CARD_PADDING = 16;
const CARD_GAP = 16;
const CARD_BORDER_RADIUS = 12;
const TIME_BADGE_PADDING_V = 6;
const TIME_BADGE_PADDING_H = 12;
const TIME_BADGE_RADIUS = 8;
const AVATAR_SIZE = 44;
const CLOSE_BUTTON_HEIGHT = 52;
const CLOSE_BUTTON_RADIUS = 26;

type TicketDetailRouteProp = RouteProp<RootStackParamList, "TicketDetail">;

const isClosed = (status: string | undefined) =>
  status != null && (status.toUpperCase() === "CLOSED" || status === "closed");

function formatWaitingHoursDecimal(entryTime?: string | null): string {
  const mins = getWaitingMinutes(entryTime);
  if (mins == null) return "—";
  const hours = mins / 60;
  return hours >= 1 ? (Math.round(hours * 10) / 10).toFixed(1) : "0";
}

export default function TicketDetailScreen() {
  const route = useRoute<TicketDetailRouteProp>();
  const navigation = useNavigation();
  const { ticketId } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { canCloseTicket } = usePermissions();

  const ticketDetailQueryFn = useCallback(async (): Promise<TicketDetailResult | null> => {
    const fromCache = getTicketFromListCache(queryClient, ticketId);
    if (fromCache) return fromCache;
    return getTicketById(ticketId, auth.accessToken);
  }, [queryClient, ticketId, auth.accessToken]);

  const {
    data: ticket,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ticket-detail", ticketId, auth.accessToken],
    queryFn: ticketDetailQueryFn,
    staleTime: 30_000,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await updateTicket(ticketId, { status: "CLOSED" }, auth.accessToken);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-list"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-counts"] });
      refetch();
      navigation.goBack();
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const closed = ticket ? isClosed(ticket.status) : false;
  const waitingHours = formatWaitingHoursDecimal(ticket?.entry_time);
  const isStaff = getEntryTypeDisplayLabel(ticket?.type) === "Staff";

  const handleCloseTicket = () => {
    closeMutation.mutate();
  };

  // --- LOADING / ERROR STATE ---
  if (isLoading || !ticket) {
    return (
      <View style={styles.screen}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: 8, height: insets.top + HEADER_HEIGHT, justifyContent: 'center' }}>
          <BackArrow color="#161B1D" />
        </View>
        <View style={styles.centered}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#B31D38" />
              <Text style={styles.loadingText}>Loading ticket…</Text>
            </>
          ) : (
            <>
              <Feather name="alert-circle" size={48} color="#3F4C52" />
              <Text style={styles.errorTitle}>Ticket not found</Text>
              <Text style={styles.errorSubtitle}>The ticket may have been removed.</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const scrollPaddingBottom = closed ? insets.bottom + 24 : insets.bottom + CLOSE_BUTTON_HEIGHT + 40;

  return (
    <View style={styles.screen}>
      {/* FIXED HEADER: Arrow now respects Safe Area (Notches) */}
      <View style={{ 
        paddingTop: insets.top, 
        height: insets.top + HEADER_HEIGHT, 
        justifyContent: 'center',
        paddingHorizontal: 8 
      }}>
        <BackArrow color="#161B1D" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#B31D38" />
        }
      >
        {/* Card 1 — Token Info */}
        <View style={styles.card}>
          <View style={styles.tokenCardTopRow}>
            <View style={styles.tokenCardLeft}>
              <Text style={styles.tokenLabel}>Token</Text>
              <Text style={styles.tokenValue}>#{ticket.token_no}</Text>
            </View>
            {!closed ? (
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeHours}>{waitingHours}</Text>
                <Text style={styles.timeBadgeHrs}>hrs</Text>
              </View>
            ) : (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>Closed</Text>
              </View>
            )}
          </View>
          <View style={styles.divider} />
          <View style={styles.entryTimeRow}>
            <Text style={styles.entryTimeLabel}>{isStaff ? "Out Time" : "Entry Time"}</Text>
            <Text style={styles.entryTimeValue}>{formatDateTime(ticket.entry_time)}</Text>
          </View>
          {closed && (
            <View style={[styles.entryTimeRow, { marginTop: 12 }]}>
              <Text style={styles.entryTimeLabel}>Exit Time</Text>
              <Text style={styles.entryTimeValue}>
                {ticket.exit_time ? formatDateTime(ticket.exit_time) : "—"}
              </Text>
            </View>
          )}
        </View>

        {/* Card 2 — Driver Info */}
        <View style={styles.card}>
          <View style={styles.driverRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {ticket.name?.trim() ? ticket.name.trim().charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{ticket.name ?? "—"}</Text>
              <Text style={styles.driverRole}>{getEntryTypeDisplayLabel(ticket.type)}</Text>
            </View>
          </View>
        </View>

        {/* Card 3 — Assignment */}
        <View style={styles.card}>
          <Text style={styles.assignmentTitle}>Assignment</Text>
          <View style={styles.divider} />
          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Ticket</Text>
            <Text style={styles.assignmentValue}>
              {getCategoryLabel({ purpose: ticket.purpose, reason: ticket.reason, category: ticket.category, subCategory: ticket.subCategory }) || "—"}
            </Text>
          </View>
          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Agent</Text>
            <Text style={styles.assignmentValue}>{ticket.assignee ?? "—"}</Text>
          </View>
          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Desk/Location</Text>
            <Text style={styles.assignmentValue}>{ticket.desk_location ?? "—"}</Text>
          </View>
        </View>
      </ScrollView>

      {!closed && canCloseTicket && (
        <View style={[styles.closeButtonWrap, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable
            onPress={handleCloseTicket}
            disabled={closeMutation.isPending}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
          >
            {closeMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.closeButtonText}>{isStaff ? "Close Ticket (Mark IN)" : "Close Ticket (Mark Exit)"}</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    width: "100%",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: "#3F4C52",
    marginTop: 10,
  },
  errorTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: "#161B1D",
    marginTop: 12,
  },
  errorSubtitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: "#3F4C52",
    textAlign: "center",
  },
  card: {
    width: "100%",
    marginBottom: CARD_GAP,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EBEC",
    borderRadius: CARD_BORDER_RADIUS,
    padding: CARD_PADDING,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tokenCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenCardLeft: {
    flex: 1,
  },
  tokenLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: "#3F4C52",
  },
  tokenValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 22,
    fontWeight: "700",
    color: "#161B1D",
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FBEBEB",
    borderRadius: TIME_BADGE_RADIUS,
    paddingVertical: TIME_BADGE_PADDING_V,
    paddingHorizontal: TIME_BADGE_PADDING_H,
  },
  timeBadgeHours: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D33636",
  },
  timeBadgeHrs: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "500",
    color: "#D33636",
    marginLeft: 2,
  },
  closedBadge: {
    backgroundColor: "#E8F7F5",
    borderRadius: TIME_BADGE_RADIUS,
    paddingVertical: TIME_BADGE_PADDING_V,
    paddingHorizontal: TIME_BADGE_PADDING_H,
  },
  closedBadgeText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#147D6A",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F3",
    marginVertical: 16,
  },
  entryTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryTimeLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: "#3F4C52",
  },
  entryTimeValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#F0F2F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarLetter: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: "#161B1D",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "600",
    color: "#161B1D",
  },
  driverRole: {
    fontFamily: FONT_POPPINS,
    fontSize: 13,
    color: "#3F4C52",
  },
  assignmentTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 15,
    fontWeight: "600",
    color: "#161B1D",
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  assignmentLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: "#3F4C52",
    flex: 0.4,
  },
  assignmentValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
    flex: 0.6,
    textAlign: "right",
  },
  closeButtonWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  closeButton: {
    height: CLOSE_BUTTON_HEIGHT,
    backgroundColor: "#B31D38",
    borderRadius: CLOSE_BUTTON_RADIUS,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  closeButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  closeButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});