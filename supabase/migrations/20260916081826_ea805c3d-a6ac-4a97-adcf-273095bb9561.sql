CREATE OR REPLACE FUNCTION public.handle_new_user_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_referrer text := NULLIF(m->>'referrer', '');
  v_host text;
  v_source text;
  v_medium text;
BEGIN
  BEGIN
    v_host := lower(COALESCE(substring(v_referrer from '^[a-z]+://([^/:]+)'), ''));

    v_source := COALESCE(
      NULLIF(m->>'utm_source', ''),
      CASE WHEN NULLIF(m->>'gclid', '') IS NOT NULL THEN 'google' END,
      NULLIF(v_host, ''),
      'directo'
    );

    v_medium := COALESCE(
      NULLIF(m->>'utm_medium', ''),
      CASE WHEN NULLIF(m->>'gclid', '') IS NOT NULL THEN 'cpc' END,
      CASE WHEN v_host ~ '(google|bing|yahoo|duckduckgo|ecosia|yandex)\.' THEN 'organic'
           WHEN v_host <> '' THEN 'referral'
           ELSE 'none' END
    );

    INSERT INTO public.user_attribution (
      user_id, first_source, first_medium, first_campaign, first_content,
      first_term, first_referrer, first_landing_path, attributed_campaign_name
    ) VALUES (
      NEW.id,
      v_source,
      v_medium,
      NULLIF(m->>'utm_campaign', ''),
      NULLIF(m->>'utm_content', ''),
      NULLIF(m->>'utm_term', ''),
      v_referrer,
      NULLIF(m->>'landing_path', ''),
      COALESCE(
        NULLIF(m->>'utm_campaign', ''),
        CASE WHEN NULLIF(m->>'gclid', '') IS NOT NULL THEN 'Google Ads (gclid)' END
      )
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_attribution] failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

GRANT INSERT ON public.user_attribution TO authenticated;

DROP POLICY IF EXISTS "Users can insert own attribution" ON public.user_attribution;
CREATE POLICY "Users can insert own attribution"
ON public.user_attribution
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());