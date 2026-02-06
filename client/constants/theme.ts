import { Platform } from "react-native";

/**
 * Color theme aligned with company logo:
 * Deep crimson/maroon (subdued, rich red) + warm neutrals for a cohesive, premium look.
 */
const primaryColor = "#9B2C2C";
const primaryDark = "#7F1D1D";
const successColor = "#059669";
const errorColor = "#DC2626";

export const Colors = {
  light: {
    text: "#1C1917",
    textSecondary: "#78716C",
    buttonText: "#FFFFFF",
    tabIconDefault: "#78716C",
    tabIconSelected: primaryColor,
    link: primaryColor,
    linkPressed: primaryDark,
    backgroundRoot: "#FAFAF9",
    backgroundDefault: "#F5F5F4",
    backgroundSecondary: "#E7E5E4",
    backgroundTertiary: "#D6D3D1",
    border: "#E7E5E4",
    success: successColor,
    error: errorColor,
    primary: primaryColor,
    primaryDark: primaryDark,
  },
  dark: {
    text: "#FAFAF9",
    textSecondary: "#A8A29E",
    buttonText: "#FFFFFF",
    tabIconDefault: "#A8A29E",
    tabIconSelected: primaryColor,
    link: primaryColor,
    linkPressed: primaryDark,
    backgroundRoot: "#1C1917",
    backgroundDefault: "#292524",
    backgroundSecondary: "#44403C",
    backgroundTertiary: "#57534E",
    border: "#44403C",
    success: successColor,
    error: errorColor,
    primary: primaryColor,
    primaryDark: primaryDark,
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
