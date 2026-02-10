
-- Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'nda',
  status TEXT NOT NULL DEFAULT 'draft',
  content TEXT,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE SET NULL,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_by UUID,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  signature_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage contracts" ON public.contracts FOR ALL USING (public.is_admin(auth.uid()));

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_by UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL USING (public.is_admin(auth.uid()));

-- Message threads table
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  subscriber_name TEXT,
  subscriber_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_chatter UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'normal',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage threads" ON public.message_threads FOR ALL USING (public.is_admin(auth.uid()));

-- Financial records table
CREATE TABLE public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  period_start DATE,
  period_end DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage financials" ON public.financial_records FOR ALL USING (public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_message_threads_updated_at BEFORE UPDATE ON public.message_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
