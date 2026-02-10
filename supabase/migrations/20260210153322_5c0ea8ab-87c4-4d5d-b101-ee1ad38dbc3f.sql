
-- Profile lookup history with full snapshot
CREATE TABLE public.profile_lookup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  looked_up_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_lookup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lookup history"
ON public.profile_lookup_history
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert lookup history"
ON public.profile_lookup_history
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'chatter' CHECK (role IN ('admin', 'manager', 'chatter', 'va')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert team members"
ON public.team_members
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Team account assignments (which team member works on which account)
CREATE TABLE public.team_account_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  role_on_account TEXT NOT NULL DEFAULT 'chatter' CHECK (role_on_account IN ('manager', 'chatter', 'va')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, account_id)
);

ALTER TABLE public.team_account_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments"
ON public.team_account_assignments
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert assignments"
ON public.team_account_assignments
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- OF account credentials (encrypted storage reference)
ALTER TABLE public.managed_accounts
ADD COLUMN IF NOT EXISTS of_auth_id TEXT,
ADD COLUMN IF NOT EXISTS of_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS of_session_token TEXT,
ADD COLUMN IF NOT EXISTS of_user_agent TEXT,
ADD COLUMN IF NOT EXISTS of_x_bc TEXT,
ADD COLUMN IF NOT EXISTS of_connected_at TIMESTAMP WITH TIME ZONE;

-- Index for lookup history
CREATE INDEX idx_lookup_history_username ON public.profile_lookup_history(username);
CREATE INDEX idx_lookup_history_created ON public.profile_lookup_history(created_at DESC);
CREATE INDEX idx_team_assignments_member ON public.team_account_assignments(team_member_id);
CREATE INDEX idx_team_assignments_account ON public.team_account_assignments(account_id);
