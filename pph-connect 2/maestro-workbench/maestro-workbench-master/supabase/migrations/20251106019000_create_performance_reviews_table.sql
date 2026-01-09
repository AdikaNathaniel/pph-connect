-- Migration: Create Performance Reviews Table
-- Created: 2025-11-06
-- Purpose: Store worker performance review metrics and JSON payloads.
--
-- Changes:
--   1. Create public.performance_reviews table with worker foreign key and review metrics
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  overall_score numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  speed_score numeric DEFAULT 0,
  reliability_score numeric DEFAULT 0,
  review_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_worker
  ON public.performance_reviews(worker_id);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_period
  ON public.performance_reviews(review_period_start, review_period_end);

ALTER TABLE public.performance_reviews
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read performance reviews"
  ON public.performance_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage performance reviews"
  ON public.performance_reviews
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
