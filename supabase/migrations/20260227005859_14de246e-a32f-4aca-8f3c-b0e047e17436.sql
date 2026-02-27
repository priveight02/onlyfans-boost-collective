-- Fix overly-permissive RLS on comment_automation_state (scope to the account owner)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='comment_automation_state' AND policyname='Users can manage their own comment automation'
  ) THEN
    DROP POLICY "Users can manage their own comment automation" ON public.comment_automation_state;
  END IF;
END $$;

-- Ensure RLS stays enabled
ALTER TABLE public.comment_automation_state ENABLE ROW LEVEL SECURITY;

-- Policies: only allow access if the managed_accounts.user_id matches auth.uid()
CREATE POLICY "Comment automation: select own accounts"
ON public.comment_automation_state
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.managed_accounts ma
    WHERE ma.id::text = comment_automation_state.account_id
      AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "Comment automation: insert own accounts"
ON public.comment_automation_state
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.managed_accounts ma
    WHERE ma.id::text = comment_automation_state.account_id
      AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "Comment automation: update own accounts"
ON public.comment_automation_state
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.managed_accounts ma
    WHERE ma.id::text = comment_automation_state.account_id
      AND ma.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.managed_accounts ma
    WHERE ma.id::text = comment_automation_state.account_id
      AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "Comment automation: delete own accounts"
ON public.comment_automation_state
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.managed_accounts ma
    WHERE ma.id::text = comment_automation_state.account_id
      AND ma.user_id = auth.uid()
  )
);

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_comment_automation_state_account_platform
ON public.comment_automation_state (account_id, platform);
