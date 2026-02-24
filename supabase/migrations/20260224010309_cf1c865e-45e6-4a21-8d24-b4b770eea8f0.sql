
-- Add user_id to managed_accounts
ALTER TABLE public.managed_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill existing managed_accounts with the first admin user so they don't break
-- (We won't backfill since we don't know which user owns them - they'll be accessible to admins only)

-- Add user_id to social_connections 
ALTER TABLE public.social_connections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop old unique constraint and create new one scoped by user_id
ALTER TABLE public.social_connections DROP CONSTRAINT IF EXISTS social_connections_account_id_platform_key;
ALTER TABLE public.social_connections ADD CONSTRAINT social_connections_account_id_platform_user_key UNIQUE (account_id, platform, user_id);

-- Update RLS on managed_accounts: users see only their own accounts, admins see all
DROP POLICY IF EXISTS "Admins can view managed accounts" ON public.managed_accounts;
DROP POLICY IF EXISTS "Admins can insert managed accounts" ON public.managed_accounts;
DROP POLICY IF EXISTS "Admins can update managed accounts" ON public.managed_accounts;
DROP POLICY IF EXISTS "Admins can delete managed accounts" ON public.managed_accounts;

CREATE POLICY "Users can view their own managed accounts"
ON public.managed_accounts FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can insert their own managed accounts"
ON public.managed_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can update their own managed accounts"
ON public.managed_accounts FOR UPDATE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own managed accounts"
ON public.managed_accounts FOR DELETE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Update RLS on social_connections: users see only their own, admins see all
DROP POLICY IF EXISTS "Admins can manage social_connections" ON public.social_connections;

CREATE POLICY "Users can view their own social connections"
ON public.social_connections FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can insert their own social connections"
ON public.social_connections FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can update their own social connections"
ON public.social_connections FOR UPDATE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own social connections"
ON public.social_connections FOR DELETE
USING (auth.uid() = user_id OR is_admin(auth.uid()));
