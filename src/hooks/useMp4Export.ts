// src/hooks/useMp4Export.ts
// Hook reutilizable para generar/descargar el MP4 visualizer de una canción KIE.
// Sigue el mismo patrón de polling que MIDI/WAV.

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Mp4JobState = "idle" | "loading" | "done" | "error";

export function useMp4Export() {
  const [mp4Jobs, setMp4Jobs] = useState<Record<string, Mp4JobState>>({});
  const pollsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const triggerBlobDownload = (url: string, filename: string) => {
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      })
      .catch(() => window.open(url, "_blank"));
  };

  const exportMp4 = useCallback(
    async (
      generationId: string,
      displayName: string,
      existingMp4Url?: string | null,
      mp4Status?: string | null,
      onToast?: (opts: { title: string; variant?: "destructive" }) => void
    ) => {
      // ── Si ya está listo, descarga directamente ──────────────────────────────
      if (mp4Status === "completed" && existingMp4Url) {
        triggerBlobDownload(existingMp4Url, `${displayName}.mp4`);
        return;
      }

      // ── Si ya estamos cargando esta generación, no relanzar ──────────────────
      if (mp4Jobs[generationId] === "loading") return;

      setMp4Jobs((prev) => ({ ...prev, [generationId]: "loading" }));

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "kie-mp4-generate",
          { body: { generation_id: generationId } }
        );
        if (invokeError) throw new Error(invokeError.message || "Error iniciando generación MP4");
        if (data?.error) throw new Error(data.message || data.error || "Error iniciando generación MP4");

        // ── Caso: ya completado (idempotencia) ──────────────────────────────────
        if (data.status === "completed" && data.mp4_url) {
          triggerBlobDownload(data.mp4_url, `${displayName}.mp4`);
          setMp4Jobs((prev) => ({ ...prev, [generationId]: "done" }));
          setTimeout(() => setMp4Jobs((prev) => ({ ...prev, [generationId]: "idle" })), 3000);
          return;
        }

        // ── Caso: en proceso, polling en ai_generations ─────────────────────────
        const logId: string | undefined = data?.logId;
        let attempts = 0;

        const poll = setInterval(async () => {
          attempts++;

          if (attempts > 48) {
            // ~4 min máximo
            clearInterval(poll);
            pollsRef.current.delete(generationId);
            setMp4Jobs((prev) => ({ ...prev, [generationId]: "error" }));
            onToast?.({
              title: "El MP4 está tardando más de lo habitual. Inténtalo de nuevo.",
              variant: "destructive",
            });
            return;
          }

          // Polling directo en ai_generations (evita depender del log)
          const { data: genRow } = await supabase
            .from("ai_generations")
            .select("mp4_url, mp4_status")
            .eq("id", generationId)
            .maybeSingle();

          if (genRow?.mp4_status === "completed" && genRow?.mp4_url) {
            clearInterval(poll);
            pollsRef.current.delete(generationId);
            triggerBlobDownload(genRow.mp4_url as string, `${displayName}.mp4`);
            setMp4Jobs((prev) => ({ ...prev, [generationId]: "done" }));
            onToast?.({ title: "¡MP4 descargado!" });
            setTimeout(() => setMp4Jobs((prev) => ({ ...prev, [generationId]: "idle" })), 4000);
            return;
          }

          if (genRow?.mp4_status === "failed") {
            clearInterval(poll);
            pollsRef.current.delete(generationId);
            setMp4Jobs((prev) => ({ ...prev, [generationId]: "error" }));
            onToast?.({ title: "Error al generar el MP4.", variant: "destructive" });
            return;
          }

          // Fallback: también revisar el log si tenemos logId
          if (logId) {
            const { data: logRow } = await supabase
              .from("ai_generation_logs")
              .select("status, output_url")
              .eq("id", logId)
              .single();

            if (logRow?.status === "failed") {
              clearInterval(poll);
              pollsRef.current.delete(generationId);
              setMp4Jobs((prev) => ({ ...prev, [generationId]: "error" }));
              onToast?.({ title: "Error al generar el MP4.", variant: "destructive" });
            }
          }
        }, 5000);

        pollsRef.current.set(generationId, poll);
      } catch (e: any) {
        setMp4Jobs((prev) => ({ ...prev, [generationId]: "error" }));
        onToast?.({
          title: e?.message || "Error al generar MP4",
          variant: "destructive",
        });
      }
    },
    [mp4Jobs]
  );

  // Limpiar polls al desmontar
  const cleanup = useCallback(() => {
    pollsRef.current.forEach((interval) => clearInterval(interval));
    pollsRef.current.clear();
  }, []);

  return { mp4Jobs, exportMp4, cleanup };
}
