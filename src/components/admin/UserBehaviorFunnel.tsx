import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CreditCard, ShieldCheck, Sparkles, Music, ArrowDown, GitBranch } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d";

interface BehaviorFunnelData {
  newUsers: number;
  newSubs: number;
  newKyc: number;
  aiStudioEntries: number;
  aiFeatureUses: number;
  worksAfterAi: number;
  pureRegistrations: number;
}

interface UserBehaviorFunnelProps {
  range: Range;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("es-ES");

function pct(value: number, base: number) {
  if (!base) return null;
  return ((value / base) * 100).toFixed(1) + "%";
}

function rangeDays(range: Range) {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

function fromIso(range: Range) {
  const d = new Date();
  d.setDate(d.getDate() - rangeDays(range));
  return d.toISOString(); // full ISO — compatible con timestamptz
}

function fromDate(range: Range) {
  const d = new Date();
  d.setDate(d.getDate() - rangeDays(range));
  return d.toISOString().split("T")[0]; // YYYY-MM-DD — para columna date
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TopStep({
  icon, label, value, base, color, widthPct, isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  base?: number;
  color: string;
  widthPct: number;
  isLast?: boolean;
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`flex items-center justify-between px-5 py-3 rounded-xl text-white ${color} transition-all duration-500`}
        style={{ width: `${Math.max(35, widthPct)}%`, minWidth: 240 }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold">{fmt(value)}</span>
          {base != null && base > 0 && (
            <span className="text-xs opacity-70 ml-2">({pct(value, base)})</span>
          )}
        </div>
      </div>
      {!isLast && (
        <div className="my-1 opacity-40">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function BranchStep({
  icon, label, value, base, color, isLast,
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
        <div className="my-1 opacity-40">
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
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      const iso  = fromIso(range);   // para columnas timestamptz
      const date = fromDate(range);  // para columna date en product_metrics_daily

      try {
        const [
          newUsersRes,
          newSubsRes,
          newKycRes,
          metricsRes,
          worksAiRes,
          worksPureRes,
        ] = await Promise.all([

          // 1. Nuevos registros en el período
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", iso),

          // 2. Nuevas compras (suscripciones creadas) en el período
          supabase
            .from("subscriptions")
            .select("*", { count: "exact", head: true })
            .gte("created_at", iso),

          // 3. Verificaciones KYC del cohort del período
          //    Cuenta usuarios creados en el período que ya están verificados.
          //    Así el valor es siempre ≤ newUsers y refleja la conversión real
          //    del cohort (evita que la barra se salga de la pantalla).
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("kyc_status", "verified")
            .gte("created_at", iso),

          // 4. Métricas AI Studio del período (desde product_metrics_daily)
          supabase
            .from("product_metrics_daily")
            .select(
              "ai_studio_entries, works_after_generation, uses_create_music, uses_lyrics, uses_vocal, uses_cover, uses_video, uses_enhance_audio, uses_voice_cloning, uses_register, uses_promotion, uses_press"
            )
            .gte("date", date),

          // 5. Obras registradas tras IA en el período
          supabase
            .from("works")
            .select("*", { count: "exact", head: true })
            .not("ai_generation_id", "is", null)
            .gte("created_at", iso),

          // 6. Obras registradas sin IA en el período
          supabase
            .from("works")
            .select("*", { count: "exact", head: true })
            .is("ai_generation_id", null)
            .eq("type", "audio")
            .gte("created_at", iso),
        ]);

        if (cancelled) return;

        // Agregar métricas diarias
        let aiStudioEntries = 0, worksAfterAi = 0, aiFeatureUses = 0;
        for (const row of metricsRes.data ?? []) {
          aiStudioEntries += row.ai_studio_entries ?? 0;
          worksAfterAi    += row.works_after_generation ?? 0;
          aiFeatureUses   +=
            (row.uses_create_music  ?? 0) + (row.uses_lyrics   ?? 0) +
            (row.uses_vocal         ?? 0) + (row.uses_cover    ?? 0) +
            (row.uses_video         ?? 0) + (row.uses_enhance_audio ?? 0) +
            (row.uses_voice_cloning ?? 0) + (row.uses_register ?? 0) +
            (row.uses_promotion     ?? 0) + (row.uses_press    ?? 0);
        }

        setData({
          newUsers:         newUsersRes.count  ?? 0,
          newSubs:          newSubsRes.count   ?? 0,
          newKyc:           newKycRes.count    ?? 0,
          aiStudioEntries,
          aiFeatureUses,
          worksAfterAi,
          pureRegistrations: worksPureRes.count ?? 0,
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [range]); // ← re-ejecuta cuando cambia el rango

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

  // Anchura visual proporcional a nuevos registros del período (cap 100%)
  const w = (n: number) => data.newUsers > 0
    ? Math.min(100, Math.max(35, Math.round((n / data.newUsers) * 100)))
    : 50;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="w-5 h-5" />
            Funnel de Comportamiento de Usuarios
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Período seleccionado: últimos {rangeDays(range)} días
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-0 pb-6">

        {/* ── TOP FUNNEL ──────────────────────────────────────────── */}
        <TopStep
          icon={<Users className="w-4 h-4 shrink-0" />}
          label="Nuevos registros"
          value={data.newUsers}
          widthPct={100}
          color="bg-slate-600"
        />
        <TopStep
          icon={<CreditCard className="w-4 h-4 shrink-0" />}
          label="Compras (nuevas suscripciones)"
          value={data.newSubs}
          base={data.newUsers}
          widthPct={w(data.newSubs)}
          color="bg-violet-600"
        />
        <TopStep
          icon={<ShieldCheck className="w-4 h-4 shrink-0" />}
          label="Identidad verificada (KYC)"
          value={data.newKyc}
          base={data.newUsers}
          widthPct={w(data.newKyc)}
          color="bg-blue-600"
          isLast
        />

        {/* ── SEPARADOR ───────────────────────────────────────────── */}
        <div className="w-full flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase px-2">
            bifurcación
          </span>
          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
        </div>

        {/* ── RAMAS ───────────────────────────────────────────────── */}
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
              base={data.newUsers}
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
              Registro directo
            </p>
            <BranchStep
              icon={<Music className="w-4 h-4 shrink-0" />}
              label="Registro de obras (sin IA)"
              value={data.worksAfterAi}
              base={data.newUsers}
              color="bg-emerald-600"
              isLast
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
