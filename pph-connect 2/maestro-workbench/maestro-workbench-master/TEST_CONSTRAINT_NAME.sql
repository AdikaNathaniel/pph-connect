-- Test to see what constraint name PostgreSQL returns on unique_violation
DO $$
DECLARE
  test_constraint TEXT;
BEGIN
  -- Try to insert a duplicate that would violate the unique index
  BEGIN
    -- First, ensure there's at least one active reservation
    INSERT INTO public.tasks (
      project_id,
      question_id,
      row_index,
      data,
      status,
      assigned_to,
      assigned_at
    ) VALUES (
      '28b56d27-0748-4f66-9b1a-8a5971558183'::uuid,
      'f757bfee-3774-4309-82be-327569024ab1'::uuid,
      1,
      '{}'::jsonb,
      'assigned',
      '240360d7-7ff3-498f-be68-72f0a3738148'::uuid,
      NOW()
    );
    
    -- Now try to insert another one for the same worker (should fail)
    INSERT INTO public.tasks (
      project_id,
      question_id,
      row_index,
      data,
      status,
      assigned_to,
      assigned_at
    ) VALUES (
      '28b56d27-0748-4f66-9b1a-8a5971558183'::uuid,
      'f757bfee-3774-4309-82be-327569024ab1'::uuid,
      2,
      '{}'::jsonb,
      'assigned',
      '240360d7-7ff3-498f-be68-72f0a3738148'::uuid,
      NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS test_constraint = CONSTRAINT_NAME;
    RAISE NOTICE 'Constraint name returned: %', test_constraint;
    
    -- Clean up the test data
    DELETE FROM public.tasks 
    WHERE assigned_to = '240360d7-7ff3-498f-be68-72f0a3738148'::uuid
      AND status = 'assigned';
  END;
END $$;

