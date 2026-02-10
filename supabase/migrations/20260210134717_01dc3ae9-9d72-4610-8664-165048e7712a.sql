
-- Table for tracking site visits
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  visitor_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Only admins can view visits
CREATE POLICY "Admins can view site visits"
ON public.site_visits
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Anyone can insert (anonymous tracking)
CREATE POLICY "Anyone can insert visits"
ON public.site_visits
FOR INSERT
WITH CHECK (true);

-- Table for tracking admin login attempts
CREATE TABLE public.admin_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
ON public.admin_login_attempts
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Anyone can insert attempts (for tracking)
CREATE POLICY "Anyone can insert login attempts"
ON public.admin_login_attempts
FOR INSERT
WITH CHECK (true);
