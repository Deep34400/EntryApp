import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Platform,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Layout, Spacing, BorderRadius, DesignTokens } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "TokenDisplay">;

const FONT = "Poppins";
const tokenTokens = DesignTokens.token;

export default function TokenDisplayScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const contentWidth = Math.min(
    Layout.contentMaxWidth,
    screenWidth - Layout.horizontalScreenPadding * 2
  );

  const {
    token,
    assignee,
    desk_location,
    driverName,
    driverPhone,
  } = route.params ?? {};

  const displayToken = token?.startsWith("#") ? token : token ? `#${token}` : "#—";

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  return (
    <View style={styles.root}>
      {/* Green header — minHeight/maxHeight, safe area, back icon only absolute */}
      <View
        style={[
          styles.green,
          {
            paddingTop: insets.top,
            minHeight: Layout.tokenGreenHeaderMinHeight,
            maxHeight: Layout.tokenGreenHeaderMaxHeight,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.back, { top: insets.top }]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color={tokenTokens.onHeader} />
        </Pressable>

        <View style={styles.tokenWrap}>
          <Text style={styles.tokenLabel}>Token Number</Text>
          <Text style={styles.tokenValue} numberOfLines={1}>
            {displayToken}
          </Text>
        </View>
      </View>

      {/* Scrollable content: cards + spacer so buttons stay at bottom on all devices */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Spacing["2xl"],
            minHeight: 280,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cards wrapper — negative marginTop for Figma overlap */}
        <View
          style={[
            styles.cardWrapper,
            {
              width: contentWidth,
              marginTop: -Layout.tokenCardOverlap,
            },
          ]}
        >
          <View style={styles.userCard}>
            <View style={styles.userLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {driverName?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={styles.userTextBlock}>
                <Text style={styles.name} numberOfLines={1}>
                  {driverName || "—"}
                </Text>
                <Text style={styles.role}>Driver Partner</Text>
              </View>
            </View>
            <Text style={styles.phone} numberOfLines={1}>
              {driverPhone ?? "—"}
            </Text>
          </View>

          <View style={styles.proceedCard}>
            <View>
              <Text style={styles.small}>Proceed to</Text>
              <Text style={styles.value} numberOfLines={1}>
                {assignee || "—"}
              </Text>
            </View>
            <View style={styles.entryGateWrap}>
              <Text style={styles.small}>Entry Gate</Text>
              <Text style={styles.value} numberOfLines={1}>
                {desk_location || "—"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom buttons — fixed at bottom, safe area, production touch targets */}
      <View
        style={[
          styles.bottom,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            paddingHorizontal: Layout.horizontalScreenPadding + 10,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            Share.share({
              message: `Token: ${displayToken}\nProceed to: ${assignee ?? ""}\nEntry Gate: ${desk_location ?? ""}`,
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
          onPress={() => navigation.navigate("TicketList", { filter: "open" as const })}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  green: {
    width: "100%",
    backgroundColor: tokenTokens.headerGreen,
    paddingHorizontal: Layout.horizontalScreenPadding,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: Spacing["3xl"],
  },

  back: {
    position: "absolute",
    left: Layout.horizontalScreenPadding,
    height: Layout.backButtonTouchTarget,
    width: Layout.backButtonTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  tokenWrap: {
    justifyContent: "center",
    alignItems: "center",
  },

  tokenLabel: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "600",
    color: tokenTokens.onHeader,
    marginBottom: 6,
  },

  tokenValue: {
    fontFamily: FONT,
    fontSize: 32,
    fontWeight: "600",
    color: tokenTokens.onHeader,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },

  cardWrapper: {
    alignSelf: "center",
  },

  userCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: BorderRadius.sm,
    padding: Layout.cardPadding,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokenTokens.cardBorder,
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
    flex: 1,
    minWidth: 0,
  },

  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: tokenTokens.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },

  avatarText: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
  },

  userTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1917",
  },

  role: {
    fontFamily: FONT,
    fontSize: 12,
    color: tokenTokens.labelGray,
    marginTop: 2,
  },

  phone: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1917",
    marginLeft: Spacing.md,
  },

  proceedCard: {
    marginTop: Spacing["2xl"],
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: BorderRadius.sm,
    padding: Layout.cardPadding,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: tokenTokens.cardBorder,
  },

  entryGateWrap: {
    alignItems: "flex-end",
  },

  small: {
    fontFamily: FONT,
    fontSize: 12,
    color: tokenTokens.labelGray,
  },

  value: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1917",
    marginTop: 4,
  },

  bottom: {
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
  },

  shareBtn: {
    marginBottom: Spacing.md,
    minHeight: Layout.minTouchTarget,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokenTokens.accentRed,
    justifyContent: "center",
    alignItems: "center",
  },

  shareText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "600",
    color: tokenTokens.accentRed,
  },

  trackBtn: {
    minHeight: Layout.minTouchTarget,
    borderRadius: 22,
    backgroundColor: tokenTokens.accentRed,
    justifyContent: "center",
    alignItems: "center",
  },

  trackText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "600",
    color: tokenTokens.onHeader,
  },

  buttonPressed: {
    opacity: 0.85,
  },
});
