import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const AW_ACCOUNT = 'AW-18310773693';
const PURCHASE_SEND_TO = `${AW_ACCOUNT}/Wr0CCKOW0NAcEL33oJtE`;
const SIGNUP_SEND_TO = `${AW_ACCOUNT}/YBe6CK2M69AcEL33oJtE`;
const FALLBACK_VALUE = 19.9; // valor medio de compra, usado si Stripe no confirma a tiempo
const FALLBACK_CURRENCY = 'EUR';

/**
 * Google Ads conversion tracking — COMPRA.
 * Dispara una unica vez por session_id de Stripe tras un pago exitoso (deduplicado
 * via sessionStorage). Usa el importe real de la orden consultando por
 * stripe_checkout_session_id (ya guardado por el webhook). Como el webhook puede
 * tardar unos segundos en procesar el evento, reintenta brevemente antes de
 * desistir y usar el valor medio de fallback (19,90 EUR) para no perder la
 * conversion aunque no lleguemos a tiempo a leer el importe real.
 */
export function trackPurchaseConversion(sessionId: string) {
  if (!sessionId) return;
  const trackedKey = `ga_purchase_tracked_${sessionId}`;
  if (sessionStorage.getItem(trackedKey)) return; // ya trackeado

  let attempts = 0;
  const maxAttempts = 6; // ~12s de reintentos (webhook suele tardar 1-3s)

  const tryFetchAndFire = async () => {
    attempts++;
    const { data: order } = await supabase
      .from('orders')
      .select('amount_gross, currency')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('order_status', 'paid')
      .maybeSingle();

    if (order) {
      window.gtag?.('event', 'conversion', {
        send_to: PURCHASE_SEND_TO,
        value: Number(order.amount_gross) || FALLBACK_VALUE,
        currency: order.currency || FALLBACK_CURRENCY,
        transaction_id: sessionId,
      });
      sessionStorage.setItem(trackedKey, '1');
      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(tryFetchAndFire, 2000);
    } else {
      // Fallback: el webhook no proceso a tiempo. Disparamos igualmente con el
      // valor medio para no perder la conversion.
      window.gtag?.('event', 'conversion', {
        send_to: PURCHASE_SEND_TO,
        value: FALLBACK_VALUE,
        currency: FALLBACK_CURRENCY,
        transaction_id: sessionId,
      });
      sessionStorage.setItem(trackedKey, '1');
    }
  };

  tryFetchAndFire();
}

/**
 * Google Ads conversion tracking — REGISTRO.
 * Dispara una unica vez por sesion de navegador tras completar el formulario de
 * registro (email/password) con exito. No requiere transaction_id (no es una
 * compra); se deduplica con una key fija en sessionStorage.
 */
export function trackSignupConversion() {
  const trackedKey = 'ga_signup_tracked';
  if (sessionStorage.getItem(trackedKey)) return;

  window.gtag?.('event', 'conversion', {
    send_to: SIGNUP_SEND_TO,
    value: FALLBACK_VALUE,
    currency: FALLBACK_CURRENCY,
  });
  sessionStorage.setItem(trackedKey, '1');
}
