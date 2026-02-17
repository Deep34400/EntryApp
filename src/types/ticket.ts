/**
 * Shared ticket types for list and detail screens.
 */

export interface TicketListItem {
  id: string;
  token_no: string;
  name?: string;
  purpose?: string;
  reason?: string;
  entry_time?: string;
  exit_time?: string;
  agent_name?: string;
  desk_location?: string;
  status?: string;
  regNumber?: string;
  phone?: string;
  type?: string;
}

export function normalizeTicketListItem(
  item: Record<string, unknown>
): TicketListItem {
  const id =
    String(item.id ?? item.token_no ?? item.token ?? "") || `row-${Date.now()}`;
  const tokenNo = item.tokenNo ?? item.token_no ?? item.token ?? item.id;
  const entryTime = item.entryTime ?? item.entry_time;
  const exitTime = item.exitTime ?? item.exit_time;
  const regNumber = item.regNumber ?? item.reg_number ?? item.vehicle;
  const type = item.type ?? item.entry_type;
  return {
    id,
    token_no: String(tokenNo ?? ""),
    name: item.name != null ? String(item.name) : undefined,
    purpose: item.purpose != null ? String(item.purpose) : undefined,
    reason: item.reason != null ? String(item.reason) : undefined,
    entry_time: entryTime != null ? String(entryTime) : undefined,
    exit_time: exitTime != null ? String(exitTime) : undefined,
    agent_name:
      item.agentName != null
        ? String(item.agentName)
        : item.agent_name != null
          ? String(item.agent_name)
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
