-- ============================================================================
-- Migration: Create Worker Training Access Table
-- ============================================================================
-- Created: 2026-01-09
-- Purpose: Track worker access to training materials and completion status
--
-- Schema: id, worker_id, training_material_id, granted_at, completed_at
--
-- Requirements implemented:
--   - Foreign key: worker_id references workers table
--   - Foreign key: training_material_id references training_materials table
--   - Index: idx_worker_training_access_worker on worker_id
--   - Index: idx_worker_training_access_material on training_material_id
--   - Index: idx_worker_training_access_active (partial index for incomplete)
--   - RLS policies for authenticated access
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.worker_training_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    training_material_id UUID NOT NULL REFERENCES public.training_materials(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
-- Index for worker lookups (find all training access for a worker)
CREATE INDEX IF NOT EXISTS idx_worker_training_access_worker
    ON public.worker_training_access(worker_id);

-- Index for material lookups (find all workers with access to a material)
CREATE INDEX IF NOT EXISTS idx_worker_training_access_material
    ON public.worker_training_access(training_material_id);

-- Partial index for finding workers with incomplete training
CREATE INDEX IF NOT EXISTS idx_worker_training_access_active
    ON public.worker_training_access(worker_id)
    WHERE completed_at IS NULL;

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.worker_training_access ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read worker training access
CREATE POLICY "worker_training_access_select_policy"
    ON public.worker_training_access
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins and root users can manage worker training access
CREATE POLICY "worker_training_access_admin_manage_policy"
    ON public.worker_training_access
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('root', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('root', 'admin')
        )
    );

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================
COMMENT ON TABLE public.worker_training_access IS 'Tracks worker access to training materials and completion status';
COMMENT ON COLUMN public.worker_training_access.worker_id IS 'Reference to the worker granted access';
COMMENT ON COLUMN public.worker_training_access.training_material_id IS 'Reference to the training material';
COMMENT ON COLUMN public.worker_training_access.granted_at IS 'When access was granted to the worker';
COMMENT ON COLUMN public.worker_training_access.completed_at IS 'When the worker completed the training (NULL if not yet completed)';
