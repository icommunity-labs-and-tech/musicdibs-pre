import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Copy, Check, Music, Disc3, Info, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/**
 * Public SEO tool: /tools/metadata-finder
 * Buscador de códigos ISRC (grabaciones) y UPC/EAN (releases) usando la
 * API pública de MusicBrainz (sin auth, CORS habilitado).
 *
 * Objetivo SEO: capturar tráfico de "isrc finder", "upc finder",
 * "buscador de ISRC", "encontrar código UPC de una canción".
 */

const PATH = "/tools/metadata-finder";
const URL_FULL = `https://www.musicdibs.com${PATH}`;
const MB_HEADERS = { Accept: "application/json" } as const;

type RecordingResult = {
  id: string;
  title: string;
  artist: string;
  isrcs: string[];
  length?: number;
  release?: string;
};

type ReleaseResult = {
  id: string;
  title: string;
  artist: string;
  barcode?: string;
  date?: string;
  country?: string;
  label?: string;
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Buscador de ISRC y UPC",
    url: URL_FULL,
    applicationCategory: "MusicApplication",
    operatingSystem: "Any (web)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description:
      "Herramienta gratuita para encontrar códigos ISRC (grabaciones) y UPC/EAN (releases) de cualquier canción o álbum usando la base de datos MusicBrainz.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Qué es un código ISRC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El ISRC (International Standard Recording Code) es un identificador único de 12 caracteres que identifica una grabación sonora concreta. Es lo que usan Spotify, Apple Music y las sociedades de gestión para reportar streams y royalties a la grabación correcta.",
        },
      },
      {
        "@type": "Question",
        name: "¿Qué es un código UPC o EAN?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El UPC (Universal Product Code) o EAN (European Article Number) es el código de barras que identifica un álbum o single como producto comercial. Cada release publicado en tiendas y plataformas de streaming tiene su propio UPC.",
        },
      },
      {
        "@type": "Question",
        name: "¿Por qué necesito conocer el ISRC y el UPC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Los necesitas para reclamar royalties, distribuir tu música manteniendo el histórico de streams, migrar de distribuidor sin perder oyentes, registrar tu obra correctamente y solicitar takedowns o correcciones en plataformas.",
        },
      },
    ],
  },
];

async function searchRecordings(query: string): Promise<RecordingResult[]> {
  const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(
    query
  )}&fmt=json&limit=15`;
  const res = await fetch(url, { headers: MB_HEADERS });
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
  const data = await res.json();
  return (data.recordings || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    artist: (r["artist-credit"] || []).map((a: any) => a.name).join(", ") || "—",
    isrcs: r.isrcs || [],
    length: r.length,
    release: r.releases?.[0]?.title,
  }));
}

async function searchReleases(query: string): Promise<ReleaseResult[]> {
  const url = `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(
    query
  )}&fmt=json&limit=15`;
  const res = await fetch(url, { headers: MB_HEADERS });
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
  const data = await res.json();
  return (data.releases || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    artist: (r["artist-credit"] || []).map((a: any) => a.name).join(", ") || "—",
    barcode: r.barcode || undefined,
    date: r.date,
    country: r.country,
    label: r["label-info"]?.[0]?.label?.name,
  }));
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copiado al portapapeles");
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-muted"
      aria-label={`Copiar ${value}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {value}
    </button>
  );
}

