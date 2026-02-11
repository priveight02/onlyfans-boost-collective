
-- =============================================
-- MODULE 1: PERSONA DNA ENGINE
-- =============================================
CREATE TABLE public.persona_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  -- Personality
  tone TEXT NOT NULL DEFAULT 'playful',
  vocabulary_style TEXT NOT NULL DEFAULT 'casual',
  emotional_range TEXT NOT NULL DEFAULT 'medium',
  brand_identity TEXT,
  boundaries TEXT,
  personality_traits JSONB DEFAULT '[]'::jsonb,
  communication_rules JSONB DEFAULT '{}'::jsonb,
  -- Emotional State
  motivation_level INTEGER DEFAULT 70 CHECK (motivation_level >= 0 AND motivation_level <= 100),
  stress_level INTEGER DEFAULT 30 CHECK (stress_level >= 0 AND stress_level <= 100),
  burnout_risk INTEGER DEFAULT 20 CHECK (burnout_risk >= 0 AND burnout_risk <= 100),
  mood TEXT DEFAULT 'neutral',
  last_mood_update TIMESTAMPTZ DEFAULT now(),
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.persona_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage persona profiles" ON public.persona_profiles FOR ALL USING (is_admin(auth.uid()));
CREATE TRIGGER update_persona_profiles_updated_at BEFORE UPDATE ON public.persona_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Persona consistency logs
CREATE TABLE public.persona_consistency_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL DEFAULT 'script',
  content_checked TEXT,
  consistency_score INTEGER DEFAULT 0,
  issues JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.persona_consistency_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage consistency checks" ON public.persona_consistency_checks FOR ALL USING (is_admin(auth.uid()));

-- =============================================
-- MODULE 2: CONTENT COMMAND CENTER
-- =============================================
CREATE TABLE public.content_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'post',
  platform TEXT NOT NULL DEFAULT 'onlyfans',
  status TEXT NOT NULL DEFAULT 'planned',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}'::text[],
  cta TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  viral_score INTEGER DEFAULT 0,
  engagement_prediction NUMERIC DEFAULT 0,
  ai_suggestions JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage content calendar" ON public.content_calendar FOR ALL USING (is_admin(auth.uid()));
CREATE TRIGGER update_content_calendar_updated_at BEFORE UPDATE ON public.content_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- MODULE 3: EMOTIONAL HEATMAP
-- =============================================
CREATE TABLE public.fan_emotional_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  fan_identifier TEXT NOT NULL,
  fan_name TEXT,
  attachment_level INTEGER DEFAULT 50 CHECK (attachment_level >= 0 AND attachment_level <= 100),
  spending_motivation TEXT DEFAULT 'emotional',
  emotional_triggers JSONB DEFAULT '[]'::jsonb,
  obsession_risk INTEGER DEFAULT 0 CHECK (obsession_risk >= 0 AND obsession_risk <= 100),
  conflict_risk INTEGER DEFAULT 0 CHECK (conflict_risk >= 0 AND conflict_risk <= 100),
  churn_risk INTEGER DEFAULT 0 CHECK (churn_risk >= 0 AND churn_risk <= 100),
  total_spent NUMERIC DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  sentiment_history JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fan_emotional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fan profiles" ON public.fan_emotional_profiles FOR ALL USING (is_admin(auth.uid()));
CREATE TRIGGER update_fan_emotional_profiles_updated_at BEFORE UPDATE ON public.fan_emotional_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- MODULE 4: AI CO-PILOT
-- =============================================
CREATE TABLE public.copilot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT DEFAULT 'New Conversation',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_type TEXT DEFAULT 'general',
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage copilot conversations" ON public.copilot_conversations FOR ALL USING (is_admin(auth.uid()));
CREATE TRIGGER update_copilot_conversations_updated_at BEFORE UPDATE ON public.copilot_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.persona_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_calendar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fan_emotional_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.copilot_conversations;
