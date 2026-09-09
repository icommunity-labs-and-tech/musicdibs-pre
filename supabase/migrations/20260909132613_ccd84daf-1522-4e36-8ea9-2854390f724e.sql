CREATE TABLE IF NOT EXISTS public.utm_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  referrer text,
  landing_path text,
  language text,
  session_id text
);

CREATE INDEX IF NOT EXISTS utm_visits_created_at_idx ON public.utm_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS utm_visits_source_idx ON public.utm_visits (utm_source);

GRANT INSERT ON public.utm_visits TO anon;
GRANT INSERT, SELECT ON public.utm_visits TO authenticated;
GRANT ALL ON public.utm_visits TO service_role;

ALTER TABLE public.utm_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record a visit" ON public.utm_visits;
CREATE POLICY "Anyone can record a visit"
  ON public.utm_visits FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read visits" ON public.utm_visits;
CREATE POLICY "Admins can read visits"
  ON public.utm_visits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  IF COALESCE(m->>'utm_source', m->>'utm_campaign', m->>'gclid', m->>'referrer') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_attribution (
        user_id, first_source, first_medium, first_campaign, first_content,
        first_term, first_referrer, first_landing_path, attributed_campaign_name
      ) VALUES (
        NEW.id,
        COALESCE(m->>'utm_source', CASE WHEN m->>'gclid' IS NOT NULL THEN 'google' END),
        COALESCE(m->>'utm_medium', CASE WHEN m->>'gclid' IS NOT NULL THEN 'cpc' END),
        m->>'utm_campaign',
        m->>'utm_content',
        m->>'utm_term',
        m->>'referrer',
        m->>'landing_path',
        COALESCE(m->>'utm_campaign', CASE WHEN m->>'gclid' IS NOT NULL THEN 'Google Ads (gclid)' END)
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_attribution] failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_attribution ON auth.users;
CREATE TRIGGER on_auth_user_created_attribution
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_attribution();