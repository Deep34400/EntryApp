/**
 * Bridge so non-React code (requestClient, auth-api) can trigger the global Server Unavailable screen.
 * When any API fails with network/timeout/Failed to fetch, call showServerUnavailable() instead of throwing raw errors.
 *
 * Synchronous flag so requestClient and AuthContext can avoid auth logic while Server Unavailable is active
 * (fixes startup race: server error and auth error must not both be active; server has priority).
 */

export type ShowServerUnavailableFn = () => void;

let handler: ShowServerUnavailableFn | null = null;
let serverUnavailableActive = false;

export function setServerUnavailableHandler(fn: ShowServerUnavailableFn | null): void {
  handler = fn;
}

/** True when the Server Unavailable screen is currently shown. requestClient must not call notifyUnauthorized() when this is true. */
export function isServerUnavailableActive(): boolean {
  return serverUnavailableActive;
}

/** Called when user taps Retry; clears the flag so auth flow can run again. Provider must call this from retry(). */
export function clearServerUnavailableFlag(): void {
  serverUnavailableActive = false;
}

export function showServerUnavailable(): void {
  serverUnavailableActive = true;
  handler?.();
}
