
-- Table to track conversations the AI is handling
CREATE TABLE public.ai_dm_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  platform_conversation_id TEXT, -- IG conversation ID
  participant_id TEXT NOT NULL, -- The fan's IG user ID
  participant_username TEXT,
  participant_name TEXT,
  participant_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, closed
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_ai_reply_at TIMESTAMP WITH TIME ZONE,
  redirect_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual messages in AI-handled conversations
CREATE TABLE public.ai_dm_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_dm_conversations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  platform_message_id TEXT,
  sender_type TEXT NOT NULL, -- 'fan' or 'ai' or 'manual'
  sender_name TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, failed, pending, typing
  ai_model TEXT,
  typing_delay_ms INTEGER,
  life_pause_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_dm_conversations_account ON public.ai_dm_conversations(account_id);
CREATE INDEX idx_ai_dm_conversations_status ON public.ai_dm_conversations(status);
CREATE INDEX idx_ai_dm_messages_conversation ON public.ai_dm_messages(conversation_id);
CREATE INDEX idx_ai_dm_messages_created ON public.ai_dm_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_dm_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage ai_dm_conversations" ON public.ai_dm_conversations FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage ai_dm_messages" ON public.ai_dm_messages FOR ALL USING (is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_dm_messages;

-- Updated_at trigger
CREATE TRIGGER update_ai_dm_conversations_updated_at
  BEFORE UPDATE ON public.ai_dm_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
