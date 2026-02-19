-- Drop old check constraint and add new one with plan_change and upgrade_credit types
ALTER TABLE public.wallet_transactions DROP CONSTRAINT wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type = ANY (ARRAY['purchase'::text, 'spend'::text, 'refund'::text, 'bonus'::text, 'admin_grant'::text, 'plan_change'::text, 'upgrade_credit'::text]));