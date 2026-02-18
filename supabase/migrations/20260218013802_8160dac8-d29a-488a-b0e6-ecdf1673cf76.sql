
-- Tighten insert policy to only allow users to log their own key actions
DROP POLICY "Authenticated can insert key history" ON public.api_key_history;
CREATE POLICY "Users can insert own key history"
ON public.api_key_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() = action_by);
