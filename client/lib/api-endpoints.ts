/**
 * API endpoints — YOUR BACKEND must implement these.
 * Set EXPO_PUBLIC_API_URL in .env to your backend base URL (e.g. https://your-api.com).
 *
 * All requests use the base URL from getApiUrl() in api/requestClient (re-exported from lib/api-url.ts).
 * Same pattern for GET (details) and POST (create/close): use apiRequest(method, path, body?).
 */

// ----- Identity & Auth -----
/** POST /api/v1/identity — get or validate guest token (30-day). Body: appType, appVersion, lastLoginUserId, guestToken, accessToken, refreshToken, tokenVersion, macId */
export const IDENTITY_PATH = "/api/v1/identity";

/** POST /api/v1/users/login/otp — send OTP to phone. Headers: device-id, app-type, app-version, Authorization: Bearer <guestToken>. Body: { phoneNo } */
export const LOGIN_OTP_PATH = "/api/v1/users/login/otp";

/** POST /api/v1/users/login/otp/verify — verify OTP. Same headers. Body: { phoneNo, otp }. Returns user, accessToken, refreshToken, identity. */
export const LOGIN_OTP_VERIFY_PATH = "/api/v1/users/login/otp/verify";

/** POST /api/v1/users/login/refresh — get new access token. Header only: Authorization: Bearer <refresh_token>. No body. Returns { accessToken, refreshToken }. */
export const REFRESH_TOKEN_PATH = "/api/v1/users/login/refresh";

/** App type for all auth/identity: identity body and login OTP/verify headers. Backend only handles OPS_PORTAL. */
export const IDENTITY_APP_TYPE = "OPS_PORTAL";
/** Same as IDENTITY_APP_TYPE — use OPS_PORTAL for login headers (send OTP, verify OTP). */
export const APP_TYPE = "OPS_PORTAL";
export const APP_VERSION = 1;

// ----- Entry App API (base) -----
// All entry-app endpoints: create, list, counts, get by id, update/close.
const ENTRY_APP_BASE = "/api/v1/entry-app";

/** POST — Create entry. Body: { type, name, phone, assignee, category, subCategory, regNumber? }. No reason/purpose; display uses category + subCategory. */
export const ENTRY_APP_CREATE_PATH = ENTRY_APP_BASE;

/** GET — List by status. view=open|closed|delayed, limit=50, page=1 (1-based). Response: { data: { data: [], total, page, limit } }. */
export function getEntryAppListPath(
  view: "open" | "closed" | "delayed",
  limit = 50,
  page = 1,
): string {
  return `${ENTRY_APP_BASE}?view=${view}&limit=${limit}&page=${page}`;
}

/** GET — Counts. Response: { success, data: { open, closed, delayed } } */
export const ENTRY_APP_COUNTS_PATH = `${ENTRY_APP_BASE}?view=counts`;

/** GET — Single entry by id (UUID). Response: { success, data: { id, tokenNo, purpose, name, phone, regNumber, status, entryTime, exitTime, ... } } */
export function getEntryAppDetailPath(id: string): string {
  return `${ENTRY_APP_BASE}/${encodeURIComponent(id)}`;
}

/** PATCH — Update/close entry (same URL as GET detail). Body: { status: "CLOSED" } to close */
export function getEntryAppUpdatePath(id: string): string {
  return getEntryAppDetailPath(id);
}

/** Map visitor type to API purpose (for create body). */
export const VISITOR_PURPOSE: Record<string, string> = {
  sourcing: "ONBOARDING",
  maintenance: "FLEET EXECUTIVE",
  collection: "DRIVER MANAGER",
};

/** Map visitor type to API reason. */
export const VISITOR_REASON: Record<string, string> = {
  sourcing: "sourcing",
  maintenance: "maintenance",
  collection: "collection",
};

// ----- Config API -----
/** GET — Config by key. Response: { success, data: { key, value, ... } }. */
export const CONFIG_KEY_PATH = "/api/v1/config/key/PURPOSE_CONFIG";

// ----- GET: Driver details by reg_number or phone (auto-fill form) -----
// Path: GET /api/v1/testRoutes/ticket/driverDetails?reg_number=... OR ?phone=...
// Response: { status, message, results: { driver_name, phone, vehicles?: [{ reg_number }] } }
export function getDriverDetailsPath(params: { reg_number?: string; phone?: string }): string {
  const base = "/api/v1/testRoutes/ticket/driverDetails";
  if (params.reg_number?.trim()) {
    return `${base}?reg_number=${encodeURIComponent(params.reg_number.trim())}`;
  }
  if (params.phone?.trim()) {
    return `${base}?phone=${encodeURIComponent(params.phone.trim())}`;
  }
  return base;
}


