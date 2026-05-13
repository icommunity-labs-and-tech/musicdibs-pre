-- Revoke overly permissive grants applied in previous migration
REVOKE ALL ON public.app_settings FROM anon, authenticated;
REVOKE ALL ON public.renewal_log FROM anon, authenticated;
REVOKE ALL ON public.admin_alerts FROM anon, authenticated;
REVOKE ALL ON public.ai_provider_settings FROM anon, authenticated;
REVOKE ALL ON public.ai_generation_logs FROM anon, authenticated;

-- app_settings: configuración de app (lectura pública por anon, escritura solo via service_role/admin RLS)
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- renewal_log: tabla interna, solo Edge Functions
GRANT ALL ON public.renewal_log TO service_role;

-- admin_alerts: solo admins autenticados (controlado por RLS) + service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_alerts TO authenticated;
GRANT ALL ON public.admin_alerts TO service_role;

-- ai_provider_settings: solo admins autenticados (controlado por RLS) + service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_settings TO authenticated;
GRANT ALL ON public.ai_provider_settings TO service_role;

-- ai_generation_logs: solo admins autenticados (controlado por RLS) + service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_logs TO authenticated;
GRANT ALL ON public.ai_generation_logs TO service_role;