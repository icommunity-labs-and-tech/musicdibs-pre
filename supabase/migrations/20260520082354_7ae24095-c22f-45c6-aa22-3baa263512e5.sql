-- Allow authenticated users to read public app_settings (non-sensitive flags)
CREATE POLICY "Authenticated can read app_settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Seed the flag (default OFF: behave like today)
INSERT INTO public.app_settings (key, value)
VALUES ('coupon_redemption_always_visible', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;