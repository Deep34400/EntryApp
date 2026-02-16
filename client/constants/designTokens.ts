/**
 * Global design system — single source of truth for the entire app.
 * Change values here to rebrand; theme and all screens derive from this.
 * Enterprise fleet / gate entry: flat, modern, no decoration.
 */

export const DesignTokens = {
  /** Brand and semantic colors. onPrimary = text/icon on primary buttons and headers. */
  brand: {
    primary: "#C7363E",
    primaryDark: "#A82D34",
    success: "#2D9D78",
    error: "#E06A6A",
    warning: "#D4A03A",
    onPrimary: "#FFFFFF",
  },

  /** Overdue / alert accents — muted so not harsh. */
  semantic: {
    overdueStrip: "#8B2A30",
    overdueBadgeText: "#E8B4B8",
    /** Light green background for CLOSED/success cards (enterprise-grade). */
    successBackground: "#E6F4EA",
    /** Dark green text on success cards — readable, not neon. */
    successText: "#166534",
    /** Entry card icon — default state: light brand tint (inactive but available). */
    entryIconBgDefault: "#F5D8DA",
    /** Entry card icon — default state: icon color on light tint (clear, readable). */
    entryIconColorDefault: "#A82D34",
  },
  /** Dark theme success card — light green tint on dark. */
  semanticDark: {
    successBackground: "#1E3A2F",
    successText: "#4ADE80",
    /** Entry card icon default bg (dark mode). */
    entryIconBgDefault: "#3D2023",
    /** Entry card icon default color (dark mode). */
    entryIconColorDefault: "#E8B4B8",
  },

  /** Light theme — warm neutrals. */
  light: {
    text: "#1C1917",
    textSecondary: "#6B7280",
    backgroundRoot: "#F8F9FA",
    backgroundDefault: "#F1F3F5",
    backgroundSecondary: "#E9ECEF",
    backgroundTertiary: "#DEE2E6",
    backgroundSurface: "#FFFFFF",
    border: "#E9ECEF",
  },

  /** Dark theme — soft dark professional. */
  dark: {
    text: "#FFFFFF",
    textSecondary: "#A1A6AD",
    backgroundRoot: "#15181D",
    backgroundDefault: "#1E2228",
    backgroundSecondary: "#252A32",
    backgroundTertiary: "#2D333D",
    backgroundSurface: "#1E2228",
    border: "#2D333D",
  },

  /** Overlay for modals/backdrops — no pure black. */
  overlay: {
    backdrop: "rgba(0, 0, 0, 0.4)",
    modalScrim: "rgba(0, 0, 0, 0.5)",
  },

  /** Shadows for elevation — soft, no pure black. */
  shadow: {
    dark: "rgba(21, 24, 29, 0.4)",
    light: "rgba(0, 0, 0, 0.08)",
  },
} as const;

export type DesignTokensType = typeof DesignTokens;
