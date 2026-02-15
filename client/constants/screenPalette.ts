import { DesignTokens } from "@/constants/designTokens";

const { brand, darkUI } = DesignTokens;

/**
 * Dark UI palette for Ticket List and Ticket Detail screens.
 * Derived from design tokens — change DesignTokens in designTokens.ts
 * to update primary red and black/dark colors app-wide.
 */
export const ScreenPalette = {
  background: darkUI.background,
  card: darkUI.card,
  primaryRed: brand.primary,
  warningOrange: brand.warning,
  successGreen: brand.success,
  textPrimary: darkUI.textPrimary,
  textSecondary: darkUI.textSecondary,
  divider: darkUI.divider,
  headerGradientStart: darkUI.headerGradientStart,
  headerGradientEnd: darkUI.headerGradientEnd,
  headerButtonBg: darkUI.headerButtonBg,
  alertGradientStart: brand.primary,
  alertGradientEnd: darkUI.alertGradientEnd,
} as const;

export type ScreenPaletteType = typeof ScreenPalette;
