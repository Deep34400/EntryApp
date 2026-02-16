import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "@/navigation/RootStackNavigator";

const FONT_POPPINS = "Poppins";

const GREEN_SECTION_HEIGHT = 283;
const CARD_MAX_WIDTH = 328;
const CARD_PADDING = 16;
const CARD_BORDER_RADIUS = 12;
const CARD_GAP = 16;
const AVATAR_SIZE = 40;
const SHARE_BUTTON_HEIGHT = 48;
const SHARE_BUTTON_RADIUS = 22;
const BOTTOM_PADDING_H = 26;
const BOTTOM_PADDING_V = 16;

type TokenDisplayRouteProp = RouteProp<RootStackParamList, "TokenDisplay">;

export default function TokenDisplayScreen() {
  const route = useRoute<TokenDisplayRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    token,
    assignee,
    desk_location,
    driverName,
    driverPhone,
  } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const displayToken = token.startsWith("#") ? token : `#${token}`;
  const name = driverName?.trim() || "—";
  const phone = driverPhone?.trim() || "—";

  const handleShareReceipt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = [
      `Token: ${displayToken}`,
      `Proceed to: ${assignee}`,
      `Entry Gate: ${desk_location}`,
    ].join("\n");
    Share.share({ message, title: "Entry Token" }).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      {/* Top green section — absolute */}
      <View style={[styles.greenSection, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.8 : 1 }]}
          hitSlop={16}
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.greenCenter}>
          <Text style={styles.tokenNumberLabel}>Token Number</Text>
          <Text style={styles.tokenNumberValue}>{displayToken}</Text>
        </View>
      </View>

      {/* Content: cards + button — no scroll */}
      <View style={[styles.content, { paddingBottom: insets.bottom + BOTTOM_PADDING_V }]}>
        {/* User Info Card — overlaps green slightly */}
        <View style={styles.userCard}>
          <View style={styles.userCardLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {name !== "—" ? name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
            <View style={styles.userCardInfo}>
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.userRole}>Driver Partner</Text>
            </View>
          </View>
          <Text style={styles.userPhone} numberOfLines={1}>
            {phone}
          </Text>
        </View>

        {/* Proceed / Gate Card */}
        <View style={styles.gateCard}>
          <View style={styles.gateCardLeft}>
            <Text style={styles.gateLabel}>Proceed to</Text>
            <Text style={styles.gateValue}>{assignee}</Text>
          </View>
          <View style={styles.gateCardRight}>
            <Text style={styles.gateLabel}>Entry Gate</Text>
            <Text style={styles.gateValueRight}>{desk_location}</Text>
          </View>
        </View>

        {/* Bottom: single Share Receipt button */}
        <View style={styles.buttonWrap}>
          <Pressable
            onPress={handleShareReceipt}
            style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
          >
            <Text style={styles.shareButtonText}>Share Receipt</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  greenSection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: GREEN_SECTION_HEIGHT,
    backgroundColor: "#199881",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  greenCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 24,
  },
  tokenNumberLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  tokenNumberValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 32,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: BOTTOM_PADDING_H,
    paddingTop: GREEN_SECTION_HEIGHT - 24,
    alignItems: "center",
  },
  userCard: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EBEC",
    borderRadius: CARD_BORDER_RADIUS,
    padding: CARD_PADDING,
    marginBottom: CARD_GAP,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  userCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#E8EBEC",
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
  userCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  userRole: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "400",
    color: "#3F4C52",
    marginTop: 2,
  },
  userPhone: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
    marginLeft: 12,
  },
  gateCard: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EBEC",
    borderRadius: CARD_BORDER_RADIUS,
    padding: CARD_PADDING,
    marginBottom: CARD_GAP,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  gateCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  gateCardRight: {
    alignItems: "flex-end",
  },
  gateLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "400",
    color: "#3F4C52",
  },
  gateValue: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
    marginTop: 4,
  },
  gateValueRight: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
    marginTop: 4,
    textAlign: "right",
  },
  buttonWrap: {
    marginTop: "auto",
    paddingTop: BOTTOM_PADDING_V,
    width: "100%",
    maxWidth: 308,
    alignSelf: "center",
  },
  shareButton: {
    height: SHARE_BUTTON_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B31D38",
    borderRadius: SHARE_BUTTON_RADIUS,
    justifyContent: "center",
    alignItems: "center",
  },
  shareButtonPressed: {
    opacity: 0.9,
  },
  shareButtonText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#B31D38",
  },
});
