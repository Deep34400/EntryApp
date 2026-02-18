/**
 * Server unavailable detection: no HTTP response, network error, timeout, ECONNRESET, Failed to fetch.
 * Used to show a calm "Server is temporarily unavailable" screen instead of raw errors.
 */

/** Sentinel error thrown when request fails due to server/network (so UI never shows "Failed to fetch"). */
export const SERVER_UNAVAILABLE_MSG = "SERVER_UNAVAILABLE";

/**
 * True if the error indicates server temporarily unavailable (no response, network, timeout, ECONNRESET, etc.).
 * Do NOT show raw message to user; show global Server Unavailable screen instead.
 */
export function isServerUnavailableError(err: unknown): boolean {
  if (err == null) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  if (msg === SERVER_UNAVAILABLE_MSG) return true;
  if (name === "AbortError" || msg === "AbortError") return true;
  if (/failed to fetch|network request failed|network error/i.test(msg)) return true;
  if (/timeout|timed out/i.test(msg)) return true;
  if (/econnreset|econnrefused|enotfound|socket hang up/i.test(msg)) return true;
  if (err instanceof TypeError && /fetch/i.test(msg)) return true;
  return false;
}
