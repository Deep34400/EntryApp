/**
 * BACKEND ERROR CODES & MESSAGES → APP ACTION
 * Single place to change when backend adds new codes. In future: add code here → refresh or logout.
 *
 * SUMMARY – WHERE TO CHANGE:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 1) REFRESH (get new access token, retry request once)
 *    File: client/api/requestClient.ts → is401TokenExpired()
 *    Config: REFRESH_ON_401_CODES below.
 *    When: Normal API returns 401 and body.errorCode/body.code is in this list.
 *
 * 2) LOGOUT (clear session, redirect to Login)
 *    File: client/api/requestClient.ts → calls notifyUnauthorized() on 401 when:
 *          - Auth/OTP/identity/refresh API, OR
 *          - Normal API but code NOT in REFRESH_ON_401_CODES, OR
 *          - After refresh/retry still 401.
 *    No extra config: any 401 that doesn’t trigger refresh → logout.
 *    To add “logout on specific code only”: change is401TokenExpired or add
 *    a check in requestClient 401 block using LOGOUT_ON_401_CODES (optional).
 *
 * 3) GUEST/OTP LOGOUT (logout + new identity + “request OTP again”)
 *    File: client/lib/auth-api.ts
 *    Config: ERROR_CODE_UNAUTHORIZED, ERROR_CODE_TOKEN_VERSION_MISMATCH,
 *            and isInvalidGuestSessionError() (codes + message patterns).
 *    When: Identity / Send OTP / Verify OTP fail.
 */

/** 401 response codes that mean "access token expired" → we refresh once and retry. Any other 401 → logout. */
export const REFRESH_ON_401_CODES: readonly string[] = ["TOKEN_EXPIRED"];

/** Optional: codes that always mean logout (e.g. if backend sends these on 401 instead of TOKEN_EXPIRED). Unused by default; add here if backend adds new logout-only codes. */
export const LOGOUT_ON_401_CODES: readonly string[] = [
  // "UNAUTHORIZED",
  // "INVALID_TOKEN",
];

export function isRefreshable401Code(code: string | null): boolean {
  if (!code) return false;
  return REFRESH_ON_401_CODES.includes(code);
}

export function isLogoutOnly401Code(code: string | null): boolean {
  if (!code) return false;
  return LOGOUT_ON_401_CODES.includes(code);
}
