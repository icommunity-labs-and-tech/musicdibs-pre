import { useState, useEffect, useRef } from "react";
import { parseAiError } from "@/lib/aiErrorHandler";
import { FileDropzone } from '@/components/FileDropzone';
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProductTracking } from "@/hooks/useProductTracking";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Loader2, Play, Pause, Download,
  Music, Sparkles, CheckCircle2, AlertTriangle,
  Headphones, Volume2, RefreshCw, Upload, Gift
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

import { useCredits } from "@/hooks/useCredits";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { FEATURE_COSTS } from "@/lib/featureCosts";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { GenerationPicker } from "@/components/ai-studio/GenerationPicker";

// ROEX musical style presets (from Tonn API spec)
const STYLE_PRESETS = [
  { value: 'POP', label: 'Pop' },
  { value: 'ROCK_INDIE', label: 'Rock / Indie' },
  { value: 'HIPHOP_GRIME', label: 'Hip-Hop / Grime' },
  { value: 'ELECTRONIC', label: 'Electrónica' },
  { value: 'ACOUSTIC', label: 'Acústica' },
  { value: 'REGGAE_DUB', label: 'Reggae / Dub' },
  { value: 'ORCHESTRAL', label: 'Orquestal' },
  { value: 'METAL', label: 'Metal' },
  { value: 'OTHER', label: 'Otro' },
] as const;

const LOUDNESS_PRESETS = [
  { value: 'LOW', label: 'Suave (-14 LUFS)', hint: 'Ideal para Spotify' },
  { value: 'MEDIUM', label: 'Medio (-10 LUFS)', hint: 'Streaming general' },
  { value: 'HIGH', label: 'Alto (-8 LUFS)', hint: 'Máxima presencia' },
] as const;

type StyleValue = typeof STYLE_PRESETS[number]['value'];
type LoudnessValue = typeof LOUDNESS_PRESETS[number]['value'];

// Formatos de audio aceptados por la API de ROEX
const ALLOWED_AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'] as const;
const ALLOWED_AUDIO_ACCEPT = '.mp3,.wav,.flac,.aac,.m4a,.ogg,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/aac,audio/mp4,audio/x-m4a,audio/ogg';

