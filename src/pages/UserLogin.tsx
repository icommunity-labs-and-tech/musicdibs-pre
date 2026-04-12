import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Check, X, Wand2 } from 'lucide-react';

export default function UserLogin() {
  const { t, i18n } = useTranslation();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [magicMode, setMagicMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const pwRules = useMemo(() => [
    { key: 'min', test: (p: string) => p.length >= 8, label: { es: '8 caracteres mínimo', en: 'At least 8 characters', 'pt-BR': 'Mínimo 8 caracteres' } },
    { key: 'upper', test: (p: string) => /[A-Z]/.test(p), label: { es: 'Una mayúscula', en: 'One uppercase letter', 'pt-BR': 'Uma maiúscula' } },
    { key: 'number', test: (p: string) => /[0-9]/.test(p), label: { es: 'Un número', en: 'One number', 'pt-BR': 'Um número' } },
    { key: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p), label: { es: 'Un carácter especial', en: 'One special character', 'pt-BR': 'Um caractere especial' } },
  ] as const, []);

  const allPwValid = regPassword.length > 0 && pwRules.every(r => r.test(regPassword));
  const lang = (i18n.resolvedLanguage || 'es') as 'es' | 'en' | 'pt-BR';

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message || t('userLogin.errorGoogle'));
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!magicEmail) return;
    setError(''); setSuccess(''); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess(t('userLogin.checkEmailMagic'));
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await signIn(form.get('email') as string, form.get('password') as string);
    setLoading(false);
    if (error) setError(error.message); else navigate('/dashboard');
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!allPwValid) return;
    setError(''); setSuccess(''); setLoading(true);
    const form = new FormData(e.currentTarget);
    const signUpLang = i18n.resolvedLanguage || 'es';
    const { error } = await signUp(form.get('email') as string, form.get('password') as string, { language: signUpLang });
    setLoading(false);
    if (error) setError(error.message); else setSuccess(t('userLogin.checkEmailConfirm'));
  };

  const GoogleIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
  );

  const OAuthButtons = () => (
    <>
      <div className="relative my-2">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">{t('userLogin.or')}</span>
      </div>
      <Button type="button" variant="outline" className="w-full gap-2" disabled={googleLoading} onClick={handleGoogleSignIn}>
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        {t('userLogin.continueGoogle')}
      </Button>
    </>
  );

  const resetStates = () => { setError(''); setSuccess(''); };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082a 50%, #0d0618 100%)' }}>
      <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <img src="/lovable-uploads/81d79e1f-fd6f-4e2c-a573-89261bcf3879.png" alt="MusicDibs" className="mx-auto h-14 w-auto invert" />
          <CardDescription>{t('userLogin.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('userLogin.tabLogin')}</TabsTrigger>
              <TabsTrigger value="register">{t('userLogin.tabRegister')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {magicMode ? (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wand2 className="h-4 w-4 text-primary shrink-0" />
                    <p>{t('userLogin.magicLinkDesc')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">{t('userLogin.email')}</Label>
                    <Input id="magic-email" type="email" required placeholder="tu@email.com" value={magicEmail} onChange={(e) => setMagicEmail(e.target.value)} />
                  </div>
                  {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</div>}
                  {success && <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" /> {success}</div>}
                  <Button className="w-full gap-2" disabled={loading || !magicEmail} onClick={handleMagicLink}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4" /> {t('userLogin.sendMagicLink')}</>}
                  </Button>
                  <button type="button" onClick={() => { setMagicMode(false); resetStates(); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('userLogin.orUsePassword')}
                  </button>
                  <OAuthButtons />
                </div>
              ) : forgotMode ? (
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">{t('userLogin.forgotTitle')}</p>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">{t('userLogin.email')}</Label>
                    <Input id="forgot-email" type="email" required placeholder="tu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                  </div>
                  {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</div>}
                  {success && <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" /> {success}</div>}
                  <Button className="w-full" disabled={loading} onClick={async () => {
                    if (!forgotEmail) return;
                    setError(''); setSuccess(''); setLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/reset-password` });
                    setLoading(false);
                    if (error) setError(error.message); else setSuccess(t('userLogin.checkEmailReset'));
                  }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('userLogin.sendLink')}
                  </Button>
                  <button type="button" onClick={() => { setForgotMode(false); resetStates(); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('userLogin.backToLogin')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('userLogin.email')}</Label>
                    <Input id="login-email" name="email" type="email" required placeholder="tu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('userLogin.password')}</Label>
                    <div className="relative">
                      <Input id="login-password" name="password" type={showLoginPw ? 'text' : 'password'} required placeholder={t('userLogin.passwordPlaceholder')} className="pr-10" />
                      <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showLoginPw ? t('userLogin.hidePassword') : t('userLogin.showPassword')}>
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</div>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('userLogin.enter')}
                  </Button>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => { setForgotMode(true); resetStates(); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {t('userLogin.forgotPassword')}
                    </button>
                    <button type="button" onClick={() => { setMagicMode(true); resetStates(); }} className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                      <Wand2 className="h-3 w-3" />
                      {t('userLogin.magicLink')}
                    </button>
                  </div>
                  <OAuthButtons />
                </form>
              )}
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-email">{t('userLogin.email')}</Label>
                  <Input id="reg-email" name="email" type="email" required placeholder="tu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">{t('userLogin.password')}</Label>
                  <div className="relative">
                    <Input id="reg-password" name="password" type={showRegPw ? 'text' : 'password'} required minLength={8} placeholder={t('userLogin.minChars')} className="pr-10" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showRegPw ? t('userLogin.hidePassword') : t('userLogin.showPassword')}>
                      {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regPassword.length > 0 && (() => {
                    const passed = pwRules.filter(r => r.test(regPassword)).length;
                    const pct = (passed / pwRules.length) * 100;
                    const strengthColor = pct <= 25 ? 'bg-destructive' : pct <= 50 ? 'bg-orange-500' : pct <= 75 ? 'bg-yellow-500' : 'bg-green-500';
                    const strengthLabel = { es: ['Muy débil', 'Débil', 'Aceptable', 'Fuerte'], en: ['Very weak', 'Weak', 'Fair', 'Strong'], 'pt-BR': ['Muito fraca', 'Fraca', 'Razoável', 'Forte'] };
                    const idx = Math.min(passed, pwRules.length) - 1;
                    return (
                      <div className="space-y-1.5 mt-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${strengthColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-medium ${strengthColor.replace('bg-', 'text-')}`}>
                            {idx >= 0 ? (strengthLabel[lang] || strengthLabel.es)[idx] : ''}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {pwRules.map(r => {
                            const pass = r.test(regPassword);
                            return (
                              <li key={r.key} className={`flex items-center gap-1.5 text-xs ${pass ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {r.label[lang] || r.label.es}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
                {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</div>}
                {success && <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" /> {success}</div>}
                <Button type="submit" className="w-full" disabled={loading || !allPwValid}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('userLogin.createAccount')}
                </Button>
                <OAuthButtons />
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
