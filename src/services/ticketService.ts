/**
 * Ticket/entry-app API: list, counts, detail paths.
 * Use apiClient.requestWithAuthRetry / fetchWithAuthRetry for actual requests.
 */

import { requestWithAuthRetry, getApiUrl } from "@/services/apiClient";
import {
  ENTRY_APP_CREATE_PATH,
  ENTRY_APP_COUNTS_PATH,
  getEntryAppListPath,
  getEntryAppDetailPath,
  getEntryAppUpdatePath,
} from "@/constants/api";

export { ENTRY_APP_CREATE_PATH, getEntryAppListPath, getEntryAppDetailPath, getEntryAppUpdatePath };

export async function fetchTicketCountsSafe(
  _hubId?: string,
  accessToken?: string | null
): Promise<{ open: number; closed: number; delayed: number }> {
  try {
    const res =
      accessToken?.trim()
        ? await requestWithAuthRetry("GET", ENTRY_APP_COUNTS_PATH, undefined, accessToken)
        : await fetch(new URL(ENTRY_APP_COUNTS_PATH, getApiUrl()).href, {
            method: "GET",
            credentials: "omit",
          });
    if (!res.ok) return { open: 0, closed: 0, delayed: 0 };
    const json = (await res.json()) as {
      success?: boolean;
      data?: { open?: number; closed?: number; delayed?: number };
    };
    const data = json.data;
    return {
      open: Number(data?.open ?? 0) || 0,
      closed: Number(data?.closed ?? 0) || 0,
      delayed: Number(data?.delayed ?? 0) || 0,
    };
  } catch {
    return { open: 0, closed: 0, delayed: 0 };
  }
}
