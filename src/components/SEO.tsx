import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  type?: string;
  image?: string;
  /**
   * Language of the actual page content. Drives <html lang>, og:locale
   * and twitter locale. Defaults to Spanish because the vast majority of
   * routes are ES-only. English/Portuguese landings MUST pass this
   * explicitly so crawlers see the page's real language.
   */
  lang?: "es" | "en" | "pt-BR";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}

const LOCALE_MAP: Record<"es" | "en" | "pt-BR", { html: string; og: string }> = {
  es: { html: "es", og: "es_ES" },
  en: { html: "en", og: "en_US" },
  "pt-BR": { html: "pt-BR", og: "pt_BR" },
};


const BASE_URL = "https://www.musicdibs.com";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/27fdd7c8-3e07-4d0d-886d-53859f68e5de";


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
  lang = "es",
  jsonLd,
  noIndex = false,
}: SEOProps) => {
  const url = `${BASE_URL}${path}`;
  const normalizedTitle = normalizeBrandName(title);
  const fullTitle = path === "/"
    ? normalizedTitle
    : normalizedTitle.includes(BRAND_NAME)
      ? normalizedTitle
      : `${normalizedTitle} | ${BRAND_NAME}`;
  const fullDescription = withBrandInDescription(description);
  const resolveImageUrl = (img: string) =>
    img.startsWith("http") ? img : `${BASE_URL}${img}`;
  const imageUrl = image ? resolveImageUrl(image) : resolveImageUrl(DEFAULT_OG_IMAGE);


  // No fake hreflang alternates (URLs are single-locale). Each page declares
  // its OWN language honestly via the `lang` prop — so English landings like
  // /register-a-song or /copyright-a-song report en/en_US instead of es_ES.
  const { html: htmlLang, og: ogLocale } = LOCALE_MAP[lang];

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <html lang={htmlLang} />
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

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
