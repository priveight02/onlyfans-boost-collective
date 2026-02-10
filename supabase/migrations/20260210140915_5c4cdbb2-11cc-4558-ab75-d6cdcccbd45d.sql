
-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create managed_accounts table for CRM
CREATE TABLE public.managed_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  platform TEXT NOT NULL DEFAULT 'generic',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive', 'onboarding')),
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'vip', 'enterprise')),
  monthly_revenue NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(14,2) DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  contact_email TEXT,
  contact_phone TEXT,
  social_links JSONB DEFAULT '{}',
  last_activity_at TIMESTAMP WITH TIME ZONE,
  onboarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view managed accounts"
  ON public.managed_accounts FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert managed accounts"
  ON public.managed_accounts FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update managed accounts"
  ON public.managed_accounts FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete managed accounts"
  ON public.managed_accounts FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Create account_activities table
CREATE TABLE public.account_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'revenue_update', 'status_change', 'content_posted', 'milestone', 'outreach', 'meeting')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage activities"
  ON public.account_activities FOR ALL
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_managed_accounts_updated_at
  BEFORE UPDATE ON public.managed_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
