/**
 * Shared backend health check for BackendGate and Server Unavailable retry.
 * Used so Retry re-runs the same check and never shows raw errors.
 */

import { getApiUrl } from "@/api/requestClient";

export type BackendHealthResult = "ready" | "offline" | "maintenance" | "server_error" | "server_unavailable";

const HEALTH_CHECK_TIMEOUT_MS = 10000;

/**
 * Run backend health check. Returns ready if backend is reachable and not 503/5xx.
 * No response / network / timeout → server_unavailable (never throw raw "Failed to fetch").
 */
export async function checkBackendHealth(): Promise<BackendHealthResult> {
  let url: string;
  try {
    url = getApiUrl();
  } catch {
    return "server_error";
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.status === 503) return "maintenance";
    if (res.status >= 500) return "server_error";
    return "ready";
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "AbortError" || /timeout|network|failed to fetch|econnreset/i.test(msg)) {
      return "server_unavailable";
    }
    return "server_unavailable";
  }
}
