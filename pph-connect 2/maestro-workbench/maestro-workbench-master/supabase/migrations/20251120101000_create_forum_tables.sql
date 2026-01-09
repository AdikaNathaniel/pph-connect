-- Migration: Create forum tables
-- Description: Adds forum_categories, forum_threads, forum_posts, and forum_votes tables

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'forum_vote_type'
  ) THEN
    CREATE TYPE public.forum_vote_type AS ENUM ('upvote', 'downvote');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.workers(id),
  pinned boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON public.forum_threads(author_id);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.workers(id),
  content text NOT NULL,
  upvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON public.forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON public.forum_posts(author_id);

CREATE TABLE IF NOT EXISTS public.forum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.workers(id),
  vote_type public.forum_vote_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_votes_unique ON public.forum_votes(post_id, voter_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_post ON public.forum_votes(post_id);

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;

-- Simple read policies (writers limited to managers for now)
CREATE POLICY "Forum categories are readable" ON public.forum_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Forum threads are readable" ON public.forum_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Forum posts are readable" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Forum votes are readable" ON public.forum_votes FOR SELECT TO authenticated USING (true);
