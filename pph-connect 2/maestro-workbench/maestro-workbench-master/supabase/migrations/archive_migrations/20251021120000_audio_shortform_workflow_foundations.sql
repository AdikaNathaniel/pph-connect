BEGIN;

-- 1. Extend task templates with review metadata (non-breaking for existing templates)
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_stage_config JSONB;

-- 2. Extend project assignments for per-stage capabilities and priorities
ALTER TABLE public.project_assignments
  ADD COLUMN IF NOT EXISTS can_transcribe BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_qc BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority_transcribe INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS priority_review INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS priority_qc INTEGER NOT NULL DEFAULT 90;

-- 3. Review task reservation table
CREATE TABLE IF NOT EXISTS public.review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_uuid UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'completed', 'skipped')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (answer_uuid)
);

ALTER TABLE public.review_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_tasks_managers_full_access" ON public.review_tasks;
CREATE POLICY "review_tasks_managers_full_access"
ON public.review_tasks
FOR ALL
USING (is_root_or_manager(auth.uid()))
WITH CHECK (is_root_or_manager(auth.uid()));

DROP POLICY IF EXISTS "review_tasks_assigned_workers_select" ON public.review_tasks;
CREATE POLICY "review_tasks_assigned_workers_select"
ON public.review_tasks
FOR SELECT
USING (assigned_to = auth.uid());

DROP POLICY IF EXISTS "review_tasks_assigned_workers_update" ON public.review_tasks;
CREATE POLICY "review_tasks_assigned_workers_update"
ON public.review_tasks
FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

CREATE INDEX IF NOT EXISTS idx_review_tasks_project ON public.review_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_review_tasks_question ON public.review_tasks(question_uuid);
CREATE INDEX IF NOT EXISTS idx_review_tasks_status ON public.review_tasks(status);
CREATE INDEX IF NOT EXISTS idx_review_tasks_assigned_to ON public.review_tasks(assigned_to);

-- 4. Review submissions table
CREATE TABLE IF NOT EXISTS public.review_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_uuid UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  rating_overall INTEGER,
  highlight_tags TEXT[] DEFAULT '{}',
  feedback_to_transcriber TEXT,
  internal_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.review_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_submissions_managers_full_access" ON public.review_submissions;
CREATE POLICY "review_submissions_managers_full_access"
ON public.review_submissions
FOR ALL
USING (is_root_or_manager(auth.uid()))
WITH CHECK (is_root_or_manager(auth.uid()));

