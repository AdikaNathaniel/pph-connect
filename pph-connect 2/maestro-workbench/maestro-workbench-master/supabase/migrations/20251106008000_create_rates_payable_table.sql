-- Migration: Create Rates Payable Table
-- Created: 2025-11-06
-- Purpose: Store locale-specific rate cards for projects.
--
-- Changes:
--   1. Create public.rates_payable table with effective date enforcement
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rates_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL,
  expert_tier public.project_expert_tier NOT NULL,
  country text NOT NULL,
  rate_per_unit numeric DEFAULT 0,
  rate_per_hour numeric DEFAULT 0,
  currency text NOT NULL,
  effective_from date NOT NULL,
  effective_to date DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT rates_payable_effective_dates_check
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_rates_locale_tier_country
  ON public.rates_payable(locale, expert_tier, country);

CREATE INDEX IF NOT EXISTS idx_rates_effective_dates
  ON public.rates_payable(effective_from, effective_to);

ALTER TABLE public.rates_payable
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rates payable"
  ON public.rates_payable
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rates payable"
  ON public.rates_payable
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
