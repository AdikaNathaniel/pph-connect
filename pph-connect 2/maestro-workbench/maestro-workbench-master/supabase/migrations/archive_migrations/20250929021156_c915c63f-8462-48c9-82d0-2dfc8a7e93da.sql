-- Fix RLS infinite recursion on profiles by using SECURITY DEFINER helper functions
-- 1) Helper functions (bypass RLS and avoid recursive self-references)
CREATE OR REPLACE FUNCTION public.is_root_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('root','manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_root(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'root'
  );
$$;

-- 2) Recreate profiles policies without self-referencing subqueries
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Root and managers can create profiles" ON public.profiles;
CREATE POLICY "Root and managers can create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (public.is_root_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Root and managers can update profiles" ON public.profiles;
CREATE POLICY "Root and managers can update profiles"
ON public.profiles
FOR UPDATE
USING (public.is_root_or_manager(auth.uid()))
WITH CHECK (public.is_root_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Root and managers can view all profiles" ON public.profiles;
CREATE POLICY "Root and managers can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_root_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Root can delete profiles" ON public.profiles;
CREATE POLICY "Root can delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_root(auth.uid()));

-- Keep user self-access policies (recreate to ensure consistency)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
