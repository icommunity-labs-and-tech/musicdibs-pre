import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (!expectedSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "true";
    const batchSize = Math.min(parseInt(url.searchParams.get("batch") || "10"), 30);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ) as any;

    const { data: subs, error: subsErr } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan, current_period_end")
      .eq("status", "active")
      .is("stripe_subscription_id", null)
      .order("current_period_end", { ascending: true })
      .limit(batchSize);

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, dry_run: dryRun, message: "All done", remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = subs.map((s: any) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, stripe_customer_id")
      .in("user_id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.stripe_customer_id]));

    const results: any[] = [];
    let fixed = 0, skipped_marked = 0, errors = 0;

    async function markUnfixable(subId: string, reason: string) {
      if (!dryRun) {
        await supabase
          .from("subscriptions")
          .update({
            plan_type: `unfixable:${reason}`,
            stripe_subscription_id: "NONE_UNFIXABLE",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subId);
      }
      skipped_marked++;
    }

    for (const sub of subs) {
      const customerId = profileMap.get(sub.user_id);

      if (!customerId) {
        results.push({ sub_id: sub.id, action: "marked_no_customer" });
        await markUnfixable(sub.id, "no_customer");
        continue;
      }

      try {
        let customer: any;
        try {
          customer = await stripe.customers.retrieve(customerId);
        } catch (e: any) {
          if (e.statusCode === 404 || e.message?.includes("No such customer")) {
            results.push({ sub_id: sub.id, action: "marked_invalid_customer", customer: customerId });
            await markUnfixable(sub.id, "invalid_customer");
            continue;
          }
          throw e;
        }

        if (customer.deleted) {
          results.push({ sub_id: sub.id, action: "marked_deleted_customer", customer: customerId });
          await markUnfixable(sub.id, "deleted_customer");
          continue;
        }

        const existingPM = customer.invoice_settings?.default_payment_method || customer.default_source;
        if (existingPM) {
          results.push({ sub_id: sub.id, action: "already_has_pm", customer: customerId });
          fixed++;
          continue;
        }

        // Try 1: Attached payment methods
        const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 5 });
        if (pms.data.length > 0) {
          if (!dryRun) {
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: pms.data[0].id },
            });
          }
          results.push({ sub_id: sub.id, action: "set_existing_pm", pm: pms.data[0].id });
          fixed++;
          continue;
        }

        // Try 2: From charges
        const charges = await stripe.charges.list({ customer: customerId, limit: 10 });
        const successCharge = charges.data.find((c: any) => c.status === "succeeded");

        if (successCharge?.payment_method) {
          const pmId = typeof successCharge.payment_method === "string" ? successCharge.payment_method : successCharge.payment_method.id;
          try {
            if (!dryRun) {
              try {
                await stripe.paymentMethods.attach(pmId, { customer: customerId });
              } catch (attachErr: any) {
                if (attachErr?.message?.includes("already been attached")) {
                  // OK
                } else if (attachErr?.message?.includes("previously used") || attachErr?.message?.includes("may not be used again")) {
                  // Try source fallback
                  if (successCharge.source?.id && successCharge.source.id.startsWith("card_")) {
                    try {
                      await stripe.customers.update(customerId, { default_source: successCharge.source.id });
                      results.push({ sub_id: sub.id, action: "set_from_source", source: successCharge.source.id });
                      fixed++;
                      continue;
                    } catch (_e) { /* source also failed */ }
                  }
                  results.push({ sub_id: sub.id, action: "marked_pm_unusable", customer: customerId });
                  await markUnfixable(sub.id, "pm_unusable");
                  continue;
                } else {
                  throw attachErr;
                }
              }
              await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: pmId },
              });
            }
            results.push({ sub_id: sub.id, action: "fixed_from_charge", pm: pmId });
            fixed++;
            continue;
          } catch (err: any) {
            results.push({ sub_id: sub.id, action: "marked_pm_error", detail: String(err?.message ?? err).slice(0, 200) });
            await markUnfixable(sub.id, "pm_error");
            continue;
          }
        }

        // Try 3: From payment intents
        const pis = await stripe.paymentIntents.list({ customer: customerId, limit: 10 });
        const successPI = pis.data.find((pi: any) => pi.status === "succeeded" && pi.payment_method);
        if (successPI?.payment_method) {
          const pmId = typeof successPI.payment_method === "string" ? successPI.payment_method : (successPI.payment_method as any).id;
          try {
            if (!dryRun) {
              try {
                await stripe.paymentMethods.attach(pmId, { customer: customerId });
              } catch (e: any) {
                if (e.message?.includes("previously used") || e.message?.includes("may not be used again")) {
                  results.push({ sub_id: sub.id, action: "marked_pm_unusable", customer: customerId });
                  await markUnfixable(sub.id, "pm_unusable");
                  continue;
                }
                if (!e.message?.includes("already been attached")) throw e;
              }
              await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pmId } });
            }
            results.push({ sub_id: sub.id, action: "fixed_from_pi", pm: pmId });
            fixed++;
            continue;
          } catch (err: any) {
            results.push({ sub_id: sub.id, action: "marked_pm_error", detail: String(err?.message ?? err).slice(0, 200) });
            await markUnfixable(sub.id, "pm_error");
            continue;
          }
        }

        // No charges/PMs found at all
        results.push({ sub_id: sub.id, action: "marked_no_charges", customer: customerId });
        await markUnfixable(sub.id, "no_charges");

      } catch (err: any) {
        results.push({ sub_id: sub.id, action: "error", detail: String(err?.message ?? err).slice(0, 300) });
        await markUnfixable(sub.id, "error");
        errors++;
      }
    }

    const { count: remaining } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("stripe_subscription_id", null);

    return new Response(JSON.stringify({
      ok: true, dry_run: dryRun, batch_size: subs.length,
      fixed, skipped_marked, errors, remaining: remaining ?? 0, results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[fix-pm] Fatal:", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
