/**
 * Phone and form validators. Max digits for Indian mobile: 10.
 */

export const PHONE_MAX_DIGITS = 10;

export function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(0, PHONE_MAX_DIGITS);
}

export function isPhoneValid(phone: string): boolean {
  const digits = phone.trim().replace(/\D/g, "");
  return digits.length === PHONE_MAX_DIGITS;
}

export function phoneForApi(phone: string): string {
  return normalizePhoneInput(phone.trim());
}
