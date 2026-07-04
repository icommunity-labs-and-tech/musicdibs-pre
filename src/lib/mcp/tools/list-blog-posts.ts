import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase, jsonContent, textContent } from "../_helpers";

export default defineTool({
  name: "list_blog_posts",
  title: "List blog posts",
  description:
    "List published MusicDibs blog posts (title, slug, excerpt, language, published date). Use to discover recent articles about music copyright, distribution and AI tools.",
  inputSchema: {
    language: z
      .enum(["es", "en", "pt"])
      .optional()
      .describe("Filter by language code."),
    limit: z.number().int().min(1).max(50).optional().describe("Max posts (default 10)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ language, limit }) => {
    const supabase = getPublicSupabase();
    let q = supabase
      .from("blog_posts")
      .select("title, slug, excerpt, language, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit ?? 10);
    if (language) q = q.eq("language", language);
    const { data, error } = await q;
    if (error) return { ...textContent(`Error: ${error.message}`), isError: true };
    return jsonContent(data ?? []);
  },
});
