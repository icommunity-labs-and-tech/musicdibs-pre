import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Keyword {
  phrase: string;
  position: number;
  previous: number;
  delta: number;
  volume: number;
  cpc: number;
  url: string;
  trafficShare: number;
  delta7d: number | null;
  delta30d: number | null;
  historyPoints: number;
}

interface DbBlock {
  db: string;
  country: string;
  language: string;
  flag: string;
  label: string;
  overview: {
    organicKeywords: number;
    organicTraffic: number;
    organicCost: number;
    rank: number;
  } | null;
  keywords: Keyword[];
  alerts: Keyword[];
  error: string | null;
  cached?: boolean;
  cachedDate?: string | null;
}
interface ApiResp {
  domain: string;
  generatedAt: string;
  databases: DbBlock[];
  quotaExhausted?: boolean;
  error?: string | null;
}

const LANG_LABEL: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
};

const isQuotaError = (message?: string | null) =>
  /ERROR\s+134|TOTAL\s+LIMIT\s+EXCEEDED/i.test(message || "");

const quotaMessage =
  "La cuota de API de Semrush está agotada. No se pueden pedir datos nuevos hasta que Semrush reinicie la cuota o se conecte una cuenta/plan con más límite.";

function DeltaBadge({ delta }: { delta: number }) {
  if (!delta)
    return <span className="text-muted-foreground text-xs">Sin cambio</span>;
  const up = delta > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        up ? "text-success" : "text-red-600"
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {delta}
    </span>
  );
}

