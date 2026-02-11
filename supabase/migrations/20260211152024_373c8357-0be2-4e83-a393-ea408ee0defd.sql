
-- Table to store custom cloned voices and preset voices for TTS
CREATE TABLE public.copilot_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sample_urls TEXT[] DEFAULT '{}',
  elevenlabs_voice_id TEXT,
  is_preset BOOLEAN DEFAULT false,
  preview_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view voices" ON public.copilot_voices FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert voices" ON public.copilot_voices FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update voices" ON public.copilot_voices FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete voices" ON public.copilot_voices FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_copilot_voices_updated_at
  BEFORE UPDATE ON public.copilot_voices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed preset ElevenLabs voices
INSERT INTO public.copilot_voices (name, description, elevenlabs_voice_id, is_preset) VALUES
  ('Roger', 'Male, mature, warm', 'CwhRBWXzGAHq8TQ4Fs17', true),
  ('Sarah', 'Female, soft, young', 'EXAVITQu4vr4xnSDxMaL', true),
  ('Laura', 'Female, warm, professional', 'FGY2WhTYpPnrIDTdsKH5', true),
  ('Charlie', 'Male, casual, Australian', 'IKne3meq5aSn9XLyUdCD', true),
  ('George', 'Male, British, authoritative', 'JBFqnCBsd6RMkjVDRZzb', true),
  ('River', 'Non-binary, calm, smooth', 'SAz9YHcvj6GT2YYXdXww', true),
  ('Liam', 'Male, young, American', 'TX3LPaxmHKxFdv7VOQHJ', true),
  ('Alice', 'Female, British, confident', 'Xb7hH8MSUJpSbSDYk0k2', true),
  ('Matilda', 'Female, warm, storytelling', 'XrExE9yKIg1WjnnlVkGX', true),
  ('Jessica', 'Female, expressive, American', 'cgSgspJ2msm6clMCkdW9', true),
  ('Eric', 'Male, friendly, American', 'cjVigY5qzO86Huf0OWal', true),
  ('Chris', 'Male, casual, American', 'iP95p4xoKVk53GoZ742B', true),
  ('Brian', 'Male, deep, narrator', 'nPczCjzI2devNBz1zQrb', true),
  ('Daniel', 'Male, British, news anchor', 'onwK4e9ZLuTAKqWW03F9', true),
  ('Lily', 'Female, British, gentle', 'pFZP5JQG7iQjIQuC4Bku', true),
  ('Bill', 'Male, American, trustworthy', 'pqHfZKP75CvOlQylNhV4', true);
