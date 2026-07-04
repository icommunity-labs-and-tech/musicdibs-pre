import { defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";

export default defineMcp({
  name: "musicdibs-mcp",
  title: "MusicDibs MCP",
  version: "0.1.0",
  instructions:
    "Tools exposed by the MusicDibs app (music IP registration on blockchain with AI studio). Use `ping` to verify connectivity. More tools can be added to expose credits balance, works, and AI Studio actions.",
  tools: [pingTool],
});
