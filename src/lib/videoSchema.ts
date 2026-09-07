/**
 * VideoObject JSON-LD builders for the pages Google flagged as
 * "video is not on a watch page". Every entry points at a stable public
 * URL (never a hashed bundler asset) so the crawler can fetch the file.
 */

const BASE_URL = "https://musicdibs.com";

const abs = (path: string) => (path.startsWith("http") ? path : `${BASE_URL}${path}`);

export interface VideoSchemaInput {
  name: string;
  description: string;
  contentPath: string;
  thumbnailPath: string;
  /** ISO 8601 duration, e.g. "PT31S". */
  duration: string;
  uploadDate: string;
  pagePath: string;
}

export const buildVideoObject = ({
  name,
  description,
  contentPath,
  thumbnailPath,
  duration,
  uploadDate,
  pagePath,
}: VideoSchemaInput) => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name,
  description,
  thumbnailUrl: [abs(thumbnailPath)],
  uploadDate,
  duration,
  contentUrl: abs(contentPath),
  embedUrl: abs(contentPath),
  isFamilyFriendly: true,
  inLanguage: "es",
  publisher: {
    "@type": "Organization",
    name: "Musicdibs",
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png`,
    },
  },
  potentialAction: {
    "@type": "WatchAction",
    target: abs(pagePath),
  },
});

export const HOME_HERO_VIDEO = buildVideoObject({
  name: "Musicdibs: registra, protege y distribuye tu música",
  description:
    "Recorrido en vídeo por Musicdibs: registro de obras con certificación blockchain, creación con IA y distribución en más de 220 plataformas digitales.",
  contentPath: "/hero-video.mp4",
  thumbnailPath: "/videos/hero-video-poster.jpg",
  duration: "PT31S",
  uploadDate: "2025-06-01T09:00:00+02:00",
  pagePath: "/",
});

export const REGISTRO_TESTIMONIAL_VIDEO = buildVideoObject({
  name: "Testimonio de artista: registrar una canción en Musicdibs",
  description:
    "Un artista explica cómo registró su canción en Musicdibs y obtuvo un certificado blockchain con validez legal en minutos.",
  contentPath: "/videos/testimonio-0528.mp4",
  thumbnailPath: "/videos/testimonio-0528-poster.jpg",
  duration: "PT27S",
  uploadDate: "2025-07-15T09:00:00+02:00",
  pagePath: "/registro-musical",
});

export const AI_STUDIO_DEMO_VIDEO = buildVideoObject({
  name: "Demo del IA Music Studio de Musicdibs",
  description:
    "Demostración del IA Music Studio: de una idea cantada a una producción completa, con letras, portada y material promocional generados con inteligencia artificial.",
  contentPath: "/videos/ai-studio-demo.mp4",
  thumbnailPath: "/videos/ai-studio-demo-poster.jpg",
  duration: "PT22S",
  uploadDate: "2025-08-01T09:00:00+02:00",
  pagePath: "/ia-music-studio",
});
