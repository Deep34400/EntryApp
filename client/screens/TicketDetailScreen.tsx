import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { formatDateTime } from "@/lib/format";
import { getWaitingMinutes } from "@/lib/ticket-utils";
import { fetchWithAuthRetry, apiRequestWithAuthRetry } from "@/lib/query-client";
import { getEntryAppDetailPath, getEntryAppUpdatePath } from "@/lib/api-endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const FONT_POPPINS = "Poppins";

const HEADER_HEIGHT = 54;
const HEADER_TOP_OFFSET = 24;
const CARD_MAX_WIDTH = 328;
const CARD_PADDING = 16;
const CARD_GAP = 16;
const CARD_BORDER_RADIUS = 12;
const TIME_BADGE_PADDING_V = 6;
const TIME_BADGE_PADDING_H = 12;
const TIME_BADGE_RADIUS = 8;
const AVATAR_SIZE = 40;
const CALL_BUTTON_HEIGHT = 40;
const CALL_BUTTON_RADIUS = 22;
const CLOSE_BUTTON_HEIGHT = 48;
const CLOSE_BUTTON_RADIUS = 22;

type TicketDetailRouteProp = RouteProp<RootStackParamList, "TicketDetail">;

export interface TicketDetailResult {
  id: string;
  token_no: string;
  name?: string;
  email?: string;
  phone?: string;
  reason?: string;
  agent_id?: string;
  status?: string;
  entry_time?: string;
  exit_time?: string | null;
  created_at?: string;
  updated_at?: string;
  assignee?: string;
  desk_location?: string;
  purpose?: string;
}

async function fetchTicketDetail(
  ticketId: string,
  _hubId?: string,
  accessToken?: string | null,
): Promise<TicketDetailResult | null> {
  try {
    const path = getEntryAppDetailPath(ticketId);
    const res = await fetchWithAuthRetry(path, accessToken);
    const json = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
    const d = json.data;
    if (!d) return null;
    const tokenNo = d.tokenNo ?? d.token_no ?? d.token;
    const entryTime = d.entryTime ?? d.entry_time;
    const exitTime = d.exitTime ?? d.exit_time;
    const createdAt = d.createdAt ?? d.created_at;
    const updatedAt = d.updatedAt ?? d.updated_at;
    const assignee = d.assignee ?? d.assignee_name;
    const deskLocation = d.deskLocation ?? d.desk_location;
    const agentId = d.agentId ?? d.agent_id;
    const purpose = d.purpose != null ? String(d.purpose) : undefined;
    return {
      id: String(d.id ?? ""),
      token_no: String(tokenNo ?? ""),
      name: d.name != null ? String(d.name) : undefined,
      email: d.email != null ? String(d.email) : undefined,
      phone: d.phone != null ? String(d.phone) : undefined,
      reason: d.reason != null ? String(d.reason) : undefined,
      purpose: purpose != null ? String(purpose) : undefined,
      agent_id: agentId != null ? String(agentId) : undefined,
      status: d.status != null ? String(d.status) : undefined,
      entry_time: entryTime != null ? String(entryTime) : undefined,
      exit_time: exitTime != null ? String(exitTime) : undefined,
      created_at: createdAt != null ? String(createdAt) : undefined,
      updated_at: updatedAt != null ? String(updatedAt) : undefined,
      assignee: assignee != null ? String(assignee) : undefined,
      desk_location: deskLocation != null ? String(deskLocation) : undefined,
    };
  } catch {
    return null;
  }
}

const isClosed = (status: string | undefined) =>
  status != null && (status.toUpperCase() === "CLOSED" || status === "closed");

