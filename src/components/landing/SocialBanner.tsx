import { ShieldCheck, Globe2, BadgeCheck } from "lucide-react";

export function SocialBanner() {
  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-magenta/10 via-transparent to-pink/10 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-magenta-glow mb-2">
                Validez legal · Distribución global
              </p>
              <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight">
                Tu música, 100% tuya. Lista para sonar en todo el mundo.
              </h3>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Las canciones creadas con Musicdibs tienen validez legal y están listas para
                distribuirse en Spotify, Apple Music, YouTube y cualquier plataforma global.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 shrink-0">
              {[
                { Icon: ShieldCheck, label: "Validez legal" },
                { Icon: BadgeCheck, label: "Royalties tuyos" },
                { Icon: Globe2, label: "Distribución global" },
              ].map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl bg-deep/50 border border-border px-3.5 py-2.5 text-sm"
                >
                  <Icon className="h-4 w-4 text-pink" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
