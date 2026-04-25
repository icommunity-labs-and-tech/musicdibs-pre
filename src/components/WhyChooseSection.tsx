import { Blocks, Clapperboard, FileCheck2, Fingerprint, Globe, ImageIcon, type LucideIcon, Music, Palette, PenLine, Scale, ShieldCheck, SlidersHorizontal, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";
import { useTranslation, Trans } from "react-i18next";

export const WhyChooseSection = () => {
  const { t } = useTranslation();
  const scrollToPricing = () => {
    document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const InfoCard = ({ Icon, title, desc }: { Icon: LucideIcon; title: string; desc: string }) => (
    <div className="rounded-lg border border-border bg-background/90 p-4 shadow-sm transition-transform duration-300 hover:-translate-y-1">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );

  const ModalCta = ({ children }: { children: string }) => (
    <DialogClose asChild>
      <Button variant="hero" size="lg" className="mt-2 w-full sm:w-auto" onClick={scrollToPricing}>
        {children}
      </Button>
    </DialogClose>
  );

  const features = [
    {
      icon: Music,
      title: "AI Music Studio",
      description: t("why.features.legal.desc"),
      cta: "Quiero crear mi canción",
      popupContent: (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
              <Music className="h-8 w-8" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">AI Music Studio</DialogTitle>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tu estudio creativo con IA para crear canciones, mejorar tu sonido y preparar todo tu lanzamiento.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard Icon={Music} title="Crear canciones" desc="Canciones completas, instrumentales o con voz." />
            <InfoCard Icon={SlidersHorizontal} title="Masterizar" desc="Mejora el sonido y déjalo listo para plataformas." />
            <InfoCard Icon={PenLine} title="Crear letras" desc="Genera ideas, letras y estructuras en segundos." />
            <InfoCard Icon={ImageIcon} title="Diseñar portadas" desc="Arte visual para singles, EPs y álbumes." />
            <InfoCard Icon={Smartphone} title="Crear contenido" desc="Posts, creatividades y piezas para redes." />
            <InfoCard Icon={Clapperboard} title="Vídeos cortos" desc="Clips promocionales para Reels, TikTok y Spotify Canvas." />
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center text-sm font-semibold text-foreground">
            De la idea al lanzamiento, sin saltar entre herramientas.
          </div>
        </div>
      )
    },
    {
      icon: Palette,
      title: t("why.features.promo.title"),
      description: t("why.features.promo.desc"),
      cta: "Quiero promocionar mi lanzamiento",
      popupContent: (
        <span style={{ whiteSpace: 'pre-line' }}>{t("why.features.promo.popup")}</span>
      )
    },
    {
      icon: ShieldCheck,
      title: t("why.features.instant.title"), 
      description: t("why.features.instant.desc"),
      cta: "Quiero registrar mi obra",
      popupContent: (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">Registro de Propiedad Intelectual</DialogTitle>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Protege tu música en segundos con una evidencia digital verificable registrada en blockchain.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard Icon={Fingerprint} title="Huella digital única" desc="Generamos un hash criptográfico del archivo para identificar tu obra de forma única." />
            <InfoCard Icon={Blocks} title="Registro blockchain" desc="La evidencia queda sellada con fecha y hora en una red blockchain, sin poder alterarse." />
            <InfoCard Icon={FileCheck2} title="Certificado verificable" desc="Recibes un comprobante digital con los datos de la obra, hash y enlace de verificación." />
            <InfoCard Icon={Scale} title="Evidencia de autoría" desc="El registro ayuda a demostrar la existencia e integridad de tu obra ante terceros." />
          </div>
          <div className="rounded-lg border border-border bg-secondary/70 p-4">
            <h4 className="mb-2 text-sm font-semibold text-foreground">Marco internacional de derechos de autor</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              La protección de obras musicales se apoya en marcos internacionales como el{" "}
              <a href="https://www.wipo.int/treaties/es/ip/berne/" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">Convenio de Berna</a>, el{" "}
              <a href="https://www.wipo.int/treaties/es/ip/wct/" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">Tratado de la OMPI</a>{" "}
              y la{" "}
              <a href="https://digital-strategy.ec.europa.eu/es/policies/copyright" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">Directiva sobre Derechos de Autor en la Era Digital</a>. MusicDibs añade una capa tecnológica de evidencia digital verificable mediante blockchain.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center text-sm font-semibold text-foreground">
            Registra tu obra en segundos. Conserva una prueba digital verificable para siempre.
          </div>
        </div>
      )
    },
    {
      icon: Globe,
      title: t("why.features.distribution.title"),
      description: t("why.features.distribution.desc"),
      cta: "Quiero distribuir mi música",
      popupContent: (
        <>
          <Trans
            i18nKey="why.features.distribution.popup"
            components={{
              strong1: <span className="font-bold text-primary" />,
              strong2: <span className="font-bold text-primary" />,
            }}
          />
        </>
      )
    }
  ];

  return (
    <section id="why-section" className="py-20 bg-gradient-to-b from-primary via-primary to-accent">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              {t("why.heading")}
            </h2>
          </div>
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StaggerGrid baseDelay={100} staggerDelay={150} scale>
            {features.map((feature, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <div className="relative bg-background/10 backdrop-blur-sm rounded-xl p-6 border border-background/20 hover:bg-background/15 transition-all duration-300 hover:scale-105 cursor-pointer h-full flex flex-col">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 mx-auto">
                      <feature.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary-foreground mb-3 text-center">
                      {feature.title}
                    </h3>
                    <p className="text-primary-foreground/80 text-center leading-relaxed flex-1">
                      {feature.description}
                    </p>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl border-border bg-gradient-to-br from-background via-background to-secondary p-5 shadow-2xl sm:p-7">
                  {index !== 0 && index !== 2 && (
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold mb-4">
                        {feature.title}
                      </DialogTitle>
                    </DialogHeader>
                  )}
                  <div className="text-foreground leading-relaxed text-base">
                    {feature.popupContent}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <ModalCta>{feature.cta}</ModalCta>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </StaggerGrid>
        </div>
      </div>
    </section>
  );
};