/**
 * Referral/agent names API — fetch full list once (no name param; hubId from requestClient).
 * GET /api/v1/users/agents/list — only hubId is passed by requestClient.
 * Response: { success, data: [{ id, name, displayName?, roles? }] }
 * Search/filter is done locally in the UI; no API call on typing.
 */

import { requestWithAuthRetry } from "@/api/requestClient";
import { AGENTS_LIST_PATH } from "@/lib/api-endpoints";

/** Agent/referral item: show displayName in UI when present (e.g. "DM-Deepak"), else name. */
export type ReferralNameItem = { id: string; name: string; displayName?: string };

type AgentsListResponse = {
  success?: boolean;
  data?: Array<{ id?: string; name?: string; displayName?: string }>;
};

/** Label shown in dropdown/input: displayName if present, otherwise name. */
export function getReferralDisplayLabel(item: ReferralNameItem): string {
  return (item.displayName ?? item.name).trim() || item.name;
}

/**
 * Fetch full agents list once. No name param — only hubId is sent by requestClient.
 * Call when user selects "Yes" for referral; then filter locally on search.
 */
export async function getReferralNames(
  accessToken?: string | null,
): Promise<ReferralNameItem[]> {
  try {
    const res = await requestWithAuthRetry("GET", AGENTS_LIST_PATH, undefined, accessToken ?? undefined);
    const json = (await res.json()) as AgentsListResponse;
    const list = json?.data;
    if (!Array.isArray(list)) return [];
    const result: ReferralNameItem[] = [];
    for (const item of list) {
      if (item == null) continue;
      const nameStr = (item.name ?? "").trim();
      const displayNameStr = (item.displayName ?? "").trim();
      if (nameStr === "" && displayNameStr === "") continue;
      const id = typeof item.id === "string" && item.id.trim() !== "" ? item.id.trim() : String(Math.random());
      result.push({
        id,
        name: nameStr || displayNameStr,
        ...(displayNameStr !== "" && { displayName: displayNameStr }),
      });
    }
    return result;
  } catch {
    return [];
  }
}
