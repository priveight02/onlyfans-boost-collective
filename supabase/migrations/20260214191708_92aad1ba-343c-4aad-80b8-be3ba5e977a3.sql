-- Add response message/media columns to keyword delays
ALTER TABLE public.ai_keyword_delays 
ADD COLUMN IF NOT EXISTS response_message TEXT,
ADD COLUMN IF NOT EXISTS response_type TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS response_media_url TEXT;

-- response_type values: 'none' (just delay), 'text' (send text after delay), 'image' (send image), 'video' (send video), 'media' (send any media url)
COMMENT ON COLUMN public.ai_keyword_delays.response_type IS 'Type of response to send after delay: none, text, image, video, media';
COMMENT ON COLUMN public.ai_keyword_delays.response_message IS 'Text message to send after the delay (for text type)';
COMMENT ON COLUMN public.ai_keyword_delays.response_media_url IS 'URL of media to send after delay (for image/video/media types)';