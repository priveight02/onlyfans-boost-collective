
-- Create table to permanently store fetched followers per account
CREATE TABLE public.fetched_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL,
  ig_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT,
  profile_pic_url TEXT,
  source TEXT NOT NULL DEFAULT 'fetched',
  is_private BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  metadata JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, ig_user_id)
);

-- Enable RLS
ALTER TABLE public.fetched_followers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage fetched followers
CREATE POLICY "Authenticated users can view fetched followers"
  ON public.fetched_followers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert fetched followers"
  ON public.fetched_followers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fetched followers"
  ON public.fetched_followers FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete fetched followers"
  ON public.fetched_followers FOR DELETE
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_fetched_followers_account ON public.fetched_followers(account_id);
CREATE INDEX idx_fetched_followers_source ON public.fetched_followers(account_id, source);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fetched_followers;
