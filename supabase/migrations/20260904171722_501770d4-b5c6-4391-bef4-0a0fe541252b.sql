CREATE OR REPLACE FUNCTION public.publish_due_blog_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH due AS (
    UPDATE public.blog_posts
    SET published = true,
        scheduled = false,
        updated_at = now()
    WHERE published IS NOT TRUE
      AND scheduled IS TRUE
      AND published_at IS NOT NULL
      AND published_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM due;
  RETURN v_count;
END;
$$;

SELECT cron.schedule(
  'publish-due-blog-posts-hourly',
  '5 * * * *',
  $$SELECT public.publish_due_blog_posts();$$
);