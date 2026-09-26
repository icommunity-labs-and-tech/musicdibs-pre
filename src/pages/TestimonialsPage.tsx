import { useTranslation } from "react-i18next";
import { Play, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { LazyYouTube } from "@/components/LazyYouTube";
import { testimonialVideos } from "@/lib/testimonialVideos";

const TestimonialsPage = () => {
  const { t } = useTranslation();
  const videos = testimonialVideos;

  return (
    <div className="min-h-screen page-bg">
      <SEO title={t("testimonials.pageTitle")} description={t("testimonials.pageDescription")} path="/testimonios" />
      <Navbar />
      <main>
        <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-brand pt-36 pb-20 md:pt-44 md:pb-28 text-primary-foreground">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-semibold uppercase text-primary-foreground/70 mb-5">Musicdibs / {t("testimonials.eyebrow")}</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold max-w-3xl leading-tight">{t("testimonials.pageTitle")}</h1>
            <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80 leading-relaxed">{t("testimonials.pageDescription")}</p>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24" aria-labelledby="voices-heading">
          <div className="flex items-center gap-3 mb-9">
            <Play className="size-5 text-brand" aria-hidden="true" />
            <h2 id="voices-heading" className="text-2xl sm:text-3xl font-display font-bold text-page-fg">{t("testimonials.videoHeading")}</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {videos.map(({ name, title, videoId }) => (
              <article key={videoId} className="min-w-0 border-t border-page-border pt-5">
                <div className="aspect-video overflow-hidden rounded-md bg-page-surface border border-page-border">
                  <LazyYouTube videoId={videoId} title={t("testimonials.videoTitle", { name })} />
                </div>
                <div className="flex items-start justify-between gap-3 mt-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-page-fg">{name}</h3>
                    <p className="text-sm text-page-fg-muted">{title}</p>
                  </div>
                  <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" aria-label={`${t("testimonials.watchOriginal")}: ${name}`} className="shrink-0 text-brand hover:text-primary transition-colors p-1">
                    <ArrowUpRight className="size-5" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TestimonialsPage;