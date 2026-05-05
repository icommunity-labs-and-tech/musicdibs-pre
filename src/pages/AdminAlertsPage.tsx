import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, RefreshCw, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Severity = "info" | "warn" | "error" | "critical";

interface AdminAlert {
  id: string;
  source: string;
  severity: Severity;
  message: string;
  context: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

const severityVariant: Record<Severity, string> = {
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  error: "bg-red-500/15 text-red-700 dark:text-red-300",
  critical: "bg-red-700 text-white",
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [showResolved, setShowResolved] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunData, setDryRunData] = useState<any | null>(null);

  const runDryRun = async () => {
    setDryRunLoading(true);
    setDryRunData(null);
    setDryRunOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "process-subscription-renewals",
        { body: { dry_run: true } },
      );
      if (error) throw error;
      setDryRunData(data);
      toast.success("Dry-run completado");
    } catch (err: any) {
      toast.error("Error en dry-run: " + (err?.message ?? String(err)));
      setDryRunData({ error: err?.message ?? String(err) });
    } finally {
      setDryRunLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("admin_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!showResolved) q = q.eq("resolved", false);
    if (severity !== "all") q = q.eq("severity", severity);
    if (from) q = q.gte("created_at", new Date(from).toISOString());
    if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());

    const { data, error } = await q;
    if (error) {
      toast.error("Error cargando alertas: " + error.message);
    } else {
      setAlerts((data ?? []) as AdminAlert[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, from, to, showResolved]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_alerts" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_alerts")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userData?.user?.id ?? null,
      })
      .eq("id", id);
    if (error) toast.error("No se pudo resolver: " + error.message);
    else {
      toast.success("Alerta resuelta");
      load();
    }
  };

  const counts = useMemo(() => {
    const c = { critical: 0, error: 0, warn: 0, info: 0 };
    for (const a of alerts) if (!a.resolved) c[a.severity]++;
    return c;
  }, [alerts]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6" /> Alertas del sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            Avisos automáticos del backend (renovaciones, Stripe, crons…)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={runDryRun} disabled={dryRunLoading}>
            <PlayCircle className={`h-4 w-4 mr-2 ${dryRunLoading ? "animate-pulse" : ""}`} />
            Simular renovaciones (dry-run)
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refrescar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["critical", "error", "warn", "info"] as Severity[]).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">{s}</div>
              <div className="text-2xl font-bold">{counts[s]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <Label className="text-xs">Severidad</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="resolved" checked={showResolved} onCheckedChange={setShowResolved} />
            <Label htmlFor="resolved" className="text-sm">Mostrar resueltas</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Cargando…</div>}
          {!loading && alerts.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No hay alertas que coincidan con los filtros.
            </div>
          )}
          {alerts.map((a) => (
            <div key={a.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={severityVariant[a.severity]}>{a.severity}</Badge>
                  <Badge variant="outline">{a.source}</Badge>
                  {a.resolved && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Resuelta
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("es-ES")}
                  </span>
                </div>
                {!a.resolved && (
                  <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>
                    Marcar resuelta
                  </Button>
                )}
              </div>
              <div className="text-sm font-medium">{a.message}</div>
              {a.context && Object.keys(a.context).length > 0 && (
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{JSON.stringify(a.context, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
