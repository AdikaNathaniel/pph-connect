-- Migration: Create Locale Mappings Table
-- Created: 2025-11-06
-- Purpose: Map client locale codes to standardized ISO locales for ETL.
--
-- Changes:
--   1. Create public.locale_mappings table with unique client locale codes
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.locale_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_locale_code text NOT NULL,
  standard_iso_code text NOT NULL,
  locale_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.locale_mappings
  ADD CONSTRAINT locale_mappings_client_code_key
    UNIQUE (client_locale_code);

CREATE INDEX IF NOT EXISTS idx_locale_mappings_standard
  ON public.locale_mappings(standard_iso_code);

ALTER TABLE public.locale_mappings
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read locale mappings"
  ON public.locale_mappings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage locale mappings"
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
