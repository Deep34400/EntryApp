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
/** Format: 15 Feb 25, 12:35 PM */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";

  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";

  const day = d.getDate().toString().padStart(2, "0");

  const month = d.toLocaleString("en-GB", { month: "short" });

  const year = d.getFullYear().toString().slice(-2);

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
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
