import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Sparkles, Mic, Wand2 } from "lucide-react";
import demoVideo from "@/assets/landing/promo/ai-studio-demo.mp4";

export function VoiceToProduction() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const userOverrideRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.play().catch(() => {});
  }, [muted]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (userOverrideRef.current) return;
        setMuted(!entry.isIntersecting || entry.intersectionRatio < 0.5);
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    userOverrideRef.current = true;
    setMuted(next);
    v.muted = next;
    v.play().catch(() => {});
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <style>{`
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes neonDrift {
          0%, 100% { opacity: 0.45; transform: translate(0,0) scale(1); }
          50% { opacity: 0.85; transform: translate(6px,-10px) scale(1.15); }
        }
        .phone-float { animation: phoneFloat 6s ease-in-out infinite; }
        .neon-particle { animation: neonDrift 5s ease-in-out infinite; }
      `}</style>

      <div className="absolute top-1/4 -right-32 h-[26rem] w-[26rem] rounded-full bg-magenta/20 blur-[120px] orb pointer-events-none" />
      <div className="absolute bottom-0 -left-32 h-[24rem] w-[24rem] rounded-full bg-pink/15 blur-[120px] orb pointer-events-none" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Phone mockup side */}
          <div ref={containerRef} className="relative order-2 lg:order-1">
            <div className="relative mx-auto w-[280px] sm:w-[320px] lg:w-[340px]">
              {/* Badge above */}
              <div className="flex justify-center mb-5">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white border border-white/15 bg-gradient-to-r from-magenta/25 to-pink/25 backdrop-blur-md shadow-[0_0_20px_rgba(217,70,239,0.35)]">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                  IA Music Studio
                </span>
              </div>

              {/* Neon glow halo */}
              <div className="absolute -inset-8 bg-gradient-to-br from-fuchsia-500/30 via-pink-500/20 to-purple-600/25 blur-3xl rounded-[3rem] pointer-events-none" />

              {/* Subtle neon particles */}
              <span className="neon-particle pointer-events-none absolute -top-2 -left-3 h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.9)]" />
              <span className="neon-particle pointer-events-none absolute top-1/3 -right-4 h-1.5 w-1.5 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.9)]" style={{ animationDelay: "1.2s" }} />
              <span className="neon-particle pointer-events-none absolute bottom-10 -left-5 h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.9)]" style={{ animationDelay: "2.4s" }} />

              {/* iPhone frame */}
              <div className="phone-float relative mx-auto rounded-[2.6rem] bg-gradient-to-b from-zinc-900 to-black p-[10px] border border-white/10 shadow-[0_30px_80px_-20px_rgba(217,70,239,0.45),0_0_60px_-10px_rgba(168,85,247,0.4)]">
                {/* Inner bezel */}
                <div className="relative rounded-[2.1rem] overflow-hidden bg-black aspect-[9/19.5]">
                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-6 w-24 rounded-full bg-black" />
                  <video
                    ref={videoRef}
                    src={demoVideo}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                  {/* Sound toggle (subtle, no classic controls) */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    aria-label={muted ? "Activar sonido" : "Silenciar"}
                    className="absolute bottom-4 right-4 z-20 inline-flex items-center justify-center h-10 w-10 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/15 text-white transition"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Caption below */}
              <p className="mt-5 text-center text-xs text-muted-foreground">
                🔊 Activa el sonido y escucha la magia
              </p>
            </div>
          </div>

          {/* Text side */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground mb-6">
              <span className="h-2 w-2 rounded-full bg-magenta animate-pulse" />
              Voz a producción · IA
            </div>
            <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Tu pones la voz. <span className="text-gradient-brand">La IA crea el hit.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              ¿Cantas? Sube tu voz a capela y nuestra IA construye toda la producción a tu alrededor: afinación profesional, instrumentación, arreglos y mezcla profesional en minutos. Tú pones la semilla, el AI Music Studio hace la magia.
            </p>

            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-magenta/15 text-magenta border border-magenta/20">
                  <Mic className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">Sube tu voz</p>
                  <p className="text-sm text-muted-foreground">Una toma rápida desde el móvil es suficiente.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pink/15 text-pink border border-pink/20">
                  <Wand2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">La IA produce</p>
                  <p className="text-sm text-muted-foreground">Genera instrumentación, arreglos y mezcla a medida.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-magenta/15 text-magenta border border-magenta/20">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">Listo para publicar</p>
                  <p className="text-sm text-muted-foreground">Exporta tu track terminado en minutos.</p>
                </div>
              </li>
            </ul>

            <div className="mt-8">
              <a
                href="https://www.musicdibs.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-magenta to-pink px-8 py-4 text-base font-semibold text-white shadow-lg shadow-magenta/30 hover:shadow-magenta/50 hover:scale-[1.02] transition-all"
              >
                Probar IA Music Studio
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
