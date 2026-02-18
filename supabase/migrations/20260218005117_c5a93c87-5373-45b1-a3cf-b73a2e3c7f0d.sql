
-- API Keys table for modern API key authentication
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  rate_limit_daily INTEGER NOT NULL DEFAULT 10000,
  last_used_at TIMESTAMP WITH TIME ZONE,
  requests_today INTEGER NOT NULL DEFAULT 0,
  requests_total BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own API keys
CREATE POLICY "Users can view own api keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can create own api keys"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own api keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own api keys"
ON public.api_keys FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all API keys
CREATE POLICY "Admins can view all api keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can manage all API keys
CREATE POLICY "Admins can manage all api keys"
ON public.api_keys FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
