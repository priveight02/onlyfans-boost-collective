-- Drop and recreate with full edge-case handling
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
  now_ts timestamptz := now();
BEGIN
  -- Only handle tiktok posts
  IF COALESCE(NEW.platform, OLD.platform) != 'tiktok' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  job_name := 'tk_post_' || COALESCE(NEW.id, OLD.id)::text;

  -- === CLEANUP: DELETE, or status changed away from "scheduled" ===
  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM 'scheduled'))
  THEN
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION WHEN OTHERS THEN
      -- Job doesn't exist or already removed
    END;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- === SCHEDULE: INSERT or UPDATE with status=scheduled ===
  IF NEW.status = 'scheduled' AND NEW.scheduled_at IS NOT NULL THEN

    -- Always remove old job first (handles rescheduling)
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    sched_ts := NEW.scheduled_at AT TIME ZONE 'UTC';

    -- CASE 1: Scheduled in the past or within 90 seconds → publish NOW via immediate net.http_post
    IF sched_ts <= (now_ts + interval '90 seconds') THEN
      PERFORM net.http_post(
        url := 'https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/tiktok-api',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmc251b2J0dmtjaXlkZnRzeWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3Mjk2MzEsImV4cCI6MjA4NjMwNTYzMX0.rOmrXTkod_3Gioir5bqEkE_-1ky5pb5LQedlaLt6MVc"}'::jsonb,
        body := json_build_object('action', 'publish_scheduled_post', 'post_id', NEW.id::text)::jsonb
      );
      RETURN NEW;
    END IF;

    -- CASE 2: Future post → create precise one-shot cron
    cron_expr := EXTRACT(MINUTE FROM sched_ts)::int || ' ' ||
                 EXTRACT(HOUR FROM sched_ts)::int || ' ' ||
                 EXTRACT(DAY FROM sched_ts)::int || ' ' ||
                 EXTRACT(MONTH FROM sched_ts)::int || ' *';

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