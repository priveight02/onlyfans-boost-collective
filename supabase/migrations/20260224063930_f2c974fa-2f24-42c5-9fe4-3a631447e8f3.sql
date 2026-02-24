
-- Create atomic increment function for daily sent counter
CREATE OR REPLACE FUNCTION public.increment_daily_sent(p_account_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auto_respond_state
  SET daily_sent_count = daily_sent_count + 1
  WHERE account_id = p_account_id;
END;
$$;
