import { defineTool } from "@lovable.dev/mcp-js";
import { jsonContent } from "../_helpers";

export default defineTool({
  name: "get_app_info",
  title: "Get MusicDibs app info",
  description:
    "Return high-level information about the MusicDibs platform: purpose, main modules, key URLs, supported languages and legal notes. Useful as a first call to understand what the app does.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () =>
    jsonContent({
      name: "MusicDibs",
      tagline: "Register music IP on blockchain and create with AI.",
      website: "https://musicdibs.com",
      languages: ["es", "en", "pt"],
      modules: [
        {
          key: "registration",
          title: "Music copyright registration",
          description: "Register works on iCommunity Blockchain (iBS) with certificate download.",
        },
        {
          key: "ai_studio",
          title: "AI Studio",
          description: "Generate songs, lyrics, covers, videos, virtual artists and promo material.",
        },
        {
          key: "distribution",
          title: "Distribution",
          description: "Distribute music to streaming platforms with 100% royalties to artists.",
        },
        {
          key: "promotion",
          title: "Social promotion",
          description: "Reach +200k across Instagram, TikTok and YouTube.",
        },
        {
          key: "managers",
          title: "Managers & agencies",
          description: "Multi-artist dashboard for labels and managers.",
        },
      ],
      royalty_policy: "100% royalties to the artist. 0% platform fee.",
      support_email: "hola@musicdibs.com",
    }),
});
