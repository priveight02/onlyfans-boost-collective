
-- Add conversion_flow_phases JSONB column to persona_profiles
-- Each persona can have up to 6 conversion phases defining the AI's sales funnel behavior
ALTER TABLE public.persona_profiles 
ADD COLUMN IF NOT EXISTS conversion_flow_phases JSONB DEFAULT '[]'::jsonb;

-- Add a comment explaining the structure
COMMENT ON COLUMN public.persona_profiles.conversion_flow_phases IS 
'Array of up to 6 conversion phases. Each phase: {phase_number, name, goal, ai_instructions, transition_trigger, example_messages, redirect_url, is_active}';
