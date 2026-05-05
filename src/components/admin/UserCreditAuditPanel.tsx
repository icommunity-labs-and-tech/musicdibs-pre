import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw, ShieldAlert, ShieldCheck, Zap, CreditCard, RotateCcw } from 'lucide-react';

interface CreditAuditRow {
  record_type: 'transaction' | 'validation';
  record_id: string;
  created_at: string;
  event_type: string;
  credits_delta: number;
  description: string | null;
  feature_key: string | null;
  stripe_session_id: string | null;
  coupon_code: string | null;
  reference_id: string | null;
  outcome: string | null;
}

const EVENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  purchase:                  { label: 'Compra',               icon: <CreditCard className="h-3 w-3" />,    badgeClass: 'bg-green-500/20 text-green-400' },
  renewal:                   { label: 'Renovación',           icon: <RotateCcw className="h-3 w-3" />,     badgeClass: 'bg-blue-500/20 text-blue-400' },
  usage:                     { label: 'Uso',                  icon: <Zap className="h-3 w-3" />,           badgeClass: 'bg-purple-500/20 text-purple-400' },
  refund:                    { label: 'Reembolso',            icon: <RotateCcw className="h-3 w-3" />,     badgeClass: 'bg-yellow-500/20 text-yellow-400' },
  payment_failed:            { label: 'Pago fallido',         icon: <ShieldAlert className="h-3 w-3" />,   badgeClass: 'bg-red-500/20 text-red-400' },
  subscription_issue:        { label: 'Problema suscripción', icon: <ShieldAlert className="h-3 w-3" />,   badgeClass: 'bg-orange-500/20 text-orange-400' },
  validation_approved:       { label: 'Validación OK',        icon: <ShieldCheck className="h-3 w-3" />,   badgeClass: 'bg-green-500/10 text-green-500/70' },
  validation_rejected_insufficient: { label: 'Saldo insuficiente', icon: <ShieldAlert className="h-3 w-3" />, badgeClass: 'bg-red-500/20 text-red-400' },
  validation_error:          { label: 'Error validación',     icon: <ShieldAlert className="h-3 w-3" />,   badgeClass: 'bg-orange-500/20 text-orange-400' },
};

function EventBadge({ type }: { type: string }) {
  const cfg = EVENT_CONFIG[type] || { label: type, icon: <Zap className="h-3 w-3" />, badgeClass: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={`flex items-center gap-1 text-[10px] font-medium ${cfg.badgeClass}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = delta > 0;
  return (
    <span className={`text-xs font-semibold tabular-nums ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {positive ? '+' : ''}{delta} cr
    </span>
  );
}

export default function UserCreditAuditPanel({ userId, userEmail }: { userId: string; userEmail?: string }) {
  const [rows, setRows] = useState<CreditAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showValidations, setShowValidations] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_get_user_credit_audit', {
      p_user_id: userId,
      p_limit: 100,
    });

    if (error) { console.error('[CreditAudit] Error:', error); setLoadError(true); } else { setLoadError(false); }
    setRows((data || []) as CreditAuditRow[]);
    setLoading(false);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const displayed = showValidations
    ? rows
    : rows.filter(r => r.record_type === 'transaction');

  const rejectedCount = rows.filter(r => r.event_type === 'validation_rejected_insufficient').length;
  const totalPurchased = rows.filter(r => r.event_type === 'purchase' || r.event_type === 'renewal')
    .reduce((sum, r) => sum + (r.credits_delta || 0), 0);
  const totalUsed = rows.filter(r => r.event_type === 'usage')
    .reduce((sum, r) => sum + Math.abs(r.credits_delta || 0), 0);

  function exportAudit() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit_audit_${userEmail || userId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando auditoría de créditos…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-4 flex flex-col items-center gap-2 text-muted-foreground">
        <ShieldAlert className="h-5 w-5 text-red-400" />
        <p className="text-xs">Error al cargar la auditoría de créditos.</p>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Auditoría de créditos
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" /> Recargar
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={exportAudit}>
            <Download className="h-3 w-3 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Comprados</p>
          <p className="text-sm font-bold text-green-400">+{totalPurchased}</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Usados</p>
          <p className="text-sm font-bold text-purple-400">-{totalUsed}</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Rechazos</p>
          <p className={`text-sm font-bold ${rejectedCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {rejectedCount}
          </p>
        </div>
      </div>

      {/* Toggle validations */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setShowValidations(v => !v)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            showValidations
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {showValidations ? '✓ ' : ''}Mostrar validaciones ({rows.filter(r => r.record_type === 'validation').length})
        </button>
        {rejectedCount > 0 && (
          <span className="text-[10px] text-red-400 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> {rejectedCount} intentos sin saldo
          </span>
        )}
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Sin registros</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
          {displayed.map(row => (
            <div
              key={row.record_id}
              className={`rounded-lg px-3 py-2 text-xs flex items-start gap-2 ${
                row.event_type === 'validation_rejected_insufficient'
                  ? 'bg-red-500/5 border border-red-500/20'
                  : row.record_type === 'validation'
                  ? 'bg-muted/20 opacity-60'
                  : 'bg-muted/40'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <EventBadge type={row.event_type} />
                  {row.feature_key && (
                    <span className="text-[10px] text-muted-foreground font-mono">{row.feature_key}</span>
                  )}
                  {row.coupon_code && (
                    <span className="text-[10px] text-yellow-400/80 font-mono">🎟 {row.coupon_code}</span>
                  )}
                </div>
                {row.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{row.description}</p>
                )}
                {row.stripe_session_id && (
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate">
                    {row.stripe_session_id}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {new Date(row.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <DeltaBadge delta={row.credits_delta} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