const MetadataFinderPage = () => {
  const [tab, setTab] = useState<"isrc" | "upc">("isrc");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordings, setRecordings] = useState<RecordingResult[]>([]);
  const [releases, setReleases] = useState<ReleaseResult[]>([]);
  const [searched, setSearched] = useState(false);

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      if (tab === "isrc") {
        setRecordings(await searchRecordings(q));
      } else {
        setReleases(await searchReleases(q));
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo consultar MusicBrainz. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Buscador de ISRC y UPC gratis · Musicdibs"
        description="Encuentra el código ISRC de una grabación o el UPC/EAN de un álbum en segundos. Herramienta gratuita para artistas, productores y managers que distribuyen música."
        path={PATH}
        lang="es"
        jsonLd={jsonLd}
      />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-28 md:pt-32">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Buscador de códigos ISRC y UPC
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Consulta el ISRC de una canción o el UPC/EAN de un álbum de forma gratuita.
            Basado en la base de datos abierta MusicBrainz, sin registros ni límites.
          </p>
        </header>

        <Card className="p-4 md:p-6">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "isrc" | "upc"); setSearched(false); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="isrc" className="gap-2">
                <Music className="h-4 w-4" /> ISRC (canción)
              </TabsTrigger>
              <TabsTrigger value="upc" className="gap-2">
                <Disc3 className="h-4 w-4" /> UPC / EAN (álbum)
              </TabsTrigger>
            </TabsList>

            <form onSubmit={doSearch} className="mt-4 flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  tab === "isrc"
                    ? "Ej: Blinding Lights The Weeknd"
                    : "Ej: After Hours The Weeknd"
                }
                aria-label="Buscar canción o álbum"
              />
              <Button type="submit" disabled={loading || query.trim().length < 2}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Buscar</span>
              </Button>
            </form>

            <TabsContent value="isrc" className="mt-6">
              {!searched && !loading && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Escribe el título de la canción y, si es posible, el nombre del artista.
                </p>
              )}
              {searched && !loading && recordings.length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Sin resultados. Prueba con menos palabras o revisa la ortografía.
                </p>
              )}
              <ul className="divide-y">
                {recordings.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.artist}
                          {r.release ? ` · ${r.release}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.isrcs.length > 0 ? (
                        r.isrcs.map((code) => <CopyButton key={code} value={code} />)
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sin ISRC registrado en MusicBrainz.
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="upc" className="mt-6">
              {!searched && !loading && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Escribe el título del álbum o single y el nombre del artista.
                </p>
              )}
              {searched && !loading && releases.length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Sin resultados. Prueba con menos palabras o revisa la ortografía.
                </p>
              )}
              <ul className="divide-y">
                {releases.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.artist}
                          {r.date ? ` · ${r.date}` : ""}
                          {r.country ? ` · ${r.country}` : ""}
                          {r.label ? ` · ${r.label}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      {r.barcode ? (
                        <CopyButton value={r.barcode} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sin UPC/EAN registrado en MusicBrainz.
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>

          <p className="mt-6 flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Datos obtenidos en tiempo real de MusicBrainz, la base de datos musical abierta.
            Si una grabación o release no aparece o no tiene código, es porque no ha sido
            indexado allí — el distribuidor original lo tiene registrado igualmente.
          </p>
        </Card>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <article>
            <h2 className="text-xl font-semibold">¿Qué es un código ISRC?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              El <strong>ISRC</strong> (International Standard Recording Code) es un identificador
              único de 12 caracteres asignado a una grabación sonora concreta. Es la forma en la
              que Spotify, Apple Music, YouTube Music, sociedades de gestión y bases de datos
              reconocen la misma grabación aunque se publique en varios álbumes o distribuidores.
              Cada versión (single, remix, en directo) lleva su propio ISRC.
            </p>
          </article>
          <article>
            <h2 className="text-xl font-semibold">¿Qué es un código UPC / EAN?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              El <strong>UPC</strong> (Universal Product Code) o <strong>EAN</strong>
              (European Article Number) es el código de barras que identifica un release
              (álbum, EP o single) como producto comercial. Distribuidores digitales, tiendas
              y plataformas de streaming lo usan para enlazar todas las pistas del release y
              reportar ventas y streams al lanzamiento correcto.
            </p>
          </article>
          <article>
            <h2 className="text-xl font-semibold">¿Por qué necesitas conocerlos?</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>· Reclamar royalties a sociedades de gestión y a las DSPs.</li>
              <li>· Migrar de distribuidor sin perder streams ni oyentes mensuales.</li>
              <li>· Registrar tu obra correctamente en blockchain y en el Registro de la Propiedad Intelectual.</li>
              <li>· Solicitar takedowns, correcciones de metadatos o merges en Spotify/Apple.</li>
              <li>· Sincronizar tu catálogo con Content ID de YouTube.</li>
            </ul>
          </article>
          <article>
            <h2 className="text-xl font-semibold">¿Cómo se obtiene un ISRC / UPC nuevo?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuando distribuyes música con Musicdibs, generamos automáticamente el ISRC de
              cada grabación y el UPC de cada release, sin coste añadido y con royalties del
              100% para el artista. También puedes reutilizar tus códigos actuales si vienes
              de otro distribuidor, para no perder tu histórico de streams.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/distribution">
                  Distribuir mi música <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/switch-to-musicdibs">Cómo migrar sin perder streams</Link>
              </Button>
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MetadataFinderPage;
