/**
 * Bridge so non-React code (requestClient, auth-api) can trigger the global Server Unavailable screen.
 * When any API fails with network/timeout/Failed to fetch, call showServerUnavailable() instead of throwing raw errors.
 */

export type ShowServerUnavailableFn = () => void;

let handler: ShowServerUnavailableFn | null = null;

export function setServerUnavailableHandler(fn: ShowServerUnavailableFn | null): void {
  handler = fn;
}

export function showServerUnavailable(): void {
  handler?.();
}
