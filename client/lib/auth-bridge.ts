/**
 * Bridge so non-React code (requestClient) can trigger token refresh and notify session invalid.
 * AuthProvider sets the handlers; on 401 we call them as needed.
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

/** Called when 401 Unauthorized (generic or after failed refresh). Clears session and sets sessionExpired so app redirects to Login. */
export type OnUnauthorizedHandler = () => void;

let onUnauthorizedHandler: OnUnauthorizedHandler | null = null;

export function setOnUnauthorizedHandler(handler: OnUnauthorizedHandler | null): void {
  onUnauthorizedHandler = handler;
}

/** Notify that session is invalid (401). RequestClient calls this before throwing so user is logged out and redirected to Login. */
export function notifyUnauthorized(): void {
  onUnauthorizedHandler?.();
}
