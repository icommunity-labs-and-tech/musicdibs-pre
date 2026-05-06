// Shared heuristic to detect lyrics inside a free-form description.
// A lyrics block is identified by structural tags like [Verse]/[Chorus]/[Verso]/[Estribillo]/[Puente]/[Bridge]/[Intro]/[Outro]/[Pre-Chorus]/[Pre-Coro]
// or by 4+ consecutive short lines (≤80 chars) — typical lyric layout.

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

  // Strategy 1: tag-based detection. From the first structural tag onward, treat as lyrics block.
  const tagIdx = lines.findIndex((l) => STRUCTURE_TAG_REGEX.test(l.trim()));
  if (tagIdx >= 0) {
    const musicDescription = lines.slice(0, tagIdx).join('\n').trim();
    const lyricsBlock = lines.slice(tagIdx).join('\n').trim();
    return { hasLyrics: lyricsBlock.length > 0, lyricsBlock, musicDescription };
  }

  // Strategy 2: 4+ consecutive short lines (typical of lyrics without tags).
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
    const musicDescription = lines.slice(0, bestStart).join('\n').trim();
    const lyricsBlock = lines.slice(bestStart, bestEnd + 1).join('\n').trim();
    return { hasLyrics: true, lyricsBlock, musicDescription };
  }

  return { hasLyrics: false, lyricsBlock: '', musicDescription: trimmed };
}

export const LYRICS_TEMPLATE = `\n\n[Verso 1]\n\n\n[Estribillo]\n\n\n[Verso 2]\n\n\n[Estribillo]\n`;
