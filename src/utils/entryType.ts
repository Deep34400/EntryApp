/**
 * Entry type display labels. API types: new_dp, old_dp, non_dp, dp.
 */

export function getEntryTypeDisplayLabel(
  type: string | undefined | null
): "Driver Partner" | "Staff" {
  if (type == null || type === "") return "Staff";
  const t = String(type).toLowerCase().trim();
  if (t === "new_dp" || t === "old_dp" || t === "dp") return "Driver Partner";
  return "Staff";
}
