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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { BackArrow } from "@/components/BackArrow";
import { useTheme } from "@/hooks/useTheme";
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
): TicketDetailResult | undefined {
  const listKeys = [
    ["ticket-list", "open"],
    ["ticket-list", "delayed"],
    ["ticket-list", "closed"],
  ] as const;
  for (const key of listKeys) {
    const queriesData = queryClient.getQueriesData<InfiniteListData>({
      queryKey: key,
    });
    for (const [, data] of queriesData) {
      const pages = data?.pages;
      if (!pages) continue;
      for (const page of pages) {
        const found = page.list?.find((item) => item.id === ticketId);
        if (found) return listItemToDetailResult(found);
      }
    }
  }
  return undefined;
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
    regNumber: item.regNumber,
  };
}

// FIX: maskPhone corrected to last 4 digits (consistent with TicketListScreen)
function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 5) return null;
  const last4 = digits.slice(-4);
  return `xxxxxx${last4}`;
}

const FONT_POPPINS = "Poppins";
const HEADER_HEIGHT = 56;
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

function isClosed(
  ticket: { status?: string; exit_time?: string | null } | null | undefined,
): boolean {
  if (ticket == null) return false;
  if (ticket.exit_time != null && String(ticket.exit_time).trim() !== "")
    return true;
  return (
    ticket.status != null &&
    (ticket.status.toUpperCase() === "CLOSED" || ticket.status === "closed")
  );
}

// FIX: Now returns both hours and minutes (e.g. "1h 23m" instead of just "1.4")
function formatWaitingTime(entryTime?: string | null): {
  hours: string | null;
  mins: string;
} {
  const totalMins = getWaitingMinutes(entryTime);
  if (totalMins == null) return { hours: null, mins: "—" };
  if (totalMins < 60) {
    return { hours: null, mins: String(totalMins) };
  }
  const hours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;
  return { hours: String(hours), mins: String(remainingMins) };
}

