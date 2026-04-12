
-- Fix contact_submissions: change ALL to INSERT only
DROP POLICY IF EXISTS "Anyone can submit a contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit a contact form"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Fix feature_costs: add RLS policies (currently has RLS enabled but no policies)
CREATE POLICY "Anyone can read feature costs"
  ON public.feature_costs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage feature costs"
  ON public.feature_costs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
