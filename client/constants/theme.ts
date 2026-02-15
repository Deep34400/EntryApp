import { Platform } from "react-native";
import { DesignTokens } from "@/constants/designTokens";

/** Re-export so design system can be imported from one place: @/constants/theme */
export { DesignTokens } from "@/constants/designTokens";

const { brand, light: lightNeutrals, dark: darkNeutrals } = DesignTokens;

/**
 * Theme colors derived from design tokens.
 * Change DesignTokens.brand in designTokens.ts to rebrand the whole app.
 */
export const Colors = {
  light: {
    text: lightNeutrals.text,
    textSecondary: lightNeutrals.textSecondary,
    buttonText: "#FFFFFF",
    tabIconDefault: lightNeutrals.textSecondary,
    tabIconSelected: brand.primary,
    link: brand.primary,
    linkPressed: brand.primaryDark,
    backgroundRoot: lightNeutrals.backgroundRoot,
    backgroundDefault: lightNeutrals.backgroundDefault,
    backgroundSecondary: lightNeutrals.backgroundSecondary,
    backgroundTertiary: lightNeutrals.backgroundTertiary,
    border: lightNeutrals.border,
    success: brand.success,
    error: brand.error,
    primary: brand.primary,
    primaryDark: brand.primaryDark,
  },
  dark: {
    text: darkNeutrals.text,
    textSecondary: darkNeutrals.textSecondary,
    buttonText: "#FFFFFF",
    tabIconDefault: darkNeutrals.textSecondary,
    tabIconSelected: brand.primary,
    link: brand.primary,
    linkPressed: brand.primaryDark,
    backgroundRoot: darkNeutrals.backgroundRoot,
    backgroundDefault: darkNeutrals.backgroundDefault,
    backgroundSecondary: darkNeutrals.backgroundSecondary,
    backgroundTertiary: darkNeutrals.backgroundTertiary,
    border: darkNeutrals.border,
    success: brand.success,
    error: brand.error,
    primary: brand.primary,
    primaryDark: brand.primaryDark,
  },
};

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
};

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

export const Typography = {
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
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
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
