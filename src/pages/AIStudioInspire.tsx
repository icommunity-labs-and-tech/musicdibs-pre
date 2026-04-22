import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { useProductTracking } from "@/hooks/useProductTracking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { parseAiError } from "@/lib/aiErrorHandler";

import {
  ArrowLeft, Lightbulb, Sparkles, Loader2, AlertCircle,
  Download, RefreshCw, ArrowRight, Music,
} from "lucide-react";
import { toast } from "sonner";

// ── Listas para construir prompts aleatorios ───────────────────
const GENEROS = ["pop", "pop urbano", "reggaeton", "trap", "indie pop", "electrónica", "balada"];
const TEMAS = [
  "una ruptura reciente",
  "un amor imposible",
  "una noche de verano",
  "superación personal",
  "nostalgia del pasado",
  "una relación tóxica",
  "fiesta sin control",
];
const VOCES = [
  "voz femenina suave",
  "voz masculina emocional",
  "voz juvenil energética",
  "voz profunda y melancólica",
];
const REFERENCIAS = [
  "estilo Aitana", "estilo Quevedo", "estilo Bad Bunny",
  "estilo Rosalía", "estilo Mora", "estilo The Weeknd",
];
const EMOCIONES = ["melancólica", "energética", "nostálgica", "intensa", "feliz", "oscura"];
const TEMPOS = ["lento", "medio", "rápido"];
const ESTRUCTURAS = [
  "verso + estribillo + verso + estribillo",
  "intro + verso + pre-estribillo + estribillo + puente",
  "estructura simple pegadiza",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const buildRandomPrompt = (): string => {
  return [
    `Canción de ${pick(GENEROS)} sobre ${pick(TEMAS)}`,
    `con ${pick(VOCES)}`,
    pick(REFERENCIAS),
    `sensación ${pick(EMOCIONES)}`,
    `tempo ${pick(TEMPOS)}`,
    `(${pick(ESTRUCTURAS)})`,
  ].join(", ");
};

const PRESET_IDEAS = [
  { emoji: "💔", labelKey: "breakup", prompt: "Balada pop melancólica sobre una ruptura reciente, voz femenina emocional, piano acústico y cuerdas suaves, estilo Aitana, tempo lento" },
  { emoji: "🌴", labelKey: "summer", prompt: "Hit pop urbano de verano, voz juvenil energética, guitarra acústica y palmas, sensación feliz, tempo medio, estilo Quevedo" },
  { emoji: "🔥", labelKey: "trap", prompt: "Trap oscuro con 808s pesados, voz masculina rasgada, atmósfera intensa, estilo Mora, tempo medio" },
  { emoji: "🎤", labelKey: "popRomantic", prompt: "Pop romántico con voz femenina suave, sintetizadores cálidos, estribillo pegadizo, sensación nostálgica" },
  { emoji: "💃", labelKey: "reggaeton", prompt: "Reggaeton bailable con dembow clásico, voz masculina, sintes tropicales y graves potentes, tempo medio-rápido" },
  { emoji: "🎸", labelKey: "rock", prompt: "Rock indie con guitarras eléctricas, batería potente, voz juvenil energética, sensación intensa, estructura clásica verso-estribillo" },
];

interface InspireResult {
  audioUrl: string;
  prompt: string;
  duration: number;
}

const AIStudioInspire = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useProductTracking();
  const { user } = useAuth();
  const { hasEnough, isLoading: creditsLoading } = useCredits();

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<InspireResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPromptRef = useRef<string>("");

  useEffect(() => {
    track('ai_studio_entered', { feature: 'inspire' });
  }, []);

  const handleGenerate = async (prompt: string) => {
    if (!user) {
      toast.error("Inicia sesión para generar música");
      navigate('/login');
      return;
    }

    // Soft credit check (servidor también valida)
    if (!creditsLoading && !hasEnough(3)) {
      navigate('/dashboard/credits');
      return;
    }

    lastPromptRef.current = prompt;
    setError(null);
    setResult(null);
    setGenerating(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("generate-audio", {
        body: {
          prompt,
          lyrics: "",
          mode: "song",
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) {
        const handled = parseAiError(data, 'inspire');
        throw new Error(handled?.userMessage || data.error);
      }

      // El edge function devuelve `audioUrl` (firmado) o `audio` en base64
      const audioUrl: string = data?.audioUrl
        || (data?.audio ? `data:${data.format || 'audio/mpeg'};base64,${data.audio}` : '');

      if (!audioUrl) throw new Error("No se recibió audio del servidor");

      setResult({
        audioUrl,
        prompt,
        duration: data?.duration || 0,
      });

      track('generation_completed', { feature: 'inspire' });
      toast.success("¡Tu canción está lista!");
    } catch (err: any) {
      console.error('[AIStudioInspire] generation error:', err);
      setError(err.message || t('aiInspire.genericError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSurpriseMe = () => {
    handleGenerate(buildRandomPrompt());
  };

  const handlePreset = (prompt: string) => {
    handleGenerate(prompt);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const handleGoToStudio = () => {
    if (!result) return;
    const params = new URLSearchParams({ prompt: result.prompt });
    navigate(`/ai-studio/create?${params.toString()}`);
  };

  const handleDownload = () => {
    if (!result?.audioUrl) return;
    const a = document.createElement('a');
    a.href = result.audioUrl;
    a.download = `musicdibs-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-6 pt-20 max-w-3xl">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          {t('aiInspire.backToStudio')}
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">{t('aiInspire.badge')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('aiInspire.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('aiInspire.subtitle')}
          </p>
        </div>

        {/* Botón principal */}
        <div className="flex justify-center mb-8">
          <Button
            size="lg"
            onClick={handleSurpriseMe}
            disabled={generating}
            className="gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white text-base px-8 h-12"
          >
            {generating
              ? <><Loader2 className="w-5 h-5 animate-spin" />{t('aiInspire.generating')}</>
              : <><Sparkles className="w-5 h-5" />{t('aiInspire.surpriseMe')}</>
            }
          </Button>
        </div>

        {/* Estado: generando */}
        {generating && !result && (
          <Card className="mb-6 border-violet-500/30 bg-violet-500/5">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              <p className="font-semibold text-base">{t('aiInspire.generating')}</p>
              <p className="text-sm text-muted-foreground">{t('aiInspire.generatingHint')}</p>
            </CardContent>
          </Card>
        )}

        {/* Estado: error */}
        {error && !generating && (
          <Card className="mb-6 border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                onClick={() => handleGenerate(lastPromptRef.current || buildRandomPrompt())}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('aiInspire.tryAgain')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Estado: resultado */}
        {result && !generating && (
          <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-sm font-semibold truncate">
                    {result.prompt.length > 90 ? result.prompt.slice(0, 90) + '…' : result.prompt}
                  </p>
                </div>
                {result.duration > 0 && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {Math.round(result.duration)}s
                  </Badge>
                )}
              </div>

              <audio controls src={result.audioUrl} className="w-full" />

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                  <Download className="w-4 h-4" />
                  {t('aiInspire.download')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {t('aiInspire.anotherSong')}
                </Button>
                <Button size="sm" onClick={handleGoToStudio} className="gap-2">
                  {t('aiInspire.goToStudio')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Presets de ideas */}
        {!result && !generating && (
          <section className="mb-8">
            <p className="text-center text-sm text-muted-foreground mb-4">
              {t('aiInspire.ideasTitle')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_IDEAS.map((idea) => {
                const label = t(`aiInspire.presets.${idea.labelKey}`, {
                  defaultValue: idea.labelKey === 'breakup' ? 'Ruptura emocional'
                    : idea.labelKey === 'summer' ? 'Hit de verano'
                    : idea.labelKey === 'trap' ? 'Trap'
                    : idea.labelKey === 'popRomantic' ? 'Pop romántico'
                    : idea.labelKey === 'reggaeton' ? 'Reggaeton'
                    : idea.labelKey === 'rock' ? 'Rock'
                    : idea.labelKey,
                });
                return (
                  <button
                    key={idea.labelKey}
                    type="button"
                    onClick={() => handlePreset(idea.prompt)}
                    disabled={generating}
                    className="flex flex-col items-center gap-1 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl">{idea.emoji}</span>
                    <span className="text-sm font-medium text-center leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Ver precios */}
        <div className="mt-6 flex justify-center">
          <PricingLink />
        </div>
      </main>
    </div>
  );
};

export default AIStudioInspire;
