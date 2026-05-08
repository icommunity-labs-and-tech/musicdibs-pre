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
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState(calc());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const i = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(i);
  }, [visible]);

  const close = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
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

  if (!visible || !time) return null;

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center min-w-[42px]">
      <span className="text-lg md:text-xl font-bold text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-white/60 mt-1">
        {label}
      </span>
    </div>
  );

  return (
    <section
      className="w-full px-4 md:px-6 py-10 md:py-14"
      role="region"
      aria-label="Promoción de lanzamiento"
    >
      <div className="relative max-w-7xl mx-auto overflow-hidden rounded-3xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.45)]">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#2d0b4e] to-[#3a0f5c]" />
        <div className="pointer-events-none absolute -top-24 -left-10 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.18),transparent_60%)]" />

        <div className="relative px-5 md:px-10 py-7 md:py-8">
          <button
            onClick={close}
            aria-label="Cerrar"
            className="absolute top-3 right-3 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8 gap-6 pr-8">
            {/* Title + text */}
            <div className="flex items-start gap-4 lg:flex-1 lg:min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/40">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg md:text-xl font-bold leading-tight bg-gradient-to-r from-white via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
                  🚀 La nueva era de MusicDibs ya está aquí
                </h3>
                <p className="text-sm text-white/70 mt-1.5">
                  Crea música con IA, protégela y distribúyela desde un solo lugar.
                </p>
              </div>
            </div>

            {/* Offer + code */}
            <div className="flex flex-col items-start lg:items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-fuchsia-300 font-semibold whitespace-nowrap">
                🎁 30% OFF · Solo Mayo
              </span>
              <button
                onClick={copyCode}
                className="group flex items-center gap-2 rounded-xl border border-dashed border-fuchsia-300/50 bg-white/5 px-4 py-2 hover:bg-white/10 transition-all"
                aria-label="Copiar código NEWMUSIC30"
              >
                <span className="font-mono text-base font-bold tracking-[0.2em] text-white">
                  NEWMUSIC30
                </span>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Copy className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
                )}
              </button>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-2 rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
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
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm md:text-base font-semibold text-white shadow-lg shadow-fuchsia-500/40 transition-all hover:shadow-fuchsia-500/60 hover:scale-[1.03] overflow-hidden whitespace-nowrap"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600" />
              <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Flame className="relative h-4 w-4" />
              <span className="relative">Aprovechar oferta</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchPromoBanner;
