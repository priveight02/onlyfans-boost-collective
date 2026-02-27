
-- Table to persist comment automation state so it works server-side (even when user is offline)
CREATE TABLE public.comment_automation_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  auto_reply BOOLEAN NOT NULL DEFAULT false,
  auto_like_comments BOOLEAN NOT NULL DEFAULT false,
  auto_like_replies BOOLEAN NOT NULL DEFAULT false,
  auto_hide_negative BOOLEAN NOT NULL DEFAULT false,
  auto_pin_best BOOLEAN NOT NULL DEFAULT false,
  auto_thank_fans BOOLEAN NOT NULL DEFAULT false,
  auto_dm_buyers BOOLEAN NOT NULL DEFAULT false,
  auto_follow_fans BOOLEAN NOT NULL DEFAULT false,
  auto_cta_inject BOOLEAN NOT NULL DEFAULT false,
  auto_boost BOOLEAN NOT NULL DEFAULT false,
  auto_question_responder BOOLEAN NOT NULL DEFAULT false,
  auto_lead_capture BOOLEAN NOT NULL DEFAULT false,
  redirect_url TEXT,
  processed_comment_ids TEXT[] DEFAULT '{}',
  stats JSONB DEFAULT '{"replied":0,"liked":0,"likedReplies":0,"hidden":0,"pinned":0,"dmd":0,"followed":0,"ctas":0,"boosted":0,"questions":0,"leads":0}',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, post_id, platform)
);

ALTER TABLE public.comment_automation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own comment automation" ON public.comment_automation_state
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_comment_automation_state_updated_at
  BEFORE UPDATE ON public.comment_automation_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
