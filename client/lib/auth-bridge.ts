/**
 * Bridge: non-React code (requestClient) triggers refresh and logout. Module-level flags prevent races and loops.
 *
 * - identityInFlight: only one identity call at a time; effect and retry both guard on this.
 * - logoutInProgress: prevent multiple logout/notifyUnauthorized from stacking.
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

// ----- Identity: only one call in flight (stops infinite identity loop) -----
let identityInFlight = false;

export function getIdentityInFlight(): boolean {
  return identityInFlight;
}

export function setIdentityInFlight(value: boolean): void {
  identityInFlight = value;
}

// ----- Logout: prevent multiple simultaneous logouts -----
let logoutInProgress = false;

export function getLogoutInProgress(): boolean {
  return logoutInProgress;
}

export function setLogoutInProgress(value: boolean): void {
  logoutInProgress = value;
}

/** Called when 401 Unauthorized (generic or after failed refresh). Clears session and sets sessionExpired so app redirects to Login. */
export type OnUnauthorizedHandler = () => void;

let onUnauthorizedHandler: OnUnauthorizedHandler | null = null;

export function setOnUnauthorizedHandler(handler: OnUnauthorizedHandler | null): void {
  onUnauthorizedHandler = handler;
}

/** Notify that session is invalid (401). RequestClient calls this before throwing. No-op if logout already in progress. */
export function notifyUnauthorized(): void {
  if (getLogoutInProgress()) return;
  onUnauthorizedHandler?.();
}
