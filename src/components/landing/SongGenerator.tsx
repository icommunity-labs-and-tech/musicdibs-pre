import { useEffect, useRef, useState } from "react";
import { Sparkles, Play, Pause, Download, Heart } from "lucide-react";
import demoSong from "@/assets/landing/musicdibs-demo.mp3";

const FULL_PROMPT =
  "Un tema de Synthwave de los 80 con sintetizadores nostálgicos y un ritmo bailable a 120 BPM";

const AUDIO_URL = demoSong;

export function SongGenerator() {
  const [typed, setTyped] = useState("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Typewriter
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(FULL_PROMPT.slice(0, i));
      if (i >= FULL_PROMPT.length) clearInterval(interval);
    }, 45);
    return () => clearInterval(interval);
  }, []);

  // Init audio
  useEffect(() => {
    const audio = new Audio(AUDIO_URL);
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    const onError = () => {
      setPlaying(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const bars = 48;
  const activeBars = Math.round(progress * bars);

  return (
    <div className="glass rounded-3xl p-6 sm:p-7 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-magenta/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-pink/20 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-magenta/20 text-magenta">
            <Sparkles className="h-4 w-4" />
          </span>
          <h3 className="font-display font-semibold text-lg">Generador de canciones</h3>
        </div>

        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Describe tu canción
        </label>
        <div
          aria-readonly
          className="w-full min-h-[88px] rounded-xl bg-deep/60 border border-border px-4 py-3 text-sm text-foreground select-none"
        >
          {typed}
          <span className="inline-block w-[2px] h-4 align-middle bg-magenta ml-0.5 animate-pulse" />
        </div>

        {/* Result */}
        <div className="mt-6">
          <div className="rounded-2xl border border-magenta/30 bg-gradient-to-br from-deep/80 to-background/40 p-5 glow-magenta/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-pink tracking-wider uppercase">AI Track · #042</p>
                <p className="font-display font-semibold mt-0.5">Synthwave Vibe</p>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <button className="h-9 w-9 grid place-items-center rounded-lg hover:text-magenta hover:bg-magenta/10 transition-colors">
                  <Heart className="h-4 w-4" />
                </button>
                <button className="h-9 w-9 grid place-items-center rounded-lg hover:text-pink hover:bg-pink/10 transition-colors">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                aria-label={playing ? "Pausar" : "Reproducir"}
                className="btn-magenta h-12 w-12 grid place-items-center rounded-full shrink-0"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <div className="flex-1">
                <div className="flex items-end gap-[3px] h-10">
                  {Array.from({ length: bars }).map((_, i) => {
                    const h = 20 + ((i * 37) % 80);
                    const isActive = i < activeBars;
                    return (
                      <span
                        key={i}
                        className={`flex-1 rounded-full transition-colors ${
                          isActive
                            ? "bg-gradient-to-t from-magenta to-pink"
                            : "bg-foreground/15"
                        } ${playing && i === activeBars ? "wave-bar" : ""}`}
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-2 font-mono">
                  <span>{fmt(currentTime)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
