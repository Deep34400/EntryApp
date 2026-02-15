/**
 * Ticket business logic in one place: category label, waiting time, badge colors.
 * Change rules here → list and detail screens behave the same.
 */

import type { TicketListItem } from "@/types/ticket";
import type { ScreenPaletteType } from "@/constants/screenPalette";

/** Time thresholds (minutes). Over 2h = overdue; 30m–2h = warning. */
export const WAITING_THRESHOLD_WARNING_MINS = 30;
export const WAITING_THRESHOLD_OVERDUE_MINS = 120;

/** Category line: "Reason • Purpose" or just one (e.g. "Accident • Maintenance"). */
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

/** Waiting minutes since entry (for open tickets). */
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

/** Time badge color: grey <30m, orange 30m–2h, red >2h. Pass palette from theme. */
export function getTimeBadgeColor(
  waitingMinutes: number | null,
  palette: Pick<ScreenPaletteType, "textSecondary" | "warningOrange" | "primaryRed">,
): string {
  if (waitingMinutes == null) return palette.textSecondary;
  if (waitingMinutes < WAITING_THRESHOLD_WARNING_MINS) return palette.textSecondary;
  if (waitingMinutes < WAITING_THRESHOLD_OVERDUE_MINS) return palette.warningOrange;
  return palette.primaryRed;
}
