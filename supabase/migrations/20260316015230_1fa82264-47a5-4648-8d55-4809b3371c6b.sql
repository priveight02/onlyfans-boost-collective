
CREATE TABLE public.sandbox_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Sandbox',
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x":32,"y":32,"zoom":1}'::jsonb,
  bg_image_url TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sandbox_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sandbox sessions"
ON public.sandbox_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sandbox_sessions_user ON public.sandbox_sessions(user_id, is_active);
