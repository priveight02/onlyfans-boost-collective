
-- Site settings table for maintenance mode, login/registration controls
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only owner (admin) can manage
CREATE POLICY "Admins can manage site_settings"
  ON public.site_settings FOR ALL
  USING (is_admin(auth.uid()));

-- Anyone can read site settings (needed to check maintenance mode)
CREATE POLICY "Anyone can read site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
  ('registrations_paused', false),
  ('logins_paused', false),
  ('maintenance_mode', false);
