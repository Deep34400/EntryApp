import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { getTicketDetailPath, getTicketUpdatePath } from "@/lib/api-endpoints";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type TicketDetailRouteProp = RouteProp<RootStackParamList, "TicketDetail">;

export interface TicketDetailResult {
  id: string;
  token_no: string;
  name?: string;
  email?: string;
  phone?: string;
  purpose?: string;
  agent_id?: string;
  status?: string;
  entry_time?: string;
  exit_time?: string | null;
  created_at?: string;
  updated_at?: string;
  agent_name?: string;
  desk_location?: string;
}

function formatDateTime(iso?: string | null): string {
  if (iso == null || iso === "") return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function DetailRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | undefined | null;
  theme: { text: string; textSecondary: string };
}) {
  const display = value != null && value !== "" ? value : "—";
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.text }} numberOfLines={2}>
        {display}
      </ThemedText>
    </View>
  );
}

async function fetchTicketDetail(ticketId: string): Promise<TicketDetailResult | null> {
  try {
    const baseUrl = getApiUrl();
    const path = getTicketDetailPath(ticketId);
    const url = new URL(path, baseUrl);
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const results = data.results as Record<string, unknown> | undefined;
    if (!results) return null;
    return {
      id: String(results.id ?? ""),
      token_no: String(results.token_no ?? results.token ?? ""),
      name: results.name != null ? String(results.name) : undefined,
      email: results.email != null ? String(results.email) : undefined,
      phone: results.phone != null ? String(results.phone) : undefined,
      purpose: results.purpose != null ? String(results.purpose) : undefined,
      agent_id: results.agent_id != null ? String(results.agent_id) : undefined,
      status: results.status != null ? String(results.status) : undefined,
      entry_time: results.entry_time != null ? String(results.entry_time) : undefined,
      exit_time: results.exit_time != null ? String(results.exit_time) : undefined,
      created_at: results.created_at != null ? String(results.created_at) : undefined,
      updated_at: results.updated_at != null ? String(results.updated_at) : undefined,
      agent_name: results.agent_name != null ? String(results.agent_name) : undefined,
      desk_location: results.desk_location != null ? String(results.desk_location) : undefined,
    };
  } catch {
    return null;
  }
}

const isClosed = (status: string | undefined) =>
  status != null && (status.toUpperCase() === "CLOSED" || status === "closed");

export default function TicketDetailScreen() {
  const route = useRoute<TicketDetailRouteProp>();
  const { ticketId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const {
    data: ticket,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ticket-detail", ticketId],
    queryFn: () => fetchTicketDetail(ticketId),
    staleTime: 30_000,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", getTicketUpdatePath(ticketId), {
        status: "CLOSED",
      });
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

  if (isLoading || !ticket) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom,
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
              Loading ticket…
            </ThemedText>
          </View>
        ) : (
          <View style={styles.center}>
            <Feather name="alert-circle" size={48} color={theme.textSecondary} />
            <ThemedText
              type="h4"
              style={[styles.errorTitle, { color: theme.text }]}
            >
              Ticket not found
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.errorSubtitle, { color: theme.textSecondary }]}
            >
              The ticket may have been removed or the link is invalid.
            </ThemedText>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={theme.primary}
        />
      }
    >
      <View style={[styles.tokenCard, { backgroundColor: theme.primary }]}>
        <ThemedText style={styles.tokenLabel}>TOKEN</ThemedText>
        <ThemedText style={styles.tokenNumber}>#{ticket.token_no}</ThemedText>
        {ticket.status != null && ticket.status !== "" && (
          <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
            <ThemedText type="small" style={styles.statusText}>
              {ticket.status}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Visitor
        </ThemedText>
        <DetailRow label="Name" value={ticket.name} theme={theme} />
        <DetailRow label="Email" value={ticket.email} theme={theme} />
        <DetailRow label="Phone" value={ticket.phone} theme={theme} />
        <DetailRow label="Purpose" value={ticket.purpose} theme={theme} />
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Assignment
        </ThemedText>
        <DetailRow label="Agent" value={ticket.agent_name} theme={theme} />
        <DetailRow label="Desk / Location" value={ticket.desk_location} theme={theme} />
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Timings
        </ThemedText>
        <DetailRow label="Entry time" value={ticket.entry_time ? formatDateTime(ticket.entry_time) : undefined} theme={theme} />
        <DetailRow label="Exit time" value={ticket.exit_time ? formatDateTime(ticket.exit_time) : "—"} theme={theme} />
      </View>

      {!isClosed(ticket.status) && (
        <View
          style={[
            styles.closeSection,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          <Button
            onPress={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            style={[styles.closeButton, { backgroundColor: theme.primary }]}
          >
            {closeMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              "Close ticket"
            )}
          </Button>
          <ThemedText
            type="small"
            style={[styles.closeHint, { color: theme.textSecondary }]}
          >
            Mark this ticket as closed (exit)
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
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
  tokenCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  tokenLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  tokenNumber: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  statusBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  closeSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: 0,
  },
  closeButton: {
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  closeHint: {
    textAlign: "center",
  },
});
