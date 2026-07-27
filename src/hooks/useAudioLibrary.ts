import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AudioLibraryItem {
  id: string;
  title: string;
  audio_url: string;
  genre: string | null;
  mood: string | null;
  duration: number | null;
  created_at: string;
}

interface Options {
  userId: string | null | undefined;
  /** Only fetch when this is true (e.g. dialog opened). Defaults to true. */
  enabled?: boolean;
  /** Row cap. Defaults to 100. */
  limit?: number;
  /** Require audio_url to be present. Defaults to true. */
  requireAudio?: boolean;
}

/**
 * Shared loader for the user's AI-generated audio catalog stored in
 * `public.ai_generations`. Used by all "pick a track from your library"
 * flows (registration wizard, mastering, promotion, etc.) so they share
 * one query shape, one filter, and one loading contract.
 */
export function useAudioLibrary({
  userId,
  enabled = true,
  limit = 100,
  requireAudio = true,
}: Options) {
  const [items, setItems] = useState<AudioLibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("ai_generations")
      .select("id, prompt, audio_url, genre, mood, duration, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data || [])
          .filter((r: any) => (requireAudio ? !!r.audio_url : true))
          .map((r: any) => ({
            id: r.id as string,
            title: (r.prompt as string | null)?.slice(0, 120) || "",
            audio_url: (r.audio_url as string | null) || "",
            genre: (r.genre as string | null) ?? null,
            mood: (r.mood as string | null) ?? null,
            duration: (r.duration as number | null) ?? null,
            created_at: r.created_at as string,
          }));
        setItems(rows);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, enabled, limit, requireAudio]);

  return { items, loading };
}
