import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "../_shared/supabase-client.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    )
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")

    // Resolve active provider for lyrics_generation from ai_provider_settings
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )
    let activeProvider = "anthropic"
    let activeModel = "claude-haiku-4-5-20251001"
    try {
      const { data: setting } = await supabaseAdmin
        .from("ai_provider_settings")
        .select("provider, model")
        .eq("feature_key", "lyrics_generation")
        .eq("is_active", true)
        .eq("is_enabled", true)
        .maybeSingle()
      if (setting?.provider) {
        activeProvider = setting.provider
        activeModel = setting.model || activeModel
      }
    } catch (e) {
      console.warn("[LYRICS] provider lookup failed, using default:", e)
    }
    console.log(`[LYRICS] Using provider=${activeProvider} model=${activeModel}`)

    if (activeProvider === "anthropic" && !ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    if (activeProvider === "gemini" && !GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const {
      description,
      genre,
      mood,
      style,
      language,
      rhymeScheme,
      structure,
      artistRefs,
      pov,
      theme,
      regenerateSection,
      existingLyrics,
    } = await req.json()

    const systemPrompt = `Eres un compositor profesional de letras musicales con 20 años de experiencia, especializado en formatear letras para SUNO AI.
Generas letras originales, creativas y de alta calidad en cualquier idioma y género.

REGLAS DE FORMATO SUNO (OBLIGATORIO):
- Usa SIEMPRE paréntesis () para todas las etiquetas de sección y marcas, NUNCA corchetes [].
- Etiquetas de estructura en inglés y entre paréntesis: (Verse 1), (Chorus), (Verse 2), (Pre-Chorus), (Bridge), (Outro), (Intro), (Hook), (Drop), (Break), (Interlude).
- Marcas de estilo, flow, instrumentación y dinámica también entre paréntesis cuando aporten valor, p. ej.: (soft piano), (heavy 808 bass), (whispered), (spoken word), (ad-lib), (harmonies), (guitar solo), (build up), (silence), (female vocal), (male vocal), (rap flow triplets), (echo), (fade out).
- Cada verso entre 4 y 8 líneas; el coro repetible, memorable y pegadizo.
- Mantén coherencia temática y narrativa entre secciones.
- Respeta el esquema de rima indicado en TODOS los versos.

ESQUEMAS DE RIMA:
- ABAB: líneas alternas riman entre sí
- AABB: pares de líneas consecutivas riman
- ABCB: solo riman la 2ª y 4ª línea
- Libre: sin rima obligatoria, prioriza fluidez y emoción

PROHIBIDO ESTRICTAMENTE:
- NO uses corchetes [] bajo ninguna circunstancia — Suno los ignora o malinterpreta.
- NO añadas conteos de sílabas al final de las líneas (ej: "(9)", "(10)").
- NO añadas números al final de las líneas ni anotaciones métricas.
- NO añadas explicaciones, comentarios, análisis ni introducciones.

Devuelve SOLO la letra con sus etiquetas de sección entre paréntesis, lista para pegar en Suno.`

    let userPrompt = `Compón una letra musical con estas características:\n\n`

    if (description) userPrompt += `DESCRIPCIÓN: ${description}\n`
    if (genre)       userPrompt += `GÉNERO: ${genre}\n`
    if (mood)        userPrompt += `MOOD/TONO: ${mood}\n`
    if (style)       userPrompt += `ESTILO LÍRICO: ${style}\n`
    if (language)    userPrompt += `IDIOMA: ${language}\n`
    if (rhymeScheme) userPrompt += `ESQUEMA DE RIMA: ${rhymeScheme}\n`
    if (theme)       userPrompt += `TEMA CENTRAL: ${theme}\n`
    if (pov)         userPrompt += `PUNTO DE VISTA: ${pov}\n`

    if (artistRefs?.length > 0) {
      userPrompt += `REFERENCIAS DE ARTISTAS: Escribe con el estilo de ${artistRefs.join(", ")}\n`
    }

    if (structure) {
      userPrompt += `ESTRUCTURA: ${structure}\n`
    } else {
      userPrompt += `ESTRUCTURA: (Verse 1) + (Chorus) + (Verse 2) + (Chorus) + (Bridge) + (Chorus)\n`
    }

    if (regenerateSection && existingLyrics) {
      userPrompt = `Tengo esta letra:\n\n${existingLyrics}\n\n` +
        `Regenera SOLO la sección (${regenerateSection}) manteniendo el resto intacto.\n` +
        `Usa SIEMPRE paréntesis () para las etiquetas de sección (formato Suno), nunca corchetes [].\n` +
        `Mantén el mismo esquema de rima, idioma y estilo.\n` +
        `Devuelve la letra COMPLETA con la sección regenerada.`
    }

    let lyrics = ""
    if (activeProvider === "kie_suno" || activeProvider === "kie") {
      const KIE_API_KEY = Deno.env.get("KIE_API_KEY")
      if (!KIE_API_KEY) {
        return new Response(JSON.stringify({ error: "KIE_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Build a compact prompt for Suno (max ~400 chars works best)
      const kiePromptParts: string[] = []
      if (regenerateSection && existingLyrics) {
        kiePromptParts.push(`Regenerate only the (${regenerateSection}) section of these lyrics, keep rest intact:\n${existingLyrics}`)
      } else {
        if (description) kiePromptParts.push(description)
        if (theme)       kiePromptParts.push(`theme: ${theme}`)
        if (genre)       kiePromptParts.push(`genre: ${genre}`)
        if (mood)        kiePromptParts.push(`mood: ${mood}`)
        if (style)       kiePromptParts.push(`style: ${style}`)
        if (language)    kiePromptParts.push(`language: ${language}`)
        if (rhymeScheme) kiePromptParts.push(`rhyme: ${rhymeScheme}`)
        if (pov)         kiePromptParts.push(`POV: ${pov}`)
        if (artistRefs?.length) kiePromptParts.push(`like ${artistRefs.join(", ")}`)
      }
      const kiePrompt = kiePromptParts.join(". ").slice(0, 380) || "Original song lyrics"

      // 1) Submit task
      const submitResp = await fetch("https://api.kie.ai/api/v1/lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${KIE_API_KEY}`,
        },
        body: JSON.stringify({ prompt: kiePrompt }),
      })
      if (!submitResp.ok) {
        const errText = await submitResp.text()
        console.error("[LYRICS] KIE submit error:", submitResp.status, errText)
        return new Response(JSON.stringify({ error: "Error al generar letra" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      const submitData = await submitResp.json()
      const taskId = submitData?.data?.taskId || submitData?.data?.task_id
      if (!taskId) {
        console.error("[LYRICS] KIE no taskId:", JSON.stringify(submitData))
        return new Response(JSON.stringify({ error: "Error al generar letra" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      console.log(`[LYRICS] KIE taskId=${taskId}`)

      // 2) Poll for result (max ~60s)
      const maxAttempts = 30
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const pollResp = await fetch(
          `https://api.kie.ai/api/v1/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`,
          { headers: { "Authorization": `Bearer ${KIE_API_KEY}` } }
        )
        if (!pollResp.ok) {
          console.warn(`[LYRICS] KIE poll ${i} status=${pollResp.status}`)
          continue
        }
        const pollData = await pollResp.json()
        const status = pollData?.data?.status
        const items = pollData?.data?.response?.lyricsData
                   || pollData?.data?.lyricsData
                   || []
        if (status === "SUCCESS" || (Array.isArray(items) && items.length > 0)) {
          const completed = items.find((x: any) => x?.status === "complete" && x?.text) || items[0]
          lyrics = completed?.text || ""
          break
        }
        if (status === "FAILED" || status === "CREATE_TASK_FAILED" || status === "GENERATE_LYRICS_FAILED") {
          console.error("[LYRICS] KIE task failed:", JSON.stringify(pollData))
          return new Response(JSON.stringify({ error: "Error al generar letra" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }
      }

      if (!lyrics) {
        console.error("[LYRICS] KIE timeout waiting for lyrics")
        return new Response(JSON.stringify({ error: "Timeout al generar letra, intenta de nuevo" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
    } else if (activeProvider === "gemini") {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${GEMINI_API_KEY}`
      const gResp = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.85 },
        }),
      })
      if (!gResp.ok) {
        const errText = await gResp.text()
        console.error("[LYRICS] Gemini error:", gResp.status, errText)
        if (gResp.status === 429) {
          return new Response(JSON.stringify({ error: "Demasiadas solicitudes, espera un momento." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }
        return new Response(JSON.stringify({ error: "Error al generar letra" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      const gData = await gResp.json()
      lyrics = (gData?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p?.text || "").join("").trim()
    } else {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: activeModel,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error("[LYRICS] Anthropic error:", response.status, errText)
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Demasiadas solicitudes, espera un momento." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }
        return new Response(JSON.stringify({ error: "Error al generar letra" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const data = await response.json()
      lyrics = data.content?.[0]?.text || ""
    }


    console.log(`[LYRICS] Generated for user ${user.id}, ${lyrics.length} chars`)

    // Guardar en BBDD
    try {
      await supabaseAdmin.from("lyrics_generations").insert({
        user_id:      user.id,
        description,
        theme,
        genre,
        mood,
        style,
        language,
        rhyme_scheme: rhymeScheme,
        structure,
        artist_refs:  artistRefs,
        pov,
        lyrics,
      })
    } catch (e) {
      console.error("[LYRICS] Error saving to DB:", e)
    }

    return new Response(
      JSON.stringify({ lyrics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (e) {
    console.error("[LYRICS] Error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
