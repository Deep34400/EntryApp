/**
 * Re-export token/login screen colors for compatibility. Prefer @/theme (tokenScreen, loginScreen).
 */
import { tokenScreen, loginScreen } from "@/theme/colors";

export const DesignTokens = {
  brand: {
    primary: "#C7363E",
    primaryDark: "#A82D34",
    success: "#2D9D78",
    error: "#E06A6A",
    warning: "#D4A03A",
    onPrimary: "#FFFFFF",
  },
  semantic: {},
  light: {},
  dark: {},
  overlay: {},
  shadow: {},
  token: tokenScreen,
  login: loginScreen,
} as const;
