/**
 * Global hub id for API headers (x-hub-id).
 * AuthContext sets this after login (hub at index 0); cleared on logout.
 * requestClient reads it so all authenticated requests attach the header without passing hub per call.
 */

let currentHubId: string | null = null;

export function setHubId(id: string | null): void {
  currentHubId = id?.trim() || null;
}

export function getHubId(): string | null {
  return currentHubId;
}
