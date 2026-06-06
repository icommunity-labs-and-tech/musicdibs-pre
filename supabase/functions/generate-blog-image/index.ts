import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gemini 2.5 Flash Image (Nano Banana) — high-quality, fast image generation.
// Returns inline base64 PNG data through the standard generateContent API.
async function generateWithGemini(prompt: string): Promise<Uint8Array> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini image API error:", response.status, errText);
    throw new Error(`Gemini image API ${response.status}: ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data);
  const b64 = imagePart?.inlineData?.data;
  if (!b64) throw new Error("Gemini did not return an image");

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, excerpt, style } = await req.json();

    const styleHint = style || "modern, clean, professional, editorial photography";
    const prompt = `Professional 16:9 blog header image for a music industry article. Title: "${title}". ${excerpt ? `About: ${excerpt}.` : ""} Style: ${styleHint}. Visually striking, suitable for a music distribution and blockchain platform blog. Absolutely no text, words, letters or logos in the image. High quality, cinematic lighting.`;

    console.log("Generating image with Gemini Nano Banana, prompt:", prompt.slice(0, 120));

    const imgBytes = await generateWithGemini(prompt);

    // Ensure bucket exists
    const { error: bucketError } = await supabaseClient.storage.getBucket("blog-images");
    if (bucketError) {
      await supabaseClient.storage.createBucket("blog-images", { public: true });
    }

    const fileName = `ai-${Date.now()}.png`;
    const { error: uploadError } = await supabaseClient.storage
      .from("blog-images")
      .upload(fileName, imgBytes, { contentType: "image/png", upsert: true });

    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);

    const { data: publicUrl } = supabaseClient.storage.from("blog-images").getPublicUrl(fileName);

    return new Response(JSON.stringify({ imageUrl: publicUrl.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
