
-- Remove duplicate SELECT policy on wallets
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
