import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
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

/** Entry type selected on first screen after hub: New DP / Old DP / Non DP */
export type EntryType = "new_dp" | "old_dp" | "non_dp";

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

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName="WhoAreYou">
      <Stack.Screen
        name="WhoAreYou"
        component={WhoAreYouScreen}
        options={{
          headerTitle: "Gate Entry",
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: "700",
          },
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="HubSelect"
        component={HubSelectScreen}
        options={{
          headerTitle: "Choose Hub",
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: "700",
          },
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="VisitorType"
        component={VisitorTypeScreen}
        options={{
          headerTitle: "Gate Entry",
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
            route.params.entryType === "new_dp"
              ? "New DP Entry"
              : route.params.entryType === "old_dp"
                ? "Old DP Entry"
                : "Non DP Entry",
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
