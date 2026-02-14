-- Add fan behavior classification columns
ALTER TABLE public.fan_emotional_profiles 
ADD COLUMN IF NOT EXISTS behavior_type TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS behavior_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS behavior_updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS conversation_style TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS response_pattern TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS engagement_velocity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS topics_discussed TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS media_shared_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_message_length NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_behavior_analysis JSONB DEFAULT NULL;

-- Add index for quick lookup by account+fan
CREATE INDEX IF NOT EXISTS idx_fan_emotional_profiles_account_fan ON public.fan_emotional_profiles(account_id, fan_identifier);