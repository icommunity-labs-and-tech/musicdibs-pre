import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Copy, Check, Flame } from "lucide-react";

const TARGET_DATE = new Date("2026-05-31T23:59:59");
const STORAGE_KEY = "launchPromoBannerDismissed";

const calc = () => {
  const diff = TARGET_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff / 3_600_000) % 24),
    m: Math.floor((diff / 60_000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
};

export const LaunchPromoBanner = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(calc());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") return;
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const i = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(i);
  }, [mounted]);

  const close = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
    setTimeout(() => setMounted(false), 350);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText("NEWMUSIC30");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  if (!mounted || !time) return null;

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center min-w-[34px]">
      <span className="text-sm md:text-base font-bold text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/60 mt-0.5">
        {label}
      </span>
    </div>
  );

  return (
    <div
      className={`relative z-50 overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
        open ? "max-h-[220px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2"
      }`}
      role="region"
      aria-label="Promoción de lanzamiento"
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0b2e] via-[#2d0b4e] to-[#3a0f5c]" />
        <div className="absolute inset-0 backdrop-blur-2xl" />
        <div className="pointer-events-none absolute -top-16 left-1/4 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/4 h-40 w-40 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-2.5 md:py-3">
          <div className="flex flex-col md:flex-row md:items-center md:gap-5 gap-2.5 pr-8 md:pr-10">
            {/* Title + text */}
            <div className="flex items-center gap-3 md:flex-1 md:min-w-0">
              <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/30">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm md:text-[15px] font-bold leading-tight bg-gradient-to-r from-white via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
                  🚀 La nueva era de MusicDibs ya está aquí
                </h3>
                <p className="hidden md:block text-xs text-white/70 mt-0.5">
                  Crea música con IA, protégela y distribúyela desde un solo lugar.
                </p>
              </div>
            </div>

            {/* Code */}
            <div className="flex items-center gap-2 md:gap-3">
              <span className="hidden lg:inline text-[11px] uppercase tracking-widest text-fuchsia-300 font-semibold whitespace-nowrap">
                🎁 30% OFF · Mayo
              </span>
              <button
                onClick={copyCode}
                className="group flex items-center gap-2 rounded-lg border border-dashed border-fuchsia-300/50 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition-all"
                aria-label="Copiar código NEWMUSIC30"
              >
                <span className="font-mono text-sm font-bold tracking-[0.18em] text-white">
                  NEWMUSIC30
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                )}
              </button>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-1.5 rounded-xl bg-black/30 border border-white/10 px-2.5 py-1.5">
              <TimeUnit value={time.d} label="días" />
              <span className="text-white/30">·</span>
              <TimeUnit value={time.h} label="hrs" />
              <span className="text-white/30">·</span>
              <TimeUnit value={time.m} label="min" />
              <span className="text-white/30">·</span>
              <TimeUnit value={time.s} label="seg" />
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate("/pricing")}
              className="group relative inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/40 transition-all hover:shadow-fuchsia-500/60 hover:scale-[1.03] overflow-hidden whitespace-nowrap"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600" />
              <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Flame className="relative h-4 w-4" />
              <span className="relative">Aprovechar oferta</span>
            </button>
          </div>

          <button
            onClick={close}
            aria-label="Cerrar"
            className="absolute top-2 right-2 md:top-1/2 md:-translate-y-1/2 md:right-3 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LaunchPromoBanner;
