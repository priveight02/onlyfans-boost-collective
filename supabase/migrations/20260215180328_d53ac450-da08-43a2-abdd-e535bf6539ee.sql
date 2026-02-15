
-- Add email change tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS original_email text,
ADD COLUMN IF NOT EXISTS email_change_count integer NOT NULL DEFAULT 0;

-- Backfill original_email from current email
UPDATE public.profiles SET original_email = email WHERE original_email IS NULL;

-- Update handle_new_user to set original_email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, original_email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email,
    LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '_')) || '_' || SUBSTR(NEW.id::text, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$function$;
