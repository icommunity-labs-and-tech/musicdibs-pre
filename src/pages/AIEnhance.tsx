// 🎼 Mejorar demo con IA — AI Enhance Module
// Route: /ai-studio/enhance
// v2 — blob download fix + language selector (cover/extend) + source_language param

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
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnhanceMode = "instrumental" | "cover" | "extend";
type JobStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

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
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a?.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
      />
      <Button size="icon" variant="default" onClick={toggle} className="h-10 w-10 rounded-full shrink-0">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <Progress value={progress} className="h-1 mt-1" />
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
  // ── NEW: idioma vocal + estado de descarga ────────────────────────────────────
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [isDownloading, setIsDownloading] = useState(false);

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
            voice_type: voiceType || undefined,
            // ── NEW: idioma vocal explícito para preservar idioma en cover/extend
            source_language: sourceLanguage !== "auto" ? sourceLanguage : undefined,
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

  const handleReset = () => {
    setAudioFile(null);
    setAudioDuration(null);
    setPrompt("");
    setGenre("");
    setMood("");
    setIntensity("");
    setVoiceType("");
    setSourceLanguage("auto");
    setJobStatus("idle");
    setLogId(null);
    setGeneratedAudioUrl(null);
    setUploadProgress(0);
    setGenError(null);
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
                Describe el resultado (opcional pero recomendado)
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

          {/* ── NEW: Selector de idioma vocal (solo cover / extend) ───────────── */}
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
                  {/* ── NEW: blob download — abre diálogo nativo, no nueva pestaña */}
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
                    <RefreshCw className="w-4 h-4" /> Nueva versión
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 ¿No es exactamente lo que querías? Regenera con un prompt más específico.
                </p>
                <Alert className="border-primary/30 bg-primary/5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs">
                    Esta nueva versión queda guardada para siempre en tu{" "}
                    <Link to="/dashboard/media-library" className="text-primary font-medium hover:underline">
                      biblioteca de medios
                    </Link>
                    . Podrás escucharla, descargarla o usarla en futuros registros cuando quieras.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

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
                    <RefreshCw className="w-3 h-3" /> Intentar de nuevo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {jobStatus === "idle" && (
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full h-12 gap-2 text-base font-semibold"
              size="lg"
            >
              <Wand2 className="w-5 h-5" />
              Generar versión
            </Button>
          )}

          <div className="text-center text-xs text-muted-foreground">
            <PricingLink className="text-primary hover:underline" />
            <span className="ml-1">Consulta el detalle de créditos por operación</span>
          </div>
        </div>
      </main>
      <AIKnowledgeModal open={knowledgeOpen} onOpenChange={setKnowledgeOpen} />
    </>
  );
};

export default AIEnhance;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       