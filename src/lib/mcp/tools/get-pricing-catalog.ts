import { defineTool } from "@lovable.dev/mcp-js";
import { jsonContent, textContent } from "../_helpers";

export default defineTool({
  name: "get_pricing_catalog",
  title: "Get subscription pricing catalog",
  description:
    "Return the live MusicDibs subscription plans and one-off credit packs from Stripe: id, name, price, currency, billing period and included credits. Use to answer 'how much does plan X cost?'.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const url =
      (process.env.SUPABASE_URL ?? "https://kmwehyixenybegwhqljx.supabase.co") +
      "/functions/v1/stripe-pricing-catalog";
    const apikey =
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
    try {
      const res = await fetch(url, {
        headers: { apikey, Authorization: `Bearer ${apikey}` },
      });
      if (!res.ok) {
        return {
          ...textContent(`Pricing catalog error ${res.status}: ${await res.text()}`),
          isError: true,
        };
      }
      return jsonContent(await res.json());
    } catch (err) {
      return {
        ...textContent(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`),
        isError: true,
      };
    }
  },
});
