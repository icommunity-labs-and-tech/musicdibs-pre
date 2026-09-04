import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ExternalLink } from "lucide-react";

type Intent = "informacional" | "transaccional" | "comparativa";
type Status = "publicado" | "pendiente" | "en-curso";

interface KeywordRow {
  keyword: string;
  language: "ES" | "EN" | "PT";
  intent: Intent;
  volume: number | null;
  difficulty: number | null;
  target: string;
  asset: string;
  status: Status;
}

/**
 * Estrategia SEO de captación para "registrar canciones" y "derechos de autor".
 * Volumen y dificultad: estimaciones de Semrush (base de datos ES).
 */
const STRATEGY: KeywordRow[] = [
  {
    keyword: "como registrar una cancion",
    language: "ES",
    intent: "informacional",
    volume: 110,
    difficulty: 13,
    target: "/news/registrar-canciones-guia-es",
    asset: "Guía: cómo registrar canciones",
    status: "publicado",
  },
  {
    keyword: "derechos de autor musica",
    language: "ES",
    intent: "informacional",
    volume: 90,
    difficulty: 23,
    target: "/news/derechos-de-autor-de-una-cancion-es",
    asset: "Derechos de autor de una canción",
    status: "publicado",
  },
  {
    keyword: "registrar canciones",
    language: "ES",
    intent: "transaccional",
    volume: 70,
    difficulty: 31,
    target: "/registro-musical",
    asset: "Landing de registro musical",
    status: "publicado",
  },
  {
    keyword: "registrar derechos de autor",
    language: "ES",
    intent: "transaccional",
    volume: 50,
    difficulty: 27,
    target: "/news/registrar-derechos-de-autor-online-es",
    asset: "Comparativa de vías de registro",
    status: "publicado",
  },
  {
    keyword: "registrar una cancion",
    language: "ES",
    intent: "transaccional",
    volume: 40,
    difficulty: 6,
    target: "/registro-musical",
    asset: "Landing de registro musical",
    status: "publicado",
  },
  {
    keyword: "derechos de autor de una cancion",
    language: "ES",
    intent: "informacional",
    volume: 20,
    difficulty: 0,
    target: "/news/derechos-de-autor-de-una-cancion-es",
    asset: "Derechos de autor de una canción",
    status: "publicado",
  },
  {
    keyword: "copyright cancion",
    language: "ES",
    intent: "informacional",
    volume: 20,
    difficulty: 0,
    target: "/news/derechos-de-autor-de-una-cancion-es",
    asset: "Derechos de autor de una canción",
    status: "publicado",
  },
  {
    keyword: "registro musical",
    language: "ES",
    intent: "transaccional",
    volume: 20,
    difficulty: 0,
    target: "/registro-musical",
    asset: "Landing de registro musical",
    status: "publicado",
  },
  {
    keyword: "register a song copyright",
    language: "EN",
    intent: "transaccional",
    volume: null,
    difficulty: null,
    target: "/news/registrar-canciones-guia-en",
    asset: "How to register your songs",
    status: "publicado",
  },
  {
    keyword: "song copyright registration",
    language: "EN",
    intent: "informacional",
    volume: null,
    difficulty: null,
    target: "/news/derechos-de-autor-de-una-cancion-en",
    asset: "Copyright of a song",
    status: "publicado",
  },
  {
    keyword: "registrar musica direitos autorais",
    language: "PT",
    intent: "transaccional",
    volume: null,
    difficulty: null,
    target: "/news/registrar-direitos-de-autor-online-pt",
    asset: "Registrar direitos autorais online",
    status: "publicado",
  },
  {
    keyword: "direitos autorais de uma musica",
    language: "PT",
    intent: "informacional",
    volume: null,
    difficulty: null,
    target: "/news/derechos-de-autor-de-una-cancion-pt",
    asset: "Direitos autorais de uma música",
    status: "publicado",
  },
  {
    keyword: "musicdibs vs udio",
    language: "ES",
    intent: "comparativa",
    volume: null,
    difficulty: null,
    target: "/musicdibs-vs-udio",
    asset: "Comparativa de plataformas",
    status: "publicado",
  },
  {
    keyword: "certificado blockchain cancion",
    language: "ES",
    intent: "transaccional",
    volume: null,
    difficulty: null,
    target: "/certificado-blockchain",
    asset: "Landing de certificado blockchain",
    status: "publicado",
  },
  {
    keyword: "registrar letra de cancion",
    language: "ES",
    intent: "transaccional",
    volume: null,
    difficulty: null,
    target: "/registro-musical",
    asset: "Artículo pendiente de crear",
    status: "pendiente",
  },
  {
    keyword: "cuanto cuesta registrar una cancion",
    language: "ES",
    intent: "informacional",
    volume: null,
    difficulty: null,
    target: "/registro-musical",
    asset: "Artículo pendiente de crear",
    status: "pendiente",
  },
];

const intentStyles: Record<Intent, string> = {
  informacional: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  transaccional: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  comparativa: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

const statusStyles: Record<Status, string> = {
  publicado: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "en-curso": "bg-sky-500/10 text-sky-600 border-sky-500/30",
  pendiente: "bg-muted text-muted-foreground border-border",
};

const LANGUAGES = ["Todos", "ES", "EN", "PT"] as const;

export default function SeoKeywordStrategyPanel() {
  const [lang, setLang] = useState<(typeof LANGUAGES)[number]>("Todos");

  const rows = useMemo(
    () => (lang === "Todos" ? STRATEGY : STRATEGY.filter((r) => r.language === lang)),
    [lang],
  );

  const published = STRATEGY.filter((r) => r.status === "publicado").length;
  const totalVolume = STRATEGY.reduce((acc, r) => acc + (r.volume ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Estrategia SEO — registro y derechos de autor
            </CardTitle>
            <CardDescription>
              Palabras clave objetivo, intención de búsqueda y contenido asignado.
              Volumen y dificultad estimados por Semrush (mercado España).
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {LANGUAGES.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={lang === l ? "default" : "outline"}
                onClick={() => setLang(l)}
              >
                {l}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Keywords en cartera</p>
            <p className="text-xl font-semibold">{STRATEGY.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Con contenido publicado</p>
            <p className="text-xl font-semibold">{published}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Búsquedas/mes (ES)</p>
            <p className="text-xl font-semibold">~{totalVolume}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Palabra clave</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead>Intención</TableHead>
                <TableHead className="text-right">Vol./mes</TableHead>
                <TableHead className="text-right">Dificultad</TableHead>
                <TableHead>Página destino</TableHead>
                <TableHead>Contenido</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.keyword}-${r.language}`}>
                  <TableCell className="font-medium">{r.keyword}</TableCell>
                  <TableCell>{r.language}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={intentStyles[r.intent]}>
                      {r.intent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.volume ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {r.difficulty === null ? "—" : `${r.difficulty}/100`}
                  </TableCell>
                  <TableCell>
                    <a
                      href={r.target}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {r.target}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.asset}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[r.status]}>
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Prioriza las transaccionales de baja dificultad («registrar una canción»,
          «registro musical»): son las que más cerca están de una conversión. Las
          informacionales alimentan enlaces internos hacia /registro-musical.
        </p>
      </CardContent>
    </Card>
  );
}
