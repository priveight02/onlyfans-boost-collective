
-- Chat rooms
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'group',
  created_by UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rooms" ON public.chat_rooms FOR ALL USING (public.is_admin(auth.uid()));

-- Chat room members
CREATE TABLE public.chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  user_id UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage members" ON public.chat_room_members FOR ALL USING (public.is_admin(auth.uid()));

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_id UUID,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage messages" ON public.chat_messages FOR ALL USING (public.is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- Triggers
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can delete own chat files"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated');
