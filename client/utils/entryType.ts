/**
 * Entry type display labels used across Token display and Tickets.
 * API types: new_dp, old_dp, non_dp, dp.
 * UI labels: "Driver Partner" for DP, "Staff" for non-DP.
 */

/** Display label for entry type. Use for token screen and ticket list/detail. */
export function getEntryTypeDisplayLabel(type: string | undefined | null): "Driver Partner" | "Staff" {
  if (type == null || type === "") return "Staff";
  const t = String(type).toLowerCase().trim();
  if (t === "new_dp" || t === "old_dp" || t === "dp") return "Driver Partner";
  return "Staff";
}
