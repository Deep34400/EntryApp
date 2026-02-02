import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import { HomeHeaderButton } from "@/components/HomeHeaderButton";
import { ThemeToggleHeaderButton } from "@/components/ThemeToggleHeaderButton";
import VisitorTypeScreen from "@/screens/VisitorTypeScreen";
import EntryFormScreen from "@/screens/EntryFormScreen";
import TokenDisplayScreen from "@/screens/TokenDisplayScreen";
import ExitConfirmationScreen from "@/screens/ExitConfirmationScreen";
import TicketListScreen from "@/screens/TicketListScreen";
import TicketDetailScreen from "@/screens/TicketDetailScreen";

export type VisitorType = "sourcing" | "maintenance" | "collection";

export type RootStackParamList = {
  VisitorType: undefined;
  EntryForm: { visitorType: VisitorType };
  TokenDisplay: { token: string; agentName: string; gate: string };
  ExitConfirmation: { token: string };
  TicketList: { filter: "open" | "closed" };
  TicketDetail: { ticketId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
            route.params.visitorType.charAt(0).toUpperCase() +
            route.params.visitorType.slice(1),
          headerRight: () => <HomeHeaderButton />,
        })}
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
