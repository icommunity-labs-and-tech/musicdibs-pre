import { ImageIcon, Instagram, Play, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";

const items = [
  { label: "Portada", title: "Neon Cover", format: "single", Icon: ImageIcon, tall: false },
  { label: "Promo", title: "Urban Drop", format: "album", Icon: Sparkles, tall: false },
  { label: "Portada", title: "Indie Poster", format: "indie", Icon: ImageIcon, tall: true },
  { label: "Reel", title: "Reel Teaser", format: "reel", Icon: Play, tall: true },
  { label: "Story", title: "Story Vertical", format: "story", Icon: Instagram, tall: true },
  { label: "Canvas", title: "Canvas Loop", format: "canvas", Icon: Video, tall: false },
  { label: "Flyer", title: "Live Flyer", format: "flyer", Icon: Sparkles, tall: false },
  { label: "Promo", title: "Electro Pulse", format: "electro", Icon: Play, tall: false },
];

const loopItems = [...items, ...items];

export const PromoMaterialShowcase = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary via-primary to-accent py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--accent)/0.35),transparent_32%),radial-gradient(circle_at_80%_55%,hsl(var(--primary)/0.45),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-background/20" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Material promocional con IA
            </div>
            <h2 className="text-4xl font-bold leading-tight text-primary-foreground md:text-5xl">
              Crea también la imagen de tu lanzamiento
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              Genera portadas, posts, flyers y vídeos cortos para promocionar tu música en redes. Todo desde MusicDibs.
            </p>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={150}>
        <div className="promo-marquee group relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-primary to-primary/0" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-accent to-accent/0" />
          <div className="promo-marquee-track flex w-max gap-5 px-5 py-4 group-hover:[animation-play-state:paused]">
            {loopItems.map((item, index) => (
              <article
                key={`${item.title}-${index}`}
                className={`promo-showcase-card promo-showcase-card--${item.format} relative flex shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 shadow-xl ${item.tall ? "h-96 w-64" : "h-80 w-64"}`}
              >
                <div className="absolute inset-0 opacity-95" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                    {item.label}
                  </span>
                  {(item.label === "Reel" || item.label === "Canvas" || item.label === "Promo") && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                  )}
                </div>

                <div className="relative z-10 mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-primary/20 bg-background/15 backdrop-blur-md">
                  <item.Icon className="h-12 w-12 text-primary-foreground" />
                </div>

                <div className="relative z-10 text-left">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/75">AI visual kit</p>
                  <h3 className="text-2xl font-bold text-primary-foreground">{item.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <div className="mx-auto mt-10 flex max-w-6xl justify-center px-6">
        <Button variant="hero" size="xl" className="font-semibold" onClick={scrollToPricing}>
          Crear mi material promocional
        </Button>
      </div>
    </section>
  );
};