-- Migration: Extend metric_type enum for gold distribution + IAA metrics
-- Created: 2025-11-22
-- Purpose: Allow storage of gold distribution targets and inter-annotator agreement metrics.

DO $$
BEGIN
  ALTER TYPE public.metric_type ADD VALUE IF NOT EXISTS 'iaa';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.metric_type ADD VALUE IF NOT EXISTS 'gold_distribution';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
