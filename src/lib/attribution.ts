/**
 * Attribution helper — captures UTM params, coupon, ref from URL on first visit.
 * Persists in localStorage with a 30-day TTL.
 * Used at registration and checkout to attribute users/orders to campaigns.
 */

import { captureGoogleClickIds, getGoogleClickIds } from '@/lib/googleClickIds';

const STORAGE_KEY = 'md_attribution';
const VISIT_KEY = 'md_visit_logged';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  coupon?: string;
  ref?: string;
  referrer?: string;
  landing_path?: string;
  captured_at: number;
}

/** Read current attribution from localStorage (returns null if expired or missing) */
export function getAttribution(): AttributionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: AttributionData = JSON.parse(raw);
    if (Date.now() - data.captured_at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Log one visit per session when the URL carries campaign params or an
 *  external referrer, so blog/partner/campaign traffic is measurable even if
 *  the visitor never signs up. Fire-and-forget: never blocks or throws. */
function recordVisit(): void {
  try {
    if (sessionStorage.getItem(VISIT_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;
    const utm_content = params.get('utm_content') || undefined;
    const utm_term = params.get('utm_term') || undefined;
    const gclid = params.get('gclid') || undefined;
    // Ignore internal referrers and Lovable editor/preview traffic — those are
    // us browsing the app, not real visitors.
    const ref = document.referrer || '';
    const isSelf = ref.includes(window.location.hostname);
    const isLovable = /(^|\.)lovable\.(dev|app|project)(\/|$|:)/.test(ref)
      || /lovable\.app/.test(ref);
    const referrer = ref && !isSelf && !isLovable ? ref : undefined;

    if (!utm_source && !utm_campaign && !gclid && !referrer) return;

    sessionStorage.setItem(VISIT_KEY, '1');

    void import('@/integrations/supabase/client').then(({ supabase }) =>
      supabase.from('utm_visits').insert({
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
        utm_content: utm_content ?? null,
        utm_term: utm_term ?? null,
        gclid: gclid ?? null,
        referrer: referrer ?? null,
        landing_path: window.location.pathname,
        language: (navigator.language || '').slice(0, 5) || null,
        session_id: null,
      }),
    ).catch(() => { /* ignore */ });
  } catch {
    /* ignore */
  }
}

/** Capture UTMs from current URL. Only writes if no existing attribution (first-touch).
 *  The ?ref= param is ALWAYS persisted separately under `referral_code` (overwrites),
 *  so referral links work even when the user already had prior attribution. */
export function captureAttribution(): void {
  // Always capture referral code (separate from first-touch attribution)
  try {
    const refParam = new URLSearchParams(window.location.search).get('ref');
    if (refParam) localStorage.setItem('referral_code', refParam);
  } catch { /* ignore */ }

  // Click IDs de Google Ads: last-click, 90 dias, independiente del first-touch.
  captureGoogleClickIds();

  // Record the visit (once per session) so campaign traffic is visible even
  // when the visitor never signs up or buys.
  recordVisit();

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source') || undefined;
  const utm_medium = params.get('utm_medium') || undefined;
  const utm_campaign = params.get('utm_campaign') || undefined;
  const utm_content = params.get('utm_content') || undefined;
  const utm_term = params.get('utm_term') || undefined;
  const gclid = params.get('gclid') || undefined;
  const coupon = params.get('coupon') || params.get('promo') || undefined;
  const ref = params.get('ref') || undefined;

  const referrer = document.referrer && !document.referrer.includes(window.location.hostname)
    ? document.referrer
    : undefined;

  const hasCampaign = Boolean(
    utm_source || utm_medium || utm_campaign || utm_content || utm_term ||
    gclid || coupon || ref,
  );

  const existing = getAttribution();
  if (existing) {
    // Solo se pisa una ficha "directa" (sin datos de campana) cuando la visita
    // nueva si trae campana, cupon o codigo de referido. Asi el trafico directo
    // deja rastro pero no bloquea la atribucion posterior de anuncios y cupones.
    const existingHasCampaign = Boolean(
      existing.utm_source || existing.utm_medium || existing.utm_campaign ||
      existing.utm_content || existing.utm_term || existing.gclid ||
      existing.coupon || existing.ref,
    );
    if (existingHasCampaign || !hasCampaign) return;
  }

  const data: AttributionData = {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    gclid,
    coupon,
    ref,
    referrer,
    landing_path: window.location.pathname,
    captured_at: Date.now(),
  };



  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or blocked — fail silently
  }
}

/** Guarda el origen del usuario recien registrado cuando el alta no pudo
 *  llevarlo en los metadatos (por ejemplo, entrando con Google). Se ejecuta
 *  una sola vez por usuario: si ya existe ficha de origen, no hace nada.
 *  Fire-and-forget: nunca bloquea ni lanza errores. */
export async function ensureAttribution(userId: string): Promise<void> {
  try {
    const flagKey = `md_attr_synced_${userId}`;
    if (localStorage.getItem(flagKey)) return;
    localStorage.setItem(flagKey, '1');

    const attr = getAttribution();
    const host = attr?.referrer?.match(/^[a-z]+:\/\/([^/:]+)/i)?.[1]?.toLowerCase() ?? '';
    const isSearch = /(google|bing|yahoo|duckduckgo|ecosia|yandex)\./.test(host);

    const { supabase } = await import('@/integrations/supabase/client');
    // El alta por Google no lleva metadatos, asi que la ficha de origen se crea
    // como "directo". Esta funcion la completa (campana, buscador, pagina de
    // entrada) sin pisar datos mejores ya guardados.
    await supabase.rpc('enrich_user_attribution', {
      p_source: attr?.utm_source || (attr?.gclid ? 'google' : '') || host || 'directo',
      p_medium: attr?.utm_medium || (attr?.gclid ? 'cpc' : '') ||
        (isSearch ? 'organic' : host ? 'referral' : 'none'),
      p_campaign: attr?.utm_campaign ?? (attr?.gclid ? 'Google Ads (gclid)' : null),
      p_content: attr?.utm_content ?? null,
      p_term: attr?.utm_term ?? null,
      p_referrer: attr?.referrer ?? null,
      p_landing_path: attr?.landing_path ?? null,
    });
  } catch {
    /* nunca bloquea el flujo */
  }
}

/** Clear stored attribution (e.g. after successful registration + save) */
export function clearAttribution(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Read referral code (?ref=...) persisted in localStorage. */
export function getReferralCode(): string | null {
  try { return localStorage.getItem('referral_code'); } catch { return null; }
}

/** Clear the referral code (call after successful checkout). */
export function clearReferralCode(): void {
  try { localStorage.removeItem('referral_code'); } catch { /* ignore */ }
}

/** Build metadata object for Stripe checkout from attribution */
export function getAttributionForCheckout(): Record<string, string> {
  const attr = getAttribution();
  const result: Record<string, string> = {};
  // Click IDs de Google (URL actual > guardado 90 dias > first-touch antiguo).
  const clickIds = getGoogleClickIds();
  if (clickIds.gclid) result.gclid = clickIds.gclid;
  else if (attr?.gclid && !clickIds.gbraid && !clickIds.wbraid) result.gclid = attr.gclid;
  if (clickIds.gbraid) result.gbraid = clickIds.gbraid;
  if (clickIds.wbraid) result.wbraid = clickIds.wbraid;
  if (!attr) return result;
  if (attr.utm_source) result.utm_source = attr.utm_source;
  if (attr.utm_medium) result.utm_medium = attr.utm_medium;
  if (attr.utm_campaign) result.utm_campaign = attr.utm_campaign;
  if (attr.utm_content) result.utm_content = attr.utm_content;
  if (attr.utm_term) result.utm_term = attr.utm_term;
  if (attr.coupon) result.coupon_code = attr.coupon;
  if (attr.ref) result.referrer_code = attr.ref;
  if (attr.referrer) result.referrer = attr.referrer;
  if (attr.landing_path) result.landing_path = attr.landing_path;
  if (attr.utm_campaign) result.attributed_campaign_name = attr.utm_campaign;
  return result;
}
