
-- Tighten RLS policies added in previous migration (avoid permissive true policies)

-- ai_conversation_learnings
DROP POLICY IF EXISTS "Service role full access on learnings" ON public.ai_conversation_learnings;

CREATE POLICY "Admins can manage ai_conversation_learnings"
  ON public.ai_conversation_learnings
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ai_learned_strategies
DROP POLICY IF EXISTS "Service role full access on strategies" ON public.ai_learned_strategies;

CREATE POLICY "Admins can manage ai_learned_strategies"
  ON public.ai_learned_strategies
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
