// 🎼 Mejorar demo con IA — AI Enhance Module
// Route: /ai-studio/enhance
// v3 — vocalGender toggle + fidelity presets (faithful/balanced/creative) for instrumental mode
// v4 — add_vocals mode: añadir voz a un instrumental via KIE /api/v1/generate/add-vocals

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
  FileMusic, FileAudio, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnhanceMode = "instrumental" | "cover" | "extend" | "add_vocals";
type JobStatus = "idle" | "uploading" | "processing" | "completed" | "failed";
type FidelityPreset = "faithful" | "balanced" | "creative";

const FIDELITY_PRESETS: Record<FidelityPreset, {
  audio_weight: number;
  style_weight: number;
  weirdness_constraint: number;
  labelKey: string;
  descKey: string;
}> = {
  faithful: {
    audio_weight: 0.80, style_weight: 0.50, weirdness_constraint: 0.20,
    labelKey: "aiEnhance.fidelityFaithfulLabel",
    descKey: "aiEnhance.fidelityFaithfulDesc",
  },
  balanced: {
    audio_weight: 0.65, style_weight: 0.65, weirdness_constraint: 0.40,
    labelKey: "aiEnhance.fidelityBalancedLabel",
    descKey: "aiEnhance.fidelityBalancedDesc",
  },
  creative: {
    audio_weight: 0.40, style_weight: 0.80, weirdness_constraint: 0.75,
    labelKey: "aiEnhance.fidelityCreativeLabel",
    descKey: "aiEnhance.fidelityCreativeDesc",
  },
};

const MODE_FEATURE_KEY: Record<EnhanceMode, string> = {
  instrumental: "enhance_instrumental",
  cover: "enhance_cover",
  extend: "enhance_extend",
  add_vocals: "enhance_add_vocals",
};

const MODES = [
  {
    id: "instrumental" as EnhanceMode,
    labelKey: "aiEnhance.modeInstrumentalLabel",
    taglineKey: "aiEnhance.modeInstrumentalTagline",
    icon: <Layers className="w-5 h-5" />,
    gradient: "from-violet-500 to-purple-600",
    placeholderKey: "aiEnhance.modeInstrumentalPlaceholder",
    useCaseKeys: [
      "aiEnhance.modeInstrumentalUseCase1",
      "aiEnhance.modeInstrumentalUseCase2",
    ],
  },
  {
    id: "cover" as EnhanceMode,
    labelKey: "aiEnhance.modeCoverLabel",
    taglineKey: "aiEnhance.modeCoverTagline",
    icon: <Repeat2 className="w-5 h-5" />,
    gradient: "from-pink-500 to-rose-500",
    placeholderKey: "aiEnhance.modeCoverPlaceholder",
    useCaseKeys: [
      "aiEnhance.modeCoverUseCase1",
      "aiEnhance.modeCoverUseCase2",
      "aiEnhance.modeCoverUseCase3",
      "aiEnhance.modeCoverUseCase4",
    ],
  },
  {
    id: "extend" as EnhanceMode,
    labelKey: "aiEnhance.modeExtendLabel",
    taglineKey: "aiEnhance.modeExtendTagline",
    icon: <Expand className="w-5 h-5" />,
    gradient: "from-blue-500 to-cyan-500",
    placeholderKey: "aiEnhance.modeExtendPlaceholder",
    useCaseKeys: [
      "aiEnhance.modeExtendUseCase1",
      "aiEnhance.modeExtendUseCase2",
      "aiEnhance.modeExtendUseCase3",
    ],
  },
  {
    id: "add_vocals" as EnhanceMode,
    labelKey: "aiEnhance.modeAddVocalsLabel",
    taglineKey: "aiEnhance.modeAddVocalsTagline",
    icon: <Mic className="w-5 h-5" />,
    gradient: "from-emerald-500 to-teal-500",
    placeholderKey: "aiEnhance.modeAddVocalsPlaceholder",
    useCaseKeys: [
      "aiEnhance.modeAddVocalsUseCase1",
      "aiEnhance.modeAddVocalsUseCase2",
      "aiEnhance.modeAddVocalsUseCase3",
    ],
  },
];

