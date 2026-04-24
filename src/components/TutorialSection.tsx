import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useTranslation } from "react-i18next";
import { LazyYouTube } from "@/components/LazyYouTube";
import { UserPlus, Music, Image as ImageIcon, ShieldCheck, Rocket } from "lucide-react";

const TutorialSection = () => {
  const { t } = useTranslation();

  const stepKeys = ["s1", "s2", "s3", "s4", "s5"] as const;
  const icons = [UserPlus, Music, ImageIcon, ShieldCheck, Rocket];

  const steps = stepKeys.map((key, idx) => {
    const base = {
      step: idx + 1,
      Icon: icons[idx],
      title: t(`tutorial.steps.${key}.title`),
      desc: t(`tutorial.steps.${key}.desc`),
    };
    if (key === "s4") {
      return {
        ...base,
        link: {
          label: t("tutorial.steps.s4.link"),
          href: "https://musicdibs.com/certification/sneaky-ways-latin/",
        },
      };
    }
    return base;
  });

  return (
    <section
      id="tutorial-section"
      className="py-20 relative overflow-hidden bg-gradient-to-b from-purple-600 via-purple-700 to-purple-800"
    >
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t("tutorial.heading")}
          </h2>
          <p className="text-xl text-white/90">
            {t("tutorial.subtitle")}
          </p>
        </div>

        {/* Video carousel */}
        <div className="max-w-2xl mx-auto mb-20">
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
            <CardContent className="p-6 md:p-8">
              <Carousel className="w-full">
                <CarouselContent>
                  <CarouselItem>
                    <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                      <LazyYouTube videoId="a4HMb8pV2hQ" title="Tutorial de Registro - Musicdibs" />
                    </div>
                  </CarouselItem>
                  <CarouselItem>
                    <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                      <LazyYouTube videoId="YS8euOYAdp8" title="Tutorial de Distribución - Musicdibs" />
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="left-4 bg-white/90 hover:bg-white text-purple-600 border-purple-200 shadow-lg" />
                <CarouselNext className="right-4 bg-white/90 hover:bg-white text-purple-600 border-purple-200 shadow-lg" />
              </Carousel>
            </CardContent>
          </Card>
        </div>

        {/* Steps timeline */}
        <div className="relative max-w-7xl mx-auto">
          {/* Decorative connector line (desktop only) */}
          <div
            className="hidden lg:block absolute top-10 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
            aria-hidden="true"
          />

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {steps.map((step) => {
              const { Icon } = step;
              return (
                <li
                  key={step.step}
                  className="relative group"
                >
                  <div className="h-full flex flex-col items-center text-center bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-pink-300/40">
                    {/* Icon + number */}
                    <div className="relative mb-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-9 h-9 text-white" strokeWidth={2} />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-purple-700 text-sm font-bold flex items-center justify-center shadow-md ring-2 ring-purple-700">
                        {step.step}
                      </span>
                    </div>

                    {/* Step label */}
                    <span className="text-xs font-semibold uppercase tracking-widest text-pink-200 mb-2">
                      {t("tutorial.steps.step")} {step.step}
                    </span>

                    {/* Title */}
                    <h3 className="text-lg lg:text-xl font-bold text-white mb-3 leading-tight">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-white/85 leading-relaxed">
                      {step.desc}
                    </p>

                    {/* Optional link (step 4) */}
                    {"link" in step && step.link && (
                      <a
                        href={step.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 text-sm text-pink-200 hover:text-white underline underline-offset-4 transition-colors"
                      >
                        {step.link.label}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 max-w-3xl mx-auto leading-tight">
            {t("tutorial.ctaTitle")}
          </h3>
          <Button
            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-12 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
            onClick={() => {
              document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {t("tutorial.ctaButton")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export { TutorialSection };
