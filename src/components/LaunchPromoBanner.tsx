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
    <div className="flex flex-col items-center min-w-[34px]">
      <span className="text-sm md:text-base font-semibold text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/55 mt-1">
        {label}
      </span>
    </div>
  );

  return (
    <section
      className="w-full px-4 md:px-6 py-6 md:py-8"
      role="region"
      aria-label="Promoción de lanzamiento"
    >
      <div className="relative max-w-6xl mx-auto overflow-hidden rounded-2xl border border-white/10 shadow-[0_10px_40px_-15px_rgba(168,85,247,0.4)]">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#2a0b48] to-[#360e54]" />
        <div className="pointer-events-none absolute -top-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative px-4 md:px-6 py-3.5 md:py-4">
          <button
            onClick={close}
            aria-label="Cerrar"
            className="absolute top-2 right-2 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-6 gap-3.5 pr-7">
            {/* Title + text */}
            <div className="flex items-center gap-3 lg:flex-1 lg:min-w-0">
              <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-md shadow-fuchsia-500/30">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm md:text-[15px] font-semibold leading-tight bg-gradient-to-r from-white via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
                  🚀 La nueva era de MusicDibs ya está aquí
                </h3>
                <p className="text-[11px] md:text-xs text-white/60 mt-0.5">
                  Crea música con IA, protégela y distribúyela desde un solo lugar.
                </p>
              </div>
            </div>

            {/* Offer + code */}
            <div className="flex items-center gap-2.5">
              <span className="hidden xl:inline text-[10px] uppercase tracking-widest text-fuchsia-300 font-semibold whitespace-nowrap">
                🎁 30% · Mayo
              </span>
              <button
                onClick={copyCode}
                className="group flex items-center gap-1.5 rounded-lg border border-dashed border-fuchsia-300/50 bg-white/5 px-2.5 py-1.5 hover:bg-white/10 transition-all"
                aria-label="Copiar código NEWMUSIC30"
              >
                <span className="font-mono text-xs md:text-sm font-semibold tracking-[0.18em] text-white">
                  NEWMUSIC30
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/50 group-hover:text-white transition-colors" />
                )}
              </button>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-1.5 rounded-lg bg-black/25 border border-white/10 px-2.5 py-1.5">
              <TimeUnit value={time.d} label="días" />
              <span className="text-white/25">·</span>
              <TimeUnit value={time.h} label="hrs" />
              <span className="text-white/25">·</span>
              <TimeUnit value={time.m} label="min" />
              <span className="text-white/25">·</span>
              <TimeUnit value={time.s} label="seg" />
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate("/pricing")}
              className="group relative inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-md shadow-fuchsia-500/30 transition-all hover:shadow-fuchsia-500/50 hover:scale-[1.03] overflow-hidden whitespace-nowrap"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600" />
              <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Flame className="relative h-3.5 w-3.5" />
              <span className="relative">Aprovechar oferta</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchPromoBanner;
