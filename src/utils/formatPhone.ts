/**
 * Format phone for display (e.g. +91-9876543210).
 */

export function formatPhone(phone?: string | null): string {
  if (!phone) return "—";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return `+91-${digits}`;
  return phone;
}
