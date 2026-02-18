/**
 * Entry type display labels used across Token display and Tickets.
 * Single source: use GET API `type` (or entry_type) and pass to this function.
 * API types: new_dp, old_dp, non_dp, dp. API may also return "Driver Partner" / "Staff".
 * UI labels: "Driver Partner" for DP, "Staff" for non-DP.
 */

/** Display label for entry type. Use for token screen and ticket list/detail. Uses GET API type directly. */
export function getEntryTypeDisplayLabel(type: string | undefined | null): "Driver Partner" | "Staff" {
  if (type == null || type === "") return "Staff";
  const t = String(type).toLowerCase().trim();
  if (t === "new_dp" || t === "old_dp" || t === "dp") return "Driver Partner";
  if (t === "driver partner" || t === "driverpartner") return "Driver Partner";
  if (t === "staff") return "Staff";
  return "Staff";
}
