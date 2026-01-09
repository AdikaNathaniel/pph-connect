-- Migration: Align Messaging RLS with Worker Roles
-- Created: 2025-11-06
-- Purpose: Ensure messaging policies rely on public.workers role data instead of public.profiles.
--
-- Changes:
--   1. Create helper function public.worker_has_role(_worker_id uuid, _roles text[])
--   2. Update messaging RLS policies to use worker_has_role for admin/manager checks
--
-- ============================================================================#

CREATE OR REPLACE FUNCTION public.worker_has_role(_worker_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = _worker_id
      AND w.worker_role = ANY(_roles)
  );
$$;

COMMENT ON FUNCTION public.worker_has_role IS
'Checks if a worker has any of the specified roles (root/admin/manager/team_lead/etc) using public.workers.worker_role.';

-- Update message_threads policies
DROP POLICY IF EXISTS "Admins view all threads" ON public.message_threads;
CREATE POLICY "Admins view all threads"
  ON public.message_threads
  FOR SELECT
  TO authenticated
  USING (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );

-- Update messages policies
DROP POLICY IF EXISTS "Admins view all messages" ON public.messages;
CREATE POLICY "Admins view all messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );

-- Update message_recipients policies
DROP POLICY IF EXISTS "Admins view all recipients" ON public.message_recipients;
CREATE POLICY "Admins view all recipients"
  ON public.message_recipients
  FOR SELECT
  TO authenticated
  USING (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );

-- Update message_groups policy
DROP POLICY IF EXISTS "Admins view all groups" ON public.message_groups;
CREATE POLICY "Admins view all groups"
  ON public.message_groups
  FOR SELECT
  TO authenticated
  USING (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );

-- Update message_audience_targets admin policy
DROP POLICY IF EXISTS "Admins can manage message audience targets" ON public.message_audience_targets;
CREATE POLICY "Admins can manage message audience targets"
  ON public.message_audience_targets
  FOR ALL
  TO authenticated
  USING (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  )
  WITH CHECK (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );

-- Update message_broadcast_runs admin policy
DROP POLICY IF EXISTS "Admins can manage broadcast runs" ON public.message_broadcast_runs;
CREATE POLICY "Admins can manage broadcast runs"
  ON public.message_broadcast_runs
  FOR ALL
  TO authenticated
  USING (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  )
  WITH CHECK (
    public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );
