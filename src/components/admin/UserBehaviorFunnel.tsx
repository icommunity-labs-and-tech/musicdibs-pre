import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CreditCard, ShieldCheck, Sparkles, Music, ArrowDown, GitBranch } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d";

interface BehaviorFunnelData {
  // Top funnel — totales acumulados (all-time)
  totalUsers: number;
  usersWithSub: number;
  kycVerified: number;
  // Rama A — AI Studio (period-scoped, desde product_metrics_daily)
  aiStudioEntries: number;
  aiFeatureUses: number;
  worksAfterAi: number;
  // Rama B — Registro puro (all-time, works sin ai_generation_id)
  pureRegistrations: number;
}

interface UserBehaviorFunnelProps {
  range: Range;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-ES");
}

function pct(value: number, base: number) {
  if (!base) return null;
  return ((value / base) * 100).toFixed(1) + "%";
}

function rangeDays(range: Range) {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TopStep({
  icon,
  label,
  value,
  base,
  color,
  widthPct,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  base?: number;
  color: string;
  widthPct: number;
  isLast?: boolean;
}) {
  const conversion = base != null ? pct(value, base) : null;
  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`flex items-center justify-between px-5 py-3 rounded-xl text-white ${color} transition-all duration-500`}
        style={{ width: `${Math.max(40, widthPct)}%`, minWidth: 240 }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold">{fmt(value)}</span>
          {conversion && (
            <span className="text-xs opacity-70 ml-2">({conversion})</span>
          )}
        </div>
      </div>
      {!isLast && (
        <div className="my-1 opacity-50">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function BranchStep({
  icon,
  label,
  value,
  base,
  color,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  base: number;
  color: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-white w-full ${color}`}>
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        <div className="text-right ml-2 shrink-0">
          <span className="font-bold">{fmt(value)}</span>
          {base > 0 && (
            <span className="text-xs opacity-70 ml-1.5">({pct(value, base)})</span>
          )}
        </div>
      </div>
      {!isLast && (
        <div className="my-1 opacity-50">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export function UserBehaviorFunnel({ range }: UserBehaviorFunnelProps) {
  const [data, setData] = useState<BehaviorFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const from = new Date();
        from.setDate(from.getDate() - rangeDays(range));
        const fromStr = from.toISOString().split("T")[0];

        const [
          profilesRes,
          subsRes,
          kycRes,
          metricsRes,
          pureWorksRes,
        ] = await Promise.all([
          // 1. Total usuarios (profiles 1:1 con auth.users)
          supabase.from("profiles").select("*", { count: "exact", head: true }),

          // 2. Suscriptores activos o past_due
          supabase
            .from("subscriptions")
            .select("user_id", { count: "exact", head: true })
            .in("status", ["active", "past_due"]),

          // 3. KYC verificado
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("kyc_status", "verified"),

          // 4. Métricas diarias del período (AI Studio)
          supabase
            .from("product_metrics_daily")
            .select(
              "ai_studio_entries, works_after_generation, uses_create_music, uses_lyrics, uses_vocal, uses_cover, uses_video, uses_enhance_audio, uses_voice_cloning, uses_register, uses_promotion, uses_press"
            )
            .gte("date", fromStr),

          // 5. Works registradas sin IA (all-time, tipo audio)
          supabase
            .from("works")
            .select("id", { count: "exact", head: true })
            .is("ai_generation_id", null)
            .eq("type", "audio"),
        ]);

        // Sumar columnas de métricas diarias
        let aiStudioEntries = 0;
        let worksAfterAi = 0;
        let aiFeatureUses = 0;

        for (const row of metricsRes.data ?? []) {
          aiStudioEntries += row.ai_studio_entries ?? 0;
          worksAfterAi    += row.works_after_generation ?? 0;
          aiFeatureUses   +=
            (row.uses_create_music ?? 0) +
            (row.uses_lyrics ?? 0) +
            (row.uses_vocal ?? 0) +
            (row.uses_cover ?? 0) +
            (row.uses_video ?? 0) +
            (row.uses_enhance_audio ?? 0) +
            (row.uses_voice_cloning ?? 0) +
            (row.uses_register ?? 0) +
            (row.uses_promotion ?? 0) +
            (row.uses_press ?? 0);
        }

        setData({
          totalUsers:       profilesRes.count ?? 0,
          usersWithSub:     subsRes.count ?? 0,
          kycVerified:      kycRes.count ?? 0,
          aiStudioEntries,
          aiFeatureUses,
          worksAfterAi,
          pureRegistrations: pureWorksRes.count ?? 0,
        });
      } catch (e: any) {
        setError(e?.message ?? "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [range]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-56">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground text-sm">Cargando funnel...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-24 text-destructive text-sm">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  // Proporciones visuales (top funnel sobre totalUsers)
  const w = (n: number) => Math.max(35, Math.round((n / data.totalUsers) * 100));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="w-5 h-5" />
            Funnel de Comportamiento de Usuarios
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Top funnel: totales acumulados · Ramas: últimos {rangeDays(range)} días
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-0 pb-6">

        {/* ── TOP FUNNEL ──────────────────────────────────────────── */}
        <TopStep
          icon={<Users className="w-4 h-4 shrink-0" />}
          label="Registros de nuevos usuarios"
          value={data.totalUsers}
          widthPct={100}
          color="bg-slate-600"
        />
        <TopStep
          icon={<CreditCard className="w-4 h-4 shrink-0" />}
          label="Compras (suscripciones activas)"
          value={data.usersWithSub}
          base={data.totalUsers}
          widthPct={w(data.usersWithSub)}
          color="bg-violet-600"
        />
        <TopStep
          icon={<ShieldCheck className="w-4 h-4 shrink-0" />}
          label="Identidad verificada (KYC)"
          value={data.kycVerified}
          base={data.totalUsers}
          widthPct={w(data.kycVerified)}
          color="bg-blue-600"
          isLast
        />

        {/* ── SEPARADOR BIFURCACIÓN ───────────────────────────────── */}
        <div className="w-full flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase px-2">
            bifurcación
          </span>
          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
        </div>

        {/* ── DOS RAMAS ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-5 w-full">

          {/* RAMA A — Vía AI Studio */}
          <div className="flex flex-col gap-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-center mb-3">
              Vía AI Studio
            </p>
            <BranchStep
              icon={<Sparkles className="w-4 h-4 shrink-0" />}
              label="Entradas al AI Studio"
              value={data.aiStudioEntries}
              base={data.kycVerified}
              color="bg-amber-500"
            />
            <BranchStep
              icon={<Sparkles className="w-3.5 h-3.5 shrink-0 opacity-75" />}
              label="Uso de features de IA"
              value={data.aiFeatureUses}
              base={data.aiStudioEntries}
              color="bg-orange-500"
            />
            <BranchStep
              icon={<Music className="w-4 h-4 shrink-0" />}
              label="Registro de obras"
              value={data.worksAfterAi}
              base={data.aiStudioEntries}
              color="bg-green-600"
              isLast
            />
          </div>

          {/* RAMA B — Registro directo */}
          <div className="flex flex-col gap-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-center mb-3">
              Registro directo (sin IA)
            </p>
            {/* Spacer para alinear visualmente con los 2 pasos de encima de Rama A */}
            <div className="flex-1" />
            <BranchStep
              icon={<Music className="w-4 h-4 shrink-0" />}
              label="Registro de obras"
              value={data.pureRegistrations}
              base={data.kycVerified}
              color="bg-teal-600"
              isLast
            />
          </div>

        </div>

        {/* ── NOTA PIE ────────────────────────────────────────────── */}
        <p className="text-[11px] text-muted-foreground/60 mt-5 text-center max-w-lg">
          Los % del top funnel son sobre el total de registros. Los % de las ramas son sobre el paso anterior de cada rama.
        </p>

      </CardContent>
    </Card>
  );
}
