-- Migration: Create Knowledge Base tables
-- Created: 2025-11-20
-- Description: Adds kb_categories and kb_articles tables with RLS policies for worker knowledge base.

CREATE TABLE IF NOT EXISTS public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.workers(id),
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  views integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON public.kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_author ON public.kb_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON public.kb_articles(status);

ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read KB categories"
  ON public.kb_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage KB categories"
  ON public.kb_categories
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));

CREATE POLICY "Authenticated users can read KB articles"
  ON public.kb_articles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage KB articles"
  ON public.kb_articles
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
