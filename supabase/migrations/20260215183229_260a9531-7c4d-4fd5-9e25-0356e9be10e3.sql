
-- Add new settings columns to user_settings
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS activity_logging_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_bio_generator_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_login_anomaly_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_security_digest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smart_session_cleanup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_theme_detection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compact_ui_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_email_summary_enabled boolean NOT NULL DEFAULT false;
