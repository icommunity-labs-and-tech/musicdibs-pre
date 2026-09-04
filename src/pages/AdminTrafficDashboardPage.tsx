import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Globe,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface Metric {
  value: number;
  previous: number;
  delta: number;
}

interface Ga4Data {
  totals: Record<string, Metric>;
  series: { date: string; users: number; sessions: number; pageViews: number }[];
  countries: {
    country: string;
    code: string;
    users: number;
    sessions: number;
    engagementRate: number;
  }[];
  languages: { language: string; users: number; sessions: number }[];
  sources: {
    source: string;
    channel: string;
    sessions: number;
    users: number;
    conversions: number;
  }[];
  devices: { device: string; users: number; sessions: number }[];
  pages: { path: string; pageViews: number; users: number; avgDuration: number }[];
  landings: { path: string; sessions: number; bounceRate: number; conversions: number }[];
  events: { name: string; count: number }[];
  realtime: { users: number; byCountry: { country: string; users: number }[] };
}

interface ApiResp {
  days: number;
  generatedAt: string;
  configured: boolean;
  ga4: Ga4Data | null;
  firstParty: {
    signups: Metric;
    works: Metric;
    purchases: Metric;
  } | null;
  error?: string | null;
}

const RANGES = [
  { value: "7", label: "7 días" },
  { value: "28", label: "28 días" },
  { value: "90", label: "90 días" },
  { value: "365", label: "12 meses" },
];

const nf = new Intl.NumberFormat("es-ES");

function formatDuration(seconds: number) {
  const s = Math.round(seconds || 0);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function DeltaChip({ delta, invert = false }: { delta: number; invert?: boolean }) {
  if (!isFinite(delta) || Math.abs(delta) < 0.5)
    return <span className="text-xs text-muted-foreground">Sin cambio</span>;
  const up = delta > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        good ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {delta.toFixed(1)}%
    </span>
  );
}

