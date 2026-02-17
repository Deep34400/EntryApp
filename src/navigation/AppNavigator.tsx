import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { BackArrow } from "@/components/BackArrow";
import { HomeHeaderButton } from "@/components/HomeHeaderButton";
import type { RootStackParamList } from "./types";

import VisitorTypeScreen from "@/screens/entry/VisitorTypeScreen";
import EntryFormScreen from "@/screens/entry/EntryFormScreen";
import VisitorPurposeScreen from "@/screens/entry/VisitorPurposeScreen";
import TokenDisplayScreen from "@/screens/token/TokenDisplayScreen";
import ExitConfirmationScreen from "@/screens/token/ExitConfirmationScreen";
import TicketListScreen from "@/screens/ticket/TicketListScreen";
import TicketDetailScreen from "@/screens/ticket/TicketDetailScreen";
import ProfileScreen from "@/screens/account/ProfileScreen";

const Stack = createNativeStackNavigator<Omit<RootStackParamList, "LoginOtp" | "OTPVerification">>();

const SCREENS_WITH_BACK = ["EntryForm", "VisitorPurpose", "TicketList", "TicketDetail", "Profile"];

export function AppNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={({ route, navigation }) => ({
        ...screenOptions,
        ...(SCREENS_WITH_BACK.includes(route.name)
          ? {
              headerLeft: (props: { canGoBack?: boolean }) =>
                props.canGoBack ? (
                  <BackArrow onPress={() => navigation.goBack()} inline />
                ) : null,
              headerLeftContainerStyle: { minWidth: 56 },
            }
          : {}),
      })}
      initialRouteName="VisitorType"
    >
      <Stack.Screen
        name="VisitorType"
        component={VisitorTypeScreen}
        options={{ headerShown: false }}
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
        options={{ headerTitle: () => null }}
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
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="TicketList"
        component={TicketListScreen}
        options={({ route }) => ({
          headerTitle: route.params.filter === "open" ? "Open Tickets" : "Closed Tickets",
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
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: "Profile" }}
      />
    </Stack.Navigator>
  );
}
