CREATE UNIQUE INDEX idx_wallet_transactions_unique_purchase 
ON public.wallet_transactions (reference_id, type) 
WHERE reference_id IS NOT NULL;