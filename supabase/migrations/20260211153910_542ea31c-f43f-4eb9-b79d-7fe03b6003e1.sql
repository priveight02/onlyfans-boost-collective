
-- Table to persist all copilot-generated content (images, videos, audio)
CREATE TABLE public.copilot_generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL DEFAULT 'image', -- image, video, audio
  prompt TEXT,
  url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  mode TEXT DEFAULT 'image', -- which tab generated it
  aspect_ratio TEXT,
  quality_mode TEXT DEFAULT 'best',
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage generated content"
  ON public.copilot_generated_content
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE INDEX idx_copilot_generated_content_type ON public.copilot_generated_content(content_type);
CREATE INDEX idx_copilot_generated_content_mode ON public.copilot_generated_content(mode);
CREATE INDEX idx_copilot_generated_content_created ON public.copilot_generated_content(created_at DESC);
