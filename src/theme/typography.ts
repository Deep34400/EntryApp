/**
 * Global typography. Change font family and sizes here only.
 */

import { Platform } from "react-native";

export const typography = {
  screenTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
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
} as const;

/** Font family — change here to rebrand. */
export const fontFamily = {
  sans: Platform.select({
    ios: "system-ui",
    default: "normal",
    web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  }),
  /** Poppins used in many screens (Figma). */
  poppins: "Poppins",
  /** Serif for profile/name (e.g. Georgia). */
  serif: Platform.select({ ios: "Georgia", default: "serif" }),
} as const;
