-- ============================================================================
-- MAESTRO WORKBENCH - ROLLBACK MISSING SCHEMA COMPONENTS
-- ============================================================================
--
-- Created: 2025-10-31
-- Purpose: Rollback the add_missing_schema_components migration
--
-- WARNING: This will DROP tables and columns. Data will be lost!
-- Only run this if you need to undo the migration.
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP FOREIGN KEY COLUMNS FROM EXISTING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- questions: Remove audio asset references
-- ----------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_questions_audio_asset_id;

ALTER TABLE public.questions
DROP COLUMN IF EXISTS supabase_audio_path;

ALTER TABLE public.questions
DROP COLUMN IF EXISTS audio_asset_id;

-- ============================================================================
-- SECTION 2: DROP NEW TABLES (Reverse dependency order)
-- ============================================================================

-- Drop question_asset_status (depends on everything)
DROP TABLE IF EXISTS public.question_asset_status CASCADE;

-- Drop final_answers (depends on review_submissions)
DROP TABLE IF EXISTS public.final_answers CASCADE;

-- Drop qc_records (depends on review_submissions)
DROP TABLE IF EXISTS public.qc_records CASCADE;

-- Drop review_submissions
DROP TABLE IF EXISTS public.review_submissions CASCADE;

-- Drop review_tasks
DROP TABLE IF EXISTS public.review_tasks CASCADE;

-- Drop audio_asset_events (depends on audio_assets)
DROP TABLE IF EXISTS public.audio_asset_events CASCADE;

-- Drop audio_assets
DROP TABLE IF EXISTS public.audio_assets CASCADE;

-- ============================================================================
-- SECTION 3: REMOVE COLUMNS FROM EXISTING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- project_assignments: Remove role-based permissions
-- ----------------------------------------------------------------------------

ALTER TABLE public.project_assignments
DROP COLUMN IF EXISTS priority_qc;

ALTER TABLE public.project_assignments
DROP COLUMN IF EXISTS priority_review;

ALTER TABLE public.project_assignments
DROP COLUMN IF EXISTS priority_transcribe;

ALTER TABLE public.project_assignments
DROP COLUMN IF EXISTS can_qc;

ALTER TABLE public.project_assignments
DROP COLUMN IF EXISTS can_review;

ALTER TABLE public.project_assignments
DROP COLUMN IF EXISTS can_transcribe;

-- ----------------------------------------------------------------------------
-- projects: Remove import tracking
-- ----------------------------------------------------------------------------

ALTER TABLE public.projects
DROP COLUMN IF EXISTS import_last_updated;

ALTER TABLE public.projects
DROP COLUMN IF EXISTS import_started_at;

ALTER TABLE public.projects
DROP COLUMN IF EXISTS import_failed_assets;

ALTER TABLE public.projects
DROP COLUMN IF EXISTS import_ready_assets;

ALTER TABLE public.projects
DROP COLUMN IF EXISTS import_expected_assets;

-- Restore original status CHECK constraint
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
ADD CONSTRAINT projects_status_check
CHECK (status IN ('active', 'paused', 'completed'));

-- ----------------------------------------------------------------------------
-- task_templates: Remove review configuration
-- ----------------------------------------------------------------------------

ALTER TABLE public.task_templates
DROP COLUMN IF EXISTS review_stage_config;

ALTER TABLE public.task_templates
DROP COLUMN IF EXISTS review_enabled;

-- Restore original modality CHECK constraint
ALTER TABLE public.task_templates
DROP CONSTRAINT IF EXISTS task_templates_modality_check;

ALTER TABLE public.task_templates
ADD CONSTRAINT task_templates_modality_check
CHECK (modality IN (
    'spreadsheet',
    'audio-short',
    'audio-long',
    'text',
    'image',
    'video',
    'multimodal'
));

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- All changes from 20251031000000_add_missing_schema_components.sql
-- have been rolled back.
--
-- Tables Dropped: 7
-- Columns Removed: 15
-- Indexes Dropped: 33 (automatically dropped with tables/columns)
--
-- ============================================================================
