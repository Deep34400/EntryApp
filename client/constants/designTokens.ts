/**
 * Carrum Mobility Solutions — global design system.
 *
 * Soft dark professional theme: no pure black, warm enterprise-grade colors.
 * Premium, clean, operational dashboard feel. Modern SaaS, calm and eye-friendly.
 *
 * Change DesignTokens here to rebrand; theme and ScreenPalette derive from this.
 */

export const DesignTokens = {
  /** Carrum brand — primary red, soft alert red, success/warning. No harsh red, no pure black. */
  brand: {
    primary: "#C7363E",
    primaryDark: "#A82D34",
    success: "#2D9D78",
    error: "#E06A6A",
    warning: "#D4A03A",
  },

  /** Light theme — warm neutrals for consistency with brand. */
  light: {
    text: "#1C1917",
    textSecondary: "#6B7280",
    backgroundRoot: "#F8F9FA",
    backgroundDefault: "#F1F3F5",
    backgroundSecondary: "#E9ECEF",
    backgroundTertiary: "#DEE2E6",
    border: "#E9ECEF",
  },

  /** Dark theme — soft dark professional (Carrum). Background #15181D, card #1E2228. */
  dark: {
    text: "#FFFFFF",
    textSecondary: "#A1A6AD",
    backgroundRoot: "#15181D",
    backgroundDefault: "#1E2228",
    backgroundSecondary: "#252A32",
    backgroundTertiary: "#2D333D",
    border: "#2D333D",
  },

  /** Dark UI for Ticket List and Ticket Detail — same Carrum soft dark palette. */
  darkUI: {
    background: "#15181D",
    card: "#1E2228",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A6AD",
    divider: "#2D333D",
    headerGradientStart: "#15181D",
    headerGradientEnd: "#1E2228",
    headerButtonBg: "#1E2228",
    alertGradientEnd: "#A82D34",
  },

  /** Soft shadow (no pure black) — use for elevation on dark theme. */
  shadow: {
    dark: "rgba(21, 24, 29, 0.4)",
    light: "rgba(0, 0, 0, 0.08)",
  },
} as const;

export type DesignTokensType = typeof DesignTokens;
