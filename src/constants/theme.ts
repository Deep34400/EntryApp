import { Platform } from "react-native";

/**
 * Global design system — single source of truth for colors.
 * Change values here to rebrand; theme and all screens derive from this.
 */
export const DesignTokens = {
  brand: {
    primary: "#C7363E",
    primaryDark: "#A82D34",
    success: "#2D9D78",
    error: "#E06A6A",
    warning: "#D4A03A",
    onPrimary: "#FFFFFF",
  },
  semantic: {
    overdueStrip: "#8B2A30",
    overdueBadgeText: "#E8B4B8",
    successBackground: "#E6F4EA",
    successText: "#166534",
    entryIconBgDefault: "#F5D8DA",
    entryIconColorDefault: "#A82D34",
  },
  semanticDark: {
    successBackground: "#1E3A2F",
    successText: "#4ADE80",
    entryIconBgDefault: "#3D2023",
    entryIconColorDefault: "#E8B4B8",
  },
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
  overlay: {
    backdrop: "rgba(0, 0, 0, 0.4)",
    modalScrim: "rgba(0, 0, 0, 0.5)",
  },
  shadow: {
    dark: "rgba(21, 24, 29, 0.4)",
    light: "rgba(0, 0, 0, 0.08)",
  },
  token: {
    headerGreen: "#199881",
    accentRed: "#B31D38",
    cardBorder: "#E8EBEC",
    labelGray: "#3F4C52",
    onHeader: "#FFFFFF",
  },
  login: {
    headerRed: "#B31D38",
    resendGreen: "#388E3C",
    inputBorder: "#D7D7D7",
    inputBorderFocused: "#1C1917",
    placeholder: "#A2ACB1",
    termsText: "#3F4C52",
    termsLink: "#0D9488",
    onHeader: "#FFFFFF",
    otpBoxBorder: "#E5E7EB",
    otpBoxBorderActive: "#1C1917",
    otpText: "#1C1917",
    otpSub: "#4B5563",
    cardBg: "#FFFFFF",
  },
} as const;

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
  card: string;
  surface: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  primary: string;
  primaryDark: string;
  onPrimary: string;
  overdueStrip: string;
  overdueBadgeText: string;
  overlayBackdrop: string;
  overlayScrim: string;
  shadowColor: string;
};

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

export const Layout = {
  horizontalScreenPadding: 16,
  cardPadding: 16,
  contentGap: 12,
  headerMinHeight: 64,
  compactHeaderContentHeight: 56,
  headerCurveRadius: 16,
  backButtonTouchTarget: 44,
  backArrowIconSize: 24,
  backArrowTopOffset: 0,
  minTouchTarget: 44,
  statCardMinHeight: 80,
  headerAvatarSize: 36,
  compactBarHeight: 44,
  loginHeaderMinHeight: 220,
  loginHeaderMaxHeight: 380,
  loginWhiteCardOverlap: 75,
  contentMaxWidth: 328,
  tokenGreenHeaderMinHeight: 220,
  tokenGreenHeaderMaxHeight: 320,
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

export const Typography = {
  screenTitle: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: "700" as const },
  h2: { fontSize: 28, lineHeight: 36, fontWeight: "700" as const },
  h3: { fontSize: 24, lineHeight: 32, fontWeight: "600" as const },
  h4: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  h5: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  h6: { fontSize: 16, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  link: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  token: { fontSize: 96, lineHeight: 104, fontWeight: "700" as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
};

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
