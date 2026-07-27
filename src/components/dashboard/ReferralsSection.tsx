import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Gift, Copy, Check, Users, Coins, AlertTriangle, ChevronDown, Share2, Loader2,
} from 'lucide-react';
import { ANNUAL_TIER_CREDITS } from '@/lib/planLabel';
import { toast } from 'sonner';

interface ReferralRow {
  id: string;
  status: string;
  created_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  credits_referrer: number;
  subscription_tier: string;
  referred: { display_name: string | null } | null;
}

const BASE_URL = 'https://musicdibs.com';

export function ReferralsSection() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const tr = (k: string, fb: string) => t(k, { defaultValue: fb });
  const lang = i18n.resolvedLanguage || 'es';
  const [code, setCode] = useState<string | null>(null);
  const [refs, setRefs] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [codeRes, refsRes] = await Promise.all([
        supabase.from('referral_codes').select('code').eq('user_id', user.id).maybeSingle(),
        supabase.from('referrals').select(`
          id, status, created_at, revoked_at, revoked_reason,
          credits_referrer, subscription_tier,
          referred:referred_id ( display_name )
        `).eq('referrer_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setCode(codeRes.data?.code ?? null);
      setRefs((refsRes.data ?? []) as unknown as ReferralRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const fullLink = code ? `${BASE_URL}/login?tab=register&ref=${code}` : '';
  const activeRefs = refs.filter(r => r.status === 'active');
  const revokedRefs = refs.filter(r => r.status === 'revoked');
  const totalEarned = activeRefs.reduce((acc, r) => acc + (r.credits_referrer || 0), 0);

  const handleCopy = async () => {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      toast.success(tr('dashboard.referrals.copied', '¡Copiado!'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const handleShare = async () => {
    if (!fullLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MusicDibs',
          text: tr('dashboard.referrals.shareText', 'Únete a MusicDibs con mi enlace y recibe créditos extra:'),
          url: fullLink,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const tierLabel = (tier: string) => {
    const credits = ANNUAL_TIER_CREDITS[tier];
    if (credits) return `${credits} ${tr('dashboard.billing.creditsLabel', 'créditos')}/año`;
    return tier;
  };

  if (loading) {
    return (
      <Card className="border-border/40 lg:col-span-2">
        <CardContent className="py-8 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> {tr('dashboard.referrals.loading', 'Cargando referidos...')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 lg:col-span-2 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> {tr('dashboard.referrals.title', 'Referidos')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top: my link */}
        <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">
              {tr('dashboard.referrals.inviteTitle', 'Invita a otros artistas')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {tr('dashboard.referrals.inviteSubtitle', 'Tú y tu invitado recibiréis un 10% de créditos extra al contratar un plan anual')}
            </p>
          </div>
          {code ? (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={fullLink} readOnly className="h-9 text-xs font-mono bg-background/60" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCopy} className="gap-1.5 h-9">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? tr('dashboard.referrals.copied', '¡Copiado!') : tr('dashboard.referrals.copy', 'Copiar enlace')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShare} className="gap-1.5 h-9">
                    <Share2 className="h-3.5 w-3.5" />
                    {tr('dashboard.referrals.share', 'Compartir')}
                  </Button>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {tr('dashboard.referrals.yourCode', 'Tu código:')} {code}
              </Badge>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {tr('dashboard.referrals.noCodeYet', 'Tu código de referido se generará automáticamente al activar tu cuenta.')}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label={tr('dashboard.referrals.statActive', 'Invitados activos')}
            value={activeRefs.length}
          />
          <StatCard
            icon={<Coins className="h-4 w-4" />}
            label={tr('dashboard.referrals.statEarned', 'Créditos ganados')}
            value={totalEarned}
            tone="success"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label={tr('dashboard.referrals.statRevoked', 'Invitados revocados')}
            value={revokedRefs.length}
            tone={revokedRefs.length > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Table */}
        {refs.length > 0 ? (
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tr('dashboard.referrals.colArtist', 'Artista')}</TableHead>
                  <TableHead className="text-xs">{tr('dashboard.referrals.colPlan', 'Plan')}</TableHead>
                  <TableHead className="text-xs text-right">{tr('dashboard.referrals.colCredits', 'Créditos')}</TableHead>
                  <TableHead className="text-xs">{tr('dashboard.referrals.colStatus', 'Estado')}</TableHead>
                  <TableHead className="text-xs">{tr('dashboard.referrals.colDate', 'Fecha')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refs.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">
                      {r.referred?.display_name || tr('dashboard.referrals.anonArtist', 'Artista anónimo')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{tierLabel(r.subscription_tier)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {r.status === 'active' ? `+${r.credits_referrer}` : <span className="text-muted-foreground line-through">+{r.credits_referrer}</span>}
                    </TableCell>
                    <TableCell>
                      {r.status === 'active' ? (
                        <Badge className="bg-success/10 text-success border-success/20 border" variant="outline">
                          {tr('dashboard.referrals.active', 'Activo')}
                        </Badge>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 cursor-help">
                                {tr('dashboard.referrals.revoked', 'Revocado')}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                {r.revoked_reason === 'dispute'
                                  ? tr('dashboard.referrals.revokedDispute', 'Disputa')
                                  : tr('dashboard.referrals.revokedEarly', 'Cancelación temprana')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center space-y-2">
            <Gift className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-medium">
              {tr('dashboard.referrals.emptyTitle', 'Aún no tienes referidos')}
            </p>
            <p className="text-xs text-muted-foreground">
              {tr('dashboard.referrals.emptyDesc', 'Comparte tu enlace y empieza a ganar créditos extra')}
            </p>
            {code && (
              <Button size="sm" onClick={handleCopy} className="gap-1.5 mt-2">
                <Copy className="h-3.5 w-3.5" />
                {tr('dashboard.referrals.shareFirst', 'Comparte tu primer enlace')}
              </Button>
            )}
          </div>
        )}

        {/* FAQ */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            {tr('dashboard.referrals.howWorks', '¿Cómo funciona?')}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
              <li>{tr('dashboard.referrals.step1', 'Comparte tu enlace con otros artistas.')}</li>
              <li>{tr('dashboard.referrals.step2', 'Cuando contraten un plan anual por primera vez, ambos recibís créditos extra.')}</li>
              <li>{tr('dashboard.referrals.step3', 'Los créditos se aplican automáticamente en vuestra cuenta.')}</li>
            </ol>
            <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground space-y-1">
              <p>• {tr('dashboard.referrals.cond1', 'Solo válido para planes anuales nuevos (primera contratación).')}</p>
              <p>• {tr('dashboard.referrals.cond2', 'Los créditos se revocan si el invitado cancela en los primeros 30 días o abre una disputa.')}</p>
              <p>• {tr('dashboard.referrals.cond3', 'No válido para autoreferidos.')}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon, label, value, tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'warning';
}) {
  const toneClass = tone === 'success'
    ? 'text-success'
    : tone === 'warning'
      ? 'text-warning'
      : 'text-foreground';
  return (
    <div className="rounded-lg border border-border/40 bg-card/50 p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-md bg-muted flex items-center justify-center ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}
