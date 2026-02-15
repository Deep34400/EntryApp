/**
 * Format as title case: first letter of each word capitalized.
 * e.g. "bengaluru" → "Bengaluru", "Uber Black Mumbai" → "Uber Black Mumbai"
 */
export function toTitleCase(s: string): string {
  if (!s?.trim()) return s ?? "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ----- Date/time (one place for all screens) -----

/** Entry/exit time: short date + short time. Use in lists and cards. */
export function formatEntryTime(iso?: string | null): string {
  if (iso == null || iso === "") return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

/** Full date/time: medium date + short time. Use in detail screens. */
export function formatDateTime(iso?: string | null): string {
  if (iso == null || iso === "") return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

/** Waiting time since entry: "3h", "48h", "45m". For open tickets. */
export function formatWaitingHours(entryTime?: string | null): string {
  if (!entryTime) return "—";
  try {
    const entry = new Date(entryTime).getTime();
    const ms = Date.now() - entry;
    if (ms < 0) return "—";
    const mins = Math.floor(ms / 60_000);
    const hours = Math.floor(mins / 60);
    if (hours >= 1) return `${hours}h`;
    return mins < 60 ? `${mins}m` : "1h";
  } catch {
    return "—";
  }
}

/** Duration between entry and exit: "3h", "48h", "45m". For closed tickets. */
export function formatDurationHours(
  entryTime?: string | null,
  exitTime?: string | null
): string {
  if (!entryTime || !exitTime) return "—";
  try {
    const entry = new Date(entryTime).getTime();
    const exit = new Date(exitTime).getTime();
    const ms = exit - entry;
    if (ms < 0) return "—";
    const mins = Math.floor(ms / 60_000);
    const hours = Math.floor(mins / 60);
    if (hours >= 1) return `${hours}h`;
    return mins < 60 ? `${mins}m` : "1h";
  } catch {
    return "—";
  }
}
