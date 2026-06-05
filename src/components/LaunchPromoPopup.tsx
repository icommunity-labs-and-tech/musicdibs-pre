import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";

const PROMO_CODE = "VERANO25";
const SHOWN_KEY = "musicdibs_verano25_popup_shown";

// Lunes 20 de julio 2026, 00:00 hora España (CEST, UTC+2)
const FIXED_DEADLINE = new Date("2026-07-19T22:00:00Z");

const getDeadline = () => FIXED_DEADLINE;

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

export const LaunchPromoPopup = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [target] = useState(getDeadline);
  const { days, hours, minutes, seconds } = useCountdown(target);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(SHOWN_KEY, "1");
    }, 7000);
    return () => clearTimeout(t);
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const goToPricing = () => {
    setOpen(false);
    setTimeout(() => {
      document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-[92vw] sm:max-w-[560px] lg:max-w-[600px] border-none p-0 overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(135deg, #0891b2 0%, #06b6d4 25%, #fbbf24 60%, #f97316 85%, #ec4899 100%)",
        }}
      >
        {/* Sun + sea glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-yellow-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-pink-400/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300/20 blur-2xl" />

        <div className="relative px-6 py-7 sm:px-8 sm:py-8">
          {/* Badge */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
              ☀️ Verano Musicdibs 🌴
            </span>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl sm:text-[28px] lg:text-3xl font-bold leading-tight mb-2 drop-shadow-md">
            Suena este verano con Musicdibs
          </h2>
          <p className="text-center text-white/90 text-sm sm:text-[15px] mb-4">
            Crea, protege y distribuye tu música con IA.
          </p>

          {/* Benefits inline */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] sm:text-[13px] text-white/90 mb-5">
            <span>🎵 IA musical</span>
            <span className="text-white/40">•</span>
            <span>🛡️ Protección legal</span>
            <span className="text-white/40">•</span>
            <span>🌍 Distribución</span>
            <span className="text-white/40">•</span>
            <span>🔥 Promoción</span>
          </div>

          {/* Offer */}
          <div className="text-center mb-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              🏖️ -25% · Solo 4 días
            </div>
          </div>

          {/* Premium coupon block */}
          <button
            onClick={copyCode}
            className="group relative w-full mb-4 overflow-hidden rounded-xl border-2 border-dashed border-white/50 bg-gradient-to-r from-yellow-300/20 via-orange-400/20 to-pink-500/20 px-4 py-3.5 backdrop-blur-sm transition hover:border-white/80 hover:from-yellow-300/30 hover:to-pink-500/30"
            aria-label="Copiar código promocional"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                  Tu código
                </span>
                <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-[0.2em] text-white drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]">
                  {PROMO_CODE}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-white/30">
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-200" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </>
                )}
              </span>
            </div>
          </button>

          {/* Compact countdown */}
          <div className="flex items-center justify-center gap-1.5 mb-5 font-mono tabular-nums text-white">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 mr-1">
              Termina en
            </span>
            {[
              { v: days, l: "d" },
              { v: hours, l: "h" },
              { v: minutes, l: "m" },
              { v: seconds, l: "s" },
            ].map((u, i, arr) => (
              <span key={i} className="flex items-baseline">
                <span className="text-sm sm:text-base font-bold">{pad(u.v)}</span>
                <span className="text-[10px] text-white/70 ml-0.5">{u.l}</span>
                {i < arr.length - 1 && <span className="text-white/40 mx-1">:</span>}
              </span>
            ))}
          </div>

          {/* CTA principal */}
          <button
            onClick={goToPricing}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-600 px-6 py-4 text-base sm:text-lg font-bold shadow-lg shadow-orange-500/40 transition hover:scale-[1.02] hover:shadow-pink-500/60 hover:shadow-2xl"
          >
            🍹 Aprovechar oferta
          </button>

          {/* CTA secundario */}
          <div className="mt-3 text-center">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-white/70 underline-offset-4 transition hover:text-white hover:underline"
            >
              Seguir explorando
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
