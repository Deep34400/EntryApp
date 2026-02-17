import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  navigationRef: React.RefObject<{ isReady?: () => boolean; dispatch?: (a: unknown) => void } | null>;
};

/** When sessionExpired is set, RootNavigator shows AuthNavigator. Clear flag when showing auth. */
export function SessionExpiredHandler({ navigationRef }: Props) {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.sessionExpired) return;
    const nav = navigationRef.current;
    if (nav?.isReady?.()) {
      auth.clearSessionExpiredFlag();
    }
  }, [auth.sessionExpired, auth.clearSessionExpiredFlag, navigationRef]);

  return null;
}
