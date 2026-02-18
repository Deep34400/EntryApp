/**
 * Entry purpose configuration for Visitor Purpose screen.
 * Used by: VisitorPurposeScreen (purpose selection + API submit).
 * Flow: VisitorType (Home) or EntryForm → VisitorPurpose → TokenDisplay.
 */

/** DP Onboarding purposes (New DP: no vehicle number). */
export const DP_ONBOARDING = {
  title: "Onboarding",
  items: ["Enquiry", "New Registration", "Training", "Documentation"],
} as const;

/** DP Settlement purposes (Old DP: has vehicle number). */
export const DP_SETTLEMENT = {
  title: "Settlement",
  items: [
    "DM collection",
    "Settlement",
    "Car Drop",
    "Car Exchange",
    "Scheme Change",
    "Rejoining",
  ],
} as const;

/** DP Maintenance purposes (Old DP). */
export const DP_MAINTENANCE = {
  title: "Maintenance",
  items: ["Accident", "PMS", "Running Repair", "Washing"],
} as const;

/** Sub-options when user selects "Running Repair". */
export const RUNNING_REPAIR_SUB_ITEMS = [
  "Part missing",
  "Mechanical / electrical fault",
  "Car bodyshop",
  "Repair Parking",
] as const;

/** Categories for New DP only. */
export const NEW_DP_CATEGORIES = [DP_ONBOARDING] as const;

/** Categories for Old DP only. */
export const OLD_DP_CATEGORIES = [DP_SETTLEMENT, DP_MAINTENANCE] as const;

/** Staff / non-DP purposes (flat list). */
export const NON_DP_PURPOSES = [
  "Self Recovery (QC)",
  "Abscond",
  "Testing",
  "Police Station",
  "Test Drive",
  "Hub-Personal use",
] as const;

/**
 * Format purpose for display: "Category - SubCategory" (e.g. "Maintenance - Accident", "Settlement - Car Drop").
 * For non-DP (no category) returns just the item.
 */
export function formatPurposeDisplay(category: string | null, subCategory: string): string {
  if (category && subCategory) return `${category} - ${subCategory}`;
  return subCategory;
}

/** Display labels for grid (API value → label shown). */
export const PURPOSE_DISPLAY_LABELS: Record<string, string> = {
  "Self Recovery (QC)": "Self Recovery",
  "Hub-Personal use": "Hub-Personal Use",
};

/** Icons for purpose grid cards (Feather icon names). */
export const PURPOSE_ICONS: Record<string, string> = {
  // Settlement
  "DM collection": "credit-card",
  Settlement: "dollar-sign",
  "Car Drop": "truck",
  "Car Exchange": "refresh-cw",
  "Scheme Change": "rotate-cw",
  Rejoining: "user-check",

  // Maintenance
  Accident: "alert-octagon",
  PMS: "tool",
  "Running Repair": "settings",
  Washing: "droplet",

  // Onboarding
  Enquiry: "help-circle",
  "New Registration": "user-plus",
  Training: "book",
  Documentation: "file-text",

  // Staff / Non-DP
  "Self Recovery (QC)": "shield",
  Abscond: "alert-circle",
  Testing: "activity",
  "Police Station": "map-pin",
  "Test Drive": "truck",
  "Hub-Personal use": "home",
};