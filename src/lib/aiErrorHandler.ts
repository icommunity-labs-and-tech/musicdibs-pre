/**
 * Maps AI provider error responses to user-friendly, i18n-aware messages.
 * Used across all AI Studio pages for consistent error handling.
 */

type TFunc = (key: string) => string;

const ERROR_KEYS: Record<string, { titleKey: string; descKey: string }> = {
  provider_unavailable: { titleKey: 'aiShared.errProviderUnavailableTitle', descKey: 'aiShared.errProviderUnavailableDesc' },
  rate_limit_exceeded: { titleKey: 'aiShared.errRateLimitTitle', descKey: 'aiShared.errRateLimitDesc' },
  insufficient_credits: { titleKey: 'aiShared.errInsufficientCreditsTitle', descKey: 'aiShared.errInsufficientCreditsDesc' },
  provider_rate_limit: { titleKey: 'aiShared.errProviderRateLimitTitle', descKey: 'aiShared.errProviderRateLimitDesc' },
  content_filtered: { titleKey: 'aiShared.errContentFilteredTitle', descKey: 'aiShared.errContentFilteredDesc' },
};

const TIMEOUT_KEYS = { titleKey: 'aiShared.errTimeoutTitle', descKey: 'aiShared.errTimeoutDesc' };
const DEFAULT_KEYS = { titleKey: 'aiShared.errDefaultTitle', descKey: 'aiShared.errDefaultDesc' };

export interface AiErrorResult {
  title: string;
  description: string;
}

/**
 * Parses an error from an AI edge function call and returns a friendly, translated message.
 * @param error - The caught error object
 * @param t - i18next translation function (from useTranslation)
 * @param data - Optional response data from the edge function
 */
export function parseAiError(error: any, t?: TFunc, data?: any): AiErrorResult {
  const resolve = (keys: { titleKey: string; descKey: string }) =>
    t
      ? { title: t(keys.titleKey), description: t(keys.descKey) }
      : { title: keys.titleKey, description: keys.descKey };

  const errorCode = data?.error || error?.error || error?.message || '';

  // Check known error codes first
  if (typeof errorCode === 'string') {
    const match = ERROR_KEYS[errorCode];
    if (match) return resolve(match);
  }

  // Check for provider-specific patterns in error messages or details
  const errorText = JSON.stringify({ error: errorCode, details: data?.details || error?.details || '' }).toLowerCase();

  if (errorText.includes('payment_required') || errorText.includes('paid_plan_required') || errorText.includes('billing')) {
    return resolve(ERROR_KEYS.provider_unavailable);
  }

  if (errorText.includes('rate_limit') || errorText.includes('too many requests') || errorText.includes('429')) {
    return resolve(ERROR_KEYS.provider_rate_limit);
  }

  if (errorText.includes('content_policy') || errorText.includes('safety') || errorText.includes('nsfw')) {
    return resolve(ERROR_KEYS.content_filtered);
  }

  if (errorText.includes('unauthorized') || errorText.includes('forbidden') || errorText.includes('401') || errorText.includes('403')) {
    return resolve(ERROR_KEYS.provider_unavailable);
  }

  if (errorText.includes('timeout') || errorText.includes('503') || errorText.includes('502') || errorText.includes('504')) {
    return resolve(TIMEOUT_KEYS);
  }

  return resolve(DEFAULT_KEYS);
}
