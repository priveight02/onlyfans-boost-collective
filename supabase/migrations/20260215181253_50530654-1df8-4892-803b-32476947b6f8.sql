
-- Create device sessions table for tracking connected devices
CREATE TABLE public.device_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  device_type TEXT NOT NULL DEFAULT 'desktop',
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  session_token_hash TEXT,
  is_manually_added BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'online'
);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device sessions"
ON public.device_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device sessions"
ON public.device_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device sessions"
ON public.device_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device sessions"
ON public.device_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Create user_settings table for the 5 new settings
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 1440,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  login_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for device_sessions to track online/offline in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_sessions;

-- Create trigger for user_settings updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
