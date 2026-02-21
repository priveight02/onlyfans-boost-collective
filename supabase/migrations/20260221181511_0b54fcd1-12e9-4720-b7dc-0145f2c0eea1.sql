-- Table to persist in-progress generation tasks across page refreshes
CREATE TABLE public.active_generation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  generation_type TEXT NOT NULL, -- video, image, audio, motion, lipsync, faceswap
  status TEXT NOT NULL DEFAULT 'processing', -- processing, success, failed
  result_url TEXT,
  prompt TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.active_generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks" ON public.active_generation_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON public.active_generation_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.active_generation_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.active_generation_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_active_gen_tasks_user ON public.active_generation_tasks(user_id);
CREATE INDEX idx_active_gen_tasks_status ON public.active_generation_tasks(status);