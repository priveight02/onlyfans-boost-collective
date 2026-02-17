
-- ============================================================
-- ENTERPRISE ADMIN PLATFORM — FULL SCHEMA
-- ============================================================

-- 1. FEATURE FLAGS & EXPERIMENTS
CREATE TABLE public.feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  flag_type text NOT NULL DEFAULT 'boolean',
  enabled boolean NOT NULL DEFAULT false,
  percentage_rollout integer DEFAULT 0,
  targeting_rules jsonb DEFAULT '[]'::jsonb,
  default_value jsonb DEFAULT 'false'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.feature_flag_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'user',
  attribute text NOT NULL,
  operator text NOT NULL DEFAULT 'equals',
  value jsonb NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.feature_flag_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  user_id uuid,
  org_id uuid,
  result boolean NOT NULL,
  rule_matched uuid,
  context jsonb DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  hypothesis text,
  flag_id uuid REFERENCES public.feature_flags(id),
  status text NOT NULL DEFAULT 'draft',
  variant_config jsonb DEFAULT '[]'::jsonb,
  success_metric text,
  started_at timestamptz,
  ended_at timestamptz,
  results jsonb DEFAULT '{}'::jsonb,
  auto_rollback_on_error boolean NOT NULL DEFAULT true,
  error_threshold numeric DEFAULT 5.0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. AUDIT LOGS & POLICY DECISIONS (IMMUTABLE)
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  actor_type text NOT NULL DEFAULT 'user',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  diff jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.policy_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name text NOT NULL,
  actor_id uuid,
  actor_type text NOT NULL DEFAULT 'user',
  resource_type text NOT NULL,
  resource_id text,
  action text NOT NULL,
  decision text NOT NULL DEFAULT 'deny',
  reason text,
  context jsonb DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ADMIN SESSIONS
CREATE TABLE public.admin_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  mfa_verified boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  is_active boolean NOT NULL DEFAULT true
);

-- 4. AI MODELS & GOVERNANCE
CREATE TABLE public.ai_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  provider text NOT NULL,
  model_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  description text,
  capabilities jsonb DEFAULT '[]'::jsonb,
  pricing_input numeric DEFAULT 0,
  pricing_output numeric DEFAULT 0,
  max_tokens integer DEFAULT 4096,
  rate_limit_rpm integer DEFAULT 60,
  rate_limit_tpd integer DEFAULT 1000000,
  is_default boolean NOT NULL DEFAULT false,
  kill_switch boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deprecated_at timestamptz
);

