import React, { useEffect } from "react";
import { CommonActions } from "@react-navigation/native";
import type { ParamListBase } from "@react-navigation/native";
import type { NavigationContainerRef } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useServerUnavailable } from "@/contexts/ServerUnavailableContext";

type Props = {
  navigationRef: React.RefObject<NavigationContainerRef<ParamListBase> | null>;
};

const SESSION_EXPIRED_MSG = "Your session expired. Please request OTP again.";

/** When sessionExpired is set by real auth failure (401 / refresh failed), reset stack to LoginOtp. Never runs when Server Unavailable is active — server errors must never trigger logout or this screen. */
export function SessionExpiredHandler({ navigationRef }: Props) {
  const auth = useAuth();
  const { serverUnavailable } = useServerUnavailable();

  useEffect(() => {
    if (!auth.sessionExpired || serverUnavailable) return;
    const doReset = () => {
      const nav = navigationRef.current;
      if (nav?.isReady?.()) {
        nav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "LoginOtp", params: { message: SESSION_EXPIRED_MSG } }],
          })
        );
        auth.clearSessionExpiredFlag();
        return true;
      }
      return false;
    };
    if (doReset()) return;
    const t = setTimeout(() => {
      doReset();
    }, 100);
    return () => clearTimeout(t);
  }, [auth.sessionExpired, auth.clearSessionExpiredFlag, navigationRef, serverUnavailable]);

  return null;
}
