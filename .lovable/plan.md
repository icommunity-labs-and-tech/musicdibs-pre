## Plan: SEO/i18n fixes + páginas de posicionamiento all-in-one

Trabajo grande y con dependencias externas (confirmación de cifras, contenido en `.md` adjunto que no veo). Antes de tocar código propongo el desglose siguiente y algunas confirmaciones bloqueantes.

---

### Bloqueantes que necesito confirmar antes de empezar

1. **Estructura de idiomas actual**: Musicdibs hoy es **una sola URL en español** (`/`, `/faq`, `/distribution`...) con **i18n en cliente vía `i18next`** (ES/EN/PT-BR se cambian con el selector, pero **no hay rutas `/en/*` ni `/pt/*`**). El `SEO.tsx` ya emite `hreflang` para `/`, `/en{path}` y `/pt-BR{path}`, pero **esas URLs no existen** como rutas reales — devuelven la misma página en español. Antes de "arreglar" locales necesito decidir:
   - **Opción A (rápida, honesta):** admitir que el sitio es monolingüe ES a nivel de URL, quitar los `hreflang` falsos, dejar `og:locale=es_ES` y `<html lang="es">`. Sin sitemaps por idioma.
   - **Opción B (correcta para SEO internacional, trabajo grande):** montar rutas reales prefijadas `/en/*` y `/pt/*` con SSR/prerender por idioma, `<html lang>` dinámico, sitemaps separados. Esto es un refactor de varios días (afecta a `App.tsx`, router, prerender, ~40 páginas).
   
   **Necesito que elijas A o B.** El resto de puntos SEO dependen de esto.

2. **Cifra de royalties**: tú mismo lo marcas — hay `100%` en home y `95%` en `RoyaltiesCalculator.tsx` (rate `0.95` para `musicdibs`). ¿Cuál es la buena? Sin esto no toco las landings ni la calculadora.

3. **`landing-musicdibs-vs-distrokid.md`**: dices "adjunto", pero no está en el proyecto ni en `/mnt/user-uploads/`. Necesito el contenido pegado en el chat o subido.

4. **Página `/musicdibs-vs-distrokid`**: no existe hoy. ¿La creo desde cero con el `.md` cuando lo pases?

---

### Alcance propuesto (una vez desbloqueado)

Divido en tandas para poder validar cada una antes de seguir:

**Tanda 1 — i18n/SEO base** (según decisión A/B arriba)
- Si **A**: limpieza de `SEO.tsx` (quitar hreflang fantasma), `og:locale` fijo `es_ES`, dejar `sitemap.xml` actual, cerrar el finding.
- Si **B**: nuevo router con prefijos, `HelmetProvider` por locale, `<html lang>` dinámico vía efecto, generar `sitemap-es.xml` / `sitemap-en.xml` / `sitemap-pt.xml` + `sitemap-index.xml` desde `scripts/generate-sitemap.ts`, actualizar `robots.txt`, actualizar `public/_headers`.

**Tanda 2 — Página pillar `/all-in-one-music-platform`**
- Nueva ruta + componente. Hero, diagrama 4 pasos (Create/Protect/Distribute/Promote), sección "por qué herramientas sueltas no bastan" (genérica), prueba social, links internos a las 4 landings de comparación.
- `<SEO>` con JSON-LD `SoftwareApplication` reutilizando patrón de `/faq`.
- Entrada en Navbar + Footer + sitemap.

**Tanda 3 — Landings de comparación** (`/musicdibs-vs-distrokid`, `/musicdibs-vs-loudly`, `/musicdibs-vs-landr`, `/musicdibs-vs-diy-stack`)
- Crear componente reutilizable `<ComparisonTable>` (parametrizado por columnas/filas) — reutilizo el existente `src/components/ComparisonTable.tsx` si el shape encaja, si no lo extiendo.
- Cuatro páginas usando el mismo componente + mismo layout SEO (hero, tabla, 3 CTAs, JSON-LD).
- Para Loudly/LANDR: tabla enfocada en la fila de protección/blockchain como único diferenciador (resto de filas se marcan igual en ambos lados, honestamente).
- Contenido de la de DistroKid: espero tu `.md`.

**Tanda 4 — `/switch-to-musicdibs`**
- Localizar el contenido de "migración de ISRC" en `i18nFaq.ts` y reusarlo como flujo paso a paso (no reescribir).
- Mensaje "añade lo que te falta, cambies o no".

**Tanda 5 — Calculadora extendida (`RoyaltiesCalculator.tsx`)**
- Añadir sistema de tabs dentro del componente actual: Tab 1 "Royalties" (actual), Tab 2 "Coste de tu stack actual".
- Tab 2: checkboxes para IA de creación / distribución / registro / promoción, con costes de referencia hardcodeados (necesito que confirmes qué costes de referencia usar por herramienta o los estimo yo con precios públicos actuales y te los enseño antes de fijarlos).
- Compara vs plan Musicdibs. Mismo look, mismos tokens de diseño.

**Tanda 6 — Fix cifra royalties**
- Depende de #2. Si es 100%: cambiar `rate: 0.95` → `1.0` en `RoyaltiesCalculator.tsx` y en la página `/distribution`. Si es 95%: alinear home y comunicación al revés.

**Tanda 7 — QA**
- Trigger scan SEO, verificar hreflang/sitemaps, marcar findings arreglados.
- Publicar.

---

### Trilingüe (regla del proyecto)

Todas las páginas nuevas se traducen a ES / EN / PT-BR en los archivos i18n correspondientes en el mismo commit — es política del proyecto, no negociable.

---

### Mi recomendación

- Ir con **Opción A** en la Tanda 1 (arreglar la mentira actual del hreflang), y dejar la internacionalización real (Opción B) como proyecto aparte con su propio plan. Hoy el sitio no está preparado para B y meterlo dentro de esta tanda mezcla dos trabajos muy distintos.
- Empezar en paralelo Tandas 2, 3 (sin la de DistroKid hasta tener el `.md`), 4 y 5 — son independientes entre sí.
- Cerrar con Tanda 6 y 7.

**Contéstame a los 4 bloqueantes de arriba y arranco.**