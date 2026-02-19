/**
 * Shared ticket types. Used by TicketListScreen and TicketDetailScreen.
 * Change shape here → list and detail stay in sync.
 */

/**
 * Ticket from GET API. Use `type` (or entry_type) as single source for "Staff" / "Driver Partner"
 * via getEntryTypeDisplayLabel(type). API types: new_dp, old_dp, non_dp.
 */
export interface TicketListItem {
  id: string;
  token_no: string;
  name?: string;
  purpose?: string;
  reason?: string;
  category?: string;
  subCategory?: string;
  entry_time?: string;
  exit_time?: string;
  agent_name?: string;
  desk_location?: string;
  status?: string;
  regNumber?: string;
  phone?: string;
  /** From GET API: new_dp | old_dp | non_dp — display as "Driver Partner" or "Staff" */
  type?: string;
}

/** Single ticket detail from GET by id. */
export interface TicketDetailResult {
  id: string;
  token_no: string;
  name?: string;
  email?: string;
  phone?: string;
  reason?: string;
  agent_id?: string;
  status?: string;
  entry_time?: string;
  exit_time?: string | null;
  created_at?: string;
  updated_at?: string;
  assignee?: string;
  desk_location?: string;
  purpose?: string;
  category?: string;
  subCategory?: string;
  /** From GET API (type or entry_type): new_dp | old_dp | non_dp — display as "Driver Partner" / "Staff" */
  type?: string;
}

/** Normalize API item (camelCase or snake_case) to TicketListItem. */
export function normalizeTicketListItem(item: Record<string, unknown>): TicketListItem {
  const id =
    String(item.id ?? item.token_no ?? item.token ?? "") || `row-${Date.now()}`;
  const tokenNo = item.tokenNo ?? item.token_no ?? item.token ?? item.id;
  const entryTime = item.entryTime ?? item.entry_time;
  const exitTime = item.exitTime ?? item.exit_time;
  const regNumber = item.regNumber ?? item.reg_number ?? item.vehicle;
  const type = item.type ?? item.entry_type;
  const category = item.category ?? item.category_name;
  const subCategory = item.subCategory ?? item.sub_category;
  return {
    id,
    token_no: String(tokenNo ?? ""),
    name: item.name != null ? String(item.name) : undefined,
    purpose: item.purpose != null ? String(item.purpose) : undefined,
    reason: item.reason != null ? String(item.reason) : undefined,
    category: category != null ? String(category) : undefined,
    subCategory: subCategory != null ? String(subCategory) : undefined,
    entry_time: entryTime != null ? String(entryTime) : undefined,
    exit_time: exitTime != null ? String(exitTime) : undefined,
    agent_name:
      item.agentName != null
        ? String(item.agentName)
        : item.agent_name != null
          ? String(item.agent_name)
          : item.assignee != null
            ? String(item.assignee)
            : undefined,
    desk_location:
      item.deskLocation != null
        ? String(item.deskLocation)
        : item.desk_location != null
          ? String(item.desk_location)
          : undefined,
    status: item.status != null ? String(item.status) : undefined,
    regNumber: regNumber != null ? String(regNumber) : undefined,
    phone: item.phone != null ? String(item.phone) : undefined,
    type: type != null ? String(type) : undefined,
  };
}
