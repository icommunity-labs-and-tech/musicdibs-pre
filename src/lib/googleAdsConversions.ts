import { supabase } from '@/integrations/supabase/client';
import { hasAdConsent } from '@/components/ConsentBanner';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

const AW_ACCOUNT = 'AW-18310773693';
const PURCHASE_SEND_TO = `${AW_ACCOUNT}/Wr0CCKOW0NAcEL33oJtE`;
const SIGNUP_SEND_TO = `${AW_ACCOUNT}/YBe6CK2M69AcEL33oJtE`;
const LEAD_SEND_TO = `${AW_ACCOUNT}/lJ5FCLTVw-wcEL33oJtE`;
const FALLBACK_VALUE = 19.9; // valor medio de compra, usado si Stripe no confirma a tiempo
const FALLBACK_CURRENCY = 'EUR';

/**
 * Enhanced conversions: envia el email del usuario a Google Ads (la etiqueta lo
 * hashea automaticamente) para mejorar la atribucion y la optimizacion por
 * valor. Solo se envia si el banner de consentimiento lo permite.
 */
async function setEnhancedConversionEmail(email?: string | null) {
  if (!email) return;
  try {
    if (await hasAdConsent()) {
      window.gtag?.('set', 'user_data', { email });
    }
  } catch { /* no bloquear la conversion por esto */ }
}

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

/**
 * Evento GTM (dataLayer) — LEAD: registro de obra completado.
 * Se empuja al dataLayer para que Google Tag Manager lo recoja con un
 * activador de "Evento personalizado" (nombre: work_registered_lead) y
 * dispare la etiqueta de conversión de lead configurada en GTM.
 * Deduplicado por work_id via sessionStorage.
 */
export function trackWorkRegisteredLead(workId?: string, source?: string) {
  const trackedKey = `gtm_lead_tracked_${workId || 'unknown'}`;
  if (sessionStorage.getItem(trackedKey)) return;
  sessionStorage.setItem(trackedKey, '1');

  // 1) Evento dataLayer para GTM (por si hay etiqueta configurada alli)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'work_registered_lead',
    work_id: workId || '',
    lead_source: source || 'register_wizard',
  });

  // 2) Disparo directo a Google Ads (no depende de que exista la etiqueta en GTM,
  //    que era la causa de que la accion de conversion no registrara nada).
  window.gtag?.('event', 'conversion', {
    send_to: LEAD_SEND_TO,
    value: 1.0,
    currency: FALLBACK_CURRENCY,
    transaction_id: workId || '',
  });
}


/**
 * Evento GTM (dataLayer) — CLIC en CTA de registro.
 * Se empuja al hacer clic en cualquier banner/botón que lleva a la página de
 * registro (/login?tab=register), para medir cuántos visitantes llegan a la
 * página de signup antes de completarlo. En GTM: activador de "Evento
 * personalizado" con nombre `signup_cta_click`. Sin deduplicado: cada clic
 * cuenta (interesa el volumen de intención), pero se limita a 1 por segundo
 * para evitar dobles disparos por bubbling.
 */
let lastSignupCtaPush = 0;
export function trackSignupCtaClick(source: string, destination?: string) {
  const now = Date.now();
  if (now - lastSignupCtaPush < 1000) return;
  lastSignupCtaPush = now;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'signup_cta_click',
    cta_source: source,
    cta_destination: destination || '/login?tab=register',
    cta_language: document.documentElement.lang || 'es',
  });
}
