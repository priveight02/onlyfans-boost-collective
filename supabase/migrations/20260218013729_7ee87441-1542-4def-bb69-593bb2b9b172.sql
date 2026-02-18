
-- Immutable API key history table - NO delete policy
CREATE TABLE public.api_key_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID,
  user_id UUID NOT NULL,
  key_prefix TEXT NOT NULL,
  key_name TEXT NOT NULL,
  key_type TEXT NOT NULL DEFAULT 'user',
  scopes TEXT[] DEFAULT '{}',
  action TEXT NOT NULL,
  action_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_key_history ENABLE ROW LEVEL SECURITY;

-- Only admins can SELECT, nobody can DELETE or UPDATE
CREATE POLICY "Admins can view all key history"
ON public.api_key_history
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can view their own key history
CREATE POLICY "Users can view own key history"
ON public.api_key_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can insert (logging)
CREATE POLICY "Authenticated can insert key history"
ON public.api_key_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- NO UPDATE or DELETE policies - history is immutable
