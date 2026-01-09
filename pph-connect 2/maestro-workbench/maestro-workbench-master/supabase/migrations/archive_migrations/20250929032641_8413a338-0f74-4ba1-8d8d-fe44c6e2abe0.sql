-- Add last_sign_in_at to profiles and RPC to update it
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Function to mark last sign-in time for the current user
CREATE OR REPLACE FUNCTION public.mark_last_sign_in()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in_at = now()
  WHERE id = auth.uid();
END;
$$;