import type { TFunction } from 'i18next';

// Annual tier → credits per year (mirrors BillingPage)
export const ANNUAL_TIER_CREDITS: Record<string, number> = {
  annual_20: 20,
  annual_100: 100,
  annual_200: 200,
  annual_300: 300,
  annual_500: 500,
  annual_1000: 1000,
};

/**
 * Formats a user's subscription plan into a descriptive label.
 * - Free      → "Free"
 * - Monthly   → "Mensual"
 * - Annual    → "Anual · 200 créditos/año" (when tier is known)
 */
// Annual tier → commercial plan name shown across dashboard and admin
export const ANNUAL_TIER_NAMES: Record<string, string> = {
  annual_20: 'Creator',
  annual_100: 'Artist Pro',
  annual_200: 'Artist Pro',
  annual_300: 'Artist Pro',
  annual_500: 'Artist Pro',
  annual_1000: 'Artist Pro',
};

export function formatPlanLabel(
  plan: string | null | undefined,
  tier: string | null | undefined,
  t: TFunction,
): string {
  const p = plan || 'Free';
  if (p === 'Free') return t('dashboard.billing.planFree', { defaultValue: 'Free' });
  if (p === 'Monthly') return t('dashboard.billing.planMonthly', { defaultValue: 'Starter' });
  if (p === 'Annual') {
    const base = (tier ? ANNUAL_TIER_NAMES[tier] : undefined)
      ?? t('dashboard.billing.planAnnual', { defaultValue: 'Anual' });
    const credits = tier ? ANNUAL_TIER_CREDITS[tier] : undefined;
    if (credits) {
      const creditsLabel = t('dashboard.billing.creditsLabel', { defaultValue: 'créditos' });
      return `${base} · ${credits} ${creditsLabel}/año`;
    }
    return base;
  }
  return p;
}

/**
 * Commercial plan name for badges and admin tables (language-neutral).
 * Free → "Free", Monthly → "Starter", Annual+tier → "Creator" / "Artist Pro" / "Anual 200".
 */
export function planDisplayName(
  plan: string | null | undefined,
  tier?: string | null,
): string {
  if (tier && tier.trim() !== '') {
    const named = ANNUAL_TIER_NAMES[tier];
    if (named) return named;
    const credits = ANNUAL_TIER_CREDITS[tier];
    if (credits) return `Anual ${credits}`;
    return tier.charAt(0).toUpperCase() + tier.slice(1).replace(/_/g, ' ');
  }
  const p = plan || 'Free';
  if (p === 'Monthly') return 'Starter';
  if (p === 'Annual') return 'Anual';
  return p;
}
