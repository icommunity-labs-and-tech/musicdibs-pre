import { useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Mic,
  Sparkles,
  Wand2,
  ImageIcon,
  UserSquare2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Lightbulb,
  Check,
  Rocket,
} from "lucide-react";
import dashboardAiStudio from "@/assets/landing/tutorial/dashboard-ai-studio.png";
import coverNeonPulse from "@/assets/landing/covers/neon-pulse.webp";
import coverFuegoLento from "@/assets/landing/covers/fuego-lento.webp";
import coverCaminoDeAbril from "@/assets/landing/covers/camino-de-abril.webp";
import coverDistrito9 from "@/assets/landing/covers/distrito-9.webp";
import artist1 from "@/assets/landing/artist-1.jpg";
import artist2 from "@/assets/landing/artist-2.jpg";
import artist3 from "@/assets/landing/artist-3.jpg";

type Step = {
  badge: string;
  title: string;
  description: string;
  mockup: ReactNode;
};

const steps: Step[] = [
  {
    badge: "Paso 1 · Empieza",
    title: "🚀 Regístrate y entra en AI Music Studio",
    description:
      "Dentro del AI Music Studio encontrarás todas las funciones para crear y mejorar tu música.",
    mockup: (
      <div className="relative h-full w-full rounded-xl overflow-hidden border border-magenta/30 bg-background/70">
        <div className="absolute inset-0 bg-gradient-to-br from-magenta/10 via-transparent to-pink/10 pointer-events-none" />
        <img
          src={dashboardAiStudio}
          alt="Panel de Musicdibs destacando AI Music Studio"
          loading="lazy"
          className="w-full h-full object-contain"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow:
              "inset 0 0 60px rgba(217,70,239,0.25), inset 0 0 120px rgba(168,85,247,0.15)",
          }}
        />
      </div>
    ),
  },
  {
    badge: "Paso 2 · Crear",
    title: "Crea tu canción desde una idea o mejora tu voz",
    description:
      "Escribe la idea de tu canción o sube una grabación de tu voz. La IA se encarga del resto.",
    mockup: (
      <div className="grid grid-cols-2 gap-3 h-full">
        <div className="rounded-xl border border-magenta/30 bg-background/70 p-4 flex flex-col">
          <div className="flex items-center gap-2 text-magenta text-xs font-semibold mb-2">
            <Lightbulb className="h-3.5 w-3.5" /> Desde una idea
          </div>
          <div className="text-[11px] text-muted-foreground rounded-md bg-background/80 border border-border p-2 flex-1">
            "Un tema synthwave con voz femenina y bajo potente a 120 BPM…"
          </div>
        </div>
        <div className="rounded-xl border border-pink/30 bg-background/70 p-4 flex flex-col">
          <div className="flex items-center gap-2 text-pink text-xs font-semibold mb-2">
            <Mic className="h-3.5 w-3.5" /> Desde tu voz
          </div>
          <div className="flex-1 rounded-md bg-background/80 border border-border p-2 flex items-center justify-center gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-magenta to-pink"
                style={{ height: `${20 + ((i * 31) % 60)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Upload className="h-3 w-3" /> voz-demo.mp3
          </div>
        </div>
      </div>
    ),
  },
  {
    badge: "Paso 3 · Masterizar",
    title: "Masterización profesional con un clic",
    description:
      "Sube tu mezcla y obtén un master con calidad de estudio listo para publicar.",
    mockup: (
      <div className="h-full rounded-xl border border-magenta/30 bg-background/70 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">cancion-final.wav</span>
          <span className="inline-flex items-center gap-1 text-magenta font-semibold">
            <Check className="h-3 w-3" /> Masterizado
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1">
          <div className="rounded-md bg-background/80 border border-border p-2 flex flex-col">
            <span className="text-[10px] text-muted-foreground mb-1">Antes</span>
            <div className="flex-1 flex items-end gap-[2px]">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 bg-foreground/20 rounded-sm"
                  style={{ height: `${30 + ((i * 17) % 40)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-md bg-background/80 border border-magenta/30 p-2 flex flex-col">
            <span className="text-[10px] text-magenta mb-1">Después</span>
            <div className="flex-1 flex items-end gap-[2px]">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-magenta to-pink"
                  style={{ height: `${55 + ((i * 23) % 45)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="px-2 py-1 rounded-full bg-magenta/15 text-magenta">+6 dB LUFS</span>
          <span className="px-2 py-1 rounded-full bg-pink/15 text-pink">EQ balanceado</span>
          <span className="px-2 py-1 rounded-full bg-foreground/10 text-muted-foreground">Stereo wide</span>
        </div>
      </div>
    ),
  },
  {
    badge: "Paso 4 · Material visual",
    title: "Genera todo el material promocional",
    description:
      "Portadas, posts, reels, flyers y vídeos creados automáticamente a partir de tu canción.",
    mockup: (
      <div className="grid grid-cols-3 gap-3 h-full content-center">
        {[
          { img: coverNeonPulse, title: "Neon Pulse", artist: "Vera Nova" },
          { img: coverFuegoLento, title: "Fuego Lento", artist: "Milo Reyes" },
          { img: coverCaminoDeAbril, title: "Camino de Abril", artist: "Luna Ártica" },
        ].map((c) => (
          <div key={c.title} className="relative rounded-xl overflow-hidden border border-magenta/30 aspect-square bg-black">
            <img src={c.img} alt={`Portada ${c.title}`} loading="lazy" className="w-full h-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-2">
              <div className="text-[11px] font-semibold text-foreground leading-tight">{c.title}</div>
              <div className="text-[9px] text-muted-foreground">{c.artist}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    badge: "Paso 5 · Artistas virtuales",
    title: "Diseña tus propios artistas con IA",
    description:
      "Crea avatares de artistas únicos, personaliza su estilo y úsalos en tus campañas.",
    mockup: (
      <div className="grid grid-cols-3 gap-3 h-full">
        {[
          { img: artist1, name: "Nova" },
          { img: artist2, name: "Kairo" },
          { img: artist3, name: "Lyra" },
        ].map((a, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden border border-border"
          >
            <img src={a.img} alt={`Artista ${a.name}`} loading="lazy" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-2">
              <div className="text-[11px] font-semibold text-foreground">{a.name}</div>
              <div className="text-[9px] text-muted-foreground">IA generado</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

const stepIcons = [Sparkles, Wand2, ImageIcon, UserSquare2];

export function HowItWorksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];

  const goTo = (i: number) => setCurrent(Math.max(0, Math.min(steps.length - 1, i)));

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCurrent(0); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border">
        {/* Mockup window */}
        <div className="bg-gradient-to-br from-card to-background/60">
          <div className="p-6 sm:p-8">
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, i) => {
                const Icon = stepIcons[i];
                const active = i === current;
                const done = i < current;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="flex items-center gap-2 group"
                    aria-label={`Ir al paso ${i + 1}`}
                  >
                    <span
                      className={`h-8 w-8 grid place-items-center rounded-full border transition-all ${
                        active
                          ? "bg-gradient-to-br from-magenta to-pink border-transparent text-white scale-110"
                          : done
                          ? "bg-magenta/20 border-magenta/40 text-magenta"
                          : "bg-background/60 border-border text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {i < steps.length - 1 && (
                      <span className={`h-px w-8 ${i < current ? "bg-magenta/60" : "bg-border"}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="text-center mb-5">
              <p className="text-xs uppercase tracking-wider text-pink font-semibold mb-2">
                {step.badge}
              </p>
              <h3 className="font-display font-bold text-2xl sm:text-3xl mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                {step.description}
              </p>
            </div>

            {/* Mockup area */}
            <div className="h-[260px] sm:h-[280px] rounded-2xl bg-background/30 border border-border p-4">
              {step.mockup}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                {current + 1} / {steps.length}
              </span>
              {current < steps.length - 1 ? (
                <button
                  onClick={() => goTo(current + 1)}
                  className="btn-magenta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <a
                  href="https://www.musicdibs.com/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onOpenChange(false)}
                  className="btn-magenta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Empezar <Sparkles className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
