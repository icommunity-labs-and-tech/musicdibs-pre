
CREATE OR REPLACE FUNCTION public.enrich_user_attribution(
  p_source text,
  p_medium text,
  p_campaign text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_term text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_landing_path text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.user_attribution (
    user_id, first_source, first_medium, first_campaign, first_content,
    first_term, first_referrer, first_landing_path, attributed_campaign_name
  ) VALUES (
    v_uid,
    COALESCE(NULLIF(p_source, ''), 'directo'),
    COALESCE(NULLIF(p_medium, ''), 'none'),
    NULLIF(p_campaign, ''), NULLIF(p_content, ''), NULLIF(p_term, ''),
    NULLIF(p_referrer, ''), NULLIF(p_landing_path, ''), NULLIF(p_campaign, '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_source = CASE WHEN public.user_attribution.first_source IN ('directo','') OR public.user_attribution.first_source IS NULL
                        THEN COALESCE(NULLIF(p_source, ''), public.user_attribution.first_source)
                        ELSE public.user_attribution.first_source END,
    first_medium = CASE WHEN public.user_attribution.first_medium IN ('none','') OR public.user_attribution.first_medium IS NULL
                        THEN COALESCE(NULLIF(p_medium, ''), public.user_attribution.first_medium)
                        ELSE public.user_attribution.first_medium END,
    first_campaign = COALESCE(public.user_attribution.first_campaign, NULLIF(p_campaign, '')),
    first_content = COALESCE(public.user_attribution.first_content, NULLIF(p_content, '')),
    first_term = COALESCE(public.user_attribution.first_term, NULLIF(p_term, '')),
    first_referrer = COALESCE(public.user_attribution.first_referrer, NULLIF(p_referrer, '')),
    first_landing_path = COALESCE(public.user_attribution.first_landing_path, NULLIF(p_landing_path, '')),
    attributed_campaign_name = COALESCE(public.user_attribution.attributed_campaign_name, NULLIF(p_campaign, '')),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.enrich_user_attribution(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enrich_user_attribution(text,text,text,text,text,text,text) TO authenticated;
