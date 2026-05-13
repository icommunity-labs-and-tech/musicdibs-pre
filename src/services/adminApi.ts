import { supabase } from '@/integrations/supabase/client';

type AdminActionPayload = Record<string, unknown>;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kmwehyixenybegwhqljx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttd2VoeWl4ZW55YmVnd2hxbGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDEwMzQsImV4cCI6MjA5MDAxNzAzNH0.DZ2gEjz_DAkHfEetYo72NAUbdhq2lui9rIrMysWJUNo';

class AdminActionHttpError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'AdminActionHttpError';
    this.status = status;
    this.body = body;
  }
}

async function getAdminAccessToken() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error('No se pudo verificar la sesión. Vuelve a iniciar sesión.');

  let accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
    accessToken = refreshData.session?.access_token;
  }

  if (!accessToken) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
  return accessToken;
}

async function invokeOnce(action: string, payload: AdminActionPayload, token: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const contentType = response.headers.get('Content-Type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? String((data as { error?: unknown }).error || 'Admin action failed')
      : `Admin action failed (${response.status})`;
    throw new AdminActionHttpError(response.status, message, data);
  }

  return data;
}

function isUnauthorized(error: unknown) {
  if (error instanceof AdminActionHttpError && error.status === 401) return true;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return msg.includes('unauthorized') || msg.includes('401');
}

async function adminAction(action: string, payload: AdminActionPayload = {}) {
  let accessToken = await getAdminAccessToken();

  try {
    const data = await invokeOnce(action, payload, accessToken);
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (error) {
    // Transient 401 → refresh session and retry once with a fresh bearer token.
    if (!isUnauthorized(error)) throw error;

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');

    accessToken = refreshed.session?.access_token || accessToken;
    const data = await invokeOnce(action, payload, accessToken);
    if (data?.error) throw new Error(data.error);
    return data;
  }
}

export const adminApi = {
  getUsers: (offset = 0, search = '', limit = 50, filters: { kyc_filter?: string; plan_filter?: string; stripe_filter?: string; status_filter?: string; role_filter?: string; sort_by?: string; sort_dir?: 'asc' | 'desc' } = {}) =>
    adminAction('get_users', { offset, search, limit, ...filters }),
  bulkUserAction: (user_ids: string[], op: 'block' | 'unblock' | 'kyc_verified' | 'kyc_pending') => adminAction('bulk_user_action', { user_ids, op }),
  adjustCredits: (user_id: string, amount: number, reason: string) => adminAction('adjust_credits', { user_id, amount, reason }),
  setKyc: (user_id: string, status: string) => adminAction('set_kyc', { user_id, status }),
  toggleBlock: (user_id: string, blocked: boolean) => adminAction('toggle_block', { user_id, blocked }),
  setAdminRole: (user_id: string, is_admin: boolean) => adminAction('set_admin_role', { user_id, is_admin }),
  setManagerRole: (user_id: string, is_manager: boolean) => adminAction('set_manager_role', { user_id, is_manager }),
  sendPasswordReset: (user_id: string) => adminAction('send_password_reset', { user_id }),
  setTemporaryPassword: (user_id: string, send_email = false) => adminAction('set_temporary_password', { user_id, send_email }),
  getAllWorks: (offset = 0, status_filter = '', search = '', sort_by = 'created_at', sort_dir: 'asc' | 'desc' = 'desc', limit = 50) => adminAction('get_all_works', { offset, status_filter, search, sort_by, sort_dir, limit }),
  getMetrics: () => adminAction('get_metrics'),
  getSaasMetrics: (filters?: { periodType?: string; weekStart?: string; month?: string; year?: string; force_refresh?: boolean }) => adminAction('get_saas_metrics', filters || {}),
  getAllTransactions: (offset = 0, type_filter = '', date_from = '', date_to = '') => adminAction('get_all_transactions', { offset, type_filter, date_from, date_to }),
  searchUserByEmail: (email: string) => adminAction('search_user_by_email', { email }),
  searchUsersByEmail: (query: string, limit = 10) => adminAction('search_users_by_email', { query, limit }),
  exportCsv: (dataset: string) => adminAction('export_csv', { dataset }),
  getAdmins: () => adminAction('get_admins'),
  getAuditLog: (offset = 0, action_filter = '') => adminAction('get_audit_log', { offset, action_filter }),
  callAction: (action: string, payload: AdminActionPayload = {}) => adminAction(action, payload),
  getPremiumPromos: (offset = 0, status_filter = '') => adminAction('get_premium_promos', { offset, status_filter }),
  updatePremiumPromoStatus: (promo_id: string, new_status: string, rejection_reason?: string, ig_url?: string, tiktok_url?: string) => adminAction('update_premium_promo_status', { promo_id, new_status, ...(rejection_reason ? { rejection_reason } : {}), ...(ig_url ? { ig_url } : {}), ...(tiktok_url ? { tiktok_url } : {}) }),
  deleteWork: (work_id: string) => adminAction('delete_work', { work_id }),
  getWorkFileMetadata: (work_id: string) => adminAction('get_work_file_metadata', { work_id }) as Promise<{ filename?: string | null; filesize?: number | null }>,
  getCampaignsCatalog: () => adminAction('get_campaigns_catalog'),
  saveCampaign: (campaign: AdminActionPayload) => adminAction('save_campaign', campaign),
  syncStripeCoupons: () => adminAction('sync_stripe_coupons'),
  getCampaignMetrics: (filters: { periodType?: string; weekStart?: string; month?: string; year?: string }) => adminAction('get_campaign_metrics', filters),
  getCampaignDetail: (campaign_name: string) => adminAction('get_campaign_detail', { campaign_name }),
  backfillOrdersFromStripe: (dry_run = false, limit?: number) => adminAction('backfill_orders_from_stripe', { dry_run, limit }),
  getUserPurchases: (user_id: string) => adminAction('get_user_purchases', { user_id }),
  getLibraryStatus: (user_id: string) => adminAction('get_library_status', { user_id }),
  getConsistencyReport: (limit = 50) => adminAction('get_consistency_report', { limit }),
  exportOrdersCsv: () => adminAction('export_csv', { dataset: 'orders' }),
};
