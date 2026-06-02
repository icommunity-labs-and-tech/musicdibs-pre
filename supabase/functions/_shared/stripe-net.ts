// Helpers to compute REAL amount_net from Stripe data (not assuming 21% VAT).
//
// Rationale: Stripe only charges IVA to EU customers when Stripe Tax is enabled.
// Previously we computed `amount_net = amount_gross / 1.21` for every charge,
// which inflated IVA in admin metrics for non-EU customers (and customers
// without Stripe Tax).
//
// Source of truth:
//   • Invoice path (subscriptions, renewals, plan changes): use `invoice.tax`.
//     net = (amount_paid - tax) / 100
//   • Checkout Session (one-time payments): use `session.total_details.amount_tax`.
//     net = (amount_total - amount_tax) / 100
//   • Raw Charge with no invoice/session info: assume tax = 0 → net = gross.

import Stripe from "npm:stripe@17";

export function netFromInvoice(invoice: Stripe.Invoice): number {
  const paid = invoice.amount_paid ?? 0;
  const tax = (invoice as any).tax ?? 0; // cents, may be null
  return Math.round((paid - tax)) / 100;
}

export function netFromSession(session: Stripe.Checkout.Session): number {
  const total = session.amount_total ?? 0;
  const tax = (session.total_details as any)?.amount_tax ?? 0;
  return Math.round((total - tax)) / 100;
}

/**
 * Compute the real net amount for a Stripe charge.
 * Tries (in order): linked invoice → linked checkout session → fallback (net = gross).
 *
 * The charge can be passed un-expanded; we'll fetch what we need.
 */
export async function netFromCharge(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<number> {
  const gross = (charge.amount ?? 0) / 100;

  // 1) Invoice path (subscriptions)
  const invoiceRef: any = (charge as any).invoice;
  let invoice: Stripe.Invoice | null = null;
  if (invoiceRef) {
    if (typeof invoiceRef === "object" && "amount_paid" in invoiceRef) {
      invoice = invoiceRef as Stripe.Invoice;
    } else {
      const invId = typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;
      if (invId) {
        try { invoice = await stripe.invoices.retrieve(invId); } catch { /* ignore */ }
      }
    }
    if (invoice) return netFromInvoice(invoice);
  }

  // 2) Checkout session path (one-time payments). Look up by payment_intent.
  const piRef: any = (charge as any).payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id;
  if (piId) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: piId,
        limit: 1,
      });
      const sess = sessions.data[0];
      if (sess && sess.amount_total != null) {
        return netFromSession(sess);
      }
    } catch { /* ignore */ }
  }

  // 3) No tax info available → assume no IVA (most accurate fallback for
  //    non-EU customers without Stripe Tax).
  return Math.round(gross * 100) / 100;
}
