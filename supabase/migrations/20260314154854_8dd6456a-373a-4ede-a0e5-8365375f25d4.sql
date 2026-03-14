CREATE TABLE public.competitor_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  call_count integer NOT NULL DEFAULT 0,
  reset_by_admin boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.competitor_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON public.competitor_ai_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access" ON public.competitor_ai_usage
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);