import logo from "@/assets/landing/logo_dark.png";

interface NavbarProps {
  ctaText?: string;
  ctaHref?: string;
}

export function Navbar({
  ctaText = "Probar IA Music Studio GRATIS",
  ctaHref = "https://www.musicdibs.com/login",
}: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.09 0.06 300 / 0.65), oklch(0.09 0.06 300 / 0.25) 70%, transparent)",
          borderBottom: "1px solid oklch(0.98 0.01 295 / 0.08)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="inline-flex items-center">
          <img src={logo} alt="Musicdibs" className="h-10 w-auto object-contain" />
        </a>
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-magenta)] transition-transform hover:scale-105"
        >
          {ctaText}
        </a>
      </div>
    </header>
  );
}
