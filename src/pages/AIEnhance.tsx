// 🎼 Mejorar demo con IA — AI Enhance Module
// Route: /ai-studio/enhance
// v3 — vocalGender toggle + fidelity presets (faithful/balanced/creative) for instrumental mode

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { parseAiError } from "@/lib/aiErrorHandler";

import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";

import { useProductTracking } from "@/hooks/useProductTracking";

import { Navbar } from "@/components/Navbar";
import { AIStudioThemeBar } from "@/components/ai-studio/AIStudioThemeBar";
import { AIKnowledgeModal, useAIKnowledgeAutoShow } from "@/components/ai-studio/AIKnowledgeModal";
import { GenerationWarning } from "@/components/ai-studio/GenerationWarning";
import { FileDropzone } from "@/components/FileDropzone";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { SEO } from "@/components/SEO";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getFeatureCost } from "@/lib/featureCosts";

import {
  ArrowLeft, Wand2, Loader2, Play, Pause,
  Download, RefreshCw, CheckCircle2, X,
  Layers, Repeat2, Expand, AlertTriangle, BookOpen, Sparkles,
  FileMusic2, FileAudio,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnhanceMode = "instrumental" | "cover" | "extend";
type JobStatus = "idle" | "uploading" | "processing" | "completed" | "failed";
type FidelityPreset = "faithful" | "balanced" | "creative";

const FIDELITY_PRESETS: Record<FidelityPreset, {
  audio_weight: number;
  style_weight: number;
  weirdness_constraint: number;
  label: string;
  description: string;
}> = {
  faithful: {
    audio_weight: 0.80, style_weight: 0.50, weirdness_constraint: 0.20,
    label: "Fiel al original",
    description: "Respeta el ritmo y carácter de tu voz",
  },
  balanced: {
    audio_weight: 0.65, style_weight: 0.65, weirdness_constraint: 0.40,
    label: "Equilibrado",
    description: "Balance entre fidelidad y estilo",
  },
  creative: {
    audio_weight: 0.40, style_weight: 0.80, weirdness_constraint: 0.75,
    label: "Creativo",
    description: "Más libertad para la IA",
  },
};

const MODE_FEATURE_KEY: Record<EnhanceMode, string> = {
  instrumental: "enhance_instrumental",
  cover: "enhance_cover",
  extend: "enhance_extend",
};

const MODES = [
  {
    id: "instrumental" as EnhanceMode,
    label: "Añadir instrumentación",
    tagline: "Transforma una melodía simple en una producción completa.",
    icon: <Layers className="w-5 h-5" />,
    gradient: "from-violet-500 to-purple-600",
    placeholder: "Añade una producción pop electrónica con bajo potente, sintetizadores y batería energética.",
    useCases: [
      "Transformar una melodía simple en una completa",
      "Añadir producción e instrumentos",
    ],
  },
  {
    id: "cover" as EnhanceMode,
    label: "Nueva versión desde demo",
    tagline: "La IA trabaja sobre tu idea. Tú mantienes la autoría.",
    icon: <Repeat2 className="w-5 h-5" />,
    gradient: "from-pink-500 to-rose-500",
    placeholder: "Convierte esta demo en una balada pop cinematográfica con piano emocional y voz femenina.",
    useCases: [
      "Rehacer demo",
      "Reinterpretar una idea",
      "Cambiar estilo musical",
      "Producir encima de una melodía existente",
    ],
  },
  {
    id: "extend" as EnhanceMode,
    label: "Extender canción",
    tagline: "Convierte bocetos en temas completos.",
    icon: <Expand className="w-5 h-5" />,
    gradient: "from-blue-500 to-cyan-500",
    placeholder: "Extiende esta intro añadiendo una sección principal y coro con el mismo mood oscuro.",
    useCases: [
      "Continuar una demo",
      "Ampliar una intro",
      "Transformar una idea corta en canción completa",
    ],
  },
];

function AudioPlayer({ src, label }: { src: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a || loadError) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      try {
        await a.play();
        setPlaying(true);
      } catch (err) {
        console.error("[AudioPlayer] play() failed:", err);
        setLoadError(true);
        toast.error("No se puede reproducir el audio. Usa el botón de descarga.");
      }
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        onError={() => setLoadError(true)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a?.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
      />
      <Button
        size="icon"
        variant={loadError ? "outline" : "default"}
        onClick={toggle}
        disabled={loadError}
        className="h-10 w-10 rounded-full shrink-0"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {loadError
          ? <p className="text-xs text-destructive mt-1">Error al cargar. Descarga el archivo.</p>
          : <Progress value={progress} className="h-1 mt-1" />
        }
      </div>
    </div>
  );
}

const AIEnhance = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { credits, hasEnough } = useCredits();
  const { track } = useProductTracking();
  const [knowledgeOpen, setKnowledgeOpen] = useAIKnowledgeAutoShow();

  const [selectedMode, setSelectedMode] = useState<EnhanceMode>("instrumental");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState("");
  const [voiceType, setVoiceType] = useState("");
  // ── idioma vocal + estado de descarga ────────────────────────────────────
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [isDownloading, setIsDownloading] = useState(false);
  // ── instrumental quality params ───────────────────────────────────────────
  const [vocalGender, setVocalGender] = useState<"m" | "f">("m");
  const [fidelityPreset, setFidelityPreset] = useState<FidelityPreset>("balanced");

  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [logId, setLogId] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);

  // ── MIDI export ───────────────────────────────────────────────────────────────
  const [midiStatus, setMidiStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [midiDownloadUrl, setMidiDownloadUrl] = useState<string | null>(null);
  const midiPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── WAV export ────────────────────────────────────────────────────────────────
  const [wavStatus, setWavStatus] = useState<"idle" | "loading" | "error">("idle");
  const wavPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentMode = MODES.find((m) => m.id === selectedMode)!;
  const creditsRequired = getFeatureCost(MODE_FEATURE_KEY[selectedMode]);
  const canGenerate = !!audioFile && hasEnough(creditsRequired);
  const isProcessing = jobStatus === "uploading" || jobStatus === "processing";

  useEffect(() => {
    track("ai_studio_entered" as any, { feature: "enhance_audio" as any });
  }, []);

  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
      URL.revokeObjectURL(url);
    };
  };

  // Realtime: listen for callback result on ai_generation_logs
  useEffect(() => {
    if (!logId || jobStatus !== "processing") return;
    const channel = supabase
      .channel(`enhance-log-${logId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_generation_logs", filter: `id=eq.${logId}` },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.status === "completed" && updated.output_url) {
            setJobStatus("completed");
            setGeneratedAudioUrl(updated.output_url as string);
            toast.success("¡Tu versión IA está lista!");
          } else if (updated.status === "failed") {
            setJobStatus("failed");
            const raw = (updated.error_message as string) || "";
            const { userMessage } = parseAiError(new Error(raw));
            setGenError(userMessage);
            toast.error(userMessage);
          }
        }
      )
      .subscribe();

    // Polling fallback in case Realtime UPDATE never arrives.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("status, output_url, error_message")
        .eq("id", logId)
        .maybeSingle();
      if (!data) return;
      if (data.status === "completed" && data.output_url) {
        setJobStatus("completed");
        setGeneratedAudioUrl(data.output_url);
        toast.success("¡Tu versión IA está lista!");
      } else if (data.status === "failed") {
        setJobStatus("failed");
        const { userMessage } = parseAiError(new Error(data.error_message || ""));
        setGenError(userMessage);
        toast.error(userMessage);
      }
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [logId, jobStatus]);

  const uploadAudio = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    setUploadProgress(30);
    const { data, error } = await supabase.storage
      .from("ai-generations")
      .upload(`enhance/${path}`, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload fallido: ${error.message}`);
    setUploadProgress(90);
    const { data: urlData } = supabase.storage.from("ai-generations").getPublicUrl(data.path);
    setUploadProgress(100);
    return urlData.publicUrl;
  };

  const handleGenerate = async () => {
    if (!audioFile || !user) return;
    setGenError(null);
    try {
      setJobStatus("uploading");
      setUploadProgress(10);
      const sourceAudioUrl = await uploadAudio(audioFile);
      setJobStatus("processing");
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-enhance-generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            mode: selectedMode,
            source_audio_url: sourceAudioUrl,
            source_filename: audioFile.name,
            source_duration_sec: audioDuration ?? undefined,
            prompt: prompt || undefined,
            genre: genre || undefined,
            mood: mood || undefined,
            intensity: intensity || undefined,
            voice_type: selectedMode !== "instrumental" ? (voiceType || undefined) : undefined,
            source_language: sourceLanguage !== "auto" ? sourceLanguage : undefined,
            // ── instrumental quality params ───────────────────────────────────
            ...(selectedMode === "instrumental" && {
              vocal_gender: vocalGender,
              audio_weight: FIDELITY_PRESETS[fidelityPreset].audio_weight,
              style_weight: FIDELITY_PRESETS[fidelityPreset].style_weight,
              weirdness_constraint: FIDELITY_PRESETS[fidelityPreset].weirdness_constraint,
            }),
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al iniciar generación");
      }
      setLogId(data.logId);
      toast.info("Generación iniciada. No cierres esta pestaña.");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error inesperado";
      setJobStatus("failed");
      setGenError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt.trim() || isImprovingPrompt) return;
    setIsImprovingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: {
          prompt: prompt.trim(),
          genre: genre || undefined,
          mood: mood || undefined,
          mode: 'audio_enhance',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.improved) {
        setPrompt(data.improved.slice(0, 500));
        toast.success(t('aiCreate.promptImproved', 'Prompt mejorado'));
      }
    } catch (e: any) {
      const { userMessage } = parseAiError(e);
      toast.error(userMessage);
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  // ── Descarga cross-origin segura (fetch → blob → diálogo nativo) ─────────────
  const handleDownload = async () => {
    if (!generatedAudioUrl) return;
    setIsDownloading(true);
    try {
      const res = await fetch(generatedAudioUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `musicdibs-ai-enhance-${selectedMode}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Error al descargar el archivo. Inténtalo de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Descarga WAV on-demand ────────────────────────────────────────────────────
  const handleExportWav = async () => {
    if (!generatedAudioUrl || wavStatus === "loading") return;
    setWavStatus("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-wav-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ audio_url: generatedAudioUrl }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error iniciando conversión WAV");

      // Respuesta síncrona: KIE devolvió URL directamente
      if (data.status === "completed" && data.wav_url) {
        triggerWavDownload(data.wav_url);
        setWavStatus("idle");
        return;
      }

      // Respuesta asíncrona: polling
      const wavLogId = data.logId;
      let attempts = 0;
      wavPollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 40) {
          clearInterval(wavPollRef.current!);
          setWavStatus("error");
          toast.error("La conversión WAV tardó demasiado. Inténtalo de nuevo.");
          return;
        }
        const { data: row } = await supabase
          .from("ai_generation_logs")
          .select("status, output_url")
          .eq("id", wavLogId)
          .single();
        if (row?.status === "completed" && row?.output_url) {
          clearInterval(wavPollRef.current!);
          triggerWavDownload(row.output_url as string);
          setWavStatus("idle");
        } else if (row?.status === "failed") {
          clearInterval(wavPollRef.current!);
          setWavStatus("error");
          toast.error("Error al convertir a WAV. Inténtalo de nuevo.");
        }
      }, 5000);
    } catch (e: any) {
      setWavStatus("error");
      toast.error(e?.message || "Error al exportar WAV");
    }
  };

  const triggerWavDownload = (url: string) => {
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `musicdibs-ai-enhance-${selectedMode}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        toast.success("Archivo WAV descargado");
      })
      .catch(() => {
        // Fallback: abrir en nueva pestaña
        window.open(url, "_blank");
        toast.success("WAV listo — revisa las descargas");
      });
  };

  // ── Exportar MIDI ─────────────────────────────────────────────────────────────
  const handleExportMidi = async () => {
    if (!logId || midiStatus === "loading") return;
    setMidiStatus("loading");
    setMidiDownloadUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-midi-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ source_log_id: logId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "insufficient_credits") {
          toast.error("No tienes suficientes créditos para exportar MIDI (2 créditos).");
        } else if (data?.error === "midi_not_available") {
          toast.error("MIDI solo está disponible para tracks generados con KIE/Suno.");
        } else {
          throw new Error(data?.message || "Error iniciando exportación MIDI");
        }
        setMidiStatus("error");
        return;
      }

      const midiLogId = data.logId;
      let attempts = 0;
      midiPollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 48) { // 48 * 5s = 4 min
          clearInterval(midiPollRef.current!);
          setMidiStatus("error");
          toast.error("La exportación MIDI tardó demasiado. Inténtalo de nuevo.");
          return;
        }
        const { data: row } = await supabase
          .from("ai_generation_logs")
          .select("status, output_url")
          .eq("id", midiLogId)
          .single();
        if (row?.status === "completed" && row?.output_url) {
          clearInterval(midiPollRef.current!);
          // output_url puede ser URL directa o JSON con múltiples archivos
          let midiUrl = row.output_url as string;
          try {
            const parsed = JSON.parse(midiUrl);
            if (parsed?.midi_files?.[0]) midiUrl = parsed.midi_files[0];
          } catch { /* URL directa, ok */ }
          setMidiDownloadUrl(midiUrl);
          setMidiStatus("ready");
          toast.success("¡MIDI listo para descargar!");
        } else if (row?.status === "failed") {
          clearInterval(midiPollRef.current!);
          setMidiStatus("error");
          toast.error("Error al generar el MIDI. No se han descontado créditos.");
        }
      }, 5000);
    } catch (e: any) {
      setMidiStatus("error");
      toast.error(e?.message || "Error al exportar MIDI");
    }
  };

  const handleReset = () => {
    setAudioFile(null);
    setAudioDuration(null);
    setPrompt("");
    setGenre("");
    setMood("");
    setIntensity("");
    setVoiceType("");
    setSourceLanguage("auto");
    setVocalGender("m");
    setFidelityPreset("balanced");
    setJobStatus("idle");
    setLogId(null);
    setGeneratedAudioUrl(null);
    setUploadProgress(0);
    setGenError(null);
    // Reset export states
    setMidiStatus("idle");
    setMidiDownloadUrl(null);
    setWavStatus("idle");
    if (midiPollRef.current) clearInterval(midiPollRef.current);
    if (wavPollRef.current) clearInterval(wavPollRef.current);
  };

  return (
    <>
      <SEO
        title="Mejora tus canciones"
        description="Sube tus demos y añade producción, extiende tu idea a una canción completa o genera nuevas versiones."
        path="/ai-studio/enhance"
      />
      <Navbar />
      <AIStudioThemeBar />
      <main className="container mx-auto px-4 py-6 pt-16 max-w-3xl">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                to="/ai-studio"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> AI Studio
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold">🎼 Mejora tus canciones</h1>
              <p className="text-muted-foreground mt-1">
                Trabaja sobre ideas musicales reales creadas por ti.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setKnowledgeOpen(true)}
              className="gap-1.5 text-muted-foreground"
            >
              <BookOpen className="w-4 h-4" /> Guía IA
            </Button>
          </div>

          {!hasEnough(creditsRequired) && <NoCreditsAlert />}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              La IA genera reinterpretaciones basadas en tu idea original. Los resultados pueden variar
              ligeramente — eso forma parte del proceso creativo.
            </AlertDescription>
          </Alert>

          {/* ── Selector de modo con tooltips ───────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              ¿Qué quieres hacer?
            </h2>
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MODES.map((mode) => (
                  <Tooltip key={mode.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => !isProcessing && setSelectedMode(mode.id)}
                        disabled={isProcessing}
                        className={cn(
                          "relative p-4 rounded-2xl border text-left transition-all text-sm hover:border-primary/40",
                          selectedMode === mode.id ? "border-primary bg-primary/5" : "border-border bg-card"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3",
                            mode.gradient
                          )}
                        >
                          {mode.icon}
                        </div>
                        <p className="font-semibold">{mode.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{mode.tagline}</p>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-semibold mb-1">Úsalo para:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs">
                        {mode.useCases.map((u) => (
                          <li key={u}>{u}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* ── Upload ──────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Tu audio
            </h2>
            <FileDropzone
              onFileSelect={handleFileSelect}
              onRemove={() => {
                setAudioFile(null);
                setAudioDuration(null);
              }}
              accept="audio/*"
              maxSize={50}
              currentFile={audioFile}
              fileType="audio"
              disabled={isProcessing}
              label="Sube tu demo"
              description="MP3, WAV, M4A — hasta 50 MB"
            />
          </div>

          {/* ── Prompt + Mejorar con IA ──────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">
                {selectedMode === "instrumental"
                  ? "Describe el estilo musical (opcional pero recomendado)"
                  : "Describe el resultado (opcional pero recomendado)"}
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImprovePrompt}
                  disabled={!prompt.trim() || isImprovingPrompt || isProcessing}
                  className="h-7 px-2 text-[10px] sm:text-xs text-primary hover:text-primary/80 hover:bg-primary/10 gap-1.5 border border-primary/20 bg-primary/5 rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {isImprovingPrompt ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('aiCreate.improving', 'Mejorando...')}
                    </>
                  ) : (
                    <>
                      <Sparkles style={{ width: 14, height: 14, color: 'hsl(var(--primary))' }} />
                      {t('aiCreate.improveWithAI', 'Mejorar con IA')}
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              disabled={isProcessing}
              placeholder={currentMode.placeholder}
              className="resize-none h-24"
            />
          </div>

          {/* ── Parámetros opcionales ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={genre} onValueChange={setGenre} disabled={isProcessing}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Género" />
              </SelectTrigger>
              <SelectContent>
                {["Pop","Rock","Electronic","Hip-hop","Jazz","Classical","Latin","R&B","Folk","Reggaeton"].map((g) => (
                  <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mood} onValueChange={setMood} disabled={isProcessing}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Mood" />
              </SelectTrigger>
              <SelectContent>
                {["Happy","Sad","Epic","Chill","Dark","Romantic","Energetic","Melancholic"].map((m) => (
                  <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={intensity} on