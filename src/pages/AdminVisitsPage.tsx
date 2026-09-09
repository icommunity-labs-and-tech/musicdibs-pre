import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/services/adminApi';
import { AlertCircle, Download, MousePointerClick, RefreshCw } from 'lucide-react';

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

const PAGE_SIZE = 100;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminVisitsPage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<VisitLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUtmVisitLog({
        start,
        end,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if ((res as { error?: string })?.error) throw new Error((res as { error?: string }).error);
      setData(res as VisitLog);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las visitas');
      setData(null);
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

  const total = data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MousePointerClick className="h-5 w-5 text-primary" />
          Visitas por campaña
        </h1>
        <p className="text-sm text-muted-foreground">
          Cada visita que llega con parámetros de campaña o desde otra web: fecha, origen, canal y página visitada.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Busca por origen, campaña, web de procedencia o página.</CardDescription>
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
              <Label htmlFor="search" className="text-xs">Buscar</Label>
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Detalle de visitas</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{total} visitas</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
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
                        <TableCell className="text-sm text-muted-foreground">{r.campaign || '—'}</TableCell>
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
      </Card>
    </div>
  );
}
