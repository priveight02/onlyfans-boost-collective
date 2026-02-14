
-- Add gender column to fetched_followers for male/female filtering
ALTER TABLE public.fetched_followers ADD COLUMN IF NOT EXISTS gender text DEFAULT null;

-- Add index for efficient gender filtering
CREATE INDEX IF NOT EXISTS idx_fetched_followers_gender ON public.fetched_followers(account_id, gender);
