import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import VisitorTypeScreen from "@/screens/VisitorTypeScreen";
import EntryFormScreen from "@/screens/EntryFormScreen";
import TokenDisplayScreen from "@/screens/TokenDisplayScreen";
import ExitConfirmationScreen from "@/screens/ExitConfirmationScreen";

export type VisitorType = "sourcing" | "maintenance" | "collection";

export type RootStackParamList = {
  VisitorType: undefined;
  EntryForm: { visitorType: VisitorType };
  TokenDisplay: { token: string; agentName: string; gate: string };
  ExitConfirmation: { token: string };
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
        }}
      />
      <Stack.Screen
        name="EntryForm"
        component={EntryFormScreen}
        options={({ route }) => ({
          headerTitle:
            route.params.visitorType.charAt(0).toUpperCase() +
            route.params.visitorType.slice(1),
        })}
      />
      <Stack.Screen
        name="TokenDisplay"
        component={TokenDisplayScreen}
        options={{
          headerTitle: "Your Token",
          headerBackVisible: false,
          gestureEnabled: false,
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
