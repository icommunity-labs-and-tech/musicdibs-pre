import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, excerpt, style } = await req.json();

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (!FAL_API_KEY) throw new Error("FAL_API_KEY is not configured");

    const styleHint = style || "modern, clean, professional";
    const prompt = `Professional blog header image for a music industry article. Title: "${title}". ${excerpt ? `About: ${excerpt}.` : ""} Style: ${styleHint}. Visually striking, suitable for a music distribution platform blog. No text in the image. High quality, editorial photography or illustration style.`;

    console.log("Generating image with fal.ai, prompt:", prompt.slice(0, 120));

    const falResponse = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "landscape_16_9",
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!falResponse.ok) {
      const errText = await falResponse.text();
      console.error("fal.ai error:", falResponse.status, errText);
      throw new Error(`fal.ai error: ${falResponse.status}`);
    }

    const falData = await falResponse.json();
    const generatedUrl = falData.images?.[0]?.url;

    if (!generatedUrl) throw new Error("No image generated");

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { error: bucketError } = await supabaseClient.storage.getBucket("blog-images");
    if (bucketError) {
      await supabaseClient.storage.createBucket("blog-images", { public: true });
    }

    // Download and upload
    const imgRes = await fetch(generatedUrl);
    const imgBlob = await imgRes.blob();
    const fileName = `ai-${Date.now()}.png`;

    const { error: uploadError } = await supabaseClient.storage
      .from("blog-images")
      .upload(fileName, imgBlob, { contentType: "image/png", upsert: true });

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