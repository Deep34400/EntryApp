import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

const FONT = "Poppins";
const GREEN_MIN_HEIGHT = 240;
const CARD_OVERLAP = 40;
const CARD_MAX_WIDTH = 328;
const HORIZONTAL_PADDING = 20;

export default function TokenDisplayScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(CARD_MAX_WIDTH, screenWidth - HORIZONTAL_PADDING * 2);

  const {
    token,
    assignee,
    desk_location,
    driverName,
    driverPhone,
  } = route.params;

  const displayToken = token.startsWith("#") ? token : `#${token}`;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  return (
    <View style={styles.root}>
      {/* GREEN HEADER — flow layout, minHeight */}
      <View style={[styles.green, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.back, { top: insets.top }]}
        >
          <Feather name="chevron-left" size={24} color="#FFF" />
        </Pressable>

        <View style={styles.tokenWrap}>
          <Text style={styles.tokenLabel}>Token Number</Text>
          <Text style={styles.tokenValue}>{displayToken}</Text>
        </View>
      </View>

      {/* CARDS WRAPPER — negative marginTop for overlap, responsive width */}
      <View style={[styles.cardWrapper, { width: cardWidth, marginTop: -CARD_OVERLAP }]}>
        <View style={styles.userCard}>
          <View style={styles.userLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {driverName?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>

            <View>
              <Text style={styles.name}>{driverName}</Text>
              <Text style={styles.role}>Driver Partner</Text>
            </View>
          </View>

          <Text style={styles.phone}>{driverPhone}</Text>
        </View>

        <View style={styles.proceedCard}>
          <View>
            <Text style={styles.small}>Proceed to</Text>
            <Text style={styles.value}>{assignee}</Text>
          </View>

          <View style={styles.entryGateWrap}>
            <Text style={styles.small}>Entry Gate</Text>
            <Text style={styles.value}>{desk_location || "—"}</Text>
          </View>
        </View>
      </View>

      {/* Spacer so buttons sit at bottom */}
      <View style={styles.spacer} />

      {/* BOTTOM BUTTONS — flow layout, no absolute */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() =>
            Share.share({
              message: `Token: ${displayToken}\nProceed to: ${assignee}`,
            })
          }
          style={styles.shareBtn}
        >
          <Text style={styles.shareText}>Share Receipt</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("TrackTickets" as never)}
          style={styles.trackBtn}
        >
          <Text style={styles.trackText}>Track Tickets</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  green: {
    width: "100%",
    minHeight: GREEN_MIN_HEIGHT,
    backgroundColor: "#199881",
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingBottom: 80
  },

  back: {
    position: "absolute",
    left: 16,
    height: 44,
    width: 44,
    justifyContent: "center",
    zIndex: 1,
  },

  tokenWrap: {
    marginTop: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  tokenLabel: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 6,
  },

  tokenValue: {
    fontFamily: FONT,
    fontSize: 32,
    fontWeight: "600",
    color: "#FFF",
  },

  cardWrapper: {
    alignSelf: "center",
  },

  userCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EBEC",
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

  userLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "#E8EBEC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: "600",
  },

  name: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
  },

  role: {
    fontFamily: FONT,
    fontSize: 12,
    color: "#3F4C52",
  },

  phone: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
  },

  proceedCard: {
    marginTop: 24,
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8EBEC",
  },

  entryGateWrap: {
    alignItems: "flex-end",
  },

  small: {
    fontFamily: FONT,
    fontSize: 12,
    color: "#3F4C52",
  },

  value: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },

  spacer: {
    flex: 1,
  },

  bottom: {
    alignSelf: "stretch",
    paddingHorizontal: 26,
    backgroundColor: "#FFFFFF",
  },

  shareBtn: {
    height: 48,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#B31D38",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  shareText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "600",
    color: "#B31D38",
  },

  trackBtn: {
    height: 48,
    borderRadius: 22,
    backgroundColor: "#B31D38",
    justifyContent: "center",
    alignItems: "center",
  },

  trackText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});
