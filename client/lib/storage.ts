/**
 * Auth storage: load, save, clear. No API, no React.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "@entry_app_auth";

export type DefaultRoleOrHub = { id: string; name: string };

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
  defaultRole: DefaultRoleOrHub | null;
  defaultHub: DefaultRoleOrHub | null;
};

export const defaultStored: StoredAuth = {
  guestToken: "",
  identityId: "",
  accessToken: "",
  refreshToken: "",
  tokenVersion: 1,
  user: null,
  defaultRole: null,
  defaultHub: null,
};

export function clearedStored(keepIdentityId = ""): StoredAuth {
  return { ...defaultStored, guestToken: "", identityId: keepIdentityId };
}

export async function loadAuth(): Promise<StoredAuth> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return defaultStored;

  try {
    const p = JSON.parse(raw) as Record<string, unknown>;

    const defaultRole = parseRoleOrHub(p.defaultRole)
      ?? (typeof p.defaultRoleId === "string" && p.defaultRoleId.trim()
        ? { id: p.defaultRoleId.trim(), name: (Array.isArray(p.roles) && typeof p.roles[0] === "string" ? String(p.roles[0]).trim() : "") || p.defaultRoleId.trim() }
        : null);

    const defaultHub = parseRoleOrHub(p.defaultHub)
      ?? (typeof p.selectedHubId === "string" && p.selectedHubId.trim()
        ? { id: p.selectedHubId.trim(), name: "" }
        : null);

    const user = p.user && typeof p.user === "object" && p.user !== null && "id" in p.user && "name" in p.user
      ? (p.user as StoredAuth["user"])
      : null;

    return {
      guestToken: typeof p.guestToken === "string" ? p.guestToken : "",
      identityId: typeof p.identityId === "string" ? p.identityId : "",
      accessToken: typeof p.accessToken === "string" ? p.accessToken : "",
      refreshToken: typeof p.refreshToken === "string" ? p.refreshToken : "",
      tokenVersion: typeof p.tokenVersion === "number" ? p.tokenVersion : 1,
      user,
      defaultRole,
      defaultHub,
    };
  } catch {
    return defaultStored;
  }
}

function parseRoleOrHub(v: unknown): DefaultRoleOrHub | null {
  if (!v || typeof v !== "object") return null;
  const o = v as { id?: unknown; name?: unknown };
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : null;
  if (!id) return null;
  const name = typeof o.name === "string" ? String(o.name).trim() : "";
  return { id, name: name || id };
}

export async function saveAuth(s: StoredAuth): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(s));
}

export async function clearAuth(keepIdentityId = ""): Promise<void> {
  await saveAuth(clearedStored(keepIdentityId));
}
