import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthNavigator } from "./AuthNavigator";
import { AppNavigator } from "./AppNavigator";

export default function RootNavigator() {
  const { isAuthenticated, isRestored, sessionExpired, clearSessionExpiredFlag } = useAuth();

  useEffect(() => {
    if (isRestored && (!isAuthenticated || sessionExpired)) {
      clearSessionExpiredFlag();
    }
  }, [isRestored, isAuthenticated, sessionExpired, clearSessionExpiredFlag]);

  if (!isRestored) {
    return null;
  }

  if (!isAuthenticated || sessionExpired) {
    return <AuthNavigator />;
  }

  return <AppNavigator />;
}
