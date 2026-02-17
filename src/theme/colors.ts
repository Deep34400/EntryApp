/**
 * Global design control: ALL app colors.
 * Change primary, backgrounds, and semantic colors here only.
 * Dark mode uses explicit values — no transparent/undefined backgrounds.
 */

const brand = {
  primary: "#C7363E",
  primaryDark: "#A82D34",
  success: "#2D9D78",
  error: "#E06A6A",
  warning: "#D4A03A",
  onPrimary: "#FFFFFF",
} as const;

const semantic = {
  overdueStrip: "#8B2A30",
  overdueBadgeText: "#E8B4B8",
  successBackground: "#E6F4EA",
  successText: "#166534",
  entryIconBgDefault: "#F5D8DA",
  entryIconColorDefault: "#A82D34",
} as const;

const semanticDark = {
  successBackground: "#1E3A2F",
  successText: "#4ADE80",
  entryIconBgDefault: "#3D2023",
  entryIconColorDefault: "#E8B4B8",
} as const;

const overlay = {
  backdrop: "rgba(0, 0, 0, 0.4)",
  modalScrim: "rgba(0, 0, 0, 0.5)",
} as const;

const shadow = {
  light: "rgba(0, 0, 0, 0.08)",
  dark: "rgba(21, 24, 29, 0.4)",
} as const;

/** Token display screen — green header, red CTAs. */
export const tokenScreen = {
  headerGreen: "#199881",
  accentRed: "#B31D38",
  cardBorder: "#E8EBEC",
  labelGray: "#3F4C52",
  onHeader: "#FFFFFF",
} as const;

/** Login / OTP screen. */
export const loginScreen = {
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
} as const;

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

const lightNeutrals = {
  text: "#1C1917",
  textSecondary: "#6B7280",
  backgroundRoot: "#F8F9FA",
  backgroundDefault: "#F1F3F5",
  backgroundSecondary: "#E9ECEF",
  backgroundTertiary: "#DEE2E6",
  backgroundSurface: "#FFFFFF",
  border: "#E9ECEF",
};

const darkNeutrals = {
  text: "#FFFFFF",
  textSecondary: "#A1A6AD",
  backgroundRoot: "#15181D",
  backgroundDefault: "#1E2228",
  backgroundSecondary: "#252A32",
  backgroundTertiary: "#2D333D",
  backgroundSurface: "#1E2228",
  border: "#2D333D",
};

/** Light theme — use for light mode and when forcing light. */
export const light: ThemeColors = {
  ...lightNeutrals,
  buttonText: brand.onPrimary,
  tabIconDefault: lightNeutrals.textSecondary,
  tabIconSelected: brand.primary,
  link: brand.primary,
  linkPressed: brand.primaryDark,
  card: lightNeutrals.backgroundDefault,
  surface: lightNeutrals.backgroundSurface,
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
};

/** Dark theme — explicit backgrounds so UI never goes black. */
export const dark: ThemeColors = {
  ...darkNeutrals,
  buttonText: brand.onPrimary,
  tabIconDefault: darkNeutrals.textSecondary,
  tabIconSelected: brand.primary,
  link: brand.primary,
  linkPressed: brand.primaryDark,
  card: darkNeutrals.backgroundSurface,
  surface: darkNeutrals.backgroundSurface,
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
};

export const colors = { light, dark } as const;
export { brand, semantic, semanticDark, overlay, shadow };
