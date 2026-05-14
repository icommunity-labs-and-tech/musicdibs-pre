import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  X,
  Zap,
  Globe,
  ShieldCheck,
  Clock,
  DollarSign,
  Link2,
} from "lucide-react";

type Lang = "es" | "en" | "pt-BR";

interface Row {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  musicdibs: { value: string; positive?: boolean };
  competitor: { value: string; positive?: boolean };
}

interface Card {
  vs: string;
  tagline: string;
  badge: string;
  competitorName: string;
  rows: Row[];
}

interface Block {
  eyebrow: string;
  h2: string;
  intro: string;
  cards: Card[];
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
  badges: { faster: string; instant: string; global: string; certified: string };
}

const COPY: Record<Lang, Block> = {
  en: {
    eyebrow: "Comparisons",
    h2: "The best way to copyright music in 2026",
    intro:
      "How Musicdibs compares to the most popular copyright and distribution services. Faster, cheaper, and globally valid from day one.",
    badges: { faster: "Faster", instant: "Instant", global: "Global", certified: "Blockchain Certified" },
    cards: [
      {
        vs: "Musicdibs vs Copyright.gov (USCO)",
        tagline: "Blockchain timestamping vs traditional government registration.",
        badge: "Faster",
        competitorName: "Copyright.gov",
        rows: [
          { label: "Time to register", icon: Clock, musicdibs: { value: "Under 5 minutes", positive: true }, competitor: { value: "3 to 12 months" } },
          { label: "Cost per work", icon: DollarSign, musicdibs: { value: "From €2.99", positive: true }, competitor: { value: "$45+" } },
          { label: "International coverage", icon: Globe, musicdibs: { value: "180+ countries (Berne)", positive: true }, competitor: { value: "USA primarily" } },
          { label: "Public verification", icon: Link2, musicdibs: { value: "One-click online", positive: true }, competitor: { value: "Mail / in person" } },
        ],
      },
      {
        vs: "Musicdibs vs DistroKid",
        tagline: "Authorship proof vs distribution service.",
        badge: "Blockchain Certified",
        competitorName: "DistroKid",
        rows: [
          { label: "Proves authorship", icon: ShieldCheck, musicdibs: { value: "Yes — blockchain hash", positive: true }, competitor: { value: "No" } },
          { label: "Legal certificate", icon: Check, musicdibs: { value: "PDF + public hash", positive: true }, competitor: { value: "Not provided" } },
          { label: "Streaming distribution", icon: Globe, musicdibs: { value: "Optional add-on", positive: true }, competitor: { value: "Yes (annual fee)" } },
          { label: "Annual renewal needed", icon: Clock, musicdibs: { value: "No, lifetime proof", positive: true }, competitor: { value: "Yes" } },
        ],
      },
      {
        vs: "Blockchain vs traditional registration",
        tagline: "The fundamental difference between models.",
        badge: "Instant",
        competitorName: "Traditional registry",
        rows: [
          { label: "Tamper-proof record", icon: ShieldCheck, musicdibs: { value: "Immutable on-chain", positive: true }, competitor: { value: "Paper-based" } },
          { label: "Speed of issuance", icon: Zap, musicdibs: { value: "Instant", positive: true }, competitor: { value: "Weeks to months" } },
          { label: "Global enforceability", icon: Globe, musicdibs: { value: "Berne + eIDAS", positive: true }, competitor: { value: "Mostly national" } },
          { label: "Self-service flow", icon: Check, musicdibs: { value: "Fully online", positive: true }, competitor: { value: "Bureaucracy" } },
        ],
      },
      {
        vs: "Musicdibs vs Songtrust",
        tagline: "Authorship proof vs publishing administration.",
        badge: "Global",
        competitorName: "Songtrust",
        rows: [
          { label: "Proof of authorship", icon: ShieldCheck, musicdibs: { value: "Blockchain certificate", positive: true }, competitor: { value: "No (royalty admin only)" } },
          { label: "Setup cost", icon: DollarSign, musicdibs: { value: "From €2.99 / work", positive: true }, competitor: { value: "$100 one-time" } },
          { label: "Royalty collection", icon: Check, musicdibs: { value: "Via partners", positive: true }, competitor: { value: "Yes (15% commission)" } },
          { label: "Time to active proof", icon: Clock, musicdibs: { value: "Minutes", positive: true }, competitor: { value: "Weeks" } },
        ],
      },
    ],
    ctaTitle: "Protect your music in minutes",
    ctaText: "No paperwork. No waiting lists. Blockchain-certified proof valid in 180+ countries.",
    ctaButton: "Register my song",
  },
  es: {
    eyebrow: "Comparativas",
    h2: "La mejor forma de proteger tu música en 2026",
    intro:
      "Cómo se compara Musicdibs frente a los servicios de copyright y distribución más populares. Más rápido, más barato y con validez global desde el primer día.",
    badges: { faster: "Más rápido", instant: "Instantáneo", global: "Global", certified: "Certificado blockchain" },
    cards: [
      {
        vs: "Musicdibs vs Copyright.gov (USCO)",
        tagline: "Sello de tiempo blockchain frente a registro oficial tradicional.",
        badge: "Más rápido",
        competitorName: "Copyright.gov",
        rows: [
          { label: "Tiempo de registro", icon: Clock, musicdibs: { value: "Menos de 5 minutos", positive: true }, competitor: { value: "3 a 12 meses" } },
          { label: "Coste por obra", icon: DollarSign, musicdibs: { value: "Desde 2,99 €", positive: true }, competitor: { value: "Desde 45 $" } },
          { label: "Cobertura internacional", icon: Globe, musicdibs: { value: "+180 países (Berna)", positive: true }, competitor: { value: "Principalmente EE. UU." } },
          { label: "Verificación pública", icon: Link2, musicdibs: { value: "Online, un clic", positive: true }, competitor: { value: "Por correo o presencial" } },
        ],
      },
      {
        vs: "Musicdibs vs DistroKid",
        tagline: "Prueba de autoría frente a servicio de distribución.",
        badge: "Certificado blockchain",
        competitorName: "DistroKid",
        rows: [
          { label: "Prueba de autoría", icon: ShieldCheck, musicdibs: { value: "Sí — hash blockchain", positive: true }, competitor: { value: "No" } },
          { label: "Certificado legal", icon: Check, musicdibs: { value: "PDF + hash público", positive: true }, competitor: { value: "No incluido" } },
          { label: "Distribución a streaming", icon: Globe, musicdibs: { value: "Add-on opcional", positive: true }, competitor: { value: "Sí (cuota anual)" } },
          { label: "Renovación anual", icon: Clock, musicdibs: { value: "No, prueba vitalicia", positive: true }, competitor: { value: "Sí" } },
        ],
      },
      {
        vs: "Blockchain vs registro tradicional",
        tagline: "La diferencia de fondo entre los dos modelos.",
        badge: "Instantáneo",
        competitorName: "Registro tradicional",
        rows: [
          { label: "Registro inalterable", icon: ShieldCheck, musicdibs: { value: "Inmutable on-chain", positive: true }, competitor: { value: "Soporte papel" } },
          { label: "Velocidad de emisión", icon: Zap, musicdibs: { value: "Instantánea", positive: true }, competitor: { value: "Semanas o meses" } },
          { label: "Validez global", icon: Globe, musicdibs: { value: "Berna + eIDAS", positive: true }, competitor: { value: "Mayormente nacional" } },
          { label: "Autoservicio", icon: Check, musicdibs: { value: "100% online", positive: true }, competitor: { value: "Burocracia" } },
        ],
      },
      {
        vs: "Musicdibs vs Songtrust",
        tagline: "Prueba de autoría frente a administración editorial.",
        badge: "Global",
        competitorName: "Songtrust",
        rows: [
          { label: "Prueba de autoría", icon: ShieldCheck, musicdibs: { value: "Certificado blockchain", positive: true }, competitor: { value: "No (solo regalías)" } },
          { label: "Coste inicial", icon: DollarSign, musicdibs: { value: "Desde 2,99 € / obra", positive: true }, competitor: { value: "100 $ pago único" } },
          { label: "Cobro de regalías", icon: Check, musicdibs: { value: "Vía partners", positive: true }, competitor: { value: "Sí (15% comisión)" } },
          { label: "Tiempo a prueba activa", icon: Clock, musicdibs: { value: "Minutos", positive: true }, competitor: { value: "Semanas" } },
        ],
      },
    ],
    ctaTitle: "Protege tu música en minutos",
    ctaText: "Sin papeleo. Sin listas de espera. Prueba certificada en blockchain con validez en +180 países.",
    ctaButton: "Registrar mi obra",
  },
  "pt-BR": {
    eyebrow: "Comparativos",
    h2: "A melhor forma de proteger sua música em 2026",
    intro:
      "Como o Musicdibs se compara aos serviços de copyright e distribuição mais populares. Mais rápido, mais barato e com validade global desde o primeiro dia.",
    badges: { faster: "Mais rápido", instant: "Instantâneo", global: "Global", certified: "Certificado blockchain" },
    cards: [
      {
        vs: "Musicdibs vs Copyright.gov (USCO)",
        tagline: "Carimbo de tempo blockchain vs registro oficial tradicional.",
        badge: "Mais rápido",
        competitorName: "Copyright.gov",
        rows: [
          { label: "Tempo de registro", icon: Clock, musicdibs: { value: "Menos de 5 minutos", positive: true }, competitor: { value: "3 a 12 meses" } },
          { label: "Custo por obra", icon: DollarSign, musicdibs: { value: "A partir de R$ 19", positive: true }, competitor: { value: "US$ 45+" } },
          { label: "Cobertura internacional", icon: Globe, musicdibs: { value: "+180 países (Berna)", positive: true }, competitor: { value: "Principalmente EUA" } },
          { label: "Verificação pública", icon: Link2, musicdibs: { value: "Online, um clique", positive: true }, competitor: { value: "Correio ou presencial" } },
        ],
      },
      {
        vs: "Musicdibs vs DistroKid",
        tagline: "Prova de autoria vs serviço de distribuição.",
        badge: "Certificado blockchain",
        competitorName: "DistroKid",
        rows: [
          { label: "Prova de autoria", icon: ShieldCheck, musicdibs: { value: "Sim — hash blockchain", positive: true }, competitor: { value: "Não" } },
          { label: "Certificado legal", icon: Check, musicdibs: { value: "PDF + hash público", positive: true }, competitor: { value: "Não incluso" } },
          { label: "Distribuição em streaming", icon: Globe, musicdibs: { value: "Add-on opcional", positive: true }, competitor: { value: "Sim (taxa anual)" } },
          { label: "Renovação anual", icon: Clock, musicdibs: { value: "Não, prova vitalícia", positive: true }, competitor: { value: "Sim" } },
        ],
      },
      {
        vs: "Blockchain vs registro tradicional",
        tagline: "A diferença essencial entre os dois modelos.",
        badge: "Instantâneo",
        competitorName: "Registro tradicional",
        rows: [
          { label: "Registro inalterável", icon: ShieldCheck, musicdibs: { value: "Imutável on-chain", positive: true }, competitor: { value: "Suporte papel" } },
          { label: "Velocidade de emissão", icon: Zap, musicdibs: { value: "Instantânea", positive: true }, competitor: { value: "Semanas a meses" } },
          { label: "Validade global", icon: Globe, musicdibs: { value: "Berna + eIDAS", positive: true }, competitor: { value: "Majoritariamente nacional" } },
          { label: "Autoatendimento", icon: Check, musicdibs: { value: "100% online", positive: true }, competitor: { value: "Burocracia" } },
        ],
      },
      {
        vs: "Musicdibs vs Songtrust",
        tagline: "Prova de autoria vs administração editorial.",
        badge: "Global",
        competitorName: "Songtrust",
        rows: [
          { label: "Prova de autoria", icon: ShieldCheck, musicdibs: { value: "Certificado blockchain", positive: true }, competitor: { value: "Não (só royalties)" } },
          { label: "Custo inicial", icon: DollarSign, musicdibs: { value: "A partir de R$ 19 / obra", positive: true }, competitor: { value: "US$ 100 único" } },
          { label: "Coleta de royalties", icon: Check, musicdibs: { value: "Via parceiros", positive: true }, competitor: { value: "Sim (15% comissão)" } },
          { label: "Tempo até prova ativa", icon: Clock, musicdibs: { value: "Minutos", positive: true }, competitor: { value: "Semanas" } },
        ],
      },
    ],
    ctaTitle: "Proteja sua música em minutos",
    ctaText: "Sem burocracia. Sem filas. Prova certificada em blockchain válida em +180 países.",
    ctaButton: "Registrar minha obra",
  },
};

