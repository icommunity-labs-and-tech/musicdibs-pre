import { supabase } from "@/integrations/supabase/client";
import { parseAiError } from "@/lib/aiErrorHandler";

/**
 * Shared thin wrappers for AI Studio Edge Functions.
 * Centralizes error handling so pages/hooks stay small and consistent.
 */

export type ImprovePromptMode =
  | "cover"
  | "song"
  | "vocal"
  | "video"
  | "lyrics_description"
  | "creative"
  | "social_video"
  | "artist_profile"
  | (string & {});

export interface ImprovePromptInput {
  prompt: string;
  mode: ImprovePromptMode;
  genre?: string;
  mood?: string;
  extra?: Record<string, unknown>;
}

export interface ImprovePromptResult {
  improved: string;
}

/** Call the `improve-prompt` Edge Function and return the improved text. */
export async function improvePrompt(
  input: ImprovePromptInput,
  maxLength = 2500,
): Promise<ImprovePromptResult> {
  const { data, error } = await supabase.functions.invoke("improve-prompt", {
    body: {
      prompt: input.prompt.trim(),
      mode: input.mode,
      genre: input.genre || undefined,
      mood: input.mood || undefined,
      ...(input.extra ?? {}),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.improved) throw new Error("No response");
  return { improved: String(data.improved).slice(0, maxLength) };
}

export interface GenerateCoverInput {
  artistName: string;
  trackTitle: string;
  description?: string;
  styleVisual?: string;
  artistPhotoBase64?: string | null;
}

export interface GenerateCoverResult {
  imageUrl: string;
}

/** Call the `generate-cover` Edge Function. Throws normalized errors. */
export async function generateCover(
  input: GenerateCoverInput,
): Promise<GenerateCoverResult> {
  const { data, error } = await supabase.functions.invoke("generate-cover", {
    body: input,
  });
  if (data?.fallback) {
    throw new Error(data.message || "Servicio no disponible temporalmente.");
  }
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "Error generating cover");
  }
  if (!data?.imageUrl) throw new Error("No imageUrl returned");
  return { imageUrl: data.imageUrl };
}

/** Convenience: run an AI action, normalize errors via parseAiError. */
export async function runAiAction<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; message: string; raw: unknown }> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const { userMessage } = parseAiError(err);
    return { ok: false, message: userMessage, raw: err };
  }
}
