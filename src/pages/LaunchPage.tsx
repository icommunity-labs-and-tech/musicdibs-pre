import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FirstHitFlow } from '@/components/dashboard/FirstHitFlow';
import { useAuth } from '@/hooks/useAuth';

/** Clave localStorage para recordar que el usuario ya hizo o saltó el tutorial. */
const launchKey = (uid: string) => `md_launch_done_${uid}`;

export default function LaunchPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // Si ya lo vio o lo saltó, redirigir al dashboard sin mostrarlo
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(launchKey(user.id)) === '1') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  /** Se llama tanto al saltarlo como al completarlo. */
  const handleDismiss = () => {
    if (user) localStorage.setItem(launchKey(user.id), '1');
    navigate('/dashboard');
  };

  return <FirstHitFlow onSkip={handleDismiss} onComplete={handleDismiss} />;
}