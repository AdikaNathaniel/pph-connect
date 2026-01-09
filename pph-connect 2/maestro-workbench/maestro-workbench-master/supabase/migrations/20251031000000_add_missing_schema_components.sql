-- ============================================================================
-- MAESTRO WORKBENCH - ADD MISSING SCHEMA COMPONENTS
-- ============================================================================
--
-- Created: 2025-10-31
-- Purpose: Add missing tables and columns from reference schema
--
-- This migration adds:
--   - 7 new tables (audio assets, review workflow, QC, final answers)
--   - 15 new columns across 4 existing tables
--   - Updated CHECK constraints
--
-- Dependencies: Requires existing baseline schema tables
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: ALTER EXISTING TABLES (No new FK dependencies)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- task_templates: Add review configuration
-- ----------------------------------------------------------------------------

-- Add review_enabled flag
ALTER TABLE public.task_templates
ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add review stage configuration
ALTER TABLE public.task_templates
ADD COLUMN IF NOT EXISTS review_stage_config JSONB DEFAULT NULL;

-- Update modality CHECK constraint to include 'chatbot-eval'
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
    'multimodal',
    'chatbot-eval'
));

-- ----------------------------------------------------------------------------
-- projects: Add import tracking columns
-- ----------------------------------------------------------------------------

-- Add asset import tracking columns
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS import_expected_assets INTEGER DEFAULT NULL;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS import_ready_assets INTEGER DEFAULT NULL;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS import_failed_assets INTEGER DEFAULT NULL;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS import_started_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS import_last_updated TIMESTAMPTZ DEFAULT NULL;

-- Update status CHECK constraint to include 'importing' and 'ready'
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
ADD CONSTRAINT projects_status_check
CHECK (status IN (
    'importing',
    'ready',
    'active',
    'paused',
    'completed'
));

-- ----------------------------------------------------------------------------
-- project_assignments: Add role-based permissions and priorities
-- ----------------------------------------------------------------------------

-- Add permission flags for different workflow stages
ALTER TABLE public.project_assignments
ADD COLUMN IF NOT EXISTS can_transcribe BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.project_assignments
ADD COLUMN IF NOT EXISTS can_review BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.project_assignments
ADD COLUMN IF NOT EXISTS can_qc BOOLEAN NOT NULL DEFAULT false;

-- Add stage-specific priority settings
ALTER TABLE public.project_assignments
ADD COLUMN IF NOT EXISTS priority_transcribe INTEGER NOT NULL DEFAULT 50;

ALTER TABLE public.project_assignments
ADD COLUMN IF NOT EXISTS priority_review INTEGER NOT NULL DEFAULT 10;

ALTER TABLE public.project_assignments
ADD COLUMN IF NOT EXISTS priority_qc INTEGER NOT NULL DEFAULT 90;

-- ============================================================================
-- SECTION 2: CREATE NEW TABLES (In dependency order)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- audio_assets: Audio file storage and management
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    drive_file_id TEXT NOT NULL,
    drive_file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT DEFAULT NULL,
    checksum TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'transferring', 'ready', 'failed', 'archived')
    ),
    error_message TEXT DEFAULT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NULL,
    last_verified_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project lookups
CREATE INDEX IF NOT EXISTS idx_audio_assets_project_id
ON public.audio_assets(project_id);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_audio_assets_status
ON public.audio_assets(status);

-- Create index for drive_file_id lookups
CREATE INDEX IF NOT EXISTS idx_audio_assets_drive_file_id
ON public.audio_assets(drive_file_id);

-- ----------------------------------------------------------------------------
-- audio_asset_events: Event logging for audio asset processing
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audio_asset_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    audio_asset_id UUID DEFAULT NULL REFERENCES public.audio_assets(id) ON DELETE CASCADE,
    drive_file_id TEXT DEFAULT NULL,
    event_type TEXT NOT NULL,
    message TEXT DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project event lookups
CREATE INDEX IF NOT EXISTS idx_audio_asset_events_project_id
ON public.audio_asset_events(project_id);

-- Create index for asset event lookups
CREATE INDEX IF NOT EXISTS idx_audio_asset_events_audio_asset_id
ON public.audio_asset_events(audio_asset_id);

-- Create index for event type filtering
CREATE INDEX IF NOT EXISTS idx_audio_asset_events_event_type
ON public.audio_asset_events(event_type);

