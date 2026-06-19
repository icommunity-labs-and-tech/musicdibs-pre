// supabase/functions/_shared/suno-sanitizer.ts
// Sanitiza textos de estilo/prompt antes de enviarlos a KIE/Suno para evitar
// falsos positivos de "artist name detected". Suno bloquea palabras o frases
// que coinciden (parcialmente) con nombres de artistas registrados, incluyendo
// términos muy genéricos como "un corazon", "miguel angel", "bad bunny", etc.
//
// Estrategia:
//   1) Lista negra de frases conocidas (false positives frecuentes) → se eliminan
//      antes de la primera llamada.
//   2) Helper para eliminar dinámicamente la frase que Suno reporta en su error
//      ("Your tags contain artist name 'XXX'"), permitiendo reintento transparente.
//   3) Normalización: colapsa espacios, separadores y comas redundantes.

// ── Lista de frases bloqueadas conocidas (lowercase, sin acentos) ─────────────
// Mantener corta y específica. Solo añadir cuando se confirme via error de Suno.
const KNOWN_BLOCKED_PHRASES: string[] = [
  "un corazon",
  "un corazón",
  "miguel angel",
  "miguel ángel",
  "bad bunny",
  "bad gyal",
  "taylor swift",
  "the weeknd",
  "billie eilish",
  "ed sheeran",
  "rosalia",
  "rosalía",
  "karol g",
  "shakira",
  "drake",
  "beyonce",
  "beyoncé",
  "rihanna",
  "kanye",
  "kanye west",
  "michael jackson",
  "elvis",
  "elvis presley",
  "the beatles",
  "queen",
  "madonna",
  "lady gaga",
  "ariana grande",
  "dua lipa",
  "post malone",
  "j balvin",
  "anuel",
  "anuel aa",
  "ozuna",
  "daddy yankee",
  "maluma",
  "feid",
  "myke towers",
  "rauw alejandro",
  "peso pluma",
  "natanael cano",
  "junior h",
  "fuerza regida",
  "morat",
  "manuel turizo",
  "sebastian yatra",
  "sebastián yatra",
  "camilo",
  "kali uchis",
  "bizarrap",
  "quevedo",
  "aitana",
  "lola indigo",
  "lola índigo",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Quita ocurrencias case/accent-insensitive de `phrase` en `text`. */
export function stripBlockedPhrase(text: string, phrase: string): string {
  if (!text || !phrase) return text;
  const normPhrase = stripAccents(phrase).trim();
  if (!normPhrase) return text;
  // Construye un regex que tolere acentos y mayúsculas. Lo más simple: normalizar
  // ambos lados, localizar índices y reescribir. Mantenemos el casing original
  // del resto del texto.
  const normText = stripAccents(text);
  const pattern = new RegExp(`\\b${escapeRegex(normPhrase)}\\b`, "gi");
  // Reemplazamos sobre el texto normalizado pero usamos los mismos índices en el
  // original (las longitudes coinciden tras NFD-strip de combining marks porque
  // sustituimos sólo caracteres combinantes — el resto conserva longitud).
  // Para evitar desalineaciones, hacemos passes simples: split y rejoin.
  const matches: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(normText)) !== null) {
    matches.push([m.index, m.index + m[0].length]);
    if (m.index === pattern.lastIndex) pattern.lastIndex++;
  }
  if (matches.length === 0) return text;
  let result = "";
  let cursor = 0;
  for (const [start, end] of matches) {
    result += text.slice(cursor, start);
    cursor = end;
  }
  result += text.slice(cursor);
  return collapseSeparators(result);
}

/** Aplica la lista negra conocida + colapso de separadores. */
export function sanitizeStyleText(text: string | undefined | null): string {
  if (!text || typeof text !== "string") return "";
  let out = text;
  for (const phrase of KNOWN_BLOCKED_PHRASES) {
    out = stripBlockedPhrase(out, phrase);
  }
  return collapseSeparators(out);
}

/** Limpia separadores huérfanos tras eliminar palabras: ", ," → ",", etc. */
function collapseSeparators(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/^\s*[,;:.\-]+\s*/g, "")
    .replace(/\s*[,;:.\-]+\s*$/g, "")
    .replace(/\(\s*\)/g, "")
    .trim();
}

/**
 * Extrae la frase reportada por Suno/KIE en errores tipo:
 *   "Your tags contain artist name 'un corazon' - we don't reference..."
 *   "Your prompt contains artist name \"Miguel Angel\""
 * Devuelve null si no detecta el patrón.
 */
export function parseArtistNameFromError(msg: string | undefined | null): string | null {
  if (!msg || typeof msg !== "string") return null;
  const re = /artist\s+name\s+['"“”‘’]([^'"“”‘’]{1,80})['"“”‘’]/i;
  const m = msg.match(re);
  return m ? m[1].trim() : null;
}

/** ¿El mensaje de error indica un bloqueo por nombre de artista? */
export function isArtistNameError(msg: string | undefined | null): boolean {
  if (!msg) return false;
  return /artist\s+name/i.test(msg);
}
