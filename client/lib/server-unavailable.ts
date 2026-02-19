/**
 * Server unavailable: detect network/5xx errors and show global screen.
 * No React. Provider registers handler; auth/requestClient call showServerUnavailable() then throw.
 */

export const SERVER_UNAVAILABLE_MSG = "SERVER_UNAVAILABLE";

let serverUnavailableHandler: (() => void) | null = null;

export function setServerUnavailableHandler(fn: (() => void) | null): void {
  serverUnavailableHandler = fn;
}

export function showServerUnavailable(): void {
  serverUnavailableHandler?.();
}

export function isServerUnavailableError(err: unknown): boolean {
  if (err == null) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  if (msg === SERVER_UNAVAILABLE_MSG) return true;
  if (err instanceof ServerUnavailableError) return true;
  if (name === "AbortError" || msg === "AbortError") return true;
  if (/failed to fetch|network request failed|network error/i.test(msg)) return true;
  if (/cors|cross-origin|networkerror/i.test(msg)) return true;
  if (name === "TypeError" && /fetch|network/i.test(msg)) return true;
  if (/timeout|timed out/i.test(msg)) return true;
  if (/econnreset|econnrefused|enotfound|socket hang up/i.test(msg)) return true;
  if (err instanceof TypeError && /fetch/i.test(msg)) return true;
  return false;
}

export class ServerUnavailableError extends Error {
  constructor() {
    super(SERVER_UNAVAILABLE_MSG);
    this.name = "ServerUnavailableError";
  }
}
