-- Update RLS policies to include root user permissions
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can manage templates" ON public.task_templates;
DROP POLICY IF EXISTS "Managers can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can manage assignments" ON public.project_assignments;

-- Root and managers can view all profiles
CREATE POLICY "Root and managers can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('root', 'manager')
  )
);

-- Root and managers can update profiles
CREATE POLICY "Root and managers can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('root', 'manager')
  )
);

-- Root and managers can insert profiles (for invitations)
CREATE POLICY "Root and managers can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('root', 'manager')
  )
);

-- Root can delete profiles
CREATE POLICY "Root can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'root'
  )
);

-- Update other policies to include root
CREATE POLICY "Root and managers can manage templates" 
ON public.task_templates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('root', 'manager')
  )
);

CREATE POLICY "Root and managers can manage projects" 
ON public.projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('root', 'manager')
  )
);

CREATE POLICY "Root and managers can manage assignments" 
ON public.project_assignments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('root', 'manager')
  )
);

-- Create table for pending invitations
CREATE TABLE public.user_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  initial_password_hash TEXT NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Only root and managers can manage invitations
CREATE POLICY "Root and managers can manage invitations" 
ON public.user_invitations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('root', 'manager')
  )
);

-- Create trigger for invitation timestamps
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.user_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create user invitation
CREATE OR REPLACE FUNCTION public.create_user_invitation(
  _email TEXT,
  _role user_role,
  _initial_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Generate password hash
  password_hash := crypt(_initial_password, gen_salt('bf'));

  -- Create invitation
  INSERT INTO user_invitations (email, role, invited_by, initial_password_hash)
  VALUES (_email, _role, auth.uid(), password_hash)
  RETURNING id INTO invitation_id;

  RETURN invitation_id;
END;
$$;