import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { YoutubeServiceWizard } from '@/components/youtube/YoutubeServiceWizard';
import type { ServiceType, YoutubeServiceRequest } from '@/types/youtube-services';
import { SERVICE_CONFIG } from '@/types/youtube-services';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:           { label: 'Borrador',       color: 'text-muted-foreground bg-muted' },
  pending_payment: { label: 'Pago pendiente', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-400/10' },
  submitted:       { label: 'Enviada',        color: 'text-blue-600 dark:text-blue-400 bg-blue-400/10' },
  in_review:       { label: 'En revision',    color: 'text-purple-600 dark:text-purple-400 bg-purple-400/10' },
  approved:        { label: 'Aprobada',       color: 'text-green-600 dark:text-green-400 bg-green-400/10' },
  rejected:        { label: 'Rechazada',      color: 'text-red-600 dark:text-red-400 bg-red-400/10' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.draft;
  return <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + s.color}>{s.label}</span>;
}

function ServiceCard({ serviceType, onRequest, requests }: { serviceType: ServiceType; onRequest: (t: ServiceType) => void; requests: YoutubeServiceRequest[]; }) {
  const config = SERVICE_CONFIG[serviceType];
  const active = requests.find(r => r.service_type === serviceType && ['submitted','in_review','pending_payment'].includes(r.status));
  const approved = requests.find(r => r.service_type === serviceType && r.status === 'approved');
  return (
    <div className="relative bg-card text-card-foreground border border-border rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/40 transition-colors">
      {(approved || active) && <div className="absolute top-4 right-4"><StatusBadge status={approved ? 'approved' : active!.status} /></div>}
      <div className="flex items-start gap-3">
        <span className="text-2xl font-bold text-primary">{config.icon === 'YT' ? 'YT' : 'CID'}</span>
        <div>
          <h3 className="text-base font-bold text-foreground">{config.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Plazo estimado: {config.timeline}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
      <ul className="space-y-1.5">
        {config.benefits.map((b, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
            <span className="text-primary text-xs">→</span>{b}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
        <div><span className="text-2xl font-bold text-foreground">50 €</span><span className="text-xs text-muted-foreground ml-1">/ solicitud</span></div>
        {approved ? <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Activo</span> :
         active ? <span className="text-sm text-primary font-medium">Solicitud en proceso</span> :
         <button onClick={() => onRequest(serviceType)} className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors">Solicitar →</button>}
      </div>
    </div>
  );
}

export default function YoutubeServicesPage() {
  const [requests, setRequests] = useState<YoutubeServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWizard, setActiveWizard] = useState<ServiceType | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, string>>({});
  const [searchParams] = useSearchParams();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: reqs } = await supabase.from('youtube_service_requests').select('*').order('created_at', { ascending: false });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
        setUserProfile({ email: user.email || '', display_name: profile?.display_name || '' });
      }
      setRequests((reqs || []) as unknown as YoutubeServiceRequest[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta solicitud pendiente de pago? Podrás crear una nueva después.')) return;
    const { error } = await supabase.from('youtube_service_requests').delete().eq('id', id).eq('status', 'pending_payment');
    if (error) { alert('No se pudo cancelar: ' + error.message); return; }
    loadData();
  };

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setTimeout(() => loadData(), 2000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  return (
    <div className="min-h-full text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📺 Servicios adicionales de YouTube</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona la presencia oficial de tus artistas en YouTube con servicios gestionados por nuestro equipo.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ServiceCard serviceType="oac" onRequest={setActiveWizard} requests={requests} />
          <ServiceCard serviceType="content_id" onRequest={setActiveWizard} requests={requests} />
        </div>
        {(loading || requests.length > 0) && (
          <div>
            <h2 className="text-base font-semibold text-foreground/80 mb-4">Mis solicitudes</h2>
            {loading ? <div className="py-10 text-center text-muted-foreground text-sm">Cargando...</div> : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Servicio</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Solicitado</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Notas</th>
                  </tr></thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id} className="border-b border-border last:border-b-0">
                        <td className="py-3 px-4 text-sm text-foreground font-medium">{SERVICE_CONFIG[r.service_type].shortName}</td>
                        <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-ES')}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground italic">{r.admin_notes || r.rejection_reason || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      {activeWizard && <YoutubeServiceWizard serviceType={activeWizard} userProfile={userProfile} onClose={() => setActiveWizard(null)} />}
    </div>
  );
}
