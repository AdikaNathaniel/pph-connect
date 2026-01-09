-- Fix missing RLS policies for worker_training_completions table
-- Run this script directly in the Supabase SQL Editor to fix the training completion verification issue

-- Enable RLS on worker_training_completions table (if not already enabled)
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

-- Verify the policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'worker_training_completions'
ORDER BY policyname;
