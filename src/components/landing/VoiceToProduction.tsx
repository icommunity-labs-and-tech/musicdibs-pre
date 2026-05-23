import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Sparkles, Mic, Wand2 } from "lucide-react";
import voiceVideo from "@/assets/landing/promo/videoclip-before-forgetting-you.mp4";

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
      <div className="absolute top-1/4 -right-32 h-[26rem] w-[26rem] rounded-full bg-magenta/20 blur-[120px] orb pointer-events-none" />
      <div className="absolute bottom-0 -left-32 h-[24rem] w-[24rem] rounded-full bg-pink/15 blur-[120px] orb pointer-events-none" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Video side */}
          <div ref={containerRef} className="relative order-2 lg:order-1">
            <div className="relative mx-auto max-w-sm lg:max-w-md">
              <div className="absolute -inset-4 bg-gradient-to-br from-magenta/30 via-pink/20 to-transparent blur-2xl rounded-[2rem] pointer-events-none" />
              <div className="relative rounded-[1.25rem] bg-slate-900/60 p-1.5 sm:p-2 border border-white/10 shadow-2xl backdrop-blur-sm">
                <div className="relative rounded-[0.85rem] overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    src={voiceVideo}
                    className="w-full h-auto block"
                    autoPlay
                    loop
                    playsInline
                  />
                  <button
                    type="button"
                    onClick={toggleSound}
                    aria-label={muted ? "Activar sonido" : "Silenciar"}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 px-3 py-2 text-xs text-white transition"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span>{muted ? "Activar sonido" : "Silenciar"}</span>
                  </button>
                </div>
              </div>
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
              Sube tu voz a capela y nuestra IA construye toda la producción a tu alrededor: afinación profesional, instrumentación, arreglos y mezcla profesional en minutos. Tú pones la semilla, el AI Music Studio hace la magia.
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
