import { supabase } from "@/integrations/supabase/client";

export type AudioContentRisk = "none" | "artist_names" | "copyrighted_lyrics";

export interface AudioContentCheck {
  risk: AudioContentRisk;
  detected: string[];
  explanation?: string;
}

const SAFE_RESULT: AudioContentCheck = { risk: "none", detected: [] };

/**
 * Pre-flight copyright risk check before spending credits on audio generation.
 * Fail-open: any error returns risk "none" so generation is never blocked by
 * the validator itself.
 */
export async function validateAudioContent(prompt: string, lyrics = ""): Promise<AudioContentCheck> {
  try {
    const { data, error } = await supabase.functions.invoke("validate-audio-content", {
      body: { prompt, lyrics },
    });
    if (error || !data) return SAFE_RESULT;
    const risk: AudioContentRisk =
      data.risk === "artist_names" || data.risk === "copyrighted_lyrics" ? data.risk : "none";
    return {
      risk,
      detected: Array.isArray(data.detected) ? data.detected.filter((d: unknown) => typeof d === "string") : [],
      explanation: typeof data.explanation === "string" ? data.explanation : undefined,
    };
  } catch {
    return SAFE_RESULT;
  }
}