/** Format waiting time as "3.5" (hours with one decimal) for open tickets. */
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

  const {
    data: ticket,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ticket-detail", ticketId, auth.accessToken],
    queryFn: () => fetchTicketDetail(ticketId, undefined, auth.accessToken),
    staleTime: 30_000,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await apiRequestWithAuthRetry(
        "PUT",
        getEntryAppUpdatePath(ticketId),
        { status: "CLOSED" },
        auth.accessToken,
      );
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

  const handleCall = () => {
    if (!ticket?.phone?.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${ticket.phone.trim()}`);
  };

  const handleCloseTicket = () => {
    closeMutation.mutate();
  };

  if (isLoading || !ticket) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_OFFSET }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={({ pressed }) => [styles.headerBack, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={16}
          >
            <Feather name="chevron-left" size={24} color="#161B1D" />
          </Pressable>
        </View>
        <View style={[styles.centered, { paddingBottom: insets.bottom + 24 }]}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#B31D38" />
              <Text style={styles.loadingText}>Loading ticket…</Text>
            </>
          ) : (
            <>
              <Feather name="alert-circle" size={48} color="#3F4C52" />
              <Text style={styles.errorTitle}>Ticket not found</Text>
              <Text style={styles.errorSubtitle}>
                The ticket may have been removed or the link is invalid.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const scrollPaddingBottom = closed ? insets.bottom + 24 : insets.bottom + CLOSE_BUTTON_HEIGHT + 24 + 24;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_OFFSET }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={({ pressed }) => [styles.headerBack, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={16}
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={24} color="#161B1D" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor="#B31D38"
          />
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
            <Text style={styles.entryTimeLabel}>Entry Time</Text>
            <Text style={styles.entryTimeValue}>{formatDateTime(ticket.entry_time)}</Text>
          </View>
          {closed && (
            <View style={styles.entryTimeRow}>
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
              <Text style={styles.driverRole}>Driver Partner</Text>
            </View>
          </View>
          <Pressable
            onPress={handleCall}
            style={({ pressed }) => [styles.callButton, pressed && styles.callButtonPressed]}
          >
            <Feather name="phone" size={20} color="#B31D38" style={styles.callButtonIcon} />
            <Text style={styles.callButtonText}>Call</Text>
          </Pressable>
        </View>

        {/* Card 3 — Assignment */}
        <View style={styles.card}>
          <Text style={styles.assignmentTitle}>Assignment</Text>
          <View style={styles.divider} />
          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Ticket</Text>
            <Text style={styles.assignmentValue}>{ticket.purpose ?? "Settlement"}</Text>
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

      {!closed && (
        <View style={[styles.closeButtonWrap, { paddingBottom: insets.bottom + 24 }]}>
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
              <Text style={styles.closeButtonText}>Close Ticket (Mark Exit)</Text>
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  headerBack: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: CARD_GAP,
    maxWidth: CARD_MAX_WIDTH + 32,
    width: "100%",
    alignSelf: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: "#3F4C52",
  },
  errorTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: "#161B1D",
  },
  errorSubtitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: "#3F4C52",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: "center",
    marginBottom: CARD_GAP,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EBEC",
    borderRadius: CARD_BORDER_RADIUS,
    padding: CARD_PADDING,
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
  tokenCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  tokenCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  tokenLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "400",
    color: "#3F4C52",
  },
  tokenValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: "#161B1D",
    marginTop: 4,
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
    fontFamily: "Inter",
    fontSize: 16,
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
    backgroundColor: "#E8EBEC",
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
    fontWeight: "400",
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
    gap: 12,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#E8EBEC",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: "#161B1D",
  },
  driverInfo: {
    flex: 1,
    minWidth: 0,
  },
  driverName: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  driverRole: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "400",
    color: "#3F4C52",
    marginTop: 2,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: CALL_BUTTON_HEIGHT,
    borderWidth: 1,
    borderColor: "#B31D38",
    borderRadius: CALL_BUTTON_RADIUS,
    backgroundColor: "#FFFFFF",
    marginTop: 16,
  },
  callButtonPressed: {
    opacity: 0.9,
  },
  callButtonIcon: {
    marginRight: 8,
  },
  callButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#B31D38",
  },
  assignmentTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  assignmentLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "400",
    color: "#3F4C52",
  },
  assignmentValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  closeButtonWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 24,
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    height: CLOSE_BUTTON_HEIGHT,
    backgroundColor: "#B31D38",
    borderRadius: CLOSE_BUTTON_RADIUS,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: "center",
  },
  closeButtonPressed: {
    opacity: 0.9,
  },
  closeButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
