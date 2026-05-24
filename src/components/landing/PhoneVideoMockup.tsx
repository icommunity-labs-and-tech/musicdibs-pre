import { Sparkles, Volume2 } from "lucide-react";

export function PhoneVideoMockup() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Ambient neon particles / glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[110%] w-[80%] rounded-[60%] bg-magenta/25 blur-[100px]" />
        <div className="absolute top-10 right-6 h-40 w-40 rounded-full bg-pink/30 blur-3xl orb" />
        <div
          className="absolute bottom-10 left-6 h-40 w-40 rounded-full bg-magenta/30 blur-3xl orb"
          style={{ animationDelay: "2s" }}
        />
        {/* subtle neon dots */}
        {[
          { t: "8%", l: "12%", d: "0s" },
          { t: "22%", l: "85%", d: "1.4s" },
          { t: "65%", l: "8%", d: "2.6s" },
          { t: "78%", l: "88%", d: "0.7s" },
          { t: "40%", l: "95%", d: "3.2s" },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-pink/80 shadow-[0_0_12px_rgba(236,72,153,0.9)] animate-pulse"
            style={{ top: p.t, left: p.l, animationDelay: p.d }}
          />
        ))}
      </div>

      {/* Top badge */}
      <div className="mb-5 inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-xs font-medium text-foreground/90 shadow-[0_0_30px_rgba(217,70,239,0.25)]">
        <Sparkles className="h-3.5 w-3.5 text-magenta" />
        <span className="bg-gradient-to-r from-pink to-magenta bg-clip-text text-transparent font-semibold">
          IA Music Studio
        </span>
      </div>

      {/* Phone */}
      <div className="phone-float relative">
        {/* glow ring */}
        <div className="absolute -inset-4 rounded-[3.2rem] bg-gradient-to-br from-magenta/40 via-pink/30 to-transparent blur-2xl opacity-80" />

        <div className="relative w-[280px] sm:w-[300px] h-[580px] sm:h-[620px] rounded-[3rem] bg-gradient-to-b from-zinc-800 via-zinc-900 to-black p-[10px] shadow-[0_30px_80px_-20px_rgba(217,70,239,0.55),0_0_60px_-10px_rgba(236,72,153,0.4)] border border-white/10">
          {/* inner bezel */}
          <div className="relative w-full h-full rounded-[2.4rem] overflow-hidden bg-black border border-white/5">
            {/* notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-6 w-28 rounded-full bg-black" />

            <video
              className="absolute inset-0 w-full h-full object-cover"
              src="/videos/ia-studio-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="Demo IA Music Studio"
            />

            {/* subtle screen vignette for premium feel */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
          </div>
        </div>
      </div>

      {/* Bottom caption */}
      <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Volume2 className="h-3.5 w-3.5 text-pink" />
        <span>Activa el sonido y escucha la magia</span>
      </div>

      <style>{`
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .phone-float { animation: phoneFloat 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
