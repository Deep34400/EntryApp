/**
 * API endpoints — YOUR BACKEND must implement these.
 * Set EXPO_PUBLIC_API_URL in .env to your backend base URL (e.g. https://your-api.com).
 *
 * All requests use the base URL from getApiUrl() in query-client.ts.
 * Same pattern for GET (details) and POST (create/close): use apiRequest(method, path, body?).
 */

// ----- GET: Hub list (choose location) -----
// Path: GET /api/v1/hub/?page=1&limit=100
// Response: { status, message, results: [{ id, hub_name, driver_processing_fee, city }] }
export const HUB_LIST_PATH = "/api/v1/hub/";
export function getHubListPath(page = 1, limit = 100): string {
  return `${HUB_LIST_PATH}?page=${page}&limit=${limit}`;
}

/** Append hub_id query param to a path for APIs that filter by hub. */
export function appendHubIdToPath(path: string, hubId: string | undefined): string {
  if (!hubId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}hub_id=${encodeURIComponent(hubId)}`;
}

// ----- POST: Entry pass (create entry) -----
// Path: POST /api/v1/testRoutes/entry_pass
// Body: { type, phone, name, purpose, reason, hub_id?, vehicle_reg_number?, vehicle?, staff_name?, staff_phone? }
// type: "new_dp" | "old_dp" | "non_dp"
// purpose: "driver_manager" (Onboarding/Settlement) | "fleet_manager" (Maintenance) | "" (non_dp)
// reason: "Maintenance - Accident" | "Settlement - DM collection" | "Onboarding - Enquiry" | "Self Recovery (QC)" etc.
export const ENTRY_PASS_PATH = "/api/v1/testRoutes/entry_pass";

/** Map visitor type to API purpose. */
export const VISITOR_PURPOSE: Record<string, string> = {
  sourcing: "driver_manager",
  maintenance: "fleet_manager",
  collection: "driver_manager",
};

/** Map visitor type to API reason (sourcing | maintenance | collection). */
export const VISITOR_REASON: Record<string, string> = {
  sourcing: "sourcing",
  maintenance: "maintenance",
  collection: "collection",
};

// ----- GET: Ticket stats (counts) -----
// Path: GET /api/v1/testRoutes/tickets/stats
// Response: { status, message, results: { open?: number, closed?: number } } or similar.
export const TICKET_STATS_PATH = "/api/v1/testRoutes/tickets/stats";

// ----- GET: Ticket list (open or closed) -----
// Path: GET /api/v1/testRoutes/tickets/stats?includeData=open | ?includeData=closed
// Response: { status, message, results: { data: [...] } }.
export function getTicketListPath(filter: "open" | "closed"): string {
  return `${TICKET_STATS_PATH}?includeData=${filter}`;
}

// ----- GET: Driver details by reg_number or phone (auto-fill form) -----
// Path: GET /api/v1/testRoutes/ticket/driverDetails?reg_number=... OR ?phone=...
// Response: { status, message, results: { driver_name, phone, vehicles?: [{ reg_number }] } }
export function getDriverDetailsPath(params: { reg_number?: string; phone?: string }): string {
  const base = "/api/v1/testRoutes/ticket/driverDetails";
  if (params.reg_number?.trim()) {
    return `${base}?reg_number=${encodeURIComponent(params.reg_number.trim())}`;
  }
  if (params.phone?.trim()) {
    return `${base}?phone=${encodeURIComponent(params.phone.trim())}`;
  }
  return base;
}

// ----- GET: Ticket detail by ID (UUID) -----
// Path: GET /api/v1/testRoutes/tickets/:ticketId
// Response: { status, message, results: { id, token_no, name, email, phone, purpose, status, entry_time, exit_time, agent_name, desk_location, ... } }
export function getTicketDetailPath(ticketId: string): string {
  return `/api/v1/testRoutes/tickets/${encodeURIComponent(ticketId)}`;
}

// ----- PATCH: Update ticket (same URL as GET detail) -----
// Path: PATCH /api/v1/testRoutes/tickets/:ticketId
// Close ticket only: body { status: "CLOSED" }. Do not pass status when only updating name/email/etc.
// Update details only: body { name?, email?, phone?, ... } — no status.
export function getTicketUpdatePath(ticketId: string): string {
  return getTicketDetailPath(ticketId);
}

// ----- POST: Close ticket (exit) -----
// Path: POST /api/tickets/:token/close
// Body: none
// Response: { success: true } or 200 OK
export function closeTicketPath(token: string): string {
  return `/api/tickets/${encodeURIComponent(token)}/close`;
}
