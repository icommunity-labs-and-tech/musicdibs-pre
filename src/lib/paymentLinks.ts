// Enlaces de pago directo de Stripe (Payment Links).
// OJO: el enlace directo no crea cuenta ni lleva la atribucion de campaña
// (gclid/UTM) que si lleva el checkout normal via create-credit-checkout.
// Por eso solo se muestra a usuarios con sesion iniciada: el webhook
// vincula la compra via client_reference_id (ver stripe-webhook).
export const ARTIST_PRO_PAYMENT_LINK = 'https://buy.stripe.com/7sY4gzepk2y6dEobFodIA0a';

type LinkUser = { id: string; email?: string | null } | null;

export function buildArtistProCheckoutUrl(user: LinkUser): string {
  if (!user) return ARTIST_PRO_PAYMENT_LINK;
  const params = new URLSearchParams();
  params.set('client_reference_id', user.id);
  if (user.email) params.set('prefilled_email', user.email);
  return `${ARTIST_PRO_PAYMENT_LINK}?${params.toString()}`;
}
