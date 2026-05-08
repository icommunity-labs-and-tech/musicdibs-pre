import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Music, Copy, Check, Flame } from "lucide-react";

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
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(calc());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") return;
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const i = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(i);
  }, [mounted]);

  const close = () => {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, "true");
    setTimeout(() => setMounted(false), 400);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText("NEWMUSIC30");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  if (!mounted || !time) return null;

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center min-w-[42px]">
      <span className="text-base md:text-lg font-bold text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/60 mt-0.5">
        {label}
      </span>
    </div>
  );

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-5xl md:w-[calc(100%-3rem)] z-50 transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0"
      }`}
      role="region"
      aria-label="Promoción de lanzamiento"
    >
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.5)] backdrop-blur-2xl">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e]/95 via-[#2d0b4e]/95 to-[#3a0f5c]/95" />
        {/* Glow accents */}
        <div className="absolute -top-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="absolute top-0 left-1/3 h-px w-1/3 bg-gradient-to-r from-transparent via-fuchsia-300/60 to-transparent" />

        {/* Close */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-4 py-4 md:px-6 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-5">
            {/* Title + text */}
            <div className="flex items-start gap-3 md:flex-1 md:min-w-0 pr-6 md:pr-0">
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm md:text-base font-bold text-white leading-tight flex items-center gap-1.5">
                  <span>🚀</span>
                  <span className="bg-gradient-to-r from-white via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
                    La nueva era de MusicDibs ya está aquí
                  </span>
                </h3>
                <p className="text-xs md:text-[13px] text-white/70 mt-0.5 flex items-center gap-1.5">
                  <Music className="h-3 w-3 shrink-0 text-fuchsia-300" />
                  Crea música con IA, protégela y distribúyela desde un solo lugar.
                </p>
              </div>
            </div>

            {/* Coupon */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-fuchsia-300/90 font-semibold">
                  🎁 30% OFF · Mayo
                </span>
                <button
                  onClick={copyCode}
                  className="group relative mt-1 flex items-center gap-2 rounded-lg border border-dashed border-fuchsia-300/50 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition-all"
                  aria-label="Copiar código NEWMUSIC30"
                >
                  <span className="font-mono text-sm md:text-base font-bold tracking-[0.15em] text-white">
                    NEWMUSIC30
                  </span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-1.5 md:gap-2 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
              <TimeUnit value={time.d} label="días" />
              <span className="text-white/30 text-sm">·</span>
              <TimeUnit value={time.h} label="hrs" />
              <span className="text-white/30 text-sm">·</span>
              <TimeUnit value={time.m} label="min" />
              <span className="text-white/30 text-sm">·</span>
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
        </div>
      </div>
    </div>
  );
};

export default LaunchPromoBanner;
