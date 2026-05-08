import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";

const TARGET_DATE = new Date("2026-05-31T23:59:59");
const PROMO_CODE = "NEWMUSIC30";
const STORAGE_KEY = "musicdibs_launch_promo_shown";

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
  const { days, hours, minutes, seconds } = useCountdown(TARGET_DATE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
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
            "linear-gradient(135deg, #1a0533 0%, #2a0a4a 30%, #4c1d95 60%, #c026d3 100%)",
        }}
      >
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />

        <div className="relative px-6 py-7 sm:px-8 sm:py-8">
          {/* Badge */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
              🚀 Nuevo Musicdibs 2.0
            </span>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl sm:text-[28px] lg:text-3xl font-bold leading-tight mb-2">
            La nueva era de Musicdibs ya está aquí
          </h2>
          <p className="text-center text-white/70 text-sm sm:text-[15px] mb-4">
            Crea, protege y distribuye música con IA.
          </p>

          {/* Benefits inline */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] sm:text-[13px] text-white/80 mb-5">
            <span>🎵 IA musical</span>
            <span className="text-white/30">•</span>
            <span>🛡️ Protección legal</span>
            <span className="text-white/30">•</span>
            <span>🌍 Distribución</span>
            <span className="text-white/30">•</span>
            <span>🔥 Promoción</span>
          </div>

          {/* Offer + Code */}
          <div className="text-center mb-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              🎁 -30% solo en mayo
            </div>
          </div>

          {/* Premium coupon block */}
          <button
            onClick={copyCode}
            className="group relative w-full mb-4 overflow-hidden rounded-xl border-2 border-dashed border-white/40 bg-gradient-to-r from-pink-500/20 via-fuchsia-500/20 to-purple-500/20 px-4 py-3.5 backdrop-blur-sm transition hover:border-white/70 hover:from-pink-500/30 hover:to-purple-500/30"
            aria-label="Copiar código promocional"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                  Tu código
                </span>
                <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-[0.2em] text-white drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]">
                  {PROMO_CODE}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-white/25">
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
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
          <div className="flex items-center justify-center gap-1.5 mb-5 font-mono tabular-nums text-white/90">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 mr-1">
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
                <span className="text-[10px] text-white/50 ml-0.5">{u.l}</span>
                {i < arr.length - 1 && <span className="text-white/30 mx-1">:</span>}
              </span>
            ))}
          </div>

          {/* CTA principal */}
          <button
            onClick={goToPricing}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 text-base sm:text-lg font-bold shadow-lg shadow-fuchsia-500/30 transition hover:scale-[1.02] hover:shadow-fuchsia-500/60 hover:shadow-2xl"
          >
            🔥 Aprovechar oferta
          </button>

          {/* CTA secundario tipo link */}
          <div className="mt-3 text-center">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
            >
              Seguir explorando
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
