import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserX, TrendingDown, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const REASON_LABELS: Record<string, string> = {
  no_need: 'Ya no necesita el servicio',
  too_expensive: 'Demasiado caro',
  alternative: 'Alternativa mejor',
  technical: 'Problemas técnicos',
  privacy: 'Privacidad / datos',
  other: 'Otro',
  // Legacy cancellation reasons
  probando: 'Solo probando',
  terminado: 'Ya terminó',
  no_uso: 'No usa suficiente',
  pocos_creditos: 'Pocos créditos',
  caro: 'Demasiado caro',
  mal_resultado: 'Mal resultado',
  otra_herramienta: 'Otra herramienta',
  otro: 'Otro',
};

export default function AdminChurnPage() {
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-churn'],
    queryFn: () => adminApi.callAction('get_churn_data'),
  });

  const forceDelete = useMutation({
    mutationFn: (userId: string) => adminApi.callAction('force_delete_user', { user_id: userId }),
    onSuccess: () => {
      toast.success('Cuenta eliminada correctamente');
      qc.invalidateQueries({ queryKey: ['admin-churn'] });
      setDeletingId(null);
    },
    onError: (e: any) => toast.error(e.message || 'Error al eliminar'),
  });

  const surveys = data?.surveys || [];
  const metrics = data?.metrics || { this_month: 0, top_reason: '-', top_plan: '-' };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Bajas de usuarios</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Bajas este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.this_month}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Motivo más frecuente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{REASON_LABELS[metrics.top_reason] || metrics.top_reason || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              Plan más afectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{metrics.top_plan || '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas solicitudes de baja</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : surveys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay solicitudes de baja registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-mono">{s.email || 'N/A'}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(s.created_at).toLocaleDateString('es')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {REASON_LABELS[s.reason] || s.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{s.plan_type || 'Free'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.credits_remaining ?? 0}</TableCell>
                    <TableCell>
                      {s.account_deleted_at ? (
                        <Badge variant="destructive" className="text-xs">Eliminada</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!s.account_deleted_at && s.user_id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs"
                              disabled={forceDelete.isPending}
                            >
                              Eliminar manualmente
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar cuenta de {s.email}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción es irreversible. Se ejecutará el mismo proceso de eliminación GDPR.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => forceDelete.mutate(s.user_id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                {forceDelete.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                Confirmar eliminación
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
