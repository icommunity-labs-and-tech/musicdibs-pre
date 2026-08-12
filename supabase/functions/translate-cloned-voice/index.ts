// FIX 2026-08-11: feature retirada. Usaba ElevenLabs Speech-to-Speech (caro,
// y ademas dejo de ser compatible tras migrar la clonacion de voz a KIE Suno
// Voice -- KIE no ofrece un endpoint de speech-to-speech equivalente que
// preserve melodia/ritmo exactos, solo permite regenerar una interpretacion
// nueva desde cero, que no es funcionalmente equivalente). Se retira del
// catalogo de features y del popup de precios (operation_pricing.is_active
// = false) en vez de ofrecer un resultado a medias.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(() => new Response(JSON.stringify({ error: "Gone", message: "This feature has been retired and is no longer active." }), { status: 410, headers: { "Content-Type": "application/json" } }));
