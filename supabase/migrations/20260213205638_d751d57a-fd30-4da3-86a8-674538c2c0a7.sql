
-- Add unique constraint for upsert on conversations
ALTER TABLE public.ai_dm_conversations ADD CONSTRAINT ai_dm_conversations_account_platform_convo_unique UNIQUE (account_id, platform_conversation_id);
