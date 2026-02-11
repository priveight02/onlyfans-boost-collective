
-- Table to persist auto-respond on/off state per account
CREATE TABLE public.auto_respond_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  redirect_url TEXT,
  trigger_keywords TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(account_id)
);

ALTER TABLE public.auto_respond_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto_respond_state" ON public.auto_respond_state
  FOR ALL USING (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_respond_state;
