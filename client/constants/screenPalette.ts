import type { ThemeColors } from "@/constants/theme";

/**
 * Ticket list/detail palette derived from global theme.
 * Use getScreenPalette(theme) so one theme value updates the entire app.
 */
export function getScreenPalette(theme: ThemeColors) {
  return {
    background: theme.backgroundRoot,
    card: theme.card,
    primaryRed: theme.primary,
    warningOrange: theme.warning,
    successGreen: theme.success,
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    divider: theme.border,
    headerGradientStart: theme.backgroundRoot,
    headerGradientEnd: theme.backgroundDefault,
    headerButtonBg: theme.backgroundDefault,
    alertGradientStart: theme.primary,
    alertGradientEnd: theme.primaryDark,
    overdueStrip: theme.overdueStrip,
    overdueBadgeText: theme.overdueBadgeText,
  } as const;
}

export type ScreenPaletteType = ReturnType<typeof getScreenPalette>;
