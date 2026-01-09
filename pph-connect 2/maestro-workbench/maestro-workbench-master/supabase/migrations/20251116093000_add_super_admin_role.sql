-- Migration: Use super_admin role and sync legacy root references
-- Created: 2025-11-16
-- Purpose: Replace legacy "root" role with "super_admin", update helper functions, and ensure
--          role-based policies treat super_admin as the highest privilege.
-- Note: The enum value 'super_admin' must already exist (added in previous migration).
-- ============================================================================

-- Normalize legacy data (requires super_admin enum value to exist)
UPDATE public.profiles SET role = 'super_admin' WHERE role = 'root';
UPDATE public.user_invitations SET role = 'super_admin' WHERE role = 'root';
UPDATE public.workers SET worker_role = 'super_admin' WHERE worker_role = 'root';

-- Helper to detect highest privilege
CREATE OR REPLACE FUNCTION public.is_root(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('super_admin', 'root')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_root_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('super_admin', 'admin', 'manager', 'root')
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role = 'super_admin' AND NOT public.is_root(auth.uid()) THEN
        RAISE EXCEPTION 'Only super_admin can assign the super_admin role';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_send_messages(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role IN ('super_admin', 'admin', 'manager', 'team_lead', 'worker')
    AND suspended = false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_invitation(
  _email text,
  _role public.user_role,
  _initial_password text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invitation_id UUID;
    password_hash TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'manager')
    ) THEN
        RAISE EXCEPTION 'Only privileged users can create invitations';
    END IF;

    password_hash := crypt(_initial_password, gen_salt('bf'));

    INSERT INTO public.user_invitations (email, role, invited_by, initial_password_hash)
    VALUES (_email, _role, auth.uid(), password_hash)
    RETURNING id INTO invitation_id;

    RETURN invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.worker_has_role(_worker_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized_roles AS (
    SELECT CASE WHEN role = 'root' THEN 'super_admin' ELSE role END AS role
    FROM unnest(_roles) AS role
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = _worker_id
      AND w.worker_role = ANY(ARRAY(SELECT role FROM normalized_roles))
  );
$$;

COMMENT ON FUNCTION public.worker_has_role IS
'Checks if a worker has any of the specified roles (super_admin/admin/manager/team_lead/etc) using public.workers.worker_role.';
