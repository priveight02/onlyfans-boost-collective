
-- Add folder column to ai_dm_conversations for Primary/General/Requests categorization
ALTER TABLE public.ai_dm_conversations 
ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT 'primary';

-- Add index for folder filtering
CREATE INDEX IF NOT EXISTS idx_ai_dm_conversations_folder ON public.ai_dm_conversations(account_id, folder);

-- Add is_read column for unread indicator
ALTER TABLE public.ai_dm_conversations 
ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Add last_message_preview column
ALTER TABLE public.ai_dm_conversations 
ADD COLUMN IF NOT EXISTS last_message_preview text;