const AIStudioEdit = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasEnough } = useCredits();
  const { track } = useProductTracking();
  const tr = (key: string, opts?: any) => t(`masterize.${key}`, opts) as string;

  const [sourceTab, setSourceTab] = useState<string>("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);

  // Presets
  const [musicalStyle, setMusicalStyle] = useState<StyleValue>('POP');
  const [desiredLoudness, setDesiredLoudness] = useState<LoudnessValue>('MEDIUM');

  // Mastering task state
  const [taskId, setTaskId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);

  // Loading/progress
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // A/B comparison
  const [playingTrack, setPlayingTrack] = useState<"original" | "preview" | "mastered" | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { stopPolling(); stopProgress(); }, []);

  const stopPolling = () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  const stopProgress = () => { if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; } };

  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
    resetResults();
  };

  const handleGenerationSelect = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], name, { type: blob.type || "audio/mpeg" });
      setAudioFile(file);
      setAudioUrl(url);
      setAudioName(name);
      resetResults();
    } catch {
      toast({ title: t("masterize.errorGeneric", "Error al cargar el audio"), variant: "destructive" });
    }
  };

  const resetResults = () => {
    setTaskId(null);
    setPreviewUrl(null);
    setFinalUrl(null);
    setProcessError(null);
    setProgressPercent(0);
    stopAllAudio();
  };

  const handleRemoveFile = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setAudioName(null);
    resetResults();
  };

  const stopAllAudio = () => {
    originalAudioRef.current?.pause();
    previewAudioRef.current?.pause();
    masteredAudioRef.current?.pause();
    setPlayingTrack(null);
  };

  // Upload audio to a temp public URL so ROEX can fetch it
  const uploadForRoex = async (file: File): Promise<string> => {
    const safeName = file.name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").toLowerCase();
    const path = `roex/${user!.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("auphonic-temp").upload(path, file, { upsert: true });
    if (error) throw new Error(`Upload error: ${error.message}`);
    // Bucket is private — use a signed URL so the edge function (and ROEX) can fetch it
    const { data, error: signErr } = await supabase.storage.from("auphonic-temp").createSignedUrl(path, 60 * 60);
    if (signErr || !data?.signedUrl) throw new Error(`Signed URL error: ${signErr?.message || 'unknown'}`);
    return data.signedUrl;
  };

  // ============================================================
  // FREE PREVIEW (no credits)
  // ============================================================
  const handleListenPreview = async () => {
    if (!audioFile || !user) return;
    track('enhance_audio_started', { feature: 'enhance_audio', metadata: { mode: 'preview', style: musicalStyle, loudness: desiredLoudness } });
    setIsPreviewing(true);
    setProcessError(null);
    setPreviewUrl(null);
    setFinalUrl(null);
    setProgressPercent(0);
    stopAllAudio();

    progressRef.current = setInterval(() => {
      setProgressPercent(prev => prev >= 90 ? 90 : prev + Math.random() * 4);
    }, 1500);

    try {
      const uploadedUrl = await uploadForRoex(audioFile);
      const { data, error } = await supabase.functions.invoke("roex-master", {
        body: {
          action: "preview",
          audioUrl: uploadedUrl,
          filename: audioFile.name,
          musicalStyle,
          desiredLoudness,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'roex_preview_failed');

      const newTaskId: string | undefined = data.taskId;
      if (!newTaskId) throw new Error('no_task_id');
      setTaskId(newTaskId);

      // Poll for preview URL
      pollingRef.current = setInterval(async () => {
        try {
          const { data: st, error: stErr } = await supabase.functions.invoke("roex-master", {
            body: { action: "preview_status", taskId: newTaskId },
          });
          if (stErr) return;
          if (st?.status === 'done' && st.previewUrl) {
            stopPolling();
            stopProgress();
            setProgressPercent(100);
            setTimeout(() => {
              setPreviewUrl(st.previewUrl);
              setIsPreviewing(false);
              toast({ title: 'Preview lista 🎧', description: 'Escucha cómo sonaría tu master.' });
              track('enhance_audio_completed', { feature: 'enhance_audio', metadata: { mode: 'preview' } });
            }, 400);
          } else if (st?.status === 'error') {
            stopPolling(); stopProgress();
            setIsPreviewing(false);
            setProcessError(st.error || 'Error generando la preview');
          }
        } catch { /* keep polling */ }
      }, 6000);

      // 4-min timeout
      setTimeout(() => {
        if (pollingRef.current) {
          stopPolling(); stopProgress();
          setIsPreviewing(false);
          setProcessError(tr('errorTimeout'));
        }
      }, 240_000);

    } catch (err: any) {
      stopProgress();
      setIsPreviewing(false);
      const responseData = err?.context?.body || err?.context || null;
      const { userMessage } = parseAiError(err, responseData);
      setProcessError(userMessage);
      track('enhance_audio_failed', { feature: 'enhance_audio', metadata: { mode: 'preview', reason: err?.message || 'unknown' } });
    }
  };

  // ============================================================
  // FINAL MASTER (consumes credits)
  // ============================================================
  const handleGetFinal = async () => {
    if (!taskId || !user) return;
    if (!hasEnough(FEATURE_COSTS.enhance_audio)) {
      toast({ title: t('aiShared.noCredits'), variant: "destructive" });
      return;
    }

    track('enhance_audio_started', { feature: 'enhance_audio', metadata: { mode: 'final' } });
    setIsFinalizing(true);
    setProcessError(null);

    try {
      // Retry loop in case the master is still processing
      let attempts = 0;
      while (attempts < 30) {
        const { data, error } = await supabase.functions.invoke("roex-master", {
          body: { action: "final", taskId },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (data?.success && data.finalUrl) {
          setFinalUrl(data.finalUrl);
          toast({ title: tr('success.title') });
          track('enhance_audio_completed', { feature: 'enhance_audio' });
          setIsFinalizing(false);
          return;
        }
        if (data?.status === 'processing') {
          await new Promise(r => setTimeout(r, 5000));
          attempts++;
          continue;
        }
        throw new Error('roex_unknown_response');
      }
      throw new Error('roex_final_timeout');
    } catch (err: any) {
      setIsFinalizing(false);
      const responseData = err?.context?.body || err?.context || null;
      const { userMessage } = parseAiError(err, responseData);
      setProcessError(userMessage);
      track('enhance_audio_failed', { feature: 'enhance_audio', metadata: { reason: err?.message || 'unknown' } });
    }
  };

  const playAudio = (which: "original" | "preview" | "mastered") => {
    originalAudioRef.current?.pause();
    previewAudioRef.current?.pause();
    masteredAudioRef.current?.pause();

    if (playingTrack === which) { setPlayingTrack(null); return; }

    const map: Record<typeof which, { ref: typeof originalAudioRef; src: string | null }> = {
      original: { ref: originalAudioRef, src: audioUrl },
      preview: { ref: previewAudioRef, src: previewUrl },
      mastered: { ref: masteredAudioRef, src: finalUrl },
    };
    const { ref, src } = map[which];
    if (!src) return;
    if (!ref.current) {
      ref.current = new Audio(src);
      ref.current.onended = () => setPlayingTrack(null);
    }
    ref.current.currentTime = 0;
    ref.current.play();
    setPlayingTrack(which);
  };

  const handleReset = () => {
    stopAllAudio();
    originalAudioRef.current = null;
    previewAudioRef.current = null;
    masteredAudioRef.current = null;
    setAudioFile(null);
    setAudioUrl(null);
    setAudioName(null);
    resetResults();
  };

  const isBusy = isPreviewing || isFinalizing;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-6 pt-20 max-w-2xl">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiEdit.backToStudio')}
        </Link>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{tr('title')}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">{tr('subtitle')}</p>
        </div>

        <div className="space-y-6">
          {/* Upload */}
          {!finalUrl && !isBusy && (
            <Card>
              <CardContent className="p-6">
                {!audioFile ? (
                  <Tabs value={sourceTab} onValueChange={setSourceTab}>
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="upload" className="flex-1 gap-2">
                        <Upload className="w-4 h-4" />
                        {t('masterize.tabUpload', 'Subir archivo')}
                      </TabsTrigger>
                      <TabsTrigger value="library" className="flex-1 gap-2">
                        <Music className="w-4 h-4" />
                        {t('masterize.tabLibrary', 'Mis canciones')}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload">
                      <FileDropzone
                        fileType="audio"
                        accept="audio/*"
                        maxSize={50}
                        label={tr('uploadLabel')}
                        description={tr('uploadDescription')}
                        currentFile={audioFile}
                        onFileSelect={handleFileSelect}
                        onRemove={handleRemoveFile}
                      />
                    </TabsContent>

                    <TabsContent value="library">
                      <GenerationPicker onSelect={handleGenerationSelect} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <>
                    <FileDropzone
                      fileType="audio"
                      accept="audio/*"
                      maxSize={50}
                      label={tr('uploadLabel')}
                      description={tr('uploadDescription')}
                      currentFile={audioFile}
                      onFileSelect={handleFileSelect}
                      onRemove={handleRemoveFile}
                    />

                    {audioUrl && (
                      <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Button
                            variant="outline" size="icon"
                            className="shrink-0 rounded-full"
                            onClick={() => playAudio('original')}
                          >
                            {playingTrack === 'original' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{audioName || audioFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <audio src={audioUrl} className="w-full h-8" controls />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Presets — visible whenever a file is loaded and we don't have the final yet */}
          {audioFile && !isBusy && !finalUrl && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Estilo musical
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_PRESETS.map(p => (
                      <Button
                        key={p.value}
                        variant={musicalStyle === p.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setMusicalStyle(p.value); setPreviewUrl(null); setTaskId(null); }}
                        className="rounded-full"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" /> Volumen objetivo
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {LOUDNESS_PRESETS.map(p => (
                      <Button
                        key={p.value}
                        variant={desiredLoudness === p.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setDesiredLoudness(p.value); setPreviewUrl(null); setTaskId(null); }}
                        className="flex-col h-auto py-2"
                      >
                        <span className="text-xs font-semibold">{p.label}</span>
                        <span className="text-[10px] opacity-70 font-normal">{p.hint}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTA: free preview */}
          {audioFile && !isBusy && !previewUrl && !finalUrl && (
            <Button
              onClick={handleListenPreview}
              className="w-full h-14 text-base gap-3"
              variant="hero"
              size="lg"
            >
              <Gift className="w-5 h-5" />
              Escuchar preview gratis
            </Button>
          )}

          {/* Processing state */}
          {isPreviewing && (
            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold">Generando tu preview…</p>
                    <p className="text-sm text-muted-foreground">Sin coste — solo escuchas un fragmento</p>
                  </div>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </CardContent>
            </Card>
          )}

          {isFinalizing && (
            <Card className="border-primary/20">
              <CardContent className="p-6 flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <div>
                  <p className="font-semibold">Generando master final…</p>
                  <p className="text-sm text-muted-foreground">Procesando la pista completa</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {processError && !isBusy && (
            <Card className="border-destructive/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3 text-destructive">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{processError}</p>
                </div>
                {audioFile && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => { setProcessError(null); previewUrl ? handleGetFinal() : handleListenPreview(); }}
                    className="gap-2 w-full"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('aiShared.retry', 'Reintentar')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview ready (free) — show A/B and CTA to get final master */}
          {previewUrl && !finalUrl && (
            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Gift className="w-6 h-6 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold">Tu preview gratis está lista</h2>
                      <p className="text-xs text-muted-foreground">Es un fragmento del master — gratis y sin créditos</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Button
                        variant="outline" size="icon" className="shrink-0 rounded-full"
                        onClick={() => playAudio('preview')}
                      >
                        {playingTrack === 'preview' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <div>
                        <p className="text-sm font-medium">Preview masterizada</p>
                        <p className="text-xs text-muted-foreground">
                          {STYLE_PRESETS.find(s => s.value === musicalStyle)?.label} · {LOUDNESS_PRESETS.find(l => l.value === desiredLoudness)?.label}
                        </p>
                      </div>
                    </div>
                    <audio src={previewUrl} className="w-full h-8" controls />
                  </div>

                  {/* A/B */}
                  {audioUrl && (
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={playingTrack === 'original' ? "default" : "outline"} size="sm"
                        onClick={() => playAudio('original')} className="gap-2 flex-1"
                      >
                        {playingTrack === 'original' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {tr('success.original')}
                      </Button>
                      <Button
                        variant={playingTrack === 'preview' ? "default" : "outline"} size="sm"
                        onClick={() => playAudio('preview')} className="gap-2 flex-1"
                      >
                        {playingTrack === 'preview' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        Preview
                      </Button>
                    </div>
                  )}

                  {!hasEnough(FEATURE_COSTS.enhance_audio) ? (
                    <NoCreditsAlert message="Generar el master final completo" />
                  ) : (
                    <Button onClick={handleGetFinal} className="w-full h-12 gap-2" size="lg">
                      <Sparkles className="w-4 h-4" />
                      Generar master final completo ({FEATURE_COSTS.enhance_audio} créditos)
                    </Button>
                  )}
                  <PricingLink className="block text-center mt-2" />

                  <Button variant="ghost" size="sm" onClick={() => { setPreviewUrl(null); setTaskId(null); }} className="w-full mt-2 gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Probar otro estilo
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Final master */}
          {finalUrl && (
            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                    <h2 className="text-lg font-semibold">{tr('success.title')}</h2>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {tr('success.indicators.optimized')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                      <Volume2 className="w-3 h-3" />
                      {tr('success.indicators.streaming')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                      <Sparkles className="w-3 h-3" />
                      {tr('success.indicators.professional')}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Button
                        variant="outline" size="icon" className="shrink-0 rounded-full"
                        onClick={() => playAudio('mastered')}
                      >
                        {playingTrack === 'mastered' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <div>
                        <p className="text-sm font-medium">{tr('success.masteredTitle')}</p>
                        <p className="text-xs text-muted-foreground">{tr('success.masteredSubtitle')}</p>
                      </div>
                    </div>
                    <audio src={finalUrl} className="w-full h-8" controls />
                  </div>
                </CardContent>
              </Card>

              {audioUrl && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3">📊 {tr('success.compare')}</p>
                    <div className="flex gap-2">
                      <Button
                        variant={playingTrack === 'original' ? "default" : "outline"} size="sm"
                        onClick={() => playAudio('original')} className="gap-2 flex-1"
                      >
                        {playingTrack === 'original' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {tr('success.original')}
                      </Button>
                      <Button
                        variant={playingTrack === 'mastered' ? "default" : "outline"} size="sm"
                        onClick={() => playAudio('mastered')} className="gap-2 flex-1"
                      >
                        {playingTrack === 'mastered' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {tr('success.mastered')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button asChild className="gap-2">
                  <a href={finalUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                    {tr('actions.download')}
                  </a>
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {tr('actions.startNew')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AIStudioEdit;
