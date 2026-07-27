import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Upload, Megaphone, User, CreditCard, Sparkles,
  Shield, Users, BarChart3, Briefcase, ClipboardList, FolderOpen,
  Rocket, LifeBuoy, Music, Bell, LineChart,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Command = {
  id: string;
  label: string;
  icon: LucideIcon;
  url: string;
  group: 'principal' | 'cuenta' | 'manager' | 'admin';
  visible?: boolean;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, isManager } = useAuth();
  const tr = (key: string, fallback: string) => String(t(key, { defaultValue: fallback }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const items: Command[] = [
      { id: 'launch', label: tr('dashboard.sidebar.launchHit', 'Mi primer lanzamiento musical'), icon: Rocket, url: '/dashboard/launch', group: 'principal' },
      { id: 'dashboard', label: tr('dashboard.sidebar.controlPanel', 'Panel de control'), icon: LayoutDashboard, url: '/dashboard', group: 'principal' },
      { id: 'ai-studio', label: tr('dashboard.sidebar.createMusic', 'AI Music Studio'), icon: Sparkles, url: '/ai-studio', group: 'principal' },
      { id: 'register', label: tr('dashboard.sidebar.registerWork', 'Registrar obra'), icon: Upload, url: '/dashboard/register', group: 'principal', visible: !isManager },
      { id: 'promotion', label: tr('dashboard.sidebar.promotion', 'Promoción RRSS'), icon: Megaphone, url: '/dashboard/promotion', group: 'principal', visible: !isManager },
      { id: 'media', label: tr('dashboard.sidebar.mediaLibrary', 'Biblioteca multimedia'), icon: FolderOpen, url: '/dashboard/media-library', group: 'principal' },
      { id: 'analytics', label: tr('dashboard.sidebar.analytics', 'Analytics del artista'), icon: LineChart, url: '/dashboard/analytics', group: 'principal', visible: !isManager },
      { id: 'profile', label: tr('dashboard.sidebar.profile', 'Perfil'), icon: User, url: '/dashboard/profile', group: 'cuenta' },
      { id: 'billing', label: tr('dashboard.sidebar.billing', 'Facturación'), icon: CreditCard, url: '/dashboard/billing', group: 'cuenta' },
      { id: 'credits', label: tr('dashboard.sidebar.credits', 'Créditos'), icon: Music, url: '/dashboard/credits', group: 'cuenta' },
      { id: 'notifications', label: tr('dashboard.sidebar.notifications', 'Notificaciones'), icon: Bell, url: '/dashboard/notifications', group: 'cuenta' },
      { id: 'support', label: tr('dashboard.sidebar.support', 'Soporte'), icon: LifeBuoy, url: '/dashboard/support', group: 'cuenta' },
      { id: 'mgr-panel', label: tr('dashboard.sidebar.managerPanel', 'Panel Manager'), icon: Briefcase, url: '/dashboard/manager', group: 'manager', visible: isManager },
      { id: 'mgr-artists', label: tr('dashboard.sidebar.myArtists', 'Mis Artistas'), icon: Users, url: '/dashboard/manager/artists', group: 'manager', visible: isManager },
      { id: 'mgr-works', label: tr('dashboard.sidebar.registeredWorks', 'Obras Registradas'), icon: ClipboardList, url: '/dashboard/manager/works', group: 'manager', visible: isManager },
      { id: 'admin-users', label: tr('dashboard.sidebar.adminUsers', 'Admin · Usuarios'), icon: Users, url: '/dashboard/admin/users', group: 'admin', visible: isAdmin },
      { id: 'admin-works', label: tr('dashboard.sidebar.adminWorks', 'Admin · Obras'), icon: Shield, url: '/dashboard/admin/works', group: 'admin', visible: isAdmin },
      { id: 'admin-metrics', label: tr('dashboard.sidebar.adminMetrics', 'Admin · Métricas'), icon: BarChart3, url: '/dashboard/admin/metrics', group: 'admin', visible: isAdmin },
    ];
    return items.filter((i) => i.visible !== false);
  }, [t, isAdmin, isManager]);

  const groups: Array<{ id: Command['group']; label: string }> = [
    { id: 'principal', label: tr('dashboard.sidebar.main', 'Principal') },
    { id: 'cuenta', label: tr('dashboard.sidebar.account', 'Cuenta') },
    { id: 'manager', label: tr('dashboard.sidebar.manager', 'Manager') },
    { id: 'admin', label: tr('dashboard.sidebar.admin', 'Admin') },
  ];

  const go = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={tr('dashboard.commandPalette.placeholder', 'Buscar acciones o páginas...')} />
      <CommandList>
        <CommandEmpty>{tr('dashboard.commandPalette.empty', 'Sin resultados.')}</CommandEmpty>
        {groups.map((g, idx) => {
          const items = commands.filter((c) => c.group === g.id);
          if (items.length === 0) return null;
          return (
            <div key={g.id}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={g.label}>
                {items.map((c) => (
                  <CommandItem key={c.id} value={`${c.label} ${c.url}`} onSelect={() => go(c.url)}>
                    <c.icon className="mr-2 h-4 w-4" />
                    <span>{c.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
