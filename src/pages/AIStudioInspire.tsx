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
import { GenerationWarning } from "@/components/ai-studio/GenerationWarning";
import { ArrowLeft, Sparkles, Dice5, Loader2, Download, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";

const GENRES = ["pop", "urban pop", "reggaeton", "trap", "indie pop", "electronic", "ballad"];
const TOPICS = [
  "a recent breakup",
  "an impossible love",
  "a summer night",
  "personal growth",
  "nostalgia for the past",
  "a toxic relationship",
  "a wild party",
];
const VOICES = [
  "soft female vocals",
  "emotional male vocals",
  "energetic youthful vocals",
  "deep and melancholic vocals",
];
const REFERENCES = [
  "soft female vocals with modern pop production",
  "urban trap with cadenced flow and 808 bass",
  "dark reggaeton with catchy melodies",
  "alternative pop with rich vocal harmonies",
  "melodic R&B with warm vocals and minimalist production",
  "electronic pop with bright synths and ethereal vocals",
];
const MOODS = ["melancholic", "energetic", "nostalgic", "intense", "happy", "dark"];
const TEMPOS = ["slow", "medium", "fast"];
const STRUCTURES = [
  "verse + chorus + verse + chorus",
  "intro + verse + pre-chorus + chorus + bridge",
  "simple catchy structure",
];

const PRESET_IDEAS = [
  {
    emoji: "💔",
    key: "heartbreak",
    prompt:
      "Emotional pop song about a recent breakup, soft and melancholic female vocals with modern pop production, intimate and nostalgic atmosphere, slow tempo at 75 BPM, structure verse + chorus + verse + chorus, clean production with piano and subtle strings.",
  },
  {
    emoji: "🌴",
    key: "summer",
    prompt:
      "Urban pop song about a summer night, energetic youthful vocals with cadenced flow over bright electronic beats, joyful and catchy atmosphere, fast tempo at 100 BPM, simple structure with viral repetitive chorus, production with bright synths and electronic percussion.",
  },
  {
    emoji: "🔥",
    key: "trap",
    prompt:
      "Trap song about a toxic relationship and personal ambition, deep male vocals with cadenced flow over deep 808 bass, dark and intense atmosphere, medium tempo at 85 BPM, structure verse + chorus with hard-hitting beat and fast hi-hats.",
  },
  {
    emoji: "🎤",
    key: "romantic",
    prompt:
      "Romantic pop song about a deep love, emotional male vocals with melodic R&B and warm minimalist production, intimate atmosphere, medium tempo at 90 BPM, structure verse + pre-chorus + chorus with rich vocal harmonies and ethereal synths.",
  },
  {
    emoji: "🌴",
    key: "reggaeton",
    prompt:
      "Reggaeton song about a story of nighttime attraction, sensual male vocals with catchy melodies over electronic dembow, hot and danceable atmosphere, medium-fast tempo at 95 BPM, structure verse + repetitive chorus with viral hook and modern urban production.",
  },
  {
    emoji: "🎸",
    key: "rock",
    prompt:
      "Rock song about personal growth and inner struggle, intense male vocals with distorted guitars and hard-hitting drums, energetic and powerful atmosphere, medium tempo at 120 BPM, structure intro + verse + chorus + guitar solo + final chorus.",
  },
  {
    emoji: "🎂",
    key: "birthday",
    prompt:
      "Joyful and emotional pop song to celebrate a special birthday, warm and festive mixed vocals with sing-along choruses, atmosphere of celebration and affection, lively tempo at 105 BPM, structure verse + contagious chorus + emotional bridge + final chorus, production with claps, festive strings and bright percussion.",
  },
  {
    emoji: "💍",
    key: "anniversary",
    prompt:
      "Romantic pop song to celebrate a couple's anniversary, tender and emotional female vocals over soft orchestral production with piano and strings, intimate atmosphere full of gratitude, slow-medium tempo at 80 BPM, structure verse + pre-chorus + emotion-filled chorus + bridge + final chorus, elegant and timeless production.",
  },
  {
    emoji: "🙏",
    key: "forgiveness",
    prompt:
      "Pop soul song about sincerely asking forgiveness for an error that hurt someone dear, vulnerable and remorseful male vocals with minimalist acoustic production, piano and soft guitar, atmosphere of humility and hope for reconciliation, slow tempo at 70 BPM, structure intimate verse + sincere chorus + emotional bridge with bare vocals.",
  },
  {
    emoji: "😍",
    key: "fellInLove",
    prompt:
      "Pop song with romantic euphoria about discovering you've fallen unexpectedly in love, luminous female vocals full of energy over bright pop production with warm synths and acoustic guitar, atmosphere of overflowing joy and butterflies in the stomach, cheerful tempo at 110 BPM, structure excited verse + escalating pre-chorus + explosive chorus.",
  },
  {
    emoji: "👶",
    key: "welcomeBaby",
    prompt:
      "Tender and emotional pop song to welcome a newborn baby, soft warm vocals with delicate harmonies over production with piano, music box and soft strings, atmosphere of pure tenderness and unconditional love, slow tempo at 72 BPM, structure whispered verse + luminous chorus + bridge with promises to the baby.",
  },
  {
    emoji: "🌹",
    key: "loveDeclaration",
    prompt:
      "Pop soul song about declaring love for the first time with bravery and nerves, emotional and direct male vocals with warm production of piano, soft electric guitar and growing strings, atmosphere of vulnerability and hope, medium tempo at 88 BPM, structure verse that builds tension + pre-chorus + chorus that explodes with the declaration.",
  },
  {
    emoji: "✈️",
    key: "farewell",
    prompt:
      "Melancholic yet hopeful pop song about saying goodbye to someone leaving far away, female vocals with restrained emotion over minimalist production with piano, acoustic guitar and strings that open in the chorus, bittersweet atmosphere of love that transcends distance, slow-medium tempo at 78 BPM, structure nostalgic verse + emotional chorus + bridge of promises.",
  },
  {
    emoji: "🏆",
    key: "achievement",
    prompt:
      "Motivational pop song about reaching a dream after much effort and sacrifice, powerful and triumphant male vocals with epic production combining electronic and orchestral strings, atmosphere of pride, achievement and personal celebration, energetic tempo at 115 BPM, structure verse narrating the struggle + escalating pre-chorus + explosive victory chorus.",
  },
  {
    emoji: "🌙",
    key: "lullaby",
    prompt:
      "Soft and loving pop lullaby to put a loved one to sleep, whispered velvety female vocals with very minimalist production of piano and ethereal string pad, atmosphere of calm, safety and deep love, very slow tempo at 58 BPM, simple repetitive structure with easy-to-remember melody, soft dynamics from beginning to end.",
  },
  {
    emoji: "💪",
    key: "overcomeLoss",
    prompt:
      "Emotional pop song about finding strength and moving forward after losing someone important, mixed vocals with fragility that transforms into strength, production that goes from initial solo piano to strings and percussion that grow with the narrative, atmosphere of honest grief and resilience, slow tempo rising to medium throughout the song, structure vulnerable verse + chorus that finds the light + bridge of acceptance.",
  },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Map i18n language code → English language name for the lyrics directive.
const LYRIC_LANGUAGE_MAP: Record<string, string> = {
  es: "Spanish",
  en: "English",
  "pt-BR": "Brazilian Portuguese",
  pt: "Brazilian Portuguese",
};

const getLyricLanguage = (lng?: string): string => {
  if (!lng) return "Spanish";
  if (LYRIC_LANGUAGE_MAP[lng]) return LYRIC_LANGUAGE_MAP[lng];
  const base = lng.split("-")[0];
  return LYRIC_LANGUAGE_MAP[base] || "Spanish";
};

const withLanguageDirective = (prompt: string, lng?: string): string => {
  const language = getLyricLanguage(lng);
  return `${prompt} IMPORTANT: lyrics MUST be written and sung entirely in ${language}.`;
};

const buildSurprisePrompt = () => {
  const genre = pick(GENRES);
  const topic = pick(TOPICS);
  const voice = pick(VOICES);
  const reference = pick(REFERENCES);
  const mood = pick(MOODS);
  const tempo = pick(TEMPOS);
  const structure = pick(STRUCTURES);
  return `${genre} song about ${topic}, with ${voice}, ${reference}, ${mood} atmosphere, ${tempo} tempo, with ${structure}, high production quality and commercial focus.`;
};

interface InspireResult {
  audioUrl: string;
  prompt: string;
  duration: number;
}

const AIStudioInspire = () => {
  const { t, i18n } = useTranslation();
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

  const generateInline = async (basePrompt: string) => {
    if (!user) {
      toast({
        title: t("aiInspire.loginRequiredTitle"),
        description: t("aiInspire.loginRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    // Append the language directive so Lyria sings in the user's UI language.
    const prompt = withLanguageDirective(basePrompt, i18n.resolvedLanguage || i18n.language);

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setLastPrompt(basePrompt);
    track("generation_started", { feature: "create_music", metadata: { mode: "song", source: "inspire" } });

    try {
      // Spend credits — 1-click create uses its own pricing key (one_click_create)
      const { data: spendResult, error: spendError } = await supabase.functions.invoke("spend-credits", {
        body: { feature: "one_click_create", description: `1-click: ${basePrompt.slice(0, 80)}` },
      });
      if (spendError) throw new Error(spendError.message || "Error al descontar créditos");
      if (spendResult?.error) throw new Error(spendResult.error);

      // Identical payload to AIStudioCreate (song mode, no duration → IA decides)
      // source: 'inspire' tells generate-audio to bill as one_click_create
      const { data, error: invokeError } = await supabase.functions.invoke("generate-audio", {
        body: {
          prompt,
          mode: "song",
          source: "inspire",
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
        prompt: basePrompt,
        duration: data.duration || 0,
      });
      track("generation_completed", { feature: "create_music", metadata: { mode: "song", source: "inspire" } });
    } catch (e: any) {
      console.error("[Inspire] Generation error:", e);
      const msg = e?.message || t("aiInspire.genericError");
      setError(msg);
      track("generation_failed", { feature: "create_music", metadata: { mode: "song", source: "inspire", error: msg } });
      toast({ title: t("aiInspire.errorToastTitle"), description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSurprise = () => {
    if (selectedChip) {
      const preset = PRESET_IDEAS.find((idea) => idea.key === selectedChip);
      generateInline(preset ? preset.prompt : buildSurprisePrompt());
    } else {
      generateInline(buildSurprisePrompt());
    }
  };

  const handleChipClick = (key: string) => {
    setSelectedChip((prev) => (prev === key ? null : key));
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
      toast({ title: t("aiInspire.downloadErrorTitle"), description: t("aiInspire.downloadErrorDesc"), variant: "destructive" });
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setLastPrompt("");
  };

  const truncate = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

  const selectedChipLabel = selectedChip ? t(`aiInspire.presets.${selectedChip}`) : "";

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
          {t("aiInspire.backToStudio")}
        </Link>

        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{t("aiInspire.badge")}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("aiInspire.title")} <span aria-hidden>🎵</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            {t("aiInspire.subtitle")}
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
                {t("aiInspire.generatingShort")}
              </>
            ) : (
              <>
                <Dice5 className="w-5 h-5 mr-2" />
                {selectedChip
                  ? t("aiInspire.generateChip", { label: selectedChipLabel })
                  : t("aiInspire.surpriseMe")}
              </>
            )}
          </Button>

          <div className="mt-4 max-w-xl mx-auto">
            <GenerationWarning />
          </div>

          {/* Loading state */}
          {isGenerating && (
            <div className="mt-8 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">{t("aiInspire.generating")}</p>
              <p className="text-xs">{t("aiInspire.generatingHint")}</p>
            </div>
          )}

          {/* Error state */}
          {error && !isGenerating && (
            <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-left">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground mb-1">{t("aiInspire.errorTitle")}</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button
                onClick={() => generateInline(lastPrompt || buildSurprisePrompt())}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("aiInspire.tryAgain")}
              </Button>
            </div>
          )}

          {/* Result card */}
          {result && !isGenerating && (
            <div className="mt-8 rounded-xl border border-border bg-card shadow-sm p-6 text-left">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("aiInspire.generatedSong")}</p>
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
                  {t("aiInspire.download")}
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("aiInspire.anotherSong")}
                </Button>
                <Button
                  onClick={() => goToCreator(result.prompt)}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("aiInspire.goToStudio")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Preset chips */}
          <div className="mt-12">
            <p className="text-sm text-muted-foreground mb-4">{t("aiInspire.ideasTitle")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESET_IDEAS.map((idea) => {
                const isSelected = selectedChip === idea.key;
                return (
                  <button
                    key={idea.key}
                    onClick={() => handleChipClick(idea.key)}
                    disabled={isGenerating}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "border-border bg-card hover:bg-accent hover:border-primary/40"
                    }`}
                  >
                    <span aria-hidden>{idea.emoji}</span>
                    {t(`aiInspire.presets.${idea.key}`)}
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
