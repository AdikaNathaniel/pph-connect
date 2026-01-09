-- ============================================================================
-- Migration: Create Training Gates Table
-- ============================================================================
-- Created: 2026-01-09
-- Purpose: Track worker gate progress on projects (training checkpoints)
--
-- Schema: id, worker_id, project_id, gate_name, status (passed/failed/pending),
--         score, attempt_count, passed_at, created_at, updated_at
--
-- Requirements implemented:
--   - Foreign key: worker_id references workers table
--   - Foreign key: project_id references projects table
--   - Index: idx_training_gates_worker on worker_id
--   - Index: idx_training_gates_project on project_id
--   - Unique constraint: (worker_id, project_id, gate_name)
--   - RLS policies for authenticated access
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.training_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    gate_name TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'passed', 'failed', 'pending'
    score NUMERIC DEFAULT 0,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    passed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one gate per worker per project
    CONSTRAINT training_gates_worker_project_gate_key
        UNIQUE (worker_id, project_id, gate_name)
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
-- Index for worker lookups (find all gates for a worker)
CREATE INDEX IF NOT EXISTS idx_training_gates_worker
    ON public.training_gates(worker_id);

-- Index for project lookups (find all gates for a project)
CREATE INDEX IF NOT EXISTS idx_training_gates_project
    ON public.training_gates(project_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.training_gates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read training gates
CREATE POLICY "training_gates_select_policy"
    ON public.training_gates
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins and root users can manage training gates
CREATE POLICY "training_gates_admin_manage_policy"
    ON public.training_gates
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
COMMENT ON TABLE public.training_gates IS 'Tracks worker progress through training gates/checkpoints on projects';
COMMENT ON COLUMN public.training_gates.worker_id IS 'Reference to the worker taking the training';
COMMENT ON COLUMN public.training_gates.project_id IS 'Reference to the project this gate belongs to';
COMMENT ON COLUMN public.training_gates.gate_name IS 'Name of the training gate (e.g., onboarding, certification, advanced)';
COMMENT ON COLUMN public.training_gates.status IS 'Gate status: passed, failed, or pending';
COMMENT ON COLUMN public.training_gates.score IS 'Score achieved on the gate (if applicable)';
COMMENT ON COLUMN public.training_gates.attempt_count IS 'Number of attempts made on this gate';
COMMENT ON COLUMN public.training_gates.passed_at IS 'Timestamp when the gate was passed (NULL if not yet passed)';
