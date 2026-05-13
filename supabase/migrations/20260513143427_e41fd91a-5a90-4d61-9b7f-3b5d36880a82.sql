-- ===================================================================
-- Retrofit GRANT statements for tables created without explicit grants
-- ===================================================================

-- app_settings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- renewal_log
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_log TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_log TO authenticated;
GRANT ALL ON public.renewal_log TO service_role;

-- admin_alerts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_alerts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_alerts TO authenticated;
GRANT ALL ON public.admin_alerts TO service_role;

-- ai_provider_settings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_settings TO authenticated;
GRANT ALL ON public.ai_provider_settings TO service_role;

-- ai_generation_logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_logs TO authenticated;
GRANT ALL ON public.ai_generation_logs TO service_role;
