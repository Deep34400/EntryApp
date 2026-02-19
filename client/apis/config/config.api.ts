/**
 * Config API. All calls go through requestClient.
 */

import { requestWithAuthRetry } from "@/api/requestClient";
import { CONFIG_KEY_PATH } from "@/lib/api-endpoints";
import type { PurposeConfigResponse, PurposeConfigValue } from "@/types/purposeConfig";

/** Fetch PURPOSE_CONFIG from backend. Uses auth token. Throws on auth/server errors. */
export async function getPurposeConfig(
  accessToken: string | null | undefined,
): Promise<PurposeConfigValue> {
  const res = await requestWithAuthRetry("GET", CONFIG_KEY_PATH, undefined, accessToken);
  const json = (await res.json()) as PurposeConfigResponse;
  if (!json.success || !Array.isArray(json.data?.value)) {
    throw new Error("Invalid purpose config response");
  }
  return json.data.value;
}
