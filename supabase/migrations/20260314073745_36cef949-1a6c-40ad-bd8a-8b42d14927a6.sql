
CREATE TABLE public.competitor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  display_name TEXT,
  avatar_url TEXT,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts INTEGER DEFAULT 0,
  engagement_rate NUMERIC(6,2) DEFAULT 0,
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  growth_rate NUMERIC(6,2) DEFAULT 0,
  post_frequency NUMERIC(4,1) DEFAULT 0,
  top_hashtags TEXT[] DEFAULT '{}',
  content_types JSONB DEFAULT '[]',
  threat_score INTEGER DEFAULT 0,
  last_analyzed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own competitor profiles"
  ON public.competitor_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
