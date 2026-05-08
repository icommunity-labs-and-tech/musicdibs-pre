import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

const TARGET_DATE = new Date("2026-05-31T23:59:59");
const PROMO_CODE = "NEWMUSIC30";

const useCountdown = (target: Date) => {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
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
    document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative w-full border-y border-white/10 animate-fade-in overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, #2a0a4a 0%, #4c1d95 35%, #7c3aed 65%, #c026d3 100%)",
      }}
    >
      {/* Glow sutil */}
      <div className="pointer-events-none absolute inset-y-0 left-1/4 w-1/2 bg-fuchsia-500/20 blur-3xl" />

      <div className="container relative mx-auto px-4 py-3 md:py-4">
        <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:items-center lg:justify-center lg:gap-8 lg:text-left">
          {/* Texto principal */}
          <div className="lg:flex-shrink-0 lg:pl-8 xl:pl-16">
            <span className="text-base md:text-lg lg:text-xl font-bold text-white leading-tight">
              🚀 Nueva era de Musicdibs
            </span>
          </div>

          {/* Oferta + Código + Countdown + CTA */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-xs md:text-sm font-bold tracking-wider text-white border border-white/20 whitespace-nowrap">
              🎁 -30% · Solo mayo
            </span>

            <button
              onClick={copyCode}
              className="group inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3.5 py-2 backdrop-blur-sm transition hover:bg-white/20"
              aria-label="Copiar código"
            >
              <span className="font-mono text-sm md:text-base font-bold text-white tracking-wider">
                {PROMO_CODE}
              </span>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-300" />
              ) : (
                <Copy className="h-4 w-4 text-white/80 group-hover:text-white" />
              )}
            </button>

            <div className="flex items-center gap-1 font-mono text-sm md:text-base font-bold text-white tabular-nums">
              {[
                { v: days, l: "D" },
                { v: hours, l: "H" },
                { v: minutes, l: "M" },
                { v: seconds, l: "S" },
              ].map((u, i) => (
                <span key={i} className="inline-flex items-baseline">
                  <span className="rounded bg-black/30 px-2 py-1">{pad(u.v)}</span>
                  <span className="ml-0.5 text-[10px] text-white/60 uppercase">{u.l}</span>
                  {i < 3 && <span className="mx-0.5 text-white/30">:</span>}
                </span>
              ))}
            </div>

            <button
              onClick={scrollToPricing}
              className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm md:text-base font-bold text-white shadow-md transition hover:scale-105 hover:shadow-fuchsia-500/60 hover:shadow-xl whitespace-nowrap"
            >
              🔥 Aprovechar oferta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