export default function TicketDetailScreen() {
  const route = useRoute<TicketDetailRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { ticketId, fromTab } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { canCloseTicket } = usePermissions();
  const { theme, isDark } = useTheme();

  const {
    data: ticket,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ticket-detail", ticketId],
    queryFn: () => getTicketById(ticketId, auth.accessToken),
    initialData: getTicketFromListCache(queryClient, ticketId),
    staleTime: 0,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await updateTicket(ticketId, { status: "CLOSED" }, auth.accessToken);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("TicketList", {
        refreshFromToken: true,
        closedFromTab: fromTab as "Open" | "Delayed",
      });
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const closed = isClosed(ticket);
  const waitingTime = formatWaitingTime(ticket?.entry_time); // FIX: use new function
  const isStaff = getEntryTypeDisplayLabel(ticket?.type) === "Staff";
  const maskedPhone = ticket ? maskPhone(ticket.phone) : null;

  const handleCloseTicket = () => {
    closeMutation.mutate();
  };

  const handleCall = () => {
    if (ticket?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`tel:${ticket.phone}`);
    }
  };

  const backArrowColor = isDark ? theme.text : "#161B1D";
  const screenBg = isDark ? theme.backgroundRoot : undefined;
  const cardBg = isDark ? theme.backgroundDefault : undefined;
  const cardBorder = isDark ? theme.border : undefined;
  const loadingTextColor = isDark ? theme.textSecondary : undefined;
  const errorTitleColor = isDark ? theme.text : undefined;
  const errorSubtitleColor = isDark ? theme.textSecondary : undefined;
  const errorIconColor = isDark ? theme.textSecondary : "#3F4C52";
  const tokenLabelColor = isDark ? theme.textSecondary : undefined;
  const tokenValueColor = isDark ? theme.text : undefined;
  const entryTimeLabelColor = isDark ? theme.textSecondary : undefined;
  const entryTimeValueColor = isDark ? theme.text : undefined;
  const dividerColor = isDark ? theme.border : undefined;
  const avatarBg = isDark ? theme.backgroundSecondary : undefined;
  const avatarLetterColor = isDark ? theme.text : undefined;
  const driverNameColor = isDark ? theme.text : undefined;
  const driverRoleColor = isDark ? theme.textSecondary : undefined;
  const assignmentTitleColor = isDark ? theme.text : undefined;
  const assignmentLabelColor = isDark ? theme.textSecondary : undefined;
  const assignmentValueColor = isDark ? theme.text : undefined;

  if (isLoading && !ticket) {
    return (
      <View
        style={[
          styles.screen,
          isDark && screenBg && { backgroundColor: screenBg },
        ]}
      >
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 8,
            height: insets.top + HEADER_HEIGHT,
            justifyContent: "center",
          }}
        >
          <BackArrow color={backArrowColor} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={isDark ? theme.primary : "#B31D38"}
          />
          <Text
            style={[
              styles.loadingText,
              isDark && loadingTextColor && { color: loadingTextColor },
            ]}
          >
            Loading ticket…
          </Text>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View
        style={[
          styles.screen,
          isDark && screenBg && { backgroundColor: screenBg },
        ]}
      >
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 8,
            height: insets.top + HEADER_HEIGHT,
            justifyContent: "center",
          }}
        >
          <BackArrow color={backArrowColor} />
        </View>
        <View style={styles.centered}>
          <Feather name="alert-circle" size={48} color={errorIconColor} />
          <Text
            style={[
              styles.errorTitle,
              isDark && errorTitleColor && { color: errorTitleColor },
            ]}
          >
            Ticket not found
          </Text>
          <Text
            style={[
              styles.errorSubtitle,
              isDark && errorSubtitleColor && { color: errorSubtitleColor },
            ]}
          >
            The ticket may have been removed.
          </Text>
        </View>
      </View>
    );
  }

  const scrollPaddingBottom = closed
    ? insets.bottom + 24
    : insets.bottom + CLOSE_BUTTON_HEIGHT + 40;

  return (
    <View
      style={[
        styles.screen,
        isDark && screenBg && { backgroundColor: screenBg },
      ]}
    >
      <View
        style={{
          paddingTop: insets.top,
          height: insets.top + HEADER_HEIGHT,
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <BackArrow color={backArrowColor} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={isDark ? theme.primary : "#B31D38"}
          />
        }
      >
        {/* Token / Time Card */}
        <View
          style={[
            styles.card,
            isDark &&
              cardBg && { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.tokenCardTopRow}>
            <View style={styles.tokenCardLeft}>
              <Text
                style={[
                  styles.tokenLabel,
                  isDark && tokenLabelColor && { color: tokenLabelColor },
                ]}
              >
                Token
              </Text>
              <Text
                style={[
                  styles.tokenValue,
                  isDark && tokenValueColor && { color: tokenValueColor },
                ]}
              >
                #{ticket.token_no}
              </Text>
            </View>
            {!closed ? (
              <View style={styles.timeBadge}>
                {waitingTime.hours !== null && (
                  <>
                    <Text style={styles.timeBadgeHours}>
                      {waitingTime.hours}
                    </Text>
                    <Text style={styles.timeBadgeUnit}>h </Text>
                  </>
                )}
                <Text style={styles.timeBadgeHours}>{waitingTime.mins}</Text>
                <Text style={styles.timeBadgeUnit}>m</Text>
              </View>
            ) : (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>Closed</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.divider,
              isDark && dividerColor && { backgroundColor: dividerColor },
            ]}
          />
          <View style={styles.entryTimeRow}>
            <Text
              style={[
                styles.entryTimeLabel,
                isDark && entryTimeLabelColor && { color: entryTimeLabelColor },
              ]}
            >
              {isStaff ? "Out Time" : "Entry Time"}
            </Text>
            <Text
              style={[
                styles.entryTimeValue,
                isDark && entryTimeValueColor && { color: entryTimeValueColor },
              ]}
            >
              {formatDateTime(ticket.entry_time)}
            </Text>
          </View>
          {closed && (
            <View style={[styles.entryTimeRow, { marginTop: 12 }]}>
              <Text
                style={[
                  styles.entryTimeLabel,
                  isDark &&
                    entryTimeLabelColor && { color: entryTimeLabelColor },
                ]}
              >
                Exit Time
              </Text>
              <Text
                style={[
                  styles.entryTimeValue,
                  isDark &&
                    entryTimeValueColor && { color: entryTimeValueColor },
                ]}
              >
                {ticket.exit_time ? formatDateTime(ticket.exit_time) : "—"}
              </Text>
            </View>
          )}
        </View>

        {/* Driver / Person Card */}
        <View
          style={[
            styles.card,
            isDark &&
              cardBg && { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.driverRow}>
            <View
              style={[
                styles.avatarPlaceholder,
                isDark && avatarBg && { backgroundColor: avatarBg },
              ]}
            >
              <Text
                style={[
                  styles.avatarLetter,
                  isDark && avatarLetterColor && { color: avatarLetterColor },
                ]}
              >
                {ticket.name?.trim()
                  ? ticket.name.trim().charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text
                style={[
                  styles.driverName,
                  isDark && driverNameColor && { color: driverNameColor },
                ]}
              >
                {ticket.name ?? "—"}
              </Text>
              <Text
                style={[
                  styles.driverRole,
                  isDark && driverRoleColor && { color: driverRoleColor },
                ]}
              >
                {getEntryTypeDisplayLabel(ticket.type)}
              </Text>
            </View>
            <View style={styles.driverRightInfo}>
              {maskedPhone ? (
                <View style={styles.phoneRow}>
                  <Text style={styles.phoneIcon}>📞</Text>
                  <Text
                    style={[
                      styles.phoneText,
                      isDark && driverNameColor && { color: driverNameColor },
                    ]}
                    numberOfLines={1}
                  >
                    {maskedPhone}
                  </Text>
                </View>
              ) : null}
              {ticket.regNumber?.trim() ? (
                <View style={styles.phoneRow}>
                  <Text style={styles.phoneIcon}>🚗</Text>
                  <Text
                    style={[
                      styles.regText,
                      isDark && driverRoleColor && { color: driverRoleColor },
                    ]}
                    numberOfLines={1}
                  >
                    {ticket.regNumber.trim().toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {isStaff && ticket.phone && (
            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                styles.callButton,
                pressed && styles.callButtonPressed,
              ]}
            >
              <Feather name="phone" size={16} color="#B31D38" />
              <Text style={styles.callButtonText}>Call</Text>
            </Pressable>
          )}
        </View>

        {/* Assignment Card */}
        <View
          style={[
            styles.card,
            isDark &&
              cardBg && { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <Text
            style={[
              styles.assignmentTitle,
              isDark && assignmentTitleColor && { color: assignmentTitleColor },
            ]}
          >
            Assignment
          </Text>
          <View
            style={[
              styles.divider,
              isDark && dividerColor && { backgroundColor: dividerColor },
            ]}
          />
          <View style={styles.assignmentRow}>
            <Text
              style={[
                styles.assignmentLabel,
                isDark &&
                  assignmentLabelColor && { color: assignmentLabelColor },
              ]}
            >
              Ticket
            </Text>
            <Text
              style={[
                styles.assignmentValue,
                isDark &&
                  assignmentValueColor && { color: assignmentValueColor },
              ]}
            >
              {getCategoryLabel({
                purpose: ticket.purpose,
                reason: ticket.reason,
                category: ticket.category,
                subCategory: ticket.subCategory,
              }) || "—"}
            </Text>
          </View>

          {!isStaff && (
            <View style={styles.assignmentRow}>
              <Text
                style={[
                  styles.assignmentLabel,
                  isDark &&
                    assignmentLabelColor && { color: assignmentLabelColor },
                ]}
              >
                Agent
              </Text>
              <Text
                style={[
                  styles.assignmentValue,
                  isDark &&
                    assignmentValueColor && { color: assignmentValueColor },
                ]}
              >
                {ticket.assignee ?? "—"}
              </Text>
            </View>
          )}
          <View style={styles.assignmentRow}>
            <Text
              style={[
                styles.assignmentLabel,
                isDark &&
                  assignmentLabelColor && { color: assignmentLabelColor },
              ]}
            >
              Desk/Location
            </Text>
            <Text
              style={[
                styles.assignmentValue,
                isDark &&
                  assignmentValueColor && { color: assignmentValueColor },
              ]}
            >
              {ticket.desk_location ?? "—"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {!closed && canCloseTicket && (
        <View
          style={[
            styles.closeButtonWrap,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Pressable
            onPress={handleCloseTicket}
            disabled={closeMutation.isPending}
            style={({ pressed }) => [
              styles.closeButton,
              closeMutation.isPending && styles.closeButtonLoading,
              pressed && !closeMutation.isPending && styles.closeButtonPressed,
            ]}
          >
            {closeMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.closeButtonText}>
                {isStaff
                  ? "Close Ticket (Mark IN)"
                  : "Close Ticket (Mark Exit)"}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, width: "100%" },
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
      android: { elevation: 2 },
    }),
  },
  tokenCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenCardLeft: { flex: 1 },
  tokenLabel: { fontFamily: FONT_POPPINS, fontSize: 14, color: "#3F4C52" },
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
  timeBadgeHours: { fontSize: 18, fontWeight: "700", color: "#D33636" },
  // FIX: renamed from timeBadgeHrs → timeBadgeUnit, used for both "h" and "m"
  timeBadgeUnit: {
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
  divider: { height: 1, backgroundColor: "#F0F2F3", marginVertical: 16 },
  entryTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryTimeLabel: { fontFamily: FONT_POPPINS, fontSize: 14, color: "#3F4C52" },
  entryTimeValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  driverRow: { flexDirection: "row", alignItems: "center" },
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
  driverInfo: { flex: 1, minWidth: 0, justifyContent: "center" },
  driverRightInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
    flexShrink: 0,
    maxWidth: 140,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  phoneIcon: { fontSize: 11 },
  phoneText: {
    fontFamily: FONT_POPPINS,
    fontSize: 13,
    fontWeight: "600",
    color: "#161B1D",
    letterSpacing: 0.5,
  },
  regText: {
    fontFamily: FONT_POPPINS,
    fontSize: 13,
    fontWeight: "400",
    color: "#3F4C52",
    letterSpacing: 0.5,
  },
  driverName: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "600",
    color: "#161B1D",
  },
  driverRole: { fontFamily: FONT_POPPINS, fontSize: 13, color: "#3F4C52" },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#B31D38",
    backgroundColor: "transparent",
  },
  callButtonPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  callButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 15,
    fontWeight: "600",
    color: "#B31D38",
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
  closeButtonLoading: { opacity: 0.85 },
  closeButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  closeButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
