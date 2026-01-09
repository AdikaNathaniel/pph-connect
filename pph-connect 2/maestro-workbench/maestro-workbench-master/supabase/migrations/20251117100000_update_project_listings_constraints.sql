-- Migration: Update Project Listings Constraints
-- Purpose: Align project_listings schema with marketplace requirements.

UPDATE public.project_listings
SET capacity_max = 0
WHERE capacity_max IS NULL;

ALTER TABLE public.project_listings
  ALTER COLUMN capacity_max SET DEFAULT 0,
  ALTER COLUMN capacity_max SET NOT NULL;
