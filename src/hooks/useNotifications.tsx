import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  referenceId?: string;
  category?: 'work' | 'credits' | 'ai' | 'system';
}

interface NotificationsContextType {
  notifications: DashboardNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const STORAGE_KEY = 'md_notifications_v1';
const MAX_NOTIFICATIONS = 50;

function loadFromStorage(userId: string | undefined): DashboardNotification[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_NOTIFICATIONS) : [];
  } catch {
    return [];
  }
}

function saveToStorage(userId: string | undefined, notifications: DashboardNotification[]) {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // Quota exceeded — silently skip
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Load persisted on user change
  useEffect(() => {
    const loaded = loadFromStorage(user?.id);
    setNotifications(loaded);
    seenIdsRef.current = new Set(loaded.map(n => n.referenceId ?? n.id));
  }, [user?.id]);

  // Persist on change
  useEffect(() => {
    saveToStorage(user?.id, notifications);
  }, [user?.id, notifications]);

  const push = useCallback((notif: DashboardNotification) => {
    const key = notif.referenceId ?? notif.id;
    if (seenIdsRef.current.has(key)) return;
    seenIdsRef.current.add(key);
    setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  // Realtime: works status changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-works-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'works', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (!oldRow.status || oldRow.status === newRow.status) return;

          const refId = `work_${newRow.id}_${newRow.status}`;
          if (newRow.status === 'registered') {
            push({
              id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              type: 'success',
              category: 'work',
              title: t('dashboard.notifications.events.workRegistered.title', 'Registro completado'),
              message: t('dashboard.notifications.events.workRegistered.message', {
                title: newRow.title,
                defaultValue: `"${newRow.title}" se ha registrado correctamente.`,
              }),
              timestamp: new Date().toISOString(),
              read: false,
              referenceId: refId,
            });
          } else if (newRow.status === 'failed') {
            push({
              id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              type: 'error',
              category: 'work',
              title: t('dashboard.notifications.events.workFailed.title', 'Registro fallido'),
              message: t('dashboard.notifications.events.workFailed.message', {
                title: newRow.title,
                defaultValue: `"${newRow.title}" no se pudo registrar. Inténtalo de nuevo.`,
              }),
              timestamp: new Date().toISOString(),
              read: false,
              referenceId: refId,
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, push, t]);

  // Realtime: credit transactions (purchases, grants, refunds)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-credits-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          const delta = Number(row.credits_delta ?? row.amount ?? 0);
          if (!delta || delta <= 0) return; // only positive events
          const eventType = String(row.event_type ?? '').toLowerCase();
          if (['debit', 'debited', 'usage'].includes(eventType)) return;

          push({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: 'success',
            category: 'credits',
            title: t('dashboard.notifications.events.creditsAdded.title', 'Créditos añadidos'),
            message: t('dashboard.notifications.events.creditsAdded.message', {
              count: delta,
              defaultValue: `Se han añadido ${delta} créditos a tu cuenta.`,
            }),
            timestamp: new Date().toISOString(),
            read: false,
            referenceId: `credit_${row.id}`,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, push, t]);

  // Realtime: AI generations completed
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-ai-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_generations', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (!oldRow.status || oldRow.status === newRow.status) return;
          if (newRow.status !== 'completed' && newRow.status !== 'failed') return;

          const isSuccess = newRow.status === 'completed';
          push({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: isSuccess ? 'success' : 'error',
            category: 'ai',
            title: isSuccess
              ? t('dashboard.notifications.events.aiCompleted.title', 'Generación IA lista')
              : t('dashboard.notifications.events.aiFailed.title', 'Generación IA fallida'),
            message: isSuccess
              ? t('dashboard.notifications.events.aiCompleted.message', 'Tu creación con IA ya está disponible en la biblioteca.')
              : t('dashboard.notifications.events.aiFailed.message', 'La generación no se pudo completar. Los créditos han sido reembolsados si procede.'),
            timestamp: new Date().toISOString(),
            read: false,
            referenceId: `ai_${newRow.id}_${newRow.status}`,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, push, t]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    seenIdsRef.current.clear();
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