interface Props {
  lang: Lang;
  ctaHref?: string;
}

export const CompetitorComparison = ({ lang, ctaHref = "/login" }: Props) => {
  const t = COPY[lang];

  return (
    <section className="mb-20" aria-labelledby="competitor-comparison-heading">
      <div className="text-center mb-12">
        <span className="inline-block text-xs uppercase tracking-widest font-bold text-pink-300 mb-3">
          {t.eyebrow}
        </span>
        <h2
          id="competitor-comparison-heading"
          className="text-3xl md:text-4xl font-bold text-white mb-4"
        >
          {t.h2}
        </h2>
        <p className="text-white/70 max-w-2xl mx-auto">{t.intro}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {t.cards.map((card, idx) => (
          <article
            key={idx}
            className="group relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-pink-400/40 transition-colors"
          >
            <div className="flex items-start justify-between mb-5 gap-3">
              <div>
                <h3 className="text-lg font-bold text-white leading-snug">{card.vs}</h3>
                <p className="text-white/60 text-sm mt-1">{card.tagline}</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 text-pink-200 text-xs font-semibold">
                <Zap className="w-3 h-3" />
                {card.badge}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 text-sm items-center">
              <div />
              <div className="text-pink-300 font-bold uppercase text-[10px] tracking-wider text-right">
                Musicdibs
              </div>
              <div className="text-white/50 font-bold uppercase text-[10px] tracking-wider text-right min-w-[110px]">
                {card.competitorName}
              </div>

              {card.rows.map((row, i) => {
                const Icon = row.icon;
                return (
                  <div key={i} className="contents">
                    <div className="flex items-center gap-2 text-white/80 py-2 border-t border-white/5">
                      <Icon className="w-4 h-4 text-pink-400/80 shrink-0" />
                      <span>{row.label}</span>
                    </div>
                    <div className="py-2 border-t border-white/5 text-right text-pink-200 font-semibold">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        {row.musicdibs.value}
                      </span>
                    </div>
                    <div className="py-2 border-t border-white/5 text-right text-white/60">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <X className="w-3.5 h-3.5 text-white/30" />
                        {row.competitor.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {/* Trust badges row */}
      <div className="flex flex-wrap justify-center gap-3 mt-10">
        {[t.badges.faster, t.badges.instant, t.badges.global, t.badges.certified].map((b) => (
          <span
            key={b}
            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-semibold uppercase tracking-wider"
          >
            {b}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-white/10 rounded-2xl p-8 md:p-10 text-center">
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{t.ctaTitle}</h3>
        <p className="text-white/70 mb-6 max-w-lg mx-auto">{t.ctaText}</p>
        <Link to={ctaHref}>
          <Button variant="hero" size="xl" className="font-semibold">
            <span className="flex items-center gap-2">
              {t.ctaButton} <ArrowRight className="w-5 h-5" />
            </span>
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default CompetitorComparison;
