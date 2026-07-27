import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { BarChart3, TrendingUp, Music2, DollarSign, PlayCircle, Info } from 'lucide-react';

type WorkRow = {
  id: string;
  title: string;
  created_at: string;
  distributed_at: string | null;
  status: string;
};

// Deterministic pseudo-random in [0,1) derived from a string (work id)
function seedRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// Estimated monthly streams for a track based on age and pseudo-random popularity
function estimateStreams(work: WorkRow, monthOffset = 0): number {
  const created = new Date(work.created_at);
  const now = new Date();
  now.setMonth(now.getMonth() - monthOffset);
  const monthsSince = Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (monthsSince < 0) return 0;
  const popularity = 0.3 + seedRand(work.id) * 1.7; // 0.3x - 2.0x
  const distributed = work.distributed_at ? 3.5 : 1; // boost if distributed
  // Growth curve: ramp up first 3 months, then plateau/decay slightly
  const rampUp = Math.min(1, monthsSince / 3);
  const decay = Math.exp(-Math.max(0, monthsSince - 6) / 24);
  const base = 420; // base monthly streams
  return Math.round(base * popularity * distributed * rampUp * decay);
}

const ROYALTY_PER_STREAM_EUR = 0.003;

export default function ArtistAnalyticsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';
  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState<WorkRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('works')
        .select('id, title, created_at, distributed_at, status')
        .eq('user_id', user.id)
        .in('status', ['certified', 'processing', 'distributed'])
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setWorks((data as WorkRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const { totalStreams, monthlyStreams, totalRoyalties, monthlyRoyalties, trend, topTracks, distributedCount } = useMemo(() => {
    const monthly = works.reduce((acc, w) => acc + estimateStreams(w, 0), 0);
    // Trend across last 6 months (oldest -> newest)
    const trendData = Array.from({ length: 6 }, (_, i) => {
      const offset = 5 - i;
      const d = new Date();
      d.setMonth(d.getMonth() - offset);
      const streams = works.reduce((acc, w) => acc + estimateStreams(w, offset), 0);
      return {
        month: d.toLocaleDateString(lang, { month: 'short' }),
        streams,
        royalties: +(streams * ROYALTY_PER_STREAM_EUR).toFixed(2),
      };
    });
    // Estimate total streams = sum of ~lifetime months (approx: sum of the last min(24,age) monthly values)
    const total = works.reduce((acc, w) => {
      const created = new Date(w.created_at);
      const monthsAlive = Math.min(24, Math.max(1, Math.round((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30))));
      let sum = 0;
      for (let m = 0; m < monthsAlive; m++) sum += estimateStreams(w, m);
      return acc + sum;
    }, 0);
    const tops = works
      .map((w) => {
        const s = estimateStreams(w, 0);
        return {
          id: w.id,
          title: w.title,
          streams: s,
          royalties: +(s * ROYALTY_PER_STREAM_EUR).toFixed(2),
          distributed: !!w.distributed_at,
        };
      })
      .sort((a, b) => b.streams - a.streams)
      .slice(0, 5);
    return {
      totalStreams: total,
      monthlyStreams: monthly,
      totalRoyalties: +(total * ROYALTY_PER_STREAM_EUR).toFixed(2),
      monthlyRoyalties: +(monthly * ROYALTY_PER_STREAM_EUR).toFixed(2),
      trend: trendData,
      topTracks: tops,
      distributedCount: works.filter((w) => w.distributed_at).length,
    };
  }, [works, lang]);

  const nf = new Intl.NumberFormat(lang);
  const cf = new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

  const chartConfig = {
    streams: { label: t('dashboard.analytics.streams', { defaultValue: 'Streams' }), color: 'hsl(var(--primary))' },
    royalties: { label: t('dashboard.analytics.royalties', { defaultValue: 'Royalties' }), color: 'hsl(var(--accent))' },
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {t('dashboard.analytics.title', { defaultValue: 'Analytics del artista' })}
          </h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Music2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t('dashboard.analytics.emptyState', { defaultValue: 'Aún no hay obras registradas para mostrar analíticas.' })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              {t('dashboard.analytics.title', { defaultValue: 'Analytics del artista' })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.analytics.subtitle', { defaultValue: 'Estimaciones de streams y royalties basadas en tu catálogo' })}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Info className="h-3 w-3" />
          {t('dashboard.analytics.estimated', { defaultValue: 'Datos estimados' })}
        </Badge>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('dashboard.analytics.disclaimer', {
            defaultValue: 'Las cifras son estimaciones aproximadas calculadas a partir de tu catálogo registrado y distribuido. Las cifras reales de las DSPs se integrarán próximamente.',
          })}
        </AlertDescription>
      </Alert>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <PlayCircle className="h-4 w-4" />
              {t('dashboard.analytics.monthlyStreams', { defaultValue: 'Streams este mes' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{nf.format(monthlyStreams)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              {t('dashboard.analytics.totalStreams', { defaultValue: 'Streams acumulados' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{nf.format(totalStreams)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {t('dashboard.analytics.monthlyRoyalties', { defaultValue: 'Royalties este mes' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{cf.format(monthlyRoyalties)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {t('dashboard.analytics.totalRoyalties', { defaultValue: 'Royalties acumulados' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{cf.format(totalRoyalties)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.analytics.trendTitle', { defaultValue: 'Evolución de streams y royalties' })}</CardTitle>
          <CardDescription>
            {t('dashboard.analytics.trendSubtitle', { defaultValue: 'Últimos 6 meses' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillStreams" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillRoyalties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="streams" stroke="hsl(var(--primary))" fill="url(#fillStreams)" strokeWidth={2} />
                <Area type="monotone" dataKey="royalties" stroke="hsl(var(--accent))" fill="url(#fillRoyalties)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top tracks */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.analytics.topTracksTitle', { defaultValue: 'Tus mejores tracks' })}</CardTitle>
          <CardDescription>
            {t('dashboard.analytics.topTracksSubtitle', { defaultValue: 'Top 5 por streams estimados este mes' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTracks} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="streams" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-4 space-y-2">
            {topTracks.map((tk, idx) => (
              <div key={tk.id} className="flex items-center justify-between text-sm border-t border-border/40 pt-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground w-5">#{idx + 1}</span>
                  <span className="font-medium truncate">{tk.title}</span>
                  {tk.distributed && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {t('dashboard.analytics.distributed', { defaultValue: 'Distribuida' })}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground whitespace-nowrap">
                  <span>{nf.format(tk.streams)} {t('dashboard.analytics.streamsShort', { defaultValue: 'streams' })}</span>
                  <span className="text-foreground font-medium">{cf.format(tk.royalties)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.analytics.catalogSize', { defaultValue: 'Obras en catálogo' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nf.format(works.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.analytics.distributedCount', { defaultValue: 'Distribuidas en DSPs' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nf.format(distributedCount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.analytics.avgPerTrack', { defaultValue: 'Media mensual por obra' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {nf.format(works.length ? Math.round(monthlyStreams / works.length) : 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
