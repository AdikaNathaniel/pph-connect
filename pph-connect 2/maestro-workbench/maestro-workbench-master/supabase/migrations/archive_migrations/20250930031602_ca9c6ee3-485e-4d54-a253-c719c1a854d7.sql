-- Create atomic task claim function for workers
CREATE OR REPLACE FUNCTION public.claim_next_task(_project_id uuid)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.tasks%ROWTYPE;
BEGIN
  -- Select the next available task and lock it to prevent race conditions
  SELECT * INTO t
  FROM public.tasks
  WHERE project_id = _project_id
    AND status = 'pending'
    AND assigned_to IS NULL
  ORDER BY row_index
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Assign task to current user and mark in progress
  UPDATE public.tasks
  SET assigned_to = auth.uid(),
      assigned_at = now(),
      status = 'in_progress',
      updated_at = now()
  WHERE id = t.id;

  SELECT * INTO t FROM public.tasks WHERE id = t.id;
  RETURN t;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_task(uuid) TO authenticated;

-- Provide a way to count available tasks without exposing rows to clients
CREATE OR REPLACE FUNCTION public.count_available_tasks(_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.tasks
  WHERE project_id = _project_id
    AND status = 'pending'
    AND assigned_to IS NULL;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_available_tasks(uuid) TO authenticated;

-- Enforce that only root can assign the root role
CREATE OR REPLACE FUNCTION public.enforce_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'root' AND NOT public.is_root(auth.uid()) THEN
    RAISE EXCEPTION 'Only root can assign the root role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_role_update ON public.profiles;
CREATE TRIGGER trg_enforce_role_update
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_update();