-- Migration: Create knowledge base tables

CREATE TABLE IF NOT EXISTS public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.workers(id),
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON public.kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_author ON public.kb_articles(author_id);

ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can read kb categories" ON public.kb_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workers can read kb articles" ON public.kb_articles FOR SELECT TO authenticated USING (true);
