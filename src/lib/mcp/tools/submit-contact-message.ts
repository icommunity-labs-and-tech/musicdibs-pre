import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase, jsonContent, textContent } from "../_helpers";

export default defineTool({
  name: "submit_contact_message",
  title: "Submit contact message",
  description:
    "Send a contact form message to the MusicDibs team. Use only when the caller has explicit user intent to contact support/sales.",
  inputSchema: {
    name: z.string().min(1).max(120).describe("Sender name."),
    email: z.string().email().describe("Sender email."),
    subject: z.string().min(1).max(200).describe("Message subject."),
    message: z.string().min(10).max(4000).describe("Message body."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ name, email, subject, message }) => {
    const supabase = getPublicSupabase();
    const { error } = await supabase
      .from("contact_submissions")
      .insert({ name, email, subject, message });
    if (error) return { ...textContent(`Error: ${error.message}`), isError: true };
    return jsonContent({ ok: true, message: "Contact message received." });
  },
});
