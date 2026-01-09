-- ============================================================================
-- Migration: Create Training Materials Table
-- ============================================================================
-- Created: 2026-01-09
-- Purpose: Store training resources (videos, documents, links) linked to projects
--
-- Schema: id, project_id, title, description, type (video/document/link), url,
--         created_at, created_by
--
-- Requirements implemented:
--   - Foreign key: project_id references projects table
--   - Foreign key: created_by references workers table
--   - Index: idx_training_materials_project on project_id
--   - RLS policies for authenticated access
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.training_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    type TEXT NOT NULL,  -- 'video', 'document', 'link'
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.workers(id) ON DELETE SET NULL
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
-- Index for project lookups (find all materials for a project)
CREATE INDEX IF NOT EXISTS idx_training_materials_project
    ON public.training_materials(project_id);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_training_materials_type
    ON public.training_materials(type);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read training materials
CREATE POLICY "training_materials_select_policy"
    ON public.training_materials
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins and root users can manage training materials
CREATE POLICY "training_materials_admin_manage_policy"
    ON public.training_materials
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
COMMENT ON TABLE public.training_materials IS 'Training resources (videos, documents, links) linked to projects';
COMMENT ON COLUMN public.training_materials.project_id IS 'Reference to the project this material belongs to';
COMMENT ON COLUMN public.training_materials.title IS 'Title of the training material';
COMMENT ON COLUMN public.training_materials.description IS 'Optional description of the training content';
COMMENT ON COLUMN public.training_materials.type IS 'Type of material: video, document, or link';
COMMENT ON COLUMN public.training_materials.url IS 'URL to the training resource';
COMMENT ON COLUMN public.training_materials.created_by IS 'Worker who created this training material';
