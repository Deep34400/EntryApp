/** Max digits for Indian mobile number (10). Use for login and create-entry phone. */
export const PHONE_MAX_DIGITS = 10;

/**
 * Normalize phone input: digits only, max 10 characters.
 * Use in onChangeText so user cannot exceed 10 digits.
 */
export function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(0, PHONE_MAX_DIGITS);
}

/** Check if phone is valid: exactly 10 digits. */
export function isPhoneValid(phone: string): boolean {
  const digits = phone.trim().replace(/\D/g, "");
  return digits.length === PHONE_MAX_DIGITS;
}

/** Get digits-only phone for API (max 10). */
export function phoneForApi(phone: string): string {
  return normalizePhoneInput(phone.trim());
}
