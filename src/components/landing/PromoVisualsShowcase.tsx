import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles, Image as ImageIcon, Megaphone, Play, Film, Layers, FileImage, Instagram, Music2, Video } from "lucide-react";
import neonPulse from "@/assets/landing/covers/neon-pulse.webp";
import fuegoLento from "@/assets/landing/covers/fuego-lento.webp";
import caminoDeAbril from "@/assets/landing/covers/camino-de-abril.webp";
import distrito9 from "@/assets/landing/covers/distrito-9.webp";
import loQueQuedaDeTi from "@/assets/landing/covers/lo-que-queda-de-ti.webp";
import cityLights from "@/assets/landing/covers/city-lights.webp";
import midnightPulse from "@/assets/landing/covers/midnight-pulse.webp";
import brokenThunder from "@/assets/landing/covers/broken-thunder.webp";
import brillaSinMiedo from "@/assets/landing/covers/brilla-sin-miedo.webp";
import flyerUrban from "@/assets/landing/promo/flyer-urban.webp";
import flyerMidnightPulse from "@/assets/landing/promo/flyer-midnight-pulse.webp";
import postPop from "@/assets/landing/promo/post-pop-release.webp";
import videoclipNocheDeFuego from "@/assets/landing/promo/videoclip-noche-de-fuego.mp4";
import videoclipUltimaLuz from "@/assets/landing/promo/videoclip-ultima-luz.mp4";
import reelNeonPulse from "@/assets/landing/promo/reel-neon-pulse.mp4";
import videoclipBeforeForgettingYou from "@/assets/landing/promo/videoclip-before-forgetting-you.mp4";
import reelTheBrokenLines from "@/assets/landing/promo/reel-the-broken-lines.mp4";
import videoclipGoldenRoad from "@/assets/landing/promo/videoclip-golden-road.mp4";
import tiktokLateNightFrequency from "@/assets/landing/promo/tiktok-late-night-frequency.mp4";
import spotifyLoopBeforeForgettingYou from "@/assets/landing/promo/spotify-loop-before-forgetting-you.mp4";
import spotifyLoopVioletFrequency from "@/assets/landing/promo/spotify-loop-violet-frequency.mp4";

type CoverCard = { title: string; artist: string; genre: string; image: string };
type PromoCard = {
  title: string;
  badge: string;
  description: string;
  image?: string;
  video?: string;
  isVideo?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
};

const COVER_CARDS: CoverCard[] = [
  { title: "Neon Pulse", artist: "Vera Nova", genre: "EDM / Electrónica", image: neonPulse },
  { title: "Fuego Lento", artist: "Milo Reyes", genre: "Reggaeton / Urbano", image: fuegoLento },
  { title: "Camino de Abril", artist: "Luna Ártica", genre: "Indie / Folk", image: caminoDeAbril },
  { title: "Distrito 9", artist: "Kairo Beats", genre: "Hip Hop / Trap", image: distrito9 },
  { title: "Lo Que Queda de Ti", artist: "Sira Vale", genre: "Pop / Balada", image: loQueQuedaDeTi },
  { title: "City Lights", artist: "Noah Grey", genre: "R&B / Soul", image: cityLights },
  { title: "Midnight Pulse", artist: "DJ Aria Flux", genre: "Electrónica", image: midnightPulse },
  { title: "Broken Thunder", artist: "Stonefield Rebels", genre: "Rock alternativo", image: brokenThunder },
  { title: "Brilla Sin Miedo", artist: "Valeria Cruz", genre: "Pop latino", image: brillaSinMiedo },
];

const PROMO_CARDS: PromoCard[] = [
  { title: "Sin Mirar Atrás", badge: "Videoclip", description: "Leo Marín · Latino", video: videoclipNocheDeFuego, isVideo: true, Icon: Video },
  { title: "Ritmo Salvaje", badge: "Videoclip", description: "Dario Cruz · Latino", video: videoclipUltimaLuz, isVideo: true, Icon: Video },
  { title: "Before Forgetting You", badge: "Videoclip", description: "Hikari · Balada Pop", video: videoclipBeforeForgettingYou, isVideo: true, Icon: Video },
  { title: "Golden Road", badge: "Videoclip", description: "Ártico · Indie Folk", video: videoclipGoldenRoad, isVideo: true, Icon: Video },
  { title: "Neon Pulse", badge: "Reel", description: "Vera Nova · Teaser electrónico", video: reelNeonPulse, isVideo: true, Icon: Film },
  { title: "The Broken Lines", badge: "Reel", description: "Black River · Rock", video: reelTheBrokenLines, isVideo: true, Icon: Film },
  { title: "Late Night Frequency", badge: "TikTok", description: "DJ NK · Electrónica", video: tiktokLateNightFrequency, isVideo: true, Icon: Music2 },
  { title: "Before Forgetting You", badge: "Vídeo loop Spotify", description: "Nora Bloom · Pop", video: spotifyLoopBeforeForgettingYou, isVideo: true, Icon: Layers },
  { title: "Violet Frequency", badge: "Vídeo loop Spotify", description: "Kira Flux · Electrónica", video: spotifyLoopVioletFrequency, isVideo: true, Icon: Layers },
  { title: "Urban Flyer", badge: "Flyer", description: "Kairo Beats · Flyer de lanzamiento", image: flyerUrban, Icon: FileImage },
  { title: "Midnight Pulse", badge: "Flyer", description: "DJ Nova K · Flyer electrónico", image: flyerMidnightPulse, Icon: FileImage },
  { title: "Last Pink Sky", badge: "Post", description: "Maya Rivers · Post Instagram", image: postPop, Icon: Instagram },
];

