/**
 * API endpoints — YOUR BACKEND must implement these.
 * Set EXPO_PUBLIC_API_URL in .env to your backend base URL (e.g. https://your-api.com).
 *
 * All requests use the base URL from getApiUrl() in query-client.ts.
 * Same pattern for GET (details) and POST (create/close): use apiRequest(method, path, body?).
 */

// ----- POST: Entry pass (your backend) -----
// Path: POST /api/v1/testRoutes/entry_pass
// Body: { purpose: string, name: string, email: string, phone: string }
// Response: map to { token, agentName?, gate? } for TokenDisplay
export const ENTRY_PASS_PATH = "/api/v1/testRoutes/entry_pass";

/** Map visitor type to API purpose (e.g. sourcing → "driver_manager"). */
export const VISITOR_PURPOSE: Record<string, string> = {
  sourcing: "driver_manager",
  maintenance: "maintenance",
  collection: "collection",
};

// ----- GET: Ticket details -----
// Path: GET /api/tickets/:token
// Response: { token, agentName, gate, ... } (your backend shape)
export function getTicketDetailsPath(token: string): string {
  return `/api/tickets/${encodeURIComponent(token)}`;
}

// ----- POST: Close ticket (exit) -----
// Path: POST /api/tickets/:token/close
// Body: none
// Response: { success: true } or 200 OK
export function closeTicketPath(token: string): string {
  return `/api/tickets/${encodeURIComponent(token)}/close`;
}
