
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS subscribers_notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_blog_subscribers_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_key text;
BEGIN
  -- Solo cuando pasa a published=true y aún no se ha notificado
  IF NEW.published IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.published IS TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.subscribers_notified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;

    IF v_key IS NULL THEN
      RAISE LOG '[notify_blog_subscribers_on_publish] vault secret missing — skipped for post %', NEW.id;
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/notify-blog-subscribers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object('post_id', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[notify_blog_subscribers_on_publish] failed for post %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blog_subscribers_ins ON public.blog_posts;
DROP TRIGGER IF EXISTS trg_notify_blog_subscribers_upd ON public.blog_posts;

CREATE TRIGGER trg_notify_blog_subscribers_ins
AFTER INSERT ON public.blog_posts
FOR EACH ROW
WHEN (NEW.published IS TRUE)
EXECUTE FUNCTION public.notify_blog_subscribers_on_publish();

CREATE TRIGGER trg_notify_blog_subscribers_upd
AFTER UPDATE OF published ON public.blog_posts
FOR EACH ROW
WHEN (NEW.published IS TRUE AND OLD.published IS DISTINCT FROM NEW.published)
EXECUTE FUNCTION public.notify_blog_subscribers_on_publish();
