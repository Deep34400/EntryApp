import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BackArrow } from "@/components/BackArrow";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getEntryTypeDisplayLabel } from "@/utils/entryType";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "TokenDisplay"
>;

const FONT = "Poppins";

// ---- DESIGN CONSTANTS ----
const GREEN_HEADER_HEIGHT = 260;
const CARD_WIDTH = 328;
const DRIVER_CARD_PADDING_V = 12;
const DRIVER_CARD_PADDING_H = 16;
const ASSIGNMENT_CARD_PADDING = 16;
const BOTTOM_PADDING = 16;
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 22;

const GREEN_BG = "#199881";
const CARD_BORDER = "#E8EBEC";
const TEXT_PRIMARY = "#161B1D";
const TEXT_SECONDARY = "#3F4C52";
const ACCENT_RED = "#B31D38";

// ---- HELPERS ----
function formatContactPhone(phone?: string): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91-${digits}`;
  return phone;
}

export default function TokenDisplayScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const {
    token,
    assignee,
    desk_location,
    driverName,
    driverPhone,
    entryType,
    purpose,
  } = route.params ?? {};

  const roleLabel = getEntryTypeDisplayLabel(entryType);

  const displayToken = token
    ? token.startsWith("#")
      ? token
      : `#${token}`
    : "#—";

  const contactValue = formatContactPhone(driverPhone);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <BackArrow color="#FFFFFF" />

      {/* GREEN HEADER */}
      <View
        style={[
          styles.green,
          { paddingTop: insets.top, height: GREEN_HEADER_HEIGHT },
        ]}
      >
        <View style={styles.tokenWrap}>
          <Text style={styles.tokenLabel}>Token Number</Text>
          <Text style={styles.tokenValue}>{displayToken}</Text>
        </View>
      </View>

      {/* DRIVER CARD — FLOATING (FIXED) */}
      <View style={styles.driverCardFloating}>
        <View style={styles.driverCard}>
          <View style={styles.driverLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {driverName?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.driverTextBlock}>
              <Text style={styles.name} numberOfLines={1}>
                {driverName || "—"}
              </Text>
              <Text style={styles.role}>{roleLabel}</Text>
            </View>
          </View>
          <Text style={styles.phone} numberOfLines={1}>
            {driverPhone ?? "—"}
          </Text>
        </View>
      </View>

      {/* SCROLL CONTENT */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 48, // space below floating card
            paddingBottom:
              insets.bottom + BOTTOM_PADDING + BUTTON_HEIGHT * 2 + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ASSIGNMENT CARD */}
        <View style={styles.assignmentCard}>
          <Text style={styles.assignmentHeader}>Assignment</Text>
          <View style={styles.assignmentDivider} />

          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Purpose</Text>
            <Text style={styles.assignmentValue}>{purpose ?? "—"}</Text>
          </View>

          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Agent</Text>
            <Text style={styles.assignmentValue}>{assignee ?? "—"}</Text>
          </View>

          {/* <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Contact</Text>
            <Text style={styles.assignmentValue}>{contactValue}</Text>
          </View> */}

          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Desk/Location</Text>
            <Text style={styles.assignmentValue}>
              {desk_location ?? "—"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View
        style={[
          styles.bottom,
          {
            paddingBottom: insets.bottom + BOTTOM_PADDING,
            paddingHorizontal: BOTTOM_PADDING,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            Share.share({
              message: `Token: ${displayToken}\nAgent: ${
                assignee ?? ""
              }\nDesk: ${desk_location ?? ""}`,
            })
          }
          style={({ pressed }) => [
            styles.shareBtn,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.shareText}>Share Receipt</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            navigation.navigate("TicketList", { filter: "open" })
          }
          style={({ pressed }) => [
            styles.trackBtn,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.trackText}>Track Tickets</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---- STYLES ----
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  green: {
    width: "100%",
    backgroundColor: GREEN_BG,
    alignItems: "center",
    paddingBottom: 56,
    justifyContent: "center",
  },

  tokenWrap: {
    alignItems: "center",
    marginTop: -20, 
  },

  tokenLabel: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  tokenValue: {
    fontFamily: FONT,
    fontSize: 32,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // 🔥 KEY FIX
  driverCardFloating: {
    position: "absolute",
    top: GREEN_HEADER_HEIGHT - 90,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    
  },

  driverCard: {
    width: CARD_WIDTH,
    minHeight: 64,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: DRIVER_CARD_PADDING_V,
    paddingHorizontal: DRIVER_CARD_PADDING_H,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
    
  },

  driverLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD_BORDER,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },

  driverTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_PRIMARY,
  },

  role: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: "400",
    color: TEXT_SECONDARY,
    marginTop: 2,
  },

  phone: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_PRIMARY,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    alignItems: "center",
  },

  assignmentCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: ASSIGNMENT_CARD_PADDING,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },

  assignmentHeader: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },

  assignmentDivider: {
    height: 1,
    backgroundColor: CARD_BORDER,
    marginVertical: 12,
  },

  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  assignmentLabel: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "400",
    color: TEXT_SECONDARY,
  },

  assignmentValue: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_PRIMARY,
    maxWidth: "60%",
    textAlign: "right",
  },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },

  shareBtn: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    borderWidth: 1,
    borderColor: ACCENT_RED,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  shareText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "600",
    color: ACCENT_RED,
  },

  trackBtn: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: ACCENT_RED,
    justifyContent: "center",
    alignItems: "center",
  },

  trackText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  buttonPressed: {
    opacity: 0.85,
  },
});