-- ----------------------------------------------------------------------------
-- review_tasks: Review workflow task assignments
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.review_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_uuid UUID NOT NULL UNIQUE REFERENCES public.answers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'assigned', 'completed', 'skipped')
    ),
    assigned_to UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project lookups
CREATE INDEX IF NOT EXISTS idx_review_tasks_project_id
ON public.review_tasks(project_id);

-- Create index for question lookups
CREATE INDEX IF NOT EXISTS idx_review_tasks_question_uuid
ON public.review_tasks(question_uuid);

-- Create index for reviewer assignment lookups
CREATE INDEX IF NOT EXISTS idx_review_tasks_assigned_to
ON public.review_tasks(assigned_to);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_review_tasks_status
ON public.review_tasks(status);

-- ----------------------------------------------------------------------------
-- review_submissions: Review results from reviewers
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.review_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id TEXT NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_uuid UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
    reviewer_id UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_payload JSONB NOT NULL DEFAULT '{}',
    rating_overall INTEGER DEFAULT NULL,
    highlight_tags TEXT[] DEFAULT '{}',
    feedback_to_transcriber TEXT DEFAULT NULL,
    internal_notes TEXT DEFAULT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project lookups
CREATE INDEX IF NOT EXISTS idx_review_submissions_project_id
ON public.review_submissions(project_id);

-- Create index for question lookups
CREATE INDEX IF NOT EXISTS idx_review_submissions_question_uuid
ON public.review_submissions(question_uuid);

-- Create index for answer lookups
CREATE INDEX IF NOT EXISTS idx_review_submissions_answer_uuid
ON public.review_submissions(answer_uuid);

-- Create index for reviewer lookups
CREATE INDEX IF NOT EXISTS idx_review_submissions_reviewer_id
ON public.review_submissions(reviewer_id);

-- Create index for review_id lookups
CREATE INDEX IF NOT EXISTS idx_review_submissions_review_id
ON public.review_submissions(review_id);

-- ----------------------------------------------------------------------------
-- qc_records: Quality control records
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.qc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qc_id TEXT NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    review_submission_uuid UUID NOT NULL REFERENCES public.review_submissions(id) ON DELETE CASCADE,
    qc_payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project lookups
CREATE INDEX IF NOT EXISTS idx_qc_records_project_id
ON public.qc_records(project_id);

-- Create index for question lookups
CREATE INDEX IF NOT EXISTS idx_qc_records_question_uuid
ON public.qc_records(question_uuid);

-- Create index for review submission lookups
CREATE INDEX IF NOT EXISTS idx_qc_records_review_submission_uuid
ON public.qc_records(review_submission_uuid);

-- Create index for qc_id lookups
CREATE INDEX IF NOT EXISTS idx_qc_records_qc_id
ON public.qc_records(qc_id);

-- ----------------------------------------------------------------------------
-- final_answers: Finalized deliverable answers
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.final_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_answer_id TEXT NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    replication_index INTEGER NOT NULL DEFAULT 1,
    source_answer_uuid UUID DEFAULT NULL REFERENCES public.answers(id) ON DELETE SET NULL,
    review_submission_uuid UUID DEFAULT NULL REFERENCES public.review_submissions(id) ON DELETE SET NULL,
    deliverable JSONB NOT NULL DEFAULT '{}',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project lookups
CREATE INDEX IF NOT EXISTS idx_final_answers_project_id
ON public.final_answers(project_id);

-- Create index for question lookups
CREATE INDEX IF NOT EXISTS idx_final_answers_question_uuid
ON public.final_answers(question_uuid);

-- Create index for source answer lookups
CREATE INDEX IF NOT EXISTS idx_final_answers_source_answer_uuid
ON public.final_answers(source_answer_uuid);

-- Create index for review submission lookups
CREATE INDEX IF NOT EXISTS idx_final_answers_review_submission_uuid
ON public.final_answers(review_submission_uuid);

-- Create index for final_answer_id lookups
CREATE INDEX IF NOT EXISTS idx_final_answers_final_answer_id
ON public.final_answers(final_answer_id);

