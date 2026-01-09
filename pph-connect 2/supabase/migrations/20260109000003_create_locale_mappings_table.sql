-- ============================================================================
-- Migration: Create Locale Mappings Table
-- ============================================================================
-- Created: 2026-01-09
-- Purpose: Map client locale codes to standardized ISO locales for ETL
--
-- Schema: id, client_locale_code, standard_iso_code, locale_name, created_at
--
-- Requirements implemented:
--   - Unique constraint on client_locale_code
--   - Index on standard_iso_code for reverse lookups
--   - RLS policies for authenticated access
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.locale_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_locale_code TEXT NOT NULL,
    standard_iso_code TEXT NOT NULL,
    locale_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CONSTRAINTS
-- ============================================================================
-- Unique constraint on client_locale_code (each client code maps to one standard)
ALTER TABLE public.locale_mappings
    ADD CONSTRAINT locale_mappings_client_code_key
    UNIQUE (client_locale_code);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
-- Index for reverse lookups by standard ISO code
CREATE INDEX IF NOT EXISTS idx_locale_mappings_standard
    ON public.locale_mappings(standard_iso_code);

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.locale_mappings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read locale mappings
CREATE POLICY "locale_mappings_select_policy"
    ON public.locale_mappings
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins and root users can manage locale mappings
CREATE POLICY "locale_mappings_admin_manage_policy"
    ON public.locale_mappings
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
-- 5. COMMENTS
-- ============================================================================
COMMENT ON TABLE public.locale_mappings IS 'Maps client-specific locale codes to standardized ISO locale codes for ETL standardization';
COMMENT ON COLUMN public.locale_mappings.client_locale_code IS 'Client-specific locale code (may be non-standard)';
COMMENT ON COLUMN public.locale_mappings.standard_iso_code IS 'Standardized ISO 639-1 language code';
COMMENT ON COLUMN public.locale_mappings.locale_name IS 'Human-readable name of the locale/language';
