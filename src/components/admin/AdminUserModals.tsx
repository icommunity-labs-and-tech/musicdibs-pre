import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';

interface CreditModalState {
  open: boolean;
  userId: string;
  email: string;
  currentCredits: number;
}

interface DeleteModalState {
  open: boolean;
  userId: string;
  email: string;
}

interface Props {
  creditModal: CreditModalState;
  setCreditModal: (v: CreditModalState) => void;
  deleteModal: DeleteModalState;
  setDeleteModal: (v: DeleteModalState) => void;
  onRefresh: () => void;
}

export default function AdminUserModals({ creditModal, setCreditModal, deleteModal, setDeleteModal, onRefresh }: Props) {
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleAdjustCredits = async () => {
    const amt = parseInt(creditAmount);
    if (isNaN(amt) || !creditReason.trim()) { toast.error('Cantidad y motivo obligatorios'); return; }
    try {
      await adminApi.adjustCredits(creditModal.userId, amt, creditReason);
      toast.success('Créditos ajustados');
      setCreditModal({ open: false, userId: '', email: '', currentCredits: 0 });
      setCreditAmount('');
      setCreditReason('');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleForceDelete = async () => {
    if (deleteConfirmText !== 'ELIMINAR') return;
    setDeleting(true);
    try {
      await adminApi.callAction('force_delete_user', { user_id: deleteModal.userId });
      toast.success('Usuario eliminado correctamente');
      setDeleteModal({ open: false, userId: '', email: '' });
      setDeleteConfirmText('');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
    setDeleting(false);
  };

  return (
    <>
      {/* Credit adjustment modal */}
      <Dialog open={creditModal.open} onOpenChange={open => !open && setCreditModal({ open: false, userId: '', email: '', currentCredits: 0 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar créditos — {creditModal.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Saldo actual: <span className="font-mono font-medium text-primary">{creditModal.currentCredits}</span> créditos</p>
            {creditAmount && !isNaN(parseInt(creditAmount)) && (creditModal.currentCredits + parseInt(creditAmount)) < 0 && (
              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                ⚠️ El resultado sería negativo. El saldo se ajustará a 0.
              </div>
            )}
            <div>
              <Label>Cantidad (+/-)</Label>
              <Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="Ej: 10 o -5" />
            </div>
            <div>
              <Label>Motivo (obligatorio)</Label>
              <Textarea value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Motivo del ajuste..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditModal({ open: false, userId: '', email: '', currentCredits: 0 })}>Cancelar</Button>
            <Button onClick={handleAdjustCredits} disabled={!creditReason.trim() || !creditAmount || isNaN(parseInt(creditAmount))}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force delete confirmation modal */}
      <Dialog open={deleteModal.open} onOpenChange={open => { if (!open) { setDeleteModal({ open: false, userId: '', email: '' }); setDeleteConfirmText(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar cuenta de usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Estás a punto de eliminar permanentemente la cuenta de <span className="font-medium text-foreground">{deleteModal.email}</span>.
            </p>
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm space-y-1">
              <p className="font-medium text-destructive">Esta acción es irreversible:</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
                <li>Se eliminará el perfil, créditos y datos personales</li>
                <li>Las obras con blockchain se anonimizarán (user_id → NULL)</li>
                <li>Los registros de compra se anonimizarán por obligación fiscal</li>
                <li>Se eliminará el usuario de auth.users</li>
              </ul>
            </div>
            <div>
              <Label>Escribe <span className="font-mono font-bold">ELIMINAR</span> para confirmar</Label>
              <Input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteModal({ open: false, userId: '', email: '' }); setDeleteConfirmText(''); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleForceDelete} disabled={deleteConfirmText !== 'ELIMINAR' || deleting}>
              {deleting ? 'Eliminando…' : 'Eliminar cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