function KpiCard({
  label,
  metric,
  format = (v: number) => nf.format(Math.round(v)),
  invert = false,
}: {
  label: string;
  metric?: Metric;
  format?: (v: number) => string;
  invert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{format(metric?.value ?? 0)}</div>
        <DeltaChip delta={metric?.delta ?? 0} invert={invert} />
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h, i) => (
                    <TableHead key={h} className={i === 0 ? "" : "text-right"}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => (
                      <TableCell
                        key={j}
                        className={
                          j === 0
                            ? "font-medium max-w-[280px] truncate"
                            : "text-right tabular-nums"
                        }
                      >
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminTrafficDashboardPage() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [days, setDays] = useState("28");

  const load = async (range = days) => {
    setLoading(true);
    setPageError(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke(
        "traffic-dashboard",
        { body: { days: Number(range) } },
      );
      if (error) throw error;
      setData(resp as ApiResp);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      setPageError(message);
      toast.error("Error cargando el panel de tráfico", { description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const ga4 = data?.ga4 ?? null;

  const chartData = useMemo(
    () =>
      (ga4?.series ?? []).map((p) => ({
        ...p,
        label: `${p.date.slice(6, 8)}/${p.date.slice(4, 6)}`,
      })),
    [ga4],
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" /> Panel de tráfico — musicdibs.com
          </h1>
          <p className="text-sm text-muted-foreground">
            Audiencia, adquisición y contenido desde Google Analytics 4, junto a la
            conversión real de la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={days} onValueChange={setDays}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.value} value={r.value}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load()}
            disabled={loading}
          >
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      )}

      {pageError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se pudo cargar el panel</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {data && !data.configured && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Google Analytics aún no está conectado para lectura</AlertTitle>
          <AlertDescription>
            Falta configurar las credenciales de lectura de GA4 (service account +
            ID de propiedad). Mientras tanto se muestran los datos propios de la
            plataforma.
          </AlertDescription>
        </Alert>
      )}

      {data?.configured && data.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error consultando la API de Google Analytics</AlertTitle>
          <AlertDescription className="break-all">{data.error}</AlertDescription>
        </Alert>
      )}

      {data?.firstParty && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Conversión real en la plataforma (datos propios)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard label="Altas de usuarios" metric={data.firstParty.signups} />
            <KpiCard label="Obras registradas" metric={data.firstParty.works} />
            <KpiCard label="Compras de créditos" metric={data.firstParty.purchases} />
          </CardContent>
        </Card>
      )}

      {ga4 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Usuarios activos" metric={ga4.totals.activeUsers} />
            <KpiCard label="Usuarios nuevos" metric={ga4.totals.newUsers} />
            <KpiCard label="Sesiones" metric={ga4.totals.sessions} />
            <KpiCard label="Páginas vistas" metric={ga4.totals.pageViews} />
            <KpiCard
              label="Tasa de interacción"
              metric={ga4.totals.engagementRate}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <KpiCard
              label="Rebote"
              metric={ga4.totals.bounceRate}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              invert
            />
            <KpiCard
              label="Duración media"
              metric={ga4.totals.avgSessionDuration}
              format={formatDuration}
            />
            <KpiCard label="Conversiones" metric={ga4.totals.conversions} />
          </div>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Evolución del tráfico</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Radio className="h-3 w-3" />
                {nf.format(ga4.realtime.users)} ahora mismo
              </Badge>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Usuarios"
                    stroke="hsl(var(--primary))"
                    fill="url(#gUsers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    name="Páginas vistas"
                    stroke="hsl(var(--muted-foreground))"
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BreakdownTable
              title="Países"
              headers={["País", "Usuarios", "Sesiones", "Interacción"]}
              rows={ga4.countries.map((c) => [
                c.country,
                nf.format(c.users),
                nf.format(c.sessions),
                `${(c.engagementRate * 100).toFixed(0)}%`,
              ])}
            />
            <BreakdownTable
              title="Idiomas"
              headers={["Idioma", "Usuarios", "Sesiones"]}
              rows={ga4.languages.map((l) => [
                l.language,
                nf.format(l.users),
                nf.format(l.sessions),
              ])}
            />
            <BreakdownTable
              title="Fuentes de adquisición"
              headers={["Fuente / medio", "Canal", "Sesiones", "Conversiones"]}
              rows={ga4.sources.map((s) => [
                s.source,
                s.channel,
                nf.format(s.sessions),
                nf.format(s.conversions),
              ])}
            />
            <BreakdownTable
              title="Dispositivos"
              headers={["Dispositivo", "Usuarios", "Sesiones"]}
              rows={ga4.devices.map((d) => [
                d.device,
                nf.format(d.users),
                nf.format(d.sessions),
              ])}
            />
            <BreakdownTable
              title="Páginas más vistas"
              headers={["Página", "Vistas", "Usuarios", "Duración"]}
              rows={ga4.pages.map((p) => [
                p.path,
                nf.format(p.pageViews),
                nf.format(p.users),
                formatDuration(p.avgDuration),
              ])}
            />
            <BreakdownTable
              title="Páginas de entrada"
              headers={["Landing", "Sesiones", "Rebote", "Conversiones"]}
              rows={ga4.landings.map((l) => [
                l.path,
                nf.format(l.sessions),
                `${(l.bounceRate * 100).toFixed(0)}%`,
                nf.format(l.conversions),
              ])}
            />
            <BreakdownTable
              title="Eventos"
              headers={["Evento", "Recuento"]}
              rows={ga4.events.map((e) => [e.name, nf.format(e.count)])}
            />
            <BreakdownTable
              title="En tiempo real por país"
              headers={["País", "Usuarios activos"]}
              rows={ga4.realtime.byCountry.map((r) => [
                r.country,
                nf.format(r.users),
              ])}
            />
          </div>
        </>
      )}

      <SeoKeywordStrategyPanel />

      {data && (
        <p className="text-xs text-muted-foreground">
          Última actualización: {new Date(data.generatedAt).toLocaleString("es-ES")}
        </p>
      )}
    </div>
  );
}
