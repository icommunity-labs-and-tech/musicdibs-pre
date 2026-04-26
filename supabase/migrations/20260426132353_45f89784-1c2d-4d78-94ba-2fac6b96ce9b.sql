CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_unpublished
ON public.blog_posts (published, published_at)
WHERE published = false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'blog-weekly-digest') THEN
    PERFORM cron.unschedule('blog-weekly-digest');
  END IF;

  PERFORM cron.schedule(
    'blog-weekly-digest',
    '0 9 * * 4',
    $cron$
    SELECT net.http_post(
      url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/blog-weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
    $cron$
  );
END $$;