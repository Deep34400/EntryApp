/**
 * API endpoint paths. Base URL from env (EXPO_PUBLIC_API_URL).
 */

const ENTRY_APP_BASE = "/api/v1/entry-app";

export const IDENTITY_PATH = "/api/v1/identity";
export const LOGIN_OTP_PATH = "/api/v1/users/login/otp";
export const LOGIN_OTP_VERIFY_PATH = "/api/v1/users/login/otp/verify";
export const REFRESH_TOKEN_PATH = "/api/v1/users/login/refresh";

export const ENTRY_APP_CREATE_PATH = ENTRY_APP_BASE;

export function getEntryAppListPath(
  view: "open" | "closed" | "delayed",
  limit = 50,
  page = 1
): string {
  return `${ENTRY_APP_BASE}?view=${view}&limit=${limit}&page=${page}`;
}

export const ENTRY_APP_COUNTS_PATH = `${ENTRY_APP_BASE}?view=counts`;

export function getEntryAppDetailPath(id: string): string {
  return `${ENTRY_APP_BASE}/${encodeURIComponent(id)}`;
}

export function getEntryAppUpdatePath(id: string): string {
  return getEntryAppDetailPath(id);
}

export function getDriverDetailsPath(params: {
  reg_number?: string;
  phone?: string;
}): string {
  const base = "/api/v1/testRoutes/ticket/driverDetails";
  if (params.reg_number?.trim()) {
    return `${base}?reg_number=${encodeURIComponent(params.reg_number.trim())}`;
  }
  if (params.phone?.trim()) {
    return `${base}?phone=${encodeURIComponent(params.phone.trim())}`;
  }
  return base;
}
