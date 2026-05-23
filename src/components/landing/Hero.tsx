import { useState } from "react";
import { Rocket, Play } from "lucide-react";
import { SongGenerator } from "./SongGenerator";
import { HowItWorksDialog } from "./HowItWorksDialog";

export function Hero() {
  const [howOpen, setHowOpen] = useState(false);
  return (
    <section className="relative pt-36 pb-20 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 -left-32 h-[28rem] w-[28rem] rounded-full bg-magenta/25 blur-[120px] orb pointer-events-none" />
      <div className="absolute top-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-pink/20 blur-[120px] orb pointer-events-none" style={{ animationDelay: "3s" }} />
      <div className="absolute inset-0 bg-noise" />

      <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground mb-6">
            <span className="h-2 w-2 rounded-full bg-magenta animate-pulse" />
            Nuevo · IA Music Studio
          </div>

          <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
            Crea y Mejora tu música <span className="text-gradient-brand">con IA</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            El estudio musical definitivo con Inteligencia Artificial. Crea y mejora tus canciones,
            masteriza de forma profesional, genera material promocional y diseña tus propios
            artistas virtuales en minutos.
          </p>

          <div id="cta" className="mt-9 flex flex-wrap items-center gap-4">
            <a href="https://www.musicdibs.com/login" target="_blank" rel="noopener noreferrer" className="btn-magenta inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold">
              <Rocket className="h-4 w-4" />
              Probar IA Music Studio
            </a>
            <button onClick={() => setHowOpen(true)} className="btn-ghost inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold">
              <Play className="h-4 w-4" />
              Ver cómo funciona
            </button>
          </div>

          <div className="mt-10 flex items-center gap-8 text-xs text-muted-foreground">
            <div>
              <p className="text-2xl font-display font-bold text-foreground">+120k</p>
              <p>Canciones creadas</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-2xl font-display font-bold text-foreground">4.9★</p>
              <p>Valoración artistas</p>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div className="hidden sm:block">
              <p className="text-2xl font-display font-bold text-foreground">100%</p>
              <p>Propiedad legal</p>
            </div>
          </div>
        </div>

        <SongGenerator />
      </div>
      <HowItWorksDialog open={howOpen} onOpenChange={setHowOpen} />
    </section>
  );
}
