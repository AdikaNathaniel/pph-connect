-- ============================================================================
-- Fix work_stats created_by foreign key constraint
-- ============================================================================
-- Purpose: Change created_by FK from workers table to profiles table
-- This allows tracking which authenticated user uploaded the stats
--
-- IMPORTANT: Run each step SEPARATELY to avoid deadlocks
-- Copy and run each numbered block one at a time in SQL Editor
-- Wait for each to complete before running the next
-- ============================================================================


-- ========== STEP 1 ==========
-- Drop the existing FK constraint on created_by
ALTER TABLE "public"."work_stats"
    DROP CONSTRAINT IF EXISTS "work_stats_created_by_fkey";


-- ========== STEP 2 ==========
-- Set any existing created_by values to NULL
UPDATE "public"."work_stats"
SET created_by = NULL
WHERE created_by IS NOT NULL;


-- ========== STEP 3 ==========
-- Add new FK constraint referencing profiles table
ALTER TABLE "public"."work_stats"
    ADD CONSTRAINT "work_stats_created_by_fkey"
    FOREIGN KEY ("created_by")
    REFERENCES "public"."profiles"("id")
    ON DELETE SET NULL;
