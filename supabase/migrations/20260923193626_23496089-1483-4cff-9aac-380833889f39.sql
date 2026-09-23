-- platform_config: only admins may read
DROP POLICY IF EXISTS "Authenticated users read platform_config" ON public.platform_config;
CREATE POLICY "Admins read platform_config" ON public.platform_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ab_test_events: insert-only with validated values
DROP POLICY IF EXISTS "Anyone can insert ab events" ON public.ab_test_events;
CREATE POLICY "Anyone can insert valid ab events" ON public.ab_test_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(test_id) BETWEEN 1 AND 100
    AND variant_index BETWEEN 0 AND 50
    AND length(variant_text) BETWEEN 1 AND 500
    AND event_type IN ('impression','click','conversion','view')
    AND (session_id IS NULL OR length(session_id) <= 100)
  );

-- manager_contact_requests: validated submissions only
DROP POLICY IF EXISTS "Anyone can submit manager contact request" ON public.manager_contact_requests;
CREATE POLICY "Anyone can submit valid manager contact request" ON public.manager_contact_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(btrim(name)) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (phone IS NULL OR length(phone) <= 40)
    AND (company_name IS NULL OR length(company_name) <= 200)
    AND (country IS NULL OR length(country) <= 100)
    AND (message IS NULL OR length(message) <= 5000)
    AND status = 'pending' AND assigned_to IS NULL AND internal_notes IS NULL
  );

-- contact_submissions: validated submissions only
DROP POLICY IF EXISTS "Anyone can submit a contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit a valid contact form" ON public.contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(btrim(name)) BETWEEN 1 AND 100
    AND length(email) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (phone IS NULL OR length(phone) <= 20)
    AND length(btrim(subject)) BETWEEN 1 AND 200
    AND length(btrim(message)) BETWEEN 1 AND 5000
  );

-- utm_visits: validated visits only
DROP POLICY IF EXISTS "Anyone can record a visit" ON public.utm_visits;
CREATE POLICY "Anyone can record a valid visit" ON public.utm_visits
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (utm_source IS NULL OR length(utm_source) <= 255)
    AND (utm_medium IS NULL OR length(utm_medium) <= 255)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 255)
    AND (utm_content IS NULL OR length(utm_content) <= 255)
    AND (utm_term IS NULL OR length(utm_term) <= 255)
    AND (gclid IS NULL OR length(gclid) <= 255)
    AND (referrer IS NULL OR length(referrer) <= 2048)
    AND (landing_path IS NULL OR length(landing_path) <= 2048)
    AND (language IS NULL OR length(language) <= 10)
    AND session_id IS NULL
  );