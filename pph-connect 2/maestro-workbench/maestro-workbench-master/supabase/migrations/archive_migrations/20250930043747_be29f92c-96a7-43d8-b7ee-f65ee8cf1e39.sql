-- Fix claim_next_task to use valid status value per tasks_status_check
CREATE OR REPLACE FUNCTION public.claim_next_task(_project_id uuid)
 RETURNS tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Assign task to current user and mark as assigned (valid per CHECK constraint)
  UPDATE public.tasks
  SET assigned_to = auth.uid(),
      assigned_at = now(),
      status = 'assigned',
      updated_at = now()
  WHERE id = t.id;

  SELECT * INTO t FROM public.tasks WHERE id = t.id;
  RETURN t;
END;
$function$;