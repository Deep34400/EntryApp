import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { MaterialIcons } from "@expo/vector-icons";

export type AppFooterTab = "Entry" | "Ticket" | "Account";

interface AppFooterProps {
  activeTab: AppFooterTab;
}

const FONT_POPPINS = "Poppins";

const FOOTER_HEIGHT = 72;
const TAB_PADDING_VERTICAL = 6;
const TAB_PADDING_HORIZONTAL = 20;
const ICON_LABEL_GAP = 4;
const ICON_SIZE = 24;
const FONT_SIZE = 12;
const LINE_HEIGHT = 18;

const COLOR_ACTIVE = "#B31D38";
const COLOR_INACTIVE = "#77878E";

const TABS: { id: AppFooterTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: "Entry", label: "Entry", icon: "local-parking" },
  { id: "Ticket", label: "Ticket", icon: "confirmation-number" },
  { id: "Account", label: "Account", icon: "account-circle" },
];

export function AppFooter({ activeTab }: AppFooterProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

  const bottomInset = insets.bottom > 0 ? insets.bottom : 0;

  return (
    <View style={[styles.footer, { bottom: bottomInset }]}>
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = isActive ? COLOR_ACTIVE : COLOR_INACTIVE;
          const fontWeight = isActive ? "600" : "500";

          return (
            <Pressable
              key={tab.id}
              style={styles.tab}
              onPress={() => handleTabPress(tab.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <MaterialIcons
                name={tab.icon}
                size={ICON_SIZE}
                color={color}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color, fontWeight: fontWeight as "500" | "600" },
                ]}
              >
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
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  tab: {
    flex: 1,
    paddingVertical: TAB_PADDING_VERTICAL,
    paddingHorizontal: TAB_PADDING_HORIZONTAL,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIcon: {
    marginBottom: ICON_LABEL_GAP,
  },
  tabLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    textAlign: "center",
  },
});

/** Use when laying out screen content so it doesn't sit under the footer. */
export const APP_FOOTER_HEIGHT = FOOTER_HEIGHT;
