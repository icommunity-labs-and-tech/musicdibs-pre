import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase, jsonContent, textContent } from "../_helpers";

export default defineTool({
  name: "get_operation_pricing",
  title: "Get operation pricing (credits)",
  description:
    "List MusicDibs operations (music generation, mastering, lyrics, covers, video, promo, distribution, etc.) with their credit cost. Useful for cost estimation before invoking an AI feature.",
  inputSchema: {
    operation_key: z
      .string()
      .optional()
      .describe("If provided, return only that operation."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ operation_key }) => {
    const supabase = getPublicSupabase();
    let q = supabase
      .from("operation_pricing")
      .select("operation_key, label, credits_cost, category, description, is_active")
      .eq("is_active", true)
      .order("category")
      .order("operation_key");
    if (operation_key) q = q.eq("operation_key", operation_key);
    const { data, error } = await q;
    if (error) return { ...textContent(`Error: ${error.message}`), isError: true };
    return jsonContent(data ?? []);
  },
});
