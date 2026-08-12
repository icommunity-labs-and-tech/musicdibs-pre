import { lazy, Suspense, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useProductTracking } from "@/hooks/useProductTracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wand2, Sparkles, Music, AlertTriangle, ArrowLeft, Zap, Edit3, Lightbulb, Coins, Image, Users, Mic2, Mic } from "lucide-react";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { Navbar } from "@/components/Navbar";
import { AIStudioThemeBar } from "@/components/ai-studio/AIStudioThemeBar";
import { AIKnowledgeModal, useAIKnowledgeAutoShow } from "@/components/ai-studio/AIKnowledgeModal";
import { BookOpen } from "lucide-react";
import { SEO } from "@/components/SEO";

import { useCredits } from "@/hooks/useCredits";
import { CreditsChip } from "@/components/ai-studio/CreditsChip";
import { FEATURE_COSTS } from "@/lib/featureCosts";
import { useTranslation } from "react-i18next";
// Heavy page — only loaded when the "virtual-artists" view is opened.
const ArtistProfilesPage = lazy(() => import("@/pages/ArtistProfilesPage"));

type ActiveView = "grid" | "virtual-artists";

const AIStudio = () => {
  const { credits, hasEnough } = useCredits();
  const { t } = useTranslation();
  const { track } = useProductTracking();
  const [activeView, setActiveView] = useState<ActiveView>("grid");
  const [knowledgeOpen, setKnowledgeOpen] = useAIKnowledgeAutoShow();

  useEffect(() => {
    track('ai_studio_entered', { feature: 'create_music' });
  }, []);

  const topRowModules = [
    {
      titleKey: "aiStudio.modules.createMusic.title",
      descKey: "aiStudio.modules.createMusic.desc",
      icon: Wand2,
      href: "/ai-studio/create",
      available: true,
      costsCredits: true,
      featureKey: 'generate_audio' as const,
      color: "from-primary to-brand"
    },
    {
      titleKey: "aiStudio.modules.enhance.title",
      descKey: "aiStudio.modules.enhance.desc",
      icon: Mic2,
      href: "/ai-studio/enhance",
      available: true,
      costsCredits: true,
      featured: true,
      featureKey: 'enhance_audio' as const,
      color: "from-accent to-primary"
    },
    {
      titleKey: "aiStudio.modules.editModify.title",
      descKey: "aiStudio.modules.editModify.desc",
      icon: Edit3,
      href: "/ai-studio/edit",
      available: true,
      costsCredits: true,
      featureKey: 'edit_audio' as const,
      color: "from-accent to-primary"
    },
  ];

  const bottomRowModules = [
    {
      titleKey: "aiStudio.modules.inspire.title",
      descKey: "aiStudio.modules.inspire.desc",
      icon: Lightbulb,
      href: "/ai-studio/inspire",
      available: true,
      costsCredits: true,
      featureKey: 'inspiration' as const,
      color: "from-warning to-warning"
    },
    {
      titleKey: "aiStudio.modules.createCovers.title",
      descKey: "aiStudio.modules.createCovers.desc",
      icon: Image,
      href: "/ai-studio/promo-material",
      available: true,
      costsCredits: true,
      featureKey: 'generate_cover' as const,
      color: "from-success to-info"
    },
    {
      titleKey: "aiStudio.modules.singYourSong.title",
      descKey: "aiStudio.modules.singYourSong.desc",
      icon: Mic,
      href: "/ai-studio/vocal",
      available: false,
      costsCredits: true,
      featureKey: 'inspiration' as const,
      color: "from-primary to-accent"
    },
    {
      titleKey: "aiStudio.modules.virtualArtists.title",
      descKey: "aiStudio.modules.virtualArtists.desc",
      icon: Users,
      href: "__inline__",
      available: true,
      costsCredits: false,
      featureKey: 'inspiration' as const,
      color: "from-accent to-primary",
      inlineView: "virtual-artists" as ActiveView,
    },
  ];

  const renderModuleCard = (module: any, extraClass = "") => {
    const cost = module.featureKey ? FEATURE_COSTS[module.featureKey] : 0;
    const disabled = !module.available || (module.costsCredits && !hasEnough(cost));
    const isInline = !!(module as any).inlineView;
    const isFeatured = !!(module as any).featured;
    const isVoiceTools = module.href === "/ai-studio/vocal";

    const cardInner = (
      <Card
        key={module.titleKey}
        className={`relative overflow-hidden transition-all duration-300 ${extraClass} ${
          isFeatured
            ? 'rounded-[10px] hover:shadow-2xl hover:-translate-y-1 border-0'
            : !module.available
              ? 'opacity-55 grayscale pointer-events-none cursor-not-allowed border-dashed border-muted-foreground/30'
              : disabled
                ? 'opacity-60 grayscale'
                : 'hover:shadow-lg hover:-translate-y-1'
        }`}
      >
        {/* ── Internal testing overlay for voice tools */}
        {!module.available && isVoiceTools && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/90 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5" />
              {t('aiStudio.comingSoon')}
            </span>
          </div>
        )}
        {/* ── Featured: glow strip + shimmer overlay */}
        {isFeatured && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-brand/5 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent via-brand to-accent" />
          </>
        )}
        {/* ── Non-featured color strip */}
        {!isFeatured && (
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.color}`} />
        )}

        {/* ── Badges */}
        {isFeatured && (
          <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-accent px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
            ⚡ TOP
          </span>
        )}
        {!isFeatured && !module.available && (
          <Badge variant="secondary" className="absolute top-3 right-3 z-10 text-[10px]">
            {t('aiStudio.comingSoon')}
          </Badge>
        )}
        {!isFeatured && module.available && module.costsCredits === false && (
          <Badge className="absolute top-3 right-3 z-10 text-[10px] bg-success hover:bg-success text-primary-foreground border-0">
            {t('aiStudio.free', 'Gratis')}
          </Badge>
        )}
        {!isFeatured && module.available && !hasEnough(cost) && module.costsCredits && (
          <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-[10px]">
            {t('aiStudio.noCredits')}
          </Badge>
        )}

        <CardHeader className={extraClass ? "flex-1" : undefined}>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 ${isFeatured ? 'shadow-[0_4px_14px_rgba(139,92,246,0.45)]' : ''}`}>
            <module.icon className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="flex items-center gap-2 mb-2">
            {t(module.titleKey)}
            {module.beta && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">BETA</Badge>
            )}
          </CardTitle>
          <CardDescription className="mb-4">{t(module.descKey)}</CardDescription>
          {module.costsCredits && cost > 0 ? (
            <div className="mt-auto pt-2"><PricingLink /></div>
          ) : module.costsCredits === false ? (
            <div className="mt-auto pt-2">
              <span className="inline-flex items-center rounded-full bg-success px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm">{t('aiStudio.free', 'Gratis')}</span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {!module.available ? (
            <Button className="w-full" variant="secondary" disabled>
              <Zap className="w-4 h-4 mr-2" />
              {t('aiStudio.comingSoon')}
            </Button>
          ) : disabled ? (
            <Button asChild className="w-full" variant="default">
              <Link to="/dashboard/credits">
                <Coins className="w-4 h-4 mr-2" />
                {t('aiStudio.buyCredits')}
              </Link>
            </Button>
          ) : isInline ? (
            <Button className="w-full" variant="default" onClick={() => setActiveView((module as any).inlineView)}>
              <Zap className="w-4 h-4 mr-2" />
              {t('aiStudio.startBtn')}
            </Button>
          ) : (
            <Button asChild className={`w-full ${isFeatured ? 'bg-gradient-to-r from-accent to-accent hover:from-accent hover:to-accent text-primary-foreground border-0 shadow-[0_2px_10px_rgba(139,92,246,0.4)]' : ''}`} variant="default">
              <Link to={module.href}>
                <Zap className="w-4 h-4 mr-2" />
                {t('aiStudio.startBtn')}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );

    if (isFeatured) {
      return (
        <div
          key={module.titleKey}
          className="relative p-[2px] rounded-xl bg-gradient-to-br from-accent via-accent to-brand shadow-[0_0_28px_rgba(139,92,246,0.4),0_0_8px_rgba(139,92,246,0.2)]"
        >
          {cardInner}
        </div>
      );
    }

    return cardInner;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Crea tu música con IA"
        description="Genera música, letras, portadas, vídeos y voces con IA en Musicdibs AI Studio. Crea, edita e inspírate al instante."
        path="/ai-studio"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Musicdibs",
            url: "https://www.musicdibs.com",
            logo: "https://www.musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
            sameAs: [
              "https://twitter.com/musicdibs",
              "https://www.instagram.com/musicdibs/",
              "https://www.tiktok.com/@musicdibs_",
              "https://www.youtube.com/@Musicdibs",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Musicdibs",
            url: "https://www.musicdibs.com",
            inLanguage: ["es", "en", "pt-BR"],
            publisher: { "@type": "Organization", name: "Musicdibs", url: "https://www.musicdibs.com" },
          },
        ]}
      />
      <Navbar />
      <AIStudioThemeBar />
      <main className="container mx-auto px-4 py-6 pt-16">
        {/* Back Button + Credits */}
        <div className="flex items-center justify-between mb-8 gap-3">
          {activeView === "grid" ? (
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              {t('aiStudio.backToDashboard')}
            </Link>
          ) : (
            <button
              onClick={() => setActiveView("grid")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('aiStudio.backToDashboard', 'Volver al dashboard')}
            </button>
          )}

          <CreditsChip />

        </div>

        {activeView === "grid" ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{t('aiStudio.poweredBy')}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {t('aiStudio.pageTitle')}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">
                {t('aiStudio.pageSubtitle')}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-1.5 text-sm text-warning dark:text-warning">
                  <span aria-hidden>💡</span>
                  <span>{t('aiStudio.variationNotice')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setKnowledgeOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 hover:bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>👉 {t('aiStudio.knowledgeGuide')}</span>
                </button>
              </div>
            </div>


            {/* Row 1 */}

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {topRowModules.map((m) => renderModuleCard(m))}
            </div>

            {/* Row 2 */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {bottomRowModules.map((m) => renderModuleCard(m, "flex flex-col"))}
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-4 gap-4 mb-16">
              {[
                { icon: Music, key: 'highQuality' },
                { icon: Zap, key: 'fast' },
                { icon: Sparkles, key: 'creative' },
                { icon: Wand2, key: 'easy' }
              ].map((feature) => (
                <div key={feature.key} className="text-center p-6 rounded-xl bg-muted/50">
                  <feature.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">{t(`aiStudio.features.${feature.key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`aiStudio.features.${feature.key}.desc`)}</p>
                </div>
              ))}
            </div>

            {/* Legal Notice */}
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="flex items-start gap-4 pt-6">
                <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-warning dark:text-warning mb-2">
                    {t('aiStudio.legalTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('aiStudio.legalText')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : activeView === "virtual-artists" ? (
          <Suspense fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-lg" />
                ))}
              </div>
            </div>
          }>
            <ArtistProfilesPage />
          </Suspense>
        ) : null}
      </main>
      <AIKnowledgeModal open={knowledgeOpen} onOpenChange={setKnowledgeOpen} />
    </div>
  );
};

export default AIStudio;
