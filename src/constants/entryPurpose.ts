/**
 * Entry purpose configuration for Visitor Purpose screen.
 */

export const DP_ONBOARDING = {
  title: "Onboarding",
  items: ["Enquiry", "New Registration", "Training", "Documentation"],
} as const;

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

export const DP_MAINTENANCE = {
  title: "Maintenance",
  items: ["Accident", "PMS", "Running Repair", "Washing"],
} as const;

export const RUNNING_REPAIR_SUB_ITEMS = [
  "Part missing",
  "Mechanical / electrical fault",
  "Car bodyshop",
  "Repair Parking",
] as const;

export const NEW_DP_CATEGORIES = [DP_ONBOARDING] as const;
export const OLD_DP_CATEGORIES = [DP_SETTLEMENT, DP_MAINTENANCE] as const;

export const NON_DP_PURPOSES = [
  "Self Recovery (QC)",
  "Abscond",
  "Testing",
  "Police Station",
  "Test Drive",
  "Hub-Personal use",
] as const;

export const PURPOSE_DISPLAY_LABELS: Record<string, string> = {
  "Self Recovery (QC)": "Self Recovery",
  "Hub-Personal use": "Hub-Personal Use",
};

export const PURPOSE_ICONS: Record<string, string> = {
  "DM collection": "credit-card",
  Settlement: "file-text",
  "Car Drop": "truck",
  "Car Exchange": "repeat",
  "Scheme Change": "sliders",
  Rejoining: "user-plus",
  Accident: "alert-triangle",
  PMS: "settings",
  "Running Repair": "tool",
  Washing: "droplet",
  Enquiry: "help-circle",
  "New Registration": "user-plus",
  Training: "book-open",
  Documentation: "file-text",
  "Self Recovery (QC)": "shield",
  Abscond: "alert-circle",
  Testing: "activity",
  "Police Station": "map-pin",
  "Test Drive": "truck",
  "Hub-Personal use": "home",
};
