/**
 * Ticket (entry-app) API. All calls go through requestClient — no direct fetch, no auth/server logic here.
 */

import { requestWithAuthRetry } from "@/api/requestClient";
import {
  ENTRY_APP_COUNTS_PATH,
  ENTRY_APP_CREATE_PATH,
  getEntryAppListPath,
  getEntryAppDetailPath,
  getEntryAppUpdatePath,
} from "@/lib/api-endpoints";
import type { TicketListItem, TicketDetailResult } from "@/types/ticket";
import { normalizeTicketListItem } from "@/types/ticket";

const DEFAULT_PAGE_SIZE = 50;

export type TicketCounts = { open: number; closed: number; delayed: number };

export type TicketListPageResult = {
  list: TicketListItem[];
  total: number;
  page: number;
  limit: number;
};

/** Get open/closed/delayed counts. Safe: returns zeros on error. */
export async function getTicketCounts(
  accessToken: string | null | undefined,
): Promise<TicketCounts> {
  try {
    const res = await requestWithAuthRetry("GET", ENTRY_APP_COUNTS_PATH, undefined, accessToken);
    if (!res.ok) return { open: 0, closed: 0, delayed: 0 };
    const json = (await res.json()) as {
      success?: boolean;
      data?: { open?: number; closed?: number; delayed?: number };
    };
    const data = json.data;
    return {
      open: Number(data?.open ?? 0) || 0,
      closed: Number(data?.closed ?? 0) || 0,
      delayed: Number(data?.delayed ?? 0) || 0,
    };
  } catch {
    return { open: 0, closed: 0, delayed: 0 };
  }
}

/** Get paginated list by view (open | closed | delayed). Safe: returns empty list on error. */
export async function getTicketList(
  view: "open" | "closed" | "delayed",
  accessToken: string | null | undefined,
  page: number,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<TicketListPageResult> {
  try {
    const path = getEntryAppListPath(view, limit, page);
    const res = await requestWithAuthRetry("GET", path, undefined, accessToken);
    if (!res.ok) return { list: [], total: 0, page: 1, limit };
    const json = (await res.json()) as {
      success?: boolean;
      data?: { data?: unknown[]; total?: number; page?: number; limit?: number };
    };
    const payload = json.data;
    const rawList = Array.isArray(payload?.data) ? (payload.data as Record<string, unknown>[]) : [];
    const list = rawList.map((item) => normalizeTicketListItem(item));
    const total = Number(payload?.total ?? 0) || 0;
    const pageNum = Number(payload?.page ?? page) || page;
    const limitNum = Number(payload?.limit ?? limit) || limit;
    return { list, total, page: pageNum, limit: limitNum };
  } catch {
    return { list: [], total: 0, page: 1, limit };
  }
}

/** Get single ticket by id. Returns null on error or missing data. */
export async function getTicketById(
  id: string,
  accessToken: string | null | undefined,
): Promise<TicketDetailResult | null> {
  try {
    const path = getEntryAppDetailPath(id);
    const res = await requestWithAuthRetry("GET", path, undefined, accessToken);
    const json = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
    const d = json.data;
    if (!d) return null;
    const tokenNo = d.tokenNo ?? d.token_no ?? d.token;
    const entryTime = d.entryTime ?? d.entry_time;
    const exitTime = d.exitTime ?? d.exit_time;
    const createdAt = d.createdAt ?? d.created_at;
    const updatedAt = d.updatedAt ?? d.updated_at;
    const assignee = d.assignee ?? d.assignee_name;
    const deskLocation = d.deskLocation ?? d.desk_location;
    const agentId = d.agentId ?? d.agent_id;
    const purpose = d.purpose != null ? String(d.purpose) : undefined;
    const type = d.type ?? d.entry_type;
    const category = d.category ?? d.category_name;
    const subCategory = d.subCategory ?? d.sub_category;
    return {
      id: String(d.id ?? ""),
      token_no: String(tokenNo ?? ""),
      name: d.name != null ? String(d.name) : undefined,
      email: d.email != null ? String(d.email) : undefined,
      phone: d.phone != null ? String(d.phone) : undefined,
      reason: d.reason != null ? String(d.reason) : undefined,
      purpose,
      category: category != null ? String(category) : undefined,
      subCategory: subCategory != null ? String(subCategory) : undefined,
      agent_id: agentId != null ? String(agentId) : undefined,
      status: d.status != null ? String(d.status) : undefined,
      entry_time: entryTime != null ? String(entryTime) : undefined,
      exit_time: exitTime != null ? String(exitTime) : undefined,
      created_at: createdAt != null ? String(createdAt) : undefined,
      updated_at: updatedAt != null ? String(updatedAt) : undefined,
      assignee: assignee != null ? String(assignee) : undefined,
      desk_location: deskLocation != null ? String(deskLocation) : undefined,
      type: type != null ? String(type) : undefined,
    };
  } catch {
    return null;
  }
}

/** Create entry. Returns raw response JSON (tokenNo, assignee, etc.). Throws on auth/server errors. */
export async function createTicket(
  payload: Record<string, unknown>,
  accessToken: string | null | undefined,
): Promise<Record<string, unknown>> {
  const res = await requestWithAuthRetry("POST", ENTRY_APP_CREATE_PATH, payload, accessToken);
  return (await res.json()) as Record<string, unknown>;
}

/** Update ticket (e.g. close). Body: { status: "CLOSED" }. Throws on auth/server errors. */
export async function updateTicket(
  id: string,
  payload: Record<string, unknown>,
  accessToken: string | null | undefined,
): Promise<void> {
  const path = getEntryAppUpdatePath(id);
  await requestWithAuthRetry("PUT", path, payload, accessToken);
}
