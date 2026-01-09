-- Fix the search path security issue for the create_tasks_from_sheet function
CREATE OR REPLACE FUNCTION public.create_tasks_from_sheet(
  _project_id UUID,
  _sheet_url TEXT,
  _template_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_count INTEGER := 0;
BEGIN
  -- For now, we'll create sample tasks based on total_tasks count
  -- In a real implementation, this would parse the actual sheet data
  INSERT INTO public.tasks (project_id, row_index, data, status)
  SELECT 
    _project_id,
    generate_series(1, (SELECT total_tasks FROM projects WHERE id = _project_id)),
    '{"placeholder": "Task data from sheet"}'::jsonb,
    'pending'
  FROM projects 
  WHERE id = _project_id;
  
  GET DIAGNOSTICS task_count = ROW_COUNT;
  
  RETURN task_count;
END;
$$;