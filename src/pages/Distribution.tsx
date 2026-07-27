import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Music, ExternalLink, FileText, LogIn, Play, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { LazyYouTube } from "@/components/LazyYouTube";

const Distribution = () => {
  const { t } = useTranslation();

  const faqItems = t("distribution.faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: Array.isArray(faqItems) ? faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })) : [],
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Distribución Musical" description="Distribuye tu música en Spotify, Apple Music y más de 220 plataformas. Musicdibs no cobra comisión sobre tus royalties de streaming. Sin permanencia. Alta en 24-48h." path="/distribution" jsonLd={faqJsonLd} />
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-5 py-2 mb-8">
            <Music className="w-4 h-4 text-brand" />
            <span className="text-sm font-medium text-brand">{t("distribution.badge")}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-brand to-primary bg-clip-text text-transparent leading-tight">
            {t("distribution.title")}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-semibold mb-4 max-w-3xl mx-auto">
            {t("distribution.subtitle")}
          </p>
          <p className="text-lg text-white/70 mb-6 max-w-3xl mx-auto leading-relaxed">
            {t("distribution.description")}
          </p>
          <p className="text-base text-white/60 mb-10 max-w-3xl mx-auto">
            {t("distribution.description2")}
          </p>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 px-6 relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920')] bg-cover bg-center opacity-10" />
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-white">
            {t("distribution.video_title")}
          </h2>
          <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10">
            <LazyYouTube videoId="EMkjA0FUqmg" title={t("distribution.video_title")} />
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://musicdibs.com/wp-content/uploads/2025/07/DSP-List-Musicdibs.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-brand/30 rounded-xl p-5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0 group-hover:bg-brand/30 transition-colors">
                <FileText className="w-5 h-5 text-brand" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white">{t("distribution.dsp_list")}</span>
                <p className="text-sm text-white/50">{t("distribution.dsp_list_desc")}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-brand transition-colors" />
            </a>

            <a
              href="https://musicdibs.com/register/?prod=5157"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-gradient-to-r from-brand/20 to-primary/20 hover:from-brand/30 hover:to-primary/30 border border-brand/20 hover:border-brand/40 rounded-xl p-5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-brand/30 flex items-center justify-center shrink-0 group-hover:bg-brand/40 transition-colors">
                <Music className="w-5 h-5 text-brand" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white">{t("distribution.buy_plus")}</span>
                <p className="text-sm text-white/50">{t("distribution.buy_plus_desc")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-brand transition-colors" />
            </a>

            <a
              href="https://dist.musicdibs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-info/30 rounded-xl p-5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center shrink-0 group-hover:bg-info/30 transition-colors">
                <LogIn className="w-5 h-5 text-info" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white">{t("distribution.portal_access")}</span>
                <p className="text-sm text-white/50">{t("distribution.portal_access_desc")}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-info transition-colors" />
            </a>

            <a
              href="https://musicdibs.com/wp-content/uploads/2026/02/%F0%9F%8E%A7-Distribution-Policy-%E2%80%93-Musicdibs-EN-1.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-primary/30 rounded-xl p-5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white">{t("distribution.conditions")}</span>
                <p className="text-sm text-white/50">{t("distribution.conditions_desc")}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-primary/10 to-brand/10" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t("distribution.cta_title", "¿Listo para distribuir tu música?")}
          </h2>
          <p className="text-lg text-white/70 mb-8">
            {t("distribution.cta_desc", "Elige el plan que mejor se adapte a ti y empieza a llegar a millones de oyentes en todo el mundo.")}
          </p>
          <Link to="/#pricing-section">
            <Button variant="hero" size="xl" className="font-semibold">
              <span className="flex items-center gap-2">
                {t("distribution.cta_button", "Ver planes y precios")}
                <ArrowRight className="w-5 h-5" />
              </span>
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">
            {t("distribution.faq.title")}
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {Array.isArray(faqItems) && faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-xl px-6 overflow-hidden"
              >
                <AccordionTrigger className="text-left text-white hover:text-brand py-5 text-base font-medium [&[data-state=open]]:text-brand">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-white/70 leading-relaxed pb-5 whitespace-pre-line">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Distribution;
