import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, MousePointerClick } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type SourceDetail = { medium: string; campaign: string; visits: number; top_landing: string };

export type UtmVisitsData = {
  total_visits: number;
  by_source: Array<{
    source: string;
    medium: string;
    campaign: string;
    visits: number;
    top_landing: string;
    mediums_count?: number;
    campaigns_count?: number;
    details?: SourceDetail[];
  }>;
  range: { start: string; end: string };
};

type Props = {
  data: UtmVisitsData | null;
  loading: boolean;
  error: string | null;
};

export function UtmVisitsPanel({ data, loading, error }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const title = (
    <CardTitle className="text-base flex items-center gap-2">
      <MousePointerClick className="h-4 w-4 text-primary" />
      Visitas por fuente de tráfico (UTM)
    </CardTitle>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title}
          <Badge variant="secondary" className="text-[10px]">{data.total_visits} visitas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fuente</TableHead>
                <TableHead>Canales / campañas</TableHead>
                <TableHead>Página de entrada principal</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.by_source.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Sin visitas con UTM en el periodo
                  </TableCell>
                </TableRow>
              )}
              {data.by_source.map((row) => {
                const details = row.details ?? [];
                const expandable = details.length > 1;
                const isOpen = !!open[row.source];
                return (
                  <>
                    <TableRow
                      key={row.source}
                      className={expandable ? 'cursor-pointer' : undefined}
                      onClick={expandable ? () => setOpen((p) => ({ ...p, [row.source]: !p[row.source] })) : undefined}
                    >
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1">
                          {expandable ? (
                            isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            <span className="w-3.5" />
                          )}
                          {row.source}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.medium}
                        {row.campaign !== '—' ? ` · ${row.campaign}` : ''}
                        {details.length > 1 ? ` (+${details.length - 1})` : ''}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.top_landing}</TableCell>
                      <TableCell className="text-right font-semibold">{row.visits}</TableCell>
                    </TableRow>
                    {isOpen && details.map((d) => (
                      <TableRow key={`${row.source}-${d.medium}-${d.campaign}`} className="bg-muted/30">
                        <TableCell className="pl-8 text-xs text-muted-foreground">{d.medium}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.campaign}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.top_landing}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{d.visits}</TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
