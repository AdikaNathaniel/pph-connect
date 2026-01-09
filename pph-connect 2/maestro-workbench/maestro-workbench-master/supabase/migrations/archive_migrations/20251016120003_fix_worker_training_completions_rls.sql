-- Fix missing RLS policies for worker_training_completions table
-- This migration addresses the "selectNextProject: failed to verify training completion" error
-- by adding proper Row Level Security policies that follow the established patterns in the codebase.

-- Enable RLS on worker_training_completions table (if not already enabled)
-- Note: Supabase enables RLS by default, but we explicitly enable it for clarity
ALTER TABLE public.worker_training_completions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to ensure clean state
DROP POLICY IF EXISTS "Workers can view their own training completions" ON public.worker_training_completions;
DROP POLICY IF EXISTS "Workers can insert their own training completions" ON public.worker_training_completions;
DROP POLICY IF EXISTS "Workers can update their own training completions" ON public.worker_training_completions;
DROP POLICY IF EXISTS "Root and managers can view all training completions" ON public.worker_training_completions;
DROP POLICY IF EXISTS "Root and managers can manage training completions" ON public.worker_training_completions;

-- Policy 1: Workers can view their own training completions
-- This is critical for selectNextProject() function to verify training completion
CREATE POLICY "Workers can view their own training completions" 
ON public.worker_training_completions 
FOR SELECT
USING (worker_id = auth.uid());

-- Policy 2: Workers can insert their own training completions
-- This is used by TrainingModal.tsx when workers complete training
CREATE POLICY "Workers can insert their own training completions" 
ON public.worker_training_completions 
FOR INSERT
WITH CHECK (worker_id = auth.uid());

-- Policy 3: Workers can update their own training completions
-- This is used by TrainingModal.tsx for duplicate completion handling (error code 23505)
CREATE POLICY "Workers can update their own training completions" 
ON public.worker_training_completions 
FOR UPDATE
USING (worker_id = auth.uid())
WITH CHECK (worker_id = auth.uid());

-- Policy 4: Root and managers can view all training completions
-- This is used by TrainingModules.tsx for manager dashboard
CREATE POLICY "Root and managers can view all training completions" 
ON public.worker_training_completions 
FOR SELECT
USING (public.is_root_or_manager(auth.uid()));

-- Policy 5: Root and managers can manage all training completions
-- This allows managers to delete/modify completions if needed
CREATE POLICY "Root and managers can manage training completions" 
ON public.worker_training_completions 
FOR ALL
USING (public.is_root_or_manager(auth.uid()))
WITH CHECK (public.is_root_or_manager(auth.uid()));

-- Add comment explaining the policies
COMMENT ON TABLE public.worker_training_completions IS 
'Training completion tracking with RLS policies. Workers can manage their own completions, managers can view/manage all completions.';

-- Verify the table structure is correct
-- This ensures we have all expected columns
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_training_completions' 
        AND column_name = 'started_at'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Missing started_at column in worker_training_completions table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_training_completions' 
        AND column_name = 'duration_seconds'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Missing duration_seconds column in worker_training_completions table';
    END IF;
    
    RAISE NOTICE 'worker_training_completions table structure verified successfully';
END $$;
