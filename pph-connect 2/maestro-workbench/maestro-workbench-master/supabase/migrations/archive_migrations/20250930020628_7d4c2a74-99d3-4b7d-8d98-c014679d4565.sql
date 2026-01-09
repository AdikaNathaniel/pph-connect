-- Enable pgcrypto for crypt/gen_salt used by create_user_invitation
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Ensure function explicitly references public.gen_salt to avoid search_path issues
CREATE OR REPLACE FUNCTION public.create_user_invitation(_email text, _role user_role, _initial_password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_id UUID;
  password_hash TEXT;
BEGIN
  -- Check if caller is root or manager
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role IN ('root', 'manager')
  ) THEN
    RAISE EXCEPTION 'Only root users and managers can create invitations';
  END IF;

  -- Generate password hash using pgcrypto
  password_hash := crypt(_initial_password, public.gen_salt('bf'));

  -- Create invitation
  INSERT INTO user_invitations (email, role, invited_by, initial_password_hash)
  VALUES (_email, _role, auth.uid(), password_hash)
  RETURNING id INTO invitation_id;

  RETURN invitation_id;
END;
$function$;