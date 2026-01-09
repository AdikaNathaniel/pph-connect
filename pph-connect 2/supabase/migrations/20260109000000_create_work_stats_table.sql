-- ============================================================================
-- Migration: Create work_stats table
-- Created: 2026-01-09
-- Description: Create work_stats table for tracking worker daily productivity
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."work_stats" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "worker_id" UUID NOT NULL,
    "worker_account_id" UUID,
    "project_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "units_completed" INTEGER,
    "hours_worked" NUMERIC(5,2) CHECK (hours_worked >= 0 AND hours_worked <= 24),
    "earnings" NUMERIC(10,2) CHECK (earnings >= 0),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_by" UUID,
    CONSTRAINT "work_stats_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 2. FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- FK: worker_id references workers table
ALTER TABLE "public"."work_stats"
    ADD CONSTRAINT "work_stats_worker_id_fkey"
    FOREIGN KEY ("worker_id")
    REFERENCES "public"."workers"("id")
    ON DELETE CASCADE;

-- FK: worker_account_id references worker_accounts table (nullable)
ALTER TABLE "public"."work_stats"
    ADD CONSTRAINT "work_stats_worker_account_id_fkey"
    FOREIGN KEY ("worker_account_id")
    REFERENCES "public"."worker_accounts"("id")
    ON DELETE SET NULL;

-- FK: project_id references projects table
ALTER TABLE "public"."work_stats"
    ADD CONSTRAINT "work_stats_project_id_fkey"
    FOREIGN KEY ("project_id")
    REFERENCES "public"."projects"("id")
    ON DELETE CASCADE;

-- FK: created_by references workers table (nullable)
ALTER TABLE "public"."work_stats"
    ADD CONSTRAINT "work_stats_created_by_fkey"
    FOREIGN KEY ("created_by")
    REFERENCES "public"."workers"("id")
    ON DELETE SET NULL;

-- FK: updated_by references workers table (nullable)
ALTER TABLE "public"."work_stats"
    ADD CONSTRAINT "work_stats_updated_by_fkey"
    FOREIGN KEY ("updated_by")
    REFERENCES "public"."workers"("id")
    ON DELETE SET NULL;

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================
-- Index on worker_id for fast worker-based queries
CREATE INDEX IF NOT EXISTS "idx_work_stats_worker"
    ON "public"."work_stats"("worker_id");

-- Index on project_id for fast project-based queries
CREATE INDEX IF NOT EXISTS "idx_work_stats_project"
    ON "public"."work_stats"("project_id");

-- Index on work_date for fast date-range queries
CREATE INDEX IF NOT EXISTS "idx_work_stats_date"
    ON "public"."work_stats"("work_date");

-- Index on worker_account_id for fast account-based queries
CREATE INDEX IF NOT EXISTS "idx_work_stats_account"
    ON "public"."work_stats"("worker_account_id")
    WHERE "worker_account_id" IS NOT NULL;

-- Composite index for common query patterns (worker + date range)
CREATE INDEX IF NOT EXISTS "idx_work_stats_worker_date"
    ON "public"."work_stats"("worker_id", "work_date" DESC);

-- Composite index for common query patterns (project + date range)
CREATE INDEX IF NOT EXISTS "idx_work_stats_project_date"
    ON "public"."work_stats"("project_id", "work_date" DESC);

-- ============================================================================
-- 4. UNIQUE CONSTRAINT
-- ============================================================================
-- Unique constraint: One work stat entry per worker, project, and date
-- Note: We handle worker_account_id being NULL by using COALESCE to replace NULL with a dummy UUID
CREATE UNIQUE INDEX IF NOT EXISTS "unique_work_stats_per_day"
    ON "public"."work_stats"(
        "worker_id",
        "project_id",
        "work_date",
        COALESCE("worker_account_id", '00000000-0000-0000-0000-000000000000'::UUID)
    );

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on the table
ALTER TABLE "public"."work_stats" ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all work stats
CREATE POLICY "work_stats_select_policy"
    ON "public"."work_stats"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert work stats
CREATE POLICY "work_stats_insert_policy"
    ON "public"."work_stats"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update work stats
CREATE POLICY "work_stats_update_policy"
    ON "public"."work_stats"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete work stats
CREATE POLICY "work_stats_delete_policy"
    ON "public"."work_stats"
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- 6. TRIGGERS FOR AUDIT FIELDS
-- ============================================================================
-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION "public"."update_work_stats_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS "work_stats_updated_at_trigger" ON "public"."work_stats";
CREATE TRIGGER "work_stats_updated_at_trigger"
    BEFORE UPDATE ON "public"."work_stats"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_work_stats_updated_at"();

-- ============================================================================
-- 7. TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE "public"."work_stats" IS
    'Tracks daily work statistics for workers including units completed, hours worked, and earnings';

COMMENT ON COLUMN "public"."work_stats"."id" IS
    'Unique identifier for the work stat record';

COMMENT ON COLUMN "public"."work_stats"."worker_id" IS
    'Reference to the worker who performed the work';

COMMENT ON COLUMN "public"."work_stats"."worker_account_id" IS
    'Reference to the specific worker account (platform) used (optional)';

COMMENT ON COLUMN "public"."work_stats"."project_id" IS
    'Reference to the project the work was performed on';

COMMENT ON COLUMN "public"."work_stats"."work_date" IS
    'The date the work was performed';

COMMENT ON COLUMN "public"."work_stats"."units_completed" IS
    'Number of units/tasks completed';

COMMENT ON COLUMN "public"."work_stats"."hours_worked" IS
    'Number of hours worked (max 24 hours per day)';

COMMENT ON COLUMN "public"."work_stats"."earnings" IS
    'Total earnings for the work performed';

COMMENT ON COLUMN "public"."work_stats"."created_at" IS
    'Timestamp when the record was created';

COMMENT ON COLUMN "public"."work_stats"."created_by" IS
    'Reference to the worker who created the record (optional)';

COMMENT ON COLUMN "public"."work_stats"."updated_at" IS
    'Timestamp when the record was last updated';

COMMENT ON COLUMN "public"."work_stats"."updated_by" IS
    'Reference to the worker who last updated the record (optional)';

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================
-- Grant usage on the table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."work_stats" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."work_stats" TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================
