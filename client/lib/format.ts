/**
 * Format as title case: first letter of each word capitalized.
 * e.g. "bengaluru" → "Bengaluru", "Uber Black Mumbai" → "Uber Black Mumbai"
 */
export function toTitleCase(s: string): string {
  if (!s?.trim()) return s ?? "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
