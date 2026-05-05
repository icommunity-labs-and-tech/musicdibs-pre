import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Check, X } from 'lucide-react';

const pwRules = [
  { key: 'min', test: (p: string) => p.length >= 8, label: '8 caracteres mínimo' },
  { key: 'upper', test: (p: string) => /[A-Z]/.test(p), label: 'Una mayúscula' },
  { key: 'number', test: (p: string) => /[0-9]/.test(p), label: 'Un número' },
  { key: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'Un carácter especial' },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const allPwValid = password.length > 0 && pwRules.every(r => r.test(password));

  useEffect(() => {
    // Detectar recovery por URL (hash o query) por si el evento PASSWORD_RECOVERY
    // se dispara antes de que el listener se suscriba.
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Fallback: si tras 1.5s no se ha detectado recovery pero hay sesión activa,
    // asumimos que el usuario llegó aquí desde el enlace de recuperación.
    const fallback = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setIsRecovery(true);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); setLoading(true);

    if (!allPwValid) {
      setError('La contraseña no cumple los requisitos de seguridad.');
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Contraseña actualizada correctamente. Redirigiendo...');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082a 50%, #0d0618 100%)' }}>
        <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center space-y-3">
            <img src="/lovable-uploads/81d79e1f-fd6f-4e2c-a573-89261bcf3879.png" alt="Musicdibs" className="mx-auto h-14 w-auto invert" />
            <CardDescription>Verificando enlace de recuperación...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082a 50%, #0d0618 100%)' }}>
      <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <img src="/lovable-uploads/81d79e1f-fd6f-4e2c-a573-89261bcf3879.png" alt="Musicdibs" className="mx-auto h-14 w-auto invert" />
          <CardTitle className="text-2xl font-bold">Nueva contraseña</CardTitle>
          <CardDescription>Introduce tu nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPw ? 'text' : 'password'} required minLength={8} placeholder="Mínimo 8 caracteres" className="pr-10" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (() => {
                const passed = pwRules.filter(r => r.test(password)).length;
                const pct = (passed / pwRules.length) * 100;
                const strengthColor = pct <= 25 ? 'bg-destructive' : pct <= 50 ? 'bg-orange-500' : pct <= 75 ? 'bg-yellow-500' : 'bg-green-500';
                return (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strengthColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <ul className="space-y-1">
                      {pwRules.map(r => {
                        const pass = r.test(password);
                        return (
                          <li key={r.key} className={`flex items-center gap-1.5 text-xs ${pass ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {r.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={8} placeholder="Repite la contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> {success}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || !allPwValid}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
