-- Add suspended column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN suspended boolean NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.profiles.suspended IS 'Whether the user account is suspended';