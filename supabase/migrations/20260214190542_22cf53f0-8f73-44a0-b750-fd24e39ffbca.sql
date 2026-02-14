
-- Table for keyword-based AI response delays
CREATE TABLE public.ai_keyword_delays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  delay_seconds INTEGER NOT NULL DEFAULT 30,
  direction TEXT NOT NULL DEFAULT 'before' CHECK (direction IN ('before', 'after', 'both')),
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'starts_with', 'ends_with')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_keyword_delays ENABLE ROW LEVEL SECURITY;

-- Admin-only access via is_admin function
CREATE POLICY "Admins can manage keyword delays"
  ON public.ai_keyword_delays
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Index for fast lookup
CREATE INDEX idx_ai_keyword_delays_account ON public.ai_keyword_delays(account_id, is_active);

-- Timestamp trigger
CREATE TRIGGER update_ai_keyword_delays_updated_at
  BEFORE UPDATE ON public.ai_keyword_delays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
