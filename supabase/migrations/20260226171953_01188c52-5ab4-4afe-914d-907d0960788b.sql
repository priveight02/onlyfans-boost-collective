-- Function: creates a one-shot cron job for a specific post at its exact scheduled_at time
CREATE OR REPLACE FUNCTION public.manage_post_cron_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  job_name text;
  cron_expr text;
  sched_ts timestamptz;
BEGIN
  -- Only handle tiktok posts (extend later for other platforms)
  IF COALESCE(NEW.platform, OLD.platform) != 'tiktok' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  job_name := 'tk_post_' || COALESCE(NEW.id, OLD.id)::text;

  -- DELETE or status no longer "scheduled" → remove cron job if exists
  IF TG_OP = 'DELETE' 
     OR (TG_OP = 'UPDATE' AND NEW.status != 'scheduled')
  THEN
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION WHEN OTHERS THEN
      -- Job doesn't exist, ignore
    END;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- INSERT or UPDATE with status = 'scheduled' and a scheduled_at time
  IF NEW.status = 'scheduled' AND NEW.scheduled_at IS NOT NULL THEN
    sched_ts := NEW.scheduled_at AT TIME ZONE 'UTC';
    
    -- Build cron expression for the exact minute: min hour day month *
    cron_expr := EXTRACT(MINUTE FROM sched_ts)::int || ' ' ||
                 EXTRACT(HOUR FROM sched_ts)::int || ' ' ||
                 EXTRACT(DAY FROM sched_ts)::int || ' ' ||
                 EXTRACT(MONTH FROM sched_ts)::int || ' *';

    -- Remove old job if rescheduling
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Create one-shot cron job that calls the edge function for this specific post
    PERFORM cron.schedule(
      job_name,
      cron_expr,
      format(
        'SELECT net.http_post(
          url:=''https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/tiktok-api'',
          headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmc251b2J0dmtjaXlkZnRzeWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3Mjk2MzEsImV4cCI6MjA4NjMwNTYzMX0.rOmrXTkod_3Gioir5bqEkE_-1ky5pb5LQedlaLt6MVc"}''::jsonb,
          body:=''{"action": "publish_scheduled_post", "post_id": "%s"}''::jsonb
        ) as request_id;',
        NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on social_posts table
DROP TRIGGER IF EXISTS trg_manage_post_cron ON public.social_posts;
CREATE TRIGGER trg_manage_post_cron
  AFTER INSERT OR UPDATE OR DELETE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_post_cron_job();