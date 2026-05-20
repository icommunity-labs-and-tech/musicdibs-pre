/**
 * Centralised AI-provider error handler.
 * Maps raw backend / provider errors to i18n keys for user-friendly messages.
 *
 * KIE error_message format stored in ai_generation_logs:
 *   "code=<N>: <msg>"  (set by kie-suno-callback / kie-enhance-callback)
 *
 * KIE known error codes:
 *   200  Success
 *   400  Bad request / invalid parameters
 *   401  Unauthorized / invalid API key
 *   402  Insufficient credits
 *   413  Uploaded audio matches existing copyrighted work
 *   429  Rate limit exceeded
 *   451  Cannot download / access the audio URL provided
 *   501  Task failed (generic generation failure)
 *   505  Content or theme violates copyright/policy
 *   531  Extend lyrics empty, too short, or malformed
 *   532  Output blocked due to copyright detection
 *   533  Audio file is too long (exceeds provider limit)
 *   534  Audio file is too short (below provider minimum)
 *   535  Unsupported audio format or corrupted file
 *   536  Audio quality too low for processing
 *   537  No vocals detected in source audio (required for this mode)
 */
import i18n from 'i18next';

const t = (key: string) => i18n.t(key);

/** HTTP status → i18n key (for errors returned by our own Edge Functions). */
const statusToKey: Record<number, string> = {
  429: 'aiShared.aiRateLimit',
  402: 'aiShared.aiInsufficientCredits',
  401: 'aiShared.aiSessionExpired',
  403: 'aiShared.aiForbidden',
  500: 'aiShared.aiServerError',
  502: 'aiShared.aiBadGateway',
  503: 'aiShared.aiServiceDown',
  504: 'aiShared.aiTimeout',
};

/**
 * KIE numeric error code → i18n key.
 * Matched against "code=<N>" prefix in error_message.
 * Order matters: more specific first.
 */
const KIE_CODE_MAP: Record<number, string> = {
  413: 'aiShared.kieAudioCopyrightMatch',  // Audio matches existing copyrighted work
  451: 'aiShared.kieDownloadFailed',       // Cannot fetch/download audio URL
  501: 'aiShared.kieTaskFailed',           // Generic generation failure
  505: 'aiShared.kieCopyrightContent',     // Content/theme copyright violation
  531: 'aiShared.kieLyricsRequired',       // Extend: lyrics empty/malformed
  532: 'aiShared.kieOutputCopyright',      // Output blocked by copyright
  533: 'aiShared.kieAudioTooLong',         // Audio exceeds length limit
  534: 'aiShared.kieAudioTooShort',        // Audio below minimum length
  535: 'aiShared.kieUnsupportedFormat',    // Unsupported/corrupted audio format
  536: 'aiShared.kieAudioQualityLow',      // Audio quality too low
  537: 'aiShared.kieNoVocalsDetected',     // No vocals found in source audio
};

