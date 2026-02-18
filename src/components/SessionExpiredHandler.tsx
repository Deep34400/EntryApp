import React, { useEffect } from "react";
import { CommonActions } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  navigationRef: React.RefObject<unknown>;
};

/** When sessionExpired is set, reset stack to LoginOtp and clear flag. */
export function SessionExpiredHandler({ navigationRef }: Props) {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.sessionExpired) return;
    const nav = navigationRef.current as { isReady?: () => boolean; dispatch?: (action: unknown) => void } | null;
    if (nav?.isReady?.()) {
      nav.dispatch?.(CommonActions.reset({ index: 0, routes: [{ name: "LoginOtp" }] }));
      auth.clearSessionExpiredFlag();
    }
  }, [auth.sessionExpired, auth.clearSessionExpiredFlag, navigationRef]);

  return null;
}
