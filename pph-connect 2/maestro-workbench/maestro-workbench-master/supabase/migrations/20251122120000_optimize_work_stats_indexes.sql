-- Migration: Optimize work_stats recent rollups
-- Created: 2025-11-22
-- Purpose: Improve worker analytics rollups by adding a covering index on (work_date DESC, worker_id)
-- Notes: Supports dashboard queries that slice by recent dates and worker id.

CREATE INDEX IF NOT EXISTS idx_work_stats_recent
  ON public.work_stats (work_date DESC, worker_id);

COMMENT ON INDEX idx_work_stats_recent IS
  'Supports worker analytics rollups by scanning recent work_stats rows per worker.';
