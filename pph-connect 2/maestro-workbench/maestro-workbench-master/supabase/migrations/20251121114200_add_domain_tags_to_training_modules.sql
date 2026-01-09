-- Migration: Add domain tags to training modules
-- Created: 2025-11-21
-- Purpose: Enable automated training assignment by tagging modules with domains.

ALTER TABLE public.training_modules
  ADD COLUMN IF NOT EXISTS domain_tags text[] NOT NULL DEFAULT '{}'::text[];
