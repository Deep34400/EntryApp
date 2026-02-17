import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Share,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BackArrow } from "@/components/BackArrow";
import type { RootStackParamList } from "@/navigation/types";
import { getEntryTypeDisplayLabel } from "@/utils/entryType";
import { tokenStyles, GREEN_HEADER_HEIGHT, BOTTOM_PADDING, BUTTON_HEIGHT } from "./styles";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "TokenDisplay">;

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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={tokenStyles.root}>
      <BackArrow color="#FFFFFF" />

      <View
        style={[
          tokenStyles.green,
          { paddingTop: insets.top, height: GREEN_HEADER_HEIGHT },
        ]}
      >
        <View style={tokenStyles.tokenWrap}>
          <Text style={tokenStyles.tokenLabel}>Token Number</Text>
          <Text style={tokenStyles.tokenValue}>{displayToken}</Text>
        </View>
      </View>

      <View style={tokenStyles.driverCardFloating}>
        <View style={tokenStyles.driverCard}>
          <View style={tokenStyles.driverLeft}>
            <View style={tokenStyles.avatar}>
              <Text style={tokenStyles.avatarText}>
                {driverName?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={tokenStyles.driverTextBlock}>
              <Text style={tokenStyles.name} numberOfLines={1}>
                {driverName || "—"}
              </Text>
              <Text style={tokenStyles.role}>{roleLabel}</Text>
            </View>
          </View>
          <Text style={tokenStyles.phone} numberOfLines={1}>
            {driverPhone ?? "—"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={tokenStyles.scroll}
        contentContainerStyle={[
          tokenStyles.scrollContent,
          {
            paddingTop: 48,
            paddingBottom:
              insets.bottom + BOTTOM_PADDING + BUTTON_HEIGHT * 2 + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={tokenStyles.assignmentCard}>
          <Text style={tokenStyles.assignmentHeader}>Assignment</Text>
          <View style={tokenStyles.assignmentDivider} />
          <View style={tokenStyles.assignmentRow}>
            <Text style={tokenStyles.assignmentLabel}>Purpose</Text>
            <Text style={tokenStyles.assignmentValue}>{purpose ?? "—"}</Text>
          </View>
          <View style={tokenStyles.assignmentRow}>
            <Text style={tokenStyles.assignmentLabel}>Agent</Text>
            <Text style={tokenStyles.assignmentValue}>{assignee ?? "—"}</Text>
          </View>
          <View style={tokenStyles.assignmentRow}>
            <Text style={tokenStyles.assignmentLabel}>Desk/Location</Text>
            <Text style={tokenStyles.assignmentValue}>
              {desk_location ?? "—"}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          tokenStyles.bottom,
          {
            paddingBottom: insets.bottom + BOTTOM_PADDING,
            paddingHorizontal: BOTTOM_PADDING,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            Share.share({
              message: `Token: ${displayToken}\nAgent: ${assignee ?? ""}\nDesk: ${desk_location ?? ""}`,
            })
          }
          style={({ pressed }) => [
            tokenStyles.shareBtn,
            pressed && tokenStyles.buttonPressed,
          ]}
        >
          <Text style={tokenStyles.shareText}>Share Receipt</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("TicketList", { filter: "open" })}
          style={({ pressed }) => [
            tokenStyles.trackBtn,
            pressed && tokenStyles.buttonPressed,
          ]}
        >
          <Text style={tokenStyles.trackText}>Track Tickets</Text>
        </Pressable>
      </View>
    </View>
  );
}
