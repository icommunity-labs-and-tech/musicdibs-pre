import { ShieldCheck, Music2, Rocket, Sparkles } from "lucide-react";

export function EcosystemContinuation() {
  const badges = [
    { Icon: ShieldCheck, label: "Registro legal" },
    { Icon: Music2, label: "Distribución global" },
    { Icon: Rocket, label: "Promoción para redes" },
  ];

  return (
    <section className="relative py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative glass rounded-3xl px-6 sm:px-10 py-10 overflow-hidden glow-magenta">
          {/* Glow orbs */}
          <div
            className="absolute -top-24 -left-16 h-64 w-64 rounded-full opacity-60 orb pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.68 0.27 322 / 0.55), transparent 70%)" }}
          />
          <div
            className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-50 orb pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.6 0.3 285 / 0.5), transparent 70%)", animationDelay: "1.5s" }}
          />
          {/* Subtle neon particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[
              { top: "18%", left: "12%", delay: "0s" },
              { top: "72%", left: "22%", delay: "1.2s" },
              { top: "30%", left: "78%", delay: "0.6s" },
              { top: "60%", left: "88%", delay: "2s" },
              { top: "85%", left: "55%", delay: "0.9s" },
            ].map((p, i) => (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full animate-pulse"
                style={{
                  top: p.top,
                  left: p.left,
                  animationDelay: p.delay,
                  background: "oklch(0.85 0.25 322)",
                  boxShadow: "0 0 8px 2px oklch(0.78 0.25 322 / 0.8)",
                }}
              />
            ))}
          </div>

          <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12 text-center lg:text-left">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-foreground/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-magenta-glow mb-4">
                <Sparkles className="h-3 w-3" />
                Todo en un mismo lugar
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight text-gradient-brand">
                Recuerda que en Musicdibs también puedes registrar los derechos de autor de tu música y distribución internacional cuando esté lista.
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-3 shrink-0">
              {badges.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="group flex items-center gap-2 rounded-2xl border border-border bg-deep/50 px-4 py-2.5 text-sm card-hover transition-all"
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-all group-hover:scale-110"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.68 0.27 322 / 0.25), oklch(0.6 0.25 285 / 0.25))",
                      boxShadow: "0 0 16px -4px oklch(0.68 0.27 322 / 0.6)",
                    }}
                  >
                    <Icon className="h-4 w-4 text-pink" style={{ color: "oklch(0.85 0.22 340)" }} />
                  </span>
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
