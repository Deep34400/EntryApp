/**
 * Auth storage only: load, save, clear tokens.
 * No API. No React. No state.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "@entry_app_auth";

export type StoredAuth = {
  guestToken: string;
  identityId: string;
  accessToken: string;
  refreshToken: string;
  tokenVersion: number;
  user: {
    id: string;
    name: string;
    phone: string;
    userType?: string;
  } | null;
  roles: string[];
  selectedHubId: string | null;
};

export const defaultStored: StoredAuth = {
  guestToken: "",
  identityId: "",
  accessToken: "",
  refreshToken: "",
  tokenVersion: 1,
  user: null,
  roles: [],
  selectedHubId: null,
};

export function clearedStored(keepIdentityId = ""): StoredAuth {
  return { ...defaultStored, guestToken: "", identityId: keepIdentityId };
}

export async function loadAuth(): Promise<StoredAuth> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return defaultStored;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    const roles = Array.isArray(parsed.roles) ? parsed.roles.filter((r) => typeof r === "string") : [];
    const selectedHubId =
      typeof parsed.selectedHubId === "string" && parsed.selectedHubId.trim()
        ? parsed.selectedHubId.trim()
        : null;
    return {
      guestToken: typeof parsed.guestToken === "string" ? parsed.guestToken : "",
      identityId: typeof parsed.identityId === "string" ? parsed.identityId : "",
      accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : "",
      refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : "",
      tokenVersion: typeof parsed.tokenVersion === "number" ? parsed.tokenVersion : 1,
      user: parsed.user && parsed.user.id && parsed.user.name ? parsed.user : null,
      roles,
      selectedHubId,
    };
  } catch {
    return defaultStored;
  }
}

export async function saveAuth(s: StoredAuth): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(s));
}

export async function clearAuth(keepIdentityId = ""): Promise<void> {
  await saveAuth(clearedStored(keepIdentityId));
}
