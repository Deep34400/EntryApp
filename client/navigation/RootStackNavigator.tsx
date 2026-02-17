import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import { BackArrow } from "@/components/BackArrow";
import { HeaderTitle } from "@/components/HeaderTitle";
import { HomeHeaderButton } from "@/components/HomeHeaderButton";
import { ThemeToggleHeaderButton } from "@/components/ThemeToggleHeaderButton";
import LoginOtpScreen from "@/screens/LoginOtpScreen";
import OTPVerificationScreen from "@/screens/OTPVerificationScreen";
import VisitorTypeScreen from "@/screens/VisitorTypeScreen";
import EntryFormScreen from "@/screens/EntryFormScreen";
import VisitorPurposeScreen from "../screens/VisitorPurposeScreen";
import TokenDisplayScreen from "@/screens/TokenDisplayScreen";
import ExitConfirmationScreen from "@/screens/ExitConfirmationScreen";
import TicketListScreen from "../screens/TicketListScreen";
import TicketDetailScreen from "../screens/TicketDetailScreen";
import ProfileScreen from "@/screens/ProfileScreen";

/**
 * Entry flow: VisitorType (Home) → VisitorPurpose → TokenDisplay.
 * EntryForm is used by MaintenanceReasonScreen (old_dp form) → VisitorPurpose.
 */
/** Entry type: dp = unified (vehicle optional → old_dp else new_dp); new_dp/old_dp/non_dp for API. */
export type EntryType = "new_dp" | "old_dp" | "non_dp" | "dp";

/** Visitor form data (phone, name, optional vehicle reg). */
export interface EntryFormData {
  phone: string;
  name: string;
  vehicle_reg_number?: string;
}

export type RootStackParamList = {
  LoginOtp: undefined;
  OTPVerification: { phone: string };
  VisitorType: undefined;
  EntryForm: { entryType: EntryType };
  VisitorPurpose: { entryType: EntryType; formData: EntryFormData };
  TokenDisplay: {
    token: string;
    assignee: string;
    desk_location: string;
    driverName?: string;
    driverPhone?: string;
    /** new_dp | old_dp | non_dp — used to show "Driver Partner" or "Staff" */
    entryType?: string;
  };
  ExitConfirmation: { token: string };
  TicketList: { filter: "open" | "closed" };
  TicketDetail: { ticketId: string };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const SCREENS_WITH_BACK = ["EntryForm", "VisitorPurpose", "TicketList", "TicketDetail", "Profile"];

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
                  <BackArrow
                    onPress={() => navigation.goBack()}
                    inline
                  />
                ) : null,
              headerLeftContainerStyle: { minWidth: 56 },
            }
          : {}),
      })}
      initialRouteName="LoginOtp"
    >
      <Stack.Screen
        name="LoginOtp"
        component={LoginOtpScreen}
        options={{
          headerShown: false,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{ headerShown: false }}
      />
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
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: "Profile",
        }}
      />
    </Stack.Navigator>
  );
}
