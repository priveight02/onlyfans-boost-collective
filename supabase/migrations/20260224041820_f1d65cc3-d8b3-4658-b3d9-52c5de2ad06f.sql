-- Add platform_user_id to ai_dm_conversations to track which IG account owns each conversation
ALTER TABLE public.ai_dm_conversations ADD COLUMN platform_user_id TEXT;

-- Add platform_user_id to ai_dm_messages for consistency
ALTER TABLE public.ai_dm_messages ADD COLUMN platform_user_id TEXT;

-- Add platform_user_id to ai_conversation_learnings for consistency
ALTER TABLE public.ai_conversation_learnings ADD COLUMN platform_user_id TEXT;

-- Index for fast filtering
CREATE INDEX idx_ai_dm_conversations_platform_user ON public.ai_dm_conversations(account_id, platform, platform_user_id);