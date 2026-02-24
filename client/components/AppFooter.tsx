import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessScreen } from "@/permissions/rolePermissions";

export type AppFooterTab = "Entry" | "Ticket" | "Account";

interface AppFooterProps {
  activeTab: AppFooterTab;
}

const FOOTER_HEIGHT = 72;
const ICON_SIZE = 24;

const COLOR_ACTIVE = "#B31D38";
const COLOR_INACTIVE = "#8A8A8A";

const ALL_TABS: {
  id: AppFooterTab;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  screen: keyof RootStackParamList;
}[] = [
  { id: "Entry", label: "Entry", icon: "local-parking", screen: "VisitorType" },
  { id: "Ticket", label: "Ticket", icon: "confirmation-number", screen: "TicketList" },
  { id: "Account", label: "Account", icon: "account-circle", screen: "Profile" },
];

export function AppFooter({ activeTab }: AppFooterProps) {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { allowedRole } = useAuth();

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((tab) => canAccessScreen(tab.screen, allowedRole)),
    [allowedRole]
  );

  const handleTabPress = (tab: AppFooterTab) => {
    switch (tab) {
      case "Entry":
        navigation.navigate("VisitorType");
        break;
      case "Ticket":
        navigation.navigate("TicketList", { filter: "open" });
        break;
      case "Account":
        navigation.navigate("Profile");
        break;
    }
  };

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
      ]}
    >
      <View style={styles.tabRow}>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = isActive ? COLOR_ACTIVE : COLOR_INACTIVE;

          return (
            <Pressable
              key={tab.id}
              style={styles.tab}
              onPress={() => handleTabPress(tab.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <MaterialIcons
                name={tab.icon}
                size={ICON_SIZE}
                color={color}
              />
              <Text style={[styles.tabLabel, { color }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: "#FFFFFF",

    // Clean separator instead of shadow
    // borderTopWidth: 1,
    borderTopColor: "#EFEFEF",

    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
  },
});

export const APP_FOOTER_HEIGHT = FOOTER_HEIGHT;
