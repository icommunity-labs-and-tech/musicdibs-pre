// Deno copy of lyrics detector — kept in sync with src/lib/lyricsDetector.ts
const STRUCTURE_TAG_REGEX = /\[(?:verse|chorus|bridge|intro|outro|pre[-\s]?chorus|hook|verso|estribillo|coro|puente|pre[-\s]?coro|gancho|estrofa)(?:\s*\d+)?\]/i;

export interface LyricsDetectionResult {
  hasLyrics: boolean;
  lyricsBlock: string;
  musicDescription: string;
}

export function detectLyrics(text: string): LyricsDetectionResult {
  const trimmed = (text || '').trim();
  if (!trimmed) return { hasLyrics: false, lyricsBlock: '', musicDescription: '' };
  const lines = trimmed.split(/\r?\n/);
  const tagIdx = lines.findIndex((l) => STRUCTURE_TAG_REGEX.test(l.trim()));
  if (tagIdx >= 0) {
    return {
      hasLyrics: true,
      musicDescription: lines.slice(0, tagIdx).join('\n').trim(),
      lyricsBlock: lines.slice(tagIdx).join('\n').trim(),
    };
  }
  let runStart = -1;
  let bestStart = -1;
  let bestEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const isLyricLine = l.length > 0 && l.length <= 80 && !/[.!?:;]\s/.test(l);
    if (isLyricLine) {
      if (runStart < 0) runStart = i;
      if (i - runStart + 1 >= 4 && (bestEnd - bestStart < i - runStart)) {
        bestStart = runStart;
        bestEnd = i;
      }
    } else {
      runStart = -1;
    }
  }
  if (bestStart >= 0) {
    return {
      hasLyrics: true,
      musicDescription: lines.slice(0, bestStart).join('\n').trim(),
      lyricsBlock: lines.slice(bestStart, bestEnd + 1).join('\n').trim(),
    };
  }
  return { hasLyrics: false, lyricsBlock: '', musicDescription: trimmed };
}
