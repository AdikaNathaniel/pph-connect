-- Migration: Create Project Listings Table
-- Created: 2025-11-06
-- Purpose: Represent active project listings for marketplace flow.
--
-- Changes:
--   1. Create public.project_listings table with project foreign key
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  is_active boolean NOT NULL DEFAULT true,
  capacity_max integer DEFAULT NULL,
  capacity_current integer NOT NULL DEFAULT 0,
  required_skills text[] NOT NULL DEFAULT '{}',
  required_locales text[] NOT NULL DEFAULT '{}',
  required_tier public.project_expert_tier NOT NULL DEFAULT 'tier0',
  description text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_listings_project
  ON public.project_listings(project_id);

CREATE INDEX IF NOT EXISTS idx_project_listings_active
  ON public.project_listings(is_active);

ALTER TABLE public.project_listings
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project listings"
  ON public.project_listings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage project listings"
  ON public.project_listings
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
