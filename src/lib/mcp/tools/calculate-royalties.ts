import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonContent } from "../_helpers";

export default defineTool({
  name: "calculate_royalties",
  title: "Calculate music royalties",
  description:
    "Estimate net royalties for the artist given gross streaming revenue. MusicDibs policy: 100% of royalties go to the artist (0% platform fee).",
  inputSchema: {
    streams: z.number().int().min(0).describe("Total number of streams."),
    revenue_per_stream_usd: z
      .number()
      .min(0)
      .optional()
      .describe("Revenue per stream in USD. Defaults to 0.004 (industry average)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ streams, revenue_per_stream_usd }) => {
    const rate = revenue_per_stream_usd ?? 0.004;
    const gross = streams * rate;
    const platform_fee_pct = 0;
    const artist_share = gross * (1 - platform_fee_pct);
    return jsonContent({
      streams,
      rate_per_stream_usd: rate,
      gross_usd: Number(gross.toFixed(2)),
      platform_fee_pct,
      artist_net_usd: Number(artist_share.toFixed(2)),
      note: "MusicDibs pays 100% of royalties to artists.",
    });
  },
});
