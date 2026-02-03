import React, { useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
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
import { getTicketListPath } from "@/lib/api-endpoints";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "TicketList">;
type TicketListRouteProp = RouteProp<RootStackParamList, "TicketList">;

export interface TicketListItem {
  id: string;
  token_no: string;
  name?: string;
  purpose?: string;
  entry_time?: string;
  agent_name?: string;
  desk_location?: string;
  status?: string;
}

function normalizeTicket(item: Record<string, unknown>): TicketListItem {
  const id =
    String(item.id ?? item.token_no ?? item.token ?? "") || `row-${Date.now()}`;
  return {
    id,
    token_no: String(item.token_no ?? item.token ?? item.id ?? ""),
    name: item.name != null ? String(item.name) : undefined,
    purpose: item.purpose != null ? String(item.purpose) : undefined,
    entry_time:
      item.entry_time != null ? String(item.entry_time) : undefined,
    agent_name:
      item.agent_name != null ? String(item.agent_name) : undefined,
    desk_location:
      item.desk_location != null ? String(item.desk_location) : undefined,
    status: item.status != null ? String(item.status) : undefined,
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

function TicketRow({
  item,
  theme,
  onPress,
}: {
  item: TicketListItem;
  theme: { text: string; textSecondary: string; backgroundDefault: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.textSecondary + "20",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        <ThemedText type="h4" style={styles.token}>
          #{item.token_no}
        </ThemedText>
        {item.name != null && item.name !== "" && (
          <ThemedText type="body" style={{ color: theme.text }}>
            {item.name}
          </ThemedText>
        )}
        {item.purpose != null && item.purpose !== "" && (
          <ThemedText
            type="small"
            style={[styles.meta, { color: theme.textSecondary }]}
          >
            {item.purpose}
          </ThemedText>
        )}
        {item.desk_location != null && item.desk_location !== "" && (
          <ThemedText
            type="small"
            style={[styles.meta, { color: theme.textSecondary }]}
          >
            {item.desk_location}
          </ThemedText>
        )}
      </View>
      <ThemedText
        type="small"
        style={[styles.time, { color: theme.textSecondary }]}
      >
        {formatEntryTime(item.entry_time)}
      </ThemedText>
    </Pressable>
  );
}

async function fetchTicketList(
  filter: "open" | "closed",
): Promise<TicketListItem[]> {
  try {
    const baseUrl = getApiUrl();
    const path = getTicketListPath(filter);
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

  const {
    data: list = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ticket-list", filter],
    queryFn: () => fetchTicketList(filter),
    staleTime: 15_000,
  });

  const isOpen = filter === "open";

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
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketRow
              item={item}
              theme={theme}
              onPress={() =>
                navigation.navigate("TicketDetail", { ticketId: item.id })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={{ height: Spacing.sm }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <ThemedText
              type="small"
              style={[styles.listHeader, { color: theme.textSecondary }]}
            >
              {list.length} {isOpen ? "open" : "closed"} ticket
              {list.length !== 1 ? "s" : ""}
            </ThemedText>
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
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  rowLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  token: {
    marginBottom: Spacing.xs,
  },
  meta: {
    marginTop: 2,
  },
  time: {
    marginLeft: Spacing.md,
  },
});
