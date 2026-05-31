import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  type?: string;
  image?: string;
  locale?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}


const BASE_URL = "https://www.musicdibs.com";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/27fdd7c8-3e07-4d0d-886d-53859f68e5de";

const LOCALE_MAP: Record<string, string> = {
  es: "es_ES",
  en: "en_US",
  "pt-BR": "pt_BR",
};

const ALL_LOCALES = Object.values(LOCALE_MAP);

const BRAND_NAME = "Musicdibs";
const BRAND_NAME_PATTERN = /MusicDibs|Musicdibs/gi;

const normalizeBrandName = (text: string) => text.replace(BRAND_NAME_PATTERN, BRAND_NAME);

const withBrandInDescription = (description: string) => {
  const normalizedDescription = normalizeBrandName(description);
  return normalizedDescription.includes(BRAND_NAME)
    ? normalizedDescription
    : `${BRAND_NAME}: ${normalizedDescription}`;
};

export const SEO = ({
  title,
  description,
  path = "/",
  type = "website",
  image,
  locale,
  jsonLd,
  noIndex = false,
}: SEOProps) => {
  const url = `${BASE_URL}${path}`;
  const pathname = path || (typeof window !== "undefined" ? window.location.pathname : "/");
  const normalizedTitle = normalizeBrandName(title);
  const fullTitle = path === "/"
    ? normalizedTitle
    : normalizedTitle.includes(BRAND_NAME)
      ? normalizedTitle
      : `${normalizedTitle} | ${BRAND_NAME}`;
  const fullDescription = withBrandInDescription(description);
  const imageUrl = image
    ? (image.startsWith("http") ? image : `${BASE_URL}${image}`)
    : `${BASE_URL}${DEFAULT_OG_IMAGE}`;


  const ogLocale = locale ? (LOCALE_MAP[locale] || "es_ES") : "es_ES";
  const alternateLocales = ALL_LOCALES.filter((l) => l !== ogLocale);

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={BRAND_NAME} />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((alt) => (
        <meta key={alt} property="og:locale:alternate" content={alt} />
      ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@musicdibs" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={imageUrl} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
