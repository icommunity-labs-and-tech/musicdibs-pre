import type { TFunction } from 'i18next';

// Annual tier → credits per year (mirrors BillingPage)
export const ANNUAL_TIER_CREDITS: Record<string, number> = {
  annual_100: 100,
  annual_200: 200,
  annual_300: 300,
  annual_400: 500,
  annual_500: 1000,
};

/**
 * Formats a user's subscription plan into a descriptive label.
 * - Free      → "Free"
 * - Monthly   → "Mensual"
 * - Annual    → "Anual · 200 créditos/año" (when tier is known)
 */
export function formatPlanLabel(
  plan: string | null | undefined,
  tier: string | null | undefined,
  t: TFunction,
): string {
  const p = plan || 'Free';
  if (p === 'Free') return t('dashboard.billing.planFree', { defaultValue: 'Free' });
  if (p === 'Monthly') return t('dashboard.billing.planMonthly', { defaultValue: 'Mensual' });
  if (p === 'Annual') {
    const base = t('dashboard.billing.planAnnual', { defaultValue: 'Anual' });
    const credits = tier ? ANNUAL_TIER_CREDITS[tier] : undefined;
    if (credits) {
      const creditsLabel = t('dashboard.billing.creditsLabel', { defaultValue: 'créditos' });
      return `${base} · ${credits} ${creditsLabel}/año`;
    }
    return base;
  }
  return p;
}
