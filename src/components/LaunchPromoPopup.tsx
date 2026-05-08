import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Copy, Check, Sparkles, Shield, Globe, Flame } from "lucide-react";

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
    }, 2500);
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

  const benefits = [
    { icon: Sparkles, text: "Genera canciones con IA" },
    { icon: Shield, text: "Registra y protege tus obras" },
    { icon: Globe, text: "Distribuye a plataformas musicales" },
    { icon: Flame, text: "Promociona tu música automáticamente" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-[92vw] sm:max-w-[720px] lg:max-w-[820px] border-none p-0 overflow-hidden text-white max-h-[92vh] overflow-y-auto"
        style={{
          background:
            "linear-gradient(135deg, #1a0533 0%, #2a0a4a 30%, #4c1d95 60%, #c026d3 100%)",
        }}
      >
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />

        <div className="relative p-6 sm:p-9">
          {/* Badge */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
              🚀 Nuevo MusicDibs 2.0
            </span>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-2">
            La nueva era de MusicDibs ya está aquí
          </h2>
          <p className="text-center text-white/75 text-sm sm:text-base mb-6 max-w-xl mx-auto">
            Crea música con IA, protégela y distribúyela desde un solo lugar.
          </p>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            {benefits.map(({ icon: Icon, text }, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-600">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="text-sm font-medium text-white/90">{text}</span>
              </div>
            ))}
          </div>

          {/* Offer block */}
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md p-4 sm:p-5 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="text-xs uppercase tracking-wider text-white/70 mb-1">
                  🎁 Oferta de lanzamiento
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold">
                  -30% solo en mayo
                </div>
              </div>

              <button
                onClick={copyCode}
                className="group inline-flex items-center justify-between gap-3 rounded-xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm transition hover:bg-white/20"
                aria-label="Copiar código promocional"
              >
                <span className="font-mono text-base sm:text-lg font-bold tracking-wider">
                  {PROMO_CODE}
                </span>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Copy className="h-4 w-4 text-white/80 group-hover:text-white" />
                )}
              </button>
            </div>

            {/* Countdown */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-center text-[11px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Termina en
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-3 font-mono tabular-nums">
                {[
                  { v: days, l: "Días" },
                  { v: hours, l: "Horas" },
                  { v: minutes, l: "Min" },
                  { v: seconds, l: "Seg" },
                ].map((u, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="rounded-lg bg-black/40 border border-white/10 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-lg sm:text-2xl font-bold">
                      {pad(u.v)}
                    </span>
                    <span className="mt-1 text-[9px] sm:text-[10px] uppercase text-white/60">
                      {u.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={goToPricing}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-3 text-sm sm:text-base font-bold shadow-lg transition hover:scale-[1.02] hover:shadow-fuchsia-500/60 hover:shadow-2xl"
            >
              🔥 Aprovechar oferta
            </button>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm sm:text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Seguir explorando
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
