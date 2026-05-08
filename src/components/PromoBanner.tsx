import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const TARGET_DATE = new Date("2026-05-31T23:59:59");
const PROMO_CODE = "NEWMUSIC30";

const useCountdown = (target: Date) => {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff / 3600000) % 24);
    const minutes = Math.floor((diff / 60000) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

const pad = (n: number) => n.toString().padStart(2, "0");

export const PromoBanner = () => {
  const { t } = useTranslation();
  const { days, hours, minutes, seconds } = useCountdown(TARGET_DATE);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const scrollToPricing = () => {
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8 md:p-10 animate-fade-in backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(76,29,149,0.95) 0%, rgba(124,58,237,0.9) 45%, rgba(217,70,239,0.9) 100%)",
        }}
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-500/40 blur-3xl" />

        <div className="relative flex flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          {/* Texto principal */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              🚀 La nueva era de MusicDibs ya está aquí
            </h2>
            <p className="mt-2 text-sm md:text-base text-white/85">
              Crea música con IA, protégela y distribúyela desde un solo lugar.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wider text-white border border-white/20">
              🎁 -30% Solo MAYO
            </div>
          </div>

          {/* Código */}
          <button
            onClick={copyCode}
            className="group flex items-center justify-between gap-3 rounded-xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-md transition hover:bg-white/20"
            aria-label="Copiar código"
          >
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-widest text-white/70">Código</div>
              <div className="font-mono text-base font-bold text-white">{PROMO_CODE}</div>
            </div>
            {copied ? (
              <Check className="h-5 w-5 text-emerald-300" />
            ) : (
              <Copy className="h-5 w-5 text-white/80 group-hover:text-white" />
            )}
          </button>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            {[
              { v: days, l: "Días" },
              { v: hours, l: "Hrs" },
              { v: minutes, l: "Min" },
              { v: seconds, l: "Seg" },
            ].map((u, i) => (
              <div
                key={i}
                className="min-w-[3.25rem] rounded-lg border border-white/15 bg-black/25 px-2 py-2 text-center backdrop-blur-md"
              >
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {pad(u.v)}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-white/70">{u.l}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={scrollToPricing}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-3 text-sm md:text-base font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:scale-105 hover:shadow-fuchsia-500/60 hover:shadow-2xl"
          >
            🔥 Aprovechar oferta
          </button>
        </div>
      </div>
    </section>
  );
};
