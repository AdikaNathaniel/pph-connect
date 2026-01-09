-- ============================================================================
-- MAESTRO WORKBENCH - VALIDATE SCHEMA MIGRATION
-- ============================================================================
--
-- Created: 2025-10-31
-- Purpose: Validate that all schema components were added successfully
--
-- Run this after applying the migration to verify everything is in place.
-- All queries should return the expected counts/results.
--
-- ============================================================================

\echo '============================================================================'
\echo 'SCHEMA MIGRATION VALIDATION'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- SECTION 1: VALIDATE NEW TABLES EXIST
-- ============================================================================

\echo 'SECTION 1: Checking New Tables...'
\echo ''

SELECT
    'New Tables Check' as validation_type,
    COUNT(*) as found_count,
    7 as expected_count,
    CASE WHEN COUNT(*) = 7 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'audio_assets',
    'audio_asset_events',
    'review_tasks',
    'review_submissions',
    'qc_records',
    'final_answers',
    'question_asset_status'
);

\echo ''

-- List each new table individually
SELECT
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✓ Exists' ELSE '✗ Missing' END as status
FROM (VALUES
    ('audio_assets'),
    ('audio_asset_events'),
    ('review_tasks'),
    ('review_submissions'),
    ('qc_records'),
    ('final_answers'),
    ('question_asset_status')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
    ON t.table_schema = 'public'
    AND t.table_name = expected.table_name
ORDER BY expected.table_name;

\echo ''

-- ============================================================================
-- SECTION 2: VALIDATE NEW COLUMNS IN EXISTING TABLES
-- ============================================================================

\echo 'SECTION 2: Checking New Columns...'
\echo ''

-- task_templates new columns
SELECT
    'task_templates columns' as table_name,
    COUNT(*) as found_count,
    2 as expected_count,
    CASE WHEN COUNT(*) = 2 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'task_templates'
AND column_name IN ('review_enabled', 'review_stage_config');

\echo ''

-- projects new columns
SELECT
    'projects columns' as table_name,
    COUNT(*) as found_count,
    5 as expected_count,
    CASE WHEN COUNT(*) = 5 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'projects'
AND column_name IN (
    'import_expected_assets',
    'import_ready_assets',
    'import_failed_assets',
    'import_started_at',
    'import_last_updated'
);

\echo ''

-- project_assignments new columns
SELECT
    'project_assignments columns' as table_name,
    COUNT(*) as found_count,
    6 as expected_count,
    CASE WHEN COUNT(*) = 6 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'project_assignments'
AND column_name IN (
    'can_transcribe',
    'can_review',
    'can_qc',
    'priority_transcribe',
    'priority_review',
    'priority_qc'
);

\echo ''

-- questions new columns
SELECT
    'questions columns' as table_name,
    COUNT(*) as found_count,
    2 as expected_count,
    CASE WHEN COUNT(*) = 2 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'questions'
AND column_name IN ('audio_asset_id', 'supabase_audio_path');

\echo ''

-- ============================================================================
-- SECTION 3: VALIDATE CHECK CONSTRAINTS
-- ============================================================================

\echo 'SECTION 3: Checking Updated CHECK Constraints...'
\echo ''

-- Verify task_templates modality constraint includes 'chatbot-eval'
SELECT
    'task_templates.modality constraint' as constraint_check,
    CASE
        WHEN constraint_definition LIKE '%chatbot-eval%'
        THEN '✓ PASS - Includes chatbot-eval'
        ELSE '✗ FAIL - Missing chatbot-eval'
    END as status
FROM (
    SELECT
        pg_get_constraintdef(c.oid) as constraint_definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.relname = 'task_templates'
    AND c.conname = 'task_templates_modality_check'
) sub;

\echo ''

-- Verify projects status constraint includes 'importing' and 'ready'
SELECT
    'projects.status constraint' as constraint_check,
    CASE
        WHEN constraint_definition LIKE '%importing%'
         AND constraint_definition LIKE '%ready%'
        THEN '✓ PASS - Includes importing and ready'
        ELSE '✗ FAIL - Missing importing or ready'
    END as status
FROM (
    SELECT
        pg_get_constraintdef(c.oid) as constraint_definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.relname = 'projects'
    AND c.conname = 'projects_status_check'
) sub;

\echo ''

-- ============================================================================
-- SECTION 4: VALIDATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

\echo 'SECTION 4: Checking Foreign Key Constraints...'
\echo ''

-- Count foreign keys on new tables
SELECT
    'Foreign Keys on New Tables' as validation_type,
    COUNT(*) as found_count,
    CASE WHEN COUNT(*) >= 20 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public'
AND table_name IN (
    'audio_assets',
    'audio_asset_events',
    'review_tasks',
    'review_submissions',
    'qc_records',
    'final_answers',
    'question_asset_status'
);

\echo ''

-- Verify questions.audio_asset_id FK exists
SELECT
    'questions.audio_asset_id FK' as foreign_key_check,
    CASE
        WHEN COUNT(*) > 0
        THEN '✓ PASS - FK exists'
        ELSE '✗ FAIL - FK missing'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'questions'
AND kcu.column_name = 'audio_asset_id';

\echo ''

-- ============================================================================
-- SECTION 5: VALIDATE INDEXES
-- ============================================================================

\echo 'SECTION 5: Checking Indexes...'
\echo ''

-- Count indexes on new tables and columns
SELECT
    'Indexes on New Components' as validation_type,
    COUNT(*) as found_count,
    CASE WHEN COUNT(*) >= 30 THEN '✓ PASS' ELSE '⚠ WARNING - Some indexes may be missing' END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND (
    tablename IN (
        'audio_assets',
        'audio_asset_events',
        'review_tasks',
        'review_submissions',
        'qc_records',
        'final_answers',
        'question_asset_status'
    )
    OR indexname IN (
        'idx_questions_audio_asset_id'
    )
);

\echo ''

-- List indexes by table
SELECT
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'audio_assets',
    'audio_asset_events',
    'review_tasks',
    'review_submissions',
    'qc_records',
    'final_answers',
    'question_asset_status'
)
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- SECTION 6: TABLE STRUCTURE VERIFICATION
-- ============================================================================

\echo 'SECTION 6: Table Structure Details...'
\echo ''

-- audio_assets columns
\echo 'audio_assets table columns:'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'audio_assets'
ORDER BY ordinal_position;

\echo ''

-- question_asset_status columns
\echo 'question_asset_status table columns:'
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'question_asset_status'
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo '============================================================================'
\echo 'VALIDATION SUMMARY'
\echo '============================================================================'
\echo ''
\echo 'If all checks show ✓ PASS, the migration was successful.'
\echo 'If any checks show ✗ FAIL, review the migration and re-apply if needed.'
\echo ''
\echo 'Expected Results:'
\echo '  - 7 new tables created'
\echo '  - 15 new columns added across 4 existing tables'
\echo '  - 2 CHECK constraints updated'
\echo '  - 20+ foreign key constraints added'
\echo '  - 30+ indexes created'
\echo ''
\echo '============================================================================'
