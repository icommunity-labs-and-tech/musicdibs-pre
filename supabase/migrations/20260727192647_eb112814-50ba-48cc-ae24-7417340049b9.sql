GRANT SELECT ON public.operation_pricing TO anon;
GRANT SELECT ON public.operation_pricing TO authenticated;
GRANT ALL ON public.operation_pricing TO service_role;

DROP POLICY IF EXISTS "Public can view active operation pricing" ON public.operation_pricing;
CREATE POLICY "Public can view active operation pricing"
ON public.operation_pricing
FOR SELECT
TO anon, authenticated
USING (is_active = true);