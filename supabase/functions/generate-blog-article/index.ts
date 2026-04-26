import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BlogLanguage = "es" | "en" | "pt";
type GenerateIdeasBody = {
  action: "generate_ideas";
  count?: number;
  languages?: BlogLanguage[];
};
type GenerateFullBody = {
  action: "generate_full";
  title?: string;
  topic?: string;
  category?: string;
  language?: BlogLanguage;
};
type LegacyBody = {
  referenceText?: string;
  section?: "title" | "excerpt" | "content";
  currentTitle?: string;
  currentExcerpt?: string;
  currentContent?: string;
  language?: BlogLanguage;
};
type RequestBody = GenerateIdeasBody | GenerateFullBody | LegacyBody;

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      temperature: 0.4,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Claude API error:", response.status, errText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

function stripCodeBlocks(value: string): string {
  return value.replace(/^```(?:json|html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

function nextThursdayDates(count: number): string[] {
  const dates: string[] = [];
  const date = new Date();
  date.setUTCHours(9, 0, 0, 0);
  const day = date.getUTCDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilThursday);
  for (let i = 0; i < count; i++) {
    const item = new Date(date);
    item.setUTCDate(date.getUTCDate() + i * 7);
    dates.push(item.toISOString());
  }
  return dates;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function expandIdeasByLanguage(
  ideas: Array<Record<string, string>>,
  languages: BlogLanguage[],
  fallbackDates: string[],
) {
  return ideas.flatMap((idea, index) => {
    const publishDate = idea.suggested_publish_date || fallbackDates[index % fallbackDates.length];
    return languages.map((language) => ({
      title: idea.title || "Idea de artículo",
      topic: idea.topic || idea.category || "Musicdibs",
      category: idea.category || "Musicdibs",
      language,
      suggested_publish_date: publishDate,
    }));
  });
}

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const body = await req.json() as RequestBody;

    if ("action" in body && body.action === "generate_ideas") {
      const count = Math.min(Math.max(Number(body.count || 24), 1), 120);
      const languages = (body.languages?.length ? body.languages : ["es", "en", "pt"])
        .filter((lang): lang is BlogLanguage => ["es", "en", "pt"].includes(lang));
      const fallbackDates = nextThursdayDates(count);
      const systemPrompt = "Eres un content strategist especializado en música y tecnología. Genera ideas de artículos para el blog de Musicdibs, una plataforma de registro blockchain y distribución de música con IA.";
      const userPrompt = `Genera ${count} ideas base de artículos. Cada idea se traducirá después a estos idiomas: ${languages.join(", ")}.
Temas obligatorios a cubrir de forma variada:
- Funcionalidades de Musicdibs: registro blockchain, distribución, AI Studio, masterización, artistas virtuales, promoción en redes sociales.
- Propiedad intelectual musical: copyright, derechos de autor, registro de obras.
- Creación musical: composición, producción, letras y géneros.
- Promoción de música: redes sociales, Spotify, TikTok y YouTube.
- Industria musical: tendencias, IA en música y distribución digital.
- Artistas emergentes: consejos, entrevistas ficticias y casos de éxito.
Usa fechas escalonadas en jueves, empezando por estas fechas ISO cuando encaje: ${fallbackDates.join(", ")}.
Responde SOLO con JSON array válido de ${count} elementos: [{"title":"...","topic":"...","category":"...","suggested_publish_date":"ISO date"}]`;

      const raw = stripCodeBlocks(await callClaude(systemPrompt, userPrompt, 8192));
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as Array<Record<string, string>>;
      const ideas = expandIdeasByLanguage(parsed.slice(0, count), languages, fallbackDates);

      return new Response(JSON.stringify({ ideas }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ("action" in body && body.action === "generate_full") {
      const title = body.title?.trim();
      if (!title) {
        return new Response(JSON.stringify({ error: "Title is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const language = body.language || "es";
      const langName = language === "es" ? "español" : language === "en" ? "inglés" : "portugués";
      const systemPrompt = "Eres un redactor experto en música y tecnología. Escribe artículos de blog profesionales para Musicdibs. Los artículos deben mencionar Musicdibs naturalmente, ser informativos, SEO-friendly, y terminar con un CTA hacia musicdibs.com. Responde solo con JSON válido.";
      const userPrompt = `Escribe un artículo completo sobre "${title}" en ${langName}.
Tema: ${body.topic || title}
Categoría: ${body.category || "Musicdibs"}
Extensión: ~800 palabras.
El contenido debe ser HTML completo sin h1, usando h2, h3, p, ul, li, strong y enlaces cuando proceda.
Responde SOLO con JSON: {"title":"...","slug":"...","excerpt":"...","content":"HTML","tags":["..."],"category":"..."}`;

      const raw = stripCodeBlocks(await callClaude(systemPrompt, userPrompt, 8192));
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as {
        title?: string;
        slug?: string;
        excerpt?: string;
        content?: string;
        tags?: string[];
        category?: string;
      };
      const result = {
        title: parsed.title || title,
        slug: parsed.slug || slugify(parsed.title || title),
        excerpt: parsed.excerpt || "",
        content: stripCodeBlocks(parsed.content || ""),
        tags: Array.isArray(parsed.tags) ? parsed.tags : ["Musicdibs"],
        category: parsed.category || body.category || "Musicdibs",
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { referenceText, section, currentTitle, currentExcerpt, currentContent, language } = body as LegacyBody;
    const lang = language || "es";
    const langName = lang === "es" ? "español" : lang === "en" ? "inglés" : "portugués";

    let systemPrompt = "";
    let userPrompt = "";

    if (section === "title") {
      systemPrompt = `Eres un redactor experto en marketing musical y SEO. Genera SOLO un título de artículo de blog atractivo y optimizado para SEO en ${langName}. Devuelve SOLO el título, sin comillas ni explicaciones.`;
      userPrompt = `Basándote en este contenido de referencia, genera un título de blog:\n\n${referenceText || currentContent || ""}`;
    } else if (section === "excerpt") {
      systemPrompt = `Eres un redactor experto. Genera SOLO un extracto/resumen de 2-3 frases para un artículo de blog en ${langName}. Devuelve SOLO el extracto, sin comillas.`;
      userPrompt = `Título: ${currentTitle}\n\nContenido de referencia:\n${referenceText || currentContent || ""}\n\nGenera un extracto atractivo.`;
    } else if (section === "content") {
      systemPrompt = `Eres un redactor experto en la industria musical. Genera el contenido completo de un artículo de blog en ${langName} usando formato HTML. Usa etiquetas <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a> según corresponda. NO incluyas el título principal (h1). El artículo debe ser informativo, bien estructurado y de al menos 800 palabras. IMPORTANTE: Devuelve SOLO el HTML puro, sin bloques de código markdown, sin \`\`\`html, sin comillas envolventes.`;
      userPrompt = `Título: ${currentTitle || "Artículo sobre música"}\nExtracto: ${currentExcerpt || ""}\n\nTexto de referencia:\n${referenceText || ""}\n\nGenera el contenido completo del artículo en HTML puro.`;
    } else {
      systemPrompt = `Eres un redactor experto en la industria musical y distribución digital. Genera un artículo de blog completo en ${langName}. 

IMPORTANTE: Responde EXACTAMENTE en formato JSON válido con estas claves:
- "title": título SEO atractivo (string)
- "excerpt": extracto de 2-3 frases (string)
- "content": contenido HTML completo del artículo (string con HTML usando h2, h3, p, ul, li, strong, a - SIN h1, SIN envolver en bloques de código markdown)
- "tags": array de 3-5 tags relevantes (array de strings)
- "category": categoría del artículo (string)

El campo "content" debe contener HTML puro como string, NO código markdown. El artículo debe tener al menos 800 palabras.
NO envuelvas la respuesta en bloques de código markdown (\`\`\`). Devuelve SOLO el JSON puro.`;
      userPrompt = `Genera un artículo de blog basado en este texto de referencia:\n\n${referenceText}`;
    }

    let content = stripCodeBlocks(await callClaude(systemPrompt, userPrompt));

    let result: unknown;
    if (section) {
      let value = content.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result = { section, value };
    } else {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { content?: string };
          if (parsed.content) parsed.content = stripCodeBlocks(parsed.content);
          result = parsed;
        } else {
          result = { title: "", excerpt: "", content, tags: [], category: "Musicdibs" };
        }
      } catch {
        result = { title: "", excerpt: "", content, tags: [], category: "Musicdibs" };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-article error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
