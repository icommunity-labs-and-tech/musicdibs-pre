import { Wand2, Sliders, Megaphone, UserCircle2 } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "Crea canciones desde cero",
    desc: "Escribe tu idea y la IA la convertirá en una pista musical completa en segundos.",
    accent: "magenta",
  },
  {
    icon: Sliders,
    title: "Masterización Profesional",
    desc: "Mejora y pule la calidad de audio de tus canciones existentes para que suenen listas para Spotify.",
    accent: "cyan",
  },
  {
    icon: Megaphone,
    title: "Material Promocional",
    desc: "Genera automáticamente portadas, textos y kits de prensa para promocionar tu música.",
    accent: "magenta",
  },
  {
    icon: UserCircle2,
    title: "Crea tus propios Artistas",
    desc: "Diseña la identidad, avatar y estilo de artistas virtuales únicos guiados por IA.",
    accent: "cyan",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-pink mb-3">Studio capabilities</p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl">
            Todo lo que necesitas para <span className="text-gradient-brand">brillar</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Un estudio completo, potenciado por IA, sin curva de aprendizaje.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            const isMagenta = f.accent === "magenta";
            return (
              <article
                key={f.title}
                className="glass card-hover rounded-2xl p-6 relative overflow-hidden group"
              >
                <div
                  className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity ${
                    isMagenta ? "bg-magenta/40" : "bg-pink/40"
                  }`}
                />
                <div className="relative">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl mb-5 ${
                      isMagenta
                        ? "bg-magenta/15 text-magenta-glow ring-1 ring-magenta/30"
                        : "bg-pink/15 text-pink ring-1 ring-pink/30"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