/** Known error strings → i18n keys (regex fallback for non-KIE errors). */
const KNOWN_ERRORS: Array<[RegExp, string]> = [
  // ── Rate limiting ──────────────────────────────────────────────────────────
  [/rate_limit|auphonic_rate_limited|too many requests/i, 'aiShared.aiRateLimit'],
  // ── Credits ───────────────────────────────────────────────────────────────
  [/insufficient.?credits/i, 'aiShared.aiInsufficientCredits'],
  // ── Auth ──────────────────────────────────────────────────────────────────
  [/unauthorized|jwt/i, 'aiShared.aiSessionExpired'],
  [/api.?key.?not.?configured|auphonic_auth_error/i, 'aiShared.aiConfigError'],
  // ── Timeouts ──────────────────────────────────────────────────────────────
  [/timeout|timed?\s*out/i, 'aiShared.aiTimeout'],
  // ── Content policy ────────────────────────────────────────────────────────
  [/bad_prompt|content.?policy|moderation/i, 'aiShared.aiContentPolicy'],
  // ── Network ───────────────────────────────────────────────────────────────
  [/network|fetch|ECONNREFUSED|ENOTFOUND/i, 'aiShared.aiNetworkError'],
  // ── Provider down ─────────────────────────────────────────────────────────
  [/providers? failed|auphonic_service_unavailable/i, 'aiShared.aiServiceDown'],
  // ── Audio validation ──────────────────────────────────────────────────────
  [/auphonic_invalid_audio|invalid.?audio|unsupported.?format/i, 'aiShared.aiInvalidAudio'],
  // ── KIE Suno: message-based fallbacks (when code prefix is absent) ─────────
  [/uploaded audio matches|matches existing work|existing work of art/i, 'aiShared.kieAudioCopyrightMatch'],
  [/extending lyrics are empty|lyrics field|lyrics.*(empty|short|malformed)/i, 'aiShared.kieLyricsRequired'],
  [/copyright|theme violation/i, 'aiShared.kieCopyrightContent'],
  [/download failed|upload.*failed|invalid.*audio.*url|cannot.*download/i, 'aiShared.kieDownloadFailed'],
  [/audio.*(too short|too small|minimum)|duration.*(short|small)/i, 'aiShared.kieAudioTooShort'],
  [/audio.*(too long|maximum|exceeds.*limit)/i, 'aiShared.kieAudioTooLong'],
  [/no vocals|vocals.*not detected|vocal.*missing/i, 'aiShared.kieNoVocalsDetected'],
  [/audio.*quality|low.*quality|quality.*too low/i, 'aiShared.kieAudioQualityLow'],
  [/unsupported.*format|corrupted|invalid.*format/i, 'aiShared.kieUnsupportedFormat'],
  [/task failed|generation failed/i, 'aiShared.kieTaskFailed'],
  [/output.*block|blocked.*copyright/i, 'aiShared.kieOutputCopyright'],
  // ── Auphonic ──────────────────────────────────────────────────────────────
  [/auphonic_error/i, 'aiShared.aiServiceDown'],
];

/** KIE codes that are NOT retryable (user must change something). */
const NON_RETRYABLE_KIE_CODES = new Set([413, 505, 531, 532, 535, 537]);
const NON_RETRYABLE_KEYS = new Set([
  'aiShared.aiInsufficientCredits',
  'aiShared.aiSessionExpired',
  'aiShared.aiForbidden',
  'aiShared.aiConfigError',
  'aiShared.aiContentPolicy',
  'aiShared.kieAudioCopyrightMatch',
  'aiShared.kieCopyrightContent',
  'aiShared.kieLyricsRequired',
  'aiShared.kieOutputCopyright',
  'aiShared.kieUnsupportedFormat',
  'aiShared.kieNoVocalsDetected',
]);

export interface AiErrorInfo {
  userMessage: string;
  isRetryable: boolean;
}

/**
 * Parses an error (from supabase.functions.invoke or a catch block)
 * and returns a user-friendly, localised message.
 */
export function parseAiError(
  error: unknown,
  responseData?: Record<string, unknown> | null,
): AiErrorInfo {
  // 1. HTTP status from our Edge Function response
  const status = (error as any)?.status ?? (error as any)?.context?.status;
  if (status && statusToKey[status]) {
    return {
      userMessage: t(statusToKey[status]),
      isRetryable: status !== 402 && status !== 401 && status !== 403,
    };
  }

  const dataError = responseData?.error as string | undefined;
  const rawMessage = dataError
    || (error instanceof Error ? error.message : '')
    || String(error ?? '');

  // 2. KIE numeric code prefix: "code=NNN: ..."
  const kieCodeMatch = rawMessage.match(/code=(\d+)/i);
  if (kieCodeMatch) {
    const code = parseInt(kieCodeMatch[1], 10);
    const key = KIE_CODE_MAP[code];
    if (key) {
      return {
        userMessage: t(key),
        isRetryable: !NON_RETRYABLE_KIE_CODES.has(code),
      };
    }
  }

  // 3. Regex message matching (fallback)
  for (const [pattern, key] of KNOWN_ERRORS) {
    if (pattern.test(rawMessage)) {
      return {
        userMessage: t(key),
        isRetryable: !NON_RETRYABLE_KEYS.has(key),
      };
    }
  }

  return { userMessage: t('aiShared.aiUnavailable'), isRetryable: true };
}
