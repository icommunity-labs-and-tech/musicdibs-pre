import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// LIVE key has priority — WooCommerce-migrated orders have live charge IDs
const STRIPE_KEY =
  Deno.env.get("STRIPE_LIVE_SECRET_KEY") ??
  Deno.env.get("STRIPE_SECRET_KEY") ??
  "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function stripeGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`);
  return data;
}

Deno.serve(async (req: Request) => {
  let dryRun = true;
  let batchSize = 100;
  let offset = 0;
  let minDate: string | null = null; // ISO date string, e.g. '2024-01-01'
  let maxDate: string | null = null;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.dry_run === false) dryRun = false;
      if (typeof body.batch_size === "number") batchSize = body.batch_size;
      if (typeof body.offset === "number") offset = body.offset;
      if (typeof body.min_date === "string") minDate = body.min_date;
      if (typeof body.max_date === "string") maxDate = body.max_date;
    } catch (_) { /* ignore */ }
  } else {
    const url = new URL(req.url);
    if (url.searchParams.get("dry_run") === "false") dryRun = false;
    const bs = url.searchParams.get("batch_size");
    if (bs) batchSize = parseInt(bs, 10);
    const off = url.searchParams.get("offset");
    if (off) offset = parseInt(off, 10);
    minDate = url.searchParams.get("min_date");
    maxDate = url.searchParams.get("max_date");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const keyPrefix = STRIPE_KEY.slice(0, 12) + "...";
  const isLiveKey = STRIPE_KEY.startsWith("sk_live_");

  // Cache: customer_id → { email, foundViaProfile }
  const customerEmailCache: Record<string, string | null> = {};

  // Build null-orders query
  let query = supabase
    .from("orders")
    .select("id, stripe_charge_id, amount_gross, paid_at")
    .is("user_id", null)
    .not("stripe_charge_id", "is", null)
    .order("paid_at", { ascending: false }) // Most recent first for higher match rate
    .range(offset, offset + batchSize - 1);

  if (minDate) query = query.gte("paid_at", minDate);
  if (maxDate) query = query.lte("paid_at", maxDate);

  const { data: nullOrders, error: fetchErr } = await query;

  if (fetchErr) {
    return new Response(
      JSON.stringify({ error: fetchErr.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const total = nullOrders?.length ?? 0;
  const results: Record<string, unknown>[] = [];
  let matched = 0;
  let unmatched = 0;
  let errors = 0;

  // Fetch all auth users once per batch invocation (paginated)
  let authEmailMap: Record<string, string> | null = null;

  async function getAuthEmailMap(): Promise<Record<string, string>> {
    if (authEmailMap !== null) return authEmailMap;
    const map: Record<string, string> = {};
    let page = 1;
    while (true) {
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`,
        { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
      );
      if (!res.ok) break;
      const body = await res.json() as { users?: { id: string; email: string }[] };
      const users = body.users ?? [];
      for (const u of users) {
        if (u.email) map[u.email.toLowerCase()] = u.id;
      }
      if (users.length < 1000) break;
      page++;
    }
    authEmailMap = map;
    return map;
  }

  for (const order of nullOrders ?? []) {
    const chargeId = order.stripe_charge_id as string;

    try {
      // Step 1: Retrieve charge → customer_id
      const charge = await stripeGet(`/charges/${encodeURIComponent(chargeId)}`);

      const customerId: string | null =
        typeof charge.customer === "string"
          ? charge.customer
          : (charge.customer as Record<string, unknown>)?.id as string ?? null;

      if (!customerId) {
        unmatched++;
        results.push({ order_id: order.id, charge_id: chargeId, status: "no_customer_id" });
        continue;
      }

      // Step 2: Try profiles.stripe_customer_id (native v2 users)
      const { data: profileDirect } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (profileDirect?.user_id) {
        if (!dryRun) {
          await supabase.from("orders").update({
            user_id: profileDirect.user_id,
            stripe_customer_id: customerId,
          }).eq("id", order.id);
        }
        matched++;
        results.push({
          order_id: order.id, charge_id: chargeId, customer_id: customerId,
          user_id: profileDirect.user_id, match_via: "profile_customer_id",
          status: dryRun ? "would_update" : "updated",
        });
        continue;
      }

      // Step 3: Retrieve Stripe customer email (cached)
      if (!(customerId in customerEmailCache)) {
        try {
          const customer = await stripeGet(`/customers/${encodeURIComponent(customerId)}`);
          customerEmailCache[customerId] = (customer.email as string | null) ?? null;
        } catch (_) {
          customerEmailCache[customerId] = null;
        }
      }
      const customerEmail = customerEmailCache[customerId];

      if (!customerEmail) {
        unmatched++;
        results.push({ order_id: order.id, charge_id: chargeId, customer_id: customerId, status: "no_customer_email" });
        continue;
      }

      // Step 4: Match email → auth user
      const emailMap = await getAuthEmailMap();
      const userId = emailMap[customerEmail.toLowerCase()] ?? null;

      if (!userId) {
        unmatched++;
        results.push({
          order_id: order.id, charge_id: chargeId, customer_id: customerId,
          customer_email: customerEmail, status: "no_auth_user_match",
        });
        continue;
      }

      if (!dryRun) {
        await supabase.from("orders").update({
          user_id: userId,
          stripe_customer_id: customerId,
        }).eq("id", order.id);

        // Backfill profile.stripe_customer_id if missing
        await supabase.from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", userId)
          .is("stripe_customer_id", null);
      }

      matched++;
      results.push({
        order_id: order.id, charge_id: chargeId, customer_id: customerId,
        customer_email: customerEmail, user_id: userId,
        match_via: "customer_email",
        status: dryRun ? "would_update" : "updated",
      });

    } catch (err) {
      errors++;
      results.push({
        order_id: order.id, charge_id: chargeId,
        status: "error",
        error: (err as Error).message,
      });
    }
  }

  // Remaining count (respects date filters)
  let countQuery = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .not("stripe_charge_id", "is", null);
  if (minDate) countQuery = countQuery.gte("paid_at", minDate);
  if (maxDate) countQuery = countQuery.lte("paid_at", maxDate);
  const { count: remaining } = await countQuery;

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      stripe_key_prefix: keyPrefix,
      stripe_key_is_live: isLiveKey,
      batch_size: batchSize,
      offset,
      min_date: minDate,
      max_date: maxDate,
      processed: total,
      matched,
      unmatched,
      errors,
      remaining_null_orders: remaining,
      results,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