-- ----------------------------------------------------------------------------
-- question_asset_status: Central tracking for question lifecycle
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.question_asset_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    question_uuid UUID NOT NULL UNIQUE REFERENCES public.questions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    replication_index INTEGER NOT NULL DEFAULT 1,
    asset_source_id TEXT DEFAULT NULL,

    -- Current status
    current_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        current_status IN (
            'pending',
            'transcribed',
            'review_pending',
            'reviewed',
            'qc_ready',
            'completed',
            'skipped'
        )
    ),

    -- References to workflow entities
    transcription_task_uuid UUID DEFAULT NULL REFERENCES public.tasks(id) ON DELETE SET NULL,
    transcription_answer_uuid UUID DEFAULT NULL REFERENCES public.answers(id) ON DELETE SET NULL,
    review_task_uuid UUID DEFAULT NULL REFERENCES public.review_tasks(id) ON DELETE SET NULL,
    review_submission_uuid UUID DEFAULT NULL REFERENCES public.review_submissions(id) ON DELETE SET NULL,
    qc_record_uuid UUID DEFAULT NULL REFERENCES public.qc_records(id) ON DELETE SET NULL,
    final_answer_uuid UUID DEFAULT NULL REFERENCES public.final_answers(id) ON DELETE SET NULL,

    -- Worker references
    transcriber_uuid UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_uuid UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    qc_reviewer_uuid UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    transcription_submitted_at TIMESTAMPTZ DEFAULT NULL,
    review_submitted_at TIMESTAMPTZ DEFAULT NULL,
    qc_created_at TIMESTAMPTZ DEFAULT NULL,
    finalized_at TIMESTAMPTZ DEFAULT NULL,

    -- URLs and paths
    deliverable_url TEXT DEFAULT NULL,
    review_json_url TEXT DEFAULT NULL,
    qc_json_url TEXT DEFAULT NULL,

    -- Audio asset references
    audio_asset_id UUID DEFAULT NULL REFERENCES public.audio_assets(id) ON DELETE SET NULL,
    supabase_audio_path TEXT DEFAULT NULL,

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_question_asset_status_project_id
ON public.question_asset_status(project_id);

CREATE INDEX IF NOT EXISTS idx_question_asset_status_current_status
ON public.question_asset_status(current_status);

CREATE INDEX IF NOT EXISTS idx_question_asset_status_transcriber_uuid
ON public.question_asset_status(transcriber_uuid);

CREATE INDEX IF NOT EXISTS idx_question_asset_status_reviewer_uuid
ON public.question_asset_status(reviewer_uuid);

CREATE INDEX IF NOT EXISTS idx_question_asset_status_audio_asset_id
ON public.question_asset_status(audio_asset_id);

-- ============================================================================
-- SECTION 3: ALTER EXISTING TABLES (Add FKs to new tables)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- questions: Add audio asset references
-- ----------------------------------------------------------------------------

-- Add audio_asset_id foreign key
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS audio_asset_id UUID DEFAULT NULL REFERENCES public.audio_assets(id) ON DELETE SET NULL;

-- Add supabase audio path
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS supabase_audio_path TEXT DEFAULT NULL;

-- Create index for audio asset lookups
CREATE INDEX IF NOT EXISTS idx_questions_audio_asset_id
ON public.questions(audio_asset_id);

-- ============================================================================
-- SECTION 4: UPDATE STATISTICS
-- ============================================================================

-- Analyze new tables for query optimization
ANALYZE public.audio_assets;
ANALYZE public.audio_asset_events;
ANALYZE public.review_tasks;
ANALYZE public.review_submissions;
ANALYZE public.qc_records;
ANALYZE public.final_answers;
ANALYZE public.question_asset_status;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- Tables Added (7):
--   1. audio_assets - Audio file storage and management
--   2. audio_asset_events - Event logging for audio processing
--   3. review_tasks - Review workflow assignments
--   4. review_submissions - Review results from reviewers
--   5. qc_records - Quality control records
--   6. final_answers - Finalized deliverable answers
--   7. question_asset_status - Central question lifecycle tracking

-- Columns Added (15):
--   task_templates: review_enabled, review_stage_config
--   projects: import_expected_assets, import_ready_assets, import_failed_assets,
--             import_started_at, import_last_updated
--   project_assignments: can_transcribe, can_review, can_qc,
--                        priority_transcribe, priority_review, priority_qc
--   questions: audio_asset_id, supabase_audio_path

-- Indexes Created: 33 indexes across all new tables

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
