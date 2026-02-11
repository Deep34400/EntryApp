import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderBackButton } from "@react-navigation/elements";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import { HomeHeaderButton } from "@/components/HomeHeaderButton";
import { ThemeToggleHeaderButton } from "@/components/ThemeToggleHeaderButton";
import WhoAreYouScreen from "@/screens/WhoAreYouScreen";
import HubSelectScreen from "@/screens/HubSelectScreen";
import VisitorTypeScreen from "@/screens/VisitorTypeScreen";
import EntryFormScreen from "@/screens/EntryFormScreen";
import VisitorPurposeScreen from "../screens/VisitorPurposeScreen";
import TokenDisplayScreen from "@/screens/TokenDisplayScreen";
import ExitConfirmationScreen from "@/screens/ExitConfirmationScreen";
import TicketListScreen from "../screens/TicketListScreen";
import TicketDetailScreen from "../screens/TicketDetailScreen";

/** Entry type: dp = unified form (vehicle optional → old_dp if set, else new_dp); new_dp/old_dp/non_dp for downstream */
export type EntryType = "new_dp" | "old_dp" | "non_dp" | "dp";

/** Form data collected on second screen (mobile, name, reg no if Old DP) */
export interface EntryFormData {
  phone: string;
  name: string;
  vehicle_reg_number?: string;
}

export type RootStackParamList = {
  WhoAreYou: undefined;
  HubSelect: undefined;
  VisitorType: undefined;
  EntryForm: { entryType: EntryType };
  VisitorPurpose: { entryType: EntryType; formData: EntryFormData };
  TokenDisplay: { token: string; agentName: string; gate: string };
  ExitConfirmation: { token: string };
  TicketList: { filter: "open" | "closed" };
  TicketDetail: { ticketId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const BACK_HIT_SLOP = { top: 16, bottom: 16, left: 16, right: 24 };
const SCREENS_WITH_BACK = ["EntryForm", "VisitorPurpose", "TicketList", "TicketDetail"];

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={({ route, navigation }) => ({
        ...screenOptions,
        ...(SCREENS_WITH_BACK.includes(route.name)
          ? {
              headerLeft: (props) =>
                props.canGoBack ? (
                  <Pressable
                    onPress={() => navigation.goBack()}
                    hitSlop={BACK_HIT_SLOP}
                    style={backButtonStyles.wrapper}
                  >
                    <View style={backButtonStyles.inner}>
                      <HeaderBackButton
                        {...props}
                        onPress={() => navigation.goBack()}
                      />
                    </View>
                  </Pressable>
                ) : null,
            }
          : {}),
      })}
      initialRouteName="WhoAreYou"
    >
      <Stack.Screen
        name="WhoAreYou"
        component={WhoAreYouScreen}
        options={{
          headerShown: false,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="HubSelect"
        component={HubSelectScreen}
        options={{
          headerTitle: "",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="VisitorType"
        component={VisitorTypeScreen}
        options={{
          headerTitle: "Gate ",
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: "700",
          },
          headerRight: () => <ThemeToggleHeaderButton />,
        }}
      />
      <Stack.Screen
        name="EntryForm"
        component={EntryFormScreen}
        options={({ route }) => ({
          headerTitle:
            route.params.entryType === "dp"
              ? "DP Entry"
              : route.params.entryType === "new_dp"
                ? "New DP Entry"
                : route.params.entryType === "old_dp"
                  ? "Old DP Entry"
                  : "Staff Entry",
          headerRight: () => <HomeHeaderButton />,
        })}
      />
      <Stack.Screen
        name="VisitorPurpose"
        component={VisitorPurposeScreen}
        options={{
          headerTitle: "Visitor's Purpose",
          headerRight: () => <HomeHeaderButton />,
        }}
      />
      <Stack.Screen
        name="TicketList"
        component={TicketListScreen}
        options={({ route }) => ({
          headerTitle:
            route.params.filter === "open"
              ? "Open Tickets"
              : "Closed Tickets",
          headerRight: () => <HomeHeaderButton />,
        })}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{
          headerTitle: "Ticket Details",
          headerRight: () => <HomeHeaderButton />,
        }}
      />
      <Stack.Screen
        name="TokenDisplay"
        component={TokenDisplayScreen}
        options={{
          headerTitle: "Your Token",
          headerBackVisible: false,
          gestureEnabled: false,
          headerRight: () => <HomeHeaderButton />,
        }}
      />
      <Stack.Screen
        name="ExitConfirmation"
        component={ExitConfirmationScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

const backButtonStyles = StyleSheet.create({
  wrapper: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "flex-start",
    marginLeft: -8,
  },
  inner: {
    justifyContent: "center",
    alignItems: "center",
  },
});
