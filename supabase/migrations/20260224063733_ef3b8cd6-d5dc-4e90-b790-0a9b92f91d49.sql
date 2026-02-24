
-- Add daily message tracking columns to auto_respond_state
ALTER TABLE public.auto_respond_state
  ADD COLUMN IF NOT EXISTS daily_sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_reset_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS daily_limit integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS cooldown_hours integer NOT NULL DEFAULT 12;
