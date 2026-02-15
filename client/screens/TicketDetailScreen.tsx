import React, { useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { CommonActions } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { ScreenPalette } from "@/constants/screenPalette";
import { formatDateTime } from "@/lib/format";
import { fetchWithAuthRetry, apiRequestWithAuthRetry } from "@/lib/query-client";
import { getEntryAppDetailPath, getEntryAppUpdatePath } from "@/lib/api-endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const CARD_RADIUS = 18;

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

/** GET /api/v1/entry-app/:id → { success, data }. On 401 tries refresh then retries. */
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

function DetailRowWithIcon({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | undefined | null;
}) {
  const display = value != null && value !== "" ? value : "—";
  return (
    <View style={styles.detailRowWithIcon}>
      <View style={styles.detailIconWrap}>
        <Feather name={icon} size={18} color={ScreenPalette.textSecondary} />
      </View>
      <View style={styles.detailContent}>
        <ThemedText type="small" style={styles.detailLabel}>
          {label}
        </ThemedText>
        <ThemedText type="body" style={styles.detailValue} numberOfLines={2}>
          {display}
        </ThemedText>
      </View>
    </View>
  );
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
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const goHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "VisitorType" }] })
    );
  };

  const statusLabel = ticket?.status
    ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).toLowerCase()
    : "Created";
  const closed = ticket ? isClosed(ticket.status) : false;

  if (isLoading || !ticket) {
    return (
      <View style={[styles.container, { backgroundColor: ScreenPalette.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={({ pressed }) => [styles.headerBack, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={16}
          >
            <Feather name="chevron-left" size={24} color={ScreenPalette.textPrimary} />
          </Pressable>
          <ThemedText type="h3" style={styles.headerTitle}>
            Ticket Details
          </ThemedText>
          <Pressable
            onPress={goHome}
            style={({ pressed }) => [styles.headerHome, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={12}
          >
            <Feather name="home" size={22} color={ScreenPalette.textPrimary} />
          </Pressable>
        </View>
        <View style={[styles.center, { paddingBottom: insets.bottom + Spacing.xl }]}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color={ScreenPalette.primaryRed} />
              <ThemedText type="body" style={[styles.loadingText, { color: ScreenPalette.textSecondary }]}>
                Loading ticket…
              </ThemedText>
            </>
          ) : (
            <>
              <Feather name="alert-circle" size={48} color={ScreenPalette.textSecondary} />
              <ThemedText type="h4" style={[styles.errorTitle, { color: ScreenPalette.textPrimary }]}>
                Ticket not found
              </ThemedText>
              <ThemedText type="body" style={[styles.errorSubtitle, { color: ScreenPalette.textSecondary }]}>
                The ticket may have been removed or the link is invalid.
              </ThemedText>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: ScreenPalette.background }]}>
      {/* Custom header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={({ pressed }) => [styles.headerBack, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={16}
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={24} color={ScreenPalette.textPrimary} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Ticket Details
        </ThemedText>
        <Pressable
          onPress={goHome}
          style={({ pressed }) => [styles.headerHome, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={12}
          accessibilityLabel="Home"
        >
          <Feather name="home" size={22} color={ScreenPalette.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={ScreenPalette.primaryRed}
          />
        }
      >
        {/* Token + status */}
        <View style={styles.tokenBlock}>
          <ThemedText type="h1" style={styles.tokenNumber}>
            #{ticket.token_no}
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: closed ? `${ScreenPalette.successGreen}30` : `${ScreenPalette.primaryRed}30` },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.statusText,
                { color: closed ? ScreenPalette.successGreen : ScreenPalette.primaryRed },
              ]}
            >
              {statusLabel}
            </ThemedText>
          </View>
        </View>

        {/* Visitor section */}
        <View style={styles.section}>
          <ThemedText type="small" style={styles.sectionTitle}>
            Visitor
          </ThemedText>
          <DetailRowWithIcon icon="user" label="Name" value={ticket.name} />
          <DetailRowWithIcon icon="phone" label="Phone" value={ticket.phone} />
          <DetailRowWithIcon icon="file-text" label="Purpose" value={ticket.purpose} />
        </View>

        {/* Assignment section */}
        <View style={styles.section}>
          <ThemedText type="small" style={styles.sectionTitle}>
            Assignment
          </ThemedText>
          {ticket.assignee != null && ticket.assignee !== "" && (
            <View style={styles.assigneeBadge}>
              <ThemedText type="small" style={styles.assigneeBadgeText}>
                {ticket.assignee}
              </ThemedText>
            </View>
          )}
          {ticket.desk_location != null && ticket.desk_location !== "" && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={16} color={ScreenPalette.textSecondary} />
              <ThemedText type="body" style={styles.locationText} numberOfLines={2}>
                {ticket.desk_location}
              </ThemedText>
            </View>
          )}
          {(!ticket.assignee || ticket.assignee === "") && (!ticket.desk_location || ticket.desk_location === "") && (
            <ThemedText type="body" style={styles.detailValue}>—</ThemedText>
          )}
        </View>

        {/* Timings timeline */}
        <View style={styles.section}>
          <ThemedText type="small" style={styles.sectionTitle}>
            Timings
          </ThemedText>
          <View style={styles.timeline}>
            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, styles.timelineDotFilled]} />
              <View style={styles.timelineContent}>
                <ThemedText type="small" style={styles.detailLabel}>Entry</ThemedText>
                <ThemedText type="body" style={styles.detailValue}>
                  {ticket.entry_time ? formatDateTime(ticket.entry_time) : "—"}
                </ThemedText>
              </View>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, styles.timelineDotEmpty]} />
              <View style={styles.timelineContent}>
                <ThemedText type="small" style={styles.detailLabel}>Exit</ThemedText>
                <ThemedText type="body" style={styles.detailValue}>
                  {ticket.exit_time ? formatDateTime(ticket.exit_time) : "—"}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Mark as Exit (open tickets only) */}
        {!closed && (
          <View style={styles.closeSection}>
            <Pressable
              onPress={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              style={({ pressed }) => [
                styles.closeButton,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              {closeMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="log-out" size={20} color="#FFFFFF" style={styles.closeButtonIcon} />
                  <ThemedText type="body" style={styles.closeButtonText}>
                    Mark as Exit
                  </ThemedText>
                </>
              )}
            </Pressable>
            <ThemedText type="small" style={styles.closeHint}>
              This action will close the ticket
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ScreenPalette.divider,
  },
  headerBack: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
  },
  headerTitle: {
    color: ScreenPalette.textPrimary,
    fontWeight: "700",
  },
  headerHome: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Spacing.xl,
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
  errorTitle: {
    marginTop: Spacing.md,
  },
  errorSubtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  tokenBlock: {
    marginBottom: Spacing.xl,
  },
  tokenNumber: {
    color: ScreenPalette.textPrimary,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  statusText: {
    fontWeight: "600",
  },
  section: {
    backgroundColor: ScreenPalette.card,
    borderRadius: CARD_RADIUS,
    padding: 20,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    color: ScreenPalette.textSecondary,
    fontWeight: "600",
    marginBottom: Spacing.lg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRowWithIcon: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  detailIconWrap: {
    width: 32,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: ScreenPalette.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    color: ScreenPalette.textPrimary,
  },
  assigneeBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${ScreenPalette.primaryRed}20`,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: Spacing.md,
  },
  assigneeBadgeText: {
    color: ScreenPalette.textPrimary,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  locationText: {
    color: ScreenPalette.textPrimary,
    flex: 1,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.lg,
    marginTop: 6,
  },
  timelineDotFilled: {
    backgroundColor: ScreenPalette.primaryRed,
  },
  timelineDotEmpty: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: ScreenPalette.divider,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: ScreenPalette.divider,
    marginLeft: 5,
    marginVertical: 0,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
    paddingBottom: Spacing.lg,
  },
  closeSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ScreenPalette.primaryRed,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    borderRadius: CARD_RADIUS,
    marginBottom: Spacing.sm,
  },
  closeButtonIcon: {
    marginRight: Spacing.sm,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  closeHint: {
    color: ScreenPalette.textSecondary,
    textAlign: "center",
  },
});
