import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Handler = (row: any) => void;

interface Options {
  userId: string | null | undefined;
  onInsert?: Handler;
  onUpdate?: Handler;
  onDelete?: Handler;
  /** Extra filter beyond user_id, e.g. "status=eq.completed". Optional. */
  extraFilter?: string;
  /** Unique channel key suffix if you need multiple subscriptions per page. */
  channelKey?: string;
}

/**
 * Shared Realtime subscription to `public.ai_generations` for the current
 * user. Follows the mandatory pattern: subscribe inside useEffect, tear down
 * via `supabase.removeChannel` on cleanup.
 */
export function useAiGenerationsRealtime({
  userId,
  onInsert,
  onUpdate,
  onDelete,
  channelKey = "default",
}: Options) {
  useEffect(() => {
    if (!userId) return;
    const filter = `user_id=eq.${userId}`;
    let chan = supabase.channel(`ai_generations_${userId}_${channelKey}`);

    if (onInsert) {
      chan = chan.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_generations", filter },
        (payload) => onInsert(payload.new),
      );
    }
    if (onUpdate) {
      chan = chan.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_generations", filter },
        (payload) => onUpdate(payload.new),
      );
    }
    if (onDelete) {
      chan = chan.on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "ai_generations", filter },
        (payload) => onDelete(payload.old),
      );
    }

    const subscription = chan.subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, channelKey]);
}
