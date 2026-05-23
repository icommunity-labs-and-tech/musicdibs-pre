import djBg from "@/assets/landing/dj-bg.jpg";

export function BackgroundScene() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <img
        src={djBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover scale-110"
        style={{ filter: "blur(28px) saturate(125%) brightness(0.95)", opacity: 0.75 }}
      />
      {/* Deep blue-purple wash: #0a051b → #11092c → #1a0a3e */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, oklch(0.12 0.11 285 / 0.78) 0%, oklch(0.14 0.13 290 / 0.82) 45%, oklch(0.09 0.09 280 / 0.9) 100%)",
        }}
      />
      {/* Magenta glow top-left */}
      <div
        className="absolute -top-40 -left-32 h-[44rem] w-[44rem] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.68 0.27 322 / 0.35), transparent 65%)" }}
      />
      {/* Royal blue glow right */}
      <div
        className="absolute top-32 -right-40 h-[42rem] w-[42rem] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.22 275 / 0.4), transparent 65%)" }}
      />
      {/* Cyan accent low */}
      <div
        className="absolute bottom-[-8rem] left-1/3 h-[34rem] w-[34rem] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.16 220 / 0.22), transparent 65%)" }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, oklch(0.05 0.06 285 / 0.75) 100%)",
        }}
      />
    </div>
  );
}
