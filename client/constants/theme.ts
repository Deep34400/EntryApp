import { Platform } from "react-native";
import { DesignTokens } from "@/constants/designTokens";

/** Re-export so design system can be imported from one place: @/constants/theme */
export { DesignTokens } from "@/constants/designTokens";

const { brand, semantic, light: lightN, dark: darkN, overlay, shadow } = DesignTokens;

export type ThemeColors = {
  text: string;
  textSecondary: string;
  buttonText: string;
  tabIconDefault: string;
  tabIconSelected: string;
  link: string;
  linkPressed: string;
  backgroundRoot: string;
  backgroundDefault: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  /** Card/surface background (e.g. list cards, modals). */
  card: string;
  /** Elevated surface (e.g. light-mode cards). */
  surface: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  primary: string;
  primaryDark: string;
  /** Text/icon on primary (buttons, header). */
  onPrimary: string;
  /** Overdue strip/badge. */
  overdueStrip: string;
  overdueBadgeText: string;
  /** Modal/drawer backdrop. */
  overlayBackdrop: string;
  overlayScrim: string;
  shadowColor: string;
};

/**
 * Theme colors — single source. No hardcoded colors in screens/components.
 * Change DesignTokens to update the entire app.
 */
export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: lightN.text,
    textSecondary: lightN.textSecondary,
    buttonText: brand.onPrimary,
    tabIconDefault: lightN.textSecondary,
    tabIconSelected: brand.primary,
    link: brand.primary,
    linkPressed: brand.primaryDark,
    backgroundRoot: lightN.backgroundRoot,
    backgroundDefault: lightN.backgroundDefault,
    backgroundSecondary: lightN.backgroundSecondary,
    backgroundTertiary: lightN.backgroundTertiary,
    card: lightN.backgroundDefault,
    surface: lightN.backgroundSurface,
    border: lightN.border,
    success: brand.success,
    error: brand.error,
    warning: brand.warning,
    primary: brand.primary,
    primaryDark: brand.primaryDark,
    onPrimary: brand.onPrimary,
    overdueStrip: semantic.overdueStrip,
    overdueBadgeText: semantic.overdueBadgeText,
    overlayBackdrop: overlay.backdrop,
    overlayScrim: overlay.modalScrim,
    shadowColor: shadow.light,
  },
  dark: {
    text: darkN.text,
    textSecondary: darkN.textSecondary,
    buttonText: brand.onPrimary,
    tabIconDefault: darkN.textSecondary,
    tabIconSelected: brand.primary,
    link: brand.primary,
    linkPressed: brand.primaryDark,
    backgroundRoot: darkN.backgroundRoot,
    backgroundDefault: darkN.backgroundDefault,
    backgroundSecondary: darkN.backgroundSecondary,
    backgroundTertiary: darkN.backgroundTertiary,
    card: darkN.backgroundSurface,
    surface: darkN.backgroundSurface,
    border: darkN.border,
    success: brand.success,
    error: brand.error,
    warning: brand.warning,
    primary: brand.primary,
    primaryDark: brand.primaryDark,
    onPrimary: brand.onPrimary,
    overdueStrip: semantic.overdueStrip,
    overdueBadgeText: semantic.overdueBadgeText,
    overlayBackdrop: overlay.backdrop,
    overlayScrim: overlay.modalScrim,
    shadowColor: shadow.dark,
  },
};

/**
 * Global spacing scale. Use xs, sm, md, lg everywhere; xl/2xl for larger gaps.
 * Avoid arbitrary margins/paddings.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 56,
} as const;

/**
 * Global layout constants for responsive fleet hub app.
 * Use across all screens for consistent safe-area-aware, flexible layouts.
 */
export const Layout = {
  /** Horizontal screen padding on all screens (px). */
  horizontalScreenPadding: 16,
  /** Card / form content horizontal padding (px). */
  cardPadding: 16,
  /** Gap between content blocks (e.g. form fields, sections). Use 12 for dense, 16/24 for relaxed. */
  contentGap: 12,
  /** Minimum header height (px); flexible above this. */
  headerMinHeight: 64,
  /** Compact header content height (e.g. curved gradient header). */
  compactHeaderContentHeight: 56,
  /** Bottom curve radius for compact gradient headers (px). */
  headerCurveRadius: 16,
  /** Minimum touch target for back/header buttons (px). */
  backButtonTouchTarget: 44,
  /** Minimum touch target for primary actions (px). */
  minTouchTarget: 44,
  /** Minimum height for stat/summary cards (compact, enterprise). */
  statCardMinHeight: 80,
  /** Avatar size in compact headers (px). */
  headerAvatarSize: 36,
  /** Single-row header content height for flat enterprise headers (px). */
  compactBarHeight: 44,
  /** Login: red header min height (responsive; no fixed large height). */
  loginHeaderMinHeight: 220,
  /** Login: red header max height so it doesn't dominate on tablets. */
  loginHeaderMaxHeight: 380,
  /** Login: white card overlap over red header (px). */
  loginWhiteCardOverlap: 75,
  /** Max content width for forms/cards (centered on large screens). */
  contentMaxWidth: 328,
  /** Token display screen: green header min height (responsive). */
  tokenGreenHeaderMinHeight: 220,
  /** Token display screen: green header max height. */
  tokenGreenHeaderMaxHeight: 320,
  /** Token display screen: white card overlap over green header (px). */
  tokenCardOverlap: 80,
} as const;

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

/**
 * Global typography. Use semantic roles in UI: screenTitle, sectionTitle, body, small.
 * Text must not clip; allow wrapping for dynamic content.
 */
export const Typography = {
  /** Screen title (e.g. header). */
  screenTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  /** Section heading. */
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h5: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  h6: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  /** Helper / caption. */
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  token: {
    fontSize: 96,
    lineHeight: 104,
    fontWeight: "700" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
