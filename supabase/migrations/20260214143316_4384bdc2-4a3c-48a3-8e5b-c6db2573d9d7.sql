
-- ML Learning Engine: tracks what works per behavior type across all conversations
CREATE TABLE public.ai_conversation_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL,
  behavior_type TEXT NOT NULL DEFAULT 'unknown',
  strategy_type TEXT NOT NULL DEFAULT 'general',
  message_sent TEXT NOT NULL,
  fan_response TEXT,
  outcome TEXT NOT NULL DEFAULT 'neutral',
  engagement_delta NUMERIC DEFAULT 0,
  redirect_success BOOLEAN DEFAULT false,
  conversation_id TEXT,
  fan_identifier TEXT,
  context_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by account + behavior type
CREATE INDEX idx_learnings_account_behavior ON public.ai_conversation_learnings(account_id, behavior_type);
CREATE INDEX idx_learnings_outcome ON public.ai_conversation_learnings(account_id, outcome);
CREATE INDEX idx_learnings_strategy ON public.ai_conversation_learnings(account_id, strategy_type);

-- Enable RLS
ALTER TABLE public.ai_conversation_learnings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access on learnings"
  ON public.ai_conversation_learnings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Aggregated insights view for fast prompt injection
CREATE TABLE public.ai_learned_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL,
  behavior_type TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  winning_patterns JSONB DEFAULT '[]',
  losing_patterns JSONB DEFAULT '[]',
  avg_engagement_score NUMERIC DEFAULT 0,
  total_samples INTEGER DEFAULT 0,
  redirect_success_rate NUMERIC DEFAULT 0,
  best_openers JSONB DEFAULT '[]',
  best_hooks JSONB DEFAULT '[]',
  best_recovery_lines JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, behavior_type, strategy_type)
);

ALTER TABLE public.ai_learned_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on strategies"
  ON public.ai_learned_strategies
  FOR ALL
  USING (true)
  WITH CHECK (true);
