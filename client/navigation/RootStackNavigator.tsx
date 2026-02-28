/**
 * Root stack: only registers screens allowed for the current role (from AuthContext).
 * No role checks inside screens — access is enforced by screen registration.
 */

import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";

import { BackArrow } from "@/components/BackArrow";
import { HomeHeaderButton } from "@/components/HomeHeaderButton";
import LoginOtpScreen from "@/screens/LoginOtpScreen";
import OTPVerificationScreen from "@/screens/OTPVerificationScreen";
import NoRoleBlockScreen from "@/screens/NoRoleBlockScreen";
import NoHubBlockScreen from "@/screens/NoHubBlockScreen";
import VisitorTypeScreen from "@/screens/VisitorTypeScreen";
import EntryFormScreen from "@/screens/EntryFormScreen";
import CategorySelectScreen from "../screens/CategorySelectScreen";
import OnboardingPurposeScreen from "../screens/OnboardingPurposeScreen";
import SettlementPurposeScreen from "../screens/SettlementPurposeScreen";
import MaintenancePurposeScreen from "../screens/MaintenancePurposeScreen";
import StaffPurposeScreen from "../screens/StaffPurposeScreen";
import TokenDisplayScreen from "@/screens/TokenDisplayScreen";
import ExitConfirmationScreen from "@/screens/ExitConfirmationScreen";
import TicketListScreen from "@/screens/TicketListScreen";
import TicketDetailScreen from "@/screens/TicketDetailScreen";
import ProfileScreen from "@/screens/ProfileScreen";

import {
  getScreensForRole,
  type RootScreenName,
} from "@/permissions/rolePermissions";

/** Visitor form data (phone, name, optional vehicle reg, optional referral). */
export interface EntryFormData {
  phone: string;
  name: string;
  vehicle_reg_number?: string;
  referral?: "yes" | "no";
  referralName?: string;
}

/** Category passed to purpose screens. */
export type VisitorCategory = "Onboarding" | "Settlement" | "Maintenance";

export type RootStackParamList = {
  LoginOtp: { message?: string } | undefined;
  OTPVerification: { phone: string };
  NoRoleBlock: undefined;
  NoHubBlock: undefined;
  VisitorType: undefined;
  EntryForm: { entryType?: "non_dp" } | undefined;
  CategorySelect: { formData: EntryFormData; entryType?: string };
  OnboardingPurpose: { formData: EntryFormData };
  SettlementPurpose: { formData: EntryFormData };
  MaintenancePurpose: { formData: EntryFormData };
  StaffPurpose: { formData: EntryFormData };
  TokenDisplay: {
    token: string;
    assignee: string;
    desk_location: string;
    driverName?: string;
    driverPhone?: string;
    entryType?: string;
    purpose?: string;
  };
  ExitConfirmation: { token: string };
  TicketList: { filter: "open" | "closed" };
  TicketDetail: { ticketId: string };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const SCREENS_WITH_BACK: RootScreenName[] = [
  "EntryForm",
  "CategorySelect",
  "OnboardingPurpose",
  "SettlementPurpose",
  "MaintenancePurpose",
  "StaffPurpose",
  "TicketList",
  "TicketDetail",
  "Profile",
];

type StackScreenOptions = (params?: {
  route?: { params?: unknown };
  navigation?: unknown;
}) => object;

const SCREEN_CONFIG: Record<
  RootScreenName,
  { component: React.ComponentType<any>; options: StackScreenOptions }
> = {
  LoginOtp: {
    component: LoginOtpScreen,
    options: () => ({
      headerShown: false,
      headerBackVisible: false,
      gestureEnabled: false,
    }),
  },
  OTPVerification: {
    component: OTPVerificationScreen,
    options: () => ({ headerShown: false }),
  },
  NoRoleBlock: {
    component: NoRoleBlockScreen,
    options: () => ({ headerShown: false, gestureEnabled: false }),
  },
  NoHubBlock: {
    component: NoHubBlockScreen,
    options: () => ({ headerShown: false, gestureEnabled: false }),
  },
  VisitorType: {
    component: VisitorTypeScreen,
    options: () => ({ headerShown: false }),
  },
  EntryForm: {
    component: EntryFormScreen,
    options: () => ({
      headerTitle: "Create Entry",
      headerRight: () => <HomeHeaderButton />,
    }),
  },
  CategorySelect: {
    component: CategorySelectScreen,
    options: () => ({
      headerTitle: "Select Category",
      headerShadowVisible: false,
    }),
  },
  OnboardingPurpose: {
    component: OnboardingPurposeScreen,
    options: () => ({ headerTitle: "Onboarding", headerShadowVisible: false }),
  },
  SettlementPurpose: {
    component: SettlementPurposeScreen,
    options: () => ({ headerTitle: "Settlement", headerShadowVisible: false }),
  },
  MaintenancePurpose: {
    component: MaintenancePurposeScreen,
    options: () => ({ headerTitle: "Maintenance", headerShadowVisible: false }),
  },
  StaffPurpose: {
    component: StaffPurposeScreen,
    options: () => ({ headerTitle: "Staff", headerShadowVisible: false }),
  },
  TicketList: {
    component: TicketListScreen,
    options: (params) => ({
      headerTitle:
        (params?.route?.params as { filter?: string })?.filter === "open"
          ? "Open Tickets"
          : "Closed Tickets",
      headerRight: () => <HomeHeaderButton />,
    }),
  },
  TicketDetail: {
    component: TicketDetailScreen,
    options: () => ({
      headerTitle: "Ticket Details",
      headerRight: () => <HomeHeaderButton />,
    }),
  },
  TokenDisplay: {
    component: TokenDisplayScreen,
    options: () => ({
      headerTitle: "Your Token",
      headerBackVisible: false,
      gestureEnabled: false,
      headerRight: () => <HomeHeaderButton />,
    }),
  },
  ExitConfirmation: {
    component: ExitConfirmationScreen,
    options: () => ({ headerShown: false, gestureEnabled: false }),
  },
  Profile: {
    component: ProfileScreen,
    options: () => ({ headerTitle: "Profile" }),
  },
};

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, hasValidRole, hasHub, allowedRole } = useAuth();

  const allowedScreens = useMemo(
    () => getScreensForRole(allowedRole),
    [allowedRole],
  );

  const initialRouteName = useMemo((): keyof RootStackParamList => {
    if (!isAuthenticated) return "LoginOtp";
    if (!hasValidRole) return "NoRoleBlock";
    if (!hasHub) return "NoHubBlock";
    return "VisitorType";
  }, [isAuthenticated, hasValidRole, hasHub]);

  /** Key by allowed screens so when the list changes (e.g. TicketList removed for guard), the stack remounts and clears stale route state. */
  const navigatorKey = allowedScreens.join(",");

  return (
    <Stack.Navigator
      key={navigatorKey}
      screenOptions={({ route, navigation }) => ({
        ...screenOptions,
        ...(SCREENS_WITH_BACK.includes(route.name as RootScreenName)
          ? {
              headerLeft: (props: { canGoBack?: boolean }) =>
                props.canGoBack ? (
                  <BackArrow onPress={() => navigation.goBack()} inline />
                ) : null,
              headerLeftContainerStyle: { minWidth: 56 },
            }
          : {}),
      })}
      initialRouteName={initialRouteName}
    >
      {allowedScreens.map((name) => {
        const { component, options } = SCREEN_CONFIG[name];
        return (
          <Stack.Screen
            key={name}
            name={name}
            component={component}
            options={options}
          />
        );
      })}
    </Stack.Navigator>
  );
}
