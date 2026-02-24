/**
 * Entry purpose — types and display helper only. Data comes from API (getPurposeConfig).
 * Used by: OnboardingPurposeScreen, SettlementPurposeScreen, MaintenancePurposeScreen (purpose selection + API submit).
 */

/**
 * Format purpose for display: "Category - SubCategory" or just the item.
 */
export function formatPurposeDisplay(category: string | null, subCategory: string): string {
  if (category && subCategory) return `${category} - ${subCategory}`;
  return subCategory;
}
