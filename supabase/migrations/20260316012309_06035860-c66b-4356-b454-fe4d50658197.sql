
CREATE TABLE public.sandbox_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_format TEXT NOT NULL DEFAULT 'png',
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  target_platform TEXT,
  target_tab TEXT DEFAULT 'content',
  source_element_ids TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sandbox_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sandbox exports"
  ON public.sandbox_exports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sandbox exports"
  ON public.sandbox_exports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sandbox exports"
  ON public.sandbox_exports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sandbox exports"
  ON public.sandbox_exports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
