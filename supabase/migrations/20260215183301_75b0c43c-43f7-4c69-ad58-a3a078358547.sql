
-- Allow users to delete their own login activity
CREATE POLICY "Users can delete own login activity"
ON public.login_activity
FOR DELETE
USING (auth.uid() = user_id);
