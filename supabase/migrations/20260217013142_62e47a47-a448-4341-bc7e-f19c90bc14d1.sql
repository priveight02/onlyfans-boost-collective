
-- Add token, permissions, and expires_at to workspace_invitations
ALTER TABLE public.workspace_invitations 
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS personal_info JSONB;

-- Create admin_onboarding_profiles to store completed onboarding data
CREATE TABLE IF NOT EXISTS public.admin_onboarding_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invitation_id UUID REFERENCES public.workspace_invitations(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_onboarding_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can see all onboarding profiles
CREATE POLICY "Admins can view onboarding profiles"
  ON public.admin_onboarding_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can insert their own onboarding profile
CREATE POLICY "Users can create their own onboarding profile"
  ON public.admin_onboarding_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own onboarding profile
CREATE POLICY "Users can view own onboarding profile"
  ON public.admin_onboarding_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anyone to read workspace_invitations by token for onboarding validation
CREATE POLICY "Anyone can validate invitation by token"
  ON public.workspace_invitations FOR SELECT
  TO anon, authenticated
  USING (token IS NOT NULL);
