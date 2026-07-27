import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useCouponCountdown } from "@/hooks/useCouponCountdown";

const PROMO_CODE = "VERANO25";
const SHOWN_KEY = "musicdibs_verano25_popup_shown";

// Lunes 8 de junio 2026, 23:59 hora España (CEST, UTC+2)
const DEADLINE = new Date("2026-06-08T21:59:00Z");

const pad = (n: number) => n.toString().padStart(2, "0");

export const LaunchPromoPopup = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { days, hours, minutes, seconds, expired } = useCouponCountdown(DEADLINE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (expired) return;
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(SHOWN_KEY, "1");
    }, 7000);
    return () => clearTimeout(t);
  }, [expired]);

  // Regla global: si el contador llega a 00, cerrar y no volver a abrir.
  useEffect(() => {
    if (expired) setOpen(false);
  }, [expired]);

  if (expired) return null;



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
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-warning/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warning/20 blur-2xl" />

        <div className="relative px-6 py-7 sm:px-8 sm:py-8">
          {/* Badge */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-page-border-strong bg-page-surface-strong px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
              ☀️ Verano Musicdibs 🌴
            </span>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl sm:text-[28px] lg:text-3xl font-bold leading-tight mb-2 drop-shadow-md">
            Suena este verano con Musicdibs
          </h2>
          <p className="text-center text-page-fg text-sm sm:text-[15px] mb-4">
            Crea, protege y distribuye tu música con IA.
          </p>

          {/* Benefits inline */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] sm:text-[13px] text-page-fg mb-5">
            <span>🎵 IA musical</span>
            <span className="text-page-fg-subtle">•</span>
            <span>🛡️ Protección legal</span>
            <span className="text-page-fg-subtle">•</span>
            <span>🌍 Distribución</span>
            <span className="text-page-fg-subtle">•</span>
            <span>🔥 Promoción</span>
          </div>

          {/* Offer */}
          <div className="text-center mb-3">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              🏖️ -25%  
            </div>
          </div>

          {/* Premium coupon block */}
          <button
            onClick={copyCode}
            className="group relative w-full mb-4 overflow-hidden rounded-xl border-2 border-dashed border-white/50 bg-gradient-to-r from-warning/20 via-warning/20 to-brand/20 px-4 py-3.5 backdrop-blur-sm transition hover:border-white/80 hover:from-warning/30 hover:to-brand/30"
            aria-label="Copiar código promocional"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-[0.2em] text-page-fg-muted">
                  Tu código
                </span>
                <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-[0.2em] text-white drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]">
                  {PROMO_CODE}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-page-surface-strong px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-page-surface-strong">
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
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
            <span className="text-[10px] uppercase tracking-[0.18em] text-page-fg-muted mr-1">
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
                <span className="text-[10px] text-page-fg-muted ml-0.5">{u.l}</span>
                {i < arr.length - 1 && <span className="text-page-fg-subtle mx-1">:</span>}
              </span>
            ))}
          </div>

          {/* CTA principal */}
          <button
            onClick={goToPricing}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-warning via-brand to-accent px-6 py-4 text-base sm:text-lg font-bold shadow-lg shadow-orange-500/40 transition hover:scale-[1.02] hover:shadow-pink-500/60 hover:shadow-2xl"
          >
            🍹 Aprovechar oferta
          </button>

          {/* CTA secundario */}
          <div className="mt-3 text-center">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-page-fg-muted underline-offset-4 transition hover:text-page-fg hover:underline"
            >
              Seguir explorando
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