const Reveal = ({ children }: { children: ReactNode }) => <div>{children}</div>;

const CoverCardItem = ({ card }: { card: CoverCard }) => (
  <div className="group relative shrink-0 w-52 sm:w-60 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-fuchsia-500/20 transition-transform duration-300 hover:scale-[1.03] hover:shadow-fuchsia-500/40">
    <img
      src={card.image}
      alt={`Portada ${card.title} de ${card.artist}`}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.06]"
    />
    <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors duration-300" />
    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium">
      <ImageIcon className="w-3.5 h-3.5" />
      <span>Portada</span>
    </div>
    <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent">
      <p className="text-white font-semibold text-sm sm:text-base tracking-tight drop-shadow leading-tight">{card.title}</p>
      <p className="text-white/80 text-[11px] sm:text-xs mt-0.5 drop-shadow">
        {card.artist} · <span className="text-white/60">{card.genre}</span>
      </p>
    </div>
  </div>
);

const PromoCardItem = ({ card }: { card: PromoCard }) => {
  const Icon = card.Icon;
  const hasVideoSource = Boolean(card.video);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    if (!hasVideoSource || shouldLoadVideo) return;
    const node = containerRef.current;
    if (!node || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldLoadVideo(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasVideoSource, shouldLoadVideo]);

  return (
    <div
      ref={containerRef}
      className="group relative shrink-0 w-52 sm:w-60 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-purple-500/20 transition-transform duration-300 hover:scale-[1.03] hover:shadow-purple-500/40"
    >
      {hasVideoSource ? (
        shouldLoadVideo ? (
          <video
            src={card.video}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900/60 to-fuchsia-900/60" aria-hidden="true" />
        )
      ) : (
        <img
          src={card.image}
          alt={`${card.badge} ${card.title}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors duration-300" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium">
        <Icon className="w-3.5 h-3.5" />
        <span>{card.badge}</span>
      </div>
      {card.isVideo && !hasVideoSource && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent">
        <p className="text-white font-semibold text-sm sm:text-base tracking-tight drop-shadow leading-tight">{card.title}</p>
        <p className="text-white/80 text-[11px] sm:text-xs mt-0.5 drop-shadow">{card.description}</p>
      </div>
    </div>
  );
};

const COVER_EXTRA_TITLES = [
  "Ritmo Salvaje",
  "Before Forgetting You",
  "The Broken Lines",
  "Sin Mirar Atrás",
  "Late Night Frequency",
];

export const PromoVisualsShowcase = () => {
  const extraPromoCards = PROMO_CARDS.filter((c) => COVER_EXTRA_TITLES.includes(c.title));
  const firstRowItems: Array<{ kind: "cover"; card: CoverCard } | { kind: "promo"; card: PromoCard }> = [
    ...COVER_CARDS.map((card) => ({ kind: "cover" as const, card })),
    ...extraPromoCards.map((card) => ({ kind: "promo" as const, card })),
  ];
  const loopedCovers = [...firstRowItems, ...firstRowItems];

  return (
    <section
      className="relative py-20 sm:py-28 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #251541 0%, #2c1a4d 22%, #36205c 50%, #2e1a4f 78%, #2a1747 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/6 to-transparent" />
      <div className="pointer-events-none absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-fuchsia-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-purple-500/15 blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium mb-5 shadow-sm">
              <Megaphone className="w-3.5 h-3.5" />
              Material promocional con IA
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Crea todo el material visual de{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
                tu lanzamiento
              </span>
              , en minutos.
            </h2>
            <p className="text-base sm:text-lg text-white/70 leading-relaxed">
              Genera portadas, posts, flyers y vídeos cortos para promocionar tu música en redes. Todo desde Musicdibs.
            </p>
          </div>
        </Reveal>
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="flex items-center gap-2 mb-5 sm:mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/85 text-xs sm:text-[13px] font-medium tracking-wide">
            <ImageIcon className="w-3.5 h-3.5 text-pink-300" />
            Portadas y piezas para tu lanzamiento
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>
      </div>

      <div
        className="relative group/marquee"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="promo-marquee flex gap-5 py-6 w-max">
          {loopedCovers.map((item, i) =>
            item.kind === "cover" ? (
              <CoverCardItem key={`cover-${item.card.title}-${i}`} card={item.card} />
            ) : (
              <PromoCardItem key={`cover-promo-${item.card.title}-${i}`} card={item.card} />
            )
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col items-center gap-3 mt-12">
          <a
            href="https://www.musicdibs.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600 hover:from-fuchsia-600 hover:via-pink-600 hover:to-purple-700 shadow-lg shadow-fuchsia-500/30 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Crear mi material promocional
          </a>
          <p className="text-xs text-white/60">
            Portadas, posts, flyers y vídeos generados con IA en minutos.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes promo-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .promo-marquee {
          animation: promo-marquee 50s linear infinite;
          will-change: transform;
        }
        .group\/marquee:hover .promo-marquee {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-marquee { animation: none; }
        }
      `}</style>
    </section>
  );
};
