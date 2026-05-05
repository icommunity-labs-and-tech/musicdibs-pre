import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { AIStudioThemeBar } from "@/components/ai-studio/AIStudioThemeBar";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { ArrowLeft, Sparkles, Dice5, Loader2, Download, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";

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
  "voces femeninas suaves con producción pop moderna",
  "trap urbano con flow cadencioso y bases 808",
  "reggaeton oscuro con melodías pegadizas",
  "pop alternativo con armonías vocales ricas",
  "r&b melódico con voz cálida y producción minimalista",
  "pop electrónico con sintetizadores brillantes y voz etérea",
];
const EMOCIONES = ["melancólica", "energética", "nostálgica", "intensa", "feliz", "oscura"];
const TEMPOS = ["lento", "medio", "rápido"];
const ESTRUCTURAS = [
  "verso + estribillo + verso + estribillo",
  "intro + verso + pre-estribillo + estribillo + puente",
  "estructura simple pegadiza",
];

const PRESET_IDEAS = [
  {
    emoji: "💔",
    label: "Ruptura emocional",
    prompt:
      "Canción pop emocional sobre una ruptura reciente, voz femenina suave y melancólica con producción pop moderna, atmósfera íntima y nostálgica, tempo lento a 75 BPM, estructura verso + estribillo + verso + estribillo, producción limpia con piano y cuerdas sutiles.",
  },
  {
    emoji: "🌴",
    label: "Hit de verano",
    prompt:
      "Canción pop urbano sobre una noche de verano, voz juvenil energética con flow cadencioso sobre bases electrónicas brillantes, atmósfera alegre y pegadiza, tempo rápido a 100 BPM, estructura simple con estribillo viral repetitivo, producción con sintetizadores brillantes y percusión electrónica.",
  },
  {
    emoji: "🔥",
    label: "Trap",
    prompt:
      "Canción trap sobre una relación tóxica y ambición personal, voz masculina grave con flow cadencioso sobre bases 808 profundas, atmósfera oscura e intensa, tempo medio a 85 BPM, estructura verso + estribillo con beat contundente y hi-hats rápidos.",
  },
  {
    emoji: "🎤",
    label: "Pop romántico",
    prompt:
      "Canción pop romántica sobre un amor profundo, voz masculina emocional con r&b melódico y producción minimalista cálida, atmósfera íntima, tempo medio a 90 BPM, estructura verso + pre-estribillo + estribillo con armonías vocales ricas y sintetizadores etéreos.",
  },
  {
    emoji: "🌴",
    label: "Reggaeton",
    prompt:
      "Canción reggaeton sobre una historia de atracción nocturna, voz masculina sensual con melodías pegadizas sobre dembow electrónico, atmósfera caliente y bailable, tempo medio-rápido a 95 BPM, estructura verso + estribillo repetitivo con hook viral y producción urbana moderna.",
  },
  {
    emoji: "🎸",
    label: "Rock",
    prompt:
      "Canción rock sobre superación personal y lucha interna, voz masculina intensa con guitarras distorsionadas y baterías contundentes, atmósfera enérgica y poderosa, tempo medio a 120 BPM, estructura intro + verso + estribillo + solo de guitarra + estribillo final.",
  },
  {
    emoji: "🎂",
    label: "Cumpleaños",
    prompt:
      "Canción pop alegre y emotiva para celebrar un cumpleaños especial, voz mixta cálida y festiva con coros que invitan a cantar juntos, atmósfera de celebración y cariño, tempo animado a 105 BPM, estructura verso + estribillo contagioso + puente emotivo + estribillo final, producción con palmas, cuerdas festivas y percusión luminosa.",
  },
  {
    emoji: "💍",
    label: "Aniversario",
    prompt:
      "Canción pop romántica para celebrar un aniversario de pareja, voz femenina tierna y emotiva sobre producción orquestal suave con piano y cuerdas, atmósfera íntima y llena de gratitud, tempo lento-medio a 80 BPM, estructura verso + pre-estribillo + estribillo cargado de emoción + puente + estribillo final, producción elegante y atemporal.",
  },
  {
    emoji: "🙏",
    label: "Perdón",
    prompt:
      "Canción pop soul sobre pedir perdón sincero por un error que lastimó a alguien querido, voz masculina vulnerable y arrepentida con producción acústica minimalista, piano y guitarra suave, atmósfera de humildad y esperanza de reconciliación, tempo lento a 70 BPM, estructura verso íntimo + estribillo sincero + puente emotivo con voz desnuda.",
  },
  {
    emoji: "😍",
    label: "Me he enamorado",
    prompt:
      "Canción pop con euforia romántica sobre descubrir que te has enamorado inesperadamente, voz femenina luminosa y llena de energía sobre producción pop brillante con sintetizadores cálidos y guitarra acústica, atmósfera de alegría desbordante y mariposas en el estómago, tempo alegre a 110 BPM, estructura verso ilusionado + pre-estribillo que escala + estribillo explosivo.",
  },
  {
    emoji: "👶",
    label: "Bienvenido bebé",
    prompt:
      "Canción pop tierna y emotiva para dar la bienvenida a un recién nacido, voces suaves y cálidas con armonías delicadas sobre producción con piano, caja de música y cuerdas suaves, atmósfera de ternura pura y amor incondicional, tempo lento a 72 BPM, estructura verso susurrado + estribillo luminoso + puente con promesas al bebé.",
  },
  {
    emoji: "🌹",
    label: "Declaración de amor",
    prompt:
      "Canción pop con soul sobre declarar el amor por primera vez con valentía y nervios, voz masculina emotiva y directa con producción cálida de piano, guitarra eléctrica suave y cuerdas que crecen, atmósfera de vulnerabilidad y esperanza, tempo medio a 88 BPM, estructura verso que construye tensión + pre-estribillo + estribillo que explota con la declaración.",
  },
  {
    emoji: "✈️",
    label: "Despedida",
    prompt:
      "Canción pop melancólica pero esperanzadora sobre despedirse de alguien que parte lejos, voz femenina con emoción contenida sobre producción minimalista con piano, guitarra acústica y cuerdas que se abren en el estribillo, atmósfera agridulce de amor que trasciende la distancia, tempo lento-medio a 78 BPM, estructura verso nostálgico + estribillo emotivo + puente de promesas.",
  },
  {
    emoji: "🏆",
    label: "Lo conseguí",
    prompt:
      "Canción pop motivacional sobre alcanzar un sueño después de mucho esfuerzo y sacrificio, voz masculina poderosa y triunfal con producción épica que combina electrónica y cuerdas orquestales, atmósfera de orgullo, superación y celebración personal, tempo enérgico a 115 BPM, estructura verso que narra la lucha + pre-estribillo que escala + estribillo explosivo de victoria.",
  },
  {
    emoji: "🌙",
    label: "Canción de cuna",
    prompt:
      "Canción de cuna pop suave y amorosa para dormir a un ser querido, voz femenina susurrada y aterciopelada con producción muy minimalista de piano y pad de cuerdas etéreas, atmósfera de calma, seguridad y amor profundo, tempo muy lento a 58 BPM, estructura simple y repetitiva con melodía de fácil retención, dinámica suave de principio a fin.",
  },
  {
    emoji: "💪",
    label: "Superar una pérdida",
    prompt:
      "Canción pop emotiva sobre encontrar fuerza y seguir adelante tras perder a alguien importante, voz mixta con fragilidad que se transforma en fortaleza, producción que va del piano solitario inicial a cuerdas y percusión que crecen con la narrativa, atmósfera de duelo honesto y resiliencia, tempo lento que sube a medio a lo largo de la canción, estructura verso vulnerable + estribillo que encuentra la luz + puente de aceptación.",
  },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const buildSurprisePrompt = () => {
  const genero = pick(GENEROS);
  const tema = pick(TEMAS);
  const voz = pick(VOCES);
  const referencia = pick(REFERENCIAS);
  const emocion = pick(EMOCIONES);
  const tempo = pick(TEMPOS);
  const estructura = pick(ESTRUCTURAS);
  return `Canción ${genero} sobre ${tema}, con ${voz}, ${referencia}, atmósfera ${emocion}, tempo ${tempo}, con ${estructura}, con alta calidad de producción y enfoque comercial.`;
};

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
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<InspireResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  useEffect(() => {
    track("ai_studio_entered", { feature: "inspire" });
  }, []);

  const goToCreator = (prompt: string) => {
    const params = new URLSearchParams({ prompt, mode: "song", tab: "music" });
    navigate(`/ai-studio/create?${params.toString()}`);
  };

  const generateInline = async (prompt: string) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para generar canciones",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setLastPrompt(prompt);
    track("generation_started", { feature: "create_music", metadata: { mode: "song", source: "inspire" } });

    try {
      // Spend credits — use the same feature key as the music creator (song mode)
      const { data: spendResult, error: spendError } = await supabase.functions.invoke("spend-credits", {
        body: { feature: "generate_audio", description: `Canción: ${prompt.slice(0, 80)}` },
      });
      if (spendError) throw new Error(spendError.message || "Error al descontar créditos");
      if (spendResult?.error) throw new Error(spendResult.error);

      // Identical payload to AIStudioCreate (song mode, no duration → IA decides)
      const { data, error: invokeError } = await supabase.functions.invoke("generate-audio", {
        body: {
          prompt,
          mode: "song",
        },
      });

      if (invokeError) {
        if (data?.error) throw new Error(data.message || data.error);
        throw new Error(invokeError.message || "Error al generar audio");
      }
      if (data?.error) throw new Error(data.message || data.error);

      if (!data?.audio && !data?.audioUrl) {
        throw new Error("No se recibió audio del servicio");
      }

      const audioUrl = data.audioUrl || `data:${data.format};base64,${data.audio}`;
      setResult({
        audioUrl,
        prompt,
        duration: data.duration || 0,
      });
      track("generation_completed", { feature: "create_music", metadata: { mode: "song", source: "inspire" } });
    } catch (e: any) {
      console.error("[Inspire] Generation error:", e);
      const msg = e?.message || "No se pudo generar la canción";
      setError(msg);
      track("generation_failed", { feature: "create_music", metadata: { mode: "song", source: "inspire", error: msg } });
      toast({ title: "Error al generar", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSurprise = () => {
    if (selectedChip) {
      const preset = PRESET_IDEAS.find((idea) => idea.label === selectedChip);
      generateInline(preset ? preset.prompt : buildSurprisePrompt());
    } else {
      generateInline(buildSurprisePrompt());
    }
  };

  const handleChipClick = (label: string) => {
    setSelectedChip((prev) => (prev === label ? null : label));
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const res = await fetch(result.audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `musicdibs-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Error al descargar", description: "No se pudo descargar el archivo", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setLastPrompt("");
  };

  const truncate = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AIStudioThemeBar />

      <main className="container mx-auto px-4 py-6 pt-16">
        <Link
          to="/ai-studio"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("aiInspire.backToStudio", "Volver al estudio")}
        </Link>

        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Crear en 1 click</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Crear en 1 click <span aria-hidden>🎵</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            ¿No sabes por dónde empezar? Genera una canción automáticamente y empieza a crear al instante.
          </p>

          <Button
            onClick={handleSurprise}
            disabled={isGenerating}
            size="xl"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg min-w-[260px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Dice5 className="w-5 h-5 mr-2" />
                {selectedChip ? `🎲 Generar ${selectedChip}` : "🎲 Sorpréndeme"}
              </>
            )}
          </Button>

          {/* Loading state */}
          {isGenerating && (
            <div className="mt-8 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Generando tu canción... ⚡</p>
              <p className="text-xs">Esto puede tardar entre 30 y 60 segundos</p>
            </div>
          )}

          {/* Error state */}
          {error && !isGenerating && (
            <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-left">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground mb-1">No se pudo generar la canción</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button
                onClick={() => generateInline(lastPrompt || buildSurprisePrompt())}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Result card */}
          {result && !isGenerating && (
            <div className="mt-8 rounded-xl border border-border bg-card shadow-sm p-6 text-left">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Canción generada</p>
                  <h3 className="font-semibold text-foreground leading-snug">
                    {truncate(result.prompt)}
                  </h3>
                </div>
                {result.duration > 0 && (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground shrink-0">
                    {Math.round(result.duration)}s
                  </span>
                )}
              </div>

              <audio
                controls
                src={result.audioUrl}
                className="w-full rounded-lg mb-4"
                preload="metadata"
              />

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Otra canción
                </Button>
                <Button
                  onClick={() => goToCreator(result.prompt)}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Ir al estudio
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Preset chips */}
          <div className="mt-12">
            <p className="text-sm text-muted-foreground mb-4">O prueba con estas ideas:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESET_IDEAS.map((idea) => {
                const isSelected = selectedChip === idea.label;
                return (
                  <button
                    key={idea.label}
                    onClick={() => handleChipClick(idea.label)}
                    disabled={isGenerating}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "border-border bg-card hover:bg-accent hover:border-primary/40"
                    }`}
                  >
                    <span aria-hidden>{idea.emoji}</span>
                    {idea.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing link */}
          <div className="mt-6 flex justify-center">
            <PricingLink />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIStudioInspire;
