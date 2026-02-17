/**
 * Date/time and text formatting. One place for all screens.
 */

export function toTitleCase(s: string): string {
  if (!s?.trim()) return s ?? "";
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatEntryTime(iso?: string | null): string {
  if (iso == null || iso === "") return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

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
