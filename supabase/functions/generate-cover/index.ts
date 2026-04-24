import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const CREDITS_COST = 1

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  let supabaseAdmin: ReturnType<typeof createClient> | null = null
  let chargedUserId: string | null = null
  let chargedTrackTitle = "Sin título"
  let creditsCharged = false
  let refundIssued = false

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY")
    if (!FAL_API_KEY) {
      return new Response(JSON.stringify({ error: "FAL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const {
      artistName, trackTitle, description, artistPhotoBase64,
      resolution, style, colorPalette, artistRef, referenceImageBase64,
      referenceStrength, referenceMode,
    } = await req.json()

    if (!trackTitle && !description) {
      return new Response(
        JSON.stringify({ error: "trackTitle or description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    chargedUserId = user.id
    chargedTrackTitle = trackTitle || "Sin título"

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", user.id)
      .single()

    if (!profile || profile.available_credits < CREDITS_COST) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          available: profile?.available_credits ?? 0,
          required: CREDITS_COST,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    let prompt = description
      ? `${artistName} - ${trackTitle}. ${description}. Professional album cover art, high quality music artwork, modern design, square format`
      : `${artistName} - ${trackTitle}. Professional album cover art, modern music artwork, high quality design, square format`

    if (artistRef) prompt += ` Visual style inspired by ${artistRef} album artwork.`
    if (style) prompt += ` Art style: ${style}.`
    if (colorPalette) prompt += ` Dominant color palette: ${colorPalette}.`

    console.log(`[COVER] user=${user.id}, hasPhoto=${!!artistPhotoBase64}, prompt=${prompt.slice(0, 120)}…`)

    let imageUrl: string

    try {
      const endpoint = artistPhotoBase64
        ? "https://fal.run/fal-ai/nano-banana-pro/edit"
        : "https://fal.run/fal-ai/nano-banana-pro"
      const body: any = {
        prompt,
        image_size: { width: 3000, height: 3000 },
        output_format: "png",
      }
      if (artistPhotoBase64) {
        body.image_urls = [`data:image/jpeg;base64,${artistPhotoBase64}`]
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Key ${FAL_API_KEY}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text()
        console.error("[COVER] fal.ai error:", res.status, errText)

        // Parse fal.ai error for specific codes
        let errorCode = "provider_unavailable"
        let errorDetail = errText
        try { errorDetail = JSON.parse(errText)?.detail || errText } catch {}

        if (res.status === 429 || errText.includes("rate") || errText.includes("too many")) {
          errorCode = "provider_rate_limit"
        } else if (res.status === 402 || errText.includes("billing") || errText.includes("payment")) {
          errorCode = "provider_unavailable"
        } else if (res.status === 422 || errText.includes("safety") || errText.includes("nsfw") || errText.includes("content_policy")) {
          errorCode = "content_filtered"
        }

        throw { code: errorCode, status: res.status, detail: errorDetail }
      }
      const data = await res.json()
      const url = data.images?.[0]?.url
      if (!url) throw { code: "provider_unavailable", status: 500, detail: "No image generated" }
      imageUrl = url
    } catch (genErr: any) {
      console.error("[COVER] Generation error:", genErr)
      const errorCode = genErr?.code || "provider_unavailable"
      const errorStatus = genErr?.status || 500
      const errorDetail = genErr?.detail || genErr?.message || "Unknown error"

      // No credits were deducted yet (deduction happens after success), so no refund needed
      console.log(`[COVER] Generation failed for ${user.id}, no credits charged`)

      return new Response(
        JSON.stringify({
          error: errorCode,
          fallback: true,
          fal_status: errorStatus,
          details: typeof errorDetail === 'string' ? errorDetail.slice(0, 300) : JSON.stringify(errorDetail).slice(0, 300),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Upscale to 4096px when requested
    const wantHD = resolution === '4096'
    if (wantHD) {
      try {
        console.log(`[COVER] Upscaling from model output…`)
        const upRes = await fetch("https://fal.run/fal-ai/aura-sr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${FAL_API_KEY}`,
          },
          body: JSON.stringify({
            image_url: imageUrl,
            upscaling_factor: 4,
            output_format: "png",
          }),
        })

        if (upRes.ok) {
          const upData = await upRes.json()
          const upUrl = upData.image?.url
          if (upUrl) {
            imageUrl = upUrl
            console.log(`[COVER] Upscale successful`)
          }
        } else {
          console.warn("[COVER] Upscaler error:", upRes.status)
        }
      } catch (upscaleErr) {
        console.warn("[COVER] Upscale failed, using original:", upscaleErr)
      }
    }

    // Upload to Storage
    let storedUrl = imageUrl
    try {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) {
        const imgBlob = await imgRes.blob()
        const fileName = `covers/${user.id}/${Date.now()}.png`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("social-promo-images")
          .upload(fileName, imgBlob, { contentType: "image/png", upsert: false })

        if (!uploadErr) {
          const { data: pubUrl } = supabaseAdmin.storage
            .from("social-promo-images")
            .getPublicUrl(fileName)
          storedUrl = pubUrl.publicUrl
        } else {
          console.warn("[COVER] Upload failed, using fal URL:", uploadErr.message)
        }
      }
    } catch (upErr) {
      console.warn("[COVER] Upload error, using fal URL:", upErr)
    }

    // Deduct credits
    const { data: deductedRows, error: deductError } = await supabaseAdmin
      .from("profiles")
      .update({
        available_credits: profile.available_credits - CREDITS_COST,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("available_credits", profile.available_credits)
      .select("user_id")

    if (deductError) {
      throw deductError
    }

    if (!deductedRows?.length) {
      const { data: latestProfile } = await supabaseAdmin
        .from("profiles")
        .select("available_credits")
        .eq("user_id", user.id)
        .single()

      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          available: latestProfile?.available_credits ?? 0,
          required: CREDITS_COST,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    creditsCharged = true

    const { error: txError } = await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      amount: -CREDITS_COST,
      type: "usage",
      description: `Portada IA: ${trackTitle || "Sin título"}`.slice(0, 200),
    })

    if (txError) {
      throw txError
    }

    console.log(`[COVER] Success for ${user.id}, ${CREDITS_COST} credit charged`)

    return new Response(
      JSON.stringify({ success: true, imageUrl: storedUrl, credits_used: CREDITS_COST }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (e) {
    if (supabaseAdmin && chargedUserId && creditsCharged && !refundIssued) {
      refundIssued = true
      try {
        const { data: latestProfile } = await supabaseAdmin
          .from("profiles")
          .select("available_credits")
          .eq("user_id", chargedUserId)
          .single()

        if (latestProfile) {
          await supabaseAdmin
            .from("profiles")
            .update({
              available_credits: latestProfile.available_credits + CREDITS_COST,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", chargedUserId)

          await supabaseAdmin.from("credit_transactions").insert({
            user_id: chargedUserId,
            amount: CREDITS_COST,
            type: "refund",
            description: `Reembolso portada IA: ${chargedTrackTitle}`.slice(0, 200),
          })

          console.log(`[COVER] Refund applied for ${chargedUserId}`)
        }
      } catch (refundError) {
        console.error("[COVER] Refund error:", refundError)
      }
    }

    console.error("[COVER] Unexpected error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})