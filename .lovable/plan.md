# Plan SEO — captar tráfico de términos top

Ejecutamos las 4 acciones en paralelo (mismo estilo/patrones que las landings actuales `MusicdibsVs*` y `AISongGeneratorPage`).

## 1. Landing comparativa `/musicdibs-vs-udio` (ES/EN/PT)

- Nuevo `src/pages/MusicdibsVsUdioPage.tsx` con la misma estructura visual que `MusicdibsVsLoudlyPage` (hero + tabla comparativa + CTA + FAQ).
- Ángulos diferenciales: registro blockchain + distribución + 100% sin comisión + AI Studio multimódulo vs. Udio (solo generación).
- SEO: `<Helmet>` con title/description únicos, canonical self-referente, `SoftwareApplication` + `FAQPage` + `BreadcrumbList` JSON-LD.
- Ruta en `App.tsx` con `lazyWithRetry`.
- Añadir a `scripts/generate-sitemap.ts` y regenerar `public/sitemap.xml`.
- Añadir en `scripts/prerender-seo.mjs` para HTML estático.
- Internal linking: enlace desde `MusicdibsVsDistroKidPage`, `MusicdibsVsLandrPage`, `MusicdibsVsLoudlyPage` y el nuevo artículo del blog.

## 2. Optimizar `/ai-song-generator` y `/generador-canciones-ia`

- Reescribir `<title>`, H1 y meta description en `AISongGeneratorPage.tsx` y `GeneradorCancionesIAPage.tsx` para atacar "ai music generator" / "generador de música IA" (bandas volumen 60.5k / ~14k).
- Expandir contenido: bloque "cómo funciona", tabla "vs Suno / Udio", 6 casos de uso, sección FAQ nueva con `FAQPage` schema.
- Añadir bloque de internal linking a `/musicdibs-vs-udio`, `/ai-studio`, `/copyright-a-song` y guías del blog.
- Actualizar HowTo schema si aplica.

## 3. Artículo trilingüe "Suno vs Udio vs MusicDibs"

- 3 posts en `blog_articles` (ES/EN/PT) con:
  - Título tipo "Suno vs Udio vs MusicDibs: comparativa 2026".
  - Tabla comparativa (features, precio, licencia, distribución, registro).
  - Sección "cuál elegir según tu perfil".
  - CTA a `/musicdibs-vs-udio` y `/ai-song-generator`.
- SQL migration para insertar los 3 posts con `published_at`, `language`, `slug`, `meta_description` únicos.
- Se regenera automáticamente en el prerender (ya incluye `/news/*`).

## 4. Landings `/music-maker` (EN) y `/creador-de-musica` (ES)

- `MusicMakerPage.tsx` y `CreadorDeMusicaPage.tsx` — variantes de `AISongGeneratorPage` con copy re-enfocado al keyword "music maker" (74k) / "creador de música" respectivamente.
- Hero + demo + features + tabla comparativa + FAQ + CTA a `/dashboard`.
- Schema `SoftwareApplication` + `FAQPage` + `BreadcrumbList`.
- Rutas en `App.tsx`, sitemap y prerender.
- Internal linking cruzado con `/ai-song-generator` y `/musicdibs-vs-udio`.

## Detalles técnicos

- Todas las páginas usan `react-helmet-async`, con canonical y og:url self-referentes (patrón ya establecido).
- Todos los `SoftwareApplication` schemas incluyen `offers`, `aggregateRating`, `image`, `description` (obligatorios tras el fix reciente).
- `postbuild` (`verify-prerender.mjs`) validará que las nuevas rutas tienen title/description únicos.
- Trilingüe siguiendo la política del proyecto: nuevas keys en `src/i18nPages.ts` para ES/EN/PT-BR.
- Ninguna tabla nueva; solo `INSERT` en `blog_articles` existente.

## Fuera de scope (no se toca)

- No se cambian políticas RLS ni Edge Functions.
- No se tocan los hallazgos de seguridad del panel — se pueden abordar en un turno aparte si quieres.
