// Tiers PLUS+ (annual_100 y superiores) que dan acceso al servicio de distribución.
// El plan "Anual Básico" (annual_20) NO incluye distribución.
export const PLUS_TIERS = new Set<string>([
  "annual_100",
  "annual_200",
  "annual_300",
  "annual_500",
  "annual_1000",
  "annual_legacy",
]);

export function hasDistributionAccess(
  subscriptionTier?: string | null,
): boolean {
  return typeof subscriptionTier === "string" && PLUS_TIERS.has(subscriptionTier);
}