function AudioPlayer({ src, label }: { src: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause(); else a.play();
    setPlaying(!playing);
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
          ? <p className="text-xs text-destructive mt-1">{label}</p>
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

  // ── MIDI export ────────────────────────────────────────────────────────────
  const [midiStatus, setMidiStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [midiDownloadUrl, setMidiDownloadUrl] = useState<string | null>(null);
  const midiPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── WAV export ─────────────────────────────────────────────────────────────
  const [wavStatus, setWavStatus] = useState<"idle" | "loading" | "error">("idle");
  const wavPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── quality params — instrumental + extend ───────────────────────────────
  const [vocalGender, setVocalGender] = useState<"m" | "f">("m");
  const [fidelityPreset, setFidelityPreset] = useState<FidelityPreset>("balanced");
  const [continueAt, setContinueAt] = useState<number | null>(null); // extend: punto de continuación (s)

  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [logId, setLogId] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);

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
            voice_type: selectedMode === "cover" ? (voiceType || undefined) : undefined,
            source_language: sourceLanguage !== "auto" ? sourceLanguage : undefined,
            // ── quality params: instrumental + extend (with vocalGender toggle) ──
            ...((selectedMode === "instrumental" || selectedMode === "extend") && {
              vocal_gender: vocalGender,
              audio_weight: FIDELITY_PRESETS[fidelityPreset].audio_weight,
              style_weight: FIDELITY_PRESETS[fidelityPreset].style_weight,
              weirdness_constraint: FIDELITY_PRESETS[fidelityPreset].weirdness_constraint,
            }),
            // ── quality params: cover (voice_type sent separately, no vocal_gender) ─
            ...(selectedMode === "cover" && {
              audio_weight: FIDELITY_PRESETS[fidelityPreset].audio_weight,
              style_weight: FIDELITY_PRESETS[fidelityPreset].style_weight,
              weirdness_constraint: FIDELITY_PRESETS[fidelityPreset].weirdness_constraint,
            }),
            // ── quality params: add_vocals (vocalGender controls singing voice gender) ─
            ...(selectedMode === "add_vocals" && {
              vocal_gender: vocalGender,
              audio_weight: FIDELITY_PRESETS[fidelityPreset].audio_weight,
              style_weight: FIDELITY_PRESETS[fidelityPreset].style_weight,
              weirdness_constraint: FIDELITY_PRESETS[fidelityPreset].weirdness_constraint,
            }),
            // ── extend: punto de continuación personalizado ───────────────────
            ...(selectedMode === "extend" && continueAt !== null && {
              continue_at: continueAt,
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

  // ── NEW: descarga cross-origin segura (fetch → blob → diálogo nativo) ─────────
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

  // ── Descarga WAV on-demand (conversión client-side con Web Audio API) ─────
  const handleExportWav = async () => {
    if (!generatedAudioUrl || wavStatus === "loading") return;
    setWavStatus("loading");
    try {
      const { audioUrlToWavBlob } = await import("@/lib/audioToWav");
      const blob = await audioUrlToWavBlob(generatedAudioUrl);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "musicdibs-enhance.wav";
      a.click();
      URL.revokeObjectURL(a.href);
      setWavStatus("idle");
      toast.success("Archivo WAV descargado");
    } catch (e: unknown) {
      setWavStatus("error");
      const err = e as Error;
      toast.error(err?.message || "Error al exportar WAV");
    }
  };


  const triggerWavDownload = (url: string) => {
    try {
      fetch(url)
        .then((r) => r.blob())
        .then((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "musicdibs-enhance.wav";
          a.click();
          URL.revokeObjectURL(a.href);
          toast.success("Archivo WAV descargado");
        });
    } catch {
      window.open(url, "_blank");
      toast.success("WAV listo — revisa las descargas");
    }
  };

  // ── Exportar MIDI ──────────────────────────────────────────────────────────
  const handleExportMidi = async () => {
    if (!logId || midiStatus === "loading") return;
    setMidiStatus("loading");
    setMidiDownloadUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-midi-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ source_log_id: logId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "insufficient_credits") {
          const midiCost = getFeatureCost("midi_generate");
          toast.error(`No tienes suficientes créditos para exportar MIDI (${midiCost} créditos).`);
        } else if (data?.code === "no_provider_task_id") {
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
        if (attempts > 48) {
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
        if (row?.status === "failed") {
          clearInterval(midiPollRef.current!);
          setMidiStatus("error");
          toast.error("Error al generar el MIDI. No se han descontado créditos.");
        }
        if (row?.status === "completed" && row?.output_url) {
          clearInterval(midiPollRef.current!);
          let midiUrl = row.output_url as string;
          try {
            const parsed = JSON.parse(midiUrl);
            if (parsed?.midi_files?.[0]) midiUrl = parsed.midi_files[0];
          } catch { /* not JSON, use as-is */ }
          setMidiDownloadUrl(midiUrl);
          setMidiStatus("ready");
          toast.success("¡MIDI listo para descargar!");
        }
      }, 5000);
    } catch (e: unknown) {
      setMidiStatus("error");
      const err = e as Error;
      toast.error(err?.message || "Error al exportar MIDI");
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
    setMidiStatus("idle");
    setMidiDownloadUrl(null);
    if (midiPollRef.current) clearInterval(midiPollRef.current);
    setWavStatus("idle");
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-stretch">
                {MODES.map((mode) => {
                  const isFeatured = mode.id === "instrumental";
                  const isSelected = selectedMode === mode.id;
                  return (
                  <Tooltip key={mode.id}>
                    <TooltipTrigger asChild>
                      <div className={cn("relative group", isFeatured && "sm:-my-1")}>
                        {isFeatured && (
                          <>
                            {/* Glow halo animado */}
                            <div
                              aria-hidden
                              className="pointer-events-none absolute -inset-[3px] rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 opacity-70 blur-md animate-pulse"
                            />
                            {/* Borde gradiente nítido */}
                            <div
                              aria-hidden
                              className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600"
                            />
                            {/* Badge Recomendado */}
                            <div className="absolute -top-2.5 left-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-violet-500/40">
                              <Sparkles className="h-3 w-3" />
                              Recomendado
                            </div>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => !isProcessing && setSelectedMode(mode.id)}
                          disabled={isProcessing}
                          className={cn(
                            "relative w-full h-full p-4 rounded-2xl border text-left transition-all text-sm hover:border-primary/40",
                            isFeatured
                              ? "bg-gradient-to-br from-violet-50 via-card to-fuchsia-50 dark:from-violet-950/40 dark:via-card dark:to-fuchsia-950/30 border-transparent shadow-xl shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5"
                              : isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card"
                          )}
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3 transition-transform",
                              mode.gradient,
                              isFeatured && "w-12 h-12 shadow-lg shadow-violet-500/40 group-hover:scale-110 group-hover:rotate-3"
                            )}
                          >
                            {mode.icon}
                          </div>
                          <p className={cn("font-semibold", isFeatured && "text-base bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent")}>
                            {t(mode.labelKey)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{t(mode.taglineKey)}</p>
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-semibold mb-1">{t('aiEnhance.useFor')}</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs">
                        {mode.useCaseKeys.map((u) => (
                          <li key={u}>{t(u)}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                  );
                })}
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
              description="MP3, WAV, OGG o FLAC— hasta 50 MB"
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
              placeholder={t(currentMode.placeholderKey)}
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
            <Select value={intensity} onValueChange={setIntensity} disabled={isProcessing}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Intensidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Suave</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Intensa</SelectItem>
              </SelectContent>
            </Select>
            {(selectedMode === "instrumental" || selectedMode === "extend" || selectedMode === "add_vocals") ? (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => !isProcessing && setVocalGender("m")}
                  disabled={isProcessing}
                  className={cn(
                    "flex-1 h-9 rounded-md border text-sm font-medium transition-all",
                    vocalGender === "m"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  ♂ Hombre
                </button>
                <button
                  type="button"
                  onClick={() => !isProcessing && setVocalGender("f")}
                  disabled={isProcessing}
                  className={cn(
                    "flex-1 h-9 rounded-md border text-sm font-medium transition-all",
                    vocalGender === "f"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  ♀ Mujer
                </button>
              </div>
            ) : selectedMode === "cover" ? (
              <Select value={voiceType} onValueChange={setVoiceType} disabled={isProcessing}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Voz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Femenina</SelectItem>
                  <SelectItem value="male">Masculina</SelectItem>
                  <SelectItem value="none">Sin voz</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>

          {/* ── Fidelidad al original (todos los modos) ─────────────────────── */}
          {(selectedMode === "instrumental" || selectedMode === "extend" || selectedMode === "cover" || selectedMode === "add_vocals") && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">
                {selectedMode === "extend" ? "Estilo de extensión" : selectedMode === "cover" ? "Estilo de la versión" : selectedMode === "add_vocals" ? "Estilo vocal" : "Fidelidad al original"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(FIDELITY_PRESETS) as [FidelityPreset, typeof FIDELITY_PRESETS[FidelityPreset]][]).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => !isProcessing && setFidelityPreset(key)}
                    disabled={isProcessing}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      fidelityPreset === key
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <p className="text-sm font-semibold">{t(preset.labelKey)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(preset.descKey)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Punto de continuación (solo extend, si conocemos duración) ────── */}
          {selectedMode === "extend" && audioDuration !== null && audioDuration > 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-muted-foreground">
                  Extender desde
                </label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {continueAt !== null ? `${continueAt}s` : `${Math.floor(audioDuration * 0.9)}s (auto)`}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.floor(audioDuration - 1)}
                step={1}
                value={continueAt ?? Math.floor(audioDuration * 0.9)}
                onChange={(e) => !isProcessing && setContinueAt(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground/70">
                La IA continuará el audio desde este segundo. Por defecto: 90% de la duración ({Math.floor(audioDuration * 0.9)}s de {Math.floor(audioDuration)}s).
              </p>
            </div>
          )}

          {/* ── Selector de idioma vocal (solo cover / extend) ───────────────── */}
          {(selectedMode === "cover" || selectedMode === "extend") && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">
                Idioma de la voz en el audio
              </label>
              <Select value={sourceLanguage} onValueChange={setSourceLanguage} disabled={isProcessing}>
                <SelectTrigger className="h-9 text-sm max-w-[240px]">
                  <SelectValue placeholder="Idioma del audio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Detectar automáticamente</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground/70">
                Si tu audio tiene voz, selecciona el idioma para que la IA lo preserve en la versión generada.
              </p>
            </div>
          )}


          {/* ── Botón principal de generación ───────────────────────────────── */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isProcessing}
            className="w-full gap-2"
            size="lg"
          >
            {isProcessing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Wand2 className="w-4 h-4" />}
            {isProcessing
              ? "Generando..."
              : `Generar versión${creditsRequired > 0 ? ` (${creditsRequired} cr)` : ""}`}
          </Button>
          {isProcessing && <GenerationWarning />}

          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  {jobStatus === "uploading"
                    ? "Subiendo tu audio..."
                    : "La IA está trabajando sobre tu demo. Puede tardar 2-4 minutos..."}
                </div>
                <Progress
                  value={jobStatus === "uploading" ? uploadProgress : undefined}
                  className="h-1.5"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {jobStatus === "completed" && generatedAudioUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle2 className="w-5 h-5" /> ¡Tu versión IA está lista!
                </div>
                <AudioPlayer src={generatedAudioUrl} label="Versión generada con IA" />
                <div className="flex gap-2 flex-wrap">
                  {/* ── MP3 download */}
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="gap-2"
                  >
                    {isDownloading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Download className="w-4 h-4" />}
                    {isDownloading ? "Descargando..." : "MP3"}
                  </Button>

                  {/* ── WAV export */}
                  <Button
                    variant="outline"
                    onClick={handleExportWav}
                    disabled={wavStatus === "loading"}
                    className="gap-2"
                  >
                    {wavStatus === "loading"
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <FileAudio className="w-4 h-4" />}
                    {wavStatus === "loading" ? "Exportando..." : "WAV"}
                  </Button>

                  {/* ── MIDI export */}
                  {midiDownloadUrl ? (
                    <Button asChild variant="outline" className="gap-2">
                      <a href={midiDownloadUrl} download>
                        <FileMusic className="w-4 h-4" /> Descargar MIDI
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleExportMidi}
                      disabled={midiStatus === "loading"}
                      className="gap-2"
                    >
                      {midiStatus === "loading"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <FileMusic className="w-4 h-4" />}
                      {midiStatus === "loading" ? "Generando MIDI..." : `MIDI${getFeatureCost("midi_generate") > 0 ? ` (${getFeatureCost("midi_generate")} cr)` : ""}`}
                    </Button>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Crear otra versión
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
};

export default AIEnhance;

     