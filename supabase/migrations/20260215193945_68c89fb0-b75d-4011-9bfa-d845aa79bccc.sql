
-- =============================================
-- SECURITY HARDENING: Wallet & Credits System
-- =============================================

-- 1. DROP insecure policies that allow users to INSERT/UPDATE wallets directly
DROP POLICY IF EXISTS "System can insert wallets" ON public.wallets;
DROP POLICY IF EXISTS "System can update wallets" ON public.wallets;

-- 2. DROP insecure policies on wallet_transactions that allow admin insert from client
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.wallet_transactions;

-- 3. Wallets: Users can ONLY READ their own wallet. No client-side writes at all.
-- All writes happen via service_role in edge functions.
CREATE POLICY "Users can only read their own wallet"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Wallet transactions: Users can ONLY READ their own transactions. No client-side writes.
-- Already has a select policy, just ensure no insert/update/delete from client.
-- (The existing "Users can view their own transactions" and "Admins can view all transactions" SELECT policies are fine)

-- 5. Add explicit DENY policies for INSERT/UPDATE/DELETE on wallets for regular users
-- (RLS default-deny handles this, but let's be explicit)

-- 6. Enable realtime on wallets for live sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
