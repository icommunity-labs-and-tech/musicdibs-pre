import { defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";
import getAppInfoTool from "./tools/get-app-info";
import listBlogPostsTool from "./tools/list-blog-posts";
import getOperationPricingTool from "./tools/get-operation-pricing";
import getPricingCatalogTool from "./tools/get-pricing-catalog";
import calculateRoyaltiesTool from "./tools/calculate-royalties";
import submitContactMessageTool from "./tools/submit-contact-message";

export default defineMcp({
  name: "musicdibs-mcp",
  title: "MusicDibs MCP",
  version: "0.2.0",
  instructions:
    "MusicDibs is a music IP registration platform with an AI Studio (songs, lyrics, covers, videos, virtual artists) and distribution. These tools expose PUBLIC data: app info, blog posts, subscription plans, credit costs per operation, royalty estimator, and a contact form. Use `get_app_info` first to understand the platform. Per-user tools (credits balance, my works, my AI generations) are not exposed because this app uses external Supabase without an OAuth 2.1 authorization server.",
  tools: [
    pingTool,
    getAppInfoTool,
    listBlogPostsTool,
    getOperationPricingTool,
    getPricingCatalogTool,
    calculateRoyaltiesTool,
    submitContactMessageTool,
  ],
});
