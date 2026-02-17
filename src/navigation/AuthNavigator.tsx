import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

import LoginOtpScreen from "@/screens/auth/LoginOtpScreen";
import OTPVerificationScreen from "@/screens/auth/OTPVerificationScreen";

const Stack = createNativeStackNavigator<Pick<RootStackParamList, "LoginOtp" | "OTPVerification">>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: false }}
      initialRouteName="LoginOtp"
    >
      <Stack.Screen name="LoginOtp" component={LoginOtpScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}