DROP POLICY IF EXISTS "review_submissions_reviewer_select" ON public.review_submissions;
CREATE POLICY "review_submissions_reviewer_select"
ON public.review_submissions
FOR SELECT
USING (reviewer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_review_submissions_project ON public.review_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_review_submissions_question ON public.review_submissions(question_uuid);
CREATE INDEX IF NOT EXISTS idx_review_submissions_answer ON public.review_submissions(answer_uuid);

-- 5. QC records (auto generated after review)
CREATE TABLE IF NOT EXISTS public.qc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_id TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  review_submission_uuid UUID NOT NULL REFERENCES public.review_submissions(id) ON DELETE CASCADE,
  qc_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.qc_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qc_records_managers_full_access" ON public.qc_records;
CREATE POLICY "qc_records_managers_full_access"
ON public.qc_records
FOR ALL
USING (is_root_or_manager(auth.uid()))
WITH CHECK (is_root_or_manager(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_qc_records_project ON public.qc_records(project_id);
CREATE INDEX IF NOT EXISTS idx_qc_records_question ON public.qc_records(question_uuid);

-- 6. Final answers table (publishable deliverables)
CREATE TABLE IF NOT EXISTS public.final_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_answer_id TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_uuid UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  replication_index INTEGER NOT NULL DEFAULT 1,
  source_answer_uuid UUID REFERENCES public.answers(id) ON DELETE SET NULL,
  review_submission_uuid UUID REFERENCES public.review_submissions(id) ON DELETE SET NULL,
  deliverable JSONB NOT NULL DEFAULT '{}'::JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.final_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "final_answers_managers_full_access" ON public.final_answers;
CREATE POLICY "final_answers_managers_full_access"
ON public.final_answers
FOR ALL
USING (is_root_or_manager(auth.uid()))
WITH CHECK (is_root_or_manager(auth.uid()));

DROP POLICY IF EXISTS "final_answers_worker_read" ON public.final_answers;
CREATE POLICY "final_answers_worker_read"
ON public.final_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.answers a
    WHERE a.id = public.final_answers.source_answer_uuid
      AND a.worker_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_final_answers_project ON public.final_answers(project_id);
CREATE INDEX IF NOT EXISTS idx_final_answers_question ON public.final_answers(question_uuid);

-- 7. Question asset status ledger
CREATE TABLE IF NOT EXISTS public.question_asset_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_uuid UUID NOT NULL UNIQUE REFERENCES public.questions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  replication_index INTEGER NOT NULL DEFAULT 1,
  asset_source_id TEXT,
  current_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (current_status IN ('pending','transcribed','review_pending','reviewed','qc_ready','completed','skipped')),
  transcription_task_uuid UUID REFERENCES public.tasks(id),
  transcription_answer_uuid UUID REFERENCES public.answers(id),
  review_task_uuid UUID REFERENCES public.review_tasks(id),
  review_submission_uuid UUID REFERENCES public.review_submissions(id),
  qc_record_uuid UUID REFERENCES public.qc_records(id),
  final_answer_uuid UUID REFERENCES public.final_answers(id),
  transcriber_uuid UUID REFERENCES public.profiles(id),
  reviewer_uuid UUID REFERENCES public.profiles(id),
  qc_reviewer_uuid UUID REFERENCES public.profiles(id),
  transcription_submitted_at TIMESTAMPTZ,
  review_submitted_at TIMESTAMPTZ,
  qc_created_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  deliverable_url TEXT,
  review_json_url TEXT,
  qc_json_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.question_asset_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "question_asset_status_manager_access" ON public.question_asset_status;
CREATE POLICY "question_asset_status_manager_access"
ON public.question_asset_status
FOR SELECT
USING (is_root_or_manager(auth.uid()));

DROP POLICY IF EXISTS "question_asset_status_worker_access" ON public.question_asset_status;
CREATE POLICY "question_asset_status_worker_access"
ON public.question_asset_status
FOR SELECT
USING (
  transcriber_uuid = auth.uid()
  OR reviewer_uuid = auth.uid()
  OR qc_reviewer_uuid = auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_question_asset_status_project ON public.question_asset_status(project_id);
CREATE INDEX IF NOT EXISTS idx_question_asset_status_state ON public.question_asset_status(current_status);

-- 8. ID helpers
CREATE OR REPLACE FUNCTION public.generate_review_id(p_answer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
BEGIN
  prefix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 12);
  suffix := substring(md5(clock_timestamp()::text || random()::text) from 1 for 12);
  RETURN prefix || '+review+' || COALESCE(p_answer_id, '') || '+' || suffix;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_qc_id(p_review_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
BEGIN
  prefix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 12);
  suffix := substring(md5(clock_timestamp()::text || random()::text) from 1 for 12);
  RETURN prefix || '+qc+' || COALESCE(p_review_id, '') || '+' || suffix;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_final_answer_id(p_question_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
BEGIN
  prefix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 12);
  suffix := substring(md5(clock_timestamp()::text || random()::text) from 1 for 12);
  RETURN prefix || '+final+' || COALESCE(p_question_id, '') || '+' || suffix;
END;
$$;

-- 9. Seed status when questions are created
CREATE OR REPLACE FUNCTION public.init_question_asset_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.question_asset_status (
    project_id,
    question_uuid,
    question_id,
    replication_index,
    asset_source_id,
    current_status,
    metadata
  ) VALUES (
    NEW.project_id,
    NEW.id,
    NEW.question_id,
    COALESCE(NEW.row_index, 1),
    NEW.data ->> 'drive_file_id',
    'pending',
    COALESCE(NEW.data, '{}'::JSONB)
  )
  ON CONFLICT (question_uuid) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_question_asset_status ON public.questions;
CREATE TRIGGER trg_init_question_asset_status
AFTER INSERT ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.init_question_asset_status();

-- 10. Update status after transcription (invoked from application layer)
CREATE OR REPLACE FUNCTION public.update_question_asset_status_after_transcription(
  p_project_id UUID,
  p_question_uuid UUID,
  p_question_id TEXT,
  p_replication_index INTEGER,
  p_asset_source_id TEXT,
  p_task_uuid UUID,
  p_answer_uuid UUID,
  p_transcriber_uuid UUID,
  p_submitted_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.question_asset_status (
    project_id,
    question_uuid,
    question_id,
    replication_index,
    asset_source_id,
    current_status,
    transcription_task_uuid,
    transcription_answer_uuid,
    transcriber_uuid,
    transcription_submitted_at
  ) VALUES (
    p_project_id,
    p_question_uuid,
    p_question_id,
    COALESCE(p_replication_index, 1),
    p_asset_source_id,
    'review_pending',
    p_task_uuid,
    p_answer_uuid,
    p_transcriber_uuid,
    p_submitted_at
  )
  ON CONFLICT (question_uuid) DO UPDATE
  SET transcription_task_uuid = COALESCE(EXCLUDED.transcription_task_uuid, public.question_asset_status.transcription_task_uuid),
      transcription_answer_uuid = EXCLUDED.transcription_answer_uuid,
      transcriber_uuid = COALESCE(EXCLUDED.transcriber_uuid, public.question_asset_status.transcriber_uuid),
      transcription_submitted_at = EXCLUDED.transcription_submitted_at,
      asset_source_id = COALESCE(EXCLUDED.asset_source_id, public.question_asset_status.asset_source_id),
      current_status = 'review_pending',
      updated_at = NOW();
END;
$$;

-- 11. Enqueue review task (called after transcription submission)
CREATE OR REPLACE FUNCTION public.enqueue_review_task(p_answer_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  answer_rec RECORD;
  template_has_review BOOLEAN;
  new_review_task UUID;
BEGIN
  SELECT a.id AS answer_uuid,
         a.project_id,
         a.question_id AS question_uuid,
         a.worker_id,
         a.completion_time,
         q.question_id,
         q.required_replications,
         q.data
  INTO answer_rec
  FROM public.answers a
  JOIN public.questions q ON q.id = a.question_id
  WHERE a.id = p_answer_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Answer % not found', p_answer_uuid;
  END IF;

  SELECT tpl.review_enabled
  INTO template_has_review
  FROM public.projects proj
  JOIN public.task_templates tpl ON tpl.id = proj.template_id
  WHERE proj.id = answer_rec.project_id;

  IF COALESCE(template_has_review, FALSE) IS FALSE THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.review_tasks (project_id, question_uuid, answer_uuid)
  VALUES (answer_rec.project_id, answer_rec.question_uuid, p_answer_uuid)
  ON CONFLICT (answer_uuid) DO UPDATE
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL,
        completed_at = NULL,
        updated_at = NOW()
  RETURNING id INTO new_review_task;

  PERFORM public.update_question_asset_status_after_transcription(
    answer_rec.project_id,
    answer_rec.question_uuid,
    answer_rec.question_id,
    1,
    answer_rec.data ->> 'drive_file_id',
    NULL,
    p_answer_uuid,
    answer_rec.worker_id,
    answer_rec.completion_time
  );

  RETURN new_review_task;
END;
$$;

-- 12. Claim next review task
CREATE OR REPLACE FUNCTION public.claim_next_review_task(
  p_project_id UUID,
  p_worker_id UUID
)
RETURNS TABLE(
  review_task_id UUID,
  project_id UUID,
  question_uuid UUID,
  answer_uuid UUID,
  status TEXT,
  question_id TEXT,
  question_data JSONB,
  answer_data JSONB,
  answer_id TEXT,
  transcriber_uuid UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation_minutes INTEGER;
  reservation_threshold TIMESTAMPTZ;
  task_row public.review_tasks%ROWTYPE;
BEGIN
  SELECT COALESCE(NULLIF(proj.reservation_time_limit_minutes, 0), 60)
  INTO reservation_minutes
  FROM public.projects proj
  WHERE proj.id = p_project_id;

  reservation_minutes := COALESCE(reservation_minutes, 60);
  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  -- Release stale reservations for this project
  UPDATE public.review_tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = NOW()
  WHERE project_id = p_project_id
    AND status = 'assigned'
    AND assigned_at < reservation_threshold;

  -- Return existing reservation if the worker already holds one
  SELECT *
  INTO task_row
  FROM public.review_tasks
  WHERE project_id = p_project_id
    AND assigned_to = p_worker_id
    AND status = 'assigned'
  ORDER BY assigned_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT task_row.id,
           task_row.project_id,
           task_row.question_uuid,
           task_row.answer_uuid,
           task_row.status,
           q.question_id,
           q.data,
           ans.answer_data,
           ans.answer_id,
           ans.worker_id
    FROM public.questions q
    JOIN public.answers ans ON ans.id = task_row.answer_uuid
    WHERE q.id = task_row.question_uuid;
    RETURN;
  END IF;

  -- Reserve the next available task
  UPDATE public.review_tasks
  SET status = 'assigned',
      assigned_to = p_worker_id,
      assigned_at = NOW(),
      updated_at = NOW()
  WHERE id = (
    SELECT id
    FROM public.review_tasks
    WHERE project_id = p_project_id
      AND status = 'pending'
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO task_row;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT task_row.id,
         task_row.project_id,
         task_row.question_uuid,
         task_row.answer_uuid,
         task_row.status,
         q.question_id,
         q.data,
         ans.answer_data,
         ans.answer_id,
         ans.worker_id
  FROM public.questions q
  JOIN public.answers ans ON ans.id = task_row.answer_uuid
  WHERE q.id = task_row.question_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_review_task(UUID, UUID) TO authenticated;

-- 13. Submit review payload
CREATE OR REPLACE FUNCTION public.submit_review(
  p_review_task_id UUID,
  p_reviewer_id UUID,
  p_rating_overall INTEGER,
  p_highlight_tags TEXT[],
  p_feedback TEXT,
  p_internal_notes TEXT,
  p_review_payload JSONB
)
RETURNS TABLE(
  review_submission_uuid UUID,
  review_id TEXT,
  final_answer_uuid UUID,
  final_answer_id TEXT,
  qc_record_uuid UUID,
  qc_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_row public.review_tasks%ROWTYPE;
  question_row public.questions%ROWTYPE;
  answer_row public.answers%ROWTYPE;
  new_review_id TEXT;
  new_final_id TEXT;
  new_qc_id TEXT;
  review_uuid UUID;
  final_uuid UUID;
  qc_uuid UUID;
BEGIN
  SELECT *
  INTO task_row
  FROM public.review_tasks
  WHERE id = p_review_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review task % not found', p_review_task_id;
  END IF;

  IF task_row.assigned_to IS DISTINCT FROM p_reviewer_id THEN
    RAISE EXCEPTION 'Review task % is not assigned to reviewer %', p_review_task_id, p_reviewer_id;
  END IF;

  IF task_row.status = 'completed' THEN
    RAISE EXCEPTION 'Review task % already completed', p_review_task_id;
  END IF;

  SELECT *
  INTO question_row
  FROM public.questions
  WHERE id = task_row.question_uuid;

  SELECT *
  INTO answer_row
  FROM public.answers
  WHERE id = task_row.answer_uuid;

  new_review_id := public.generate_review_id(answer_row.answer_id);

  INSERT INTO public.review_submissions (
    review_id,
    project_id,
    question_uuid,
    answer_uuid,
    reviewer_id,
    review_payload,
    rating_overall,
    highlight_tags,
    feedback_to_transcriber,
    internal_notes
  ) VALUES (
    new_review_id,
    task_row.project_id,
    task_row.question_uuid,
    task_row.answer_uuid,
    p_reviewer_id,
    COALESCE(p_review_payload, '{}'::JSONB),
    p_rating_overall,
    COALESCE(p_highlight_tags, '{}'),
    p_feedback,
    p_internal_notes
  )
  RETURNING id, review_id INTO review_uuid, new_review_id;

  UPDATE public.review_tasks
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_review_task_id;

  new_final_id := public.generate_final_answer_id(question_row.question_id);

  INSERT INTO public.final_answers (
    final_answer_id,
    project_id,
    question_uuid,
    source_answer_uuid,
    review_submission_uuid,
    deliverable
  ) VALUES (
    new_final_id,
    task_row.project_id,
    task_row.question_uuid,
    task_row.answer_uuid,
    review_uuid,
    COALESCE(p_review_payload, '{}'::JSONB)
  )
  RETURNING id, final_answer_id INTO final_uuid, new_final_id;

  new_qc_id := public.generate_qc_id(new_review_id);

  INSERT INTO public.qc_records (
    qc_id,
    project_id,
    question_uuid,
    review_submission_uuid
  ) VALUES (
    new_qc_id,
    task_row.project_id,
    task_row.question_uuid,
    review_uuid
  )
  RETURNING id INTO qc_uuid;

  INSERT INTO public.question_asset_status (
    project_id,
    question_uuid,
    question_id,
    replication_index,
    current_status,
    review_task_uuid,
    review_submission_uuid,
    qc_record_uuid,
    final_answer_uuid,
    reviewer_uuid,
    review_submitted_at,
    qc_created_at,
    finalized_at,
    deliverable_url
  ) VALUES (
    task_row.project_id,
    task_row.question_uuid,
    question_row.question_id,
    1,
    'completed',
    p_review_task_id,
    review_uuid,
    qc_uuid,
    final_uuid,
    p_reviewer_id,
    NOW(),
    NOW(),
    NOW(),
    NULL -- placeholder for future signed URLs
  )
  ON CONFLICT (question_uuid) DO UPDATE
  SET review_task_uuid = EXCLUDED.review_task_uuid,
      review_submission_uuid = EXCLUDED.review_submission_uuid,
      qc_record_uuid = EXCLUDED.qc_record_uuid,
      final_answer_uuid = EXCLUDED.final_answer_uuid,
      reviewer_uuid = EXCLUDED.reviewer_uuid,
      review_submitted_at = EXCLUDED.review_submitted_at,
      qc_created_at = EXCLUDED.qc_created_at,
      finalized_at = EXCLUDED.finalized_at,
      current_status = 'completed',
      updated_at = NOW();

  UPDATE public.questions
  SET completed_replications = LEAST(required_replications, completed_replications + 1),
      is_answered = completed_replications + 1 >= required_replications,
      updated_at = NOW()
  WHERE id = question_row.id;

  RETURN QUERY
  SELECT review_uuid,
         new_review_id,
         final_uuid,
         new_final_id,
         qc_uuid,
         new_qc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_review(
  UUID,
  UUID,
  INTEGER,
  TEXT[],
  TEXT,
  TEXT,
  JSONB
) TO authenticated;

-- 14. Manual release of review reservations
CREATE OR REPLACE FUNCTION public.release_review_task(p_review_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  released BOOLEAN;
BEGIN
  UPDATE public.review_tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = NOW()
  WHERE id = p_review_task_id
    AND status = 'assigned';

  GET DIAGNOSTICS released = ROW_COUNT;
  RETURN released;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_review_task(UUID) TO authenticated;

-- 15. Updated_at triggers leverage existing helper
DROP TRIGGER IF EXISTS trg_update_review_tasks_updated_at ON public.review_tasks;
CREATE TRIGGER trg_update_review_tasks_updated_at
BEFORE UPDATE ON public.review_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_review_submissions_updated_at ON public.review_submissions;
CREATE TRIGGER trg_update_review_submissions_updated_at
BEFORE UPDATE ON public.review_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_final_answers_updated_at ON public.final_answers;
CREATE TRIGGER trg_update_final_answers_updated_at
BEFORE UPDATE ON public.final_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_question_asset_status_updated_at ON public.question_asset_status;
CREATE TRIGGER trg_update_question_asset_status_updated_at
BEFORE UPDATE ON public.question_asset_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
