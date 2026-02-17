/**
 * Ticket business logic: waiting time, category label, badge colors.
 */

import type { TicketListItem } from "@/types/ticket";

export const WAITING_THRESHOLD_WARNING_MINS = 30;
export const WAITING_THRESHOLD_OVERDUE_MINS = 120;

export function getCategoryLabel(item: TicketListItem): string {
  const reason = (item.reason ?? "").trim();
  const purpose = (item.purpose ?? "").trim();
  if (reason && purpose && reason !== purpose) return `${reason} • ${purpose}`;
  if (reason) return reason;
  if (purpose) return purpose;
  return "—";
}

export function isEntryOlderThan2Hours(entryTime?: string | null): boolean {
  if (!entryTime) return false;
  try {
    const entry = new Date(entryTime).getTime();
    return Date.now() - entry > WAITING_THRESHOLD_OVERDUE_MINS * 60 * 1000;
  } catch {
    return false;
  }
}

export function getWaitingMinutes(entryTime?: string | null): number | null {
  if (!entryTime) return null;
  try {
    const entry = new Date(entryTime).getTime();
    const ms = Date.now() - entry;
    return ms < 0 ? null : Math.floor(ms / 60_000);
  } catch {
    return null;
  }
}

export type TimeBadgePalette = {
  textSecondary: string;
  warningOrange: string;
  primaryRed: string;
};

export function getTimeBadgeColor(
  waitingMinutes: number | null,
  palette: TimeBadgePalette
): string {
  if (waitingMinutes == null) return palette.textSecondary;
  if (waitingMinutes < WAITING_THRESHOLD_WARNING_MINS) return palette.textSecondary;
  if (waitingMinutes < WAITING_THRESHOLD_OVERDUE_MINS) return palette.warningOrange;
  return palette.primaryRed;
}
