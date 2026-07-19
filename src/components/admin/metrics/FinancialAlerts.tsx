import { AlertTriangle, TrendingDown, DollarSign, Flame, ShieldAlert, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FinancialAlertsProps {
  metrics: any;
  isCurrentPeriod?: boolean;
  periodLabel?: string;
}

interface AlertItem {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  icon: any;
}

export default function FinancialAlerts({ metrics, isCurrentPeriod = true, periodLabel }: FinancialAlertsProps) {
  const m = metrics;
  const alerts: AlertItem[] = [];

  // Alerts based on global "this month" snapshots (Stripe MRR, churn, LTV/CAC,
  // runway, conversion, quick ratio…) only make sense when the user is looking
  // at the current period. For past periods we hide them to avoid showing
  // numbers that don't match the rest of the section.
  const showLiveSnapshotAlerts = isCurrentPeriod;

  // 1. Runway < 12 months — critical (global, current snapshot)
  if (showLiveSnapshotAlerts && m.runway > 0 && m.runway < 12) {
    alerts.push({
      severity: 'critical',
      title: `Runway crítico: ${m.runway} meses`,
      description: 'El runway está por debajo de 12 meses. Considerar reducir burn rate, acelerar revenue o iniciar ronda de financiación.',
      icon: Flame,
    });
  } else if (showLiveSnapshotAlerts && m.runway >= 12 && m.runway < 18) {
    alerts.push({
      severity: 'warning',
      title: `Runway bajo: ${m.runway} meses`,
      description: 'El runway está entre 12-18 meses. Monitorizar de cerca y planificar próxima ronda con 6 meses de antelación.',
      icon: AlertTriangle,
    });
  }

  // 2. CAC > LTV — unit economics globales (ARPU/churn son mensuales globales).
  //    Solo tiene sentido en el snapshot actual.
  if (showLiveSnapshotAlerts && m.cac > 0 && m.ltv > 0 && m.cac > m.ltv) {
    alerts.push({
      severity: 'critical',
      title: `CAC (€${m.cac}) supera LTV (€${m.ltv})`,
      description: 'Cada nuevo usuario cuesta más de lo que genera. Revisar canales de adquisición, mejorar retención o subir pricing.',
      icon: DollarSign,
    });
  } else if (showLiveSnapshotAlerts && m.ltvCacRatio > 0 && m.ltvCacRatio < 3) {
    alerts.push({
      severity: 'warning',
      title: `LTV:CAC ratio bajo (${m.ltvCacRatio}x)`,
      description: 'El ratio ideal es ≥3x. Optimizar CAC o incrementar LTV mediante upselling, retención o pricing.',
      icon: DollarSign,
    });
  }

  // 3. Churn rate alto (global current month)
  if (showLiveSnapshotAlerts && m.churnRate > 10) {
    alerts.push({
      severity: 'critical',
      title: `Churn rate elevado: ${m.churnRate}%`,
      description: 'Un churn >10% mensual es insostenible. Analizar cohortes, activar encuestas de salida y mejorar onboarding.',
      icon: TrendingDown,
    });
  } else if (showLiveSnapshotAlerts && m.churnRate > 5) {
    alerts.push({
      severity: 'warning',
      title: `Churn rate alto: ${m.churnRate}%`,
      description: 'El churn ideal para SaaS B2C es <5%. Investigar causas de cancelación y reforzar engagement.',
      icon: TrendingDown,
    });
  }

  // 4. NRR < 100% (derived from churn — global)
  if (showLiveSnapshotAlerts && m.nrr < 100 && m.nrr > 0) {
    alerts.push({
      severity: 'warning',
      title: `NRR por debajo del 100% (${m.nrr}%)`,
      description: 'El revenue de cohortes existentes se contrae. Implementar estrategias de expansion revenue (upsell, cross-sell).',
      icon: TrendingDown,
    });
  }

  // 5. Gross Margin bajo (period-aware) — SOLO si hay COGS manual real.
  //    Sin `hasManualMetrics`, el backend devuelve 85 por defecto y la
  //    comparación con umbrales no aporta información válida.
  if (m.hasManualMetrics && m.cogsManual > 0) {
    if (m.grossMargin < 60 && m.grossMargin > 0) {
      alerts.push({
        severity: 'critical',
        title: `Gross Margin bajo: ${m.grossMargin}%`,
        description: 'El margen bruto está muy por debajo del benchmark SaaS (>70%). Revisar COGS y costes de infraestructura.',
        icon: ShieldAlert,
      });
    } else if (m.grossMargin >= 60 && m.grossMargin < 70) {
      alerts.push({
        severity: 'warning',
        title: `Gross Margin mejorable: ${m.grossMargin}%`,
        description: 'El benchmark SaaS es >70-80%. Optimizar costes de APIs, hosting y servicios de terceros.',
        icon: ShieldAlert,
      });
    }
  }

  // 6. Payback period > 18 meses — es una métrica mensual (CAC/ARPU mensual).
  //    En vista semanal/anual `arpuPeriod` distorsiona el resultado, así que
  //    solo mostramos la alerta en el snapshot actual.
  if (showLiveSnapshotAlerts && m.paybackPeriod > 18) {
    alerts.push({
      severity: 'warning',
      title: `Payback period largo: ${m.paybackPeriod} meses`,
      description: 'El período de recuperación del CAC supera 18 meses. Ideal <12m. Reducir CAC o aumentar ARPU.',
      icon: AlertCircle,
    });
  }

  // 7. Quick Ratio bajo (global current month)
  if (showLiveSnapshotAlerts && m.quickRatio > 0 && m.quickRatio < 1) {
    alerts.push({
      severity: 'critical',
      title: `Quick Ratio < 1 (${m.quickRatio}x)`,
      description: 'Se pierde más MRR del que se gana. El negocio está en contracción neta. Acción inmediata en retención.',
      icon: Flame,
    });
  } else if (showLiveSnapshotAlerts && m.quickRatio >= 1 && m.quickRatio < 2) {
    alerts.push({
      severity: 'warning',
      title: `Quick Ratio bajo (${m.quickRatio}x)`,
      description: 'Un Quick Ratio <2 indica crecimiento ineficiente. El benchmark saludable es ≥4x.',
      icon: AlertTriangle,
    });
  }

  // 8. Conversión Free→Paid baja (global current month)
  if (showLiveSnapshotAlerts && m.conversionRate < 2 && m.totalUsers > 50) {
    alerts.push({
      severity: 'warning',
      title: `Conversión Free→Paid baja: ${m.conversionRate}%`,
      description: 'La tasa de conversión es inferior al 2%. Revisar pricing, trial experience y value proposition.',
      icon: AlertCircle,
    });
  }

  // 9. Ingresos del periodo en caída vs periodo anterior (period-aware)
  // `mrrChange` representa la variación del revenue NETO del periodo
  // seleccionado contra el equivalente PROPORCIONAL del periodo anterior
  // (p.ej. en 2026 hasta hoy se compara contra el mismo nº de días de 2025).
  const fmtRange = (fromIso?: string, toIso?: string) => {
    if (!fromIso || !toIso) return '';
    const f = new Date(fromIso);
    const t = new Date(toIso);
    // El backend devuelve `comparePrev*` como [from, to) → restamos 1 día para mostrar el rango inclusivo.
    const tInc = new Date(t.getTime() - 86400000);
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${f.toLocaleDateString('es-ES', opts)} – ${tInc.toLocaleDateString('es-ES', opts)}`;
  };
  const prevRangeLabel = fmtRange(m.comparePrevStart, m.comparePrevEnd);
  const thisRangeLabel = fmtRange(m.compareThisStart, m.compareThisEnd);
  const periodSuffix = prevRangeLabel
    ? ` (${thisRangeLabel} vs ${prevRangeLabel})`
    : periodLabel
      ? ` (${periodLabel} vs periodo anterior proporcional)`
      : ' vs periodo anterior proporcional';
  if (m.mrrChange < -10) {
    alerts.push({
      severity: 'critical',
      title: `Ingresos del periodo en caída: ${m.mrrChange}%${periodSuffix}`,
      description: 'Los ingresos netos del periodo seleccionado caen más de un 10% respecto al periodo anterior equivalente (misma longitud de días). Analizar cancelaciones y pipeline de nuevos clientes.',
      icon: TrendingDown,
    });
  } else if (m.mrrChange < 0) {
    alerts.push({
      severity: 'warning',
      title: `Ingresos del periodo descendentes: ${m.mrrChange}%${periodSuffix}`,
      description: 'Los ingresos netos del periodo seleccionado han bajado respecto al periodo anterior equivalente. Monitorizar tendencia y activar retención.',
      icon: TrendingDown,
    });
  }

  // 10. Concentración de revenue en el plan top del periodo
  if (m.top10RevenuePercentage > 80) {
    const topName = m.topPlanName && m.topPlanName !== 'N/A' ? m.topPlanName : 'el plan principal';
    alerts.push({
      severity: 'warning',
      title: `Alta concentración de revenue: ${topName} = ${m.top10RevenuePercentage}%`,
      description: 'Más del 80% del revenue del periodo proviene de un único plan. Diversificar la mezcla de planes/ingresos para reducir riesgo.',
      icon: ShieldAlert,
    });
  }

  if (alerts.length === 0) {
    return (
      <Alert className="border-green-500/30 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-600">
          Salud financiera OK{periodLabel ? ` — ${periodLabel}` : ''}
        </AlertTitle>
        <AlertDescription className="text-green-600/80">
          {isCurrentPeriod
            ? 'No se detectan alertas críticas. Todos los indicadores están en rango saludable.'
            : 'No se detectan alertas sobre los indicadores calculados para el periodo seleccionado (ingresos vs periodo anterior proporcional, concentración de plan top y margen bruto si hay COGS manual).'}
        </AlertDescription>
      </Alert>
    );
  }

  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <h3 className="text-base font-semibold">
          Alertas Financieras{periodLabel ? ` — ${periodLabel}` : ''}
        </h3>
        {criticals.length > 0 && (
          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium">
            {criticals.length} crítica{criticals.length > 1 ? 's' : ''}
          </span>
        )}
        {warnings.length > 0 && (
          <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full font-medium">
            {warnings.length} aviso{warnings.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!isCurrentPeriod && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-600/90 text-xs">
            Estás viendo un periodo pasado. Solo se evalúan las alertas
            calculables sobre el periodo seleccionado: ingresos netos vs periodo
            anterior proporcional, concentración del plan top, y margen bruto
            (solo si hay COGS manual del mes). Las alertas de snapshot global
            (MRR, churn, NRR, quick ratio, runway, conversión, LTV/CAC, payback)
            solo aplican al periodo actual porque se derivan de ARPU y churn
            mensuales globales.
          </AlertDescription>
        </Alert>
      )}

      {criticals.map((alert, i) => (
        <Alert key={`c-${i}`} className="border-destructive/50 bg-destructive/5">
          <alert.icon className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">{alert.title}</AlertTitle>
          <AlertDescription className="text-destructive/80">{alert.description}</AlertDescription>
        </Alert>
      ))}

      {warnings.map((alert, i) => (
        <Alert key={`w-${i}`} className="border-orange-500/50 bg-orange-500/5">
          <alert.icon className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-600">{alert.title}</AlertTitle>
          <AlertDescription className="text-orange-500/80">{alert.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
