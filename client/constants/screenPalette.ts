/**
 * Single source for dark UI colors used by Ticket List and Ticket Detail screens.
 * Change colors here → all ticket screens update. Keeps production styling consistent.
 */
export const ScreenPalette = {
  background: "#0F1115",
  card: "#1A1D24",
  primaryRed: "#E53935",
  warningOrange: "#FF8F00",
  successGreen: "#2ECC71",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A4AB",
  divider: "#2A2E36",
  headerGradientStart: "#0F1115",
  headerGradientEnd: "#151922",
  headerButtonBg: "#1A1D24",
  alertGradientStart: "#E53935",
  alertGradientEnd: "#B71C1C",
} as const;

export type ScreenPaletteType = typeof ScreenPalette;
