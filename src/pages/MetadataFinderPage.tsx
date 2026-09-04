import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Copy, Check, Music, Disc3, Info, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useMetadataFinderCopy } from "@/i18nMetadataFinder";

/**
 * Public SEO tool: /tools/metadata-finder
 * Buscador de códigos ISRC (grabaciones) y UPC/EAN (releases) usando la
 * API pública de MusicBrainz (sin auth, CORS habilitado).
 *
 * Objetivo SEO: capturar tráfico de "isrc finder", "upc finder",
 * "buscador de ISRC", "encontrar código UPC de una canción".
 */

const PATH = "/tools/metadata-finder";
const URL_FULL = `https://musicdibs.com${PATH}`;
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

function CopyButton({ value, copiedMessage, ariaLabel }: { value: string; copiedMessage: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(copiedMessage);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-muted"
      aria-label={ariaLabel}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {value}
    </button>
  );
}

const MetadataFinderPage = () => {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "es";
  const t = useMetadataFinderCopy();
  const [tab, setTab] = useState<"isrc" | "upc">("isrc");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordings, setRecordings] = useState<RecordingResult[]>([]);
  const [releases, setReleases] = useState<ReleaseResult[]>([]);
  const [searched, setSearched] = useState(false);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: t.jsonLd.appName,
      url: URL_FULL,
      applicationCategory: "MusicApplication",
      operatingSystem: "Any (web)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      description: t.jsonLd.appDescription,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: t.jsonLd.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

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
      toast.error(t.errors.searchFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t.seo.title}
        description={t.seo.description}
        path={PATH}
        lang={lang as "es" | "en" | "pt-BR"}
        jsonLd={jsonLd}
      />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-28 md:pt-32">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {t.header.title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {t.header.subtitle}
          </p>
        </header>

        <Card className="p-4 md:p-6">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "isrc" | "upc"); setSearched(false); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="isrc" className="gap-2">
                <Music className="h-4 w-4" /> {t.tabs.isrc}
              </TabsTrigger>
              <TabsTrigger value="upc" className="gap-2">
                <Disc3 className="h-4 w-4" /> {t.tabs.upc}
              </TabsTrigger>
            </TabsList>

            <form onSubmit={doSearch} className="mt-4 flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  tab === "isrc"
                    ? t.search.placeholderIsrc
                    : t.search.placeholderUpc
                }
                aria-label={t.search.ariaLabel}
              />
              <Button type="submit" disabled={loading || query.trim().length < 2}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">{t.search.button}</span>
              </Button>
            </form>

            <TabsContent value="isrc" className="mt-6">
              {!searched && !loading && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t.isrcTab.hintIdle}
                </p>
              )}
              {searched && !loading && recordings.length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t.isrcTab.noResults}
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
                        r.isrcs.map((code) => (
                          <CopyButton
                            key={code}
                            value={code}
                            copiedMessage={t.copy.copied}
                            ariaLabel={t.copy.ariaLabel(code)}
                          />
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t.isrcTab.noIsrc}
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
                  {t.upcTab.hintIdle}
                </p>
              )}
              {searched && !loading && releases.length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t.upcTab.noResults}
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
                        <CopyButton
                          value={r.barcode}
                          copiedMessage={t.copy.copied}
                          ariaLabel={t.copy.ariaLabel(r.barcode)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t.upcTab.noUpc}
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
            {t.disclaimer}
          </p>
        </Card>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <article>
            <h2 className="text-xl font-semibold">{t.faqSection.isrcTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.faqSection.isrcBodyPre}
              <strong>{t.faqSection.isrcBodyStrong}</strong>
              {t.faqSection.isrcBodyPost}
            </p>
          </article>
          <article>
            <h2 className="text-xl font-semibold">{t.faqSection.upcTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.faqSection.upcBodyPre}
              <strong>{t.faqSection.upcBodyStrongUpc}</strong>
              {t.faqSection.upcBodyMid}
              <strong>{t.faqSection.upcBodyStrongEan}</strong>
              {t.faqSection.upcBodyPost}
            </p>
          </article>
          <article>
            <h2 className="text-xl font-semibold">{t.faqSection.whyTitle}</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {t.faqSection.whyItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h2 className="text-xl font-semibold">{t.faqSection.howTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.faqSection.howBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/distribution">
                  {t.faqSection.ctaDistribute} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/switch-to-musicdibs">{t.faqSection.ctaMigrate}</Link>
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
