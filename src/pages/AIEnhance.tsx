// 🎼 Mejorar demo con IA — AI Enhance Module
// Route: /ai-studio/enhance

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { parseAiError } from "@/lib/aiErrorHandler";
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

type EnhanceMode = "instrumental" | "cover" | "extend";
type JobStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

const MODE_CREDITS: Record<EnhanceMode, number> = {
  instrumental: 3,
  cover: 4,
  extend: 3,
};

const MODES = [
  {
    id: "instrumental" as EnhanceMode,
    label: "Añadir instrumentación",
    tagline: "Transforma una melodía simple en una producción completa.",
    icon: <Layers className="w-5 h-5" />,
    gradient: "from-violet-500 to-purple-600",
    placeholder: "Añade una producción pop electrónica con bajo potente, sintetizadores y batería energética.",
  },
  {
    id: "cover" as EnhanceMode,
    label: "Nueva versión desde demo",
    tagline: "La IA trabaja sobre tu idea. Tú mantienes la autoría.",
    icon: <Repeat2 className="w-5 h-5" />,
    gradient: "from-pink-500 to-rose-500",
    placeholder: "Convierte esta demo en una balada pop cinematográfica con piano emocional y voz femenina.",
  },
  {
    id: "extend" as EnhanceMode,
    label: "Extender canción",
    tagline: "Convierte bocetos en temas completos.",
    icon: <Expand className="w-5 h-5" />,
    gradient: "from-blue-500 to-cyan-500",
    placeholder: "Extiende esta intro añadiendo una sección principal y coro con el mismo mood oscuro.",
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
  const { user } = useAuth();
  const { credits, hasEnough } = useCredits();
  const { track } = useProductTracking();
  const [knowledgeOpen, setKnowledgeOpen] = useAIKnowledgeAutoShow();

  const [selectedMode, setSelectedMode] = useState<EnhanceMode>("instrumental");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState("");
  const [voiceType, setVoiceType] = useState("");

  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [logId, setLogId] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);

  const currentMode = MODES.find((m) => m.id === selectedMode)!;
  const creditsRequired = MODE_CREDITS[selectedMode];
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
            setGenError("La generación ha fallado. Puedes intentarlo de nuevo.");
            toast.error("La generación ha fallado.");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [logId, jobStatus]);

  const uploadAudio = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    setUploadProgress(30);
    const { data, error } = await supabase.storage
      .from("ai-music-uploads")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload fallido: ${error.message}`);
    setUploadProgress(90);
    const { data: urlData } = supabase.storage.from("ai-music-uploads").getPublicUrl(data.path);
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
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const parsed = parseAiError(data);
        throw new Error(parsed.message || data.error || "Error al iniciar generación");
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

  return (
    <>
      <SEO
        title="Mejorar demo con IA"
        description="Sube tu demo y la IA añade producción, extiende tu idea o genera nuevas versiones."
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
              <h1 className="text-3xl md:text-4xl font-bold">🎼 Mejorar demo con IA</h1>
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

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              ¿Qué quieres hacer?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
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
                  <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">
                    {MODE_CREDITS[mode.id]} cr.
                  </Badge>
                </button>
              ))}
            </div>
          </div>

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">
                Describe el resultado (opcional pero recomendado)
              </label>
              <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              disabled={isProcessing}
              placeholder={currentMode.placeholder}
              className="resize-none h-24"
            />
          </div>

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
                  <a
                    href={generatedAudioUrl}
                    download="musicdibs-ai-enhance.mp3"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Descargar
                  </a>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Nueva versión
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 ¿No es exactamente lo que querías? Regenera con un prompt más específico.
                </p>
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
              Generar versión con IA
              <Badge variant="secondary" className="ml-1 text-xs">
                {creditsRequired} créditos
              </Badge>
            </Button>
          )}

          {!hasEnough(creditsRequired) && credits !== null && (
            <p className="text-center text-sm text-muted-foreground">
              <PricingLink className="text-primary hover:underline">
                Consigue más créditos
              </PricingLink>{" "}
              para usar esta función
            </p>
          )}
        </div>
      </main>
      <AIKnowledgeModal open={knowledgeOpen} onOpenChange={setKnowledgeOpen} />
    </>
  );
};

export default AIEnhance;
