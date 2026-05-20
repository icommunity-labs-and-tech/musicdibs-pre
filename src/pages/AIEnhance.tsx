// src/pages/AIEnhance.tsx
// 🎼 Mejorar demo con IA — AI Enhance Module
// Ruta: /ai-studio/enhance
//
// Patrón idéntico a AIStudioCreate.tsx:
//  - useAuth, useCredits, supabase client, parseAiError, useProductTracking
//  - FileDropzone, GenerationWarning, AIKnowledgeModal, NoCreditsAlert
//  - Navbar + AIStudioThemeBar layout
//  - Supabase Realtime para escuchar el resultado del callback de KIE

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { parseAiError } from "@/lib/aiErrorHandler";
import { FEATURE_COSTS } from "@/lib/featureCosts";
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

import {
  ArrowLeft, Wand2, Loader2, Play, Pause,
  Download, RefreshCw, CheckCircle2, X,
  Layers, Repeat2, Expand, AlertTriangle, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type EnhanceMode = "instrumental" | "cover" | "extend";
type JobStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

interface ModeConfig {
  id: EnhanceMode;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
  featureKey: keyof typeof FEATURE_COSTS;
  defaultCredits: number;
  promptPlaceholder: string;
  gradient: string;
}

// ── Configuración de modos ─────────────────────────────────────────────────────
const MODES: ModeConfig[] = [
  {
    id: "instrumental",
    labelKey: "enhance.modes.instrumental.label",
    descKey: "enhance.modes.instrumental.desc",
    icon: <Layers className="w-5 h-5" />,
    featureKey: "enhance_audio",
    defaultCredits: 3,
    promptPlaceholder: "Añade una producción pop electrónica con bajo potente, sintetizadores y batería energética.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "cover",
    labelKey: "enhance.modes.cover.label",
    descKey: "enhance.modes.cover.desc",
    icon: <Repeat2 className="w-5 h-5" />,
    featureKey: "enhance_audio",
    defaultCredits: 4,
    promptPlaceholder: "Convierte esta demo en una balada pop cinematográfica con piano emocional y voz femenina.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "extend",
    labelKey: "enhance.modes.extend.label",
    descKey: "enhance.modes.extend.desc",
    icon: <Expand className="w-5 h-5" />,
    featureKey: "enhance_audio",
    defaultCredits: 3,
    promptPlaceholder: "Extiende esta intro añadiendo una sección principal y coro con el mismo mood oscuro.",
    gradient: "from-blue-500 to-cyan-500",
  },
];

const MODE_CREDITS: Record<EnhanceMode, number> = {
  instrumental: 3,
  cover: 4,
  extend: 3,
};

// ── Mini player ────────────────────────────────────────────────────────────────
function AudioPlayer({ src, label }: { src: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a?.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
      />
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
const AIEnhance = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { credits, hasEnough } = useCredits();
  const { track } = useProductTracking();
  const [knowledgeOpen, setKnowledgeOpen] = useAIKnowledgeAutoShow();

  // ── Formulario ────────────────────────────────────────────────────────────────
  const [selectedMode, setSelectedMode] = useState<EnhanceMode>("instrumental");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState("");
  const [voiceType, setVoiceType] = useState("");

  // ── Estado del job ────────────────────────────────────────────────────────────
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [logId, setLogId] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [isDownloading, setIsDownloading] = useState(false);

  const currentMode = MODES.find((m) => m.id === selectedMode)!;
  const creditsRequired = MODE_CREDITS[selectedMode];
  const canGenerate = !!audioFile && hasEnough(creditsRequired);
  const isProcessing = jobStatus === "uploading" || jobStatus === "processing";

  // ── Track page view ───────────────────────────────────────────────────────────
  useEffect(() => {
    track("ai_studio_entered", { feature: "enhance_audio" });
  }, []);

  // ── Extraer duración al seleccionar audio ─────────────────────────────────────
  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
      URL.revokeObjectURL(url);
    };
  };

  // ── Supabase Realtime — escuchar resultado del callback de KIE ────────────────
  useEffect(() => {
    if (!logId || jobStatus !== "processing") return;

    const channel = supabase
      .channel(`enhance-log-${logId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ai_generation_logs",
          filter: `id=eq.${logId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.status === "completed" && updated.output_url) {
            setJobStatus("completed");
            setGeneratedAudioUrl(updated.output_url as string);
            toast.success("¡Tu versión IA está lista!");
            track("enhance_audio_completed", { feature: "enhance_audio", metadata: { mode: selectedMode, logId } });
          } else if (updated.status === "failed") {
            setJobStatus("failed");
            setGenError("La generación ha fallado. Puedes intentarlo de nuevo.");
            toast.error("La generación ha fallado.");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [logId, jobStatus]);

  // ── Upload a Supabase Storage ─────────────────────────────────────────────────
  const uploadAudio = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${user!.id}/${Date.now()}.${ext}`;

    setUploadProgress(30);
    const { data, error } = await supabase.storage
      .from("ai-music-uploads")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw new Error(`Upload fallido: ${error.message}`);
    setUploadProgress(90);

    const { data: urlData } = supabase.storage
      .from("ai-music-uploads")
      .getPublicUrl(data.path);

    setUploadProgress(100);
    return urlData.publicUrl;
  };

  // ── Generar ───────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!audioFile || !user) return;
    setGenError(null);

    try {
      setJobStatus("uploading");
      setUploadProgress(10);
      const sourceAudioUrl = await uploadAudio(audioFile);

      setJobStatus("processing");
      track("enhance_audio_started", { feature: "enhance_audio", metadata: { mode: selectedMode } });

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-enhance-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode: selectedMode,
            source_audio_url: sourceAudioUrl,
            source_filename: audioFile.name,
            source_duration_sec: audioDuration ?? undefined,
            prompt: prompt || undefined,
            genre: genre || undefined,
            mood: mood || undefined,
            intensity: intensity || undefined,
            voice_type: voiceType || undefined,
            source_language: sourceLanguage !== "auto" ? sourceLanguage : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const parsed = parseAiError(data);
        throw new Error(parsed.userMessage || data.error || "Error al iniciar generación");
      }

      setLogId(data.logId);
      toast.info("Generación iniciada. No cierres esta pestaña.");

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error inesperado";
      setJobStatus("failed");
      setGenError(errMsg);
      toast.error(errMsg);
      track("enhance_audio_failed", { feature: "enhance_audio", metadata: { mode: selectedMode, error: errMsg } });
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setAudioFile(null);
    setAudioDuration(null);
    setPrompt("");
    setGenre("");
    setMood("");
    setIntensity("");
    setVoiceType("");
    setJobStatus("idle");
    setLogId(null);
    setGeneratedAudioUrl(null);
    setUploadProgress(0);
    setGenError(null);
  };

  // ── Descarga con blob (cross-origin safe) ─────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <SEO
        title="Mejorar demo con IA | MusicDibs AI Studio"
        description="Sube tu demo, melodía o instrumental y deja que la IA añada producción, expanda tu idea o genere nuevas versiones."
      />

      <AIKnowledgeModal open={knowledgeOpen} onOpenChange={setKnowledgeOpen} />

      <div className="min-h-screen flex flex-col">
        <Navbar />
        <AIStudioThemeBar />

        <div className="flex-1 container max-w-3xl mx-auto px-4 py-8 space-y-6">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                to="/ai-studio"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> AI Studio
              </Link>
              <h1 className="text-2xl font-bold">🎼 Mejorar demo con IA</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Trabaja sobre ideas musicales reales creadas por ti.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setKnowledgeOpen(true)}
              className="gap-1.5 text-muted-foreground"
            >
              <BookOpen className="w-4 h-4" />
              Guía IA
            </Button>
          </div>

          {/* ── Sin créditos ─────────────────────────────────────────────────── */}
          {!hasEnough(creditsRequired) && (
            <NoCreditsAlert
              cost={creditsRequired}
            />
          )}

          {/* ── Aviso reinterpretación ────────────────────────────────────────── */}
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
              La IA genera reinterpretaciones basadas en tu idea original. Los resultados
              pueden variar ligeramente — eso forma parte del proceso creativo.
            </AlertDescription>
          </Alert>

          {/* ── Selector de modo ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">¿Qué quieres hacer?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => !isProcessing && setSelectedMode(mode.id)}
                  disabled={isProcessing}
                  className={cn(
                    "relative p-4 rounded-2xl border text-left transition-all text-sm",
                    "hover:border-primary/40",
                    selectedMode === mode.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
                    `bg-gradient-to-br ${mode.gradient} text-white`
                  )}>
                    {mode.icon}
                  </div>
                  <p className="font-semibold leading-tight">
                    {t(mode.labelKey, mode.id === "instrumental" ? "Añadir instrumentación"
                      : mode.id === "cover" ? "Nueva versión desde demo" : "Extender canción")}
                  </p>
                  <Badge
                    variant="secondary"
                    className="absolute top-3 right-3 text-[10px]"
                  >
                    {MODE_CREDITS[mode.id]} cr.
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* ── Upload ──────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Tu audio</p>
            <FileDropzone
              onFileSelect={handleFileSelect}
              onRemove={isProcessing ? undefined : handleReset}
              currentFile={audioFile}
              accept=".mp3,.wav,.m4a,.ogg"
              maxSize={50}
              fileType="audio"
              label="Sube tu demo, melodía, instrumental o nota de voz"
              description="MP3, WAV, M4A — máx 50MB"
              disabled={isProcessing}
            />
          </div>

          {/* ── Prompt ──────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Describe el resultado{" "}
                <span className="text-muted-foreground/50 font-normal">(opcional pero recomendado)</span>
              </p>
              <span className="text-xs text-muted-foreground/50">{prompt.length}/500</span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              disabled={isProcessing}
              placeholder={currentMode.promptPlaceholder}
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
                {["Pop", "Rock", "Electronic", "Hip-hop", "Jazz", "Classical", "Latin", "R&B", "Folk", "Reggaeton"].map(
                  (g) => <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={mood} onValueChange={setMood} disabled={isProcessing}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Mood" />
              </SelectTrigger>
              <SelectContent>
                {["Happy", "Sad", "Epic", "Chill", "Dark", "Romantic", "Energetic", "Melancholic"].map(
                  (m) => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                )}
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

            {selectedMode !== "extend" && (
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
            )}
          </div>

          {/* ── Idioma vocal (cover / extend) ───────────────────────────────────── */}
          {(selectedMode === "cover" || selectedMode === "extend") && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Idioma de la voz en el audio</p>
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

          {/* ── GenerationWarning (misma que resto del studio) ────────────────── */}
          {isProcessing && <GenerationWarning />}

          {/* ── Progreso ─────────────────────────────────────────────────────── */}
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

          {/* ── Resultado ────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {jobStatus === "completed" && generatedAudioUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  ¡Tu versión IA está lista!
                </div>
                <AudioPlayer src={generatedAudioUrl} label="Versión generada con IA" />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="gap-2"
                  >
                    {isDownloading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Download className="w-4 h-4" />}
                    {isDownloading ? "Descargando..." : "Descargar"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Nueva versión
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 ¿No es exactamente lo que querías? Regenera con un prompt más específico.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Error ────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {jobStatus === "failed" && genError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3"
              >
                <X className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">{genError}</p>
                  <p className="text-xs text-muted-foreground">
                    No se han descontado créditos adicionales.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="gap-2 h-7 px-2 text-xs mt-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Intentar de nuevo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Botón principal ───────────────────────────────────────────────── */}
          {jobStatus === "idle" && (
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full h-12 gap-2 text-base font-semibold"
              size="lg"
            >
              <Wand2 className="w-5 h-5" />
              Generar versión con IA
              <Badge variant="secondary" className="ml-1 text-xs">
                {creditsRequired} créditos
              </Badge>
            </Button>
          )}

          {/* ── Link comprar créditos ─────────────────────────────────────────── */}
          {!hasEnough(creditsRequired) && credits !== null && (
            <p className="text-center text-sm text-muted-foreground">
              <PricingLink className="text-primary hover:underline" />
              {" "}para usar esta función
            </p>
          )}

        </div>
      </div>
    </>
  );
};

export default AIEnhance;
