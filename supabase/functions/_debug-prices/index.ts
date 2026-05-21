import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
serve(async () => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });
  const out = prices.data
    .filter(p => p.type === "recurring" && p.recurring?.interval === "year")
    .map(p => ({
      id: p.id,
      amount: p.unit_amount,
      nickname: p.nickname,
      lookup_key: p.lookup_key,
      metadata: p.metadata,
      product_name: typeof p.product === "object" ? (p.product as any).name : null,
      product_metadata: typeof p.product === "object" ? (p.product as any).metadata : null,
    }));
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