export default function AdminSeoDashboardPage() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeDb, setActiveDb] = useState("es");
  const [langFilter, setLangFilter] = useState<"all" | "es" | "en" | "pt">(
    "all",
  );

  const load = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke(
        "seo-dashboard",
        { body: {} },
      );
      if (error) throw error;
      if ((resp as any)?.error && !(resp as any)?.quotaExhausted) {
        throw new Error((resp as any).error);
      }
      setData(resp as ApiResp);
    } catch (e: any) {
      const message = e?.message || "Error desconocido";
      setPageError(message);
      toast.error("Error cargando datos SEO", {
        description: isQuotaError(message) ? quotaMessage : message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredDbs = useMemo(() => {
    if (!data) return [];
    return langFilter === "all"
      ? data.databases
      : data.databases.filter((d) => d.language === langFilter);
  }, [data, langFilter]);

  const currentDb = useMemo(
    () => filteredDbs.find((d) => d.db === activeDb) || filteredDbs[0],
    [filteredDbs, activeDb],
  );

  const globalAlerts = useMemo(() => {
    if (!data) return [];
    return data.databases
      .flatMap((d) =>
        d.alerts.map((a) => ({ ...a, db: d.db, flag: d.flag, label: d.label })),
      )
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 20);
  }, [data]);

  const quotaExhausted = Boolean(
    data?.quotaExhausted ||
      isQuotaError(data?.error) ||
      data?.databases.some((db) => isQuotaError(db.error)) ||
      isQuotaError(pageError),
  );

  const hasCachedData = Boolean(
    data?.databases.some((db) => db.cached && db.keywords.length > 0),
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" /> Panel SEO — musicdibs.com
          </h1>
          <p className="text-sm text-muted-foreground">
            Keywords y tráfico por país e idioma, con alertas de movimiento de
            posiciones (fuente: Semrush).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={langFilter} onValueChange={(v) => setLangFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="es">Español</TabsTrigger>
              <TabsTrigger value="en">Inglés</TabsTrigger>
              <TabsTrigger value="pt">Portugués</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1">Actualizar</span>
          </Button>
        </div>
      </div>

      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      )}

      {quotaExhausted && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cuota de Semrush agotada</AlertTitle>
          <AlertDescription>
            {quotaMessage}{" "}
            {hasCachedData
              ? "Mostrando el último snapshot guardado disponible."
              : "Todavía no hay snapshots guardados para mostrar datos cacheados."}
          </AlertDescription>
        </Alert>
      )}

      {pageError && !quotaExhausted && !data && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se pudieron cargar los datos SEO</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          {/* Global overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {data.databases.map((db) => (
              <Card
                key={db.db}
                className={`cursor-pointer transition hover:border-primary ${
                  activeDb === db.db ? "border-primary" : ""
                }`}
                onClick={() => setActiveDb(db.db)}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{db.flag}</span>
                    <div className="flex items-center gap-1">
                      {db.cached && (
                        <Badge variant="secondary" className="text-[10px]">
                          Cache
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {LANG_LABEL[db.language]}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{db.label}</div>
                  <div className="text-lg font-bold">
                    {db.overview?.organicKeywords ?? db.keywords.length}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      kw
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{db.overview?.organicTraffic ?? 0} visitas/mes
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alerts panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alertas de movimiento (|Δ| ≥ 3 posiciones)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {globalAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin movimientos relevantes en las últimas actualizaciones de
                  Semrush.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>País</TableHead>
                        <TableHead>Keyword</TableHead>
                        <TableHead className="text-right">Posición</TableHead>
                        <TableHead className="text-right">Anterior</TableHead>
                        <TableHead className="text-right">Δ</TableHead>
                        <TableHead className="text-right">Volumen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalAlerts.map((a, i) => (
                        <TableRow key={`${a.db}-${a.phrase}-${i}`}>
                          <TableCell>
                            <span className="mr-1">{a.flag}</span>
                            <span className="text-xs text-muted-foreground">
                              {a.label}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{a.phrase}</TableCell>
                          <TableCell className="text-right">{a.position}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {a.previous || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DeltaBadge delta={a.delta} />
                          </TableCell>
                          <TableCell className="text-right">{a.volume}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-country keyword table */}
          {currentDb && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">{currentDb.flag}</span>
                  Keywords — {currentDb.label} ({LANG_LABEL[currentDb.language]})
                  {currentDb.cached && (
                    <Badge variant="secondary" className="ml-1">
                      Cache {currentDb.cachedDate ? currentDb.cachedDate : ""}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentDb.error && !currentDb.keywords.length ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error en Semrush</AlertTitle>
                    <AlertDescription>
                      {isQuotaError(currentDb.error) ? quotaMessage : currentDb.error}
                    </AlertDescription>
                  </Alert>
                ) : currentDb.keywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin keywords rankeadas en este mercado.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentDb.error && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Datos nuevos no disponibles</AlertTitle>
                        <AlertDescription>
                          {isQuotaError(currentDb.error)
                            ? "Se muestra el último snapshot guardado porque Semrush ha agotado la cuota."
                            : currentDb.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead className="text-right">Posición</TableHead>
                        <TableHead className="text-right">Δ vs anterior</TableHead>
                        <TableHead className="text-right">Δ 7d</TableHead>
                        <TableHead className="text-right">Δ 30d</TableHead>
                        <TableHead className="text-right">Volumen</TableHead>
                        <TableHead className="text-right">CPC</TableHead>
                        <TableHead className="text-right">Tráfico %</TableHead>
                        <TableHead>URL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDb.keywords.map((k, i) => (
                        <TableRow key={`${k.phrase}-${i}`}>
                          <TableCell className="font-medium">{k.phrase}</TableCell>
                          <TableCell className="text-right">{k.position}</TableCell>
                          <TableCell className="text-right">
                            <DeltaBadge delta={k.delta} />
                          </TableCell>
                          <TableCell className="text-right">
                            {k.delta7d === null ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <DeltaBadge delta={k.delta7d} />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {k.delta30d === null ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <DeltaBadge delta={k.delta30d} />
                            )}
                          </TableCell>
                          <TableCell className="text-right">{k.volume}</TableCell>
                          <TableCell className="text-right">
                            {k.cpc ? `$${k.cpc.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {k.trafficShare
                              ? `${k.trafficShare.toFixed(1)}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {k.url ? (
                              <a
                                href={k.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline text-xs"
                              >
                                {k.url.replace(/^https?:\/\//, "")}
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      </TableBody>
                    </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary insight */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>
                {globalAlerts.filter((a) => a.delta > 0).length} keywords subieron
                de posición ·{" "}
                {globalAlerts.filter((a) => a.delta < 0).length} bajaron.
              </p>
              <p>
                Datos generados: {new Date(data.generatedAt).toLocaleString("es-ES")}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
