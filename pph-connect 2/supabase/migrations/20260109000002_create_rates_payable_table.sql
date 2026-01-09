-- ============================================================================
-- Migration: Create Rates Payable Table (Rate Cards)
-- ============================================================================
-- Created: 2026-01-09
-- Purpose: Store locale-specific rate cards for projects
--
-- Schema: id, locale, expert_tier, country, rate_per_unit, rate_per_hour,
--         currency, effective_from, effective_to, created_at, created_by
--
-- Requirements implemented:
--   - Foreign key: created_by references workers table
--   - Validation: effective_to > effective_from OR effective_to IS NULL
--   - Index: idx_rates_locale_tier_country (locale, expert_tier, country)
--   - Index: idx_rates_effective_dates (effective_from, effective_to)
--   - RLS policies for authenticated access
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rates_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale TEXT NOT NULL,
    expert_tier public.project_expert_tier NOT NULL,
    country TEXT NOT NULL,
    rate_per_unit NUMERIC DEFAULT 0,
    rate_per_hour NUMERIC DEFAULT 0,
    currency TEXT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.workers(id) ON DELETE SET NULL,

    -- Validation: effective_to must be after effective_from (or NULL for indefinite)
    CONSTRAINT rates_payable_effective_dates_check
        CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
-- Composite index for locale + tier + country lookups
CREATE INDEX IF NOT EXISTS idx_rates_locale_tier_country
    ON public.rates_payable(locale, expert_tier, country);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_rates_effective_dates
    ON public.rates_payable(effective_from, effective_to);

-- Additional index for worker account lookups (useful for rate card history)
CREATE INDEX IF NOT EXISTS idx_rates_payable_created_by
    ON public.rates_payable(created_by);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.rates_payable ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read rate cards
CREATE POLICY "rates_payable_select_policy"
    ON public.rates_payable
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins and root users can manage rate cards (insert, update, delete)
CREATE POLICY "rates_payable_admin_manage_policy"
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

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================
COMMENT ON TABLE public.rates_payable IS 'Rate cards for locale + tier + country combinations';
COMMENT ON COLUMN public.rates_payable.locale IS 'Language/locale code (e.g., en, es, fr, de)';
COMMENT ON COLUMN public.rates_payable.expert_tier IS 'Worker expertise tier (tier0, tier1, tier2)';
COMMENT ON COLUMN public.rates_payable.country IS 'Country code or name for regional rate variations';
COMMENT ON COLUMN public.rates_payable.rate_per_unit IS 'Payment rate per unit of work completed';
COMMENT ON COLUMN public.rates_payable.rate_per_hour IS 'Payment rate per hour of work';
COMMENT ON COLUMN public.rates_payable.currency IS 'Currency code (e.g., USD, EUR, GBP)';
COMMENT ON COLUMN public.rates_payable.effective_from IS 'Start date when this rate becomes active';
COMMENT ON COLUMN public.rates_payable.effective_to IS 'End date for this rate (NULL = indefinite/current)';
COMMENT ON COLUMN public.rates_payable.created_by IS 'Worker ID who created this rate card';
