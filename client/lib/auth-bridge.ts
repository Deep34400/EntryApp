/**
 * Bridge so non-React code (query-client) can trigger token refresh and get the new access token.
 * AuthProvider sets the handler; on 401 we call it, get new token or null (session expired).
 */

export type RefreshResult = string | null;

/** Returns new access token on success, null if session expired (logout). */
export type RefreshHandler = () => Promise<RefreshResult>;

let refreshHandler: RefreshHandler | null = null;

export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function getRefreshHandler(): RefreshHandler | null {
  return refreshHandler;
}

export async function tryRefreshToken(): Promise<RefreshResult> {
  const fn = getRefreshHandler();
  if (!fn) return null;
  return fn();
}