CREATE TABLE public.model_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  changelog text,
  config_override jsonb DEFAULT '{}'::jsonb,
  canary_percentage integer DEFAULT 0,
  promoted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prompt_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  model_id uuid REFERENCES public.ai_models(id),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prompt_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.prompt_templates(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  change_reason text,
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.safety_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  rule_type text NOT NULL DEFAULT 'content_filter',
  pattern text,
  action text NOT NULL DEFAULT 'block',
  severity text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  applies_to jsonb DEFAULT '["all"]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. AI REQUESTS & TOKEN TRACKING
CREATE TABLE public.ai_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  org_id uuid,
  model_id uuid REFERENCES public.ai_models(id),
  prompt_template_id uuid REFERENCES public.prompt_templates(id),
  status text NOT NULL DEFAULT 'pending',
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  input_text text,
  output_text text,
  latency_ms integer,
  cost_cents numeric DEFAULT 0,
  error_message text,
  safety_flagged boolean NOT NULL DEFAULT false,
  safety_rule_id uuid REFERENCES public.safety_rules(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.token_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  org_id uuid,
  model_id uuid REFERENCES public.ai_models(id),
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_cents numeric NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.token_buckets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'user',
  entity_id uuid NOT NULL,
  model_id uuid REFERENCES public.ai_models(id),
  max_tokens_per_day integer NOT NULL DEFAULT 100000,
  max_tokens_per_month integer NOT NULL DEFAULT 3000000,
  tokens_used_today integer NOT NULL DEFAULT 0,
  tokens_used_month integer NOT NULL DEFAULT 0,
  last_reset_daily timestamptz NOT NULL DEFAULT now(),
  last_reset_monthly timestamptz NOT NULL DEFAULT now(),
  is_throttled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'user',
  entity_id uuid,
  model_id uuid REFERENCES public.ai_models(id),
  requests_per_minute integer NOT NULL DEFAULT 60,
  requests_per_hour integer NOT NULL DEFAULT 1000,
  requests_per_day integer NOT NULL DEFAULT 10000,
  current_minute_count integer NOT NULL DEFAULT 0,
  current_hour_count integer NOT NULL DEFAULT 0,
  current_day_count integer NOT NULL DEFAULT 0,
  last_request_at timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. INCIDENTS & OPS
CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  incident_type text NOT NULL DEFAULT 'system',
  affected_services jsonb DEFAULT '[]'::jsonb,
  affected_users_count integer DEFAULT 0,
  blast_radius text,
  root_cause text,
  mitigation_steps jsonb DEFAULT '[]'::jsonb,
  resolution text,
  show_banner boolean NOT NULL DEFAULT false,
  banner_message text,
  created_by uuid,
  assigned_to uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  postmortem text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.incident_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  update_type text NOT NULL DEFAULT 'status',
  message text NOT NULL,
  status_change text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. JOBS & BACKGROUND PROCESSING
CREATE TABLE public.system_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 0,
  payload jsonb DEFAULT '{}'::jsonb,
  result jsonb,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. WEBHOOKS
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret text,
  is_active boolean NOT NULL DEFAULT true,
  retry_config jsonb DEFAULT '{"max_retries": 3, "backoff_ms": 1000}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempt_number integer NOT NULL DEFAULT 1,
  delivered_at timestamptz,
  next_retry_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. SYSTEM HEALTH METRICS
CREATE TABLE public.system_health (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  unit text DEFAULT 'ms',
  service text NOT NULL,
  status text NOT NULL DEFAULT 'healthy',
  threshold_warning numeric,
  threshold_critical numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- 10. GLOBAL SETTINGS / KILL SWITCHES
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_sensitive boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_ai_requests_user ON public.ai_requests(user_id);
CREATE INDEX idx_ai_requests_model ON public.ai_requests(model_id);
CREATE INDEX idx_ai_requests_status ON public.ai_requests(status);
CREATE INDEX idx_ai_requests_created ON public.ai_requests(created_at DESC);
CREATE INDEX idx_token_usage_user ON public.token_usage(user_id);
CREATE INDEX idx_token_usage_period ON public.token_usage(period_start, period_end);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX idx_feature_flag_evals ON public.feature_flag_evaluations(flag_id, evaluated_at DESC);
CREATE INDEX idx_policy_decisions_actor ON public.policy_decisions(actor_id);
CREATE INDEX idx_system_health_service ON public.system_health(service, recorded_at DESC);
CREATE INDEX idx_system_jobs_status ON public.system_jobs(status);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status);

-- ============================================================
-- RLS POLICIES (Admin-only for all enterprise tables)
-- ============================================================
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Feature Flags
CREATE POLICY "Admins manage feature_flags" ON public.feature_flags FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage feature_flag_rules" ON public.feature_flag_rules FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins view flag_evaluations" ON public.feature_flag_evaluations FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage experiments" ON public.experiments FOR ALL USING (is_admin(auth.uid()));

-- Audit & Policy
CREATE POLICY "Admins view audit_logs" ON public.audit_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "System can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view policy_decisions" ON public.policy_decisions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "System can insert policy_decisions" ON public.policy_decisions FOR INSERT WITH CHECK (true);

-- Admin Sessions
CREATE POLICY "Admins manage admin_sessions" ON public.admin_sessions FOR ALL USING (is_admin(auth.uid()));

-- AI Models & Governance
CREATE POLICY "Admins manage ai_models" ON public.ai_models FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage model_versions" ON public.model_versions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage prompt_templates" ON public.prompt_templates FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage prompt_versions" ON public.prompt_versions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage safety_rules" ON public.safety_rules FOR ALL USING (is_admin(auth.uid()));

-- AI Requests & Tokens
CREATE POLICY "Admins manage ai_requests" ON public.ai_requests FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage token_usage" ON public.token_usage FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage token_buckets" ON public.token_buckets FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage rate_limits" ON public.rate_limits FOR ALL USING (is_admin(auth.uid()));

-- Incidents & Ops
CREATE POLICY "Admins manage incidents" ON public.incidents FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage incident_updates" ON public.incident_updates FOR ALL USING (is_admin(auth.uid()));

-- Jobs
CREATE POLICY "Admins manage system_jobs" ON public.system_jobs FOR ALL USING (is_admin(auth.uid()));

-- Webhooks
CREATE POLICY "Admins manage webhooks" ON public.webhooks FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage webhook_deliveries" ON public.webhook_deliveries FOR ALL USING (is_admin(auth.uid()));

-- System Health & Settings
CREATE POLICY "Admins view system_health" ON public.system_health FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage system_settings" ON public.system_settings FOR ALL USING (is_admin(auth.uid()));

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_health;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON public.ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON public.prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_rules_updated_at BEFORE UPDATE ON public.safety_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_token_buckets_updated_at BEFORE UPDATE ON public.token_buckets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON public.rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED SYSTEM SETTINGS (Kill Switches & Global Config)
-- ============================================================
INSERT INTO public.system_settings (key, value, description, category) VALUES
  ('ai_global_kill_switch', 'false', 'Emergency kill switch for all AI operations', 'ai'),
  ('emergency_readonly_mode', 'false', 'Enable read-only mode for entire platform', 'security'),
  ('maintenance_mode', 'false', 'Enable maintenance mode', 'system'),
  ('max_concurrent_ai_jobs', '50', 'Maximum concurrent AI jobs', 'ai'),
  ('session_timeout_minutes', '60', 'Admin session timeout in minutes', 'security'),
  ('audit_retention_days', '365', 'Days to retain audit logs', 'compliance'),
  ('incident_auto_banner', 'true', 'Auto-show banner for critical incidents', 'incidents');
