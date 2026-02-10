
-- Scripts table (storyline definitions)
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'draft',
  target_segment TEXT NOT NULL DEFAULT 'all',
  version INTEGER NOT NULL DEFAULT 1,
  parent_script_id UUID REFERENCES public.scripts(id),
  account_id UUID REFERENCES public.managed_accounts(id),
  created_by UUID,
  total_revenue NUMERIC DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  avg_completion_rate NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage scripts" ON public.scripts FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Script steps table
CREATE TABLE public.script_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL DEFAULT 'message',
  title TEXT NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  price NUMERIC DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  condition_logic JSONB DEFAULT '{}'::jsonb,
  conversion_rate NUMERIC DEFAULT 0,
  drop_off_rate NUMERIC DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage script steps" ON public.script_steps FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_script_steps_updated_at BEFORE UPDATE ON public.script_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Automation workflows table
CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  script_id UUID REFERENCES public.scripts(id),
  account_id UUID REFERENCES public.managed_accounts(id),
  status TEXT NOT NULL DEFAULT 'inactive',
  total_runs INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workflows" ON public.automation_workflows FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.automation_workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workflow execution log
CREATE TABLE public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.scripts(id),
  account_id UUID REFERENCES public.managed_accounts(id),
  status TEXT NOT NULL DEFAULT 'running',
  current_step INTEGER DEFAULT 0,
  result JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workflow runs" ON public.workflow_runs FOR ALL USING (public.is_admin(auth.uid()));
