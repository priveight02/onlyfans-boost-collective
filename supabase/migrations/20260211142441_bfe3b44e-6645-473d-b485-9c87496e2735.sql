-- Enable realtime for scripts and script_steps
ALTER PUBLICATION supabase_realtime ADD TABLE public.scripts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_steps;