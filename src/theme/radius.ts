/**
 * Global border radius. Change button/card radius here only.
 */

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
