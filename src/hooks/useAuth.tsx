import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';

type SupabaseClientInstance = typeof import('@/integrations/supabase/client').supabase;

let supabasePromise: Promise<SupabaseClientInstance> | null = null;

const getSupabaseClient = () => {
  supabasePromise ??= import('@/integrations/supabase/client').then((module) => module.supabase);
  return supabasePromise;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const resetAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsManager(false);
    setLoading(false);
  }, []);

  const recoverFromAuthError = useCallback(async (error: unknown) => {
    console.error('[auth] Failed to initialize session', error);

    try {
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.warn('[auth] Failed to clear local session', signOutError);
    }

    resetAuthState();
  }, [resetAuthState]);

  const initializeUser = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      resetAuthState();
      return;
    }

    setSession(currentSession);
    setUser(currentSession.user);

    try {
      const supabase = await getSupabaseClient();
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentSession.user.id);

      if (error) throw error;

      const roleSet = new Set((roles || []).map((r: { role: string }) => r.role));
      setIsAdmin(roleSet.has('admin'));
      setIsManager(roleSet.has('manager'));
    } catch (error) {
      console.error('[auth] Failed to load roles', error);
      setIsAdmin(false);
      setIsManager(false);
    } finally {
      setLoading(false);
    }
  }, [resetAuthState]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let isMounted = true;

    // IMPORTANT: Set up listener BEFORE getting session (per Supabase docs)
    void getSupabaseClient()
      .then((supabase) => {
        if (!isMounted) return;

        const authState = supabase.auth.onAuthStateChange((_event, newSession) => {
          // Use setTimeout to avoid async work directly in callback
          setTimeout(() => {
            void initializeUser(newSession).catch(recoverFromAuthError);
          }, 0);
        });
        subscription = authState.data.subscription;

        return supabase.auth.getSession()
          .then(({ data: { session: currentSession } }) => initializeUser(currentSession));
      })
      .catch(recoverFromAuthError);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [initializeUser, recoverFromAuthError]);

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = await getSupabaseClient();

      // 1. Try standard Supabase auth (works for bcrypt users — the majority post-migration)
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return { error: null };

      // 2. Banned users — don't attempt fallback
      if (error.message?.includes('banned')) {
        return { error: { message: 'Tu cuenta ha sido bloqueada. Contacta con soporte.' } };
      }

      // 3. Invalid credentials — try PHPass fallback for WordPress-migrated users
      if (error.message?.includes('Invalid login credentials')) {
        try {
          const { data: wpData, error: wpError } = await supabase.functions.invoke(
            'wp-password-login',
            { body: { email, password } },
          );

          if (wpError || (wpData as any)?.error) {
            // PHPass verification also failed — wrong password
            return { error };
          }

          if ((wpData as any)?.upgraded) {
            // Hash upgraded to bcrypt — retry native login immediately
            const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
            if (!retryError) return { error: null };
          }

          return { error };
        } catch (wpFallbackError) {
          console.error('[auth] WP password fallback failed', wpFallbackError);
          return { error };
        }
      }

      // 4. Other errors
      return { error };
    } catch (error) {
      console.error('[auth] Sign in failed', error);
      return { error: { message: 'No se pudo conectar con el servicio de autenticación. Inténtalo de nuevo.' } };
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(metadata ? { data: metadata } : {}),
          emailRedirectTo: window.location.origin,
        },
      });

      return { error };
    } catch (error) {
      console.error('[auth] Sign up failed', error);
      return { error: { message: 'No se pudo completar el registro. Inténtalo de nuevo.' } };
    }
  };

  const signOut = async () => {
    try {
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      resetAuthState();
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isManager, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
