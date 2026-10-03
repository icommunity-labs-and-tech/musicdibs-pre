import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/services/adminApi';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Globe,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type VisitRow = {
  id: string;
  created_at: string;
  source: string;
  medium: string;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrer: string | null;
  landing_path: string;
  language: string | null;
};

type VisitLog = {
  rows: VisitRow[];
  total: number;
  limit: number;
  offset: number;
};

type VisitSummary = {
  total_visits: number;
  paid_visits: number;
  by_day: Array<{ day: string; total: number; paid: number }>;
  by_medium: Array<{ medium: string; visits: number }>;
  by_campaign: Array<{ campaign: string; visits: number; medium: string; top_landing: string }>;
  by_landing: Array<{ landing: string; visits: number; paid: number }>;
  by_language: Array<{ language: string; visits: number }>;
  range: { start: string; end: string };
};

const PAGE_SIZE = 100;

const KNOWN_CAMPAIGNS: Record<string, string> = {
  '24203431131': 'PMax ES',
  '24207026838': 'Brasil PT',
  '24233517818': 'US Copyright EN',
  '24245101358': 'Remarketing',
};

function campaignLabel(id: string): string {
  return KNOWN_CAMPAIGNS[id] ? `${KNOWN_CAMPAIGNS[id]} (${id})` : id;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function pct(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

export default function AdminVisitsPage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<VisitLog | null>(null);
  const [summary, setSummary] = useState<VisitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, logRes] = await Promise.all([
        adminApi.getUtmVisitSummary({ start, end }),
        adminApi.getUtmVisitLog({
          start,
          end,
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
      ]);
      if ((summaryRes as { error?: string })?.error) throw new Error((summaryRes as { error?: string }).error);
      if ((logRes as { error?: string })?.error) throw new Error((logRes as { error?: string }).error);
      setSummary(summaryRes as VisitSummary);
      setData(logRes as VisitLog);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las visitas');
      setData(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [start, end, search, page]);

  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    if (!data?.rows?.length) return;
    const header = ['Fecha', 'Origen', 'Canal', 'Campaña', 'Página visitada', 'Referrer', 'Idioma'];
    const lines = data.rows.map((r) => [
      new Date(r.created_at).toISOString(),
      r.source,
      r.medium,
      r.campaign ?? '',
      r.landing_path,
      r.referrer ?? '',
      r.language ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitas-${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const conclusions = useMemo(() => {
    if (!summary || summary.total_visits === 0) return [];
    const out: string[] = [];
    const paidShare = Math.round((summary.paid_visits / summary.total_visits) * 100);
    out.push(
      paidShare >= 50
        ? `El ${paidShare}% de las visitas llega desde anuncios de pago: la web depende sobre todo de Google Ads.`
        : `Solo el ${paidShare}% de las visitas es de pago: el tráfico orgánico y de referencia pesa más que los anuncios.`,
    );
    const topCampaign = summary.by_campaign[0];
    if (topCampaign) {
      out.push(
        `La campaña que más visitas trae es ${campaignLabel(topCampaign.campaign)} con ${topCampaign.visits} (${pct(topCampaign.visits, summary.total_visits)} del total), entrando sobre todo por ${topCampaign.top_landing}.`,
      );
    }
    const topLanding = summary.by_landing[0];
    if (topLanding) {
      out.push(`La página de entrada más usada es ${topLanding.landing} con ${topLanding.visits} visitas (${pct(topLanding.visits, summary.total_visits)}).`);
    }
    const days = summary.by_day;
    if (days.length >= 14) {
      const last7 = days.slice(-7).reduce((s, d) => s + d.total, 0) / 7;
      const prev7 = days.slice(-14, -7).reduce((s, d) => s + d.total, 0) / 7;
      if (prev7 > 0) {
        const diff = Math.round(((last7 - prev7) / prev7) * 100);
        if (Math.abs(diff) >= 10) {
          out.push(
            diff > 0
              ? `Las visitas de los últimos 7 días suben un ${diff}% frente a los 7 anteriores (${Math.round(last7)}/día vs ${Math.round(prev7)}/día).`
              : `Las visitas de los últimos 7 días caen un ${Math.abs(diff)}% frente a los 7 anteriores (${Math.round(last7)}/día vs ${Math.round(prev7)}/día).`,
          );
        } else {
          out.push(`El ritmo de visitas se mantiene estable: ~${Math.round(last7)} al día en la última semana.`);
        }
      }
    }
    const topLang = summary.by_language.find((l) => l.language !== 'desconocido');
    if (topLang) {
      out.push(`El idioma de navegador más frecuente es ${topLang.language} (${pct(topLang.visits, summary.total_visits)} de las visitas).`);
    }
    return out;
  }, [summary]);

  const total = data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const maxDayVisits = Math.max(1, ...(summary?.by_day.map((d) => d.total) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MousePointerClick className="h-5 w-5 text-primary" />
          Visitas por campaña
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen agrupado del tráfico con parámetros de campaña o procedencia externa: qué campañas y páginas atraen visitas y cómo evoluciona.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>El resumen y el detalle usan este periodo. La búsqueda solo afecta al detalle.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="start" className="text-xs">Desde</Label>
              <Input id="start" type="date" value={start} onChange={(e) => { setPage(0); setStart(e.target.value); }} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end" className="text-xs">Hasta</Label>
              <Input id="end" type="date" value={end} onChange={(e) => { setPage(0); setEnd(e.target.value); }} className="w-40" />
            </div>
            <div className="space-y-1 min-w-[220px] flex-1">
              <Label htmlFor="search" className="text-xs">Buscar en el detalle</Label>
              <Input
                id="search"
                placeholder="bedroomproducers, blog, /music-distribution…"
                value={search}
                onChange={(e) => { setPage(0); setSearch(e.target.value); }}
              />
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!data?.rows?.length}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Visitas totales</CardDescription>
                <CardTitle className="text-2xl">{summary.total_visits.toLocaleString('es-ES')}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Desde anuncios de pago</CardDescription>
                <CardTitle className="text-2xl">
                  {summary.paid_visits.toLocaleString('es-ES')}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{pct(summary.paid_visits, summary.total_visits)}</span>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Campaña con más visitas</CardDescription>
                <CardTitle className="text-base leading-snug">
                  {summary.by_campaign[0] ? campaignLabel(summary.by_campaign[0].campaign) : '—'}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Página de entrada principal</CardDescription>
                <CardTitle className="text-base leading-snug break-all">{summary.by_landing[0]?.landing ?? '—'}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {conclusions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Conclusiones del periodo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {conclusions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolución diaria
              </CardTitle>
              <CardDescription>Visitas por día; la parte oscura corresponde a tráfico de pago.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.by_day.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin visitas en el periodo.</p>
              ) : (
                <div className="flex h-36 items-end gap-1">
                  {summary.by_day.map((d) => (
                    <div key={d.day} className="group relative flex-1" title={`${d.day}: ${d.total} visitas (${d.paid} de pago)`}>
                      <div className="flex w-full flex-col justify-end" style={{ height: '9rem' }}>
                        <div
                          className="w-full rounded-t bg-primary/30"
                          style={{ height: `${Math.max(2, (d.total / maxDayVisits) * 100)}%` }}
                        />
                        <div
                          className="w-full bg-primary"
                          style={{ height: `${(d.paid / maxDayVisits) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{summary.by_day[0]?.day}</span>
                <span>{summary.by_day[summary.by_day.length - 1]?.day}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Por campaña
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaña</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Entrada principal</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_campaign.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sin visitas con campaña en el periodo</TableCell>
                      </TableRow>
                    )}
                    {summary.by_campaign.map((c) => (
                      <TableRow key={c.campaign}>
                        <TableCell className="text-sm font-medium">{campaignLabel(c.campaign)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.medium}</Badge></TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={c.top_landing}>{c.top_landing}</TableCell>
                        <TableCell className="text-right font-semibold">{c.visits}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{pct(c.visits, summary.total_visits)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Por página de entrada</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Página</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">De pago</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_landing.map((l) => (
                      <TableRow key={l.landing}>
                        <TableCell className="max-w-[220px] truncate text-sm" title={l.landing}>{l.landing}</TableCell>
                        <TableCell className="text-right font-semibold">{l.visits}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{l.paid}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{pct(l.visits, summary.total_visits)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Por canal</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_medium.map((m) => (
                      <TableRow key={m.medium}>
                        <TableCell><Badge variant="outline" className="text-[10px]">{m.medium}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{m.visits}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{pct(m.visits, summary.total_visits)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Por idioma del navegador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Idioma</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_language.map((l) => (
                      <TableRow key={l.language}>
                        <TableCell className="text-sm">{l.language}</TableCell>
                        <TableCell className="text-right font-semibold">{l.visits}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{pct(l.visits, summary.total_visits)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
            onClick={() => setShowDetail((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              {showDetail ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Detalle de visitas (listado completo)
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">{total} visitas</Badge>
          </button>
          <CardDescription>Listado visita a visita, útil para buscar un caso concreto. Para el análisis general, usa el resumen de arriba.</CardDescription>
        </CardHeader>
        {showDetail && (
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Campaña</TableHead>
                        <TableHead>Página visitada</TableHead>
                        <TableHead>Procedencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.rows?.length ?? 0) === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                            Sin visitas registradas en este periodo
                          </TableCell>
                        </TableRow>
                      )}
                      {data?.rows?.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {new Date(r.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                          </TableCell>
                          <TableCell className="font-medium">{r.source}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{r.medium}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.campaign ? campaignLabel(r.campaign) : '—'}</TableCell>
                          <TableCell className="text-sm">{r.landing_path}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground" title={r.referrer || ''}>
                            {r.referrer || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {total > PAGE_SIZE && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-xs text-muted-foreground">Página {page + 1} de {maxPage + 1}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
