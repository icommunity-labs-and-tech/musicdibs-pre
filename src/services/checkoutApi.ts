import { supabase } from '@/integrations/supabase/client';

/**
 * Centralised typed wrappers for Stripe/Checkout edge functions.
 *
 * Every helper normalises the two error shapes returned by Supabase edge
 * functions: `functions.invoke` error + `data.error` payload. Consumers
 * only need a single try/catch and can trust the returned payload.
 */

export interface CheckoutRedirectResponse {
  url?: string;
  already_subscribed?: boolean;
  switched?: boolean;
  reactivated?: boolean;
  message?: string;
  plan?: 'Annual' | 'Monthly';
  error?: string;
}

export interface CreditCheckoutBody {
  planId?: string;
  attribution?: Record<string, unknown>;
  referral_code?: string;
  action?: 'cancel_renewal';
  cancellation_reason?: string;
}

async function invoke<T>(fn: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, body ? { body } : undefined);
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

export function startCreditCheckout(body: CreditCheckoutBody) {
  return invoke<CheckoutRedirectResponse>('create-credit-checkout', body);
}

export function cancelRenewal(reason: string) {
  return invoke<{ message?: string }>('create-credit-checkout', {
    action: 'cancel_renewal',
    cancellation_reason: reason,
  });
}

export interface PortalResponse {
  url?: string;
  error?: 'no_billing_account' | 'portal_not_configured' | string;
}

export async function openBillingPortal(returnUrl: string): Promise<PortalResponse> {
  // Unlike other helpers we return the raw payload so callers can branch on
  // specific error codes (`no_billing_account`, `portal_not_configured`).
  const { data, error } = await supabase.functions.invoke('stripe-portal', {
    body: { return_url: returnUrl },
  });
  if (error) throw error;
  return (data ?? {}) as PortalResponse;
}

export interface YoutubeCheckoutBody {
  serviceType: string;
  formData: Record<string, unknown>;
}

export function startYoutubeCheckout(body: YoutubeCheckoutBody) {
  return invoke<{ url?: string }>('create-youtube-service-checkout', body);
}
