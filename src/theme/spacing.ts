/**
 * Global spacing scale. Use everywhere; avoid magic numbers.
 * Change spacing from this file only.
 */

export const spacing = {
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

export type SpacingKey = keyof typeof spacing;
