
-- Optimized: batch same-minute posts into ONE cron job per time slot
CREATE OR REPLACE FUNCTION public.manage_post_cron_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slot_name text;
  cron_expr text;
  sched_ts  timestamptz;
  now_ts    timestamptz := now();
  slot_ts   timestamptz;
  remaining int;
BEGIN
  -- Only handle tiktok posts
  IF COALESCE(NEW.platform, OLD.platform) != 'tiktok' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- === CLEANUP: DELETE, or status changed away from "scheduled" ===
  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM 'scheduled')
  THEN
    -- Check if any OTHER posts remain in the same time slot
    IF OLD.scheduled_at IS NOT NULL THEN
      slot_ts := date_trunc('minute', OLD.scheduled_at AT TIME ZONE 'UTC');
      slot_name := 'tk_slot_' || to_char(slot_ts, 'YYYYMMDDHH24MI');

      SELECT count(*) INTO remaining
      FROM social_posts
      WHERE platform = 'tiktok'
        AND status = 'scheduled'
        AND date_trunc('minute', scheduled_at AT TIME ZONE 'UTC') = slot_ts
        AND id != COALESCE(NEW.id, OLD.id);

      IF remaining = 0 THEN
        BEGIN
          PERFORM cron.unschedule(slot_name);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
  END IF;

  -- === SCHEDULE: INSERT or UPDATE with status=scheduled ===
  IF NEW.status = 'scheduled' AND NEW.scheduled_at IS NOT NULL THEN

    -- If rescheduling, clean up old slot first
    IF TG_OP = 'UPDATE' AND OLD.scheduled_at IS NOT NULL
       AND date_trunc('minute', OLD.scheduled_at) IS DISTINCT FROM date_trunc('minute', NEW.scheduled_at)
    THEN
      slot_ts := date_trunc('minute', OLD.scheduled_at AT TIME ZONE 'UTC');
      slot_name := 'tk_slot_' || to_char(slot_ts, 'YYYYMMDDHH24MI');

      SELECT count(*) INTO remaining
      FROM social_posts
      WHERE platform = 'tiktok'
        AND status = 'scheduled'
        AND date_trunc('minute', scheduled_at AT TIME ZONE 'UTC') = slot_ts
        AND id != NEW.id;

      IF remaining = 0 THEN
        BEGIN
          PERFORM cron.unschedule(slot_name);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;
    END IF;

    sched_ts := NEW.scheduled_at AT TIME ZONE 'UTC';
    slot_ts  := date_trunc('minute', sched_ts);
    slot_name := 'tk_slot_' || to_char(slot_ts, 'YYYYMMDDHH24MI');

    -- CASE 1: Past or within 90s → fire immediately
    IF sched_ts <= (now_ts + interval '90 seconds') THEN
      PERFORM net.http_post(
        url := 'https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/tiktok-api',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmc251b2J0dmtjaXlkZnRzeWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3Mjk2MzEsImV4cCI6MjA4NjMwNTYzMX0.rOmrXTkod_3Gioir5bqEkE_-1ky5pb5LQedlaLt6MVc"}'::jsonb,
        body := json_build_object('action', 'publish_scheduled_batch', 'slot_ts', slot_ts::text)::jsonb
      );
      RETURN NEW;
    END IF;

    -- CASE 2: Future → create/replace one cron per minute-slot (idempotent)
    -- Unschedule first to avoid duplicates, then reschedule
    BEGIN
      PERFORM cron.unschedule(slot_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    cron_expr := EXTRACT(MINUTE FROM sched_ts)::int || ' ' ||
                 EXTRACT(HOUR FROM sched_ts)::int || ' ' ||
                 EXTRACT(DAY FROM sched_ts)::int || ' ' ||
                 EXTRACT(MONTH FROM sched_ts)::int || ' *';

    PERFORM cron.schedule(
      slot_name,
      cron_expr,
      format(
        'SELECT net.http_post(
          url:=''https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/tiktok-api'',
          headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmc251b2J0dmtjaXlkZnRzeWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3Mjk2MzEsImV4cCI6MjA4NjMwNTYzMX0.rOmrXTkod_3Gioir5bqEkE_-1ky5pb5LQedlaLt6MVc"}''::jsonb,
          body:=''{"action": "publish_scheduled_batch", "slot_ts": "%s"}''::jsonb
        ) as request_id;',
        slot_ts::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
