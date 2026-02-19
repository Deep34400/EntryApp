/**
 * Base API URL. No auth logic, no React.
 */

export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("Set EXPO_PUBLIC_API_URL in .env to your backend base URL");
  }
  const parsed = new URL(url);
  return parsed.href.replace(/\/$/, "");
}
