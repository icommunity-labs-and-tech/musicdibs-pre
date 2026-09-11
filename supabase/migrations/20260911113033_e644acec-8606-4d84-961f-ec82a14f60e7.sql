CREATE OR REPLACE FUNCTION public.ml_lifecycle_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _batch  int := 50;
  _pages  int := 5;
  _chunk  int := 250; -- _batch * _pages
  _offset int := 0;
  _total  int;
BEGIN
  SELECT count(*) INTO _total FROM public.profiles;

  SELECT COALESCE((value->>'offset')::int, 0) INTO _offset
  FROM public.app_settings WHERE key = 'ml_lifecycle_offset';

  IF _offset IS NULL OR _offset >= _total THEN
    _offset := 0;
  END IF;

  PERFORM net.http_post(
    url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/ml-lifecycle-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'W4-WCTgtYjeNi1cHFYWvQ37wTaLHYw9oWXE9ifmmJ1E'
    ),
    body := jsonb_build_object(
      'dry_run', false,
      'batch_size', _batch,
      'max_pages', _pages,
      'order', 'asc',
      'page_offset', _offset
    )
  );

  INSERT INTO public.app_settings (key, value)
  VALUES ('ml_lifecycle_offset', jsonb_build_object('offset', CASE WHEN _offset + _chunk >= _total THEN 0 ELSE _offset + _chunk END))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ml_lifecycle_tick() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(39);
SELECT cron.unschedule(40);
SELECT cron.schedule('ml-lifecycle-rolling', '7 * * * *', $$SELECT public.ml_lifecycle_tick();$$);